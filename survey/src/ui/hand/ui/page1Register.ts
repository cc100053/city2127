// 住民の窓 page 1: 住民登録. An open palm charges the scanner for 4 s: the whole screen pulls toward the ring, city
// data flies into the core, the guest's own hand (mirrored MediaPipe landmarks) lights up joint by joint with
// biometric readouts, and the rings tighten in 24 mechanical steps. Lock (amber), three field membranes release
// the screen, then つまんで登録 → pinch → 住民番号 (head count + 1, display only) → the page's own はじめる.
import type { Landmark } from '../handPointer.ts';
import { ScanCharge, SCAN_STEPS, type ScanPhase } from './scan.ts';
import { C, H, W, type Stage, type StageFrame } from './stage.ts';
import { T } from './tune.ts';
import type { HandView } from './types.ts';

const CX = 320, CY = 410, K = 1.8333 * 1.3, CORE = 64 * K;
const SHOW_NUMBER_MS = 1500;
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
/** Joint level 0 (wrist) .. 4 (tips): a joint lights when the charge passes level / 5. */
const level = (i: number) => i === 0 ? 0 : (i - 1) % 4 + 1;
const READ = [0, 4, 8, 12, 16, 20], NAMES = ['WRIST', 'THUMB', 'INDEX', 'MID', 'RING', 'PINKY'];
/** Readout label anchors around the core (stage px), for a thumb on the right; mirrored for a thumb on the left. */
const LS = [[-165, 70], [165, 40], [150, -140], [25, -200], [-135, -175], [-170, -90]];
const DATA = ['35.62', '139.77', '27.4℃', '61%', '3m/s', '+1.2m', '0x3F', '0xA7', '1,284', '96', '104%', '48%', 'DK07', 'RING', '160m', 'LANE', 'TIDE', 'PALM', 'R0412', '02:41', '声', '環', '潮', '風', '緑', '電', 'N35', 'E139', 'id.042', 'sync', '↑0.8', 'Δ12'];
const GLYPHS = 44;
const easeBackOut = (x: number, c: number) => 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;

type Glyph = { el: HTMLElement; line: HTMLElement; live: boolean; sx: number; sy: number; t: number; dur: number; curve: number };
export type PageActions = { start(): void; keepAlive(): void };

const layer = (cls: string, size: number, inner: string, w = size, h = size) =>
  `<div class="p1-layer ${cls}" style="left:${(CX - w / 2).toFixed(1)}px;top:${(CY - h / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px">${inner}</div>`;

export class RegisterPage {
  readonly name = 'register';
  private scan = new ScanCharge();
  private worldEl: HTMLElement;
  private root: HTMLElement;
  private fxEl: HTMLElement;
  private q: <E extends Element>(s: string) => E;
  private ticks: SVGLineElement[];
  private jaws: HTMLElement[];
  private dots: SVGCircleElement[];
  private bones: SVGLineElement[];
  private glowBones: SVGLineElement[];
  private mems: { g: SVGGElement; c: SVGCircleElement[] }[];
  private glyphs: Glyph[] = [];
  private xhs: HTMLElement[];
  private rds: { line: HTMLElement; text: HTMLElement; value: HTMLElement }[];
  private railPoints: { x: number; y: number }[];
  private view?: HandView;
  // motion state
  private lastPhase: ScanPhase | '' = '';
  private lastStep = -1;
  private amber = false;
  private pull = 0;
  private pullAtLock = 0;
  private speed = 1;
  private rot1 = 0;
  private rot2 = 0;
  private tickRot = 0;
  private dispR1 = 96;
  private dispR2 = 80;
  private jawD = 118;
  private tickPulse = 0;
  private spawnAcc = 0;
  private bioFlick = 0;
  private railOpacity = '';
  private skel: { x: number; y: number }[] | undefined;
  private skelTarget: { x: number; y: number }[] | undefined;
  private skelOffset = { x: 0, y: 0 };
  private thumbLeft = false;
  private registeredAt = 0;
  private started = false;
  private number = 0;
  /** Registrations since load (DEV stats). */
  registrations = 0;

