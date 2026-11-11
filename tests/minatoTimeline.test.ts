import assert from 'node:assert/strict';
import { MINATO_LOOP, minatoPose } from '../src/minatoTimeline.ts';

const start = minatoPose(0), done = minatoPose(8);
assert.deepEqual([start.shutter, start.light, start.reach, start.x, start.z], [0, 1, 0, 0, -.35], 'starts inside the open, lit booth');
assert.ok(minatoPose(1.4).z === -.35 && minatoPose(2.2).x > .5 && minatoPose(2.5).x === 1.25, 'steps out beside the opening during 1.5-2.5 s');
// He is outside the booth (|x| > .8 or in front of the counter at z > .75) the whole time the shutter moves, so it never hides him.
for (let t = 2.5; t <= 4; t += .05) assert.ok(Math.abs(minatoPose(t).x) > .8, `outside the booth at ${t.toFixed(2)} s`);
assert.ok(minatoPose(3.3).shutter > 0 && minatoPose(3.3).shutter < 1 && minatoPose(3.3).reach > .9 && minatoPose(2.5).shutter === 0, 'pulls the shutter down with the arm up');
assert.ok(minatoPose(3.3).light < minatoPose(2.8).light, 'warm light fades out while the shutter comes down');
assert.deepEqual([done.shutter, done.light, done.reach], [1, 0, 0], 'closed, dark, arm down');
assert.ok(minatoPose(4.6).moving && !minatoPose(5.8).moving && minatoPose(6.8).moving, 'walks, stops, walks on');
assert.deepEqual([minatoPose(5.2).look, minatoPose(6).look, minatoPose(6.5).look, minatoPose(7).look], [0, 1.5, 1.5, 0], 'looks back from 5.2 s, holds to 6.5 s, turns away again');
assert.equal(minatoPose(5.8).x, minatoPose(6.4).x, 'stands still during the look back');
assert.ok(Math.abs(minatoPose(3.2).drone - .5) < 1e-9, 'the drone is overhead at 3.2 s');
assert.deepEqual(minatoPose(MINATO_LOOP + 1), minatoPose(1), 'loops');

import { BEAT_ACTION, BEAT_MOVE, BEAT_SECONDS, residentBeat } from '../src/minatoTimeline.ts';
assert.deepEqual([residentBeat(0).blend, residentBeat(0).action, residentBeat(0).done], [0, 0, false], 'the beat starts on the headline camera with the action at 0');
assert.deepEqual([residentBeat(BEAT_MOVE).blend, residentBeat(BEAT_MOVE).action], [1, 0], 'the action clock starts when the camera arrives');
assert.equal(residentBeat(BEAT_MOVE + 3).action, 3, 'the action runs in real time');
assert.equal(residentBeat(BEAT_MOVE + BEAT_ACTION + .3).action, BEAT_ACTION, 'the action holds its last pose while the camera returns');
assert.ok(residentBeat(BEAT_SECONDS - .01).blend < .01 && residentBeat(BEAT_SECONDS).done, 'back on the headline camera exactly when the beat ends');
assert.ok(BEAT_ACTION >= 7.2, 'covers the whole 7.2 s action');
