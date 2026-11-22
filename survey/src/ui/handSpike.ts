// SPIKE (M0 hand tracking, iPad voting plan): measures MediaPipe HandLandmarker on the guest iPad.
// Front camera at 640x480, no video shown; index fingertip drives a cursor over three cards (dwell 1 s or pinch).
// Runtime is self-hosted under /hand/ (npm run fetch:hand-model). Not product code.
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { History, OneEuro, Pinch, SelectGate, handBox, percentile, pickHand, pinchRatio, zoneToScreen, type HandBox, type Point } from './handSpikeCore.ts';

const params = new URLSearchParams(location.search);
const num = (key: string, fallback: number) => { const v = Number(params.get(key)); return params.has(key) && Number.isFinite(v) ? v : fallback; };
const DWELL_MS = num('dwell', 1000), COOLDOWN_MS = 600, PINCH_LOOKBACK_MS = 100, LOG_EVERY_MS = 10_000;
const euro = { minCutoff: num('mincutoff', 1.0), beta: num('beta', 0.01) };

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
const inferMs: number[] = [];
let inferCount = 0, renderCount = 0, inferFps = 0, renderFps = 0, fpsWindowStart = performance.now();
let handLost = 0, selects = { dwell: 0, pinch: 0, touch: 0 }, cameraRes = '-', delegate = '-', gpuFallbackReason = '';
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

// ---- landmarker -------------------------------------------------------------------------------------------
let landmarker: HandLandmarker | undefined;
let fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | undefined;
async function createLandmarker(which: 'GPU' | 'CPU') {
  fileset ??= await FilesetResolver.forVisionTasks('/hand/wasm');
  const lm = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: '/hand/hand_landmarker.task', delegate: which },
    runningMode: 'VIDEO', numHands: 2,
    minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  });
  delegate = which;
  return lm;
}
async function ensureLandmarker() {
  if (landmarker) return;
  if (params.get('delegate') !== 'cpu') {
    try { landmarker = await createLandmarker('GPU'); return; }
    catch (error) { gpuFallbackReason = String(error).slice(0, 80); recordError(`GPU delegate failed, using CPU: ${gpuFallbackReason}`); }
  }
  landmarker = await createLandmarker('CPU');
}
async function fallBackToCpu(reason: string) {
  recordError(`GPU detect failed, switching to CPU: ${reason}`);
  gpuFallbackReason = reason.slice(0, 80);
  landmarker?.close(); landmarker = undefined;
  landmarker = await createLandmarker('CPU');
}

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

// ---- interaction state ------------------------------------------------------------------------------------
const fx = new OneEuro(euro.minCutoff, euro.beta), fy = new OneEuro(euro.minCutoff, euro.beta);
const history = new History(), pinch = new Pinch(), gate = new SelectGate(DWELL_MS, COOLDOWN_MS);
let rects: DOMRect[] = [];
const measure = () => { rects = cards.map(c => c.getBoundingClientRect()); };
addEventListener('resize', measure);
const cardAt = (p: Point) => rects.findIndex(r => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom);

let cursor: Point | undefined, frozen: Point | undefined, prevBox: HandBox | undefined, lastLandmarks: { x: number; y: number }[] | undefined;
let handPresent = false, lastVideoTime = -1, lastPinchRatio = NaN;

function select(card: number, how: keyof typeof selects) {
  counts[card]++; selects[how]++;
  cards[card].querySelector('.count')!.textContent = String(counts[card]);
  cards[card].classList.add('flash');
  setTimeout(() => cards[card].classList.remove('flash'), 220);
}
cards.forEach((c, i) => c.addEventListener('pointerdown', () => select(i, 'touch')));

function onResult(result: HandLandmarkerResult, now: number) {
  const hands = result.landmarks;
  if (!hands.length) {
    if (handPresent) handLost++;
    handPresent = false; prevBox = undefined; cursor = undefined; frozen = undefined; lastLandmarks = undefined;
    fx.reset(); fy.reset(); history.clear(); pinch.reset();
    return;
  }
  handPresent = true;
  const boxes = hands.map(handBox), pick = pickHand(boxes, prevBox);
  const lm = hands[pick];
  prevBox = boxes[pick]; lastLandmarks = lm;
  const raw = zoneToScreen(lm[8], innerWidth, innerHeight);
  const p = { x: fx.filter(raw.x, now / 1000), y: fy.filter(raw.y, now / 1000) };
  history.push(now, p);
  lastPinchRatio = pinchRatio(lm, video.videoWidth || 640, video.videoHeight || 480);
  if (pinch.update(lastPinchRatio)) {
    frozen = history.at(now - PINCH_LOOKBACK_MS) ?? p;
    const hit = gate.pinch(cardAt(frozen), now);
    if (hit >= 0) select(hit, 'pinch');
  }
  if (!pinch.closed) frozen = undefined;
  cursor = frozen ?? p;
}

