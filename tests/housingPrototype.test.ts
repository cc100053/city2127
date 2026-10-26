import assert from 'node:assert/strict';
import { Box3, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { leaf } from '../src/cityRig.ts';
import { HOUSING_OPTIONS, HOUSING_SITES, housingPrototype } from '../src/housingPrototype.ts';

const study = housingPrototype(), resources: unknown[] = [];
study.root.traverse(o => { if (o instanceof Mesh) resources.push(o.uuid, o.geometry, o.material); });
for (const key of Object.keys(HOUSING_OPTIONS) as (keyof typeof HOUSING_OPTIONS)[]) {
  study.select(key);
  assert.equal(study.option, key);
  for (const [name, part] of Object.entries(study.parts)) assert.equal(part.visible, key === name || key === 'mixed');
  assert.equal(study.composite.visible, key === 'mixed');
}
study.select('mixed'); study.root.updateMatrixWorld(true);
const instance = new Matrix4(), world = new Matrix4(), point = new Vector3();
let triangles = 0, meshes = 0;
const geometries = new Set(), materials = new Set();
for (const [name, part] of Object.entries(study.parts)) {
  const [x, z] = HOUSING_SITES[name as keyof typeof HOUSING_SITES];
  const reservation = new Box3(new Vector3(x - 12, 0, z - 9), new Vector3(x + 12, 28, z + 9));
  part.traverse(o => {
    if (!(o instanceof Mesh)) return;
    meshes++; geometries.add(o.geometry); materials.add(o.material);
    assert.ok(!Array.isArray(o.material), 'Housing batches by shared finish');
    const n = o instanceof InstancedMesh ? o.count : 1, positions = o.geometry.attributes.position;
    triangles += (o.geometry.index?.count ?? positions.count) / 3 * n;
    for (let j = 0; j < n; j++) {
      if (o instanceof InstancedMesh) { o.getMatrixAt(j, instance); world.multiplyMatrices(o.matrixWorld, instance); } else world.copy(o.matrixWorld);
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(world);
        assert.ok(reservation.containsPoint(point), `${name} leaves the agreed reservation at ${point.toArray()}`);
      }
    }
  });
}
assert.ok(triangles <= 150_000, `Housing triangles ${triangles} exceed H0 budget`);
assert.ok(geometries.size <= 36 && meshes <= 36);
assert.equal(leaf.emissive.getHex(), 0, 'Living membrane is not self-lit');
const after: unknown[] = [];
for (let i = 0; i < 20; i++) { study.select('baseline'); study.select('mixed'); }
study.root.traverse(o => { if (o instanceof Mesh) after.push(o.uuid, o.geometry, o.material); });
assert.deepEqual(after, resources, 'Preset changes must not allocate new meshes, geometries or materials');
console.log(`PASS housing H1: five parked configurations, three agreed reservations, composite skin and shared resources; ${meshes} meshes, ${geometries.size} geometries, ${triangles} triangles.`);
