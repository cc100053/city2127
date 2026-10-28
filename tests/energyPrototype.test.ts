import assert from 'node:assert/strict';
import { Box3, Group, InstancedMesh, Matrix4, Mesh, MeshPhysicalMaterial, Raycaster, Texture, Vector3 } from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { arc, chrome, trim } from '../src/cityRig.ts';
import { ENERGY_OPTIONS, energyCycle, energyPrototype } from '../src/energyPrototype.ts';
import { tidalEdge } from '../src/amphibiousShore.ts';
import { civicCore } from '../src/civicCore.ts';
import { heroCamera } from '../src/heroCamera.ts';
import { boatPoses, HULL, routes, WATER_PERIOD } from '../src/mobility.ts';
import { changeSites, INTERCHANGE, SPHERE_DOCK } from '../src/layout.ts';
import { laneBeaconSites, shoreRoomBays } from '../src/waterRooms.ts';

const study = energyPrototype(), path = routes(), camera = heroCamera(1920, 1080);
camera.updateMatrixWorld(true);
const meshes: Mesh[] = [];
study.root.traverse(o => { if (o instanceof Mesh && !(o instanceof InstancedMesh)) { o.geometry.boundsTree = new MeshBVH(o.geometry, { indirect: true }); o.raycast = acceleratedRaycast; meshes.push(o); } });
const count = meshes.length, originalMeshes = meshes.map(m => m.uuid);
const expected = { baseline: [], a: ['wing', 'garden', 'distribution'], b: ['wing', 'ring', 'distribution'], c: ['island', 'distribution'], mixed: ['wing', 'garden', 'ring', 'island', 'distribution'] };
for (const option of Object.keys(ENERGY_OPTIONS) as (keyof typeof ENERGY_OPTIONS)[]) {
  study.select(option);
  assert.equal(study.option, option);
  assert.deepEqual(Object.entries(study.parts).filter(([, g]) => g.visible).map(([key]) => key), expected[option]);
}
// Every independent composition uses the authored geometry, including combinations absent from DEV presets.
for (const waterGardens of [0, 1, 2] as const) for (const receiver of ['none', 'small', 'large'] as const)
  for (const flywheel of [false, true]) for (const island of [false, true]) {
    const configuration = { waterGardens, receiver, flywheel, island };
    study.configure(configuration);
    assert.deepEqual(study.getConfiguration(), configuration);
    assert.equal(study.gardens[0].visible, waterGardens > 0);
    assert.equal(study.gardens[1].visible, waterGardens === 2);
    assert.equal(study.parts.wing.visible, receiver !== 'none');
    assert.equal(study.parts.wing.scale.x, receiver === 'small' ? .65 : 1);
    assert.equal(study.parts.ring.visible, flywheel);
    assert.equal(study.parts.island.visible, island);
    assert.equal(study.parts.distribution.visible, waterGardens > 0 || receiver !== 'none' || flywheel || island);
    study.update(10);
    const delivery = study.root.getObjectByName('energy-distribution-flow')!;
    assert.equal(delivery.visible, waterGardens === 0 && !flywheel, 'external supply runs without a storage cycle');
    const copy = study.getConfiguration(); copy.island = !island;
    assert.deepEqual(study.getConfiguration(), configuration, 'configuration evidence cannot mutate the model target');
  }
