// Question rotation lot runtime (QUESTION_ROTATION_PLAN 2.1/2.2, Q02): every Q02 option shows exactly one of its three models, the
// lots sit in LOTS, version4 runs are never touched, and a live swap fades over the shared 3-second transition.
import assert from './assert.ts';
import { readFileSync } from 'node:fs';
import { Group, Mesh, MeshStandardMaterial, BoxGeometry, Scene } from 'three';
import { LOTS } from '../src/layout.ts';
import { FARM_CENTRE, EnergyRuntime } from '../src/energyRuntime.ts';
import { BAY_FLOWER_SHOWN } from '../src/bayFlower.ts';
import { LotRuntime, q02Models, q03Housing, q05Tower, q06Tower, q08Vacant } from '../src/lotRuntime.ts';

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
assert.deepEqual(lots.getDiagnostics(), { hydro: 1, flower: 0, housing: 1, tower: 1, reverseAc: 0 });

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

// Q08 shares the SW lot: A/B (no model yet) leave it vacant, C shows the shelf; version4 never engages the override.
assert.deepEqual(['A', 'B', 'C', undefined].map(q08Vacant), [true, true, false, false]);
const q08set = set.questions.find((q: { id: string }) => q.id === 'Q08');
assert.deepEqual(q08set.options.map((o: { lotId: string }) => o.lotId), ['sw', 'sw', 'sw'], 'Q08: one shared lot');
const vacancy: [boolean, number, boolean][] = [];
const swLots = new LotRuntime(new Scene(), undefined, false, { setVacant: (v, now, immediate) => { vacancy.push([v, now, immediate]); } });
swLots.setQ08(undefined, 0, true);
assert.deepEqual(vacancy, [], 'version4: SW untouched');
swLots.setQ08('A', 1, true); swLots.setQ08('C', 5, false); swLots.setQ08(undefined, 9, true);
assert.deepEqual(vacancy, [[true, 1, true], [false, 5, false], [false, 9, true]], 'snapshot A, live C, version4 hands SW back');
const { q08Swap, q08Result, q08Shot } = await import('../src/rotationLayout.ts');
const swapOf = (from: string, to: string) => q08Swap({ rotation: { outcome: { kind: 'swap', questionId: 'Q08', from, to } } } as never)!;
assert.deepEqual([swapOf('C', 'A').shelf, swapOf('A', 'C').shelf, swapOf('A', 'B').shelf], [true, true, false]);
assert.equal(q08Shot(swapOf('C', 'B')), 'sw:focal'); assert.equal(q08Shot(swapOf('B', 'A')), null, 'A↔B: nothing to see, stay at hero');
assert.equal(q08Swap({ rotation: { outcome: { kind: 'swap', questionId: 'Q02', from: 'A', to: 'B' } } } as never), undefined);
for (const [from, to] of [['C', 'A'], ['C', 'B'], ['A', 'B']]) assert.doesNotMatch(q08Result({ from, to }).effect, /現れ|できました|加わり/, `Q08 ${from}→${to} claims no new building`);
{ const { target } = SHOTS['sw:focal']; const { changeSites } = await import('../src/layout.ts');
  assert.ok(Math.hypot(target[0] - changeSites.sw.x, target[2] - changeSites.sw.z) < 20, 'Q08 shot looks at the SW lot'); }
{ const { rotationSite } = await import('../src/voteJourney.ts'); const { changeSites } = await import('../src/layout.ts');
  const site = rotationSite({ kind: 'swap', questionId: 'Q08', from: 'C', to: 'A' } as never, [])!;
  assert.deepEqual([site.x, site.z, site.slot], [changeSites.sw.x, changeSites.sw.z, 'publicSharing'], 'Q08 orb lands on the SW lot'); }

console.log('lot runtime tests passed');

