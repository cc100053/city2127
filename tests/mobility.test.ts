import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { routes, podPose, boatPoses, HULL, WATER_PERIOD, BOATS as BOAT_COUNT, trainPose, TRAIN_SPEED, walkerPose, walkerRoute, walkerParty, doorwayPose, robotPose, collectorPose, ROBOT_HALT, HANDOFF, promenadeStops, RAIL_OUT, STOOL_FRONT, streetCarPose, STREET_GAP, dropOffPose, DROP_OFF, streetRhythm, promenadeBenches, BENCH_OUT, transferPose, dockMotion, guideStrength, aircraftSlot, podShare, automationActivity, CARS, CAR_GAP, TRAINS, WALKERS, TRANSFERS, PLATOON } from '../src/mobility.ts';
import { changeSites, SPHERE_DOCK, INTERCHANGE } from '../src/layout.ts';
import { laneBeaconSites } from '../src/waterRooms.ts';
import { conversationPose, visitPose } from '../src/mobility.ts';

const path = routes(), guideLength = path.guideway.getLength();
// Landmark boxes (Blender Z-up bounds → scene X, Y, -Z) and each survey site's tallest scaled envelope.
const layout = JSON.parse(readFileSync(new URL('../src/odaiba-layout.json', import.meta.url), 'utf8'));
const solids = [
  ...layout.buildings.map((b: { id: string; boundsBlender: number[][] }) => {
    const [min, max] = b.boundsBlender;
    return { name: b.id, x0: min[0], x1: max[0], z0: -max[1], z1: -min[1], h: max[2] };
  }),
  ...Object.values(changeSites).map(s => ({ name: s.name, x0: s.x - s.w * s.scale / 2, x1: s.x + s.w * s.scale / 2, z0: s.z - s.d * s.scale / 2, z1: s.z + s.d * s.scale / 2, h: s.h * s.scale })),
  // Interchange arrival mast and its 11 m berth deck; lane beacon masts (58 m).
  { name: 'interchange mast', x0: INTERCHANGE.mast[0] - 11, x1: INTERCHANGE.mast[0] + 11, z0: INTERCHANGE.mast[2] - 11, z1: INTERCHANGE.mast[2] + 11, h: INTERCHANGE.deck },
  ...laneBeaconSites().map(([x, z]) => ({ name: 'lane beacon', x0: x - 3.2, x1: x + 3.2, z0: z - 3.2, z1: z + 3.2, h: 58 })),
];
const clearance = (x: number, y: number, z: number) => Math.min(...solids.map(s => {
  const dx = Math.max(s.x0 - x, 0, x - s.x1), dz = Math.max(s.z0 - z, 0, z - s.z1), dy = Math.max(0, y - s.h);
  return Math.hypot(dx, dy, dz);
}));

