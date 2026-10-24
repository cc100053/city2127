import assert from 'node:assert/strict';
import { CITY_AXES, initialExhibitionState, zeroScores, type CityAxis, type ExhibitionState, type ExhibitionVotes, type Vote } from '../src/shared/citySurveyState.ts';
import { deriveExhibitionLayout, exhibitionBand, exhibitionDisplayScores, exhibitionScaleGain, exhibitionStateLayout, type ExhibitionSocketId } from '../src/shared/cityView.ts';
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
assert.deepEqual(exhibitionStateLayout(zeroScores(), 40), baseline, 'neutral city is unchanged by the scale');
// A late Meter of 1.5 is mixed in raw terms but high on Scale A; the opening guest cannot reach the extreme.
assert.equal(exhibitionStateLayout({ ...zeroScores(), automation: 1.5 }, 40).bands.nw, 'high');
assert.equal(exhibitionStateLayout({ ...zeroScores(), automation: 7.5 }, 1).automatedPorts, 5);
assert.throws(() => exhibitionStateLayout({ ...zeroScores(), automation: 13 }, 5), RangeError);

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
