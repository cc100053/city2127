import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { routes, podPose, walkerPose, dockMotion, guideStrength, CARS, CAR_GAP, TRAINS, WALKERS } from '../src/mobility.ts';
import { changeSites, SPHERE_DOCK } from '../src/layout.ts';

const path = routes(), guideLength = path.guideway.getLength();
// Landmark boxes (Blender Z-up bounds → scene X, Y, -Z) and each survey site's tallest scaled envelope.
const layout = JSON.parse(readFileSync(new URL('../src/odaiba-layout.json', import.meta.url), 'utf8'));
const solids = [
  ...layout.buildings.map((b: { id: string; boundsBlender: number[][] }) => {
    const [min, max] = b.boundsBlender;
    return { name: b.id, x0: min[0], x1: max[0], z0: -max[1], z1: -min[1], h: max[2] };
  }),
  ...Object.values(changeSites).map(s => ({ name: s.name, x0: s.x - s.w * s.scale / 2, x1: s.x + s.w * s.scale / 2, z0: s.z - s.d * s.scale / 2, z1: s.z + s.d * s.scale / 2, h: s.h * s.scale })),
];
const clearance = (x: number, y: number, z: number) => Math.min(...solids.map(s => {
  const dx = Math.max(s.x0 - x, 0, x - s.x1), dz = Math.max(s.z0 - z, 0, z - s.z1), dy = Math.max(0, y - s.h);
  return Math.hypot(dx, dy, dz);
}));

// Air taxis (up to 31 m span) keep 20 m (15.4 m half-span plus margin) from every landmark and tall site; the approach only descends at the sphere berth.
for (const [name, route] of [['district loop', path.air], ['sphere approach', path.approach]] as const) {
  for (let i = 0; i <= 1000; i++) {
    const p = route.getPointAt(i / 1000);
    assert.ok(Number.isFinite(p.x + p.y + p.z));
    // The last 60 m descend onto the berth over Fuji TV's own roof; the berth height is checked below.
    if (name === 'sphere approach' && Math.hypot(p.x - SPHERE_DOCK[0], p.z - SPHERE_DOCK[2]) < 60) continue;
    assert.ok(clearance(p.x, p.y, p.z) > 20, `${name} passes within 20 m of a landmark or site at ${p.toArray().map(v => v.toFixed(0))}`);
  }
}
const end = path.approach.getPointAt(1);
assert.ok(Math.hypot(end.x - SPHERE_DOCK[0], end.z - SPHERE_DOCK[2]) < .01 && Math.abs(end.y - 6 - SPHERE_DOCK[1]) < .01, 'approach ends 6 m above the berth');
assert.ok(SPHERE_DOCK[1] > 123.4 + 5, 'berth clears the sphere top (123.4 m)');

// Dock cycle: continuous at every phase boundary; parked exactly at the berth while docked.
for (const t of [0, 2, 14, 17, 23, 26, 38, 40]) {
  const a = dockMotion(t - 1e-5), b = dockMotion(t + 1e-5);
  assert.ok(Math.abs(a.u - b.u) < 1e-3 && Math.abs(a.settle - b.settle) < 1e-3 && Math.abs(a.visible - b.visible) < 1e-3, `dock jumps at ${t}s`);
}
for (let t = 17; t <= 23; t += .5) assert.ok(dockMotion(t).u === 1 && dockMotion(t).settle > .999);

// Guideway pods: cars keep their spacing, never leave the guideway, and turn back without jumping.
for (let t = 0; t < 300; t += .25) for (let train = 0; train < TRAINS + 2; train++) {
  const cars = Array.from({ length: CARS }, (_, car) => podPose(t, train < 2 ? train : train - 1.5, car, guideLength));
  cars.forEach(c => assert.ok(c.u >= -1e-9 && c.u <= 1 + 1e-9, 'pod leaves the guideway'));
  for (let car = 1; car < CARS; car++) assert.ok(Math.abs(Math.abs(cars[car].u - cars[car - 1].u) * guideLength - CAR_GAP) < 1e-6);
  const next = podPose(t + .05, train < 2 ? train : train - 1.5, 0, guideLength);
  assert.ok(Math.abs(next.u - cars[0].u) * guideLength < 1.5, 'pod jumps along the guideway');
}

// Walkers stroll continuously (≤ 2 m/s) and switch lanes only at the ends of the promenade.
for (let i = 0; i < 160; i++) for (let t = 0; t < 1200; t += 1) {
  const a = walkerPose(t, i, i < WALKERS ? WALKERS : 160), b = walkerPose(t + 1, i, i < WALKERS ? WALKERS : 160);
  assert.ok(Math.abs(a.u - b.u) * path.promenades[i % 2].getLength() < 2, `walker ${i} jumps`);
  if (a.forward !== b.forward) assert.ok(a.u < .01 || a.u > .99, `walker ${i} turns mid-promenade`);
}

assert.ok(guideStrength(.01, .99, true) > .9);
assert.equal(guideStrength(.01, .99, false), 0);
assert.equal(guideStrength(.5, 0, true), 0);
console.log(`PASS: Odaiba actors — air corridors clear landmarks and sites, sphere berth, pod spacing on ${guideLength.toFixed(0)} m of guideway, walker continuity, guide lights.`);
