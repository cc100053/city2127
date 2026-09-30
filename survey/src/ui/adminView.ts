import './debug.css';
import type { AdminCurrentRun, ApiError, DisplayMode, AdminEventsData, LifecycleCommand, LifecycleData, LifecyclePhase, LifecycleStatus } from '../shared/protocol.ts';
import { api, connectEvents, el, renderState } from './debugApi.ts';

// Exhibition-PC admin page. The server returns 403 for this page and its API from non-loopback clients.
// All lifecycle state lives on the server; every command carries the revision this page last saw.
const PHASE_TEXT: Record<LifecyclePhase, string> = {
  ready: '準備完了 — 次の観客を迎えられます',
  in_experience: '体験中 — 観客が体験しています',
  awaiting_exit: '退出待ち — 観客が結果を見ています',
};
const LIGHTING_TEXT: Record<DisplayMode, string> = { day: '昼', night: '夜', auto: '自動' };
const ERROR_TEXT: Partial<Record<ApiError['code'], string>> = {
  bad_request: '操作内容が正しくありません。ページを再読み込みしてお試しください。',
  forbidden: 'この操作は展示用パソコンからのみ実行できます。',
  not_found: '管理機能が見つかりません。サーバーの状態を確認してください。',
  unsupported_version: 'このバージョンには対応していません。サーバーを更新してください。',
  reset_confirmation_invalid: '確認欄に「全データ初期化」と入力してください。',
  lifecycle_conflict: '展示状態が更新されました。最新の状態を確認して、もう一度操作してください。',
  lifecycle_blocked: '現在の展示状態では、この操作を実行できません。',
};
const errorText = (error: ApiError) => ERROR_TEXT[error.code] ?? '通信またはサーバーでエラーが発生しました。接続を確認して、もう一度お試しください。';
const app = document.querySelector<HTMLElement>('#app')!;
const status = el('div', { class: 'notice' }), summary = el('div'), stateBox = el('div'), events = el('div'), message = el('p');
const lightingStatus = el('p'), lightingMessage = el('p', { 'aria-live': 'polite' });
const lightingButtons = (['day', 'night', 'auto'] as const).map(mode => {
  const button = el('button', { disabled: '', 'aria-pressed': 'false' }, LIGHTING_TEXT[mode]);
  button.addEventListener('click', () => void changeLighting(mode));
  return { mode, button };
});
const guestLeft = el('button', { class: 'primary', disabled: '' }, '観客の退出を確認');
const resetCity = el('button', { disabled: '' }, '現在の都市をリセット');
const cancel = el('button', { disabled: '' }, '保留中のリセットを取り消す');
const fullInput = el('input', { placeholder: '全データ初期化 と入力', autocomplete: 'off', 'aria-label': '全データ初期化の確認' });
const fullReset = el('button', { class: 'danger', disabled: '' }, '全データを初期化');
app.append(el('h1', {}, '展示管理（このパソコンのみ）'), status, summary,
  el('div', { class: 'panel' }, el('h2', {}, '展示の操作'),
    el('p', {}, '観客が体験エリアから離れたことを目で確認してから押してください。保留中のリセットはこの時に実行されます。'),
    el('div', { class: 'row' }, guestLeft, resetCity, cancel), message),
  el('div', { class: 'panel' }, el('h2', {}, '都市の照明'),
    el('p', {}, '昼：12:00 · 夜：22:00 · 自動：日夜サイクル。接続中の都市に反映され、再起動後も保持されます。'),
    el('div', { class: 'row' }, ...lightingButtons.map(({ button }) => button)), lightingStatus, lightingMessage),
  stateBox,
  el('div', { class: 'panel' }, el('h2', {}, '全データの初期化（テスト／展示開始用）'),
    el('p', {}, '総参加人数と現在の都市を0に戻します。記録は削除されません。観客がいる場合は退出確認まで保留されます。'),
    el('div', { class: 'row' }, fullInput, fullReset)),
  el('h2', {}, '最近のイベント'), events);

let lifecycle: LifecycleStatus | undefined, displayMode: DisplayMode | undefined, busy = false, lightingBusy = false;

function updateButtons() {
  for (const { mode, button } of lightingButtons) {
    button.disabled = lightingBusy || !displayMode;
    button.setAttribute('aria-pressed', String(mode === displayMode));
    button.className = mode === displayMode ? 'primary' : '';
  }
  const lc = lifecycle;
  guestLeft.disabled = busy || !lc || lc.phase === 'ready';
  resetCity.disabled = busy || !lc || lc.pendingReset !== 'none';
  cancel.disabled = busy || !lc || lc.pendingReset === 'none';
  fullReset.disabled = busy || !lc || lc.pendingReset === 'full' || fullInput.value !== '全データ初期化';
}

async function changeLighting(mode: DisplayMode) {
  lightingBusy = true; updateButtons();
  const result = await api<{ mode: DisplayMode }>('/api/admin/display-mode', { mode });
  lightingMessage.textContent = result.ok ? `都市の照明：${LIGHTING_TEXT[result.data.mode]}` : errorText(result.error);
  lightingBusy = false;
  await refresh();
}

