// Question rotation, city side (QUESTION_ROTATION_PLAN phase 2, Q01 only): Q01's shown option drives the NW focal rung,
// version4 views pass through untouched, and a Q01 swap reads the NW focal copy.
import assert from 'node:assert/strict';
import { ladderLayout } from '../survey/src/shared/cityView.ts';
import { q01Swap, rotationLayout, withQ01, Q01_NW_TIERS } from '../src/rotationLayout.ts';
import { residentCards, residentResult } from '../src/surveyAtmosphere.ts';
import type { ExhibitionProposal, ExhibitionView } from '../src/surveyView.ts';

const zero = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
const neutral = ladderLayout({ nw: 0, ne: 0, sw: 0, se: 0 });
const view = (rotation?: ExhibitionView['rotation'], layout = neutral) => ({
  version: 2, runId: 'r', revision: 1, guestCount: 1, algorithmVersion: 2, voteSums: zero, recentVotes: zero, scores: zero,
  layout, recentProposals: [], ...(rotation ? { rotation } : {}),
}) as ExhibitionView;
const shown = (q01: string) => ({ version: 1, shown: { Q01: q01, Q02: 'A' }, changedAt: { Q01: 0, Q02: 0 } });

// A → −1 low, B → 0 mixed, C → +1 high: the same rungs and port counts a version4 ladder gives NW.
for (const [option, tier] of Object.entries(Q01_NW_TIERS)) {
  const layout = rotationLayout(view(shown(option)));
  const ladder = ladderLayout({ nw: tier, ne: 0, sw: 0, se: 0 });
  assert.equal(layout.tiers.nw, tier, `Q01 ${option} → NW rung ${tier}`);
  assert.equal(layout.bands.nw, ladder.bands.nw);
  assert.equal(layout.automatedPorts, ladder.automatedPorts);
  assert.deepEqual({ ...layout, bands: { ...layout.bands, nw: 'mixed' }, tiers: { ...layout.tiers, nw: 0 }, automatedPorts: 3 }, neutral, 'only NW fields change');
}
assert.deepEqual([...['A', 'B', 'C'].map(o => rotationLayout(view(shown(o))).bands.nw)], ['low', 'mixed', 'high']);

// version4: no rotation field → the server layout object itself, whatever its rungs.
const v4 = ladderLayout({ nw: 2, ne: -1, sw: 0, se: 3 });
assert.equal(rotationLayout(view(undefined, v4)), v4, 'version4 views render the server layout unchanged');
assert.equal(rotationLayout(view(undefined)), neutral);
// Unknown or missing Q01 leaves the rotation layout as the server sent it.
assert.equal(withQ01(neutral, 'D'), neutral);
assert.equal(rotationLayout(view({ version: 1, shown: { Q02: 'B' }, changedAt: { Q02: 3 } })), neutral);

// The ambient NW facility card follows the shown option.
const serviceCard = (o: string) => residentCards(view(shown(o))).find(card => card.id.startsWith('service.'))!.id;
assert.deepEqual(['A', 'B', 'C'].map(serviceCard), ['service.human', 'service.hybrid', 'service.autonomous']);

// Result card: a Q01 swap reads the NW focal copy from its own outcome (the proposal's Meter layouts stay neutral).
const proposal = (outcome: NonNullable<ExhibitionProposal['rotation']>['outcome'], q01: string): ExhibitionProposal => ({
  id: 'p', runId: 'r', guestSessionId: 'g', ordinal: 1, questionSetVersion: 1, algorithmVersion: 2,
  answers: [{ questionId: 'Q02', optionId: 'B', questionText: '', optionLabel: '' }, { questionId: 'Q01', optionId: q01, questionText: '', optionLabel: '' }],
  votes: zero, revisionBefore: 0, revisionAfter: 1, submittedAt: '', beforeScores: zero, afterScores: zero,
  beforeLayout: neutral, afterLayout: neutral, cityChanges: [],
  rotation: { outcome, shares: [] },
});
const nwFocal = [{ socketId: 'nw' as const, focal: true, district: false }];
const toC = residentResult(proposal({ kind: 'swap', questionId: 'Q01', from: 'B', to: 'C' }, 'C'), nwFocal);
assert.equal(toC.kind, 'configuration');
assert.match(toC.preference, /自分の都合でいつでも使えるサービス/);
assert.match(toC.effect, /自律サービスの端口が増えました/);
assert.equal(toC.effect, 'この拠点では、自分の都合で使える自律サービスの端口が増えました。', 'a rotation swap is the guest\'s own answer: no shared-voices prefix');
const toA = residentResult(proposal({ kind: 'swap', questionId: 'Q01', from: 'C', to: 'A' }, 'A'), [{ ...nwFocal[0], low: true }]);
assert.match(toA.preference, /人に相談できる日常/);
assert.match(toA.effect, /人に相談できる窓口が増えました/, 'the direct C→A jump reads as more counters');
assert.equal(q01Swap(proposal({ kind: 'swap', questionId: 'Q02', from: 'A', to: 'B' }, 'B')), undefined, 'other questions draw no city change yet');
assert.equal(q01Swap(proposal({ kind: 'fallback', questionId: 'Q01' }, 'B')), undefined);
assert.equal(residentResult(proposal({ kind: 'swap', questionId: 'Q02', from: 'A', to: 'B' }, 'B'), []).kind, 'maintained');

console.log('rotation layout tests passed');
