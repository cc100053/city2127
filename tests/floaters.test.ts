import assert from 'node:assert/strict';
import { FLOATER, floaters, updateFloaters } from '../src/floaters.ts';
import { inMega } from '../src/megastructures.ts';
import { SKY_RING, SPACE_ELEVATOR, SPHERE_DOCK } from '../src/layout.ts';

// P2: the floating chamber clears the Sky Ring, the space elevator and the megastructures (the self-assembling building was removed 2026-11-20).
const ringGap = Math.abs(Math.hypot(FLOATER.x - SKY_RING.x, FLOATER.z - SKY_RING.z) - SKY_RING.rx) - FLOATER.shell;
assert.ok(ringGap >= 4, `floater field shell ${ringGap.toFixed(1)} m from the Sky Ring centreline`);
assert.ok(Math.hypot(FLOATER.x - SPACE_ELEVATOR.x, FLOATER.z - SPACE_ELEVATOR.z) > 3000, 'floater far from the space elevator');
assert.ok(!inMega(FLOATER.x, FLOATER.z, FLOATER.shell), 'floater over a megastructure');
// Civic chrome sphere (centre -18,100,23, R 28) sits inside the frame (x -75..71, y 62..134, z -12..70) and below the berth.
const [cx, cy, cz, R] = [-18, 100, 23, 28];
assert.ok(cx - R > -75 && cx + R < 71 && cy - R > 62 && cy + R < 134 && cz - R > -12 && cz + R < 70, 'civic sphere inside its frame');
assert.ok(SPHERE_DOCK[1] > cy + R, 'berth clears the chrome sphere');
// Draw calls and motion: <= 10 here (13 with the civic sphere's three); the chamber bobs and its rings turn without NaNs.
const group = floaters(); let calls = 0; group.traverse(o => { if ((o as any).isMesh) calls++; });
assert.ok(calls <= 10, `floaters draw calls ${calls}`);
assert.ok(!group.getObjectByName('assembly'), 'the self-assembling building is gone');
for (let t = 0; t < 60; t += 3.7) { updateFloaters(t, 0); assert.ok(Number.isFinite(group.getObjectByName('floater')!.position.y)); }
console.log('floaters ok');
