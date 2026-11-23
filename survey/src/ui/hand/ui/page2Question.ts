// 住民の窓 page 2: question cards. Each option is a hologram card that builds in (brackets snap → corner lines →
// layer print + text decode → letter pop; the build-in doubles as the 1 s read lock), idles as a wireframe and boots
// into the picture while an open palm dwells on it. A pinch locks the card (page-1 mechanical lock, amber), releases
// field membranes, compresses it into a data chip that flies into its HUD slot, then the page's own form advances.
// Hover is suppressed after the read lock until the cursor has left every target once (must-move-off rule).
import { nearestBox } from '../handTargets.ts';
import type { Point } from '../handPointer.ts';
import { BLUEPRINTS, cardArt } from './cardArt.ts';
import { H, W, type Stage, type StageFrame } from './stage.ts';
import { T } from './tune.ts';
import type { HandQuestion, HandView } from './types.ts';

export type QuestionActions = { choose(optionId: string): void; advance(): void; prev(): void; keepAlive(): void };

const SNAP_PX = 48, COOLDOWN_MS = 600;
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテト01#%&*<>=/▮▯ﾊﾋﾌﾍﾎ';
const DIRS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const letterOf = (i: number) => String.fromCharCode(65 + i);
const esc = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
/** Question text in masked lines of about 20 characters, broken after 、 and 。. */
const lines = (text: string) => {
  const out: string[] = [];
  let cur = '';
  for (const part of text.split(/(?<=[、。？])/)) { if ((cur + part).length > 20 && cur) { out.push(cur); cur = part; } else cur += part; }
  if (cur) out.push(cur);
  return out.map(s => `<span class="ln"><span>${esc(s)}</span></span>`).join('');
};
type Rect = { left: number; top: number; right: number; bottom: number; w: number; h: number };

type Card = {
  el: HTMLElement; i: number; optionId: string; full: string; image: boolean;
  face: HTMLElement; faceIn: HTMLElement; clip: HTMLElement; pic: HTMLElement; wire?: HTMLElement; band: HTMLElement; pband: HTMLElement;
  glare: HTMLElement; ticks: HTMLElement[]; readout: HTMLElement; hint: HTMLElement; label: HTMLElement; letter: HTMLElement;
  brks: HTMLElement[]; frm: HTMLElement[];
  rect: Rect; clipH: number;
  b: number; gap: number; bt: number; built: boolean; forced: boolean; glyphT: number;
  lit: number; ro: string; hintText: string; tilt: string;
};
type Target = { el: HTMLElement; act: 'pick' | 'back' | 'keep'; rect: Rect; card?: Card };

export class QuestionPage {
  readonly name = 'question';
  private root = document.createElement('div');
  private warn = document.createElement('div');
  private view?: HandView;
  private question?: HandQuestion;
  private key = '';
  private cards: Card[] = [];
  private targets: Target[] = [];
  private hover: Target | null = null;
  private lockUntil = 0;
  private locked = true;
  private armNeeded = false;
  private busy = false;
  private gen = 0;
  private cooldownUntil = 0;
  private c = { x: W / 2, y: H * 0.62 };
  private hotRow = NaN;
  private now = 0;

  constructor(private stage: Stage, private actions: QuestionActions) {
    this.root.className = 'p2';
    this.warn.className = 'holo-warn';
    this.warn.hidden = true;
    this.warn.innerHTML = '<span>操作がないため、15秒後にこの草稿を終了します。</span><button type="button" data-act="keep">続ける</button>';
  }

  mount() {
    this.stage.page.append(this.root, this.warn);
    this.stage.root.dataset.page = 'question';
    this.stage.hudLabel.textContent = this.stage.resident ?? '住民の声';
    this.key = '';
  }
  unmount() {
    this.gen++;
    this.root.remove(); this.warn.remove();
    this.root.replaceChildren();
    this.stage.fx.querySelectorAll('.p2-chip, .p2-ghost').forEach(n => n.remove());
    for (const el of [this.stage.layers.grid, this.stage.layers.far, this.stage.layers.ring, this.stage.layers.rails, this.stage.motes]) el.style.transform = '';
    this.stage.spot.classList.remove('is-on');
    this.stage.railSpans.forEach(s => s.classList.remove('is-hot'));
    this.hotRow = NaN;
  }

