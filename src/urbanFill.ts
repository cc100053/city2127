// Urban fill (owner 2026-11-21: "too much lawn, it doesn't read as a real city"). Open landscape inside `URBAN_FILL.zones` becomes city
// blocks on a grid aligned with the ④ boulevard: paved streets round every lot, and on each lot a perimeter court, twin slabs, a podium
// tower, a park, a sports field or an urban farm. Everything is static, so each finish is one merged mesh (seven draws for the whole fill)
// and street trees join the shared surveyed canopy batch. Forms follow CITY_MASTER_TASTE: large clean white volumes, ribbon glazing, a
// trim cap and a roof garden; no window grids.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { leaf, paint, sage, trim } from './cityRig.ts';
import { hash } from './coastalCanopy.ts';
import { BACKDROP_PARK, cellHash, paveMaterial } from './groundMask.ts';
import { changeSites, CONCEPT_LOT, DISTRICT, inDistrict, LOTS, URBAN_FILL } from './layout.ts';
import { inHeroClear, inMega } from './megaFootprints.ts';
import { recedeBeyondDistrict } from './bayContext.ts';
import { HERO_POSITION } from './heroCamera.ts';
import { HOUSING_SITES } from './housingPrototype.ts';

export type FillKind = 'court' | 'slab' | 'tower' | 'park' | 'sports' | 'farm';
/** One accepted block: lot centre in grid metres (`a` along the boulevard, `b` across), world centre, slab top, its kind and which of its
 * half streets (−b, +b, −a, +a sides) are laid. */
export type FillCell = { a: number; b: number; x: number; z: number; ground: number; kind: FillKind; streets: boolean[] };
type Tree = { position: number[]; scale: number; type: string };

const [OX, OZ] = URBAN_FILL.origin, [UX, UZ] = URBAN_FILL.axis, [PU, PV] = URBAN_FILL.pitch, HALF_STREET = URBAN_FILL.street / 2;
/** Grid → world: `a` along the boulevard (u), `b` across it (v = u turned a quarter toward +z). */
export const fillWorld = (a: number, b: number) => ({ x: OX + a * UX - b * UZ, z: OZ + a * UZ + b * UX });
const fillLocal = (x: number, z: number) => ({ a: (x - OX) * UX + (z - OZ) * UZ, b: -(x - OX) * UZ + (z - OZ) * UX });
const YAW = Math.atan2(-UZ, UX); // box local x → u, local z → v
const FLOOR = 3.6, LOBBY = 4, LA = PU - 2 * HALF_STREET, LB = PV - 2 * HALF_STREET;

/** Kind mix: 3/5 built, 2/5 open; hashed per block so a re-run builds the same city. Blocks within `HERO_OPEN` metres of the hero camera
 * stay open (park, sports, farm) so nothing new stands between the guest and the landmarks. */
const HERO_OPEN = 400;
const kindOf = (i: number, j: number, x: number, z: number): FillKind => {
  const r = hash(i * 7.31 + j * 13.7 + 2);
  if (Math.hypot(x - HERO_POSITION[0], z - HERO_POSITION[2]) < HERO_OPEN) return r < .5 ? 'park' : r < .75 ? 'sports' : 'farm';
  return r < .3 ? 'court' : r < .45 ? 'slab' : r < .58 ? 'tower' : r < .78 ? 'park' : r < .9 ? 'sports' : 'farm';
};

/** The rectenna rack south of the district (src/rectennaGarden.ts). */
const RECTENNA = [-230, 399, 70] as const;
/** Ground the fill never takes: the four Meter sites, the rotation lots (they fade to lawn), the concept lot, the dwellings, the rectenna
 * rack, the hero foreground kept open (HERO_CLEAR) and megastructure feet. */
