// SPIKE (M0 hand tracking): stages the self-hosted MediaPipe runtime under public/hand/ (git-ignored).
// Copies the tasks-vision wasm folder from node_modules and downloads hand_landmarker.task once.
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/hand');
const wasmSrc = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

await mkdir(join(out, 'wasm'), { recursive: true });
for (const name of await readdir(wasmSrc)) await copyFile(join(wasmSrc, name), join(out, 'wasm', name));
console.log(`wasm copied to ${join(out, 'wasm')}`);

const model = join(out, 'hand_landmarker.task');
const existing = await stat(model).catch(() => null);
if (existing && existing.size > 1_000_000 && !process.argv.includes('--force')) {
  console.log(`model present (${existing.size} bytes), skip download`);
} else {
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`model download failed: HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  await writeFile(model, body);
  console.log(`model downloaded (${body.length} bytes) to ${model}`);
}
