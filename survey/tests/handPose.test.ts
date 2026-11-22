import assert from 'node:assert/strict';
import { PoseFilter, ReadLock, Registration, classifyPose, synthHand } from '../src/ui/hand/handPose.ts';
import { TargetGate } from '../src/ui/hand/handTargets.ts';
import { pinchRatio } from '../src/ui/hand/handPointer.ts';

// Pose classification from landmarks.
assert.equal(classifyPose(synthHand(0.5, 0.4, 'point')), 'point');
assert.equal(classifyPose(synthHand(0.5, 0.4, 'palm')), 'palm');
assert.equal(classifyPose(synthHand(0.5, 0.4, 'rest')), 'rest');
assert.equal(classifyPose(undefined), 'rest');
assert.equal(classifyPose(synthHand(0.5, 0.9, 'point')), 'rest', 'fingertip below the active zone = lowered hand');
assert.equal(classifyPose(synthHand(0.5, 0.4, 'point', true)), 'point', 'pinching from the pointing pose stays pointing');
assert.ok(pinchRatio(synthHand(0.5, 0.4, 'point', true)) < 0.25 && pinchRatio(synthHand(0.5, 0.4, 'point')) > 0.4, 'synthetic pinch crosses the thresholds');

// Hysteresis: a new pose must hold 150 ms.
const f = new PoseFilter(150);
assert.equal(f.update('point', 0), 'rest');
assert.equal(f.update('point', 149), 'rest');
assert.equal(f.update('point', 150), 'point');
assert.equal(f.update('rest', 200), 'point', 'a brief flicker does not hide the cursor');
assert.equal(f.update('point', 260), 'point');
assert.equal(f.update('rest', 300), 'point');
assert.equal(f.update('rest', 460), 'rest');

// Pinch-only arming: hovering never fires (dwell disabled), pinch does.
const g = new TargetGate<string>(Infinity, 600);
for (let t = 0; t <= 10_000; t += 16) assert.equal(g.hover('card', t), null);
assert.equal(g.progress(10_000), 0);
assert.equal(g.pinch('card', 10_001), 'card');

// Read lock.
const lock = new ReadLock(1500);
lock.start(1000);
assert.ok(lock.locked(2499) && !lock.locked(2500));
assert.ok(Math.abs(lock.progress(1750) - 0.5) < 1e-9);

// 住民登録: palm 1.5 s -> pinch -> number shown 1.5 s -> done once.
const r = new Registration(1500, 250, 1500, 4000);
let t = 0;
const step = (pose: 'palm' | 'point' | 'rest', seen = true, pinch = false) => { t += 50; return r.update(pose, seen, pinch, t); };
assert.equal(step('point', true, true), 'idle', 'a pinch before the scan does nothing');
for (let i = 0; i < 10; i++) step('palm');
assert.equal(r.state, 'scanning');
for (let i = 0; i < 3; i++) step('rest');
assert.equal(r.state, 'scanning', 'a short gap keeps the scan');
for (let i = 0; i < 40; i++) step('rest', false);
assert.equal(r.state, 'idle', 'a lost palm drains the ring');
for (let i = 0; i < 31; i++) step('palm');
assert.equal(r.state, 'pinch');
assert.equal(step('palm'), 'pinch', 'waits for the pinch');
assert.equal(step('point', true, true), 'registered');
for (let i = 0; i < 29; i++) step('rest');
assert.equal(r.state, 'registered');
step('rest'); step('rest');
assert.equal(r.state, 'done');
const r2 = new Registration(1500, 250, 1500, 4000);
let t2 = 0;
for (let i = 0; i < 31; i++) r2.update('palm', true, false, t2 += 50);
assert.equal(r2.state, 'pinch');
assert.equal(r2.update('rest', false, false, t2 += 4100), 'idle', 'hand gone while waiting for the pinch: start over');
console.log('handPose tests passed');
