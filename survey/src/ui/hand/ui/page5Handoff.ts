// 住民の窓 page 5: handoff (次の方へ). A1: the HUD chips drop into four slim voice cards stamped 記録済み; only the card
// under the hand lifts its stamp and counts up the share of residents who chose the same (leaving it for hideGraceMs
// scrambles the digits back into the stamp). B1: two landmark hologram cards (空の環 / 軌道エレベーター) are
// pinch-held to turn the city screen (the page's explore); C1: while exploring, the uplink beam, dim and three
// captions synced to the city screen, 戻る by a single pinch. D1: はじめる画面へ is a pinch-hold; an idle rail (8 s
// with a hand, any movement restarts it; 20 s fixed touch-only) leads to the same exit: the cards de-res and the
// data streams into the page-1 ring as the page's own nextGuest runs.
import { nearestBox } from '../handTargets.ts';
import type { Point } from '../handPointer.ts';
import { BLUEPRINTS, cardArt } from './cardArt.ts';
import {
  FRAME_HTML, HoldMeter, buildParts, buildStep, chipHtml, clamp01, deresStep, dropChip, easeOut, esc, finishBuild, makePacket, placeBrackets, reveal,
  scramble, setLit, setReadout, wait, type BuildCard, type Rect,
} from './cards.ts';
import { Uplink } from './page4LookUp.ts';
import { H, W, type Stage, type StageFrame } from './stage.ts';
import { T } from './tune.ts';
import type { HandView } from './types.ts';

export type HandoffActions = { explore(target: 'sky-ring' | 'space-elevator' | null): void; nextGuest(): void };
const SNAP_PX = 36, TOUCH_OFFER_MS = 20_000, GATHER = 'この問いへの声は、まだ集まり始めたところです', RING = { x: 320, y: 410 };
const fmt = (ms: number) => `${(Math.max(0, ms) / 1000).toFixed(1)}s`;

/** Landmark line art (viewBox 0 0 300 160) and their live parts as positions in that box. */
const sky = () => {
  let ticks = '';
  for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, x = 150 + 120 * Math.cos(a), y = 56 + 24 * Math.sin(a); ticks += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + 10).toFixed(1)}"/>`; }
  return `<ellipse cx="150" cy="56" rx="120" ry="24"/><ellipse cx="150" cy="66" rx="120" ry="24"/>${ticks}<line x1="62" y1="82" x2="54" y2="150"/><line x1="238" y1="82" x2="246" y2="150"/><line x1="150" y1="90" x2="150" y2="150"/><line x1="16" y1="150" x2="284" y2="150"/><ellipse cx="150" cy="56" rx="92" ry="17"/>`;
};
const elevator = () => '<line x1="150" y1="0" x2="150" y2="140"/><rect x="141" y="4" width="18" height="8"/><path d="M24 44 Q150 -8 276 44"/><ellipse cx="150" cy="92" rx="44" ry="8"/><ellipse cx="150" cy="100" rx="44" ry="8"/><line x1="106" y1="92" x2="106" y2="100"/><line x1="194" y1="92" x2="194" y2="100"/><ellipse cx="150" cy="86" rx="26" ry="5"/><path d="M108 150 L124 138 H176 L192 150"/><line x1="16" y1="150" x2="284" y2="150"/>';
const LANDMARKS = [
  { target: 'sky-ring' as const, letter: '環', name: '空の環を見る', sub: 'SKY RING ・ 空の港 ・ 268m', short: '空の環', title: '空の環 · 空の港', art: sky(),
    steps: ['航路のポッドが空の港へ入る', 'ここで乗り換え、街の各地へ', '灯る点は住民の声、あなたの声も'], pts: ['POD-07', 'BERTH', '268m', 'RING', 'DK07', '航路', '声', '◆'],
    blink: [[70, 86], [118, 94], [182, 94], [230, 86], [150, 96]] },
  { target: 'space-elevator' as const, letter: '昇', name: '軌道エレベーターを見る', sub: 'SPACE ELEVATOR ・ 空への駅', short: '軌道エレベーター', title: '軌道エレベーター · 空への駅', art: elevator(),
    steps: ['昇降機が宇宙へ向かう', '中継駅で乗り換え、街から軌道へ', '駅の灯りが、街と宇宙を結ぶ'], pts: ['CLIMB', 'STN-1', '5.5km', 'ORBIT', 'E1', '▲', '◆'],
    blink: [[118, 96], [134, 96], [166, 96], [182, 96]] },
];
const LM_BOX = { w: 206, h: 110 }, LM_K = LM_BOX.w / 300;

type Voice = BuildCard & { i: number; started: boolean; pic?: HTMLElement; wire?: HTMLElement; glare: HTMLElement; tilt: string; questionId: string; letterText: string;
  picUrl?: string; percent?: number; total: number; pctEl?: HTMLElement; barEl?: HTMLElement; stamp: HTMLElement; on: boolean; scr: number; statT: number; away: number };
type Landmark = BuildCard & { j: number; b: number; clip: HTMLElement; litEl: HTMLElement; live: HTMLElement; band: HTMLElement; hfill: HTMLElement; sticks: HTMLElement[]; hint: HTMLElement; glare: HTMLElement; tilt: string };
type Target = { el: HTMLElement; act: 'peek' | 'lm' | 'next' | 'back'; rect: Rect; voice?: Voice; lm?: Landmark };

