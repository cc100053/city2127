import assert from 'node:assert/strict';
import { cityText, exhibitionFeedback, exhibitionScoresText, exhibitionVoteMarks, policyText, scoresToWorldState } from '../src/surveyAtmosphere.ts';
import { presets } from '../src/presets.ts';
import { connectSurvey, isExhibitionView, parseSurveyEvent, supersedes, type CityView } from '../src/surveyView.ts';
import { createWorldState } from '../src/worldState.ts';

const zero = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
assert.deepEqual(scoresToWorldState(zero), presets.neutral);
const n = presets.neutral;
const auto = scoresToWorldState({ ...zero, automation: 2 });
assert.ok(auto.traffic > n.traffic && auto.glyph > n.glyph);
const green = scoresToWorldState({ ...zero, environmentalPriority: 12 });
assert.ok(green.greenery > n.greenery && green.haze < n.haze && green.warmth >= .85);
assert.ok(scoresToWorldState({ ...zero, publicSharing: 2 }).crowd > n.crowd);
assert.ok(scoresToWorldState({ ...zero, urbanConcentration: 2 }).windowLife > n.windowLife);
for (const v of Object.values(scoresToWorldState({ automation: 12, publicSharing: -12, environmentalPriority: 12, urbanConcentration: 12 }))) assert.ok(v >= 0 && (v <= 1 || v === n.timeOfDay));

const lot = (l = 'empty', b = 'none') => ({ lot: l, building: b });
const layout = { version: 1, lots: { nw: lot('empty', 'medium'), ne: lot(), sw: lot(), se: lot() } };
const view = { runId: 'r', revision: 1, scores: { ...zero, automation: 2 }, layout, history: [{ revision: 1, questionText: 'q', optionLabel: 'x', policyChange: { automation: 2 }, cityChanges: [{ socketId: 'nw', label: 'hub' }] }] };
const parsed = parseSurveyEvent({ type: 'city-state-updated', view });
if (!parsed || !('kind' in parsed) || parsed.view.version !== 1) throw new Error('expected a normalized v1 event');
assert.equal(parsed.kind, 'city-state-updated');
const snapshot = parseSurveyEvent({ type: 'city-state-snapshot', view });
assert.ok(snapshot && 'kind' in snapshot);
assert.equal(snapshot.kind, 'city-state-snapshot');
const reset = parseSurveyEvent({ type: 'run-reset', view });
assert.ok(reset && 'kind' in reset);
assert.equal(reset.kind, 'run-reset');
const explicitV1 = parseSurveyEvent({ type: 'city-state-updated', view: { ...view, version: 1 } });
assert.ok(explicitV1 && 'kind' in explicitV1);
assert.equal(explicitV1.kind, 'city-state-updated');
assert.equal(explicitV1.view.version, 1);
assert.equal(parseSurveyEvent({ type: 'city-state-updated', state: view, view: { ...view, version: 2, layout: { version: 2, bands: {} } } }), null);
assert.deepEqual(parseSurveyEvent({ type: 'city-state-updated', view: { ...view, version: 3 } }), { unsupportedVersion: 3 });
assert.equal(parseSurveyEvent({ type: 'other', view }), null);
assert.equal(policyText(parsed.view.history[0]), '自動化 ↑ +2');
assert.equal(cityText(parsed.view.history[0]), 'MAGNET東 hub');
assert.equal(cityText({ ...parsed.view.history[0], cityChanges: [] }), '見た目の変化なし');
assert.equal(parseSurveyEvent({ type: 'city-state-updated', view: { ...view, layout: { lots: { ...layout.lots, se: lot('lake') } } } }), null);
assert.equal(parseSurveyEvent({ type: 'city-state-updated', view: { ...view, scores: { automation: 2 } } }), null);
assert.equal(parseSurveyEvent({ type: 'city-state-updated', view: { ...view, history: [{ ...view.history[0], cityChanges: [{ socketId: 'bad', label: 'hub' }] }] } }), null);
assert.equal(supersedes(parsed.view, parsed.view), false);
assert.equal(supersedes(parsed.view, { ...parsed.view, revision: 2 }), true);
assert.equal(supersedes(parsed.view, { ...parsed.view, runId: 'reset', revision: 0 }), true);