// Aircraft (22 m winged span, 17 m pods) keep 20 m (11 m half-span plus margin) from every landmark, tall site and beacon; approaches only descend at their berths.
for (const [name, route] of [['district loop', path.air], ['sphere approach', path.approach], ['shore lane', path.shore], ['interchange approach', path.ixApproach]] as const) {
  for (let i = 0; i <= 1000; i++) {
    const p = route.getPointAt(i / 1000);
    assert.ok(Number.isFinite(p.x + p.y + p.z));
    // The last 60 m descend onto a berth over its own structure; the berth heights are checked below.
    if (name === 'sphere approach' && Math.hypot(p.x - SPHERE_DOCK[0], p.z - SPHERE_DOCK[2]) < 60) continue;
    if (name === 'interchange approach' && Math.hypot(p.x - INTERCHANGE.mast[0], p.z - INTERCHANGE.mast[2]) < 60) continue;
    assert.ok(clearance(p.x, p.y, p.z) > 20, `${name} passes within 20 m of a landmark or site at ${p.toArray().map(v => v.toFixed(0))}`);
  }
}
const end = path.approach.getPointAt(1);
assert.ok(Math.hypot(end.x - SPHERE_DOCK[0], end.z - SPHERE_DOCK[2]) < .01 && Math.abs(end.y - 6 - SPHERE_DOCK[1]) < .01, 'approach ends 6 m above the berth');
assert.ok(SPHERE_DOCK[1] > 123.4 + 5, 'berth clears the sphere top (123.4 m)');
const ixEnd = path.ixApproach.getPointAt(1);
assert.ok(Math.hypot(ixEnd.x - INTERCHANGE.mast[0], ixEnd.z - INTERCHANGE.mast[2]) < .01 && Math.abs(ixEnd.y - 6 - INTERCHANGE.deck) < .01, 'interchange approach ends 6 m above its deck');
// Air tiers: the shore lane stays in the 80–100 m city tier, the district loop above 160 m.
for (let i = 0; i < 200; i++) {
  const y = path.shore.getPointAt(i / 200).y; assert.ok(y > 78 && y < 102, `shore lane leaves its tier at ${y.toFixed(0)} m`);
  assert.ok(path.air.getPointAt(i / 200).y > 160);
}
const boatEnd = path.ixBoat.getPointAt(1), boatHeading = path.ixBoat.getTangentAt(1), seaward = [INTERCHANGE.head[0] - INTERCHANGE.shore[0], INTERCHANGE.head[2] - INTERCHANGE.shore[2]];
assert.ok(Math.hypot(boatEnd.x - INTERCHANGE.boat[0], boatEnd.z - INTERCHANGE.boat[2]) < .01, 'interchange boat berths at the pier head');
assert.ok((boatHeading.x * seaward[0] + boatHeading.z * seaward[1]) / INTERCHANGE.pier < -.98, 'interchange boat berths bow to the shore');
const beacons = laneBeaconSites();
assert.ok(beacons.length >= 4, `only ${beacons.length} lane beacons`);

// Dock cycle: continuous at every phase boundary; parked exactly at the berth while docked.
for (const t of [0, 2, 14, 17, 23, 26, 38, 40]) {
  const a = dockMotion(t - 1e-5), b = dockMotion(t + 1e-5);
  assert.ok(Math.abs(a.u - b.u) < 1e-3 && Math.abs(a.settle - b.settle) < 1e-3 && Math.abs(a.visible - b.visible) < 1e-3, `dock jumps at ${t}s`);
}
for (let t = 17; t <= 23; t += .5) assert.ok(dockMotion(t).u === 1 && dockMotion(t).settle > .999);
// Leaving, the heading (outbound yaw + turn) continues from the inbound yaw (outbound + π) and pivots smoothly to outbound.
assert.ok(!dockMotion(25.999).leaving && dockMotion(25.999).turn === 0 && dockMotion(26).leaving && Math.abs(dockMotion(26).turn - Math.PI) < 1e-9);
for (let t = 26; t < 40; t += .05) assert.ok(Math.abs(dockMotion(t + .05).turn - dockMotion(t).turn) < .07, `berth pivot jumps at ${t}s`);
assert.equal(dockMotion(30).turn, 0);

// Guideway pods: cars keep their spacing, never leave the guideway, and turn back without jumping.
for (let t = 0; t < 300; t += .25) for (let train = 0; train < TRAINS + 2; train++) {
  const cars = Array.from({ length: CARS }, (_, car) => podPose(t, train < 2 ? train : train - 1.5, car, guideLength));
  cars.forEach(c => assert.ok(c.u >= -1e-9 && c.u <= 1 + 1e-9, 'pod leaves the guideway'));
  for (let car = 1; car < CARS; car++) assert.ok(Math.abs(Math.abs(cars[car].u - cars[car - 1].u) * guideLength - CAR_GAP) < 1e-6);
  const next = podPose(t + .05, train < 2 ? train : train - 1.5, 0, guideLength);
  assert.ok(Math.abs(next.u - cars[0].u) * guideLength < 1.5, 'pod jumps along the guideway');
}

