// Generates lightweight, vertex-clustered QR miniatures from the team's GLBs.
// No source GLB is changed. Pin provenance so regeneration is reproducible.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const sourceCommit = '40d696e09f5d119a3ba6aff72c19d935c8838333';
const models = [];
for (const [id, label] of [['fuji-tv', 'フジテレビ'], ['telecom-center', 'テレコムセンター'], ['divercity-office-tower', 'ダイバーシティ']]) {
  const path = `asset/models/${id}/${id}.glb`;
  const bytes = execFileSync('git', ['show', `${sourceCommit}:${path}`], { maxBuffer: 20_000_000 });
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(scene), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
  const scale = .84 / Math.max(size.x, size.z);
  const positions = [], colors = [], normals = [], indices = [], seen = new Map(), triangles = new Set();
  const point = new T.Vector3(), normal = new T.Vector3();
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry, p = geometry.attributes.position;
    const normalMatrix = new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const color = mesh.material.color ?? new T.Color('#b0c2cc');
    const remap = [];
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      point.sub(new T.Vector3(center.x, bounds.min.y, center.z)).multiplyScalar(scale);
      // One Fuji hero can retain authored panel depth and hard-edge normals.
      const v = point.toArray().map(n => id === 'fuji-tv' ? +n.toFixed(6) : Math.round(n / .035) * .035);
      normal.fromBufferAttribute(geometry.attributes.normal, i).applyMatrix3(normalMatrix).normalize();
      const n = normal.toArray().map(value => +value.toFixed(5));
      const key = [...v, color.getHex(), ...(id === 'fuji-tv' ? n : [])].join(',');
      if (!seen.has(key)) {
        seen.set(key, positions.length / 3);
        positions.push(...v); colors.push(...color.toArray().map(n => +n.toFixed(4))); normals.push(...n);
      }
      remap.push(seen.get(key));
    }
    const count = geometry.index?.count ?? p.count;
    for (let i = 0; i < count; i += 3) {
      const tri = [0, 1, 2].map(j => remap[geometry.index ? geometry.index.getX(i + j) : i + j]);
      if (new Set(tri).size !== 3) continue;
      const key = [...tri].sort((a, b) => a - b).join(',');
      if (triangles.has(key)) continue;
      triangles.add(key); indices.push(...tri);
    }
  });
  models.push({ id, label, positions, colors, indices, ...(id === 'fuji-tv' ? { normals } : {}) });
  console.log(`${id}: ${indices.length / 3} triangles, ${positions.length / 3} vertices`);
}
writeFileSync(new URL('../src/odaiba-qr-models.json', import.meta.url), JSON.stringify({ sourceCommit, models }));
