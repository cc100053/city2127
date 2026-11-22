// Hand control layer for the guest page (M3), lazy-loaded by guestDebugView.ts for `/guest?hand`.
// Pinch-only: an open palm moves the cursor (palm centre) and previews what is under it; a thumb-index pinch clicks
// it through the page's own click/change/submit handlers. Fist, lowered hand or no hand = rest (no cursor, nothing fires).
// Welcome is 住民登録 (open palm scan, pinch to register); after submit a look-up screen points to the city display.
// Touch keeps working; failures fall back to touch-only. `&dev-hand` (DEV-ONLY) feeds synthetic hands for tests.
import './handGuest.css';
import { HandPointer, percentile, type Landmark, type Point } from './handPointer.ts';
import { AutoAdvance, TargetGate, nearestBox } from './handTargets.ts';
import { PoseFilter, ReadLock, Registration, classifyPose, synthHand, type Pose } from './handPose.ts';
import type { HandFrame, HandTracker } from './handTracker.ts';

export type HandGuestOptions = {
  app: HTMLElement;
  /** Hand presence and hand actions count as guest activity (the page's resetIdleTimer). */
  onActivity: () => void;
  /** Latest public head count, for the resident number shown on registration (display only). */
  cityGuestCount?: () => number | undefined;
  /** DEV-ONLY: feed synthetic landmarks through window.__handDev instead of the camera. */
  dev?: boolean;
};

const COOLDOWN_MS = 600, PICK_MS = 500, READ_LOCK_MS = 1500, LOOK_UP_MS = 4000, SNAP_PX = 48, ACTIVITY_MS = 1000, LOG_EVERY_MS = 10_000;
const TARGETS = 'button, label.guest-choice, .guest-review-row';
const RING_LEN = 2 * Math.PI * 148;

const palmSvg = `<svg class="hw-palm" viewBox="0 0 200 240" aria-hidden="true">
  <rect x="52" y="104" width="100" height="104" rx="38"/>
  <rect x="58" y="40" width="20" height="84" rx="10"/><rect x="82" y="22" width="20" height="96" rx="10"/>
  <rect x="106" y="28" width="20" height="92" rx="10"/><rect x="130" y="50" width="18" height="74" rx="9"/>
  <rect x="18" y="112" width="20" height="66" rx="10" transform="rotate(-38 28 145)"/></svg>`;
const ringSvg = `<svg class="hw-ring" viewBox="0 0 320 320" aria-hidden="true">
  <circle cx="160" cy="160" r="148" class="hw-ring-track"/>
  <circle cx="160" cy="160" r="148" class="hw-ring-arc" transform="rotate(-90 160 160)" stroke-dasharray="${RING_LEN}" stroke-dashoffset="${RING_LEN}"/>
  ${Array.from({ length: 48 }, (_, i) => `<line x1="160" y1="4" x2="160" y2="${i % 4 ? 10 : 16}" transform="rotate(${i * 7.5} 160 160)" class="hw-ring-tick"/>`).join('')}</svg>`;
const pinchSvg = `<svg class="hw-pinch" viewBox="0 0 120 80" aria-hidden="true">
  <path class="hw-pinch-thumb" d="M12 62 C30 60 44 52 54 40"/><path class="hw-pinch-index" d="M108 18 C88 22 70 30 58 38"/>
  <circle class="hw-pinch-spark" cx="56" cy="39" r="5"/></svg>`;

