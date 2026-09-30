import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { placeOdaibaModel } from '../src/odaibaPlacement.ts';

const layout = JSON.parse(readFileSync(new URL('../src/odaiba-layout.json', import.meta.url), 'utf8'));
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(readFileSync(new URL('../' + layout.source, import.meta.url))), layout.sourceSha256,
  'Masterplan changed: rerun the read-only Blender metadata extraction');
assert.equal(layout.buildings.length, 8);
assert.equal(new Set(layout.buildings.map((p: { id: string }) => p.id)).size, 8);
let triangles = 0;
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
}
assert.equal(triangles, 339919, 'All eight complete GLBs retain reviewed geometry');
console.log('Odaiba: eight GLBs match Phase 03D world bounds within 2 mm, grounded, unit scale, legacy axis verified.');
