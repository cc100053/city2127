import assert from 'node:assert/strict';
import { MINATO_LOOP, minatoPose } from '../src/minatoTimeline.ts';

const at = minatoPose(0), done = minatoPose(5);
assert.deepEqual([at.shutter, at.light, at.reach, at.x, at.z], [0, 1, 0, 0, -.35], 'starts behind the open, lit counter');
assert.ok(minatoPose(2.2).shutter > 0 && minatoPose(2.2).shutter < 1 && minatoPose(1.2).shutter === 0, 'the shutter moves only after 1.5 s');
assert.deepEqual([done.shutter, done.light, done.reach], [1, 0, 0], 'closed, dark, arm down by 5 s');
assert.ok(Math.abs(done.x + 1.7) < 1e-9 && Math.abs(done.z + 2) < 1e-9, 'walks out about 3 m of path');
assert.deepEqual(minatoPose(MINATO_LOOP + 1), minatoPose(1), 'loops every 7 s');
assert.ok(minatoPose(2.5).drone > .4 && minatoPose(2.5).drone < .6, 'the drone is overhead around 2.5 s');
