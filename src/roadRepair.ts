// Road redesign (docs/handoffs/road-redesign.md): the district's Phase 03D street layer predates the 2127 buildings and the street kit that
// replaces it (src/streetKit.ts, network stages 1–2), so every surveyed street inside `DISTRICT` goes; the backdrop roads beyond stay.
// Runs on the loaded environment before anything samples its ground (planting, doorways, paving checks).
import * as T from 'three';
import { DISTRICT } from './layout.ts';
import { inRect, rect } from './megaFootprints.ts';

/** A landmark's footprint as the layout gives it (Blender bounds: x, y north). */
type Landmark = { id: string; boundsBlender: readonly (readonly number[])[] };
/** Old street paving within this many metres of a built landmark's footprint stays as its forecourt (doorway walks and groups stand on it;
 * the network sketch's lawn / footpaths). */
const APRON = 14;

/** 4 m cells (x, z) the removed street ground covered, so groves keep the old streets as open lawn (`onFormerStreet`). */
const formerStreets = new Set<string>(), CELL = 4, cellOf = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
export const onFormerStreet = (x: number, z: number) => formerStreets.has(cellOf(x, z));

const clip = (poly: T.Vector3[], keep: (v: T.Vector3) => number) => {
  const out: T.Vector3[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length], ka = keep(a), kb = keep(b);
    if (ka >= 0) out.push(a);
    if ((ka >= 0) !== (kb >= 0)) out.push(a.clone().lerp(b, ka / (ka - kb)));
  });
  return out;
};
/** The convex piece of `poly` inside rectangle `r` (none: fewer than 3 points). */
function within(poly: T.Vector3[], r: ReturnType<typeof rect>) {
  const u = (v: T.Vector3) => (v.x - r.cx) * r.ux + (v.z - r.cz) * r.uz, w = (v: T.Vector3) => -(v.x - r.cx) * r.uz + (v.z - r.cz) * r.ux;
  return [(v: T.Vector3) => r.hu - u(v), (v: T.Vector3) => r.hu + u(v), (v: T.Vector3) => r.hv - w(v), (v: T.Vector3) => r.hv + w(v)].reduce((p, side) => p.length < 3 ? p : clip(p, side), poly);
}
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

/** Records the 4 m cells whose centres lie in triangle `t` and inside the district. */
function mark(t: T.Vector3[]) {
  const [a, b, c] = t, side = (p: T.Vector3, q: T.Vector3, x: number, z: number) => (q.x - p.x) * (z - p.z) - (q.z - p.z) * (x - p.x);
  const x0 = Math.max(Math.min(a.x, b.x, c.x), DISTRICT.minX), x1 = Math.min(Math.max(a.x, b.x, c.x), DISTRICT.maxX), z0 = Math.max(Math.min(a.z, b.z, c.z), DISTRICT.minZ), z1 = Math.min(Math.max(a.z, b.z, c.z), DISTRICT.maxZ);
  for (let x = (Math.floor(x0 / CELL) + .5) * CELL; x < x1 + CELL / 2; x += CELL) for (let z = (Math.floor(z0 / CELL) + .5) * CELL; z < z1 + CELL / 2; z += CELL) {
    const s1 = side(a, b, x, z), s2 = side(b, c, x, z), s3 = side(c, a, x, z);
    if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) formerStreets.add(cellOf(x, z));
  }
}
/** Removes the district's surveyed streets: road, markings and paving clipped exactly at the district edge, furniture by whole triangles centred
 * inside; paving stays on the forecourts of `landmarks` (those built in the district). */
export function repairRoads(environment: T.Object3D, landmarks: readonly Landmark[] = []) {
  // Seven driveway stubs: the six in the district join no street (audit 2, 3, 7, 8, 19, 21, 23, 28, 30–34); the seventh lies 1.1 km south in the receded backdrop.
  environment.getObjectByName('ROAD_ACCESS')?.removeFromParent();
  const district = rect((DISTRICT.minX + DISTRICT.maxX) / 2, (DISTRICT.minZ + DISTRICT.maxZ) / 2, 1, 0, (DISTRICT.maxX - DISTRICT.minX) / 2, (DISTRICT.maxZ - DISTRICT.minZ) / 2);
  const keep = landmarks.map(({ boundsBlender: [min, max] }) => rect((min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, 1, 0, (max[0] - min[0]) / 2 + APRON, (max[1] - min[1]) / 2 + APRON));
  environment.updateMatrixWorld(true);
  environment.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const flat = /^(ROAD_(MAJOR|SECONDARY)|MAJOR_ROAD_MARKINGS|SIDEWALK_NETWORK)$/.test(object.name), furniture = /^(PHASE03D_GUARDRAILS|STREETLIGHT_INSTANCES|PUBLIC_LIGHTING)$/.test(object.name);
    if (!flat && !furniture) return;
    const g = object.geometry as T.BufferGeometry, p = g.attributes.position, index = g.index, n = index?.count ?? p.count, at = (i: number) => index ? index.getX(i) : i;
    const local = object.matrixWorld.clone().invert(), kept: number[] = [], out: number[] = [];
    let changed = false;
    for (let i = 0; i < n; i += 3) {
      const tri = [0, 1, 2].map(j => new T.Vector3().fromBufferAttribute(p, at(i + j)).applyMatrix4(object.matrixWorld));
      if (furniture) {
        if (inRect(district, (tri[0].x + tri[1].x + tri[2].x) / 3, (tri[0].z + tri[1].z + tri[2].z) / 3)) changed = true;
        else kept.push(at(i), at(i + 1), at(i + 2));
        continue;
      }
      const pieces = outside(tri, district);
      if (object.name === 'SIDEWALK_NETWORK') { // the forecourts' share of the part inside, each piece once where aprons overlap
        let rest = [within(tri, district)].filter(q => q.length > 2);
        for (const k of keep) { pieces.push(...rest.map(q => within(q, k)).filter(q => q.length > 2)); rest = rest.flatMap(q => outside(q, k)); }
      }
      if (pieces.length !== 1 || pieces[0].some((v, j) => v !== tri[j])) { changed = true; mark(tri); } // a kept corner is the same vector
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
}
