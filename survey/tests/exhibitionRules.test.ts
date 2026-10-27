import assert from 'node:assert/strict';
import { CITY_AXES, initialExhibitionState, zeroScores, type CityAxis, type ExhibitionState, type ExhibitionVotes, type Vote } from '../src/shared/citySurveyState.ts';
import { deriveExhibitionLayout, exhibitionBand, exhibitionDisplayScores, exhibitionScaleGain, initialLadder, ladderGap, ladderLayout, ladderStep, pickHeadline, type ExhibitionLadder, type ExhibitionSocketId } from '../src/shared/cityView.ts';
import { loadQuestionSetFile, QuestionSetError, validateExhibitionQuestionSet } from '../src/survey/questionLoader.ts';
import { applyProposalVotes, validateExhibitionState } from '../src/survey/scoreEngine.ts';

const near = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
const votes = (vote: Vote): ExhibitionVotes => Object.fromEntries(CITY_AXES.map(axis => [axis, vote])) as ExhibitionVotes;
const add = (state: ExhibitionState, proposalVotes: ExhibitionVotes): ExhibitionState =>
  applyProposalVotes(state, proposalVotes, `t${state.guestCount + 1}`);
const run = (count: number, vote: Vote): ExhibitionState => {
  let state = initialExhibitionState('fixture', 't0');
  for (let i = 0; i < count; i++) state = add(state, votes(vote));
  return state;
};

// Published accumulation fixtures: each complete proposal updates all four axes once.
const sameDirection = new Map([[1, 7.5], [5, 10.576171875], [20, 11.9809727284], [50, 11.9999966021]]);
let unanimous = initialExhibitionState('fixture', 't0');
for (let n = 1; n <= 50; n++) {
  unanimous = add(unanimous, votes(1));
  const expected = sameDirection.get(n);
  if (expected !== undefined) for (const axis of CITY_AXES) near(unanimous.scores[axis], expected);
}

for (const [previous, expected] of [[20, 8.4143009748], [30, 8.6120996064], [50, 8.7647033339]] as const) {
  const reversed = add(run(previous, 1), votes(-1));
  assert.equal(reversed.guestCount, previous + 1);
  for (const axis of CITY_AXES) near(reversed.scores[axis], expected);
}

let zeroRun = initialExhibitionState('zero', 't0');
let alternating = initialExhibitionState('alternating', 't0');
for (let i = 0; i < 1000; i++) {
  zeroRun = add(zeroRun, votes(0));
  alternating = add(alternating, {
    automation: i % 2 === 0 ? 1 : -1,
    publicSharing: 0,
    environmentalPriority: -1,
    urbanConcentration: i % 2 === 0 ? -1 : 1,
  });
  for (const axis of CITY_AXES) {
    assert.ok(Number.isFinite(alternating.scores[axis]));
    assert.ok(alternating.scores[axis] >= -12 && alternating.scores[axis] <= 12);
  }
}
assert.deepEqual(zeroRun.scores, zeroScores());
assert.deepEqual(zeroRun.voteSums, zeroScores());
assert.equal(alternating.voteSums.automation, 0);
assert.equal(alternating.voteSums.publicSharing, 0);
assert.equal(alternating.voteSums.environmentalPriority, -1000);
assert.equal(alternating.voteSums.urbanConcentration, 0);
near(alternating.scores.automation, -6 / 7);
assert.equal(alternating.scores.publicSharing, 0);
near(alternating.scores.environmentalPriority, -12);
near(alternating.scores.urbanConcentration, 6 / 7);

const initial = initialExhibitionState('invalid', 't0');
assert.throws(() => validateExhibitionState({ ...initial, scores: { ...initial.scores, automation: Number.NaN } }), RangeError);
assert.throws(() => validateExhibitionState({ ...initial, scores: { ...initial.scores, automation: 13 } }), RangeError);
assert.throws(() => validateExhibitionState({ ...initial, voteSums: { ...initial.voteSums, automation: 0.5 } }), RangeError);
assert.throws(() => validateExhibitionState({ ...initial, guestCount: 1 }), RangeError);
assert.throws(() => add(initial, { ...votes(0), automation: 2 as Vote }), TypeError);

