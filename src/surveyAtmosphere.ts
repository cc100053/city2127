import { presets, type WorldState } from './presets.ts';
import { changeSites } from './layout.ts';
import { AXES, connectSurvey, isExhibitionView, supersedes, type CityView, type Decision, type ExhibitionProposal, type ExhibitionView, type SurveyEventKind, type SurveyView } from './surveyView.ts';

// Root-scene side of the survey server's CityView contract (survey/src/shared/cityView.ts).
// Scores drive the atmosphere; the CityChangeManager renders the server-derived layout.

/** One answer is +2 on an axis; two answers on the same axis reach the full effect. */
const FULL = 4;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Policy scores → atmosphere, as offsets from the neutral preset. Negative scores push the other way. */
export function scoresToWorldState(s: SurveyView['scores']): WorldState {
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

const LABELS: Record<string, string> = { automation: '自動化', publicSharing: '公共共有', environmentalPriority: '環境優先', urbanConcentration: '都市集約' };
const EXHIBITION_LABELS: Record<string, string> = {
  automation: 'サービスの担い手', publicSharing: '空間の使い方',
  environmentalPriority: '暑さへの備え', urbanConcentration: '機能の配置',
};
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Causal panel text: policy deltas, and city changes named by the Shibuya place where they appear. */
export const policyText = (d: Decision) =>
  Object.entries(d.policyChange).map(([axis, n]) => `${LABELS[axis] ?? axis} ${n > 0 ? '↑' : '↓'} ${signed(n)}`).join('　') || '変化なし';
export const cityText = (d: Decision) =>
  d.cityChanges.map(c => `${changeSites[c.socketId as keyof typeof changeSites]?.place ?? c.socketId.toUpperCase()} ${c.label}`).join('　') || '見た目の変化なし';

export function exhibitionFeedback(proposal?: ExhibitionProposal) {
  if (!proposal) return null;
  const before = proposal.beforeLayout, after = proposal.afterLayout;
  const q3 = proposal.answers.find(answer => answer.questionId === 'cooling-2127');
  if (!q3) return null;
  const changed = before.treeCount !== after.treeCount || before.coolingFins !== after.coolingFins
    || before.plantedFraction !== after.plantedFraction;
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
  return {
    ordinal: proposal.ordinal,
    reason: q3.optionLabel,
    effect: `樹冠 ${before.treeCount} → ${after.treeCount} · 冷却設備 ${before.coolingFins} → ${after.coolingFins} · 植栽面 ${percent(before.plantedFraction)} → ${percent(after.plantedFraction)}`,
    changed,
    note: changed ? `提案 #${proposal.ordinal} を記録しました。` : `駅東の暑さ対策は維持されました。提案 #${proposal.ordinal} を記録しました。`,
  };
}

export const exhibitionScoresText = (scores: ExhibitionView['scores']) =>
  AXES.map(axis => `${EXHIBITION_LABELS[axis]} ${scores[axis] > 0 ? '+' : ''}${scores[axis].toFixed(1)}`).join(' · ');

const HISTORY_SHOWN = 3;
const el = (tag: string, className: string, text = '') => { const e = document.createElement(tag); e.className = className; e.textContent = text; return e; };
const row = (term: string, value: string) => { const r = el('div', 'causal-row'); r.append(el('span', 'causal-term', term), el('span', '', value)); return r; };

/** `?survey` mode: the survey server is the only source of the atmosphere, the change sites and the causal panel. */
export function startSurveyAtmosphere(
  url: string,
  apply: (kind: SurveyEventKind, view: CityView) => void,
) {
  document.body.dataset.mode = 'survey';
  // Latest choice → policy change → city effect, then the run's history (ported from module-swap's CausalPanel).
  const panel = el('aside', 'causal-panel');
  panel.setAttribute('aria-live', 'polite');
  const pending = el('p', 'causal-context'), latest = el('section', ''), history = el('ol', ''), scores = el('p', 'causal-scores'), status = el('p', 'causal-status');
  pending.hidden = true;
  panel.append(el('h2', 'causal-title', '2127 — 選択が都市を変える'), pending, latest, el('h3', 'causal-subtitle', 'これまでの決定'), history, scores, status);
  document.body.appendChild(panel);
  let current: CityView | undefined;
  connectSurvey(url, (kind, view) => {
    if (!supersedes(current, view)) return;
    current = view;
    apply(kind, view);
    if (isExhibitionView(view)) {
      pending.hidden = false;
      pending.textContent = 'サービス・共有空間・機能配置の表示は準備中です。Meterは4軸を表示します。';
      const feedback = exhibitionFeedback(view.latestProposal);
      latest.replaceChildren(...(feedback
        ? [el('p', 'causal-context', `提案 #${feedback.ordinal} · Q3 暑さ対策`), row('選択理由', feedback.reason), row('駅東の変化', feedback.effect), row(feedback.changed ? '記録' : '維持', feedback.note)]
        : [el('p', 'causal-context', '提案を待っています。駅東の暑さ対策は現在の構成を維持します。')]));
      const shown = view.recentProposals.slice(-HISTORY_SHOWN);
      history.setAttribute('start', String(view.guestCount - shown.length + 1));
      history.replaceChildren(...shown.map(proposal => el('li', '', `#${proposal.ordinal} Q3 ${proposal.answers.find(answer => answer.questionId === 'cooling-2127')!.optionLabel}`)));
      scores.textContent = exhibitionScoresText(view.scores);
    } else {
      pending.hidden = true;
      pending.textContent = '';
      renderLegacyFeedback(view, latest, history, scores);
    }
  }, text => { status.textContent = `サーバー: ${text}`; });
}

function renderLegacyFeedback(view: SurveyView, latest: HTMLElement, history: HTMLElement, scores: HTMLElement) {
  const last = view.history.at(-1);
  latest.replaceChildren(...(last
    ? [el('p', 'causal-context', `${last.year ?? ''} ${last.pressure ?? ''} — ${last.questionText}`), row('CHOICE', last.optionLabel), row('POLICY', policyText(last)), row('CITY EFFECT', cityText(last))]
    : [el('p', 'causal-context', 'まだ決定はありません。最初のゲストの選択を待っています。')]));
  const shown = view.history.slice(-HISTORY_SHOWN);
  history.setAttribute('start', String(view.history.length - shown.length + 1));
  history.replaceChildren(...shown.map(d => el('li', '', `${d.pressure ?? d.questionText} → ${d.optionLabel} → ${cityText(d)}`)));
  scores.textContent = AXES.map(axis => `${LABELS[axis]} ${signed(view.scores[axis])}`).join(' · ');
}
