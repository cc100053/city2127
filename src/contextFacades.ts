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
          // Glass-dominant bays (thin mullions, a slim spandrel) so towers read as curtain-wall glass, not dotted masonry.
          transform.scale.set(3.6, 3.15, 1);transform.updateMatrix();panels.push(transform.matrix.clone());
          const row = Math.floor(y / 4), col = Math.floor(u / 4);
          // Even sky-blue glazing; lit warm rooms come in runs of three bays on about one storey-run in six (2127 target: golden interiors).
          const lit = Math.abs(Math.sin(row * 12.9898 + Math.floor(col / 3) * 78.233) * 43758.5453) % 1 < .12;
          // r4 pass 4: paler, cooler glass so the context towers read as light curtain walls (target v2), not beige-speckled masonry.
          shades.push(lit ? new T.Color().setHSL(.1, .55, .74) : new T.Color().setHSL(.56, .2, .6 + Math.abs(row * 7 + col * 3) % 5 * .018));
        }
      }
    }
  });
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({color: '#ffffff', roughness: .22, metalness: .3}), panels.length);
  panels.forEach((matrix, i) => {mesh.setMatrixAt(i, matrix);mesh.setColorAt(i, shades[i]);});
  mesh.name = 'context-recessed-facades';mesh.receiveShadow = true;
  return mesh;
}
