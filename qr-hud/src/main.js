import QRCodeStyling from 'qr-code-styling';
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import { createBuildingQr } from './buildingQr.js';
import { api } from './api.js';
import { setupOperator } from './operator.js';
import './style.css';

const $ = selector => document.querySelector(selector);
const stageLabels = ['待機中', '暗号化中', '送信中', '完了'];
const descriptions = ['アーカイブの作成待ち', '都市データを暗号化中', 'バックグラウンド送信のデモ', '提案のアーカイブが完成しました'];
const terminal = $('#terminal');
const archiveId = new URLSearchParams(location.search).get('archive');
const integrated = !!archiveId && location.pathname.startsWith('/qr/');
let archivedView;
if (integrated) {
  try {
    const record = await api(`/api/archives/${encodeURIComponent(archiveId)}`);
    if (record.view?.layout?.version !== 2) throw new Error('Invalid archived city');
    archivedView = record.view;
  } catch (error) { console.warn('City buildings unavailable; using a standard QR.', error); }
}
let buildingQr;
try { if (!integrated || archivedView) { buildingQr = createBuildingQr($('#qr'), archiveId, archivedView); document.body.classList.add('building-qr'); } }
catch (error) { console.warn('3D QR unavailable; using the standard QR.', error); }
const hologram = { reset() { buildingQr?.reset(); }, reveal() { buildingQr?.showControls(); buildingQr?.reveal(); }, dispose() { buildingQr?.dispose(); } };
if (integrated) document.body.classList.add('integrated-qr');
const config = integrated ? { configured: true, authenticated: true, publicBaseUrl: location.origin }
  : await api('/api/config').catch(() => ({ configured: false, authenticated: false, backendUnavailable: true }));
const makeSession = () => `session_${crypto.getRandomValues(new Uint32Array(1))[0] % 900 + 100}`;
const defaultDemoUrl = 'https://www.hal.ac.jp/tokyo';
const makeUrl = session => config.configured
  ? `${config.publicBaseUrl}/city/${encodeURIComponent(session)}`
  : defaultDemoUrl;
let session = config.configured ? '' : makeSession();
let targetUrl = makeUrl(session);
let archiveNumber = config.configured ? 0 : Number(session.split('_')[1]);
let runId = 0;
let animationFrame;
let remoteTimer;
let remoteInFlight = false;
let creatingSession = false;

const operator = setupOperator({ config, getSession: () => session, onLogin: restoreOrCreate, onSessionUpdate: refreshRemote });
$('#operator-launch').addEventListener('click', () => operator.open());
if (config.configured) {
  $('#environment-label').textContent = 'オンライン';
  $('#network-description').textContent = '都市アーカイブに接続';
  $('.dev-panel small').textContent = '再生してもセッションは増えません。アップロード画面から送信できます。';
} else if (config.backendUnavailable) {
  $('#environment-label').textContent = 'デモ / オフライン';
}

async function refreshRemote() {
  if (!config.configured || !session || terminal.dataset.state !== 'ready' || remoteInFlight) return;
  const expectedSession = session;
  remoteInFlight = true;
  try {
    const record = await api(`/api/sessions/${encodeURIComponent(expectedSession)}`);
    if (session !== expectedSession || terminal.dataset.state !== 'ready') return;
    archiveNumber = record.proposal_number;
    $('#archive-number').textContent = String(archiveNumber).padStart(3, '0');
    setStage({ queued: 0, uploading: 2, ready: 3, failed: 0 }[record.status] ?? 0);
    $('#archive-status').textContent = { queued: '待機中', uploading: '送信中', ready: '公開済み', failed: '再試行待ち' }[record.status] || '確認中';
    $('#archive-description').textContent = { queued: 'メディアのアップロード待ち', uploading: 'メディアをバックグラウンドで送信中', ready: 'スマートフォンで結果をご覧いただけます', failed: '送信に失敗しました。再試行待ちです。' }[record.status];
    $('#result-title').textContent = `提案 No. ${archiveNumber} の記録${record.status === 'ready' ? 'が完成しました' : 'を作成しました'}`;
    $('#scan-hint').textContent = record.status === 'ready' ? 'スマートフォンでQRコードを読み取り、あなたの提案をご覧ください' : 'QRコードから結果ページへ。準備ができ次第、自動で表示されます。';
    $('#network-status').textContent = '接続済み';
    if (integrated) {
      $('#archive-description').textContent = '回答完了時の3D都市を保存しました';
      $('#scan-hint').textContent = '会場Wi-Fiに接続して読み取り、3D都市を回転・拡大してください';
      $('#result-title').textContent = `提案 No. ${archiveNumber} の3D都市`;
    }
  } catch (error) {
    if (session === expectedSession) {
      $('#archive-status').textContent = error.status === 404 ? '見つかりません' : '再接続中';
      $('#archive-description').textContent = error.status === 404 ? '有効なセッションを作成してください' : '接続が切れました。自動で再接続しています';
    }
  } finally { remoteInFlight = false; }
}

