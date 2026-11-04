// 2127 street kit (road redesign, owner targets 2026-11-04 in ~/city2127-evidence/road-design/gen): A, the light-guided shared avenue
// (avenue-A.jpg) and B, the maglev guide-channel boulevard (boulevard-B.jpg). Each street is built from a centreline and a cross-section
// of bands in metres left of the route (`n`, up × tangent). A paves the street-car U route (`streetNetwork`, road redesign stage 1);
// DEV `?roadKit` previews B for stage 2.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { leaf, trim } from './cityRig.ts';
import { glowTexture } from './glowTexture.ts';
import { hash, plantCanopy } from './coastalCanopy.ts';
import { routes, streetPodFleet } from './mobility.ts';
import { STREET_KIT } from './layout.ts';

/** Large pale ceramic panels: a 256 px tile with fine seams on two edges, repeated per panel in metres through the strip's uv. */
function panelTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!; g.fillStyle = '#f3f1eb'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#c9c6bd'; g.fillRect(0, 0, 256, 3); g.fillRect(0, 0, 3, 256);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
/** Large pale paving slabs (2.4 m squares through the strip's uv): 256 px tile, 2 px joints on two edges. */
function footTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!; g.fillStyle = '#e8e3d8'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#d2ccbf'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Named as the environment's finishes: the kit's ground joins the environment, so paving, doorway and clearance checks treat it as street.
const ceramic = new T.MeshStandardMaterial({ color: '#d3d2cd', roughness: .42, name: 'road' });
const footway = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .7, name: 'sidewalk' });
const metal = new T.MeshStandardMaterial({ color: '#f4f5f3', roughness: .22, metalness: .55 });
const channel = new T.MeshStandardMaterial({ color: '#9fb2c6', roughness: .35, metalness: .3 });
const channelWall = new T.MeshStandardMaterial({ color: '#6f8296', roughness: .5 });
// Cool white-blue technology light (CITY_MASTER_TASTE: low saturation); `updateStreetKit` raises it at night.
const seamLight = new T.MeshBasicMaterial({ color: new T.Color('#d8ecff') });
const railLight = new T.MeshBasicMaterial({ color: new T.Color('#bfe0ff') });
const bridgeLine = new T.MeshBasicMaterial({ color: new T.Color('#8cc4ff') }), riser = new T.MeshStandardMaterial({ color: '#b9c3cc', roughness: .6 }); // B's lines over the bright deck: bluer than the other lit lines, so they contrast
// Soft additive light: `halo` the pool over the shrubs under each emitter ring, `lineGlow` the band under every lit line, `bladePool` the pool under each lamp blade.
const glows = (opacity: number) => new T.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
const halo = glows(.6), lineGlow = glows(.3), bladePool = glows(0);
const crossing = new T.MeshStandardMaterial({ color: '#d6ecff', emissive: '#cfe8ff', emissiveIntensity: 1.6, roughness: .3 });
const bridgeDeck = crossing.clone(); bridgeDeck.color.set('#e8f4ff'); // B's light bridge: dimmer than the panels, so the lines laid over it stay readable
// Ground finishes sit centimetres apart (as odaibaScene's groundLayer): each later layer gets a stronger offset so it draws over the one below.
for (const [m, k] of [[ceramic, 1], [footway, 1], [metal, 2], [lineGlow, 2], [seamLight, 3], [railLight, 3], [bridgeLine, 3], [crossing, 4], [bridgeDeck, 2]] as const) { m.polygonOffset = true; m.polygonOffsetFactor = m.polygonOffsetUnits = -4 * k; }
const lightMaterials = [seamLight, railLight, bridgeLine], nightLine = new T.Color();
// Canvas textures are made on first build, and only with a DOM: node tests build the kit untextured.
const textured = () => { if (typeof document === 'undefined') return; ceramic.map ??= panelTexture(); footway.map ??= footTexture(); const g = halo.map ?? glowTexture(); for (const m of [halo, lineGlow, bladePool]) m.map ??= g; };
export function updateStreetKit(dark: number) {
  // Day: pale blue (clearly lit on the ceramic) with a faint glow band; night: about 4x the blue, well above the bloom threshold, with a full glow band under each line.
  for (const m of lightMaterials) m.color.set(m === bridgeLine ? '#8cc4ff' : '#a9d3ff').multiplyScalar(m === bridgeLine ? 1.5 : 1.3).lerp(nightLine.set(m === seamLight ? '#7fc0ff' : '#74bbff').multiplyScalar(4), dark);
  crossing.emissiveIntensity = 1.6 + dark * 1.2; bridgeDeck.emissiveIntensity = 1 + dark * .3; halo.opacity = .6 + dark * .3; lineGlow.opacity = .3 + dark * .2; bladePool.opacity = dark * .9;
}

