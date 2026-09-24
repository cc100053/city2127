import { presets, type WorldState } from './presets.ts';
import { changeSites } from './layout.ts';

// Root-scene side of the survey server's CityView contract (survey/src/shared/cityView.ts).
// Scores drive the atmosphere; the four-lot layout raises the Shibuya change sites (surveySites.ts).
export const AXES = ['automation', 'publicSharing', 'environmentalPriority', 'urbanConcentration'] as const;
export type Scores = Record<typeof AXES[number], number>;
export type Decision = { revision: number; year?: number; pressure?: string; questionText: string; optionLabel: string; policyChange: Record<string, number>; cityChanges: { socketId: string; label: string }[] };
const SOCKETS = ['nw', 'ne', 'sw', 'se'] as const;
export type Lot = { lot: 'empty' | 'park' | 'plaza'; building: 'none' | 'small' | 'medium' | 'tall' };
export type Layout = Record<typeof SOCKETS[number], Lot>;
export type SurveyView = { runId: string; revision: number; scores: Scores; layout: Layout; history: Decision[] };

/** Scene parts the layout can raise: NW automation hub, NE park, SW commons plaza, SE tower (see layout.ts changeSites). */
export type SitePart = 'hubBase' | 'hubUpper' | 'park' | 'plaza' | 'towerBase' | 'towerUpper';
export function siteTargets({ nw, ne, sw, se }: Layout): Record<SitePart, boolean> {
  return {
    hubBase: nw.building !== 'none', hubUpper: nw.building === 'tall',
    park: ne.lot === 'park', plaza: sw.lot === 'plaza',
    towerBase: se.building !== 'none', towerUpper: se.building === 'tall',
  };
}