export function fillReserved(x: number, z: number) {
  if (Object.values(HOUSING_SITES).some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 30) || Math.hypot(x - RECTENNA[0], z - RECTENNA[1]) < RECTENNA[2]) return true;
  if (inHeroClear(x, z, 10)) return true;
  if (Object.values(changeSites).some(s => Math.abs(x - s.x) < s.w * s.scale / 2 + 20 && Math.abs(z - s.z) < s.d * s.scale / 2 + 20)) return true;
  if (Object.values(LOTS).some(l => !l.sea && Math.abs(x - l.x) < l.size / 2 + 15 && Math.abs(z - l.z) < l.size / 2 + 15)) return true;
  if (Math.abs(x - CONCEPT_LOT.x) < CONCEPT_LOT.w / 2 + 15 && Math.abs(z - CONCEPT_LOT.z) < CONCEPT_LOT.d / 2 + 15) return true;
  return inMega(x, z, 10);
}

/** Blocks whose lot (and 2 m round it) is open landscape under nothing else in `solids`, inside a fill zone and the
 * district, and clear of `reserved` ground. `solids`: the environment plus every scene object already standing (megastructures, street kit). */
export function planUrbanFill(solids: T.Object3D[], reserved: (x: number, z: number) => boolean): FillCell[] {
  const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), origin = new T.Vector3(), cells: FillCell[] = [];
  // Meshes only: sprites (labels, glows) cannot be raycast without a camera.
  const meshes: T.Mesh[] = [];
  solids.forEach(o => { o.updateMatrixWorld(true); o.traverse(m => { if (m instanceof T.Mesh) meshes.push(m); }); });
  const groundAt = (x: number, z: number) => {
    origin.set(x, 60, z); ray.set(origin, down); ray.far = 70;
    const hit = ray.intersectObjects(meshes, false).find(h => h.object.visible);
    const material = hit && (hit.object as T.Mesh).material;
    return hit && !Array.isArray(material) && (material as T.Material).name === 'landscape' && hit.point.y < 3 ? hit.point.y : null;
  };
  const open = (x: number, z: number) => inDistrict(x, z) && !reserved(x, z) && !fillReserved(x, z) ? groundAt(x, z) : null;
  /** Highest open ground over an `la` × `lb` rect at (a, b) on an (n + 1) × (m + 1) sample grid, or null if any sample is not open. */
  const sweep = (a: number, b: number, la: number, lb: number, n: number, m: number) => {
    let ground = -Infinity;
    for (let s = 0; s <= n; s++) for (let t = 0; t <= m; t++) {
      const p = fillWorld(a + (s / n - .5) * la, b + (t / m - .5) * lb), y = open(p.x, p.z);
      if (y === null) return null; ground = Math.max(ground, y);
    }
    return ground;
  };
  for (const [minX, maxX, minZ, maxZ] of URBAN_FILL.zones) {
    const corners = [[minX, minZ], [maxX, minZ], [minX, maxZ], [maxX, maxZ]].map(([x, z]) => fillLocal(x, z));
    const [a0, a1] = [Math.min(...corners.map(c => c.a)), Math.max(...corners.map(c => c.a))], [b0, b1] = [Math.min(...corners.map(c => c.b)), Math.max(...corners.map(c => c.b))];
    for (let i = Math.floor(a0 / PU); i * PU < a1; i++) for (let j = Math.floor(b0 / PV); j * PV < b1; j++) {
      const a = (i + .5) * PU, b = (j + .5) * PV, { x, z } = fillWorld(a, b);
      if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
      const lot = sweep(a, b, LA + 4, LB + 4, 5, 5);
      if (lot === null) continue;
      // Each half street is laid only where its own strip is open, so blocks pack round Meter sites and landmarks instead of stopping short.
      const streets = [sweep(a, b - PV / 2 + HALF_STREET / 2, PU, HALF_STREET, 6, 1), sweep(a, b + PV / 2 - HALF_STREET / 2, PU, HALF_STREET, 6, 1),
        sweep(a - PU / 2 + HALF_STREET / 2, b, HALF_STREET, LB, 1, 6), sweep(a + PU / 2 - HALF_STREET / 2, b, HALF_STREET, LB, 1, 6)];
      cells.push({ a, b, x, z, ground: Math.max(lot, ...streets.map(g => g ?? -Infinity)) + .06, kind: kindOf(i, j, x, z), streets: streets.map(g => g !== null) });
    }
  }
  return cells;
}