type Curve = T.Curve<T.Vector3>;
/** Ground height under the street (terrain varies 0–1 m); set per build, flat by default. */
let ground = (_x: number, _z: number) => 0;
/** Frame at `d` metres: point and left normal. */
const frame = (c: Curve, d: number, len: number) => { const u = T.MathUtils.clamp(d / len, 0, 1), p = c.getPointAt(u), t = c.getTangentAt(u); return { p, n: new T.Vector3(t.z, 0, -t.x), t }; };
/** Flat strip from offset a to b at height y over d0..d1 (uv in metres / `tile`), or with `h` a raised slab with its two long sides. */
function band(c: Curve, d0: number, d1: number, a: number, b: number, y: number, h = 0, tile: [number, number] = [1, 1]) {
  const len = c.getLength(), pos: number[] = [], uv: number[] = [], idx: number[] = [], steps = Math.max(2, Math.ceil((d1 - d0) / 2));
  const faces: [number, number, number, number][] = [[a, b, y, y]]; // [from, to, y at from, y at to]
  if (h) faces.push([a, a, y - h, y], [b, b, y, y - h]);
  for (const [fa, fb, ya, yb] of faces) {
    const base = pos.length / 3;
    for (let i = 0; i <= steps; i++) {
      const d = d0 + (d1 - d0) * i / steps, { p, n } = frame(c, d, len);
      for (const [o, yy] of [[fa, ya], [fb, yb]] as const) { const x = p.x + n.x * o, z = p.z + n.z * o; pos.push(x, yy + ground(x, z), z); uv.push(d / tile[0], (o + (yy - y)) / tile[1]); }
    }
    for (let i = 0; i < steps; i++) { const k = base + i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); if (g.attributes.normal.getY(0) < 0) { g.index!.array.reverse(); g.computeVertexNormals(); } // strips face up whatever the route direction
  return g;
}
/** Soft light band (additive, `lineGlow`): uv runs across its width only, so the radial glow texture fades from the line outwards. */
function glowLine(c: Curve, d0: number, d1: number, a: number, b: number, y: number) {
  const g = band(c, d0, d1, a, b, y), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, .5, i % 2); return g;
}
/** Vertical face across offsets a..b at `d` from y0 to y1, facing `dir` (+1 / -1) along the route (the end of a terrace run). */
function cap(c: Curve, d: number, a: number, b: number, y0: number, y1: number, dir: number) {
  const { p, n, t } = frame(c, d, c.getLength()), pos: number[] = [];
  for (const [o, yy] of [[a, y0], [b, y0], [a, y1], [b, y1]] as const) { const x = p.x + n.x * o, z = p.z + n.z * o; pos.push(x, yy + ground(x, z), z); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(new Array(8).fill(0), 2)); g.setIndex([0, 1, 2, 2, 1, 3]); g.computeVertexNormals();
  const nm = g.attributes.normal; if ((nm.getX(0) * t.x + nm.getZ(0) * t.z) * dir < 0) { g.index!.array.reverse(); g.computeVertexNormals(); }
  return g;
}
type Span = [number, number];
/** `parts` with the `avoid` ranges cut out; pieces shorter than `min` metres go. */
const cut = (parts: Span[], avoid: readonly (readonly [number, number])[], min: number) => avoid.reduce((ps, [f, t]) => ps.flatMap(([p, q]): Span[] => t <= p || f >= q ? [[p, q]] : [[p, f], [t, q]]).filter(([p, q]) => q - p >= min), parts);
/** Bed spans [centre, length] of up to `L` m every `L + gap` metres from d0 to d1 (on that grid from `grid`), cut around `avoid` (pieces under 8 m dropped). */
function spans(d0: number, d1: number, L: number, gap: number, avoid: readonly (readonly [number, number])[], grid = d0) {
  const out: Span[] = [];
  for (let s = grid + Math.ceil((d0 - grid) / (L + gap) - 1e-9) * (L + gap); s + 8 <= d1; s += L + gap) for (const [p, q] of cut([[s, Math.min(s + L, d1)]], avoid, 8)) out.push([(p + q) / 2, q - p]);
  return out;
}