/** One answer is +2 on an axis; two answers on the same axis reach the full effect. */
const FULL = 4;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Policy scores → atmosphere, as offsets from the neutral preset. Negative scores push the other way. */
export function scoresToWorldState(s: Scores): WorldState {
  const [a, p, e, c] = AXES.map(axis => Math.max(-1, Math.min(1, s[axis] / FULL)));
  const n = presets.neutral;
  return {
    timeOfDay: n.timeOfDay,
    neon: clamp(n.neon + .3 * a + .35 * c),
    traffic: clamp(n.traffic + .5 * a + .15 * c),
    crowd: clamp(n.crowd + .6 * p),
    signage: clamp(n.signage + .4 * p + .2 * c),
    greenery: clamp(n.greenery + .6 * e),
    haze: clamp(n.haze - .15 * e + .1 * c),
    windowLife: clamp(n.windowLife + .5 * c + .1 * a),
    glyph: clamp(n.glyph + .6 * a + .4 * e),
    warmth: clamp(n.warmth + .3 * e - .2 * a),
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Parses one WebSocket message from the survey server; anything malformed returns null. */
export function parseSurveyEvent(data: unknown): SurveyView | null {
  if (!isRecord(data) || !isRecord(data.view)) return null;
  if (data.type !== 'city-state-snapshot' && data.type !== 'city-state-updated' && data.type !== 'run-reset') return null;
  const { runId, revision, scores, history, layout } = data.view;
  if (typeof runId !== 'string' || typeof revision !== 'number' || !isRecord(scores) || !Array.isArray(history)) return null;
  if (!AXES.every(axis => typeof scores[axis] === 'number')) return null;
  if (!history.every(d => isRecord(d) && typeof d.revision === 'number' && typeof d.optionLabel === 'string' && typeof d.questionText === 'string' && isRecord(d.policyChange) && Array.isArray(d.cityChanges) && d.cityChanges.every(c => isRecord(c) && typeof c.label === 'string'))) return null;
  const lots = isRecord(layout) && isRecord(layout.lots) ? layout.lots : null;
  if (!lots || !SOCKETS.every(id => isRecord(lots[id]) && ['empty', 'park', 'plaza'].includes(lots[id].lot as string) && ['none', 'small', 'medium', 'tall'].includes(lots[id].building as string))) return null;
  return { runId, revision, scores: scores as Scores, layout: lots as Layout, history: history as Decision[] };
}

/** A view replaces the current one unless it is an older or repeated revision of the same run. */
export const supersedes = (current: SurveyView | undefined, next: SurveyView) =>
  !current || next.runId !== current.runId || next.revision > current.revision;

/** Keeps a WebSocket to the survey server open; every (re)connect starts with a full snapshot. */
export function connectSurvey(url: string, onView: (view: SurveyView) => void, onStatus: (status: string) => void) {
  let delay = 500;
  const open = () => {
    const socket = new WebSocket(url);
    onStatus('接続中…');
    socket.addEventListener('open', () => { delay = 500; onStatus('接続済み'); });
    socket.addEventListener('message', message => {
      let view: SurveyView | null = null;
      try { view = parseSurveyEvent(JSON.parse(String(message.data))); } catch { view = null; }
      if (view) onView(view); else console.warn('Ignored malformed survey message', message.data);
    });
    socket.addEventListener('close', () => {
      onStatus(`切断 — ${delay / 1000}秒後に再接続`);
      setTimeout(open, delay);
      delay = Math.min(delay * 2, 8000);
    });
  };
  open();
}

const LABELS: Record<string, string> = { automation: '自動化', publicSharing: '公共共有', environmentalPriority: '環境優先', urbanConcentration: '都市集約' };
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Causal panel text: policy deltas, and city changes named by the Shibuya place where they appear. */
export const policyText = (d: Decision) =>
  Object.entries(d.policyChange).map(([axis, n]) => `${LABELS[axis] ?? axis} ${n > 0 ? '↑' : '↓'} ${signed(n)}`).join('　') || '変化なし';
export const cityText = (d: Decision) =>
  d.cityChanges.map(c => `${changeSites[c.socketId as keyof typeof changeSites]?.place ?? c.socketId.toUpperCase()} ${c.label}`).join('　') || '見た目の変化なし';

const HISTORY_SHOWN = 3;
const el = (tag: string, className: string, text = '') => { const e = document.createElement(tag); e.className = className; e.textContent = text; return e; };
const row = (term: string, value: string) => { const r = el('div', 'causal-row'); r.append(el('span', 'causal-term', term), el('span', '', value)); return r; };

/** `?survey` mode: the survey server is the only source of the atmosphere, the change sites and the causal panel. */
export function startSurveyAtmosphere(url: string, apply: (state: WorldState, sites: Record<SitePart, boolean>) => void) {
  document.body.dataset.mode = 'survey';
  // Latest choice → policy change → city effect, then the run's history (ported from module-swap's CausalPanel).
  const panel = el('aside', 'causal-panel');
  panel.setAttribute('aria-live', 'polite');
  const latest = el('section', ''), history = el('ol', ''), scores = el('p', 'causal-scores'), status = el('p', 'causal-status');
  panel.append(el('h2', 'causal-title', '2127 — 選択が都市を変える'), latest, el('h3', 'causal-subtitle', 'これまでの決定'), history, scores, status);
  document.body.appendChild(panel);
  let current: SurveyView | undefined;
  connectSurvey(url, view => {
    if (!supersedes(current, view)) return;
    current = view;
    apply(scoresToWorldState(view.scores), siteTargets(view.layout));
    const last = view.history.at(-1);
    latest.replaceChildren(...(last
      ? [el('p', 'causal-context', `${last.year ?? ''} ${last.pressure ?? ''} — ${last.questionText}`), row('CHOICE', last.optionLabel), row('POLICY', policyText(last)), row('CITY EFFECT', cityText(last))]
      : [el('p', 'causal-context', 'まだ決定はありません。最初のゲストの選択を待っています。')]));
    // Only the latest decisions fit above the SW plaza; the numbering keeps the run order readable.
    const shown = view.history.slice(-HISTORY_SHOWN);
    history.setAttribute('start', String(view.history.length - shown.length + 1));
    history.replaceChildren(...shown.map(d => el('li', '', `${d.pressure ?? d.questionText} → ${d.optionLabel} → ${cityText(d)}`)));
    scores.textContent = AXES.map(axis => `${LABELS[axis]} ${signed(view.scores[axis])}`).join(' · ');
  }, text => { status.textContent = `サーバー: ${text}`; });
}