  constructor(private stage: Stage, private actions: PageActions) {
    this.worldEl = document.createElement('div');
    this.worldEl.innerHTML = `<div class="p1-copy"><p class="p1-eyebrow"></p><h1></h1><p class="p1-lead"></p>
      <p class="p1-priv">手の形は保存しません。カメラ映像は端末の外へ送られません。</p><p class="p1-notice" role="alert"></p></div>
      <button type="button" class="p1-touch" data-act="touch">タッチで始める</button>`;
    const tickLines = Array.from({ length: 72 }, (_, i) => `<line x1="0" y1="-112" x2="0" y2="${i % 3 ? -106 : -99}" transform="rotate(${i * 5})" stroke="${C.dim}" stroke-width="1.4"/>`).join('');
    const jaw = layer('p1-jaw', 0, `<svg viewBox="-11 -6 22 12"><path d="M-9 -4 L0 4 L9 -4" fill="none" stroke="${C.teal}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`, 22 * K, 12 * K);
    const lines = (cls: string) => BONES.map(() => `<line class="${cls}" x1="0" y1="0" x2="0" y2="0"/>`).join('');
    this.root = document.createElement('div');
    this.root.className = 'p1';
    this.root.innerHTML = layer('p1-ticks', 228 * K, `<svg viewBox="-114 -114 228 228">${tickLines}</svg>`)
      + layer('p1-r1', 196 * K, `<svg viewBox="-98 -98 196 196"><circle r="96" fill="none" stroke="rgba(127,214,196,.4)" stroke-width="1" stroke-dasharray="2 6"/></svg>`)
      + layer('p1-r2', 164 * K, `<svg viewBox="-82 -82 164 164"><circle r="80" fill="none" stroke="rgba(223,243,255,.4)" stroke-width="1.5" stroke-dasharray="60 20 10 20"/></svg>`)
      + jaw + jaw + jaw + jaw
      + layer('p1-core', 132 * K, `<svg viewBox="-66 -66 132 132"><circle class="p1-core-c" r="64" fill="rgba(127,214,196,.05)" stroke="rgba(127,214,196,.6)" stroke-width="1.5"/></svg>`)
      + layer('p1-skel', 132 * K, `<svg viewBox="-66 -66 132 132"><defs><clipPath id="p1-clip"><circle r="63"/></clipPath></defs><g clip-path="url(#p1-clip)" class="p1-hand" opacity="0">
          <g stroke="${C.amber}" stroke-width="2.6" stroke-linecap="round" opacity="0" class="p1-glow">${lines('')}</g>
          <g stroke-width="1.41" stroke-linecap="round">${lines('p1-bone')}</g>
          <g stroke-width=".94">${Array.from({ length: 21 }, (_, i) => `<circle cx="0" cy="0" r="${[4, 8, 12, 16, 20].includes(i) ? 2.45 : 2.07}"/>`).join('')}</g></g></svg>`);
    this.fxEl = document.createElement('div');
    this.fxEl.className = 'p1-fx';
    const mem = (i: number) => `<g opacity="0"><circle cx="${CX}" cy="${CY}" r="10" fill="none" stroke="${C.teal}" stroke-width="1.6"/><circle cx="${CX}" cy="${CY}" r="10" fill="none" stroke="#f4fbff" stroke-width="2.4"/><circle cx="${CX}" cy="${CY}" r="10" fill="none" stroke="${C.amber}" stroke-width="1" opacity=".6"/></g>`.replace('<g', `<g data-i="${i}"`);
    const xh = '<div class="p1-xh"><svg viewBox="-6 -6 12 12"><path d="M-6 0H-2M2 0H6M0 -6V-2M0 2V6" stroke="currentColor" stroke-width="1" fill="none"/></svg></div>';
    this.fxEl.innerHTML = `<div class="p1-sweep"></div><svg class="p1-fx-mem" viewBox="0 0 ${W} ${H}">${[0, 1, 2].map(mem).join('')}</svg>
      ${'<div class="p1-dl"></div><div class="p1-dt"></div>'.repeat(GLYPHS)}
      <div class="p1-bio">${xh.repeat(21)}${READ.map(() => '<div class="p1-rd-line"></div><div class="p1-rd"><b></b><span></span></div>').join('')}
      <p class="p1-sum" style="top:${(CY + CORE + 26).toFixed(0)}px"></p></div>`;
    const all = <E extends Element>(root: Element, s: string) => Array.from(root.querySelectorAll<E>(s));
    this.q = <E extends Element>(s: string) => (this.root.querySelector<E>(s) ?? this.fxEl.querySelector<E>(s) ?? this.worldEl.querySelector<E>(s))!;
    this.ticks = all<SVGLineElement>(this.root, '.p1-ticks line');
    this.jaws = all<HTMLElement>(this.root, '.p1-jaw');
    this.dots = all<SVGCircleElement>(this.root, '.p1-hand circle');
    this.bones = all<SVGLineElement>(this.root, '.p1-bone');
    this.glowBones = all<SVGLineElement>(this.root, '.p1-glow line');
    this.mems = all<SVGGElement>(this.fxEl, '.p1-fx-mem g').map(g => ({ g, c: all<SVGCircleElement>(g, 'circle') }));
    const dl = all<HTMLElement>(this.fxEl, '.p1-dl'), dt = all<HTMLElement>(this.fxEl, '.p1-dt');
    this.glyphs = dt.map((el, i) => ({ el, line: dl[i], live: false, sx: 0, sy: 0, t: 0, dur: 1, curve: 0 }));
    this.xhs = all<HTMLElement>(this.fxEl, '.p1-xh');
    const rdLines = all<HTMLElement>(this.fxEl, '.p1-rd-line'), rdTexts = all<HTMLElement>(this.fxEl, '.p1-rd');
    this.rds = rdTexts.map((text, k) => { text.querySelector('b')!.textContent = NAMES[k]; return { line: rdLines[k], text, value: text.querySelector('span')! }; });
    // Data leaves from the inner rails: their layout positions in stage px (the world is unscaled when this runs).
    this.railPoints = stage.railSpans.map((_, i) => ({ x: i < 12 ? 50 : W - 50, y: 300 + (i % 12) * 18.9 + 9.5 }));
  }

