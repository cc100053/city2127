import { emptyEnergyConfiguration, energyConfiguration, sameEnergyConfiguration, type EnergyState, type EnergyConfiguration } from './energy.ts';
import type { CityScores, ExhibitionState, ExhibitionVotes } from './citySurveyState.ts';

/**
 * The Three.js-facing contract. Its layout has the same shape as module-swap's CityLayoutState
 * (module-swap/app/src/state/cityLayoutState.ts), which validates it on arrival.
 */
export const LOT_SOCKET_IDS = ['nw', 'ne', 'sw', 'se'] as const;
export type LotSocketId = typeof LOT_SOCKET_IDS[number];
export type LotKind = 'empty' | 'park' | 'plaza';
export type BuildingKind = 'none' | 'small' | 'medium' | 'tall';
export type LotState = { socketId: LotSocketId; lot: LotKind; building: BuildingKind };
export type CityLayout = { version: 1; lots: Record<LotSocketId, LotState> };

/** A visible slot change and the policy reason it exists. */
export type CityChange = { socketId: LotSocketId; label: string };
/** One accepted answer as the viewer explains it: problem → choice → policy change → city change. */
export type Decision = {
  revision: number;
  questionId: string;
  optionId: string;
  year?: number;
  pressure?: string;
  questionText: string;
  optionLabel: string;
  policyChange: Partial<CityScores>;
  cityChanges: CityChange[];
};
export type LegacyCityView = { runId: string; revision: number; scores: CityScores; layout: CityLayout; history: Decision[] };

export const EXHIBITION_SOCKET_IDS = ['nw', 'ne', 'sw', 'se'] as const;
export type ExhibitionSocketId = typeof EXHIBITION_SOCKET_IDS[number];
export type Band = 'low' | 'mixed' | 'high';
export type ExhibitionLayout = {
  version: 2;
  energy?: EnergyConfiguration;
  bands: Record<ExhibitionSocketId, Band>;
  /** Ladder rung per site, −3..3: ±1 focal site, ±2 about half the district, ±3 the complete district (and its pairings). */
  tiers: Record<ExhibitionSocketId, number>;
  automatedPorts: number;
  sharedSeats: number;
  treeCount: number;
  plantedFraction: number;
  coolingFins: number;
  functionModules: number;
};
export type ProposalAnswerRecord = { questionId: string; optionId: string; questionText: string; optionLabel: string };
export type ExhibitionCityChange = {
  socketId: ExhibitionSocketId;
  label: string;
  before: Record<string, number | string>;
  after: Record<string, number | string>;
};
export type ProposalRecord = {
  id: string;
  stationId?: 'A' | 'B';
  displayAt?: string;
  runId: string;
  guestSessionId: string;
  ordinal: number;
  questionSetVersion: number;
  algorithmVersion: 2;
  answers: ProposalAnswerRecord[];
  votes: ExhibitionVotes;
  revisionBefore: number;
  revisionAfter: number;
  submittedAt: string;
  beforeScores: CityScores;
  afterScores: CityScores;
  beforeLayout: ExhibitionLayout;
  afterLayout: ExhibitionLayout;
  cityChanges: ExhibitionCityChange[];
};
export type ExhibitionCityView = {
  version: 2;
  runId: string;
  revision: number;
  guestCount: number;
  energy?: EnergyState;
  algorithmVersion: 2;
  voteSums: CityScores;
  recentVotes: CityScores;
  scores: CityScores;
  /** Per-axis slot order: the full-history hash frozen when that district first reached rung 2 (uint32; zero before). */
  slotSeeds: CityScores;
  layout: ExhibitionLayout;
  recentProposals: ProposalRecord[];
  latestProposal?: ProposalRecord;
};
export type CityView = LegacyCityView | ExhibitionCityView;

export function isExhibitionCityView(view: CityView): view is ExhibitionCityView {
  return 'version' in view && view.version === 2;
}