const v2BeforeLayout = { version: 2, bands: { nw: 'mixed', ne: 'mixed', sw: 'mixed', se: 'mixed' }, automatedPorts: 3, sharedSeats: 4, treeCount: 8, plantedFraction: .5, coolingFins: 3, functionModules: 4 } as const;
const v2AfterLayout = { ...v2BeforeLayout, bands: { ...v2BeforeLayout.bands, ne: 'low' }, treeCount: 5, plantedFraction: .3125, coolingFins: 5 } as const;
const v2BeforeScores = { ...zero };
const v2Scores = { ...zero, environmentalPriority: -7.5 };
const v2Proposal = {
  id: 'proposal-1', runId: 'r2', guestSessionId: 'guest-1', ordinal: 1, questionSetVersion: 2, algorithmVersion: 2,
  answers: [
    { questionId: 'service-2127', optionId: 'human-machine', questionText: 'Q1', optionLabel: '人と機械の協力' },
    { questionId: 'commons-2127', optionId: 'open-commons', questionText: 'Q2', optionLabel: '共有空間' },
    { questionId: 'cooling-2127', optionId: 'active-cooling', questionText: 'Q3', optionLabel: '設備による暑さ対策を優先しました' },
    { questionId: 'functions-2127', optionId: 'vertical-functions', questionText: 'Q4', optionLabel: '垂直機能' },
  ],
  votes: { ...zero, environmentalPriority: -1 }, revisionBefore: 0, revisionAfter: 1, submittedAt: '2026-09-28T00:00:00.000Z',
  beforeScores: v2BeforeScores, afterScores: v2Scores, beforeLayout: v2BeforeLayout, afterLayout: v2AfterLayout,
  cityChanges: [{ socketId: 'ne', label: '樹冠・冷却設備', before: { band: 'mixed', treeCount: 8, plantedFraction: .5, coolingFins: 3 }, after: { band: 'low', treeCount: 5, plantedFraction: .3125, coolingFins: 5 } }],
};
const v2View = {
  version: 2, runId: 'r2', revision: 1, guestCount: 1, algorithmVersion: 2, voteSums: { ...v2Proposal.votes },
  recentVotes: { ...zero, environmentalPriority: -.25 }, scores: v2Scores, layout: v2AfterLayout,
  recentProposals: [v2Proposal], latestProposal: v2Proposal,
};
const initialV2 = { version: 2, runId: 'r2', revision: 0, guestCount: 0, algorithmVersion: 2, voteSums: { ...zero }, recentVotes: { ...zero }, scores: { ...zero }, layout: v2BeforeLayout, recentProposals: [] };
const parsedInitialV2 = parseSurveyEvent({ type: 'city-state-snapshot', view: initialV2 });
assert.ok(parsedInitialV2 && 'kind' in parsedInitialV2 && isExhibitionView(parsedInitialV2.view));
const parsedV2 = parseSurveyEvent({ type: 'city-state-updated', view: v2View });
if (!parsedV2 || !('kind' in parsedV2) || !isExhibitionView(parsedV2.view)) throw new Error('expected a validated v2 event');
assert.equal(parsedV2.view.layout, v2AfterLayout);
assert.equal(supersedes(parsedV2.view, parsedV2.view), false);
assert.deepEqual(parseSurveyEvent({ type: 'city-state-updated', view: { ...v2View, scores: { ...v2Scores, environmentalPriority: Infinity } } }), null);
assert.deepEqual(parseSurveyEvent({ type: 'city-state-updated', view: { ...v2View, layout: { ...v2AfterLayout, coolingFins: 7 } } }), null);
assert.deepEqual(parseSurveyEvent({ type: 'city-state-updated', view: { ...v2View, layout: { ...v2AfterLayout, bands: { ...v2AfterLayout.bands, ne: 'wild' } } } }), null);
assert.deepEqual(parseSurveyEvent({ type: 'city-state-updated', view: { ...v2View, recentProposals: Array(65).fill(v2Proposal) } }), null);
assert.deepEqual(parseSurveyEvent({ type: 'city-state-updated', view: { ...v2View, latestProposal: { ...v2Proposal, afterLayout: { ...v2AfterLayout, treeCount: 6 } } } }), null);
assert.deepEqual(parseSurveyEvent({ type: 'city-state-updated', view: { ...v2View, latestProposal: { ...v2Proposal, answers: [v2Proposal.answers[0], { ...v2Proposal.answers[1], questionId: v2Proposal.answers[0].questionId }, ...v2Proposal.answers.slice(2)] } } }), null);
const reorderedProposal = { ...v2Proposal, answers: [v2Proposal.answers[2], v2Proposal.answers[1], v2Proposal.answers[0], v2Proposal.answers[3]] };
const reorderedV2 = parseSurveyEvent({ type: 'city-state-updated', view: { ...v2View, latestProposal: reorderedProposal, recentProposals: [reorderedProposal] } });
if (!reorderedV2 || !('kind' in reorderedV2) || !isExhibitionView(reorderedV2.view)) throw new Error('expected reordered v2 answers to parse');
assert.equal(exhibitionFeedback(reorderedV2.view.latestProposal)?.answers[0]?.optionLabel, '設備による暑さ対策を優先しました');
const missingChangeProposal = { ...v2Proposal, cityChanges: [] };
assert.equal(parseSurveyEvent({ type: 'city-state-updated', view: { ...v2View, latestProposal: missingChangeProposal, recentProposals: [missingChangeProposal] } }), null);
const feedback = exhibitionFeedback(parsedV2.view.latestProposal);
assert.equal(feedback?.ordinal, 1);
assert.deepEqual(feedback?.scores.map(score => [score.label, score.before, score.after]), [
  ['サービスの担い手', '0.0', '0.0'],
  ['空間の使い方', '0.0', '0.0'],
  ['暑さへの備え', '0.0', '-7.5'],
  ['機能の配置', '0.0', '0.0'],
]);
assert.equal(feedback?.cityChanges.length, 1);
assert.equal(feedback?.cityChanges[0]?.effect, '樹冠 8 → 5 · 植栽面 50.0% → 31.3% · 冷却設備 3 → 5');
assert.equal(feedback?.changed, true);
assert.equal(feedback?.cityChanged, true);
assert.equal(feedback?.note, '提案 #1 の街区構成変更を記録しました。');
assert.ok(exhibitionScoresText(parsedV2.view.scores).includes('暑さへの備え -7.5'));
assert.deepEqual(exhibitionVoteMarks({ automation: 1, publicSharing: 0, environmentalPriority: -1, urbanConcentration: 1 }), [
  { label: 'サービスの担い手', vote: 1, symbol: '＋' },
  { label: '空間の使い方', vote: 0, symbol: '·' },
  { label: '暑さへの備え', vote: -1, symbol: '−' },
  { label: '機能の配置', vote: 1, symbol: '＋' },
]);

