import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Box3, BoxGeometry, CatmullRomCurve3, Euler, Group, Matrix4, Mesh, Quaternion, Scene, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshBVH } from 'three-mesh-bvh';
import { skyRingPylonLegs } from '../src/skyRing.ts';
import { changeSites, inDistrict, shoreLane } from '../src/layout.ts';
import { placeOdaibaModel } from '../src/odaibaPlacement.ts';
import { civicCore } from '../src/civicCore.ts';
import { repairRoads } from '../src/roadRepair.ts';
import { streetNetwork } from '../src/streetKit.ts';
import { mobility, routes } from '../src/mobility.ts';

const load = async (path: string) => {
  const bytes = readFileSync(new URL('../' + path, import.meta.url));
  return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
};
const asset = await load('asset/models/sky-ring-architecture/sky-ring-architecture.glb'); asset.updateMatrixWorld(true);
const components: Mesh[] = []; asset.traverse(o => { if (o instanceof Mesh && o.name.startsWith('Pylon')) components.push(o); });
assert.equal(components.length, 5, 'the actual pylon shell and its four channels are loaded');
const shells: Mesh[] = [];
for (const { foot, top } of skyRingPylonLegs()) {
  const frame = new Group(); frame.position.copy(foot); frame.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), top.clone().sub(foot).normalize());
  frame.scale.set(10, foot.distanceTo(top), 10); frame.updateMatrixWorld(true);
  for (const component of components) {
    const shell = new Mesh(component.geometry, component.material); shell.matrixAutoUpdate = false;
    shell.matrixWorld.multiplyMatrices(frame.matrixWorld, component.matrixWorld);
    shell.geometry.boundsTree ??= new MeshBVH(shell.geometry); shell.geometry.computeBoundingBox(); shells.push(shell);
  }
}
const shellBounds = shells.map(shell => shell.geometry.boundingBox!.clone().applyMatrix4(shell.matrixWorld));
const layout = JSON.parse(readFileSync(new URL('../src/odaiba-layout.json', import.meta.url), 'utf8'));
const world = new Group();
for (const p of layout.buildings.filter((p: any) => inDistrict(p.positionBlender[0], -p.positionBlender[1]) && !['fuji-tv', 'telecom-center'].includes(p.id))) {
  const model = await load(`asset/models/${p.id}/${p.id}.glb`); model.name = p.id; placeOdaibaModel(model, p); world.add(model);
}
world.add(civicCore());
const environment = await load('asset/models/odaiba-masterplan/odaiba_district_v01_environment.glb');
const built = layout.buildings.filter((p: any) => inDistrict(p.positionBlender[0], -p.positionBlender[1]) && !['aqua-city-odaiba', 'divercity-tokyo-plaza', 'fuji-tv'].includes(p.id));
repairRoads(environment, built); world.add(environment, streetNetwork(environment));
for (const site of Object.values(changeSites)) {
  const model = new Mesh(new BoxGeometry(site.w * site.scale, site.h * site.scale, site.d * site.scale));
  model.position.set(site.x, site.h * site.scale / 2, site.z); model.name = `site-${site.name}`; world.add(model);
}
world.updateMatrixWorld(true);
const solids: { mesh: Mesh; box: Box3 }[] = [];
world.traverse(o => {
  if (!(o instanceof Mesh)) return;
  if (o.parent === environment && !/(road|guardrail|streetlight|lighting|station|rail_structure|context)/i.test(o.name)) return;
  o.geometry.computeBoundingBox(); solids.push({ mesh: o, box: o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld) });
});
let shellChecks = 0;
for (const { mesh, box } of solids) for (let i = 0; i < shells.length; i++) {
  if (!box.intersectsBox(shellBounds[i])) continue;
  const tree = mesh.geometry.boundsTree ??= new MeshBVH(mesh.geometry, { indirect: true });
  const transform = mesh.matrixWorld.clone().invert().multiply(shells[i].matrixWorld); shellChecks++;
  assert.ok(!tree.intersectsGeometry(shells[i].geometry, transform), `pylon ${i} intersects ${mesh.name}`);
}
assert.ok(shellChecks > 0, 'check candidate pairs against real city geometry');