/** A planting bed: inner size, soil height over `at`'s point, and `at(s, q)` the point `s` m along and `q` m across from its middle. `kind`: the trees it takes. */
type Bed = { l: number; w: number; top: number; at: (s: number, q: number) => T.Vector3; kind: 'broadleaf' | 'columnar' | 'none' };
/** Stadium planter (length l, width w, wall h tall from `base`) at frame `f` with offset `o`: white rim wall and a sunken bed (soil 0.08 m under the rim top). */
function planter(f: ReturnType<typeof frame>, o: number, l: number, w: number, kind: Bed['kind'], base = 0, h = .6) {
  const r = w / 2, rim = .45, outer = new T.Shape(), inner = new T.Path();
  outer.absarc(l / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); outer.absarc(-l / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  inner.absarc(l / 2 - r, 0, r - rim, -Math.PI / 2, Math.PI / 2, false); inner.absarc(-l / 2 + r, 0, r - rim, Math.PI / 2, Math.PI * 1.5, false);
  outer.holes.push(inner);
  const yaw = Math.atan2(f.t.x, f.t.z), centre = f.p.clone().addScaledVector(f.n, o), g0 = ground(centre.x, centre.z), place = (g: T.BufferGeometry, up: number) => g.rotateX(-Math.PI / 2).rotateY(yaw - Math.PI / 2).translate(centre.x, g0 + base + up, centre.z);
  const along = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), across = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const wall = place(new T.ExtrudeGeometry(outer, { depth: h, bevelEnabled: false, curveSegments: 10 }), 0), soil = place(new T.ShapeGeometry(new T.Shape(inner.getPoints(10)), 10), h - .08);
  return { wall, soil, bed: { l, w: w - 2 * rim, top: h - .08, kind, at: (s: number, q: number) => centre.clone().addScaledVector(along, s).addScaledVector(across, q).setY(g0 + base) } satisfies Bed };
}
/** The same bed as one continuous run along the route from d0 to d1 (offset o, width w, standing on `base`): rim walls, end caps and soil. */
function run(c: Curve, d0: number, d1: number, o: number, w: number, base: number, kind: Bed['kind'], h = .6) {
  const len = c.getLength(), lo = o - w / 2, hi = o + w / 2, r = .45, top = base + h, mid = (d0 + d1) / 2;
  const walls = [band(c, d0, d1, lo, lo + r, top, h), band(c, d0, d1, hi - r, hi, top, h), band(c, d0, d0 + r, lo, hi, top, h), band(c, d1 - r, d1, lo, hi, top, h)];
  const at = (s: number, q: number) => { const { p, n } = frame(c, mid + s, len), x = p.x + n.x * (o + q), z = p.z + n.z * (o + q); return new T.Vector3(x, base + ground(x, z), z); };
  return { walls, soil: band(c, d0 + r, d1 - r, lo + r, hi - r, top - .08), bed: { l: d1 - d0, w: w - 2 * r, top: h - .08, kind, at } satisfies Bed };
}

// Leafy plants: a faceted bush (3 lumpy lobes), a broad-leaf clump (7 flat leaves fanned from one point), one slim cypress (an elongated icosahedron on a short trunk).
const bushGeometry = () => {
  const g = mergeGeometries([[-.3, 0, 0], [.3, .05, .1], [0, .25, -.2]].map(([x, y, z]) => new T.IcosahedronGeometry(.5, 0).translate(x, y, z)));
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = p.getX(i) * 12.9 + p.getY(i) * 78.2 + p.getZ(i) * 37.7; p.setXYZ(i, p.getX(i) * (1 + (hash(k) - .5) * .24), p.getY(i) * (1 + (hash(k + 1) - .5) * .24), p.getZ(i) * (1 + (hash(k + 2) - .5) * .24)); } // same vertex, same jitter: faces stay closed
  g.scale(1, .75, 1).translate(0, .3, 0).computeVertexNormals(); return g;
};
const clumpGeometry = () => mergeGeometries(Array.from({ length: 7 }, (_, k) => new T.OctahedronGeometry(.35).scale(1, .18, .5).translate(.3, .05, 0).rotateZ(.44 + hash(k) * .34).rotateY(k * Math.PI * 2 / 7 + hash(k + 9) * .3)));
const foliage = () => new T.MeshStandardMaterial({ color: '#ffffff', roughness: .9, side: T.DoubleSide });
/** Dense leafy fill for every bed: rows every 0.85 m, plants every 0.65 m (60% bushes, 40% broad-leaf clumps, 0.7–1.5 m, mounded toward the bed's middle, four greens),
 * plus its trees (coastalCanopy broadleaf batch, and one cypress batch here: one draw per shape for the street). */
