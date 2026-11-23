// Interim concept lot (owner 2026-11-20): the lattice stays inside its lot envelope, rises with the 3 s transition and fades with the fly-out,
// and the concept shot looks at the lot.
import assert from './assert.ts';
import { conceptPhase, conceptText, latticeGeometry } from '../src/conceptHologram.ts';
import { CONCEPT_LOT } from '../src/layout.ts';
import { SHOTS } from '../src/headlineCamera.ts';

const position = latticeGeometry().getAttribute('position');
for (let i = 0; i < position.count; i++) {
  assert.ok(Math.abs(position.getX(i)) <= CONCEPT_LOT.w / 2 + 1e-6 && Math.abs(position.getZ(i)) <= CONCEPT_LOT.d / 2 + 1e-6, 'lattice inside the lot');
  assert.ok(position.getY(i) >= 0 && position.getY(i) <= CONCEPT_LOT.h + 1e-6, 'lattice within the height');
}
assert.equal(conceptText('同じ建物の住民と共有する。'), '同じ建物の住民と共有する');
assert.deepEqual(conceptPhase(4, 5, 13), { reveal: 0, alpha: 0 }, 'hidden before the transition');
assert.deepEqual(conceptPhase(6.5, 5, 13), { reveal: .5, alpha: 1 }, 'half built mid-transition');
assert.deepEqual(conceptPhase(12, 5, 13), { reveal: 1, alpha: 1 });
assert.deepEqual(conceptPhase(14, 5, 13), { reveal: 1, alpha: .5 }, 'fades with the fly-out');
assert.deepEqual(conceptPhase(15.5, 5, 13), { reveal: 0, alpha: 0 });
const { position: eye, target } = SHOTS['concept:lot'];
assert.ok(Math.hypot(target[0] - CONCEPT_LOT.x, target[2] - CONCEPT_LOT.z) < 5, 'the shot aims at the lot');
assert.ok(Math.hypot(eye[0] - target[0], eye[2] - target[2]) < 140, 'close enough to read the label');
console.log('concept hologram tests passed');
