// Road redesign (docs/handoffs/archive/road-redesign.md): the district's Phase 03D street layer predates the 2127 buildings and the street kit that
// replaces it (src/streetKit.ts, network stages 1–2), so every surveyed street inside `DISTRICT` goes; beyond it only `BACKDROP_STREETS` stay.
// Runs on the loaded environment before anything samples its ground (planting, doorways, paving checks).
import * as T from 'three';
import { DISTRICT } from './layout.ts';
import { inMega, inRect, rect } from './megaFootprints.ts';

/** A landmark's footprint as the layout gives it (Blender bounds: x, y north). */
type Landmark = { id: string; boundsBlender: readonly (readonly number[])[] };
/** Old street paving within this many metres of a built landmark's footprint stays as its forecourt (doorway walks and groups stand on it;
 * the network sketch's lawn / footpaths). */
const APRON = 14;

/** Backdrop streets kept beyond the district (road fix B1-a, owner 2026-11-20): only the surveyed roads that carry the 2127 streets and the
 * farm walk on into the haze stay; every other surveyed street beyond the edge goes (it ran under context blocks and stopped at the cut).
 * Each is a run of a surveyed road from the district edge to its end, [from, to, half width] in metres (x, z). */
export const BACKDROP_STREETS: readonly (readonly [readonly [number, number], readonly [number, number], number])[] = [
  [[260.7, -254.2], [508.1, -404.9], 16], // the U's guideway avenue ② north-east (carriageway and footways)
  [[-262, 372], [196.8, 1069], 14], // the walk past the rectenna farm (its gravel meets it) south to the plate's end
];
/** The surveyed ~90 m band ④ leaves by is a bundle of lanes that each stop somewhere else, so each of ④'s ends runs on instead as a plain
 * 24 m street (18 m carriageway, 3 m footways) along the band's axis, ending in a turning circle short of the plate's edge; a short link joins
 * the kept farm walk to the south-west run where the band used to. [exit (x, z), unit heading, length, half carriageway, footway, circle]. */
export const BACKDROP_RUNS: readonly (readonly [readonly [number, number], readonly [number, number], number, number, number, boolean])[] = [
  [[265, -27], [.813, -.583], 460, 9, 3, true],  // ④ east
  [[-285, 322.4], [-.729, .685], 265, 9, 3, true], // ④ south-west, stopping short of the context blocks that stand 280 m out
  [[-262, 362], [-.6, -.8], 40, 4, 3, false], // the farm walk's north end onto the south-west run
];
const backdropSides = BACKDROP_STREETS.map(([[ax, az], [bx, bz], half]) => {
  const length = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / length, uz = (bz - az) / length;
  return rectSides(rect((ax + bx) / 2, (az + bz) / 2, ux, uz, length / 2 + 20, half)); // 20 m back over the edge, so each run starts at the cut
});
/** Flat strip `from` → `from + heading · length`, between `left` and `right` m across it (left of the heading is +), `y` m up. */
function strip([x, z]: readonly [number, number], [ux, uz]: readonly [number, number], length: number, left: number, right: number, y: number) {
  const corner = (along: number, across: number) => [x + ux * along - uz * across, y, z + uz * along + ux * across];
  const a = corner(0, left), b = corner(0, right), c = corner(length, right), d = corner(length, left);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) g.setAttribute('position', new T.Float32BufferAttribute([...a, ...c, ...b, ...a, ...d, ...c], 3));
  g.computeVertexNormals();
  return g;
}
/** True where a kept backdrop street runs. */
const onBackdropStreet = (x: number, z: number) => backdropSides.some(sides => sides.every(side => side(new T.Vector3(x, 0, z)) <= 0));

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
function rectSides(r: ReturnType<typeof rect>) {
  const u = (v: T.Vector3) => (v.x - r.cx) * r.ux + (v.z - r.cz) * r.uz, w = (v: T.Vector3) => -(v.x - r.cx) * r.uz + (v.z - r.cz) * r.ux;
  return [(v: T.Vector3) => u(v) - r.hu, (v: T.Vector3) => -u(v) - r.hu, (v: T.Vector3) => w(v) - r.hv, (v: T.Vector3) => -w(v) - r.hv];
}
/** The convex piece of `poly` inside the rectangle (none: fewer than 3 points). */
function within(poly: T.Vector3[], sides: ReturnType<typeof rectSides>) {
  return sides.reduce((p, side) => p.length < 3 ? p : clip(p, v => -side(v)), poly);
}
/** Convex pieces of `poly` outside a cut, each taken after the preceding sides. */
function outside(poly: T.Vector3[], sides: ((v: T.Vector3) => number)[]) {
  const pieces: T.Vector3[][] = [];
  let rest = poly;
  for (const side of sides) {
    const piece = clip(rest, side);
    if (piece.length > 2) pieces.push(piece);
    rest = clip(rest, v => -side(v));
    if (rest.length < 3) break;
  }
  return pieces;
}

