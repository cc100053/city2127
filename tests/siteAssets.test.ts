import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { siteLayerDefinition } from '../src/changeCatalog.ts';
import { SITE_ASSET_CATALOG } from '../src/siteAssets/assetCatalog.ts';
import { remapCityMaterials, SiteAssetLoaderCache, validateSiteAsset, type SiteAssetLoaderLike } from '../src/siteAssets/assetLoader.ts';
import { MutableSiteLayerRuntime } from '../src/siteBuilders/siteRuntime.ts';
import { buildEnvironmentPark } from '../src/siteBuilders/environmentPark.ts';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

const gltf = (rootName = 'FutureTree2127', size: [number, number, number] = [1, 1, 1]) => {
  const scene = new T.Scene();
  const root = new T.Group(); root.name = rootName; scene.add(root);
  const mesh = new T.Mesh(new T.BoxGeometry(...size), new T.MeshStandardMaterial());
  mesh.position.y = size[1] / 2; root.add(mesh);
  return { scene, animations: [] };
};

const automationHubGltf = () => {
  const scene = new T.Scene();
  const root = new T.Group();
  root.name = 'ROOT_AUTOMATION_HUB_UPPER';
  Object.assign(root.userData, {
    asset_id: 'automation-hub-upper', category: 'site-layer', compatible_site: 'magnetEast',
    compatible_layer: 'hubUpper', footprint_x: 5.8, footprint_y: 5.8, height: 20.3, forward_axis: '-Y',
  });
  const frontMarker = new T.Object3D(); frontMarker.name = 'front_marker'; root.add(frontMarker);
  for (const [index, role] of ['city_glass', 'city_trim', 'city_future_light', 'city_solar'].entries()) {
    const material = new T.MeshStandardMaterial(); material.name = role;
    const mesh = new T.Mesh(new T.BoxGeometry(.5, .5, .5), material);
    mesh.position.set(index - 1.5, .25 + index, 0); root.add(mesh);
  }
  scene.add(root);
  return { scene, animations: [] };
};

let calls = 0;
const loader: SiteAssetLoaderLike = {
  async loadAsync() { calls++; return gltf(); },
};
const assets = new SiteAssetLoaderCache(loader);
const [first, second] = await Promise.all([
  assets.cloneRoot('future-tree-2127', 'stationEastPark', 'parkTrees'),
  assets.cloneRoot('future-tree-2127', 'stationEastPark', 'parkTrees'),
]);
assert.equal(calls, 1);
assert.equal(assets.getRequestCount('future-tree-2127'), 1);
assert.notEqual(first, second);
assert.equal(first.name, 'FutureTree2127__instance');
await assert.rejects(assets.cloneRoot('future-tree-2127', 'magnetEast', 'hubUpper'), /not compatible/);

assert.throws(() => validateSiteAsset(SITE_ASSET_CATALOG['future-tree-2127'], gltf('wrong')), /expected root/);
assert.throws(() => validateSiteAsset(SITE_ASSET_CATALOG['future-tree-2127'], gltf('FutureTree2127', [8, 1, 8])), /footprint/);
const animated = gltf(); animated.animations.push({} as T.AnimationClip);
assert.throws(() => validateSiteAsset(SITE_ASSET_CATALOG['future-tree-2127'], animated), /must not contain animations/);
const withCamera = gltf(); withCamera.scene.getObjectByName('FutureTree2127')!.add(new T.PerspectiveCamera());
assert.throws(() => validateSiteAsset(SITE_ASSET_CATALOG['future-tree-2127'], withCamera), /forbidden Camera\/Light/);

