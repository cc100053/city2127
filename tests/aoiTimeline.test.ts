import assert from './assert.ts';
import { aoiPose } from '../src/aoiTimeline.ts';

assert.deepEqual(aoiPose(0), { push: 0, lift: 0, sow: 0, seeds: 0, pullback: 0, pane: 0, beam: 0, sunlight: 0 });
assert.equal(aoiPose(4.8).lift, 1);
assert.equal(aoiPose(4.8).seeds, 0);
assert.equal(aoiPose(5.68).seeds, 1);
assert.equal(aoiPose(5.68).pullback, 0);
assert.ok(aoiPose(6.4).pullback > 0 && aoiPose(6.4).pullback < 1);
assert.equal(aoiPose(7.25).pullback, 1);
assert.equal(aoiPose(7.25).pane, 0);
assert.ok(aoiPose(7.48).pane > 0);
assert.equal(aoiPose(7.48).beam, 0);
assert.ok(aoiPose(7.91).beam > 0);
assert.equal(aoiPose(7.91).sunlight, 0);
assert.equal(aoiPose(8.12).beam, 1);
assert.equal(aoiPose(8.4).sunlight, 1);
assert.deepEqual(aoiPose(10), { push: 1, lift: 0, sow: 0, seeds: 1, pullback: 1, pane: 1, beam: 1, sunlight: 1 });
for (let t = 0; t < 10; t += .01) {
  const before = Object.values(aoiPose(t)), after = Object.values(aoiPose(t + .01));
  assert.ok(after.every((value, i) => Math.abs(value - before[i]) < .04));
}
