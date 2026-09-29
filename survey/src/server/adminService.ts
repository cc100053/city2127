import type {
  AdminCurrentRun, AdminEvent, AdminEventsData, LifecycleCommand, LifecycleData, LifecyclePhase, LifecycleRequest, LifecycleStatus, PendingReset,
} from '../shared/protocol.ts';
import type { CitySurveyState, ExhibitionState } from '../shared/citySurveyState.ts';
import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './database.ts';
import { fail, type ServiceOutcome, type SurveyContext } from './context.ts';
import { activeRun, CorruptStateError, createExhibitionRun, createRun, num, recentProposalEvents, str, toAnswerEvent } from './runStore.ts';
import { sessionCounts } from './sessionService.ts';
import { currentState, viewOf } from './answerService.ts';

export const RESET_CONFIRMATION = 'RESET';
export const FULL_RESET_CONFIRMATION = 'FULL RESET';
const COMMANDS: readonly LifecycleCommand[] = ['reset-city', 'full-reset', 'cancel-reset', 'guest-left'];

/**
 * Admin access is limited to the exhibition PC's loopback interface. `::ffff:127.0.0.1` is the same
 * IPv4 loopback seen through a dual-stack socket. A future remote admin would add a PIN session here.
 */
export function isLoopbackAddress(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

export function currentRun(ctx: SurveyContext): AdminCurrentRun {
  const run = activeRun(ctx.db);
  if (!run) throw new Error('no active run');
  const state = currentState(ctx);
  const counts = run.algorithmVersion === 2
    ? {
      reserved: num(ctx.db.prepare("SELECT COUNT(*) AS n FROM proposal_sessions WHERE run_id = ? AND status = 'reserved'").get(run.id) ?? { n: 0 }, 'n'),
      answered: num(ctx.db.prepare("SELECT COUNT(*) AS n FROM proposal_sessions WHERE run_id = ? AND status = 'submitted'").get(run.id) ?? { n: 0 }, 'n'),
    }
    : sessionCounts(ctx, run.id);
  return {
    run,
    lifecycle: readLifecycle(ctx.db),
    state,
    questionVersion: run.algorithmVersion === 2 ? ctx.questions.version : ctx.legacyQuestions.version,
    totalQuestions: run.algorithmVersion === 2 ? ctx.questions.questions.length : ctx.legacyQuestions.questions.length,
    reservedSessions: counts.reserved, answeredSessions: counts.answered,
  };
}

/** Latest answer and admin events across all runs, newest first. */
export function recentEvents(ctx: SurveyContext, limit = 50): AdminEventsData {
  const answers = ctx.db.prepare('SELECT * FROM answer_events ORDER BY sequence DESC LIMIT ?').all(limit).map(toAnswerEvent);
  const proposals = recentProposalEvents(ctx.db, limit);
  const admin = ctx.db.prepare('SELECT * FROM admin_events ORDER BY id DESC LIMIT ?').all(limit).map((row): AdminEvent => {
    const detail: unknown = JSON.parse(str(row, 'detail_json'));
    const nextRunId = typeof detail === 'object' && detail !== null && 'nextRunId' in detail && typeof detail.nextRunId === 'string' ? detail.nextRunId : '';
    const scope = typeof detail === 'object' && detail !== null && 'scope' in detail && detail.scope === 'full' ? 'full' : 'city';
    return { id: num(row, 'id'), type: 'run-reset', runId: str(row, 'run_id'), detail: { nextRunId, scope }, createdAt: str(row, 'created_at') };
  });
  return { answers, proposals, admin };
}

export function readLifecycle(db: DatabaseSync): LifecycleStatus {
  const row = db.prepare('SELECT * FROM exhibition_lifecycle WHERE id = 1').get();
  if (!row) throw new CorruptStateError('exhibition lifecycle row is missing');
  const total = db.prepare('SELECT COUNT(*) AS n FROM proposal_events WHERE sequence > ?').get(num(row, 'total_since_sequence'));
  // Phase and pending values are enforced by the table's CHECK constraints.
  return {
    revision: num(row, 'revision'), phase: str(row, 'phase') as LifecyclePhase, pendingReset: str(row, 'pending_reset') as PendingReset,
    totalGuestCount: num(total ?? { n: 0 }, 'n'), updatedAt: str(row, 'updated_at'),
  };
}

/** Call inside a transaction. `restartTotal` starts the exhibition-wide guest count again from zero. */
export function setLifecycle(ctx: SurveyContext, phase: LifecyclePhase, pendingReset: PendingReset, restartTotal = false): void {
  ctx.db.prepare(`UPDATE exhibition_lifecycle SET revision = revision + 1, phase = ?, pending_reset = ?, updated_at = ?${
    restartTotal ? ', total_since_sequence = (SELECT COALESCE(MAX(sequence), 0) FROM proposal_events)' : ''} WHERE id = 1`)
    .run(phase, pendingReset, ctx.now().toISOString());
}

/** Ends the active run and starts a zero-state run (a new city cycle). History is kept. Call inside a transaction. */
function executeReset(ctx: SurveyContext, scope: 'city' | 'full'): { previousRunId: string; state: CitySurveyState | ExhibitionState } {
  const run = activeRun(ctx.db);
  if (!run) throw new Error('no active run');
  const at = ctx.now().toISOString(), nextRunId = ctx.newId();
  ctx.db.prepare(`UPDATE runs SET status = 'ended', ended_at = ? WHERE id = ?`).run(at, run.id);
  ctx.db.prepare(`UPDATE guest_sessions SET status = 'expired' WHERE run_id = ? AND status = 'reserved'`).run(run.id);
  ctx.db.prepare("UPDATE proposal_sessions SET status = 'expired' WHERE run_id = ? AND status = 'reserved'").run(run.id);
  ctx.db.prepare(`INSERT INTO admin_events (type, run_id, detail_json, created_at) VALUES ('run-reset', ?, ?, ?)`)
    .run(run.id, JSON.stringify({ nextRunId, scope }), at);
  const state = run.algorithmVersion === 2 ? createExhibitionRun(ctx.db, nextRunId, at) : createRun(ctx.db, nextRunId, at);
  return { previousRunId: run.id, state };
}

function parseLifecycleRequest(body: unknown): LifecycleRequest | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;
  const { command, expectedRevision, confirmation } = body as Record<string, unknown>;
  if (!COMMANDS.includes(command as LifecycleCommand) || typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0 || (confirmation !== undefined && typeof confirmation !== 'string')) return undefined;
  return { command: command as LifecycleCommand, expectedRevision, confirmation };
}

