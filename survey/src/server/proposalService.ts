import type { SQLOutputValue } from 'node:sqlite';
import { CITY_AXES, type ExhibitionState, type ExhibitionVotes } from '../shared/citySurveyState.ts';
import type { ApiResponse, ProposalData, ProposalRequest, ProposalSession, ProposalSessionData } from '../shared/protocol.ts';
import type { ProposalAnswerRecord } from '../shared/cityView.ts';
import { toPublicQuestion } from '../shared/question.ts';
import { validateExhibitionQuestionSet } from '../survey/questionLoader.ts';
import { applyProposalVotes, validateExhibitionState, voteForEffects } from '../survey/scoreEngine.ts';
import { viewOf } from './answerService.ts';
import { transaction } from './database.ts';
import { fail, type ServiceOutcome, type SurveyContext } from './context.ts';
import { finishGuest, readLifecycle, setLifecycle } from './adminService.ts';
import { activeRun, CorruptStateError, num, readExhibitionSnapshot, str, toProposalRecord, writeExhibitionSnapshot } from './runStore.ts';

export const PROPOSAL_RESERVATION_MS = 5 * 60 * 1000;
const MAX_ID_LENGTH = 128;
const isId = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && value.length <= MAX_ID_LENGTH;
type Row = Record<string, SQLOutputValue>;

function currentExhibition(ctx: SurveyContext): { runId: string; state: ExhibitionState } | undefined {
  const run = activeRun(ctx.db);
  if (!run || run.algorithmVersion !== 2) return undefined;
  const state = readExhibitionSnapshot(ctx.db, run.id);
  if (!state) throw new CorruptStateError(`active exhibition run ${run.id} has no snapshot`);
  return { runId: run.id, state };
}

function parseProposalSession(row: Row): ProposalSession {
  const status = str(row, 'status');
  if (status !== 'reserved' && status !== 'submitted' && status !== 'expired')
    throw new CorruptStateError(`proposal session status ${status} is invalid`);
  let questionIds: unknown;
  try { questionIds = JSON.parse(str(row, 'question_ids_json')); }
  catch { throw new CorruptStateError('proposal session question IDs are invalid JSON'); }
  if (!Array.isArray(questionIds) || questionIds.length !== 4
      || questionIds.some(id => typeof id !== 'string') || new Set(questionIds).size !== 4)
    throw new CorruptStateError('proposal session question IDs are malformed');
  return {
    id: str(row, 'id'), runId: str(row, 'run_id'), questionSetVersion: num(row, 'question_set_version'),
    questionIds, status, createdAt: str(row, 'created_at'), expiresAt: str(row, 'expires_at'),
    submittedAt: row.submitted_at === null ? null : str(row, 'submitted_at'),
  };
}

function failNoExhibition(): ApiResponse<never> {
  return fail('unsupported_version', 'The active run does not use exhibition algorithm version 2.');
}

export function createProposalSession(ctx: SurveyContext): ServiceOutcome<ProposalSessionData> {
  return transaction(ctx.db, () => {
    let current = currentExhibition(ctx);
    if (!current) return { response: failNoExhibition() };
    const set = validateExhibitionQuestionSet(ctx.questions);
    // Starting the next questionnaire is the handoff; no Admin confirmation is required.
    const lifecycle = readLifecycle(ctx.db);
    const handoff = lifecycle.phase === 'awaiting_exit' ? finishGuest(ctx, lifecycle) : undefined;
    if (handoff) current = currentExhibition(ctx)!;
    if (lifecycle.phase !== 'in_experience') setLifecycle(ctx, 'in_experience', 'none');
    const now = ctx.now(), createdAt = now.toISOString();
    const session: ProposalSession = {
      id: ctx.newId(), runId: current.runId, questionSetVersion: set.version,
      questionIds: set.questions.map(question => question.id), status: 'reserved', createdAt,
      expiresAt: new Date(now.getTime() + PROPOSAL_RESERVATION_MS).toISOString(), submittedAt: null,
    };
    ctx.db.prepare(`INSERT INTO proposal_sessions (id, run_id, question_set_version, question_ids_json, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, 'reserved', ?, ?)`)
      .run(session.id, session.runId, session.questionSetVersion, JSON.stringify(session.questionIds), session.createdAt, session.expiresAt);
    return { response: { ok: true as const, data: { session, questions: set.questions.map(toPublicQuestion), state: current.state } }, event: handoff?.event };
  });
}

