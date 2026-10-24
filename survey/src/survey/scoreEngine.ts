import { CITY_AXES, SCORE_MAX, SCORE_MIN, type CityScores, type ExhibitionState, type ExhibitionVotes, type Vote } from '../shared/citySurveyState.ts';
import { emptyEnergyCounts, isEnergyChoice, isEnergyState } from '../shared/energy.ts';
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

/** Updates three active Meters plus energy (or four legacy Meters); shared by live and replay. */
export function applyProposalVotes(before: ExhibitionState, votes: ExhibitionVotes, updatedAt: string): ExhibitionState {
  validateExhibitionState(before);
  if (votes.energy !== undefined && (!isEnergyChoice(votes.energy) || votes.environmentalPriority !== 0))
    throw new TypeError('energy proposals must abstain from climate');
  const energy = before.energy || votes.energy ? {
    climateGuestCount: before.energy?.climateGuestCount ?? before.guestCount,
    counts: { ...(before.energy?.counts ?? emptyEnergyCounts()) },
  } : undefined;
  if (energy) {
    if (votes.energy) energy.counts[votes.energy]++;
    else energy.climateGuestCount++;
  }
  const nextSums = { ...before.voteSums }, nextRecent = { ...before.recentVotes };
  const scores = { ...before.scores };
  const guestCount = before.guestCount + 1;
  for (const axis of CITY_AXES) {
    const vote: unknown = votes[axis];
    if (vote !== -1 && vote !== 0 && vote !== 1) throw new TypeError(`invalid vote for ${axis}`);
    if (axis === 'environmentalPriority' && votes.energy) continue;
    const sum = before.voteSums[axis] + vote;
    const recent = before.recentVotes[axis] * 0.75 + vote * 0.25;
    const rawScore = 6 * (sum / (axis === 'environmentalPriority' ? energy?.climateGuestCount ?? guestCount : guestCount) + recent);
    if (![sum, recent, rawScore].every(Number.isFinite)) throw new RangeError(`non-finite exhibition state for ${axis}`);
    nextSums[axis] = sum;
    nextRecent[axis] = recent;
    scores[axis] = Math.max(SCORE_MIN, Math.min(SCORE_MAX, rawScore));
  }
  const next: ExhibitionState = {
    runId: before.runId, revision: before.revision + 1, guestCount, algorithmVersion: 2,
    voteSums: nextSums, recentVotes: nextRecent, scores, updatedAt, ...(energy ? { energy } : {}),
  };
  validateExhibitionState(next);
  return next;
}

/** Folds one proposal into the per-axis slot seeds in place; neutral votes leave a seed unchanged. */
export function foldSlotSeeds(seeds: CityScores, votes: ExhibitionVotes): CityScores {
  for (const axis of CITY_AXES) if (votes[axis] !== 0) seeds[axis] = Math.imul(seeds[axis] ^ (votes[axis] + 2), 16777619) >>> 0;
  return seeds;
}

/** Refuses corrupt replay/snapshot state instead of letting a clamp hide it. */
export function validateExhibitionState(state: ExhibitionState): void {
  if (state.algorithmVersion !== 2 || typeof state.runId !== 'string' || typeof state.updatedAt !== 'string')
    throw new RangeError('exhibition state version or identity is invalid');
  if (!Number.isSafeInteger(state.guestCount) || state.guestCount < 0 || state.revision !== state.guestCount)
    throw new RangeError('exhibition count and revision must be matching non-negative safe integers');
  if (state.energy !== undefined && !isEnergyState(state.energy, state.guestCount)) throw new RangeError('invalid energy history');
  for (const axis of CITY_AXES) {
    const count = axis === 'environmentalPriority' ? state.energy?.climateGuestCount ?? state.guestCount : state.guestCount;
    const sum = state.voteSums[axis], recent = state.recentVotes[axis], score = state.scores[axis];
    if (!Number.isFinite(sum) || !Number.isInteger(sum) || Math.abs(sum) > count)
      throw new RangeError(`invalid vote sum for ${axis}`);
    if (!Number.isFinite(recent) || recent < -1 || recent > 1) throw new RangeError(`invalid recent vote memory for ${axis}`);
    if (!Number.isFinite(score) || score < SCORE_MIN || score > SCORE_MAX) throw new RangeError(`invalid score for ${axis}`);
    const expected = count === 0 ? 0 : 6 * (sum / count + recent);
    if (Math.abs(score - expected) > 1e-12) throw new RangeError(`score does not match stored vote state for ${axis}`);
    if (count === 0 && (sum !== 0 || recent !== 0 || score !== 0))
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
