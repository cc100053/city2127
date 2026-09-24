import type { AdminCurrentRun, AdminEvent, AdminEventsData, ResetData } from '../shared/protocol.ts';
import { transaction } from './database.ts';
import { fail, type ServiceOutcome, type SurveyContext } from './context.ts';
import { createRun, num, str, toAnswerEvent } from './runStore.ts';
import { requireActiveRun, sessionCounts } from './sessionService.ts';
import { viewOf } from './answerService.ts';

export const RESET_CONFIRMATION = 'RESET';

/**
 * Admin access is limited to the exhibition PC's loopback interface. `::ffff:127.0.0.1` is the same
 * IPv4 loopback seen through a dual-stack socket. A future remote admin would add a PIN session here.
 */
export function isLoopbackAddress(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

export function currentRun(ctx: SurveyContext): AdminCurrentRun {
  const { run, state } = requireActiveRun(ctx);
  const counts = sessionCounts(ctx, run.id);
  return {
    run, state, questionVersion: ctx.questions.version, totalQuestions: ctx.questions.questions.length,
    reservedSessions: counts.reserved, answeredSessions: counts.answered,
  };
}

/** Latest answer and admin events across all runs, newest first. */
export function recentEvents(ctx: SurveyContext, limit = 50): AdminEventsData {
  const answers = ctx.db.prepare('SELECT * FROM answer_events ORDER BY sequence DESC LIMIT ?').all(limit).map(toAnswerEvent);
  const admin = ctx.db.prepare('SELECT * FROM admin_events ORDER BY id DESC LIMIT ?').all(limit).map((row): AdminEvent => {
    const detail: unknown = JSON.parse(str(row, 'detail_json'));
    const nextRunId = typeof detail === 'object' && detail !== null && 'nextRunId' in detail && typeof detail.nextRunId === 'string' ? detail.nextRunId : '';
    return { id: num(row, 'id'), type: 'run-reset', runId: str(row, 'run_id'), detail: { nextRunId }, createdAt: str(row, 'created_at') };
  });
  return { answers, admin };
}

/** Ends the active run and starts a new zero-state run. History is kept; nothing is deleted. */
export function resetRun(ctx: SurveyContext, body: unknown): ServiceOutcome<ResetData> {
  const confirmation = typeof body === 'object' && body !== null && 'confirmation' in body ? body.confirmation : undefined;
  if (confirmation !== RESET_CONFIRMATION) return { response: fail('reset_confirmation_invalid', `Type ${RESET_CONFIRMATION} to confirm the reset.`) };
  return transaction(ctx.db, (): ServiceOutcome<ResetData> => {
    const { run } = requireActiveRun(ctx);
    const at = ctx.now().toISOString(), nextRunId = ctx.newId();
    ctx.db.prepare(`UPDATE runs SET status = 'ended', ended_at = ? WHERE id = ?`).run(at, run.id);
    ctx.db.prepare(`UPDATE guest_sessions SET status = 'expired' WHERE run_id = ? AND status = 'reserved'`).run(run.id);
    ctx.db.prepare(`INSERT INTO admin_events (type, run_id, detail_json, created_at) VALUES ('run-reset', ?, ?, ?)`)
      .run(run.id, JSON.stringify({ nextRunId }), at);
    const state = createRun(ctx.db, nextRunId, at);
    return {
      response: { ok: true, data: { previousRunId: run.id, state } },
      event: { type: 'run-reset', previousRunId: run.id, state, view: viewOf(ctx, state) },
    };
  });
}
