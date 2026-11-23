import assert from './assert.ts';
import { readFileSync } from 'node:fs';
import { Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';

const asset = new URL('../asset/models/rectenna-farm-canopy/rectenna-farm-canopy.glb', import.meta.url);
const bytes = Uint8Array.from(readFileSync(asset));
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer, '');
scene.updateMatrixWorld(true);

const ramp = scene.getObjectByName('Farm_Ramps');
const landing = scene.getObjectByName('West_Ramp_Landing');
const deck = scene.getObjectByName('Terrace_Slabs');
assert.ok(ramp && landing && deck);
const floorMeshes = [ramp, landing, deck];
const obstacles = [];
scene.traverse(mesh => {
  if (!mesh.isMesh) return;
  if (!mesh.geometry.boundsTree) computeBoundsTree.call(mesh.geometry, { indirect: true });
  mesh.raycast = acceleratedRaycast;
  if (!floorMeshes.includes(mesh)) obstacles.push(mesh);
});

// Survey coordinates in asset metres, with the surveyed west sill as the origin.
const sill = new Vector3(7.11786, .02, 22.942885);
const along = new Vector3(.544639, 0, -.838671);
const across = new Vector3(.838671, 0, .544639);
const rampLength = Math.hypot(7.13057, 10.98703);
const slope = 1.18 / rampLength;
const down = new Vector3(0, -1, 0);
const ray = new Raycaster();
let samples = 0;

function probe(distance, offset, height, expectedFloor) {
  const origin = sill.clone().addScaledVector(along, distance).addScaledVector(across, offset);
  origin.y = height + 1.125; // 2.25 m above the walking plane at runtime's 2× scale.
  ray.set(origin, down);
  ray.far = 1.13;
  const description = `west ramp at ${distance.toFixed(3)} m / ${offset.toFixed(3)} m`;
  if (expectedFloor) {
    const floor = ray.intersectObjects(floorMeshes).find(hit => hit.object === expectedFloor);
    assert.ok(floor && Math.abs(floor.point.y - height) < .001, `missing or uneven floor: ${description}`);
  }
  const obstruction = ray.intersectObjects(obstacles).find(hit =>
    hit.point.y > height + .001 &&
    !(hit.object.name === 'Farm_RampTreads' && hit.point.y - height < .025));
  assert.ok(!obstruction, `${obstruction?.object.name} blocks ${description}`);
  samples++;
}

for (let offset = .1; offset <= 1.061; offset += .04) {
  for (const side of [-1, 1]) {
    for (let distance = -4; distance < 0; distance += .025) {
      probe(distance, side * offset, .02, null);
    }
    for (let distance = .0005; distance < rampLength; distance += .025) {
      probe(distance, side * offset, .02 + distance * slope, ramp);
    }
    probe(rampLength - .0005, side * offset, 1.2 - .0005 * slope, ramp);
    probe(rampLength + .012, side * offset, 1.2, landing);
  }
}

for (let distance = rampLength + .08; distance < rampLength + 1.56; distance += .025) {
  for (let offset = 1.09; offset >= -5.04; offset -= .04) {
    probe(distance, offset, 1.2, offset >= -1.7 ? landing : deck);
  }
  probe(distance, -1.699, 1.2, landing);
  probe(distance, -1.707, 1.2, deck);
}

console.log(`Rectenna west ramp PASS · ${samples} probes · grade ${(100 * slope).toFixed(2)}%`);
