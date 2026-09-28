import type { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import { CITY_AXES, initialCitySurveyState, initialExhibitionState, isCityAxis, type CitySurveyState, type ExhibitionState, type ExhibitionVotes } from '../shared/citySurveyState.ts';
import type { AnswerEvent, RunSummary } from '../shared/protocol.ts';
import { deriveExhibitionLayout, exhibitionLayoutChanges, type ProposalAnswerRecord, type ProposalRecord } from '../shared/cityView.ts';
import { applyEffects, applyProposalVotes, validateExhibitionState } from '../survey/scoreEngine.ts';
import { transaction } from './database.ts';

/** Raised when stored state is inconsistent. The server refuses to start instead of reinitializing. */
export class CorruptStateError extends Error {
  override name = 'CorruptStateError';
}
export class UnsupportedRunVersionError extends Error {
  override name = 'UnsupportedRunVersionError';
}

type Row = Record<string, SQLOutputValue>;
export function str(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new CorruptStateError(`column ${key} is not text`);
  return value;
}
export function num(row: Row, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' && typeof value !== 'bigint') throw new CorruptStateError(`column ${key} is not an integer`);
  return Number(value);
}
export function real(row: Row, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new CorruptStateError(`column ${key} is not a finite number`);
  return value;
}
export function optStr(row: Row, key: string): string | null {
  return row[key] === null ? null : str(row, key);
}

/** Axis names are not checked here: runs ended by the schema 2 migration keep their legacy axes. */
export function parseEffects(json: string): Record<string, number> {
  const value: unknown = JSON.parse(json);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new CorruptStateError('stored effects are not an object');
  const effects: Record<string, number> = {};
  for (const [axis, amount] of Object.entries(value)) {
    if (typeof amount !== 'number') throw new CorruptStateError(`stored effect ${axis} is invalid`);
    effects[axis] = amount;
  }
  return effects;
}

export function toAnswerEvent(row: Row): AnswerEvent {
  return {
    id: str(row, 'id'), sequence: num(row, 'sequence'), runId: str(row, 'run_id'), guestSessionId: str(row, 'guest_session_id'),
    questionId: str(row, 'question_id'), optionId: str(row, 'option_id'), questionVersion: num(row, 'question_version'),
    effects: parseEffects(str(row, 'effects_json')), revisionBefore: num(row, 'revision_before'),
    revisionAfter: num(row, 'revision_after'), answeredAt: str(row, 'answered_at'),
  };
}

export function toRunSummary(row: Row): RunSummary {
  const status = str(row, 'status');
  if (status !== 'active' && status !== 'ended') throw new CorruptStateError(`run status ${status} is invalid`);
  const algorithmVersion = num(row, 'algorithm_version');
  if (algorithmVersion !== 1 && algorithmVersion !== 2) throw new CorruptStateError(`run algorithm version ${algorithmVersion} is invalid`);
  return { id: str(row, 'id'), status, algorithmVersion, startedAt: str(row, 'started_at'), endedAt: optStr(row, 'ended_at') };
}

export function activeRun(db: DatabaseSync): RunSummary | undefined {
  const row = db.prepare(`SELECT * FROM runs WHERE status = 'active'`).get();
  return row && toRunSummary(row);
}

export function readSnapshot(db: DatabaseSync, runId: string): CitySurveyState | undefined {
  const row = db.prepare('SELECT * FROM city_snapshots WHERE run_id = ?').get(runId);
  if (!row) return undefined;
  return {
    runId, revision: num(row, 'revision'), answerCount: num(row, 'answer_count'),
    scores: {
      automation: num(row, 'automation'), publicSharing: num(row, 'public_sharing'),
      environmentalPriority: num(row, 'environmental_priority'), urbanConcentration: num(row, 'urban_concentration'),
    },
    updatedAt: str(row, 'updated_at'),
  };
}

export function writeSnapshot(db: DatabaseSync, state: CitySurveyState): void {
  const s = state.scores;
  db.prepare(`INSERT INTO city_snapshots (run_id, revision, answer_count, automation, public_sharing, environmental_priority,
      urban_concentration, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(run_id) DO UPDATE SET revision = excluded.revision, answer_count = excluded.answer_count,
      automation = excluded.automation, public_sharing = excluded.public_sharing, environmental_priority = excluded.environmental_priority,
      urban_concentration = excluded.urban_concentration, updated_at = excluded.updated_at`)
    .run(state.runId, state.revision, state.answerCount, s.automation, s.publicSharing, s.environmentalPriority, s.urbanConcentration, state.updatedAt);
}

/** Creates a run with its zero snapshot. Call inside a transaction. */
export function createRun(db: DatabaseSync, runId: string, at: string): CitySurveyState {
  db.prepare(`INSERT INTO runs (id, status, started_at, algorithm_version) VALUES (?, 'active', ?, 1)`).run(runId, at);
  const state = initialCitySurveyState(runId, at);
  writeSnapshot(db, state);
  return state;
}

export function readExhibitionSnapshot(db: DatabaseSync, runId: string): ExhibitionState | undefined {
  const row = db.prepare('SELECT * FROM exhibition_snapshots WHERE run_id = ?').get(runId);
  if (!row) return undefined;
  const state: ExhibitionState = {
    runId, revision: num(row, 'revision'), guestCount: num(row, 'guest_count'), algorithmVersion: 2,
    voteSums: {
      automation: real(row, 'vote_sum_automation'), publicSharing: real(row, 'vote_sum_public_sharing'),
      environmentalPriority: real(row, 'vote_sum_environmental_priority'), urbanConcentration: real(row, 'vote_sum_urban_concentration'),
    },
    recentVotes: {
      automation: real(row, 'recent_automation'), publicSharing: real(row, 'recent_public_sharing'),
      environmentalPriority: real(row, 'recent_environmental_priority'), urbanConcentration: real(row, 'recent_urban_concentration'),
    },
    scores: {
      automation: real(row, 'automation'), publicSharing: real(row, 'public_sharing'),
      environmentalPriority: real(row, 'environmental_priority'), urbanConcentration: real(row, 'urban_concentration'),
    },
    updatedAt: str(row, 'updated_at'),
  };
  if (num(row, 'algorithm_version') !== 2) throw new CorruptStateError(`exhibition snapshot of run ${runId} has an unsupported algorithm`);
  try { validateExhibitionState(state); }
  catch (error) { throw new CorruptStateError(`exhibition snapshot of run ${runId} is invalid: ${error instanceof Error ? error.message : String(error)}`); }
  return state;
}

export function writeExhibitionSnapshot(db: DatabaseSync, state: ExhibitionState): void {
  validateExhibitionState(state);
  const s = state.scores, sums = state.voteSums, recent = state.recentVotes;
  db.prepare(`INSERT INTO exhibition_snapshots (run_id, revision, guest_count, algorithm_version,
      vote_sum_automation, vote_sum_public_sharing, vote_sum_environmental_priority, vote_sum_urban_concentration,
      recent_automation, recent_public_sharing, recent_environmental_priority, recent_urban_concentration,
      automation, public_sharing, environmental_priority, urban_concentration, updated_at)
    VALUES (?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(run_id) DO UPDATE SET revision = excluded.revision, guest_count = excluded.guest_count,
      algorithm_version = excluded.algorithm_version, vote_sum_automation = excluded.vote_sum_automation,
      vote_sum_public_sharing = excluded.vote_sum_public_sharing,
      vote_sum_environmental_priority = excluded.vote_sum_environmental_priority,
      vote_sum_urban_concentration = excluded.vote_sum_urban_concentration,
      recent_automation = excluded.recent_automation, recent_public_sharing = excluded.recent_public_sharing,
      recent_environmental_priority = excluded.recent_environmental_priority,
      recent_urban_concentration = excluded.recent_urban_concentration,
      automation = excluded.automation, public_sharing = excluded.public_sharing,
      environmental_priority = excluded.environmental_priority, urban_concentration = excluded.urban_concentration,
      updated_at = excluded.updated_at`)
    .run(state.runId, state.revision, state.guestCount, sums.automation, sums.publicSharing, sums.environmentalPriority, sums.urbanConcentration,
      recent.automation, recent.publicSharing, recent.environmentalPriority, recent.urbanConcentration,
      s.automation, s.publicSharing, s.environmentalPriority, s.urbanConcentration, state.updatedAt);
}

export function createExhibitionRun(db: DatabaseSync, runId: string, at: string): ExhibitionState {
  db.prepare(`INSERT INTO runs (id, status, started_at, algorithm_version) VALUES (?, 'active', ?, 2)`).run(runId, at);
  const state = initialExhibitionState(runId, at);
  writeExhibitionSnapshot(db, state);
  return state;
}

export function runAnswerEvents(db: DatabaseSync, runId: string): AnswerEvent[] {
  return db.prepare('SELECT * FROM answer_events WHERE run_id = ? ORDER BY sequence').all(runId).map(toAnswerEvent);
}

/** Recomputes a run's state from its stored answer effects (not from the current question JSON). */
export function replayRun(db: DatabaseSync, runId: string, startedAt: string): CitySurveyState {
  let state = initialCitySurveyState(runId, startedAt);
  for (const event of runAnswerEvents(db, runId)) {
    const unknown = Object.keys(event.effects).find(axis => !isCityAxis(axis));
    if (unknown) throw new CorruptStateError(`answer ${event.id} of run ${runId} has unknown policy axis "${unknown}"`);
    state = { runId, revision: event.revisionAfter, answerCount: state.answerCount + 1, scores: applyEffects(state.scores, event.effects), updatedAt: event.answeredAt };
  }
  return state;
}

function parseJson<T>(json: string, where: string): T {
  try { return JSON.parse(json) as T; }
  catch (error) { throw new CorruptStateError(`${where} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}

function parseExhibitionState(json: string, where: string): ExhibitionState {
  const raw = parseJson<unknown>(json, where);
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new CorruptStateError(`${where} is not an exhibition state`);
  const state = raw as ExhibitionState;
  if (state.algorithmVersion !== 2 || typeof state.runId !== 'string' || typeof state.updatedAt !== 'string'
      || !Number.isSafeInteger(state.revision) || !Number.isSafeInteger(state.guestCount)
      || typeof state.scores !== 'object' || typeof state.voteSums !== 'object' || typeof state.recentVotes !== 'object')
    throw new CorruptStateError(`${where} is malformed`);
  try { validateExhibitionState(state); }
  catch (error) { throw new CorruptStateError(`${where} is invalid: ${error instanceof Error ? error.message : String(error)}`); }
  return state;
}

function parseVotes(json: string): ExhibitionVotes {
  const raw = parseJson<unknown>(json, 'proposal votes');
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new CorruptStateError('proposal votes are malformed');
  const votes = raw as Record<string, unknown>;
  if (Object.keys(votes).length !== CITY_AXES.length || CITY_AXES.some(axis => votes[axis] !== -1 && votes[axis] !== 0 && votes[axis] !== 1))
    throw new CorruptStateError('proposal votes are malformed');
  return votes as ExhibitionVotes;
}

function parseAnswers(json: string): ProposalAnswerRecord[] {
  const raw = parseJson<unknown>(json, 'proposal answers');
  if (!Array.isArray(raw) || raw.length !== CITY_AXES.length) throw new CorruptStateError('proposal answers are malformed');
  const seen = new Set<string>();
  return raw.map(answer => {
    if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) throw new CorruptStateError('proposal answer is malformed');
    const item = answer as Record<string, unknown>;
    if (typeof item.questionId !== 'string' || typeof item.optionId !== 'string'
        || typeof item.questionText !== 'string' || typeof item.optionLabel !== 'string')
      throw new CorruptStateError('proposal answer is malformed');
    if (seen.has(item.questionId)) throw new CorruptStateError('proposal answers contain a repeated question');
    seen.add(item.questionId);
    return { questionId: item.questionId, optionId: item.optionId, questionText: item.questionText, optionLabel: item.optionLabel };
  });
}

export function toProposalRecord(row: Row): ProposalRecord {
  if (num(row, 'algorithm_version') !== 2) throw new CorruptStateError('proposal uses an unsupported algorithm version');
  const runId = str(row, 'run_id'), submittedAt = str(row, 'submitted_at');
  const before = parseExhibitionState(str(row, 'before_state_json'), 'proposal before state');
  const after = parseExhibitionState(str(row, 'after_state_json'), 'proposal after state');
  const votes = parseVotes(str(row, 'votes_json'));
  const answers = parseAnswers(str(row, 'answers_json'));
  const revisionBefore = num(row, 'revision_before'), revisionAfter = num(row, 'revision_after');
  if (before.runId !== runId || after.runId !== runId || before.revision !== revisionBefore || after.revision !== revisionAfter
      || revisionAfter !== revisionBefore + 1 || after.guestCount !== revisionAfter)
    throw new CorruptStateError(`proposal ${str(row, 'id')} has inconsistent revisions`);
  const expected = applyProposalVotes(before, votes, submittedAt);
  if (JSON.stringify(expected) !== JSON.stringify(after)) throw new CorruptStateError(`proposal ${str(row, 'id')} does not match its stored vote result`);
  const beforeLayout = deriveExhibitionLayout(before.scores), afterLayout = deriveExhibitionLayout(after.scores);
  return {
    id: str(row, 'id'), runId, guestSessionId: str(row, 'guest_session_id'), ordinal: after.guestCount,
    questionSetVersion: num(row, 'question_set_version'), algorithmVersion: 2, answers, votes,
    revisionBefore, revisionAfter, submittedAt, beforeScores: before.scores, afterScores: after.scores,
    beforeLayout, afterLayout, cityChanges: exhibitionLayoutChanges(beforeLayout, afterLayout),
  };
}

export function runProposalRecords(db: DatabaseSync, runId: string, requestedLimit = 64): ProposalRecord[] {
  const limit = Math.max(0, Math.min(64, Math.trunc(requestedLimit)));
  if (limit === 0) return [];
  return db.prepare('SELECT * FROM proposal_events WHERE run_id = ? ORDER BY sequence DESC LIMIT ?')
    .all(runId, limit).reverse().map(toProposalRecord);
}

export function recentProposalEvents(db: DatabaseSync, requestedLimit = 50): ProposalRecord[] {
  const limit = Math.max(0, Math.min(200, Math.trunc(requestedLimit)));
  if (limit === 0) return [];
  return db.prepare('SELECT * FROM proposal_events ORDER BY sequence DESC LIMIT ?').all(limit).map(toProposalRecord);
}

export function replayExhibitionRun(db: DatabaseSync, runId: string, startedAt: string): ExhibitionState {
  let state = initialExhibitionState(runId, startedAt);
  const rows = db.prepare('SELECT * FROM proposal_events WHERE run_id = ? ORDER BY sequence').all(runId);
  for (const row of rows) {
    const record = toProposalRecord(row);
    const savedBefore = parseExhibitionState(str(row, 'before_state_json'), 'proposal before state');
    if (record.revisionBefore !== state.revision || JSON.stringify(savedBefore) !== JSON.stringify(state))
      throw new CorruptStateError(`proposal ${record.id} does not continue run ${runId}`);
    state = applyProposalVotes(state, record.votes, record.submittedAt);
    const savedAfter = parseExhibitionState(str(row, 'after_state_json'), 'proposal after state');
    if (state.revision !== record.revisionAfter || JSON.stringify(state) !== JSON.stringify(savedAfter))
      throw new CorruptStateError(`proposal ${record.id} replay disagrees with stored result`);
  }
  return state;
}

/**
 * Startup restore: returns the active run's snapshot after checking it against a replay of its events.
 * Creates the first run only when the database has no runs at all.
 */
export function restoreOrCreateRun(db: DatabaseSync, newId: () => string, now: () => Date): CitySurveyState | ExhibitionState {
  const run = activeRun(db);
  if (!run) {
    const count = num(db.prepare('SELECT COUNT(*) AS n FROM runs').get() ?? { n: 0 }, 'n');
    if (count > 0) throw new CorruptStateError('runs exist but none is active');
    return transaction(db, () => createExhibitionRun(db, newId(), now().toISOString()));
  }
  if (run.algorithmVersion === 2) {
    const snapshot = readExhibitionSnapshot(db, run.id);
    if (!snapshot) throw new CorruptStateError(`active run ${run.id} has no exhibition snapshot`);
    const replayed = replayExhibitionRun(db, run.id, run.startedAt);
    if (JSON.stringify(snapshot) !== JSON.stringify(replayed))
      throw new CorruptStateError(`exhibition snapshot of run ${run.id} does not match its proposal events`);
    return snapshot;
  }
  const snapshot = readSnapshot(db, run.id);
  if (!snapshot) throw new CorruptStateError(`active run ${run.id} has no city snapshot`);
  const replayed = replayRun(db, run.id, run.startedAt);
  const same = snapshot.revision === replayed.revision && snapshot.answerCount === replayed.answerCount
    && CITY_AXES.every(axis => snapshot.scores[axis] === replayed.scores[axis]);
  if (!same) throw new CorruptStateError(`city snapshot of run ${run.id} does not match its answer events (snapshot revision ${snapshot.revision}, replay revision ${replayed.revision})`);
  return snapshot;
}
