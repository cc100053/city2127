// Shared stage for the 住民の窓 hand UI: a fixed 1180x820 design canvas scaled to fit the viewport (letterboxed),
// the living background (grid, skyline, ring, motes, data rails), the HUD, the cursor, field membranes and the one
// rAF loop for every page. Everything that moves per frame moves by transform or opacity; layout is read only when
// a screen is built (rects are cached in stage pixels).
import './holo.css';
import type { Point } from '../handPointer.ts';
import { T } from './tune.ts';

export const W = 1180, H = 820;
/** Hologram palette shared by the pages. */
export const C = { teal: '#7fd6c4', tech: '#dff3ff', amber: '#e8b874', dim: '#3a4c4f', mute: '#8fa3a2', ink: '#0f1415' };

const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const RAIL_L = ['N35°37′', 'E139°46′', '27.4℃', '湿度61%', '風3m/s', '潮+1.2m', '環 3便', '船 運行', '声1,284', '提案 96', '電104%', '緑 48%'];
export const RAIL_R = ['ST-A', 'LINK', '30fps', '18ms', 'PALM', 'PINCH', 'DK07', 'RING', '160m', 'DR 42', 'TIDE', 'R0412'];
const OUTER_L = ['2127-11-23', '02:41:07', 'SECTOR 7', 'DAIBA-W', 'HUB 03', 'N35.6267', 'E139.7756', 'ALT 4.2m', 'QNH 1012', 'VIS 18km', 'UV 3', 'PM 4µg', 'CROWD 37%', 'RIDE 12min', 'FERRY 4/6', 'LIFT 2/2'];
const OUTER_R = ['CAM 60Hz', 'LM 21pt', 'CONF 0.97', 'LAT 33ms', 'GPU 41%', 'TEMP 38℃', 'FW 4.12', 'LINK OK', 'NODE 0412', 'SEQ 8821', 'KEY ●●●', 'HASH 7f3a', 'BUF 03', 'RES 1180', 'CH A-07', 'SIG -42dB'];
const RULER = ['000', '120', '240', '360', '480', '600', '720', '840', '960', '1080', '1200', '1320', '1440', '1560', '1680'];
const spans = (list: string[]) => list.map(t => `<span>${t}</span>`).join('');

function skyline() {
  const rnd = seeded(11);
  let svg = '';
  for (let x = 0; x < 2100;) {
    const w = 24 + rnd() * 60, h = 40 + rnd() * rnd() * (x < 400 || x > 1700 ? 320 : 230);
    svg += `<rect x="${x.toFixed(0)}" y="${(840 - h).toFixed(0)}" width="${(w - 6).toFixed(0)}" height="${h.toFixed(0)}" fill="rgba(127,214,196,${(0.04 + rnd() * 0.06).toFixed(3)})" stroke="rgba(127,214,196,.16)"/>`;
    x += w;
  }
  return `${svg}<line x1="0" y1="840" x2="2100" y2="840" stroke="rgba(127,214,196,.35)"/>`;
}
function motes() {
  const rnd = seeded(7);
  let svg = '';
  for (let i = 0; i < 64; i++) svg += `<circle cx="${(rnd() * 1800).toFixed(0)}" cy="${(rnd() * 1300).toFixed(0)}" r="${(1 + rnd() * 2.2).toFixed(1)}" fill="rgba(223,243,255,${(0.3 + rnd() * 0.5).toFixed(2)})"/>`;
  return svg;
}

export type StageFrame = {
  now: number;
  /** Frame time, ms (capped at 50). */
  dt: number;
  /** Palm cursor in stage pixels while an open palm controls; undefined at rest. */
  cursor?: Point;
  /** A tracked hand of any pose. */
  present: boolean;
  /** A pinch closed this frame at this stage point (the pointer's frozen position). */
  pinch?: Point;
  pinchClosed: boolean;
  /** Camera hand tracking runs (false = touch only). */
  tracking: boolean;
  /** Raw MediaPipe landmarks of the controlling hand (normalized camera space, not mirrored). */
  landmarks?: { x: number; y: number }[];
  frameW: number;
  frameH: number;
};