// Walkers: continuous while visible (≤ 3.5 m/s, joggers included), appear/vanish only at a route end, turn only out of sight, hold still
// at a viewpoint; parties share their leader's route; paces vary.
const walks = [...path.promenades, ...path.decks];
let dwelling = 0;
const paces = new Set<number>();
for (let i = 0; i < 400; i++) {
  const length = walks[walkerRoute(walkerParty(i).id)].getLength();
  paces.add(Math.round(walkerPose(0, i, length).speed * 10));
  for (let t = 0; t < 1200; t += 1) {
    const a = walkerPose(t, i, length), b = walkerPose(t + 1, i, length);
    if (a.visible > 0 && b.visible > 0) assert.ok(Math.abs(a.u - b.u) * length < 3.5, `walker ${i} jumps`);
    if (a.visible > 0 && a.visible < 1) assert.ok(a.u < 5 / length || a.u > 1 - 5 / length, `walker ${i} fades mid-route`);
    if (a.forward !== b.forward) assert.ok(a.visible === 0 || b.visible === 0, `walker ${i} turns in view`);
    if (a.dwell === 1 && b.dwell === 1) { dwelling++; assert.equal(a.u, b.u, `walker ${i} drifts while stopped`); }
    assert.ok(Math.abs(a.dwell - b.dwell) <= .25 + 1e-9);
  }
}
assert.ok(dwelling > 0, 'no walker stops at a viewpoint');
assert.ok(paces.size > 10 && Math.max(...paces) >= 23, 'walkers share one pace or nobody jogs');
assert.deepEqual([0, 1, 2, 3, 4, 9, 14, 19].map(walkerRoute), [0, 1, 0, 1, 2, 3, 4, 5]);
for (let i = 0; i < 60; i++) { const p = walkerParty(i); assert.ok(walkerParty(p.leader).leader === p.leader && walkerParty(p.leader).id === p.id); }
assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => walkerParty(i).size), [1, 2, 2, 3, 3, 3]);

// Doorway trips: continuous at walking pace while visible.
for (let k = 0; k < 40; k++) for (let t = 0; t < 300; t += .5) {
  const a = doorwayPose(t, k, 30), b = doorwayPose(t + .5, k, 30);
  if (a.visible > 0 && b.visible > 0) assert.ok(Math.abs(a.d - b.d) < 1, `doorway walker ${k} jumps`);
}

