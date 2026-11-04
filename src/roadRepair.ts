// Road audit (2026-11-04, docs/handoffs/road-audit.md): the Phase 03D street layer predates the 2127 buildings. Streets a building now
// stands on go, so do the isolated access stubs, and the north-west avenue's unpaved gap is closed.
// Runs on the loaded environment before anything samples its ground (planting, doorways, paving checks).
import * as T from 'three';
import { inRect, rect } from './megaFootprints.ts';

/** Centreline a→b and half width, metres. */
type Strip = readonly [ax: number, az: number, bx: number, bz: number, half: number];
const zone = ([ax, az, bx, bz, half]: Strip) => { const l = Math.hypot(bx - ax, bz - az); return rect((ax + bx) / 2, (az + bz) / 2, (bx - ax) / l, (bz - az) / l, l / 2, half); };

/** Removed street (road, its 9 m paving and furniture); the first two stop 4.6 m short of a kept avenue's centreline so that avenue stays whole. */
export const ROAD_CUTS: readonly Strip[] = [
  [-262.1, -44.1, -201.5, 47.2, 4.6], // under the floater assembly and the plaza deck's west wing (audit 13, 14, 16)
  [29.8, -238.2, 88.2, -149.2, 4.6], // under the membrane housing and the ring's plinth (audit 4, 5); stops 7.5 m short of the street-car junction
  // Reroutes (owner 2026-11-04): streets end at the megastructure standing on them (clearance under 1 m); through traffic takes the parallel
  // avenues. The Fuji frame keeps its roads: they pass under its 2.5–3.5 m deck, and its two leg cores stand on paving.
  [-327.7, 144.8, -154.3, 68.2, 45.4], // guideway avenue and 269 under the hull; street cars now end short of it (audit 20)
  [106, -135.8, 133.4, -153.3, 4.6], // 296's first 32 m under the ring's foot; street cars keep the major lane beside it (audit 6)
  [106.45, -136.05, 110.5, -130.9, 4.6], // 264's first 6.5 m, same foot
];
/** New paving: the six-way junction under the guideway (about 100, −138) has a lawn island where its medians meet; paving covers it up to the
 * ring's foot. (Audit 9's link on the north-west avenue went with that avenue in the street network's stage 1, src/streetKit.ts.) */
export const ROAD_LINKS: readonly Strip[] = [[91, -133, 106, -137.5, 5]];
const ROAD_HALF = 2.45;

const clip = (poly: T.Vector3[], keep: (v: T.Vector3) => number) => {
  const out: T.Vector3[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length], ka = keep(a), kb = keep(b);
    if (ka >= 0) out.push(a);
    if ((ka >= 0) !== (kb >= 0)) out.push(a.clone().lerp(b, ka / (ka - kb)));
  });
  return out;
};
/** Convex pieces of `poly` outside rectangle `r`: outside each side in turn, inside the sides already used. */
function outside(poly: T.Vector3[], r: ReturnType<typeof rect>) {
  const u = (v: T.Vector3) => (v.x - r.cx) * r.ux + (v.z - r.cz) * r.uz, w = (v: T.Vector3) => -(v.x - r.cx) * r.uz + (v.z - r.cz) * r.ux;
  const pieces: T.Vector3[][] = [];
  let rest = poly;
  for (const side of [(v: T.Vector3) => u(v) - r.hu, (v: T.Vector3) => -u(v) - r.hu, (v: T.Vector3) => w(v) - r.hv, (v: T.Vector3) => -w(v) - r.hv]) {
    const piece = clip(rest, side);
    if (piece.length > 2) pieces.push(piece);
    rest = clip(rest, v => -side(v));
    if (rest.length < 3) break;
  }
  return pieces;
}

