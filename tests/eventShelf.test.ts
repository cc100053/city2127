import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { SITE_ASSET_CATALOG } from '../src/siteAssets/assetCatalog.ts';
import { validateSiteAsset } from '../src/siteAssets/assetLoader.ts';
import { SHELF, SHELF_ROLES, SHELF_SLOTS, createEventShelf, shelfCount } from '../src/siteBuilders/eventShelf.ts';

// Slot table: 3 x 2 x 10 grid, 35 modules at the default 4 seats, the top level stays the empty transfer deck, no two modules share a cell.
assert.equal(shelfCount(4), 35);
assert.equal(shelfCount(0), 31);
assert.equal(shelfCount(8), 39);
assert.equal(SHELF_SLOTS.length, 39);
assert.equal(new Set(SHELF_SLOTS.map(s => s.id)).size, SHELF_SLOTS.length, 'unique slots');
assert.deepEqual(SHELF_SLOTS.map(s => s.order), SHELF_SLOTS.map((_, i) => i));
assert.ok(SHELF_SLOTS.every(s => s.k <= SHELF.levels - 2), 'level 9 is the empty transfer deck, and a hall never reaches it');
assert.ok(SHELF_SLOTS.every(s => s.k !== 0 || s.c !== 1), 'ground tier keeps its centre bay open as the lobby');
const cells = new Set<string>();
for (const s of SHELF_SLOTS) {
  for (let k = s.k; k < s.k + (s.variant === 'H' ? 2 : 1); k++) { const id = `${k}.${s.c}.${s.r}`; assert.ok(!cells.has(id), `cell ${id} used twice`); cells.add(id); }
  assert.equal(s.x, (s.c - 1) * 12);
  assert.equal(s.z, (s.r - .5) * 12);
}
const mid = SHELF_SLOTS[34];
assert.ok(mid.r === 0 && mid.k >= 3 && mid.k <= 6, 'the default 35th module is a visible mid-height front one');

// GLB: real file against its catalog contract.
const file = await readFile(new URL('../asset/models/event-shelf-2127/event-shelf-2127.glb', import.meta.url));
const gltf = await new Promise<GLTF>((resolve, reject) => new GLTFLoader().parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer, '', resolve, reject));
const root = validateSiteAsset(SITE_ASSET_CATALOG['event-shelf-2127'], gltf);
const roles = new Set<string>(); const tris: Record<string, number> = {};
root.traverse(object => {
  if (!(object instanceof T.Mesh)) return;
  roles.add((object.material as T.Material).name);
  let top: T.Object3D = object;
  while (top.parent && top.parent !== root) top = top.parent;
  const g = object.geometry as T.BufferGeometry;
  tris[top.name] = (tris[top.name] ?? 0) + (g.index ? g.index.count : g.attributes.position.count) / 3;
});
assert.deepEqual([...roles].sort(), [...SITE_ASSET_CATALOG['event-shelf-2127'].materialRoles!].sort());
assert.ok(SITE_ASSET_CATALOG['event-shelf-2127'].materialRoles!.every(role => (SHELF_ROLES as string[]).includes(role)), 'every GLB role has a runtime material');
for (const name of ['SHELF_FRAME', 'MOD_A', 'MOD_B', 'MOD_C', 'MOD_D', 'MOD_H']) assert.ok(root.getObjectByName(name), name);
const frameBounds = new T.Box3().setFromObject(root.getObjectByName('SHELF_FRAME')!);
const size = frameBounds.getSize(new T.Vector3());
assert.ok(Math.abs(size.x - 40) < 1 && frameBounds.min.y >= -.01 && frameBounds.max.y <= 41, `frame ${size.x} wide, ${frameBounds.max.y} tall`);
const hall = new T.Box3().setFromObject(root.getObjectByName('MOD_H')!), single = new T.Box3().setFromObject(root.getObjectByName('MOD_A')!);
assert.ok(hall.getSize(new T.Vector3()).y > 7 && single.getSize(new T.Vector3()).y < 3.8, 'hall is two levels, a module fits one');
assert.ok(single.getSize(new T.Vector3()).x <= 11.05 && single.getSize(new T.Vector3()).z <= 12.2, 'a module fits its 12 m cell');
const total = Object.values(tris).reduce((a, b) => a + b, 0);
assert.ok(total < 20000 && tris.SHELF_FRAME < 5000, `${total} triangles`);
assert.ok(file.byteLength < 1_000_000, `${file.byteLength} bytes`);

// Installing the GLB swaps the fallback frame/modules in place and keeps the settled count.
const group = new T.Group();
const shelf = createEventShelf(group);
shelf.setBandLevel(1); shelf.update(0);
assert.equal(shelf.visibleModules(), 35);
shelf.installGlb(root.clone(true));
assert.ok(shelf.frame.getObjectByName('SHELF_FRAME'));
const instanced = shelf.group.getObjectByName('event-shelf-modules')!.children as T.InstancedMesh[];
assert.ok(instanced.length >= 5 * 12, `${instanced.length} instanced module meshes`);
assert.equal(shelf.visibleModules(), 35);
// One module moves at a time: count + 1 hoists exactly one slot, everyone else snaps; the hoist ends in its cell.
shelf.setCount(36, 10, false);
assert.equal(shelf.visibleModules(), 36);
shelf.update(11.4);
shelf.update(13.1);
assert.equal(shelf.count, 36);
shelf.setCount(30, 20, true);
assert.equal(shelf.visibleModules(), 30, 'an immediate change (snapshot / reset) restores the authoritative count at once');
console.log(`PASS: shelf slots (35 of ${SHELF_SLOTS.length}, deck level empty), GLB roles/bounds/${total} tris/${file.byteLength} bytes, GLB swap and single-hoist retarget`);
