import { presets, type StateName, type WorldState } from './presets.ts';

/** One full city day, in real seconds. */
export const DAY_SECONDS = 180;
/** The clock starts at midday so the first frame is the shared daylight city. */
export const START_HOUR = 12;

// The three former presets are now moments of one day: a calm dawn, a shared midday and an awake night.
const MOODS: [number, StateName][] = [[2, 'pulse'], [5.5, 'still'], [9, 'still'], [11.5, 'neutral'], [17, 'neutral'], [21, 'pulse']];

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const hourAt = (seconds: number) => ((START_HOUR + seconds / DAY_SECONDS * 24) % 24 + 24) % 24;

/** Sun height as the sine of its arc: 0 at 6:00 and 18:00, 1 at noon, negative at night. */
export const sunHeight = (hour: number) => Math.sin(Math.PI * (hour - 6) / 12);

/** 1 in full daylight, 0 at night, soft through dawn and dusk. */
export const daylight = (hour: number) => smooth(-.12, .2, sunHeight(hour));

/** City state for an hour, blended between the neighbouring moods (wraps at midnight). */
export function moodAt(hour: number): WorldState {
  let i = MOODS.length - 1;
  for (let k = 0; k < MOODS.length; k++) if (MOODS[k][0] <= hour) i = k;
  const [h0, a] = MOODS[i], [next, b] = MOODS[(i + 1) % MOODS.length];
  const h1 = next <= h0 ? next + 24 : next, t = smooth(h0, h1, hour < h0 ? hour + 24 : hour);
  const state = { ...presets[a] };
  for (const key of Object.keys(state) as (keyof WorldState)[]) state[key] += (presets[b][key] - state[key]) * t;
  state.timeOfDay = hour;
  return state;
}

/** Lights come on as daylight fades; survey mode keeps its own state and still gets night windows, lamps and signs. */
export const withNight = (s: WorldState, night: number): WorldState => ({
  ...s,
  windowLife: s.windowLife + (1 - s.windowLife) * night * .8,
  neon: s.neon + (1 - s.neon) * night * .6,
  signage: s.signage + (1 - s.signage) * night * .5,
});