// Street cars stay on the environment's road surface in both lanes, never close within 9 m in a lane, and move ≤ 15 m/s.
const glb = readFileSync(new URL('../asset/models/odaiba-masterplan/odaiba_district_v01_environment.glb', import.meta.url));
const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()), bin = glb.subarray(28 + glb.readUInt32LE(12));
const read = (i: number) => {
  const a = gltf.accessors[i], v = gltf.bufferViews[a.bufferView], n = a.type === 'VEC3' ? 3 : 1, C = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : Uint16Array;
  const stride = v.byteStride ? v.byteStride / C.BYTES_PER_ELEMENT : n, arr = new C(bin.buffer, bin.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0), (a.count - 1) * stride + n);
  return (k: number, c = 0) => arr[k * stride + c];
};
const roadTris: number[][] = [], pavedTris: number[][] = [];
gltf.nodes.forEach((node: { mesh?: number; translation?: number[] }) => {
  if (node.mesh === undefined) return;
  const [tx, , tz] = node.translation ?? [0, 0, 0];
  for (const prim of gltf.meshes[node.mesh].primitives) {
    const name = gltf.materials[prim.material].name, list = ['road', 'road_marking'].includes(name) ? roadTris : ['sidewalk', 'plaza'].includes(name) ? pavedTris : null;
    if (!list) continue;
    const pos = read(prim.attributes.POSITION), idx = read(prim.indices), count = gltf.accessors[prim.indices].count;
    for (let k = 0; k < count; k += 3) list.push([0, 1, 2].flatMap(j => [pos(idx(k + j), 0) + tx, pos(idx(k + j), 2) + tz]));
  }
});
const inside = (tris: number[][], x: number, z: number) => tris.some(([ax, az, bx, bz, cx, cz]) => {
  const s = (px: number, pz: number, qx: number, qz: number) => (x - qx) * (pz - qz) - (px - qx) * (z - qz);
  const d1 = s(ax, az, bx, bz), d2 = s(bx, bz, cx, cz), d3 = s(cx, cz, ax, az);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
});
const onRoad = (x: number, z: number) => inside(roadTris, x, z);
path.streets.forEach((street, r) => {
  const length = street.getLength(), offset = r ? 1.75 : 1.25, cars = Math.round((length + 40) / STREET_GAP);
  let missing = 0, samples = 0;
  for (let d = 0; d <= length; d += 2) for (const side of [-1, 1]) {
    const p = street.getPointAt(d / length), t = street.getTangentAt(d / length);
    // Both car edges (0.95 m either side of the lane centre). The junction mouth under the guideway (~10 m) has no road triangle.
    for (const edge of [-.95, .95]) { samples++; if (!onRoad(p.x + t.z * side * (offset + edge), p.z - t.x * side * (offset + edge))) missing++; }
  }
  assert.ok(missing / samples < .02, `street ${r}: ${missing}/${samples} car-edge samples off the road`);
  for (const lane of [0, 1]) for (let t = 0; t < 300; t += .5) {
    const at = Array.from({ length: cars }, (_, c) => streetCarPose(t, r, lane, c, cars, length));
    const shown = at.filter(c => c.visible > 0).map(c => c.d).sort((a, b) => a - b);
    for (let k = 1; k < shown.length; k++) assert.ok(shown[k] - shown[k - 1] > 9, `street ${r} lane ${lane} cars close up at ${t}s`);
    at.forEach((c, k) => { const next = streetCarPose(t + .5, r, lane, k, cars, length); if (c.visible > 0 && next.visible > 0) assert.ok(Math.abs(next.d - c.d) < 7.5, 'street car jumps'); });
  }
});
// Drop-off: the bay car is continuous, rests on paving clear of the carriageway, and is back in its own lane slot whenever not in the bay.
{
  const street = path.streets[DROP_OFF.road], length = street.getLength(), cars = Math.round((length + 40) / STREET_GAP);
  DROP_OFF.cars.forEach((car, k) => {
    let parkedSeen = 0;
    for (let t = 0; t < 400; t += .25) {
      const a = dropOffPose(t, car, cars, length, DROP_OFF.stops[k]), b = dropOffPose(t + .25, car, cars, length, DROP_OFF.stops[k]);
      const slot = streetCarPose(t, DROP_OFF.road, DROP_OFF.lane, car, cars, length);
      if (a.visible > 0 && b.visible > 0) assert.ok(Math.abs(a.d - b.d) < 3.5 && Math.abs(a.bay - b.bay) < .15 && Math.abs(a.steer) < .2, `drop-off car ${car} jumps or swerves at ${t}s`);
      if (a.bay === 0) assert.ok(Math.abs(a.d - slot.d) < 1e-6, `drop-off car ${car} leaves its slot outside the bay`);
      if (a.parked >= 0) {
        parkedSeen++;
        assert.ok(a.leaving >= 0 && (b.parked < 0 || Math.abs(a.d - b.d) < 1e-6), 'parked car moves');
        const p = street.getPointAt(a.d / length), tan = street.getTangentAt(a.d / length).negate(), off = 1.75 + DROP_OFF.bay;
        for (const [along, across] of [[-2.3, -.95], [-2.3, .95], [2.3, -.95], [2.3, .95], [0, 0]]) {
          const x = p.x + tan.z * (off + across) + tan.x * along, z = p.z - tan.x * (off + across) + tan.z * along;
          assert.ok(inside(pavedTris, x, z) && !onRoad(x, z), `drop-off bay ${k} corner off the paving at ${x.toFixed(0)}, ${z.toFixed(0)}`);
        }
      }
    }
    assert.ok(parkedSeen > 100, `drop-off car ${car} never parks`);
    // Cues: kerb indicator ahead of easing in and through braking, brake lamp only while slowing, road indicator before pulling away
    // and until back in lane; the nose dips under braking and lifts pulling away, never past 1°.
    let kerbBeforeBay = 0, roadBeforeMove = 0;
    for (let t = 0; t < 400; t += .25) {
      const a = dropOffPose(t, car, cars, length, DROP_OFF.stops[k]), b = dropOffPose(t + .25, car, cars, length, DROP_OFF.stops[k]);
      if (a.signal === 1 && a.bay === 0) kerbBeforeBay++;
      if (a.signal === -1 && a.parked >= 0) roadBeforeMove++;
      if (a.brake) assert.ok(a.signal === 1 && a.parked < 0 && a.pitch >= 0 && b.d !== a.d, 'brake lamp off the braking stretch');
      if (a.bay === 0 && b.bay === 0) assert.ok(a.signal >= 0 && !a.brake && a.pitch === 0, 'cue in plain traffic');
      if (a.parked >= 0 && a.leaving > 3) assert.equal(a.signal, 0, 'parked car signals early');
      assert.ok(Math.abs(a.pitch) < .0175 && Math.abs(a.pitch - b.pitch) < .005);
    }
    assert.ok(kerbBeforeBay > 4 && roadBeforeMove >= 10, `drop-off car ${car} gives no warning`);
  });
}

