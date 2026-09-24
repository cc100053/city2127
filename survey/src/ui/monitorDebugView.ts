import './debug.css';
import type { CityView } from '../shared/cityView.ts';
import type { ServerEvent } from '../shared/protocol.ts';
import { api, connectEvents, el, renderView, signed } from './debugApi.ts';

// Debug monitor: the derived layout and decision history as text. The 3D viewer is module-swap's ?survey mode.
const app = document.querySelector<HTMLElement>('#app')!;
const status = el('p', { class: 'meta' }, 'WebSocket: -');
const stateBox = el('div');
const last = el('div', { class: 'panel' }, 'まだ回答はありません（この画面を開いてから）');
const log = el('ol', { class: 'log', reversed: '' });
app.append(el('h1', {}, 'Monitor debug'), status, stateBox, el('h2', {}, '最後に適用された回答'), last, el('h2', {}, '変化の履歴（受信順）'), log);

let latest: CityView | undefined;
function setState(view: CityView) {
  // Ignore anything older than what is already shown (e.g. a slow HTTP response after a WS update).
  if (latest && latest.runId === view.runId && view.revision < latest.revision) return;
  latest = view;
  stateBox.replaceChildren(el('p', { class: 'meta' }, `run ${view.runId} · revision ${view.revision}`), renderView(view));
}

function onEvent(event: ServerEvent) {
  if (event.type === 'city-state-snapshot') return setState(event.view);
  if (event.type === 'run-reset') {
    latest = undefined;
    setState(event.view);
    last.replaceChildren(`Reset: run ${event.previousRunId} → ${event.state.runId}`);
    log.prepend(el('li', {}, `RESET → run ${event.state.runId}`));
    return;
  }
  setState(event.view);
  const changes = Object.entries(event.change.scores).map(([axis, delta]) => `${axis} ${signed(delta)}`).join(', ') || '変化なし（上限/下限）';
  const nominal = Object.entries(event.answer.effects).map(([axis, delta]) => `${axis} ${signed(delta)}`).join(', ');
  const city = event.view.history.at(-1)?.cityChanges.map(c => `${c.socketId.toUpperCase()} ${c.label}`).join(', ');
  const cityText = city ? ` · 都市: ${city}` : '';
  last.replaceChildren(
    el('p', {}, `${event.questionText} → ${event.optionLabel}`),
    el('p', {}, `実際の変化: ${changes}${cityText}`),
    el('p', { class: 'meta' }, `効果（質問 v${event.answer.questionVersion}）: ${nominal} · #${event.answer.sequence} · revision ${event.answer.revisionBefore} → ${event.answer.revisionAfter}`));
  log.prepend(el('li', {}, `rev ${event.state.revision}: ${event.answer.questionId}/${event.answer.optionId} → ${changes}${cityText}`));
  while (log.children.length > 30) log.lastElementChild?.remove();
}

async function refresh() {
  const result = await api<CityView>('/api/city-view');
  if (result.ok) setState(result.data);
}

connectEvents(onEvent, text => {
  status.textContent = `WebSocket: ${text}`;
  if (text === 'connected') void refresh();
});
void refresh();
