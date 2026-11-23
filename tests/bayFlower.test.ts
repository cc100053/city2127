import assert from './assert.ts';
import { BAY_FLOWER, bayCruisers } from '../src/layout.ts';
import { BAY_FLOWER_Y, bayFlower, bayFlowerPlatform, bayFlowerShown, bayFlowerWorld } from '../src/bayFlower.ts';
import { boatPoses, HULL, routes, WATER_PERIOD } from '../src/mobility.ts';

// Q02-B bay flower (placement R1–R2): flower centre, yaw, shore platform on the park promenade, boats clear of the petals, and the
// version4 run showing only the vacant state.
assert.equal(bayFlowerShown('', true), false, 'vacant by default');
assert.equal(bayFlowerShown('?bayFlower=0', true), false, '?bayFlower=0 vacant');
assert.equal(bayFlowerShown('?shot=free&bayFlower=1', true), true, 'DEV ?bayFlower=1 shows the flower');
assert.equal(bayFlowerShown('?bayFlower=1', false), false, 'production stays vacant');
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a.toFixed(2)} not within ${tol} of ${b}`);
const root = bayFlower();
near(root.position.x, -712, 1, 'flower centre x'); near(root.position.z, 300, 1, 'flower centre z');
assert.equal(root.position.y, BAY_FLOWER_Y); assert.equal(BAY_FLOWER_Y, -.8, 'waterline on the bay surface');

// The yaw turns the GLB's shore station (local (−95, 56)) due east of the flower, 110.3 m out.
const [sx, sz] = bayFlowerWorld(-95, 56);
near(sx, -601.7, .1, 'shore station x'); near(sz, 300, .1, 'shore station z');

// Platform: its landward paving reaches over the city's sea-wall gap onto the promenade (raycast edge x −595.35…−594.90 for z 284–316,
// promenade top y −0.19), and its seaward end stays clear of the petals.
const plat = bayFlowerPlatform();
near(plat.maxX, -594.23, .05, 'platform landward edge');
assert.ok(plat.maxX > -594.9 + .5, 'paving overlaps the promenade by at least 0.5 m');
near(plat.minX, -613.73, .05, 'platform seaward edge');
near(plat.minZ, 286, .1, 'platform north end'); near(plat.maxZ, 310, .1, 'platform south end');
assert.ok(BAY_FLOWER.x - plat.minX < 0 && plat.minX - BAY_FLOWER.x > BAY_FLOWER.r + 30, 'platform clear of the petals');

// Boats: every hull, at every quarter second of the water period, stays r + 30 m from the flower centre; the moved west-shore run
// keeps its whole 300 m on open water west of the park shore (x −610 for z 140–220).
const path = routes(), boatRadius = Math.hypot(HULL.x, HULL.stern);
let closest = Infinity;
for (let t = 0; t < WATER_PERIOD; t += .25) for (const boat of boatPoses(t, path)) {
  if (boat.scale < .05) continue;
  const d = Math.hypot(boat.x - BAY_FLOWER.x, boat.z - BAY_FLOWER.z) - boatRadius * boat.scale;
  closest = Math.min(closest, d);
  assert.ok(d > BAY_FLOWER.r + 30, `boat at ${t}s comes within ${d.toFixed(0)} m of the bay flower`);
}
const [cx, cz, heading] = bayCruisers[5];
for (const end of [-150, 150]) {
  const x = cx + Math.sin(heading) * end, z = cz + Math.cos(heading) * end;
  assert.ok(x < -610 - 10 && z > 140 && z < 220, `west-shore cruiser end ${x.toFixed(0)},${z.toFixed(0)} is not on open water`);
}
console.log(`Bay flower: centre (${root.position.x}, ${root.position.z}), shore station (${sx.toFixed(1)}, ${sz.toFixed(1)}), platform x ${plat.minX.toFixed(1)}…${plat.maxX.toFixed(1)}; nearest boat ${closest.toFixed(0)} m from the centre (≥ ${BAY_FLOWER.r + 30}).`);
