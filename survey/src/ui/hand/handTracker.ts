// Main-thread side of hand tracking (M1). Pumps camera frames to the HandLandmarker worker, one frame in flight
// (frames arriving while the worker is busy are dropped), and falls back to throttled main-thread inference when
// the worker cannot start, produces no result within 3 s, stalls or crashes.
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { createHandLandmarker, type Delegate } from './landmarker.ts';
import type { WorkerIn, WorkerOut } from './handWorker.ts';
import type { Landmark } from './handPointer.ts';

export type TrackerPath = 'auto' | 'worker' | 'main';
export type TrackerMode = 'starting' | 'worker-gpu' | 'worker-cpu' | 'main-gpu' | 'main-cpu' | 'failed';
export type HandFrame = { t: number; landmarks: Landmark[][]; width: number; height: number };
export type TrackerOptions = {
  path?: TrackerPath;
  preferGpu?: boolean;
  /** Drive frames from requestVideoFrameCallback when the browser has it (else a currentTime check per rAF). */
  useVfc?: boolean;
  /** Main-thread fallback only: render frames that must pass after an inference before the next one while a hand is seen. */
  mainGapFrames?: number;
  onResult: (frame: HandFrame) => void;
  onError?: (message: string) => void;
};

const READY_TIMEOUT_MS = 20_000, FIRST_RESULT_MS = 3000, STALL_MS = 2000, SAMPLES = 300;
const push = (list: number[], v: number) => { list.push(v); if (list.length > SAMPLES) list.shift(); };

export class HandTracker {
  mode: TrackerMode = 'starting';
  fallbackReason = '';
  framesSent = 0;
  framesDropped = 0;
  results = 0;
  readonly inferMs: number[] = [];
  readonly roundTripMs: number[] = [];
  /** Set by the caller each result: whether a hand is currently controlling the cursor (throttles main mode). */
  handPresent = false;
  useVfc: boolean;

  private readonly video: HTMLVideoElement;
  private readonly opts: Required<Omit<TrackerOptions, 'onError'>> & Pick<TrackerOptions, 'onError'>;
  private worker?: Worker;
  private main?: HandLandmarker;
  private mainDelegate: Delegate = 'CPU';
  private inFlight?: { id: number; sentAt: number };
  private nextId = 1;
  private running = false;
  private vfcId = 0;
  private rafId = 0;
  private rafCount = 0;
  private rafAtLastInfer = -Infinity;
  private lastVideoTime = -1;
  private firstSentAt = 0;
  private bitmapFailures = 0;
  private switching = false;
  private vfcCalls = 0;
  private startedAt = 0;

  constructor(video: HTMLVideoElement, options: TrackerOptions) {
    this.video = video;
    this.opts = { path: 'auto', preferGpu: true, useVfc: true, mainGapFrames: 3, ...options };
    this.useVfc = this.opts.useVfc && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  }

  get isWorker() { return this.mode === 'worker-gpu' || this.mode === 'worker-cpu'; }

  /** Loads the model on the chosen path. Resolves once inference is possible; rejects only if every path failed. */
  async init(): Promise<void> {
    if (this.opts.path !== 'main') {
      try { await this.startWorker(); return; }
      catch (error) {
        this.worker?.terminate(); this.worker = undefined;
        if (this.opts.path === 'worker') { this.mode = 'failed'; throw error; }
        this.fallbackReason = `worker start: ${String(error).slice(0, 100)}`;
      }
    }
    await this.startMain();
  }

  start() {
    if (this.running) return;
    this.running = true; this.inFlight = undefined; this.lastVideoTime = -1; this.firstSentAt = 0;
    this.vfcCalls = 0; this.startedAt = performance.now();
    this.rafId = requestAnimationFrame(this.onRaf);
    if (this.useVfc) this.vfcId = this.video.requestVideoFrameCallback(this.onVideoFrame);
  }

  pause() {
    this.running = false; this.inFlight = undefined;
    cancelAnimationFrame(this.rafId);
    if (this.useVfc) this.video.cancelVideoFrameCallback(this.vfcId);
  }

  dispose() { this.pause(); this.worker?.terminate(); this.worker = undefined; this.main?.close(); this.main = undefined; }

