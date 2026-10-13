import assert from 'node:assert/strict';
import { exhibitionStateLayout } from '../survey/src/shared/cityView.ts';
import { displayScore, labLayout, replay, scaleStats, simulateVotes } from '../src/scaleLab.ts';

// Seeded sequences replay exactly; groups repeat one answer set per five guests.
assert.deepEqual(simulateVotes('balanced', 40, 7), simulateVotes('balanced', 40, 7));
assert.notDeepEqual(simulateVotes('balanced', 40, 7), simulateVotes('balanced', 40, 8));
const groups = simulateVotes('groups', 10, 3);
assert.deepEqual(groups[1], groups[0]);
assert.deepEqual(groups[4], groups[0]);
for (const votes of simulateVotes('strong', 30, 1)) for (const vote of Object.values(votes)) assert.ok(vote === -1 || vote === 0 || vote === 1);

// Replay uses the server reducer: guest #1 voting +1 on an axis gives 6 × (1 + .25) = 7.5.
const steps = replay([{ automation: 1, publicSharing: 0, environmentalPriority: -1, urbanConcentration: 0 }]);
assert.equal(steps.length, 2);
assert.equal(steps[1].state.scores.automation, 7.5);
assert.equal(steps[1].state.scores.environmentalPriority, -7.5);
assert.equal(steps[1].slotSeeds.publicSharing, 0, 'neutral votes leave the seed alone');
assert.notEqual(steps[1].slotSeeds.automation, 0);

// The lab shows exactly the server layout; the first guest opens mildly (6.375, not 12).
for (const step of replay(simulateVotes('leaning', 30, 4))) assert.deepEqual(labLayout(step), exhibitionStateLayout(step.state.scores, step.state.guestCount));
assert.equal(displayScore(steps[1], 'automation'), 6.375);

// A balanced crowd spreads across all three bands on Scale A and uses most port counts.
const stats = scaleStats(replay(simulateVotes('balanced', 400, 11)));
for (const band of ['low', 'mixed', 'high'] as const) assert.ok(stats.bands.automation[band] > .1, `automation reaches ${band}`);
assert.ok(stats.flips > 0 && stats.portValues >= 6);
const shares = stats.bands.publicSharing;
assert.ok(Math.abs(shares.low + shares.mixed + shares.high - 1) < 1e-9);
console.log('scaleLab tests passed');
