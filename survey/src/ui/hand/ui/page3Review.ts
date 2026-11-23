// 住民の窓 page 3: 送信前の確認. Each HUD slot drops its chip, which unfolds into a slim hologram answer card (four in
// a row). Pinching a card edits it: the card compresses back into its slot and the page opens that question (on the
// way back only that card drops and rebuilds). この声を街へ届ける is a pinch-hold (page-1 tick lock); on send the
// cards become chips, merge into one packet at the centre and the page's own submit runs; page 4 takes the packet.
import { nearestBox } from '../handTargets.ts';
import type { Point } from '../handPointer.ts';
import { BLUEPRINTS, cardArt } from './cardArt.ts';
import {
  FRAME_HTML, HoldMeter, buildParts, buildStep, chipHtml, chipToSlot, compressToChip, dropChip, esc, finishBuild, makePacket, placeBrackets, setReadout,
  slotFlash, wait, type BuildCard, type Rect,
} from './cards.ts';
import { H, W, type Stage, type StageFrame } from './stage.ts';
import { T } from './tune.ts';
import type { HandView } from './types.ts';

export type ReviewActions = { edit(index: number): void; submit(): void };
type Card = BuildCard & { i: number; started: boolean; pic?: HTMLElement; wire?: HTMLElement; glare: HTMLElement; hint: HTMLElement; hintText: string; tilt: string; questionId: string; letterText: string; picUrl?: string };
type Target = { el: HTMLElement; act: 'edit' | 'submit'; rect: Rect; card?: Card };
const SNAP_PX = 40, COOLDOWN_MS = 600, PACKET_AT = { x: W / 2, y: 380 };
const letterOf = (optionId: string | undefined, index: number) => optionId && /^[A-Z]$/.test(optionId) ? optionId : String.fromCharCode(65 + index);

export class ReviewPage {
  readonly name = 'review';
  private root = document.createElement('div');
  private view?: HandView;
  private cards: Card[] = [];
  private targets: Target[] = [];
  private hover: Target | null = null;
  private submitEl?: HTMLElement;
  private hold = new HoldMeter();
  private pinchOn: Target | null = null;
  private touchHold = false;
  private locked = true;
  private busy = false;
  private sending = false;
  private submitted = false;
  private gen = 0;
  private now = 0;
  private cooldownUntil = 0;
  private key = '';
  private c = { x: W / 2, y: H * 0.62 };
  /** Set while a card is being edited, so the way back drops only that card. */
  static edited: number | undefined;

  constructor(private stage: Stage, private actions: ReviewActions) { this.root.className = 'p2 hx-review'; }

  mount() { this.stage.page.append(this.root); this.stage.root.dataset.page = 'review'; this.key = ''; }
  unmount() {
    this.gen++;
    this.root.remove(); this.root.replaceChildren();
    this.stage.fx.querySelectorAll('.p2-chip, .p2-ghost, .hx-unfold').forEach(n => n.remove());
    this.cards = []; this.targets = []; this.hover = null;
  }

  update(view: HandView) {
    this.view = view;
    const review = view.review;
    if (!review) return;
    this.stage.setDots(view.slots.map((s, i) => ({ id: s.id, letter: s.chosen ? letterOf(s.chosen, i) : undefined })), -1);
    // A failed send (the page is back on review, not busy) shows the cards again.
    const key = review.rows.map(r => r.optionId).join(','), failed = this.submitted && view.screen === 'review' && !view.busy;
    if (key !== this.key || failed) { this.key = key; this.render(view); }
    const note = this.root.querySelector<HTMLElement>('.hx-note');
    if (note) note.textContent = view.notice?.text ?? (review.uncertain ? '回答の記録を確認できませんでした。もう一度、送信してください。' : '');
  }

  debug() {
    return { locked: this.locked, built: this.cards.length > 0 && this.cards.every(c => c.built), busy: this.busy, sending: this.sending,
      hover: this.hover ? `${this.hover.act}${this.hover.card ? `:${this.hover.card.i}` : ''}` : undefined, hold: +this.hold.v.toFixed(2) };
  }

