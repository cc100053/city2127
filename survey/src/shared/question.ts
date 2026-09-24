import type { CityAxis, CityScores } from './citySurveyState.ts';

export type CityEffects = Partial<CityScores>;
export type QuestionOption = { id: string; label: string; effects: CityEffects };
/** Every listed axis must satisfy its bounds (inclusive). No trigger: always eligible. */
export type QuestionTrigger = Partial<Record<CityAxis, { gte?: number; lte?: number }>>;
/**
 * `year`, `pressure` and `background` describe the urban problem the guest responds to; they are
 * metadata for the guest and monitor, not a simulated quantity.
 */
export type Question = {
  id: string; text: string; options: QuestionOption[];
  year?: number; pressure?: string; background?: string; trigger?: QuestionTrigger;
};
export type QuestionSet = { version: number; questions: Question[] };

/** What a guest device receives: option effects and triggers stay on the server. */
export type PublicQuestion = { id: string; text: string; year?: number; background?: string; options: { id: string; label: string }[] };

export function toPublicQuestion({ id, text, year, background, options }: Question): PublicQuestion {
  return { id, text, year, background, options: options.map(({ id, label }) => ({ id, label })) };
}

export function isEligible(question: Question, scores: CityScores): boolean {
  return Object.entries(question.trigger ?? {}).every(([axis, bound]) =>
    (bound.gte === undefined || scores[axis as CityAxis] >= bound.gte) && (bound.lte === undefined || scores[axis as CityAxis] <= bound.lte));
}
