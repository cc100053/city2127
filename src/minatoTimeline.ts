// DEV prototype "Minato's counter closes": the 5 s action as a pure function of time (loops every 7 s: 5 s action + 2 s hold). Metres, puppet space (+Z = counter front).
export const MINATO_LOOP = 7;
const sm = (v: number) => { const c = Math.min(1, Math.max(0, v)); return c * c * (3 - 2 * c); };
const WALK_FROM = 3.3, WALK_TO = 5;
// Two legs: sideways out of the booth (toward the camera side), then away from the camera (3 m in all).
const LEG1 = { from: [0, -.35], to: [-1.3, -.35] }, LEG2 = { from: [-1.3, -.35], to: [-1.7, -2] };

export function minatoPose(time: number) {
  const t = ((time % MINATO_LOOP) + MINATO_LOOP) % MINATO_LOOP;
  const walk = Math.min(1, Math.max(0, (t - WALK_FROM) / (WALK_TO - WALK_FROM)));
  const len1 = Math.hypot(LEG1.to[0] - LEG1.from[0], LEG1.to[1] - LEG1.from[1]), len2 = Math.hypot(LEG2.to[0] - LEG2.from[0], LEG2.to[1] - LEG2.from[1]);
  const d = walk * (len1 + len2), leg2 = d > len1, u = leg2 ? (d - len1) / len2 : d / len1, [a, b] = leg2 ? [LEG2.from, LEG2.to] : [LEG1.from, LEG1.to];
  // Turns from the counter (+Z) to the exit direction in 3.0-3.3 s, then to his walking course.
  const yaw = -Math.PI / 2 * sm((t - 3) / .3) - (Math.PI / 2) * sm((d - len1 + .2) / .4);
  return {
    t,
    x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, yaw,
    gait: walk > 0 && walk < 1 ? d * 3.2 : 0, moving: walk > 0 && walk < 1,
    reach: sm((t - 1.5) / .4) * (1 - sm((t - 2.7) / .3)), // right arm up to the shutter handle and back
    tablet: sm((t - 3) / .3), // left arm lifts the tablet to reading height
    shutter: sm((t - 1.7) / 1.3), // 0 open .. 1 closed
    light: 1 - sm((t - 1.8) / 1.2), // warm counter light
    drone: (t - 1.5) / 2, // 0..1 while it crosses over; outside the range it is out of frame
  };
}
