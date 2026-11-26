const ease = (seconds: number, from: number, to: number) => {
  const u = Math.min(1, Math.max(0, (seconds - from) / (to - from)));
  return u * u * (3 - 2 * u);
};

// Seconds from the first frame to the end of the beat (caption out at 9.4 s); reels default to this length.
export const AOI_DURATION = 9.6;

export function aoiPose(seconds: number) {
  const lift = ease(seconds, 3.3, 4.65);
  const sow = ease(seconds, 4.9, 5.65);
  const rest = ease(seconds, 7.7, 9);
  return {
    push: ease(seconds, 2.8, 4.85),
    lift: lift * (1 - rest),
    sow: sow * (1 - rest),
    seeds: ease(seconds, 5.18, 5.68),
    pullback: ease(seconds, 5.68, 7.25),
    pane: ease(seconds, 7.25, 7.68),
    beam: ease(seconds, 7.48, 8.12),
    sunlight: ease(seconds, 7.91, 8.4),
  };
}
