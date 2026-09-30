import type { DevSurveyConfig } from '../shared/devSurvey.ts';
import { validateExhibitionQuestionSet } from '../survey/questionLoader.ts';
import type { QuestionSet } from '../shared/question.ts';
import { voteForEffects } from '../survey/scoreEngine.ts';

/** DEV-ONLY: effects are exposed exclusively by the opt-in loopback Admin route. */
export function devSurveyConfig(set: QuestionSet): DevSurveyConfig {
  validateExhibitionQuestionSet(set);
  return {
    questionSetVersion: set.version,
    meters: set.questions.map(question => ({
      axis: Object.keys(question.options[0].effects)[0], questionId: question.id,
      options: question.options.map(option => ({ id: option.id, label: option.label, vote: voteForEffects(option.effects) })),
    })),
  };
}
