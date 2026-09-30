import { api, uploadMedia, createJobId } from './api.js';
import './operator.css';

export function setupOperator({ config, getSession, onLogin, onSessionUpdate }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'operator-dialog';
  dialog.innerHTML = `
    <header><div><span>2127 / スタッフ操作</span><h2>メディアのアップロード・再送</h2></div><button type="button" id="ops-close" aria-label="アップロード画面を閉じる">×</button></header>
    <p id="ops-description"></p>
    <form id="ops-login"><label>スタッフ用パスワード<input type="password" name="token" required autocomplete="current-password" placeholder="スタッフ用パスワード" /></label><button>ログイン</button></form>
    <form id="ops-upload" hidden><label>アップロード先のセッション<input id="ops-session" readonly /></label><div class="ops-file-picker"><span>画像またはMP4</span><input id="ops-file" type="file" accept="image/png,image/jpeg,image/webp,video/mp4" required /><label for="ops-file" class="ops-file-trigger">ファイルを選択</label><span id="ops-filename">選択されていません</span></div><button id="ops-submit">バックグラウンド送信を開始 ↗</button><progress id="ops-progress" max="100" value="0" hidden></progress><small>「受付完了」と表示されたら、このページを閉じても送信は続きます。</small></form>
    <p id="ops-message" role="status"></p>
    <section id="ops-jobs" aria-label="アップロード待ち一覧"></section>
    <button type="button" id="ops-logout" hidden>ログアウト</button>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  let authenticated = config.authenticated;
  let jobId = createJobId(), uploading = false, refreshTimer;
  const labels = { queued: 'アップロード待ち', uploading: 'アップロード中', retry_wait: '自動再試行待ち', failed: '送信失敗 · ファイル保存済み', completed: '完了' };
  function renderAuth() {
    $('#ops-login').hidden = !config.configured || authenticated;
    $('#ops-upload').hidden = !authenticated;
    $('#ops-logout').hidden = !authenticated;
    $('#ops-description').textContent = config.configured ? `対応形式：JPEG・PNG・WebP・MP4（最大 ${Math.floor(config.maxUploadBytes / 1024 ** 2)} MB）` : '現在はデモモードです。サーバーの .env とSupabaseのマイグレーションを設定し、再起動するとログインできます。';
    $('#ops-session').value = getSession() || '先にセッションを作成してください';
  }
  async function refresh() {
    clearTimeout(refreshTimer);
    if (!dialog.open || !authenticated) return;
    try {
      const { jobs } = await api('/api/uploads');
      const fragment = document.createDocumentFragment();
      if (!jobs.length) {
        const empty = document.createElement('p'); empty.textContent = 'アップロードはまだありません。'; fragment.append(empty);
      }
      for (const job of jobs) {
        const row = document.createElement('article');
        const title = document.createElement('strong'); title.textContent = labels[job.status] || job.status;
        const session = document.createElement('code'); session.textContent = job.sessionId;
        const detail = document.createElement('small'); detail.textContent = `試行回数：${job.attempts} 回${job.nextAttemptAt && job.status === 'retry_wait' ? ` · ${Math.max(0, Math.ceil((job.nextAttemptAt - Date.now()) / 1000))} 秒後に再試行` : ''}`;
        row.append(title, session, detail);
        if (job.error) { const message = document.createElement('small'); message.textContent = job.error; row.append(message); }
        if (['failed', 'retry_wait'].includes(job.status)) {
          const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '今すぐ再試行';
          retry.addEventListener('click', async () => {
            retry.disabled = true;
            try { await api(`/api/uploads/${job.id}/retry`, { method: 'POST' }); await refresh(); }
            catch (error) { $('#ops-message').textContent = error.message; retry.disabled = false; }
          });
          row.append(retry);
        }
        fragment.append(row);
      }
      $('#ops-jobs').replaceChildren(fragment);
      onSessionUpdate();
    } catch (error) {
      $('#ops-message').textContent = error.message;
      if (error.status === 401) { authenticated = false; renderAuth(); }
    } finally { if (dialog.open && authenticated) refreshTimer = setTimeout(refresh, 2000); }
  }
  $('#ops-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => clearTimeout(refreshTimer));
  $('#ops-login').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    try {
      await api('/api/operator/login', { method: 'POST', body: { token: event.target.elements.token.value } });
      event.target.reset();
      authenticated = true;
      config.authenticated = true;
      await onLogin();
      renderAuth();
      $('#ops-message').textContent = 'ログインしました。このセッションの画像や動画をアップロードできます。';
      refresh();
    } catch (error) { $('#ops-message').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('#ops-file').addEventListener('change', () => {
    jobId = createJobId();
    $('#ops-filename').textContent = $('#ops-file').files[0]?.name || '選択されていません';
  });
  $('#ops-upload').addEventListener('submit', async event => {
    event.preventDefault();
    if (uploading) return;
    const file = $('#ops-file').files[0];
    const sessionId = getSession();
    if (!file || !sessionId) { $('#ops-message').textContent = 'セッションを作成し、ファイルを選択してください。'; return; }
    if (file.size > config.maxUploadBytes) { $('#ops-message').textContent = 'ファイルサイズが上限を超えています。'; return; }
    uploading = true;
    $('#ops-submit').disabled = true;
    $('#ops-file').disabled = true;
    $('#ops-progress').hidden = false;
    $('#ops-progress').value = 0;
    $('#ops-message').textContent = 'サーバーに送信しています。受付完了までページを閉じないでください。';
    try {
      await uploadMedia(sessionId, file, jobId, progress => { $('#ops-progress').value = progress; });
      $('#ops-message').textContent = '受付完了。アップロードが終わると、スマートフォンの結果ページに自動で表示されます。';
      $('#ops-file').value = '';
      $('#ops-filename').textContent = '選択されていません';
      jobId = createJobId();
      await refresh();
    } catch (error) { $('#ops-message').textContent = error.message; }
    finally { uploading = false; $('#ops-submit').disabled = false; $('#ops-file').disabled = false; }
  });
  $('#ops-logout').addEventListener('click', async () => {
    try {
      await api('/api/operator/logout', { method: 'POST' });
      authenticated = false; config.authenticated = false;
      clearTimeout(refreshTimer); $('#ops-jobs').replaceChildren(); renderAuth();
      $('#ops-message').textContent = 'ログアウトしました。受付済みのアップロードは続行されます。';
    } catch (error) { $('#ops-message').textContent = error.message; }
  });
  renderAuth();
  return {
    open() { renderAuth(); dialog.showModal(); refresh(); },
    sessionChanged() { $('#ops-session').value = getSession() || ''; jobId = createJobId(); },
  };
}
