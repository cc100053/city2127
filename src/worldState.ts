import { presets, type WorldState } from './presets.ts';
export const TRANSITION = 10;
export function createWorldState() {
  const state: WorldState = { ...presets.neutral };
  let from = { ...state }, goal: Readonly<WorldState> = presets.neutral, started = -Infinity;
  return {
    state,
    /** Survey mode: blend toward a new state over TRANSITION seconds; a newer goal restarts from the current blend. */
    blendTo(next: Readonly<WorldState>, now: number) {
      from = { ...state }; goal = next; started = now;
    },
    update(now: number) {
      const progress = Math.min(1, Math.max(0, (now - started) / TRANSITION));
      const t = progress * progress * (3 - 2 * progress);
      for (const key of Object.keys(state) as (keyof WorldState)[]) state[key] = progress === 1 ? goal[key] : from[key] + (goal[key] - from[key]) * t;
    },
  };
}
