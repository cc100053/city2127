import assert from 'node:assert/strict';
import * as T from 'three';
import { buildAutomationHub } from '../src/siteBuilders/automationHub.ts';

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) },
});
const scene = new T.Scene();
const site = buildAutomationHub(scene, { windows: [], signs: [], random: () => .5 }, { async cloneRoot() { throw new Error('the hub loads no asset'); } } as never);
if (descriptor) Object.defineProperty(globalThis, 'document', descriptor);
else delete (globalThis as { document?: Document }).document;

const runtime = site.automationHub;
const base = site.layers.hubBase!.group, props = site.layers.hubNeutralProps!.group;
base.visible = props.visible = true;
base.scale.y = props.scale.y = 1;
assert.equal(site.layers.hubUpper!.definition.kind, 'procedural', 'the hub no longer loads a GLB');
assert.equal(site.layers.hubUpper!.assetStatus, 'not-applicable');
const state = (band: string) => site.root.getObjectByName(`hub-state-${band}`)!;
const hall = { low: state('low'), mixed: state('mixed') };
const level = (group: T.Object3D) => group.visible ? group.scale.y : 0;
scene.updateMatrixWorld(true);

// The plinth may overhang the 8 x 7 lot by <= .7 units a side (root units; the root carries the Odaiba position and scale).
const plinthBox = new T.Box3().setFromObject(site.root.getObjectByName('hub-plinth')!).applyMatrix4(site.root.matrixWorld.clone().invert());
assert.ok(plinthBox.min.x >= -4.701 && plinthBox.max.x <= 4.701 && plinthBox.min.z >= -4.201 && plinthBox.max.z <= 4.201, 'plinth leaves its lot');

// Band-level diagnostics: ports are self-service points, counters staffed ones (0 / 3 / 6 by the Meter).
assert.deepEqual(runtime.getDiagnostics(), { band: 'mixed', targetAutomatedPorts: 3, visibleAutomatedPorts: 3, targetHumanCounters: 3, visibleHumanCounters: 3 });
for (const [band, ports] of [['low', 0], ['mixed', 3], ['high', 6]] as const) {
  runtime.setTarget({ band, automatedPorts: ports }, 0, true);
  assert.deepEqual(runtime.getDiagnostics(), { band, targetAutomatedPorts: ports, visibleAutomatedPorts: ports, targetHumanCounters: 6 - ports, visibleHumanCounters: 6 - ports });
}

// Same-band retarget: one 3 s smoothstep; the same target does not restart; a newer target starts from the current state.
runtime.setTarget({ band: 'mixed', automatedPorts: 3 }, 0, true);
assert.equal(runtime.setTarget({ band: 'low', automatedPorts: 0 }, 1, false), true);
runtime.update(2.5);
assert.ok(Math.abs(level(hall.low) - .5) < 1e-9, 'the low hall rises along the 3-second smoothstep');
assert.equal(runtime.setTarget({ band: 'low', automatedPorts: 0 }, 2.5, false), false, 'same target does not restart');
assert.equal(runtime.setTarget({ band: 'high', automatedPorts: 6 }, 2.5, false), true);
runtime.update(4);
assert.ok(Math.abs(level(hall.low) - .25) < 1e-9, 'retargeting starts from the current hall level and sinks it');
runtime.update(6);
assert.equal(level(hall.low), 0);
assert.equal(level(hall.mixed), 0);
assert.equal(runtime.getDiagnostics().visibleAutomatedPorts, 6);
runtime.setTarget({ band: 'mixed', automatedPorts: 3 }, 6, true);
assert.equal(runtime.getDiagnostics().visibleAutomatedPorts, 3, 'snapshot/reset applies immediately');
runtime.setTarget({ band: 'high', automatedPorts: 6 }, 7, true);
runtime.restoreLegacy();
assert.equal(runtime.getDiagnostics().targetAutomatedPorts, 3);
assert.equal(runtime.getDiagnostics().visibleHumanCounters, 3, 'legacy restore returns to the mixed 3/3 neutral');
// Legacy v1 'tall' shows hubUpper without any Meter target: that means the high spire.
runtime.restoreLegacy();
site.layers.hubUpper!.group.visible = true;
runtime.update(8);
assert.equal(level(state('high')), 1, 'legacy tall shows the spire');
site.layers.hubUpper!.group.visible = false;
runtime.update(9);
assert.equal(level(state('high')), 0);
assert.equal(level(hall.mixed), 1, 'legacy medium returns to the mixed hub');
// A newer result may replace a future transition before it starts.
runtime.setTarget({ band: 'low', automatedPorts: 0 }, 10, true);
runtime.setTarget({ band: 'high', automatedPorts: 6 }, 15.12, false, 10);
runtime.setTarget({ band: 'low', automatedPorts: 0 }, 18.12, false, 13);
runtime.update(18.12);
assert.equal(runtime.getDiagnostics().visibleAutomatedPorts, 0);
runtime.restoreLegacy();

// Floors stack bottom-first while the spire builds and come down top-first.
const rings = site.root.getObjectByName('hub-spire-rings') as T.InstancedMesh;
const ringScale = (i: number) => { const m = new T.Matrix4(); rings.getMatrixAt(i, m); return new T.Vector3().setFromMatrixScale(m).x; };
runtime.setTarget({ band: 'low', automatedPorts: 0 }, 20, true);
runtime.setTarget({ band: 'high', automatedPorts: 6 }, 20, false);
runtime.update(21.5);
assert.ok(ringScale(0) > ringScale(13) && ringScale(13) <= 1.0001e-3, 'spire rings rise from the drum upward');
runtime.setTarget({ band: 'high', automatedPorts: 6 }, 24, true);
runtime.setTarget({ band: 'low', automatedPorts: 0 }, 24, false);
runtime.update(25.5);
assert.ok(ringScale(13) < ringScale(0), 'spire rings come down from the top');

