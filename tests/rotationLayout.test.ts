// Question rotation, city side (QUESTION_ROTATION_PLAN phase 2, Q01 only): Q01's shown option drives the NW focal rung,
// version4 views pass through untouched, and a Q01 swap reads the NW focal copy.
import assert from 'node:assert/strict';
import { ladderLayout } from '../survey/src/shared/cityView.ts';
import { conceptVisit, q01Swap, q02Swap, rotationLayout, rotationVisit, withQ01, Q01_NW_TIERS, ROTATION_VISITS } from '../src/rotationLayout.ts';
import { loadRotationSetFile } from '../survey/src/survey/questionLoader.ts';
import { journeyOutcome } from '../src/voteJourney.ts';
import { CONCEPT_JOINED, CONCEPT_PLACE, residentCards, residentResult } from '../src/surveyAtmosphere.ts';
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
// Q02 swaps move the shown model between lots (src/lotRuntime.ts) with no Meter carrier, so they read their own (provisional) copy.
const flower = residentResult(proposal({ kind: 'swap', questionId: 'Q02', from: 'A', to: 'B' }, 'B'), []);
assert.equal(flower.kind, 'configuration');
assert.equal(flower.place, '南部公園沖の湾の花');
assert.match(flower.effect, /湾の花が開きました/);
assert.deepEqual(['A', 'B', 'C'].map(to => q02Swap(proposal({ kind: 'swap', questionId: 'Q02', from: 'B', to }, to))?.to), ['A', 'B', 'C']);
assert.equal(q02Swap(proposal({ kind: 'fallback', questionId: 'Q02' }, 'B')), undefined);
assert.equal(residentResult(proposal({ kind: 'fallback', questionId: 'Q02' }, 'B'), []).kind, 'concept', 'a Q02 fallback without a visit goes to the concept lot');
// Q03 swaps show or fade the drawer housing on its shared lot: their own (provisional) copy (vacant to vacant: concept lot, below).
const leaves = residentResult(proposal({ kind: 'swap', questionId: 'Q03', from: 'A', to: 'C' }, 'B'), []);
assert.equal(leaves.kind, 'configuration');
assert.equal(leaves.place, '車が引き出しになる住宅の跡地');
assert.match(leaves.effect, /環道だけが残る空き地/);
assert.match(residentResult(proposal({ kind: 'swap', questionId: 'Q03', from: 'B', to: 'A' }, 'B'), []).effect, /住宅が戻りました/);
// Q06 swaps show or fade the pod-frame tower on its shared lot: their own (provisional) copy (vacant to vacant: concept lot, below).
const towerLeaves = residentResult(proposal({ kind: 'swap', questionId: 'Q06', from: 'B', to: 'A' }, 'B'), []);
assert.equal(towerLeaves.kind, 'configuration');
assert.equal(towerLeaves.place, '蛋形ポッドの塔の跡地');
assert.match(towerLeaves.effect, /芝生の空き地になりました/);
assert.match(residentResult(proposal({ kind: 'swap', questionId: 'Q06', from: 'C', to: 'B' }, 'B'), []).effect, /塔が戻りました/);

// Plan 2.6: the result card carries the crowd share of the outcome's question only, without a number below the threshold.
const shared = (outcome: NonNullable<ExhibitionProposal['rotation']>['outcome'], percent?: number) => residentResult({
  ...proposal(outcome, 'C'),
  rotation: { outcome, shares: [{ questionId: 'Q02', optionId: 'B', votes: 3, total: 12, percent: 25 }, { questionId: 'Q01', optionId: 'C', votes: 6, total: 12, ...(percent === undefined ? {} : { percent }) }] },
}, nwFocal).share;
assert.equal(shared({ kind: 'swap', questionId: 'Q01', from: 'B', to: 'C' }, 50), '同じ暮らしを選んだ住民 50%（12人中）');
assert.equal(shared({ kind: 'fallback', questionId: 'Q02' }, 50), '同じ暮らしを選んだ住民 25%（12人中）', 'the fallback question\'s share');
assert.equal(shared({ kind: 'swap', questionId: 'Q01', from: 'B', to: 'C' }), 'この問いへの声は、まだ集まり始めたところです');
assert.equal(toC.share, undefined, 'no share without one for the outcome question');

