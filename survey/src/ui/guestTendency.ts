// "いまの街" panel for the guest handoff screen (2026-11-10): where the shared city now leans on each question,
// next to the side this guest chose. Directions only: option effect values stay on the server, and the scores
// are the same public Meter the conflict table already shows.
import type { ExhibitionState } from '../shared/citySurveyState.ts';
import { SCORE_MAX, SCORE_MIN } from '../shared/citySurveyState.ts';
import { ENERGY_CHOICES, type EnergyChoice } from '../shared/energy.ts';
import { el } from './debugApi.ts';
import { optionIcon } from './guestIcons.ts';

type AxisView = { questionId: string; axis: 'automation' | 'publicSharing' | 'urbanConcentration'; title: string; low: string; high: string };

/** Pole wording follows the option headings the guest just read. */
export const AXIS_VIEWS: readonly AxisView[] = [
  { questionId: 'service-2127', axis: 'automation', title: '暮らしの助け', low: '人に相談', high: 'いつでも自動' },
  { questionId: 'commons-2127', axis: 'publicSharing', title: '海辺の休み方', low: '静かな場所', high: '開かれた海辺' },
  { questionId: 'functions-2127', axis: 'urbanConcentration', title: '街のめぐり方', low: '低い建物をめぐる', high: 'タワーで済ませる' },
];

/** Where each option sits on its question's axis: low pole, middle, high pole. */
export const OPTION_SIDE: Record<string, -1 | 0 | 1> = {
  'human-led': -1, 'human-machine': 0, autonomous: 1,
  'private-pods': -1, 'mixed-seating': 0, 'open-commons': 1,
  'distributed-pavilions': -1, 'mixed-functions': 0, 'vertical-functions': 1,
};

export const ENERGY_TITLES: Record<EnergyChoice, string> = {
  'water-storage': '水庭', 'rotor-storage': '街の中心', 'orbital-supply': '空', 'island-supply': '沖の島',
};

/** 0–100 % along the track for a Meter score. */
export function scorePercent(score: number) {
  const clamped = Math.min(SCORE_MAX, Math.max(SCORE_MIN, score));
  return ((clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
}

/** Plain-language lean, so the panel reads without the bar. */
export function leanText(score: number, view: Pick<AxisView, 'low' | 'high'>) {
  if (score <= -6) return `「${view.low}」が多い街`;
  if (score < -1.5) return `やや「${view.low}」寄り`;
  if (score >= 6) return `「${view.high}」が多い街`;
  if (score > 1.5) return `やや「${view.high}」寄り`;
  return 'ちょうど半ば';
}

/** Whole-number shares that add to 100, largest remainder first; all zero when nobody has chosen yet. */
export function energyShares(counts: Record<EnergyChoice, number>): Record<EnergyChoice, number> {
  const total = ENERGY_CHOICES.reduce((sum, choice) => sum + counts[choice], 0);
  const shares = Object.fromEntries(ENERGY_CHOICES.map(choice => [choice, 0])) as Record<EnergyChoice, number>;
  if (total <= 0) return shares;
  const exact = ENERGY_CHOICES.map(choice => ({ choice, value: (counts[choice] / total) * 100 }));
  for (const { choice, value } of exact) shares[choice] = Math.floor(value);
  let left = 100 - ENERGY_CHOICES.reduce((sum, choice) => sum + shares[choice], 0);
  for (const { choice } of [...exact].sort((a, b) => (b.value % 1) - (a.value % 1))) {
    if (left <= 0) break;
    shares[choice] += 1; left -= 1;
  }
  return shares;
}

function axisRow(view: AxisView, score: number, picked: string | undefined) {
  const side = picked ? OPTION_SIDE[picked] : undefined;
  const track = el('div', { class: 'guest-lean-track', 'aria-hidden': 'true' },
    el('span', { class: 'guest-lean-mid' }),
    el('span', { class: 'guest-lean-city', style: `left:${scorePercent(score).toFixed(1)}%` }));
  if (side !== undefined) track.append(el('span', { class: 'guest-lean-you', style: `left:${[12, 50, 88][side + 1]}%` }, 'あなた'));
  return el('li', { class: 'guest-lean-row' },
    el('p', { class: 'guest-lean-title' }, view.title, el('span', { class: 'guest-lean-text' }, leanText(score, view))),
    track,
    el('p', { class: 'guest-lean-poles', 'aria-hidden': 'true' }, el('span', {}, view.low), el('span', {}, view.high)));
}

function energyRow(state: ExhibitionState, picked: string | undefined) {
  const counts = state.energy?.counts;
  if (!counts) return undefined;
  const shares = energyShares(counts);
  return el('li', { class: 'guest-lean-row guest-lean-row--energy' },
    el('p', { class: 'guest-lean-title' }, '電気の設備', el('span', { class: 'guest-lean-text' }, '住民の選んだ割合')),
    el('ul', { class: 'guest-energy-bars' }, ...ENERGY_CHOICES.map(choice => {
      const icon = optionIcon(choice, 'guest-icon guest-icon--small');
      return el('li', { class: choice === picked ? 'is-yours' : '', 'aria-label': `${ENERGY_TITLES[choice]} ${shares[choice]}%${choice === picked ? '（あなたの選択）' : ''}` },
        ...(icon ? [icon] : []),
        el('span', { class: 'guest-energy-name' }, ENERGY_TITLES[choice]),
        el('span', { class: 'guest-energy-bar', 'aria-hidden': 'true' }, el('span', { style: `width:${shares[choice]}%` })),
        el('span', { class: 'guest-energy-share' }, `${shares[choice]}%`));
    })));
}

/** The handoff panel: city lean per question plus this guest's side. `choices` maps question id → option id. */
export function renderTendency(state: ExhibitionState, choices: ReadonlyMap<string, string>) {
  const energy = energyRow(state, choices.get('energy-2127'));
  return el('section', { class: 'guest-tendency', 'aria-label': 'いまの街の傾向' },
    el('p', { class: 'guest-tendency-heading' }, `いまの街 · ${state.guestCount}人の声から`),
    el('ul', { class: 'guest-lean-list' },
      ...AXIS_VIEWS.map(view => axisRow(view, state.scores[view.axis], choices.get(view.questionId))),
      ...(energy ? [energy] : [])));
}
