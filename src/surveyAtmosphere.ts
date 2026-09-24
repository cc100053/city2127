import { presets, type WorldState } from './presets.ts';

// Root-scene side of the survey server's CityView contract (survey/src/shared/cityView.ts).
// Only the policy scores drive this scene for now; the four-lot layout stays module-swap's.
export const AXES = ['automation', 'publicSharing', 'environmentalPriority', 'urbanConcentration'] as const;
export type Scores = Record<typeof AXES[number], number>;
export type Decision = { revision: number; optionLabel: string; policyChange: Record<string, number> };
export type SurveyView = { runId: string; revision: number; scores: Scores; history: Decision[] };

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
  const { runId, revision, scores, history } = data.view;
  if (typeof runId !== 'string' || typeof revision !== 'number' || !isRecord(scores) || !Array.isArray(history)) return null;
  if (!AXES.every(axis => typeof scores[axis] === 'number')) return null;
  if (!history.every(d => isRecord(d) && typeof d.revision === 'number' && typeof d.optionLabel === 'string' && isRecord(d.policyChange))) return null;
  return { runId, revision, scores: scores as Scores, history: history as Decision[] };
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

const LABELS: Record<keyof Scores, string> = { automation: '自動化', publicSharing: '公共共有', environmentalPriority: '環境優先', urbanConcentration: '都市集約' };
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** `?survey` mode: the survey server's policy scores are the only source of the atmosphere. */
export function startSurveyAtmosphere(url: string, apply: (state: WorldState) => void) {
  document.body.dataset.mode = 'survey';
  const panel = document.createElement('aside');
  panel.className = 'survey-panel';
  panel.setAttribute('aria-live', 'polite');
  panel.innerHTML = '<p class="survey-status"></p><p class="survey-choice"></p><p class="survey-scores"></p>';
  document.body.appendChild(panel);
  const [status, choice, scores] = Array.from(panel.children) as HTMLElement[];
  let current: SurveyView | undefined;
  connectSurvey(url, view => {
    if (!supersedes(current, view)) return;
    current = view;
    apply(scoresToWorldState(view.scores));
    const last = view.history.at(-1);
    choice.textContent = last
      ? `CHOICE ${last.optionLabel} → ${Object.entries(last.policyChange).map(([axis, d]) => `${LABELS[axis as keyof Scores] ?? axis} ${signed(d)}`).join(' / ')}`
      : 'CHOICE —';
    scores.textContent = AXES.map(axis => `${LABELS[axis]} ${signed(view.scores[axis])}`).join('  ·  ');
  }, text => { status.textContent = `SURVEY ${text}`; });
}