export class HandoffPage {
  readonly name = 'handoff';
  private root = document.createElement('div');
  private view?: HandView;
  private voices: Voice[] = [];
  private lms: Landmark[] = [];
  private targets: Target[] = [];
  private hover: Target | null = null;
  private nextEl?: HTMLElement;
  private hold = new HoldMeter();
  private holdOn: Target | null = null;
  private touch: Target | null = null;
  private mode: 'cards' | 'leaving' | 'explore' = 'cards';
  private busy = false;
  private locked = true;
  private gen = 0;
  private now = 0;
  private idle = 0;
  private last?: Point;
  private deres = -1;
  private rendered = '';
  private explore?: { l: typeof LANDMARKS[number]; up: Uplink; t: number; ready: boolean; back?: HTMLElement; cell: number };
  private c = { x: W / 2, y: H * 0.62 };

  constructor(private stage: Stage, private actions: HandoffActions) { this.root.className = 'p2 hx-ho'; }

  mount() { this.stage.page.append(this.root); this.stage.root.dataset.page = 'handoff'; this.rendered = ''; this.mode = 'cards'; }
  unmount() {
    this.gen++;
    this.explore?.up.remove(); this.explore = undefined;
    this.root.remove(); this.root.replaceChildren();
    this.stage.fx.querySelectorAll('.p2-chip, .hx-unfold, .hx-pkt, .hx-pt').forEach(n => n.remove());
    this.voices = []; this.lms = []; this.targets = []; this.hover = null;
  }
  debug() {
    return { mode: this.mode, locked: this.locked, hover: this.hover ? `${this.hover.act}${this.hover.voice ? `:${this.hover.voice.i}` : this.hover.lm ? `:${this.hover.lm.j}` : ''}` : undefined,
      shown: this.voices.filter(v => v.on).map(v => v.i), idleLeft: Math.round(this.offerMs - this.idle), hold: +this.hold.v.toFixed(2), exploring: !!this.explore };
  }

  private tracking = true;
  private get offerMs() { return this.tracking ? T.offerMs : TOUCH_OFFER_MS; }
  private get ordinal() { return this.view?.result?.ordinal ?? 0; }

  update(view: HandView) {
    const was = this.view;
    this.view = view;
    if (!view.result) return;
    this.stage.hudLabel.textContent = `暮らしの声 #${view.result.ordinal}`;
    if (this.mode !== 'leaving') this.stage.setDots(view.slots.map(s => ({ id: s.id, letter: s.chosen })), -1);
    if (!this.rendered) { this.render(false); if (view.exploring) this.startExploreLayout(LANDMARKS[0], false); }
    else if (this.explore && !view.exploring && was?.exploring) void this.endExplore(false);
    if (this.mode === 'leaving' && view.notice && was && !was.notice) { this.mode = 'cards'; this.render(true); }
    this.applyBusy2();
  }