// Visible mesh budget per state (previous hub: 28 / 28 / 33 meshes, +20 %).
for (const [band, ports, budget] of [['low', 0, 33], ['mixed', 3, 33], ['high', 6, 40]] as const) {
  runtime.setTarget({ band, automatedPorts: ports }, 30, true);
  let meshes = 0;
  site.root.traverseVisible(object => { if (object instanceof T.Mesh && !object.name.startsWith('guest-marker')) meshes++; });
  assert.ok(meshes <= budget, `${band} state draws ${meshes} meshes (budget ${budget})`);
}

// Residents stand on the plinth at full size; none is squashed while a state changes, and each state has its own cast.
const people = site.root.getObjectByName('hub-service-people') as T.InstancedMesh;
const m = new T.Matrix4(), at = new T.Vector3(), size = new T.Vector3(), world = new T.Vector3();
const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), solids: T.Mesh[] = [];
const gait = people.geometry.getAttribute('gait'), social = people.geometry.getAttribute('social');
const collectSolids = () => { solids.length = 0; base.traverseVisible(o => { if (o instanceof T.Mesh && !(o instanceof T.InstancedMesh)) solids.push(o); }); };
for (const [band, ports, cast] of [['low', 0, 23], ['mixed', 3, 15], ['high', 6, 6]] as const) {
  runtime.setTarget({ band, automatedPorts: ports }, 0, true);
  collectSolids();
  let uses = 0, walks = 0;
  for (let t = 0; t < 50; t += .25) {
    runtime.update(t);
    site.root.updateMatrixWorld(true);
    let shown = 0;
    for (let k = 0; k < 24; k++) {
      people.getMatrixAt(k, m);
      size.setFromMatrixScale(m).multiply(new T.Vector3().setFromMatrixScale(people.parent!.matrixWorld));
      if (size.x < .5) continue;
      shown++;
      assert.ok(Math.abs(size.x - 1) < 1e-6 && Math.abs(size.y - 1) < 1e-6, 'resident is shrunk');
      at.setFromMatrixPosition(m);
      assert.ok(Math.abs(at.x) <= 4.101 && Math.abs(at.z) <= 4.701, 'resident leaves the plinth');
      world.copy(at).applyMatrix4(people.parent!.matrixWorld);
      ray.set(world.clone().add(new T.Vector3(0, .1, 0)), down);
      ray.far = .2;
      assert.ok(ray.intersectObjects(solids, false).some(h => Math.abs(h.point.y - world.y) < .05), 'resident has no platform support');
      if (gait.getW(k) < .5) for (const height of [.4, 1.2, 1.6]) for (let d = 0; d < 8; d++) {
        ray.set(world.clone().add(new T.Vector3(0, height, 0)), new T.Vector3(Math.cos(d * Math.PI / 4), 0, Math.sin(d * Math.PI / 4)));
        ray.far = .25;
        assert.equal(ray.intersectObjects(solids, false).length, 0, `${band}: standing resident ${k} clips the building`);
      }
      if (gait.getY(k) > 0) walks++;
      else if (social.getY(k) > .1) uses++;
    }
    assert.equal(shown, cast, `${band} cast`);
  }
  assert.ok(uses, `${band}: nobody gestures or uses a service`);
  if (band === 'high') assert.ok(walks, 'self-service users have no visible approach');
}
// Mid-change nobody is on a moving floor; a snapshot puts the settled cast back at once; a hidden frontage hides them.
runtime.setTarget({ band: 'mixed', automatedPorts: 3 }, 60, true);
runtime.setTarget({ band: 'high', automatedPorts: 6 }, 60, false);
runtime.update(61.5);
for (let k = 0; k < 24; k++) { people.getMatrixAt(k, m); assert.ok(size.setFromMatrixScale(m).x < .001 && m.determinant() > 0, 'a visible resident stays during a state change'); }
runtime.setTarget({ band: 'mixed', automatedPorts: 3 }, 61.5, true);
people.getMatrixAt(0, m);
assert.ok(Math.abs(size.setFromMatrixScale(m).x - 1 / 3) < 1e-6, 'immediate recovery leaves a stale hidden resident');
props.visible = false;
runtime.update(62);
assert.equal(people.visible, false, 'residents outlive a hidden frontage');
props.visible = true;

// The canopy bobs +-.08 over 6 s and stays still for reduced-motion users.
runtime.setTarget({ band: 'low', automatedPorts: 0 }, 70, true);
const canopy = site.root.getObjectByName('hub-canopy')!;
runtime.update(72); const y0 = canopy.position.y;
runtime.update(73.5); const y1 = canopy.position.y;
assert.ok(Math.abs(y1 - y0) > .05 && Math.abs(y1 - y0) < .2, 'canopy hovers');
const matchMedia = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: true }) });
runtime.update(72); const s0 = canopy.position.y;
runtime.update(73.5);
assert.equal(canopy.position.y, s0, 'reduced motion keeps the canopy still');
if (matchMedia) Object.defineProperty(globalThis, 'matchMedia', matchMedia); else delete (globalThis as { matchMedia?: unknown }).matchMedia;

console.log('PASS: three AUTO HUB states (hall + canopy, hall + column, spire) retarget smoothly, stack floor by floor, seat residents on the plinth and restore to mixed.');