// ---- loops ------------------------------------------------------------------------------------------------
let running = false, rafId = 0, vfcId = 0, detecting = false;
// New camera frames drive inference: requestVideoFrameCallback where available (Safari 15.4+), else a currentTime check per render frame.
const useVfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype && params.get('vfc') !== '0';
function detect() {
  if (!landmarker || detecting || video.readyState < 2) return;
  const t0 = performance.now();
  try {
    const result = landmarker.detectForVideo(video, t0);
    const ms = performance.now() - t0;
    inferMs.push(ms); if (inferMs.length > 300) inferMs.shift();
    inferCount++;
    onResult(result, t0);
  } catch (error) {
    if (delegate === 'GPU') { detecting = true; void fallBackToCpu(String(error)).finally(() => { detecting = false; }); }
    else recordError(`detect: ${String(error)}`);
  }
}
function onVideoFrame() {
  if (!running) return;
  vfcId = video.requestVideoFrameCallback(onVideoFrame);
  detect();
}
function frame() {
  if (!running) return;
  rafId = requestAnimationFrame(frame);
  const now = performance.now();
  renderCount++;
  if (!useVfc && video.currentTime !== lastVideoTime) { lastVideoTime = video.currentTime; detect(); }
  // Selection gate and visuals run every render frame.
  const hovered = cursor ? cardAt(cursor) : -1;
  // While pinched the gate is frozen (no dwell, block kept); a lost hand counts as leaving every card.
  if (!cursor) gate.hover(-1, now);
  else if (!pinch.closed) { const dwellHit = gate.hover(hovered, now); if (dwellHit >= 0) select(dwellHit, 'dwell'); }
  cards.forEach((c, i) => c.classList.toggle('hover', i === hovered));
  if (cursor) {
    const t = `translate3d(${cursor.x}px,${cursor.y}px,0)`;
    cursorEl.style.transform = t; ringEl.style.transform = t;
    cursorEl.style.opacity = '1'; cursorEl.classList.toggle('pinched', pinch.closed);
    const prog = pinch.closed ? 0 : gate.progress(now);
    ringEl.style.opacity = prog > 0 ? '1' : '0';
    ringArc.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - prog)));
  } else { cursorEl.style.opacity = '0'; ringEl.style.opacity = '0'; }
  if (now - fpsWindowStart >= 1000) {
    const dt = (now - fpsWindowStart) / 1000;
    inferFps = inferCount / dt; renderFps = renderCount / dt; inferCount = 0; renderCount = 0; fpsWindowStart = now;
    drawHud(now);
  }
  drawSkeleton();
}

function stats(now: number) {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  return {
    uptimeS: Math.round((now - startedAt) / 1000), inferFps: +inferFps.toFixed(1), renderFps: +renderFps.toFixed(1),
    inferP50: +percentile(inferMs, 0.5).toFixed(1), inferP95: +percentile(inferMs, 0.95).toFixed(1),
    camera: cameraRes, delegate, gpuFallbackReason: gpuFallbackReason || undefined, handLost, handPresent, selects: { ...selects }, counts: [...counts],
    screen: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, memoryMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : undefined,
    errors: [...errors],
  };
}
function drawHud(now: number) {
  const s = stats(now);
  const up = `${Math.floor(s.uptimeS / 3600)}h${String(Math.floor(s.uptimeS / 60) % 60).padStart(2, '0')}m${String(s.uptimeS % 60).padStart(2, '0')}s`;
  hud.textContent = [
    `推論 fps   ${s.inferFps.toFixed(1)}`, `描画 fps   ${s.renderFps.toFixed(1)}`,
    `推論 ms    p50 ${s.inferP50.toFixed(1)} / p95 ${s.inferP95.toFixed(1)}`,
    `カメラ     ${s.camera}`, `デリゲート ${s.delegate}${useVfc ? ' (vfc)' : ' (raf)'}`, `稼働       ${up}`,
    `手の喪失   ${s.handLost}  ピンチ比 ${Number.isFinite(lastPinchRatio) ? lastPinchRatio.toFixed(2) : '-'}`,
    `選択       滞留 ${selects.dwell} / ピンチ ${selects.pinch} / タッチ ${selects.touch}`,
    s.memoryMB !== undefined ? `メモリ     ${s.memoryMB} MB` : 'メモリ     -',
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
  for (const { start, end } of HandLandmarker.HAND_CONNECTIONS) { sctx.moveTo(X(start), Y(start)); sctx.lineTo(X(end), Y(end)); }
  sctx.stroke();
  sctx.fillStyle = '#fff';
  for (let i = 0; i < lm.length; i++) { sctx.beginPath(); sctx.arc(X(i), Y(i), i === 8 ? 6 : 3, 0, Math.PI * 2); sctx.fill(); }
}

// ---- stats log --------------------------------------------------------------------------------------------
let sentUserAgent = false, logFailures = 0;
setInterval(() => {
  const body = { kind: 'hand-spike', ...stats(performance.now()), logFailures, ...(sentUserAgent ? {} : { userAgent: navigator.userAgent }) };
  fetch('/api/dev/hand-spike-log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (r.ok) sentUserAgent = true; else logFailures++; })
    .catch(() => { logFailures++; });
}, LOG_EVERY_MS);

// ---- lifecycle --------------------------------------------------------------------------------------------
function showError(message: string) {
  running = false; cancelAnimationFrame(rafId); if (useVfc) video.cancelVideoFrameCallback(vfcId); stopCamera();
  overlayMsg.textContent = message; overlay.classList.add('show');
  recordError(message); drawHud(performance.now());
}
let starting = false;
async function start() {
  if (starting || running) return;
  starting = true;
  overlay.classList.remove('show');
  hud.textContent = 'カメラとモデルを準備中…';
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('insecure');
    await Promise.all([ensureLandmarker(), startCamera()]);
    measure();
    lastVideoTime = -1; running = true; fpsWindowStart = performance.now(); inferCount = renderCount = 0;
    rafId = requestAnimationFrame(frame);
    if (useVfc) vfcId = video.requestVideoFrameCallback(onVideoFrame);
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
function pause() {
  running = false; cancelAnimationFrame(rafId); if (useVfc) video.cancelVideoFrameCallback(vfcId); stopCamera();
  cursor = undefined; lastLandmarks = undefined; handPresent = false; prevBox = undefined;
  fx.reset(); fy.reset(); history.clear(); pinch.reset();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') pause();
  else if (!overlay.classList.contains('show')) void start();
});
app.querySelector('#retry')!.addEventListener('click', () => void start());
void start();
