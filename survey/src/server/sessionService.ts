import type { SQLOutputValue } from 'node:sqlite';
import type { ApiResponse, GuestQuestionData, GuestSession, GuestSessionStatus } from '../shared/protocol.ts';
import { toPublicQuestion } from '../shared/question.ts';
import { transaction } from './database.ts';
import { fail, type SurveyContext } from './context.ts';
import { activeRun, CorruptStateError, num, optStr, readSnapshot, str } from './runStore.ts';

export const RESERVATION_MS = 2 * 60 * 1000;

const isStatus = (value: string): value is GuestSessionStatus => value === 'reserved' || value === 'answered' || value === 'expired';
function toGuestSession(row: Record<string, SQLOutputValue>): GuestSession {
  const status = str(row, 'status');
  if (!isStatus(status)) throw new CorruptStateError(`guest session status ${status} is invalid`);
  return {
    id: str(row, 'id'), runId: str(row, 'run_id'), questionId: str(row, 'question_id'), status,
    createdAt: str(row, 'created_at'), expiresAt: str(row, 'expires_at'), answeredAt: optStr(row, 'answered_at'),
  };
}

export function requireActiveRun(ctx: SurveyContext) {
  const run = activeRun(ctx.db);
  const state = run && readSnapshot(ctx.db, run.id);
  if (!run || !state) throw new CorruptStateError('no active run with a city snapshot');
  return { run, state };
}

export function findGuestSession(ctx: SurveyContext, id: string): GuestSession | undefined {
  const row = ctx.db.prepare('SELECT * FROM guest_sessions WHERE id = ?').get(id);
  return row && toGuestSession(row);
}

/**
 * Marks a reserved session expired when its time is up or its run has ended.
 * Returns the session as it is now stored. Call inside a transaction.
 */
export function settleExpiry(ctx: SurveyContext, session: GuestSession, activeRunId: string): GuestSession {
  if (session.status !== 'reserved') return session;
  if (session.runId === activeRunId && session.expiresAt > ctx.now().toISOString()) return session;
  ctx.db.prepare(`UPDATE guest_sessions SET status = 'expired' WHERE id = ?`).run(session.id);
  return { ...session, status: 'expired' };
}

export function sessionCounts(ctx: SurveyContext, runId: string) {
  const count = (status: GuestSessionStatus) =>
    num(ctx.db.prepare('SELECT COUNT(*) AS n FROM guest_sessions WHERE run_id = ? AND status = ?').get(runId, status) ?? { n: 0 }, 'n');
  return { reserved: count('reserved'), answered: count('answered') };
}

/** Reserves the first question (in JSON order) that is neither answered nor reserved in the active run. */
export function createGuestSession(ctx: SurveyContext): ApiResponse<GuestQuestionData> {
  return transaction(ctx.db, () => {
    const { run, state } = requireActiveRun(ctx);
    const now = ctx.now();
    ctx.db.prepare(`UPDATE guest_sessions SET status = 'expired' WHERE run_id = ? AND status = 'reserved' AND expires_at <= ?`)
      .run(run.id, now.toISOString());
    const taken = new Set(ctx.db.prepare(`SELECT question_id FROM guest_sessions WHERE run_id = ? AND status IN ('reserved', 'answered')`)
      .all(run.id).map(row => str(row, 'question_id')));
    const question = ctx.questions.questions.find(q => !taken.has(q.id));
    if (!question) return fail('no_question_available', 'Every question in this run is answered or currently reserved.', state);
    const session: GuestSession = {
      id: ctx.newId(), runId: run.id, questionId: question.id, status: 'reserved', createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ctx.reservationMs).toISOString(), answeredAt: null,
    };
    ctx.db.prepare(`INSERT INTO guest_sessions (id, run_id, question_id, status, created_at, expires_at) VALUES (?, ?, ?, 'reserved', ?, ?)`)
      .run(session.id, session.runId, session.questionId, session.createdAt, session.expiresAt);
    return { ok: true, data: { session, question: toPublicQuestion(question), state } };
  });
}

export function getGuestQuestion(ctx: SurveyContext, sessionId: string): ApiResponse<GuestQuestionData> {
  return transaction(ctx.db, () => {
    const { run, state } = requireActiveRun(ctx);
    const found = findGuestSession(ctx, sessionId);
    if (!found) return fail('session_not_found', 'Unknown guest session.');
    const session = settleExpiry(ctx, found, run.id);
    if (session.status === 'expired') return fail('session_expired', 'This guest session has expired.', state);
    const question = ctx.questions.questions.find(q => q.id === session.questionId);
    if (!question) return fail('unknown_question', 'The assigned question is not in the current question set.');
    return { ok: true, data: { session, question: toPublicQuestion(question), state } };
  });
}
