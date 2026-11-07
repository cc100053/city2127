import assert from 'node:assert/strict';
import { Box3, Mesh, PerspectiveCamera, Raycaster, Scene, Vector3 } from 'three';
import { changeSites, SKY_RING } from '../src/layout.ts';
import { HERO_POSITION, HERO_TARGET } from '../src/heroCamera.ts';
import { routes } from '../src/mobility.ts';
import { skyRing, skyRingArchitecture, VOICE_NODES, voiceSlot, ringPoint, PYLONS } from '../src/skyRing.ts';

const scene = new Scene(), ring = skyRing(scene);
scene.updateMatrixWorld(true);
const meshes = ring.root.filter((o): o is Mesh => o instanceof Mesh);
assert.ok(ring.root.some(o => o.name === 'sky-ring-architecture'), 'loaded architecture follows the ring lifecycle');

// The ring never hides a focal site from the hero pose (ground and quarter height, plus the tower's top).
const camera = new PerspectiveCamera(42, 16 / 9, 2, 9000); camera.position.set(...HERO_POSITION); camera.lookAt(...HERO_TARGET);
const ray = new Raycaster();
for (const site of Object.values(changeSites)) for (const height of [1, site.h * site.scale / 4, site.h * site.scale]) {
  const look = new Vector3(site.x, height, site.z);
  ray.set(camera.position, look.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(look);
  assert.equal(ray.intersectObjects(meshes).length, 0, `${site.name} hero sightline crosses the Sky Ring at ${height} m`);
}

// The regional loop keeps its 160–170 m tier and follows the ring's plan well below the truss.
const box = new Box3(); for (const m of meshes) box.expandByObject(m);
assert.ok(box.max.y <= SKY_RING.deck + 8, `ring top ${box.max.y}`);
const air = routes().air;
for (let i = 0; i < 200; i++) { const y = air.getPointAt(i / 200).y; assert.ok(y >= 160 && y <= 177 && SKY_RING.deck - 16 - y >= 40, `district loop stays in the 160–170 m tier under the ring (${y})`); }
// Every pylon foot stands outside the ring, at sea level.
for (const a of PYLONS) assert.ok(ringPoint(a, 0, 100).distanceTo(new Vector3(SKY_RING.x, 0, SKY_RING.z)) > Math.min(SKY_RING.rx, SKY_RING.rz));

// Voices: count only, deterministic, spread over the ring and saturating at VOICE_NODES.
assert.equal(new Set(Array.from({ length: VOICE_NODES }, (_, k) => voiceSlot(k))).size, VOICE_NODES);
for (const [count, lit] of [[0, 0], [1, 1], [57, 57], [VOICE_NODES, VOICE_NODES], [5000, VOICE_NODES], [-3, 0]]) { ring.setVoices(count); assert.equal(ring.litVoices(), lit); }
console.log(`skyRing tests passed: ${meshes.length} batches, top ${box.max.y.toFixed(1)} m, 12 hero sightlines clear`);

// The Blender-authored GLB consumed by the runtime contains reusable shells and a supported staircase.
const { readFile } = await import('node:fs/promises');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const glb = await readFile(new URL('../asset/models/sky-ring-architecture/sky-ring-architecture.glb', import.meta.url));
const asset = await new Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>((resolve, reject) =>
  new GLTFLoader().parse(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '', resolve, reject));
for (const name of ['PylonShell', 'PylonChannel00', 'PylonChannel01', 'PylonChannel02', 'PylonChannel03', 'Stair00', 'Stair17', 'StairSupport'])
  assert.ok(asset.scene.getObjectByName(name), `Sky Ring GLB contains ${name}`);
assert.equal(asset.animations.length, 0);
for (const name of ['LowerStair00', 'LowerStair51', 'LowerStairSupport']) assert.ok(asset.scene.getObjectByName(name), `Sky Ring GLB contains ${name}`);

// Every hall occupant must stand on its actual floor, and each staircase joins real landings.
const { Matrix4, Group } = await import('three');
const occupants = ring.root.find(o => o.name === 'sky-ring-residents') as import('three').InstancedMesh;
const floors = ring.root.filter((o): o is Mesh => o instanceof Mesh && o.name === 'fixed-kit');
const legGeometry = (ring.root.filter(o => o.name === 'sky-ring-residents') as import('three').InstancedMesh[]).map(m => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox!.min.y; });
const actualFootOffset = Math.min(...legGeometry); assert.ok(actualFootOffset > 0 && actualFootOffset < .1);
const matrix = new Matrix4(), foot = new Vector3(), down = new Vector3(0, -1, 0), footRay = new Raycaster();
function support(point: import('three').Vector3, tolerance: number) {
  footRay.set(point.clone().add(new Vector3(0, tolerance, 0)), down); footRay.far = 2 * tolerance;
  return footRay.intersectObjects(floors).some(hit => Math.abs(hit.point.y - point.y) <= tolerance);
}
for (let k = 0; k < 300; k++) {
  occupants.getMatrixAt(k, matrix);
  for (const x of [-.13, .13]) {
    foot.set(x, actualFootOffset, 0).applyMatrix4(matrix);
    assert.ok(support(foot, .02), `hall occupant ${k} foot at ${foot.toArray()} must stand on the actual floor`);
  }
}
for (let b = 0; b < 10; b++) {
  const a = (b + .5) / 10 * Math.PI * 2, gate = new Group();
  gate.position.copy(ringPoint(a, SKY_RING.deck, 4)); gate.lookAt(ringPoint(a, SKY_RING.deck, 0)); gate.updateMatrixWorld(true);
  const doorRay = new Raycaster(new Vector3(0, 1.5, -3.5).applyMatrix4(gate.matrixWorld), new Vector3(0, 0, 1).transformDirection(gate.matrixWorld), 0, 1.4);
  assert.equal(doorRay.intersectObjects(floors).length, 0, `berth ${b} hall entrance is open`);
  for (const [x, y, z, tolerance] of [[-26.67, .2, -1.5, .21], [-15.33, 3.6, -1.5, .08], [-11, -10.35, -3, .08], [-11, 0, -15, .08]]) {
    const point = new Vector3(x, y, z).applyMatrix4(gate.matrixWorld);
    assert.ok(support(point, tolerance), `berth ${b} stair landing at ${x},${y},${z} needs real support`);
  }
}

// The exact loaded Blender geometry is part of the same hero sightline check.
const loadedArchitecture = skyRingArchitecture(asset.scene); loadedArchitecture.updateMatrixWorld(true);
for (const site of Object.values(changeSites)) for (const height of [1, site.h * site.scale / 4, site.h * site.scale]) {
  const look = new Vector3(site.x, height, site.z);
  ray.set(camera.position, look.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(look);
  assert.equal(ray.intersectObject(loadedArchitecture, true).length, 0, `${site.name} hero sightline crosses the loaded Sky Ring architecture at ${height} m`);
}