const hub = automationHubGltf();
const hubRoot = validateSiteAsset(SITE_ASSET_CATALOG['automation-hub-upper'], hub);
const replacements = {
  city_glass: new T.MeshStandardMaterial(), city_trim: new T.MeshStandardMaterial(),
  city_future_light: new T.MeshStandardMaterial(), city_solar: new T.MeshStandardMaterial(),
};
remapCityMaterials(hubRoot, replacements);
const remapped = new Set<T.Material>();
hubRoot.traverse(object => {
  if (object instanceof T.Mesh && !Array.isArray(object.material)) {
    remapped.add(object.material);
    assert.equal(object.castShadow, true);
    assert.equal(object.receiveShadow, true);
  }
});
assert.deepEqual(remapped, new Set(Object.values(replacements)));
const missingMetadata = automationHubGltf();
delete missingMetadata.scene.getObjectByName('ROOT_AUTOMATION_HUB_UPPER')!.userData.forward_axis;
assert.throws(() => validateSiteAsset(SITE_ASSET_CATALOG['automation-hub-upper'], missingMetadata), /metadata forward_axis/);
const missingMarker = automationHubGltf();
missingMarker.scene.getObjectByName('front_marker')!.removeFromParent();
assert.throws(() => validateSiteAsset(SITE_ASSET_CATALOG['automation-hub-upper'], missingMarker), /expected front_marker/);
const unknownMaterial = automationHubGltf();
const unknownMesh = unknownMaterial.scene.getObjectByName('ROOT_AUTOMATION_HUB_UPPER')!.children.find(child => child instanceof T.Mesh) as T.Mesh;
(unknownMesh.material as T.Material).name = 'city_unknown';
assert.throws(() => validateSiteAsset(SITE_ASSET_CATALOG['automation-hub-upper'], unknownMaterial), /unknown city material role/);
const missingRole = automationHubGltf();
missingRole.scene.getObjectByName('ROOT_AUTOMATION_HUB_UPPER')!.children
  .find(child => child instanceof T.Mesh && (child.material as T.Material).name === 'city_solar')!.removeFromParent();
assert.throws(() => validateSiteAsset(SITE_ASSET_CATALOG['automation-hub-upper'], missingRole), /required city material role city_solar/);

let attempts = 0;
const retrying = new SiteAssetLoaderCache({
  async loadAsync() {
    attempts++;
    if (attempts === 1) return gltf('wrong');
    return gltf();
  },
});
await assert.rejects(retrying.load('future-tree-2127'), /expected root/);
await retrying.load('future-tree-2127');
assert.equal(attempts, 2);

const layer = new MutableSiteLayerRuntime(siteLayerDefinition('stationEastPark', 'parkTrees'), new T.Group());
let preparations = 0;
layer.setPreparation(async () => {
  preparations++;
  if (preparations === 1) throw new Error('offline');
});
const originalError = console.error; console.error = () => {};
try {
  await layer.prepare();
  assert.equal(layer.assetStatus, 'fallback');
  assert.match(layer.assetError ?? '', /offline/);
  await layer.prepare();
} finally {
  console.error = originalError;
}
assert.equal(preparations, 2);
assert.equal(layer.assetStatus, 'ready');
assert.equal(layer.assetError, undefined);

let resolveParkAsset!: (value: ReturnType<typeof gltf>) => void;
const parkAssets = new SiteAssetLoaderCache({
  loadAsync() { return new Promise<ReturnType<typeof gltf>>(resolve => { resolveParkAsset = resolve; }); },
});
const parkScene = new T.Scene();
const builtPark = buildEnvironmentPark(parkScene, { windows: [], signs: [], random: () => 0 }, parkAssets);
const parkRuntime = builtPark.environmentPark!;
const parkTarget = (treeCount: number, plantedFraction: number, coolingFins: number, band: 'low' | 'mixed' | 'high') => ({
  band, treeCount, plantedFraction, coolingFins,
});
parkRuntime.setTarget(parkTarget(3, .2, 0, 'low'), 0, true);
assert.deepEqual(parkRuntime.getDiagnostics(), {
  band: 'low', targetTreeCount: 3, visibleTreeCount: 3,
  targetPlantedFraction: .2, plantedFraction: .2,
  targetCoolingFins: 0, visibleCoolingFins: 0, representation: 'fallback',
});
const fallbackTrees = builtPark.layers.parkTrees!.group.getObjectByName('park-tree-fallback-trunks') as T.InstancedMesh;
const countInstances = (mesh: T.InstancedMesh) => {
  let count = 0;
  const matrix = new T.Matrix4(), scale = new T.Vector3(), position = new T.Vector3(), rotation = new T.Quaternion();
  for (let index = 0; index < mesh.count; index++) {
    mesh.getMatrixAt(index, matrix);
    matrix.decompose(position, rotation, scale);
    if (scale.y > 1e-4) count++;
  }
  return count;
};
parkRuntime.setTarget(parkTarget(12, .8, 6, 'high'), 1, false);
parkRuntime.update(2.5);
assert.equal(parkRuntime.getDiagnostics().visibleTreeCount, 12);
assert.equal(parkRuntime.getDiagnostics().visibleCoolingFins, 6);
close(parkRuntime.getDiagnostics().plantedFraction, .5);
const plantedFraction = parkRuntime.getDiagnostics().plantedFraction;
parkRuntime.setTarget(parkTarget(10, .7, 4, 'high'), 2.5, false);
parkRuntime.update(4);
close(parkRuntime.getDiagnostics().plantedFraction, plantedFraction + (.7 - plantedFraction) * .5);
const midRetarget = new T.Matrix4(), midScale = new T.Vector3(), midPosition = new T.Vector3(), midRotation = new T.Quaternion();
fallbackTrees.getMatrixAt(10, midRetarget);
midRetarget.decompose(midPosition, midRotation, midScale);
close(midScale.y, .48);
parkRuntime.update(5.5);
assert.equal(parkRuntime.getDiagnostics().visibleTreeCount, 10);
assert.equal(countInstances(fallbackTrees), 10);
close(parkRuntime.getDiagnostics().plantedFraction, .7);
assert.equal(parkRuntime.getDiagnostics().visibleCoolingFins, 4);