// Boats: over the fleet's whole period every visible hull keeps 2 m of water to every other (loop taxis, ferry, interchange boat,
// cruisers; a fading cruiser counts once it is a third grown).
{
  const hull = (b: ReturnType<typeof boatPoses>[number]) => { const c = Math.cos(b.yaw), s = Math.sin(b.yaw), k = b.scale, mid = (HULL.bow + HULL.stern) / 2 * k;
    return { x: b.x + s * mid, z: b.z + c * mid, c, s, hx: HULL.x * k + 1, hz: (HULL.bow - HULL.stern) / 2 * k + 1 }; };
  const meet = (a: ReturnType<typeof hull>, b: ReturnType<typeof hull>) => [[a.c, -a.s], [a.s, a.c], [b.c, -b.s], [b.s, b.c]].every(u => {
    const ext = (o: typeof a) => o.hx * Math.abs(u[0] * o.c - u[1] * o.s) + o.hz * Math.abs(u[0] * o.s + u[1] * o.c);
    return Math.abs((b.x - a.x) * u[0] + (b.z - a.z) * u[1]) < ext(a) + ext(b); });
  for (let t = 0; t < WATER_PERIOD; t += .25) {
    const boats = boatPoses(t, path).map((b, i) => ({ b, i, full: i <= BOAT_COUNT + 1 ? 1.7 : 1.35 })).filter(o => o.b.scale > .3 * o.full).map(o => ({ i: o.i, h: hull(o.b) }));
    for (let a = 0; a < boats.length; a++) for (let b = a + 1; b < boats.length; b++) assert.ok(!meet(boats[a].h, boats[b].h), `boats ${boats[a].i} and ${boats[b].i} meet at ${t}s`);
  }
}
// Trains: each track's trains keep a fixed gap (never closing up), and each runs one way on its own beam.
{
  const lengths = path.tracks.map(c => c.getLength());
  for (let t = 0; t < 300; t += .5) for (const track of [0, 1]) {
    const heads = [0, 1].map(k => trainPose(t, k, 2, 0, lengths[track]).u * lengths[track]), tails = [0, 1].map(k => trainPose(t, k, 2, 5, lengths[track]).u * lengths[track]);
    const vis = [0, 1].map(k => trainPose(t, k, 2, 0, lengths[track]).visible > 0 || trainPose(t, k, 2, 5, lengths[track]).visible > 0);
    if (vis[0] && vis[1]) assert.ok(Math.min(Math.abs(heads[0] - tails[1]), Math.abs(heads[1] - tails[0])) > 50, `trains close up on track ${track}`);
    assert.ok(trainPose(t + .5, 0, 2, 0, lengths[track]).u * lengths[track] - heads[0] <= TRAIN_SPEED * .5 + 1e-6 || trainPose(t + .5, 0, 2, 0, lengths[track]).visible === 0);
  }
}