export const AXIS_LABELS: Record<keyof CityScores, string> = {
  automation: '自動化', publicSharing: '公共共有', environmentalPriority: '環境優先', urbanConcentration: '都市集約',
};

const lot = (socketId: LotSocketId, kind: LotKind = 'empty', building: BuildingKind = 'none'): LotState => ({ socketId, lot: kind, building });

/**
 * The only policy → geometry mapping. Each slot is persistent evidence of one policy axis, so later
 * answers add to the city instead of replacing earlier evidence. All zero → four empty lots.
 *   NW automation ≥2 medium service hub, ≥4 tall   NE environmentalPriority ≥2 park
 *   SW publicSharing ≥2 plaza                      SE urbanConcentration ≥1 medium, ≥2 tall
 */
export function deriveCityLayout(s: CityScores): CityLayout {
  return {
    version: 1,
    lots: {
      nw: lot('nw', 'empty', s.automation >= 4 ? 'tall' : s.automation >= 2 ? 'medium' : 'none'),
      ne: lot('ne', s.environmentalPriority >= 2 ? 'park' : 'empty'),
      sw: lot('sw', s.publicSharing >= 2 ? 'plaza' : 'empty'),
      se: lot('se', 'empty', s.urbanConcentration >= 2 ? 'tall' : s.urbanConcentration >= 1 ? 'medium' : 'none'),
    },
  };
}

/** What a slot's current content represents in the exhibition story. */
export function slotLabel({ socketId, lot, building }: LotState): string {
  if (lot === 'park') return '都市公園（環境優先）';
  if (lot === 'plaza') return '公共コモンズ広場（公共共有）';
  if (building === 'none') return '空き区画';
  if (socketId === 'nw') return building === 'tall' ? '大規模自動化インフラ（自動化）' : '自動サービス拠点（自動化）';
  return building === 'tall' ? '高層集約タワー（都市集約）' : '中層複合ビル（都市集約）';
}

export function layoutChanges(before: CityLayout, after: CityLayout): CityChange[] {
  return LOT_SOCKET_IDS.filter(id => before.lots[id].lot !== after.lots[id].lot || before.lots[id].building !== after.lots[id].building)
    .map(id => ({ socketId: id, label: slotLabel(after.lots[id]) }));
}

export function exhibitionBand(score: number): Band {
  if (!Number.isFinite(score) || score < -12 || score > 12) throw new RangeError('exhibition score must be finite and between -12 and 12');
  return score <= -3 ? 'low' : score >= 3 ? 'high' : 'mixed';
}

/**
 * Scale A (2026-10-13): real runs keep Meters within about ±5, so the layout reads a stretched display score. The stretch ramps
 * from ×0.85 for the first guest (a mild opening, no instant extreme, yet a first ±1 still clears the .3/.7 pairing shares) to ×2.4 from guest #12 on, where bands switch at about ±1.25.
 */
export const SCALE_START_GAIN = 0.85, SCALE_FULL_GAIN = 2.4, SCALE_RAMP_GUESTS = 12;
export function exhibitionScaleGain(guestCount: number): number {
  return SCALE_START_GAIN + (SCALE_FULL_GAIN - SCALE_START_GAIN) * Math.min(1, Math.max(0, guestCount - 1) / (SCALE_RAMP_GUESTS - 1));
}

/** Meter scores after `guestCount` guests → the display scores the layout reads (clamped to ±12). */
export function exhibitionDisplayScores(scores: CityScores, guestCount: number): CityScores {
  const gain = exhibitionScaleGain(guestCount), display = { ...scores };
  for (const axis of Object.keys(scores) as (keyof CityScores)[]) {
    exhibitionBand(scores[axis]);
    display[axis] = Math.max(-12, Math.min(12, scores[axis] * gain));
  }
  return display;
}