function plantBeds(root: T.Object3D, beds: Bed[]) {
  const plants: [T.Vector3, number, number][] = [], crowns: { position: number[]; scale: number; type: string }[] = [], cypress: T.Vector3[] = [];
  beds.forEach((b, k) => {
    const rows = Math.max(2, Math.round(b.w / .85));
    const ins = b.kind === 'broadleaf' ? 1 : .5; // A's beds keep their rim top clear of the plants
    let i = 0;
    for (let s = -b.l / 2 + .4; s <= b.l / 2 - .4 + 1e-3; s += .65, i++) for (let r = 0; r < rows; r++) {
      const j = i * 3 + r * 17 + k * 29, q = -b.w / 2 + ins + r * (b.w - 2 * ins) / (rows - 1) + (hash(j + 1) - .5) * .4;
      const p = b.at(s + (hash(j + 2) - .5) * .4, q); p.y += b.top;
      plants.push([p, (.7 + hash(j + 3) * .8) * (1 + .45 * (1 - Math.abs(q) / (b.w / 2))), hash(j + 4)]);
    }
    if (b.kind === 'broadleaf') for (const s of b.l < 12 ? [0] : [-.3 * b.l, 0]) { const p = b.at(s, 0); crowns.push({ position: [p.x, -p.z, p.y + b.top], scale: .42 + hash(k + s) * .1, type: 'broadleaf' }); }
    if (b.kind === 'columnar') for (let s = -b.l / 2 + 3; s < b.l / 2; s += 6) { const p = b.at(s, 0); p.y += b.top; cypress.push(p); }
  });
  if (crowns.length) plantCanopy(root, { instances: crowns });
  const d = new T.Object3D(), color = new T.Color();
  for (const [name, geometry, pick] of [['street-bushes', bushGeometry(), (h: number) => h < .6], ['street-leaves', clumpGeometry(), (h: number) => h >= .6]] as const) {
    const set = plants.filter(([, , h]) => pick(h)); if (!set.length) continue;
    const m = new T.InstancedMesh(geometry, foliage(), set.length); m.name = name; m.castShadow = m.receiveShadow = true;
    set.forEach(([p, size, h], i) => { d.position.copy(p); d.rotation.set(0, hash(i + 5) * 6.3, 0); d.scale.setScalar(size); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, color.setHSL(.24 + hash(i * 7 + 2) * .08, .4 + hash(i + 8) * .15, [.24, .31, .37, .42][Math.floor(hash(i * 3 + h) * 4)])); });
    root.add(m);
  }
  if (cypress.length) {
    const crown = new T.IcosahedronGeometry(.9, 1).scale(1, 3.4, 1), trunk = new T.CylinderGeometry(.1, .17, 1.4, 6);
    const tops = new T.InstancedMesh(crown, foliage(), cypress.length), stems = new T.InstancedMesh(trunk, new T.MeshStandardMaterial({ color: '#776957', roughness: 1 }), cypress.length);
    cypress.forEach((p, i) => {
      d.rotation.set(0, i, 0); d.scale.setScalar(.9 + hash(i + 1) * .2); d.position.set(p.x, p.y + 1 + 3.06 * d.scale.y, p.z); d.updateMatrix(); tops.setMatrixAt(i, d.matrix);
      d.scale.set(1, 1, 1); d.position.set(p.x, p.y + .7, p.z); d.updateMatrix(); stems.setMatrixAt(i, d.matrix); tops.setColorAt(i, color.setHSL(i % 2 ? .3 : .27, .42, i % 2 ? .24 : .3));
    });
    tops.name = 'street-cypress'; stems.name = 'street-cypress-trunks'; tops.castShadow = stems.castShadow = tops.receiveShadow = true; root.add(tops, stems);
  }
}
const mesh = (geometries: T.BufferGeometry[], material: T.Material, name: string, shadow = true): T.Object3D => {
  if (!geometries.length) return new T.Group();
  // Extrusions are not indexed, bands are: merge them all unindexed when mixed.
  const m = new T.Mesh(mergeGeometries(geometries.some(g => !g.index) ? geometries.map(g => g.index ? g.toNonIndexed() : g) : geometries), material); geometries.forEach(g => g.dispose()); m.name = name; m.receiveShadow = shadow; m.castShadow = shadow && !(material instanceof T.MeshBasicMaterial); return m;
};

