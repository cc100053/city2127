import assert from 'node:assert/strict';
import * as T from 'three';
import { siteLayerDefinition } from '../src/changeCatalog.ts';
import { SITE_ASSET_CATALOG } from '../src/siteAssets/assetCatalog.ts';
import { SiteAssetLoaderCache, validateSiteAsset, type SiteAssetLoaderLike } from '../src/siteAssets/assetLoader.ts';
import { MutableSiteLayerRuntime } from '../src/siteBuilders/siteRuntime.ts';

const gltf = (rootName = 'FutureTree2127', size: [number, number, number] = [1, 1, 1]) => {
  const scene = new T.Scene();
  const root = new T.Group(); root.name = rootName; scene.add(root);
  const mesh = new T.Mesh(new T.BoxGeometry(...size), new T.MeshStandardMaterial());
  mesh.position.y = size[1] / 2; root.add(mesh);
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

console.log('PASS: site asset catalog validation, cache, compatibility, retry recovery and fallback diagnostics.');
