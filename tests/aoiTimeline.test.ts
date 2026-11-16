import assert from 'node:assert/strict';
import { aoiPose } from '../src/aoiTimeline.ts';

assert.deepEqual(aoiPose(0), { push: 0, lift: 0, sow: 0, seeds: 0, pane: 0, mist: 0 });
assert.equal(aoiPose(4.8).lift, 1);
assert.equal(aoiPose(4.8).seeds, 0);
assert.equal(aoiPose(5.68).seeds, 1);
assert.equal(aoiPose(5.68).pane, 0);
assert.equal(aoiPose(6.1).mist, 0);
assert.deepEqual(aoiPose(10), { push: 1, lift: 0, sow: 0, seeds: 1, pane: 1, mist: 1 });
for (let t = 0; t < 10; t += .01) {
  const before = Object.values(aoiPose(t)), after = Object.values(aoiPose(t + .01));
  assert.ok(after.every((value, i) => Math.abs(value - before[i]) < .04));
}