async function send(command: LifecycleCommand, confirmation?: string) {
  if (!lifecycle) return;
  busy = true; updateButtons();
  const result = await api<LifecycleData>('/api/admin/lifecycle', { command, expectedRevision: lifecycle.revision, confirmation });
  message.textContent = !result.ok ? errorText(result.error)
    : result.data.executedReset ? `${result.data.executedReset === 'full' ? '全データの初期化' : '都市のリセット'} 完了: ${result.data.previousRunId?.slice(0, 8)} → ${result.data.state.runId.slice(0, 8)}`
      : command === 'guest-left' ? '退出を確認しました。' : command === 'cancel-reset' ? '保留中のリセットを取り消しました。' : 'リセットを保留しました（観客の退出確認後に実行）。';
  busy = false;
  await refresh();
}

guestLeft.addEventListener('click', () => {
  const pending = lifecycle?.pendingReset;
  if (pending !== 'none' && !confirm(`観客は退出しましたか？ 保留中の${pending === 'full' ? '全データの初期化' : '都市のリセット'} を実行します。`)) return;
  void send('guest-left');
});
resetCity.addEventListener('click', () => {
  if (!lifecycle || !confirm(lifecycle.phase === 'ready'
    ? '体験エリアは空いていますか？ 現在の都市を今すぐリセットします（総参加人数は保持）。'
    : '観客がいるためリセットは保留され、退出確認後に実行されます。')) return;
  void send('reset-city', 'RESET');
});
cancel.addEventListener('click', () => void send('cancel-reset'));
fullInput.addEventListener('input', updateButtons);
fullReset.addEventListener('click', () => {
  if (!confirm('総参加人数を含む全参加状態を0に戻します。よろしいですか？')) return;
  fullInput.value = '';
  void send('full-reset', 'FULL RESET');
});

async function refresh() {
  const [run, log] = await Promise.all([api<AdminCurrentRun>('/api/admin/current-run'), api<AdminEventsData>('/api/admin/events?limit=20')]);
  if (!run.ok) { lifecycle = undefined; displayMode = undefined; updateButtons(); summary.replaceChildren(el('p', { class: 'notice warn' }, errorText(run.error))); return; }
  const d = run.data;
  lifecycle = d.lifecycle;
  displayMode = d.displayMode;
  if (!lightingBusy) lightingStatus.textContent = `都市の照明：${LIGHTING_TEXT[displayMode]}`;
  status.className = d.lifecycle.pendingReset === 'none' ? 'notice status' : 'notice warn status';
  status.replaceChildren(el('strong', {}, PHASE_TEXT[d.lifecycle.phase]),
    ...(d.lifecycle.pendingReset === 'none' ? [] : [el('br'), `リセット保留中：${d.lifecycle.pendingReset === 'full' ? '全データの初期化' : '都市のリセット'}（観客の退出確認後に実行）`]));
  summary.replaceChildren(el('table', {},
    ...([['総参加人数', String(d.lifecycle.totalGuestCount)],
      ['現在の都市の参加人数', String('guestCount' in d.state ? d.state.guestCount : d.state.answerCount)],
      ['都市の実行ID', d.run.id], ['開始日時', d.run.startedAt], ['計算方式のバージョン', String(d.run.algorithmVersion)], ['都市の更新番号', String(d.state.revision)],
      ['予約中の観客セッション', String(d.reservedSessions)], ['展示状態の更新番号', `${d.lifecycle.revision} · ${d.lifecycle.updatedAt}`]]
      .map(([k, v]) => el('tr', {}, el('th', {}, k), el('td', {}, v))))));
  stateBox.replaceChildren(renderState(d.state));
  updateButtons();
  if (log.ok) {
    events.replaceChildren(
      el('table', { class: 'log' }, ...log.data.answers.map(a => el('tr', {}, el('td', {}, `#${a.sequence}`), el('td', {}, a.runId.slice(0, 8)), el('td', {}, `${a.questionId} / ${a.optionId}`), el('td', {}, `更新 ${a.revisionAfter}`), el('td', {}, a.answeredAt)))),
      el('h2', {}, '最近の提案'),
      el('table', { class: 'log' }, ...log.data.proposals.map(p => el('tr', {}, el('td', {}, `#${p.ordinal}`), el('td', {}, p.runId.slice(0, 8)), el('td', {}, p.answers.map(a => a.optionId).join(' / ')), el('td', {}, `更新 ${p.revisionAfter}`), el('td', {}, p.submittedAt)))),
      el('h2', {}, '管理操作の履歴'),
      el('table', { class: 'log' }, ...log.data.admin.map(a => el('tr', {}, el('td', {}, `都市の実行を切り替え（${a.detail.scope === 'full' ? '全データの初期化' : '都市のリセット'}）`), el('td', {}, `${a.runId.slice(0, 8)} → ${a.detail.nextRunId.slice(0, 8)}`), el('td', {}, a.createdAt)))));
  }
}

// Other admin tabs change lifecycle state without a socket event, so poll as well.
connectEvents(() => void refresh(), () => {});
setInterval(() => void refresh(), 2000);
void refresh();