export const SOCKET_AXES = { nw: 'automation', ne: 'environmentalPriority', sw: 'publicSharing', se: 'urbanConcentration' } as const;
/** Display-score edges of rungs 1/2/3 (2026-10-27 user decision); stepping back toward mixed needs D a further 2 past the edge. */
export const LADDER_EDGES = [1.5, 4, 7] as const, LADDER_HYSTERESIS = 2;
export type ExhibitionTiers = ExhibitionLayout['tiers'];
/** Shown tiers plus the per-axis slot seed each district froze when it first reached rung 2. */
export type ExhibitionLadder = { tiers: ExhibitionTiers; seeds: CityScores };
export const initialLadder = (): ExhibitionLadder => ({
  tiers: { nw: 0, ne: 0, sw: 0, se: 0 }, seeds: { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 },
});

const edge = (k: number) => k >= 0 ? LADDER_EDGES[k] : -LADDER_EDGES[-k - 1];
/** Signed number of rungs a display score asks a site to move from tier `k`, with hysteresis toward mixed. */
export function ladderGap(k: number, d: number): number {
  let t = k;
  while (t < LADDER_EDGES.length && d >= edge(t) + (t < 0 ? LADDER_HYSTERESIS : 0)) t++;
  if (t === k) while (t > -LADDER_EDGES.length && d <= edge(t - 1) - (t > 0 ? LADDER_HYSTERESIS : 0)) t--;
  return t - k;
}

/** Display scores of a run state; the climate axis keeps its own guest count once energy proposals exist. */
export function exhibitionStateDisplay(state: Pick<ExhibitionState, 'scores' | 'guestCount' | 'energy'>): CityScores {
  const display = exhibitionDisplayScores(state.scores, state.guestCount);
  if (state.energy) display.environmentalPriority = exhibitionDisplayScores(state.scores, state.energy.climateGuestCount).environmentalPriority;
  return display;
}

/**
 * One proposal moves at most one site one rung: the largest pending gap, then a site this guest voted toward, then a rotation by
 * guest count. `slotSeeds` is the run's full-history hash after this proposal; a district adopts its axis seed the first time it reaches
 * rung 2, so later rungs switch nested slots instead of reshuffling.
 */
export function ladderStep(ladder: ExhibitionLadder, after: Pick<ExhibitionState, 'scores' | 'guestCount' | 'energy'>, votes: ExhibitionVotes, slotSeeds: CityScores): ExhibitionLadder {
  const display = exhibitionStateDisplay(after);
  let best: ExhibitionSocketId | undefined, bestScore = 0, bestGap = 0;
  for (let j = 0; j < EXHIBITION_SOCKET_IDS.length; j++) {
    const id = EXHIBITION_SOCKET_IDS[(after.guestCount + j) % EXHIBITION_SOCKET_IDS.length], axis = SOCKET_AXES[id];
    const gap = ladderGap(ladder.tiers[id], display[axis]);
    const score = Math.abs(gap) * 4 + (Math.sign(gap) === votes[axis] ? 2 : 0);
    if (gap && score > bestScore) { best = id; bestScore = score; bestGap = gap; }
  }
  if (!best) return ladder;
  const tiers = { ...ladder.tiers, [best]: ladder.tiers[best] + Math.sign(bestGap) }, seeds = { ...ladder.seeds }, axis = SOCKET_AXES[best];
  if (Math.abs(tiers[best]) === 2 && seeds[axis] === 0) seeds[axis] = slotSeeds[axis];
  return { tiers, seeds };
}

/** Unlimited tiers straight from display scores: dev `?meters` captures and carrier tests, never a live run. */
export function exhibitionTiers(display: CityScores): ExhibitionTiers {
  const tiers = initialLadder().tiers;
  for (const id of EXHIBITION_SOCKET_IDS) tiers[id] = ladderGap(0, display[SOCKET_AXES[id]]);
  return tiers;
}

