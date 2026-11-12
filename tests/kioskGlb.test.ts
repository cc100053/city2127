import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Parses the real kiosk.glb (asset/models/resident-kiosk): the nodes the dev shot drives, the arm chain, the triangle and material budget.
const buffer = readFileSync(new URL('../asset/models/resident-kiosk/kiosk.glb', import.meta.url));
assert.equal(buffer.readUInt32LE(0), 0x46546c67, 'glTF binary magic');
const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
const names: string[] = gltf.nodes.map((node: { name: string }) => node.name);
for (const name of ['kiosk', 'interior', 'shutter', 'arm_base', 'arm_upper', 'arm_fore', 'arm_grip', 'glass_room']) assert.ok(names.includes(name), `node ${name}`);
const parentOf = new Map<string, string>();
for (const node of gltf.nodes) for (const child of node.children ?? []) parentOf.set(gltf.nodes[child].name, node.name);
assert.deepEqual(['arm_upper', 'arm_fore', 'arm_grip'].map(n => parentOf.get(n)), ['arm_base', 'arm_upper', 'arm_fore'], 'the robot arm chain');
let tris = 0;
for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) tris += gltf.accessors[primitive.indices].count / 3;
assert.ok(tris <= 6000, `triangle budget ${tris}`);
assert.ok(gltf.materials.length <= 8 && gltf.materials.every((m: { name: string }) => m.name.startsWith('ksk_')), 'at most 8 role materials');
console.log(`kiosk.glb: PASS (${names.length} nodes, ${tris} tris, ${gltf.materials.length} materials, ${buffer.length} bytes)`);
