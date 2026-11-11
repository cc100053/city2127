// DEV prototype "Minato's counter closes": the action as a pure function of time (7 s of action + 2 s hold, looping). Metres, puppet space (+Z = counter front, +X = right of the opening).
export const MINATO_LOOP = 9;
const sm = (v: number) => { const c = Math.min(1, Math.max(0, v)); return c * c * (3 - 2 * c); };
/** Smoothstep between [time, value] keys; holds the first and last value. */
const key = (keys: readonly (readonly [number, number])[], t: number) => {
  let i = keys.findIndex(k => k[0] > t);
  if (i < 0) return keys[keys.length - 1][1];
  if (i === 0) return keys[0][1];
  const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
  return v0 + (v1 - v0) * sm((t - t0) / (t1 - t0));
};
// Path keys [t, x, z]: inside the booth, out to the side then to the front of the opening (1.5-2.5 s), three steps away (4-5.2 s), a few more after the look back (6.5-7.2 s).
const PATH = [[0, 0, -.35], [1.5, 0, -.35], [2, -1.25, -.35], [2.5, -1.25, .7], [4, -1.25, .7], [5.2, -1.05, -1.4], [6.5, -1.05, -1.4], [7.2, -1.1, -2.4]] as const;
const DIST = PATH.reduce<number[]>((acc, p, i) => [...acc, i ? acc[i - 1] + Math.hypot(p[1] - PATH[i - 1][1], p[2] - PATH[i - 1][2]) : 0], []);
const YAW = [[0, 0], [1.5, 0], [1.7, -1.57], [2, -1.57], [2.4, .6], [4, .6], [4.4, -2.8], [9, -2.8]] as const; // faces the shutter while pulling, away while walking
const LOOK = [[0, 0], [5.2, 0], [5.8, -1.5], [6.5, -1.5], [6.9, 0]] as const; // upper body twists back toward the booth (the head follows further)

export function minatoPose(time: number) {
  const t = ((time % MINATO_LOOP) + MINATO_LOOP) % MINATO_LOOP;
  const next = PATH.findIndex(p => p[0] > t), i = next < 0 ? PATH.length - 1 : Math.max(1, next); // after the last key the final segment holds at u = 1
  const [t0, x0, z0] = PATH[i - 1], [t1, x1, z1] = PATH[i], u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return {
    t,
    x: x0 + (x1 - x0) * u, z: z0 + (z1 - z0) * u, yaw: key(YAW, t), look: key(LOOK, t),
    gait: (DIST[i - 1] + (DIST[i] - DIST[i - 1]) * u) * 3.2, moving: u > 0 && u < 1 && (x0 !== x1 || z0 !== z1),
    reach: sm((t - 2.6) / .4) * (1 - sm((t - 3.6) / .4)), // right arm up to the shutter and back
    tablet: sm((t - 4) / .3), // left arm lifts the tablet to reading height
    shutter: sm((t - 2.7) / 1.2), // 0 open .. 1 closed
    light: 1 - sm((t - 2.8) / 1), // warm counter light
    drone: (t - 2.2) / 2, // 0..1 while it crosses over (centre at 3.2 s)
  };
}
