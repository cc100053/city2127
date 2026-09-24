import { CITY_AXES, SCORE_MAX, type CitySurveyState } from '../shared/citySurveyState.ts';
import { AXIS_LABELS, LOT_SOCKET_IDS, slotLabel, type CityView } from '../shared/cityView.ts';
import type { ApiResponse, ServerEvent } from '../shared/protocol.ts';

/** Calls the survey server. Network failures become an ApiResponse error so views handle one shape. */
export async function api<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, body === undefined ? { cache: 'no-store' }
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return await response.json() as ApiResponse<T>;
  } catch (error) {
    return { ok: false, error: { code: 'internal_error', message: `Network error: ${error instanceof Error ? error.message : String(error)}` } };
  }
}

/** crypto.randomUUID needs a secure context, which LAN http pages on phones are not. */
export function newAnswerId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Partial<Record<string, string>> = {}, ...children: (Node | string)[]) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) if (value !== undefined) node.setAttribute(key, value);
  node.append(...children);
  return node;
}

export const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/** Policy score bars for a CitySurveyState. */
export function renderState(state: CitySurveyState): HTMLElement {
  const rows = CITY_AXES.map(axis => {
    const value = state.scores[axis], pct = Math.abs(value) / SCORE_MAX * 50;
    const bar = el('span', { class: 'bar' }, el('span', { class: value < 0 ? 'fill neg' : 'fill', style: `width:${pct}%;${value < 0 ? `right:50%` : 'left:50%'}` }));
    return el('tr', {}, el('th', {}, `${AXIS_LABELS[axis]} (${axis})`), el('td', { class: 'num' }, signed(value)), el('td', {}, bar));
  });
  return el('div', {},
    el('p', { class: 'meta' }, `run ${state.runId} · revision ${state.revision} · answers ${state.answerCount} · ${state.updatedAt}`),
    el('table', { class: 'scores' }, ...rows));
}

/** Derived four-lot layout and the decision history that explains it. */
export function renderView(view: CityView): HTMLElement {
  const slots = LOT_SOCKET_IDS.map(id => {
    const lot = view.layout.lots[id];
    return el('tr', {}, el('th', {}, id.toUpperCase()), el('td', {}, `${lot.lot} / ${lot.building}`), el('td', {}, slotLabel(lot)));
  });
  const history = view.history.map(d => el('li', {},
    `${d.year ?? ''} ${d.pressure ?? d.questionId} → ${d.optionLabel} → `
    + `${Object.entries(d.policyChange).map(([axis, delta]) => `${AXIS_LABELS[axis as keyof typeof AXIS_LABELS]} ${signed(delta)}`).join(', ') || '政策変化なし'} → `
    + `${d.cityChanges.map(c => `${c.socketId.toUpperCase()} ${c.label}`).join(', ') || '見た目の変化なし'}`));
  return el('div', {}, el('table', { class: 'scores' }, ...slots), el('ol', { class: 'log' }, ...history));
}

/** Monitor socket with reconnect; after every (re)connect the server sends a full snapshot first. */
export function connectEvents(onEvent: (event: ServerEvent) => void, onStatus: (status: string) => void) {
  let delay = 500;
  const open = () => {
    const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    onStatus('connecting');
    socket.addEventListener('open', () => { delay = 500; onStatus('connected'); });
    socket.addEventListener('message', message => onEvent(JSON.parse(String(message.data)) as ServerEvent));
    socket.addEventListener('close', () => { onStatus(`disconnected — retry in ${delay / 1000}s`); setTimeout(open, delay); delay = Math.min(delay * 2, 8000); });
  };
  open();
}
