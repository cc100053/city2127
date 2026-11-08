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
for (const name of ['PylonShell', 'PylonChannel00', 'PylonChannel01', 'PylonChannel02', 'PylonChannel03', 'CanopyShell', 'JunctionCast', 'Stair00', 'Stair17', 'StairSupport'])
  assert.ok(asset.scene.getObjectByName(name), `Sky Ring GLB contains ${name}`);
assert.equal(asset.animations.length, 0);
for (const name of ['CompactFlight00', 'CompactFlight03', 'CompactLanding00', 'CompactLanding02']) assert.ok(asset.scene.getObjectByName(name), `Sky Ring GLB contains ${name}`);

// Every resident must stand on an actual floor, and each staircase joins real landings.
const { Matrix4, Group } = await import('three');
const { MeshBVH, acceleratedRaycast } = await import('three-mesh-bvh');
Mesh.prototype.raycast = function (raycaster, intersects) {
  this.geometry.boundsTree ??= new MeshBVH(this.geometry, { indirect: true });
  return acceleratedRaycast.call(this, raycaster, intersects);
};
const occupants = ring.root.find(o => o.name === 'sky-ring-residents') as import('three').InstancedMesh;
const floors = ring.root.filter((o): o is Mesh => o instanceof Mesh && o.name === 'fixed-kit');
const legGeometry = (ring.root.filter(o => o.name === 'sky-ring-residents') as import('three').InstancedMesh[]).map(m => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox!.min.y; });
const actualFootOffset = Math.min(...legGeometry); assert.ok(actualFootOffset > 0 && actualFootOffset < .1);
const matrix = new Matrix4(), foot = new Vector3(), down = new Vector3(0, -1, 0), footRay = new Raycaster();
function support(point: import('three').Vector3, tolerance: number) {
  footRay.set(point.clone().add(new Vector3(0, tolerance, 0)), down); footRay.far = 2 * tolerance;
  return footRay.intersectObjects(floors).some(hit => Math.abs(hit.point.y - point.y) <= tolerance);
}
for (let k = 0; k < 820; k++) {
  occupants.getMatrixAt(k, matrix);
  for (const x of [-.13, .13]) {
    foot.set(x, actualFootOffset, 0).applyMatrix4(matrix);
    assert.ok(support(foot, .02), `ring resident ${k} foot at ${foot.toArray()} must stand on the actual floor`);
  }
}
for (let b = 0; b < 10; b++) {
  const a = (b + .5) / 10 * Math.PI * 2, gate = new Group();
  gate.position.copy(ringPoint(a, SKY_RING.deck, 4)); gate.lookAt(ringPoint(a, SKY_RING.deck, 0)); gate.updateMatrixWorld(true);
  const doorRay = new Raycaster(new Vector3(0, 1.5, -3.5).applyMatrix4(gate.matrixWorld), new Vector3(0, 0, 1).transformDirection(gate.matrixWorld), 0, 1.4);
  assert.equal(doorRay.intersectObjects(floors).length, 0, `berth ${b} hall entrance is open`);
  for (const [x, y, z, tolerance] of [[-26.67, .2, -1.5, .21], [-15.33, 3.6, -1.5, .08], [-23, -10.35, -6.82, .08], [-23, .05, -5.18, .2]]) {
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

// Check the exported switchback surfaces and the actual surrounding geometry at every riser.
for (let k = 0; k < 820; k++) {
  occupants.getMatrixAt(k, matrix); foot.setFromMatrixPosition(matrix); foot.y += actualFootOffset;
  for (const height of [.2, 1, 1.6]) for (const direction of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] as const) {
    const probe = new Raycaster(foot.clone().add(new Vector3(0, height, 0)), new Vector3(...direction), 0, .3);
    assert.equal(probe.intersectObjects(floors).length, 0, `resident ${k} clips nearby geometry`);
    assert.equal(probe.intersectObject(loadedArchitecture, true).length, 0, `resident ${k} clips loaded stair or pylon geometry`);
  }
}
for (let b = 0; b < 10; b++) {
  const a = (b + .5) / 10 * Math.PI * 2, gate = new Group();
  gate.position.copy(ringPoint(a, SKY_RING.deck, 4)); gate.lookAt(ringPoint(a, SKY_RING.deck, 0)); gate.updateMatrixWorld(true);
  for (let flight = 0; flight < 4; flight++) for (let step = 0; step < 13; step++) {
    const x = -2 + 4 * (step + .5) / 13, local = new Vector3(-25 - (flight % 2 ? -x : x), -10.35 + flight * 2.6 + (step + 1) * .2, -6 - (flight % 2 ? -.82 : .82));
    const point = local.clone().applyMatrix4(gate.matrixWorld);
    const foot = new Raycaster(point.clone().add(new Vector3(0, .08, 0)), down, 0, .16);
    assert.ok(foot.intersectObject(loadedArchitecture, true).some(hit => Math.abs(hit.point.y - point.y) < .03), `berth ${b}, flight ${flight}, step ${step} needs a real GLB tread`);
    const head = new Raycaster(point.clone().add(new Vector3(0, .05, 0)), new Vector3(0, 1, 0), 0, 1.7);
    assert.equal(head.intersectObjects(floors).length, 0, `berth ${b}, flight ${flight}, step ${step} lacks headroom`);
    for (const height of [.2, 1, 1.6]) for (const direction of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const origin = local.clone().add(new Vector3(0, height, 0)).applyMatrix4(gate.matrixWorld);
      const side = new Vector3(...direction).transformDirection(gate.matrixWorld), probe = new Raycaster(origin, side, 0, .3);
      assert.equal(probe.intersectObjects(floors).length, 0, `berth ${b}, flight ${flight}, step ${step} clips nearby geometry`);
    }
  }
  const bridgeOrigin = new Vector3(-23, -9.35, -6.8).applyMatrix4(gate.matrixWorld), bridgeDirection = new Vector3(0, 0, 1).transformDirection(gate.matrixWorld);
  assert.equal(new Raycaster(bridgeOrigin, bridgeDirection, 0, 6).intersectObjects(floors).length, 0, `berth ${b} stair bridge is obstructed`);
}

// The GLB stair can meet its handrails and landings, but must not cut through the truss or berth body.
const { Line3 } = await import('three');
const compactPrefab = new Group(); asset.scene.updateMatrixWorld(true);
asset.scene.traverse(o => {
  if (!(o instanceof Mesh) || !o.name.startsWith('Compact')) return;
  const copy = new Mesh(o.geometry, o.material); copy.applyMatrix4(o.matrixWorld); copy.position.z += 200; copy.name = o.name; compactPrefab.add(copy);
});
for (let b = 0; b < 10; b++) {
  const a = (b + .5) / 10 * Math.PI * 2, gate = new Group();
  gate.position.copy(ringPoint(a, SKY_RING.deck, 4)); gate.lookAt(ringPoint(a, SKY_RING.deck, 0)); gate.updateMatrixWorld(true);
  const stair = compactPrefab.clone(); stair.position.set(-25, -10.35, -6); stair.rotation.y = Math.PI; gate.add(stair); gate.updateMatrixWorld(true);
  stair.traverse(o => {
    if (!(o instanceof Mesh)) return;
    o.geometry.computeBoundingBox(); const bounds = o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld);
    for (const fixed of floors) {
      fixed.geometry.computeBoundingBox(); if (!bounds.intersectsBox(fixed.geometry.boundingBox!.clone().applyMatrix4(fixed.matrixWorld))) continue;
      const aTree = fixed.geometry.boundsTree ??= new MeshBVH(fixed.geometry, { indirect: true });
      const bTree = o.geometry.boundsTree ??= new MeshBVH(o.geometry, { indirect: true });
      const transform = fixed.matrixWorld.clone().invert().multiply(o.matrixWorld), segment = new Line3();
      aTree.bvhcast(bTree, transform, { intersectsTriangles: (first, second) => {
        if (!first.intersectsTriangle(second, segment, true)) return false;
        for (const end of [segment.start, segment.end]) {
          const p = gate.worldToLocal(end.clone().applyMatrix4(fixed.matrixWorld));
          const handrail = Math.abs(p.z + 7.54) < .12 || Math.abs(p.z + 4.46) < .12;
          const lowerContact = o.name === 'CompactFlight00' && p.y <= -10.34;
          const upperContact = o.name === 'CompactFlight03' && p.y >= -.22 && p.x >= -23.11;
          assert.ok(handrail || lowerContact || upperContact, `berth ${b} ${o.name} intersects structure at ${p.toArray()}`);
        }
        return false;
      } });
    }
  });
}