  // ---- render ---------------------------------------------------------------------------------------------
  private render(instant: boolean) {
    const view = this.view!, r = view.result!;
    this.gen++;
    this.rendered = 'yes';
    this.mode = 'cards'; this.busy = false; this.hover = null; this.hold.reset(); this.holdOn = null; this.touch = null; this.idle = 0; this.deres = -1;
    this.stage.fx.querySelectorAll('.p2-chip, .hx-unfold, .hx-pkt').forEach(n => n.remove());
    this.root.getAnimations().forEach(a => a.cancel());
    this.root.style.opacity = '';
    const station = view.stationId ? `STATION ${view.stationId} ・ ` : '';
    this.root.innerHTML = `<div class="hx-htext"><p class="p2-eyebrow">${station}暮らしの声 #${r.ordinal}</p><h1 class="p2-q hx-hh"><span class="ln"><span>次の方へどうぞ。</span></span></h1>
      <p class="hx-sub">街はこのまま次の方へ引き継がれます。</p><p class="hx-hnote"></p></div>
      <p class="hx-vhead"><span>あなたの声</span><i></i><span>カードに手をかざすと、同じ暮らしを選んだ割合</span></p>
      <div class="hx-rcards hx-vcards">${view.slots.map((s, i) => this.voiceHtml(s.id, i)).join('')}</div>
      <div class="hx-lms">${LANDMARKS.map((l, j) => this.lmHtml(l, j)).join('')}</div>
      <div class="hx-submit hx-next" data-act="next"><div class="hx-sface"><div class="hx-fill"></div><span class="hx-nk">NEXT RESIDENT</span><span class="hx-st">はじめる画面へ</span>
        <small>つまんだまま保持 ・ 次の方へ交代</small><div class="hx-sticks">${'<i></i>'.repeat(31)}</div></div><i class="p2-brk tl"></i><i class="p2-brk tr"></i><i class="p2-brk bl"></i><i class="p2-brk br"></i></div>
      <div class="hx-hrail"><span class="hx-hl">操作がなければ、はじめる画面へ</span><span class="hx-htk"><i></i></span><span class="hx-hc"></span></div>`;
    const answers = new Map(r.answers.map(a => [a.questionId, a])), shares = new Map(r.shares.map(s => [s.questionId, s]));
    this.voices = Array.from(this.root.querySelectorAll<HTMLElement>('.hx-vc')).map((el, i) => {
      const id = view.slots[i].id, a = answers.get(id), share = shares.get(id), art = a ? cardArt(id, a.optionId) : undefined;
      return Object.assign(buildParts(el, a?.label ?? '', this.stage.rect(el), 0, 12), {
        i, started: instant, pic: el.querySelector<HTMLElement>('.hx-rpic') ?? undefined, wire: el.querySelector<HTMLElement>('.p2-wire') ?? undefined,
        glare: el.querySelector<HTMLElement>('.p2-glare')!, tilt: '', questionId: id, letterText: a?.optionId ?? '', picUrl: art?.pic,
        percent: share?.percent, total: share?.total ?? 0, pctEl: el.querySelector<HTMLElement>('.hx-pct') ?? undefined, barEl: el.querySelector<HTMLElement>('.hx-vbar i') ?? undefined,
        stamp: el.querySelector<HTMLElement>('.hx-vrec b')!, on: false, scr: 0, statT: 0, away: 0,
      });
    });
    const lmAt = instant ? 0 : 160 + 3 * T.dropStagger + T.dropMs + T.lmDelay;
    this.lms = Array.from(this.root.querySelectorAll<HTMLElement>('.hx-lm')).map((el, j) => {
      const card = Object.assign(buildParts(el, LANDMARKS[j].name, this.stage.rect(el), lmAt + j * T.stagger * 2, 14), {
        j, b: 0, clip: el.querySelector<HTMLElement>('.hx-lm-clip')!, litEl: el.querySelector<HTMLElement>('.hx-lm-lit')!, live: el.querySelector<HTMLElement>('.hx-lm-live')!,
        band: el.querySelector<HTMLElement>('.p2-band')!, hfill: el.querySelector<HTMLElement>('.hx-hfill')!, sticks: Array.from(el.querySelectorAll<HTMLElement>('.hx-sticks i')),
        hint: el.querySelector<HTMLElement>('.p2-hint')!, glare: el.querySelector<HTMLElement>('.p2-glare')!, tilt: '',
      });
      this.animateLive(card, LANDMARKS[j]);
      return card;
    });
    this.nextEl = this.root.querySelector<HTMLElement>('.hx-next')!;
    placeBrackets(Array.from(this.nextEl.querySelectorAll<HTMLElement>('.p2-brk')), 16);
    this.locked = true;
    if (instant) {
      this.root.querySelectorAll<HTMLElement>('.ln > span').forEach(s => { s.style.transform = 'none'; });
      for (const v of this.voices) { finishBuild(v); v.el.classList.add('is-stat'); }
      for (const l of this.lms) finishBuild(l);
      this.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } else {
      this.root.querySelectorAll<HTMLElement>('.ln > span').forEach((s, i) => s.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 700, delay: 120 + i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }));
      ['.hx-sub', '.hx-vhead'].forEach((s, i) => this.root.querySelector(s)!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 300 + i * 120, fill: 'both' }));
      const gen = this.gen;
      this.voices.forEach((v, n) => void (async () => {
        await wait(160 + n * T.dropStagger);
        if (gen !== this.gen) return;
        await dropChip(this.stage, n, v.rect, chipHtml(v.letterText, v.questionId, v.full));
        if (gen === this.gen) v.started = true;
      })());
      this.nextEl.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: lmAt + 200, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      this.root.querySelector('.hx-hrail')!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: lmAt + 300, fill: 'backwards' });
    }
    this.targets = [
      ...this.voices.map(voice => ({ el: voice.el, act: 'peek' as const, rect: voice.rect, voice })),
      ...this.lms.map(lm => ({ el: lm.el, act: 'lm' as const, rect: lm.rect, lm })),
      { el: this.nextEl, act: 'next' as const, rect: this.stage.rect(this.nextEl) },
    ];
    this.applyBusy2();
  }

  private voiceHtml(questionId: string, i: number) {
    const r = this.view!.result!, a = r.answers.find(x => x.questionId === questionId), share = r.shares.find(s => s.questionId === questionId);
    const art = a ? cardArt(questionId, a.optionId) : undefined, letter = a?.optionId ?? '';
    const body = art ? `<div class="p2-wire" style="background-image:url(${art.wire})"></div><div class="hx-rpic" style="background-image:url(${art.pic})"></div>`
      : `<div class="p2-bp p2-bp--lit"><svg viewBox="0 0 200 200">${BLUEPRINTS[Math.max(0, letter.charCodeAt(0) - 65) % 3]}</svg></div><span class="p2-tag">構想中</span>`;
    const num = share?.percent === undefined ? `<span class="hx-vg">${GATHER}</span>`
      : `<span class="hx-vs"><b class="hx-pct">0</b><i>%</i><span class="hx-pn">同じ暮らしを選んだ住民<br>${share.total}人中</span></span><span class="hx-vbar"><i></i></span>`;
    return `<div class="p2-card hx-rcard hx-vc${art ? '' : ' p2-blue'}" data-act="peek" data-i="${i}"><div class="p2-face"><div class="p2-face-in"><div class="p2-bgrid"></div>${body}
      <div class="p2-lines"></div><div class="p2-shade"></div><div class="p2-glare"></div><div class="p2-pband"></div><div class="p2-ticks">${'<i></i>'.repeat(14)}</div>
      <div class="p2-readout">BUILD 00%</div><span class="hx-qno">${esc(questionId)} · ${esc(letter)}</span>
      <div class="p2-meta"><span class="hx-ans"><span class="p2-letter">${esc(letter)}</span><span class="p2-label"></span></span>
        <span class="hx-vstat"><span class="hx-vnum">${num}</span><span class="hx-vrec"><b>記録済み</b><span>あなたの声 #${r.ordinal}<br>${esc(questionId)} · ${esc(letter)}</span></span></span></div></div></div>${FRAME_HTML}</div>`;
  }
  private lmHtml(l: typeof LANDMARKS[number], j: number) {
    const lit = `<svg viewBox="0 0 300 160">${l.art}</svg>`;
    return `<div class="p2-card hx-lm" data-act="lm" data-i="${j}"><div class="p2-face"><div class="p2-face-in"><div class="p2-bgrid"></div>
      <div class="hx-lmart"><div class="hx-lmbox"><div class="hx-lm-base">${lit}</div><div class="hx-lm-clip"><div class="hx-lm-lit">${lit}</div></div><div class="hx-lm-live"></div></div></div>
      <div class="p2-lines"></div><div class="p2-band"></div><div class="hx-hfill"></div><div class="p2-shade"></div><div class="p2-glare"></div><div class="p2-pband"></div>
      <div class="p2-ticks">${'<i></i>'.repeat(20)}</div><div class="p2-readout">BUILD 00%</div><span class="hx-inuse">他のステーション使用中</span>
      <div class="p2-meta"><span class="hx-ans"><span class="p2-letter">${l.letter}</span><span class="p2-label"></span></span><span class="hx-lsub">${esc(l.sub)}</span><span class="p2-hint">&nbsp;</span></div>
      <div class="hx-sticks">${'<i></i>'.repeat(31)}</div><div class="p2-dim"></div></div></div>${FRAME_HTML}</div>`;
  }
  /** Live parts of the landmark drawings as composited dots (no SVG animation): pods circling, climbers rising, lights. */
  private animateLive(card: Landmark, l: typeof LANDMARKS[number]) {
    const add = (cls: string, x: number, y: number) => { const d = document.createElement('i'); d.className = cls; d.style.left = `${x * LM_K}px`; d.style.top = `${y * LM_K}px`; card.live.append(d); return d; };
    for (const [i, [x, y]] of l.blink.entries()) add('hx-blink', x, y).animate([{ opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }], { duration: 2400, delay: -i * 500, iterations: Infinity });
    if (l.target === 'sky-ring') for (let i = 0; i < 3; i++) {
      const frames = Array.from({ length: 25 }, (_, k) => { const a = k / 24 * Math.PI * 2; return { transform: `translate(${(120 * Math.cos(a) * LM_K).toFixed(1)}px,${(24 * Math.sin(a) * LM_K).toFixed(1)}px)` }; });
      add('hx-pod', 150, 56).animate(frames, { duration: 9000, delay: -i * 3000, iterations: Infinity });
    } else for (let i = 0; i < 3; i++)
      add('hx-pod', 150, 141).animate([{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { transform: `translateY(${(-136 * LM_K).toFixed(1)}px)`, opacity: 0 }],
        { duration: 6000, delay: -i * 2000, iterations: Infinity });
  }

  private applyBusy2() {
    const others = !!this.view?.othersExploring;
    const note = this.root.querySelector<HTMLElement>('.hx-hnote');
    if (note) { note.textContent = others ? '他の方が街の画面を使っています。少しお待ちください。' : this.view?.notice?.text ?? ''; note.classList.toggle('is-on', !!note.textContent); }
    for (const l of this.lms) l.el.classList.toggle('is-busy2', others);
  }

  // ---- targeting ------------------------------------------------------------------------------------------
  private usable(t: Target) {
    if (this.busy || this.mode === 'leaving') return false;
    if (this.mode === 'explore') return t.act === 'back' && !!this.explore?.ready;
    if (t.act === 'peek') return !!t.voice?.built;
    return !this.locked && !(t.act === 'lm' && this.view?.othersExploring);
  }
  private hit(p: Point) {
    const list = this.targets.filter(t => this.usable(t));
    const index = nearestBox(p, list.map(t => t.rect), SNAP_PX);
    return index >= 0 ? list[index] : null;
  }
  private setHover(t: Target | null) {
    if (t === this.hover) return;
    this.hover?.el.classList.remove('is-hover');
    this.hover = t;
    t?.el.classList.add('is-hover');
    for (const l of this.lms) l.el.classList.toggle('is-dim', !!t?.lm && t.lm !== l);
  }
  tap(el: HTMLElement) {
    const t = this.targets.find(item => item.el === el || item.el.contains(el));
    if (!t || !this.usable(t)) return;
    this.idle = 0;
    if (t.act === 'back') void this.endExplore(true);
    else { this.touch = t; this.setHover(t); }
  }
  release() { this.touch = null; }

  // ---- frame ----------------------------------------------------------------------------------------------
  frame(f: StageFrame) {
    const { dt, now } = f;
    this.now = now;
    this.tracking = f.tracking;
    const cursor = this.busy || this.mode === 'leaving' ? undefined : f.cursor;
    if (!this.touch) this.setHover(cursor ? this.hit(cursor) : null);
    if (f.pinch && cursor && this.hover) {
      if (this.hover.act === 'back') void this.endExplore(true);
      else if (this.hover.act === 'lm' || this.hover.act === 'next') this.holdOn = this.hover;
    }
    if (!f.pinchClosed) this.holdOn = null;
    this.stage.setCursor(cursor, f.pinchClosed ? 'pinch' : this.hover ? 'over' : '');
    const aim = f.cursor ?? { x: W / 2, y: H * 0.62 }, k = 1 - 0.001 ** (dt / 1000 * (f.cursor ? 6 : 1.5));
    this.c.x += (aim.x - this.c.x) * k; this.c.y += (aim.y - this.c.y) * k;
    const nx = (this.c.x / W - 0.5) * 2, ny = (this.c.y / H - 0.5) * 2;

    if (this.mode === 'explore') { this.stepExplore(dt); return; }
    if (this.deres >= 0) { this.stepDeres(dt); return; }
    let all = true;
    for (const v of this.voices) if (!this.stepVoice(v, dt, nx, ny)) all = false;
    for (const l of this.lms) if (!this.stepLandmark(l, dt, nx, ny)) all = false;
    if (all && this.locked && this.voices.length) this.locked = false;
    this.stepHold(dt);
    this.stepIdle(f, dt);
  }

  private stepVoice(o: Voice, dt: number, nx: number, ny: number) {
    if (o.started && !o.built) buildStep(o, dt);
    if (!o.built) return false;
    if (!o.el.classList.contains('is-stat')) { o.el.classList.add('is-stat'); this.stampIn(o); }
    const over = (this.touch ?? this.hover)?.voice === o;
    // v4: only the card under the hand shows its share; leaving it folds back into the stamp after hideGraceMs.
    if (over) {
      o.away = 0;
      if (!o.on || o.scr > 0) { o.on = true; o.scr = 0; o.statT = 0; o.el.classList.add('is-on'); if (o.barEl) o.barEl.style.transform = 'scaleX(0)'; }
    } else if (o.on && o.scr <= 0) {
      o.away += dt;
      if (o.away >= T.hideGraceMs) o.scr = T.scrMs;
    }
    if (o.scr > 0) {
      o.scr -= dt;
      if (o.pctEl) o.pctEl.textContent = o.scr > 0 ? scramble(2) : '0';
      if (o.barEl) o.barEl.style.transform = 'scaleX(0)';
      if (o.scr <= 0) { o.on = false; o.el.classList.remove('is-on'); this.stampIn(o); }
    } else if (o.on && o.percent !== undefined) {
      o.statT += dt;
      const f = easeOut(clamp01(o.statT / T.countMs));
      o.pctEl!.textContent = String(Math.round(o.percent * f));
      o.barEl!.style.transform = `scaleX(${(o.percent / 100 * f).toFixed(4)})`;
    }
    setReadout(o, o.on ? (o.percent === undefined ? 'GATHERING' : `SHARE ${o.total}`) : 'RECORDED');
    o.gap += ((over ? 5 : 12) - o.gap) * Math.min(1, dt / 60);
    placeBrackets(o.brks, o.gap);
    if (!this.busy) {
      const lx = (this.c.x - (o.rect.left + o.rect.w / 2)) / (o.rect.w / 2), ly = (this.c.y - (o.rect.top + o.rect.h / 2)) / (o.rect.h / 2);
      const t = over ? { ry: lx * 6, rx: -ly * 4, z: 24 } : { ry: (1.5 - o.i) * 4 + nx * 3, rx: -ny * 2, z: 0 };
      const tilt = `rotateY(${t.ry.toFixed(2)}deg) rotateX(${t.rx.toFixed(2)}deg) translateZ(${t.z}px)`;
      if (tilt !== o.tilt) { o.tilt = tilt; o.el.style.transform = tilt; }
      const par = `translate3d(${(-nx * 8).toFixed(1)}px,${(-ny * 6).toFixed(1)}px,0) scale(1.04)`;
      if (o.pic) o.pic.style.transform = par;
      if (o.wire) o.wire.style.transform = par;
      if (over) o.glare.style.transform = `translate3d(${((lx * 0.5 + 0.5) * o.rect.w).toFixed(1)}px,${((ly * 0.5 + 0.5) * o.rect.h).toFixed(1)}px,0)`;
    }
    return true;
  }
  private stampIn(o: Voice) {
    o.stamp.animate([{ transform: 'scale(1.8) rotate(-8deg)', opacity: 0 }, { transform: 'scale(.92) rotate(-3deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1) rotate(-3deg)', opacity: 1 }],
      { duration: Math.min(600, T.countMs), easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' });
  }

  private stepLandmark(o: Landmark, dt: number, nx: number, ny: number) {
    const over = this.hover?.lm === o || this.touch?.lm === o, others = !!this.view?.othersExploring;
    if (!o.built) buildStep(o, dt);
    if (o.built) o.b = over && !others ? Math.min(1, o.b + dt / T.bootMs) : Math.max(0, o.b - dt / (T.bootMs * 0.6));
    const b = o.built ? easeOut(o.b) : 0, off = (1 - b) * LM_BOX.h;
    reveal(o.clip, o.litEl, off);
    o.live.style.opacity = (0.3 + 0.7 * b).toFixed(3);
    o.band.style.transform = `translate3d(0,${((1 - b) * o.rect.h).toFixed(1)}px,0)`;
    o.band.style.opacity = o.b > 0 && o.b < 1 ? '1' : '0';
    if (!o.built) return false;
    const holding = this.holdTarget()?.lm === o;
    if (!holding) {
      setLit(o, Math.floor(o.b * 20));
      setReadout(o, others ? 'IN USE' : o.b >= 1 ? 'HOLO READY' : `HOLO ${String(Math.floor(o.b * 100)).padStart(2, '0')}%`);
      const hint = others ? '他の方が使用中' : over ? (o.b >= 1 ? 'つまんだまま保持で、上の画面へ' : '起動中…') : ' ';
      if (o.hint.textContent !== hint && this.hold.v === 0) o.hint.textContent = hint;
    }
    const q = holding ? Math.floor(this.hold.v * T.holdSteps + 1e-6) / T.holdSteps : 0;
    o.gap += ((over ? 10 - 7 * q : 14) - o.gap) * Math.min(1, dt / 40);
    placeBrackets(o.brks, o.gap);
    if (!this.busy) {
      const lx = (this.c.x - (o.rect.left + o.rect.w / 2)) / (o.rect.w / 2), ly = (this.c.y - (o.rect.top + o.rect.h / 2)) / (o.rect.h / 2);
      const t = over ? { ry: lx * 7, rx: -ly * 5, z: 30 } : { ry: (o.j ? -1 : 1) * 5 + nx * 3, rx: -ny * 2, z: 0 };
      const tilt = `rotateY(${t.ry.toFixed(2)}deg) rotateX(${t.rx.toFixed(2)}deg) translateZ(${t.z}px)`;
      if (tilt !== o.tilt) { o.tilt = tilt; o.el.style.transform = tilt; }
      if (over) o.glare.style.transform = `translate3d(${((lx * 0.5 + 0.5) * o.rect.w).toFixed(1)}px,${((ly * 0.5 + 0.5) * o.rect.h).toFixed(1)}px,0)`;
    }
    return true;
  }

  /** The target being pinch-held (hand) or pressed (touch), if it is a hold target. */
  private holdTarget() {
    const t = this.touch ?? this.holdOn;
    return t && (t.act === 'lm' || t.act === 'next') && t === (this.touch ?? this.hover) && this.usable(t) ? t : null;
  }
  private holdEl?: Target;
  private stepHold(dt: number) {
    const t = this.holdTarget();
    if (t && this.holdEl && this.holdEl !== t) { this.clearHold(this.holdEl); this.hold.reset(); }
    if (t) this.holdEl = t;
    const h = this.holdEl;
    if (!h) return;
    const q = this.hold.update(dt, !!t);
    if (this.hold.done) { this.clearHold(h); this.holdEl = undefined; this.holdOn = null; this.touch = null; if (h.act === 'next') void this.leave(true); else void this.startExplore(h.lm!); return; }
    const fill = h.el.querySelector<HTMLElement>('.hx-fill, .hx-hfill')!, sticks = h.el.querySelectorAll<HTMLElement>('.hx-sticks i'), lit = Math.round(q * sticks.length);
    fill.style.transform = `scaleX(${q})`;
    sticks.forEach((s, j) => s.classList.toggle('on', j < lit));
    h.el.classList.toggle('is-hold', this.hold.v > 0);
    h.el.style.translate = t && q >= T.shakeAt && q < 1 ? `${((Math.random() - 0.5) * 2 * T.shake).toFixed(2)}px ${((Math.random() - 0.5) * 2 * T.shake).toFixed(2)}px` : '';
    const msg = t ? `保持中 ${Math.round(q * 100)}% ・ 離すと取り消し` : this.hold.v > 0 ? '取り消し中…' : null;
    if (h.act === 'next') {
      placeBrackets(Array.from(h.el.querySelectorAll<HTMLElement>('.p2-brk')), 16 - 12 * q);
      h.el.querySelector('small')!.textContent = msg ?? 'つまんだまま保持 ・ 次の方へ交代';
    } else if (msg) h.lm!.hint.textContent = msg;
    if (this.hold.v === 0 && !t) { this.clearHold(h); this.holdEl = undefined; }
  }
  private clearHold(t: Target) {
    t.el.classList.remove('is-hold');
    t.el.style.translate = '';
    const fill = t.el.querySelector<HTMLElement>('.hx-fill, .hx-hfill');
    if (fill) fill.style.transform = 'scaleX(0)';
    t.el.querySelectorAll('.hx-sticks i').forEach(s => s.classList.remove('on'));
    if (t.act === 'next') t.el.querySelector('small')!.textContent = 'つまんだまま保持 ・ 次の方へ交代';
  }

  /** D1: idle rail. With a hand, any movement above moveMin restarts it; touch-only, a fixed 20 s. */
  private stepIdle(f: StageFrame, dt: number) {
    const p = f.cursor;
    const moving = !!p && !!this.last && Math.hypot(p.x - this.last.x, p.y - this.last.y) / Math.max(1, dt) * 1000 > T.moveMin;
    this.last = p;
    if (this.tracking && moving) this.idle = 0; else this.idle += dt;
    const left = this.offerMs - this.idle, warn = left < T.warnMs;
    const rail = this.root.querySelector<HTMLElement>('.hx-hrail');
    if (!rail) return;
    rail.querySelector<HTMLElement>('.hx-htk i')!.style.transform = `scaleX(${(Math.max(0, left) / this.offerMs).toFixed(4)})`;
    rail.querySelector('.hx-hc')!.textContent = fmt(left);
    rail.classList.toggle('is-warn', warn);
    const text = this.tracking && (moving || this.idle < 300) ? '操作中 ・ 手を止めると、はじめる画面へ' : warn ? 'まもなく、はじめる画面へ戻ります' : '操作がなければ、はじめる画面へ';
    const hl = rail.querySelector('.hx-hl')!;
    if (hl.textContent !== text) hl.textContent = text;
    if (left <= 0) void this.leave(false);
  }

  // ---- C1: landmark tour on the city screen ----------------------------------------------------------------
  private async startExplore(o: Landmark) {
    const gen = this.gen, l = LANDMARKS[o.j];
    this.busy = true;
    this.setHover(null);
    o.el.classList.add('is-lock');
    o.hint.textContent = 'LOCK'; setReadout(o, 'LOCK');
    this.actions.explore(l.target);
    await wait(T.lockMs);
    if (gen !== this.gen) return;
    const r = o.rect;
    this.stage.membrane(r.left + r.w / 2, r.top + r.h / 2, Math.max(r.w, r.h), T.rings, T.relMs);
    for (const s of ['.hx-htext', '.hx-vhead', '.hx-vcards', '.hx-next', '.hx-hrail']) this.root.querySelector(s)?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' });
    for (const c of this.lms) if (c !== o) c.el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(40px)' }], { duration: 360, fill: 'forwards' });
    const { pkt, pw, ph } = makePacket(this.stage, `VIEW REQ ・ ${l.short}`, 1);
    const x0 = r.left + r.w / 2 - pw / 2, y0 = r.top + r.h / 2 - ph / 2, px0 = W / 2 - pw / 2, py0 = 380 - ph / 2;
    o.el.animate([{ opacity: 1 }, { opacity: 0, transform: `${o.tilt} scale(.4)` }], { duration: 300, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    await pkt.animate([{ transform: `translate(${x0}px,${y0}px) scale(.4)`, opacity: 0 }, { transform: `translate(${x0}px,${y0}px) scale(1.1)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${px0}px,${py0}px) scale(1)`, opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }).finished.catch(() => undefined);
    if (gen !== this.gen) { pkt.remove(); return; }
    // The page's explore call has answered by now; without the screen (the other station took it) come back.
    if (!this.view?.exploring) { await wait(600); if (gen !== this.gen) { pkt.remove(); return; } }
    if (!this.view?.exploring) { pkt.remove(); this.render(true); return; }
    this.startExploreLayout(l, true, { pkt, x: px0, y: py0, h: ph });
  }

  private startExploreLayout(l: typeof LANDMARKS[number], animate: boolean, packet?: { pkt: HTMLElement; x: number; y: number; h: number }) {
    const gen = this.gen;
    this.mode = 'explore'; this.busy = true;
    this.root.querySelectorAll('.hx-htext, .hx-vhead, .hx-vcards, .hx-lms, .hx-next, .hx-hrail').forEach(e => { (e as HTMLElement).style.visibility = 'hidden'; });
    const lk = document.createElement('div');
    lk.className = 'hx-lkt hx-ex';
    lk.innerHTML = `<p class="p2-eyebrow">UPLINK ・ ${esc(l.title)}</p><h1 class="hx-lkh">上の画面をご覧ください</h1><p class="hx-lkp">いま、街の画面で${esc(l.short)}をご案内しています</p>`;
    this.root.append(lk);
    const up = new Uplink(this.stage, this.root);
    up.setCells(l.steps.map((s, i) => [s, `STEP ${i + 1} / 3`] as [string, string]), true);
    const back = document.createElement('div');
    back.className = 'hx-exback';
    back.dataset.act = 'back';
    back.innerHTML = '<i class="p2-brk tl"></i><i class="p2-brk tr"></i><i class="p2-brk bl"></i><i class="p2-brk br"></i><span>戻る</span><small>つまむと、この画面に戻ります</small>';
    up.keep.append(back);
    placeBrackets(Array.from(back.querySelectorAll<HTMLElement>('.p2-brk')), 10);
    lk.querySelectorAll<HTMLElement>(':scope > *').forEach((e, i) => e.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 120 + i * 80, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }));
    back.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { duration: 450, delay: 700, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    this.explore = { l, up, t: 0, ready: false, back, cell: -1 };
    this.targets.push({ el: back, act: 'back', rect: this.stage.rect(back) });
    const ready = () => { if (gen !== this.gen || !this.explore) return; this.explore.ready = true; this.busy = false; up.on(); };
    if (!packet || !animate) { packet?.pkt.remove(); ready(); return; }
    const { pkt, x, y, h } = packet;
    this.stage.membrane(W / 2, 380, 140, T.rings, T.relMs);
    const beam = document.createElement('div');
    beam.className = 'hx-beam';
    Object.assign(beam.style, { left: `${W / 2 - 2}px`, height: `${y + h}px` });
    up.keep.append(beam);
    beam.animate([{ transform: 'scaleY(0)', opacity: 1 }, { transform: 'scaleY(1)', opacity: 1, offset: 0.45 }, { transform: 'scaleY(1)', opacity: 0 }], { duration: T.launchMs + 300, fill: 'forwards' })
      .finished.then(() => beam.remove(), () => beam.remove());
    pkt.animate([{ transform: `translate(${x}px,${y}px) scale(1)`, opacity: 1 }, { transform: `translate(${x}px,${y + 14}px) scale(1.05,.8)`, opacity: 1, offset: 0.18 },
      { transform: `translate(${x}px,${-h - 120}px) scale(.5,2.2)`, opacity: 0.2 }], { duration: T.launchMs, easing: 'cubic-bezier(.6,0,.85,.4)', fill: 'forwards' })
      .finished.then(() => { pkt.remove(); ready(); }, () => pkt.remove());
  }

  private stepExplore(dt: number) {
    const ex = this.explore;
    if (!ex) return;
    if (ex.back) ex.back.classList.toggle('is-hover', this.hover?.act === 'back');
    if (!ex.ready) return;
    ex.t += dt;
    if (ex.t >= T.exFlyMs) {
      const u = ex.t - T.exFlyMs, n = Math.floor(u / T.exStepMs) % 3, f = (u % T.exStepMs) / T.exStepMs;
      ex.up.setCell(n); ex.up.setBars(n, f);
    }
    if (!ex.up.dimmed && ex.t >= T.exDimDelay && T.dimLevel < 1) ex.up.dim();
    ex.up.flow(dt, ex.l.pts);
  }

  /** 戻る: a single pinch returns the city screen; the handoff cards come back already built. */
  private async endExplore(byGuest: boolean) {
    const ex = this.explore;
    if (!ex) return;
    const gen = this.gen;
    this.busy = true;
    this.setHover(null);
    if (byGuest) {
      ex.back?.classList.add('is-lock');
      this.actions.explore(null);
      await wait(T.lockMs);
      if (gen !== this.gen) return;
      if (ex.back) { const r = this.stage.rect(ex.back); this.stage.membrane(r.left + r.w / 2, r.top + r.h / 2, 220, T.rings, T.relMs); }
    }
    ex.up.undim(); ex.up.stop();
    await Promise.all([this.root, ex.up.keep].map(e => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.catch(() => undefined)));
    if (gen !== this.gen) return;
    ex.up.remove();
    this.explore = undefined;
    this.render(true);
  }

  // ---- exit: de-res into the page-1 ring --------------------------------------------------------------------
  private async leave(byHold: boolean) {
    if (this.mode === 'leaving') return;
    const gen = this.gen;
    this.mode = 'leaving'; this.busy = true;
    this.setHover(null);
    const next = this.nextEl!;
    if (byHold) {
      next.style.translate = '';
      next.classList.add('is-lock');
      next.querySelector('small')!.textContent = 'HANDOFF';
      await wait(T.lockMs);
      if (gen !== this.gen) return;
      const r = this.stage.rect(next);
      this.stage.membrane(r.left + r.w / 2, r.top + r.h / 2, 240, T.rings, T.relMs);
    }
    for (const o of [...this.voices, ...this.lms]) { o.el.classList.remove('is-stat', 'is-on', 'is-hover', 'is-dim'); o.el.style.transform = ''; }
    this.deres = 0;
    this.root.querySelectorAll<HTMLElement>('.ln > span').forEach((s, i) => s.animate([{ transform: 'none' }, { transform: 'translateY(105%)' }], { duration: 420, delay: i * 60, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'forwards' }));
    for (const s of ['.hx-htext .p2-eyebrow', '.hx-sub', '.hx-hnote', '.hx-vhead', '.hx-hrail']) this.root.querySelector(s)?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    next.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(16px)' }], { duration: T.deresMs * 0.7, delay: 240, easing: 'steps(14)', fill: 'forwards' });
    this.stage.dots.forEach((d, i) => setTimeout(() => {
      if (gen !== this.gen) return;
      d.className = ''; d.firstElementChild!.textContent = '';
      d.animate([{ boxShadow: '0 0 18px rgba(127,214,196,.9)', transform: 'scaleY(3)' }, { boxShadow: 'none', transform: 'none' }], { duration: 360 });
    }, T.deresMs * 0.4 + i * 90));
    await wait(T.deresMs + 200);
    if (gen !== this.gen) return;
    // The released data streams into the page-1 ring, where the next resident registers.
    const words = [...(this.view?.slots.map(s => `${s.id}·${s.chosen ?? ''}`) ?? []), `#${this.ordinal}`, 'VOICE', '0x3F', 'RX', '◆', '▮▮▯', 'PALM'];
    let n = 0;
    [...this.voices.map(v => v.rect), ...this.lms.map(l => l.rect), this.stage.rect(next)].forEach((r, k) => {
      for (let j = 0; j < 5; j++) {
        const p = document.createElement('div');
        p.className = 'hx-pt';
        p.textContent = words[(n++) % words.length];
        this.stage.fx.append(p);
        const x = r.left + Math.random() * r.w, y = r.top + Math.random() * r.h, mx = (x + RING.x) / 2 + (Math.random() - 0.5) * 160, my = (y + RING.y) / 2 - 40;
        p.animate([{ transform: `translate(${x}px,${y}px) translate(-50%,-50%)`, opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(${mx}px,${my}px) translate(-50%,-50%) scale(.9)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${RING.x}px,${RING.y}px) translate(-50%,-50%) scale(.3)`, opacity: 0 }], { duration: T.convMs, delay: k * 40 + j * 30, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'both' })
          .finished.then(() => p.remove(), () => p.remove());
      }
    });
    await wait(T.convMs * 0.75);
    if (gen !== this.gen) return;
    this.stage.resident = undefined;
    this.actions.nextGuest();
  }
  private stepDeres(dt: number) {
    this.deres += dt;
    const span = T.deresMs * 0.7;
    [...this.voices, ...this.lms].forEach((o, k) => deresStep(o, clamp01((this.deres - k * T.deresMs * 0.3 / 6) / span)));
  }
}
