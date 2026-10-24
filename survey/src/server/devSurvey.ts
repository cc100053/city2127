import type { DevSurveyConfig } from '../shared/devSurvey.ts';
import { validateExhibitionQuestionSet } from '../survey/questionLoader.ts';
import type { QuestionSet } from '../shared/question.ts';
import { voteForEffects } from '../survey/scoreEngine.ts';

/** DEV-ONLY: effects are exposed exclusively by the opt-in loopback Admin route. */
export function devSurveyConfig(set: QuestionSet): DevSurveyConfig {
  validateExhibitionQuestionSet(set);
  return {
    questionSetVersion: set.version,
    ...(set.questions.some(q => q.id === 'energy-2127') ? { energy: { questionId: 'energy-2127', options: set.questions.find(q => q.id === 'energy-2127')!.options.map(o => ({ id: o.energy!, label: o.label })) } } : {}),
    meters: set.questions.filter(q => !q.options[0].energy).map(question => ({
      axis: Object.keys(question.options[0].effects)[0], questionId: question.id,
      options: question.options.map(option => ({ id: option.id, label: option.label, vote: voteForEffects(option.effects) })),
    })),
  };
}
