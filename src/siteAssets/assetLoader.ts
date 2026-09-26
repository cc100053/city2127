import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { SiteAssetId, SiteId, SiteLayerId } from '../changeCatalog.ts';
import { SITE_ASSET_CATALOG, type SiteAssetDefinition } from './assetCatalog.ts';

export interface LoadedSiteAsset {
  readonly definition: SiteAssetDefinition;
  readonly gltf: Pick<GLTF, 'scene' | 'animations'>;
  readonly root: T.Object3D;
}

export interface SiteAssetLoaderLike {
  loadAsync(url: string): Promise<Pick<GLTF, 'scene' | 'animations'>>;
}

const EPSILON = .02;
const identityQuaternion = new T.Quaternion();

function near(value: number, expected: number): boolean {
  return Math.abs(value - expected) <= 1e-6;
}

export function validateSiteAsset(definition: SiteAssetDefinition, gltf: Pick<GLTF, 'scene' | 'animations'>): T.Object3D {
  const root = gltf.scene.getObjectByName(definition.rootName);
  if (!root) throw new Error(`${definition.id}: expected root ${definition.rootName} was not found.`);
  if (!near(root.position.lengthSq(), 0) || !root.quaternion.equals(identityQuaternion)
    || !near(root.scale.x, 1) || !near(root.scale.y, 1) || !near(root.scale.z, 1)) {
    throw new Error(`${definition.id}: root transform must be identity.`);
  }
  if (gltf.animations.length) throw new Error(`${definition.id}: static site assets must not contain animations.`);
  root.updateWorldMatrix(true, true);
  let forbidden: string | undefined;
  root.traverse(object => {
    if (!forbidden && (object instanceof T.Camera || object instanceof T.Light)) forbidden = object.name || object.type;
  });
  if (forbidden) throw new Error(`${definition.id}: forbidden Camera/Light node ${forbidden}.`);
  const bounds = new T.Box3().setFromObject(root);
  if (bounds.isEmpty()) throw new Error(`${definition.id}: asset root has no renderable bounds.`);
  const size = bounds.getSize(new T.Vector3());
  if (size.x > definition.footprint[0] + EPSILON || size.z > definition.footprint[1] + EPSILON) {
    throw new Error(`${definition.id}: footprint ${size.x.toFixed(3)} × ${size.z.toFixed(3)} exceeds ${definition.footprint.join(' × ')}.`);
  }
  if (bounds.min.y < -EPSILON || size.y > definition.maxHeight + EPSILON) {
    throw new Error(`${definition.id}: vertical bounds ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)} exceed the asset contract.`);
  }
  return root;
}

export class SiteAssetLoaderCache {
  private readonly cache = new Map<SiteAssetId, Promise<LoadedSiteAsset>>();
  private readonly requestCounts = new Map<SiteAssetId, number>();
  private readonly loader: SiteAssetLoaderLike;

  constructor(loader: SiteAssetLoaderLike = new GLTFLoader()) {
    this.loader = loader;
  }

  load(id: SiteAssetId): Promise<LoadedSiteAsset> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const definition = SITE_ASSET_CATALOG[id];
    this.requestCounts.set(id, (this.requestCounts.get(id) ?? 0) + 1);
    const request = this.loader.loadAsync(definition.url)
      .then(gltf => ({ definition, gltf, root: validateSiteAsset(definition, gltf) }))
      .catch((error: unknown) => {
        this.cache.delete(id);
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Site asset load failed: ${definition.url}\n${detail}`, { cause: error });
      });
    this.cache.set(id, request);
    return request;
  }

  async cloneRoot(id: SiteAssetId, siteId: SiteId, layerId: SiteLayerId): Promise<T.Object3D> {
    const loaded = await this.load(id);
    if (loaded.definition.compatibleSite !== siteId || loaded.definition.compatibleLayer !== layerId) {
      throw new Error(`${id} is not compatible with ${siteId}/${layerId}.`);
    }
    const clone = loaded.root.clone(true);
    clone.name = `${loaded.definition.rootName}__instance`;
    clone.position.set(0, 0, 0);
    clone.quaternion.identity();
    clone.scale.set(1, 1, 1);
    clone.updateMatrixWorld(true);
    return clone;
  }

  getRequestCount(id: SiteAssetId): number {
    return this.requestCounts.get(id) ?? 0;
  }
}