  mount() {
    this.stage.world.append(this.worldEl);
    this.stage.page.append(this.root);
    this.stage.fx.append(this.fxEl);
    this.stage.root.dataset.page = 'register';
    this.stage.hudLabel.textContent = '住民の声';
    this.stage.layers.rails.style.transform = '';
    this.reset();
  }
  unmount() {
    this.worldEl.remove(); this.root.remove(); this.fxEl.remove();
    this.stage.world.style.transform = ''; this.stage.motes.style.transform = ''; this.stage.layers.rails.style.opacity = '';
    this.railOpacity = '';
  }

  /** Back to the idle scan (new guest, failed start or abandoned pinch). */
  reset() {
    this.scan.reset();
    this.stage.resident = undefined;
    this.started = false; this.registeredAt = 0; this.pull = 0; this.lastPhase = ''; this.lastStep = -1; this.amber = false;
    for (const g of this.glyphs) { g.live = false; g.el.style.opacity = '0'; g.line.style.opacity = '0'; }
    for (const m of this.mems) m.g.setAttribute('opacity', '0');
    this.q<HTMLElement>('.p1-sweep').style.opacity = '0';
    this.setVoice(false);
    this.paintColors();
  }

  update(view: HandView) {
    const previous = this.view;
    this.view = view;
    this.q<HTMLElement>('.p1-notice').textContent = view.screen === 'welcome' && view.notice ? view.notice.text : '';
    // A failed start (the page is back on welcome, not busy) returns the scanner to idle.
    if (this.started && previous?.screen === 'starting' && view.screen === 'welcome' && !view.busy) this.reset();
    if (!this.started) this.setVoice(this.scan.rt >= 0);
  }

  debug() { return { phase: this.scan.phase, charge: +this.scan.f.toFixed(3), started: this.started }; }

  /** タッチで始める: the touch fallback skips the scan. */
  tap(el: HTMLElement) { if (el.dataset.act === 'touch' && this.canStart()) { this.started = true; this.actions.start(); } }
  private canStart() { return !this.started && this.view?.screen === 'welcome' && !this.view.busy; }

