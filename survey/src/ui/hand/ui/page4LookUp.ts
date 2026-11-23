// 住民の窓 page 4: 抬頭 (look up at the city screen). The sent packet waits in an orbit slot under the top edge while
// the other station's proposal still shows (A1, the page's displayWaitMs), then shoots up an uplink beam (B2); the
// screen dims after a moment (C1) and three telemetry cells 受信 → 反映中 → 完了 follow the real reading slot (D2,
// resultReadyAt → resultEndsAt from the page). The page's own timer moves on to the handoff.
import { esc, makePacket, wait } from './cards.ts';
import { W, type Stage, type StageFrame } from './stage.ts';
import { T } from './tune.ts';
import type { HandView } from './types.ts';

const BEAM_BOT = 318, SLOT_Y = 118, PACKET_AT = { x: W / 2, y: 380 };
const POINTS = ['RX', 'VOICE', '◆', '0x3F', '▮▮▯', '4/4'];
const fmt = (ms: number) => `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
type Phase = 'pre' | 'dock' | 'wait' | 'launch' | 'show' | 'end';

/** The uplink furniture shared with page 5's landmark tour: arc, beam, emitter, telemetry cells, dimmer. */
export class Uplink {
  readonly keep: HTMLElement;
  readonly dimmer: HTMLElement;
  cells: HTMLElement[] = [];
  private anims: Animation[] = [];
  private flowAcc = 0;
  dimmed = false;
  private cell = -1;
  constructor(private stage: Stage, parent: HTMLElement) {
    this.dimmer = document.createElement('div');
    this.dimmer.className = 'hx-dimmer';
    this.keep = document.createElement('div');
    this.keep.className = 'hx-keep';
    this.keep.innerHTML = `<div class="hx-arc"><b></b><i></i><span>UPLINK ・ CITY SCREEN</span></div><div class="hx-ubeam"><div class="hx-core"></div></div><div class="hx-emit"><i></i><i></i></div>`;
    parent.append(this.dimmer, this.keep);
  }
  setCells(cells: [string, string][], wide = false) {
    this.keep.querySelector('.hx-tele')?.remove();
    const tele = document.createElement('div');
    tele.className = `hx-tele${wide ? ' is-wide' : ''}`;
    tele.innerHTML = cells.map(([a, b], i) => `<div class="hx-tc"><i class="p2-brk tl"></i><i class="p2-brk tr"></i><i class="p2-brk bl"></i><i class="p2-brk br"></i><span class="hx-tj">${esc(a)}</span><span class="hx-tm">${esc(b)}</span><span class="hx-tb"><i></i></span></div>${i < cells.length - 1 ? '<span class="hx-tl2"></span>' : ''}`).join('');
    this.keep.append(tele);
    this.cells = Array.from(tele.querySelectorAll<HTMLElement>('.hx-tc'));
    this.cell = -1;
    tele.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 300, fill: 'both' });
    return tele;
  }
  setCell(n: number) {
    if (n === this.cell) return;
    this.cell = n;
    this.cells.forEach((c, i) => { c.classList.toggle('is-done', i < n); c.classList.toggle('is-now', i === n); });
    this.cells[n]?.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 260 });
  }
  setBars(n: number, f: number) { this.cells.forEach((c, i) => { c.querySelector<HTMLElement>('.hx-tb i')!.style.transform = `scaleX(${i < n ? 1 : i === n ? f.toFixed(3) : 0})`; }); }
  /** Beam, arc and emitter come on; chevrons run up while the city screen shows this guest. */
  on() {
    const arc = this.keep.querySelector<HTMLElement>('.hx-arc')!, beam = this.keep.querySelector<HTMLElement>('.hx-ubeam')!;
    arc.classList.add('is-on');
    arc.querySelector('b')!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
    beam.classList.add('is-on');
    beam.animate([{ transform: 'translateX(-50%) scaleY(0)' }, { transform: 'translateX(-50%) scaleY(1)' }], { duration: T.beamGrowMs, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    this.keep.querySelector('.hx-emit')!.classList.add('is-on');
    for (let i = 0; i < T.chevN; i++) {
      const c = document.createElement('div');
      c.className = 'hx-cv';
      this.keep.append(c);
      this.anims.push(c.animate([{ transform: `translate(${W / 2 - 14}px,${BEAM_BOT - 20}px) rotate(45deg)`, opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0.9, offset: 0.7 },
        { transform: `translate(${W / 2 - 14}px,30px) rotate(45deg)`, opacity: 0 }], { duration: T.chevMs, delay: i * T.chevMs / T.chevN, iterations: Infinity, easing: 'cubic-bezier(.5,0,.6,1)' }));
    }
  }
  /** Data points stream up the beam at flowRate per second. */
  flow(dt: number, words: string[]) {
    this.flowAcc += dt * T.flowRate / 1000;
    while (this.flowAcc >= 1) {
      this.flowAcc--;
      const p = document.createElement('div');
      p.className = 'hx-pt';
      p.textContent = words[(Math.random() * words.length) | 0];
      this.keep.append(p);
      const x = W / 2 + (Math.random() - 0.5) * T.flowSpread, d = BEAM_BOT / T.flowSpeed * 1000;
      p.animate([{ transform: `translate(${x}px,${BEAM_BOT - 10}px) translateX(-50%) scale(.8)`, opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0.9, offset: 0.8 },
        { transform: `translate(${W / 2 + (x - W / 2) * 0.2}px,-6px) translateX(-50%) scale(1)`, opacity: 0 }], { duration: d, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' })
        .finished.then(() => { p.remove(); this.keep.querySelector('.hx-arc b')?.animate([{ opacity: 0.6 }, { opacity: 0 }], { duration: 260 }); }, () => p.remove());
    }
  }
  dim() {
    this.dimmed = true;
    this.dimmer.animate([{ opacity: 0 }, { opacity: 1 - T.dimLevel }], { duration: T.dimMs, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    this.keep.querySelectorAll('.hx-ubeam, .hx-emit').forEach(el => el.animate([{ opacity: 1 }, { opacity: T.dimBeam }], { duration: T.dimMs, fill: 'forwards' }));
  }
  undim() {
    this.dimmer.getAnimations().forEach(a => a.cancel());
    this.dimmer.animate([{ opacity: this.dimmed ? 1 - T.dimLevel : 0 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
    this.dimmed = false;
  }
  stop() { this.anims.forEach(a => a.cancel()); this.anims = []; }
  remove() { this.stop(); this.dimmer.remove(); this.keep.remove(); }
}

export class LookUpPage {
  readonly name = 'lookup';
  private root = document.createElement('div');
  private view?: HandView;
  private up?: Uplink;
  private phase: Phase = 'pre';
  private packet?: { el: HTMLElement; x: number; y: number; w: number; h: number };
  private gen = 0;
  private endStarted = false;

  constructor(private stage: Stage) { this.root.className = 'p2 hx-look'; }

  mount() {
    this.gen++;
    this.stage.page.append(this.root);
    this.stage.root.dataset.page = 'lookup';
    this.root.style.opacity = '';
    this.root.innerHTML = `<div class="hx-lkt"><p class="p2-eyebrow hx-eye"></p><h1 class="hx-lkh"></h1><p class="hx-lkp"></p></div>`;
    this.up = new Uplink(this.stage, this.root);
    this.up.setCells([['受信', 'RX'], ['反映中', 'BUILD'], ['完了', 'DONE']]);
    const prog = document.createElement('div');
    prog.className = 'hx-prog';
    prog.innerHTML = '<span class="hx-pl">表示時間</span><span class="hx-ptk"><i></i></span><span class="hx-pc"></span>';
    prog.style.opacity = '0';
    const slot = document.createElement('div');
    slot.className = 'hx-slot';
    slot.innerHTML = '<div class="hx-orb"></div><i class="p2-brk tl"></i><i class="p2-brk tr"></i><i class="p2-brk bl"></i><i class="p2-brk br"></i><span class="hx-sl">ORBIT HOLD ・ 順番待ち</span><span class="hx-sr"></span>';
    this.up.keep.append(prog, slot);
    this.root.querySelectorAll<HTMLElement>('.hx-lkt > *').forEach((e, i) => e.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 160 + i * 80, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }));
    this.phase = 'pre';
    this.endStarted = false;
    this.packet = this.stage.packet;
    this.stage.packet = undefined;
  }
  unmount() {
    this.gen++;
    this.up?.remove(); this.up = undefined;
    this.packet?.el.remove(); this.packet = undefined;
    this.root.remove(); this.root.replaceChildren();
  }
  tap() { /* nothing to press: the guest looks up */ }
  release() { /* — */ }
  debug() { return { phase: this.phase, dimmed: this.up?.dimmed ?? false }; }

  private get who() { return this.stage.resident ?? (this.view?.result ? `暮らしの声 #${this.view.result.ordinal}` : ''); }
  private setText(eye: string, h: string, p: string, animate = false) {
    const els = [this.root.querySelector<HTMLElement>('.hx-eye')!, this.root.querySelector<HTMLElement>('.hx-lkh')!, this.root.querySelector<HTMLElement>('.hx-lkp')!];
    [eye, h, p].forEach((text, i) => {
      const el = els[i];
      if (el.textContent === text) return;
      if (!animate) { el.textContent = text; return; }
      el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 180, fill: 'forwards' }).finished.then(() => {
        el.textContent = text;
        el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      }, () => undefined);
    });
  }

  update(view: HandView) {
    this.view = view;
    this.stage.setDots(view.slots.map(s => ({ id: s.id, letter: s.chosen })), -1);
    this.stage.hudLabel.textContent = this.who;
  }

  frame(f: StageFrame) {
    const r = this.view?.result, up = this.up;
    this.stage.setCursor(undefined);
    if (!r || !up) return;
    const now = f.now, waitLeft = r.readyAt - now;
    if (this.phase === 'pre') {
      if (!this.packet && now - r.readyAt > 600) { this.beginShow(false); return; }
      if (!this.packet) {
        const { pkt, pw, ph } = makePacket(this.stage, `VOICE PKT ・ ${this.who.replace(/^.* #/, '#')}`);
        this.packet = { el: pkt, x: PACKET_AT.x - pw / 2, y: PACKET_AT.y - ph / 2, w: pw, h: ph };
        pkt.style.transform = `translate(${this.packet.x}px,${this.packet.y}px)`;
        pkt.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      }
      this.setText(`送信完了 ・ ${this.who}`, 'まもなく上の画面に表示されます', waitLeft > 500 ? '他のステーションの声を表示中です。順番にご案内します。' : '');
      if (waitLeft > T.dockMs + 300) void this.dock(); else void this.launch();
    } else if (this.phase === 'wait') {
      this.root.querySelector<HTMLElement>('.hx-sr')!.textContent = `他ステーション表示中 ・ あと ${fmt(waitLeft)}`;
      if (waitLeft <= 0) void this.launch();
    } else if (this.phase === 'show') {
      const t = now - r.readyAt, S = Math.max(1, r.endsAt - r.readyAt);
      const n = t < T.rxMs ? 0 : t < S - T.doneMs ? 1 : 2;
      up.setCell(n);
      const seg = n === 0 ? [0, T.rxMs] : n === 1 ? [T.rxMs, S - T.doneMs] : [S - T.doneMs, S];
      up.setBars(n, clamp01((t - seg[0]) / Math.max(1, seg[1] - seg[0])));
      this.root.querySelector<HTMLElement>('.hx-ptk i')!.style.transform = `scaleX(${clamp01(t / S).toFixed(4)})`;
      this.root.querySelector<HTMLElement>('.hx-pc')!.textContent = fmt(S - t);
      if (!up.dimmed && t >= T.dimDelay && T.dimLevel < 1) up.dim();
      up.flow(f.dt, [...POINTS, ...(this.view?.slots.map(s => `${s.id}·${s.chosen ?? ''}`) ?? [])]);
      // The closing beat ends with the reading slot, when the page moves on to the handoff.
      if (!this.endStarted && now >= r.endsAt - (T.lockMs + T.endHoldMs + T.endFadeMs)) void this.endShow();
    }
  }

  /** A1: the packet rises and docks in the orbit slot while the other station's proposal still shows. */
  private async dock() {
    const gen = this.gen, p = this.packet!;
    this.phase = 'dock';
    const slot = this.root.querySelector<HTMLElement>('.hx-slot')!;
    slot.style.opacity = '1';
    slot.animate([{ opacity: 0, transform: 'translateX(-50%) scale(1.25)' }, { opacity: 1, transform: 'translateX(-50%) scale(1)' }], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    const tx = W / 2 - p.w / 2, ty = SLOT_Y + 32 - p.h / 2;
    await p.el.animate([{ transform: `translate(${p.x}px,${p.y}px)` }, { transform: `translate(${tx}px,${ty + 10}px) scale(1.04,.92)`, offset: 0.8 }, { transform: `translate(${tx}px,${ty}px)` }],
      { duration: T.dockMs, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }).finished.catch(() => undefined);
    if (gen !== this.gen) return;
    p.x = tx; p.y = ty;
    this.stage.membrane(W / 2, SLOT_Y + 32, 120, T.rings, T.relMs);
    this.phase = 'wait';
  }

  /** B2: the packet shoots up a beam to the top edge, then the uplink comes on. */
  private async launch() {
    const gen = this.gen, p = this.packet!;
    this.phase = 'launch';
    const slot = this.root.querySelector<HTMLElement>('.hx-slot')!;
    if (slot.style.opacity === '1') slot.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-50%) scale(.9)' }], { duration: 300, fill: 'forwards' });
    const beam = document.createElement('div');
    beam.className = 'hx-beam';
    Object.assign(beam.style, { left: `${W / 2 - 2}px`, height: `${p.y + p.h}px` });
    this.up!.keep.append(beam);
    beam.animate([{ transform: 'scaleY(0)', opacity: 1 }, { transform: 'scaleY(1)', opacity: 1, offset: 0.45 }, { transform: 'scaleY(1)', opacity: 0 }],
      { duration: T.launchMs + 300, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' }).finished.then(() => beam.remove(), () => beam.remove());
    await p.el.animate([{ transform: `translate(${p.x}px,${p.y}px) scale(1)`, opacity: 1 }, { transform: `translate(${p.x}px,${p.y + 14}px) scale(1.05,.8)`, opacity: 1, offset: 0.18 },
      { transform: `translate(${p.x}px,${-p.h - 120}px) scale(.5,2.2)`, opacity: 0.2 }], { duration: T.launchMs, easing: 'cubic-bezier(.6,0,.85,.4)', fill: 'forwards' }).finished.catch(() => undefined);
    if (gen !== this.gen) return;
    p.el.remove();
    this.packet = undefined;
    this.beginShow(true);
  }

  private beginShow(animate: boolean) {
    this.phase = 'show';
    this.up!.on();
    this.setText(`UPLINK ・ ${this.who} の声`, '上の画面をご覧ください', 'あなたの声が、いま街に届いています', animate);
    this.root.querySelector<HTMLElement>('.hx-prog')!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'forwards' });
  }

  private async endShow() {
    const gen = this.gen, up = this.up!;
    this.endStarted = true;
    this.phase = 'end';
    up.cells.forEach(c => { c.classList.add('is-done'); c.classList.remove('is-now'); });
    up.setBars(3, 1);
    const last = up.cells[up.cells.length - 1];
    last.classList.add('is-lock');
    await wait(T.lockMs);
    if (gen !== this.gen) return;
    const r = this.stage.rect(last);
    this.stage.membrane(r.left + r.w / 2, r.top + r.h / 2, 140, T.rings, T.relMs);
    up.undim(); up.stop();
    await wait(T.endHoldMs);
    if (gen !== this.gen) return;
    this.root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.endFadeMs, fill: 'forwards' });
  }
}