const body = paint('#eceae3', .62), lot = paint('#e6e1d6', .72), street = paint('#d6d2c8', .8);
const glass = new T.MeshStandardMaterial({ color: '#8fa9b8', roughness: .22, metalness: .38, name: 'urban-fill-glass' });
street.name = 'urban-fill-street'; lot.name = 'urban-fill-lot';
// The block's street and lot plinths carry the ground shader's paving and street cross-section (groundMask.ts).
paveMaterial(street, 'street'); paveMaterial(lot, 'lot');
// Paving lies centimetres over the lawn: pull it forward in depth like the street kit's ground, lots over streets.
for (const [m, k] of [[street, 1], [lot, 2]] as const) { m.polygonOffset = true; m.polygonOffsetFactor = m.polygonOffsetUnits = -4 * k; }

/** Builds the accepted blocks. Returns the group, its glazing (for the landmark night treatment), street/park trees in the surveyed
 * tree format (Blender x, y north, ground height) and `covers`, true on a fill cell (groves and surveyed trees keep off it). */
export function buildUrbanFill(cells: readonly FillCell[]) {
  const parts = new Map<T.Material, T.BufferGeometry[]>(), trees: Tree[] = [], m = new T.Matrix4(), q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), YAW), one = new T.Vector3(1, 1, 1);
  /** Box `la` × `h` × `lb` (along u, up, along v) standing on `y` at grid point (a, b). */
  const box = (material: T.Material, a: number, b: number, y: number, la: number, lb: number, h: number) => {
    if (la <= 0 || lb <= 0 || h <= 0) return;
    const { x, z } = fillWorld(a, b), g = new T.BoxGeometry(la, h, lb).applyMatrix4(m.compose(new T.Vector3(x, y + h / 2, z), q, one));
    (parts.get(material) ?? parts.set(material, []).get(material)!).push(g);
  };
  const disc = (material: T.Material, a: number, b: number, y: number, r: number, h: number) => {
    const { x, z } = fillWorld(a, b);
    (parts.get(material) ?? parts.set(material, []).get(material)!).push(new T.CylinderGeometry(r, r, h, 32).translate(x, y + h / 2, z));
  };
  const tree = (a: number, b: number, y: number, scale: number, n: number) => {
    const { x, z } = fillWorld(a, b); trees.push({ position: [x, -z, y], scale, type: n % 4 === 1 ? 'cherry' : 'broadleaf' });
  };
  /** A white volume: recessed glazed lobby, body with ribbon glazing every floor, trim cap and a roof garden. */
  const building = (a: number, b: number, y: number, la: number, lb: number, floors: number) => {
    const top = y + LOBBY + (floors - 1) * FLOOR;
    box(glass, a, b, y, la - .8, lb - .8, LOBBY);
    box(body, a, b, y + LOBBY, la, lb, top - y - LOBBY);
    for (let k = 0; k < floors - 1; k++) box(glass, a, b, y + LOBBY + k * FLOOR + 1, la + .24, lb + .24, 1.5);
    box(trim, a, b, top, la + .5, lb + .5, .6);
    if (la > 8 && lb > 8) box(leaf, a, b, top + .6, la - 3, lb - 3, .45);
  };
  cells.forEach((cell, n) => {
    const { a, b, ground: y } = cell, h = (k: number) => hash(n * 11.3 + k);
    // Half of every street round the lot: neighbouring blocks complete each other's carriageway.
    const [sb0, sb1, sa0, sa1] = cell.streets;
    if (sb0) box(street, a, b - PV / 2 + HALF_STREET / 2, y - .6, PU, HALF_STREET, .6);
    if (sb1) box(street, a, b + PV / 2 - HALF_STREET / 2, y - .6, PU, HALF_STREET, .6);
    if (sa0) box(street, a - PU / 2 + HALF_STREET / 2, b, y - .6, HALF_STREET, LB, .6);
    if (sa1) box(street, a + PU / 2 - HALF_STREET / 2, b, y - .6, HALF_STREET, LB, .6);
    const lotTop = y + .2, plinth = () => box(lot, a, b, y - .6, LA, LB, .8);
    // Street trees 2.5 m out from the lot edge every ~11 m, clear of the corners.
    const streetTrees = () => {
      for (let s = -LA / 2 + 6; s <= LA / 2 - 6; s += 11) for (const [side, on] of [[-1, sb0], [1, sb1]] as const) if (on) tree(a + s, b + side * (LB / 2 + 2), y, .72, trees.length);
      for (let s = -LB / 2 + 6; s <= LB / 2 - 6; s += 11) for (const [side, on] of [[-1, sa0], [1, sa1]] as const) if (on) tree(a + side * (LA / 2 + 2), b + s, y, .72, trees.length);
    };
    if (cell.kind === 'court') {
      plinth(); streetTrees();
      const D = 11, open = h(1) < .35 ? Math.floor(h(2) * 4) : -1, f = (k: number) => 4 + Math.floor(h(k) * 4);
      if (open !== 0) building(a, b - LB / 2 + D / 2, lotTop, LA, D, f(3));
      if (open !== 1) building(a, b + LB / 2 - D / 2, lotTop, LA, D, f(4));
      if (open !== 2) building(a - LA / 2 + D / 2, b, lotTop, D, LB - 2 * D, f(5));
      if (open !== 3) building(a + LA / 2 - D / 2, b, lotTop, D, LB - 2 * D, f(6));
      box(leaf, a, b, lotTop, LA - 2 * D - 2, LB - 2 * D - 2, .35);
      for (let k = 0; k < 3; k++) tree(a + (h(7 + k) - .5) * (LA - 2 * D - 6), b + (h(10 + k) - .5) * (LB - 2 * D - 6), lotTop + .35, .8, k);
    } else if (cell.kind === 'slab') {
      plinth(); streetTrees();
      const f = 5 + Math.floor(h(3) * 5), g = 5 + Math.floor(h(4) * 5);
      building(a - 2, b - LB / 2 + 5, lotTop, LA - 8, 10, f); building(a + 2, b + LB / 2 - 5, lotTop, LA - 8, 10, g);
      box(leaf, a, b, lotTop, LA - 6, LB - 22, .35);
      for (let s = -LA / 2 + 6; s < LA / 2 - 4; s += 8) tree(a + s, b, lotTop + .35, .7, Math.round(s));
    } else if (cell.kind === 'tower') {
      plinth(); streetTrees();
      building(a, b, lotTop, LA - 4, LB - 4, 2);
      const side = h(3) < .5 ? -1 : 1;
      building(a + side * LA / 4, b, lotTop + LOBBY + FLOOR + .6, 18, 18, 10 + Math.floor(h(4) * 5));
    } else if (cell.kind === 'park') {
      // The lot stays lawn: a cross of paths to a round plaza, a ring of trees and a pavilion.
      box(lot, a, b, y - .5, LA, 3.2, .6); box(lot, a, b, y - .5, 3.2, LB, .6);
      disc(lot, a, b, y - .5, 8, .62); disc(leaf, a, b, y + .12, 3.2, .3);
      for (let k = 0; k < 10; k++) {
        const t = k / 10 * Math.PI * 2 + h(1), r = 13 + h(k + 2) * 3;
        const ta = Math.cos(t) * r * 1.15, tb = Math.sin(t) * r * .8;
        if (Math.abs(ta) > 3.5 && Math.abs(tb) > 3.5) tree(a + ta, b + tb, y, .9 + h(k + 20) * .3, k);
      }
      const pa = a + (h(5) < .5 ? -1 : 1) * (LA / 2 - 9), pb = b + (h(6) < .5 ? -1 : 1) * (LB / 2 - 8);
      box(glass, pa, pb, y - .3, 10, 7, 3.8); box(trim, pa, pb, y + 3.5, 12, 9, .5); box(leaf, pa, pb, y + 4, 10.5, 7.5, .35);
    } else if (cell.kind === 'sports') {
      plinth(); streetTrees();
      box(sage, a, b, lotTop, LA - 10, LB - 12, .08);
      for (const s of [-1, 1]) { box(trim, a, b + s * (LB / 2 - 6), lotTop, LA - 10, .3, .1); box(trim, a + s * (LA / 2 - 5), b, lotTop, .3, LB - 12, .1); }
      box(trim, a, b, lotTop, .3, LB - 12, .1);
    } else {
      plinth(); streetTrees();
      for (let s = -LB / 2 + 3; s < LB / 2 - 12; s += 3.2) box(leaf, a - 6, b + s + 1.6, lotTop, LA - 18, 1.6, .55);
      const ga = a + LA / 2 - 7, gb = b + LB / 2 - 7;
      box(glass, ga, gb, lotTop, 10, 10, 5); box(trim, ga, gb, lotTop + 5, 10.6, 10.6, .4);
    }
  });
  const root = new T.Group(); root.name = 'urban-fill';
  for (const [material, list] of parts) {
    const mesh = new T.Mesh(mergeGeometries(list.map(g => g.index ? g.toNonIndexed() : g)), material);
    list.forEach(g => g.dispose());
    mesh.name = 'urban-fill'; mesh.receiveShadow = true; mesh.castShadow = material === body || material === trim || material === glass;
    root.add(mesh);
  }
  const covers = (x: number, z: number, margin = 2) => {
    const p = fillLocal(x, z);
    return cells.some(c => Math.abs(p.a - c.a) <= LA / 2 + margin && Math.abs(p.b - c.b) <= LB / 2 + margin);
  };
  return { root, glass, trees, covers };
}

