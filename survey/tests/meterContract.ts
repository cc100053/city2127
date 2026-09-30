import assert from 'node:assert/strict';
import type { QuestionSet } from '../src/shared/question.ts';
import type { Vote } from '../src/shared/citySurveyState.ts';

export type MeterContract = {
  axis: string; questionId: string; options: Record<Vote, string>; socket: string;
  /** Independent golden values for the first -1/0/+1 vote, not computed by production mapping. */
  parameters: Record<string, readonly [number, number, number]>;
};

/** Extend this table when registering a new product Meter; all generators/assertions reuse it. */
export const METER_CONTRACTS: readonly MeterContract[] = [
  { axis: 'automation', questionId: 'service-2127', socket: 'nw',
    options: { [-1]: 'human-led', 0: 'human-machine', 1: 'autonomous' }, parameters: { automatedPorts: [1, 3, 5] } },
  { axis: 'publicSharing', questionId: 'commons-2127', socket: 'sw',
    options: { [-1]: 'private-pods', 0: 'mixed-seating', 1: 'open-commons' }, parameters: { sharedSeats: [2, 4, 7] } },
  { axis: 'environmentalPriority', questionId: 'cooling-2127', socket: 'ne',
    options: { [-1]: 'active-cooling', 0: 'hybrid-cooling', 1: 'canopy-cooling' },
    parameters: { treeCount: [5, 8, 10], plantedFraction: [.3125, .5, .6875], coolingFins: [5, 3, 1] } },
  { axis: 'urbanConcentration', questionId: 'functions-2127', socket: 'se',
    options: { [-1]: 'distributed-pavilions', 0: 'mixed-functions', 1: 'vertical-functions' }, parameters: { functionModules: [3, 4, 5] } },
];

/** Checks registry coverage and answer semantics independently of the production question loader. */
export function assertMeterQuestions(set: QuestionSet, registeredAxes: readonly string[], meters: readonly MeterContract[]) {
  assert.deepEqual(meters.map(meter => meter.axis).sort(), [...registeredAxes].sort(), 'missing or duplicate Meter test definition');
  assert.equal(set.questions.length, meters.length);
  for (const meter of meters) {
    const question = set.questions.find(question => question.id === meter.questionId);
    assert.ok(question, `missing ${meter.questionId}`);
    assert.ok(question.text.trim());
    assert.equal(question.options.length, 3);
    for (const vote of [-1, 0, 1] as const) {
      const option = question.options.find(option => option.id === meter.options[vote]);
      assert.ok(option, `missing ${meter.axis} vote ${vote}`);
      assert.ok(option.label.trim());
      assert.deepEqual(option.effects, { [meter.axis]: vote }, `${meter.questionId}/${option.id} must vote on its assigned Meter`);
    }
  }
}

/** Cartesian generator works for any number of Meters without hard-coded nested loops. */
export function* meterCombinations(meters: readonly MeterContract[], index = 0, votes: Record<string, Vote> = {}): Generator<Record<string, Vote>> {
  if (index === meters.length) { yield { ...votes }; return; }
  for (const vote of [-1, 0, 1] as const) yield* meterCombinations(meters, index + 1, { ...votes, [meters[index].axis]: vote });
}

export function answersForVotes(meters: readonly MeterContract[], votes: Record<string, Vote>) {
  return meters.map(meter => ({ questionId: meter.questionId, optionId: meter.options[votes[meter.axis]] }));
}

export function firstProposalGolden(meters: readonly MeterContract[], votes: Record<string, Vote>) {
  const scores: Record<string, number> = {}, recent: Record<string, number> = {};
  const bands: Record<string, string> = {}, parameters: Record<string, number> = {};
  for (const meter of meters) {
    const index = votes[meter.axis] + 1;
    scores[meter.axis] = ([-7.5, 0, 7.5] as const)[index];
    recent[meter.axis] = ([-.25, 0, .25] as const)[index];
    bands[meter.socket] = (['low', 'mixed', 'high'] as const)[index];
    for (const [key, values] of Object.entries(meter.parameters)) parameters[key] = values[index];
  }
  return { scores, recent, layout: { version: 2, bands, ...parameters } };
}
