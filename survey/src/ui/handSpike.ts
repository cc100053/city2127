// SPIKE page (iPad voting plan, M0 + M1): measures hand tracking on the guest iPad with the reusable modules in ./hand/.
// Front camera at 640x480, no video shown; index fingertip drives a cursor over three cards (dwell 1 s or pinch).
// Runtime is self-hosted under /hand/ (npm run fetch:hand-model). ?mode=worker|main forces the inference path.
import { HandPointer, SelectGate, percentile, type Landmark, type Point } from './hand/handPointer.ts';
import { HandTracker, type HandFrame } from './hand/handTracker.ts';

const params = new URLSearchParams(location.search);
const num = (key: string, fallback: number) => { const v = Number(params.get(key)); return params.has(key) && Number.isFinite(v) ? v : fallback; };
const HANDS = num('hands', 1) >= 2 ? 2 : 1;
const DWELL_MS = num('dwell', 1000), COOLDOWN_MS = 600, LOG_EVERY_MS = 10_000;
// MediaPipe's 21-point hand topology (same pairs as HandLandmarker.HAND_CONNECTIONS).
const HAND_CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];

const style = document.createElement('style');
style.textContent = `
html,body{margin:0;height:100%;background:#05070c;color:#dfe7f2;font-family:-apple-system,"Hiragino Sans",sans-serif;overflow:hidden;
  touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#app{position:fixed;inset:0}
.cards{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:4vw;padding:0 5vw}
.card{width:27vw;height:52vh;border-radius:28px;background:linear-gradient(160deg,#17233a,#0d1424);border:2px solid #2a3a58;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2vh;transition:border-color .12s,transform .12s,background .12s}
.card.hover{border-color:#6fd3ff;transform:scale(1.03)}
.card.flash{background:linear-gradient(160deg,#1f5a7a,#123049)}
.card .label{font-size:9vh;font-weight:700;letter-spacing:.05em}
.card .sub{font-size:2.6vh;opacity:.7}
.card .count{font-size:5vh;font-variant-numeric:tabular-nums;color:#6fd3ff}
#cursor{position:absolute;left:0;top:0;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,#fff 0 30%,#7fe0ff 45%,rgba(111,211,255,0) 72%);box-shadow:0 0 18px 6px rgba(111,211,255,.55);will-change:transform}
#cursor.pinched{background:radial-gradient(circle,#fff 0 30%,#ffd36f 45%,rgba(255,211,111,0) 72%);box-shadow:0 0 22px 8px rgba(255,211,111,.6)}
#ring{position:absolute;left:0;top:0;width:84px;height:84px;margin:-42px 0 0 -42px;pointer-events:none;will-change:transform}
#hud{position:absolute;left:12px;top:10px;font:12px/1.45 ui-monospace,Menlo,monospace;background:rgba(0,0,0,.55);padding:8px 10px;border-radius:10px;
  white-space:pre;pointer-events:none;max-width:46vw;overflow:hidden}
#skel{position:absolute;right:12px;bottom:12px;width:192px;height:144px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid #223}
#overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:20px;background:rgba(5,7,12,.92);font-size:22px;text-align:center;padding:0 10vw}
#overlay.show{display:flex}
#overlay button{font-size:22px;padding:14px 36px;border-radius:14px;border:0;background:#6fd3ff;color:#05070c;font-weight:700}
video{position:absolute;width:2px;height:2px;opacity:0;pointer-events:none;left:0;top:0}
`;
document.head.append(style);

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
<div class="cards">${['A', 'B', 'C'].map((l, i) => `<div class="card" data-i="${i}"><div class="label">${l}</div><div class="sub">選択肢 ${l}</div><div class="count">0</div></div>`).join('')}</div>
<svg id="ring" viewBox="0 0 84 84"><circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="6"/>
<circle id="ringArc" cx="42" cy="42" r="36" fill="none" stroke="#6fd3ff" stroke-width="6" stroke-linecap="round" transform="rotate(-90 42 42)" stroke-dasharray="226.2" stroke-dashoffset="226.2"/></svg>
<div id="cursor"></div>
<div id="hud">起動中…</div>
<canvas id="skel" width="384" height="288"></canvas>
<div id="overlay"><div id="overlayMsg"></div><button id="retry">再試行</button></div>`;
const video = document.createElement('video');
video.muted = true; video.playsInline = true; video.autoplay = true; video.setAttribute('playsinline', '');
app.append(video);

const cards = Array.from(app.querySelectorAll<HTMLElement>('.card'));
const counts = [0, 0, 0];
const cursorEl = app.querySelector<HTMLElement>('#cursor')!, ringEl = app.querySelector<SVGElement>('#ring')!, ringArc = app.querySelector<SVGCircleElement>('#ringArc')!;
const hud = app.querySelector<HTMLElement>('#hud')!, overlay = app.querySelector<HTMLElement>('#overlay')!, overlayMsg = app.querySelector<HTMLElement>('#overlayMsg')!;
const skel = app.querySelector<HTMLCanvasElement>('#skel')!, sctx = skel.getContext('2d')!;
const RING_LEN = 2 * Math.PI * 36;

// ---- metrics --------------------------------------------------------------------------------------------
const startedAt = performance.now();
let renderCount = 0, inferFps = 0, renderFps = 0, fpsWindowStart = performance.now(), resultsAtWindow = 0;
let handLost = 0, selects = { dwell: 0, pinch: 0, touch: 0 }, cameraRes = '-', lastPinchRatio = NaN;
const errors: string[] = [];
function recordError(message: string) {
  const line = `${new Date().toISOString().slice(11, 19)} ${message}`.slice(0, 160);
  errors.push(line); if (errors.length > 5) errors.shift();
  console.error('[hand-spike]', message);
}
addEventListener('error', e => recordError(`error: ${e.message}`));
addEventListener('unhandledrejection', e => recordError(`rejection: ${String((e as PromiseRejectionEvent).reason)}`));

// ---- wake lock (same pattern as guestDebugView.ts) --------------------------------------------------------
let wakeLock: WakeLockSentinel | null = null;
async function keepScreenAwake() {
  if (wakeLock || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { /* Not allowed yet; the next touch retries. */ }
}
document.addEventListener('pointerdown', () => void keepScreenAwake());

// ---- camera -----------------------------------------------------------------------------------------------
let stream: MediaStream | undefined;
async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
  });
  video.srcObject = stream;
  await video.play();
  const s = stream.getVideoTracks()[0]?.getSettings();
  cameraRes = `${video.videoWidth}x${video.videoHeight}${s?.frameRate ? ` @${Math.round(s.frameRate)}` : ''}`;
  stream.getVideoTracks()[0]?.addEventListener('ended', () => { if (document.visibilityState === 'visible') showError('カメラが停止しました。'); });
}
function stopCamera() {
  stream?.getTracks().forEach(t => t.stop());
  stream = undefined; video.srcObject = null;
}

// ---- tracking + pointer -----------------------------------------------------------------------------------
const pathParam = params.get('mode');
const tracker = new HandTracker(video, {
  path: pathParam === 'worker' || pathParam === 'main' ? pathParam : 'auto',
  preferGpu: params.get('delegate') !== 'cpu',
  useVfc: params.get('vfc') !== '0',
  mainGapFrames: num('maingap', 3),
  numHands: HANDS,
  onResult: onHandFrame,
  onError: recordError,
});
const pointer = new HandPointer({ minCutoff: num('mincutoff', 1.0), beta: num('beta', 0.01), predictMs: params.has('predict') ? num('predict', 40) : 'auto' });
const gate = new SelectGate(DWELL_MS, COOLDOWN_MS);
let rects: DOMRect[] = [];
const measure = () => { rects = cards.map(c => c.getBoundingClientRect()); };
addEventListener('resize', measure);
const cardAt = (p: Point) => rects.findIndex(r => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom);
let lastLandmarks: Landmark[] | undefined;

function select(card: number, how: keyof typeof selects) {
  counts[card]++; selects[how]++;
  cards[card].querySelector('.count')!.textContent = String(counts[card]);
  cards[card].classList.add('flash');
  setTimeout(() => cards[card].classList.remove('flash'), 220);
}
cards.forEach((c, i) => c.addEventListener('pointerdown', () => select(i, 'touch')));

function onHandFrame(frame: HandFrame) {
  const up = pointer.update(frame.landmarks, frame.t, innerWidth, innerHeight, frame.width || 640, frame.height || 480);
  if (up.lost) handLost++;
  tracker.handPresent = pointer.present;
  lastLandmarks = up.landmarks;
  lastPinchRatio = up.pinchRatio;
  if (up.pinchAt) { const hit = gate.pinch(cardAt(up.pinchAt), performance.now()); if (hit >= 0) select(hit, 'pinch'); }
}

// ---- render loop (display rate; inference runs in the tracker) -----------------------------------------------
let running = false, rafId = 0;
function frame() {
  if (!running) return;
  rafId = requestAnimationFrame(frame);
  const now = performance.now();
  renderCount++;
  const cursor = pointer.cursorAt(now), pinched = pointer.pinch.closed;
  const hovered = cursor ? cardAt(cursor) : -1;
  // While pinched the gate is frozen (no dwell, block kept); a lost hand counts as leaving every card.
  if (!cursor) gate.hover(-1, now);
  else if (!pinched) { const dwellHit = gate.hover(hovered, now); if (dwellHit >= 0) select(dwellHit, 'dwell'); }
  cards.forEach((c, i) => c.classList.toggle('hover', i === hovered));
  if (cursor) {
    const t = `translate3d(${cursor.x}px,${cursor.y}px,0)`;
    cursorEl.style.transform = t; ringEl.style.transform = t;
    cursorEl.style.opacity = '1'; cursorEl.classList.toggle('pinched', pinched);
    const prog = pinched ? 0 : gate.progress(now);
    ringEl.style.opacity = prog > 0 ? '1' : '0';
    ringArc.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - prog)));
  } else { cursorEl.style.opacity = '0'; ringEl.style.opacity = '0'; }
  if (now - fpsWindowStart >= 1000) {
    const dt = (now - fpsWindowStart) / 1000;
    inferFps = (tracker.results - resultsAtWindow) / dt; renderFps = renderCount / dt;
    resultsAtWindow = tracker.results; renderCount = 0; fpsWindowStart = now;
    drawHud(now);
  }
  drawSkeleton();
}

function stats(now: number) {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  const r1 = (v: number) => +v.toFixed(1);
  return {
    uptimeS: Math.round((now - startedAt) / 1000), inferFps: r1(inferFps), renderFps: r1(renderFps),
    inferP50: r1(percentile(tracker.inferMs, 0.5)), inferP95: r1(percentile(tracker.inferMs, 0.95)),
    rttP50: r1(percentile(tracker.roundTripMs, 0.5)), rttP95: r1(percentile(tracker.roundTripMs, 0.95)),
    hands: HANDS, predictCapMs: r1(pointer.predictor.cap), updateMs: r1(pointer.predictor.updateInterval ?? NaN),
    mode: tracker.mode, delegate: tracker.mode.endsWith('gpu') ? 'GPU' : tracker.mode.endsWith('cpu') ? 'CPU' : '-',
    fallbackReason: tracker.fallbackReason || undefined, pump: tracker.useVfc ? 'vfc' : 'raf',
    framesSent: tracker.framesSent, framesDropped: tracker.framesDropped,
    camera: cameraRes, handLost, handPresent: pointer.present, selects: { ...selects }, counts: [...counts],
    screen: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, memoryMB: mem ? r1(mem.usedJSHeapSize / 1048576) : undefined,
    errors: [...errors],
  };
}
function drawHud(now: number) {
  const s = stats(now);
  const up = `${Math.floor(s.uptimeS / 3600)}h${String(Math.floor(s.uptimeS / 60) % 60).padStart(2, '0')}m${String(s.uptimeS % 60).padStart(2, '0')}s`;
  const f = (v: number) => Number.isFinite(v) ? v.toFixed(1) : '-';
  hud.textContent = [
    `モード     ${s.mode} (${s.pump}) 手 ${s.hands}`,
    `推論 fps   ${f(s.inferFps)}`, `描画 fps   ${f(s.renderFps)}`,
    `推論 ms    p50 ${f(s.inferP50)} / p95 ${f(s.inferP95)}`,
    `往復 ms    p50 ${f(s.rttP50)} / p95 ${f(s.rttP95)}`,
    `フレーム   送信 ${s.framesSent} / 破棄 ${s.framesDropped}`,
    `予測       上限 ${f(s.predictCapMs)} ms / 更新間隔 ${f(s.updateMs)} ms`,
    `カメラ     ${s.camera}`, `稼働       ${up}`,
    `手の喪失   ${s.handLost}  ピンチ比 ${Number.isFinite(lastPinchRatio) ? lastPinchRatio.toFixed(2) : '-'}`,
    `選択       滞留 ${selects.dwell} / ピンチ ${selects.pinch} / タッチ ${selects.touch}`,
    s.memoryMB !== undefined ? `メモリ     ${s.memoryMB} MB` : 'メモリ     -',
    ...(s.fallbackReason ? [`切替理由   ${s.fallbackReason.slice(0, 90)}`] : []),
    ...(errors.length ? ['エラー', ...errors] : []),
  ].join('\n');
}

function drawSkeleton() {
  const w = skel.width, h = skel.height;
  sctx.clearRect(0, 0, w, h);
  sctx.strokeStyle = 'rgba(111,211,255,.25)'; sctx.lineWidth = 2;
  sctx.strokeRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6); // active zone
  if (!lastLandmarks) return;
  const lm = lastLandmarks, X = (i: number) => (1 - lm[i].x) * w, Y = (i: number) => lm[i].y * h;
  sctx.strokeStyle = '#6fd3ff'; sctx.lineWidth = 3; sctx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) { sctx.moveTo(X(a), Y(a)); sctx.lineTo(X(b), Y(b)); }
  sctx.stroke();
  sctx.fillStyle = '#fff';
  for (let i = 0; i < lm.length; i++) { sctx.beginPath(); sctx.arc(X(i), Y(i), i === 8 ? 6 : 3, 0, Math.PI * 2); sctx.fill(); }
}

// ---- stats log --------------------------------------------------------------------------------------------
let sentUserAgent = false, logFailures = 0;
setInterval(() => {
  const body = { kind: 'hand-spike', build: 'm1b', ...stats(performance.now()), logFailures, ...(sentUserAgent ? {} : { userAgent: navigator.userAgent }) };
  fetch('/api/dev/hand-spike-log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (r.ok) sentUserAgent = true; else logFailures++; })
    .catch(() => { logFailures++; });
}, LOG_EVERY_MS);

// ---- lifecycle --------------------------------------------------------------------------------------------
function halt() {
  running = false; cancelAnimationFrame(rafId); tracker.pause(); stopCamera();
  lastLandmarks = undefined; pointer.reset(); tracker.handPresent = false;
}
function showError(message: string) {
  halt();
  overlayMsg.textContent = message; overlay.classList.add('show');
  recordError(message); drawHud(performance.now());
}
let starting = false, trackerReady: Promise<void> | undefined;
async function start() {
  if (starting || running) return;
  starting = true;
  overlay.classList.remove('show');
  hud.textContent = 'カメラとモデルを準備中…';
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('insecure');
    trackerReady ??= tracker.init();
    try { await Promise.all([trackerReady, startCamera()]); }
    catch (error) { if (tracker.mode === 'failed') trackerReady = undefined; throw error; }
    measure();
    running = true; fpsWindowStart = performance.now(); renderCount = 0; resultsAtWindow = tracker.results;
    rafId = requestAnimationFrame(frame);
    tracker.start();
    void keepScreenAwake();
  } catch (error) {
    const name = (error as { name?: string }).name ?? '', msg = (error as Error).message ?? String(error);
    showError(msg === 'insecure' ? 'HTTPS で開いてください（カメラは安全な接続でのみ使えます）。'
      : name === 'NotAllowedError' ? 'カメラの使用が許可されていません。設定で許可してから再試行してください。'
      : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'フロントカメラが見つかりません。'
      : name === 'NotReadableError' ? 'カメラが他のアプリで使用中です。'
      : `起動に失敗しました: ${msg}`);
  } finally { starting = false; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') halt();
  else if (!overlay.classList.contains('show')) void start();
});
app.querySelector('#retry')!.addEventListener('click', () => void start());
void start();
