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
const EXHIBITION_FIELD_LABELS: Record<string, string> = {
  band: 'Meter帯', automatedPorts: '自律サービス端口', sharedSeats: '共有席',
  treeCount: '樹冠', plantedFraction: '植栽面', coolingFins: '冷却設備', functionModules: '機能モジュール',
};
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const signedMeter = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

function exhibitionValue(key: string, value: number | string) {
  return key === 'plantedFraction' ? `${(Number(value) * 100).toFixed(1)}%` : String(value);
}
export const voteSymbol = (vote: number) => vote > 0 ? '＋' : vote < 0 ? '−' : '·';
export const exhibitionVoteMarks = (votes: ExhibitionProposal['votes']) => AXES.map(axis => ({
  label: EXHIBITION_LABELS[axis], vote: votes[axis], symbol: voteSymbol(votes[axis]),
}));

/** Causal panel text: policy deltas, and city changes named by the Shibuya place where they appear. */
export const policyText = (d: Decision) =>
  Object.entries(d.policyChange).map(([axis, n]) => `${LABELS[axis] ?? axis} ${n > 0 ? '↑' : '↓'} ${signed(n)}`).join('　') || '変化なし';
export const cityText = (d: Decision) =>
  d.cityChanges.map(c => `${changeSites[c.socketId as keyof typeof changeSites]?.place ?? c.socketId.toUpperCase()} ${c.label}`).join('　') || '見た目の変化なし';

export function exhibitionFeedback(proposal?: ExhibitionProposal) {
  if (!proposal) return null;
  const scores = AXES.map(axis => ({
    label: EXHIBITION_LABELS[axis],
    before: signedMeter(proposal.beforeScores[axis]),
    after: signedMeter(proposal.afterScores[axis]),
  }));
  const cityChanges = proposal.cityChanges.flatMap(change => {
    const numericKeys = Object.keys(change.before)
      .filter(key => typeof change.before[key] === 'number' && typeof change.after[key] === 'number' && change.before[key] !== change.after[key])
    const changedKeys = numericKeys.length ? numericKeys : change.before.band !== change.after.band ? ['band'] : [];
    const effect = changedKeys
      .map(key => `${EXHIBITION_FIELD_LABELS[key] ?? key} ${exhibitionValue(key, change.before[key])} → ${exhibitionValue(key, change.after[key])}`)
      .join(' · ');
    return effect ? [{ place: changeSites[change.socketId].place, label: change.label, effect }] : [];
  }).slice(0, 2);
  const scoresChanged = AXES.some(axis => proposal.beforeScores[axis] !== proposal.afterScores[axis]);
  const cityChanged = proposal.cityChanges.length > 0;
  return {
    ordinal: proposal.ordinal,
    answers: proposal.answers.map(({ questionText, optionLabel }) => ({ questionText, optionLabel })),
    scores,
    cityChanges,
    cityChanged,
    changed: scoresChanged || cityChanged,
    note: cityChanged
      ? `提案 #${proposal.ordinal} の街区構成変更を記録しました。`
      : scoresChanged
        ? `Meter値を更新しました。街区構成は維持されました。提案 #${proposal.ordinal} を記録しました。`
        : `Meter値と街区構成は維持されました。提案 #${proposal.ordinal} を記録しました。`,
  };
}

export const exhibitionScoresText = (scores: ExhibitionView['scores']) =>
  AXES.map(axis => `${EXHIBITION_LABELS[axis]} ${scores[axis] > 0 ? '+' : ''}${scores[axis].toFixed(1)}`).join(' · ');

const LEGACY_HISTORY_SHOWN = 3;
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
  const historyTitle = el('h3', 'causal-subtitle', 'これまでの決定'), historyCount = el('p', 'causal-history-total');
  const historyLegend = el('p', 'causal-vote-legend', '各格子左上から：担い手／共有／暑さ／機能');
  pending.hidden = true;
  historyCount.hidden = true;
  historyLegend.hidden = true;
  panel.append(el('h2', 'causal-title', '2127 — 選択が都市を変える'), pending, latest, historyTitle, historyCount, historyLegend, history, scores, status);
  document.body.appendChild(panel);
  let current: CityView | undefined;
  connectSurvey(url, (kind, view) => {
    if (!supersedes(current, view)) return;
    current = view;
    apply(kind, view);
    if (isExhibitionView(view)) {
      historyTitle.textContent = '最近64人';
      historyCount.hidden = false;
      historyCount.textContent = `累計 ${view.guestCount} 人`;
      historyLegend.hidden = false;
      pending.hidden = false;
      pending.textContent = 'サービス・共有空間・機能配置の表示は準備中です。Meterは4軸を表示します。';
      const feedback = exhibitionFeedback(view.latestProposal);
      latest.replaceChildren(...(feedback
        ? [
          el('p', 'causal-context', `提案 #${feedback.ordinal}`),
          ...feedback.answers.map(answer => row(answer.questionText, answer.optionLabel)),
          ...feedback.scores.map(score => row(score.label, `${score.before} → ${score.after}`)),
          ...(feedback.cityChanges.length
            ? feedback.cityChanges.map(change => row(`${change.place} · ${change.label}`, change.effect))
            : [row('街区構成', feedback.cityChanged ? '数値項目に変化はありません。' : 'サーバー記録上、変化はありません。')]),
          row(feedback.changed ? '記録' : '変化なし', feedback.note),
        ]
        : [el('p', 'causal-context', 'まだ提案はありません。最初のゲストを待っています。')]));
      const shown = view.recentProposals;
      history.setAttribute('start', String(shown[0]?.ordinal ?? view.guestCount + 1));
      history.className = 'causal-proposal-band';
      history.setAttribute('aria-label', '4軸投票の順序はサービスの担い手、空間の使い方、暑さへの備え、機能の配置です。');
      history.replaceChildren(...shown.map(proposal => {
        const cell = el('li', 'causal-proposal-cell');
        const marks = exhibitionVoteMarks(proposal.votes);
        cell.setAttribute('aria-label', `提案 #${proposal.ordinal}: ${marks.map(({ label, vote }) => `${label} ${signed(vote)}`).join('、')}`);
        cell.append(...marks.map(({ label, vote, symbol }) => {
          const mark = el('span', `causal-vote ${vote > 0 ? 'causal-vote-up' : vote < 0 ? 'causal-vote-down' : 'causal-vote-flat'}`, symbol);
          mark.title = `${label} ${signed(vote)}`;
          return mark;
        }));
        return cell;
      }));
      scores.textContent = exhibitionScoresText(view.scores);
    } else {
      historyTitle.textContent = 'これまでの決定';
      historyCount.hidden = true;
      historyCount.textContent = '';
      historyLegend.hidden = true;
      history.className = '';
      history.removeAttribute('aria-label');
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
  const shown = view.history.slice(-LEGACY_HISTORY_SHOWN);
  history.setAttribute('start', String(view.history.length - shown.length + 1));
  history.replaceChildren(...shown.map(d => el('li', '', `${d.pressure ?? d.questionText} → ${d.optionLabel} → ${cityText(d)}`)));
  scores.textContent = AXES.map(axis => `${LABELS[axis]} ${signed(view.scores[axis])}`).join(' · ');
}
