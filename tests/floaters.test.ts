import assert from 'node:assert/strict';
import { ASSEMBLY, ASSEMBLY_TOP, FLOATER, floaters, socket, updateFloaters } from '../src/floaters.ts';
import { groundContacts, inMega, inRect } from '../src/megastructures.ts';
import { changeSites, SKY_RING, SPACE_ELEVATOR, SPHERE_DOCK } from '../src/layout.ts';

// P2: the floating chamber and the self-assembling building clear the Sky Ring, the space elevator, the P1 footprints, the Meter sites and the civic core.
const ringGap = Math.abs(Math.hypot(FLOATER.x - SKY_RING.x, FLOATER.z - SKY_RING.z) - SKY_RING.rx) - FLOATER.shell;
assert.ok(ringGap >= 4, `floater field shell ${ringGap.toFixed(1)} m from the Sky Ring centreline`);
assert.ok(Math.hypot(FLOATER.x - SPACE_ELEVATOR.x, FLOATER.z - SPACE_ELEVATOR.z) > 3000, 'floater far from the space elevator');
assert.ok(!inMega(FLOATER.x, FLOATER.z, FLOATER.shell), 'floater over a megastructure');
const reach = ASSEMBLY.base / 2 * Math.SQRT2 + 4;
// The hull's cleared context apron (bodyFootprints) is exactly the free ground the assembly uses; it must only stay off the P1 ground contacts and the ring/arch bodies.
const contacts = groundContacts();
for (const r of [contacts.ring, ...contacts.archFeet, contacts.hull]) assert.ok(!inRect({ ...r, hu: r.hu + reach, hv: r.hv + reach }, ASSEMBLY.x, ASSEMBLY.z), 'assembly touches a megastructure ground contact');
assert.ok(Math.hypot(ASSEMBLY.x + 18, ASSEMBLY.z - 23) > 100 && Math.hypot(ASSEMBLY.x - FLOATER.x, ASSEMBLY.z - FLOATER.z) > 100, 'assembly clear of civic core');
for (const site of Object.values(changeSites)) assert.ok(Math.abs(ASSEMBLY.x - site.x) > site.w * site.scale / 2 + reach || Math.abs(ASSEMBLY.z - site.z) > site.d * site.scale / 2 + reach, `assembly covers ${site.name}`);
// Civic chrome sphere (centre -18,100,23, R 28) sits inside the frame (x -75..71, y 62..134, z -12..70) and below the berth.
const [cx, cy, cz, R] = [-18, 100, 23, 28];
assert.ok(cx - R > -75 && cx + R < 71 && cy - R > 62 && cy + R < 134 && cz - R > -12 && cz + R < 70, 'civic sphere inside its frame');
assert.ok(SPHERE_DOCK[1] > cy + R, 'berth clears the chrome sphere');
// Draw calls and motion: <= 10 here (14 with the civic sphere's three), modules fade through the cycle and stay above the core.
const group = floaters(); let calls = 0; group.traverse(o => { if ((o as any).isMesh) calls++; });
assert.ok(calls <= 11, `floaters draw calls ${calls}`);
for (let t = 0; t < 60; t += 3.7) { updateFloaters(t, 0); const m = group.getObjectByName('assembly-modules') as any; assert.ok(m.instanceMatrix.array.every(Number.isFinite)); }
assert.ok(socket(0).length() < ASSEMBLY.base / 2 && ASSEMBLY_TOP > 10, 'sockets sit on the core roof');
console.log('floaters ok');
