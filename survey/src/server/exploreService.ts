import { DISPLAY_MS } from '../shared/displayTiming.ts';
import { EXPLORE_TARGETS, type ExploreEvent, type ExploreRequest, type ExploreTarget } from '../shared/protocol.ts';
import { currentState } from './answerService.ts';
import { fail, type ServiceOutcome, type SurveyContext } from './context.ts';

type Holder = { sessionId: string; stationId?: 'A' | 'B'; target: ExploreTarget; ordinal: number };

function parseExploreRequest(body: unknown): ExploreRequest | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;
  const { guestSessionId, target, ...rest } = body as Record<string, unknown>;
  if (Object.keys(rest).length || typeof guestSessionId !== 'string' || !guestSessionId) return undefined;
  if (target !== null && !EXPLORE_TARGETS.includes(target as ExploreTarget)) return undefined;
  return { guestSessionId, target: target as ExploreTarget | null };
}

/**
 * One guest at a time may turn the shared screen to a landmark after their own reading slot. The holder lives in memory only:
 * a restart, a new live result, a reset or that station's next Start ends it, and staff end a forgotten one with the iPad's 戻る.
 */
export function createExplore(ctx: SurveyContext) {
  let holder: Holder | null = null;
  const end = (): ExploreEvent | undefined => { if (!holder) return undefined; holder = null; return { type: 'explore', target: null }; };
  return {
    get holder() { return holder; },
    request(body: unknown): ServiceOutcome<{ target: ExploreTarget | null }> {
      const request = parseExploreRequest(body);
      if (!request) return { response: fail('bad_request', 'Expected guestSessionId and target sky-ring, space-elevator or null.') };
      if (request.target === null) {
        const event = holder?.sessionId === request.guestSessionId ? end() : undefined;
        return { response: { ok: true, data: { target: null } }, event };
      }
      const row = ctx.db.prepare('SELECT display_at, submitted_at, after_state_json, station_id FROM active_proposal_events WHERE guest_session_id = ? AND run_id = ?')
        .get(request.guestSessionId, currentState(ctx).runId);
      if (!row) return { response: fail('session_not_found', 'Only a guest whose proposal is in the current city can explore.') };
      const now = ctx.now().getTime(), slotEnd = (at: unknown, submitted: unknown) => Date.parse(String(at ?? submitted)) + DISPLAY_MS;
      if (slotEnd(row.display_at, row.submitted_at) > now) return { response: fail('lifecycle_blocked', 'Wait for your result to finish.') };
      const latest = ctx.db.prepare('SELECT display_at, submitted_at FROM active_proposal_events WHERE run_id = ? ORDER BY sequence DESC LIMIT 1').get(currentState(ctx).runId);
      if (latest && slotEnd(latest.display_at, latest.submitted_at) > now) return { response: fail('explore_busy', 'Another result is about to play.') };
      if (holder && holder.sessionId !== request.guestSessionId) return { response: fail('explore_busy', 'Another guest is exploring.') };
      const ordinal = (JSON.parse(String(row.after_state_json)) as { guestCount: number }).guestCount;
      const stationId = row.station_id === 'A' || row.station_id === 'B' ? row.station_id : undefined;
      holder = { sessionId: request.guestSessionId, ...(stationId ? { stationId } : {}), target: request.target, ordinal };
      return { response: { ok: true, data: { target: request.target } }, event: { type: 'explore', target: request.target, ordinal, ...(stationId ? { stationId } : {}) } };
    },
    /** A new live result, reset or Undo takes the screen back. */
    end,
    /** The station (or the single station) starts its next guest. */
    endFor(stationId: 'A' | 'B' | undefined) { return holder && holder.stationId === stationId ? end() : undefined; },
  };
}
