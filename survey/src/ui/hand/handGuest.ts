// Hand control layer for the guest page (M2), lazy-loaded by guestDebugView.ts for `/guest?hand`.
// The index fingertip drives a cursor; dwelling 1 s or pinching clicks the actionable element under it, so every
// action runs through the page's own click/change/submit handlers. Touch keeps working; failures fall back to
// touch-only with one status line. `&dev-hand` (DEV-ONLY) replaces the camera with window.__handDev for tests.
import './handGuest.css';
import { HandPointer, percentile, type Landmark, type Point } from './handPointer.ts';
import { AutoAdvance, TargetGate, nearestBox } from './handTargets.ts';
import type { HandFrame, HandTracker } from './handTracker.ts';

export type HandGuestOptions = {
  app: HTMLElement;
  /** Hand presence and hand actions count as guest activity (the page's resetIdleTimer). */
  onActivity: () => void;
  /** DEV-ONLY: feed synthetic landmarks through window.__handDev instead of the camera. */
  dev?: boolean;
};

const DWELL_MS = 1000, COOLDOWN_MS = 600, ADVANCE_MS = 800, SNAP_PX = 56, ACTIVITY_MS = 1000, LOG_EVERY_MS = 10_000;
const TARGETS = 'button, label.guest-choice, .guest-review-row';
const RING_LEN = 2 * Math.PI * 36;
const HAND_CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];

