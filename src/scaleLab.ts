// DEV Scale Lab logic: replays a seeded guest sequence through the server reducer and the authoritative Scale A layout.
import { CITY_AXES, initialExhibitionState, type CityAxis, type CityScores, type ExhibitionState, type ExhibitionVotes, type Vote } from '../survey/src/shared/citySurveyState.ts';
import { exhibitionBand, exhibitionDisplayScores, exhibitionStateLayout, type Band, type ExhibitionLayout } from '../survey/src/shared/cityView.ts';
import { applyProposalVotes, foldSlotSeeds } from '../survey/src/survey/scoreEngine.ts';

export type VoteProfile = 'balanced' | 'leaning' | 'strong' | 'groups';
export const PROFILE_LABELS: Record<VoteProfile, string> = { balanced: '平均（三選項各⅓）', leaning: '有傾向（50% 一邊）', strong: '強傾向（60% 一邊）', groups: '團體（每 5 人同答）' };
/** Lean direction per axis, so a leaning crowd does not push every Meter the same way. */
const LEAN: Record<CityAxis, Vote> = { automation: 1, publicSharing: -1, environmentalPriority: 1, urbanConcentration: 1 };

/** mulberry32: a small seeded PRNG so a sequence can be replayed exactly. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const pick = (r: number, against: number, neutral: number, lean: Vote): Vote => (r < against ? -lean : r < against + neutral ? 0 : lean) as Vote;

export function simulateVotes(profile: VoteProfile, guests: number, seed: number): ExhibitionVotes[] {
  const next = random(seed), votes: ExhibitionVotes[] = [];
  const odds = profile === 'leaning' ? [.2, .3] : profile === 'strong' ? [.15, .25] : [1 / 3, 1 / 3];
  for (let i = 0; i < guests; i++) {
    if (profile === 'groups' && i % 5) { votes.push({ ...votes[i - 1] }); continue; }
    votes.push(Object.fromEntries(CITY_AXES.map(axis => [axis, pick(next(), odds[0], odds[1], profile === 'leaning' || profile === 'strong' ? LEAN[axis] : 1)])) as Record<CityAxis, Vote>);
  }
  return votes;
}

export type LabStep = { state: ExhibitionState; slotSeeds: CityScores; votes?: ExhibitionVotes };

/** Step 0 is the fresh run; step n is the city after guest #n, through the same reducer and seed fold as the server. */
export function replay(votes: ExhibitionVotes[]): LabStep[] {
  let state = initialExhibitionState('scale-lab', new Date(0).toISOString());
  const seeds = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
  const steps: LabStep[] = [{ state, slotSeeds: { ...seeds } }];
  for (const vote of votes) {
    state = applyProposalVotes(state, vote, state.updatedAt);
    steps.push({ state, slotSeeds: { ...foldSlotSeeds(seeds, vote) }, votes: vote });
  }
  return steps;
}

/** The Scale A display score the layout reads for one axis at one step. */
export const displayScore = (step: LabStep, axis: CityAxis) => exhibitionDisplayScores(step.state.scores, step.state.guestCount)[axis];
/** Exactly the server layout for the step. */
export const labLayout = (step: LabStep): ExhibitionLayout => exhibitionStateLayout(step.state.scores, step.state.guestCount);

export type ScaleStats = { bands: Record<CityAxis, Record<Band, number>>; flips: number; portValues: number };

/** Band share per axis (after the first ten guests, as in the planning simulation), total band flips and distinct port counts. */
export function scaleStats(steps: LabStep[]): ScaleStats {
  const bands = Object.fromEntries(CITY_AXES.map(axis => [axis, { low: 0, mixed: 0, high: 0 }])) as ScaleStats['bands'];
  const ports = new Set<number>();
  let flips = 0, counted = 0;
  steps.forEach((step, i) => {
    ports.add(labLayout(step).automatedPorts);
    if (i === 0) return;
    for (const axis of CITY_AXES) {
      const band = exhibitionBand(displayScore(step, axis));
      if (band !== exhibitionBand(displayScore(steps[i - 1], axis))) flips++;
      if (i > 10) bands[axis][band]++;
    }
    if (i > 10) counted++;
  });
  for (const axis of CITY_AXES) for (const band of ['low', 'mixed', 'high'] as const) bands[axis][band] = counted ? bands[axis][band] / counted : 0;
  return { bands, flips, portValues: ports.size };
}