// Day rhythm: every group in 0..1, continuous through midnight, full when no hour is given; evenings busier than 4 am.
for (let h = 0; h < 24; h += .1) {
  const a = streetRhythm(h), b = streetRhythm(h + .1);
  for (const k of Object.keys(a) as (keyof typeof a)[]) { assert.ok(a[k] >= 0 && a[k] <= 1); assert.ok(Math.abs(a[k] - b[k]) < .06, `rhythm ${k} jumps at ${h.toFixed(1)}h`); }
}
assert.ok(Object.values(streetRhythm()).every(v => v === 1));
assert.ok(streetRhythm(18).people > 3 * streetRhythm(4).people && streetRhythm(4).children === 0 && streetRhythm(23.99).robots > .9);

// Benches: the backrest (.27 m behind the bench line) clears walker lanes (≤ 2.35 m incl. parties abreast and a .25 m body), and a
// sitter's feet (knee .31 m forward plus the .08 m shin) stop short of the lit edge tube (3.6 m − .3 m).
const benches = promenadeBenches(path.promenades.map(c => c.getLength()));
assert.ok(benches.length >= 16 && benches.every(b => b.u > 0 && b.rail < 1) && BENCH_OUT - .27 > 2.35 && BENCH_OUT + .39 < 3.3);
// Lanes clear the backrest (2.48 m) with a shoulder to spare and keep 0.25 m off the centre line; joggers run outside every party.
assert.ok(Array.from({ length: 400 }, (_, i) => { const p = walkerParty(i), w = walkerPose(0, p.leader); return w.lane + p.side; }).every(v => v >= .25 && v <= 2.1));
// Promenade stops: every spot used once, lone walkers sit at stools, parties stand at the rail; a walker holds exactly at its spot,
// fully veered out, and is back in its lane 6 m on.
const promenadeLengths = path.promenades.map(c => c.getLength()), stops = promenadeStops(promenadeLengths);
const used = [...stops.values()].filter(s => s !== false);
assert.ok(used.length >= 16 && new Set(used.map(s => `${s.route} ${s.at.toFixed(1)} ${s.out}`)).size === used.length, 'promenade spots shared');
for (const [i, stop] of stops) {
  if (stop === false) continue;
  assert.equal(stop.seat > 0 ? stop.out : RAIL_OUT, stop.seat > 0 ? STOOL_FRONT : stop.out);
  assert.equal(stop.seat > 0, walkerParty(i).size === 1);
  const length = promenadeLengths[walkerRoute(walkerParty(i).id)];
  let held = 0, far = 0;
  for (let t = 0; t < 4000; t++) {
    const w = walkerPose(t, i, length, stop);
    if (w.dwell > 0) { held++; assert.ok(Math.abs((w.forward ? w.u : 1 - w.u) * length - (w.forward ? stop.at : length - stop.at)) < 1e-6 && w.approach === 1); }
    if (w.visible > 0 && w.approach === 0) far++;
  }
  assert.ok(held > 0 && far > 0, `walker ${i} never stops at its spot`);
}

// Delivery robots: continuous at a steady pace, halting HANDOFF s just outside the far door while the collector comes out and back in.
for (let k = 0; k < 14; k++) {
  let waits = 0;
  for (let t = 0; t < 400; t += .25) {
    const a = robotPose(t, 500 + k, 30), b = robotPose(t + .25, 500 + k, 30);
    if (a.visible > 0 && b.visible > 0) assert.ok(Math.abs(a.d - b.d) <= .7 * .25 + 1e-9, `robot ${k} jumps`);
    if (a.waited >= 0) { waits++; assert.ok(Math.abs((a.reverse ? a.d : 30 - a.d) - ROBOT_HALT) < 1e-9); }
  }
  assert.ok(waits > 0);
}
assert.ok([0, 7, HANDOFF].every(t => collectorPose(t).e === 0) && collectorPose(3).e + .25 < ROBOT_HALT - .4, 'collector meets the robot');