export function getProposalSession(ctx: SurveyContext, sessionId: string): ApiResponse<ProposalSessionData> {
  return transaction(ctx.db, () => {
    const current = currentExhibition(ctx);
    if (!current) return failNoExhibition();
    const row = ctx.db.prepare('SELECT * FROM proposal_sessions WHERE id = ?').get(sessionId);
    if (!row) return fail('session_not_found', 'Unknown proposal session.');
    let session = parseProposalSession(row);
    if (session.status === 'reserved' && (session.runId !== current.runId || session.expiresAt <= ctx.now().toISOString())) {
      ctx.db.prepare("UPDATE proposal_sessions SET status = 'expired' WHERE id = ?").run(session.id);
      session = { ...session, status: 'expired' };
    }
    if (session.status === 'expired') return fail('session_expired', 'This proposal session has expired.', current.state);
    if (ctx.db.prepare('SELECT u.proposal_id FROM proposal_undos u JOIN proposal_events p ON p.id = u.proposal_id WHERE p.guest_session_id = ?').get(session.id))
      return fail('proposal_undone', 'This proposal was undone by an administrator. Start a new questionnaire.', current.state);
    if (session.status === 'submitted') return fail('already_answered', 'This proposal session has already been submitted.', current.state);
    if (session.questionSetVersion !== ctx.questions.version
        || JSON.stringify(session.questionIds) !== JSON.stringify(ctx.questions.questions.map(question => question.id)))
      return fail('unsupported_version', 'This session belongs to a different question set version.', current.state);
    return { ok: true, data: { session, questions: ctx.questions.questions.map(toPublicQuestion), state: current.state } };
  });
}

/** Rejects extra fields and malformed/duplicate answers before any database access. */
export function parseProposalRequest(body: unknown): ProposalRequest | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;
  const request = body as Record<string, unknown>;
  if (Object.keys(request).length !== 4 || !['submissionId', 'guestSessionId', 'expectedRevision', 'answers'].every(key => Object.hasOwn(request, key)))
    return undefined;
  if (!isId(request.submissionId) || !isId(request.guestSessionId)
      || typeof request.expectedRevision !== 'number' || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0
      || !Array.isArray(request.answers) || request.answers.length !== CITY_AXES.length)
    return undefined;
  const seen = new Set<string>();
  const answers: ProposalRequest['answers'] = [];
  for (const raw of request.answers) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
    const answer = raw as Record<string, unknown>;
    if (Object.keys(answer).length !== 2 || !Object.hasOwn(answer, 'questionId') || !Object.hasOwn(answer, 'optionId')
        || !isId(answer.questionId) || !isId(answer.optionId) || seen.has(answer.questionId))
      return undefined;
    seen.add(answer.questionId);
    answers.push({ questionId: answer.questionId, optionId: answer.optionId });
  }
  answers.sort((a, b) => a.questionId.localeCompare(b.questionId));
  return { submissionId: request.submissionId, guestSessionId: request.guestSessionId, expectedRevision: request.expectedRevision, answers };
}

function canonicalRequest(request: ProposalRequest): string {
  return JSON.stringify({
    submissionId: request.submissionId, guestSessionId: request.guestSessionId,
    expectedRevision: request.expectedRevision,
    answers: [...request.answers].sort((a, b) => a.questionId.localeCompare(b.questionId)),
  });
}

function savedState(row: Row): ExhibitionState {
  let raw: unknown;
  try { raw = JSON.parse(str(row, 'after_state_json')); }
  catch { throw new CorruptStateError('stored proposal result is invalid JSON'); }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new CorruptStateError('stored proposal result is malformed');
  const state = raw as ExhibitionState;
  try { validateExhibitionState(state); }
  catch (error) { throw new CorruptStateError(`stored proposal result is invalid: ${error instanceof Error ? error.message : String(error)}`); }
  return state;
}

function duplicateResult(ctx: SurveyContext, row: Row, request: ProposalRequest): ServiceOutcome<ProposalData> {
  if (str(row, 'canonical_request_json') !== canonicalRequest(request)) {
    const current = currentExhibition(ctx);
    return { response: fail('answer_conflict', 'This submission ID was already used for a different proposal.', current?.state) };
  }
  if (ctx.db.prepare('SELECT proposal_id FROM proposal_undos WHERE proposal_id = ?').get(request.submissionId))
    return { response: fail('proposal_undone', 'This proposal was undone by an administrator. Start a new questionnaire.', currentExhibition(ctx)?.state) };
  const proposal = toProposalRecord(row);
  return { response: { ok: true, data: { proposal, state: savedState(row), replayed: true } } };
}