  update(view: HandView) {
    this.view = view;
    const q = view.question;
    const showWarn = view.idleWarning;
    if (this.warn.hidden === showWarn) { this.warn.hidden = !showWarn; this.collectTargets(); }
    this.stage.setDots(view.slots.map(s => {
      const q2 = view.question && s.id === view.question.id ? view.question : undefined;
      // The current question's slot fills when its chip lands, not when the draft changes.
      return { id: s.id, letter: s.chosen && !q2 ? s.chosen : undefined };
    }), q?.index ?? -1);
    if (!q) return;
    const key = `${q.index}:${q.id}:${q.editing}`;
    if (key !== this.key) { this.key = key; this.render(q); }
    this.question = q;
  }

  debug() {
    return { question: this.question?.id, locked: this.locked, built: this.cards.length > 0 && this.cards.every(c => c.built), busy: this.busy,
      hover: this.hover ? `${this.hover.act}${this.hover.card ? `:${this.hover.card.i}` : ''}` : undefined, armNeeded: this.armNeeded };
  }

  // ---- screen ---------------------------------------------------------------------------------------------
  private render(q: HandQuestion) {
    this.gen++;
    this.busy = false;
    this.hover = null;
    this.stage.fx.querySelectorAll('.p2-chip, .p2-ghost').forEach(n => n.remove());
    const n = q.options.length;
    this.root.getAnimations().forEach(a => a.cancel());
    this.root.innerHTML = `<div class="p2-text"><p class="p2-eyebrow">質問 ${q.index + 1} / ${q.total} ・ ${esc(q.id)}${q.editing ? ' ・ 変更中' : ''}</p>
      <h1 class="p2-q">${lines(q.text)}</h1>${q.background ? `<p class="p2-bg">${esc(q.background)}</p>` : ''}</div>
      ${q.index > 0 ? '<div class="p2-back" data-act="back">前の質問へ</div>' : ''}
      <div class="p2-cards" style="--n:${n}">${q.options.map((o, i) => this.cardHtml(q, o.id, i)).join('')}</div>`;
    const riseFrom = this.root.querySelectorAll<HTMLElement>('.ln > span');
    riseFrom.forEach((s, i) => s.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 700, delay: 120 + i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }));
    this.cards = Array.from(this.root.querySelectorAll<HTMLElement>('.p2-card')).map((el, i) => {
      const $ = <E extends HTMLElement>(s: string) => el.querySelector<E>(s)!;
      const rect = this.stage.rect(el), image = !el.classList.contains('p2-blue');
      const card: Card = {
        el, i, optionId: q.options[i].id, full: q.options[i].label, image,
        face: $('.p2-face'), faceIn: $('.p2-face-in'), clip: $('.p2-clip'), pic: $('.p2-pic'), wire: el.querySelector<HTMLElement>('.p2-wire') ?? undefined,
        band: $('.p2-band'), pband: $('.p2-pband'), glare: $('.p2-glare'), ticks: Array.from(el.querySelectorAll<HTMLElement>('.p2-ticks i')),
        readout: $('.p2-readout'), hint: $('.p2-hint'), label: $('.p2-label'), letter: $('.p2-letter'),
        brks: Array.from(el.querySelectorAll<HTMLElement>('.p2-brk')), frm: Array.from(el.querySelectorAll<HTMLElement>('.p2-frm i')),
        rect, clipH: rect.h + (image ? 48 : 0),
        b: 0, gap: T.gapFar, bt: -i * T.stagger, built: false, forced: false, glyphT: 0, lit: -1, ro: '', hintText: '', tilt: '',
      };
      card.face.style.opacity = '0';
      card.letter.style.transform = 'scale(0)';
      card.label.textContent = '';
      return card;
    });
    this.now = performance.now();
    this.lockUntil = this.now + T.readMs;
    this.locked = true;
    this.armNeeded = false;
    this.collectTargets();
  }

  private cardHtml(q: HandQuestion, optionId: string, i: number) {
    const art = cardArt(q.id, optionId);
    const blueprint = BLUEPRINTS[i % BLUEPRINTS.length];
    const body = art
      ? `<div class="p2-wire" style="background-image:url(${art.wire})"></div><div class="p2-clip"><div class="p2-pic" style="background-image:url(${art.pic})"></div></div>`
      : `<div class="p2-bp"><svg viewBox="0 0 200 200">${blueprint}</svg></div><div class="p2-clip"><div class="p2-pic"><div class="p2-bp p2-bp--lit"><svg viewBox="0 0 200 200">${blueprint}</svg></div></div></div><span class="p2-tag">構想中</span>`;
    return `<div class="p2-card${art ? '' : ' p2-blue'}" data-act="pick" data-i="${i}"><div class="p2-face"><div class="p2-face-in"><div class="p2-bgrid"></div>${body}
      <div class="p2-lines"></div><div class="p2-band"></div><div class="p2-shade"></div><div class="p2-glare"></div><div class="p2-pband"></div>
      <div class="p2-ticks">${'<i></i>'.repeat(20)}</div><div class="p2-readout">BUILD 00%</div>${q.chosen === optionId ? '<span class="p2-was">前回の答え</span>' : ''}
      <div class="p2-meta"><span class="p2-letter">${letterOf(i)}</span><span class="p2-label"></span><span class="p2-hint">&nbsp;</span></div><div class="p2-dim"></div></div></div>
      <div class="p2-edge"></div><div class="p2-frm">${'<i></i>'.repeat(8)}</div><i class="p2-brk tl"></i><i class="p2-brk tr"></i><i class="p2-brk bl"></i><i class="p2-brk br"></i></div>`;
  }

  private collectTargets() {
    const list: Target[] = this.cards.map(card => ({ el: card.el, act: 'pick' as const, rect: card.rect, card }));
    const back = this.root.querySelector<HTMLElement>('.p2-back');
    if (back) list.push({ el: back, act: 'back', rect: this.stage.rect(back) });
    if (!this.warn.hidden) { const button = this.warn.querySelector<HTMLElement>('button')!; list.unshift({ el: button, act: 'keep', rect: this.stage.rect(button) }); }
    this.targets = list;
  }

  // ---- targeting ------------------------------------------------------------------------------------------
  private usable(t: Target) { return !this.busy && (t.act !== 'pick' || !this.locked); }
  private hit(p: Point): Target | null {
    const list = this.targets.filter(t => this.usable(t));
    const index = nearestBox(p, list.map(t => t.rect), SNAP_PX);
    return index >= 0 ? list[index] : null;
  }
  private setHover(t: Target | null) {
    if (t === this.hover) return;
    this.hover?.el.classList.remove('is-hover');
    this.hover = t;
    t?.el.classList.add('is-hover');
    for (const card of this.cards) card.el.classList.toggle('is-dim', !!t?.card && t.card !== card);
  }
  /** Touch fallback: a tap acts at once (the read lock still holds for cards). */
  tap(el: HTMLElement) {
    const t = this.targets.find(item => item.el === el || item.el.contains(el));
    if (t && this.usable(t)) this.activate(t);
  }
  private activate(t: Target) {
    if (this.now < this.cooldownUntil || !this.usable(t)) return;
    this.cooldownUntil = this.now + COOLDOWN_MS;
    if (t.act === 'keep') this.actions.keepAlive();
    else if (t.act === 'back') void this.goBack();
    else if (t.card) void this.pick(t.card);
  }

  // ---- frame ----------------------------------------------------------------------------------------------
  frame(f: StageFrame) {
    const { dt, now } = f;
    this.now = now;
    if (this.locked && now >= this.lockUntil && this.cards.length) {
      this.locked = false;
      this.armNeeded = true;
    }
    // Cursor, hover and pinch.
    const cursor = this.busy ? undefined : f.cursor;
    let target = cursor ? this.hit(cursor) : null;
    if (this.armNeeded) { if (target) target = null; else if (cursor) this.armNeeded = false; }
    if (!cursor && !this.busy) target = null;
    this.setHover(target);
    if (f.pinch && cursor && this.hover) this.activate(this.hover);
    this.stage.setCursor(cursor, f.pinchClosed ? 'pinch' : this.hover ? 'over' : '');

    // Smoothed pointer for parallax and tilt; drifts home when no palm controls.
    const aim = f.cursor ?? { x: W / 2, y: H * 0.62 }, k = 1 - 0.001 ** (dt / 1000 * (f.cursor ? 6 : 1.5));
    this.c.x += (aim.x - this.c.x) * k; this.c.y += (aim.y - this.c.y) * k;
    const nx = (this.c.x / W - 0.5) * 2, ny = (this.c.y / H - 0.5) * 2;
    const L = this.stage.layers;
    L.grid.style.transform = `translate3d(${(-nx * 36).toFixed(1)}px,0,0)`;
    L.far.style.transform = `translate3d(${(-nx * 14).toFixed(1)}px,${(-ny * 6).toFixed(1)}px,0)`;
    L.ring.style.transform = `translate3d(${(-nx * 28).toFixed(1)}px,${(-ny * 12).toFixed(1)}px,0) rotate(${(nx * 1.2).toFixed(2)}deg)`;
    this.stage.motes.style.transform = `translate3d(${(-nx * 60).toFixed(1)}px,${(-ny * 26).toFixed(1)}px,0)`;
    L.rails.style.transform = `translate3d(${(-nx * 10).toFixed(1)}px,${(-ny * 8).toFixed(1)}px,0)`;
    this.stage.spot.classList.toggle('is-on', !!cursor);
    if (cursor) this.stage.spot.style.transform = `translate3d(${this.c.x.toFixed(1)}px,${this.c.y.toFixed(1)}px,0)`;
    const row = cursor ? Math.round((this.c.y - 300) / 19) : NaN;
    if (row !== this.hotRow && !(Number.isNaN(row) && Number.isNaN(this.hotRow))) {
      this.hotRow = row;
      this.stage.railSpans.forEach((s, i) => s.classList.toggle('is-hot', Math.abs((i % 12) - row) <= 1));
    }

    for (const card of this.cards) this.stepCard(card, dt, nx, ny);
  }

  private stepCard(o: Card, dt: number, nx: number, ny: number) {
    const over = this.hover?.card === o;
    if (!o.built) this.buildStep(o, dt);
    if (!o.forced) o.b = over ? Math.min(1, o.b + dt / T.bootMs) : Math.max(0, o.b - dt / (T.bootMs * 0.6));
    if (!o.built) o.b = 0;
    const b = easeOut(o.b), off = (1 - b) * o.clipH;
    // Hologram boot: the picture is revealed from the bottom by two opposite translations (no clip-path).
    const lx = this.busy ? 0 : (this.c.x - (o.rect.left + o.rect.w / 2)) / (o.rect.w / 2), ly = this.busy ? 0 : (this.c.y - (o.rect.top + o.rect.h / 2)) / (o.rect.h / 2);
    const par = o.image ? ` translate3d(${(-lx * 14).toFixed(1)}px,${(-ly * 10).toFixed(1)}px,0) scale(1.04)` : '';
    o.clip.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
    o.pic.style.transform = `translate3d(0,${(-off).toFixed(1)}px,0)${par}`;
    if (o.wire) { o.wire.style.opacity = (0.75 - b * 0.45).toFixed(3); o.wire.style.transform = par; }
    o.band.style.transform = `translate3d(0,${((1 - b) * o.rect.h).toFixed(1)}px,0)`;
    o.band.style.opacity = o.b > 0 && o.b < 1 ? '1' : '0';
    if (o.built) {
      this.setLit(o, Math.floor(o.b * 20));
      this.setText(o, 'ro', o.readout, o.b >= 1 ? (o.forced ? 'LOCK' : 'HOLO READY') : `HOLO ${String(Math.floor(o.b * 100)).padStart(2, '0')}%`);
      if (!o.forced) this.setText(o, 'hintText', o.hint, over ? (o.b >= 1 ? 'つまんで選ぶ' : '起動中…') : ' ');
      // Brackets close in discrete steps, each snapping.
      const step = Math.floor(o.b * T.steps + 1e-6) / T.steps, target = T.gapFar - (T.gapFar - 4) * step;
      o.gap += (target - o.gap) * Math.min(1, dt / 40);
      o.brks.forEach((el, j) => { el.style.transform = `translate3d(${(DIRS[j][0] * o.gap).toFixed(2)}px,${(DIRS[j][1] * o.gap).toFixed(2)}px,0)`; });
    }
    if (!this.busy) {
      const base = (1 - o.i) * 12;
      const t = over ? { ry: lx * 8, rx: -ly * 6, z: 40 } : { ry: base + nx * 4, rx: -ny * 2, z: -20 };
      const tilt = `rotateY(${t.ry.toFixed(2)}deg) rotateX(${t.rx.toFixed(2)}deg) translateZ(${t.z}px)`;
      if (tilt !== o.tilt) { o.tilt = tilt; o.el.style.transform = tilt; }
      if (over) o.glare.style.transform = `translate3d(${((lx * 0.5 + 0.5) * o.rect.w).toFixed(1)}px,${((ly * 0.5 + 0.5) * o.rect.h).toFixed(1)}px,0)`;
    }
  }
  private setLit(o: Card, lit: number) {
    if (lit === o.lit) return;
    o.lit = lit;
    o.ticks.forEach((t, j) => t.classList.toggle('on', j < lit));
  }
  private setText(o: Card, key: 'ro' | 'hintText', el: HTMLElement, text: string) {
    if (o[key] === text) return;
    o[key] = text;
    el.textContent = text;
  }

  /** Build-in: ① brackets snap → ② corner lines → ③ layer print + ④ text decode → letter pop. */
  private buildStep(o: Card, dt: number) {
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
    const p3 = clamp01((t - tP) / T.printMs), steps = Math.floor(p3 * 28) / 28, off = (1 - steps) * o.rect.h;
    o.face.style.opacity = p3 > 0 ? '1' : '0';
    o.face.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
    o.faceIn.style.transform = `translate3d(0,${(-off).toFixed(1)}px,0)`;
    o.pband.style.transform = `translate3d(0,${((1 - steps) * o.rect.h).toFixed(1)}px,0)`;
    o.pband.style.opacity = p3 > 0 && p3 < 1 ? '1' : '0';
    this.setLit(o, Math.floor(p3 * 20));
    this.setText(o, 'ro', o.readout, p3 < 1 ? `BUILD ${String(Math.floor(p3 * 100)).padStart(2, '0')}%` : 'BUILD OK');
    const p4 = clamp01((t - tP) / T.decodeMs), n = o.full.length, done = Math.floor(p4 * n);
    o.glyphT += dt;
    if (o.glyphT > 45 || p4 >= 1) {
      o.glyphT = 0;
      let s = o.full.slice(0, done);
      if (p4 > 0) for (let j = done; j < n; j++) { const ch = o.full[j]; s += ch === '。' || ch === '、' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]; }
      if (o.label.textContent !== s) o.label.textContent = s;
    }
    const p5 = clamp01((t - popAt) / 160);
    o.letter.style.transform = p5 <= 0 ? 'scale(0)' : `scale(${(p5 < 0.6 ? p5 / 0.6 * 1.18 : 1.18 - (p5 - 0.6) / 0.4 * 0.18).toFixed(3)})`;
    if (t >= end + 300) this.finishBuild(o);
  }
  private finishBuild(o: Card) {
    o.built = true;
    o.face.style.opacity = '1'; o.face.style.transform = ''; o.faceIn.style.transform = '';
    o.pband.style.opacity = '0';
    o.frm.forEach(el => { el.style.opacity = '0'; });
    o.brks.forEach(el => { el.style.opacity = ''; el.classList.remove('is-snap'); });
    this.setLit(o, 0);
    o.label.textContent = o.full;
    o.letter.style.transform = '';
  }

  // ---- pick: lock → membrane → chip → HUD slot → the page's own advance -----------------------------------
  private wait(ms: number, gen: number) { return new Promise<boolean>(resolve => setTimeout(() => resolve(gen === this.gen), ms)); }
  private async pick(card: Card) {
    const gen = this.gen, q = this.question!;
    this.busy = true;
    this.setHover(null);
    card.forced = true;
    this.actions.choose(card.optionId);
    if (!card.built) this.finishBuild(card);
    card.el.classList.add('is-hover');
    const b0 = card.b, t0 = performance.now();
    while (card.b < 1) {
      await new Promise(requestAnimationFrame);
      if (gen !== this.gen) return;
      card.b = Math.min(1, b0 + (performance.now() - t0) / 120);
    }
    card.el.classList.remove('is-hover'); card.el.classList.add('is-lock');
    card.hint.textContent = 'LOCK'; card.hintText = 'LOCK';
    if (!await this.wait(T.lockMs, gen)) return;
    const r = card.rect, cx = r.left + r.w / 2, cy = r.top + r.h / 2;
    this.stage.membrane(cx, cy, Math.max(r.w, r.h), T.rings, T.relMs);
    for (const other of this.cards) if (other !== card)
      other.el.animate([{ opacity: 1, transform: other.tilt }, { opacity: 0, transform: `${other.tilt} translateY(40px) translateZ(-120px)` }], { duration: 360, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
    this.root.querySelector('.p2-text')?.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-24px)' }], { duration: 320, fill: 'forwards' });
    this.root.querySelector('.p2-back')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    if (!await this.wait(140, gen)) return;

    // The card compresses into a data chip at its centre.
    const art = cardArt(q.id, card.optionId);
    const ghost = document.createElement('div');
    ghost.className = 'p2-ghost';
    Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.w}px`, height: `${r.h}px`,
      backgroundImage: art ? `url(${art.pic})` : 'radial-gradient(circle,#24474a,#0f1415 70%)' });
    const chip = document.createElement('div');
    chip.className = 'p2-chip';
    chip.innerHTML = `<span class="ck">${letterOf(card.i)}</span><span class="cid">${esc(q.id)}</span><span>${esc(card.full)}</span>`;
    this.stage.fx.append(ghost, chip);
    card.el.style.visibility = 'hidden';
    const cw = chip.offsetWidth, ch = chip.offsetHeight;
    ghost.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${(r.w - cw) / 2}px,${(r.h - ch) / 2}px) scale(${cw / r.w},${ch / r.h})`, opacity: 0 }],
      { duration: 300, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished.then(() => ghost.remove(), () => ghost.remove());
    const x0 = cx - cw / 2, y0 = cy - ch / 2;
    chip.style.transform = `translate(${x0}px,${y0}px)`;
    try {
      await chip.animate([{ transform: `translate(${x0}px,${y0}px) scale(1.25)`, opacity: 0 }, { transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 }],
        { duration: 220, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }).finished;
      if (gen !== this.gen) { chip.remove(); return; }
      // Fly along an arc into the HUD progress slot.
      const dot = this.stage.dots[q.index], dr = this.stage.rect(dot);
      const tx = dr.left + dr.w / 2 - cw / 2, ty = dr.top + dr.h / 2 - ch / 2, mx = (x0 + tx) / 2 + (q.index < 2 ? -120 : -60), my = Math.min(y0, ty) - 40 + (y0 - ty) * 0.15;
      await chip.animate([{ transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 }, { transform: `translate(${mx}px,${my}px) scale(.62)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${tx}px,${ty}px) scale(${dr.w / cw},.15)`, opacity: 0.9 }], { duration: T.chipMs, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' }).finished;
    } catch { /* cancelled */ }
    chip.remove();
    if (gen !== this.gen) return;
    const dot = this.stage.dots[q.index];
    dot.classList.add('done');
    dot.firstElementChild!.textContent = `${q.id}·${letterOf(card.i)}`;
    dot.animate([{ transform: 'scaleY(3)', boxShadow: '0 0 18px rgba(232,184,116,.9)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
    this.actions.advance();
  }

  private async goBack() {
    const gen = this.gen;
    this.busy = true;
    this.setHover(null);
    try { await this.root.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(80px)' }], { duration: 300, fill: 'forwards' }).finished; } catch { /* cancelled */ }
    if (gen === this.gen) this.actions.prev();
  }
}