study.select('mixed');
assert.ok(study.gardens[0].getObjectByName('energy-west-garden-edge-lights'), 'west water garden keeps its own supported edge lighting');
assert.equal(study.gardens[1].getObjectByName('energy-west-garden-edge-lights'), undefined, 'sector A must leave the second garden geometry unchanged');
const secondLight = study.gardens[1].getObjectByName('energy-second-garden-edge-lights')!;
assert.ok(secondLight&&secondLight.children.length===1,'second-garden detail must reuse one existing public-light batch');
const firstLight = study.gardens[0].getObjectByName('energy-west-garden-edge-lights')!;
assert.deepEqual(Array.from((secondLight.children[0] as Mesh).geometry.attributes.position.array),Array.from((firstLight.children[0] as Mesh).geometry.attributes.position.array),'local clone edge detail differs from the existing supported west-garden envelope');
const after: string[] = []; study.root.traverse(o => { if (o instanceof Mesh && !(o instanceof InstancedMesh)) after.push(o.uuid); });
assert.deepEqual(after, originalMeshes, 'switching configurations reuses the same geometry'); assert.ok(count < 50, 'static study batches by shared finish');
// Both reservoirs and their district clone reuse one physical water finish through every cycle.
const waters = study.gardens.flatMap(g => ['energy-lower-water', 'energy-upper-water'].map(name => g.getObjectByName(name) as Mesh));
assert.ok(waters.every(w => w.material === waters[0].material), 'reservoir clones allocate separate water finishes');
const waterResources = waters.map(w => [w.geometry.uuid, w.material]);
for (const t of [0, 10, 20, 30, 40, 50, 60]) study.update(t);
assert.deepEqual(waters.map(w => [w.geometry.uuid, w.material]), waterResources, 'water cycling reallocates resources');
const waterFinish = waters[0].material;
assert.ok(waterFinish instanceof MeshPhysicalMaterial);
assert.equal(waterFinish.envMap, chrome.envMap, 'water reuses the existing city reflection texture');
// Exercise texture motion without requiring a browser image decoder in geometry tests.
const normal = new Texture(); waterFinish.normalMap = normal;
study.update(5); const earlyUV = normal.offset.toArray();
study.update(25); assert.notDeepEqual(normal.offset.toArray(), earlyUV, 'water normal never moves');
study.update(5); assert.deepEqual(normal.offset.toArray(), earlyUV, 'water normal drifts by frame delta');
study.update(0, true); const staticUV = normal.offset.toArray();
study.update(987, true); assert.deepEqual(normal.offset.toArray(), staticUV, 'static water normal keeps moving');
waterFinish.normalMap = null; normal.dispose();

const core = civicCore(); core.updateMatrixWorld(true);
core.traverse(o => { if (o instanceof Mesh) o.geometry.boundsTree = new MeshBVH(o.geometry, { indirect: true }); });
study.root.updateMatrixWorld(true);
const rotor = study.root.getObjectByName('energy-rotor')!;
assert.ok(rotor.children.length > 0, 'rotor remains separate from the stationary bearings');
for (const rotorMesh of rotor.children as Mesh[]) {
  const positions = rotorMesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const p = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(rotorMesh.matrix);
    assert.ok(Math.hypot(p.x, p.y) >= 29 && Math.hypot(p.x, p.y) <= 33 && Math.abs(p.z) <= 1.5, 'rotor escapes its sweep envelope');
  }
}
for (const rotorMesh of rotor.children as Mesh[]) for (const chassis of core.children as Mesh[]) {
  const relative = new Matrix4().copy(rotorMesh.matrixWorld).invert().multiply(chassis.matrixWorld);
  assert.equal(rotorMesh.geometry.boundsTree!.intersectsGeometry(chassis.geometry, relative), false, 'rotating band intersects theatre / work wings');
}
let sphereGap = Infinity;
rotor.traverse(o => { if (o instanceof Mesh) {
  const p = new Vector3(), positions = o.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) sphereGap = Math.min(sphereGap, p.fromBufferAttribute(positions, i).applyMatrix4(o.matrixWorld).distanceTo(new Vector3(-18, 100, 23)) - 24);
} });
assert.ok(sphereGap > 3, `rotor only ${sphereGap} m from theatre shell`);

