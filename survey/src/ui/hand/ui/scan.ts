// 住民登録 scan state for page 1 of the 住民の窓 hand UI. DOM-free so the node tests run it; times in ms.
// An open palm charges the ring over `scanMs` (24 mechanical steps); without one it drains in 700 ms after a short
// grace for tracking gaps. A full charge locks (amber) for `lockMs`, then releases the field membranes; 700 ms into
// the release the guest may pinch to register. A hand gone for `abandonMs` before registering starts over.

export type ScanPhase = 'idle' | 'charge' | 'lock' | 'release' | 'ready' | 'registered';
export const SCAN_STEPS = 24;
const DRAIN_MS = 700, READY_AFTER_MS = 700;

export class ScanCharge {
  phase: ScanPhase = 'idle';
  /** Charge 0..1. */
  f = 0;
  /** Time since the release began, or -1 before it. Keeps running after 'ready' for the release animation. */
  rt = -1;
  /** Time in the lock. */
  lockT = 0;
  private lastPalm = -Infinity;
  private lastSeen = -Infinity;

  /** One frame: `palm` = an open palm is raised, `seen` = any hand is tracked. */
  update(dt: number, palm: boolean, seen: boolean, now: number, scanMs: number, lockMs: number, graceMs = 200, abandonMs = 4000): ScanPhase {
    if (palm) this.lastPalm = now;
    if (seen) this.lastSeen = now;
    if (this.phase === 'idle' || this.phase === 'charge') {
      if (palm) this.f = Math.min(1, this.f + dt / scanMs);
      else if (now - this.lastPalm > graceMs) this.f = Math.max(0, this.f - dt / DRAIN_MS);
      this.phase = this.f > 0 ? 'charge' : 'idle';
      if (this.f >= 1) { this.phase = 'lock'; this.lockT = 0; }
      return this.phase;
    }
    if (this.phase === 'lock') {
      this.lockT += dt;
      if (this.lockT >= lockMs) { this.phase = 'release'; this.rt = 0; }
      return this.phase;
    }
    if (this.rt >= 0) this.rt += dt;
    if (this.phase === 'release' && this.rt > READY_AFTER_MS) this.phase = 'ready';
    if (this.phase === 'ready' && now - this.lastSeen > abandonMs) this.reset();
    return this.phase;
  }
  /** Mechanical step 0..SCAN_STEPS. */
  get step() { return Math.floor(this.f * SCAN_STEPS + 1e-6); }
  /** A pinch registers only once the release has opened the field. */
  pinch(): boolean {
    if (this.phase !== 'ready') return false;
    this.phase = 'registered';
    return true;
  }
  reset() { this.phase = 'idle'; this.f = 0; this.rt = -1; this.lockT = 0; }
}
