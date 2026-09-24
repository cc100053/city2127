import type { DatabaseSync } from 'node:sqlite';
import type { CitySurveyState } from '../shared/citySurveyState.ts';
import type { ApiError, ApiResponse, ErrorCode, ServerEvent } from '../shared/protocol.ts';
import type { QuestionSet } from '../shared/question.ts';

/** Dependencies shared by the services; tests inject a clock and an in-memory database. */
export type SurveyContext = {
  db: DatabaseSync;
  questions: QuestionSet;
  now: () => Date;
  newId: () => string;
  reservationMs: number;
};

/** A service outcome plus the realtime event to publish after the transaction has committed. */
export type ServiceOutcome<T> = { response: ApiResponse<T>; event?: ServerEvent };

export function fail(code: ErrorCode, message: string, state?: CitySurveyState): { ok: false; error: ApiError; state?: CitySurveyState } {
  return state ? { ok: false, error: { code, message }, state } : { ok: false, error: { code, message } };
}
