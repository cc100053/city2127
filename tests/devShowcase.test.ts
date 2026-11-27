import assert from './assert.ts';
import { BAY_FLOWER, DISTRICT, HYDRO_TERRACE } from '../src/layout.ts';
import { SHOWCASE } from '../src/devShowcase.ts';
import { boatPoses, HULL, routes, WATER_PERIOD } from '../src/mobility.ts';

// DEV ?showcase (src/devShowcase.ts): the Q10-A and Q11-C drafts stand on open bay water, clear of the hero district, the Q02 sea lots,
// each other and every boat. Plan radii from the GLB checks (asset/models/*/check*.json): both round islands, Q10-A r 76 m, Q11-C r 131 m.
const RADIUS = { q10a: 76, q11c: 131 } as const;
const sites = Object.entries(SHOWCASE).map(([id, s]) => ({ id, x: s.x, z: s.z, r: RADIUS[id as keyof typeof RADIUS] }));
for (const s of sites) {
  assert.ok(s.x + s.r < DISTRICT.minX, `${s.id} stays west of the hero district`);
  assert.ok(Math.hypot(s.x - HYDRO_TERRACE.x, s.z - HYDRO_TERRACE.z) > s.r + HYDRO_TERRACE.lot * Math.SQRT1_2 + 20, `${s.id} clear of the hydro terrace`);
  assert.ok(Math.hypot(s.x - BAY_FLOWER.x, s.z - BAY_FLOWER.z) > s.r + BAY_FLOWER.r + 20, `${s.id} clear of the bay flower`);
}
assert.ok(Math.hypot(sites[0].x - sites[1].x, sites[0].z - sites[1].z) > sites[0].r + sites[1].r + 20, 'the two drafts stand apart');

// Boats: every hull, every quarter second of the water period, keeps 15 m of water from each draft's plan circle.
const path = routes(), hull = Math.hypot(HULL.x, HULL.stern);
for (let t = 0; t < WATER_PERIOD; t += .25) for (const boat of boatPoses(t, path)) {
  if (boat.scale < .05) continue;
  for (const s of sites) {
    const d = Math.hypot(boat.x - s.x, boat.z - s.z) - s.r - hull * boat.scale;
    assert.ok(d > 15, `boat at ${t}s comes within ${d.toFixed(0)} m of ${s.id}`);
  }
}
console.log('devShowcase: drafts on open water, clear of lots and boats');