/** A verge: [from, to, reach] runs (metres along the route, paving reach beyond the carriageway edge) and the spans its planters keep clear of. */
export type Verge = { reach: readonly (readonly [number, number, number])[]; gaps: readonly (readonly [number, number])[] };
/** Section A: kerbless ceramic carriageway (lit seams at both edges and the lane line, a flush 0.15 m white metal edge), large pale paving footways level with it,
 * stadium bioswale planters directly at both edges where a verge reaches far enough (dense bushes, leaf clumps and trees), white emitter rings over them,
 * light-panel crossings. `carriage` [left, right] offsets, `left`/`right` the verges beyond each edge, `crossings` in metres along. */
export function avenueStreet(c: Curve, d0: number, d1: number, carriage: [number, number], left: Verge, right: Verge, crossings: readonly number[] = [], groundAt = ground) {
  textured(); ground = groundAt; const root = new T.Group(); root.name = 'street-avenue';
  const [a, b] = carriage, y = .235, mid = (a + b) / 2, len = c.getLength(), W = 5;
  const flat: T.BufferGeometry[] = [band(c, d0, d1, a, b, y, 0, [3, (b - a) / 2])], paving: T.BufferGeometry[] = [], metalG: T.BufferGeometry[] = [], seams: T.BufferGeometry[] = [], glows: T.BufferGeometry[] = [];
  for (const o of [a + .2, mid, b - .2]) { seams.push(band(c, d0, d1, o - .09, o + .09, y + .006)); glows.push(glowLine(c, d0, d1, o - .35, o + .35, y + .004)); }
  const beds: Bed[] = [], walls: T.BufferGeometry[] = [], soil: T.BufferGeometry[] = [], rings: T.BufferGeometry[] = [], pools: T.BufferGeometry[] = [];
  const clear = crossings.map((x): Span => [x - 6, x + 6]);
  for (const [e, s, verge] of [[a, -1, left], [b, 1, right]] as const) {
    metalG.push(band(c, d0, d1, e, e + s * .15, y + .004));
    for (const [f, t, reach] of verge.reach) {
      const p = Math.max(f, d0), q = Math.min(t, d1); if (q - p < 1) continue;
      paving.push(band(c, p, q, e + s * .15, e + s * reach, y - .002, 0, [2.4, 2.4]));
      if (reach < W + .35 + 1) continue;
      for (const [d, l] of spans(p, q, 20, 5, [...clear, ...verge.gaps], d0 + 4)) { // one grid for both verges: beds pair across the street
        const { wall, soil: bedSoil, bed } = planter(frame(c, d, len), e + s * (.35 + W / 2), l, W, 'broadleaf'); beds.push(bed); walls.push(wall); soil.push(bedSoil);
        if (l < 12) continue;
        // One emitter ring per planter over its crossing-side end: white metal hoop 2.6 m over the bed, lit seam on its top inner edge, a pool of glow just over the shrub tops.
        const at = bed.at(l / 2 - 2.8, 0), top = at.y + bed.top;
        rings.push(new T.TorusGeometry(2.4, .28, 8, 48).rotateX(Math.PI / 2).translate(at.x, top + 2.6, at.z));
        seams.push(new T.TorusGeometry(2.2, .12, 6, 48).rotateX(Math.PI / 2).translate(at.x, top + 2.7, at.z));
        pools.push(new T.PlaneGeometry(6, 6).rotateX(-Math.PI / 2).translate(at.x, top + 2.1, at.z));
      }
    }
  }
  // Light-panel crossings: two rows of square panels (about 1.3 m), 0.3 m apart, the outer ones 0.1 m from the carriageway edges.
  const panels: T.BufferGeometry[] = [], n = Math.round((b - a - .2 + .3) / 1.6), pw = (b - a - .2 - (n - 1) * .3) / n;
  for (const d of crossings) for (let i = 0; i < n; i++) for (const k of [-1, 1]) panels.push(band(c, d + k * (pw + .3) / 2 - pw / 2, d + k * (pw + .3) / 2 + pw / 2, a + .1 + i * (pw + .3), a + .1 + i * (pw + .3) + pw, y + .012));
  root.add(mesh(flat, ceramic, 'street-ceramic', false), mesh(metalG, metal, 'street-edge'), mesh(seams, seamLight, 'street-seams', false), mesh(glows, lineGlow, 'street-line-glow', false), mesh(paving, footway, 'street-footway', false),
    mesh(panels, crossing, 'street-crossing', false), mesh(walls, trim, 'street-planters'), mesh(soil, leaf, 'street-beds'), mesh(rings, metal, 'street-rings'), mesh(pools, halo, 'street-ring-glow', false));
  plantBeds(root, beds);
  return root;
}