const socketForAxis: Record<CityAxis, ExhibitionSocketId> = {
  automation: 'nw', publicSharing: 'sw', environmentalPriority: 'ne', urbanConcentration: 'se',
};
for (const [score, band] of [[-12, 'low'], [-3, 'low'], [0, 'mixed'], [3, 'high'], [12, 'high']] as const) {
  assert.equal(exhibitionBand(score), band);
  for (const axis of CITY_AXES) {
    const scores = zeroScores();
    scores[axis] = score;
    assert.equal(deriveExhibitionLayout(scores).bands[socketForAxis[axis]], band);
  }
}
const baseline = deriveExhibitionLayout(zeroScores());
assert.deepEqual(baseline.bands, { nw: 'mixed', ne: 'mixed', sw: 'mixed', se: 'mixed' });
assert.deepEqual({
  automatedPorts: baseline.automatedPorts,
  sharedSeats: baseline.sharedSeats,
  treeCount: baseline.treeCount,
  plantedFraction: baseline.plantedFraction,
  coolingFins: baseline.coolingFins,
  functionModules: baseline.functionModules,
}, { automatedPorts: 3, sharedSeats: 4, treeCount: 8, plantedFraction: 0.5, coolingFins: 3, functionModules: 4 });
assert.throws(() => exhibitionBand(Number.POSITIVE_INFINITY), RangeError);
assert.throws(() => deriveExhibitionLayout({ ...zeroScores(), automation: -13 }), RangeError);

// Scale A: ×0.85 opening, linear to ×2.4 at guest #12, then constant; display scores clamp to ±12.
assert.equal(exhibitionScaleGain(0), 0.85);
assert.equal(exhibitionScaleGain(1), 0.85);
assert.ok(Math.abs(exhibitionScaleGain(6.5) - 1.625) < 1e-12);
assert.equal(exhibitionScaleGain(12), 2.4);
assert.equal(exhibitionScaleGain(500), 2.4);
for (let n = 1; n < 20; n++) assert.ok(exhibitionScaleGain(n + 1) >= exhibitionScaleGain(n), 'gain never weakens');
assert.equal(exhibitionDisplayScores({ ...zeroScores(), automation: 7.5 }, 1).automation, 6.375);
assert.equal(exhibitionDisplayScores({ ...zeroScores(), automation: 7.5 }, 12).automation, 12);
assert.equal(exhibitionDisplayScores({ ...zeroScores(), automation: -1.5 }, 40).automation, -3.5999999999999996);
assert.deepEqual(ladderLayout(initialLadder().tiers), baseline, 'the neutral ladder is the mixed city');

// Ladder: rungs at |D| 1.5 / 4 / 7; returning toward mixed needs D a further 2 past the edge.
for (const [tier, d, gap] of [[0, 1.4, 0], [0, 1.5, 1], [0, 4, 2], [0, 12, 3], [0, -7, -3], [1, 0, 0], [1, -.4, 0], [1, -.5, -1], [2, 2.1, 0], [2, 2, -1],
  [3, 5.1, 0], [3, 5, -1], [-1, .5, 1], [-1, .4, 0], [-3, -12, 0], [1, -12, -4]] as const) assert.equal(ladderGap(tier, d), gap, `gap(${tier}, ${d})`);
assert.deepEqual(deriveExhibitionLayout({ ...zeroScores(), automation: 4, publicSharing: -1.5, urbanConcentration: 7 }).tiers, { nw: 2, ne: 0, sw: -1, se: 3 });
// Focal values switch completely at rung 1; districts read the tier itself.
assert.deepEqual([1, 2, 3].map(tier => ladderLayout({ nw: tier, ne: 0, sw: -tier, se: 0 })).map(l => [l.automatedPorts, l.sharedSeats, l.bands.nw, l.bands.sw]),
  [[6, 0, 'high', 'low'], [6, 0, 'high', 'low'], [6, 0, 'high', 'low']]);

