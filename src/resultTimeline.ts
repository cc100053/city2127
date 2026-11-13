import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';
import { ARRIVAL_SECONDS } from './voteJourney.ts';

export const FLY_IN = 2, SETTLE = .5, FLY_OUT = 2;
/** `transition`: the building animation's length (3 s; the SW shelf sequence is longer, see `headlineTransitionSeconds`). */
export const shotTimeline = (displayMs = DISPLAY_MS, transition = SITE_TRANSITION_SECONDS) => {
  const hold = ARRIVAL_SECONDS + FLY_IN, change = hold + SETTLE;
  return { flyIn: ARRIVAL_SECONDS, hold, change, changeEnd: change + transition,
    flyOut: displayMs / 1000, done: displayMs / 1000 + FLY_OUT };
};

export const reasonDelayMs = (displayMs: number, reducedMotion: boolean, transition = SITE_TRANSITION_SECONDS) =>
  reducedMotion || displayMs < DISPLAY_MS - 100 ? 0 : shotTimeline(displayMs, transition).changeEnd * 1000;
