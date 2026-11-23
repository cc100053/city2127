// Shared hologram-card machinery for 住民の窓 pages 2, 3 and 5: the build-in (brackets snap → corner lines →
// layer print + text decode → letter pop), its reverse (de-res), the pinch-hold meter, and the data chip that
// moves between a card and its HUD progress slot. Transform/opacity only; the print reveal slides two layers.
import type { Stage } from './stage.ts';
import { T } from './tune.ts';

export const GLYPHS = 'アイウエオカキクケコサシスセソタチツテト01#%&*<>=/▮▯ﾊﾋﾌﾍﾎ';
export const DIRS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const esc = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
export const scramble = (n: number) => Array.from({ length: n }, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
export const FRAME_HTML = `<div class="p2-edge"></div><div class="p2-frm">${'<i></i>'.repeat(8)}</div><i class="p2-brk tl"></i><i class="p2-brk tr"></i><i class="p2-brk bl"></i><i class="p2-brk br"></i>`;
export type Rect = { left: number; top: number; right: number; bottom: number; w: number; h: number };

/** The parts of a card the build-in drives. */
export type BuildCard = {
  el: HTMLElement; face: HTMLElement; faceIn: HTMLElement; pband: HTMLElement; ticks: HTMLElement[]; readout: HTMLElement;
  label: HTMLElement; letter: HTMLElement; brks: HTMLElement[]; frm: HTMLElement[];
  full: string; rect: Rect; bt: number; glyphT: number; built: boolean; gap: number; lit: number; ro: string;
};

/** Collect a rendered card's parts (markup from the pages: .p2-face > .p2-face-in …, FRAME_HTML). */
export function buildParts(el: HTMLElement, full: string, rect: Rect, delay: number, gap = T.gapFar): BuildCard {
  const $ = (s: string) => el.querySelector<HTMLElement>(s)!;
  const card: BuildCard = {
    el, face: $('.p2-face'), faceIn: $('.p2-face-in'), pband: $('.p2-pband'), ticks: Array.from(el.querySelectorAll<HTMLElement>('.p2-ticks i')),
    readout: $('.p2-readout'), label: $('.p2-label'), letter: $('.p2-letter'),
    brks: Array.from(el.querySelectorAll<HTMLElement>('.p2-brk')), frm: Array.from(el.querySelectorAll<HTMLElement>('.p2-frm i')),
    full, rect, bt: -delay, glyphT: 0, built: false, gap, lit: -1, ro: '',
  };
  card.face.style.opacity = '0';
  card.letter.style.transform = 'scale(0)';
  card.label.textContent = '';
  return card;
}

export function setLit(o: BuildCard, lit: number) {
  if (lit === o.lit) return;
  o.lit = lit;
  o.ticks.forEach((t, j) => t.classList.toggle('on', j < lit));
}
export function setReadout(o: BuildCard, text: string) {
  if (o.ro === text) return;
  o.ro = text;
  o.readout.textContent = text;
}
/** Reveal from the bottom by `off` px: the window slides down while its content slides back up. */
export function reveal(face: HTMLElement, inner: HTMLElement, off: number) {
  face.style.transform = off ? `translate3d(0,${off.toFixed(1)}px,0)` : '';
  inner.style.transform = off ? `translate3d(0,${(-off).toFixed(1)}px,0)` : '';
}

/** Build-in: ① brackets snap → ② corner lines → ③ layer print + ④ text decode → letter pop. */
export function buildStep(o: BuildCard, dt: number) {
  o.bt += dt;
  const t = o.bt;
  if (t < 0) return;
  const tL = T.brkMs, tP = T.brkMs + T.lineMs * 0.5, popAt = tP + Math.max(T.printMs, T.decodeMs), end = popAt + 160;
  const p1 = clamp01(t / T.brkMs), e1 = easeOut(p1), click = p1 >= 1 ? 1 + 0.25 * Math.max(0, 1 - (t - T.brkMs) / 90) : 1;
  o.brks.forEach((el, j) => {
    const [dx, dy] = DIRS[j], off = 1 - e1;
    el.style.opacity = (t < end + 250 ? Math.min(1, p1 * 3) : Math.max(0, 1 - (t - end - 250) / 250)).toFixed(3);
    el.classList.toggle('is-snap', p1 >= 1 && t - T.brkMs < 90);
    el.style.transform = `translate3d(${(dx * (o.gap + off * 130)).toFixed(1)}px,${(dy * (o.gap + off * 90)).toFixed(1)}px,0) scale(${click.toFixed(3)})`;
  });
  const p2 = clamp01((t - tL) / T.lineMs), lineOpacity = t < end ? (p2 > 0 ? '1' : '0') : Math.max(0, 1 - (t - end) / 300).toFixed(3);
  o.frm.forEach((el, j) => { el.style.opacity = lineOpacity; el.style.transform = j < 4 ? `scaleX(${p2.toFixed(3)})` : `scaleY(${p2.toFixed(3)})`; });
  const p3 = clamp01((t - tP) / T.printMs), steps = Math.floor(p3 * 28) / 28;
  o.face.style.opacity = p3 > 0 ? '1' : '0';
  reveal(o.face, o.faceIn, (1 - steps) * o.rect.h);
  o.pband.style.transform = `translate3d(0,${((1 - steps) * o.rect.h).toFixed(1)}px,0)`;
  o.pband.style.opacity = p3 > 0 && p3 < 1 ? '1' : '0';
  setLit(o, Math.floor(p3 * o.ticks.length));
  setReadout(o, p3 < 1 ? `BUILD ${String(Math.floor(p3 * 100)).padStart(2, '0')}%` : 'BUILD OK');
  const p4 = clamp01((t - tP) / T.decodeMs), n = o.full.length, done = Math.floor(p4 * n);
  o.glyphT += dt;
  if (o.glyphT > 45 || p4 >= 1) {
    o.glyphT = 0;
    let s = o.full.slice(0, done);
    if (p4 > 0) for (let j = done; j < n; j++) { const ch = o.full[j]; s += ch === '。' || ch === '、' ? ch : scramble(1); }
    if (o.label.textContent !== s) o.label.textContent = s;
  }
  const p5 = clamp01((t - popAt) / 160);
  o.letter.style.transform = p5 <= 0 ? 'scale(0)' : `scale(${(p5 < 0.6 ? p5 / 0.6 * 1.18 : 1.18 - (p5 - 0.6) / 0.4 * 0.18).toFixed(3)})`;
  if (t >= end + 300) finishBuild(o);
}
export function finishBuild(o: BuildCard) {
  o.built = true;
  o.face.style.opacity = '1';
  reveal(o.face, o.faceIn, 0);
  o.pband.style.opacity = '0';
  o.frm.forEach(el => { el.style.opacity = '0'; });
  o.brks.forEach(el => { el.style.opacity = ''; el.classList.remove('is-snap'); });
  setLit(o, 0);
  o.label.textContent = o.full;
  o.letter.style.transform = '';
}
/** De-res (reverse build) at progress p 0..1: the hologram is erased from the top in 20 steps, text scatters, brackets fly off. */
export function deresStep(o: BuildCard, p: number) {
  const s = Math.floor(p * 20) / 20;
  o.face.style.transform = `translate3d(0,${(s * o.rect.h).toFixed(1)}px,0)`;
  o.faceIn.style.transform = `translate3d(0,${(-s * o.rect.h).toFixed(1)}px,0)`;
  o.face.style.opacity = p >= 1 ? '0' : '1';
  o.pband.style.transform = `translate3d(0,${(s * o.rect.h).toFixed(1)}px,0)`;
  o.pband.style.opacity = p > 0 && p < 1 ? '1' : '0';
  const n = o.full.length, keep = Math.floor((1 - Math.min(1, p * 1.6)) * n);
  if (p > 0) { o.glyphT += 16; if (o.glyphT > 45) { o.glyphT = 0; o.label.textContent = o.full.slice(0, keep) + scramble(Math.max(0, Math.floor(n * (1 - p)) - keep)); } }
  o.letter.style.transform = `scale(${Math.max(0, 1 - p * 2).toFixed(3)})`;
  setReadout(o, p < 1 ? `DERES ${String(Math.floor((1 - p) * 100)).padStart(2, '0')}%` : '');
  setLit(o, p > 0 ? Math.floor((1 - p) * o.ticks.length) : 0);
  const off = clamp01((p - 0.5) / 0.5);
  o.brks.forEach((b, j) => { const [dx, dy] = DIRS[j]; b.style.opacity = p > 0 ? (1 - off).toFixed(3) : ''; b.style.transform = `translate3d(${dx * (o.gap + off * 130)}px,${dy * (o.gap + off * 90)}px,0)`; });
}
/** Brackets at `gap` px outside the card corners. */
export function placeBrackets(brks: HTMLElement[], gap: number) {
  brks.forEach((el, j) => { el.style.transform = `translate3d(${(DIRS[j][0] * gap).toFixed(2)}px,${(DIRS[j][1] * gap).toFixed(2)}px,0)`; });
}

/**
 * Pinch-hold (page-1 feel): fills while held over `holdMs` in `holdSteps` mechanical steps, drains on release.
 * `update` returns the stepped fill 0..1; `done` is true once on the frame it completes.
 */
export class HoldMeter {
  v = 0;
  done = false;
  update(dt: number, holding: boolean) {
    this.done = false;
    this.v = holding ? Math.min(1, this.v + dt / T.holdMs) : Math.max(0, this.v - dt / T.drainMs);
    if (this.v >= 1) { this.done = true; this.v = 0; return 1; }
    return Math.floor(this.v * T.holdSteps + 1e-6) / T.holdSteps;
  }
  reset() { this.v = 0; this.done = false; }
}

// ---- data chips ---------------------------------------------------------------------------------------------
export const chipHtml = (letter: string, id: string, label: string) => `<span class="ck">${esc(letter)}</span><span class="cid">${esc(id)}</span><span>${esc(label)}</span>`;
export function makeChip(stage: Stage, html: string) {
  const chip = document.createElement('div');
  chip.className = 'p2-chip';
  chip.innerHTML = html;
  stage.fx.append(chip);
  return { chip, cw: chip.offsetWidth, ch: chip.offsetHeight };
}
/** A card compresses into a chip at its centre (the card hides); resolves with the chip at rest. */
export async function compressToChip(stage: Stage, card: HTMLElement, r: Rect, picUrl: string | undefined, html: string) {
  const ghost = document.createElement('div');
  ghost.className = 'p2-ghost';
  Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.w}px`, height: `${r.h}px`,
    backgroundImage: picUrl ? `url(${picUrl})` : 'radial-gradient(circle,#24474a,#0f1415 70%)' });
  stage.fx.append(ghost);
  const { chip, cw, ch } = makeChip(stage, html);
  card.style.visibility = 'hidden';
  ghost.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${(r.w - cw) / 2}px,${(r.h - ch) / 2}px) scale(${cw / r.w},${ch / r.h})`, opacity: 0 }],
    { duration: 300, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished.then(() => ghost.remove(), () => ghost.remove());
  const x0 = r.left + r.w / 2 - cw / 2, y0 = r.top + r.h / 2 - ch / 2;
  chip.style.transform = `translate(${x0}px,${y0}px)`;
  await chip.animate([{ transform: `translate(${x0}px,${y0}px) scale(1.25)`, opacity: 0 }, { transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 }],
    { duration: 220, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }).finished.catch(() => undefined);
  return { chip, cw, ch, x0, y0 };
}
/** The chip flies along an arc into HUD slot `n` and is removed. */
export async function chipToSlot(stage: Stage, c: { chip: HTMLElement; cw: number; ch: number; x0: number; y0: number }, n: number) {
  const { chip, cw, ch, x0, y0 } = c, dr = stage.rect(stage.dots[n]);
  const tx = dr.left + dr.w / 2 - cw / 2, ty = dr.top + dr.h / 2 - ch / 2, mx = (x0 + tx) / 2 + (n < 2 ? -120 : -60), my = Math.min(y0, ty) - 40 + (y0 - ty) * 0.15;
  await chip.animate([{ transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 }, { transform: `translate(${mx}px,${my}px) scale(.62)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${tx}px,${ty}px) scale(${dr.w / cw},.15)`, opacity: 0.9 }], { duration: T.chipMs, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' }).finished.catch(() => undefined);
  chip.remove();
}
export const slotFlash = (stage: Stage, n: number) =>
  stage.dots[n]?.animate([{ transform: 'scaleY(3)', boxShadow: '0 0 18px rgba(232,184,116,.9)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
/** HUD slot `n` releases its chip, which falls onto the card and unfolds into it. */
export async function dropChip(stage: Stage, n: number, r: Rect, html: string) {
  const { chip, cw, ch } = makeChip(stage, html), dr = stage.rect(stage.dots[n]);
  const sx = dr.left + dr.w / 2 - cw / 2, sy = dr.top + dr.h / 2 - ch / 2, tx = r.left + r.w / 2 - cw / 2, ty = r.top + r.h / 2 - ch / 2;
  const mx = sx + (tx - sx) * 0.3 - 40, my = sy + (ty - sy) * 0.2;
  slotFlash(stage, n);
  await chip.animate([{ transform: `translate(${sx}px,${sy}px) scale(${dr.w / cw},.15)`, opacity: 0.9 }, { transform: `translate(${mx}px,${my}px) scale(.7)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${tx}px,${ty}px) scale(1)`, opacity: 1 }], { duration: T.dropMs, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' }).finished.catch(() => undefined);
  const g = document.createElement('div');
  g.className = 'hx-unfold';
  Object.assign(g.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.w}px`, height: `${r.h}px` });
  stage.fx.append(g);
  g.animate([{ transform: `translate(${tx - r.left}px,${ty - r.top}px) scale(${cw / r.w},${ch / r.h})`, opacity: 1 }, { transform: 'none', opacity: 0.9, offset: 0.75 }, { transform: 'none', opacity: 0 }],
    { duration: T.unfoldMs, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished.then(() => g.remove(), () => g.remove());
  chip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.unfoldMs * 0.5, fill: 'forwards' }).finished.then(() => chip.remove(), () => chip.remove());
  await new Promise(resolve => setTimeout(resolve, T.unfoldMs * 0.5));
}

/** Pre-built packet chip (the four answers merged) used by pages 3-5. */
export function makePacket(stage: Stage, text: string, squares = 4) {
  const pkt = document.createElement('div');
  pkt.className = 'hx-pkt';
  pkt.innerHTML = `${'<i></i>'.repeat(squares)}<span>${esc(text)}</span>`;
  stage.fx.append(pkt);
  return { pkt, pw: pkt.offsetWidth, ph: pkt.offsetHeight };
}
export const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
