import assert from 'node:assert/strict';
import * as T from 'three';
import { buildAutomationHub } from '../src/siteBuilders/automationHub.ts';

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ fillRect() {}, fillText() {} }),
    }),
  },
});

const assets = { async cloneRoot() { return new T.Group(); } };
const scene = new T.Scene();
const site = buildAutomationHub(scene, { windows: [], signs: [], random: () => .5 }, assets as never);
if (descriptor) Object.defineProperty(globalThis, 'document', descriptor);
else delete (globalThis as { document?: Document }).document;

const runtime = site.automationHub;
const props = site.layers.hubNeutralProps!.group;
props.visible = true;
props.scale.set(1, 1, 1);
const slots = props.children.filter(child => child.name.startsWith('hub-service-slot-'));
assert.equal(slots.length, 6, 'the v2 baseline has exactly six mutable service slots');

scene.updateMatrixWorld(true);
const bounds = new T.Box3().setFromObject(props);
assert.ok(bounds.min.x - site.root.position.x >= -4.001);
assert.ok(bounds.max.x - site.root.position.x <= 4.001);
assert.ok(bounds.min.z - site.root.position.z >= -3.501);
assert.ok(bounds.max.z - site.root.position.z <= 3.501);
assert.ok(bounds.max.z < -4.5, 'service slots clear the north road');

assert.deepEqual(runtime.getDiagnostics(), {
  band: 'mixed', targetAutomatedPorts: 3, visibleAutomatedPorts: 3,
  targetHumanCounters: 3, visibleHumanCounters: 3,
});
assert.equal(runtime.setTarget({ band: 'low', automatedPorts: 0 }, 0, true), true);
assert.equal(runtime.getDiagnostics().visibleAutomatedPorts, 0);
assert.equal(runtime.getDiagnostics().visibleHumanCounters, 6);

assert.equal(runtime.setTarget({ band: 'low', automatedPorts: 1 }, 1, false), true);
runtime.update(2.5);
const firstAuto = slots[0].getObjectByName('hub-automated-port-0')!;
assert.ok(Math.abs(firstAuto.scale.y - .5) < 1e-9, 'same-band count changes use the 3-second smoothstep');
assert.equal(runtime.setTarget({ band: 'low', automatedPorts: 1 }, 2.5, false), false, 'same target does not restart');
runtime.update(4);
assert.equal(runtime.getDiagnostics().visibleAutomatedPorts, 1);
assert.equal(runtime.getDiagnostics().visibleHumanCounters, 5);

assert.equal(runtime.setTarget({ band: 'high', automatedPorts: 6 }, 4, false), true);
runtime.update(5.5);
const secondAuto = slots[1].getObjectByName('hub-automated-port-1')!;
assert.ok(Math.abs(secondAuto.scale.y - .5) < 1e-9, 'retargeting starts from the current slot state');
runtime.setTarget({ band: 'mixed', automatedPorts: 3 }, 5.5, true);
assert.equal(runtime.getDiagnostics().visibleAutomatedPorts, 3, 'snapshot/reset applies immediately');
assert.equal(runtime.getDiagnostics().visibleHumanCounters, 3);
runtime.setTarget({ band: 'high', automatedPorts: 6 }, 6, true);
runtime.restoreLegacy();
assert.equal(runtime.getDiagnostics().targetAutomatedPorts, 3);
assert.equal(runtime.getDiagnostics().visibleHumanCounters, 3, 'legacy restore returns to the existing 3/3 neutral');

console.log('PASS: six bounded MAGNET service slots retarget smoothly and restore to the mixed 3/3 baseline.');