/**
 * Staff lifecycle commands. Each one names the lifecycle revision it was issued against, so a stale admin
 * page cannot act on a newer guest. A reset runs at once only in `ready` (staff already confirmed the area
 * is clear); otherwise it waits in `pendingReset` for `guest-left`. Guest submissions never run a reset.
 */
export function lifecycleCommand(ctx: SurveyContext, body: unknown): ServiceOutcome<LifecycleData> {
  const request = parseLifecycleRequest(body);
  if (!request) return { response: fail('bad_request', `Expected a command (${COMMANDS.join(', ')}) and a non-negative expectedRevision.`) };
  if (request.command === 'reset-city' && request.confirmation !== RESET_CONFIRMATION)
    return { response: fail('reset_confirmation_invalid', `Type ${RESET_CONFIRMATION} to confirm the city reset.`) };
  if (request.command === 'full-reset' && request.confirmation !== FULL_RESET_CONFIRMATION)
    return { response: fail('reset_confirmation_invalid', `Type ${FULL_RESET_CONFIRMATION} to confirm the full data reset.`) };
  return transaction(ctx.db, (): ServiceOutcome<LifecycleData> => {
    const lifecycle = readLifecycle(ctx.db);
    if (request.expectedRevision !== lifecycle.revision)
      return { response: fail('lifecycle_conflict', `Expected lifecycle revision ${request.expectedRevision}, but it is ${lifecycle.revision}. Reload and try again.`) };
    let reset: PendingReset = 'none';
    switch (request.command) {
      case 'reset-city':
      case 'full-reset': {
        const scope = request.command === 'full-reset' ? 'full' : 'city';
        if (lifecycle.phase === 'ready') reset = scope;
        else setLifecycle(ctx, lifecycle.phase, lifecycle.pendingReset === 'full' ? 'full' : scope);
        break;
      }
      case 'cancel-reset':
        if (lifecycle.pendingReset === 'none') return { response: fail('lifecycle_blocked', 'No reset is pending.') };
        setLifecycle(ctx, lifecycle.phase, 'none');
        break;
      case 'guest-left': {
        if (lifecycle.phase === 'ready') return { response: fail('lifecycle_blocked', 'The installation is already ready for the next guest.') };
        // An unfinished questionnaire is abandoned: the guest has gone.
        ctx.db.prepare(`UPDATE proposal_sessions SET status = 'expired' WHERE status = 'reserved'`).run();
        reset = lifecycle.pendingReset;
        break;
      }
    }
    const executed = reset === 'none' ? undefined : executeReset(ctx, reset);
    if (reset !== 'none' || request.command === 'guest-left') setLifecycle(ctx, 'ready', 'none', reset === 'full');
    const state = executed?.state ?? currentState(ctx);
    return {
      response: { ok: true, data: { lifecycle: readLifecycle(ctx.db), state, executedReset: reset === 'none' ? null : reset, previousRunId: executed?.previousRunId ?? null } },
      event: executed && { type: 'run-reset', previousRunId: executed.previousRunId, state, view: viewOf(ctx, state) },
    };
  });
}
