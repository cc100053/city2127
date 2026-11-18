/**
 * Question rotation (QUESTION_ROTATION_PLAN §3, owner 2026-11-18): each guest answers four drawn
 * questions and their proposal swaps at most one site directly to the chosen option's model.
 * Pure functions only; the server folds active proposals through `rotationStep` in submission order.
 */

export type RotationOption = { id: string; label: string; modelId: string | null; lotId: string | null };
/** `online`: all three models accepted and placed, so the question may be drawn. `initial`: the option shown when a run starts. */
export type RotationQuestion = { id: string; text: string; online: boolean; initial: string; options: RotationOption[] };
/** `draft`: copy is a placeholder until RESIDENT_COPY approves the exhibition wording (plan 5.1). */
export type RotationSet = { kind: 'rotation'; version: number; draft: boolean; questions: RotationQuestion[] };

export const DRAW_COUNT = 4;
/** Below this many online questions every guest would answer nearly the same set (plan 3.1). */
export const MIN_ONLINE_QUESTIONS = 5;
/** ponytail: owner has not confirmed the small-sample threshold (plan 3.3 suggests 10). */
export const CROWD_SHARE_MIN_VOTES = 10;

/**
 * `shown`: the option each question's site displays. `changedAt`: the stamp (proposal sequence) of the
 * proposal that last swapped it, 0 for never. Stamps are monotonic and never reused, so Undo replays.
 */
export type RotationState = { shown: Record<string, string>; changedAt: Record<string, number> };
/** Per question, per option: answers in the run's active proposals (all four answers count, not only the swap). */
export type RotationTallies = Record<string, Record<string, number>>;

/** One submitted proposal: its stamp, the four questions drawn at reservation and the guest's option per question. */
export type RotationSubmission = { stamp: number; drawn: string[]; answers: Record<string, string> };
export type RotationOutcome =
  | { kind: 'swap'; questionId: string; from: string; to: string }
  /** Every drawn site already shows the guest's choice: the camera visits `questionId` (plan 3.4). */
  | { kind: 'fallback'; questionId: string };

export class RotationError extends Error {
  override name = 'RotationError';
}

export function initialRotation(set: RotationSet): RotationState {
  return {
    shown: Object.fromEntries(set.questions.map(q => [q.id, q.initial])),
    changedAt: Object.fromEntries(set.questions.map(q => [q.id, 0])),
  };
}

/** Least recently changed first; ties by the set's fixed question order (Q01, Q02…). */
function byStaleness(set: RotationSet, state: RotationState) {
  const order = new Map(set.questions.map((q, i) => [q.id, i]));
  return (a: string, b: string) => (state.changedAt[a] ?? 0) - (state.changedAt[b] ?? 0) || order.get(a)! - order.get(b)!;
}

/** The four questions a guest reserves now. Stations do not exclude each other's draws (plan 3.1 point 5). */
export function drawQuestions(set: RotationSet, state: RotationState): string[] {
  const online = set.questions.filter(q => q.online).map(q => q.id);
  if (online.length < MIN_ONLINE_QUESTIONS)
    throw new RotationError(`rotation needs at least ${MIN_ONLINE_QUESTIONS} online questions, has ${online.length}`);
  return online.sort(byStaleness(set, state)).slice(0, DRAW_COUNT);
}

function validate(set: RotationSet, submission: RotationSubmission): void {
  const { drawn, answers } = submission;
  if (new Set(drawn).size !== drawn.length || drawn.length !== DRAW_COUNT) throw new RotationError(`a proposal must draw ${DRAW_COUNT} distinct questions`);
  const keys = Object.keys(answers);
  if (keys.length !== drawn.length || !drawn.every(id => Object.hasOwn(answers, id))) throw new RotationError('answers must cover exactly the drawn questions');
  for (const id of drawn) {
    const question = set.questions.find(q => q.id === id);
    if (!question) throw new RotationError(`unknown rotation question "${id}"`);
    if (!question.options.some(o => o.id === answers[id])) throw new RotationError(`question "${id}" has no option "${answers[id]}"`);
  }
}

/**
 * Plan 3.2: among drawn questions whose site shows another option, swap the least recently changed one
 * to the guest's choice. Judged against `state` at submission time, which already holds any earlier
 * station's swap. A site another proposal changed after this guest's reservation carries a newer stamp
 * than every site left untouched since, so stalest-first already prefers untouched sites (plan 3.2 point 3)
 * and falls back to a touched one only when nothing else differs; no reservation marker is needed.
 */
export function rotationStep(set: RotationSet, state: RotationState, submission: RotationSubmission): { state: RotationState; outcome: RotationOutcome } {
  validate(set, submission);
  const { drawn, answers, stamp } = submission;
  const ordered = [...drawn].sort(byStaleness(set, state));
  const candidates = ordered.filter(id => state.shown[id] !== answers[id]);
  if (candidates.length === 0) return { state, outcome: { kind: 'fallback', questionId: ordered[0] } };
  const questionId = candidates[0];
  const from = state.shown[questionId], to = answers[questionId];
  return {
    state: { shown: { ...state.shown, [questionId]: to }, changedAt: { ...state.changedAt, [questionId]: stamp } },
    outcome: { kind: 'swap', questionId, from, to },
  };
}

export function emptyTallies(set: RotationSet): RotationTallies {
  return Object.fromEntries(set.questions.map(q => [q.id, Object.fromEntries(q.options.map(o => [o.id, 0]))]));
}

export function addTallies(tallies: RotationTallies, answers: Record<string, string>): RotationTallies {
  const next = { ...tallies };
  for (const [questionId, optionId] of Object.entries(answers))
    next[questionId] = { ...next[questionId], [optionId]: (next[questionId]?.[optionId] ?? 0) + 1 };
  return next;
}

/** `percent` is omitted below the small-sample threshold so early guests never see 100 % / 50 % (plan 3.3). */
export type CrowdShare = { questionId: string; optionId: string; votes: number; total: number; percent?: number };

export function crowdShare(tallies: RotationTallies, questionId: string, optionId: string, minVotes = CROWD_SHARE_MIN_VOTES): CrowdShare {
  const counts = tallies[questionId] ?? {};
  const votes = counts[optionId] ?? 0;
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { questionId, optionId, votes, total, ...(total >= minVotes && total > 0 ? { percent: Math.round(100 * votes / total) } : {}) };
}

export type RotationFold = { state: RotationState; tallies: RotationTallies; outcomes: RotationOutcome[] };

/** Rebuilds the city from the run's active proposals in stamp order; Undo, snapshot and reconnect all call this. */
export function foldRotation(set: RotationSet, submissions: Iterable<RotationSubmission>): RotationFold {
  let state = initialRotation(set), tallies = emptyTallies(set), last = 0;
  const outcomes: RotationOutcome[] = [];
  for (const submission of submissions) {
    if (submission.stamp <= last) throw new RotationError('rotation submissions must be folded in increasing stamp order');
    last = submission.stamp;
    const step = rotationStep(set, state, submission);
    state = step.state;
    tallies = addTallies(tallies, submission.answers);
    outcomes.push(step.outcome);
  }
  return { state, tallies, outcomes };
}
