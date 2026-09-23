import type { CityScores } from './citySurveyState.ts';

export type CityEffects = Partial<CityScores>;
export type QuestionOption = { id: string; label: string; effects: CityEffects };
export type Question = { id: string; text: string; options: QuestionOption[] };
export type QuestionSet = { version: number; questions: Question[] };

/** What a guest device receives: option effects stay on the server. */
export type PublicQuestion = { id: string; text: string; options: { id: string; label: string }[] };

export function toPublicQuestion(question: Question): PublicQuestion {
  return { id: question.id, text: question.text, options: question.options.map(({ id, label }) => ({ id, label })) };
}