// Test the actual wing and pod meshes, with the runtime yaw, roll and formation offsets.
const scene = new Scene(); mobility(scene); const aircraft: Mesh[] = [];
scene.traverse(o => { if (o instanceof Mesh && ['air-taxis', 'air-pods'].includes(o.name)) { o.geometry.computeBoundingBox(); aircraft.push(o); } });
const paths = routes(), curve = paths.shore, stepCount = Math.ceil(curve.getLength() / .5);
function poseAt(route: CatmullRomCurve3, u: number, lateral: number, roll: number) {
  const point = route.getPointAt(u), tangent = route.getTangentAt(u), yaw = Math.atan2(tangent.x, tangent.z);
  point.add(new Vector3(tangent.z * lateral, 0, -tangent.x * lateral));
  return new Matrix4().compose(point, new Quaternion().setFromEuler(new Euler(0, yaw, roll, 'YXZ')), new Vector3(5, 5, 5));
}
function intersectsShell(craft: Mesh, transform: Matrix4) {
  const box = craft.geometry.boundingBox!.clone().applyMatrix4(transform);
  return shells.some((shell, i) => box.intersectsBox(shellBounds[i]) && shell.geometry.boundsTree!.intersectsGeometry(craft.geometry, shell.matrixWorld.clone().invert().multiply(transform)));
}
// Conservative envelopes cover the remaining active routes against every loaded shell.
for (const [list, dimensions] of [
  [[...paths.tracks, paths.sweep], [8, 8, 14]], [paths.promenades, [4, 4, 4]], [paths.streets, [10, 6, 10]],
  [[paths.water, paths.ferry, paths.ixBoat, ...paths.channels], [12, 6, 12]],
  [[paths.air, paths.approach, paths.shore, paths.ixApproach, ...paths.sky], [20, 10, 20]], [paths.decks, [4, 4, 4]],
] as const) {
  const geometry = new BoxGeometry(...dimensions); geometry.computeBoundingBox(); const envelope = new Mesh(geometry);
  for (const route of list) for (const point of route.getSpacedPoints(Math.ceil(route.getLength() / 4)))
    assert.ok(!intersectsShell(envelope, new Matrix4().makeTranslation(point.x, point.y, point.z)), 'a sampled actor envelope intersects a loaded Sky Ring pylon');
}
// Reconstruct the earlier shore lane and prove this check catches the reported collision.
const previous = new CatmullRomCurve3(shoreLane.map(p => new Vector3(...(p[0] === -454 && p[2] === -28 ? [-464, 80, -53] as const : p))), true, 'centripetal');
assert.ok(aircraft.filter(m => m.name === 'air-taxis').some(m => intersectsShell(m, poseAt(previous, .39373, -10, -.035))), 'the old lane reproduces the original pylon collision');
let cityCandidates = 0;
for (let i = 0; i <= stepCount; i++) for (const lateral of [-10, 0, 10]) for (const roll of [-.035, 0, .035]) {
  const transform = poseAt(curve, i / stepCount, lateral, roll);
  for (const craft of aircraft) {
    if (craft.name === 'air-pods' && lateral !== 0) continue;
    assert.ok(!intersectsShell(craft, transform), `${craft.name} shore sample ${i}, offset ${lateral}, roll ${roll} intersects a pylon`);
    if (i % 2) continue; // city geometry is sampled at 1 m; pylon checks above use 0.5 m.
    const box = craft.geometry.boundingBox!.clone().applyMatrix4(transform);
    for (const { mesh, box: cityBox } of solids) {
      if (!box.intersectsBox(cityBox)) continue;
      cityCandidates++; const tree = mesh.geometry.boundsTree ??= new MeshBVH(mesh.geometry, { indirect: true });
      assert.ok(!tree.intersectsGeometry(craft.geometry, mesh.matrixWorld.clone().invert().multiply(transform)), `${craft.name} shore sample ${i} intersects ${mesh.name}`);
    }
  }
}
// A 40 m horizontal window covers two 22 m aircraft and the 10 m formation offset.
const shore = curve.getSpacedPoints(Math.ceil(curve.getLength() / 2));
for (const other of [paths.air, paths.approach, paths.ixApproach, ...paths.sky]) {
  const points = other.getSpacedPoints(Math.ceil(other.getLength() / 2));
  for (const a of shore) for (const b of points) if (Math.hypot(a.x - b.x, a.z - b.z) < 40)
    assert.ok(Math.abs(a.y - b.y) > 10, 'nearby flight paths retain more than 10 m vertical separation at sampled points');
}
console.log(`Sky Ring clearance: ${shellChecks} pylon/city candidate pairs, ${stepCount + 1} shore positions, ${cityCandidates} aircraft/city candidate pairs; old collision reproduced, adjusted route clear at sampled poses.`);
