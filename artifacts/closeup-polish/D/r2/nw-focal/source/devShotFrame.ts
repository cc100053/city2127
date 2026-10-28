import { Box3, InstancedMesh, Matrix4, Mesh, PerspectiveCamera, Raycaster, Vector2, Vector3, type Object3D, type Scene } from 'three';
import { SHOTS, type ShotId } from './headlineCamera.ts';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';

/** Normalized screen coordinates; preserve off-screen bounds instead of making framing pass by clipping. */
export function projectShotBox(bounds: Box3, camera: PerspectiveCamera) {
  if (bounds.isEmpty()) return null;
  const points = [bounds.min.x, bounds.max.x].flatMap(x => [bounds.min.y, bounds.max.y].flatMap(y =>
    [bounds.min.z, bounds.max.z].map(z => new Vector3(x, y, z))));
  if (points.some(p => p.clone().applyMatrix4(camera.matrixWorldInverse).z >= -camera.near)) return null;
  const projected = points.map(p => p.project(camera));
  return { left: (Math.min(...projected.map(p => p.x)) + 1) / 2, right: (Math.max(...projected.map(p => p.x)) + 1) / 2,
    top: (1 - Math.max(...projected.map(p => p.y))) / 2, bottom: (1 - Math.min(...projected.map(p => p.y))) / 2 };
}
export type ShotBox = NonNullable<ReturnType<typeof projectShotBox>>;
/** Nine points inset 10%: center, corners, then edge midpoints. */
export function shotSamples(box: ShotBox) {
  return [[.5,.5],[.1,.1],[.9,.1],[.1,.9],[.9,.9],[.5,.1],[.5,.9],[.1,.5],[.9,.5]].map(([x,y]) =>
    ({ x: box.left + x * (box.right - box.left), y: box.top + y * (box.bottom - box.top) }));
}
const districtNames = { nw: 'automation', ne: 'environment', sw: 'sharing', se: 'concentration' };
function subjectName(id: ShotId) {
  const [site, kind] = id.split(':');
  return site === 'energy' ? kind === 'garden2' ? 'energy-district-garden' : `energy-${kind}` :
    kind === 'focal' ? `survey-site-${site}` : `${districtNames[site as keyof typeof districtNames]}-district`;
}
function renderable(object: Object3D): object is Mesh {
  return object instanceof Mesh && (Array.isArray(object.material) ? object.material : [object.material]).some(m => m.visible && m.opacity > 0);
}
export function cityShotFrame(scene: Scene, camera: PerspectiveCamera, id: string) {
  if (!Object.hasOwn(SHOTS, id)) throw new Error(`Unknown shot: ${id}`);
  const name = subjectName(id as ShotId), subject = scene.getObjectByName(name);
  if (!subject) return { id, subject: name, box: null, reason: 'subject missing', hits: 0, samples: [] };
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const meshes: Mesh[] = [], bounds = new Box3(), matrix = new Matrix4();
  scene.traverseVisible(object => { if (renderable(object)) meshes.push(object); });
  const belongs = (object: Object3D): boolean => object === subject || !!object.parent && belongs(object.parent);
  for (const mesh of meshes.filter(belongs)) {
    mesh.geometry.computeBoundingBox();
    if (mesh instanceof InstancedMesh) for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
      bounds.union(mesh.geometry.boundingBox!.clone().applyMatrix4(matrix));
    } else bounds.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld));
  }
  const box = projectShotBox(bounds, camera), ray = new Raycaster();
  // Reuse the geometry-check BVH; indirect mode preserves mesh indices, and the override lasts only for this synchronous sample.
  const originalRaycast = Mesh.prototype.raycast;
  Mesh.prototype.raycast = function (raycaster, intersections) {
    this.geometry.boundsTree ??= new MeshBVH(this.geometry, { indirect: true });
    return acceleratedRaycast.call(this, raycaster, intersections);
  };
  let samples;
  try { samples = box ? shotSamples(box).map(point => {
    ray.setFromCamera(new Vector2(point.x * 2 - 1, 1 - point.y * 2), camera);
    const first = ray.intersectObjects(meshes, false).find(hit => {
      const mesh = hit.object as Mesh, material = Array.isArray(mesh.material) ? mesh.material[hit.face?.materialIndex ?? 0] : mesh.material;
      return material.visible && material.opacity > 0;
    });
    return { ...point, hit: first ? belongs(first.object) : false, first: first?.object.name ?? null, distance: first?.distance ?? null };
  }) : []; } finally { Mesh.prototype.raycast = originalRaycast; }
  return { id, subject: name, box, reason: box ? null : bounds.isEmpty() ? 'subject absent in this state' : 'bounds cross camera near plane',
    worldBounds: bounds.isEmpty() ? null : { min: bounds.min.toArray(), max: bounds.max.toArray() }, hits: samples.filter(p => p.hit).length, samples };
}
