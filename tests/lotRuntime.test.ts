// Question rotation lot runtime (QUESTION_ROTATION_PLAN 2.1/2.2, Q02): every Q02 option shows exactly one of its three models, the
// lots sit in LOTS, version4 runs are never touched, and a live swap fades over the shared 3-second transition.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Group, Mesh, MeshStandardMaterial, BoxGeometry, Scene } from 'three';
import { LOTS } from '../src/layout.ts';
import { FARM_CENTRE, EnergyRuntime } from '../src/energyRuntime.ts';
import { BAY_FLOWER_SHOWN } from '../src/bayFlower.ts';
import { LotRuntime, q02Models } from '../src/lotRuntime.ts';

// Exactly one shown model per option; no option is the version4 city.
for (const option of ['A', 'B', 'C']) {
  const m = q02Models(option);
  assert.equal([m.hydro, m.flower, m.farm].filter(Boolean).length, 1, `Q02 ${option} shows one model`);
}
assert.deepEqual(q02Models('A'), { hydro: true, flower: false, farm: false });
assert.deepEqual(q02Models('B'), { hydro: false, flower: true, farm: false });
assert.deepEqual(q02Models('C'), { hydro: false, flower: false, farm: true });
assert.deepEqual(q02Models(undefined), { hydro: true, flower: false, farm: undefined }, 'version4: terrace as background, flower vacant, farm on the vote');
assert.deepEqual(q02Models('D', true), { hydro: true, flower: true, farm: undefined }, 'DEV ?bayFlower=1 default');

// Every Q02 lot in the rotation set is a LOTS entry; the farm lot is the energy farm's centre.
const set = JSON.parse(readFileSync(new URL('../survey/src/survey/questions.rotation.v1.json', import.meta.url), 'utf8'));
const q02 = set.questions.find((q: { id: string }) => q.id === 'Q02');
for (const option of q02.options) assert.ok(option.lotId in LOTS, `Q02 ${option.id} lot ${option.lotId} in LOTS`);
assert.deepEqual([LOTS['q02-farm-south'].x, LOTS['q02-farm-south'].z], [FARM_CENTRE[0], FARM_CENTRE[2]]);
assert.equal(new Set(q02.options.map((o: { lotId: string }) => o.lotId)).size, 3, 'one lot per model');

// A stand-in scene: the hydro terrace root (its GLB loads later), the bay flower root (its three shown nodes load later).
const mesh = () => new Mesh(new BoxGeometry(), new MeshStandardMaterial());
const scene = new Scene(), hydro = new Group(), flower = new Group();
hydro.name = 'q02a-hydro-terrace'; flower.name = 'q02b-bay-flower'; hydro.add(mesh()); scene.add(hydro, flower);
const islandMaterial = (hydro.children[0] as Mesh).material;
const farm: (boolean | undefined)[] = [];
const lots = new LotRuntime(scene, { setFarmOverride: shown => { farm.push(shown); } });

// Version4: an undefined option before any rotation view touches nothing (no visibility, no cloned material, no farm override).
lots.setQ02(undefined, 0, true); lots.update(0, false);
assert.equal(hydro.visible, true); assert.equal((hydro.children[0] as Mesh).material, islandMaterial, 'shared material kept');
assert.deepEqual(farm, []);

// Snapshot to B before either GLB has loaded: the terrace root hides at once; the flower shows once its nodes appear.
lots.setQ02('B', 1, true); lots.update(1, false);
assert.equal(hydro.visible, false); assert.deepEqual(farm, [false]);
const glb = new Group(); glb.name = 'q02a-hydro-terrace-glb'; glb.add(mesh()); hydro.add(glb);
const nodes = BAY_FLOWER_SHOWN.map(name => { const node = new Group(); node.name = name; node.add(mesh()); node.visible = false; flower.add(node); return node; });
lots.update(2, false);
assert.ok(nodes.every(node => node.visible), 'flower shown after its late load');
assert.equal(hydro.visible, false, 'terrace stays vacant after its late load');
assert.notEqual((hydro.children[0] as Mesh).material, islandMaterial, 'terrace owns its materials once loaded');

// Live B→A from t 10: held until 10, half-faded at 11.5, settled at 13.
lots.setQ02('A', 10, false);
lots.update(9, false); assert.ok(nodes.every(node => node.visible)); assert.equal(hydro.visible, false);
lots.update(11.5, false);
const opacity = (node: Group) => ((node.children[0] as Mesh).material as MeshStandardMaterial).opacity;
assert.ok(Math.abs(opacity(nodes[0]) - .5) < 1e-9 && Math.abs(opacity(glb) - .5) < 1e-9, 'both lots half-way at mid-transition');
lots.update(13, false);
assert.ok(nodes.every(node => !node.visible)); assert.equal(hydro.visible, true); assert.equal(opacity(glb), 1);
assert.deepEqual(farm, [false, false]);
// Reduced motion settles at once.
lots.setQ02('B', 20, false); lots.update(20, true);
assert.equal(hydro.visible, false); assert.ok(nodes.every(node => node.visible));
// A version4 view after a rotation run restores the built city.
lots.setQ02(undefined, 30, true); lots.update(30, false);
assert.equal(hydro.visible, true); assert.ok(nodes.every(node => !node.visible)); assert.equal(farm.at(-1), undefined);
assert.deepEqual(lots.getDiagnostics(), { hydro: 1, flower: 0 });

// EnergyRuntime: the override wins over the receiver vote and survives an immediate energy update; undefined hands it back.
const energy = new EnergyRuntime(new Scene());
const none = { waterGardens: 0, receiver: 'none', flywheel: false, island: false } as const;
energy.setFarmOverride(true, 0, true); energy.update(0, false);
assert.equal(energy.getDiagnostics().farm.visible, true, 'Q02 C shows the farm without a receiver vote');
energy.setTarget(none, 1, true); energy.update(1, false);
assert.equal(energy.getDiagnostics().farm.visible, true, 'an energy snapshot keeps the override');
energy.setFarmOverride(undefined, 2, false); energy.update(3.5, false);
assert.ok(Math.abs(energy.getDiagnostics().farm.opacity - .5) < 1e-9, 'handing back fades over the shared transition');
energy.update(5, false);
assert.equal(energy.getDiagnostics().farm.visible, false, 'back on the vote: no receiver, no farm');
energy.setTarget({ ...none, receiver: 'large' }, 6, true); energy.update(6, false);
assert.equal(energy.getDiagnostics().farm.visible, true, 'version4 vote path unchanged');

// Close-ups: each Q02 option names a headline shot that frames its own lot.
const { SHOTS } = await import('../src/headlineCamera.ts');
const { Q02_SHOTS } = await import('../src/rotationLayout.ts');
for (const [option, lot] of [['A', 'q02-west-sea'], ['B', 'q02-bay-flower'], ['C', 'q02-farm-south']] as const) {
  const { target } = SHOTS[Q02_SHOTS[option]], l = LOTS[lot];
  assert.ok(Math.hypot(target[0] - l.x, target[2] - l.z) <= l.size / 2, `Q02 ${option} shot looks at its lot`);
}

console.log('lot runtime tests passed');