parkRuntime.setTarget(parkTarget(12, .8, 6, 'high'), 6, false);
parkRuntime.setTarget(parkTarget(12, .8, 6, 'high'), 6.75, true);
assert.equal(parkRuntime.getDiagnostics().visibleTreeCount, 12);
assert.equal(parkRuntime.getDiagnostics().visibleCoolingFins, 6);
close(parkRuntime.getDiagnostics().plantedFraction, .8);
parkRuntime.update(9);
assert.equal(parkRuntime.getDiagnostics().visibleTreeCount, 12, 'same-target snapshot must settle an active transition');

parkRuntime.setTarget(parkTarget(10, .8, 6, 'high'), 10, false);
parkRuntime.update(13);
assert.equal(parkRuntime.getDiagnostics().visibleTreeCount, 10, 'same-band 12→10 target must change the rendered count');
assert.equal(countInstances(fallbackTrees), 10);

const planted = builtPark.layers.parkSurface!.group.getObjectByName('park-planted-area')!;
const maxRadius = (group: T.Object3D) => {
  group.updateWorldMatrix(true, true);
  let max = 0;
  const point = new T.Vector3();
  group.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
      // Lot radius is in site units; the root carries the Odaiba scale.
      max = Math.max(max, Math.hypot(point.x - builtPark.root.position.x, point.z - builtPark.root.position.z) / builtPark.root.scale.x);
    }
  });
  return max;
};
assert.ok(maxRadius(planted) <= 4.95 + 1e-3, `planted footprint escaped NE lot: ${maxRadius(planted).toFixed(3)}`);

const parkTreeLayer = builtPark.layers.parkTrees!;
parkTreeLayer.group.visible = true;
const lateLoad = parkTreeLayer.prepare();
await new Promise<void>(resolve => setTimeout(resolve, 0));
parkRuntime.setTarget(parkTarget(7, .6, 2, 'mixed'), 14, true);
resolveParkAsset(gltf('FutureTree2127', [2, 4, 2]));
await lateLoad;
assert.equal(parkRuntime.getDiagnostics().representation, 'glb');
assert.equal(parkRuntime.getDiagnostics().targetTreeCount, 7);
assert.equal(parkRuntime.getDiagnostics().visibleTreeCount, 7);
const glbInstances = parkTreeLayer.group.getObjectByName('park-tree-glb-instances') as T.InstancedMesh;
assert.equal(countInstances(glbInstances), 7, 'late GLB attach must keep the latest authoritative tree count');
parkRuntime.restoreLegacy();
assert.equal(parkRuntime.getDiagnostics().visibleTreeCount, 5);
assert.equal(parkRuntime.getDiagnostics().targetCoolingFins, 0);

const realTreeBytes = await readFile(new URL('../asset/models/future-tree-2127/future-tree-2127.glb', import.meta.url));
const realTreeBuffer = realTreeBytes.buffer.slice(realTreeBytes.byteOffset, realTreeBytes.byteOffset + realTreeBytes.byteLength);
const realTreeGltf: Pick<GLTF, 'scene' | 'animations'> = await new Promise((resolve, reject) =>
  new GLTFLoader().parse(realTreeBuffer, '', resolve, reject));
