// Plan footprints of the P1 megastructures (metres), free of three.js so any module can import them without a cycle.
export const RING = { x: 95, z: -195, centreY: 90, outer: 105, inner: 73, depth: 45, yaw: -2.05 + .8, plinth: [60, 50] as const };
export const ARCH = { a: [-9, -237] as const, b: [58, -5] as const, apex: 135 };
// r2: front base line (-160, 20) to (-330, 95); local +x runs along it toward the left end, +z recedes from the camera. Low left end (3 terraces), 8 at the right end.
export const HULL = { x: -260, z: 64, yaw: .4155, length: 180, depth: 90, steps: 8, step: 15, recede: 9 };

export const rect = (cx: number, cz: number, ux: number, uz: number, hu: number, hv: number) => ({ cx, cz, ux, uz, hu, hv });
/** Hull footprint rectangle, `front` m wider toward the camera and `side` m longer. */
const hullRect = (front: number, side: number) => rect(HULL.x + Math.sin(HULL.yaw) * (HULL.depth - front) / 2, HULL.z + Math.cos(HULL.yaw) * (HULL.depth - front) / 2, Math.cos(HULL.yaw), -Math.sin(HULL.yaw), HULL.length / 2 + side, (HULL.depth + front) / 2);
/** Ground footprints (centre, unit axis, half extents along axis and across it) of what each piece stands on; the test and the carve use them. */
export const groundContacts = () => ({
  ring: rect(RING.x, RING.z, Math.cos(RING.yaw), -Math.sin(RING.yaw), RING.plinth[0] / 2, RING.plinth[1] / 2),
  archFeet: [ARCH.a, ARCH.b].map(f => rect(f[0], f[1], 1, 0, 12.5, 12.5)),
  hull: hullRect(8, 0),
});
/** Context massing under or inside a megastructure's body: the whole hoop's shadow, the arch's span and the hull's footprint. */
export function bodyFootprints() {
  const d = { x: ARCH.b[0] - ARCH.a[0], y: ARCH.b[1] - ARCH.a[1], length: () => Math.hypot(ARCH.b[0] - ARCH.a[0], ARCH.b[1] - ARCH.a[1]) };
  return [
    rect(RING.x, RING.z, Math.cos(RING.yaw), -Math.sin(RING.yaw), RING.outer + 4, RING.depth / 2 + 6),
    rect((ARCH.a[0] + ARCH.b[0]) / 2, (ARCH.a[1] + ARCH.b[1]) / 2, d.x / d.length(), d.y / d.length(), d.length() / 2 + 6, 14),
    hullRect(60, 10),
  ];
}
export const inRect = (r: ReturnType<typeof rect>, x: number, z: number) => { const dx = x - r.cx, dz = z - r.cz; return Math.abs(dx * r.ux + dz * r.uz) <= r.hu && Math.abs(-dx * r.uz + dz * r.ux) <= r.hv; };
/** The one shared footprint list (hoop shadow, arch span, hull); every filter that clears buildings and instances for the megastructures reads this. */
export const FOOTPRINTS = bodyFootprints();
/** True when a point, or a disc of `margin` m around it, touches a megastructure footprint. */
export const inMega = (x: number, z: number, margin = 0) => FOOTPRINTS.some(r => inRect({ ...r, hu: r.hu + margin, hv: r.hv + margin }, x, z));
