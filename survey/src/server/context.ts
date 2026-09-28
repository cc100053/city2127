import type { DatabaseSync } from 'node:sqlite';
import type { CitySurveyState, ExhibitionState } from '../shared/citySurveyState.ts';
import type { ApiError, ApiResponse, ErrorCode, ServerEvent } from '../shared/protocol.ts';
import type { QuestionSet } from '../shared/question.ts';

/** Dependencies shared by the services; tests inject a clock and an in-memory database. */
export type SurveyContext = {
  db: DatabaseSync;
  /** Version 2 question set for reusable complete proposals. */
  questions: QuestionSet;
  /** Original one-answer set used only when replaying legacy runs. */
  legacyQuestions: QuestionSet;
  now: () => Date;
  newId: () => string;
  reservationMs: number;
};

/** A service outcome plus the realtime event to publish after the transaction has committed. */
export type ServiceOutcome<T> = { response: ApiResponse<T>; event?: ServerEvent };

export function fail(code: ErrorCode, message: string, state?: CitySurveyState | ExhibitionState): { ok: false; error: ApiError; state?: CitySurveyState | ExhibitionState } {
  return state ? { ok: false, error: { code, message }, state } : { ok: false, error: { code, message } };
}