export class Stage {
  readonly root: HTMLElement;
  readonly el: HTMLElement;
  readonly world: HTMLElement;
  readonly motes: HTMLElement;
  readonly page: HTMLElement;
  readonly fx: HTMLElement;
  readonly cursor: HTMLElement;
  readonly spot: HTMLElement;
  readonly glow: HTMLElement;
  readonly gridHot: HTMLElement;
  readonly layers: Record<'grid' | 'far' | 'ring' | 'rails', HTMLElement>;
  readonly railSpans: HTMLElement[];
  readonly voiceSpan: HTMLElement;
  readonly hudLabel: HTMLElement;
  readonly dots: HTMLElement[];
  readonly pose: HTMLElement;
  /** The sent packet, handed from page 3 to page 4 (stage px, already on screen). */
  packet?: { el: HTMLElement; x: number; y: number; w: number; h: number };
  /** `住民 #0042` once registered (display only). */
  resident?: string;
  scale = 1;
  private offX = 0;
  private offY = 0;
  private raf = 0;
  private textScale = 1.4;
  private last = 0;
  private onFrame: (now: number, dt: number, real: number) => void = () => undefined;
  private fpsEl?: HTMLElement;
  private frameTimes: number[] = [];
  private fpsAt = 0;
  fpsExtra: () => string = () => '';

