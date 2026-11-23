import assert from './assert.ts';
import { Box3 } from 'three';
import { HYDRO_TERRACE, northShore } from '../src/layout.ts';
import { HYDRO_WALK, hydroTerrace } from '../src/hydroTerrace.ts';
import { boatPoses, HULL, routes, WATER_PERIOD } from '../src/mobility.ts';
import { laneBeaconSites, shoreRoomBays } from '../src/waterRooms.ts';
import { energyPrototype } from '../src/energyPrototype.ts';

// Q02-A hydro terrace (fixed background): its 66 m lot and shore walk keep clear of the boats, the shore furniture and water court 1.
const half = HYDRO_TERRACE.lot / 2;
const toLot = (x: number, z: number) => Math.hypot(Math.max(Math.abs(x - HYDRO_TERRACE.x) - half, 0), Math.max(Math.abs(z - HYDRO_TERRACE.z) - half, 0));

const path = routes(), boatRadius = Math.hypot(HULL.x, HULL.stern);
for (let t = 0; t < WATER_PERIOD; t += .25) for (const boat of boatPoses(t, path)) {
  if (boat.scale < .05) continue;
  assert.ok(toLot(boat.x, boat.z) - boatRadius * boat.scale > 10, `boat at ${t}s comes within 10 m of the hydro terrace`);
}
for (const room of shoreRoomBays()) assert.ok(toLot(room.x, room.z) > room.r + 12, `water room at ${room.x.toFixed(0)},${room.z.toFixed(0)} meets the hydro lot`);
for (const [x, z] of laneBeaconSites()) assert.ok(toLot(x, z) > 12, `lane beacon at ${x.toFixed(0)},${z.toFixed(0)} meets the hydro lot`);
assert.ok(laneBeaconSites().length >= 4);

// Walk: starts on the island, ends on the north revetment line, and stays 5 m clear of the tidal islets, pavilions, beacons and water court 1.
const [ax, , az] = HYDRO_WALK.from, [bx, , bz] = HYDRO_WALK.to;
assert.ok(toLot(ax, az) === 0, 'walk starts on the island');
const onShore = northShore.slice(0, -1).some(([px, pz], i) => {
  const [qx, qz] = northShore[i + 1], dx = qx - px, dz = qz - pz, u = Math.max(0, Math.min(1, ((bx - px) * dx + (bz - pz) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px + dx * u - bx, pz + dz * u - bz) < .5;
});
assert.ok(onShore, 'walk lands on the north revetment');
const energy = energyPrototype();
const court = new Box3().setFromObject(energy.parts.garden);
const obstacles: { x: number; z: number; r: number; name: string }[] = [
  ...laneBeaconSites().map(([x, z]) => ({ x, z, r: 2, name: 'beacon' })),
  ...shoreRoomBays().map(room => ({ x: room.x, z: room.z, r: room.r, name: 'water room' })),
];
// Tidal-edge islets and pavilions (amphibiousShore chunks 7k+3 and 4k+1), as circles round their plan rectangles.
let chunk = 0;
for (let i = 0; i < northShore.length - 1; i++) {
  const [px, pz] = northShore[i], [qx, qz] = northShore[i + 1], n = Math.ceil(Math.hypot(qx - px, qz - pz) / 12), yaw = Math.atan2(qx - px, qz - pz);
  for (let k = 0; k < n; k++, chunk++) {
    const t = (k + .5) / n, x = px + (qx - px) * t, z = pz + (qz - pz) * t;
    if (chunk % 7 === 3) obstacles.push({ x: x - 24 * Math.cos(yaw), z: z + 24 * Math.sin(yaw), r: Math.hypot(4.5, 8), name: 'islet' });
    if (chunk % 4 === 1) obstacles.push({ x: x - 5 * Math.cos(yaw), z: z + 5 * Math.sin(yaw), r: Math.hypot(3.8, 5.2), name: 'pavilion' });
  }
}
for (let i = 0; i <= 200; i++) {
  const x = ax + (bx - ax) * i / 200, z = az + (bz - az) * i / 200, edge = HYDRO_WALK.width / 2;
  for (const o of obstacles) assert.ok(Math.hypot(o.x - x, o.z - z) - o.r - edge > 5, `walk passes within 5 m of a ${o.name} at ${x.toFixed(0)},${z.toFixed(0)}`);
  const dx = Math.max(court.min.x - x, 0, x - court.max.x), dz = Math.max(court.min.z - z, 0, z - court.max.z);
  assert.ok(Math.hypot(dx, dz) - edge > 5, 'walk passes water court 1');
}

// The island and walk build without a browser (the GLB loads only in the page).
const root = hydroTerrace(), bounds = new Box3().setFromObject(root);
assert.ok(bounds.min.y < -.8 && bounds.max.y < 3, 'revetment reaches below the bay and the island deck stays low');
console.log(`Hydro terrace: lot clear of every boat (≥ 10 m), water rooms and beacons; ${Math.hypot(bx - ax, bz - az).toFixed(0)} m walk lands on the revetment clear of the tidal islets and water court 1.`);
