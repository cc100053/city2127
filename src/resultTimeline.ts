import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';
import { ARRIVAL_SECONDS } from './voteJourney.ts';

export const FLY_IN = 2, SETTLE = .5, FLY_OUT = 2;
export const shotTimeline = (displayMs = DISPLAY_MS) => {
  const hold = ARRIVAL_SECONDS + FLY_IN, change = hold + SETTLE;
  return { flyIn: ARRIVAL_SECONDS, hold, change, changeEnd: change + SITE_TRANSITION_SECONDS,
    flyOut: displayMs / 1000, done: displayMs / 1000 + FLY_OUT };
};

export const reasonDelayMs = (displayMs: number, reducedMotion: boolean) =>
  reducedMotion || displayMs < DISPLAY_MS - 100 ? 0 : shotTimeline(displayMs).changeEnd * 1000;