/** Section B (24 m): planted median (slim cypresses over dense bushes and leaf clumps) between two 7 m ceramic carriageways, each with one recessed guide channel
 * (0.18 m deep, two lit lines on its floor, lit lines at the carriageway edges); footways on 0.45 m terraces edged with a lit lip and a continuous planter band; curved
 * white lamp blades every 20 m along the terrace edges; flush light-bridge crossings (4 m deep) that the terraces step down to. */
export function boulevardStreet(c: Curve, d0: number, d1: number, crossings: number[] = [], groundAt = ground) {
  textured(); ground = groundAt; const root = new T.Group(); root.name = 'street-boulevard';
  const y = .235, step = .45, len = c.getLength(), flat: T.BufferGeometry[] = [], paving: T.BufferGeometry[] = [], channels: T.BufferGeometry[] = [], chWalls: T.BufferGeometry[] = [], risers: T.BufferGeometry[] = [], bLines: T.BufferGeometry[] = [], rails: T.BufferGeometry[] = [], seams: T.BufferGeometry[] = [], glows: T.BufferGeometry[] = [];
  const walls: T.BufferGeometry[] = [], soil: T.BufferGeometry[] = [], blades: T.BufferGeometry[] = [], pools: T.BufferGeometry[] = [], deck: T.BufferGeometry[] = [], beds: Bed[] = [];
  // Lamp blade: a tapering crescent 9 m tall (1.1 m at the foot, 0.25 m at the tip, 0.7 m deep) curving hard over the top third to lean 2.6 m over the carriageway, lit tube along its inner edge.
  const blade = new T.Shape(); blade.moveTo(-.55, 0); blade.bezierCurveTo(-.5, 4.6, .1, 7.5, 2.7, 9); blade.lineTo(2.58, 8.78); blade.bezierCurveTo(.85, 6.6, .55, 4.2, .55, 0); blade.closePath();
  const bladeG = new T.ExtrudeGeometry(blade, { depth: .7, bevelEnabled: false, curveSegments: 16 }).translate(0, 0, -.35);
  const bladeStrip = new T.TubeGeometry(new T.CubicBezierCurve3(new T.Vector3(.5, .2, 0), new T.Vector3(.5, 4.2, 0), new T.Vector3(.8, 6.6, 0), new T.Vector3(2.58, 8.78, 0)), 24, .12, 5);
  const bridges = crossings.map((x): Span => [x - 2, x + 2]), runs = cut([[d0, d1]], bridges, 1);
  for (const s of [-1, 1]) {
    // `B`: strip from offset a to b on this side (route range f..t); `G`: glow band (0.7 m, or `w`) centred on offset o.
    const B = (a: number, b: number, yy: number, h = 0, tile: [number, number] = [1, 1], f = d0, t = d1) => band(c, f, t, Math.min(s * a, s * b), Math.max(s * a, s * b), yy, h, tile);
    const G = (o: number, yy: number, f = d0, t = d1, w = .7) => glowLine(c, f, t, Math.min(s * (o - w / 2), s * (o + w / 2)), Math.max(s * (o - w / 2), s * (o + w / 2)), yy);
    flat.push(B(1.5, 3.85, y, 0, [3, 1.75]), B(6.15, 8.5, y, 0, [3, 1.75]));
    channels.push(B(3.85, 6.15, y - .18)); chWalls.push(B(3.84, 3.85, y, .18), B(6.15, 6.16, y, .18)); // recessed floor and its two walls
    for (const o of [4.25, 5.75]) { rails.push(B(o - .09, o + .09, y - .16)); glows.push(G(o, y - .17)); }
    for (const o of [1.65, 8.35]) { seams.push(B(o - .09, o + .09, y + .006)); glows.push(G(o, y + .004)); }
    // Terrace runs between the bridges: 0.45 m step with a darker riser face and a lit lip (top seam and a lit strip on the riser), stone footway, one continuous planter band at the outer edge.
    for (const [p, q] of runs) {
      paving.push(B(8.5, 13, y + step, step, [2.4, 2.4], p, q)); risers.push(B(8.49, 8.5, y + step, step, [1, 1], p, q)); seams.push(B(8.5, 8.7, y + step + .003, 0, [1, 1], p, q), B(8.46, 8.47, y + step - .04, .08, [1, 1], p, q)); glows.push(G(8.6, y + step + .004, p, q), G(8, y + .004, p, q, 1));
      if (p > d0) paving.push(cap(c, p, s * 8.5, s * 13, y, y + step, -1)); if (q < d1) paving.push(cap(c, q, s * 8.5, s * 13, y, y + step, 1));
    }
    for (const [p, q] of cut([[d0, d1]], bridges.map(([f, t]): Span => [f - 2, t + 2]), 6)) { const r = run(c, p, q, s * 11.8, 2.4, y + step, 'none'); walls.push(...r.walls); soil.push(r.soil); beds.push(r.bed); }
    // Lamp blades every 20 m at the carriageway side of the planter, with a light pool under each tip.
    for (let d = d0 + 6; d < d1 - 4; d += 20) {
      if (bridges.some(([f, t]) => d > f - 3 && d < t + 3)) continue;
      const f = frame(c, d, len), at = f.p.clone().addScaledVector(f.n, s * 9.7), top = y + step + ground(at.x, at.z), yaw = Math.atan2(s * f.n.z, -s * f.n.x); // shape +x (the lean) faces the carriageway, -s × n
      blades.push(bladeG.clone().rotateY(yaw).translate(at.x, top, at.z)); seams.push(bladeStrip.clone().rotateY(yaw).translate(at.x, top, at.z));
      const tip = at.clone().addScaledVector(f.n, -s * 2.6); pools.push(new T.PlaneGeometry(7, 7).rotateX(-Math.PI / 2).translate(tip.x, top + .02, tip.z));
    }
  }
  // Median: paved strip with one continuous raised planter run (cut only at the bridges); slim cypresses every 6 m.
  paving.push(band(c, d0, d1, -1.5, 1.5, y, 0, [2.4, 2.4]));
  for (const [p, q] of cut([[d0, d1]], bridges.map(([f, t]): Span => [f - 1.5, t + 1.5]), 6)) { const r = run(c, p, q, 0, 3, y, 'columnar', .55); walls.push(...r.walls); soil.push(r.soil); beds.push(r.bed); }
  // Light bridges: a pale deck at carriageway level across the whole street and both terraces, lit seams along its two edges; channel and edge lines run on over it.
  for (const [f, t] of bridges) {
    deck.push(band(c, f, t, -13, 13, y + .012));
    for (const e of [f, t]) { bLines.push(band(c, e - .07, e + .07, -13, 13, y + .018)); glows.push(glowLine(c, e - .35, e + .35, -13, 13, y + .014)); }
    for (const s of [-1, 1]) {
      for (const o of [4.25, 5.75, 1.65, 8.35]) { bLines.push(band(c, f, t, Math.min(s * (o - .09), s * (o + .09)), Math.max(s * (o - .09), s * (o + .09)), y + .02)); glows.push(glowLine(c, f, t, s * o - .35, s * o + .35, y + .016)); }
    }
  }
  root.add(mesh(flat, ceramic, 'boulevard-ceramic', false), mesh(channels, channel, 'boulevard-channels', false), mesh(chWalls, channelWall, 'boulevard-channel-walls', false), mesh(risers, riser, 'boulevard-risers'), mesh(bLines, bridgeLine, 'boulevard-bridge-lines', false), mesh(rails, railLight, 'boulevard-rails', false), mesh(seams, seamLight, 'boulevard-seams', false),
    mesh(glows, lineGlow, 'boulevard-line-glow', false), mesh(paving, footway, 'boulevard-terraces'), mesh(walls, trim, 'boulevard-planters'), mesh(soil, leaf, 'boulevard-beds'), mesh(blades, metal, 'boulevard-blades'),
    mesh(pools, bladePool, 'boulevard-blade-glow', false), mesh(deck, bridgeDeck, 'boulevard-bridge', false));
  plantBeds(root, beds);
  return root;
}

