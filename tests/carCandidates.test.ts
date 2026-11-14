// The two street-car candidates (asset/models/car-candidates-2127, draft, not placed): each GLB parses in three.js, keeps
// car_human's contract (variant node, the seven roles with a colour attribute on the tinted ones, 4.6 m body on the ground,
// front lamps at +z and tail lamps at -z) and stays within a small budget.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

const ROLES = ['car_body', 'car_glass', 'car_head', 'car_interior', 'car_seam', 'car_shadow', 'car_tail'];
for (const name of ['car_green', 'car_tech']) {
  const file = `car-${name.slice(4)}-2127.glb`;
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
    if (role === 'car_body' || role === 'car_interior') assert.ok(o.geometry.attributes.color, `${name} ${role}: colour attribute`);
    const box = new T.Box3().setFromObject(o);
    if (role !== 'car_shadow') body.union(box);
    if (role === 'car_head' || role === 'car_tail') lamp[role].union(box);
  });
  assert.deepEqual([...found].sort(), ROLES, `${name}: roles`);
  const size = body.getSize(new T.Vector3());
  assert.ok(Math.abs(body.min.y) < .01, `${name}: wheels on the ground (min y ${body.min.y})`);
  assert.ok(size.z > 4.55 && size.z < 4.75 && /* camera pods and arch lips included */ size.x < 2.1 && size.y > 1.2 && size.y < 1.8, `${name}: body ${size.toArray().map(v => v.toFixed(2))}`);
  assert.ok(lamp.car_head.min.z > 1.8 && lamp.car_tail.max.z < -1.8, `${name}: head lamps at +z, tail lamps at -z`);
  assert.ok(tris <= 10000 && bytes.length < 400_000, `${name}: ${tris} tris, ${bytes.length} bytes`);
  console.log(`${file}: PASS (${tris} tris, ${bytes.length} bytes, body ${size.toArray().map(v => v.toFixed(2)).join(' x ')} m)`);
}