const limitedFeedback = exhibitionFeedback({
  ...v2Proposal,
  cityChanges: [
    ...v2Proposal.cityChanges,
    { socketId: 'nw', label: '自律サービス端口', before: { automatedPorts: 2 }, after: { automatedPorts: 3 } },
    { socketId: 'sw', label: '共有席', before: { sharedSeats: 4 }, after: { sharedSeats: 5 } },
  ],
});
assert.equal(limitedFeedback?.cityChanges.length, 2);
assert.equal(limitedFeedback?.cityChanges[1]?.effect, '自律サービス端口 2 → 3');
const nonParkFeedback = exhibitionFeedback({
  ...v2Proposal,
  cityChanges: [
    { socketId: 'sw', label: '共有席', before: { sharedSeats: 4 }, after: { sharedSeats: 7 } },
    { socketId: 'se', label: '機能配置', before: { functionModules: 4 }, after: { functionModules: 3 } },
  ],
});
assert.deepEqual(nonParkFeedback?.cityChanges.map(change => change.place), ['道玄坂南', 'センター街奥']);

const sameBandFeedback = exhibitionFeedback({
  ...v2Proposal, beforeScores: { ...zero, environmentalPriority: 4 }, afterScores: { ...zero, environmentalPriority: 4.2 },
  cityChanges: [{ socketId: 'ne', label: '樹冠・冷却設備', before: { band: 'high', treeCount: 9, plantedFraction: .6, coolingFins: 2 }, after: { band: 'high', treeCount: 9, plantedFraction: .605, coolingFins: 2 } }],
});
assert.equal(sameBandFeedback?.changed, true);
assert.equal(sameBandFeedback?.cityChanges[0]?.effect, '植栽面 60.0% → 60.5%');
const bandOnlyFeedback = exhibitionFeedback({
  ...v2Proposal, beforeScores: zero, afterScores: zero,
  cityChanges: [{ socketId: 'ne', label: '樹冠・冷却設備', before: { band: 'mixed' }, after: { band: 'high' } }],
});
assert.equal(bandOnlyFeedback?.cityChanges.length, 1);
assert.equal(bandOnlyFeedback?.cityChanges[0]?.effect, 'Meter帯 mixed → high');
assert.equal(bandOnlyFeedback?.cityChanged, true);
const unchangedFeedback = exhibitionFeedback({ ...v2Proposal, beforeScores: zero, afterScores: zero, cityChanges: [] });
assert.equal(unchangedFeedback?.changed, false);
assert.equal(unchangedFeedback?.cityChanged, false);
assert.equal(unchangedFeedback?.note, 'Meter値と街区構成は維持されました。提案 #1 を記録しました。');

const webSocketDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
let messageListener: ((event: { data: string }) => void) | undefined;
class FakeWebSocket {
  constructor(_url: string) {}
  addEventListener(type: string, listener: (event: { data: string }) => void) {
    if (type === 'message') messageListener = listener;
  }
}
Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: FakeWebSocket });
try {
  const applied: string[] = [];
  const statuses: string[] = [];
  connectSurvey('ws://example.test/ws', (_kind, next) => applied.push(next.runId), status => statuses.push(status));
  messageListener?.({ data: JSON.stringify({ type: 'city-state-updated', state: view, view: { ...view, version: 2, layout: { version: 2, bands: {} } } }) });
  assert.deepEqual(applied, []);
  messageListener?.({ data: JSON.stringify({ type: 'city-state-updated', view: { ...view, version: 3 } }) });
  assert.ok(statuses.includes('Unsupported exhibition view version'));
  messageListener?.({ data: JSON.stringify({ type: 'city-state-updated', view: v2View }) });
  assert.deepEqual(applied, ['r2']);
  messageListener?.({ data: JSON.stringify({ type: 'city-state-updated', view }) });
  assert.deepEqual(applied, ['r2', 'r']);
  const modes: string[] = [], changes: string[] = [];
  let current: CityView | undefined;
  connectSurvey('ws://example.test/ws', (_kind, next) => {
    if (!supersedes(current, next)) return;
    current = next; changes.push(next.runId);
  }, () => {}, mode => modes.push(mode));
  for (const mode of ['day', 'night', 'auto', null, 'dusk']) {
    messageListener?.({ data: JSON.stringify({ type: 'city-state-snapshot', displayMode: mode, view: v2View }) });
  }
  assert.deepEqual(modes, ['day', 'night', 'auto']);
  assert.deepEqual(changes, ['r2'], 'lighting metadata does not reapply unchanged city revisions');
  messageListener?.({ data: JSON.stringify({ type: 'city-state-snapshot', view: v2View }) });
  assert.deepEqual(modes, ['day', 'night', 'auto', 'auto'], 'older servers default to Auto');

} finally {
  if (webSocketDescriptor) Object.defineProperty(globalThis, 'WebSocket', webSocketDescriptor);
  else delete (globalThis as { WebSocket?: unknown }).WebSocket;
}

// blendTo transitions without the preset hold lock, and a newer goal restarts from the current blend.
const world = createWorldState();
world.blendTo(auto, 0);
world.update(10);
assert.equal(world.state.traffic, auto.traffic);
world.blendTo(presets.neutral, 11);
world.update(16);
assert.ok(world.state.traffic < auto.traffic && world.state.traffic > n.traffic);
console.log('PASS: survey scores → atmosphere mapping, causal panel text, typed event parsing, revision order, blendTo.');