const fabricBody = paint('#e7e1d5', .85), fabricGround = paint('#d9d3c6', .9), fabricGreen = paint('#8fa27a', .9);
for (const m of [fabricBody, fabricGround, fabricGreen]) recedeBeyondDistrict(m, .6);
fabricGround.polygonOffset = true; fabricGround.polygonOffsetFactor = fabricGround.polygonOffsetUnits = -4;
const [BU, BV] = URBAN_FILL.backdrop.pitch, BA = BU - URBAN_FILL.backdrop.street, BB = BV - URBAN_FILL.backdrop.street;

/** Backdrop city fabric (owner 2026-11-21): beyond the district the surveyed parkland becomes low-detail city blocks on the same boulevard
 * grid — paved cells with courts, point blocks or slabs and roof greens, unshadowed and receding into the haze like the context massing.
 * About one block in six stays open, where the backdrop groves keep growing. Three merged meshes. `covers` (x, z) is true on a built cell. */
export function backdropFabric(environment: T.Object3D) {
  environment.updateMatrixWorld(true);
  const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), origin = new T.Vector3(), lots: { a: number; b: number }[] = [];
  const groundAt = (x: number, z: number) => {
    origin.set(x, 300, z); ray.set(origin, down); ray.far = 320;
    const hit = ray.intersectObject(environment, true)[0], material = hit && (hit.object as T.Mesh).material;
    return hit && !Array.isArray(material) && (material as T.Material).name === 'landscape' && hit.point.y < 9 ? hit.point.y : null;
  };
  const near = 12, R = URBAN_FILL.backdrop.radius, parts = new Map<T.Material, T.BufferGeometry[]>(), m = new T.Matrix4(), q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), YAW), one = new T.Vector3(1, 1, 1);
  const box = (material: T.Material, a: number, b: number, y: number, la: number, lb: number, h: number) => {
    const { x, z } = fillWorld(a, b);
    (parts.get(material) ?? parts.set(material, []).get(material)!).push(new T.BoxGeometry(la, h, lb).applyMatrix4(m.compose(new T.Vector3(x, y + h / 2, z), q, one)));
  };
  // ponytail: one unaccelerated ray per cell centre, four more for the cells that pass (~7k rays at load); add a BVH if the plate grows.
  for (let i = Math.floor(-2 * R / BU); i * BU < 2 * R; i++) for (let j = Math.floor(-2 * R / BV); j * BV < 2 * R; j++) {
    const a = (i + .5) * BU, b = (j + .5) * BV, { x, z } = fillWorld(a, b);
    if (Math.hypot(x, z) > R || cellHash(i, j) < BACKDROP_PARK) continue; // a park block: the ground shader lays its lawn (groundMask.ts)
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([s, t]) => fillWorld(a + s * BU / 2, b + t * BV / 2));
    if (corners.some(p => p.x > DISTRICT.minX - near && p.x < DISTRICT.maxX + near && p.z > DISTRICT.minZ - near && p.z < DISTRICT.maxZ + near) || [{ x, z }, ...corners].some(p => fillReserved(p.x, p.z))) continue;
    const g = groundAt(x, z);
    if (g === null) continue;
    const heights = corners.map(p => groundAt(p.x, p.z));
    if (heights.some(h => h === null)) continue;
    const y = Math.max(g, ...heights as number[]) + .08, r = hash(i * 5.3 + j * 2.9 + 1), f = (k: number) => 12 + Math.floor(hash(i * 11 + j * 17 + k) * 6) * 4;
    lots.push({ a, b });
    box(fabricGround, a, b, y - 1.2, BU, BV, 1.2);
    const building = (ba: number, bb: number, la: number, lb: number, h: number) => { box(fabricBody, ba, bb, y, la, lb, h); if (la > 6 && lb > 6) box(fabricGreen, ba, bb, y + h, la - 2.5, lb - 2.5, .4); };
    if (r < .4) {
      building(a, b - BB / 2 + 6, BA, 12, f(1)); building(a, b + BB / 2 - 6, BA, 12, f(2));
      building(a - BA / 2 + 6, b, 12, BB - 24, f(3)); building(a + BA / 2 - 6, b, 12, BB - 24, f(4));
      box(fabricGreen, a, b, y, BA - 26, BB - 26, .3);
    } else if (r < .72) {
      for (const [s, t] of [[-1, -1], [1, -1], [0, 1]]) building(a + s * BA / 4, b + t * BB / 4, 15, 15, f(5 + s + t * 3) + (hash(i + j + s) < .25 ? 16 : 0));
      box(fabricGreen, a, b, y, BA - 6, BB - 30, .3);
    } else {
      building(a, b - BB / 2 + 7, BA - 4, 12, f(1)); building(a, b + BB / 2 - 7, BA - 4, 12, f(2));
      box(fabricGreen, a, b, y, BA - 4, BB - 30, .3);
    }
  }
  const root = new T.Group(); root.name = 'backdrop-fabric';
  for (const [material, list] of parts) {
    const mesh = new T.Mesh(mergeGeometries(list.map(g => g.toNonIndexed())), material);
    list.forEach(g => g.dispose()); mesh.name = 'backdrop-fabric'; root.add(mesh);
  }
  const covers = (x: number, z: number) => { const p = fillLocal(x, z); return lots.some(l => Math.abs(p.a - l.a) <= BU / 2 + 2 && Math.abs(p.b - l.b) <= BV / 2 + 2); };
  return { root, covers };
}