export function submitProposal(ctx: SurveyContext, body: unknown): ServiceOutcome<ProposalData> {
  const request = parseProposalRequest(body);
  if (!request) return { response: fail('bad_request', 'Expected a submissionId, guestSessionId, non-negative expectedRevision, and four unique question/option pairs.') };
  return transaction(ctx.db, (): ServiceOutcome<ProposalData> => {
    // A successful resend remains identifiable after session expiry, reset, or a later run.
    const existing = ctx.db.prepare('SELECT * FROM proposal_events WHERE id = ?').get(request.submissionId);
    if (existing) return duplicateResult(ctx, existing, request);

    const current = currentExhibition(ctx);
    if (!current) return { response: failNoExhibition() };
    const questionSet = validateExhibitionQuestionSet(ctx.questions);
    const sessionRow = ctx.db.prepare('SELECT * FROM proposal_sessions WHERE id = ?').get(request.guestSessionId);
    if (!sessionRow) return { response: fail('session_not_found', 'Unknown proposal session.') };
    let session = parseProposalSession(sessionRow);
    if (session.status === 'reserved' && (session.runId !== current.runId || session.expiresAt <= ctx.now().toISOString())) {
      ctx.db.prepare("UPDATE proposal_sessions SET status = 'expired' WHERE id = ?").run(session.id);
      session = { ...session, status: 'expired' };
    }
    if (session.status === 'submitted') return { response: fail('already_answered', 'This proposal session has already been submitted.', current.state) };
    if (session.status === 'expired') return { response: fail('session_expired', 'This proposal session has expired.', current.state) };
    const questionIds = questionSet.questions.map(question => question.id);
    if (session.runId !== current.runId || session.questionSetVersion !== questionSet.version
        || JSON.stringify(session.questionIds) !== JSON.stringify(questionIds))
      return { response: fail('unsupported_version', 'This proposal session belongs to a different run or question set.', current.state) };
    if (request.answers.length !== session.questionIds.length
        || request.answers.some(answer => !session.questionIds.includes(answer.questionId)))
      return { response: fail('question_not_assigned', 'A proposal must answer each assigned question exactly once.', current.state) };
    if (request.expectedRevision !== current.state.revision)
      return { response: fail('revision_conflict', `Expected revision ${request.expectedRevision}, but the city is at revision ${current.state.revision}.`, current.state) };
    const lifecycle = readLifecycle(ctx.db);
    if (lifecycle.phase !== 'in_experience')
      return { response: fail('lifecycle_blocked', 'This installation has already recorded a proposal for the current guest.', current.state) };

    const byId = new Map(request.answers.map(answer => [answer.questionId, answer.optionId]));
    const votes: Partial<ExhibitionVotes> = {};
    const answers: ProposalAnswerRecord[] = [];
    for (const question of questionSet.questions) {
      const optionId = byId.get(question.id);
      const option = question.options.find(candidate => candidate.id === optionId);
      if (!option) {
        const elsewhere = questionSet.questions.some(candidate => candidate.options.some(item => item.id === optionId));
        return { response: fail(elsewhere ? 'option_question_mismatch' : 'unknown_option', 'An option does not belong to its question.', current.state) };
      }
      const entries = Object.entries(option.effects);
      const [axis, amount] = entries[0] ?? [];
      if (!axis || Object.hasOwn(votes, axis))
        return { response: fail('bad_request', 'Each question must vote on a distinct city axis.', current.state) };
      votes[axis as keyof ExhibitionVotes] = voteForEffects(option.effects);
      answers.push({ questionId: question.id, optionId: option.id, questionText: question.text, optionLabel: option.label });
    }
    if (CITY_AXES.some(axis => !Object.hasOwn(votes, axis)))
      return { response: fail('bad_request', 'Question set does not cover every city axis.', current.state) };
    const normalizedVotes = votes as ExhibitionVotes;
    const submittedAt = ctx.now().toISOString();
    const next = applyProposalVotes(current.state, normalizedVotes, submittedAt);
    const requestJson = canonicalRequest(request);
    ctx.db.prepare(`INSERT INTO proposal_events (id, run_id, guest_session_id, canonical_request_json, question_set_version,
        algorithm_version, answers_json, votes_json, revision_before, revision_after, before_state_json, after_state_json, submitted_at)
      VALUES (?, ?, ?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?)`)
      .run(request.submissionId, current.runId, session.id, requestJson, questionSet.version, JSON.stringify(answers),
        JSON.stringify(normalizedVotes), current.state.revision, next.revision, JSON.stringify(current.state), JSON.stringify(next), submittedAt);
    ctx.db.prepare("UPDATE proposal_sessions SET status = 'submitted', submitted_at = ? WHERE id = ?").run(submittedAt, session.id);
    writeExhibitionSnapshot(ctx.db, next);
    // Preserve the result; any pending reset waits until the next guest starts.
    setLifecycle(ctx, 'awaiting_exit', lifecycle.pendingReset);

    const row = ctx.db.prepare('SELECT * FROM proposal_events WHERE id = ?').get(request.submissionId);
    if (!row) throw new CorruptStateError('proposal insert did not produce a row');
    const proposal = toProposalRecord(row);
    return {
      response: { ok: true, data: { proposal, state: next, replayed: false } },
      event: { type: 'city-state-updated', submissionId: proposal.id, state: next, proposal, view: viewOf(ctx, next) },
    };
  });
}
