import './debug.css';
import './monitorTheme.css';
import { emptyEnergyConfiguration, sameEnergyConfiguration } from '../shared/energy.ts';
import type { CityView } from '../shared/cityView.ts';
import { isExhibitionCityView } from '../shared/cityView.ts';
import type { ServerEvent } from '../shared/protocol.ts';
import { connectEvents, el, renderView, signed } from './debugApi.ts';

const app = document.querySelector<HTMLElement>('#app')!;
document.body.classList.add('monitor-page');
const status = el('p', { class: 'monitor-status', role: 'status', 'data-connection': 'connecting' }, '接続中');
const connectionDetail = el('p', {}, 'サーバーに接続しています。');
const stateBox = el('div');
const revision = el('p', { class: 'monitor-revision' }, '街の状態を受信していません。');
const last = el('div', {}, 'この画面を開いてから、まだ回答を受信していません。');
const log = el('ul', { class: 'monitor-log' });
const empty = el('p', {}, 'まだイベントはありません。');
app.append(
  el('header', { class: 'monitor-header' },
    el('p', { class: 'monitor-kicker' }, '2127 / ODAIBA'), el('h1', {}, '展示モニター')),
  el('div', { class: 'monitor-overview' },
    el('section', {}, el('h2', {}, '通信状態'), status, connectionDetail, revision),
    el('section', {}, el('h2', {}, '最新の回答・操作'), last)),
  el('section', { class: 'monitor-section' },
    el('h2', {}, 'イベント履歴'),
    el('p', { class: 'monitor-meta' }, 'この画面で受信した最新30件 · 新しい順'),
    empty, log),
  el('details', { class: 'monitor-section' }, el('summary', {}, '街の状態と診断情報'), stateBox));

let latest: CityView | undefined;
let disconnected = false;

function record(kind: string, title: string, detail?: string) {
  const now = new Date();
  const time = el('time', { datetime: now.toISOString() }, now.toLocaleTimeString('ja-JP', { hour12: false }));
  log.prepend(el('li', { 'data-kind': kind }, time,
    el('div', {}, el('strong', {}, title), ...(detail ? [el('p', {}, detail)] : []))));
  empty.hidden = true;
  if (log.children.length > 30) log.lastElementChild?.remove();
}

function setState(view: CityView, snapshot = false) {
  // Live frames advance; authoritative snapshots can restore an earlier city.
  if (!snapshot && latest && latest.runId === view.runId && view.revision < latest.revision) return false;
  latest = view;
  revision.textContent = `受信した街の更新番号 #${view.revision}`;
  stateBox.replaceChildren(el('p', { class: 'meta' }, `run ${view.runId} · revision ${view.revision}`), renderView(view));
  return true;
}

function onEvent(event: ServerEvent) {
  if (event.type === 'explore') return;
  if (event.type === 'city-state-snapshot') {
    if (latest && latest.runId !== event.view.runId) last.replaceChildren('新しい街の状態を受信しました。');
    setState(event.view, true);
    status.dataset.connection = 'connected';
    status.textContent = '接続済み';
    connectionDetail.textContent = 'サーバーから街の状態を受信しています。';
    if (disconnected) {
      record('connection', '再接続しました', 'サーバーから街の状態を取得しました。');
      disconnected = false;
    }
    if (event.undoneProposalId) {
      last.replaceChildren('管理者が直前の提案を取り消しました。');
      record('operation', '提案を取り消しました', event.undoneProposalId);
    }
    return;
  }
  if (event.type === 'run-reset') {
    latest = undefined;
    setState(event.view);
    last.replaceChildren(`Reset: run ${event.previousRunId} → ${event.state.runId}`);
    record('operation', '街がリセットされました', `${event.previousRunId} → ${event.state.runId}`);
    return;
  }
  if (!setState(event.view)) return;
  if ('proposal' in event) {
    const proposal = event.proposal;
    const choices = proposal.answers.map(answer => answer.optionLabel).join(' · ');
    const changes = proposal.cityChanges.map(change => change.label);
    if (!sameEnergyConfiguration(proposal.beforeLayout.energy ?? emptyEnergyConfiguration(), proposal.afterLayout.energy ?? emptyEnergyConfiguration())) changes.push('エネルギー配置');
    const label = `提案 #${proposal.ordinal}${proposal.stationId ? ` · ステーション ${proposal.stationId}` : ''}`;
    last.replaceChildren(
      el('strong', { class: 'monitor-proposal' }, label),
      el('p', {}, choices),
      el('p', { class: 'monitor-meta' }, `revision ${proposal.revisionBefore} → ${proposal.revisionAfter}`),
      el('p', { class: 'meta' }, `提案ID ${proposal.id} · ${changes.join('、') || '構成を維持'}`));
    record('proposal', label, `rev ${proposal.revisionAfter} · ${choices}`);
    return;
  }
  const changes = Object.entries(event.change.scores).map(([axis, delta]) => `${axis} ${signed(delta)}`).join(', ') || '変化なし（上限/下限）';
  const nominal = Object.entries(event.answer.effects).map(([axis, delta]) => `${axis} ${signed(delta)}`).join(', ');
  const city = isExhibitionCityView(event.view) ? undefined : event.view.history.at(-1)?.cityChanges.map(c => `${c.socketId.toUpperCase()} ${c.label}`).join(', ');
  const cityText = city ? ` · 都市: ${city}` : '';
  last.replaceChildren(
    el('p', {}, `${event.questionText} → ${event.optionLabel}`),
    el('p', {}, `実際の変化: ${changes}${cityText}`),
    el('p', { class: 'meta' }, `効果（質問 v${event.answer.questionVersion}）: ${nominal} · #${event.answer.sequence} · revision ${event.answer.revisionBefore} → ${event.answer.revisionAfter}`));
  record('proposal', `回答 #${event.answer.sequence}`, `rev ${event.state.revision}: ${event.answer.questionId}/${event.answer.optionId} → ${changes}${cityText}`);
}

connectEvents(onEvent, text => {
  if (text.startsWith('disconnected')) {
    if (!disconnected) record('warning', '接続が切れました');
    disconnected = true;
    status.dataset.connection = 'disconnected';
    status.textContent = '接続が切れました';
    connectionDetail.textContent = '自動で再接続します。表示内容は切断前に受信した情報です。';
    return;
  }
  status.dataset.connection = 'connecting';
  status.textContent = disconnected ? '再接続中' : '接続中';
  connectionDetail.textContent = text === 'connected' ? '街の状態を受信しています。'
    : disconnected ? '自動で再接続しています。' : 'サーバーに接続しています。';
});
