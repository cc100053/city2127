import './debug.css';
import type { CitySurveyState } from '../shared/citySurveyState.ts';
import type { ServerEvent } from '../shared/protocol.ts';
import { api, connectEvents, el, renderState, signed } from './debugApi.ts';

// Debug monitor: shows the CitySurveyState as numbers only; no Three.js mapping is implemented yet.
const app = document.querySelector<HTMLElement>('#app')!;
const status = el('p', { class: 'meta' }, 'WebSocket: -');
const stateBox = el('div');
const last = el('div', { class: 'panel' }, 'まだ回答はありません（この画面を開いてから）');
const log = el('ol', { class: 'log', reversed: '' });
app.append(el('h1', {}, 'Monitor debug'), status, stateBox, el('h2', {}, '最後に適用された回答'), last, el('h2', {}, '変化の履歴（受信順）'), log);

let latest: CitySurveyState | undefined;
function setState(state: CitySurveyState) {
  // Ignore anything older than what is already shown (e.g. a slow HTTP response after a WS update).
  if (latest && latest.runId === state.runId && state.revision < latest.revision) return;
  latest = state;
  stateBox.replaceChildren(renderState(state));
}

function onEvent(event: ServerEvent) {
  if (event.type === 'city-state-snapshot') return setState(event.state);
  if (event.type === 'run-reset') {
    latest = undefined;
    setState(event.state);
    last.replaceChildren(`Reset: run ${event.previousRunId} → ${event.state.runId}`);
    log.prepend(el('li', {}, `RESET → run ${event.state.runId}`));
    return;
  }
  setState(event.state);
  const changes = Object.entries(event.change.scores).map(([axis, delta]) => `${axis} ${signed(delta)}`).join(', ') || '変化なし（上限/下限）';
  const nominal = Object.entries(event.answer.effects).map(([axis, delta]) => `${axis} ${signed(delta)}`).join(', ');
  const unlocked = event.change.unlocked.length ? ` · 解除: ${event.change.unlocked.join(', ')}` : '';
  last.replaceChildren(
    el('p', {}, `${event.questionText} → ${event.optionLabel}`),
    el('p', {}, `実際の変化: ${changes}${unlocked}`),
    el('p', { class: 'meta' }, `効果（質問 v${event.answer.questionVersion}）: ${nominal} · #${event.answer.sequence} · revision ${event.answer.revisionBefore} → ${event.answer.revisionAfter}`));
  log.prepend(el('li', {}, `rev ${event.state.revision}: ${event.answer.questionId}/${event.answer.optionId} → ${changes}${unlocked}`));
  while (log.children.length > 30) log.lastElementChild?.remove();
}

async function refresh() {
  const result = await api<CitySurveyState>('/api/city-state');
  if (result.ok) setState(result.data);
}

connectEvents(onEvent, text => {
  status.textContent = `WebSocket: ${text}`;
  if (text === 'connected') void refresh();
});
void refresh();