const fittedScene = new T.Scene();
const fittedAssets = new SiteAssetLoaderCache({ async loadAsync() { return realTreeGltf; } });
const fittedPark = buildEnvironmentPark(fittedScene, { windows: [], signs: [], random: () => 0 }, fittedAssets);
const fittedTreeLayer = fittedPark.layers.parkTrees!;
fittedTreeLayer.group.scale.y = 1;
fittedTreeLayer.group.visible = true;
const fittedRuntime = fittedPark.environmentPark!;
const boundsOfVisibleInstances = () => {
  fittedTreeLayer.group.updateWorldMatrix(true, true);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const instance = new T.Matrix4(), world = new T.Matrix4(), point = new T.Vector3();
  fittedTreeLayer.group.traverseVisible(object => {
    if (!(object instanceof T.InstancedMesh)) return;
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox!;
    const corners = [
      [bounds.min.x, bounds.min.y, bounds.min.z], [bounds.min.x, bounds.min.y, bounds.max.z],
      [bounds.min.x, bounds.max.y, bounds.min.z], [bounds.min.x, bounds.max.y, bounds.max.z],
      [bounds.max.x, bounds.min.y, bounds.min.z], [bounds.max.x, bounds.min.y, bounds.max.z],
      [bounds.max.x, bounds.max.y, bounds.min.z], [bounds.max.x, bounds.max.y, bounds.max.z],
    ];
    for (let index = 0; index < object.count; index++) {
      object.getMatrixAt(index, instance);
      if (Math.abs(instance.elements[5]) <= 1e-4) continue;
      world.multiplyMatrices(object.matrixWorld, instance);
      for (const [x, y, z] of corners) {
        point.set(x, y, z).applyMatrix4(world).sub(fittedPark.root.position).divideScalar(fittedPark.root.scale.x);
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minZ = Math.min(minZ, point.z);
        maxZ = Math.max(maxZ, point.z);
      }
    }
  });
  return { minX, maxX, minZ, maxZ };
};
const fallbackTrunks = fittedTreeLayer.group.getObjectByName('park-tree-fallback-trunks') as T.InstancedMesh;
const legacyFallbackMatrices = Array.from({ length: 5 }, (_, index) => {
  const matrix = new T.Matrix4(); fallbackTrunks.getMatrixAt(index, matrix); return matrix.toArray();
});
fittedRuntime.setTarget(parkTarget(12, .8, 6, 'high'), 0, true);
const fallbackBounds = boundsOfVisibleInstances();
assert.ok(fallbackBounds.minX >= -5.001 && fallbackBounds.maxX <= 5.001
  && fallbackBounds.minZ >= -5.001 && fallbackBounds.maxZ <= 5.001,
`fallback grove exceeds the NE site: ${JSON.stringify(fallbackBounds)}`);
fittedRuntime.restoreLegacy();
for (let index = 0; index < 5; index++) {
  const matrix = new T.Matrix4(); fallbackTrunks.getMatrixAt(index, matrix);
  assert.deepEqual(matrix.toArray(), legacyFallbackMatrices[index], 'legacy fallback transforms must be unchanged');
}

await fittedTreeLayer.prepare();
const glbMeshes: T.InstancedMesh[] = [];
fittedTreeLayer.group.traverseVisible(object => {
  if (object instanceof T.InstancedMesh && object.name === 'park-tree-glb-instances') glbMeshes.push(object);
});
assert.ok(glbMeshes.length > 0);
const legacyGlbMatrices = glbMeshes.map(mesh => Array.from({ length: 5 }, (_, index) => {
  const matrix = new T.Matrix4(); mesh.getMatrixAt(index, matrix); return matrix.toArray();
}));
fittedRuntime.setTarget(parkTarget(12, .8, 6, 'high'), 1, true);
const glbBounds = boundsOfVisibleInstances();
assert.ok(glbBounds.minX >= -5.001 && glbBounds.maxX <= 5.001
  && glbBounds.minZ >= -5.001 && glbBounds.maxZ <= 5.001,
`12-tree GLB exceeds the NE site: ${JSON.stringify(glbBounds)}`);
const firstGlbMatrix = new T.Matrix4(); glbMeshes[0].getMatrixAt(0, firstGlbMatrix);
const firstGlbScale = new T.Vector3(), firstGlbPosition = new T.Vector3(), firstGlbRotation = new T.Quaternion();
firstGlbMatrix.decompose(firstGlbPosition, firstGlbRotation, firstGlbScale);
close(firstGlbScale.y, 7 / new T.Box3().setFromObject(realTreeGltf.scene.getObjectByName('FutureTree2127')!).getSize(new T.Vector3()).y);
fittedRuntime.restoreLegacy();
for (let meshIndex = 0; meshIndex < glbMeshes.length; meshIndex++) {
  for (let index = 0; index < 5; index++) {
    const matrix = new T.Matrix4(); glbMeshes[meshIndex].getMatrixAt(index, matrix);
    assert.deepEqual(matrix.toArray(), legacyGlbMatrices[meshIndex][index], 'legacy GLB transforms must be unchanged');
  }
}

console.log('PASS: asset cache/retry, Park animation, actual 12-tree GLB/fallback bounds, legacy transforms, and late attach.');
