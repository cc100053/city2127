import './debug.css';
import type { AdminCurrentRun, AdminEventsData, LifecycleCommand, LifecycleData, LifecyclePhase, LifecycleStatus } from '../shared/protocol.ts';
import { api, connectEvents, el, renderState } from './debugApi.ts';

// Exhibition-PC admin page. The server returns 403 for this page and its API from non-loopback clients.
// All lifecycle state lives on the server; every command carries the revision this page last saw.
const PHASE_TEXT: Record<LifecyclePhase, string> = {
  ready: 'READY — 次の観客を迎えられます',
  in_experience: 'IN EXPERIENCE — 観客が体験中',
  awaiting_exit: 'WAITING FOR GUEST TO LEAVE — 観客が結果を見ています',
};
const app = document.querySelector<HTMLElement>('#app')!;
const status = el('div', { class: 'notice' }), summary = el('div'), stateBox = el('div'), events = el('div'), message = el('p');
const guestLeft = el('button', { class: 'primary', disabled: '' }, 'Confirm Guest Has Left');
const resetCity = el('button', { disabled: '' }, 'Reset Current City');
const cancel = el('button', { disabled: '' }, 'Cancel Pending Reset');
const fullInput = el('input', { placeholder: 'FULL RESET と入力', autocomplete: 'off', 'aria-label': 'Full reset confirmation' });
const fullReset = el('button', { class: 'danger', disabled: '' }, 'Full Data Reset');
app.append(el('h1', {}, 'Exhibition admin (localhost only)'), status, summary,
  el('div', { class: 'panel' }, el('h2', {}, 'Operation'),
    el('p', {}, '観客が体験エリアから離れたことを目で確認してから押してください。保留中の reset はこの時に実行されます。'),
    el('div', { class: 'row' }, guestLeft, resetCity, cancel), message),
  stateBox,
  el('div', { class: 'panel' }, el('h2', {}, 'Full data reset（テスト／展示初期化用）'),
    el('p', {}, '総参加人数と現在の都市を0に戻します。記録は削除されません。観客がいる場合は退出確認まで保留されます。'),
    el('div', { class: 'row' }, fullInput, fullReset)),
  el('h2', {}, '最近のイベント'), events);

let lifecycle: LifecycleStatus | undefined, busy = false;

function updateButtons() {
  const lc = lifecycle;
  guestLeft.disabled = busy || !lc || lc.phase === 'ready';
  resetCity.disabled = busy || !lc || lc.pendingReset !== 'none';
  cancel.disabled = busy || !lc || lc.pendingReset === 'none';
  fullReset.disabled = busy || !lc || lc.pendingReset === 'full' || fullInput.value !== 'FULL RESET';
}

async function send(command: LifecycleCommand, confirmation?: string) {
  if (!lifecycle) return;
  busy = true; updateButtons();
  const result = await api<LifecycleData>('/api/admin/lifecycle', { command, expectedRevision: lifecycle.revision, confirmation });
  message.textContent = !result.ok ? `失敗: ${result.error.message}`
    : result.data.executedReset ? `${result.data.executedReset === 'full' ? 'Full reset' : 'City reset'} 完了: ${result.data.previousRunId?.slice(0, 8)} → ${result.data.state.runId.slice(0, 8)}`
      : command === 'guest-left' ? '退出を確認しました。' : command === 'cancel-reset' ? '保留中の reset を取り消しました。' : 'Reset を保留しました（観客の退出確認後に実行）。';
  busy = false;
  await refresh();
}

guestLeft.addEventListener('click', () => {
  const pending = lifecycle?.pendingReset;
  if (pending !== 'none' && !confirm(`観客は退出しましたか？ 保留中の ${pending === 'full' ? 'full data reset' : 'city reset'} を実行します。`)) return;
  void send('guest-left');
});
resetCity.addEventListener('click', () => {
  if (!lifecycle || !confirm(lifecycle.phase === 'ready'
    ? '体験エリアは空いていますか？ 現在の都市を今すぐ reset します（総参加人数は保持）。'
    : '観客がいるため reset は保留され、退出確認後に実行されます。')) return;
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
  if (!run.ok) { lifecycle = undefined; updateButtons(); summary.replaceChildren(el('p', { class: 'notice warn' }, `${run.error.code}: ${run.error.message}`)); return; }
  const d = run.data;
  lifecycle = d.lifecycle;
  status.className = d.lifecycle.pendingReset === 'none' ? 'notice status' : 'notice warn status';
  status.replaceChildren(el('strong', {}, PHASE_TEXT[d.lifecycle.phase]),
    ...(d.lifecycle.pendingReset === 'none' ? [] : [el('br'), `RESET PENDING: ${d.lifecycle.pendingReset === 'full' ? 'full data reset' : 'city reset'}（観客の退出確認後に実行）`]));
  summary.replaceChildren(el('table', {},
    ...([['総参加人数 (total guests)', String(d.lifecycle.totalGuestCount)],
      ['現在の都市の参加人数 (cycle guests)', String('guestCount' in d.state ? d.state.guestCount : d.state.answerCount)],
      ['都市 run ID', d.run.id], ['started', d.run.startedAt], ['algorithm', String(d.run.algorithmVersion)], ['revision', String(d.state.revision)],
      ['予約中の guest session', String(d.reservedSessions)], ['lifecycle revision', `${d.lifecycle.revision} · ${d.lifecycle.updatedAt}`]]
      .map(([k, v]) => el('tr', {}, el('th', {}, k), el('td', {}, v))))));
  stateBox.replaceChildren(renderState(d.state));
  updateButtons();
  if (log.ok) {
    events.replaceChildren(
      el('table', { class: 'log' }, ...log.data.answers.map(a => el('tr', {}, el('td', {}, `#${a.sequence}`), el('td', {}, a.runId.slice(0, 8)), el('td', {}, `${a.questionId} / ${a.optionId}`), el('td', {}, `rev ${a.revisionAfter}`), el('td', {}, a.answeredAt)))),
      el('h2', {}, 'Recent proposals'),
      el('table', { class: 'log' }, ...log.data.proposals.map(p => el('tr', {}, el('td', {}, `#${p.ordinal}`), el('td', {}, p.runId.slice(0, 8)), el('td', {}, p.answers.map(a => a.optionId).join(' / ')), el('td', {}, `rev ${p.revisionAfter}`), el('td', {}, p.submittedAt)))),
      el('h2', {}, 'Admin events'),
      el('table', { class: 'log' }, ...log.data.admin.map(a => el('tr', {}, el('td', {}, `${a.type} (${a.detail.scope})`), el('td', {}, `${a.runId.slice(0, 8)} → ${a.detail.nextRunId.slice(0, 8)}`), el('td', {}, a.createdAt)))));
  }
}

// Other admin tabs change lifecycle state without a socket event, so poll as well.
connectEvents(() => void refresh(), () => {});
setInterval(() => void refresh(), 2000);
void refresh();
