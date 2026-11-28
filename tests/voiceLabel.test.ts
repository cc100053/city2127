import assert from './assert.ts';
import * as T from 'three';
import { clampLabelX, LABEL_FADE, labelOpacity, labelScreenPosition } from '../src/voiceLabel.ts';

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

assert.equal(clampLabelX(960, 400, 1920), 960, 'a centred tag stays put');
assert.equal(clampLabelX(40, 400, 1920), 216, 'a tag near the left edge stays 16 px inside');
assert.equal(clampLabelX(1900, 400, 1920), 1704, 'and near the right edge');

console.log('PASS: voice label projection, off-frame hiding, fade window and edge clamp.');
