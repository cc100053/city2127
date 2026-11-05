import assert from 'node:assert/strict';
import * as T from 'three';
import { SiteAssetLoaderCache } from '../src/siteAssets/assetLoader.ts';
import { instanceProps, loadPropKit } from '../src/siteAssets/propKit.ts';

const stub = () => {
  const scene = new T.Scene();
  const root = new T.Group(); root.name = 'ROOT_CITY_KIT_2127'; scene.add(root);
  const prop = (name: string, x: number, materials: string[]) => {
    const empty = new T.Group(); empty.name = `kit_${name}`; empty.position.set(x, 0, 0); root.add(empty);
    materials.forEach((material, i) => {
      const m = new T.MeshStandardMaterial(); m.name = material;
      const mesh = new T.Mesh(new T.BoxGeometry(1, 2, 1), m); mesh.position.set(0, 1, i); empty.add(mesh);
    });
  };
  prop('tree', 6, ['kit_bark', 'kit_leaf_a']);
  prop('bench', 12, ['kit_white']);
  return { scene, animations: [] };
};

const assets = new SiteAssetLoaderCache({ async loadAsync() { return stub(); } });
const kit = await loadPropKit(assets); // the real catalog entry validates root and bounds
assert.equal(kit.name, 'ROOT_CITY_KIT_2127');
await loadPropKit(assets);
assert.equal(assets.getRequestCount('city-kit-2127'), 1, 'the kit loads once for every consumer');

const root = stub().scene.getObjectByName('ROOT_CITY_KIT_2127')!;
const group = instanceProps(root, [
  { name: 'tree', position: [1, 0, 2], yaw: Math.PI / 2, scale: 2 }, { name: 'tree', position: [3, 0, 0] }, { name: 'bench', position: [0, 1, 0] },
], .5);
const meshes = group.children as T.InstancedMesh[];
assert.equal(meshes.length, 3, 'one InstancedMesh per (prop, material)');
assert.deepEqual(meshes.map(m => m.name).sort(), ['kit-bench', 'kit-tree', 'kit-tree']);
assert.ok(meshes.every(m => m.count === (m.name === 'kit-tree' ? 2 : 1) && m.castShadow));
// Geometry is prop-relative (the prop empty's own offset is cancelled); instance 0 of the tree: base (1, 0, 2), scale 2 * .5 = 1, yaw 90 degrees.
const tree = meshes.find(m => m.name === 'kit-tree')!;
const matrix = new T.Matrix4(); tree.getMatrixAt(0, matrix);
const position = new T.Vector3(), quaternion = new T.Quaternion(), scale = new T.Vector3();
matrix.decompose(position, quaternion, scale);
assert.ok(position.distanceTo(new T.Vector3(1, 0, 2)) < 1e-6);
assert.ok(Math.abs(scale.x - 1) < 1e-6);
assert.ok(new T.Vector3(0, 0, 1).applyQuaternion(quaternion).distanceTo(new T.Vector3(1, 0, 0)) < 1e-6, 'yaw turns +Z front toward +X');
tree.geometry.computeBoundingBox();
assert.ok(Math.abs(tree.geometry.boundingBox!.min.y) < 1e-6 && Math.abs(tree.geometry.boundingBox!.min.x + .5) < 1e-6, 'prop-local geometry, base at the origin');
assert.throws(() => instanceProps(root, [{ name: 'dragon', position: [0, 0, 0] }], 1), /Unknown kit prop dragon/);
console.log('propKit: PASS');
