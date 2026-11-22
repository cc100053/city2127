import type { DatabaseSync } from 'node:sqlite';
import type { CitySurveyState, ExhibitionState } from '../shared/citySurveyState.ts';
import type { ApiError, ApiResponse, ErrorCode, ServerEvent } from '../shared/protocol.ts';
import type { QuestionSet } from '../shared/question.ts';
import type { RotationSet } from '../shared/rotation.ts';

/** Dependencies shared by the services; tests inject a clock and an in-memory database. */
export type SurveyContext = {
  db: DatabaseSync;
  /** Versioned four-question exhibition set for reusable complete proposals. */
  questions: QuestionSet;
  /**
   * Question rotation set (QUESTION_ROTATION_PLAN), when the configured question file is one. New proposal
   * sessions then draw from it; `questions` stays loaded for runs that already hold four-axis proposals.
   */
  rotation?: RotationSet;
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
