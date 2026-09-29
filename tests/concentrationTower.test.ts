import assert from 'node:assert/strict';
import * as T from 'three';
import type { Kit } from '../src/cityRig.ts';
import { changeSites, landmarks, publicRoutes } from '../src/layout.ts';
import { airRoutes } from '../src/mobility.ts';
import { heroCamera } from '../src/heroCamera.ts';
import { buildConcentrationTower } from '../src/siteBuilders/concentrationTower.ts';

const HIDDEN = 1e-3;
const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
const context = new Proxy({}, { get: () => () => {}, set: () => true });
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { createElement: () => ({ width: 512, height: 128, getContext: () => context }) },
});

function visibleBounds(root: T.Object3D): T.Box3 {
  root.updateMatrixWorld(true);
  const bounds = new T.Box3().makeEmpty();
  const visit = (object: T.Object3D, ancestorsVisible = true) => {
    const visible = ancestorsVisible && object.visible;
    if (!visible) return;
    if ((object as T.Mesh).isMesh) {
      const mesh = object as T.Mesh;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
    }
    object.children.forEach(child => visit(child, visible));
  };
  visit(root);
  return bounds;
}

function routeClearance(bounds: T.Box3, route: T.CatmullRomCurve3): number {
  let minimum = Infinity;
  for (let i = 0; i < 2048; i++) minimum = Math.min(minimum, bounds.distanceToPoint(route.getPointAt(i / 2048)));
  return minimum;
}

function publicRouteClearance(bounds: T.Box3): number {
  let minimum = Infinity;
  for (const route of publicRoutes) {
    for (let segment = 0; segment < route.points.length - 1; segment++) {
      const from = route.points[segment];
      const to = route.points[segment + 1];
      for (let step = 0; step <= 128; step++) {
        const t = step / 128;
        minimum = Math.min(minimum, bounds.distanceToPoint(new T.Vector3(
          from[0] + (to[0] - from[0]) * t,
          from[1] + (to[1] - from[1]) * t,
          from[2] + (to[2] - from[2]) * t,
        )));
      }
    }
  }
  return minimum;
}

function projectedBounds(bounds: T.Box3, camera: T.Camera): T.Box3 {
  const projected = new T.Box3().makeEmpty();
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) projected.expandByPoint(new T.Vector3(x, y, z).project(camera));
    }
  }
  return projected;
}

