// Shared by the survey server, debug views and tests. Keep this module free of Node and DOM APIs.
export const CITY_AXES = ['environment', 'culture', 'technology', 'community', 'mobility'] as const;
export type CityAxis = typeof CITY_AXES[number];
export type CityScores = Record<CityAxis, number>;

export const MILESTONE_KEYS = ['greenNetwork', 'civicCommons', 'autonomousGrid'] as const;
export type MilestoneKey = typeof MILESTONE_KEYS[number];
export type CityMilestones = Record<MilestoneKey, boolean>;

export const SCORE_MIN = -12, SCORE_MAX = 12;

export type CitySurveyState = {
  runId: string;
  revision: number;
  answerCount: number;
  scores: CityScores;
  milestones: CityMilestones;
  updatedAt: string;
};

export function isCityAxis(value: string): value is CityAxis {
  return (CITY_AXES as readonly string[]).includes(value);
}

export function zeroScores(): CityScores {
  return { environment: 0, culture: 0, technology: 0, community: 0, mobility: 0 };
}

export function initialCitySurveyState(runId: string, updatedAt: string): CitySurveyState {
  return {
    runId, revision: 0, answerCount: 0, scores: zeroScores(),
    milestones: { greenNetwork: false, civicCommons: false, autonomousGrid: false }, updatedAt,
  };
}

/**
 * Entry point for a future Three.js consumer. It only normalizes scores to -1..1 and lists unlocked
 * milestones; the CityVisualState mapping to GLB districts/buildings is undecided and deliberately absent.
 */
export type CityViewInput = { runId: string; revision: number; normalized: CityScores; unlocked: MilestoneKey[] };
export function toCityViewInput(state: CitySurveyState): CityViewInput {
  const normalized = zeroScores();
  for (const axis of CITY_AXES) normalized[axis] = state.scores[axis] / SCORE_MAX;
  return { runId: state.runId, revision: state.revision, normalized, unlocked: MILESTONE_KEYS.filter(key => state.milestones[key]) };
}