/** Display score → layout for the four mature 2127 sites, without the per-proposal limit; dev `?meters` and carrier tests use it. */
export function deriveExhibitionLayout(scores: CityScores): ExhibitionLayout {
  for (const axis of Object.keys(scores) as (keyof CityScores)[]) exhibitionBand(scores[axis]);
  return ladderLayout(exhibitionTiers(scores));
}

/** Server-authoritative layout: tiers from the run's ladder fold, plus the energy configuration of its counts. */
export function ladderLayout(tiers: ExhibitionTiers, energy?: EnergyState): ExhibitionLayout {
  // Focal sites read the complete low/high form from rung 1; t is the site's 0..1 position.
  const t = (id: ExhibitionSocketId) => tiers[id] > 0 ? 1 : tiers[id] < 0 ? 0 : .5;
  const band = (id: ExhibitionSocketId): Band => tiers[id] > 0 ? 'high' : tiers[id] < 0 ? 'low' : 'mixed';
  return {
    version: 2,
    ...(energy ? { energy: energyConfiguration(energy.counts) } : {}),
    bands: { nw: band('nw'), ne: band('ne'), sw: band('sw'), se: band('se') },
    tiers: { ...tiers },
    automatedPorts: Math.round(6 * t('nw')),
    sharedSeats: Math.round(8 * t('sw')),
    treeCount: 3 + Math.round(9 * t('ne')),
    plantedFraction: 0.2 + 0.6 * t('ne'),
    coolingFins: Math.round(6 * (1 - t('ne'))),
    functionModules: 2 + Math.round(4 * t('se')),
  };
}

/**
 * Headline of a live result: the site whose tier newly reached the highest rung, else the site with the most changed carrier
 * values, else the energy configuration. Undefined when nothing visible changed.
 */
export function pickHeadline(before: ExhibitionLayout, after: ExhibitionLayout): { socketId: ExhibitionSocketId } | { energy: true } | undefined {
  const tiered = EXHIBITION_SOCKET_IDS.filter(id => before.tiers[id] !== after.tiers[id]);
  if (tiered.length) return { socketId: tiered.reduce((a, b) => Math.abs(after.tiers[b]) > Math.abs(after.tiers[a]) ? b : a) };
  const changes = exhibitionLayoutChanges(before, after);
  const size = (c: ExhibitionCityChange) => Object.keys(c.after).filter(key => c.after[key] !== c.before[key]).length;
  if (changes.length) return { socketId: changes.reduce((a, b) => size(b) > size(a) ? b : a).socketId };
  return sameEnergyConfiguration(before.energy ?? emptyEnergyConfiguration(), after.energy ?? emptyEnergyConfiguration()) ? undefined : { energy: true };
}

export function exhibitionLayoutChanges(before: ExhibitionLayout, after: ExhibitionLayout): ExhibitionCityChange[] {
  const sites: { socketId: ExhibitionSocketId; label: string; keys: (keyof ExhibitionLayout)[] }[] = [
    { socketId: 'nw', label: '自律サービス端口', keys: ['automatedPorts'] },
    { socketId: 'ne', label: '樹冠・冷却設備', keys: ['treeCount', 'plantedFraction', 'coolingFins'] },
    { socketId: 'sw', label: '共有座位', keys: ['sharedSeats'] },
    { socketId: 'se', label: '機能モジュール', keys: ['functionModules'] },
  ];
  return sites.flatMap(site => {
    const beforeValues: Record<string, number | string> = { band: before.bands[site.socketId], tier: before.tiers[site.socketId] };
    const afterValues: Record<string, number | string> = { band: after.bands[site.socketId], tier: after.tiers[site.socketId] };
    for (const key of site.keys) {
      beforeValues[key] = before[key] as number;
      afterValues[key] = after[key] as number;
    }
    return JSON.stringify(beforeValues) === JSON.stringify(afterValues)
      ? [] : [{ socketId: site.socketId, label: site.label, before: beforeValues, after: afterValues }];
  });
}
