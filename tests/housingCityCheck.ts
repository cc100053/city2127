import assert from 'node:assert/strict';
import { Box3, Group, InstancedMesh, Line3, Matrix4, Mesh, Object3D, Ray, Scene, Sphere, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { HOUSING_KEYFRAMES, housingPrototype } from '../src/housingPrototype.ts';
import { build2127 } from '../src/odaiba2127.ts';
import { mobility, routes } from '../src/mobility.ts';
import { occupantFleet } from '../src/occupants.ts';
import { presets } from '../src/presets.ts';
import { changeSites } from '../src/layout.ts';
import { heroCamera } from '../src/heroCamera.ts';
import { CityChangeManager } from '../src/cityChangeManager.ts';
import { EnergyRuntime } from '../src/energyRuntime.ts';
import { buildSurveySites } from '../src/siteBuilders/index.ts';
import { deriveExhibitionLayout } from '../survey/src/shared/cityView.ts';

/** Reuse the loaded Odaiba test fixture, including its real facades, landscape and roof planting. */
export function checkHousingCity(city: Object3D) {
  const district = new Scene(), documentBefore = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let manager: CityChangeManager;
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) } });
    manager = new CityChangeManager(buildSurveySites(district, { cloneRoot: () => new Promise<Group>(() => {}) } as never), new EnergyRuntime(district));
  } finally {
    if (documentBefore) Object.defineProperty(globalThis, 'document', documentBefore); else delete (globalThis as { document?: unknown }).document;
  }
  manager.applyExhibitionLayout({ ...deriveExhibitionLayout({ automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 }),
    energy: { waterGardens: 2, receiver: 'large', flywheel: true, island: true } }, 'city-state-snapshot', 0);
  build2127(district);
  district.updateMatrixWorld(true);
  const housing = housingPrototype(); housing.select('mixed'); housing.root.updateMatrixWorld(true); city.updateMatrixWorld(true);
  const instance = new Matrix4(), world = new Matrix4(), relative = new Matrix4();
  const shapes = (root: Object3D) => {
    const result: { mesh: Mesh; matrix: Matrix4; box: Box3 }[] = [];
    root.traverse(o => {
      if (!(o instanceof Mesh)) return;
      for (let parent: Object3D | null = o; parent; parent = parent.parent) if (!parent.visible) return;
      o.geometry.computeBoundingBox();
      for (let i = 0; i < (o instanceof InstancedMesh ? o.count : 1); i++) {
        if (o instanceof InstancedMesh) { o.getMatrixAt(i, instance); world.multiplyMatrices(o.matrixWorld, instance); } else world.copy(o.matrixWorld);
        result.push({ mesh: o, matrix: world.clone(), box: o.geometry.boundingBox!.clone().applyMatrix4(world) });
      }
    });
    return result;
  };
  const houses = shapes(housing.root), obstacles = [...shapes(city), ...shapes(district)], trees = new Map();
  for (const h of houses) if (!trees.has(h.mesh.geometry)) trees.set(h.mesh.geometry, new MeshBVH(h.mesh.geometry, { indirect: true }));
  let exact = 0;
  for (const h of houses) for (const other of obstacles) if (h.box.intersectsBox(other.box)) {
    exact++; relative.copy(h.matrix).invert().multiply(other.matrix);
    other.mesh.geometry.boundsTree ??= new MeshBVH(other.mesh.geometry, { indirect: true });
    let intersects = trees.get(h.mesh.geometry)!.intersectsGeometry(other.mesh.geometry, relative);
    if (intersects && !Array.isArray(other.mesh.material) && /^(landscape|sidewalk|plaza|service_area|road)$/.test(other.mesh.material.name)) {
      // Existing paving is one district-wide mesh: permit only actual ground contacts below 35 cm, not the whole mesh.
      const line = new Line3();
      intersects = trees.get(h.mesh.geometry)!.bvhcast(other.mesh.geometry.boundsTree, relative, { intersectsTriangles: (a, b) =>
        a.intersectsTriangle(b, line) && Math.max(line.start.clone().applyMatrix4(h.matrix).y, line.end.clone().applyMatrix4(h.matrix).y) > .35 });
    }
    assert.equal(intersects, false,
      `housing ${h.mesh.parent?.name} intersects ${other.mesh.name} / ${other.mesh.parent?.name}`);
  }
  const path = routes(), sphere = new Sphere(), camera = heroCamera(1920, 1080);
  // Every moving mesh/instance, including shoes, fork, ropes and plugs. Each interval moves/scales along one axis;
  // its endpoint union is the exact swept box for the unit boxes (no sampled-time holes).
  const owned = new Set<Object3D>(); housing.moving.forEach(root => root.traverse(o => owned.add(o)));
  const fixed = [...obstacles, ...houses.filter(h => !owned.has(h.mesh))];
  const sweeps: Box3[] = [];
  let sweepChecks = 0;
  for (let k = 0; k < HOUSING_KEYFRAMES.length - 1; k++) {
    housing.update(HOUSING_KEYFRAMES[k]); housing.root.updateMatrixWorld(true);
    const from = housing.moving.flatMap(shapes);
    housing.update(HOUSING_KEYFRAMES[k + 1]); housing.root.updateMatrixWorld(true);
    const to = housing.moving.flatMap(shapes);
    assert.equal(from.length, to.length);
    for (let i = 0; i < from.length; i++) {
      const corridor = from[i].box.clone().union(to[i].box);
      sweeps.push(corridor);
      for (const other of fixed) if (corridor.intersectsBox(other.box)) {
        other.mesh.geometry.boundsTree ??= new MeshBVH(other.mesh.geometry, { indirect: true });
        sweepChecks++;
        // 1 mm removes exact support-face contact only, not a whole named object or the underbody.
        assert.equal(other.mesh.geometry.boundsTree.intersectsBox(corridor.clone().expandByScalar(-.001), other.matrix.clone().invert()), false,
          `H2 sweep ${HOUSING_KEYFRAMES[k]}-${HOUSING_KEYFRAMES[k + 1]} ${from[i].mesh.parent?.name} enters ${other.mesh.parent?.name}/${other.mesh.name} at ${corridor.min.toArray()}..${corridor.max.toArray()}`);
      }
    }
  }
  housing.update(0); housing.root.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  let routeChecks = 0;
  for (const [key, value] of Object.entries(path)) for (const curve of Array.isArray(value) ? value : [value]) {
    const radius = /air|approach|shore|ixApproach/.test(key) ? 22 : /street|guideway|tracks|water|ferry|ixBoat|sweep/.test(key) ? 8 : 4;
    for (const p of curve.getSpacedPoints(Math.ceil(curve.getLength() / .5))) {
      for (const sweep of sweeps) assert.ok(sweep.distanceToPoint(p) >= radius + .5, `Full H2 sweep enters ${key} actor/path envelope`);
      for (const h of houses) if (h.box.distanceToPoint(p) < radius + .5) {
        routeChecks++; sphere.set(p, radius + .5).applyMatrix4(h.matrix.clone().invert());
        assert.equal(trees.get(h.mesh.geometry)!.intersectsSphere(sphere), false, `housing enters ${key} route envelope`);
      }
    }
  }
  // Multiple points per focal site: no housing triangle may block these existing hero sightlines.
  for (const focal of Object.values(changeSites)) for (const [dx, dz, height] of [[0, 0, .25], [0, 0, .6], [-.3, 0, .5], [.3, 0, .5], [0, -.3, .5]]) {
    const target = new Vector3(focal.x + dx * focal.w * focal.scale, focal.h * focal.scale * height, focal.z + dz * focal.d * focal.scale);
    const delta = target.clone().sub(camera.position), ray = new Ray(camera.position, delta.clone().normalize());
    for (const h of houses) {
      const local = ray.clone().applyMatrix4(h.matrix.clone().invert());
      const hit = trees.get(h.mesh.geometry)!.raycastFirst(local, 2);
      assert.ok(!hit || hit.point.clone().applyMatrix4(h.matrix).distanceTo(camera.position) > delta.length(), 'Housing blocks focal hero sightline');
    }
  }
  // Supplement continuous route envelopes with every actual fleet mesh/instance over a complete cycle,
  // including published facade/forecourt/roof occupants which are not routes() curves. No actor is hidden.
  const actors = new Scene(), updateActors = mobility(actors), updateOccupants = occupantFleet(actors);
  let actorBoxes = 0;
  const sweepBounds = sweeps.reduce((box, sweep) => box.union(sweep), new Box3()).expandByScalar(1);
  for (const hour of [12, 21]) for (let time = 0; time <= 90; time += .5) {
    updateActors(presets.neutral, time, .5, hour === 21 ? 1 : 0, hour);
    updateOccupants(presets.neutral, time, .5, hour);
    actors.updateMatrixWorld(true);
    for (const actor of shapes(actors)) {
      actorBoxes++;
      if (!actor.box.intersectsBox(sweepBounds)) continue;
      for (const sweep of sweeps) assert.equal(sweep.intersectsBox(actor.box), false, `H2 swept equipment meets actual ${actor.mesh.name} at ${time}/${hour}`);
    }
  }
  console.log(`PASS housing H2 city: actual landmark/environment/planting fixture, ${exact} exact mesh checks, route envelopes (${routeChecks} near tests), whole articulated sweep (${sweeps.length} interval boxes / ${sweepChecks} near tests), including skyways, ${actorBoxes} actual fleet boxes across 90s day/night and 20 focal sightlines.`);
}
