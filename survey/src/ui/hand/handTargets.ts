// Hand-control targeting for the guest page (M2): DOM-free so the node tests run it directly.
// Times are milliseconds on the performance.now() clock.
import type { Point } from './handPointer.ts';

export type Box = { left: number; top: number; right: number; bottom: number };

/** Distance from a point to a box (0 inside). */
export function boxDistance(p: Point, b: Box): number {
  const dx = Math.max(b.left - p.x, 0, p.x - b.right), dy = Math.max(b.top - p.y, 0, p.y - b.bottom);
  return Math.hypot(dx, dy);
}

/** Magnetic snap: index of the box containing the point, else the nearest within `radius`, else -1. */
export function nearestBox(p: Point, boxes: Box[], radius: number): number {
  let best = -1, bestDistance = radius;
  for (let i = 0; i < boxes.length; i++) {
    const d = boxDistance(p, boxes[i]);
    if (d === 0) return i;
    if (d <= bestDistance) { best = i; bestDistance = d; }
  }
  return best;
}

const PENDING = Symbol('pending');

/**
 * Dwell/pinch arming over arbitrary targets (compared by identity). Dwelling `dwellMs` on a target or pinching
 * it fires it once; every target then waits `cooldownMs`, and the fired target re-arms only after the cursor
 * leaves it. `blockUntilLeave()` (call it when the screen changes) blocks whatever target the cursor is on next,
 * so a button that a new screen puts under a still cursor never fires by itself.
 */
export class TargetGate<T> {
  private target: T | null = null;
  private since = 0;
  private cooldownUntil = 0;
  private blocked: T | null | typeof PENDING = null;
  private readonly dwellMs: number;
  private readonly cooldownMs: number;
  constructor(dwellMs = 1000, cooldownMs = 600) { this.dwellMs = dwellMs; this.cooldownMs = cooldownMs; }

  /** Target under the cursor this frame (null = none); returns the target fired by dwell, or null. */
  hover(target: T | null, now: number): T | null {
    if (this.blocked === PENDING) this.blocked = target;
    else if (this.blocked !== null && target !== this.blocked) this.blocked = null;
    if (target !== this.target) { this.target = target; this.since = now; }
    if (!this.armed(now)) { this.since = now; return null; }
    return now - this.since >= this.dwellMs ? this.fire(now) : null;
  }
  /** A pinch closed on `target`: fires it at once when armed. */
  pinch(target: T | null, now: number): T | null {
    if (target === null || now < this.cooldownUntil || target === this.blocked || this.blocked === PENDING) return null;
    this.target = target;
    return this.fire(now);
  }
  /** Dwell progress 0..1 on the current target. */
  progress(now: number): number { return this.armed(now) ? Math.min(1, (now - this.since) / this.dwellMs) : 0; }
  get current(): T | null { return this.target; }
  blockUntilLeave() { this.blocked = PENDING; }
  private armed(now: number) { return this.target !== null && now >= this.cooldownUntil && this.target !== this.blocked; }
  private fire(now: number): T {
    const fired = this.target as T;
    this.cooldownUntil = now + this.cooldownMs; this.blocked = fired; this.since = now;
    return fired;
  }
}

/**
 * Hand-mode auto-advance: after a hand chooses an option, the choice stays visible for `delayMs`, then the
 * question form submits. It is cancelled when the screen (question) changes or another choice replaces it.
 */
export class AutoAdvance {
  private pending?: { at: number; screen: string };
  private readonly delayMs: number;
  constructor(delayMs = 800) { this.delayMs = delayMs; }
  schedule(screen: string, now: number) { this.pending = { at: now + this.delayMs, screen }; }
  cancel() { this.pending = undefined; }
  get scheduled() { return this.pending !== undefined; }
  /** True once, when the delay has passed on the same screen. */
  due(screen: string, now: number): boolean {
    if (!this.pending) return false;
    if (this.pending.screen !== screen) { this.pending = undefined; return false; }
    if (now < this.pending.at) return false;
    this.pending = undefined;
    return true;
  }
}
