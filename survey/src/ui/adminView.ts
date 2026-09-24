import './debug.css';
import type { AdminCurrentRun, AdminEventsData, ResetData } from '../shared/protocol.ts';
import { api, connectEvents, el, renderState } from './debugApi.ts';

// Exhibition-PC admin page. The server returns 403 for this page and its API from non-loopback clients.
const app = document.querySelector<HTMLElement>('#app')!;
const summary = el('div'), stateBox = el('div'), events = el('div'), message = el('p');
const input = el('input', { placeholder: 'RESET と入力', autocomplete: 'off', 'aria-label': 'Reset confirmation' });
const reset = el('button', { class: 'primary', disabled: '' }, 'Reset（新しい run を開始）');
app.append(el('h1', {}, 'Survey admin (localhost only)'), summary, stateBox,
  el('div', { class: 'panel' }, el('h2', {}, 'Reset'),
    el('p', {}, '現在の run を終了し、スコア0の新しい run を作ります。回答履歴は削除されません。'),
    el('div', { class: 'row' }, input, reset), message),
  el('h2', {}, '最近のイベント'), events);

input.addEventListener('input', () => { reset.disabled = input.value !== 'RESET'; });
reset.addEventListener('click', async () => {
  reset.disabled = true;
  const result = await api<ResetData>('/api/admin/reset', { confirmation: input.value });
  message.textContent = result.ok ? `Reset 完了: ${result.data.previousRunId} → ${result.data.state.runId}` : `失敗: ${result.error.message}`;
  input.value = '';
  await refresh();
});

async function refresh() {
  const [run, log] = await Promise.all([api<AdminCurrentRun>('/api/admin/current-run'), api<AdminEventsData>('/api/admin/events?limit=20')]);
  if (!run.ok) { summary.replaceChildren(el('p', { class: 'notice warn' }, `${run.error.code}: ${run.error.message}`)); return; }
  const d = run.data;
  summary.replaceChildren(el('table', {},
    ...([['run ID', d.run.id], ['started', d.run.startedAt], ['revision', String(d.state.revision)], ['回答数', String(d.state.answerCount)],
      ['予約中の guest session', String(d.reservedSessions)], ['回答済み / 質問数', `${d.answeredSessions} / ${d.totalQuestions}`], ['質問JSON version', String(d.questionVersion)]]
      .map(([k, v]) => el('tr', {}, el('th', {}, k), el('td', {}, v))))));
  stateBox.replaceChildren(renderState(d.state));
  if (log.ok) {
    events.replaceChildren(
      el('table', { class: 'log' }, ...log.data.answers.map(a => el('tr', {}, el('td', {}, `#${a.sequence}`), el('td', {}, a.runId.slice(0, 8)), el('td', {}, `${a.questionId} / ${a.optionId}`), el('td', {}, `rev ${a.revisionAfter}`), el('td', {}, a.answeredAt)))),
      el('h2', {}, 'Admin events'),
      el('table', { class: 'log' }, ...log.data.admin.map(a => el('tr', {}, el('td', {}, a.type), el('td', {}, `${a.runId.slice(0, 8)} → ${a.detail.nextRunId.slice(0, 8)}`), el('td', {}, a.createdAt)))));
  }
}

connectEvents(() => void refresh(), () => {});
setInterval(() => void refresh(), 5000);
void refresh();
