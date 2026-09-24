import type { CityScores } from './citySurveyState.ts';

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
export type CityView = { runId: string; revision: number; scores: CityScores; layout: CityLayout; history: Decision[] };

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