function locked(message = 'スタッフログインが必要です') {
  cancelAnimationFrame(animationFrame);
  clearInterval(remoteTimer);
  hologram.reset();
  terminal.dataset.state = 'locked';
  $('#transfer-title').textContent = message;
  $('#ready-label').textContent = '2127 CIVIC ARCHIVE — ログイン待ち';
  $('#result-title').textContent = '都市アーカイブに接続';
  $('#scan-hint').textContent = '右下の「メディア管理」からログインしてください';
  $('#archive-status').textContent = 'セッション待ち';
  $('#session-status').textContent = '—';
  $('#target-link').textContent = '';
  $('#target-link').removeAttribute('href');
}

async function createSession() {
  if (creatingSession) return;
  creatingSession = true;
  $('#simulate').disabled = true;
  try {
    const record = await api('/api/sessions', { method: 'POST' });
    session = record.id;
    archiveNumber = record.proposal_number;
    targetUrl = record.city_url;
    sessionStorage.setItem('2127-current-session', session);
    syncInputs(); operator.sessionChanged(); play();
  } catch (error) {
    $('#form-error').textContent = error.message;
    if (!session) locked(error.status === 401 ? 'スタッフログインが必要です' : '接続できませんでした。もう一度お試しください');
    else $('#scan-hint').textContent = error.message;
    if (error.status === 401) operator.open();
    throw error;
  } finally { creatingSession = false; $('#simulate').disabled = false; }
}

async function restoreOrCreate() {
  const saved = sessionStorage.getItem('2127-current-session');
  if (saved) {
    try {
      const record = await api(`/api/sessions/${encodeURIComponent(saved)}`);
      session = record.id; archiveNumber = record.proposal_number; targetUrl = makeUrl(session);
      syncInputs(); operator.sessionChanged(); play();
      return;
    } catch (error) { if (error.status !== 404) throw error; }
  }
  await createSession();
}

const qrOptions = {
  width: 640,
  height: 640,
  type: 'canvas',
  // Short payloads receive a larger border below to retain >= 4 modules.
  margin: 64,
  qrOptions: { errorCorrectionLevel: 'H', mode: 'Byte' },
  dotsOptions: {
    type: 'dots',
    gradient: { type: 'linear', rotation: Math.PI / 4, colorStops: [{ offset: 0, color: '#99f5fa' }, { offset: 1, color: '#efa9e1' }] },
  },
  cornersSquareOptions: { type: 'square', color: '#bbf5fa' },
  cornersDotOptions: { type: 'square', color: '#d6c4f0' },
  backgroundOptions: { color: '#0b111d' },
  image: `${import.meta.env.BASE_URL}badge.svg`,
  imageOptions: { hideBackgroundDots: true, imageSize: .2, margin: 5 },
};

function setStage(index) {
  $('#archive-status').textContent = stageLabels[index];
  $('#archive-description').textContent = descriptions[index];
  $('#sequence').textContent = `0${index + 1} / 04`;
  document.querySelectorAll('[data-stage]').forEach((node, i) => {
    node.classList.toggle('active', i <= index);
    node.classList.toggle('current', i === index);
  });
}

function syncInputs() {
  $('#session-input').value = session;
  $('#url-input').value = targetUrl;
}

