import * as T from 'three';
import { DISTRICT, INTERCHANGE, northShore, shoreLaneInner } from './layout.ts';
import { routes } from './mobility.ts';

/** Water rooms along the north shore (user decision 2026-10-01: six, evenly spread, so the shore stays calm). */
const ROOMS = 6;
/** Shared positions for the planted water rooms and their v2 privacy / commons layer. */
export function shoreRoomBays() {
  const bays: { sx: number; sz: number; x: number; z: number; yaw: number; r: number }[] = [];
  const boats = [routes().water, routes().ferry].flatMap(route => route.getSpacedPoints(300));
  let n = 0;
  for (let i = 0; i < northShore.length - 1; i++) {
    const [ax, az] = northShore[i], [bx, bz] = northShore[i + 1], length = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az);
    for (let d = 22; d < length; d += 46) {
      const t = d / length, sx = ax + (bx - ax) * t, sz = az + (bz - az) * t;
      // Local -X faces the sea (as in tidalEdge); the terrace centre sits OUT m out, clear of the tidal islets (to 28.5 m).
      const r = 12.5 + (n % 3) * 2, OUT = 46, cx = sx - Math.cos(yaw) * OUT, cz = sz + Math.sin(yaw) * OUT;
      if (cx < DISTRICT.minX || cx > 250 || cz > DISTRICT.maxZ || boats.some(p => Math.hypot(p.x - cx, p.z - cz) < r + 24)) continue;
      bays.push({ sx, sz, x: cx, z: cz, yaw, r }); n++;
    }
  }
  return Array.from({ length: ROOMS }, (_, i) => bays[Math.round(i * (bays.length - 1) / (ROOMS - 1))]);
}
/** Shore-lane beacon pylons: in the water under the lane's inbound leg (80 m), clear of the water rooms, the interchange and every boat route. */
export function laneBeaconSites() {
  const path = routes(), inner = new T.CatmullRomCurve3(shoreLaneInner.map(p => new T.Vector3(...p)), false, 'centripetal');
  const rooms = shoreRoomBays(), boats = [path.water, path.ferry, path.ixBoat].flatMap(route => route.getSpacedPoints(300));
  const clear = (x: number, z: number) => rooms.every(r => Math.hypot(r.x - x, r.z - z) > r.r + 16)
    && Math.hypot(INTERCHANGE.mast[0] - x, INTERCHANGE.mast[2] - z) > 40 && boats.every(p => Math.hypot(p.x - x, p.z - z) > 30);
  return inner.getSpacedPoints(10).slice(1, -1).filter(p => clear(p.x, p.z)).map(p => [p.x, p.z] as const);
}