// The entire rotor sweep (all angles), including the blocks, fits this conservative annular volume.
const sweptRoot = new Group();
const sweep = arc(sweptRoot, 29, 33, 3, [0, -1.5, 0], trim);
sweep.updateMatrix(); sweep.geometry.applyMatrix4(sweep.matrix); sweep.position.set(0, 0, 0); sweep.rotation.x = Math.PI / 2;
sweptRoot.position.copy(study.parts.ring.position); sweptRoot.updateMatrixWorld(true);
sweep.geometry.boundsTree = new MeshBVH(sweep.geometry, { indirect: true }); sweep.raycast = acceleratedRaycast;
for (const chassis of core.children as Mesh[]) {
  const relative = sweep.matrixWorld.clone().invert().multiply(chassis.matrixWorld);
  assert.equal(sweep.geometry.boundsTree.intersectsGeometry(chassis.geometry, relative), false, 'full rotor sweep meets occupied core');
}
for (const fixed of study.parts.ring.children) if (fixed instanceof Mesh) {
  assert.equal(sweep.geometry.boundsTree.intersectsGeometry(fixed.geometry, sweep.matrixWorld.clone().invert().multiply(fixed.matrixWorld)), false, 'full rotor sweep meets a fixed bearing');
}
for (const g of study.gardens) {
  const turbine = g.getObjectByName('energy-turbine')!;
  for (const mesh of turbine.children as Mesh[]) {
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const p = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrix);
      assert.ok(Math.hypot(p.x, p.y) <= 2.3 && Math.abs(p.z) <= .45, 'turbine escapes its sweep envelope');
    }
  }
  const envelope = new Group();
  const disc = arc(envelope, 0, 2.3, .9, [0, -.45, 0], trim);
  disc.updateMatrix(); disc.geometry.applyMatrix4(disc.matrix); disc.position.set(0, 0, 0); disc.rotation.x = Math.PI / 2;
  envelope.position.copy(turbine.position); g.add(envelope); study.root.updateMatrixWorld(true);
  disc.geometry.boundsTree = new MeshBVH(disc.geometry, { indirect: true });
  for (const fixed of g.children) if (fixed instanceof Mesh && !(fixed instanceof InstancedMesh)) {
    assert.equal(disc.geometry.boundsTree.intersectsGeometry(fixed.geometry, disc.matrixWorld.clone().invert().multiply(fixed.matrixWorld)), false, 'turbine sweep meets fixed room / support');
  }
  envelope.removeFromParent(); disc.geometry.dispose();
}
meshes.push(sweep);
const inverse = new Map(meshes.map(m => [m, m.matrixWorld.clone().invert()]));
function clear(box: Box3, label: string) {
  for (const mesh of meshes) assert.equal(mesh.geometry.boundsTree!.intersectsBox(box, inverse.get(mesh)!), false, `${label} meets ${mesh.parent?.name}`);
}
// Conservative world-axis boxes enclose each actual moving hull (all boat routes, full repeat period).
let hulls = 0;
for (let t = 0; t < WATER_PERIOD; t += .5) for (const b of boatPoses(t, path)) if (b.scale > .01) {
  const halfX = (HULL.x * Math.abs(Math.cos(b.yaw)) + 6.35 * Math.abs(Math.sin(b.yaw))) * b.scale + .5;
  const halfZ = (HULL.x * Math.abs(Math.sin(b.yaw)) + 6.35 * Math.abs(Math.cos(b.yaw))) * b.scale + .5;
  clear(new Box3(new Vector3(b.x - halfX, -1, b.z - halfZ), new Vector3(b.x + halfX, 6, b.z + halfZ)), `boat at ${t}/${b.x.toFixed(1)},${b.z.toFixed(1)}`); hulls++;
}
for (const route of [...path.promenades, ...path.decks]) for (const p of route.getSpacedPoints(300)) {
  clear(new Box3(p.clone().add(new Vector3(-3, .1, -3)), p.clone().add(new Vector3(3, 2.4, 3))), 'public path');
}
for (const route of [path.air, path.approach, path.shore, path.ixApproach]) for (const p of route.getSpacedPoints(300)) {
  clear(new Box3(p.clone().add(new Vector3(-11, -3, -11)), p.clone().add(new Vector3(11, 4, 11))), '22 m aircraft corridor');
}
clear(new Box3(new Vector3(...SPHERE_DOCK).add(new Vector3(-11, -1, -8)), new Vector3(...SPHERE_DOCK).add(new Vector3(11, 8, 8))), 'sphere berth');
clear(new Box3(new Vector3(INTERCHANGE.head[0] - 12, 0, INTERCHANGE.head[2] - 12), new Vector3(INTERCHANGE.head[0] + 12, 8, INTERCHANGE.head[2] + 12)), 'water interchange');
for (const room of shoreRoomBays()) {
  clear(new Box3(new Vector3(room.x - room.r - 2, 0, room.z - room.r - 2), new Vector3(room.x + room.r + 2, 12, room.z + room.r + 2)), 'water room public envelope');
  // Whole landward connection, not just the room centre.
  for (let t = 0; t <= 1; t += .025) {
    const p = new Vector3(room.sx, 0, room.sz).lerp(new Vector3(room.x, 0, room.z), t);
    clear(new Box3(p.clone().add(new Vector3(-2, .1, -2)), p.clone().add(new Vector3(2, 3, 2))), 'water room shore connection');
  }
}
for (const [x, z] of laneBeaconSites()) clear(new Box3(new Vector3(x - 1, 0, z - 1), new Vector3(x + 1, 59, z + 1)), 'shore-lane beacon');
// New public spur clears the actual stepped shore / pavilions along its whole width.
const tide = tidalEdge(); tide.updateMatrixWorld(true);
tide.traverse(o => { if (o instanceof Mesh) { o.geometry.boundsTree = new MeshBVH(o.geometry, { indirect: true }); o.raycast = acceleratedRaycast; } });
const ray = new Raycaster();
for (const g of study.gardens) for (let t = 0; t <= 1; t += .025) for (const x of [-1.6, 0, 1.6]) {
  const p = new Vector3(x, .6 * (1 - t) + .1, 17.5 + 34.5 * t).applyMatrix4(g.matrixWorld);
  ray.set(p, new Vector3(0, 1, 0)); ray.far = 2.3;
  assert.equal(ray.intersectObject(tide, true).length, 0, 'water-garden public spur meets tidal-edge pavilion / planting');
  assert.equal(ray.intersectObjects(meshes).length, 0, 'water-garden public spur meets energy machinery / service gate');
}
for (const site of Object.values(changeSites)) for (const height of [1, site.h * site.scale / 4]) {
  const look = new Vector3(site.x, height, site.z);
  ray.set(camera.position, look.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(look);
  assert.equal(ray.intersectObjects(meshes).length, 0, `${site.name} hero sightline obstructed`);
}
// Every studied part remains in the original hero frame; original camera values are never changed by select().
for (const mesh of meshes) {
  const positions = mesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const ndc = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera);
    assert.ok(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1, `${mesh.parent?.name} leaves hero frame: ${ndc.toArray()}`);
  }
}
// Check absolute-time replay, bounded water travel, phase direction and full static reduced-motion reading.
for (const t of [0, 10, 20, 30, 40, 50, 59.999, 60, 80, 120]) {
  const cycle = study.update(t);
  assert.ok(cycle.level >= 0 && cycle.level <= 1);
  assert.deepEqual(study.update(t), cycle, 'absolute-time replay must not integrate frame deltas');
}
const delivery = study.root.getObjectByName('energy-distribution-flow') as InstancedMesh;
study.update(10); assert.equal(delivery.visible, false);
study.update(30); assert.equal(delivery.visible, false);
study.update(50); assert.equal(delivery.visible, true);
const first = new Matrix4(), second = new Matrix4(); delivery.getMatrixAt(0, first);
study.update(51); delivery.getMatrixAt(0, second);
assert.ok(second.elements[14] > first.elements[14], 'release markers travel along the service rail toward shore');
study.select('c'); study.update(10); assert.equal(delivery.visible, true, 'island supplies distribution without the storage loop');
study.update(59.999); delivery.getMatrixAt(0, first); study.update(60); delivery.getMatrixAt(0, second);
assert.ok(Math.abs(second.elements[14] - first.elements[14]) < .01, 'continuous island supply jumps at storage cycle wrap'); study.select('mixed');
assert.equal(energyCycle(10).phase, 'charge'); assert.equal(energyCycle(30).phase, 'hold'); assert.equal(energyCycle(50).phase, 'release');
for (const t of [20, 40, 60, 120]) {
  assert.ok(Math.abs(energyCycle(t).angle - energyCycle(t - .00001).angle) < .00001, 'rotor jumps at a phase boundary');
  assert.ok(Math.abs(energyCycle(t).level - energyCycle(t - .00001).level) < .00001, 'water jumps at a phase boundary');
}
study.update(0, true); study.root.updateMatrixWorld(true);
const staticPose = () => { const state: number[][] = []; study.root.traverse(o => { state.push(o.matrixWorld.toArray()); if (o instanceof InstancedMesh) state.push(Array.from(o.instanceMatrix.array)); }); return state; };
const stillPose = staticPose();
assert.deepEqual(study.update(0, true), study.update(987, true), 'reduced motion is independent of time');
study.root.updateMatrixWorld(true); assert.deepEqual(staticPose(), stillPose, 'all energy transforms and marker instances stay fixed');
assert.ok(energyCycle(15).level > energyCycle(5).level, 'external charging fills the upper reservoir');
assert.ok(energyCycle(55).level < energyCycle(45).level, 'release drains the upper reservoir');
for (const g of study.gardens) {
  assert.ok(Math.abs(g.getObjectByName('energy-upper-water')!.position.y - 22.6) < 1e-10);
  assert.ok(Math.abs(g.getObjectByName('energy-lower-water')!.position.y + .3) < 1e-10);
}
const meshesAfterMotion: string[] = []; study.root.traverse(o => { if (o instanceof Mesh && !(o instanceof InstancedMesh)) meshesAfterMotion.push(o.uuid); });
assert.deepEqual(meshesAfterMotion, originalMeshes, 'motion reuses every mesh');
console.log(`Energy E3: five configurations, ${count} batches, rotor shell gap ${sphereGap.toFixed(2)} m; ${hulls} hulls, public / room paths, air / water berths and hero sightlines clear.`);