  constructor(station: string) {
    this.root = document.createElement('div');
    this.root.className = 'holo';
    this.root.hidden = true;
    this.root.innerHTML = `<div class="holo-stage">
  <div class="hs-world">
    <div class="hs-floor"><div class="hs-grid"><i></i></div><div class="hs-grid hs-grid--hot"><i></i></div></div>
    <svg class="hs-far" viewBox="0 0 2100 1340" preserveAspectRatio="none">${skyline()}</svg>
    <svg class="hs-ring" viewBox="0 0 1300 940"><g fill="none" stroke="rgba(223,243,255,.28)"><ellipse cx="860" cy="250" rx="300" ry="70" stroke-width="2"/><ellipse cx="860" cy="262" rx="286" ry="62" stroke-dasharray="3 9"/><line x1="600" y1="285" x2="600" y2="640" stroke="rgba(223,243,255,.12)"/><line x1="1120" y1="285" x2="1120" y2="640" stroke="rgba(223,243,255,.12)"/></g></svg>
    <div class="hs-rails"><div class="hs-rail hs-rail--l">${spans(RAIL_L)}</div><div class="hs-rail hs-rail--r">${spans(RAIL_R)}</div></div>
    <div class="hs-rail hs-rail--ol">${spans(OUTER_L)}</div><div class="hs-rail hs-rail--or">${spans(OUTER_R)}</div>
    <div class="hs-ruler hs-ruler--t">${spans(RULER)}</div><div class="hs-ruler hs-ruler--b">${spans(RULER)}</div>
    <div class="hs-vrule hs-vrule--l"></div><div class="hs-vrule hs-vrule--r"></div>
    <i class="hs-corner hs-corner--tl"></i><i class="hs-corner hs-corner--tr"></i><i class="hs-corner hs-corner--bl"></i><i class="hs-corner hs-corner--br"></i>
    <div class="hs-hud"><b>2127 / ODAIBA</b><span class="hs-hud-label">住民の声</span><span class="hs-sp"></span>
      <span class="hs-dots">${'<i><b></b></i>'.repeat(4)}</span><span class="hs-pose"><i></i><span></span></span><span>${station}</span></div>
  </div>
  <div class="hs-motes"><svg viewBox="0 0 1800 1300">${motes()}</svg></div>
  <div class="hs-glow"></div>
  <div class="hs-spot"></div>
  <div class="hs-page"></div>
  <div class="hs-fx"></div>
  <div class="hs-cursor"></div>
</div>`;
    document.body.append(this.root);
    const q = <T extends HTMLElement>(s: string) => this.root.querySelector<T>(s)!;
    this.el = q('.holo-stage'); this.world = q('.hs-world'); this.motes = q('.hs-motes'); this.page = q('.hs-page'); this.fx = q('.hs-fx');
    this.cursor = q('.hs-cursor'); this.spot = q('.hs-spot'); this.glow = q('.hs-glow'); this.gridHot = q('.hs-grid--hot');
    this.layers = { grid: q('.hs-floor'), far: q('.hs-far'), ring: q('.hs-ring'), rails: q('.hs-rails') };
    this.railSpans = Array.from(this.root.querySelectorAll<HTMLElement>('.hs-rails span'));
    this.voiceSpan = this.railSpans[8];
    this.hudLabel = q('.hs-hud-label');
    this.dots = Array.from(this.root.querySelectorAll<HTMLElement>('.hs-dots i'));
    this.pose = q('.hs-pose');
    this.fit();
    addEventListener('resize', () => this.fit());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.run(); else this.stop(); });
  }

  fit() {
    const vw = innerWidth, vh = innerHeight;
    this.scale = Math.min(vw / W, vh / H);
    this.offX = (vw - W * this.scale) / 2; this.offY = (vh - H * this.scale) / 2;
    this.el.style.transform = `translate(${this.offX}px,${this.offY}px) scale(${this.scale})`;
  }
  /** Viewport point → stage pixels. */
  toStage(p: Point): Point { return { x: (p.x - this.offX) / this.scale, y: (p.y - this.offY) / this.scale }; }
  /** An element's layout box in stage pixels (offsets ignore transforms, so tilts and scales never skew it). */
  rect(el: HTMLElement) {
    let x = 0, y = 0;
    for (let node: HTMLElement | null = el; node && node !== this.el; node = node.offsetParent as HTMLElement | null) { x += node.offsetLeft; y += node.offsetTop; }
    return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight, w: el.offsetWidth, h: el.offsetHeight };
  }

  show(on: boolean) { if (this.root.hidden === on) { this.root.hidden = !on; if (on) this.fit(); } }
  get shown() { return !this.root.hidden; }

  /** Start the single rAF loop; paused while the document is hidden. */
  start(onFrame: (now: number, dt: number, real: number) => void) { this.onFrame = onFrame; this.run(); }
  private run() {
    if (this.raf || document.visibilityState === 'hidden') return;
    this.last = performance.now();
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick);
      const real = now - this.last;
      this.last = now;
      if (this.fpsEl) this.meter(now, real);
      if (T.textScale !== this.textScale) { this.textScale = T.textScale; this.root.style.setProperty('--ts', String(T.textScale / 1.4)); }
      this.onFrame(now, Math.min(50, real), real);
    };
    this.raf = requestAnimationFrame(tick);
  }
  private stop() { cancelAnimationFrame(this.raf); this.raf = 0; }

  /** `&fps`: render fps and p95 frame time over the last second. */
  enableFps() { this.fpsEl = document.createElement('div'); this.fpsEl.className = 'holo-fps'; this.root.append(this.fpsEl); }
  private meter(now: number, real: number) {
    this.frameTimes.push(real);
    if (now - this.fpsAt < 1000) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    this.fpsEl!.textContent = `${(this.frameTimes.length * 1000 / (now - this.fpsAt)).toFixed(0)} fps · p95 ${p95.toFixed(1)} ms${this.fpsExtra()}`;
    this.frameTimes = []; this.fpsAt = now;
  }

  // ---- HUD ------------------------------------------------------------------------------------------------
  private poseOn: boolean | undefined;
  setPose(controlling: boolean) {
    if (this.poseOn === controlling) return;
    this.poseOn = controlling;
    this.pose.classList.toggle('is-on', controlling);
    this.pose.lastElementChild!.textContent = controlling ? '手のひらで操作中' : '休止中 — 手のひらを向けると操作';
  }
  /** Progress slots: done answers show `Q02·A`, `now` marks the current question. */
  setDots(slots: { id: string; letter?: string }[], now: number) {
    this.dots.forEach((dot, i) => {
      const slot = slots[i];
      dot.hidden = !slot;
      dot.className = slot?.letter ? 'done' : i === now ? 'now' : '';
      dot.firstElementChild!.textContent = slot?.letter ? `${slot.id}·${slot.letter}` : '';
    });
  }

  // ---- cursor ---------------------------------------------------------------------------------------------
  private cursorState = '';
  setCursor(p: Point | undefined, state: '' | 'over' | 'pinch' = '') {
    const key = p ? state : 'gone';
    if (key !== this.cursorState) { this.cursor.className = `hs-cursor${p ? (state ? ` is-${state}` : '') : ' is-gone'}`; this.cursorState = key; }
    if (p) this.cursor.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
  }

  /** Thin field membranes from a point (page 2 style): rings scale out, the floor grid and glow flash once. */
  membrane(cx: number, cy: number, base: number, rings: number, ms: number) {
    for (let k = 0; k < rings; k++) {
      const ring = document.createElement('div');
      ring.className = 'hs-membrane';
      ring.style.width = ring.style.height = `${base}px`;
      this.fx.append(ring);
      const at = `translate(${cx - base / 2}px,${cy - base / 2}px)`;
      ring.animate([{ transform: `${at} scale(.55)`, opacity: 0 }, { opacity: 0.95, offset: 0.08 }, { transform: `${at} scale(${2600 / base})`, opacity: 0 }],
        { duration: ms, delay: k * 90, easing: 'cubic-bezier(.15,.6,.3,1)', fill: 'both' }).finished.then(() => ring.remove(), () => ring.remove());
    }
    this.glow.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: ms });
    this.gridHot.animate([{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], { duration: ms });
  }
}
