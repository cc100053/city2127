import type { SurveyContext } from './context.ts';
import type { ExhibitionState } from '../shared/citySurveyState.ts';
import { toProposalRecord } from './runStore.ts';
import { buildExhibitionCityView } from '../survey/decisionHistory.ts';

/** Read the committed proposal, never the mutable current run/snapshot. */
export function archiveRecord(ctx: SurveyContext, id: string) {
  const row = ctx.db.prepare('SELECT * FROM proposal_events WHERE id=?').get(id);
  if (!row) return undefined;
  // Also validates the stored before/after state against the original votes.
  const proposal = toProposalRecord(row);
  const after = JSON.parse(String(row.after_state_json)) as ExhibitionState;
  // Only this guest's proposal is needed; do not expose other guests' answers.
  const view = buildExhibitionCityView(after, [proposal]);
  return {
    id: proposal.id, run_id: proposal.runId, revision: proposal.revisionAfter,
    proposal_number: proposal.ordinal, status: 'ready', result_type: '3d', view,
  };
}
