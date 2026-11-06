import assert from 'node:assert/strict';
import { Box3, Mesh, PerspectiveCamera, Raycaster, Scene, Vector3 } from 'three';
import { changeSites, SKY_RING } from '../src/layout.ts';
import { HERO_POSITION, HERO_TARGET } from '../src/heroCamera.ts';
import { routes } from '../src/mobility.ts';
import { skyRing, VOICE_NODES, voiceSlot, ringPoint, PYLONS } from '../src/skyRing.ts';

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