  frame(f: StageFrame) {
    const { dt, now } = f;
    const phase0 = this.scan.phase;
    const palm = !!f.cursor && this.canStart();
    this.scan.update(dt, palm, f.present, now, T.regScanMs, T.regLockMs);
    if (f.pinch && this.scan.pinch()) { this.registrations++; this.registeredAt = now; this.number = (this.view?.cityGuestCount ?? 0) + 1; this.stage.resident = `住民 #${String(this.number).padStart(4, '0')}`; }
    const phase = this.scan.phase;
    if (phase === 'lock' && phase0 !== 'lock') this.pullAtLock = this.pull;
    if (phase === 'release' && phase0 === 'lock') this.setVoice(true, true);
    if (phase === 'registered' && !this.started && now - this.registeredAt >= SHOW_NUMBER_MS && this.canStart()) { this.started = true; this.actions.start(); }
    this.stage.setCursor(phase === 'registered' ? undefined : f.cursor, '');
    this.renderCopy(phase, now);

    const step = this.scan.step, fs = step / SCAN_STEPS, rt = this.scan.rt, locked = phase === 'lock', after = rt >= 0;
    if (step !== this.lastStep) { if (step > this.lastStep && this.lastStep >= 0) this.tickPulse = 1; this.lastStep = step; this.paintColors(); }
    const amber = locked || after;
    if (amber !== this.amber) { this.amber = amber; this.paintColors(); }

    // World pull toward the palm, tremble near the end, back-out release.
    if (phase === 'idle' || phase === 'charge') this.pull = this.scan.f ** T.regCurve;
    let ws = 1 - T.regPull * this.pull, ms = 1 - T.regMote * this.pull, jx = 0, jy = 0;
    if (phase === 'charge' && T.regShakeAt < 1 && this.scan.f > T.regShakeAt) {
      const a = (this.scan.f - T.regShakeAt) / (1 - T.regShakeAt);
      jx = (Math.random() - 0.5) * T.regShake * a; jy = (Math.random() - 0.5) * T.regShake * a;
    }
    if (locked) { ws = 1 - T.regPull * this.pullAtLock; ms = 1 - T.regMote * this.pullAtLock; }
    if (after) {
      const b = easeBackOut(Math.min(1, rt / T.regRelMs), T.regOver);
      ws = 1 - T.regPull * this.pullAtLock * (1 - b); ms = 1 - T.regMote * this.pullAtLock * (1 - b);
      if (rt > T.regRelMs) this.pull = 0;
    }
    this.stage.world.style.transform = `translate(${jx.toFixed(2)}px,${jy.toFixed(2)}px) scale(${ws.toFixed(4)})`;
    this.stage.motes.style.transform = `scale(${ms.toFixed(4)})`;

    // Mechanical rings: radius jumps per step, spin slows to a stop at lock, then eases back.
    const spT = locked ? 0 : after ? 1 : 1 - 0.9 * fs;
    this.speed += (spT - this.speed) * (locked ? 1 : 1 - 0.001 ** (dt / 1000 * 1.6));
    this.rot1 -= dt * 0.015 * this.speed; this.rot2 += dt * 0.022 * this.speed; this.tickRot += dt * 0.009 * this.speed;
    const k2 = 1 - 0.0001 ** (dt / 1000 * 14);
    this.dispR1 += ((after ? 96 : locked ? 80 : 96 - 16 * fs) - this.dispR1) * k2;
    this.dispR2 += ((after ? 80 : locked ? 70 : 80 - 10 * fs) - this.dispR2) * k2;
    this.jawD += ((after ? 118 : locked ? 72 : 118 - 46 * fs) - this.jawD) * k2;
    if (after && rt < T.regRelMs) { const b = easeBackOut(rt / T.regRelMs, T.regOver); this.dispR1 = 80 + 16 * b; this.dispR2 = 70 + 10 * b; this.jawD = 72 + 46 * b; }
    this.tickPulse = Math.max(0, this.tickPulse - dt / 120);
    this.q<HTMLElement>('.p1-r1').style.transform = `rotate(${this.rot1.toFixed(2)}deg) scale(${(this.dispR1 / 96).toFixed(4)})`;
    this.q<HTMLElement>('.p1-r2').style.transform = `rotate(${this.rot2.toFixed(2)}deg) scale(${(this.dispR2 / 80).toFixed(4)})`;
    this.q<HTMLElement>('.p1-ticks').style.transform = `rotate(${this.tickRot.toFixed(2)}deg) scale(${(1 - 0.03 * this.tickPulse).toFixed(4)})`;
    this.jaws.forEach((j, i) => { j.style.transform = `rotate(${(45 + i * 90 + this.tickRot).toFixed(2)}deg) translateY(${(-this.jawD * K).toFixed(1)}px) rotate(180deg)`; });

    this.stepSkeleton(f, locked);
    this.stepData(dt, phase, palm);
    this.stepBio(dt, phase);
    this.stepMembranes(rt);
  }

