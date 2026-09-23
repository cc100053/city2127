import type { AnswerData, AnswerEvent, AnswerRequest } from '../shared/protocol.ts';
import type { CitySurveyState } from '../shared/citySurveyState.ts';
import { applyEffects, scoreChange } from '../survey/scoreEngine.ts';
import { newlyUnlocked, updateMilestones } from '../survey/milestoneEngine.ts';
import { transaction } from './database.ts';
import { fail, type ServiceOutcome, type SurveyContext } from './context.ts';
import { toAnswerEvent, writeSnapshot } from './runStore.ts';
import { findGuestSession, requireActiveRun, settleExpiry } from './sessionService.ts';

const MAX_ID_LENGTH = 128;
const isId = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && value.length <= MAX_ID_LENGTH;

/** Accepts only the identifying fields; anything else a client sends (such as effects) is ignored. */
export function parseAnswerRequest(body: unknown): AnswerRequest | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const { answerId, guestSessionId, questionId, optionId, expectedRevision } = body as Record<string, unknown>;
  if (!isId(answerId) || !isId(guestSessionId) || !isId(questionId) || !isId(optionId)) return undefined;
  if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 0) return undefined;
  return { answerId, guestSessionId, questionId, optionId, expectedRevision };
}

const sameRequest = (event: AnswerEvent, request: AnswerRequest) =>
  event.guestSessionId === request.guestSessionId && event.questionId === request.questionId
  && event.optionId === request.optionId && event.revisionBefore === request.expectedRevision;

/**
 * Applies one guest answer atomically: event insert, snapshot update and session completion share one
 * transaction. Order: idempotent replay → session → question/option → revision.
 */
export function submitAnswer(ctx: SurveyContext, body: unknown): ServiceOutcome<AnswerData> {
  const request = parseAnswerRequest(body);
  if (!request) return { response: fail('bad_request', 'Expected answerId, guestSessionId, questionId, optionId and an integer expectedRevision.') };
  return transaction(ctx.db, (): ServiceOutcome<AnswerData> => {
    const { run, state } = requireActiveRun(ctx);
    const existingRow = ctx.db.prepare('SELECT * FROM answer_events WHERE id = ?').get(request.answerId);
    if (existingRow) {
      const existing = toAnswerEvent(existingRow);
      if (!sameRequest(existing, request)) return { response: fail('answer_conflict', 'This answer ID was already used for a different answer.', state) };
      return { response: { ok: true, data: { event: existing, state, replayed: true } } };
    }

    const found = findGuestSession(ctx, request.guestSessionId);
    if (!found) return { response: fail('session_not_found', 'Unknown guest session.') };
    const session = settleExpiry(ctx, found, run.id);
    if (session.status === 'answered') return { response: fail('already_answered', 'This guest session has already answered.', state) };
    if (session.status === 'expired') return { response: fail('session_expired', 'This guest session has expired.', state) };

    const question = ctx.questions.questions.find(q => q.id === request.questionId);
    if (!question) return { response: fail('unknown_question', 'Unknown question ID.') };
    const option = question.options.find(o => o.id === request.optionId);
    if (!option) {
      const elsewhere = ctx.questions.questions.some(q => q.options.some(o => o.id === request.optionId));
      return { response: elsewhere
        ? fail('option_question_mismatch', 'That option belongs to a different question.')
        : fail('unknown_option', 'Unknown option ID.') };
    }
    if (question.id !== session.questionId) return { response: fail('question_not_assigned', 'This question is not assigned to the guest session.') };
    if (request.expectedRevision !== state.revision) {
      return { response: fail('revision_conflict', `Expected revision ${request.expectedRevision}, but the city is at revision ${state.revision}.`, state) };
    }

    const answeredAt = ctx.now().toISOString();
    const effects = { ...option.effects };
    const scores = applyEffects(state.scores, effects);
    const next: CitySurveyState = {
      runId: run.id, revision: state.revision + 1, answerCount: state.answerCount + 1,
      scores, milestones: updateMilestones(state.milestones, scores), updatedAt: answeredAt,
    };
    ctx.db.prepare(`INSERT INTO answer_events (id, run_id, guest_session_id, question_id, option_id, question_version,
        effects_json, revision_before, revision_after, answered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(request.answerId, run.id, session.id, question.id, option.id, ctx.questions.version,
        JSON.stringify(effects), state.revision, next.revision, answeredAt);
    ctx.db.prepare(`UPDATE guest_sessions SET status = 'answered', answered_at = ? WHERE id = ?`).run(answeredAt, session.id);
    writeSnapshot(ctx.db, next);

    const event = toAnswerEvent(ctx.db.prepare('SELECT * FROM answer_events WHERE id = ?').get(request.answerId) ?? {});
    return {
      response: { ok: true, data: { event, state: next, replayed: false } },
      event: {
        type: 'city-state-updated', answerId: event.id, state: next, answer: event, questionText: question.text, optionLabel: option.label,
        change: { scores: scoreChange(state.scores, next.scores), unlocked: newlyUnlocked(state.milestones, next.milestones) },
      },
    };
  });
}

export const currentState = (ctx: SurveyContext): CitySurveyState => requireActiveRun(ctx).state;
