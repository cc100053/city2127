const ease = (seconds: number, from: number, to: number) => {
  const u = Math.min(1, Math.max(0, (seconds - from) / (to - from)));
  return u * u * (3 - 2 * u);
};

export function aoiPose(seconds: number) {
  const lift = ease(seconds, 3.3, 4.65);
  const sow = ease(seconds, 4.9, 5.65);
  const rest = ease(seconds, 7.7, 9);
  return {
    push: ease(seconds, 2.8, 4.85),
    lift: lift * (1 - rest),
    sow: sow * (1 - rest),
    seeds: ease(seconds, 5.18, 5.68),
    pane: ease(seconds, 5.68, 6.45),
    mist: ease(seconds, 6.1, 7.5),
  };
}
