import assert from 'node:assert/strict';
import { Box3, Group, InstancedMesh, Line3, Matrix4, Mesh, Object3D, Ray, Scene, Sphere, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { HOUSING_HOME_ROUTE, housingPrototype } from '../src/housingPrototype.ts';
import { routes } from '../src/mobility.ts';
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
  // Static reserved body corridor above the rail/dock interface; H2 must still verify each articulated moving part.
  const body = new Box3().setFromObject(housing.wholeHome); body.min.y = 3.35;
  const shift = new Vector3().subVectors(new Vector3(...HOUSING_HOME_ROUTE.end), new Vector3(...HOUSING_HOME_ROUTE.start));
  const fixed = [...obstacles, ...houses.filter(h => h.mesh.parent !== housing.wholeHome)];
  let homeRouteChecks = 0;
  for (let i = 0; i <= 24; i++) {
    const corridor = body.clone().translate(shift.clone().multiplyScalar(i / 24));
    for (const other of fixed) if (corridor.intersectsBox(other.box)) {
      other.mesh.geometry.boundsTree ??= new MeshBVH(other.mesh.geometry, { indirect: true });
      homeRouteChecks++;
      assert.equal(other.mesh.geometry.boundsTree.intersectsBox(corridor, other.matrix.clone().invert()), false,
        `Whole-home body corridor enters ${other.mesh.parent?.name} / ${other.mesh.name}`);
    }
  }
  camera.updateMatrixWorld(true);
  let routeChecks = 0;
  for (const [key, value] of Object.entries(path)) for (const curve of Array.isArray(value) ? value : [value]) {
    const radius = /air|approach|shore|ixApproach/.test(key) ? 22 : /street|guideway|tracks|water|ferry|ixBoat|sweep/.test(key) ? 8 : 4;
    for (const p of curve.getSpacedPoints(Math.ceil(curve.getLength() / .5))) for (const h of houses) if (h.box.distanceToPoint(p) < radius + .5) {
      routeChecks++; sphere.set(p, radius + .5).applyMatrix4(h.matrix.clone().invert());
      assert.equal(trees.get(h.mesh.geometry)!.intersectsSphere(sphere), false, `housing enters ${key} route envelope`);
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
  console.log(`PASS housing H1b city: actual landmark/environment/planting fixture, ${exact} exact mesh checks, route envelopes (${routeChecks} near tests), home body corridor (${homeRouteChecks} near tests) and 20 focal sightlines.`);
}
