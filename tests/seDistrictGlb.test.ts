import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { ConcentrationDistrict } from '../src/districtMeters.ts';
import { SITE_ASSET_CATALOG } from '../src/siteAssets/assetCatalog.ts';
import { validateSiteAsset } from '../src/siteAssets/assetLoader.ts';

const file = await readFile(new URL('../asset/models/se-district-2127/se-district-2127.glb', import.meta.url));
const gltf = await new Promise<GLTF>((resolve, reject) => new GLTFLoader().parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer, '', resolve, reject));
const root = validateSiteAsset(SITE_ASSET_CATALOG['se-district-2127'], gltf);
const roles = new Set<string>(); let triangles = 0;
for (const name of ['twist', 'terraced', 'twin', 'frame', 'double', 'ring']) {
  const group = root.getObjectByName(`district_${name}`); assert.ok(group, name);
  const bounds = new T.Box3().setFromObject(group); assert.ok(!bounds.isEmpty());
  assert.ok(bounds.min.y >= -.02 && bounds.max.y <= (name === 'double' ? 14.72 : name === 'ring' ? 11.12 : 112.02));
  group.traverse(object => { if (!(object instanceof T.Mesh)) return; const m = object.material as T.Material; roles.add(m.name); if (m.name === 'district_glass') assert.equal(m.transparent, true); triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3; });
}
assert.deepEqual(roles, new Set(['district_white', 'district_room', 'district_amber', 'district_green', 'district_dark', 'district_glass', 'district_floor', 'district_glow', 'district_skin', 'district_cloth_a', 'district_cloth_b', 'district_wood', 'district_slate', 'district_fabric', 'district_skin_b', 'district_cloth_c']));
assert.ok(triangles < 110000);
const district = new ConcentrationDistrict(new T.Scene());
district.setTarget({ tiers: { nw: 0, ne: 0, sw: 0, se: 3 } }, 0, true);
const before = new T.Matrix4(); (district.root.getObjectByName('concentration-vertical-towers') as T.InstancedMesh).getMatrixAt(0, before);
const old = district.root.children.filter(o => o instanceof T.InstancedMesh && (o.name === 'concentration-vertical-towers' || o.name === 'concentration-distributed-pods')) as T.InstancedMesh[];
let disposedMeshes = 0, disposedGeometries = 0;
for (const mesh of old) { mesh.addEventListener('dispose', () => disposedMeshes++); mesh.geometry.addEventListener('dispose', () => disposedGeometries++); }
district.installDistrictAssets(root);
assert.equal(disposedMeshes, old.length); assert.equal(disposedGeometries, old.length);
const after = new T.Matrix4(); (district.root.getObjectByName('concentration-vertical-towers') as T.InstancedMesh).getMatrixAt(0, after);
assert.deepEqual(after.elements, before.elements, 'asset swap publishes the current settled transform');
assert.ok(district.root.children.filter(o => o instanceof T.InstancedMesh && (o.material as T.Material).name === 'district_glass').every(o => !o.castShadow));
const inFlight = new ConcentrationDistrict(new T.Scene());
inFlight.setTarget({ tiers: { nw: 0, ne: 0, sw: 0, se: -3 } }, 0, true);
inFlight.setTarget({ tiers: { nw: 0, ne: 0, sw: 0, se: 3 } }, 1, false); inFlight.update(2.5);
const movingBefore = new T.Matrix4(); (inFlight.root.getObjectByName('concentration-vertical-towers') as T.InstancedMesh).getMatrixAt(0, movingBefore);
inFlight.installDistrictAssets(root);
const movingAfter = new T.Matrix4(); (inFlight.root.getObjectByName('concentration-vertical-towers') as T.InstancedMesh).getMatrixAt(0, movingAfter);
assert.deepEqual(movingAfter.elements, movingBefore.elements, 'late asset swap preserves an in-flight transform');
console.log(`PASS: six SE district GLB variants, ${triangles} triangles, roles, bounds and settled transform`);
