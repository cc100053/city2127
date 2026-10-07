// Generates lightweight, vertex-clustered QR miniatures from the team's GLBs.
// No source GLB is changed. Pin provenance so regeneration is reproducible.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// This is the city baseline loaded by src/odaibaScene.ts. Keep the QR list to
// landmark GLBs that are actually placed inside the visible hero district.
const sourceCommit = '4eda49ebae30e6215e6f67f17e8fef197832b34e';
const git = process.env.GIT_BIN || 'git';
const layout = JSON.parse(readFileSync(new URL('../../src/odaiba-layout.json', import.meta.url), 'utf8'));
// Match the material remap used by src/odaibaScene.ts so the miniature is the
// same finished building visitors see in the city, not the raw Blender palette.
const cityColors = {
  'Roof and Shadow': '#7f9b6d', 'Standing seam roof.001': '#e6ddcc', 'Gray roof metal': '#e6ddcc',
  'PCa_Panel_OffWhite': '#e4d9c5', 'Muted Coral Vertical Structure': '#ebe2d2',
  'Ochre Accent Structure': '#ebe2d2', 'Facade_White': '#e2d8c6', 'Warm Ivory Structure': '#e8dcc8',
  'Pale balcony slab and crown': '#e9dfcd', 'Light vertical piers.001': '#ebe0cd',
  'Muted Pink Panels': '#e8e2d5', 'Warm ivory facade': '#ede8dd', 'Warm off white facade.001': '#ede8dd',
  'Pale Mint Panels': '#ebe6db', 'Ochre Commercial Panels': '#e5dfd1', 'Blue Gray Cladding': '#e9e4d9',
  'Dark Blue Gray Glazing': '#e2ddd1',
};
const models = [];
for (const [id, label] of [
  ['aqua-city-odaiba', 'アクアシティお台場'],
  ['divercity-tokyo-plaza', 'ダイバーシティ東京プラザ'],
  ['grand-nikko-tokyo-daiba', 'グランドニッコー東京 台場'],
]) {
  const path = `asset/models/${id}/${id}.glb`;
  const bytes = execFileSync(git, ['show', `${sourceCommit}:${path}`], { maxBuffer: 20_000_000 });
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const placement = layout.buildings.find(building => building.id === id);
  scene.rotation.set(0, placement.rotationZ, 0);
  scene.scale.set(placement.scale[0], placement.scale[2], placement.scale[1]);
  scene.rotateX(placement.adapterRotationX);
  scene.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(scene), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
  const scale = .84 / Math.max(size.x, size.z);
  const positions = [], colors = [], normals = [], indices = [], seen = new Map(), triangles = new Set();
  const point = new T.Vector3(), normal = new T.Vector3();
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry, p = geometry.attributes.position;
    const normalMatrix = new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const color = new T.Color(cityColors[mesh.material.name] ?? mesh.material.color ?? '#b0c2cc');
    const remap = [];
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      point.sub(new T.Vector3(center.x, bounds.min.y, center.z)).multiplyScalar(scale);
      const v = point.toArray().map(n => Math.round(n / .035) * .035);
      normal.fromBufferAttribute(geometry.attributes.normal, i).applyMatrix3(normalMatrix).normalize();
      const n = normal.toArray().map(value => +value.toFixed(5));
      const key = [...v, color.getHex()].join(',');
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
  models.push({ id, label, positions, colors, indices });
  console.log(`${id}: ${indices.length / 3} triangles, ${positions.length / 3} vertices`);
}
writeFileSync(new URL('../src/odaiba-qr-models.json', import.meta.url), JSON.stringify({ sourceCommit, models }));
