// Hand control layer for the guest page, lazy-loaded by guestDebugView.ts for `/guest?hand`.
// Pinch-only: an open palm moves the cursor (palm centre) and previews what is under it; a thumb-index pinch selects.
// Fist, lowered hand or no hand = rest (no cursor, nothing fires). Welcome (住民登録) and the questions are drawn by
// the 住民の窓 hologram stage (./ui/); review, look-up and handoff still use the M3 skin over the page's own DOM.
// Either way the page's own controls do the work (start button, radios, form submit), so flow, timers and server
// calls stay in guestDebugView.ts. Touch keeps working; failures fall back to touch-only. `&dev-hand` (DEV-ONLY)
// feeds synthetic hands for tests; `&tune` shows the tuning panel, `&fps` a frame meter.
import './handGuest.css';
import { HandPointer, percentile, type Landmark, type Point } from './handPointer.ts';
import { TargetGate, nearestBox } from './handTargets.ts';
import { PoseFilter, classifyPose, synthHand, type Pose } from './handPose.ts';
import type { HandFrame, HandTracker } from './handTracker.ts';
import { Stage } from './ui/stage.ts';
import { RegisterPage } from './ui/page1Register.ts';
import { QuestionPage } from './ui/page2Question.ts';
import { mountTunePanel } from './ui/tune.ts';
import type { HandView } from './ui/types.ts';

export type HandGuestOptions = {
  app: HTMLElement;
  /** Hand presence and hand actions count as guest activity (the page's resetIdleTimer). */
  onActivity: () => void;
  /** Latest public head count (the stage reads it from the view). */
  cityGuestCount?: () => number | undefined;
  /** The page's view hook: the listener is called after every render and state change. */
  subscribe: (listener: (view: HandView) => void) => void;
  /** DEV-ONLY: feed synthetic landmarks through window.__handDev instead of the camera. */
  dev?: boolean;
};

const COOLDOWN_MS = 600, PICK_MS = 500, LOOK_UP_MS = 4000, SNAP_PX = 48, ACTIVITY_MS = 1000, LOG_EVERY_MS = 10_000;
const TARGETS = 'button, label.guest-choice, .guest-review-row';
const HOLO_SCREENS = new Set(['welcome', 'starting', 'question']);

