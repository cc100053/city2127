import { Object3D } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSET_CATALOG, type AssetDefinition, type AssetId } from "./assetCatalog";

export interface LoadedAsset {
  readonly definition: AssetDefinition;
  readonly gltf: GLTF;
  readonly root: Object3D;
}

export class AssetLoaderCache {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<AssetId, Promise<LoadedAsset>>();
  private readonly requestCounts = new Map<AssetId, number>();

  load(id: AssetId): Promise<LoadedAsset> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const definition = ASSET_CATALOG[id];
    this.requestCounts.set(id, (this.requestCounts.get(id) ?? 0) + 1);
    const request = this.loader
      .loadAsync(definition.url)
      .then((gltf) => {
        gltf.scene.updateMatrixWorld(true);
        const root = gltf.scene.getObjectByName(definition.rootName);
        if (!root) {
          throw new Error(`${definition.url}: expected root ${definition.rootName} was not found.`);
        }
        return { definition, gltf, root };
      })
      .catch((error: unknown) => {
        this.cache.delete(id);
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`GLB load failed: ${definition.url}\n${detail}`, { cause: error });
      });
    this.cache.set(id, request);
    return request;
  }

  async cloneRoot(id: AssetId): Promise<Object3D> {
    const loaded = await this.load(id);
    const clone = loaded.root.clone(true);
    clone.name = `${loaded.definition.rootName}__instance`;
    clone.position.set(0, 0, 0);
    clone.quaternion.identity();
    clone.scale.set(1, 1, 1);
    clone.updateMatrixWorld(true);
    return clone;
  }

  getRequestCount(id: AssetId): number {
    return this.requestCounts.get(id) ?? 0;
  }
}