  // ---- copy -----------------------------------------------------------------------------------------------
  private renderCopy(phase: ScanPhase, now: number) {
    const eyebrow = this.q<HTMLElement>('.p1-eyebrow'), h1 = this.q<HTMLElement>('.p1-copy h1'), lead = this.q<HTMLElement>('.p1-lead');
    if (phase === 'charge') eyebrow.textContent = `スキャン中 ${Math.round(this.scan.f * 100)}%`;
    if (phase === 'registered') {
      const shown = Math.min(this.number, Math.floor((now - this.registeredAt) / 28) * 3);
      const num = h1.querySelector('.p1-num');
      if (num) num.textContent = `#${String(shown).padStart(4, '0')}`;
    }
    if (phase === this.lastPhase) return;
    const from = this.lastPhase;
    this.lastPhase = phase;
    if (phase === 'idle' || (phase === 'charge' && from !== 'idle' && from !== '')) {
      eyebrow.textContent = '住民登録'; h1.innerHTML = '手のひらをかざして<br>住民登録'; lead.textContent = '2127年の台場へようこそ。手のひらを画面に向けてください。';
    } else if (phase === 'lock') eyebrow.textContent = '認証';
    else if (phase === 'ready') { eyebrow.textContent = '確認'; h1.textContent = 'つまんで登録'; lead.textContent = '親指と人さし指をつまむと、住民として登録されます。'; }
    else if (phase === 'registered') {
      eyebrow.textContent = '住民登録完了'; h1.innerHTML = '<span class="p1-num">#0000</span>';
      lead.textContent = 'ようこそ、2127年の台場へ。四つの質問に、暮らしの声でお答えください。';
    }
  }

  private setVoice(plusOne: boolean, ping = false) {
    const count = (this.view?.cityGuestCount ?? 1284) + (plusOne ? 1 : 0);
    this.stage.voiceSpan.textContent = `声${count.toLocaleString('en-US')}`;
    if (ping) { this.stage.voiceSpan.classList.add('is-ping'); setTimeout(() => this.stage.voiceSpan.classList.remove('is-ping'), 50); }
  }

  // ---- colours (on step / lock changes only) ----------------------------------------------------------------
  private paintColors() {
    const amber = this.amber, step = Math.max(0, this.lastStep), f = this.scan.f;
    const core = this.q<SVGCircleElement>('.p1-core-c');
    core.setAttribute('stroke', amber ? C.amber : 'rgba(127,214,196,.6)');
    core.setAttribute('fill', amber ? 'rgba(232,184,116,.22)' : 'rgba(127,214,196,.05)');
    this.jaws.forEach(j => j.querySelector('path')!.setAttribute('stroke', amber ? C.amber : C.teal));
    this.q<SVGGElement>('.p1-glow').setAttribute('opacity', amber ? '.35' : '0');
    this.ticks.forEach((tick, i) => tick.setAttribute('stroke', amber ? C.amber : Math.floor(i / 3) < step ? C.teal : C.dim));
    const on = (lv: number) => amber || f >= lv / 5 + 0.001;
    this.dots.forEach((dot, i) => { const lit = on(level(i)); dot.setAttribute('stroke', amber ? C.amber : lit ? C.teal : C.mute); dot.setAttribute('fill', lit ? (amber ? C.amber : C.teal) : C.ink); });
    this.bones.forEach((bone, i) => { const [a, b] = BONES[i]; bone.setAttribute('stroke', amber ? C.amber : on(Math.max(level(a), level(b))) ? C.teal : C.dim); });
  }

  // ---- the guest's hand inside the core ---------------------------------------------------------------------
  /** Landmarks → core units (core radius 64): mirrored like a mirror, centred, sized by wrist→middle knuckle. */
  private handTarget(lm: Landmark[], fw: number, fh: number) {
    const pts = lm.map(p => ({ x: (1 - p.x) * fw, y: p.y * fh }));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    let s = 49 / Math.max(1, Math.hypot(pts[9].x - pts[0].x, pts[9].y - pts[0].y));
    const reach = Math.max(...pts.map(p => Math.hypot(p.x - cx, p.y - cy))) * s;
    if (reach > 58) s *= 58 / reach;
    this.thumbLeft = pts[4].x < pts[0].x;
    return pts.map(p => ({ x: (p.x - cx) * s, y: (p.y - cy) * s }));
  }

