import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import qrcode from 'qrcode-generator';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sampleBuildingVoxels, createQrSculpture } from '../src/qrSculpture.js';

function code(url = 'https://example.org/city/2127') {
  const qr = qrcode(0, 'H'); qr.addData(url, 'Byte'); qr.make(); return qr;
}
function tower() {
  const root = new T.Group(), geometry = new T.BoxGeometry(12, 50, 12), material = new T.MeshStandardMaterial({ color: '#6f9cbd' });
  const mesh = new T.InstancedMesh(geometry, material, 1);
  mesh.setMatrixAt(0, new T.Matrix4().makeTranslation(100, 25, -100)); root.position.set(-100, 0, 100); root.add(mesh);
  return root;
}
function disposeSource(root) { root.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); object.dispose?.(); } }); }

test('samples actual transformed architecture only on dark QR columns', () => {
  const source = tower(), qr = code(), sampled = sampleBuildingVoxels(source, qr);
  assert.ok(sampled.voxels.length > 100);
  assert.ok(sampled.voxels.every(voxel => qr.isDark(voxel.row, voxel.col)));
  assert.ok(Math.abs(sampled.sourceHeight - 50 * qr.getModuleCount() * .84 / 12) < 1e-6);
  assert.ok(Math.abs(Math.max(...sampled.voxels.map(voxel => voxel.y + 1)) - sampled.sourceHeight) <= 1);
  assert.deepEqual(source.position.toArray(), [-100, 0, 100], 'source transforms are untouched');
  assert.ok(sampled.voxels.every(voxel => voxel.color.getHexString() === '6f9cbd'), 'source palette survives');
  disposeSource(source);
});

test('a suspended landmark stays hollow rather than becoming a filled height field', () => {
  const source = new T.Group(), geometry = new T.BoxGeometry(16, 2, 16), material = new T.MeshStandardMaterial({ color: '#fff4df' });
  const mesh = new T.Mesh(geometry, material); mesh.position.y = 20; source.add(mesh);
  const foot = new T.Mesh(new T.BoxGeometry(2, 20, 2), material); foot.position.set(-7, 10, -7); source.add(foot);
  const sampled = sampleBuildingVoxels(source, code());
  const inner = sampled.voxels.filter(voxel => Math.abs(voxel.col - (sampled.count - 1) / 2) < 3 && Math.abs(voxel.row - (sampled.count - 1) / 2) < 3);
  assert.ok(inner.length > 0);
  assert.ok(inner.every(voxel => voxel.y >= 19 * sampled.count * .84 / 16 - 1), 'void below the suspended slab remains');
  source.traverse(object => { if (object.isMesh) object.geometry.dispose(); }); material.dispose();
});

test('the exact same geometry stays upright and visible when scanning', () => {
  const source = tower(), sculpture = createQrSculpture(source, code());
  const before = new T.Box3().setFromObject(sculpture.root), mesh = sculpture.root.getObjectByName('city-building-voxels');
  const matrices = mesh.instanceMatrix.array.slice(), id = mesh.uuid;
  for (const blend of [0, .5, 1, 0, 1]) {
    sculpture.setScanBlend(blend);
    assert.deepEqual(new T.Box3().setFromObject(sculpture.root), before);
    assert.deepEqual(mesh.instanceMatrix.array, matrices);
    assert.equal(mesh.uuid, id); assert.equal(mesh.visible, true); assert.equal(sculpture.root.visible, true);
  }
  const disposed = [];
  mesh.geometry.addEventListener('dispose', () => disposed.push('geometry'));
  mesh.material.addEventListener('dispose', () => disposed.push('material'));
  sculpture.dispose(); assert.deepEqual(disposed, ['geometry', 'material']); disposeSource(source);
});

test('overlapping baked members remain solid without closing a separate suspended void', () => {
  const pieces = [new T.BoxGeometry(12, 10, 12).translate(0, 5, 0), new T.BoxGeometry(8, 18, 8).translate(0, 9, 0), new T.BoxGeometry(12, 2, 12).translate(0, 25, 0)];
  const mesh = new T.Mesh(mergeGeometries(pieces), new T.MeshStandardMaterial());
  const qr = code(), sampled = sampleBuildingVoxels(mesh, qr), scale = qr.getModuleCount() * .84 / 12;
  const column = new Map();
  for (const voxel of sampled.voxels) if (Math.abs(voxel.col - (sampled.count - 1) / 2) < 3 && Math.abs(voxel.row - (sampled.count - 1) / 2) < 3) {
    const key = voxel.row + ',' + voxel.col;
    if (!column.has(key)) column.set(key, new Set()); column.get(key).add(voxel.y);
  }
  assert.ok(column.size > 0);
  for (const levels of column.values()) {
    assert.ok(levels.has(Math.floor(14 * scale)), 'overlap does not erase the taller member above the short one');
    assert.ok(!levels.has(Math.floor(21 * scale)), 'separate suspended gap remains empty');
  }
  pieces.forEach(geometry => geometry.dispose()); mesh.geometry.dispose(); mesh.material.dispose();
});

test('empty source fails explicitly for the standard QR fallback', () => {
  assert.throws(() => sampleBuildingVoxels(new T.Group(), code()), /Empty building/);
});