/** Drops the flat Yurikamome refinement strips between 3 and 12 m whose centre lies within 30 m of a megastructure footprint. */
function stationWalk(mesh: T.Mesh) {
  const g = mesh.geometry as T.BufferGeometry, p = g.attributes.position, index = g.index, n = index?.count ?? p.count, at = (i: number) => index ? index.getX(i) : i, kept: number[] = [];
  for (let i = 0; i < n; i += 3) {
    const tri = [0, 1, 2].map(j => new T.Vector3().fromBufferAttribute(p, at(i + j)).applyMatrix4(mesh.matrixWorld));
    const ys = tri.map(v => v.y), flat = Math.max(...ys) - Math.min(...ys) < .05 && ys[0] > 3 && ys[0] < 12;
    if (!(flat && inMega((tri[0].x + tri[1].x + tri[2].x) / 3, (tri[0].z + tri[1].z + tri[2].z) / 3, 30))) kept.push(at(i), at(i + 1), at(i + 2));
  }
  if (kept.length !== n) g.setIndex(kept);
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
 * inside; paving stays on the forecourts of `landmarks` (those built in the district). Road fix (owner 2026-11-20): the surveyed ground slabs
 * (building pads, plazas and their accents, service yards and bay markings) go too wherever nothing they belonged to still stands: inside the
 * district they stay only under a built landmark (the Fuji frame stands on its own pads; the old Fuji TV pad left only shards between
 * its legs); beyond it pads stay under the context
 * blocks while plazas and yards go. The old 7 m link bridges inside the district, which no longer join anything, go whole. Every Meter site,
 * housing lot and energy building stands on its own ground, so none of them loses a slab. */
export function repairRoads(environment: T.Object3D, landmarks: readonly Landmark[] = []) {
  // Seven driveway stubs: the six in the district join no street (audit 2, 3, 7, 8, 19, 21, 23, 28, 30–34); the seventh lies 1.1 km south in the receded backdrop.
  environment.getObjectByName('ROAD_ACCESS')?.removeFromParent();
  const district = rect((DISTRICT.minX + DISTRICT.maxX) / 2, (DISTRICT.minZ + DISTRICT.maxZ) / 2, 1, 0, (DISTRICT.maxX - DISTRICT.minX) / 2, (DISTRICT.maxZ - DISTRICT.minZ) / 2);
  const districtSides = rectSides(district);
  // Shave the farm-facing apron only. Oblique end cuts taper it back into the surveyed walk.
  const farmSides = [(v: T.Vector3) => -230 + .60 * (v.z - 408) - v.x,
    (v: T.Vector3) => 381 - v.z - .65 * (v.x + 246), (v: T.Vector3) => v.z - 455 - (v.x + 202), (v: T.Vector3) => v.x + 170];
  const footprints = landmarks.map(({ boundsBlender: [min, max] }) => rect((min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, 1, 0, (max[0] - min[0]) / 2, (max[1] - min[1]) / 2));
  const grown = (r: ReturnType<typeof rect>, by: number) => rectSides({ ...r, hu: r.hu + by, hv: r.hv + by });
  const underLandmark = footprints.map(r => grown(r, 2)), nearLandmark = footprints.map(r => grown(r, 3));
  const keep = landmarks.map(({ boundsBlender: [min, max] }) => rect((min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, 1, 0, (max[0] - min[0]) / 2 + APRON, (max[1] - min[1]) / 2 + APRON)).map(rectSides);
  environment.updateMatrixWorld(true);
  environment.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const farmApron = object.name === 'SIDEWALK_NETWORK' || object.name === 'ROAD_SECONDARY';
    const flat = /^(ROAD_(MAJOR|SECONDARY)|MAJOR_ROAD_MARKINGS|SIDEWALK_NETWORK)$/.test(object.name), furniture = /^(PHASE03D_GUARDRAILS|STREETLIGHT_INSTANCES|PUBLIC_LIGHTING)$/.test(object.name);
    // The station's 8 m walkway strip ran out of the hull's sides to nothing once the hull stood over it (owner 2026-11-20): flat Yurikamome
    // detail between 3 and 12 m near a megastructure goes; the 14.2 m deck and the station platforms stay.
    if (object.name === 'YURIKAMOME_PHASE03C_REFINEMENT_Mesh') { stationWalk(object); return; }
    const slab = /^(BUILDING_PADS|PHASE03C_PLAZA|PRIMARY_PLAZA_ACCENTS|PHASE03C_SERVICE_AREA|SERVICE_BAY_MARKINGS)$/.test(object.name), bridge = object.name === 'PUBLIC_LINK_BRIDGES';
    if (!flat && !furniture && !slab && !bridge) return;
    const g = object.geometry as T.BufferGeometry, p = g.attributes.position, index = g.index, n = index?.count ?? p.count, at = (i: number) => index ? index.getX(i) : i;
    const local = object.matrixWorld.clone().invert(), kept: number[] = [], out: number[] = [];
    let changed = false;
    for (let i = 0; i < n; i += 3) {
      const tri = [0, 1, 2].map(j => new T.Vector3().fromBufferAttribute(p, at(i + j)).applyMatrix4(object.matrixWorld));
      if (furniture || bridge) {
        const x = (tri[0].x + tri[1].x + tri[2].x) / 3, z = (tri[0].z + tri[1].z + tri[2].z) / 3;
        if (inRect(district, x, z) || (furniture && !onBackdropStreet(x, z))) changed = true;
        else kept.push(at(i), at(i + 1), at(i + 2));
        continue;
      }
      if (slab) { // each piece once where the kept areas overlap
        const pieces = object.name === 'BUILDING_PADS' ? outside(tri, districtSides) : [];
        let rest = [within(tri, districtSides)].filter(q => q.length > 2);
        for (const sides of underLandmark) { pieces.push(...rest.map(q => within(q, sides)).filter(q => q.length > 2)); rest = rest.flatMap(q => outside(q, sides)); }
        if (pieces.length !== 1 || pieces[0].some((v, j) => v !== tri[j])) { changed = true; mark(tri); }
        emit(pieces); continue;
      }
      // Beyond the edge only the kept backdrop streets stay, each piece once where two runs overlap.
      let pieces: T.Vector3[][] = [], beyond = outside(tri, districtSides);
      for (const sides of backdropSides) { pieces.push(...beyond.map(q => within(q, sides)).filter(q => q.length > 2)); beyond = beyond.flatMap(q => outside(q, sides)); }
      if (object.name === 'SIDEWALK_NETWORK') { // the forecourts' share of the part inside, each piece once where aprons overlap
        let rest = [within(tri, districtSides)].filter(q => q.length > 2);
        for (const [k, sides] of keep.entries()) {
          // Apron pieces that do not reach the building (corners of the apron square left on the far side of a cut) go with the street.
          const touches = (q: T.Vector3[]) => q.some(v => nearLandmark[k].every(side => side(v) <= 0));
          pieces.push(...rest.map(q => within(q, sides)).filter(q => q.length > 2 && touches(q))); rest = rest.flatMap(q => outside(q, sides));
        }
      }
      if (farmApron && tri.some(v => v.z > 340) && tri.some(v => v.z < 497) && tri.some(v => v.x > -260) && tri.some(v => v.x < -170)) pieces = pieces.flatMap(p => outside(p, farmSides));
      if (pieces.length !== 1 || pieces[0].some((v, j) => v !== tri[j])) { changed = true; mark(tri); } // a kept corner is the same vector
      emit(pieces);
    }
    function emit(pieces: T.Vector3[][]) {
      for (const poly of pieces) for (let k = 1; k < poly.length - 1; k++) {
        const [a, b, c] = [poly[0], poly[k], poly[k + 1]];
        // Slivers left on a cut edge: under 5 cm from the longest side to the opposite corner.
        const twice = Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z));
        if (twice < .05 * Math.max(Math.hypot(b.x - a.x, b.z - a.z), Math.hypot(c.x - b.x, c.z - b.z), Math.hypot(a.x - c.x, a.z - c.z))) continue;
        for (const v of [a, b, c]) out.push(...v.clone().applyMatrix4(local).toArray());
      }
    }
    if (!changed) return;
    if (furniture || bridge) { g.setIndex(kept); return; }
    const next = new T.BufferGeometry();
    next.setAttribute('position', new T.Float32BufferAttribute(out, 3));
    next.computeVertexNormals();
    object.geometry = next; g.dispose();
  });
  const road = environment.getObjectByName('ROAD_MAJOR'), walk = environment.getObjectByName('SIDEWALK_NETWORK');
  if (road instanceof T.Mesh && walk instanceof T.Mesh) for (const [from, heading, length, half, footway, circle] of BACKDROP_RUNS) {
    const carriageway = [new T.Mesh(strip(from, heading, length, half, -half, .02), road.material)];
    const footways = [half, -half - footway].map(left => new T.Mesh(strip(from, heading, length, left + footway, left, .14), walk.material));
    if (circle) { // turning circle at the far end: carriageway disc, footway ring
      const [x, z] = [from[0] + heading[0] * length, from[1] + heading[1] * length], r = half + footway + 3;
      const disc = new T.Mesh(new T.CircleGeometry(r - footway, 40).rotateX(-Math.PI / 2).translate(x, .02, z), road.material);
      const ring = new T.Mesh(new T.RingGeometry(r - footway, r, 40).rotateX(-Math.PI / 2).translate(x, .14, z), walk.material);
      carriageway.push(disc); footways.push(ring);
    }
    for (const mesh of carriageway) { mesh.name = 'BACKDROP_RUN'; mesh.receiveShadow = true; environment.add(mesh); }
    for (const mesh of footways) { mesh.name = 'BACKDROP_RUN_FOOTWAY'; mesh.receiveShadow = true; environment.add(mesh); }
  }
}