export function mountHandGuest({ app, onActivity, subscribe, dev = false }: HandGuestOptions) {
  app.classList.add('guest--hand');
  document.body.classList.add('guest-page--hand');
  const params = new URLSearchParams(location.search);
  const layer = document.createElement('div');
  layer.className = 'hand-layer';
  layer.innerHTML = `
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
  const statusEl = $<HTMLElement>('.hand-status'), lookupEl = $<HTMLElement>('.hand-lookup');
  const setStatus = (text: string) => { statusEl.textContent = text; statusEl.hidden = !text; };

  // ---- 住民の窓 stage: acts through the page's own controls ------------------------------------------------
  const station = params.get('station');
  const stage = new Stage(station === 'A' || station === 'B' ? `STATION ${station}` : 'ODAIBA');
  const click = (el: HTMLElement | null | undefined) => { onActivity(); el?.click(); };
  const form = () => app.querySelector<HTMLFormElement>('form.guest-form');
  const pageActions = {
    start: () => click(app.querySelector<HTMLElement>('[data-auto-action="start"]:not(:disabled)')),
    keepAlive: () => click(app.querySelector<HTMLElement>('.guest-notice--warn button')),
    choose: (optionId: string) => {
      const input = Array.from(app.querySelectorAll<HTMLInputElement>('.guest-choice input')).find(item => item.value === optionId);
      if (input && !input.checked) click(input); else onActivity();
    },
    advance: () => { const f = form(); if (f?.querySelector('input:checked')) f.requestSubmit(); },
    prev: () => click(Array.from(app.querySelectorAll<HTMLButtonElement>('.guest-form .guest-actions button')).find(b => b.textContent === '前の質問へ')),
  };
  const register = new RegisterPage(stage, pageActions), questions = new QuestionPage(stage, pageActions);
  let view: HandView | undefined, current: RegisterPage | QuestionPage | undefined;
  const holoOn = () => !!view && HOLO_SCREENS.has(view.screen) && !view.needsPage;
  subscribe(next => {
    view = next;
    const on = holoOn();
    const want = !on ? undefined : next.screen === 'question' ? questions : register;
    if (want !== current) { current?.unmount(); current = want; current?.mount(); }
    stage.show(on);
    document.body.classList.toggle('guest-page--holo', on);
    current?.update(next);
  });
  stage.root.addEventListener('pointerdown', event => {
    onActivity();
    const el = (event.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (el && current) current.tap(el);
  });
  if (params.has('tune')) mountTunePanel(stage.root);
  if (params.has('fps')) { stage.enableFps(); stage.fpsExtra = () => ` · infer ${inferFps.toFixed(0)} Hz`; }

  const pointer = new HandPointer({ anchor: 'palm' });
  const poses = new PoseFilter(150);
  const gate = new TargetGate<HTMLElement>(Infinity, COOLDOWN_MS); // pinch-only: hovering never fires
  let landmarks: Landmark[] | undefined, frameSize = { w: 640, h: 480 }, pendingPinch: Point | undefined, pinchEdge = false;
  let pose: Pose = 'rest', lastActivity = 0, screenKey = '', hovered: HTMLElement | null = null, resultShownAt = 0, pickedAt = 0;
  const stats = { pinch: 0, handLost: 0, frames: 0, get registered() { return register.registrations; } };

  // ---- M3 targets (review, handoff and other page screens) ---------------------------------------------------
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
      // Only when the page's own question screen is in charge (session errors): pick, then advance.
      const input = target.querySelector<HTMLInputElement>('input');
      if (input && !input.checked) input.click();
      pickedAt = now;
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

  // ---- the one render loop (owned by the stage) -------------------------------------------------------------
  let renderCount = 0, renderFps = 0, fpsStart = performance.now(), resultsAt = 0, inferFps = 0;
  function frame(now: number, dt: number) {
    renderCount++;
    const screen = app.dataset.screen ?? '';
    const key = `${screen}|${app.querySelector('h1')?.textContent ?? ''}`;
    if (key !== screenKey) { screenKey = key; if (screen === 'result') resultShownAt = now; pickedAt = 0; }
    // Pose: a pinch keeps the palm in control; everything else is filtered with 150 ms hysteresis.
    const raw = pointer.present ? classifyPose(landmarks, frameSize.w, frameSize.h) : 'rest';
    pose = poses.update(pointer.pinch.closed && pose === 'palm' ? 'palm' : raw, now);
    const edge = pinchEdge, pinchAt = pendingPinch;
    pinchEdge = false; pendingPinch = undefined;
    const controlling = active && pose === 'palm' && pointer.present;
    const cursor = controlling ? pointer.cursorAt(now) : undefined;
    if (pointer.present && now - lastActivity > ACTIVITY_MS) { lastActivity = now; onActivity(); }

    const holo = holoOn() && !!current;
    if (holo) {
      if (edge && controlling) { stats.pinch++; onActivity(); }
      current!.frame({
        now, dt, cursor: cursor && stage.toStage(cursor), present: active && pointer.present,
        pinch: edge && controlling && pinchAt ? stage.toStage(pinchAt) : undefined, pinchClosed: pointer.pinch.closed,
        landmarks: active ? landmarks : undefined, frameW: frameSize.w, frameH: frameSize.h,
      });
      stage.setPose(controlling);
    }

    // Look-up when the city display of this proposal starts, dimmed after LOOK_UP_MS.
    const lookupOn = screen === 'result';
    lookupEl.hidden = !lookupOn;
    if (lookupOn) {
      lookupEl.classList.toggle('is-dim', now - resultShownAt > LOOK_UP_MS);
      const number = app.querySelector('.guest-result-number')?.textContent ?? '';
      $<HTMLElement>('.hl-eyebrow').textContent = number ? `${number} の声を記録しました` : '';
    }

    // M3 pointing cursor, preview and pinch over the page's DOM (never on holo screens: hidden buttons stay inert).
    const domCursor = !holo && !lookupOn ? cursor : undefined;
    const target = domCursor ? targetAt(domCursor) : null;
    gate.hover(target, now);
    if (!holo && !lookupOn && edge && controlling && pinchAt) { const fired = gate.pinch(targetAt(pinchAt), now); if (fired) activate(fired, now); }
    if (pickedAt && now - pickedAt > PICK_MS) { pickedAt = 0; const f = form(); if (f?.querySelector('input:checked')) f.requestSubmit(); }
    if (target !== hovered) { hovered?.classList.remove('is-hand-hover'); target?.classList.add('is-hand-hover'); hovered = target; }
    layer.classList.toggle('has-cursor', !!domCursor);
    if (domCursor) {
      cursorEl.style.transform = `translate3d(${domCursor.x}px,${domCursor.y}px,0)`;
      cursorEl.classList.toggle('is-pinched', pointer.pinch.closed);
    }
    const handOn = active && !holo && !lookupOn;
    stateEl.hidden = !handOn;
    stateEl.classList.toggle('is-point', controlling);
    stateText.textContent = controlling ? '手のひらで操作中' : '休止中 — 手のひらを向けると操作';

    if (now - fpsStart >= 1000) {
      const span = (now - fpsStart) / 1000, results = tracker?.results ?? stats.frames;
      renderFps = renderCount / span; inferFps = (results - resultsAt) / span; resultsAt = results; renderCount = 0; fpsStart = now;
    }
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
  function rest() { pointer.reset(); poses.reset(); landmarks = undefined; if (tracker) tracker.handPresent = false; }
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
      /** Viewport point of a stage point (the stage is letterboxed and scaled). */
      fromStage(x: number, y: number) { const r = stage.el.getBoundingClientRect(); return { x: r.left + x * stage.scale, y: r.top + y * stage.scale }; },
      state: () => ({ screen: app.dataset.screen, present: pointer.present, pose, pinch: stats.pinch, registered: stats.registered,
        holo: holoOn() && current ? { page: current.name, ...current.debug() } : undefined,
        lookup: lookupEl.hidden ? undefined : lookupEl.classList.contains('is-dim') ? 'dim' : 'look-up' }),
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
  stage.start(frame);

  // ---- optional dev stats (endpoint exists only with SURVEY_DEV_HAND=1) -------------------------------------
  let sentUserAgent = false, logOff = false;
  const r1 = (v: number) => Number.isFinite(v) ? +v.toFixed(1) : undefined;
  setInterval(() => {
    if (logOff || dev) return;
    const body = {
      kind: 'hand-guest', build: 'holo1', screen: app.dataset.screen, pose, mode: tracker?.mode ?? (layer.classList.contains('is-failed') ? 'failed' : 'starting'),
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
