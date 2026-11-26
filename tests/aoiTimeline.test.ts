import assert from './assert.ts';
import {
  AOI_CAPTION_FROM, AOI_CUTS, AOI_DURATION, AOI_HEAD_LEAD, AOI_SEED_LAND, AOI_SEED_RELEASE, AOI_TORSO_LAG,
  anticipate, aoiPose, aoiShot, breathe, hold, overshoot, swing,
} from '../src/aoiTimeline.ts';

const STEP = 100; // samples per second
const times = Array.from({ length: Math.round(AOI_DURATION * STEP) + 1 }, (_, i) => i / STEP);
const at = (seconds: number) => Math.round(seconds * STEP) / STEP;

// Easing helpers: endpoints, anticipation below 0, overshoot above 1, continuity of the joined swing.
assert.ok(anticipate(0) === 0);
assert.ok(Math.abs(anticipate(1) - 1) < 1e-12);
assert.ok(Math.min(...times.map(t => anticipate(t / AOI_DURATION, 3))) < -.2);
assert.equal(overshoot(1), 1);
assert.ok(Math.abs(overshoot(0)) < 1e-12);
assert.ok(Math.max(...times.map(t => overshoot(t / AOI_DURATION))) > 1.05);
assert.ok(Math.abs(swing(.5 - 1e-9) - swing(.5)) < 1e-6);
assert.equal(hold(1, [0, 1], [2, 3]), 1);
assert.equal(hold(3, [0, 1], [2, 3]), 0);
assert.equal(breathe(0, 4), 0);
assert.ok(Math.abs(breathe(1, 4) - 1) < 1e-12);

// Shots: S1→S4 in order, cutting at 2.4, 5.7 and 8.6 s, u running 0→1 inside each shot.
assert.deepEqual([...AOI_CUTS], [2.4, 5.7, 8.6]);
assert.equal(AOI_DURATION, 11);
assert.deepEqual(aoiShot(-1), { shot: 'S1', u: 0 });
assert.deepEqual(aoiShot(0), { shot: 'S1', u: 0 });
assert.equal(aoiShot(2.39).shot, 'S1');
assert.deepEqual(aoiShot(2.4), { shot: 'S2', u: 0 });
assert.equal(aoiShot(5.69).shot, 'S2');
assert.deepEqual(aoiShot(5.7), { shot: 'S3', u: 0 });
assert.equal(aoiShot(8.59).shot, 'S3');
assert.deepEqual(aoiShot(8.6), { shot: 'S4', u: 0 });
assert.deepEqual(aoiShot(AOI_DURATION), { shot: 'S4', u: 1 });
assert.deepEqual(aoiShot(20), { shot: 'S4', u: 1 });
const order = times.map(t => aoiShot(t).shot).filter((shot, i, all) => shot !== all[i - 1]);
assert.deepEqual(order, ['S1', 'S2', 'S3', 'S4']);
times.slice(1).forEach((t, i) => {
  const before = aoiShot(times[i]), after = aoiShot(t);
  if (before.shot === after.shot) assert.ok(after.u > before.u && after.u - before.u < .01, `shot u jumps at ${t}`);
});

// Flatten a pose into named numbers.
const flat = (pose: ReturnType<typeof aoiPose>) => Object.entries(pose).flatMap(([name, value]) =>
  typeof value === 'number' ? [[name, value] as const] : Object.entries(value).map(([joint, v]) => [`${name}.${joint}`, v] as const));

// Continuity: no channel jumps, inside a shot or across a cut (cuts move the camera, never the body).
times.slice(1).forEach((t, i) => {
  const before = flat(aoiPose(times[i])), after = flat(aoiPose(t));
  after.forEach(([name, value], j) => assert.ok(Math.abs(value - before[j][1]) < .12, `${name} jumps at ${t}`));
});

