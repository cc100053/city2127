import { CITY_AXES, MILESTONE_KEYS, SCORE_MAX, type CitySurveyState } from '../shared/citySurveyState.ts';
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

/** Score bars and milestone chips for a CitySurveyState. */
export function renderState(state: CitySurveyState): HTMLElement {
  const rows = CITY_AXES.map(axis => {
    const value = state.scores[axis], pct = Math.abs(value) / SCORE_MAX * 50;
    const bar = el('span', { class: 'bar' }, el('span', { class: value < 0 ? 'fill neg' : 'fill', style: `width:${pct}%;${value < 0 ? `right:50%` : 'left:50%'}` }));
    return el('tr', {}, el('th', {}, axis), el('td', { class: 'num' }, signed(value)), el('td', {}, bar));
  });
  const chips = MILESTONE_KEYS.map(key => el('span', { class: state.milestones[key] ? 'chip on' : 'chip' }, `${state.milestones[key] ? '●' : '○'} ${key}`));
  return el('div', {},
    el('p', { class: 'meta' }, `run ${state.runId} · revision ${state.revision} · answers ${state.answerCount} · ${state.updatedAt}`),
    el('table', { class: 'scores' }, ...rows),
    el('p', { class: 'chips' }, ...chips));
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
