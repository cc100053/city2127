import assert from 'node:assert/strict';
import { deriveExhibitionLayout } from '../survey/src/shared/cityView.ts';
import { labLayout, replay, SCALE_A_GAIN, scaled, scaleStats, simulateVotes } from '../src/scaleLab.ts';

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

// Gain 1 is the authoritative layout; Scale A stretches and clamps.
const scores = { automation: 1.5, publicSharing: -2, environmentalPriority: 0, urbanConcentration: 6 };
assert.deepEqual(labLayout(scores, 1), deriveExhibitionLayout(scores));
assert.equal(labLayout(scores, 1).bands.nw, 'mixed');
assert.equal(labLayout(scores, SCALE_A_GAIN).bands.nw, 'high');
assert.equal(labLayout(scores, SCALE_A_GAIN).bands.sw, 'low');
assert.equal(scaled(6, SCALE_A_GAIN), 12);

// A balanced crowd sits in mixed under the current scale and spreads across bands under Scale A.
const long = replay(simulateVotes('balanced', 400, 11));
const current = scaleStats(long, 1), wide = scaleStats(long, SCALE_A_GAIN);
assert.ok(current.bands.automation.mixed > wide.bands.automation.mixed);
assert.ok(wide.flips > current.flips);
assert.ok(wide.portValues >= current.portValues);
const shares = current.bands.publicSharing;
assert.ok(Math.abs(shares.low + shares.mixed + shares.high - 1) < 1e-9);
console.log('scaleLab tests passed');
