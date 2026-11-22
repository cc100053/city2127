// Hand pointer logic (M1): turns HandLandmarker results into a screen cursor, pinch edges and dwell selection.
// DOM-free so the node tests run it directly; times are milliseconds on the performance.now() clock.

export type Point = { x: number; y: number };
export type Landmark = { x: number; y: number; z?: number };

/** One-Euro filter (Casiez et al. 2012) for one coordinate; t in seconds. */
export class OneEuro {
  private x?: number;
  private dx = 0;
  private t?: number;
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  constructor(minCutoff = 1.0, beta = 0.01, dCutoff = 1.0) { this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff; }
  reset() { this.x = undefined; this.t = undefined; this.dx = 0; }
  filter(value: number, t: number): number {
    if (this.x === undefined || this.t === undefined || t <= this.t) { this.x = value; this.t = t; this.dx = 0; return value; }
    const dt = t - this.t;
    const alpha = (cutoff: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
    const rawDx = (value - this.x) / dt;
    this.dx += alpha(this.dCutoff) * (rawDx - this.dx);
    this.x += alpha(this.minCutoff + this.beta * Math.abs(this.dx)) * (value - this.x);
    this.t = t;
    return this.x;
  }
}

export type HandBox = { area: number; cx: number; cy: number };

export function handBox(landmarks: Landmark[]): HandBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of landmarks) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  return { area: (maxX - minX) * (maxY - minY), cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/**
 * Sticky choice of the controlling hand: the hand nearest the previous one keeps control unless another is
 * `stealRatio` larger by bounding-box area; with no previous hand (or it vanished) the largest hand wins.
 */
export function pickHand(boxes: HandBox[], previous: HandBox | undefined, stealRatio = 1.3, matchDistance = 0.2): number {
  if (!boxes.length) return -1;
  let largest = 0;
  for (let i = 1; i < boxes.length; i++) if (boxes[i].area > boxes[largest].area) largest = i;
  if (!previous) return largest;
  let kept = -1, best = matchDistance;
  boxes.forEach((b, i) => { const d = Math.hypot(b.cx - previous.cx, b.cy - previous.cy); if (d < best) { best = d; kept = i; } });
  if (kept < 0) return largest;
  return largest !== kept && boxes[largest].area > boxes[kept].area * stealRatio ? largest : kept;
}

/** Maps the mirrored index fingertip from the central active zone of the camera frame to screen pixels. */
export function zoneToScreen(tip: Landmark, width: number, height: number, zone = 0.6): Point {
  const margin = (1 - zone) / 2, clamp = (v: number) => Math.min(1, Math.max(0, v));
  return { x: clamp((1 - tip.x - margin) / zone) * width, y: clamp((tip.y - margin) / zone) * height };
}

/** Thumb-tip to index-tip distance over palm size (wrist to middle-finger MCP), in camera pixels. */
export function pinchRatio(lm: Landmark[], frameW = 640, frameH = 480): number {
  const d = (a: Landmark, b: Landmark) => Math.hypot((a.x - b.x) * frameW, (a.y - b.y) * frameH);
  const palm = d(lm[0], lm[9]);
  return palm > 0 ? d(lm[4], lm[8]) / palm : Infinity;
}

/** Pinch with hysteresis: closes below `on`, opens above `off`. Returns true on the closing edge only. */
export class Pinch {
  closed = false;
  private readonly on: number;
  private readonly off: number;
  constructor(on = 0.25, off = 0.4) { this.on = on; this.off = off; }
  reset() { this.closed = false; }
  update(ratio: number): boolean {
    if (!this.closed && ratio < this.on) { this.closed = true; return true; }
    if (this.closed && ratio > this.off) this.closed = false;
    return false;
  }
}

/** Timestamped cursor positions; `at(t)` returns the newest sample not after t (the oldest if none is). */
export class History {
  private samples: { t: number; p: Point }[] = [];
  private readonly keepMs: number;
  constructor(keepMs = 500) { this.keepMs = keepMs; }
  clear() { this.samples = []; }
  push(t: number, p: Point) {
    this.samples.push({ t, p });
    while (this.samples.length > 2 && this.samples[0].t < t - this.keepMs) this.samples.shift();
  }
  at(t: number): Point | undefined {
    for (let i = this.samples.length - 1; i >= 0; i--) if (this.samples[i].t <= t) return this.samples[i].p;
    return this.samples[0]?.p;
  }
}

export function percentile(values: number[], q: number): number {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
}

/**
 * Dwell/pinch selection gate. A card arms once the cursor is on it; dwelling `dwellMs` or a pinch selects it.
 * After a select every card waits `cooldownMs`, and the selected card re-arms only after the cursor leaves it.
 */
export class SelectGate {
  private card = -1;
  private since = 0;
  private cooldownUntil = 0;
  private blocked = -1;
  private readonly dwellMs: number;
  private readonly cooldownMs: number;
  constructor(dwellMs = 1000, cooldownMs = 600) { this.dwellMs = dwellMs; this.cooldownMs = cooldownMs; }
  /** Feeds the hovered card (-1 = none); returns the card selected by dwell, or -1. */
  hover(card: number, now: number): number {
    if (card !== this.blocked) this.blocked = -1;
    if (card !== this.card) { this.card = card; this.since = now; }
    if (!this.armed(now)) { this.since = now; return -1; }
    if (now - this.since >= this.dwellMs) return this.select(card, now);
    return -1;
  }
  /** Dwell progress 0..1 for the hovered card. */
  progress(now: number): number { return this.armed(now) ? Math.min(1, (now - this.since) / this.dwellMs) : 0; }
  /** Pinch on a card: selects at once if that card is armed. */
  pinch(card: number, now: number): number {
    if (card < 0 || now < this.cooldownUntil || card === this.blocked) return -1;
    return this.select(card, now);
  }
  private armed(now: number) { return this.card >= 0 && now >= this.cooldownUntil && this.card !== this.blocked; }
  private select(card: number, now: number) {
    this.cooldownUntil = now + this.cooldownMs; this.blocked = card; this.since = now;
    return card;
  }
}

/**
 * Display-rate cursor: landmark updates arrive at 15-30 Hz and some tens of ms late, so the render loop
 * extrapolates the last filtered sample along its velocity. The look-ahead cap is fixed when a number is given;
 * 'auto' adapts it to 1.2x the measured update interval (EMA), at most `autoMaxMs`, so the cursor keeps moving
 * until the next update instead of stopping and jumping.
 */
export class Predictor {
  private last?: { t: number; p: Point };
  private v: Point = { x: 0, y: 0 };
  private interval?: number;
  private readonly fixed?: number;
  private readonly autoMaxMs: number;
  constructor(maxAheadMs: number | 'auto' = 'auto', autoMaxMs = 80) {
    if (maxAheadMs !== 'auto') this.fixed = maxAheadMs;
    this.autoMaxMs = autoMaxMs;
  }
  /** Current look-ahead cap in ms. */
  get cap(): number { return this.fixed ?? Math.min(this.autoMaxMs, 1.2 * (this.interval ?? 33)); }
  /** Measured update interval in ms (EMA), undefined before two close updates. */
  get updateInterval(): number | undefined { return this.interval; }
  clear() { this.last = undefined; this.v = { x: 0, y: 0 }; }
  push(t: number, p: Point) {
    if (this.last && t > this.last.t) {
      const dt = t - this.last.t;
      if (dt < 200) {
        this.v = { x: (p.x - this.last.p.x) / dt, y: (p.y - this.last.p.y) / dt };
        this.interval = this.interval === undefined ? dt : this.interval + 0.1 * (dt - this.interval);
      } else this.v = { x: 0, y: 0 };
    } else if (!this.last) this.v = { x: 0, y: 0 };
    this.last = { t, p };
  }
  at(now: number): Point | undefined {
    if (!this.last) return undefined;
    const ahead = Math.min(this.cap, Math.max(0, now - this.last.t));
    return { x: this.last.p.x + this.v.x * ahead, y: this.last.p.y + this.v.y * ahead };
  }
}

export type PointerOptions = { minCutoff?: number; beta?: number; predictMs?: number | 'auto'; pinchLookbackMs?: number; zone?: number };
export type PointerUpdate = {
  /** The controlling hand's landmarks, undefined when no hand is seen. */
  landmarks?: Landmark[];
  /** True on the frame the controlling hand disappears. */
  lost: boolean;
  /** Screen point to select at when a pinch closes on this frame (the cursor ~100 ms earlier). */
  pinchAt?: Point;
  pinchRatio: number;
};

/**
 * One controlling hand turned into a cursor: sticky largest hand, mirrored active-zone mapping, One-Euro
 * smoothing, pinch with hysteresis (cursor frozen while closed) and display-rate prediction.
 */
export class HandPointer {
  private readonly fx: OneEuro;
  private readonly fy: OneEuro;
  private readonly history = new History();
  readonly predictor: Predictor;
  readonly pinch = new Pinch();
  private readonly lookback: number;
  private readonly zone: number;
  private prevBox?: HandBox;
  private frozen?: Point;
  present = false;
  constructor(options: PointerOptions = {}) {
    this.fx = new OneEuro(options.minCutoff ?? 1.0, options.beta ?? 0.01);
    this.fy = new OneEuro(options.minCutoff ?? 1.0, options.beta ?? 0.01);
    this.predictor = new Predictor(options.predictMs ?? 'auto');
    this.lookback = options.pinchLookbackMs ?? 100;
    this.zone = options.zone ?? 0.6;
  }
  reset() {
    this.present = false; this.prevBox = undefined; this.frozen = undefined;
    this.fx.reset(); this.fy.reset(); this.history.clear(); this.predictor.clear(); this.pinch.reset();
  }
  /** Feeds one inference result captured at `t` (ms). */
  update(hands: Landmark[][], t: number, screenW: number, screenH: number, frameW = 640, frameH = 480): PointerUpdate {
    if (!hands.length) {
      const lost = this.present;
      this.reset();
      return { lost, pinchRatio: NaN };
    }
    this.present = true;
    const boxes = hands.map(handBox), pick = pickHand(boxes, this.prevBox);
    const lm = hands[pick];
    this.prevBox = boxes[pick];
    const raw = zoneToScreen(lm[8], screenW, screenH, this.zone);
    const p = { x: this.fx.filter(raw.x, t / 1000), y: this.fy.filter(raw.y, t / 1000) };
    this.history.push(t, p);
    this.predictor.push(t, p);
    const ratio = pinchRatio(lm, frameW, frameH);
    let pinchAt: Point | undefined;
    if (this.pinch.update(ratio)) pinchAt = this.frozen = this.history.at(t - this.lookback) ?? p;
    if (!this.pinch.closed) this.frozen = undefined;
    return { landmarks: lm, lost: false, pinchAt, pinchRatio: ratio };
  }
  /** Cursor for a render frame at `now`: frozen while pinched, otherwise predicted; undefined without a hand. */
  cursorAt(now: number): Point | undefined {
    if (!this.present) return undefined;
    return this.frozen ?? this.predictor.at(now);
  }
}
