import assert from 'node:assert/strict';
import { Box3, Matrix4, Mesh, Raycaster, Vector3 } from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { ENERGY_OPTIONS, energyPrototype } from '../src/energyPrototype.ts';
import { tidalEdge } from '../src/amphibiousShore.ts';
import { civicCore } from '../src/civicCore.ts';
import { heroCamera } from '../src/heroCamera.ts';
import { boatPoses, HULL, routes, WATER_PERIOD } from '../src/mobility.ts';
import { changeSites, INTERCHANGE, SPHERE_DOCK } from '../src/layout.ts';
import { laneBeaconSites, shoreRoomBays } from '../src/waterRooms.ts';

const study = energyPrototype(), path = routes(), camera = heroCamera(1920, 1080);
camera.updateMatrixWorld(true);
const meshes: Mesh[] = [];
study.root.traverse(o => { if (o instanceof Mesh) { o.geometry.boundsTree = new MeshBVH(o.geometry, { indirect: true }); o.raycast = acceleratedRaycast; meshes.push(o); } });
const count = meshes.length, originalMeshes = meshes.map(m => m.uuid);
const expected = { baseline: [], a: ['wing', 'garden'], b: ['wing', 'ring'], c: ['island'], mixed: ['wing', 'garden', 'ring', 'island'] };
for (const option of Object.keys(ENERGY_OPTIONS) as (keyof typeof ENERGY_OPTIONS)[]) {
  study.select(option);
  assert.equal(study.option, option);
  assert.deepEqual(Object.entries(study.parts).filter(([, g]) => g.visible).map(([key]) => key), expected[option]);
}
const after: string[] = []; study.root.traverse(o => { if (o instanceof Mesh) after.push(o.uuid); });
assert.deepEqual(after, originalMeshes, 'switching configurations reuses the same geometry'); assert.ok(count < 25, 'static study batches by shared finish');
const core = civicCore(); core.updateMatrixWorld(true);
core.traverse(o => { if (o instanceof Mesh) o.geometry.boundsTree = new MeshBVH(o.geometry, { indirect: true }); });
study.root.updateMatrixWorld(true);
const rotor = study.root.getObjectByName('energy-rotor')!;
assert.ok(rotor.children.length > 0, 'rotor remains separate from the stationary bearings');
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
for (let t = 0; t <= 1; t += .025) for (const x of [-1.6, 0, 1.6]) {
  ray.set(new Vector3(-310 + x, .6 * (1 - t) + .1, -137 + 38 * t), new Vector3(0, 1, 0)); ray.far = 2.3;
  assert.equal(ray.intersectObject(tide, true).length, 0, 'new water-garden public spur meets tidal-edge pavilion / planting');
}
for (const site of Object.values(changeSites)) for (const height of [1, site.h * site.scale / 4]) {
  const look = new Vector3(site.x, height, site.z);
  ray.set(camera.position, look.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(look);
  assert.equal(ray.intersectObjects(meshes).length, 0, `${site.name} hero sightline obstructed`);
}
// Every studied part remains in the original hero frame; original camera values are never changed by select().
for (const group of Object.values(study.parts)) {
  const box = new Box3().setFromObject(group, true);
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const ndc = new Vector3(x, y, z).project(camera);
    assert.ok(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1, `${group.name} leaves hero frame: ${ndc.toArray()}`);
  }
}
console.log(`Energy E2: five configurations, ${count} batches, rotor shell gap ${sphereGap.toFixed(2)} m; ${hulls} hulls, public / room paths, air / water berths and hero sightlines clear.`);
