import assert from 'node:assert/strict';
import * as T from 'three';
import { siteLayerDefinition } from '../src/changeCatalog.ts';
import { SITE_ASSET_CATALOG } from '../src/siteAssets/assetCatalog.ts';
import { remapCityMaterials, SiteAssetLoaderCache, validateSiteAsset, type SiteAssetLoaderLike } from '../src/siteAssets/assetLoader.ts';
import { MutableSiteLayerRuntime } from '../src/siteBuilders/siteRuntime.ts';

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
layer.setPreparation(async () => { preparations++; throw new Error('offline'); });
const originalError = console.error; console.error = () => {};
try {
  await layer.prepare();
  await layer.prepare();
} finally {
  console.error = originalError;
}
assert.equal(preparations, 1);
assert.equal(layer.assetStatus, 'fallback');
assert.match(layer.assetError ?? '', /offline/);

console.log('PASS: site asset catalog validation, cache, compatibility, retry and fallback diagnostics.');
