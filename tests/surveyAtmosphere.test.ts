import assert from 'node:assert/strict';
import { cityText, policyText, scoresToWorldState } from '../src/surveyAtmosphere.ts';
import { presets } from '../src/presets.ts';
import { connectSurvey, parseSurveyEvent, supersedes } from '../src/surveyView.ts';
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
assert.ok(parsed && 'kind' in parsed);
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
assert.deepEqual(parseSurveyEvent({ type: 'city-state-updated', state: view, view: { ...view, version: 2, layout: { version: 2, bands: {} } } }), { unsupportedVersion: 2 });
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
  assert.ok(statuses.includes('Unsupported exhibition view version'));
  messageListener?.({ data: JSON.stringify({ type: 'city-state-updated', view }) });
  assert.deepEqual(applied, ['r']);
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
