import * as T from 'three';
import { changeSites } from '../layout.ts';
import type { SiteId, SiteLayerDefinition, SiteLayerId } from '../changeCatalog.ts';
import type { LotSocketId } from '../surveyView.ts';

const GUEST = '#ff9a2e';

export interface SiteMarkerRuntime {
  readonly mesh: T.Mesh;
  readonly material: T.MeshStandardMaterial;
}

export interface BuiltSite {
  readonly id: SiteId;
  readonly root: T.Group;
  readonly layers: Readonly<Partial<Record<SiteLayerId, SiteLayerRuntime>>>;
  readonly marker: SiteMarkerRuntime;
}

export type BuiltSiteMap = Readonly<Record<SiteId, BuiltSite>>;
export type SiteAssetStatus = 'not-applicable' | 'idle' | 'loading' | 'ready' | 'fallback';

export interface SiteLayerRuntime {
  readonly definition: SiteLayerDefinition;
  readonly group: T.Group;
  readonly assetStatus: SiteAssetStatus;
  readonly assetError?: string;
  prepare(): Promise<void>;
}

export class MutableSiteLayerRuntime implements SiteLayerRuntime {
  readonly definition: SiteLayerDefinition;
  readonly group = new T.Group();
  assetStatus: SiteAssetStatus;
  assetError?: string;
  private prepareHandler?: () => Promise<void>;
  private task?: Promise<void>;

  constructor(definition: SiteLayerDefinition, parent: T.Group, y = 0) {
    this.definition = definition;
    this.group.position.y = y;
    this.group.visible = false;
    this.group.scale.y = 1e-3;
    this.assetStatus = definition.assetId ? 'idle' : 'not-applicable';
    parent.add(this.group);
  }

  setPreparation(handler: () => Promise<void>): void {
    if (!this.definition.assetId) throw new Error(`${this.definition.id}: cannot prepare a layer without assetId.`);
    this.prepareHandler = handler;
  }

  prepare(): Promise<void> {
    if (!this.definition.assetId || this.assetStatus === 'ready' || this.assetStatus === 'fallback') return Promise.resolve();
    if (this.task) return this.task;
    if (!this.prepareHandler) {
      this.assetStatus = 'fallback';
      this.assetError = `${this.definition.id}: asset layer has no preparation handler.`;
      console.error(this.assetError);
      return Promise.resolve();
    }
    this.assetStatus = 'loading';
    this.task = this.prepareHandler()
      .then(() => { this.assetStatus = 'ready'; })
      .catch((error: unknown) => {
        this.assetStatus = 'fallback';
        this.assetError = error instanceof Error ? error.message : String(error);
        console.error(`Site layer ${this.definition.id} kept its procedural fallback`, error);
      });
    return this.task;
  }
}

export function createSiteRoot(scene: T.Scene, socketId: LotSocketId): T.Group {
  const root = new T.Group();
  root.name = `survey-site-${socketId}`;
  root.position.set(changeSites[socketId].x, 0, changeSites[socketId].z);
  scene.add(root);
  return root;
}

export function createSiteLayer(parent: T.Group, definition: SiteLayerDefinition, y = 0): MutableSiteLayerRuntime {
  return new MutableSiteLayerRuntime(definition, parent, y);
}

export function createGuestMarker(parent: T.Group, socketId: LotSocketId): SiteMarkerRuntime {
  const { w, d } = changeSites[socketId];
  const material = new T.MeshStandardMaterial({
    color: GUEST, emissive: GUEST, emissiveIntensity: .2, roughness: .5, transparent: true, depthWrite: false,
  });
  const outline = <P extends T.Path>(hw: number, hd: number, radius: number, path: P): P => {
    path.moveTo(-hw + radius, -hd); path.lineTo(hw - radius, -hd); path.quadraticCurveTo(hw, -hd, hw, -hd + radius);
    path.lineTo(hw, hd - radius); path.quadraticCurveTo(hw, hd, hw - radius, hd); path.lineTo(-hw + radius, hd);
    path.quadraticCurveTo(-hw, hd, -hw, hd - radius); path.lineTo(-hw, -hd + radius);
    path.quadraticCurveTo(-hw, -hd, -hw + radius, -hd); return path;
  };
  const shape = outline(w / 2 + 1.2, d / 2 + 1.2, 1.4, new T.Shape());
  shape.holes.push(outline(w / 2 + .8, d / 2 + .8, 1.05, new T.Path()));
  const mesh = new T.Mesh(new T.ShapeGeometry(shape, 6).rotateX(-Math.PI / 2), material);
  mesh.position.y = .47;
  mesh.visible = false;
  mesh.name = `guest-marker-${socketId}`;
  parent.add(mesh);
  return { mesh, material };
}