/** `extra` cuts (the street kit's `streetCuts`, the DEV boulevard preview) clip like `ROAD_CUTS`. */
export function repairRoads(environment: T.Object3D, extra: readonly Strip[] = []) {
  // Seven driveway stubs: the six in the district join no street (audit 2, 3, 7, 8, 19, 21, 23, 28, 30–34); the seventh lies 1.1 km south in the receded backdrop.
  environment.getObjectByName('ROAD_ACCESS')?.removeFromParent();
  const zones = [...ROAD_CUTS, ...extra].map(zone), reach = zones.map(z => Math.hypot(z.hu, z.hv));
  environment.updateMatrixWorld(true);
  let road: T.Material | undefined, paving: T.Material | undefined;
  environment.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    if (object.name === 'ROAD_SECONDARY') road = object.material;
    if (object.name === 'SIDEWALK_NETWORK') paving = object.material;
    // Flat finishes are clipped exactly; furniture loses whole triangles centred inside, as carveContext does.
    const flat = /^(ROAD_(MAJOR|SECONDARY)|MAJOR_ROAD_MARKINGS|SIDEWALK_NETWORK)$/.test(object.name), furniture = /^(PHASE03D_GUARDRAILS|STREETLIGHT_INSTANCES|PUBLIC_LIGHTING)$/.test(object.name);
    if (!flat && !furniture) return;
    const g = object.geometry as T.BufferGeometry, p = g.attributes.position, index = g.index, n = index?.count ?? p.count, at = (i: number) => index ? index.getX(i) : i;
    const local = object.matrixWorld.clone().invert(), kept: number[] = [], out: number[] = [];
    let changed = false;
    for (let i = 0; i < n; i += 3) {
      const tri = [0, 1, 2].map(j => new T.Vector3().fromBufferAttribute(p, at(i + j)).applyMatrix4(object.matrixWorld));
      if (furniture) {
        if (zones.some(z => inRect(z, (tri[0].x + tri[1].x + tri[2].x) / 3, (tri[0].z + tri[1].z + tri[2].z) / 3))) changed = true;
        else kept.push(at(i), at(i + 1), at(i + 2));
        continue;
      }
      let pieces = [tri];
      const cx = (tri[0].x + tri[1].x + tri[2].x) / 3, cz = (tri[0].z + tri[1].z + tri[2].z) / 3, r = Math.max(...tri.map(v => Math.hypot(v.x - cx, v.z - cz)));
      zones.forEach((z, k) => { if (Math.hypot(z.cx - cx, z.cz - cz) < reach[k] + r) pieces = pieces.flatMap(poly => outside(poly, z)); });
      if (pieces.length !== 1 || pieces[0].length !== 3) changed = true;
      for (const poly of pieces) for (let k = 1; k < poly.length - 1; k++) {
        const [a, b, c] = [poly[0], poly[k], poly[k + 1]];
        // Slivers left on a cut edge: under 5 cm from the longest side to the opposite corner.
        const twice = Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z));
        if (twice < .05 * Math.max(Math.hypot(b.x - a.x, b.z - a.z), Math.hypot(c.x - b.x, c.z - b.z), Math.hypot(a.x - c.x, a.z - c.z))) continue;
        for (const v of [a, b, c]) out.push(...v.clone().applyMatrix4(local).toArray());
      }
    }
    if (!changed) return;
    if (furniture) { g.setIndex(kept); return; }
    const next = new T.BufferGeometry();
    next.setAttribute('position', new T.Float32BufferAttribute(out, 3));
    next.computeVertexNormals();
    object.geometry = next; g.dispose();
  });
  // Paving stands 10 cm over the road as in the source strips, so the same depth layering applies.
  for (const [ax, az, bx, bz, half] of ROAD_LINKS) for (const [material, w, y, name] of [[road, ROAD_HALF, .07, 'ROAD_LINK'], [paving, half, .17, 'SIDEWALK_LINK']] as const) {
    if (!material) continue;
    const l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l * w, nz = (bx - ax) / l * w, strip = new T.BufferGeometry();
    strip.setAttribute('position', new T.Float32BufferAttribute([ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz], 3));
    strip.setIndex([0, 2, 1, 1, 2, 3]); strip.computeVertexNormals();
    const mesh = new T.Mesh(strip, material); mesh.name = name; mesh.receiveShadow = true; environment.add(mesh);
  }
}