try {
  const scene = new T.Scene();
  const kit: Kit = { windows: [], signs: [], random: () => .5 };
  const site = buildConcentrationTower(scene, kit);
  const runtime = site.concentrationTower;
  const group = (name: string) => site.root.getObjectByName(name) as T.Group;
  const lowSecond = group('tower-function-low-2');
  const lowSixth = group('tower-function-low-6');
  const upperLayer = site.layers.towerUpper!.group;
  const baseLayer = site.layers.towerBase!.group;
  const neutralPropsLayer = site.layers.towerNeutralProps!.group;
  const upperState = { visible: upperLayer.visible, scaleY: upperLayer.scale.y };

  assert.equal(runtime.setTarget({ band: 'low', functionModules: 2 }, 0, false), true);
  assert.equal(runtime.getDiagnostics().representation, 'pavilion-pair');
  runtime.update(1.5);
  assert.ok(lowSecond.scale.x > HIDDEN && lowSecond.scale.x < 1);
  assert.equal(lowSecond.scale.x, lowSecond.scale.y);
  assert.equal(lowSecond.scale.y, lowSecond.scale.z);
  assert.equal(runtime.setTarget({ band: 'low', functionModules: 2 }, 1.5, false), false);
  runtime.update(3);
  assert.equal(runtime.getDiagnostics().activeFunctionModules, 2);
  assert.equal(runtime.getDiagnostics().transitioning, false);

  assert.equal(runtime.setTarget({ band: 'low', functionModules: 6 }, 3, false), true);
  runtime.update(4.5);
  assert.ok(Math.abs(lowSixth.scale.x - .5) < .001);
  runtime.update(6);
  assert.equal(lowSixth.scale.x, 1);

  assert.equal(runtime.setTarget({ band: 'mixed', functionModules: 4 }, 6, false), true);
  runtime.update(7.5);
  assert.ok(Math.abs(group('tower-mid-rise-hall').scale.x - .5) < .001);
  runtime.update(9);
  assert.equal(runtime.getDiagnostics().representation, 'mid-rise-hall');
  assert.equal(runtime.getDiagnostics().activeFunctionModules, 4);

  assert.equal(runtime.setTarget({ band: 'high', functionModules: 6 }, 10, true), true);
  assert.equal(runtime.getDiagnostics().activeFunctionModules, 6);
  assert.deepEqual({ visible: upperLayer.visible, scaleY: upperLayer.scale.y }, upperState);
  runtime.restoreLegacy();
  assert.equal(runtime.getDiagnostics().targetFunctionModules, 4);
  assert.equal(runtime.getDiagnostics().activeFunctionModules, 4);
  assert.deepEqual({ visible: upperLayer.visible, scaleY: upperLayer.scale.y }, upperState);

  const siteBounds = changeSites.se;
  for (const band of ['low', 'mixed', 'high'] as const) {
    runtime.setTarget({ band, functionModules: 6 }, 20, true);
    baseLayer.visible = true;
    baseLayer.scale.set(1, 1, 1);
    upperLayer.visible = band === 'high';
    upperLayer.scale.set(1, 1, 1);
    neutralPropsLayer.visible = band === 'mixed';
    neutralPropsLayer.scale.set(1, 1, 1);
    scene.updateMatrixWorld(true);

    const bounds = visibleBounds(site.root);
    const local = bounds.clone().translate(new T.Vector3(-site.root.position.x, 0, -site.root.position.z));
    const modulePrefix = band === 'low' ? 'tower-function-low-' : band === 'mixed' ? 'tower-function-mixed-' : 'tower-function-high-';
    const moduleBounds = new T.Box3().makeEmpty();
    for (let i = 1; i <= 6; i++) moduleBounds.union(visibleBounds(group(`${modulePrefix}${i}`)));
    const localModules = moduleBounds.clone().translate(new T.Vector3(-site.root.position.x, 0, -site.root.position.z));
    assert.ok(local.min.x >= -siteBounds.w / 2 - 1e-6, `${band} extends west of its lot: ${local.min.x}`);
    assert.ok(local.max.x <= siteBounds.w / 2 + 1e-6, `${band} extends east of its lot: ${local.max.x}`);
    assert.ok(local.min.z >= -siteBounds.d / 2 - 1e-6, `${band} extends north of its lot: ${local.min.z}`);
    assert.ok(local.max.z <= siteBounds.d / 2 + 1e-6, `${band} extends south of its lot: ${local.max.z}`);
    assert.ok(local.min.y >= -1e-6 && local.max.y <= siteBounds.h + 1e-6, `${band} exceeds site height: ${local.min.y}..${local.max.y}`);
    assert.ok(localModules.min.x >= -siteBounds.w / 2 - 1e-6 && localModules.max.x <= siteBounds.w / 2 + 1e-6, `${band} function modules exceed lot width: ${localModules.min.x}..${localModules.max.x}`);
    assert.ok(localModules.min.z >= -siteBounds.d / 2 - 1e-6 && localModules.max.z <= siteBounds.d / 2 + 1e-6, `${band} function modules exceed lot depth: ${localModules.min.z}..${localModules.max.z}`);

    const airClearances = airRoutes().map(route => routeClearance(bounds, route));
    const publicClearance = publicRouteClearance(bounds);
    assert.ok(Math.min(...airClearances) > 2.5, `${band} enters the aerial vehicle envelope: ${airClearances}`);
    assert.ok(publicClearance > 2, `${band} enters the public route envelope: ${publicClearance}`);
    if (band === 'low') {
      const dogenzaka = landmarks.find(site => site.name === 'DOGENZAKA')!;
      const roof = new T.Box3(
        new T.Vector3(dogenzaka.x - dogenzaka.w / 2 - .5, 0, dogenzaka.z - dogenzaka.d / 2 - .5),
        new T.Vector3(dogenzaka.x + dogenzaka.w / 2 + .5, dogenzaka.h + 4, dogenzaka.z + dogenzaka.d / 2 + .5),
      );
      for (const [width, height] of [[1280, 720], [1920, 1080]]) {
        const camera = heroCamera(width, height);
        camera.updateMatrixWorld(true);
        const roofTop = projectedBounds(roof, camera).max.y;
        const capCenters: number[] = [];
        const capPixelSizes: string[] = [];
        let minimumRoofClearance = Infinity;
        for (const i of [1, 2]) {
          const cap = projectedBounds(visibleBounds(group(`tower-low-service-cap-${i}`)), camera);
          assert.ok(cap.max.y > roofTop + .08, `low SE pavilion cap ${i} is hidden by Dogenzaka at ${width}×${height}`);
          assert.ok(cap.max.x - cap.min.x > .035, `low SE pavilion cap ${i} is too small to read at ${width}×${height}`);
          assert.ok(cap.max.y - cap.min.y > .03, `low SE pavilion cap ${i} is too flat to read at ${width}×${height}`);
          assert.ok(cap.min.x > -1 && cap.max.x < 1, `low SE pavilion cap ${i} leaves the hero frame at ${width}×${height}`);
          capCenters.push((cap.min.x + cap.max.x) / 2);
          capPixelSizes.push(`${((cap.max.x - cap.min.x) * width / 2).toFixed(0)}×${((cap.max.y - cap.min.y) * height / 2).toFixed(0)}px`);
          minimumRoofClearance = Math.min(minimumRoofClearance, (cap.max.y - roofTop) * height / 2);
        }
        const capSpacing = Math.abs(capCenters[1] - capCenters[0]) * width / 2;
        assert.ok(capSpacing > width * .015, `low SE pavilion caps merge at ${width}×${height}`);
        console.log(`low SE hero ${width}×${height}: cap projections ${capPixelSizes.join('/')}, center spacing=${capSpacing.toFixed(0)}px, minimum DOGENZAKA roof clearance=${minimumRoofClearance.toFixed(0)}px`);
      }
    }
    console.log(`concentrationTower ${band} bounds x=${local.min.x.toFixed(2)}..${local.max.x.toFixed(2)} y=${local.min.y.toFixed(2)}..${local.max.y.toFixed(2)} z=${local.min.z.toFixed(2)}..${local.max.z.toFixed(2)}; modules z=${localModules.min.z.toFixed(2)}..${localModules.max.z.toFixed(2)}; air clearance=${airClearances.map(value => value.toFixed(2)).join('/')}m, public=${publicClearance.toFixed(2)}m`);
  }
} finally {
  if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
  else delete (globalThis as typeof globalThis & { document?: unknown }).document;
}
console.log('concentrationTower: PASS');
