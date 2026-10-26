import assert from 'node:assert/strict';
import { Box3, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { leaf } from '../src/cityRig.ts';
import { HOUSING_HOME_ROUTE, HOUSING_KEYFRAMES, HOUSING_OPTIONS, HOUSING_SITES, housingPrototype } from '../src/housingPrototype.ts';

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
assert.ok(geometries.size <= 36, `${geometries.size} geometries exceed the total housing budget`);
assert.ok(meshes <= 80, `${meshes} batches exceed the total housing draw budget`);
const collectiveSize = new Box3().setFromObject(study.collective).getSize(new Vector3());
assert.ok(Math.max(collectiveSize.x, collectiveSize.z) > collectiveSize.y * 1.5, 'The secondary collective frame stays horizontal');
study.algae.traverse(o => { if (o instanceof Mesh && !Array.isArray(o.material) && 'emissive' in o.material) assert.equal((o.material.emissive as { getHex(): number }).getHex(), 0, 'Algae equipment is not self-lit'); });
assert.equal(study.wholeHome.parent, study.parts.mobile);
assert.deepEqual(study.wholeHome.position.toArray(), HOUSING_HOME_ROUTE.start);
const destination = new Box3().setFromObject(study.wholeHome).translate(new Vector3(...HOUSING_HOME_ROUTE.end).sub(new Vector3(...HOUSING_HOME_ROUTE.start)));
const [ux, uz] = HOUSING_SITES.mobile;
assert.ok(new Box3(new Vector3(ux - 12, 0, uz - 9), new Vector3(ux + 12, 28, uz + 9)).containsBox(destination), 'The second dock remains in the agreed U reservation');
assert.equal(leaf.emissive.getHex(), 0, 'Living membrane is not self-lit');
const after: unknown[] = [];
for (let i = 0; i < 20; i++) { study.select('baseline'); study.select('mixed'); }
study.root.traverse(o => { if (o instanceof Mesh) after.push(o.uuid, o.geometry, o.material); });
assert.deepEqual(after, resources, 'Preset changes must not allocate new meshes, geometries or materials');
console.log(`PASS housing H1: five parked configurations, three agreed reservations, composite skin and shared resources; ${meshes} meshes, ${geometries.size} geometries, ${triangles} triangles.`);

// Replay is a pure clock projection: random access, wrap, static reading and resource reuse all restore the same dock.
const pose = () => study.moving.flatMap(root => { const matrices: number[][] = []; root.traverse(o => { o.updateMatrix(); matrices.push(o.matrix.toArray()); }); return matrices; });
study.update(0); const dockA = pose();
for (const seconds of [24, 66, 0, 90, 180, -90]) { study.update(seconds); if (seconds % 90 === 0) assert.deepEqual(pose(), dockA); }
study.update(24, true); assert.deepEqual(pose(), dockA);
study.update(NaN); assert.deepEqual(pose(), dockA);
const phases = new Set<string>();
for (let t = 0; t <= 90; t += .125) {
  const cycle = study.update(t); phases.add(cycle.phase);
  if (cycle.lift > 0 || cycle.out > 0 || (cycle.travel > 0 && cycle.travel < 1)) {
    assert.equal(cycle.plugA, 0, 'A utility disconnected before either dwelling moves');
    assert.equal(cycle.plugB, 0, 'B utility disconnected before either dwelling moves');
  }
  if (cycle.travel > 0 && cycle.travel < 1) { assert.equal(cycle.out, 1); assert.equal(cycle.lift, 1); }
  study.root.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(study.parts.mobile);
  assert.ok(bounds.min.x >= ux - 12 && bounds.max.x <= ux + 12 && bounds.min.z >= uz - 9 && bounds.max.z <= uz + 9 && bounds.max.y <= 28, 'Entire moving equipment remains in U reservation');
}
assert.deepEqual([...phases], ['docked', 'disconnect', 'departure', 'transport', 'docking', 'connected', 'return-disconnect', 'return-departure', 'return-transport', 'return-docking', 'reconnect']);
study.update(40); assert.deepEqual(study.wholeHome.position.toArray(), HOUSING_HOME_ROUTE.end);
assert.deepEqual(study.exchangeCabin.position.toArray(), [4.5, 10.8, 2.8]);
study.update(90); assert.deepEqual(pose(), dockA);
const afterMotion: unknown[] = [];
study.root.traverse(o => { if (o instanceof Mesh) afterMotion.push(o.uuid, o.geometry, o.material); });
assert.deepEqual(afterMotion, resources, 'Motion must reuse every mesh, geometry and material');
console.log('PASS H2: all 11 phases, disconnect-before-motion, full equipment bounds, random access/replay/90s wrap/static dock and resource identity.');

// Different moving assemblies must stay apart too: use each actual unit-box instance, not a body-only proxy.
const boxes = (root: import('three').Object3D) => {
  const result: Box3[] = [];
  root.traverse(o => {
    if (!(o instanceof Mesh)) return;
    o.geometry.computeBoundingBox();
    for (let i = 0; i < (o instanceof InstancedMesh ? o.count : 1); i++) {
      if (o instanceof InstancedMesh) { o.getMatrixAt(i, instance); world.multiplyMatrices(o.matrixWorld, instance); } else world.copy(o.matrixWorld);
      result.push(o.geometry.boundingBox!.clone().applyMatrix4(world));
    }
  });
  return result;
};
// Every box bound is affine within a keyframe interval. Clip all six overlap inequalities in time,
// so two moving assemblies cannot slip through each other between sampled poses.
const overlapTime = (a0: Box3, a1: Box3, b0: Box3, b1: Box3) => {
  let lo = 0, hi = 1;
  for (const axis of ['x', 'y', 'z'] as const) for (const pair of [
    [a0.min[axis] - b0.max[axis], a1.min[axis] - b1.max[axis]],
    [b0.min[axis] - a0.max[axis], b1.min[axis] - a1.max[axis]],
  ]) {
    const [start, end] = pair.map(n => n + .001);
    if (start >= 0 && end >= 0) return null;
    if (start < 0 && end < 0) continue;
    const crossing = -start / (end - start);
    if (start >= 0) lo = Math.max(lo, crossing); else hi = Math.min(hi, crossing);
  }
  return lo < hi ? (lo + hi) / 2 : null;
};
const interpolate = (a: Box3, b: Box3, t: number) => new Box3(a.min.clone().lerp(b.min, t), a.max.clone().lerp(b.max, t));
for (let k = 0; k < HOUSING_KEYFRAMES.length - 1; k++) {
  const start = HOUSING_KEYFRAMES[k], end = HOUSING_KEYFRAMES[k + 1];
  study.update(start); study.root.updateMatrixWorld(true); const from = study.moving.map(boxes);
  study.update(end); study.root.updateMatrixWorld(true); const to = study.moving.map(boxes);
  for (let i = 0; i < from.length; i++) for (let j = i + 1; j < from.length; j++) for (let a = 0; a < from[i].length; a++) for (let b = 0; b < from[j].length; b++) {
    const u = overlapTime(from[i][a], to[i][a], from[j][b], to[j][b]); if (u === null) continue;
    const overlap = interpolate(from[i][a], to[i][a], u).intersect(interpolate(from[j][b], to[j][b], u));
    const size = overlap.getSize(new Vector3()), time = start + (end - start) * u;
    // The two 7 cm ropes enter the trolley by 3 cm and the fork crossbar by 10 cm at their endpoints only.
    const ropeJoint = i >= 2 && j >= 4 && j <= 5 && (i === 2 || i === 3);
    const jointY = i === 2 ? 24.75 : 8.43 + .6 * study.update(time).lift;
    assert.ok(ropeJoint && size.x <= .071 && size.z <= .071 && size.y <= .101 && Math.abs(overlap.getCenter(new Vector3()).y - jointY) <= .051,
      `Moving assemblies ${i}/${j} overlap at ${time}: ${size.toArray()}`);
  }
}
study.update(0);
console.log('PASS H2 moving assemblies: cabin, home, fork, ropes, trolley and utilities; only measured rope-end mounting contacts.');
