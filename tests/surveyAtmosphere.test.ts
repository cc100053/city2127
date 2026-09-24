import assert from 'node:assert/strict';
import { parseSurveyEvent, scoresToWorldState, supersedes } from '../src/surveyAtmosphere.ts';
import { presets } from '../src/presets.ts';
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

const view = { runId: 'r', revision: 1, scores: { ...zero, automation: 2 }, layout: {}, history: [{ revision: 1, optionLabel: 'x', policyChange: { automation: 2 } }] };
const parsed = parseSurveyEvent({ type: 'city-state-updated', view });
assert.ok(parsed);
assert.equal(parseSurveyEvent({ type: 'other', view }), null);
assert.equal(parseSurveyEvent({ type: 'city-state-updated', view: { ...view, scores: { automation: 2 } } }), null);
assert.equal(supersedes(parsed, parsed), false);
assert.equal(supersedes(parsed, { ...parsed, revision: 2 }), true);
assert.equal(supersedes(parsed, { ...parsed, runId: 'reset', revision: 0 }), true);

// blendTo transitions without the preset hold lock, and a newer goal restarts from the current blend.
const world = createWorldState();
world.blendTo(auto, 0);
world.update(10);
assert.equal(world.state.traffic, auto.traffic);
world.blendTo(presets.neutral, 11);
world.update(16);
assert.ok(world.state.traffic < auto.traffic && world.state.traffic > n.traffic);
console.log('PASS: survey scores → atmosphere mapping, event parsing, revision order, blendTo.');
