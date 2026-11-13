import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { SITE_ASSET_CATALOG } from '../src/siteAssets/assetCatalog.ts';
import { validateSiteAsset } from '../src/siteAssets/assetLoader.ts';
import { SHELF, SHELF_ROLES, SHELF_SLOTS, createEventShelf, shelfCount } from '../src/siteBuilders/eventShelf.ts';

// Slot table: 3 x 2 x 10 grid, 33 modules at the default 4 seats (30-35 of 60), the top level stays the empty transfer deck, no two modules share a cell.
assert.equal(shelfCount(4), 33);
assert.equal(shelfCount(0), 29);
assert.equal(shelfCount(8), 37);
assert.equal(SHELF_SLOTS.length, 37);
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
// Showpieces come first in the load order: arriving on the ground track, half slid into a mid-level cell, hung on the facade rails.
assert.deepEqual(SHELF_SLOTS.slice(0, 3).map(s => s.pose), ['track', 'slide', 'hang']);
assert.ok(SHELF_SLOTS.slice(3).every(s => !s.pose));
// The headline hoist (the last module added, for 29..37 modules) always runs on the front rails, left or centre column; the default one is a visible mid-height front module.
for (const s of SHELF_SLOTS.slice(28)) assert.ok(s.r === 0 && s.c !== 2 && s.variant !== 'H', `headline candidate ${s.id}`);
const mid = SHELF_SLOTS[shelfCount(4) - 1];
assert.ok(mid.r === 0 && mid.k >= 3 && mid.k <= 6, 'the default headline module is a visible mid-height front one');
// Irregular occupancy: some levels nearly full, some nearly empty, the upper levels mostly see-through.
const perLevel = Array.from({ length: SHELF.levels }, (_, k) => SHELF_SLOTS.slice(0, shelfCount(4)).filter(s => s.k === k).length);
assert.ok(Math.max(...perLevel) >= 5 && perLevel.filter(n => n <= 1).length >= 2, `levels ${perLevel}`);

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
for (const name of ['SHELF_FRAME', 'MOD_A', 'MOD_B', 'MOD_C', 'MOD_D', 'MOD_E', 'MOD_F', 'MOD_H']) assert.ok(root.getObjectByName(name), name);
const frameBounds = new T.Box3().setFromObject(root.getObjectByName('SHELF_FRAME')!);
const size = frameBounds.getSize(new T.Vector3());
assert.ok(Math.abs(size.x - 40) < 1 && frameBounds.min.y >= -.01 && frameBounds.max.y <= 41.5, `frame ${size.x} wide, ${frameBounds.max.y} tall`);
const hall = new T.Box3().setFromObject(root.getObjectByName('MOD_H')!), single = new T.Box3().setFromObject(root.getObjectByName('MOD_A')!);
assert.ok(hall.getSize(new T.Vector3()).y > 7 && single.getSize(new T.Vector3()).y < 4.25, `hall is two levels (${hall.getSize(new T.Vector3()).y.toFixed(2)}), a module fits one (${single.getSize(new T.Vector3()).y.toFixed(2)})`);
const gap = (12 - single.getSize(new T.Vector3()).x) / 2 - 0.65;
assert.ok(gap >= .75, `a module keeps about a metre clear of the column faces (${gap.toFixed(2)} m)`);
assert.ok(single.getSize(new T.Vector3()).x <= 9.3 && single.getSize(new T.Vector3()).z <= 11.5, 'a module is 8.6 m wide with 11.2 m slide rails, inside its 12 m cell');
const total = Object.values(tris).reduce((a, b) => a + b, 0);
assert.ok(total < 26000 && tris.SHELF_FRAME < 11000, `${total} triangles`);
assert.ok(file.byteLength < 1_200_000, `${file.byteLength} bytes`);

