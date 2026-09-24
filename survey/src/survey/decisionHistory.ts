import { zeroScores, type CitySurveyState } from '../shared/citySurveyState.ts';
import { deriveCityLayout, layoutChanges, type CityView, type Decision } from '../shared/cityView.ts';
import type { AnswerEvent } from '../shared/protocol.ts';
import type { QuestionSet } from '../shared/question.ts';
import { applyEffects, scoreChange } from './scoreEngine.ts';

/**
 * Builds the viewer contract from the authoritative state and the run's append-only answer events.
 * Each decision's policy and city change comes from replaying the stored effects, so the history
 * explains exactly why every visible element exists. Text comes from the current question set.
 */
export function buildCityView(state: CitySurveyState, events: AnswerEvent[], questions: QuestionSet): CityView {
  let scores = zeroScores();
  const history = events.map((event): Decision => {
    const before = scores;
    scores = applyEffects(before, event.effects);
    const question = questions.questions.find(q => q.id === event.questionId);
    const option = question?.options.find(o => o.id === event.optionId);
    return {
      revision: event.revisionAfter, questionId: event.questionId, optionId: event.optionId,
      year: question?.year, pressure: question?.pressure,
      questionText: question?.text ?? event.questionId, optionLabel: option?.label ?? event.optionId,
      policyChange: scoreChange(before, scores),
      cityChanges: layoutChanges(deriveCityLayout(before), deriveCityLayout(scores)),
    };
  });
  return { runId: state.runId, revision: state.revision, scores: state.scores, layout: deriveCityLayout(state.scores), history };
}
