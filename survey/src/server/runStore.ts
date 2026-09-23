import type { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import { CITY_AXES, MILESTONE_KEYS, initialCitySurveyState, isCityAxis, type CitySurveyState } from '../shared/citySurveyState.ts';
import type { AnswerEvent, RunSummary } from '../shared/protocol.ts';
import type { CityEffects } from '../shared/question.ts';
import { applyEffects } from '../survey/scoreEngine.ts';
import { updateMilestones } from '../survey/milestoneEngine.ts';
import { transaction } from './database.ts';

/** Raised when stored state is inconsistent. The server refuses to start instead of reinitializing. */
export class CorruptStateError extends Error {
  override name = 'CorruptStateError';
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
export function optStr(row: Row, key: string): string | null {
  return row[key] === null ? null : str(row, key);
}

export function parseEffects(json: string): CityEffects {
  const value: unknown = JSON.parse(json);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new CorruptStateError('stored effects are not an object');
  const effects: CityEffects = {};
  for (const [axis, amount] of Object.entries(value)) {
    if (!isCityAxis(axis) || typeof amount !== 'number') throw new CorruptStateError(`stored effect ${axis} is invalid`);
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
  return { id: str(row, 'id'), status, startedAt: str(row, 'started_at'), endedAt: optStr(row, 'ended_at') };
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
    scores: { environment: num(row, 'environment'), culture: num(row, 'culture'), technology: num(row, 'technology'), community: num(row, 'community'), mobility: num(row, 'mobility') },
    milestones: { greenNetwork: num(row, 'green_network') === 1, civicCommons: num(row, 'civic_commons') === 1, autonomousGrid: num(row, 'autonomous_grid') === 1 },
    updatedAt: str(row, 'updated_at'),
  };
}

export function writeSnapshot(db: DatabaseSync, state: CitySurveyState): void {
  const { scores: s, milestones: m } = state;
  db.prepare(`INSERT INTO city_snapshots (run_id, revision, answer_count, environment, culture, technology, community, mobility,
      green_network, civic_commons, autonomous_grid, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(run_id) DO UPDATE SET revision = excluded.revision, answer_count = excluded.answer_count,
      environment = excluded.environment, culture = excluded.culture, technology = excluded.technology,
      community = excluded.community, mobility = excluded.mobility, green_network = excluded.green_network,
      civic_commons = excluded.civic_commons, autonomous_grid = excluded.autonomous_grid, updated_at = excluded.updated_at`)
    .run(state.runId, state.revision, state.answerCount, s.environment, s.culture, s.technology, s.community, s.mobility,
      Number(m.greenNetwork), Number(m.civicCommons), Number(m.autonomousGrid), state.updatedAt);
}

/** Creates a run with its zero snapshot. Call inside a transaction. */
export function createRun(db: DatabaseSync, runId: string, at: string): CitySurveyState {
  db.prepare(`INSERT INTO runs (id, status, started_at) VALUES (?, 'active', ?)`).run(runId, at);
  const state = initialCitySurveyState(runId, at);
  writeSnapshot(db, state);
  return state;
}

export function runAnswerEvents(db: DatabaseSync, runId: string): AnswerEvent[] {
  return db.prepare('SELECT * FROM answer_events WHERE run_id = ? ORDER BY sequence').all(runId).map(toAnswerEvent);
}

/** Recomputes a run's state from its stored answer effects (not from the current question JSON). */
export function replayRun(db: DatabaseSync, runId: string, startedAt: string): CitySurveyState {
  let state = initialCitySurveyState(runId, startedAt);
  for (const event of runAnswerEvents(db, runId)) {
    const scores = applyEffects(state.scores, event.effects);
    state = { runId, revision: event.revisionAfter, answerCount: state.answerCount + 1, scores, milestones: updateMilestones(state.milestones, scores), updatedAt: event.answeredAt };
  }
  return state;
}

/**
 * Startup restore: returns the active run's snapshot after checking it against a replay of its events.
 * Creates the first run only when the database has no runs at all.
 */
export function restoreOrCreateRun(db: DatabaseSync, newId: () => string, now: () => Date): CitySurveyState {
  const run = activeRun(db);
  if (!run) {
    const count = num(db.prepare('SELECT COUNT(*) AS n FROM runs').get() ?? { n: 0 }, 'n');
    if (count > 0) throw new CorruptStateError('runs exist but none is active');
    return transaction(db, () => createRun(db, newId(), now().toISOString()));
  }
  const snapshot = readSnapshot(db, run.id);
  if (!snapshot) throw new CorruptStateError(`active run ${run.id} has no city snapshot`);
  const replayed = replayRun(db, run.id, run.startedAt);
  const same = snapshot.revision === replayed.revision && snapshot.answerCount === replayed.answerCount
    && CITY_AXES.every(axis => snapshot.scores[axis] === replayed.scores[axis])
    && MILESTONE_KEYS.every(key => snapshot.milestones[key] === replayed.milestones[key]);
  if (!same) throw new CorruptStateError(`city snapshot of run ${run.id} does not match its answer events (snapshot revision ${snapshot.revision}, replay revision ${replayed.revision})`);
  return snapshot;
}
