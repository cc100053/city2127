import { DISTRICT, northShore } from './layout.ts';
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
