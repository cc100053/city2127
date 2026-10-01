import * as T from 'three';
import { inDistrict } from './layout.ts';

/** Give surveyed context massing inside the hero district a panel rhythm without changing its silhouette; backdrop massing stays plain. */
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
      for (let y = Math.ceil(Math.min(...ys) / 4) * 4 + 2; y < Math.max(...ys) - 1.6; y += 4) {
        for (let u = Math.ceil(Math.min(...us) / 4) * 4 + 2; u < Math.max(...us) - 1.8; u += 4) {
          point.copy(normal).multiplyScalar(plane).addScaledVector(across, u).setY(y);
          if (!triangle.containsPoint(point) || !inDistrict(point.x, point.z)) continue;
          const key = point.toArray().map(v => v.toFixed(2)).join(',');
          if (occupied.has(key)) continue;
          occupied.add(key);
          transform.position.copy(point).addScaledVector(normal, .045);
          transform.quaternion.setFromUnitVectors(forward, normal);
          // r5 pass 2: one even glass grid per tower (target v2) — full-width panes, thin mullions and a 1.1 m pale floor band between storeys.
          transform.scale.set(3.75, 2.9, 1);transform.updateMatrix();panels.push(transform.matrix.clone());
          const row = Math.floor(y / 4), col = Math.floor(u / 4);
          // r6 pass 3: warm champagne glass (the same tone as the curtain-wall shader underneath, so uncovered faces no longer show as
          // beige blocks against blue-grey) with a soft per-bay brightness; whole lit floor runs on about one storey in four.
          // r9 pass 2: lit runs two panes wide on ~18% of bays (fine golden flecks, target v2) instead of 32 m runs, which read as beige/grey blocks.
          const lit = Math.abs(Math.sin(row * 12.9898 + Math.floor(col / 2) * 78.233) * 43758.5453) % 1 < .18;
          const jitter = Math.abs(Math.sin(row * 4.1 + col * 7.3) * 1e4) % 1;
          // r9: the unlit panes become cool blue-grey glass reading the sky (target v2: ivory frames, blue-grey glazing, golden lit floors);
          // the champagne panes made towers read as sandstone brick. The curtain-wall shader's panes match, so faces stay one system.
          shades.push(lit ? new T.Color().setHSL(.09, .62, .62 + jitter * .05) : new T.Color().setHSL(.58, .12, .57 + jitter * .04));
        }
      }
    }
  });
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({color: '#ffffff', roughness: .2, metalness: .3}), panels.length);
  panels.forEach((matrix, i) => {mesh.setMatrixAt(i, matrix);mesh.setColorAt(i, shades[i]);});
  mesh.name = 'context-recessed-facades';mesh.receiveShadow = true;
  return mesh;
}
