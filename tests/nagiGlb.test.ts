import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Parses the real nagi.glb (asset/models/resident-nagi): rigid-part node names and hierarchy, triangle and material budget.
const buffer = readFileSync(new URL('../asset/models/resident-nagi/nagi.glb', import.meta.url));
assert.equal(buffer.readUInt32LE(0), 0x46546c67, 'glTF binary magic');
const jsonLength = buffer.readUInt32LE(12);
const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
const names: string[] = gltf.nodes.map((node: { name: string }) => node.name);
const parentOf = new Map<string, string>();
for (const node of gltf.nodes) for (const child of node.children ?? []) parentOf.set(gltf.nodes[child].name, node.name);

const chain: Record<string, string> = { torso: 'hips', head: 'torso', 'mouth.soft': 'head', 'mouth.smile': 'head', phone: 'hand.R', 'upperArm.L': 'torso', 'upperArm.R': 'torso', 'lowerArm.L': 'upperArm.L', 'lowerArm.R': 'upperArm.R',
  'hand.L': 'lowerArm.L', 'hand.R': 'lowerArm.R', tablet: 'hand.L', 'upperLeg.L': 'hips', 'upperLeg.R': 'hips', 'lowerLeg.L': 'upperLeg.L', 'lowerLeg.R': 'upperLeg.R',
  'foot.L': 'lowerLeg.L', 'foot.R': 'lowerLeg.R' };
for (const [node, parent] of Object.entries(chain)) assert.equal(parentOf.get(node), parent, `${node} hangs from ${parent}`);
assert.ok(names.includes('hips') && names.includes('ROOT_NAGI') && !gltf.skins && !gltf.animations, 'rigid parts only: no skin, no animation');

let tris = 0;
for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) tris += gltf.accessors[primitive.indices].count / 3;
assert.ok(tris <= 5500, `triangle budget ${tris}`);
assert.ok(gltf.materials.length <= 9 && gltf.materials.every((m: { name: string }) => m.name.startsWith('res_')), 'at most 9 role materials');
assert.ok(buffer.length < 300_000, `small GLB (${buffer.length} bytes)`);
console.log(`nagi.glb: PASS (${names.length} nodes, ${tris} tris, ${gltf.materials.length} materials, ${buffer.length} bytes)`);
