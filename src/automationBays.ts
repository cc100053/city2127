import { changeSites } from './layout.ts';
import { inCivic, inHeroClear } from './megaFootprints.ts';
import { routes } from './mobility.ts';

/** R3 (owner 2026-11-03): every bay design is built in R2 metres and scaled by this about its foot, so the bays read as large as the target images. People scale with them. */
export const BAY_SCALE = 2;
/** Distance of a promenade bay's centre from its route: the 2x plinth (half depth 18 m) plus the route's 3 m walker guard. */
const BAY_OFFSET = 22;
/** Per-bay R3 placement found by searching the real city (tests/odaiba.test.ts footprint, terrace and route checks): bay 0 slides 20 m along its route and 6 m away from it;
 * bay 1 only clears at 1.6x. Everything else keeps the shared 2x. */
const BAY_ALONG_BACK: Record<number, readonly [number, number]> = { 0: [-20, 6] };
const BAY_SCALE_OVERRIDES: Record<number, number> = { 1: 1.6 };
/** The staffed pavilion's plinth (24 x 18 before scaling), the largest footprint a bay design stands on. */
export const BAY_PLINTH = { halfX: 12, halfZ: 9 } as const;

export interface AutomationBay { x: number; y: number; z: number; yaw: number }

/** Bay frame: +X along the route, +Z towards it. Shared by `AutomationDistrict` and the planting that keeps trees off the plinths. */
export function automationBays(): { bays: AutomationBay[]; scales: number[] } {
  const bays: AutomationBay[] = [];
  for (const path of routes().promenades) {
    const n = Math.floor(path.getLength() / 40);
    for (let i = 1; i < n; i++) {
      const p = path.getPointAt(i / n), t = path.getTangentAt(i / n), yaw = Math.atan2(-t.z, t.x);
      p.x -= Math.sin(yaw) * BAY_OFFSET; p.z -= Math.cos(yaw) * BAY_OFFSET;
      if (Object.values(changeSites).some(s => Math.abs(p.x - s.x) < s.w * s.scale / 2 + 24 && Math.abs(p.z - s.z) < s.d * s.scale / 2 + 24)) continue;
      if (p.x > -65 && p.x < -25) continue; // Existing north-west context block.
      if (inHeroClear(p.x, p.z)) continue; // polish2: the plaza deck's hero apron stays open
      const [along, back] = BAY_ALONG_BACK[bays.length] ?? [0, 0];
      bays.push({ x: p.x + along * Math.cos(yaw) - back * Math.sin(yaw), y: p.y, z: p.z - along * Math.sin(yaw) - back * Math.cos(yaw), yaw });
    }
  }
  // Traced open plazas at the mall approaches and western waterfront (actual-mesh checks in odaiba.test.ts), each re-searched in R3 for the 2x
  // footprint (4-6 m moves). The second plaza sits 12 m off its old centre: a 14 m guideway deck cuts diagonally through it and the plinth must stay 3 m clear.
  // The third moved 15 m north in street network stage 2 (from -130, 170), its plinth 15 m clear of the ④ boulevard's centreline (raster search).
  for (const [x, z, yaw] of [[20, 145, 0], [-184, 92, 0], [-124, 156, 0], [75, -166, 0], [-440.5, 41.9, -.9]])
    if (!inCivic(x, z, 33)) bays.push({ x, y: 0, z, yaw }); // polish2: the mall approach bay sits under the enlarged Fuji frame
  return { bays, scales: bays.map((_, i) => BAY_SCALE_OVERRIDES[i] ?? BAY_SCALE) };
}

let placed: ReturnType<typeof automationBays> | undefined;
/** Whether ground point (x, z) stands inside a bay's plinth, `margin` metres out. */
export function onBayPlinth(x: number, z: number, margin = 0): boolean {
  const { bays, scales } = placed ??= automationBays();
  return bays.some((bay, i) => {
    const dx = x - bay.x, dz = z - bay.z, c = Math.cos(bay.yaw), s = Math.sin(bay.yaw), k = scales[i];
    return Math.abs(dx * c - dz * s) < BAY_PLINTH.halfX * k + margin && Math.abs(dx * s + dz * c) < BAY_PLINTH.halfZ * k + margin;
  });
}