export function mountHandGuest({ app, onActivity, cityGuestCount = () => undefined, dev = false }: HandGuestOptions) {
  app.classList.add('guest--hand');
  document.body.classList.add('guest-page--hand');
  const layer = document.createElement('div');
  layer.className = 'hand-layer';
  layer.innerHTML = `
<section class="hand-welcome" aria-live="polite" hidden>
  <div class="hw-scan">
    <div class="hw-scanner">${ringSvg}${palmSvg}<div class="hw-scanline"></div>${pinchSvg}</div>
    <div class="hw-copy">
      <p class="hw-eyebrow">住民登録</p>
      <h2 class="hw-title">手のひらをかざして住民登録</h2>
      <p class="hw-lead"></p>
      <ol class="hw-steps"><li data-step="1"><b>1</b>手のひらをかざす</li><li data-step="2"><b>2</b>そのまま待つ</li><li data-step="3"><b>3</b>つまんで登録</li></ol>
      <p class="hw-privacy">手の形は保存しません。カメラ映像は端末の外へ送られません。</p>
    </div>
  </div>
  <div class="hw-registered">
    <p class="hw-eyebrow">住民登録完了</p>
    <p class="hw-number-label">あなたの住民番号</p>
    <p class="hw-number"></p>
    <p class="hw-lead">ようこそ、2127年の台場へ。まもなく最初の質問です。</p>
  </div>
  <button type="button" class="hw-touch">タッチで始める</button>
</section>
<section class="hand-lookup" hidden>
  <div class="hl-beam"></div>
  <div class="hl-chevrons">${[0, 1, 2, 3, 4].map(i => `<span style="--i:${i}"></span>`).join('')}</div>
  <div class="hl-copy"><p class="hl-eyebrow"></p><h2>上の画面をご覧ください</h2><p class="hl-lead">あなたの声が街へ</p></div>
  <p class="hl-dim-note">上の画面で、あなたの声が街に届いています。</p>
</section>
<div class="hand-cursor" aria-hidden="true"></div>
<p class="hand-state" role="status"><span class="hand-state-dot"></span><span class="hand-state-text"></span></p>
<p class="hand-status" role="status" hidden></p>`;
  document.body.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const cursorEl = $<HTMLElement>('.hand-cursor'), stateEl = $<HTMLElement>('.hand-state'), stateText = $<HTMLElement>('.hand-state-text');
  const statusEl = $<HTMLElement>('.hand-status'), welcomeEl = $<HTMLElement>('.hand-welcome'), lookupEl = $<HTMLElement>('.hand-lookup');
  const ringArc = $<SVGCircleElement>('.hw-ring-arc');
  const setStatus = (text: string) => { statusEl.textContent = text; statusEl.hidden = !text; };
  const startButton = () => app.querySelector<HTMLButtonElement>('[data-auto-action="start"]:not(:disabled)');
  $<HTMLButtonElement>('.hw-touch').addEventListener('click', () => startButton()?.click());

  const pointer = new HandPointer({ anchor: 'palm' });
  const poses = new PoseFilter(150);
  const gate = new TargetGate<HTMLElement>(Infinity, COOLDOWN_MS); // pinch-only: hovering never fires
  const advance = new AutoAdvance(PICK_MS);
  const readLock = new ReadLock(READ_LOCK_MS);
  const registration = new Registration();
  let landmarks: Landmark[] | undefined, frameSize = { w: 640, h: 480 }, pendingPinch: Point | undefined, pinchEdge = false;
  let pose: Pose = 'rest', lastActivity = 0, screenKey = '', hovered: HTMLElement | null = null, resultShownAt = 0;
  const stats = { pinch: 0, handLost: 0, frames: 0, registered: 0 };

  // ---- targets --------------------------------------------------------------------------------------------
  const usable = (t: HTMLElement) => {
    if (t.matches('.guest-review-row')) return !!t.querySelector('button:not(:disabled)');
    if (t.matches('button')) return !(t as HTMLButtonElement).disabled && !t.closest('.guest-review-row') && t.getClientRects().length > 0;
    return true;
  };
  function targetAt(p: Point): HTMLElement | null {
    const hit = document.elementFromPoint(p.x, p.y)?.closest<HTMLElement>(TARGETS);
    const direct = hit && app.contains(hit) ? (hit.closest<HTMLElement>('.guest-review-row') ?? hit) : null;
    if (direct && usable(direct)) return direct;
    const targets = Array.from(app.querySelectorAll<HTMLElement>(TARGETS)).filter(usable);
    const index = nearestBox(p, targets.map(t => t.getBoundingClientRect()), SNAP_PX);
    return index >= 0 ? targets[index] : null;
  }
  function activate(target: HTMLElement, now: number) {
    stats.pinch++;
    onActivity();
    if (target.matches('label.guest-choice')) {
      const input = target.querySelector<HTMLInputElement>('input');
      if (input && !input.checked) input.click(); // the page's change handler records the draft
      target.classList.add('is-hand-picked');
      advance.schedule(screenKey, now); // gold flash, then the form's own submit (次へ / 回答を確認する)
    } else if (target.matches('.guest-review-row')) target.querySelector<HTMLButtonElement>('button')?.click();
    else target.click();
  }

  // ---- hand frames ----------------------------------------------------------------------------------------
  function onHandFrame(frame: HandFrame) {
    stats.frames++;
    frameSize = { w: frame.width || 640, h: frame.height || 480 };
    const up = pointer.update(frame.landmarks, frame.t, innerWidth, innerHeight, frameSize.w, frameSize.h);
    if (up.lost) stats.handLost++;
    if (tracker) tracker.handPresent = pointer.present;
    landmarks = up.landmarks;
    if (up.pinchAt) { pendingPinch = up.pinchAt; pinchEdge = true; }
  }

  // ---- render loop ----------------------------------------------------------------------------------------
  let renderCount = 0, renderFps = 0, fpsStart = performance.now(), resultsAt = 0, inferFps = 0;
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    renderCount++;
    const screen = app.dataset.screen ?? '';
    const key = `${screen}|${app.querySelector('h1')?.textContent ?? ''}`;
    if (key !== screenKey) {
      screenKey = key;
      if (screen === 'question') readLock.start(now); else readLock.clear();
      if (screen !== 'welcome') registration.reset();
      if (screen === 'result') resultShownAt = now;
    }
    // Pose: a pinch keeps the palm in control; everything else is filtered with 150 ms hysteresis.
    const raw = pointer.present ? classifyPose(landmarks, frameSize.w, frameSize.h) : 'rest';
    pose = poses.update(pointer.pinch.closed && pose === 'palm' ? 'palm' : raw, now);
    const edge = pinchEdge, pinchAt = pendingPinch;
    pinchEdge = false; pendingPinch = undefined;

    // Welcome: 住民登録 over the page's welcome screen while hand control runs.
    const welcomeOn = active && screen === 'welcome' && !!startButton();
    welcomeEl.hidden = !welcomeOn;
    if (welcomeOn) {
      const state = registration.update(pose, pointer.present, edge, now);
      if (state === 'registered' && !welcomeEl.dataset.number) {
        const count = cityGuestCount();
        welcomeEl.dataset.number = count === undefined ? '—' : `#${String(count + 1).padStart(4, '0')}`;
        $<HTMLElement>('.hw-number').textContent = welcomeEl.dataset.number;
        stats.registered++;
        onActivity();
      }
      if (state === 'done') { registration.reset(); delete welcomeEl.dataset.number; startButton()?.click(); }
      renderWelcome(state);
    } else delete welcomeEl.dataset.number;

    // Look-up when the city display of this proposal starts, dimmed after LOOK_UP_MS.
    const lookupOn = screen === 'result';
    lookupEl.hidden = !lookupOn;
    if (lookupOn) {
      lookupEl.classList.toggle('is-dim', now - resultShownAt > LOOK_UP_MS);
      const number = app.querySelector('.guest-result-number')?.textContent ?? '';
      $<HTMLElement>('.hl-eyebrow').textContent = number ? `${number} の声を記録しました` : '';
    }

    // Pointing cursor, preview and pinch.
    const blocked = welcomeOn || lookupOn;
    const controlling = pose === 'palm' && pointer.present && !blocked;
    const cursor = controlling ? pointer.cursorAt(now) : undefined;
    const locked = screen === 'question' && readLock.locked(now);
    const target = cursor && !locked ? targetAt(cursor) : null;
    gate.hover(target, now);
    if (edge && controlling && pinchAt && !locked) { const fired = gate.pinch(targetAt(pinchAt), now); if (fired) activate(fired, now); }
    if (advance.due(screenKey, now)) {
      const form = app.querySelector<HTMLFormElement>('form.guest-form');
      if (form?.querySelector('input:checked')) form.requestSubmit();
    }
    if (pointer.present && now - lastActivity > ACTIVITY_MS) { lastActivity = now; onActivity(); }
    if (target !== hovered) { hovered?.classList.remove('is-hand-hover'); target?.classList.add('is-hand-hover'); hovered = target; }
    renderReadLock(screen === 'question' && locked ? readLock.progress(now) : undefined);
    renderRestHint(screen === 'question' && !!app.querySelector('.guest-steps li:first-child.is-current'));

    layer.classList.toggle('has-cursor', !!cursor);
    if (cursor) {
      cursorEl.style.transform = `translate3d(${cursor.x}px,${cursor.y}px,0)`;
      cursorEl.classList.toggle('is-pinched', pointer.pinch.closed);
    }
    const handOn = active && !blocked;
    stateEl.hidden = !handOn;
    stateEl.classList.toggle('is-point', controlling);
    stateText.textContent = controlling ? '手のひらで操作中' : '休止中 — 手のひらを向けると操作';

    if (now - fpsStart >= 1000) {
      const dt = (now - fpsStart) / 1000, results = tracker?.results ?? stats.frames;
      renderFps = renderCount / dt; inferFps = (results - resultsAt) / dt; resultsAt = results; renderCount = 0; fpsStart = now;
    }
  }

  function renderWelcome(state: ReturnType<Registration['update']>) {
    welcomeEl.dataset.state = state;
    ringArc.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - registration.progress)));
    const title = state === 'pinch' ? 'つまんで登録' : '手のひらをかざして住民登録';
    const lead = state === 'idle' ? '2127年の台場へようこそ。手のひらを画面に向けてください。'
      : state === 'scanning' ? 'そのまま手のひらを向けていてください…' : '親指と人さし指をつまむと、住民として登録されます。';
    const eyebrow = state === 'scanning' ? `スキャン中 ${Math.round(registration.progress * 100)}%` : state === 'pinch' ? '確認' : '住民登録';
    $<HTMLElement>('.hw-title').textContent = title;
    $<HTMLElement>('.hw-lead').textContent = lead;
    $<HTMLElement>('.hw-eyebrow').textContent = eyebrow;
    const step = state === 'idle' ? 1 : state === 'scanning' ? 2 : 3;
    layer.querySelectorAll<HTMLElement>('.hw-steps li').forEach(li => {
      const n = Number(li.dataset.step);
      li.className = n === step ? 'now' : n < step ? 'done' : '';
    });
  }

  function renderReadLock(progress: number | undefined) {
    let el = app.querySelector<HTMLElement>('.hand-readlock');
    if (progress === undefined) { el?.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.className = 'hand-readlock';
      el.innerHTML = '<span><i></i></span><em>読み終わると選べます</em>';
      app.querySelector('h1')?.after(el);
    }
    el.querySelector<HTMLElement>('i')!.style.transform = `scaleX(${progress})`;
  }

  /** First question only: how to rest without a hand ledge. Sits under the title like the read lock. */
  function renderRestHint(show: boolean) {
    const el = app.querySelector('.hand-rest-hint');
    if (!show) { el?.remove(); return; }
    if (!el) { const hint = document.createElement('p'); hint.className = 'hand-rest-hint'; hint.textContent = '手を下ろすと休止'; app.querySelector('h1')?.after(hint); }
  }

  // ---- source: camera + tracker, or DEV landmarks ---------------------------------------------------------
  let tracker: HandTracker | undefined, active = false;
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.autoplay = true; video.setAttribute('playsinline', '');
  video.className = 'hand-video';
  layer.append(video);
  let stream: MediaStream | undefined;
  const stopCamera = () => { stream?.getTracks().forEach(t => t.stop()); stream = undefined; video.srcObject = null; };
  async function startCamera() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } });
    video.srcObject = stream;
    await video.play();
  }
  function rest() { pointer.reset(); poses.reset(); landmarks = undefined; registration.reset(); if (tracker) tracker.handPresent = false; }
  function fail(reason: string) {
    active = false; tracker?.pause(); stopCamera(); rest();
    layer.classList.add('is-failed');
    setStatus('手の操作は利用できません。画面をタッチして操作してください。');
    console.warn('[hand] touch only:', reason);
  }
  let resuming = false;
  async function resume() {
    if (active || resuming || layer.classList.contains('is-failed') || document.visibilityState !== 'visible' || !tracker) return;
    resuming = true;
    try { await startCamera(); tracker.start(); active = true; setStatus(''); }
    catch (error) { fail(`camera: ${String(error)}`); }
    finally { resuming = false; }
  }
  function pause() { active = false; tracker?.pause(); stopCamera(); rest(); }

  if (dev) {
    // DEV-ONLY test hook: holds a synthetic hand (pose, optional pinch) with its palm centre at a screen point.
    let held: { x: number; y: number; pose: Pose; pinch: boolean } | undefined;
    const toCamera = (x: number, y: number) => ({ tx: 1 - 0.2 - 0.6 * (x / innerWidth), ty: 0.2 + 0.6 * (y / innerHeight) });
    setInterval(() => {
      const hands = held ? (() => { const { tx, ty } = toCamera(held.x, held.y); return [synthHand(tx, ty, held.pose, held.pinch)]; })() : [];
      onHandFrame({ t: performance.now(), landmarks: hands, width: 640, height: 480 });
    }, 33);
    (window as unknown as { __handDev: unknown }).__handDev = {
      hold(x: number, y: number, options: { pose?: Pose; pinch?: boolean } = {}) { held = { x, y, pose: options.pose ?? 'palm', pinch: options.pinch ?? false }; },
      release() { held = undefined; },
      state: () => ({ screen: app.dataset.screen, present: pointer.present, pose, pinch: stats.pinch, registered: stats.registered,
        welcome: welcomeEl.hidden ? undefined : welcomeEl.dataset.state, lookup: lookupEl.hidden ? undefined : lookupEl.classList.contains('is-dim') ? 'dim' : 'look-up' }),
    };
    active = true;
  } else if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    fail('insecure context');
  } else {
    setStatus('手の操作を準備しています…');
    void import('./handTracker.ts').then(async ({ HandTracker }) => {
      tracker = new HandTracker(video, { path: 'auto', numHands: 1, onResult: onHandFrame, onError: message => console.warn('[hand]', message) });
      await Promise.all([tracker.init(), startCamera()]);
      tracker.start(); active = true; setStatus('');
    }).catch(error => fail(String(error)));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pause(); else void resume(); });
  }
  requestAnimationFrame(frame);

  // ---- optional dev stats (endpoint exists only with SURVEY_DEV_HAND=1) -------------------------------------
  let sentUserAgent = false, logOff = false;
  const r1 = (v: number) => Number.isFinite(v) ? +v.toFixed(1) : undefined;
  setInterval(() => {
    if (logOff || dev) return;
    const body = {
      kind: 'hand-guest', build: 'm3', screen: app.dataset.screen, pose, mode: tracker?.mode ?? (layer.classList.contains('is-failed') ? 'failed' : 'starting'),
      fallbackReason: tracker?.fallbackReason || undefined, renderFps: r1(renderFps), inferFps: r1(inferFps),
      inferP50: r1(percentile(tracker?.inferMs ?? [], 0.5)), inferP95: r1(percentile(tracker?.inferMs ?? [], 0.95)),
      rttP50: r1(percentile(tracker?.roundTripMs ?? [], 0.5)), framesSent: tracker?.framesSent, framesDropped: tracker?.framesDropped,
      handPresent: pointer.present, ...stats, screenSize: `${innerWidth}x${innerHeight}@${devicePixelRatio}`,
      ...(sentUserAgent ? {} : { userAgent: navigator.userAgent }),
    };
    fetch('/api/dev/hand-spike-log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => { if (r.ok) sentUserAgent = true; else if (r.status === 404) logOff = true; })
      .catch(() => { /* offline: try again next tick */ });
  }, LOG_EVERY_MS);
}
