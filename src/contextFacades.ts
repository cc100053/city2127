import * as T from 'three';
import { inDistrict } from './layout.ts';

// Context blocks, street furniture and stations outside the hero district are dropped; ground, roads and guideway stay as the hazed backdrop.
const districtDetail = /^(CTX_|PUBLIC_|STREETLIGHT_|LANDSCAPE_TREE|STATIONS)/;
/** Drop each connected piece (one block, lamp or bench) whose centre lies outside the district. */
export function cropToDistrict(environment: T.Object3D) {
  environment.updateMatrixWorld(true);
  const empty: T.Object3D[] = [];
  environment.traverse(object => {
    if (!(object instanceof T.Mesh) || !districtDetail.test(object.name)) return;
    const geometry = object.geometry as T.BufferGeometry, position = geometry.attributes.position;
    const index = geometry.index ? Array.from(geometry.index.array) : Array.from({length: position.count}, (_, i) => i);
    // Union-find over position-welded vertices: split attributes (normals/UVs) must not split a block.
    const parent = Array.from({length: position.count}, (_, i) => i), welded = new Map<string, number>(), p = new T.Vector3();
    const root = (i: number): number => parent[i] === i ? i : (parent[i] = root(parent[i]));
    const join = (a: number, b: number) => { parent[root(a)] = root(b); };
    for (let i = 0; i < position.count; i++) {
      const key = p.fromBufferAttribute(position, i).toArray().map(v => v.toFixed(3)).join();
      const first = welded.get(key);
      if (first === undefined) welded.set(key, i); else join(i, first);
    }
    for (let i = 0; i < index.length; i += 3) { join(index[i], index[i + 1]); join(index[i], index[i + 2]); }
    const bounds = new Map<number, T.Box3>();
    for (let i = 0; i < position.count; i++) {
      const r = root(i);
      if (!bounds.has(r)) bounds.set(r, new T.Box3());
      bounds.get(r)!.expandByPoint(p.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld));
    }
    const keep = new Map([...bounds].map(([r, box]) => { const c = box.getCenter(p); return [r, inDistrict(c.x, c.z)]; }));
    const kept = index.filter((_, i) => keep.get(root(index[i - i % 3])));
    if (kept.length) geometry.setIndex(kept); else empty.push(object);
  });
  empty.forEach(object => object.removeFromParent());
}

/** Give surveyed context massing a panel rhythm without changing its silhouette. */
export function contextFacades(environment: T.Object3D) {
  const panels: T.Matrix4[] = [], shades: T.Color[] = [], occupied = new Set<string>();
  const triangle = new T.Triangle(), normal = new T.Vector3(), across = new T.Vector3(), point = new T.Vector3();
  const transform = new T.Object3D(), forward = new T.Vector3(0, 0, 1);
  environment.updateMatrixWorld(true);
  environment.traverse(object => {
    if (!(object instanceof T.Mesh) || !object.name.startsWith('CTX_')) return;
    const position = object.geometry.attributes.position, index = object.geometry.index;
    for (let i = 0; i < (index?.count ?? position.count); i += 3) {
      [triangle.a, triangle.b, triangle.c].forEach((p, j) => p.fromBufferAttribute(position, index ? index.getX(i + j) : i + j).applyMatrix4(object.matrixWorld));
      triangle.getNormal(normal);
      if (Math.abs(normal.y) > .05 || triangle.getArea() < 12) continue;
      across.set(normal.z, 0, -normal.x).normalize();
      const vertices = [triangle.a, triangle.b, triangle.c], plane = normal.dot(triangle.a);
      const us = vertices.map(p => p.dot(across)), ys = vertices.map(p => p.y);
      for (let y = Math.ceil(Math.min(...ys) / 4) * 4 + 2; y < Math.max(...ys) - 1.2; y += 4) {
        for (let u = Math.ceil(Math.min(...us) / 4) * 4 + 2; u < Math.max(...us) - 1.2; u += 4) {
          point.copy(normal).multiplyScalar(plane).addScaledVector(across, u).setY(y);
          if (!triangle.containsPoint(point)) continue;
          const key = point.toArray().map(v => v.toFixed(2)).join(',');
          if (occupied.has(key)) continue;
          occupied.add(key);
          transform.position.copy(point).addScaledVector(normal, .045);
          transform.quaternion.setFromUnitVectors(forward, normal);
          transform.scale.set(3.05, 2.65, 1);transform.updateMatrix();panels.push(transform.matrix.clone());
          const variation = (Math.abs(Math.floor(u / 4) * 17 + Math.floor(y / 4) * 7) % 11) / 11;
          shades.push(new T.Color().setHSL(.56, .13, .34 + variation * .16));
        }
      }
    }
  });
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({color: '#ffffff', roughness: .3, metalness: .42}), panels.length);
  panels.forEach((matrix, i) => {mesh.setMatrixAt(i, matrix);mesh.setColorAt(i, shades[i]);});
  mesh.name = 'context-recessed-facades';mesh.receiveShadow = true;
  return mesh;
}
