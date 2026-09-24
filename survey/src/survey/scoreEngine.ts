import { CITY_AXES, SCORE_MAX, SCORE_MIN, type CityScores } from '../shared/citySurveyState.ts';
import type { CityEffects } from '../shared/question.ts';

export const clampScore = (value: number) => Math.min(SCORE_MAX, Math.max(SCORE_MIN, value));

/** new = clamp(current + effect, -12, 12) for every axis. Effects must come from the server's question set. */
export function applyEffects(scores: CityScores, effects: CityEffects): CityScores {
  const next = { ...scores };
  for (const axis of CITY_AXES) next[axis] = clampScore(scores[axis] + (effects[axis] ?? 0));
  return next;
}

/** Actual per-axis change after clamping; axes that did not move are omitted. */
export function scoreChange(before: CityScores, after: CityScores): Partial<CityScores> {
  const change: Partial<CityScores> = {};
  for (const axis of CITY_AXES) if (after[axis] !== before[axis]) change[axis] = after[axis] - before[axis];
  return change;
}
