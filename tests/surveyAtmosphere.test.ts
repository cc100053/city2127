import assert from 'node:assert/strict';
import { cityText, parseSurveyEvent, policyText, scoresToWorldState, siteTargets, supersedes } from '../src/surveyAtmosphere.ts';
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

const lot = (l = 'empty', b = 'none') => ({ lot: l, building: b });
const layout = { version: 1, lots: { nw: lot('empty', 'medium'), ne: lot(), sw: lot(), se: lot() } };
const view = { runId: 'r', revision: 1, scores: { ...zero, automation: 2 }, layout, history: [{ revision: 1, questionText: 'q', optionLabel: 'x', policyChange: { automation: 2 }, cityChanges: [{ socketId: 'nw', label: 'hub' }] }] };
const parsed = parseSurveyEvent({ type: 'city-state-updated', view });
assert.ok(parsed);
assert.equal(parseSurveyEvent({ type: 'other', view }), null);
assert.equal(policyText(parsed.history[0]), '自動化 ↑ +2');
assert.equal(cityText(parsed.history[0]), 'MAGNET東 hub');
assert.equal(cityText({ ...parsed.history[0], cityChanges: [] }), '見た目の変化なし');
assert.equal(parseSurveyEvent({ type: 'city-state-updated', view: { ...view, layout: { lots: { ...layout.lots, se: lot('lake') } } } }), null);
assert.deepEqual(siteTargets(parsed.layout), { hubBase: true, hubUpper: false, park: false, plaza: false, towerBase: false, towerUpper: false });
assert.deepEqual(siteTargets({ nw: lot('empty', 'tall'), ne: lot('park'), sw: lot('plaza'), se: lot('empty', 'tall') } as never), { hubBase: true, hubUpper: true, park: true, plaza: true, towerBase: true, towerUpper: true });
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
console.log('PASS: survey scores → atmosphere mapping, layout → change sites, causal panel text, event parsing, revision order, blendTo.');
