import assert from 'node:assert/strict';
import * as T from 'three';
import type { Kit } from '../src/cityRig.ts';
import { changeSites } from '../src/layout.ts';
import { amber, buildConcentrationTower } from '../src/siteBuilders/concentrationTower.ts';
import { METER_COLORS } from '../src/districtMeters.ts';
import { SiteAssetLoaderCache } from '../src/siteAssets/assetLoader.ts';

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
  const bands = site.root.getObjectsByProperty('name', 'tower-meter-band') as T.InstancedMesh[];
  assert.equal(bands.length, 3, 'one amber ring each for the pavilions, mid-rise and tower');
  const expected = new T.Color(METER_COLORS.urbanConcentration);
  for (const band of bands) assert.equal(band.material, amber);
  assert.ok(amber.color.equals(expected) && amber.emissive.equals(expected), 'amber is the Meter colour, lit independently of the day');
  assert.equal(upperLayer.position.y, 0, 'the tower grows from the ground');

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
  assert.equal(group('tower-mid-rise-hall').visible, false, 'high replaces the mid-rise');
  const cabin = group('tower-elevator-cabin');
  runtime.update(0); assert.equal(cabin.position.y, 1.5);
  runtime.update(3); assert.ok(cabin.position.y > 1.5 && cabin.position.y < 34.8);
  runtime.update(6.5); assert.equal(cabin.position.y, 34.8);
  runtime.update(14); assert.equal(cabin.position.y, 1.5);
  Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: true }) });
  runtime.update(3); assert.equal(cabin.position.y, 19, 'reduced motion parks the cabin');
  runtime.update(6.5); assert.equal(cabin.position.y, 19);
  delete (globalThis as typeof globalThis & { matchMedia?: unknown }).matchMedia;
  runtime.update(1); assert.ok(cabin.position.y !== 19);
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

    // Lot limits are in the site's own units; the root carries the Odaiba position and scale.
    const toLocal = site.root.matrixWorld.clone().invert();
    const local = visibleBounds(site.root).applyMatrix4(toLocal);
    const modulePrefix = band === 'low' ? 'tower-function-low-' : band === 'mixed' ? 'tower-function-mixed-' : 'tower-function-high-';
    const moduleBounds = new T.Box3().makeEmpty();
    for (let i = 1; i <= 6; i++) moduleBounds.union(visibleBounds(group(`${modulePrefix}${i}`)));
    const localModules = moduleBounds.clone().applyMatrix4(toLocal);
    assert.ok(local.min.x >= -siteBounds.w / 2 - 1e-6, `${band} extends west of its lot: ${local.min.x}`);
    assert.ok(local.max.x <= siteBounds.w / 2 + 1e-6, `${band} extends east of its lot: ${local.max.x}`);
    assert.ok(local.min.z >= -siteBounds.d / 2 - 1e-6, `${band} extends north of its lot: ${local.min.z}`);
    assert.ok(local.max.z <= siteBounds.d / 2 + 1e-6, `${band} extends south of its lot: ${local.max.z}`);
    assert.ok(local.min.y >= -1e-6 && local.max.y <= siteBounds.h + 1e-6, `${band} exceeds site height: ${local.min.y}..${local.max.y}`);
    assert.ok(localModules.min.x >= -siteBounds.w / 2 - 1e-6 && localModules.max.x <= siteBounds.w / 2 + 1e-6, `${band} function modules exceed lot width: ${localModules.min.x}..${localModules.max.x}`);
    assert.ok(localModules.min.z >= -siteBounds.d / 2 - 1e-6 && localModules.max.z <= siteBounds.d / 2 + 1e-6, `${band} function modules exceed lot depth: ${localModules.min.z}..${localModules.max.z}`);

    console.log(`concentrationTower ${band} bounds x=${local.min.x.toFixed(2)}..${local.max.x.toFixed(2)} y=${local.min.y.toFixed(2)}..${local.max.y.toFixed(2)} z=${local.min.z.toFixed(2)}..${local.max.z.toFixed(2)}; modules z=${localModules.min.z.toFixed(2)}..${localModules.max.z.toFixed(2)}`);
  }

  // The +1 shell and dressing are the procedural fallback: with the tower GLB and the prop kit ready they are replaced by the asset and kit props.
  const stubRoot = new T.Group();
  stubRoot.name = 'ROOT_CONCENTRATION_TOWER_HIGH';
  for (const role of ['se_white', 'se_amber', 'se_room', 'se_cream', 'se_ceiling', 'se_light', 'se_glass', 'se_lift_glass', 'se_paving']) {
    const material = new T.MeshStandardMaterial(); material.name = role;
    const mesh = new T.Mesh(new T.BoxGeometry(1, 1, 1), material); mesh.name = role; mesh.position.y = .5; stubRoot.add(mesh);
  }
  const kitRoot = new T.Group();
  kitRoot.name = 'ROOT_CITY_KIT_2127';
  for (const name of ['tree_round_s', 'tree_round_m', 'tree_round_l', 'tree_indoor', 'shrub_cluster', 'potted_plant', 'planter_1m', 'bench', 'desk_monitor', 'chair_office', 'sofa', 'bookshelf', 'kitchen_counter', 'cafe_set', 'floor_lamp', 'treadmill', 'lift_cabin', 'pendant_lamp', 'rug', 'whiteboard', 'upper_cabinet', 'art_panel', 'meeting_table']) {
    const prop = new T.Group(); prop.name = `kit_${name}`; kitRoot.add(prop);
    const mesh = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial()); mesh.position.y = .5; prop.add(mesh);
  }
  const stubAssets = new SiteAssetLoaderCache({
    async loadAsync(url: string) { const scene = new T.Scene(); scene.add((url.includes('city-kit') ? kitRoot : stubRoot).clone(true)); return { scene, animations: [] }; },
  });
  const assetSite = buildConcentrationTower(new T.Scene(), kit, stubAssets);
  const assetUpper = assetSite.layers.towerUpper!;
  assert.ok(assetUpper.group.getObjectByName('tower-high-shell'), 'the fallback shell is present until the GLB is ready');
  assert.ok(assetUpper.group.getObjectByName('tower-high-dressing'), 'the fallback furniture and greenery are present until the kit is ready');
  await assetUpper.prepare();
  assert.equal(assetUpper.assetStatus, 'ready');
  assert.equal(assetUpper.group.getObjectByName('tower-high-shell'), undefined, 'the GLB replaces the procedural shell');
  assert.equal(assetUpper.group.getObjectByName('tower-high-dressing'), undefined, 'kit props replace the procedural dressing');
  const glbRoot = assetUpper.group.getObjectByName('ROOT_CONCENTRATION_TOWER_HIGH__instance')!;
  assert.ok(glbRoot, 'the asset root is attached to towerUpper');
  assert.equal((glbRoot.getObjectByName('se_amber') as T.Mesh).material, amber, 'asset roles are remapped to the SE materials');
  assert.ok(assetUpper.group.getObjectByName('tower-high-kit')!.children.some(child => child.name === 'kit-bench'), 'the forecourt benches come from the kit');
  assert.ok(assetUpper.group.getObjectByName('tower-high-kit')!.getObjectByName('tower-crowd'), 'residents are placed with the kit');
  assert.ok(assetUpper.group.getObjectByName('tower-elevator-cabin')!.getObjectByName('tower-cabin-kit'), 'the animated cabin is the kit cabin');
  assert.equal(assetSite.concentrationTower!.getDiagnostics().targetFunctionModules >= 0, true);
} finally {
  if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
  else delete (globalThis as typeof globalThis & { document?: unknown }).document;
}
console.log('concentrationTower: PASS');