// Q03 shares the drawer housing lot: A shows the housing, B/C (no model yet) fade it and keep its loop road; version4 never engages it.
assert.deepEqual(['A', 'B', 'C', undefined].map(q03Housing), [true, false, false, true]);
const q03set = set.questions.find((q: { id: string }) => q.id === 'Q03');
assert.deepEqual(q03set.options.map((o: { lotId: string }) => o.lotId), ['drawer-housing', 'drawer-housing', 'drawer-housing'], 'Q03: one shared lot');
{ const { DRAWER_HOUSING } = await import('../src/layout.ts'); const lot = LOTS['drawer-housing'];
  // The lot covers the R2 envelope (X −128.6…−79.4, Z 67.3…92.8) and its forecourt.
  assert.ok(Math.abs(lot.x - DRAWER_HOUSING.x) < 1 && lot.z - lot.size / 2 <= 61.3 && lot.z + lot.size / 2 >= 92.8 && lot.size >= 49.25); }
{
  const houseScene = new Scene(), road = mesh(), housing = new Group(), stoneMaterial = new MeshStandardMaterial();
  road.name = 'drawer-housing-drive'; houseScene.add(road);
  const houseLots = new LotRuntime(houseScene);
  // Version4: no rotation view, nothing touched even after the GLB loads.
  houseLots.setQ03(undefined, 0, true); houseLots.update(0, false);
  housing.name = 'drawer-housing-2127'; housing.add(mesh(), new Mesh(new BoxGeometry(), stoneMaterial)); houseScene.add(housing);
  houseLots.update(1, false);
  assert.equal(housing.visible, true); assert.equal((housing.children[1] as Mesh).material, stoneMaterial, 'version4 keeps the shared stone');
  // A snapshot at A keeps it standing; a live A→B from t 10 is held until 10, half-faded at 11.5, gone at 13; the road stays.
  houseLots.setQ03('A', 2, true); houseLots.update(2, false); assert.equal(housing.visible, true);
  houseLots.setQ03('B', 10, false); houseLots.update(9, false); assert.equal(housing.visible, true);
  houseLots.update(11.5, false);
  assert.ok(Math.abs(((housing.children[0] as Mesh).material as MeshStandardMaterial).opacity - .5) < 1e-9, 'half-way at mid-transition');
  houseLots.update(13, false); assert.equal(housing.visible, false); assert.equal(road.visible, true, 'the loop road stays');
  assert.equal(houseLots.getDiagnostics().housing, 0);
  // B→C: nothing to change; C→A returns it; a version4 view after the run restores it at once.
  houseLots.setQ03('C', 20, false); houseLots.update(24, false); assert.equal(housing.visible, false);
  houseLots.setQ03('A', 30, false); houseLots.update(33, false); assert.equal(housing.visible, true);
  houseLots.setQ03('B', 40, true); houseLots.update(40, false); assert.equal(housing.visible, false, 'snapshot fades at once');
  houseLots.setQ03(undefined, 50, true); houseLots.update(50, false); assert.equal(housing.visible, true, 'version4 restores the housing');
  assert.equal(stoneMaterial.opacity, 1, 'the shared stone is never faded');
}
const { q03Swap, q03Result, q03Shot } = await import('../src/rotationLayout.ts');
const q03Of = (from: string, to: string) => q03Swap({ rotation: { outcome: { kind: 'swap', questionId: 'Q03', from, to } } } as never)!;
assert.deepEqual([q03Of('A', 'B').housing, q03Of('C', 'A').housing, q03Of('B', 'C').housing], [true, true, false]);
assert.equal(q03Shot(q03Of('A', 'C')), 'q03:housing'); assert.equal(q03Shot(q03Of('C', 'B')), null, 'B↔C: nothing to see, stay at hero');
assert.equal(q03Swap({ rotation: { outcome: { kind: 'fallback', questionId: 'Q03' } } } as never), undefined);
for (const [from, to] of [['A', 'B'], ['A', 'C'], ['B', 'C'], ['C', 'B']]) assert.doesNotMatch(q03Result({ from, to }).effect, /現れ|できました|加わり|戻りました/, `Q03 ${from}→${to} claims no new building`);
assert.match(q03Result({ from: 'B', to: 'A' }).effect, /戻りました/);
{ const { target } = SHOTS['q03:housing'], lot = LOTS['drawer-housing'];
  assert.ok(Math.hypot(target[0] - lot.x, target[2] - lot.z) <= lot.size / 2, 'Q03 shot looks at the housing lot'); }

