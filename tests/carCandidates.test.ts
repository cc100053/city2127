// The street-car candidates (asset/models/car-candidates-2127, draft, not placed): each GLB parses in three.js and keeps
// car_human's contract (variant node, its material roles with a colour attribute on the tinted ones, a 4.6 m body on the
// ground, front lamps at +z and tail lamps at -z). Round 1 is kept as it was; round 2 adds the owner's limits
// (2026-11-14): <= 6,000 triangles, <= 1.90 m wide with the camera pods (the lane probe is +-0.95 m), and no colour
// attribute on glass or lamps (a viewer would tint them by the body colour).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

const ROLES = ['car_body', 'car_glass', 'car_head', 'car_interior', 'car_seam', 'car_shadow', 'car_tail'];
const COLOURED = ['car_body', 'car_interior', 'car_shadow'];
const CASES = [
  { file: 'car-green-2127.glb', name: 'car_green', roles: ROLES, maxTris: 10000, maxWidth: 2.1, round2: false },
  { file: 'car-tech-2127.glb', name: 'car_tech', roles: ROLES, maxTris: 10000, maxWidth: 2.1, round2: false },
  { file: 'car-green-2127-r2.glb', name: 'car_green', roles: ROLES, maxTris: 6000, maxWidth: 1.9, round2: true },
  { file: 'car-tech-2127-r2.glb', name: 'car_tech', roles: ROLES.filter(r => r !== 'car_seam'), maxTris: 6000, maxWidth: 1.9, round2: true },
];
for (const { file, name, roles, maxTris, maxWidth, round2 } of CASES) {
  const bytes = await readFile(new URL(`../asset/models/car-candidates-2127/${file}`, import.meta.url));
  const gltf: Pick<GLTF, 'scene'> = await new Promise((resolve, reject) =>
    new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '', resolve, reject));
  const variant = gltf.scene.getObjectByName(name);
  assert.ok(variant, `${file}: variant ${name}`);
  variant.updateMatrixWorld(true);
  const found = new Set<string>(), body = new T.Box3(), lamp = { car_head: new T.Box3(), car_tail: new T.Box3() };
  let tris = 0;
  variant.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    const role = (o.material as T.Material).name;
    found.add(role);
    tris += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    if (role === 'car_body' || role === 'car_interior') assert.ok(o.geometry.attributes.color, `${file} ${role}: colour attribute`);
    if (round2 && !COLOURED.includes(role)) assert.ok(!o.geometry.attributes.color, `${file} ${role}: no colour attribute`);
    const box = new T.Box3().setFromObject(o);
    if (role !== 'car_shadow') body.union(box);
    if (role === 'car_head' || role === 'car_tail') lamp[role].union(box);
  });
  assert.deepEqual([...found].sort(), roles, `${file}: roles`);
  const size = body.getSize(new T.Vector3());
  assert.ok(Math.abs(body.min.y) < .01, `${file}: wheels on the ground (min y ${body.min.y})`);
  assert.ok(size.z > 4.55 && size.z < 4.75 && size.x <= maxWidth && size.y > 1.2 && size.y < 1.8, `${file}: body ${size.toArray().map(v => v.toFixed(3))}`);
  // car_tech's ice-blue reverse segment shares car_head at the tail, so only the front-most head lamp is checked.
  assert.ok(lamp.car_head.max.z > 1.8 && lamp.car_tail.min.z < -1.8 && lamp.car_tail.max.z < 0, `${file}: head lamps at +z, tail lamps at -z`);
  assert.ok(tris <= maxTris && bytes.length < 400_000, `${file}: ${tris} tris, ${bytes.length} bytes`);
  console.log(`${file}: PASS (${tris} tris, ${bytes.length} bytes, body ${size.toArray().map(v => v.toFixed(2)).join(' x ')} m)`);
}
