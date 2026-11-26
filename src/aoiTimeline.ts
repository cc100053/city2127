// Aoi's DEV resident beat as pure functions of beat seconds (resident-cinematic skill, rules 1–7): four fixed shots cut on
// action, pose-to-pose joint channels and the weather change. devAoi.ts maps them onto the rig, the camera and the lights.

const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
// Smoothstep: camera blends and the weather change only.
export const smooth = (u: number) => u * u * (3 - 2 * u);
// Ease-in-back: pulls the other way first (anticipation), dipping to -0.1 at k = 1.7 and -0.25 at k = 3.
export const anticipate = (u: number, k = 1.7) => u * u * ((k + 1) * u - k);
// Ease-out-back: arrives fast, passes the pose and settles back onto it.
export const overshoot = (u: number, k = 1.7) => 1 + (k + 1) * (u - 1) ** 3 + k * (u - 1) ** 2;
// Anticipate into overshoot in one stroke, continuous in value and speed: the main gesture curve.
export const swing = (u: number, k = 1.7) => u < .5 ? anticipate(2 * u, k) / 2 : (1 + overshoot(2 * u - 1, k)) / 2;
// Breathing and idle drift: a sine of beat time, so a seek shows the same frame every time.
export const breathe = (seconds: number, period: number) => Math.sin(2 * Math.PI * seconds / period);

type Curve = (u: number) => number;
const key = (seconds: number, from: number, to: number, curve: Curve = smooth) => {
  const u = (seconds - from) / (to - from);
  return u <= 0 ? 0 : u >= 1 ? 1 : curve(u);
};
// Into a pose, hold it, then back out.
export const hold = (seconds: number, rise: [number, number], fall: [number, number], into: Curve = smooth) =>
  key(seconds, ...rise, into) * (1 - key(seconds, ...fall));

// Shots (handoff shot table): entry wide, hands and face, canopy wide, payoff close on the face.
export const AOI_CUTS = [2.4, 5.7, 8.6] as const;
export const AOI_DURATION = 11;
export type AoiShotName = 'S1' | 'S2' | 'S3' | 'S4';
export const AOI_SHOTS = (['S1', 'S2', 'S3', 'S4'] as const).map((shot, i) => ({
  shot, start: [0, ...AOI_CUTS][i], end: [...AOI_CUTS, AOI_DURATION][i],
}));
// Which shot is on screen at `seconds`, and progress `u` through it (0–1, held at 1 after the end).
export function aoiShot(seconds: number): { shot: AoiShotName; u: number } {
  const { shot, start, end } = [...AOI_SHOTS].reverse().find(({ start }) => seconds >= start) ?? AOI_SHOTS[0];
  return { shot, u: clamp01((seconds - start) / (end - start)) };
}

// Seeds leave the palm on the sow's follow-through and land just before the S2→S3 cut.
export const AOI_SEED_RELEASE = 4.86;
export const AOI_SEED_LAND = 5.55;
// The caption belongs to the payoff shot only, once the cut has read.
export const AOI_CAPTION_FROM = 9;
// Overlapping action: the head leads the shoulders and arms, the torso follows them.
export const AOI_HEAD_LEAD = .08;
export const AOI_TORSO_LAG = .08;

// Joint channels at one instant. 0 is rest; lift and sow may pass 1 (overshoot) or dip below 0 (anticipation).
function act(seconds: number) {
  const putAway: [number, number] = [7.3, 8.3]; // in the canopy wide, before the payoff close-up
  const glance = hold(seconds, [2.55, 3], [3.25, 3.6], u => overshoot(u, 1));
  return {
    lift: hold(seconds, [3.55, 4.15], putAway, u => overshoot(u, 1.2)),
    sow: hold(seconds, [4.45, 5.1], putAway, u => swing(u, 3)),
    look: .7 * glance + key(seconds, 8.85, 9.65, u => overshoot(u, .8)),
  };
}

export function aoiPose(seconds: number) {
  return {
    head: act(seconds + AOI_HEAD_LEAD),
    arms: act(seconds),
    torso: act(seconds - AOI_TORSO_LAG),
    breath: breathe(seconds, 4),
    drift: breathe(seconds, 7.3),
    seeds: key(seconds, AOI_SEED_RELEASE, AOI_SEED_LAND),
    pane: key(seconds, 6, 6.45),
    beam: key(seconds, 6.25, 6.9),
    sunlight: key(seconds, 6.7, 7.2),
  };
}
export type AoiPose = ReturnType<typeof aoiPose>;
