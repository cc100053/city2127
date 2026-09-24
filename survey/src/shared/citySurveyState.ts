// Shared by the survey server, debug views and tests. Keep this module free of Node and DOM APIs.
/**
 * Policy axes: the urban strategies guests' choices push. They drive question triggers and the derived
 * city layout (cityView.ts). The earlier environment/culture/technology/community/mobility axes were
 * placeholder data and were replaced in schema version 2.
 */
export const CITY_AXES = ['automation', 'publicSharing', 'environmentalPriority', 'urbanConcentration'] as const;
export type CityAxis = typeof CITY_AXES[number];
export type CityScores = Record<CityAxis, number>;

export const SCORE_MIN = -12, SCORE_MAX = 12;

export type CitySurveyState = {
  runId: string;
  revision: number;
  answerCount: number;
  scores: CityScores;
  updatedAt: string;
};

export function isCityAxis(value: string): value is CityAxis {
  return (CITY_AXES as readonly string[]).includes(value);
}

export function zeroScores(): CityScores {
  return { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
}

export function initialCitySurveyState(runId: string, updatedAt: string): CitySurveyState {
  return { runId, revision: 0, answerCount: 0, scores: zeroScores(), updatedAt };
}
