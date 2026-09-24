import { presets, type StateName, type WorldState } from './presets.ts';
export const TRANSITION = 10, HOLD = 4;
export function createWorldState() {
  const state: WorldState = { ...presets.neutral };
  let from = { ...state }, goal: Readonly<WorldState> = presets.neutral, target: StateName = 'neutral', started = -Infinity;
  return {
    state,
    choose(name: StateName, now: number) {
      if (now < started + TRANSITION + HOLD || name === target) return false;
      from = { ...state }; goal = presets[name]; target = name; started = now;
      return true;
    },
    /** Survey mode: blend toward an arbitrary state immediately (no hold lock; a newer goal restarts from the current blend). */
    blendTo(next: Readonly<WorldState>, now: number) {
      from = { ...state }; goal = next; target = 'neutral'; started = now;
    },
    update(now: number) {
      const elapsed = now - started;
      const progress = Math.min(1, Math.max(0, elapsed / TRANSITION));
      const t = progress * progress * (3 - 2 * progress);
      for (const key of Object.keys(state) as (keyof WorldState)[]) state[key] = progress === 1 ? goal[key] : from[key] + (goal[key] - from[key]) * t;
      return { target, progress, phase: elapsed < TRANSITION ? 'transition' : elapsed < TRANSITION + HOLD ? 'hold' : 'ready', remaining: Math.max(0, TRANSITION + HOLD - elapsed), judgment: target !== 'neutral' && elapsed >= TRANSITION };
    },
  };
}
