import { CITY_AXES, SCORE_MAX, SCORE_MIN, type CityScores, type ExhibitionState, type ExhibitionVotes, type Vote } from '../shared/citySurveyState.ts';
import type { CityEffects } from '../shared/question.ts';

export const clampScore = (value: number) => Math.min(SCORE_MAX, Math.max(SCORE_MIN, value));

/** new = clamp(current + effect, -12, 12) for every axis. Effects must come from the server's question set. */
export function applyEffects(scores: CityScores, effects: CityEffects): CityScores {
  const next = { ...scores };
  for (const axis of CITY_AXES) next[axis] = clampScore(scores[axis] + (effects[axis] ?? 0));
  return next;
}

/** Actual per-axis change after clamping; axes that did not move are omitted. */
export function scoreChange(before: CityScores, after: CityScores): Partial<CityScores> {
  const change: Partial<CityScores> = {};
  for (const axis of CITY_AXES) if (after[axis] !== before[axis]) change[axis] = after[axis] - before[axis];
  return change;
}

/** One complete proposal updates each axis once; shared by live submissions and replay. */
export function applyProposalVotes(before: ExhibitionState, votes: ExhibitionVotes, updatedAt: string): ExhibitionState {
  validateExhibitionState(before);
  const nextSums = { ...before.voteSums }, nextRecent = { ...before.recentVotes };
  const scores = { ...before.scores };
  const guestCount = before.guestCount + 1;
  for (const axis of CITY_AXES) {
    const vote: unknown = votes[axis];
    if (vote !== -1 && vote !== 0 && vote !== 1) throw new TypeError(`invalid vote for ${axis}`);
    const sum = before.voteSums[axis] + vote;
    const recent = before.recentVotes[axis] * 0.75 + vote * 0.25;
    const rawScore = 6 * (sum / guestCount + recent);
    if (![sum, recent, rawScore].every(Number.isFinite)) throw new RangeError(`non-finite exhibition state for ${axis}`);
    nextSums[axis] = sum;
    nextRecent[axis] = recent;
    scores[axis] = Math.max(SCORE_MIN, Math.min(SCORE_MAX, rawScore));
  }
  const next: ExhibitionState = {
    runId: before.runId, revision: before.revision + 1, guestCount, algorithmVersion: 2,
    voteSums: nextSums, recentVotes: nextRecent, scores, updatedAt,
  };
  validateExhibitionState(next);
  return next;
}

/** Refuses corrupt replay/snapshot state instead of letting a clamp hide it. */
export function validateExhibitionState(state: ExhibitionState): void {
  if (state.algorithmVersion !== 2 || typeof state.runId !== 'string' || typeof state.updatedAt !== 'string')
    throw new RangeError('exhibition state version or identity is invalid');
  if (!Number.isSafeInteger(state.guestCount) || state.guestCount < 0 || state.revision !== state.guestCount)
    throw new RangeError('exhibition count and revision must be matching non-negative safe integers');
  for (const axis of CITY_AXES) {
    const sum = state.voteSums[axis], recent = state.recentVotes[axis], score = state.scores[axis];
    if (!Number.isFinite(sum) || !Number.isInteger(sum) || Math.abs(sum) > state.guestCount)
      throw new RangeError(`invalid vote sum for ${axis}`);
    if (!Number.isFinite(recent) || recent < -1 || recent > 1) throw new RangeError(`invalid recent vote memory for ${axis}`);
    if (!Number.isFinite(score) || score < SCORE_MIN || score > SCORE_MAX) throw new RangeError(`invalid score for ${axis}`);
    const expected = state.guestCount === 0 ? 0 : 6 * (sum / state.guestCount + recent);
    if (Math.abs(score - expected) > 1e-12) throw new RangeError(`score does not match stored vote state for ${axis}`);
    if (state.guestCount === 0 && (sum !== 0 || recent !== 0 || score !== 0))
      throw new RangeError(`initial exhibition state must be zero for ${axis}`);
  }
}

export function voteForEffects(effects: Record<string, number>): Vote {
  const entries = Object.entries(effects);
  if (entries.length !== 1) throw new TypeError('each exhibition option must vote on exactly one axis');
  const [axis, vote] = entries[0];
  if (!CITY_AXES.includes(axis as typeof CITY_AXES[number]) || (vote !== -1 && vote !== 0 && vote !== 1))
    throw new TypeError('exhibition option must have one -1, 0, or 1 vote');
  return vote as Vote;
}
