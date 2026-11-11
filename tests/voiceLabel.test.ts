import assert from 'node:assert/strict';
import * as T from 'three';
import { LABEL_FADE, labelAnchor, labelOpacity, labelScreenPosition } from '../src/voiceLabel.ts';

const camera = new T.PerspectiveCamera(50, 16 / 9, 1, 5000);
camera.position.set(0, 0, 100); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); camera.updateProjectionMatrix();

const centre = labelScreenPosition(new T.Vector3(0, 0, 0), camera, 1920, 1080);
assert.ok(centre.visible && Math.abs(centre.x - 960) < 1e-6 && Math.abs(centre.y - 540) < 1e-6, 'the look-at point lands mid-screen');
assert.equal(labelScreenPosition(new T.Vector3(0, 0, 200), camera, 1920, 1080).visible, false, 'a point behind the camera is hidden');
assert.equal(labelScreenPosition(new T.Vector3(500, 0, 0), camera, 1920, 1080).visible, false, 'a point far off-frame is hidden');
assert.ok(labelScreenPosition(new T.Vector3(0, 10, 0), camera, 1920, 1080).y < 540, 'up in the world is up on screen');

assert.equal(labelOpacity(5, 5, 12), 0);
assert.ok(Math.abs(labelOpacity(5 + LABEL_FADE / 2, 5, 12) - .5) < 1e-9, 'half-way through the fade-in');
assert.equal(labelOpacity(8, 5, 12), 1);
assert.equal(labelOpacity(12, 5, 12), 0);

const target = [100, 5, 20] as const;
assert.deepEqual(labelAnchor(target), [100, 5, 20], 'no changed slots: the shot target');
const points = [{ slot: 'se:tower1', x: 0, y: 1, z: 0 }, { slot: 'se:pod4', x: 10, y: 1, z: 20 }, { slot: 'se:tower3', x: 500, y: 1, z: 500 }];
assert.deepEqual(labelAnchor(target, points, ['se:tower1', 'se:pod4']), [5, 1, 10], 'centre of the changed slots this stage frames');
assert.deepEqual(labelAnchor(target, points, ['nw:bay1']), [170, 1, 520 / 3], 'a stage framing none of them falls back to every changed slot');
assert.deepEqual(labelAnchor(target, points), [170, 1, 520 / 3], 'no stage coverage: every changed slot');

console.log('PASS: voice label projection, off-frame hiding, fade window and slot anchor.');