// Q06 shares the pod-frame tower lot (the retired housing U site): B shows the tower, A/C (no model yet) fade it to lawn; version4
// never engages it.
assert.deepEqual(['A', 'B', 'C', undefined].map(q06Tower), [false, true, false, true]);
const q06set = set.questions.find((q: { id: string }) => q.id === 'Q06');
assert.deepEqual(q06set.options.map((o: { lotId: string }) => o.lotId), ['pod-tower', 'pod-tower', 'pod-tower'], 'Q06: one shared lot');
assert.equal(q06set.options[1].modelId, 'pod-frame-tower-2127');
{ const { POD_TOWER, HOUSING_LOT } = { ...(await import('../src/layout.ts')), HOUSING_LOT: (await import('../src/housingPrototype.ts')).HOUSING_SITES.mobile };
  const lot = LOTS['pod-tower'];
  // The lot covers the R4 envelope with the pods (X −28.5…27.3, Z −19.8…18.2 about the origin) and stands on housing U's old site.
  assert.deepEqual([lot.x, lot.z], [POD_TOWER.x, POD_TOWER.z]); assert.ok(lot.size >= 56);
  assert.ok(Math.hypot(HOUSING_LOT[0] - lot.x, HOUSING_LOT[1] - lot.z) < 20, 'on the retired housing U site'); }
{
  const towerScene = new Scene(), tower = new Group(), shared = new MeshStandardMaterial();
  const towerLots = new LotRuntime(towerScene);
  // Version4: no rotation view, nothing touched even after the GLB loads.
  towerLots.setQ06(undefined, 0, true); towerLots.update(0, false);
  tower.name = 'pod-frame-tower-2127'; tower.add(mesh(), new Mesh(new BoxGeometry(), shared)); towerScene.add(tower);
  towerLots.update(1, false);
  assert.equal(tower.visible, true); assert.equal((tower.children[1] as Mesh).material, shared, 'version4 keeps the shared materials');
  // A snapshot at B keeps it standing; a live B→A from t 10 is held until 10, half-faded at 11.5, gone at 13.
  towerLots.setQ06('B', 2, true); towerLots.update(2, false); assert.equal(tower.visible, true);
  towerLots.setQ06('A', 10, false); towerLots.update(9, false); assert.equal(tower.visible, true);
  towerLots.update(11.5, false);
  assert.ok(Math.abs(((tower.children[0] as Mesh).material as MeshStandardMaterial).opacity - .5) < 1e-9, 'half-way at mid-transition');
  towerLots.update(13, false); assert.equal(tower.visible, false); assert.equal(towerLots.getDiagnostics().tower, 0);
  // A→C: nothing to change; C→B returns it; a snapshot fades at once; a version4 view after the run restores it.
  towerLots.setQ06('C', 20, false); towerLots.update(24, false); assert.equal(tower.visible, false);
  towerLots.setQ06('B', 30, false); towerLots.update(33, false); assert.equal(tower.visible, true);
  towerLots.setQ06('C', 40, true); towerLots.update(40, false); assert.equal(tower.visible, false, 'snapshot fades at once');
  towerLots.setQ06(undefined, 50, true); towerLots.update(50, false); assert.equal(tower.visible, true, 'version4 restores the tower');
  assert.equal(shared.opacity, 1, 'a shared material is never faded');
}
const { q06Swap, q06Result, q06Shot } = await import('../src/rotationLayout.ts');
const q06Of = (from: string, to: string) => q06Swap({ rotation: { outcome: { kind: 'swap', questionId: 'Q06', from, to } } } as never)!;
assert.deepEqual([q06Of('B', 'A').tower, q06Of('C', 'B').tower, q06Of('A', 'C').tower], [true, true, false]);
assert.equal(q06Shot(q06Of('B', 'C')), 'q06:tower'); assert.equal(q06Shot(q06Of('C', 'A')), null, 'A↔C: nothing to see, stay at hero');
assert.equal(q06Swap({ rotation: { outcome: { kind: 'fallback', questionId: 'Q06' } } } as never), undefined);
for (const [from, to] of [['B', 'A'], ['B', 'C'], ['A', 'C'], ['C', 'A']]) assert.doesNotMatch(q06Result({ from, to }).effect, /現れ|できました|加わり|戻りました/, `Q06 ${from}→${to} claims no new building`);
assert.match(q06Result({ from: 'A', to: 'B' }).effect, /戻りました/);
{ const { target } = SHOTS['q06:tower'], lot = LOTS['pod-tower'];
  assert.ok(Math.hypot(target[0] - lot.x, target[2] - lot.z) <= lot.size / 2, 'Q06 shot looks at the tower lot'); }
{ const { rotationSite } = await import('../src/voteJourney.ts'); const lot = LOTS['pod-tower'];
  const site = rotationSite({ kind: 'swap', questionId: 'Q06', from: 'B', to: 'C' } as never, [])!;
  assert.deepEqual([site.x, site.z, site.slot], [lot.x, lot.z, 'environmentalPriority'], 'Q06 orb lands on the tower lot'); }