/** Stage-1 cuts (`repairRoads` extra strips): the surveyed streets under the U route, as rectangles every 10 m reaching 9.5 m either side of the
 * kit's centre (the surveyed road and its paving lie within it; the ④ band's paving starts 14 m out), and the pieces the U leaves: ②'s west stub
 * past the corner and ①'s south-west extension to the ④ band. */
export function streetCuts() {
  const u = routes().streets[0], L = u.getLength(), out: [number, number, number, number, number][] = [];
  for (let d = STREET_KIT.from; d < L; d += 10) { const a = u.getPointAt(Math.max(d - .5, 0) / L), b = u.getPointAt(Math.min(d + 10.5, L) / L); out.push([a.x, a.z, b.x, b.z, 9.5]); }
  out.push([-128, 1.5, -168, 29.5, 6], [-208.7, -85.3, -302, -23.2, 6]);
  return out;
}
/** Section A along the U route (`STREET_KIT`): the ceramic and footway join `environment` (it then stands on them); the planters, plants, rings and
 * lines come back for the scene. Planters also keep 1.5 m clear of every Yurikamome pier within the verges, found in the loaded environment. */
export function streetNetwork(environment: T.Object3D) {
  const u = routes().streets[0], L = u.getLength(), K = STREET_KIT, samples = Array.from({ length: Math.ceil(L) + 1 }, (_, d) => frame(u, d, L));
  const hits: [number[], number[]] = [[], []], v = new T.Vector3();
  environment.updateMatrixWorld(true);
  environment.traverse(o => {
    if (!(o instanceof T.Mesh) || !o.name.startsWith('YURIKAMOME_PIERS')) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (v.y > 4) continue;
      let best = 0, e = Infinity; samples.forEach((f, d) => { const q = (f.p.x - v.x) ** 2 + (f.p.z - v.z) ** 2; if (q < e) { e = q; best = d; } });
      const f = samples[best], off = (v.x - f.p.x) * f.n.x + (v.z - f.p.z) * f.n.z, side = off < 0 ? 0 : 1;
      if (Math.abs(off) < K.half + 12.5 && best > 0 && best < samples.length - 1) hits[side].push(best);
    }
  });
  // Pier spans per side: metres along that a pier's foot reaches, padded 1.5 m and merged.
  const piers = hits.map(ds => ds.sort((a, b) => a - b).reduce((out: Span[], d) => { const last = out.at(-1); if (last && d - 1.5 <= last[1]) last[1] = d + 1.5; else out.push([d - 1.5, d + 1.5]); return out; }, []));
  const root = avenueStreet(u, K.from, L, [-K.half, K.half], { reach: K.inside, gaps: [...K.gaps.inside, ...piers[0]] }, { reach: K.outside, gaps: [...K.gaps.outside, ...piers[1]] }, K.crossings, () => 0);
  for (const name of ['street-ceramic', 'street-footway']) environment.add(root.getObjectByName(name)!);
  root.name = 'street-network';
  return root;
}

