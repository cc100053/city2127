import type { CityScores, CitySurveyState } from './citySurveyState.ts';
import type { CityView } from './cityView.ts';
import type { CityEffects, PublicQuestion } from './question.ts';

export type GuestSessionStatus = 'reserved' | 'answered' | 'expired';
export type GuestSession = {
  id: string;
  runId: string;
  questionId: string;
  status: GuestSessionStatus;
  createdAt: string;
  expiresAt: string;
  answeredAt: string | null;
};

export type AnswerEvent = {
  id: string;
  sequence: number;
  runId: string;
  guestSessionId: string;
  questionId: string;
  optionId: string;
  questionVersion: number;
  /** Effects as stored at answer time. Runs ended by the schema 2 migration hold legacy axis names. */
  effects: CityEffects | Record<string, number>;
  revisionBefore: number;
  revisionAfter: number;
  answeredAt: string;
};

/** The only answer fields a client may send; vectors always come from the server's question set. */
export type AnswerRequest = {
  answerId: string;
  guestSessionId: string;
  questionId: string;
  optionId: string;
  expectedRevision: number;
};

export type ErrorCode =
  | 'bad_request' | 'not_found' | 'forbidden' | 'internal_error'
  | 'no_question_available' | 'session_not_found' | 'session_expired' | 'already_answered'
  | 'unknown_question' | 'unknown_option' | 'option_question_mismatch' | 'question_not_assigned'
  | 'revision_conflict' | 'answer_conflict' | 'reset_confirmation_invalid';

export type ApiError = { code: ErrorCode; message: string };
/** Every JSON response. Conflicts that the client can recover from carry the latest state. */
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError; state?: CitySurveyState };

export type GuestQuestionData = { session: GuestSession; question: PublicQuestion; state: CitySurveyState };
export type AnswerData = { event: AnswerEvent; state: CitySurveyState; replayed: boolean };
export type HealthData = { status: 'ok'; runId: string; revision: number; questionVersion: number };

export type RunSummary = { id: string; status: 'active' | 'ended'; startedAt: string; endedAt: string | null };
export type AdminCurrentRun = {
  run: RunSummary;
  state: CitySurveyState;
  questionVersion: number;
  totalQuestions: number;
  reservedSessions: number;
  answeredSessions: number;
};
export type AdminEvent = { id: number; type: 'run-reset'; runId: string; detail: { nextRunId: string }; createdAt: string };
export type AdminEventsData = { answers: AnswerEvent[]; admin: AdminEvent[] };
export type ResetRequest = { confirmation: string };
export type ResetData = { previousRunId: string; state: CitySurveyState };

/** What one answer actually changed after clamping. */
export type AppliedChange = { scores: Partial<CityScores> };

export type ServerEvent =
  | { type: 'city-state-snapshot'; state: CitySurveyState; view: CityView }
  | {
      type: 'city-state-updated';
      answerId: string;
      state: CitySurveyState;
      answer: AnswerEvent;
      questionText: string;
      optionLabel: string;
      change: AppliedChange;
      view: CityView;
    }
  | { type: 'run-reset'; previousRunId: string; state: CitySurveyState; view: CityView };