async function play() {
  if (config.configured && !session) { locked(); return; }
  const currentRun = ++runId;
  clearInterval(remoteTimer);
  cancelAnimationFrame(animationFrame);
  hologram.reset();
  terminal.dataset.state = 'loading';
  $('#qr').replaceChildren();
  $('#form-error').textContent = '';
  $('#session-status').textContent = session;
  $('#archive-number').textContent = String(archiveNumber).padStart(3, '0');
  $('#network-status').textContent = '送信中';
  $('#ready-label').textContent = '2127 CIVIC ARCHIVE — 接続中';
  $('#result-title').textContent = 'あなたの想いを、街の記録に。';
  $('#scan-hint').textContent = 'データを処理しています。しばらくお待ちください。';
  $('#transfer-title').textContent = config.configured ? 'アーカイブのリンクを作成中' : '都市データを暗号化・送信中';
  $('#target-link').textContent = '';
  $('#target-link').removeAttribute('href');
  setStage(0);
  let qrReady = false;
  let qrFailed = false;
  if (buildingQr) {
    try { buildingQr.build(targetUrl); qrReady = true; }
    catch (error) { buildingQr.dispose(); buildingQr = undefined; document.body.classList.remove('building-qr'); console.warn('Using standard QR', error); }
  }
  const payloadBytes = new TextEncoder().encode(targetUrl).length;
  const qr = new QRCodeStyling({ ...qrOptions, margin: payloadBytes < 35 ? 96 : 64, data: targetUrl });
  if (!qrReady) qr.getRawData('png').then(blob => {
    if (currentRun !== runId) return;
    if (!blob) throw new Error('QR image unavailable');
    qr.append($('#qr'));
    qrReady = true;
  }).catch(error => {
    if (currentRun !== runId) return;
    qrFailed = true;
    console.error(error);
    terminal.dataset.state = 'error';
    $('#transfer-title').textContent = 'QRコードを作成できませんでした';
    $('#network-status').textContent = '再試行が必要です';
    $('#ready-label').textContent = '2127 CIVIC ARCHIVE — 接続エラー';
    $('#result-title').textContent = 'もう一度再生してリンクを作成してください';
    $('#scan-hint').textContent = '「開発設定」でURLを確認し、再度お試しください';
  });

  const start = performance.now();
  let lastStage = 0;
  function update(now) {
    if (currentRun !== runId || qrFailed) return;
    const elapsed = now - start;
    const progress = Math.min(100, Math.floor(elapsed / 20));
    const stage = elapsed < 250 ? 0 : elapsed < 1050 ? 1 : 2;
    if (stage !== lastStage) { setStage(stage); lastStage = stage; }
    $('#progress-number').textContent = String(progress).padStart(2, '0');
    $('#progress-fill').style.width = `${progress}%`;
    $('.progress-track').setAttribute('aria-valuenow', String(progress));
    $('#transfer-bytes').textContent = `0x${Math.floor(elapsed * 73).toString(16).toUpperCase().padStart(4, '0')} · ${Math.floor(progress * 2.56)} KB`;
    if (elapsed >= 2000 && qrReady) {
      setStage(3);
      terminal.dataset.state = 'ready';
      $('#network-status').textContent = '接続済み';
      $('#ready-label').textContent = '2127 CIVIC ARCHIVE — 接続完了';
      $('#result-title').textContent = `提案 No. ${archiveNumber} の記録が完成しました`;
      $('#scan-hint').textContent = targetUrl === defaultDemoUrl
        ? 'スマートフォンでQRコードを読み取り、HAL東京のサイトへ'
        : 'スマートフォンでQRコードを読み取り、あなたの提案をご覧ください';
      $('#target-link').textContent = targetUrl;
      $('#target-link').href = targetUrl;
      hologram.reveal();
      if (config.configured) {
        $('#result-title').textContent = `提案 No. ${archiveNumber} の記録を作成しました`;
        $('#archive-status').textContent = '確認中';
        refreshRemote();
        remoteTimer = setInterval(refreshRemote, 2000);
      }
      return;
    }
    animationFrame = requestAnimationFrame(update);
  }
  animationFrame = requestAnimationFrame(update);
}

$('#session-input').addEventListener('input', event => {
  $('#url-input').value = makeUrl(event.target.value.trim());
});
$('#dev-form').addEventListener('submit', event => {
  event.preventDefault();
  const nextSession = $('#session-input').value.trim();
  const nextUrl = $('#url-input').value.trim();
  try {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(nextSession)) throw new Error('セッションIDには半角英数字・アンダースコア・ハイフンを使用してください。');
    const parsed = new URL(nextUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('http または https のURLを入力してください。');
    if (new TextEncoder().encode(nextUrl).length > 240) throw new Error('読み取り精度を保つため、URLは240バイト以内にしてください。');
    session = nextSession;
    targetUrl = nextUrl;
    const number = Number(nextSession.match(/\d+$/)?.[0]);
    if (Number.isSafeInteger(number) && number > 0) archiveNumber = number;
    syncInputs();
    operator.sessionChanged();
    play();
  } catch (error) {
    $('#form-error').textContent = error.message;
  }
});
$('#simulate').addEventListener('click', () => {
  if (config.configured) { createSession().catch(() => {}); return; }
  const previousSession = session;
  do { session = makeSession(); } while (session === previousSession);
  archiveNumber += 1;
  targetUrl = makeUrl(session);
  syncInputs();
  operator.sessionChanged();
  play();
});

const bars = document.createDocumentFragment();
for (let i = 0; i < 48; i++) {
  const bar = document.createElement('i');
  bar.style.height = `${3 + Math.abs(Math.sin(i * .8) * Math.cos(i * .3)) * 28}px`;
  bars.append(bar);
}
$('.waveform').append(bars);
const tick = () => { $('#clock').textContent = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date()); };
tick();
const clockInterval = setInterval(tick, 1000);
syncInputs();
if (integrated) {
  $('#simulate').hidden = true;
  $('#operator-launch').hidden = true;
  $('.dev-panel').hidden = true;
  $('#environment-label').textContent = '展示会場アーカイブ';
  try {
    const record = await api(`/api/sessions/${encodeURIComponent(archiveId)}`);
    session = record.id; archiveNumber = record.proposal_number; targetUrl = record.city_url;
    syncInputs(); play();
  } catch { locked('記録に接続できません。ページを再読み込みしてください'); }
} else if (config.configured) {
  if (config.authenticated) restoreOrCreate().catch(() => locked('接続できませんでした。もう一度お試しください'));
  else locked();
} else play();
if (import.meta.hot) import.meta.hot.dispose(() => {
  runId++;
  cancelAnimationFrame(animationFrame);
  clearInterval(clockInterval);
  clearInterval(remoteTimer);
  hologram.dispose();
});