// Plan 3.4: nothing visible changed, so the card and camera visit a drawn site already showing the guest's answer, with that answer's share.
const visiting = (outcome: NonNullable<ExhibitionProposal['rotation']>['outcome'], visit: string, q01 = 'C'): ExhibitionProposal => ({
  ...proposal(outcome, q01),
  rotation: { outcome, visit, shares: [{ questionId: 'Q02', optionId: 'B', votes: 3, total: 12, percent: 25 }, { questionId: 'Q01', optionId: q01, votes: 6, total: 12, percent: 50 }] },
});
const here = residentResult(visiting({ kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' }, 'Q01'), []);
assert.deepEqual(here, { preference: 'あなたは、自分の都合でいつでも使えるサービスを大切にしました。', effect: 'あなたの選んだ暮らしは、すでにここにあります。',
  place: 'デックス西 AUTO HUB', kind: 'already-here', share: '同じ暮らしを選んだ住民 50%（12人中）' });
assert.deepEqual(rotationVisit(visiting({ kind: 'fallback', questionId: 'Q02' }, 'Q02')), { questionId: 'Q02', optionId: 'B', shot: 'q02:flower', place: '南部公園沖の湾の花' });
assert.equal(rotationVisit(visiting({ kind: 'fallback', questionId: 'Q01' }, 'Q01', 'A'))?.shot, 'nw:focal-low', 'the −1 hall is framed by the low NW shot');
assert.match(residentResult(visiting({ kind: 'fallback', questionId: 'Q02' }, 'Q02'), []).preference, /評判を確かめてから/);
// The journey lands where the camera goes: a visit reads as a neutral fallback on that site; without one the outcome stands.
assert.deepEqual(journeyOutcome({ outcome: { kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' }, visit: 'Q01' }), { kind: 'fallback', questionId: 'Q01' });
assert.deepEqual(journeyOutcome({ outcome: { kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' } }), { kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' });
// The server visits only options with a model; each one needs a camera stop here, and every stop names a model the set holds.
const shippedSet = loadRotationSetFile(new URL('../survey/src/survey/questions.rotation.v1.json', import.meta.url).pathname);
const modelled = shippedSet.questions.flatMap(q => q.options.filter(o => o.modelId).map(o => `${q.id}:${o.id}`)).sort();
assert.deepEqual(Object.entries(ROTATION_VISITS).flatMap(([q, options]) => Object.keys(options).map(o => `${q}:${o}`)).sort(), modelled);
// Interim concept lot (owner 2026-11-20): nothing visible and nothing to visit flies to the concept lot, naming the guest's option for the
// outcome question; visible swaps and visits never do.
const unbuilt = (outcome: NonNullable<ExhibitionProposal['rotation']>['outcome'], optionId: string, rotationVisitId?: string): ExhibitionProposal => ({
  ...proposal(outcome, 'C'),
  answers: [{ questionId: outcome.questionId, optionId, questionText: '', optionLabel: '同じ建物の住民と共有する。' }, { questionId: 'Q01', optionId: 'C', questionText: '', optionLabel: '' }],
  rotation: { outcome, shares: [], ...(rotationVisitId ? { visit: rotationVisitId } : {}) },
});
assert.deepEqual(conceptVisit(unbuilt({ kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' }, 'B')), { questionId: 'Q04', optionId: 'B', label: '同じ建物の住民と共有する。', shot: 'concept:lot' });
assert.equal(conceptVisit(unbuilt({ kind: 'swap', questionId: 'Q03', from: 'B', to: 'C' }, 'C'))?.optionId, 'C', 'vacant to vacant');
assert.equal(conceptVisit(unbuilt({ kind: 'swap', questionId: 'Q06', from: 'A', to: 'C' }, 'C'))?.optionId, 'C', 'vacant to vacant');
assert.equal(conceptVisit(unbuilt({ kind: 'swap', questionId: 'Q08', from: 'A', to: 'B' }, 'B'))?.optionId, 'B', 'vacant to vacant');
assert.equal(conceptVisit(unbuilt({ kind: 'fallback', questionId: 'Q05' }, 'A'))?.questionId, 'Q05', 'a fallback with nothing to visit');
for (const visible of [{ kind: 'swap', questionId: 'Q03', from: 'A', to: 'B' }, { kind: 'swap', questionId: 'Q03', from: 'C', to: 'A' }, { kind: 'swap', questionId: 'Q06', from: 'B', to: 'C' },
  { kind: 'swap', questionId: 'Q08', from: 'C', to: 'A' }, { kind: 'swap', questionId: 'Q02', from: 'A', to: 'B' }] as const)
  assert.equal(conceptVisit(unbuilt(visible, visible.to)), undefined, `${visible.questionId} ${visible.from}→${visible.to} shows a model change`);
assert.equal(conceptVisit(proposal({ kind: 'swap', questionId: 'Q01', from: 'B', to: 'C' }, 'C')), undefined, 'a Q01 swap');
assert.equal(conceptVisit(unbuilt({ kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' }, 'B', 'Q01')), undefined, 'a visit wins');
assert.equal(conceptVisit({ ...proposal({ kind: 'fallback', questionId: 'Q01' }, 'C'), rotation: undefined }), undefined, 'version4 proposals');
const ideaCard = residentResult(unbuilt({ kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' }, 'B'), []);
assert.deepEqual([ideaCard.kind, ideaCard.preference, ideaCard.effect, ideaCard.place], ['concept', 'あなたは「同じ建物の住民と共有する」という暮らしを選びました。', CONCEPT_JOINED, CONCEPT_PLACE]);
assert.match(residentResult(unbuilt({ kind: 'swap', questionId: 'Q03', from: 'B', to: 'C' }, 'C'), []).preference, /地域の共有サービス/, 'a known option keeps its preference line');

console.log('rotation layout tests passed');