  private stepSkeleton(f: StageFrame, locked: boolean) {
    if (!locked && f.landmarks) this.skelTarget = this.handTarget(f.landmarks, f.frameW, f.frameH);
    const hand = this.q<SVGGElement>('.p1-hand');
    if (!this.skelTarget) { hand.setAttribute('opacity', '0'); return; }
    // The skeleton drifts a little toward where the palm points (core units, max 15).
    if (!locked && f.cursor) {
      let tx = (f.cursor.x - CX) / K * 0.45, ty = (f.cursor.y - CY) / K * 0.45;
      const m = Math.hypot(tx, ty);
      if (m > 15) { tx *= 15 / m; ty *= 15 / m; }
      this.skelOffset.x += (tx - this.skelOffset.x) * 0.18; this.skelOffset.y += (ty - this.skelOffset.y) * 0.18;
    }
    if (!this.skel) this.skel = this.skelTarget.map(p => ({ ...p }));
    else if (!locked) this.skel.forEach((p, i) => { p.x += (this.skelTarget![i].x - p.x) * 0.5; p.y += (this.skelTarget![i].y - p.y) * 0.5; });
    const o = this.skelOffset, P = this.skel.map(p => ({ x: p.x + o.x, y: p.y + o.y }));
    hand.setAttribute('opacity', f.present || locked || this.scan.rt >= 0 ? '1' : '.25');
    const fx = (v: number) => v.toFixed(1);
    BONES.forEach(([a, b], i) => {
      for (const line of [this.bones[i], this.glowBones[i]]) { line.setAttribute('x1', fx(P[a].x)); line.setAttribute('y1', fx(P[a].y)); line.setAttribute('x2', fx(P[b].x)); line.setAttribute('y2', fx(P[b].y)); }
    });
    this.dots.forEach((dot, i) => { dot.setAttribute('cx', fx(P[i].x)); dot.setAttribute('cy', fx(P[i].y)); });
  }
  /** A joint of the drawn hand in stage px. */
  private joint(i: number) { const p = this.skel![i]; return { x: CX + (p.x + this.skelOffset.x) * K, y: CY + (p.y + this.skelOffset.y) * K }; }