  // ---- worker path ------------------------------------------------------------------------------------------
  private startWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./handWorker.ts', import.meta.url), { type: 'module' });
      this.worker = worker;
      const timer = setTimeout(() => reject(new Error(`no ready within ${READY_TIMEOUT_MS / 1000} s`)), READY_TIMEOUT_MS);
      let ready = false;
      worker.onerror = event => {
        event.preventDefault();
        const message = event.message || 'worker error';
        if (!ready) { clearTimeout(timer); reject(new Error(message)); }
        else this.workerFailed(`worker crashed: ${message}`);
      };
      worker.onmessage = (event: MessageEvent<WorkerOut>) => {
        const msg = event.data;
        if (msg.type === 'ready') {
          ready = true; clearTimeout(timer);
          this.mode = msg.delegate === 'GPU' ? 'worker-gpu' : 'worker-cpu';
          if (msg.gpuError) this.fallbackReason = `worker GPU→CPU: ${msg.gpuError}`;
          resolve();
        } else if (msg.type === 'result') this.onWorkerResult(msg);
        else if (msg.type === 'delegate') { this.mode = 'worker-cpu'; this.fallbackReason = `worker GPU→CPU at runtime: ${msg.reason}`; this.opts.onError?.(this.fallbackReason); }
        else if (msg.type === 'error') {
          if (!ready) { clearTimeout(timer); reject(new Error(msg.message)); return; }
          if (msg.fatal) { this.workerFailed(msg.message); return; }
          if (msg.id === this.inFlight?.id) this.inFlight = undefined;
          this.opts.onError?.(msg.message);
        }
      };
      worker.postMessage({ type: 'init', preferGpu: this.opts.preferGpu } satisfies WorkerIn);
    });
  }

  private onWorkerResult(msg: Extract<WorkerOut, { type: 'result' }>) {
    if (!this.inFlight || msg.id !== this.inFlight.id) return; // stale (paused or restarted meanwhile)
    push(this.roundTripMs, performance.now() - this.inFlight.sentAt);
    push(this.inferMs, msg.inferMs);
    this.inFlight = undefined; this.results++;
    this.opts.onResult({ t: msg.t, landmarks: msg.landmarks, width: msg.width, height: msg.height });
  }

  private sendToWorker(now: number) {
    if (this.inFlight) {
      if (now - this.inFlight.sentAt > STALL_MS) { this.workerFailed(`worker stalled > ${STALL_MS} ms`); return; }
      this.framesDropped++; return;
    }
    if (!this.firstSentAt) this.firstSentAt = now;
    else if (this.results === 0 && now - this.firstSentAt > FIRST_RESULT_MS) { this.workerFailed(`no worker result within ${FIRST_RESULT_MS / 1000} s`); return; }
    const id = this.nextId++, worker = this.worker!;
    this.inFlight = { id, sentAt: now };
    this.framesSent++;
    createImageBitmap(this.video).then(bitmap => {
      if (this.inFlight?.id !== id || this.worker !== worker) { bitmap.close(); return; }
      this.bitmapFailures = 0;
      worker.postMessage({ type: 'frame', id, t: now, bitmap } satisfies WorkerIn, [bitmap]);
    }).catch(error => {
      if (this.inFlight?.id === id) this.inFlight = undefined;
      if (++this.bitmapFailures >= 5) this.workerFailed(`createImageBitmap: ${String(error).slice(0, 80)}`);
    });
  }

  private workerFailed(reason: string) {
    this.opts.onError?.(reason);
    if (this.opts.path === 'worker') { this.inFlight = undefined; this.firstSentAt = 0; return; } // forced: keep retrying
    this.worker?.terminate(); this.worker = undefined; this.inFlight = undefined;
    this.fallbackReason = reason;
    void this.startMain().catch(error => { this.mode = 'failed'; this.opts.onError?.(`main start: ${String(error)}`); });
  }

  // ---- main-thread path -------------------------------------------------------------------------------------
  private async startMain() {
    if (this.switching) return;
    this.switching = true; this.mode = 'starting';
    try {
      const made = await createHandLandmarker(this.opts.preferGpu, false);
      this.main = made.landmarker; this.mainDelegate = made.delegate;
      this.mode = made.delegate === 'GPU' ? 'main-gpu' : 'main-cpu';
      if (made.gpuError) this.fallbackReason = [this.fallbackReason, `main GPU→CPU: ${made.gpuError}`].filter(Boolean).join('; ');
    } finally { this.switching = false; }
  }

  private inferMain(now: number) {
    // Throttle: with a hand in view, leave `mainGapFrames` render frames free after each blocking inference.
    if (this.handPresent && this.rafCount - this.rafAtLastInfer < this.opts.mainGapFrames) { this.framesDropped++; return; }
    const t0 = performance.now();
    try {
      const result = this.main!.detectForVideo(this.video, t0);
      const ms = performance.now() - t0;
      push(this.inferMs, ms); push(this.roundTripMs, ms);
      this.results++; this.framesSent++; this.rafAtLastInfer = this.rafCount;
      this.opts.onResult({ t: now, landmarks: result.landmarks, width: this.video.videoWidth, height: this.video.videoHeight });
    } catch (error) {
      this.opts.onError?.(`main detect: ${String(error).slice(0, 100)}`);
      if (this.mainDelegate === 'GPU' && !this.switching) {
        this.main?.close(); this.main = undefined; this.switching = true; this.mode = 'starting';
        createHandLandmarker(false, false).then(made => { this.main = made.landmarker; this.mainDelegate = 'CPU'; this.mode = 'main-cpu'; this.fallbackReason = [this.fallbackReason, 'main GPU→CPU at runtime'].filter(Boolean).join('; '); })
          .catch(e => { this.mode = 'failed'; this.opts.onError?.(`main cpu: ${String(e)}`); })
          .finally(() => { this.switching = false; });
      }
    }
  }

  // ---- frame pump -------------------------------------------------------------------------------------------
  private onFrame(now: number) {
    if (this.video.readyState < 2) return;
    if (this.isWorker && this.worker) this.sendToWorker(now);
    else if (this.main && !this.switching) this.inferMain(now);
  }
  private onVideoFrame = () => {
    if (!this.running) return;
    this.vfcId = this.video.requestVideoFrameCallback(this.onVideoFrame);
    this.vfcCalls++;
    this.onFrame(performance.now());
  };
  private onRaf = () => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.onRaf);
    this.rafCount++;
    // Watchdog: if requestVideoFrameCallback never fires for the hidden video, pump from rAF instead.
    if (this.useVfc && this.vfcCalls === 0 && this.video.currentTime > 0 && performance.now() - this.startedAt > 2000) {
      this.useVfc = false; this.video.cancelVideoFrameCallback(this.vfcId);
      this.opts.onError?.('no video-frame callbacks in 2 s, switched to rAF');
    }
    if (!this.useVfc && this.video.currentTime !== this.lastVideoTime) { this.lastVideoTime = this.video.currentTime; this.onFrame(performance.now()); }
  };
}