// Installing the GLB swaps the fallback frame/modules in place and keeps the settled count.
const group = new T.Group();
const shelf = createEventShelf(group);
shelf.setBandLevel(1); shelf.update(0);
assert.equal(shelf.visibleModules(), 33);
shelf.installGlb(root.clone(true));
assert.ok(shelf.frame.getObjectByName('SHELF_FRAME'));
const instanced = shelf.group.getObjectByName('event-shelf-modules')!.children as T.InstancedMesh[];
assert.ok(instanced.length >= 7 * 8, `${instanced.length} instanced module meshes`);
assert.equal(shelf.visibleModules(), 33);
// One module moves at a time: count + 1 hoists exactly one slot, everyone else snaps; the hoist ends in its cell.
shelf.setCount(34, 10, false);
assert.equal(shelf.visibleModules(), 34);
shelf.update(11.4);
shelf.update(13.1);
assert.equal(shelf.count, 34);
shelf.setCount(30, 20, true);
assert.equal(shelf.visibleModules(), 30, 'an immediate change (snapshot / reset) restores the authoritative count at once');
// Headline hoist, every count the DEV hook can reach (30..37) in both directions: the module never overlaps another module or the frame, never jumps, drives in from beyond the track end and ends exactly in its cell.
{
  const g = new T.Group(), sh = createEventShelf(g);
  sh.setBandLevel(1); sh.update(0);
  const inVariant = new Map<string, number>(), perVariant = new Map<string, number>();
  for (const s of SHELF_SLOTS) { const n = perVariant.get(s.variant) ?? 0; inVariant.set(s.id, n); perVariant.set(s.variant, n + 1); }
  const modules = sh.group.getObjectByName('event-shelf-modules')!;
  const m4 = new T.Matrix4(), v = new T.Vector3();
  const pose = (i: number) => { const s = SHELF_SLOTS[i], mesh = modules.children.find(c => c.name === `event-shelf-module-${s.variant}`) as T.InstancedMesh; mesh.getMatrixAt(inVariant.get(s.id)!, m4); v.setFromMatrixPosition(m4); return { x: v.x, y: v.y, z: v.z, shown: m4.elements[0] > .5 }; };
  type Box = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };
  const box = (x: number, y: number, z: number, h: number, hw = SHELF.module / 2): Box => ({ x0: x - hw, x1: x + hw, y0: y, y1: y + h, z0: z - hw, z1: z + hw });
  const hit = (a: Box, b: Box) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1e-6 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 1e-6 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 1e-6;
  const W = SHELF.cols * SHELF.cell, D = SHELF.rows * SHELF.cell, frame: Box[] = [];
  const add = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => frame.push({ x0: x - sx / 2, x1: x + sx / 2, y0: y - sy / 2, y1: y + sy / 2, z0: z - sz / 2, z1: z + sz / 2 });
  for (let i = 0; i <= SHELF.cols; i++) for (let j = 0; j <= SHELF.rows; j++) add(SHELF.col, SHELF.levels * SHELF.floor, SHELF.col, -W / 2 + i * SHELF.cell, SHELF.levels * SHELF.floor / 2, -D / 2 + j * SHELF.cell);
  for (let k = 1; k <= SHELF.levels; k++) {
    for (let j = 0; j <= SHELF.rows; j++) add(W + SHELF.col, .8, .9, 0, k * SHELF.floor - .4, -D / 2 + j * SHELF.cell);
    for (let i = 0; i <= SHELF.cols; i++) add(.9, .8, D + SHELF.col, -W / 2 + i * SHELF.cell, k * SHELF.floor - .4, 0);
  }
  for (let count = 30; count <= 37; count++) for (const dir of [1, -1]) {
    const before = dir === 1 ? count - 1 : count, after = dir === 1 ? count : count - 1, slot = Math.max(before, after) - 1, s = SHELF_SLOTS[slot];
    sh.setCount(before, 0, true); sh.update(0); sh.setCount(after, 100, false);
    let last: { x: number; y: number; z: number } | undefined, seenZ = [Infinity, -Infinity];
    for (let t = 100; t <= 103.001; t += .05) {
      sh.update(t);
      const p = pose(slot);
      if (!p.shown) continue;
      const b = box(p.x, p.y, p.z, s.variant === 'H' ? 7.4 : 3.2);
      for (let i = 0; i < SHELF_SLOTS.length; i++) { const o = pose(i); if (i !== slot && o.shown) assert.ok(!hit(b, box(o.x, o.y, o.z, SHELF_SLOTS[i].variant === 'H' ? 7.4 : 3.2)), `${count}${dir > 0 ? '+' : '-'} ${s.id} meets ${SHELF_SLOTS[i].id} at ${(t - 100).toFixed(2)} s`); }
      assert.ok(!frame.some(f => hit(b, f)), `${count}${dir > 0 ? '+' : '-'} ${s.id} meets the frame at ${(t - 100).toFixed(2)} s`);
      if (last) assert.ok(Math.hypot(p.x - last.x, p.y - last.y, p.z - last.z) < 3, `${s.id} jumps ${(t - 100).toFixed(2)} s`);
      last = p; seenZ = [Math.min(seenZ[0], p.z), Math.max(seenZ[1], p.z)];
    }
    assert.ok(seenZ[0] < -33, `${s.id} drives in from beyond the track end (z ${seenZ[0].toFixed(1)})`);
    sh.update(103.2);
    assert.equal(sh.count, after);
    assert.equal(pose(slot).shown, after > before, 'the hoisted module ends in its cell (added) or gone (removed)');
  }
}
console.log(`PASS: shelf slots (33 of ${SHELF_SLOTS.length}, deck level empty), GLB roles/bounds/${total} tris/${file.byteLength} bytes, GLB swap and single-hoist retarget`);
