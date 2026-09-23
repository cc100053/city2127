import { MILESTONE_KEYS, type CityMilestones, type CityScores, type MilestoneKey } from '../shared/citySurveyState.ts';

const conditions: Record<MilestoneKey, (s: CityScores) => boolean> = {
  greenNetwork: s => s.environment >= 8,
  civicCommons: s => s.culture >= 7 && s.community >= 6,
  autonomousGrid: s => s.technology >= 8 && s.mobility >= 6,
};

/** Milestones are irreversible within a run: once true they stay true even if scores fall. */
export function updateMilestones(current: CityMilestones, scores: CityScores): CityMilestones {
  const next = { ...current };
  for (const key of MILESTONE_KEYS) next[key] = current[key] || conditions[key](scores);
  return next;
}

export function newlyUnlocked(before: CityMilestones, after: CityMilestones): MilestoneKey[] {
  return MILESTONE_KEYS.filter(key => after[key] && !before[key]);
}
