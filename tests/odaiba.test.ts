import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, Group, Mesh, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { placeOdaibaModel } from '../src/odaibaPlacement.ts';
import { changeSites } from '../src/layout.ts';
import { heroCamera } from '../src/heroCamera.ts';

const layout = JSON.parse(readFileSync(new URL('../src/odaiba-layout.json', import.meta.url), 'utf8'));
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(readFileSync(new URL('../' + layout.source, import.meta.url))), layout.sourceSha256,
  'Masterplan changed: rerun the read-only Blender metadata extraction');
assert.equal(layout.buildings.length, 8);
assert.equal(new Set(layout.buildings.map((p: { id: string }) => p.id)).size, 8);
let triangles = 0;
const city = new Group();
for (const placement of layout.buildings) {
  assert.deepEqual(placement.scale, [1, 1, 1], 'Preserve authored metres');
  assert.equal(placement.adapterRotationX !== 0, placement.id === 'grand-nikko-tokyo-daiba');
  const bytes = readFileSync(new URL(`../asset/models/${placement.id}/${placement.id}.glb`, import.meta.url));
  assert.equal(hash(bytes), placement.glbSha256, `${placement.id}: source GLB changed`);
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  placeOdaibaModel(scene, placement);
  // Compute precise vertex bounds, not rotated local AABBs. Independent expected
  // bounds were read from actual world-space geometry in the Blender masterplan.
  const actual = new Box3(), point = new Vector3();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const positions = object.geometry.attributes.position;
    triangles += (object.geometry.index?.count ?? positions.count) / 3;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      actual.expandByPoint(point);
    }
  });
  const [min, max] = placement.boundsBlender;
  const expected = [[min[0], min[2], -max[1]], [max[0], max[2], -min[1]]];
  [actual.min.toArray(), actual.max.toArray()].forEach((bound, side) => bound.forEach((v, axis) => {
    assert.ok(Math.abs(v - expected[side][axis]) < .002,
      `${placement.id} bound ${side}/${axis}: ${v} differs from source ${expected[side][axis]}`);
  }));
  assert.ok(Math.abs(actual.min.y) < .002, `${placement.id} grounded at source pad`);
  city.add(scene);
}
assert.equal(triangles, 339919, 'All eight complete GLBs retain reviewed geometry');

// Survey sites: the whole scaled lot (plus a 5 m margin) lands on open ground, and the hero pose sees each site unobstructed.
const environmentBytes = readFileSync(new URL('../asset/models/odaiba-masterplan/odaiba_masterplan_v01_phase03d_environment.glb', import.meta.url));
city.add((await new GLTFLoader().parseAsync(environmentBytes.buffer.slice(environmentBytes.byteOffset, environmentBytes.byteOffset + environmentBytes.byteLength), '')).scene);
city.updateMatrixWorld(true);
const openGround = /^(TERRAIN|PHASE03C_LANDSCAPE|PHASE03C_PLAZA|PRIMARY_PLAZA|PHASE03C_SERVICE|SERVICE_BAY|SIDEWALK|WATERFRONT_PROMENADE)/;
const ray = new Raycaster(), down = new Vector3(0, -1, 0);
const camera = heroCamera(1920, 1080);
camera.updateMatrixWorld(true);
for (const site of Object.values(changeSites)) {
  const w = site.w * site.scale, d = site.d * site.scale;
  for (let x = -w / 2 - 5; x <= w / 2 + 5; x += 5) for (let z = -d / 2 - 5; z <= d / 2 + 5; z += 5) {
    ray.set(new Vector3(site.x + x, 500, site.z + z), down);
    const hit = ray.intersectObject(city, true)[0];
    assert.ok(hit && openGround.test(hit.object.name) && hit.point.y < 3, `${site.name} lot meets ${hit?.object.name ?? 'nothing'} at ${Math.round(site.x + x)},${Math.round(site.z + z)}`);
  }
  // A point a quarter of the way up the tallest variant must be in frame and not hidden behind a landmark or context block.
  const look = new Vector3(site.x, site.h * site.scale / 4, site.z), ndc = look.clone().project(camera);
  assert.ok(Math.abs(ndc.x) < .95 && Math.abs(ndc.y) < .95, `${site.name} leaves the hero frame: ${ndc.x.toFixed(2)},${ndc.y.toFixed(2)}`);
  ray.set(camera.position, look.clone().sub(camera.position).normalize());
  const blocker = ray.intersectObject(city, true)[0];
  assert.ok(!blocker || blocker.distance > camera.position.distanceTo(look) - 1, `${site.name} hidden from the hero pose by ${blocker?.object.name}`);
}
console.log('Odaiba: survey sites sit on open ground, clear of roads, landmarks and guideway, and are visible from the hero pose.');
console.log('Odaiba: eight GLBs match Phase 03D world bounds within 2 mm, grounded, unit scale, legacy axis verified.');