// Q05 shares the NE PARK lot (park cooling, owner 2026-11-26): A stands the reverse air conditioner on its own lawn in place of the NE
// park (and clears the sharing court under it); B/C (no model yet) keep the park; version4 never engages it.
assert.deepEqual(['A', 'B', 'C', undefined].map(q05Tower), [true, false, false, false]);
const q05set = set.questions.find((q: { id: string }) => q.id === 'Q05');
assert.deepEqual(q05set.options.map((o: { lotId: string }) => o.lotId), ['ne-park', 'ne-park', 'ne-park'], 'Q05: one shared lot');
assert.deepEqual(q05set.options.map((o: { modelId: string | null }) => o.modelId), ['q05a-reverse-ac-2127', null, null]);
{ const { changeSites } = await import('../src/layout.ts'); const lot = LOTS['ne-park'], ne = changeSites.ne;
  assert.deepEqual([lot.x, lot.z], [ne.x, ne.z], 'the Q05 lot is centred on the NE PARK site');
  assert.ok(lot.size >= ne.w * ne.scale, 'the Q05 lot covers the NE PARK site'); }
{ // The GLB's lawn plinth is the lot (R2: 24 m radius, owner «the playground expand a little»); the moving parts exist, stay out of
  // the bake and get their blending.
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { Box3, AdditiveBlending, NormalBlending } = await import('three');
  const { REVERSE_AC_MOVING, prepareReverseAc, reverseAcBakes } = await import('../src/reverseAc.ts');
  const bytes = readFileSync(new URL('../asset/models/q05a-reverse-ac-2127/q05a-reverse-ac-2127.glb', import.meta.url));
  const model = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
  const plinth = new Box3().setFromObject(model.getObjectByName('q05a_plinth')!), lot = LOTS['ne-park'];
  assert.ok(Math.abs(plinth.max.x - lot.size / 2) < .1 && Math.abs(-plinth.min.z - lot.size / 2) < .1, `plinth radius ${plinth.max.x} = lot/2`);
  const all = new Box3().setFromObject(model);
  assert.ok(Math.max(all.max.x, -all.min.x, all.max.z, -all.min.z) < lot.size / 2 + 2.5, 'tree crowns overhang the lot by under 2.5 m');
  const motion = prepareReverseAc(model);
  assert.ok(motion, 'every moving mesh is in the GLB');
  const part = (name: string) => model.getObjectByName(name) as Mesh;
  assert.equal((part(REVERSE_AC_MOVING.flame).material as MeshStandardMaterial).blending, NormalBlending);
  for (const name of [REVERSE_AC_MOVING.plume, REVERSE_AC_MOVING.flow]) assert.equal((part(name).material as MeshStandardMaterial).blending, AdditiveBlending, name);
  for (const name of Object.values(REVERSE_AC_MOVING)) assert.equal(reverseAcBakes(part(name)), false, `${name} stays out of the bake`);
  motion!(2); assert.ok(part(REVERSE_AC_MOVING.flow).rotation.y > 0, 'cold streams wind inward (positive rotation.y)');
  assert.equal(model.visible, false);
}
{
  const acScene = new Scene(), ac = new Group(), park = new Group(), parkShared = new MeshStandardMaterial();
  const keeps: [number, number][] = [];
  const acLots = new LotRuntime(acScene, undefined, false, undefined, { courtAt: (x, z) => x === -210 && z === -135 ? 0 : -1, setCourtKeep: (i, keep) => { keeps.push([i, keep]); } });
  park.name = 'survey-site-ne'; park.add(new Mesh(new BoxGeometry(), parkShared)); acScene.add(park);
  // Version4: nothing touched, the park keeps its shared materials, the court is left alone.
  acLots.setQ05(undefined, 0, true); acLots.update(0, false);
  assert.equal(park.visible, true); assert.equal((park.children[0] as Mesh).material, parkShared); assert.deepEqual(keeps, []);
  // A snapshot at A before the GLB loads: the park and its court clear at once, the tower shows once main.ts names it.
  acLots.setQ05('A', 1, true); acLots.update(1, false);
  assert.equal(park.visible, false); assert.deepEqual(keeps.at(-1), [0, 0]);
  ac.name = 'q05a-reverse-ac-2127'; ac.add(mesh()); ac.visible = false; acScene.add(ac);
  acLots.update(2, false); assert.equal(ac.visible, true); assert.equal(acLots.getDiagnostics().reverseAc, 1);
  // Live A→B from t 10: held until 10, both half-way at 11.5, the park and its court back at 13.
  acLots.setQ05('B', 10, false); acLots.update(9, false); assert.equal(ac.visible, true); assert.equal(park.visible, false);
  acLots.update(11.5, false);
  assert.ok(Math.abs(((ac.children[0] as Mesh).material as MeshStandardMaterial).opacity - .5) < 1e-9, 'tower half-way at mid-transition');
  assert.ok(Math.abs(keeps.at(-1)![1] - .5) < 1e-9, 'court half-way with the park');
  acLots.update(13, false); assert.equal(ac.visible, false); assert.equal(park.visible, true); assert.deepEqual(keeps.at(-1), [0, 1]);
  // B→C: nothing visible changes; a version4 view after the run restores the park.
  acLots.setQ05('C', 20, false); acLots.update(24, false); assert.equal(ac.visible, false); assert.equal(park.visible, true);
  acLots.setQ05(undefined, 30, true); acLots.update(30, false); assert.equal(ac.visible, false); assert.equal(park.visible, true);
}
const { q05Swap, q05Result, q05Shot } = await import('../src/rotationLayout.ts');
const q05Of = (from: string, to: string) => q05Swap({ rotation: { outcome: { kind: 'swap', questionId: 'Q05', from, to } } } as never)!;
assert.deepEqual([q05Of('A', 'B').tower, q05Of('C', 'A').tower, q05Of('B', 'C').tower], [true, true, false]);
assert.equal(q05Shot(q05Of('A', 'C')), 'q05:tower'); assert.equal(q05Shot(q05Of('B', 'C')), null, 'B↔C: nothing to see, stay at hero');
assert.match(q05Result({ from: 'B', to: 'A' }).effect, /塔が立ち/);
for (const [from, to] of [['B', 'C'], ['C', 'B']]) assert.doesNotMatch(q05Result({ from, to }).effect, /立ち|現れ|できました|加わり/, `Q05 ${from}→${to} claims no new building`);
{ const { target } = SHOTS['q05:tower'], lot = LOTS['ne-park'];
  assert.ok(Math.hypot(target[0] - lot.x, target[2] - lot.z) <= lot.size / 2, 'Q05 shot looks at the NE PARK lot'); }
{ const { rotationSite } = await import('../src/voteJourney.ts'); const lot = LOTS['ne-park'];
  const site = rotationSite({ kind: 'swap', questionId: 'Q05', from: 'A', to: 'B' } as never, [])!;
  assert.deepEqual([site.x, site.z, site.slot], [lot.x, lot.z, 'environmentalPriority'], 'Q05 orb lands on the NE PARK lot'); }