// A leaning crowd: every proposal moves at most one site one rung, the first guest exactly one, and slot seeds freeze at rung 2.
{
  let state = initialExhibitionState('ladder', 't0'), ladder: ExhibitionLadder = initialLadder();
  const seeds = { ...zeroScores(), automation: 11, publicSharing: 22, environmentalPriority: 33, urbanConcentration: 44 };
  for (let i = 0; i < 30; i++) {
    const v: ExhibitionVotes = { automation: 1, publicSharing: i % 3 ? -1 : 0, environmentalPriority: 0, urbanConcentration: i % 2 ? 1 : -1 };
    state = add(state, v);
    seeds.automation += i;
    const next = ladderStep(ladder, state, v, seeds);
    const moved = (Object.keys(next.tiers) as ExhibitionSocketId[]).filter(id => next.tiers[id] !== ladder.tiers[id]);
    assert.ok(moved.length <= 1 && moved.every(id => Math.abs(next.tiers[id] - ladder.tiers[id]) === 1), `proposal ${i + 1} moved ${moved}`);
    if (i === 0) assert.deepEqual(next.tiers, { nw: 0, ne: 0, sw: 0, se: -1 }, 'guest #1 (rotation ne, sw, se, nw): only the concentration focal site');
    if (Math.abs(next.tiers.nw) === 2 && ladder.seeds.automation === 0) assert.equal(next.seeds.automation, seeds.automation, 'seed adopted at rung 2');
    else if (ladder.seeds.automation) assert.equal(next.seeds.automation, ladder.seeds.automation, 'seed stays frozen');
    ladder = next;
  }
  assert.equal(ladder.tiers.nw, 3, 'a steady automation crowd climbs the whole ladder');
  assert.notEqual(ladder.seeds.automation, 0);
}
// Ties prefer a site the guest voted toward over the rotation's first site.
{
  const after = { scores: { ...zeroScores(), automation: 5, publicSharing: 5 }, guestCount: 20 };
  const step = (v: Partial<ExhibitionVotes>) => ladderStep(initialLadder(), after, { ...votes(0), ...v }, zeroScores()).tiers;
  assert.deepEqual(step({ publicSharing: 1 }), { nw: 0, ne: 0, sw: 1, se: 0 });
  assert.deepEqual(step({ automation: 1 }), { nw: 1, ne: 0, sw: 0, se: 0 });
  assert.deepEqual(step({}), { nw: 1, ne: 0, sw: 0, se: 0 }, 'guest #20 rotation starts at nw');
}

// Headline: highest tier newly reached, else the largest carrier change, else energy.
{
  const at = (nw: number, sw: number, se = 0, ne = 0) => ladderLayout({ nw, ne, sw, se });
  assert.deepEqual(pickHeadline(at(0, 0), at(1, 0)), { socketId: 'nw' });
  assert.deepEqual(pickHeadline(at(1, 2), at(2, 3)), { socketId: 'sw' }, 'the higher rung wins');
  assert.deepEqual(pickHeadline(at(0, -2), at(1, -3)), { socketId: 'sw' }, 'rung height is symmetric');
  assert.deepEqual(pickHeadline(at(0, 0), { ...at(0, 0), automatedPorts: 5, sharedSeats: 5, bands: { ...at(0, 0).bands, sw: 'high' } }), { socketId: 'sw' }, 'largest carrier change');
  const water = (n: 0 | 1 | 2) => ({ ...at(1, 0), energy: { waterGardens: n, receiver: 'none' as const, flywheel: false, island: false } });
  assert.deepEqual(pickHeadline(water(0), water(1)), { energy: true });
  assert.deepEqual(pickHeadline({ ...water(0), tiers: { ...water(0).tiers, nw: 0 } }, water(1)), { socketId: 'nw' }, 'a tier beats energy');
  assert.equal(pickHeadline(water(1), water(1)), undefined);
  assert.equal(pickHeadline(at(1, 0), water(0)), undefined, 'absent energy equals the empty configuration');
}

const questionPath = new URL('../src/survey/questions.exhibition.v3.json', import.meta.url).pathname;
const questionSet = validateExhibitionQuestionSet(loadQuestionSetFile(questionPath));
assert.equal(questionSet.version, 3);
assert.equal(validateExhibitionQuestionSet({ ...questionSet, version: 2 }).version, 2);
for (const version of [1, 0, -1, 2.5, NaN])
  assert.throws(() => validateExhibitionQuestionSet({ ...questionSet, version }), QuestionSetError);
assert.ok(questionSet.questions.every(question => question.background));
assert.equal(questionSet.questions.length, 4);
assert.ok(questionSet.questions.every(question => question.options.length === 3));
assert.throws(() => validateExhibitionQuestionSet({ ...questionSet, questions: questionSet.questions.slice(1) }), QuestionSetError);
const tooFewOptions = structuredClone(questionSet);
tooFewOptions.questions[0].options.pop();
assert.throws(() => validateExhibitionQuestionSet(tooFewOptions), /exactly three options/);
const tooManyOptions = structuredClone(questionSet);
tooManyOptions.questions[0].options.push({ ...tooManyOptions.questions[0].options[0], id: 'extra' });
assert.throws(() => validateExhibitionQuestionSet(tooManyOptions), /exactly three options/);
const duplicateAxis = structuredClone(questionSet);
for (const option of duplicateAxis.questions[3].options) option.effects = { environmentalPriority: option.effects.urbanConcentration ?? 0 };
assert.throws(() => validateExhibitionQuestionSet(duplicateAxis), /each exhibition axis must have exactly one question/);

console.log('PASS: exhibition accumulation, reversal, 1,000-proposal bounds, mapping baselines and four-by-three question rules.');
