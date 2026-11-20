import assert from 'node:assert/strict';
import * as T from 'three';
import { AttractLoop, CTA_FADE, DRIFT_YAW, EASE_IN, LOOP_SECONDS, SEGMENTS, YAW_PERIOD, attractSegment, ctaOpacity, driftPosition } from '../src/attractLoop.ts';
import { HERO_TARGET, heroSettledCamera } from '../src/heroCamera.ts';

const hero = heroSettledCamera(16, 9).position, target = new T.Vector3(...HERO_TARGET);
assert.ok(driftPosition(0).distanceTo(hero) < 1e-6, 'the drift starts on the settled hero pose');
assert.ok(driftPosition(LOOP_SECONDS * 5).distanceTo(target) - hero.distanceTo(target) < 1e-6, 'the drift keeps the hero orbit distance');
let maxRate = 0, minPhi = Infinity, maxPhi = 0;
for (let t = 0; t < 600; t += .1) {
  const a = new T.Spherical().setFromVector3(driftPosition(t).sub(target)), b = new T.Spherical().setFromVector3(driftPosition(t + .1).sub(target));
  maxRate = Math.max(maxRate, Math.abs(b.theta - a.theta) / .1); minPhi = Math.min(minPhi, a.phi); maxPhi = Math.max(maxPhi, a.phi);
}
assert.ok(T.MathUtils.radToDeg(maxRate) < .55, `slow drift: peak ${T.MathUtils.radToDeg(maxRate).toFixed(2)}°/s`);
assert.ok(maxPhi <= 1.42 + 1e-9 && minPhi >= .35, 'the drift stays inside the OrbitControls polar limits');
assert.ok(Math.abs(DRIFT_YAW * 2 * Math.PI / YAW_PERIOD - maxRate) < 1e-3, 'the yaw dominates the motion');

assert.equal(attractSegment(0), 'drift'); assert.equal(attractSegment(SEGMENTS.voices[0]), 'voices'); assert.equal(attractSegment(SEGMENTS.cta[0] + 1), 'cta'); assert.equal(attractSegment(LOOP_SECONDS + 1), 'drift');
assert.equal(ctaOpacity(10), 0); assert.equal(ctaOpacity(SEGMENTS.cta[0] + 5), 1); assert.ok(Math.abs(ctaOpacity(SEGMENTS.cta[0] + CTA_FADE / 2) - .5) < 1e-9); assert.equal(ctaOpacity(LOOP_SECONDS + 5), 0);

const camera = new T.PerspectiveCamera(42, 16 / 9, 2, 9000);
const controls = { target: new T.Vector3(10, 60, 0), enabled: true };
camera.position.set(-200, 200, -300);
const shown: number[] = [];
const loop = new AttractLoop(camera, controls, { update: opacity => shown.push(opacity) }, 90);
loop.update(89, false, false, 12);
assert.equal(loop.active, false, 'waits for the idle time');
assert.ok(camera.position.equals(new T.Vector3(-200, 200, -300)) && controls.enabled, 'the camera is untouched while waiting');
loop.update(90, false, false, 12);
assert.ok(loop.active && !controls.enabled, 'starts after the idle time and holds the controls');
assert.ok(camera.position.distanceTo(new T.Vector3(-200, 200, -300)) < 1e-6, 'starts from where the camera was');
loop.update(90 + EASE_IN, false, false, 12);
assert.ok(camera.position.distanceTo(driftPosition(EASE_IN)) < 1e-6 && controls.target.distanceTo(target) < 1e-6, 'eases onto the drift around the hero target');
loop.update(90 + SEGMENTS.cta[0] + 5, false, false, 12);
assert.equal(shown.at(-1), 1, 'shows the call to action in its segment');
loop.update(150, true, false, 12);
assert.ok(!loop.active && controls.enabled && shown.at(-1) === 0, 'a busy camera owner stops it and hides the call to action');
const held = camera.position.clone();
loop.update(200, false, false, 12);
assert.equal(loop.active, false, 'the idle wait restarts from the last activity');
loop.wake(200); loop.update(290, false, true, 12);
assert.ok(loop.active && camera.position.equals(held), 'reduced motion keeps the camera still');

console.log('PASS: attract drift path, segments, call-to-action fade, idle wait, wake and reduced motion.');
