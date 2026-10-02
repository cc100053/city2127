import type { CityScores, ExhibitionVotes } from './citySurveyState.ts';

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
  bands: Record<ExhibitionSocketId, Band>;
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
  algorithmVersion: 2;
  voteSums: CityScores;
  recentVotes: CityScores;
  scores: CityScores;
  /** Per-axis slot order from the run's complete proposal history (uint32; zero before any directional vote). */
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

/** Server-authoritative layout mapping for the four mature 2127 sites. */
export function deriveExhibitionLayout(scores: CityScores): ExhibitionLayout {
  const t = (score: number) => {
    exhibitionBand(score);
    return (score + 12) / 24;
  };
  const automation = t(scores.automation), sharing = t(scores.publicSharing);
  const environment = t(scores.environmentalPriority), concentration = t(scores.urbanConcentration);
  return {
    version: 2,
    bands: {
      nw: exhibitionBand(scores.automation), ne: exhibitionBand(scores.environmentalPriority),
      sw: exhibitionBand(scores.publicSharing), se: exhibitionBand(scores.urbanConcentration),
    },
    automatedPorts: Math.round(6 * automation),
    sharedSeats: Math.round(8 * sharing),
    treeCount: 3 + Math.round(9 * environment),
    plantedFraction: 0.2 + 0.6 * environment,
    coolingFins: Math.round(6 * (1 - environment)),
    functionModules: 2 + Math.round(4 * concentration),
  };
}

export function exhibitionLayoutChanges(before: ExhibitionLayout, after: ExhibitionLayout): ExhibitionCityChange[] {
  const sites: { socketId: ExhibitionSocketId; label: string; keys: (keyof ExhibitionLayout)[] }[] = [
    { socketId: 'nw', label: '自律サービス端口', keys: ['automatedPorts'] },
    { socketId: 'ne', label: '樹冠・冷却設備', keys: ['treeCount', 'plantedFraction', 'coolingFins'] },
    { socketId: 'sw', label: '共有座位', keys: ['sharedSeats'] },
    { socketId: 'se', label: '機能モジュール', keys: ['functionModules'] },
  ];
  return sites.flatMap(site => {
    const beforeValues: Record<string, number | string> = { band: before.bands[site.socketId] };
    const afterValues: Record<string, number | string> = { band: after.bands[site.socketId] };
    for (const key of site.keys) {
      beforeValues[key] = before[key] as number;
      afterValues[key] = after[key] as number;
    }
    return JSON.stringify(beforeValues) === JSON.stringify(afterValues)
      ? [] : [{ socketId: site.socketId, label: site.label, before: beforeValues, after: afterValues }];
  });
}
