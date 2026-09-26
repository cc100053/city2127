import * as T from 'three';
import { changeSites } from '../layout.ts';
import type { SiteId, SiteLayerId } from '../changeCatalog.ts';
import type { LotSocketId } from '../surveyView.ts';

const GUEST = '#ff9a2e';

export interface SiteMarkerRuntime {
  readonly mesh: T.Mesh;
  readonly material: T.MeshStandardMaterial;
}

export interface BuiltSite {
  readonly id: SiteId;
  readonly root: T.Group;
  readonly layers: Readonly<Partial<Record<SiteLayerId, T.Group>>>;
  readonly marker: SiteMarkerRuntime;
}

export type BuiltSiteMap = Readonly<Record<SiteId, BuiltSite>>;

export function createSiteRoot(scene: T.Scene, socketId: LotSocketId): T.Group {
  const root = new T.Group();
  root.name = `survey-site-${socketId}`;
  root.position.set(changeSites[socketId].x, 0, changeSites[socketId].z);
  scene.add(root);
  return root;
}

export function createSiteLayer(parent: T.Group, y = 0): T.Group {
  const layer = new T.Group();
  layer.position.y = y;
  layer.visible = false;
  layer.scale.y = 1e-3;
  parent.add(layer);
  return layer;
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