/** DEV `?roadKit` preview (stage 2): B on the planned boulevard south of the Fuji frame (road redesign sketch v2), with the old ~90 m major band
 * under it cut away, and four static demo pods on its channels. */
export const ROAD_KIT_PREVIEW = {
  cuts: [[-230, 295, 140, 15, 58]] as [number, number, number, number, number][],
  boulevard: [[-215, 272], [-160, 238], [-120, 212], [-75, 182], [-10, 170], [70, 168], [120, 172], [152, 160]] as const,
  bridge: 218,
};
export const previewBoulevard = () => new T.CatmullRomCurve3(ROAD_KIT_PREVIEW.boulevard.map(([x, z]) => new T.Vector3(x, 0, z)));
export function streetKitPreview(environment: T.Object3D) {
  const root = new T.Group(); root.name = 'street-kit-preview';
  const terrain = environment.getObjectByName('TERRAIN_LOW_DENSITY'), ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0);
  environment.updateMatrixWorld(true);
  const terrainAt = (x: number, z: number) => { if (!terrain) return 0; ray.set(new T.Vector3(x, 50, z), down); return Math.max(0, ray.intersectObject(terrain, true)[0]?.point.y ?? 0); };
  const boulevard = previewBoulevard();
  root.add(boulevardStreet(boulevard, 0, boulevard.getLength(), [ROAD_KIT_PREVIEW.bridge], terrainAt));
  const pose = new T.Object3D(), pods = streetPodFleet(root, 4, 'street-kit-pods');
  ([[212, 1], [234, 1], [214, -1], [236, -1]] as const).forEach(([d, s], i) => {
    const f = frame(boulevard, d, boulevard.getLength()); pose.position.copy(f.p).addScaledVector(f.n, s * 5); pose.position.y = .235 + terrainAt(pose.position.x, pose.position.z);
    pose.rotation.set(0, Math.atan2(f.t.x, f.t.z) + (s > 0 ? 0 : Math.PI), 0); pods.set(i, pose);
  });
  pods.flush();
  return root;
}
