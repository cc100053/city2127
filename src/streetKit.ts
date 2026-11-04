// 2127 street kit (road redesign, owner targets 2026-11-04 in ~/city2127-evidence/road-design/gen): A, the light-guided shared avenue
// (avenue-A.jpg) and B, the maglev guide-channel boulevard (boulevard-B.jpg). Each street is built from a centreline and a cross-section
// of bands in metres left of the route (`n`, up × tangent, as mobility's carriageway inlays). DEV `?roadKit` lays one prototype of each.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { leaf, trim } from './cityRig.ts';
import { glowTexture } from './glowTexture.ts';
import { hash, plantCanopy, plantShrubs } from './coastalCanopy.ts';
import { pedestrians, routes, streetPodFleet } from './mobility.ts';

/** Large pale ceramic panels: a 256 px tile with fine seams on two edges, repeated per panel in metres through the strip's uv. */
function panelTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!; g.fillStyle = '#f3f1eb'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#c9c6bd'; g.fillRect(0, 0, 256, 3); g.fillRect(0, 0, 3, 256);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
const ceramic = new T.MeshStandardMaterial({ color: '#d3d2cd', roughness: .42 });
const footway = new T.MeshStandardMaterial({ color: '#e4dfd3', roughness: .7 });
const metal = new T.MeshStandardMaterial({ color: '#f4f5f3', roughness: .22, metalness: .55 });
const channel = new T.MeshStandardMaterial({ color: '#9fb2c6', roughness: .35, metalness: .3 });
// Cool white-blue technology light (CITY_MASTER_TASTE: low saturation); `updateStreetKit` raises it at night.
const seamLight = new T.MeshBasicMaterial({ color: new T.Color('#d8ecff') });
const railLight = new T.MeshBasicMaterial({ color: new T.Color('#bfe0ff') });
// Soft additive light: `halo` the pool under each emitter ring, `lineGlow` the band under every lit line, `bladePool` the pool under each lamp blade.
const glows = (opacity: number) => new T.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
const halo = glows(.3), lineGlow = glows(0), bladePool = glows(0);
const crossing = new T.MeshStandardMaterial({ color: '#f7fbff', emissive: '#d8ecff', emissiveIntensity: .6, roughness: .3 });
const bridgeDeck = crossing.clone(); // B's light bridge: dimmer than the panels, so the lines laid over it stay readable
// Ground finishes sit centimetres apart (as odaibaScene's groundLayer): each later layer gets a stronger offset so it draws over the one below.
for (const [m, k] of [[ceramic, 1], [footway, 1], [lineGlow, 2], [seamLight, 3], [railLight, 3], [crossing, 4], [bridgeDeck, 2]] as const) { m.polygonOffset = true; m.polygonOffsetFactor = m.polygonOffsetUnits = -4 * k; }
const lightMaterials = [seamLight, railLight];
// Canvas textures are made on first build, so the module also loads where there is no DOM (node tests).
const textured = () => { ceramic.map ??= panelTexture(); const g = halo.map ?? glowTexture(); for (const m of [halo, lineGlow, bladePool]) m.map ??= g; };
export function updateStreetKit(dark: number) {
  // Day: just over white so seams read as lit lines; night: about 4x, well above the bloom threshold, with a soft glow band under each line.
  for (const m of lightMaterials) m.color.set(m === seamLight ? '#7fc0ff' : '#74bbff').multiplyScalar(1.25 + dark * 2.75);
  crossing.emissiveIntensity = .6 + dark * 1.8; bridgeDeck.emissiveIntensity = .4 + dark * .5; halo.opacity = .3 + dark * .55; lineGlow.opacity = dark * .5; bladePool.opacity = dark * .6;
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
const cut = (parts: Span[], avoid: Span[], min: number) => avoid.reduce((ps, [f, t]) => ps.flatMap(([p, q]): Span[] => t <= p || f >= q ? [[p, q]] : [[p, f], [t, q]]).filter(([p, q]) => q - p >= min), parts);
/** Bed spans [centre, length] of up to `L` m every `L + gap` metres from d0 to d1, cut around `avoid` (pieces under 8 m dropped). */
function spans(d0: number, d1: number, L: number, gap: number, avoid: Span[]) {
  const out: Span[] = [];
  for (let s = d0; s + 8 <= d1; s += L + gap) for (const [p, q] of cut([[s, Math.min(s + L, d1)]], avoid, 8)) out.push([(p + q) / 2, q - p]);
  return out;
}

/** A planting bed: inner size, soil height over `at`'s point, and `at(s, q)` the point `s` m along and `q` m across from its middle. `kind`: the trees it takes. */
type Bed = { l: number; w: number; top: number; at: (s: number, q: number) => T.Vector3; kind: 'broadleaf' | 'columnar' | 'none' };
/** Stadium planter (length l, width w, wall h tall from `base`) at frame `f` with offset `o`: white rim wall and a sunken bed (soil 0.08 m under the rim top). */
function planter(f: ReturnType<typeof frame>, o: number, l: number, w: number, kind: Bed['kind'], base = 0, h = .5) {
  const r = w / 2, rim = .35, outer = new T.Shape(), inner = new T.Path();
  outer.absarc(l / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); outer.absarc(-l / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  inner.absarc(l / 2 - r, 0, r - rim, -Math.PI / 2, Math.PI / 2, false); inner.absarc(-l / 2 + r, 0, r - rim, Math.PI / 2, Math.PI * 1.5, false);
  outer.holes.push(inner);
  const yaw = Math.atan2(f.t.x, f.t.z), centre = f.p.clone().addScaledVector(f.n, o), g0 = ground(centre.x, centre.z), place = (g: T.BufferGeometry, up: number) => g.rotateX(-Math.PI / 2).rotateY(yaw - Math.PI / 2).translate(centre.x, g0 + base + up, centre.z);
  const along = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), across = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const wall = place(new T.ExtrudeGeometry(outer, { depth: h, bevelEnabled: false, curveSegments: 10 }), 0), soil = place(new T.ShapeGeometry(new T.Shape(inner.getPoints(10)), 10), h - .08);
  return { wall, soil, bed: { l, w: w - 2 * rim, top: h - .08, kind, at: (s: number, q: number) => centre.clone().addScaledVector(along, s).addScaledVector(across, q).setY(g0 + base) } satisfies Bed };
}
/** The same bed as one continuous run along the route from d0 to d1 (offset o, width w, standing on `base`): rim walls, end caps and soil. */
function run(c: Curve, d0: number, d1: number, o: number, w: number, base: number, kind: Bed['kind'], h = .5) {
  const len = c.getLength(), lo = o - w / 2, hi = o + w / 2, r = .35, top = base + h, mid = (d0 + d1) / 2;
  const walls = [band(c, d0, d1, lo, lo + r, top, h), band(c, d0, d1, hi - r, hi, top, h), band(c, d0, d0 + r, lo, hi, top, h), band(c, d1 - r, d1, lo, hi, top, h)];
  const at = (s: number, q: number) => { const { p, n } = frame(c, mid + s, len), x = p.x + n.x * (o + q), z = p.z + n.z * (o + q); return new T.Vector3(x, base + ground(x, z), z); };
  return { walls, soil: band(c, d0 + r, d1 - r, lo + r, hi - r, top - .08), bed: { l: d1 - d0, w: w - 2 * r, top: h - .08, kind, at } satisfies Bed };
}

// Leafy plants: one fern clump (6 flattened cones fanned from a point, tilted), one slim cypress (an elongated icosahedron on a short trunk).
const fernGeometry = () => mergeGeometries(Array.from({ length: 6 }, (_, k) => new T.ConeGeometry(.17, k % 2 ? 1 : 1.3, 4).scale(1, 1, .35).translate(0, .6, 0).rotateX(k % 2 ? 1.1 : .8).rotateY(k * Math.PI / 3 + .4)));
const foliage = () => new T.MeshStandardMaterial({ color: '#ffffff', roughness: .9, side: T.DoubleSide });
/** Dense leafy fill for every bed: 3 or more overlapping rows of 0.6–1.3 m shrubs and fern clumps (half and half), plus its trees (coastalCanopy
 * shrub and broadleaf batches, and one fern and one cypress batch here: one draw per shape for the street). */
function plantBeds(root: T.Object3D, beds: Bed[]) {
  const shrubs: [number, number, number, number, number][] = [], ferns: [T.Vector3, number][] = [], crowns: { position: number[]; scale: number; type: string }[] = [], cypress: T.Vector3[] = [];
  beds.forEach((b, k) => {
    const rows = Math.max(2, Math.round(b.w / 1.1));
    let i = 0;
    for (let s = -b.l / 2 + .5; s <= b.l / 2 - .5 + 1e-3; s += .8, i++) for (let r = 0; r < rows; r++) {
      const size = .6 + hash(i * 3 + r * 17 + k) * .7, q = -b.w / 2 + .5 + r * (b.w - 1) / (rows - 1) + (hash(i + r * 5 + k * 3) - .5) * .25;
      const p = b.at(s + (r % 2) * .4, q); p.y += b.top;
      if (hash(i * 7 + r * 13 + k * 5) < .5) shrubs.push([p.x, p.y, p.z, size * .5, size * .55]); else ferns.push([p, size]);
    }
    if (b.kind === 'broadleaf') for (const s of b.l < 12 ? [0] : [-.3 * b.l, 0]) { const p = b.at(s, 0); crowns.push({ position: [p.x, -p.z, p.y + b.top], scale: .42 + hash(k + s) * .1, type: 'broadleaf' }); }
    if (b.kind === 'columnar') for (let s = -b.l / 2 + 3; s < b.l / 2; s += 6) { const p = b.at(s, 0); p.y += b.top; cypress.push(p); }
  });
  plantShrubs(root, shrubs); if (crowns.length) plantCanopy(root, { instances: crowns });
  const d = new T.Object3D(), color = new T.Color();
  if (ferns.length) {
    const m = new T.InstancedMesh(fernGeometry(), foliage(), ferns.length); m.name = 'street-ferns'; m.receiveShadow = true;
    ferns.forEach(([p, size], i) => { d.position.copy(p); d.rotation.set(0, hash(i) * 6.3, 0); d.scale.setScalar(size); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, color.setHSL(.24 + hash(i + 4) * .08, .5, .3 + (i % 3) * .06)); });
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

/** Section A: kerbless ceramic carriageway (lit seams at both edges and the lane line, a 0.2 m white metal edge), pale stone footways flush with it,
 * stadium bioswale planters directly at both edges (dense shrubs, ferns and trees), white emitter rings hovering over them, light-panel crossings.
 * `carriage` [left, right] offsets, `left`/`right` verge reach beyond the edge (0 = none), `crossings` in metres along, `piers` [from, to] ranges
 * the right planters keep clear of. */
export function avenueStreet(c: Curve, d0: number, d1: number, carriage: [number, number], left: number, right: number, crossings: number[] = [], groundAt = ground, piers: Span[] = []) {
  textured(); ground = groundAt; const root = new T.Group(); root.name = 'street-avenue';
  const [a, b] = carriage, y = .235, mid = (a + b) / 2, len = c.getLength(), W = 4.2;
  const flat: T.BufferGeometry[] = [band(c, d0, d1, a, b, y, 0, [3, (b - a) / 2])], paving: T.BufferGeometry[] = [], metalG: T.BufferGeometry[] = [], seams: T.BufferGeometry[] = [], glows: T.BufferGeometry[] = [];
  for (const o of [a + .45, mid, b - .45]) { seams.push(band(c, d0, d1, o - .07, o + .07, y + .006)); glows.push(glowLine(c, d0, d1, o - .35, o + .35, y + .004)); }
  for (const [e, s] of [[a, -1], [b, 1]] as const) {
    metalG.push(band(c, d0, d1, e + s * .02, e + s * .22, y + .05, .05));
    const reach = s < 0 ? left : right;
    if (reach) paving.push(band(c, d0, d1, e + s * .22, e + s * reach, y - .002));
  }
  const beds: Bed[] = [], walls: T.BufferGeometry[] = [], soil: T.BufferGeometry[] = [], rings: T.BufferGeometry[] = [], pools: T.BufferGeometry[] = [];
  const clear = crossings.map((x): Span => [x - 6, x + 6]);
  for (const [e, s, reach, hold] of [[a, -1, left, []], [b, 1, right, piers]] as const) {
    if (reach < W + .35 + 1) continue;
    for (const [d, l] of spans(d0 + 4, d1, 20, 5, [...clear, ...hold])) {
      const { wall, soil: bedSoil, bed } = planter(frame(c, d, len), e + s * (.35 + W / 2), l, W, 'broadleaf'); beds.push(bed); walls.push(wall); soil.push(bedSoil);
      if (l < 12) continue;
      // One emitter ring per planter over its crossing-side end: white metal hoop 2.6 m over the bed, lit inner seam, a pool of glow on the shrubs below.
      const at = bed.at(l / 2 - 2.8, 0), top = at.y + bed.top;
      rings.push(new T.TorusGeometry(2, .16, 8, 48).rotateX(Math.PI / 2).translate(at.x, top + 2.6, at.z));
      seams.push(new T.TorusGeometry(1.84, .06, 6, 48).rotateX(Math.PI / 2).translate(at.x, top + 2.55, at.z));
      pools.push(new T.PlaneGeometry(5, 5).rotateX(-Math.PI / 2).translate(at.x, top + 1.25, at.z));
    }
  }
  // Light-panel crossings: two rows of 1.2 m square panels, 0.25 m apart, across the whole carriageway.
  const panels: T.BufferGeometry[] = [], n = Math.floor((b - a + .25) / 1.45), x0 = a + (b - a - (n * 1.45 - .25)) / 2;
  for (const d of crossings) for (let i = 0; i < n; i++) for (const k of [-1, 1]) panels.push(band(c, d + k * .725 - .6, d + k * .725 + .6, x0 + i * 1.45, x0 + i * 1.45 + 1.2, y + .012));
  root.add(mesh(flat, ceramic, 'street-ceramic', false), mesh(metalG, metal, 'street-edge'), mesh(seams, seamLight, 'street-seams', false), mesh(glows, lineGlow, 'street-line-glow', false), mesh(paving, footway, 'street-footway', false),
    mesh(panels, crossing, 'street-crossing', false), mesh(walls, trim, 'street-planters'), mesh(soil, leaf, 'street-beds'), mesh(rings, metal, 'street-rings'), mesh(pools, halo, 'street-ring-glow', false));
  plantBeds(root, beds);
  return root;
}

/** Section B (24 m): planted median (slim cypresses, shrubs and ferns) between two 7 m ceramic carriageways, each with one recessed guide channel
 * (two lit lines inside, lit lines at the carriageway edges); footways on 0.3 m terraces edged with a lit seam and a continuous planter band; curved
 * white lamp blades every 20 m along the terrace edges; flush light-bridge crossings (4 m deep) that the terraces step down to. */
export function boulevardStreet(c: Curve, d0: number, d1: number, crossings: number[] = [], groundAt = ground) {
  textured(); ground = groundAt; const root = new T.Group(); root.name = 'street-boulevard';
  const y = .235, len = c.getLength(), flat: T.BufferGeometry[] = [], paving: T.BufferGeometry[] = [], channels: T.BufferGeometry[] = [], rails: T.BufferGeometry[] = [], seams: T.BufferGeometry[] = [], glows: T.BufferGeometry[] = [];
  const walls: T.BufferGeometry[] = [], soil: T.BufferGeometry[] = [], blades: T.BufferGeometry[] = [], pools: T.BufferGeometry[] = [], deck: T.BufferGeometry[] = [], beds: Bed[] = [];
  // Lamp blade: a tapering crescent 8.5 m tall (0.7 m at the foot, 0.3 m at the tip, 0.45 m deep) leaning over the carriageway, lit tube along its inner edge.
  const blade = new T.Shape(); blade.moveTo(-.35, 0); blade.quadraticCurveTo(-.45, 5.5, 1.5, 8.45); blade.lineTo(1.25, 8.6); blade.quadraticCurveTo(.2, 5.5, .35, 0); blade.closePath();
  const bladeG = new T.ExtrudeGeometry(blade, { depth: .45, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -.225);
  const bladeStrip = new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(.35, 0, 0), new T.Vector3(.2, 5.5, 0), new T.Vector3(1.25, 8.6, 0)), 16, .05, 5);
  const bridges = crossings.map((x): Span => [x - 2, x + 2]), runs = cut([[d0, d1]], bridges, 1);
  for (const s of [-1, 1]) {
    // `B`: strip from offset a to b on this side (route range f..t); `G`: glow band of 0.7 m centred on offset o.
    const B = (a: number, b: number, yy: number, h = 0, tile: [number, number] = [1, 1], f = d0, t = d1) => band(c, f, t, Math.min(s * a, s * b), Math.max(s * a, s * b), yy, h, tile);
    const G = (o: number, yy: number, f = d0, t = d1) => glowLine(c, f, t, Math.min(s * (o - .35), s * (o + .35)), Math.max(s * (o - .35), s * (o + .35)), yy);
    flat.push(B(1.5, 3.85, y, 0, [3, 1.75]), B(6.15, 8.5, y, 0, [3, 1.75]));
    channels.push(B(3.85, 6.15, y - .06), B(3.83, 3.85, y, .06), B(6.15, 6.17, y, .06)); // floor and walls of the recessed channel
    for (const o of [4.25, 5.75]) { rails.push(B(o - .06, o + .06, y - .04)); glows.push(G(o, y - .025)); }
    for (const o of [1.65, 8.35]) { seams.push(B(o - .05, o + .05, y + .006)); glows.push(G(o, y + .004)); }
    // Terrace runs between the bridges: 0.3 m step with a lit lip, stone footway, one continuous planter band at the outer edge.
    for (const [p, q] of runs) {
      paving.push(B(8.5, 13, y + .3, .3, [1, 1], p, q)); seams.push(B(8.57, 8.67, y + .303, 0, [1, 1], p, q)); glows.push(G(8.62, y + .304, p, q));
      if (p > d0) paving.push(cap(c, p, s * 8.5, s * 13, y, y + .3, -1)); if (q < d1) paving.push(cap(c, q, s * 8.5, s * 13, y, y + .3, 1));
    }
    for (const [p, q] of cut([[d0, d1]], bridges.map(([f, t]): Span => [f - 2, t + 2]), 6)) { const r = run(c, p, q, s * 11.8, 2.4, y + .3, 'none'); walls.push(...r.walls); soil.push(r.soil); beds.push(r.bed); }
    // Lamp blades every 20 m at the carriageway side of the planter, with a light pool under each tip.
    for (let d = d0 + 6; d < d1 - 4; d += 20) {
      if (bridges.some(([f, t]) => d > f - 3 && d < t + 3)) continue;
      const f = frame(c, d, len), at = f.p.clone().addScaledVector(f.n, s * 9.7), top = y + .3 + ground(at.x, at.z), yaw = Math.atan2(s * f.n.z, -s * f.n.x); // shape +x (the lean) faces the carriageway, -s × n
      blades.push(bladeG.clone().rotateY(yaw).translate(at.x, top, at.z)); seams.push(bladeStrip.clone().rotateY(yaw).translate(at.x, top, at.z));
      const tip = at.clone().addScaledVector(f.n, -s * 1.4); pools.push(new T.PlaneGeometry(6, 6).rotateX(-Math.PI / 2).translate(tip.x, top + .02, tip.z));
    }
  }
  // Median: paved strip with raised planters (24 m beds, 3 m gaps, cut around the bridges); slim cypresses every 6 m.
  paving.push(band(c, d0, d1, -1.5, 1.5, y));
  const mediaGaps = bridges.map(([f, t]): Span => [f - 1.5, t + 1.5]);
  for (const [d, l] of spans(d0 + 4, d1, 24, 3, mediaGaps)) { const { wall, soil: bedSoil, bed } = planter(frame(c, d, len), 0, l, 3, 'columnar', y, .55); beds.push(bed); walls.push(wall); soil.push(bedSoil); }
  // Light bridges: a pale deck at carriageway level across the whole street and both terraces; channel and edge lines run on over it.
  for (const [f, t] of bridges) {
    deck.push(band(c, f, t, -13, 13, y + .012));
    for (const s of [-1, 1]) {
      for (const o of [4.25, 5.75, 1.65, 8.35]) { const lit = o === 4.25 || o === 5.75, a = Math.min(s * (o - .06), s * (o + .06)), b = Math.max(s * (o - .06), s * (o + .06)); (lit ? rails : seams).push(band(c, f, t, a, b, y + .02)); glows.push(glowLine(c, f, t, s * o - .35, s * o + .35, y + .016)); }
    }
  }
  root.add(mesh(flat, ceramic, 'boulevard-ceramic', false), mesh(channels, channel, 'boulevard-channels', false), mesh(rails, railLight, 'boulevard-rails', false), mesh(seams, seamLight, 'boulevard-seams', false),
    mesh(glows, lineGlow, 'boulevard-line-glow', false), mesh(paving, footway, 'boulevard-terraces'), mesh(walls, trim, 'boulevard-planters'), mesh(soil, leaf, 'boulevard-beds'), mesh(blades, metal, 'boulevard-blades'),
    mesh(pools, bladePool, 'boulevard-blade-glow', false), mesh(deck, bridgeDeck, 'boulevard-bridge', false));
  plantBeds(root, beds);
  return root;
}

/** DEV `?roadKit` preview: A over the guideway avenue from d 270 to its junction (street cars drive in its two lanes, `useKitCarriageway`), B on the
 * planned boulevard south of the Fuji frame (road redesign sketch v2), with the old ~90 m major band under it cut away. `piers`: the Yurikamome piers
 * on A's right verge (`YURIKAMOME_PIERS` footprints, d ranges along the avenue) padded by 1.5 m; `crossing`: A's first crossing, moved into the review frame. */
export const ROAD_KIT_PREVIEW = {
  cuts: [[-230, 295, 140, 15, 58]] as [number, number, number, number, number][],
  boulevard: [[-215, 272], [-160, 238], [-120, 212], [-75, 182], [-10, 170], [70, 168], [120, 172], [152, 160]] as const,
  crossing: 398, bridge: 218,
  piers: [[282.5, 289.5], [355.5, 361.5], [496.5, 505.5]] as Span[],
};
export const previewBoulevard = () => new T.CatmullRomCurve3(ROAD_KIT_PREVIEW.boulevard.map(([x, z]) => new T.Vector3(x, 0, z)));
export function streetKitPreview(environment: T.Object3D) {
  const root = new T.Group(); root.name = 'street-kit-preview';
  const terrain = environment.getObjectByName('TERRAIN_LOW_DENSITY'), ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0);
  environment.updateMatrixWorld(true);
  const terrainAt = (x: number, z: number) => { if (!terrain) return 0; ray.set(new T.Vector3(x, 50, z), down); return Math.max(0, ray.intersectObject(terrain, true)[0]?.point.y ?? 0); };
  const avenue = routes().streets[1], boulevard = previewBoulevard(), { crossing: cross, bridge } = ROAD_KIT_PREVIEW;
  root.add(avenueStreet(avenue, 270, avenue.getLength() - 4, [-7.6, -.5], 9, 9, [cross, 480], () => 0, ROAD_KIT_PREVIEW.piers), boulevardStreet(boulevard, 0, boulevard.getLength(), [bridge], terrainAt));
  // Static demo actors (the walking crowd is sparse and random): residents on A's plaza footway and at the crossing's kerbs, four pods on B's channels.
  const pose = new T.Object3D(), at = (c: Curve, d: number, o: number, yaw: number, lift: number, groundAt: (x: number, z: number) => number) => {
    const f = frame(c, d, c.getLength()); pose.position.copy(f.p).addScaledVector(f.n, o); pose.position.y = lift + groundAt(pose.position.x, pose.position.z); pose.rotation.set(0, Math.atan2(f.t.x, f.t.z) + yaw, 0);
  };
  const flatGround = () => 0, walkers: [number, number, number][] = [[352, -13.4, 0], [366, -15, Math.PI], [376, -14, 0], [388, -13.2, Math.PI], [402, -15.2, 0], [412, -14.2, Math.PI], [cross + .5, -8.3, Math.PI / 2], [cross + .5, .6, -Math.PI / 2]];
  const people = pedestrians(root, walkers.length, 'street-kit-people');
  walkers.forEach(([d, o, yaw], i) => { at(avenue, d, o, yaw, .235, flatGround); people.set(i, pose); people.gait(i, i * 1.3, i < 6 ? .5 : 0); });
  people.flush();
  const pods = streetPodFleet(root, 4, 'street-kit-pods');
  ([[238, 1], [262, 1], [246, -1], [270, -1]] as const).forEach(([d, s], i) => { at(boulevard, d, s * 5, s > 0 ? 0 : Math.PI, .235, terrainAt); pods.set(i, pose); });
  pods.flush();
  return root;
}
