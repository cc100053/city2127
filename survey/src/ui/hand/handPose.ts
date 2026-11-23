// Hand pose and 住民登録 logic for the hand-controlled guest page (M3). DOM-free so the node tests run it.
// Times are milliseconds on the performance.now() clock; landmarks are MediaPipe's 21 normalized points.
import type { Landmark } from './handPointer.ts';

/**
 * palm = open hand facing the screen: it scans for 住民登録 and drives the cursor; rest = fist, lowered hand or no hand.
 * The index finger is not required, because it bends toward the thumb in a pinch.
 */
export type Pose = 'palm' | 'rest';

const FINGERS = { index: [5, 6, 8], middle: [9, 10, 12], ring: [13, 14, 16], pinky: [17, 18, 20] } as const;

/** A finger is extended when its tip is clearly farther from the wrist than its middle joint (PIP). */
export function fingerExtended(lm: Landmark[], [, pip, tip]: readonly [number, number, number], frameW = 640, frameH = 480, ratio = 1.15): boolean {
  const d = (a: Landmark, b: Landmark) => Math.hypot((a.x - b.x) * frameW, (a.y - b.y) * frameH);
  return d(lm[0], lm[tip]) > d(lm[0], lm[pip]) * ratio;
}

/**
 * Raw pose of one frame: open palm when at least two of middle/ring/pinky are extended. A palm centre below
 * `zoneBottom` (normalized camera y; the cursor's active zone ends at 0.8) counts as a lowered hand, i.e. rest.
 */
export function classifyPose(lm: Landmark[] | undefined, frameW = 640, frameH = 480, zoneBottom = 0.85): Pose {
  if (!lm) return 'rest';
  if ((lm[5].y + lm[9].y) / 2 > zoneBottom) return 'rest';
  const open = (['middle', 'ring', 'pinky'] as const).filter(f => fingerExtended(lm, FINGERS[f], frameW, frameH)).length;
  return open >= 2 ? 'palm' : 'rest';
}

/** Pose with hysteresis: a new raw pose must hold `holdMs` before it replaces the current one. */
export class PoseFilter {
  pose: Pose = 'rest';
  private candidate: Pose = 'rest';
  private since = 0;
  private readonly holdMs: number;
  constructor(holdMs = 150) { this.holdMs = holdMs; }
  reset() { this.pose = 'rest'; this.candidate = 'rest'; }
  update(raw: Pose, now: number): Pose {
    if (raw === this.pose) { this.candidate = raw; return this.pose; }
    if (raw !== this.candidate) { this.candidate = raw; this.since = now; }
    if (now - this.since >= this.holdMs) this.pose = raw;
    return this.pose;
  }
}

/** Read lock: targets of a freshly shown question stay inert for `ms` so the guest reads first. */
export class ReadLock {
  private until = 0;
  private readonly ms: number;
  constructor(ms = 1500) { this.ms = ms; }
  start(now: number) { this.until = now + this.ms; }
  clear() { this.until = 0; }
  locked(now: number) { return now < this.until; }
  /** 0..1 elapsed fraction of the current lock (1 when unlocked). */
  progress(now: number) { return this.locked(now) ? 1 - (this.until - now) / this.ms : 1; }
}

export type RegisterState = 'idle' | 'scanning' | 'pinch' | 'registered' | 'done';

/**
 * 住民登録 on the welcome screen: an open palm held for `scanMs` fills the ring (brief gaps up to `graceMs` are
 * tolerated, a longer loss drains it), then a pinch confirms; the resident number shows for `showMs`, after which
 * `update` reports 'done' once so the caller can start the session. A hand gone for `abandonMs` resets to idle.
 */
export class Registration {
  state: RegisterState = 'idle';
  progress = 0;
  private lastSeen = 0;
  private lastPalm = 0;
  private lastTick = 0;
  private shownAt = 0;
  private readonly scanMs: number;
  private readonly graceMs: number;
  private readonly showMs: number;
  private readonly abandonMs: number;
  constructor(scanMs = 1500, graceMs = 250, showMs = 1500, abandonMs = 4000) {
    this.scanMs = scanMs; this.graceMs = graceMs; this.showMs = showMs; this.abandonMs = abandonMs;
  }
  reset() { this.state = 'idle'; this.progress = 0; }
  /** One frame: the filtered pose, whether any hand is seen, and whether a pinch closed on this frame. */
  update(pose: Pose, handSeen: boolean, pinched: boolean, now: number): RegisterState {
    const dt = this.lastTick ? Math.min(100, now - this.lastTick) : 0;
    this.lastTick = now;
    if (handSeen) this.lastSeen = now;
    if (this.state === 'registered') {
      if (now - this.shownAt >= this.showMs) this.state = 'done';
      return this.state;
    }
    if (this.state === 'done') return this.state;
    if (this.state === 'pinch') {
      if (pinched) { this.state = 'registered'; this.shownAt = now; }
      else if (now - this.lastSeen > this.abandonMs) this.reset();
      return this.state;
    }
    if (pose === 'palm') {
      this.lastPalm = now;
      this.state = 'scanning';
      this.progress = Math.min(1, this.progress + dt / this.scanMs);
      if (this.progress >= 1 - 1e-9) { this.progress = 1; this.state = 'pinch'; }
    } else if (now - this.lastPalm > this.graceMs) {
      this.progress = Math.max(0, this.progress - dt / (this.scanMs / 2));
      if (this.progress === 0) this.state = 'idle';
    }
    return this.state;
  }
}

/**
 * Synthetic hand for tests and the DEV hook: palm centre (between index and middle MCP) at normalized camera point
 * (cx, cy); 'palm' = all fingers out, 'rest' = fist; `pinch` puts the thumb tip on the index tip.
 */
export function synthHand(cx: number, cy: number, pose: Pose, pinch = false): Landmark[] {
  const h: Landmark[] = Array.from({ length: 21 }, () => ({ x: cx, y: cy }));
  h[0] = { x: cx + 0.01, y: cy + 0.16 };
  const out = pose === 'palm';
  const finger = (base: number, dx: number) => {
    const mcp = { x: cx + dx, y: cy };
    h[base] = mcp;
    h[base + 1] = out ? { x: mcp.x, y: mcp.y - 0.06 } : { x: mcp.x, y: mcp.y - 0.035 };
    h[base + 2] = out ? { x: mcp.x, y: mcp.y - 0.11 } : { x: mcp.x, y: mcp.y - 0.02 };
    h[base + 3] = out ? { x: mcp.x, y: mcp.y - 0.16 } : { x: mcp.x, y: mcp.y + 0.01 };
  };
  finger(5, -0.0175); finger(9, 0.0175); finger(13, 0.05); finger(17, 0.08);
  h[1] = { x: cx - 0.06, y: cy + 0.12 }; h[2] = { x: cx - 0.09, y: cy + 0.08 }; h[3] = { x: cx - 0.11, y: cy + 0.04 };
  h[4] = pinch ? { ...h[8] } : { x: cx - 0.13, y: cy };
  return h;
}