  private render(view: HandView) {
    this.gen++;
    this.busy = false; this.sending = false; this.submitted = false; this.hover = null; this.hold.reset(); this.pinchOn = null; this.touchHold = false;
    this.stage.fx.querySelectorAll('.p2-chip, .p2-ghost, .hx-unfold, .hx-pkt').forEach(n => n.remove());
    this.stage.packet = undefined;
    const rows = view.review!.rows, only = ReviewPage.edited;
    ReviewPage.edited = undefined;
    this.root.getAnimations().forEach(a => a.cancel());
    this.root.innerHTML = `<div class="hx-rtext"><p class="p2-eyebrow">送信前の確認${this.stage.resident ? ` ・ ${esc(this.stage.resident)}` : ''}</p>
      <h1 class="p2-q hx-rh">${'<span class="ln"><span>あなたの声を確認してください。</span></span>'}</h1><p class="hx-sub">変えたい答えをつまむと、その質問に戻ります。</p><p class="hx-note"></p></div>
      <div class="hx-rcards">${rows.map((row, i) => this.cardHtml(row, i)).join('')}</div>
      <div class="hx-submit" data-act="submit"><div class="hx-sface"><div class="hx-fill"></div><span class="hx-st">この声を街へ届ける</span><small>つまんだまま保持して送信</small><div class="hx-sticks">${'<i></i>'.repeat(41)}</div></div>
      <i class="p2-brk tl"></i><i class="p2-brk tr"></i><i class="p2-brk bl"></i><i class="p2-brk br"></i></div>`;
    this.root.querySelectorAll<HTMLElement>('.ln > span').forEach((s, i) => s.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 700, delay: 120 + i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }));
    this.root.querySelector('.hx-sub')!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 400, fill: 'both' });
    this.submitEl = this.root.querySelector<HTMLElement>('.hx-submit')!;
    this.submitEl.classList.add('is-locked');
    this.submitEl.animate([{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }],
      { duration: 500, delay: only !== undefined ? 200 : 4 * T.dropStagger + T.dropMs, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    placeBrackets(Array.from(this.submitEl.querySelectorAll<HTMLElement>('.p2-brk')), 16);
    this.cards = Array.from(this.root.querySelectorAll<HTMLElement>('.p2-card')).map((el, i) => {
      const row = rows[i], art = row.optionId ? cardArt(row.questionId, row.optionId) : undefined;
      const card = Object.assign(buildParts(el, row.label ?? '未選択', this.stage.rect(el), 0, 12), {
        i, started: false, pic: el.querySelector<HTMLElement>('.hx-rpic') ?? undefined, wire: el.querySelector<HTMLElement>('.p2-wire') ?? undefined,
        glare: el.querySelector<HTMLElement>('.p2-glare')!, hint: el.querySelector<HTMLElement>('.p2-hint')!, hintText: '', tilt: '',
        questionId: row.questionId, letterText: letterOf(row.optionId, i), picUrl: art?.pic,
      });
      return card;
    });
    this.locked = true;
    const gen = this.gen;
    this.cards.forEach((card, n) => {
      if (only !== undefined && n !== only) { card.started = true; finishBuild(card); return; }
      void (async () => {
        await wait(160 + (only !== undefined ? 0 : n * T.dropStagger));
        if (gen !== this.gen) return;
        await dropChip(this.stage, n, card.rect, chipHtml(card.letterText, card.questionId, card.full));
        if (gen === this.gen) card.started = true;
      })();
    });
    this.targets = [...this.cards.map(card => ({ el: card.el, act: 'edit' as const, rect: card.rect, card })), { el: this.submitEl, act: 'submit' as const, rect: this.stage.rect(this.submitEl) }];
  }

  private cardHtml(row: { questionId: string; text: string; optionId?: string; label?: string }, i: number) {
    const art = row.optionId ? cardArt(row.questionId, row.optionId) : undefined, letter = letterOf(row.optionId, i);
    const index = Math.max(0, letter.charCodeAt(0) - 65);
    const body = art ? `<div class="p2-wire" style="background-image:url(${art.wire})"></div><div class="hx-rpic" style="background-image:url(${art.pic})"></div>`
      : `<div class="p2-bp p2-bp--lit"><svg viewBox="0 0 200 200">${BLUEPRINTS[index % BLUEPRINTS.length]}</svg></div><span class="p2-tag">構想中</span>`;
    return `<div class="p2-card hx-rcard${art ? '' : ' p2-blue'}" data-act="edit" data-i="${i}"><div class="p2-face"><div class="p2-face-in"><div class="p2-bgrid"></div>${body}
      <div class="p2-lines"></div><div class="p2-shade"></div><div class="p2-glare"></div><div class="p2-pband"></div><div class="p2-ticks">${'<i></i>'.repeat(14)}</div>
      <div class="p2-readout">BUILD 00%</div><span class="hx-qno">質問 ${i + 1}</span>
      <div class="p2-meta"><span class="hx-qt">${esc(row.text)}</span><span class="hx-ans"><span class="p2-letter">${letter}</span><span class="p2-label"></span></span><span class="p2-hint">&nbsp;</span></div></div></div>${FRAME_HTML}</div>`;
  }

  // ---- targeting ------------------------------------------------------------------------------------------
  private usable(t: Target) {
    if (this.busy || this.locked) return false;
    return t.act === 'edit' || !!this.view?.review?.canSubmit || !!this.view?.review?.uncertain;
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
  }
  tap(el: HTMLElement) {
    const t = this.targets.find(item => item.el === el || item.el.contains(el));
    if (!t || !this.usable(t)) return;
    if (t.act === 'submit') { this.touchHold = true; this.setHover(t); } else this.activate(t);
  }
  release() { this.touchHold = false; }
  private activate(t: Target) {
    if (this.now < this.cooldownUntil || !t.card) return;
    this.cooldownUntil = this.now + COOLDOWN_MS;
    void this.edit(t.card);
  }

  // ---- frame ----------------------------------------------------------------------------------------------
  frame(f: StageFrame) {
    const { dt, now } = f;
    this.now = now;
    const cursor = this.busy ? undefined : f.cursor;
    if (!this.touchHold) this.setHover(cursor ? this.hit(cursor) : null);
    if (f.pinch && cursor && this.hover) { if (this.hover.act === 'submit') this.pinchOn = this.hover; else this.activate(this.hover); }
    if (!f.pinchClosed) this.pinchOn = null;
    this.stage.setCursor(cursor, f.pinchClosed ? 'pinch' : this.hover ? 'over' : '');
    const aim = f.cursor ?? { x: W / 2, y: H * 0.62 }, k = 1 - 0.001 ** (dt / 1000 * (f.cursor ? 6 : 1.5));
    this.c.x += (aim.x - this.c.x) * k; this.c.y += (aim.y - this.c.y) * k;
    const nx = (this.c.x / W - 0.5) * 2, ny = (this.c.y / H - 0.5) * 2;

    let all = true;
    for (const o of this.cards) {
      if (o.started && !o.built) buildStep(o, dt);
      if (!o.built) { all = false; continue; }
      const over = this.hover?.card === o;
      if (!o.el.classList.contains('is-lock')) {
        setReadout(o, over ? 'EDIT' : `${o.questionId}·${o.letterText}`);
        const hint = over ? 'つまんで変更' : ' ';
        if (hint !== o.hintText) { o.hintText = hint; o.hint.textContent = hint; }
      }
      o.gap += ((over ? 4 : 12) - o.gap) * Math.min(1, dt / 60);
      placeBrackets(o.brks, o.gap);
      if (!this.busy) {
        const lx = (this.c.x - (o.rect.left + o.rect.w / 2)) / (o.rect.w / 2), ly = (this.c.y - (o.rect.top + o.rect.h / 2)) / (o.rect.h / 2);
        const t = over ? { ry: lx * 7, rx: -ly * 5, z: 30 } : { ry: (1.5 - o.i) * 4 + nx * 3, rx: -ny * 2, z: 0 };
        const tilt = `rotateY(${t.ry.toFixed(2)}deg) rotateX(${t.rx.toFixed(2)}deg) translateZ(${t.z}px)`;
        if (tilt !== o.tilt) { o.tilt = tilt; o.el.style.transform = tilt; }
        const par = `translate3d(${(-lx * 10).toFixed(1)}px,${(-ly * 8).toFixed(1)}px,0) scale(1.04)`;
        if (o.pic) o.pic.style.transform = par;
        if (o.wire) o.wire.style.transform = par;
        if (over) o.glare.style.transform = `translate3d(${((lx * 0.5 + 0.5) * o.rect.w).toFixed(1)}px,${((ly * 0.5 + 0.5) * o.rect.h).toFixed(1)}px,0)`;
      }
    }
    if (all && this.locked && this.cards.length) { this.locked = false; this.submitEl?.classList.remove('is-locked'); }

    // D2: pinch-hold to send.
    const sb = this.submitEl;
    if (sb && !this.sending) {
      const holding = !this.locked && this.hover?.act === 'submit' && (this.touchHold || (this.pinchOn?.act === 'submit' && f.pinchClosed));
      const q = this.hold.update(dt, holding);
      if (this.hold.done) { void this.send(); return; }
      sb.querySelector<HTMLElement>('.hx-fill')!.style.transform = `scaleX(${q})`;
      const ticks = sb.querySelectorAll<HTMLElement>('.hx-sticks i'), lit = Math.round(q * ticks.length);
      ticks.forEach((t, j) => t.classList.toggle('on', j < lit));
      placeBrackets(Array.from(sb.querySelectorAll<HTMLElement>('.p2-brk')), 16 - 12 * q);
      sb.classList.toggle('is-hold', this.hold.v > 0);
      sb.style.transform = holding && q >= T.shakeAt && q < 1 ? `translate(${((Math.random() - 0.5) * 2 * T.shake).toFixed(2)}px,${((Math.random() - 0.5) * 2 * T.shake).toFixed(2)}px)` : '';
      sb.querySelector('small')!.textContent = holding ? `保持中 ${Math.round(q * 100)}% ・ 離すと取り消し` : this.hold.v > 0 ? '取り消し中…' : 'つまんだまま保持して送信';
    }
  }

  // ---- C: edit -------------------------------------------------------------------------------------------
  private async edit(o: Card) {
    const gen = this.gen;
    this.busy = true;
    this.setHover(null);
    o.el.classList.add('is-lock');
    o.hint.textContent = 'EDIT';
    await wait(T.lockMs);
    if (gen !== this.gen) return;
    const r = o.rect;
    this.stage.membrane(r.left + r.w / 2, r.top + r.h / 2, Math.max(r.w, r.h), T.rings, T.relMs);
    for (const c of this.cards) if (c !== o) c.el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(40px)' }], { duration: 360, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
    this.fade('.hx-rtext', 'translateY(-24px)'); this.fade('.hx-submit', 'translateY(40px)');
    // The slot empties while its chip flies home.
    this.stage.dots[o.i]?.classList.remove('done');
    if (this.stage.dots[o.i]) this.stage.dots[o.i].firstElementChild!.textContent = '';
    await wait(140);
    if (gen !== this.gen) return;
    const chip = await compressToChip(this.stage, o.el, r, o.picUrl, chipHtml(o.letterText, o.questionId, o.full));
    if (gen !== this.gen) { chip.chip.remove(); return; }
    await chipToSlot(this.stage, chip, o.i);
    if (gen !== this.gen) return;
    ReviewPage.edited = o.i;
    this.actions.edit(o.i);
  }

  // ---- E: send --------------------------------------------------------------------------------------------
  private async send() {
    const gen = this.gen, sb = this.submitEl!;
    this.sending = true; this.busy = true;
    this.setHover(null);
    sb.style.transform = '';
    sb.classList.add('is-lock');
    sb.querySelector('small')!.textContent = 'SEND LOCK';
    await wait(T.sendLockMs);
    if (gen !== this.gen) return;
    const sr = this.stage.rect(sb);
    this.stage.membrane(sr.left + sr.w / 2, sr.top + sr.h / 2, 240, T.rings, T.relMs);
    this.fade('.hx-rtext', 'translateY(-24px)');
    sb.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(40px)' }], { duration: 360, delay: 120, fill: 'forwards' });
    const chips = await Promise.all(this.cards.map(async (o, n) => {
      await wait(n * 60);
      return compressToChip(this.stage, o.el, o.rect, o.picUrl, chipHtml(o.letterText, o.questionId, o.full));
    }));
    if (gen !== this.gen) { chips.forEach(c => c.chip.remove()); return; }
    await Promise.all(chips.map(async ({ chip, cw, ch, x0, y0 }, n) => {
      const tx = PACKET_AT.x - cw / 2, ty = PACKET_AT.y - ch / 2;
      await chip.animate([{ transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 }, { transform: `translate(${(x0 + tx) / 2}px,${(y0 + ty) / 2 - 30}px) scale(.8)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${tx}px,${ty}px) scale(.35)`, opacity: 0.2 }], { duration: T.mergeMs, delay: n * 40, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' }).finished.catch(() => undefined);
      chip.remove();
    }));
    if (gen !== this.gen) return;
    const label = this.stage.resident ? this.stage.resident.replace('住民 ', '') : '';
    const { pkt, pw, ph } = makePacket(this.stage, `VOICE PKT${label ? ` ・ ${label}` : ''} ・ ${this.cards.length}/${this.cards.length}`);
    const px0 = PACKET_AT.x - pw / 2, py0 = PACKET_AT.y - ph / 2;
    pkt.style.transform = `translate(${px0}px,${py0}px)`;
    this.stage.membrane(PACKET_AT.x, PACKET_AT.y, 160, T.rings, T.relMs);
    await pkt.animate([{ transform: `translate(${px0}px,${py0}px) scale(.3)`, opacity: 0 }, { transform: `translate(${px0}px,${py0}px) scale(1.15)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${px0}px,${py0}px) scale(1)`, opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished.catch(() => undefined);
    this.stage.dots.forEach((d, n) => d.animate([{ boxShadow: 'none' }, { boxShadow: '0 0 18px rgba(232,184,116,.9)', background: '#e8b874' }, { boxShadow: 'none' }], { duration: 420, delay: n * 50 }));
    for (let n = 0; n < this.cards.length; n++) slotFlash(this.stage, n);
    await wait(220);
    if (gen !== this.gen) { pkt.remove(); return; }
    // Page 4 takes the packet over from here.
    this.stage.packet = { el: pkt, x: px0, y: py0, w: pw, h: ph };
    this.submitted = true;
    this.actions.submit();
  }

  private fade(selector: string, transform = 'none') {
    this.root.querySelectorAll(selector).forEach(e => e.animate([{ opacity: 1 }, { opacity: 0, transform }], { duration: 320, fill: 'forwards' }));
  }
}
