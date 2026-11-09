import './debug.css';
import './adminTheme.css';
import type { AdminCurrentRun, ApiError, DisplayMode, AdminEventsData, LifecycleCommand, LifecycleData, LifecyclePhase, LifecycleStatus } from '../shared/protocol.ts';
import { api, connectEvents, el, renderState } from './debugApi.ts';

// Exhibition-PC admin page. The server returns 403 for this page and its API from non-loopback clients.
// All lifecycle state lives on the server; every command carries the revision this page last saw.
const PHASE_TEXT: Record<LifecyclePhase, string> = {
  ready: '準備完了 — 次の観客を迎えられます',
  in_experience: '体験中 — 観客が体験しています',
  awaiting_exit: '記録完了 — ステーション状況を確認してください',
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
document.body.classList.add('admin-page');
const status = el('div', { class: 'admin-status', role: 'status' }, '展示状態を読み込んでいます。');
const summary = el('div'), stateBox = el('div'), events = el('div');
const message = el('p', { class: 'admin-message', 'aria-live': 'polite' });
const lightingStatus = el('p', { 'aria-live': 'polite' }, '設定を読み込んでいます。');
const lightingMessage = el('p', { 'aria-live': 'polite' });
const lightPreview = el('div', { class: 'admin-light-preview', 'aria-hidden': 'true' });
const lightingButtons = (['day', 'night', 'auto'] as const).map(mode => {
  const button = el('button', { disabled: '', 'aria-pressed': 'false' }, LIGHTING_TEXT[mode]);
  button.addEventListener('click', () => void changeLighting(mode));
  return { mode, button };
});
const guestLeft = el('button', { disabled: '' }, '未完了の体験を終了');
const stationBox = el('div', { class: 'admin-stations' });
const direction = el('p', { class: 'admin-direction', 'aria-live': 'polite' });
const undo = el('button', { disabled: '' }, '直前の提案を取り消す');
const undoStatus = el('p');
const resetCity = el('button', { class: 'admin-caution', disabled: '' }, '現在の都市をリセット');
const cancel = el('button', { disabled: '' }, '保留中のリセットを取り消す');
const resetStatus = el('p', {}, '展示状態を読み込んでいます。');
const fullInput = el('input', { placeholder: '全データ初期化 と入力', autocomplete: 'off', 'aria-label': '全データ初期化の確認' });
const fullReset = el('button', { class: 'danger', disabled: '' }, '全データを初期化');

app.append(
  el('header', { class: 'admin-header' },
    el('div', {}, el('p', { class: 'admin-eyebrow' }, '2127 / ODAIBA'), el('h1', {}, '展示運営パネル')),
    el('span', { class: 'admin-local' }, '展示用パソコンのみ')),
  el('div', { class: 'admin-overview' },
    el('section', {},
      el('p', { class: 'admin-eyebrow' }, '01 / GUEST STATIONS'), el('h2', {}, 'ステーション状況'),
      status, stationBox, direction, el('div', { class: 'row' }, guestLeft)),
    el('section', { class: 'admin-lighting' },
      el('p', { class: 'admin-eyebrow' }, '02 / CITY DISPLAY'), el('h2', {}, '大画面の照明'),
      lightPreview, el('div', { class: 'row admin-light-options', role: 'group', 'aria-label': '照明モード' }, ...lightingButtons.map(({ button }) => button)),
      lightingStatus, lightingMessage,
      el('p', { class: 'admin-muted' }, '昼 12:00 · 夜 22:00 · 自動 日夜サイクル'))),
  el('section', { class: 'admin-section' },
    el('p', { class: 'admin-eyebrow' }, '03 / SESSION CONTROLS'), el('h2', {}, '提案と街の管理'),
    el('div', { class: 'admin-operation' },
      el('div', {}, el('h3', {}, '直前の提案'), undoStatus), undo),
    el('div', { class: 'admin-operation' },
      el('div', {}, el('h3', {}, '街のリセット'), resetStatus), el('div', { class: 'row' }, resetCity, cancel)),
    message),
  el('details', { class: 'admin-section' }, el('summary', {}, '都市データと全データの初期化'),
    summary, stateBox,
    el('h2', {}, '全データの初期化（テスト／展示開始用）'),
    el('p', {}, '総参加人数と現在の都市を0に戻します。記録は削除されません。A/B は両体験の終了まで、単独モードは次の開始まで保留されます。'),
    el('div', { class: 'row' }, fullInput, fullReset)),
  el('section', { class: 'admin-section admin-history' }, el('h2', {}, '最近のイベント'), events));

let undoProposal: AdminCurrentRun['undoProposal'] = null;
let stations: AdminCurrentRun['stations'] = [];
let lifecycle: LifecycleStatus | undefined, displayMode: DisplayMode | undefined, busy = false, lightingBusy = false;

function updateButtons() {
  for (const { mode, button } of lightingButtons) {
    button.disabled = lightingBusy || !displayMode;
    button.setAttribute('aria-pressed', String(mode === displayMode));
    button.className = mode === displayMode ? 'primary' : '';
  }
  const lc = lifecycle;
  undo.disabled = busy || !undoProposal;
  guestLeft.hidden = !lc || lc.phase !== 'in_experience' || stations.length > 0;
  guestLeft.disabled = busy || guestLeft.hidden;
  for (const button of Array.from(stationBox.querySelectorAll<HTMLButtonElement>('button'))) button.disabled = busy;
  resetCity.disabled = busy || !lc || lc.pendingReset !== 'none';
  cancel.hidden = !lc || lc.pendingReset === 'none';
  cancel.disabled = busy || cancel.hidden;
  fullReset.disabled = busy || !lc || lc.pendingReset === 'full' || fullInput.value !== '全データ初期化';
}

async function changeLighting(mode: DisplayMode) {
  lightingBusy = true; updateButtons();
  const result = await api<{ mode: DisplayMode }>('/api/admin/display-mode', { mode });
  lightingMessage.textContent = result.ok ? `都市の照明：${LIGHTING_TEXT[result.data.mode]}` : errorText(result.error);
  lightingBusy = false;
  await refresh();
}

async function send(command: LifecycleCommand, confirmation?: string, proposalId?: string, guestSessionId?: string) {
  if (!lifecycle) return;
  busy = true; updateButtons();
  const result = await api<LifecycleData>('/api/admin/lifecycle', { command, expectedRevision: lifecycle.revision, confirmation, proposalId, guestSessionId });
  message.textContent = !result.ok ? errorText(result.error)
    : result.data.executedReset ? `${result.data.executedReset === 'full' ? '全データの初期化' : '都市のリセット'} 完了: ${result.data.previousRunId?.slice(0, 8)} → ${result.data.state.runId.slice(0, 8)}`
      : command === 'undo-proposal' ? '直前の提案を取り消し、変更前の街に戻しました。' : command === 'guest-left' ? '指定した未完了の体験を終了しました。' : command === 'cancel-reset' ? '保留中のリセットを取り消しました。' : 'リセットを保留しました。A/B は両体験の終了後、単独モードは次の開始時に実行します。';
  busy = false;
  await refresh();
}

guestLeft.addEventListener('click', () => {
  const pending = lifecycle?.pendingReset;
  if (pending !== 'none' && !confirm(`未完了の草稿を破棄し、保留中の${pending === 'full' ? '全データの初期化' : '都市のリセット'} を実行します。`)) return;
  void send('guest-left');
});
undo.addEventListener('click', () => {
  if (!undoProposal || !confirm(`提案 #${undoProposal.ordinal} を取り消し、変更前の街に戻します。記録は履歴に残ります。`)) return;
  void send('undo-proposal', undefined, undoProposal.id);
});
resetCity.addEventListener('click', () => {
  if (!lifecycle || !confirm(lifecycle.phase === 'ready'
    ? '体験エリアは空いていますか？ 現在の都市を今すぐリセットします（総参加人数は保持）。'
    : 'リセットを保留します。A/B は新しい開始を停止し、両体験が終了してから実行します。単独モードは次の開始時に実行します。')) return;
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
  if (!run.ok) {
    undoProposal = null;
    lifecycle = undefined;
    displayMode = undefined;
    stations = [];
    stationBox.replaceChildren();
    direction.textContent = '';
    status.dataset.pending = 'true';
    status.textContent = errorText(run.error);
    lightingStatus.textContent = '照明の設定を確認できません。';
    delete lightPreview.dataset.mode;
    undoStatus.textContent = resetStatus.textContent = '展示状態を確認できません。';
    updateButtons();
    return;
  }
  const d = run.data;
  lifecycle = d.lifecycle;
  stations = d.stations;
  const pending = lifecycle.pendingReset !== 'none';
  const singleActive = !stations.length && lifecycle.phase !== 'ready';
  const supportsStations = d.run.algorithmVersion === 2;
  const available = (['A', 'B'] as const).filter(id => supportsStations && !pending && !singleActive && !stations.some(station => station.stationId === id));
  stationBox.replaceChildren(...(['A', 'B'] as const).map(id => {
    const station = stations.find(item => item.stationId === id);
    const ready = available.includes(id);
    const title = station?.status === 'reserved' ? '回答中'
      : station?.status === 'submitted' ? '記録済み' : ready ? '開始できます' : '受付停止中';
    const detail = station?.status === 'reserved' ? '体験が終わるまでお待ちください。'
      : station?.status === 'submitted' ? '結果の順番待ち、または表示中です。'
        : ready ? '次の方をご案内できます。'
          : pending ? 'リセットを待っています。'
            : !supportsStations ? '現在の都市では A/B を開始できません。' : '単独モードの体験を確認してください。';
    const card = el('article', { class: 'admin-station', 'data-station': id, 'data-available': String(ready) },
      el('h3', {}, id + ' ステーション'), el('p', { class: 'admin-station-status' }, title), el('p', {}, detail));
    if (station?.status === 'reserved') {
      const end = el('button', {}, `${id} の未完了の体験を終了`);
      end.addEventListener('click', () => {
        if (confirm(`ステーション ${id} の草稿だけを破棄します。もう一方の体験は続きます。`)) void send('guest-left', undefined, undefined, station.sessionId);
      });
      card.append(end);
    }
    return card;
  }));
  const guidance = pending ? '新しい体験の受付を停止しています。'
    : !supportsStations ? '現在の都市では A/B を開始できません。'
      : singleActive ? '単独モードの体験状況を確認してください。'
        : available.length === 2 ? 'A・B どちらでもご案内できます。'
          : available.length === 1 ? `次の方は ${available[0]} ステーションへ` : '両ステーションの体験が終わるまでお待ちください。';
  if (direction.textContent !== guidance) direction.textContent = guidance;
  resetStatus.textContent = pending
    ? `保留中 · ${lifecycle.pendingReset === 'full' ? '全データの初期化' : '都市のリセット'}。A/B は両体験終了後、単独モードは次の開始時に実行します。`
    : lifecycle.phase === 'ready' ? '現在の都市をリセットします。総参加人数は保持されます。'
      : 'リセットを保留し、体験の終了を待ちます。';
  undoProposal = d.undoProposal;
  undoStatus.textContent = undoProposal ? `対象：提案 #${undoProposal.ordinal} · 次の観客が始める前のみ取り消せます。`
    : '取り消せる提案はありません（記録後、次の観客が始める前のみ利用可能）。';
  displayMode = d.displayMode;
  const lightingLabel = `都市の照明：${LIGHTING_TEXT[displayMode]}`;
  if (!lightingBusy && lightingStatus.textContent !== lightingLabel) lightingStatus.textContent = lightingLabel;
  lightPreview.dataset.mode = displayMode;
  status.dataset.pending = String(pending);
  const phaseLabel = PHASE_TEXT[d.lifecycle.phase];
  if (status.textContent !== phaseLabel) status.textContent = phaseLabel;
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
      el('table', { class: 'log' }, ...log.data.proposals.map(p => el('tr', {}, el('td', {}, `#${p.ordinal}${p.undoneAt ? ' · 取り消し済み' : ''}${p.stationId ? ` · ${p.stationId}` : ''}`), el('td', {}, p.runId.slice(0, 8)), el('td', {}, p.answers.map(a => a.optionId).join(' / ')), el('td', {}, `更新 ${p.revisionAfter}`), el('td', {}, p.submittedAt)))),
      el('h2', {}, '管理操作の履歴'),
      el('table', { class: 'log' }, ...log.data.admin.map(a => el('tr', {}, el('td', {}, a.type === 'proposal-undone' ? `提案 #${a.detail.ordinal} を取り消し` : `都市の実行を切り替え（${a.detail.scope === 'full' ? '全データの初期化' : '都市のリセット'}）`), el('td', {}, a.type === 'proposal-undone' ? a.detail.proposalId : `${a.runId.slice(0, 8)} → ${a.detail.nextRunId.slice(0, 8)}`), el('td', {}, a.createdAt)))));
  }
}

// Other admin tabs change lifecycle state without a socket event, so poll as well.
connectEvents(() => void refresh(), () => {});
setInterval(() => void refresh(), 2000);
void refresh();
