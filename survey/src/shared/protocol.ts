import type { CityScores, CitySurveyState, ExhibitionState, ExhibitionVotes } from './citySurveyState.ts';
import type { CityView, ProposalRecord } from './cityView.ts';
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
  | 'unsupported_version'
  | 'no_question_available' | 'session_not_found' | 'session_expired' | 'already_answered'
  | 'unknown_question' | 'unknown_option' | 'option_question_mismatch' | 'question_not_assigned'
  | 'revision_conflict' | 'answer_conflict' | 'reset_confirmation_invalid'
  | 'lifecycle_conflict' | 'lifecycle_blocked';

export type ApiError = { code: ErrorCode; message: string };
/** Every JSON response. Conflicts that the client can recover from carry the latest state. */
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError; state?: CitySurveyState | ExhibitionState };

export type GuestQuestionData = { session: GuestSession; question: PublicQuestion; state: CitySurveyState };
export type AnswerData = { event: AnswerEvent; state: CitySurveyState; replayed: boolean };
export type HealthData = { status: 'ok'; runId: string; revision: number; questionVersion: number };

export type ProposalSessionStatus = 'reserved' | 'submitted' | 'expired';
export type ProposalSession = {
  id: string;
  runId: string;
  questionSetVersion: number;
  questionIds: string[];
  status: ProposalSessionStatus;
  createdAt: string;
  expiresAt: string;
  submittedAt: string | null;
};
export type ProposalSessionData = { session: ProposalSession; questions: PublicQuestion[]; state: ExhibitionState };
export type ProposalRequest = {
  submissionId: string;
  guestSessionId: string;
  expectedRevision: number;
  answers: { questionId: string; optionId: string }[];
};
export type ProposalData = { proposal: ProposalRecord; state: ExhibitionState; replayed: boolean };

export type RunSummary = { id: string; status: 'active' | 'ended'; algorithmVersion: 1 | 2; startedAt: string; endedAt: string | null };
/**
 * Installation lifecycle, persisted server-side. Finishing the questionnaire moves `in_experience` to
 * `awaiting_exit` while the result is displayed. Starting the next questionnaire automatically ends
 * that experience and applies any `pendingReset` (`full` supersedes `city`); `ready` holds none.
 */
export type LifecyclePhase = 'ready' | 'in_experience' | 'awaiting_exit';
export type PendingReset = 'none' | 'city' | 'full';
export type LifecycleStatus = {
  revision: number;
  phase: LifecyclePhase;
  pendingReset: PendingReset;
  /** Completed proposals since the last full data reset; city resets keep it. */
  totalGuestCount: number;
  updatedAt: string;
};
export type LifecycleCommand = 'reset-city' | 'full-reset' | 'cancel-reset' | 'guest-left';
/** `confirmation` is required for reset-city (`RESET`) and full-reset (`FULL RESET`). */
export type LifecycleRequest = { command: LifecycleCommand; expectedRevision: number; confirmation?: string };
export type LifecycleData = {
  lifecycle: LifecycleStatus;
  state: CitySurveyState | ExhibitionState;
  /** The reset performed by this command, or null when nothing was reset (queued, cancelled, plain exit). */
  executedReset: 'city' | 'full' | null;
  previousRunId: string | null;
};

export type DisplayMode = 'auto' | 'day' | 'night';

export type AdminCurrentRun = {
  displayMode: DisplayMode;
  run: RunSummary;
  lifecycle: LifecycleStatus;
  state: CitySurveyState | ExhibitionState;
  questionVersion: number;
  totalQuestions: number;
  reservedSessions: number;
  answeredSessions: number;
};
export type AdminEvent = { id: number; type: 'run-reset'; runId: string; detail: { nextRunId: string; scope: 'city' | 'full' }; createdAt: string };
export type AdminEventsData = { answers: AnswerEvent[]; proposals: ProposalRecord[]; admin: AdminEvent[] };

/** What one answer actually changed after clamping. */
export type AppliedChange = { scores: Partial<CityScores> };

export type ServerEvent =
  | { type: 'city-state-snapshot'; displayMode?: DisplayMode; state: CitySurveyState | ExhibitionState; view: CityView }
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
  | {
      type: 'city-state-updated';
      submissionId: string;
      state: ExhibitionState;
      proposal: ProposalRecord;
      view: CityView;
    }
  | { type: 'run-reset'; previousRunId: string; state: CitySurveyState | ExhibitionState; view: CityView };
