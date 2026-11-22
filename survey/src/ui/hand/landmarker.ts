// Shared HandLandmarker construction for the worker and the main-thread fallback (self-hosted runtime under /hand/).
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export const HAND_WASM_BASE = '/hand/wasm';
export const HAND_MODEL_PATH = '/hand/hand_landmarker.task';
export type Delegate = 'GPU' | 'CPU';

let fileset: Promise<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>> | undefined;

/**
 * Creates a VIDEO-mode landmarker for `numHands` hands (1 skips palm detection while a hand is tracked). `preferGpu` tries the GPU delegate first and falls back to CPU;
 * `useModule` loads the ES-module wasm loader, which a module worker needs (it has no classic importScripts).
 */
export async function createHandLandmarker(preferGpu: boolean, useModule: boolean, numHands = 1): Promise<{ landmarker: HandLandmarker; delegate: Delegate; gpuError?: string }> {
  fileset ??= FilesetResolver.forVisionTasks(HAND_WASM_BASE, useModule);
  const files = await fileset;
  const make = (delegate: Delegate) => HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: HAND_MODEL_PATH, delegate },
    runningMode: 'VIDEO', numHands,
    minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  });
  let gpuError: string | undefined;
  if (preferGpu) {
    try { return { landmarker: await make('GPU'), delegate: 'GPU' }; }
    catch (error) { gpuError = String(error).slice(0, 120); }
  }
  return { landmarker: await make('CPU'), delegate: 'CPU', ...(gpuError ? { gpuError } : {}) };
}
