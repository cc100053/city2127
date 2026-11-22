// Module Web Worker: runs HandLandmarker off the main thread so ~25 ms inference never blocks a render frame.
// Protocol (see handTracker.ts): init -> ready; frame (transferred ImageBitmap) -> result | error.
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { createHandLandmarker, type Delegate } from './landmarker.ts';

export type WorkerIn =
  | { type: 'init'; preferGpu: boolean }
  | { type: 'frame'; id: number; t: number; bitmap: ImageBitmap };
export type WorkerOut =
  | { type: 'ready'; delegate: Delegate; gpuError?: string; offscreen: boolean }
  | { type: 'result'; id: number; t: number; landmarks: { x: number; y: number; z: number }[][]; inferMs: number; width: number; height: number }
  | { type: 'delegate'; delegate: Delegate; reason: string }
  | { type: 'error'; id?: number; message: string; fatal: boolean };

const post = (message: WorkerOut) => (self as unknown as Worker).postMessage(message);
let landmarker: HandLandmarker | undefined, delegate: Delegate = 'CPU', lastT = -1;

self.onmessage = async (event: MessageEvent<WorkerIn>) => {
  const msg = event.data;
  if (msg.type === 'init') {
    try {
      const made = await createHandLandmarker(msg.preferGpu, true);
      landmarker = made.landmarker; delegate = made.delegate;
      post({ type: 'ready', delegate, offscreen: typeof OffscreenCanvas !== 'undefined', ...(made.gpuError ? { gpuError: made.gpuError } : {}) });
    } catch (error) { post({ type: 'error', message: `init: ${String(error)}`, fatal: true }); }
    return;
  }
  const { bitmap } = msg;
  try {
    if (!landmarker) throw new Error('not ready');
    const t = Math.max(msg.t, lastT + 0.001); lastT = t; // VIDEO mode needs strictly increasing timestamps
    const t0 = performance.now();
    const result = landmarker.detectForVideo(bitmap, t);
    post({ type: 'result', id: msg.id, t: msg.t, landmarks: result.landmarks.map(h => h.map(p => ({ x: p.x, y: p.y, z: p.z }))),
      inferMs: performance.now() - t0, width: bitmap.width, height: bitmap.height });
  } catch (error) {
    if (delegate === 'GPU' && landmarker) {
      // A GPU context loss or shader failure: rebuild once on CPU and keep going.
      const reason = String(error).slice(0, 120);
      try { landmarker.close(); } catch { /* already broken */ }
      landmarker = undefined;
      try {
        landmarker = (await createHandLandmarker(false, true)).landmarker; delegate = 'CPU';
        post({ type: 'delegate', delegate, reason });
      } catch (e) { post({ type: 'error', message: `cpu rebuild: ${String(e)}`, fatal: true }); return; }
    }
    post({ type: 'error', id: msg.id, message: `detect: ${String(error)}`, fatal: false });
  } finally { bitmap.close(); }
};
