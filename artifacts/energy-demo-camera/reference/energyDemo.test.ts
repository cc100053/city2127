import assert from 'node:assert/strict';
import { DEFAULT_HOLD, demoStage, demoTimeline, energyFocus, FLY_SECONDS } from '../src/devEnergyDemo.ts';
import { emptyEnergyConfiguration } from '../survey/src/shared/energy.ts';

// The close-up targets only a part the result adds; removals and unchanged layouts keep the hero view.
const none = emptyEnergyConfiguration();
assert.equal(energyFocus(none, none), null);
assert.equal(energyFocus(none, { ...none, waterGardens: 1 }), 'garden');
assert.equal(energyFocus({ ...none, waterGardens: 1 }, { ...none, waterGardens: 2 }), 'garden2');
assert.equal(energyFocus({ ...none, waterGardens: 2 }, { ...none, waterGardens: 1 }), null);
assert.equal(energyFocus({ ...none, receiver: 'small' }, { ...none, receiver: 'large' }), 'wing');
assert.equal(energyFocus({ ...none, receiver: 'large' }, { ...none, receiver: 'small' }), null);
assert.equal(energyFocus(none, { ...none, flywheel: true, island: true }), 'island');

// Stages run in order; the default quick demo stays 10–20 s in close-up and ≈20.6 s from the live result back to the hero pose.
const t = demoTimeline(DEFAULT_HOLD);
assert.deepEqual([0, t.flyIn, t.appear, t.cycle, t.flyOut, t.done].map(time => demoStage(time, DEFAULT_HOLD)), ['arrive', 'fly-in', 'appear', 'cycle', 'fly-out', 'done']);
assert.equal(t.done - t.flyOut, FLY_SECONDS);
const closeUp = t.flyOut - t.appear;
assert.ok(closeUp >= 10 && closeUp <= 20, `close-up ${closeUp}s`);
assert.ok(Math.abs(t.done - 20.6) < .05, `quick demo ${t.done}s`);
console.log('energyDemo: PASS');