// Start and end poses (breath and drift are their own sine channels and are left out).
const still = (seconds: number) => Object.fromEntries(flat(aoiPose(seconds)).filter(([name]) => name !== 'breath' && name !== 'drift'));
const rest = { lift: 0, sow: 0, look: 0 };
assert.deepEqual(still(0), Object.fromEntries(flat({ ...aoiPose(0), head: rest, arms: rest, torso: rest, seeds: 0, pane: 0, beam: 0, sunlight: 0 })
  .filter(([name]) => name !== 'breath' && name !== 'drift')));
const up = { lift: 0, sow: 0, look: 1 };
const end = Object.fromEntries(flat({ ...aoiPose(AOI_DURATION), head: up, arms: up, torso: up, seeds: 1, pane: 1, beam: 1, sunlight: 1 })
  .filter(([name]) => name !== 'breath' && name !== 'drift'));
assert.deepEqual(still(AOI_DURATION), end);
assert.deepEqual(still(20), end);

// Never fully still: breathing moves every on-screen second.
for (let s = 0; s < AOI_DURATION; s += 1) assert.ok(Math.abs(aoiPose(s + .5).breath - aoiPose(s).breath) > .1);

// S2: the glance up at the canopy, the lift, anticipation before the sow, then the open palm held to the cut.
const s2 = times.filter(t => aoiShot(t).shot === 'S2');
assert.ok(Math.max(...s2.map(t => aoiPose(t).head.look)) > .6, 'glance at the canopy in S2');
assert.ok(Math.min(...s2.map(t => aoiPose(t).arms.sow)) < -.1, 'the sow winds back first');
assert.ok(Math.max(...s2.map(t => aoiPose(t).arms.sow)) > 1.05, 'the sow overshoots');
const held = s2.filter(t => aoiPose(t).arms.sow === 1 && aoiPose(t).arms.lift === 1);
assert.ok(held.length && held.at(-1)! - held[0] >= .4 && held.at(-1) === at(AOI_CUTS[1] - 1 / STEP), 'palm held open ≥ 0.4 s up to the cut');
assert.ok(held.every((t, i) => i === 0 || at(t - held[i - 1]) === 1 / STEP), 'the hold is unbroken');

// Seeds leave during the sow and land just before the S2→S3 cut.
assert.equal(aoiPose(AOI_SEED_RELEASE).seeds, 0);
assert.ok(aoiPose(AOI_SEED_RELEASE).arms.sow > .5);
assert.equal(aoiShot(AOI_SEED_LAND).shot, 'S2');
assert.equal(aoiPose(AOI_SEED_LAND).seeds, 1);
assert.ok(AOI_CUTS[1] - AOI_SEED_LAND <= .2);

// Overlapping action: head leads the arms, torso follows, 0.05–0.1 s apart.
assert.ok(AOI_HEAD_LEAD >= .05 && AOI_HEAD_LEAD <= .1 && AOI_TORSO_LAG >= .05 && AOI_TORSO_LAG <= .1);
assert.deepEqual(aoiPose(4.6).head, aoiPose(4.6 + AOI_HEAD_LEAD).arms);
assert.deepEqual(aoiPose(4.6).torso, aoiPose(4.6 - AOI_TORSO_LAG).arms);

// The weather change happens in S3, monotone and inside [0, 1]; the caption waits for S4.
for (const channel of ['seeds', 'pane', 'beam', 'sunlight'] as const) {
  times.forEach((t, i) => {
    const value = aoiPose(t)[channel];
    assert.ok(value >= 0 && value <= 1 && (i === 0 || value >= aoiPose(times[i - 1])[channel]), `${channel} at ${t}`);
  });
}
for (const channel of ['pane', 'beam', 'sunlight'] as const) {
  assert.equal(aoiPose(AOI_CUTS[1])[channel], 0);
  assert.equal(aoiPose(AOI_CUTS[2])[channel], 1);
}
assert.equal(aoiShot(AOI_CAPTION_FROM).shot, 'S4');
// S4: Aoi looks up into the light.
assert.equal(aoiPose(AOI_CUTS[2]).arms.look, 0);
assert.equal(aoiPose(AOI_CUTS[2]).arms.lift, 0);
assert.ok(aoiPose(10).head.look >= 1);