  // ---- data intake ------------------------------------------------------------------------------------------
  private spawn() {
    const g = this.glyphs.find(o => !o.live);
    if (!g) return;
    const f = this.scan.f;
    if (Math.random() < 0.4) { const r = this.railPoints[Math.floor(Math.random() * this.railPoints.length)]; g.sx = r.x; g.sy = r.y; }
    else {
      const a = Math.random() * Math.PI * 2, R = 520 + Math.random() * 260;
      g.sx = Math.max(20, Math.min(W - 20, CX + Math.cos(a) * R)); g.sy = Math.max(70, Math.min(H - 20, CY + Math.sin(a) * R * 0.8));
    }
    g.live = true; g.t = 0; g.dur = 900 - 380 * f + Math.random() * 200; g.curve = (Math.random() - 0.5) * 160;
    g.el.textContent = DATA[Math.floor(Math.random() * DATA.length)];
  }
  private dataPos(g: Glyph, u: number) {
    const e = u * u * u, x = g.sx + (CX - g.sx) * e, y = g.sy + (CY - g.sy) * e;
    const nx = -(CY - g.sy), ny = CX - g.sx, L = Math.hypot(nx, ny) || 1, c = Math.sin(Math.PI * e) * g.curve;
    return { x: x + nx / L * c, y: y + ny / L * c };
  }
  private stepData(dt: number, phase: ScanPhase, palm: boolean) {
    const f = this.scan.f;
    if (phase === 'charge' && palm) { this.spawnAcc += dt / 1000 * (5 + 30 * f); while (this.spawnAcc >= 1) { this.spawnAcc--; this.spawn(); } }
    for (const g of this.glyphs) {
      if (!g.live) continue;
      g.t += dt;
      const u = Math.min(1, g.t / g.dur), p = this.dataPos(g, u), p0 = this.dataPos(g, Math.max(0, u - 0.12));
      const d = Math.hypot(p.x - CX, p.y - CY), inCore = d < CORE * 0.9;
      const op = u < 0.1 ? u * 10 : inCore ? Math.max(0, 1 - (CORE * 0.9 - d) / 40) : 1;
      g.el.style.opacity = op.toFixed(2);
      g.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) translate(-50%,-50%) scale(${(1 - 0.4 * u * u).toFixed(3)})`;
      const lx = p.x - p0.x, ly = p.y - p0.y;
      g.line.style.opacity = (op * (0.15 + 0.6 * u)).toFixed(2);
      g.line.style.transform = `translate(${p0.x.toFixed(1)}px,${p0.y.toFixed(1)}px) rotate(${Math.atan2(ly, lx).toFixed(3)}rad) scaleX(${Math.hypot(lx, ly).toFixed(1)})`;
      if (u >= 1 || (inCore && d < CORE * 0.5)) { g.live = false; g.el.style.opacity = '0'; g.line.style.opacity = '0'; this.tickPulse = Math.max(this.tickPulse, 0.5); }
    }
    const amber = this.amber;
    if (this.glyphs[0].el.classList.contains('is-amber') !== amber) for (const g of this.glyphs) { g.el.classList.toggle('is-amber', amber); g.line.classList.toggle('is-amber', amber); }
    // The rails give up their data as the charge builds.
    const railOpacity = this.scan.rt >= 0 || phase === 'registered' ? '' : (1 - 0.75 * f).toFixed(2);
    if (railOpacity !== this.railOpacity) { this.railOpacity = railOpacity; this.stage.layers.rails.style.opacity = railOpacity; }
  }

  // ---- biometric readout ------------------------------------------------------------------------------------
  private stepBio(dt: number, phase: ScanPhase) {
    const bio = this.q<HTMLElement>('.p1-bio'), rt = this.scan.rt, f = this.scan.f;
    const show = phase === 'charge' ? Math.min(1, f * 6) : phase === 'lock' ? 1 : rt >= 0 ? Math.max(0, 1 - rt / 600) : 0;
    bio.style.opacity = (this.skel ? show : 0).toFixed(2);
    if (show === 0 || !this.skel) return;
    const amber = this.amber;
    bio.classList.toggle('is-amber', amber);
    this.bioFlick += dt;
    const flick = phase === 'charge' && this.bioFlick > 70;
    if (flick) this.bioFlick = 0;
    const lit = (i: number) => amber || f >= level(i) / 5 + 0.001;
    this.xhs.forEach((x, i) => {
      const p = this.joint(i);
      x.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${amber ? 0 : 45}deg)`;
      x.classList.toggle('is-on', lit(i));
    });
    this.rds.forEach((r, k) => {
      const i = READ[k], p = this.joint(i), side = this.thumbLeft ? -1 : 1, ax = LS[k][0] * side, lx = CX + ax, ly = CY + LS[k][1];
      const ex = lx + (ax < 0 ? 40 : -4), ey = ly - 3, len = Math.hypot(ex - p.x, ey - p.y);
      r.line.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${Math.atan2(ey - p.y, ex - p.x).toFixed(3)}rad) scaleX(${len.toFixed(1)})`;
      r.text.style.left = `${(ax < 0 ? lx - 70 : lx).toFixed(0)}px`; r.text.style.top = `${(ly - 9).toFixed(0)}px`;
      const settled = lit(i);
      r.text.classList.toggle('is-on', settled);
      if (flick || amber) r.value.textContent = settled ? `${((p.x - CX) / CORE).toFixed(3)} ${((CY - p.y) / CORE).toFixed(3)}` : `${Math.random().toFixed(3)} ${Math.random().toFixed(3)}`;
    });
    this.q<HTMLElement>('.p1-sum').textContent = amber ? '生体照合 100.0%  一致' : `生体照合 ${(f * 100).toFixed(1)}%`;
  }

  // ---- field membranes --------------------------------------------------------------------------------------
  private stepMembranes(rt: number) {
    if (rt < 0 || rt > 1600 + 2 * 110 + 50) return;
    const sweep = this.q<HTMLElement>('.p1-sweep');
    this.mems.forEach(({ g, c }, i) => {
      const tt = rt - i * 110;
      if (tt < 0) { g.setAttribute('opacity', '0'); return; }
      const v = Math.min(1, tt / 1600), R = CORE + (1 - (1 - v) ** 3) * (1450 - CORE);
      g.setAttribute('opacity', ((1 - v) * (i === 0 ? 1 : 0.7 - i * 0.15)).toFixed(3));
      c[0].setAttribute('r', Math.max(1, R - 2.5).toFixed(1)); c[1].setAttribute('r', R.toFixed(1)); c[2].setAttribute('r', (R + 3).toFixed(1));
      if (i === 0) {
        sweep.style.opacity = (1 - v).toFixed(3);
        sweep.style.transform = `translate(${CX - 300}px,${CY - 300}px) scale(${(R / 300).toFixed(4)})`;
      }
    });
  }
}