export function mountHandGuest({ app, onActivity, dev = false }: HandGuestOptions) {
  app.classList.add('guest--hand');
  document.body.classList.add('guest-page--hand');
  const overlay = document.createElement('div');
  overlay.className = 'hand-layer';
  overlay.innerHTML = `
<svg class="hand-ring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="36" class="hand-ring-track"/>
<circle cx="42" cy="42" r="36" class="hand-ring-arc" transform="rotate(-90 42 42)" stroke-dasharray="${RING_LEN}" stroke-dashoffset="${RING_LEN}"/></svg>
<div class="hand-cursor" aria-hidden="true"></div>
<p class="hand-prompt" role="status" aria-live="polite"></p>
<p class="hand-status" role="status"></p>
<canvas class="hand-skeleton" width="240" height="180" aria-hidden="true"></canvas>`;
  document.body.append(overlay);
  const cursorEl = overlay.querySelector<HTMLElement>('.hand-cursor')!, ringEl = overlay.querySelector<SVGElement>('.hand-ring')!;
  const ringArc = overlay.querySelector<SVGCircleElement>('.hand-ring-arc')!, promptEl = overlay.querySelector<HTMLElement>('.hand-prompt')!;
  const statusEl = overlay.querySelector<HTMLElement>('.hand-status')!, skel = overlay.querySelector<HTMLCanvasElement>('.hand-skeleton')!;
  const sctx = skel.getContext('2d')!;
  const setStatus = (text: string) => { statusEl.textContent = text; statusEl.hidden = !text; };

  const pointer = new HandPointer();
  const gate = new TargetGate<HTMLElement>(DWELL_MS, COOLDOWN_MS);
  const advance = new AutoAdvance(ADVANCE_MS);
  let landmarks: Landmark[] | undefined, lastActivity = 0, screenKey = '';
  let hovered: HTMLElement | null = null, confirmed: HTMLElement | null = null;
  const stats = { dwell: 0, pinch: 0, handLost: 0, frames: 0 };

  // ---- targets --------------------------------------------------------------------------------------------
  const usable = (t: HTMLElement) => {
    if (t.matches('.guest-review-row')) return !!t.querySelector('button:not(:disabled)');
    if (t.matches('button')) return !(t as HTMLButtonElement).disabled && !t.closest('.guest-review-row');
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
  function activate(target: HTMLElement, how: 'dwell' | 'pinch', now: number) {
    stats[how]++;
    onActivity();
    if (target.matches('label.guest-choice')) {
      const input = target.querySelector<HTMLInputElement>('input');
      if (input && !input.checked) input.click(); // the page's change handler records the draft
      confirmed?.classList.remove('is-hand-confirm');
      confirmed = target; target.classList.add('is-hand-confirm');
      advance.schedule(screenKey, now);
    } else if (target.matches('.guest-review-row')) target.querySelector<HTMLButtonElement>('button')?.click();
    else target.click();
  }

  // ---- hand frames ----------------------------------------------------------------------------------------
  function onHandFrame(frame: HandFrame) {
    stats.frames++;
    const up = pointer.update(frame.landmarks, frame.t, innerWidth, innerHeight, frame.width || 640, frame.height || 480);
    if (up.lost) stats.handLost++;
    if (tracker) tracker.handPresent = pointer.present;
    landmarks = up.landmarks;
    if (up.pinchAt) {
      const now = performance.now(), fired = gate.pinch(targetAt(up.pinchAt), now);
      if (fired) activate(fired, 'pinch', now);
    }
  }

  // ---- render loop ----------------------------------------------------------------------------------------
  let rafId = 0, renderCount = 0, renderFps = 0, fpsStart = performance.now(), resultsAt = 0, inferFps = 0;
  function frame() {
    rafId = requestAnimationFrame(frame);
    const now = performance.now();
    renderCount++;
    const key = `${app.dataset.screen ?? ''}|${app.querySelector('h1')?.textContent ?? ''}`;
    if (key !== screenKey) { screenKey = key; gate.blockUntilLeave(); confirmed = null; }
    const cursor = pointer.cursorAt(now), pinched = pointer.pinch.closed;
    const target = cursor ? targetAt(cursor) : null;
    if (!cursor) gate.hover(null, now);
    else if (!pinched) { const fired = gate.hover(target, now); if (fired) activate(fired, 'dwell', now); }
    if (advance.due(screenKey, now)) {
      const form = app.querySelector<HTMLFormElement>('form.guest-form');
      if (form?.querySelector('input:checked')) form.requestSubmit(); // same path as 次へ / 回答を確認する
    }
    if (pointer.present && now - lastActivity > ACTIVITY_MS) { lastActivity = now; onActivity(); }
    if (target !== hovered) { hovered?.classList.remove('is-hand-hover'); target?.classList.add('is-hand-hover'); hovered = target; }

    if (cursor) {
      const t = `translate3d(${cursor.x}px,${cursor.y}px,0)`;
      cursorEl.style.transform = t; ringEl.style.transform = t;
      overlay.classList.add('has-hand'); cursorEl.classList.toggle('is-pinched', pinched);
      const progress = pinched ? 0 : gate.progress(now);
      ringEl.style.opacity = progress > 0 ? '1' : '0';
      ringArc.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - progress)));
    } else overlay.classList.remove('has-hand');

    const welcome = app.dataset.screen === 'welcome';
    const start = app.querySelector<HTMLElement>('[data-auto-action="start"]');
    start?.classList.toggle('is-hand-suggest', welcome && pointer.present);
    promptEl.textContent = !welcome || !active ? '' : pointer.present ? '「はじめる」に指先を合わせてください' : '画面に手をかざしてください';
    promptEl.hidden = !promptEl.textContent;

    if (now - fpsStart >= 1000) {
      const dt = (now - fpsStart) / 1000, results = tracker?.results ?? stats.frames;
      renderFps = renderCount / dt; inferFps = (results - resultsAt) / dt; resultsAt = results; renderCount = 0; fpsStart = now;
    }
    drawSkeleton();
  }
  function drawSkeleton() {
    const w = skel.width, h = skel.height;
    sctx.clearRect(0, 0, w, h);
    sctx.strokeStyle = 'rgba(148,201,194,.3)'; sctx.lineWidth = 2;
    sctx.strokeRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
    if (!landmarks) return;
    const lm = landmarks, X = (i: number) => (1 - lm[i].x) * w, Y = (i: number) => lm[i].y * h;
    sctx.strokeStyle = '#94c9c2'; sctx.lineWidth = 3; sctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) { sctx.moveTo(X(a), Y(a)); sctx.lineTo(X(b), Y(b)); }
    sctx.stroke();
  }

  // ---- source: camera + tracker, or DEV landmarks ---------------------------------------------------------
  let tracker: HandTracker | undefined, active = false;
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.autoplay = true; video.setAttribute('playsinline', '');
  video.className = 'hand-video';
  overlay.append(video);
  let stream: MediaStream | undefined;
  const stopCamera = () => { stream?.getTracks().forEach(t => t.stop()); stream = undefined; video.srcObject = null; };
  async function startCamera() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } });
    video.srcObject = stream;
    await video.play();
  }
  function fail(reason: string) {
    active = false; tracker?.pause(); stopCamera(); pointer.reset(); landmarks = undefined;
    overlay.classList.add('is-failed');
    setStatus('手の操作は利用できません。画面をタッチして操作してください。');
    console.warn('[hand] touch only:', reason);
  }
  let resuming = false;
  async function resume() {
    if (active || resuming || overlay.classList.contains('is-failed') || document.visibilityState !== 'visible' || !tracker) return;
    resuming = true;
    try { await startCamera(); tracker.start(); active = true; setStatus(''); }
    catch (error) { fail(`camera: ${String(error)}`); }
    finally { resuming = false; }
  }
  function pause() { active = false; tracker?.pause(); stopCamera(); pointer.reset(); landmarks = undefined; if (tracker) tracker.handPresent = false; }

  if (dev) {
    // DEV-ONLY test hook: holds a synthetic hand with the index fingertip at a screen point, fed at 30 Hz.
    let held: { x: number; y: number; pinch: boolean } | undefined;
    const synth = (x: number, y: number, pinch: boolean): Landmark[] => {
      const tx = 1 - 0.2 - 0.6 * (x / innerWidth), ty = 0.2 + 0.6 * (y / innerHeight);
      const h = Array.from({ length: 21 }, () => ({ x: tx, y: ty + 0.1 }));
      h[0] = { x: tx, y: ty + 0.3 }; h[8] = { x: tx, y: ty };
      h[4] = pinch ? { x: tx, y: ty } : { x: tx + 0.1, y: ty + 0.1 };
      return h;
    };
    setInterval(() => onHandFrame({ t: performance.now(), landmarks: held ? [synth(held.x, held.y, held.pinch)] : [], width: 640, height: 480 }), 33);
    (window as unknown as { __handDev: unknown }).__handDev = {
      hold(x: number, y: number, pinch = false) { held = { x, y, pinch }; },
      release() { held = undefined; },
      state: () => ({ screen: app.dataset.screen, present: pointer.present, dwell: stats.dwell, pinch: stats.pinch }),
    };
    active = true; setStatus('');
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
  rafId = requestAnimationFrame(frame);

  // ---- optional dev stats (endpoint exists only with SURVEY_DEV_HAND=1) -------------------------------------
  let sentUserAgent = false, logOff = false;
  const r1 = (v: number) => Number.isFinite(v) ? +v.toFixed(1) : undefined;
  setInterval(() => {
    if (logOff || dev) return;
    const body = {
      kind: 'hand-guest', build: 'm2', screen: app.dataset.screen, mode: tracker?.mode ?? (overlay.classList.contains('is-failed') ? 'failed' : 'starting'),
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
