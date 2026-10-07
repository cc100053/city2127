import { api } from './api.js';
import './city.css';

export function mountCity(sessionId) {
  document.title = '2127 — あなたの都市提案';
  document.body.innerHTML = `
    <main class="city-page">
      <header class="city-header"><a href="/" aria-label="2127 ホーム">21<span>27</span></a><span>CIVIC ARCHIVE<br>渋谷 / 東京</span></header>
      <section class="city-intro"><p class="city-eyebrow">ともにつくる未来</p><h1>あなたの想いを、<br><span>街の記憶に。</span></h1><p>あなたが描く、2127年の街の記録</p></section>
      <section class="city-card" aria-live="polite" aria-busy="true">
        <div class="city-card-top"><span id="city-number">アーカイブ / 確認中</span><span id="city-status">接続中</span></div>
        <div id="city-media"></div>
        <div id="city-wait"><div class="city-loader" aria-hidden="true"></div><h2 id="city-message">アーカイブに接続しています</h2><p id="city-detail">画像や動画の準備ができると、ここに自動で表示されます。</p></div>
        <button id="city-retry" hidden>もう一度確認 ↻</button>
        <div class="city-session"><span>セッション</span><span id="city-session"></span></div>
      </section>
      <footer class="city-footer"><span class="city-dot"></span> あなたの声が、街の未来になる。<br><small>2127 渋谷 · 都市アーカイブ</small></footer>
    </main>`;
  const $ = selector => document.querySelector(selector);
  const statusLabels = { CONNECTING: '接続中', QUEUED: '準備中', UPLOADING: '送信中', FAILED: '再送待ち', READY: '公開済み', OFFLINE: '再接続中', 'NOT FOUND': '見つかりません', UNAVAILABLE: '準備中', 'MEDIA ERROR': '読み込みエラー' };
  $('#city-session').textContent = sessionId || '無効なセッション';
  let timer, controller, disposed = false, displayedUrl = '', refreshFailures = 0;
  function schedule(ms = 2000) {
    clearTimeout(timer);
    if (!disposed && !document.hidden) timer = setTimeout(poll, ms);
  }
  function waiting(status, message, detail) {
    $('#city-status').textContent = statusLabels[status] || status;
    $('#city-status').dataset.status = status;
    $('#city-message').textContent = message;
    $('#city-detail').textContent = detail;
    $('#city-wait').hidden = false;
    $('#city-retry').hidden = !['FAILED', 'OFFLINE', 'NOT FOUND', 'UNAVAILABLE', 'MEDIA ERROR'].includes(status);
    $('.city-card').setAttribute('aria-busy', String(['QUEUED', 'UPLOADING', 'CONNECTING'].includes(status)));
  }
  async function poll() {
    clearTimeout(timer);
    if (disposed || controller) return;
    controller = new AbortController();
    let nextDelay = null;
    try {
      const record = await api(`/api/sessions/${encodeURIComponent(sessionId)}`, { signal: controller.signal });
      if (disposed) return;
      $('#city-number').textContent = `提案 No. ${String(record.proposal_number).padStart(3, '0')}`;
      if (record.status !== 'ready' || !record.media_url) {
        const content = {
          queued: ['QUEUED', 'あなたの提案を準備しています', '2秒ごとに自動で確認します。準備ができ次第、結果が表示されます。'],
          uploading: ['UPLOADING', '街の記録を送信しています', '画像や動画をアップロードしています。このページでお待ちください。'],
          failed: ['FAILED', '送信が一時中断しています', 'ファイルは保存されています。端末での再送を待ちながら、自動確認を続けます。'],
        }[record.status] || ['QUEUED', '結果を準備しています', '2秒ごとに自動で確認しています。'];
        waiting(...content);
        nextDelay = 2000;
      } else {
        const url = new URL(record.media_url, location.origin);
        if (!['http:', 'https:'].includes(url.protocol) || !['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(record.media_type)) throw new Error('表示できないメディア形式です。');
        $('#city-status').textContent = statusLabels.READY;
        $('#city-status').dataset.status = 'READY';
        $('.city-card').setAttribute('aria-busy', 'false');
        $('#city-wait').hidden = true;
        $('#city-retry').hidden = true;
        if (displayedUrl !== url.href) {
          const media = document.createElement(record.media_type === 'video/mp4' ? 'video' : 'img');
          if (media instanceof HTMLVideoElement) {
            media.controls = true;
            media.autoplay = true;
            media.muted = true;
            media.playsInline = true;
            media.preload = 'metadata';
            media.setAttribute('aria-label', `提案 No. ${record.proposal_number} の動画`);
          } else { media.alt = `提案 No. ${record.proposal_number} の画像`; }
          media.addEventListener('error', () => {
            waiting('MEDIA ERROR', 'メディアを読み込めませんでした', 'もう一度お試しください。動画が再生できない場合は、別のブラウザーでお試しください。');
            displayedUrl = '';
            if (++refreshFailures <= 3) schedule();
          });
          media.src = url.href;
          displayedUrl = url.href;
          $('#city-media').replaceChildren(media);
        }
        // Renew signed URLs before expiry, not every 2s once media is ready.
        const expires = Date.parse(record.media_expires_at);
        if (Number.isFinite(expires)) nextDelay = Math.max(30000, expires - Date.now() - 60000);
      }
    } catch (error) {
      if (error.name === 'AbortError' || disposed) return;
      if (error.status === 404 || error.status === 400) {
        waiting('NOT FOUND', 'アーカイブが見つかりません', '端末に表示されている最新のQRコードを、もう一度読み取ってください。');
      } else {
        waiting(error.code === 'NOT_CONFIGURED' ? 'UNAVAILABLE' : 'OFFLINE', 'アーカイブに接続できません', error.message || '接続が切れました。自動で再接続しています。');
        nextDelay = 2000;
      }
    } finally {
      controller = null;
      if (nextDelay !== null) schedule(nextDelay);
    }
  }
  $('#city-retry').addEventListener('click', () => { refreshFailures = 0; displayedUrl = ''; poll(); });
  const visibility = () => {
    if (document.hidden) { clearTimeout(timer); controller?.abort(); }
    else poll();
  };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', () => { disposed = true; clearTimeout(timer); controller?.abort(); }, { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) { disposed = false; poll(); } });
  if (/^[A-Za-z0-9_-]{1,64}$/.test(sessionId)) poll();
  else waiting('NOT FOUND', 'リンクの形式が正しくありません', '端末のQRコードをもう一度読み取ってください。');
}