// Group conversations include listening and silence, with at most one restrained gesture at any time.
for (const members of [2, 3]) for (let group = 0; group < 5; group++) {
  const speakers = new Set<number>(); let quiet = 0;
  for (let time = -20; time < 80; time += .1) {
    const turns = Array.from({ length: members }, (_, j) => conversationPose(time, group, j, members));
    assert.ok(turns.filter(p => p.gesture > .001).length <= 1);
    turns.forEach((p, j) => { assert.ok(p.attention >= 0 && p.attention <= 1 && p.gesture >= 0 && p.gesture <= .41);
      if (p.attention > 0) { assert.ok(p.toward >= 0 && p.toward < members && p.toward !== j); if (p.gesture > .001) speakers.add(j); }
    });
    if (turns.every(p => p.attention === 0)) quiet++;
  }
  assert.equal(speakers.size, members); assert.ok(quiet > 0);
}
// Visits stay fully visible at the group, return to their own door, and never jump between visible positions.
for (let group = 0; group < 5; group++) {
  let outbound = 0, returning = 0, staying = 0, indoors = 0;
  for (let time = 0; time < 240; time += .1) {
    const a = visitPose(time, group, 20), b = visitPose(time + .1, group, 20);
    assert.ok(a.u >= 0 && a.u <= 1 && Math.abs(a.u - b.u) * 20 <= .12 + 1e-8);
    if (a.dwell > 0) { staying++; assert.equal(a.u, 1); assert.equal(a.visible, 1); assert.equal(a.walking, false); }
    if (a.walking && a.visible === 1) { if (a.returning) returning++; else outbound++; }
    if (!a.visible) { indoors++; assert.equal(a.u, 0); }
  }
  assert.ok(outbound && returning && staying && indoors);
}

// Interchange transfers: ≤ 2 m/s on the pier, appear/vanish only at the shore end or the boat, and board only while it is docked.
for (let k = 0; k < TRANSFERS; k++) for (let t = 0; t < 120; t += .1) {
  const a = transferPose(t, k), b = transferPose(t + .1, k);
  assert.ok(a.d >= -2 - 1e-9 && a.d <= INTERCHANGE.pier + 3 + 1e-9);
  if (a.visible > 0 && b.visible > 0) assert.ok(Math.hypot(a.d - b.d, a.side - b.side) < .2 + 1e-9, `transfer ${k} jumps at ${t.toFixed(1)}s`);
  if (a.visible < 1 && a.visible > 0) assert.ok(a.d < 2 || (a.d > INTERCHANGE.pier - 1 && dockMotion(t).docked), `transfer ${k} fades mid-pier at ${t.toFixed(1)}s`);
}

// Aircraft slots: the first ten spread over both lanes; wingmen trail their leader; pods replace winged craft as automation rises.
assert.deepEqual([0, 1].map(i => aircraftSlot(i).lane), [0, 1]);
assert.equal(new Set(Array.from({ length: 10 }, (_, i) => aircraftSlot(i).phase + aircraftSlot(i).lane)).size, 10);
assert.ok(aircraftSlot(20).wingman === 2 && aircraftSlot(20).phase === aircraftSlot(0).phase && PLATOON > 22 + 10, 'wingmen keep 10 m clear of a 22 m span');
for (let i = 0; i < 32; i++) { assert.equal(podShare(0, i), 0); assert.equal(podShare(1, i), 1); }
// Every settled hub level (0–6 automated ports) shows whole craft only, with more pods as automation rises.
let pods = -1;
for (let ports = 0; ports <= 6; ports++) {
  const level = automationActivity(ports / 6).level, shares = Array.from({ length: 30 }, (_, i) => podShare(level, i));
  assert.ok(shares.every(v => v === 0 || v === 1), `half-faded craft at ${ports} ports`);
  const n = shares.filter(v => v === 1).length; assert.ok(n >= pods); pods = n;
}

assert.ok(guideStrength(.01, .99, true) > .9);
assert.equal(guideStrength(.01, .99, false), 0);
assert.equal(guideStrength(.5, 0, true), 0);
console.log(`PASS: Odaiba actors — air tiers clear landmarks, sites and beacons, sphere and interchange berths, pod spacing on ${guideLength.toFixed(0)} m of guideway, walker/party/doorway/transfer continuity, street cars on the road and spaced, drop-off bays on paving, day rhythm, benches, ${beacons.length} lane beacons, aircraft slots, guide lights.`);
