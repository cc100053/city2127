import assert from 'node:assert/strict';
import { EARTH } from '../src/bayContext.ts';
import { ELEVATOR_COPY, EXPLORE_COPY, EXPLORE_CYCLE, EXPLORE_SHOTS, podPose, ringWeight } from '../src/guestExplore.ts';
import { berthPark, EXPLORE_BERTH } from '../src/skyRing.ts';
import { parseExplore } from '../src/surveyView.ts';

const pad = berthPark(EXPLORE_BERTH).position;
// The pod starts on the regional loop tier, lands exactly on the pad, stays there through step 2 and is gone before the cycle restarts.
assert.ok(Math.abs(podPose(0).position.y - 170) < 1);
for (const t of [3.5, 5, 7.99]) assert.ok(podPose(t).position.distanceTo(pad) < .01, `parked at ${t}`);
assert.ok(podPose(3.49).position.distanceTo(pad) < .5, 'no jump on landing');
assert.ok(podPose(8.01).position.distanceTo(pad) < .5, 'no jump on take-off');
assert.equal(podPose(11.5).visible, false);
for (let t = 0; t < 11; t += .25) assert.ok(podPose(t).position.y >= 165, `pod stays above the loop tier at ${t}`);
// Camera weight: berth pose for steps 1–2 of the first cycle, whole ring in step 3, continuous across the cycle seam.
assert.equal(ringWeight(0, 0), 0); assert.equal(ringWeight(6, 3), 0); assert.equal(ringWeight(EXPLORE_CYCLE - .001, 0), 1); assert.equal(ringWeight(0, 1), 1);
for (const [pose, name] of Object.entries(EXPLORE_SHOTS).map(([k, v]) => [v, k] as const)) assert.ok(pose.position.distanceTo(pose.target) > 40, name);
for (const copy of [EXPLORE_COPY, ELEVATOR_COPY]) assert.ok(copy.steps.length === 3 && copy.steps.every(step => step.length <= 16), 'three caption steps ≤ 16 characters');
// Elevator pose E1 stays inside the curvature plate (outside it the sea renders as a dome).
assert.ok(Math.hypot(EXPLORE_SHOTS.elevator.position.x, EXPLORE_SHOTS.elevator.position.z) < EARTH.plate);
// Explore messages: null ends a look, anything else malformed is refused.
assert.equal(parseExplore({ type: 'explore', target: null }), null);
assert.deepEqual(parseExplore({ type: 'explore', target: 'sky-ring', ordinal: 3, stationId: 'A' }), { target: 'sky-ring', ordinal: 3 });
assert.deepEqual(parseExplore({ type: 'explore', target: 'space-elevator', ordinal: 2 }), { target: 'space-elevator', ordinal: 2 });
for (const bad of [{ target: 'sky-ring' }, { target: 'sky-ring', ordinal: 0 }, { target: 'elevator', ordinal: 1 }, { target: 'sky-ring', ordinal: 1.5 }]) assert.equal(parseExplore(bad), undefined);
console.log('guestExplore tests passed');
