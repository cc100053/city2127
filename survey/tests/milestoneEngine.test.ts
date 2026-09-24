import assert from 'node:assert/strict';
import { initialCitySurveyState, zeroScores } from '../src/shared/citySurveyState.ts';
import { newlyUnlocked, updateMilestones } from '../src/survey/milestoneEngine.ts';
import { resetRun } from '../src/server/adminService.ts';
import { fixture, answerNext, ok } from './surveyFixture.ts';

const none = initialCitySurveyState('run', 'now').milestones;
const s = (partial: Partial<ReturnType<typeof zeroScores>>) => ({ ...zeroScores(), ...partial });

assert.deepEqual(updateMilestones(none, s({ environment: 7, culture: 7, community: 5, technology: 7, mobility: 12 })), none);
assert.equal(updateMilestones(none, s({ environment: 8 })).greenNetwork, true);
assert.equal(updateMilestones(none, s({ culture: 7, community: 5 })).civicCommons, false);
assert.equal(updateMilestones(none, s({ culture: 7, community: 6 })).civicCommons, true);
assert.equal(updateMilestones(none, s({ technology: 8, mobility: 5 })).autonomousGrid, false);
assert.equal(updateMilestones(none, s({ technology: 8, mobility: 6 })).autonomousGrid, true);
const all = updateMilestones(none, s({ environment: 8, culture: 7, community: 6, technology: 8, mobility: 6 }));
assert.deepEqual(all, { greenNetwork: true, civicCommons: true, autonomousGrid: true });
assert.deepEqual(newlyUnlocked(none, all), ['greenNetwork', 'civicCommons', 'autonomousGrid']);
// Irreversible: falling scores keep unlocked milestones.
assert.deepEqual(updateMilestones(all, s({ environment: -12, culture: -12, technology: -12 })), all);

// Through the service: environment 3+2+3 = 8 unlocks greenNetwork, then a negative answer keeps it.
const { ctx } = fixture();
answerNext(ctx, 'solar-canopy');          // env 3, tech 1
answerNext(ctx, 'walkable-blocks');       // env 5
const third = answerNext(ctx, 'urban-forest').answer; // env 8
assert.equal(third.state.scores.environment, 8);
assert.equal(third.state.milestones.greenNetwork, true);
const lowered = answerNext(ctx, 'central-ai').answer; // data-01 has no env effect; next lowers env
assert.equal(lowered.state.milestones.greenNetwork, true);
const down = answerNext(ctx, 'replace-all').answer;
assert.equal(down.state.scores.environment, 8);
const fell = answerNext(ctx, 'import-logistics').answer; // env -1 → 7
assert.equal(fell.state.scores.environment, 7);
assert.equal(fell.state.milestones.greenNetwork, true, 'milestone must stay unlocked after the score drops');

const reset = ok(resetRun(ctx, { confirmation: 'RESET' }).response);
assert.deepEqual(reset.state.milestones, none);
console.log('PASS: milestone thresholds, irreversible unlocks and fresh milestones in a new run.');
