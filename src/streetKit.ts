// 2127 street kit (road redesign, owner targets 2026-11-04 in ~/city2127-evidence/road-design/gen): A, the light-guided shared avenue
// (avenue-A.jpg) and B, the maglev guide-channel boulevard (boulevard-B.jpg). Each street is built from a centreline and a cross-section
// of bands in metres left of the route (`n`, up × tangent, as mobility's carriageway inlays). DEV `?roadKit` lays one prototype of each.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { leaf, trim } from './cityRig.ts';
import { glowTexture } from './glowTexture.ts';
import { plantCanopy, plantShrubs } from './coastalCanopy.ts';
import { routes } from './mobility.ts';

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
const trough = new T.MeshStandardMaterial({ color: '#d9dcdc', roughness: .3, metalness: .5 });
// Cool white-blue technology light (CITY_MASTER_TASTE: low saturation); `updateStreetKit` raises it at night.
const seamLight = new T.MeshBasicMaterial({ color: new T.Color('#d8ecff') });
const railLight = new T.MeshBasicMaterial({ color: new T.Color('#bfe0ff') });
const field = new T.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: .28, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
const halo = new T.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false });
const crossing = new T.MeshStandardMaterial({ color: '#f7fbff', emissive: '#d8ecff', emissiveIntensity: .6, roughness: .3 });
// Ground finishes sit centimetres apart (as odaibaScene's groundLayer): each later layer gets a stronger offset so it draws over the one below.
for (const [m, k] of [[ceramic, 1], [footway, 1], [trough, 2], [seamLight, 3], [railLight, 3], [crossing, 4]] as const) { m.polygonOffset = true; m.polygonOffsetFactor = m.polygonOffsetUnits = -4 * k; }
const lightMaterials = [seamLight, railLight];
// Canvas textures are made on first build, so the module also loads where there is no DOM (node tests).
const textured = () => { ceramic.map ??= panelTexture(); halo.map ??= glowTexture(); };
export function updateStreetKit(dark: number) {
  // Day: just over white so seams read as lit lines; night: above the bloom threshold.
  for (const m of lightMaterials) m.color.set(m === seamLight ? '#7fc0ff' : '#74bbff').multiplyScalar(1.25 + dark * 1.5);
  crossing.emissiveIntensity = .6 + dark * 1.4; field.opacity = .2 + dark * .25; halo.opacity = .35 + dark * .5;
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
/** Stadium planter (length l, width w) at frame `f` with offset `o`: white rim wall and a sunken bed; returns its pieces and the bed's points for planting. */
function planter(f: ReturnType<typeof frame>, o: number, l: number, w: number) {
  const r = w / 2, rim = .35, outer = new T.Shape(), inner = new T.Path();
  outer.absarc(l / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); outer.absarc(-l / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  inner.absarc(l / 2 - r, 0, r - rim, -Math.PI / 2, Math.PI / 2, false); inner.absarc(-l / 2 + r, 0, r - rim, Math.PI / 2, Math.PI * 1.5, false);
  outer.holes.push(inner);
  const yaw = Math.atan2(f.t.x, f.t.z), centre = f.p.clone().addScaledVector(f.n, o), place = (g: T.BufferGeometry) => g.rotateX(-Math.PI / 2).rotateY(yaw - Math.PI / 2).translate(centre.x, ground(centre.x, centre.z), centre.z);
  const wall = place(new T.ExtrudeGeometry(outer, { depth: .5, bevelEnabled: false, curveSegments: 10 }));
  const bed = place(new T.ShapeGeometry(new T.Shape(inner.getPoints(10)), 10)).translate(0, .42, 0);
  return { wall, bed, centre, y: ground(centre.x, centre.z), yaw, along: new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), across: new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), l, w: w - 2 * rim };
}
type Bed = ReturnType<typeof planter>;
/** Dense shrub band and a few trees in each bed (coastalCanopy batches: one draw each for the whole kit). */
function plantBeds(root: T.Object3D, beds: Bed[], trees: 'broadleaf' | 'columnar') {
  const shrubs: [number, number, number, number, number][] = [], crowns: { position: number[]; scale: number; type: string }[] = [];
  beds.forEach((b, k) => {
    const rows = Math.max(1, Math.round(b.w / 1.1));
    for (let s = -b.l / 2 + b.w / 2; s <= b.l / 2 - b.w / 2 + 1e-3; s += .9) for (let r = 0; r < rows; r++) {
      const q = rows === 1 ? 0 : -b.w / 2 + .55 + r * (b.w - 1.1) / (rows - 1), p = b.centre.clone().addScaledVector(b.along, s + (r % 2) * .45).addScaledVector(b.across, q), h = Math.sin(s * 3.1 + r * 1.7 + k) * .5 + .5;
      shrubs.push([p.x, b.y + .42, p.z, .5 + h * .25, .45 + h * .5]);
    }
    const gap = trees === 'columnar' ? 5 : 7;
    for (let s = -b.l / 2 + gap / 2 + 1; s < b.l / 2 - 1; s += gap) { const p = b.centre.clone().addScaledVector(b.along, s); crowns.push({ position: [p.x, -p.z, b.y + .42], scale: trees === 'columnar' ? .42 : .34 + (Math.round(s) % 3) * .05, type: trees }); }
  });
  plantShrubs(root, shrubs); plantCanopy(root, { instances: crowns });
}
const mesh = (geometries: T.BufferGeometry[], material: T.Material, name: string, shadow = true) => {
  const m = new T.Mesh(mergeGeometries(geometries), material); geometries.forEach(g => g.dispose()); m.name = name; m.receiveShadow = shadow; m.castShadow = shadow && !(material instanceof T.MeshBasicMaterial); return m;
};

/** Section A: kerbless ceramic carriageway (lit seams at both edges and the lane line), slim raised metal edge bands with a lit seam,
 * pale stone footways, stadium bioswale planters on both verges, white emitter rings hovering 6 m over them, light-panel crossings.
 * `carriage` [left, right] offsets, `left`/`right` verge reach beyond the edge band (0 = none), `crossings` in metres along. */
export function avenueStreet(c: Curve, d0: number, d1: number, carriage: [number, number], left: number, right: number, crossings: number[] = [], groundAt = ground) {
  textured(); ground = groundAt; const root = new T.Group(); root.name = 'street-avenue';
  const [a, b] = carriage, y = .235, mid = (a + b) / 2, len = c.getLength();
  const flat: T.BufferGeometry[] = [band(c, d0, d1, a, b, y, 0, [3, (b - a) / 2])], paving: T.BufferGeometry[] = [], metalG: T.BufferGeometry[] = [], seams: T.BufferGeometry[] = [];
  for (const o of [a + .45, mid, b - .45]) seams.push(band(c, d0, d1, o - .08, o + .08, y + .006));
  for (const [e, s] of [[a, -1], [b, 1]] as const) {
    metalG.push(band(c, d0, d1, e + s * .02, e + s * .32, y + .1, .1));
    seams.push(band(c, d0, d1, e + s * .14, e + s * .2, y + .102));
    const reach = s < 0 ? left : right;
    if (reach) paving.push(band(c, d0, d1, e + s * .32, e + s * Math.min(reach, 3.4), y - .002));
  }
  const beds: Bed[] = [], walls: T.BufferGeometry[] = [], soil: T.BufferGeometry[] = [], rings: T.BufferGeometry[] = [], glows: T.BufferGeometry[] = [];
  const L = 22, gap = 6;
  for (const [e, s, reach] of [[a, -1, left], [b, 1, right]] as const) {
    if (reach < 5.5) continue;
    const w = Math.min(reach - 3.6, 5), o = e + s * (3.6 + w / 2);
    for (let d = d0 + L / 2 + 2; d < d1 - L / 2; d += L + gap) {
      if (crossings.some(x => Math.abs(x - d) < L / 2 + 4)) continue;
      const bed = planter(frame(c, d, len), o, L, w); beds.push(bed); walls.push(bed.wall); soil.push(bed.bed);
      // One emitter ring per planter, over its crossing-side end: white metal hoop, lit inner seam, a faint field glow on the bed below.
      const at = bed.centre.clone().addScaledVector(bed.along, L / 2 - 4);
      rings.push(new T.TorusGeometry(2.8, .2, 8, 48).rotateX(Math.PI / 2).translate(at.x, bed.y + 6, at.z));
      seams.push(new T.TorusGeometry(2.58, .07, 6, 48).rotateX(Math.PI / 2).translate(at.x, bed.y + 5.9, at.z));
      glows.push(new T.PlaneGeometry(7, 7).rotateX(-Math.PI / 2).translate(at.x, bed.y + 1.4, at.z));
    }
  }
  // Light-panel crossings: a row of 1.2 m square panels per metre of carriageway, 3.6 m deep, over the ceramic.
  const panels: T.BufferGeometry[] = [];
  for (const d of crossings) for (let o = a + .2; o < b - .2; o += 1.45) for (const k of [-1, 1]) panels.push(band(c, d + k * .9 - .6, d + k * .9 + .6, o, Math.min(o + 1.2, b - .2), y + .012));
  root.add(mesh(flat, ceramic, 'street-ceramic', false), mesh(metalG, metal, 'street-edge'), mesh(seams, seamLight, 'street-seams', false));
  if (paving.length) root.add(mesh(paving, footway, 'street-footway', false));
  if (panels.length) root.add(mesh(panels, crossing, 'street-crossing', false));
  if (walls.length) { root.add(mesh(walls, trim, 'street-planters'), mesh(soil, leaf, 'street-beds'), mesh(rings, metal, 'street-rings'), mesh(glows, halo, 'street-ring-glow', false)); plantBeds(root, beds, 'broadleaf'); }
  return root;
}

/** Section B (24 m): planted median (slim columnar trees, shrubs) between two 7 m ceramic carriageways, each lane riding a recessed
 * metal guide channel with a lit centre rail and translucent field edges; footways on 0.3 m terraces edged with a lit seam and lined
 * with planters; curved white lamp blades along the terrace edges every 24 m; flush light-bridge crossings. */
export function boulevardStreet(c: Curve, d0: number, d1: number, crossings: number[] = [], groundAt = ground) {
  textured(); ground = groundAt; const root = new T.Group(); root.name = 'street-boulevard';
  const y = .235, len = c.getLength(), flat: T.BufferGeometry[] = [], paving: T.BufferGeometry[] = [], metalG: T.BufferGeometry[] = [], troughG: T.BufferGeometry[] = [];
  const rails: T.BufferGeometry[] = [], fields: T.BufferGeometry[] = [], seams: T.BufferGeometry[] = [], panels: T.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const lo = (v: number) => s * v;
    flat.push(band(c, d0, d1, Math.min(lo(1.5), lo(8.5)), Math.max(lo(1.5), lo(8.5)), y, 0, [3, 1.75]));
    for (const lane of [3.25, 6.75]) {
      const n = lo(lane);
      troughG.push(band(c, d0, d1, n - .8, n + .8, y + .004));
      rails.push(band(c, d0, d1, n - .09, n + .09, y + .03, .025));
      for (const e of [-.8, .8]) { metalG.push(band(c, d0, d1, n + e - .07, n + e + .07, y + .06, .06)); fields.push(band(c, d0, d1, n + e, n + e + 1e-3, y + .42, .36)); }
    }
    // Terrace: 0.3 m step at the carriageway edge with a lit seam on its lip, stone footway, planter strip at the outer edge.
    paving.push(band(c, d0, d1, Math.min(lo(8.5), lo(13)), Math.max(lo(8.5), lo(13)), y + .3, .3));
    seams.push(band(c, d0, d1, lo(8.62) - .05, lo(8.62) + .05, y + .303));
  }
  // Median planter strip and its metal kerb.
  metalG.push(band(c, d0, d1, -1.5, 1.5, y + .12, .12));
  const beds: Bed[] = [], walls: T.BufferGeometry[] = [], soil: T.BufferGeometry[] = [], blades: T.BufferGeometry[] = [];
  for (let d = d0 + 14; d < d1 - 12; d += 30) {
    if (crossings.some(x => Math.abs(x - d) < 18)) continue;
    const bed = planter(frame(c, d, len), 0, 24, 2.8); beds.push(bed); walls.push(bed.wall.translate(0, .12, 0)); soil.push(bed.bed.translate(0, .12, 0));
  }
  const terraceBeds: Bed[] = [];
  for (const s of [-1, 1]) for (let d = d0 + 10; d < d1 - 9; d += 19) {
    if (crossings.some(x => Math.abs(x - d) < 14)) continue;
    const bed = planter(frame(c, d, len), s * 11.9, 15, 2); terraceBeds.push(bed); walls.push(bed.wall.translate(0, .3, 0)); soil.push(bed.bed.translate(0, .3, 0));
  }
  // Lamp blades: a tapering crescent 8.5 m tall leaning over the carriageway, lit strip on its inner face.
  const blade = new T.Shape(); blade.moveTo(-.22, 0); blade.quadraticCurveTo(-.3, 5.5, 1.5, 8.5); blade.lineTo(1.35, 8.6); blade.quadraticCurveTo(.12, 5.5, .22, 0); blade.closePath();
  const bladeG = new T.ExtrudeGeometry(blade, { depth: .28, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -.14);
  const strip = new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(.18, 1.2, 0), new T.Vector3(.1, 5.6, 0), new T.Vector3(1.38, 8.35, 0)), 16, .06, 5);
  for (const s of [-1, 1]) for (let d = d0 + 6; d < d1 - 4; d += 24) {
    // Shape +x (the lean) turns to face the carriageway, -s × n.
    const f = frame(c, d, len), at = f.p.clone().addScaledVector(f.n, s * 9.6), put = (g: T.BufferGeometry) => g.clone().rotateY(Math.atan2(s * f.n.z, -s * f.n.x)).translate(at.x, y + .3 + ground(at.x, at.z), at.z);
    blades.push(put(bladeG)); seams.push(put(strip));
  }
  // Light bridge: a lit deck across both carriageways at each crossing, flush over the channels.
  for (const d of crossings) panels.push(band(c, d - 2, d + 2, -8.5, 8.5, y + .05, .05));
  root.add(mesh(flat, ceramic, 'boulevard-ceramic', false), mesh(troughG, trough, 'boulevard-channels', false), mesh(metalG, metal, 'boulevard-metal'),
    mesh(rails, railLight, 'boulevard-rails', false), mesh(fields, field, 'boulevard-fields', false), mesh(paving, footway, 'boulevard-terraces'),
    mesh(seams, seamLight, 'boulevard-seams', false), mesh(walls, trim, 'boulevard-planters'), mesh(soil, leaf, 'boulevard-beds'), mesh(blades, metal, 'boulevard-blades'));
  if (panels.length) root.add(mesh(panels, crossing, 'boulevard-bridge', false));
  plantBeds(root, beds, 'columnar'); plantBeds(root, terraceBeds, 'broadleaf');
  return root;
}

/** DEV `?roadKit` preview: A over the guideway avenue from d 270 to its junction (its street cars keep their lanes, −5.1 … −0.5 m),
 * B on the planned boulevard south of the Fuji frame (road redesign sketch v2), with the old ~90 m major band under it cut away. */
export const ROAD_KIT_PREVIEW = {
  cuts: [[-230, 295, 140, 15, 58]] as [number, number, number, number, number][],
  boulevard: [[-215, 272], [-160, 238], [-120, 212], [-75, 182], [-10, 170], [70, 168], [120, 172], [152, 160]] as const,
};
export const previewBoulevard = () => new T.CatmullRomCurve3(ROAD_KIT_PREVIEW.boulevard.map(([x, z]) => new T.Vector3(x, 0, z)));
export function streetKitPreview(environment: T.Object3D) {
  const root = new T.Group(); root.name = 'street-kit-preview';
  const terrain = environment.getObjectByName('TERRAIN_LOW_DENSITY'), ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0);
  environment.updateMatrixWorld(true);
  const terrainAt = (x: number, z: number) => { if (!terrain) return 0; ray.set(new T.Vector3(x, 50, z), down); return Math.max(0, ray.intersectObject(terrain, true)[0]?.point.y ?? 0); };
  const avenue = routes().streets[1], boulevard = previewBoulevard();
  root.add(avenueStreet(avenue, 270, avenue.getLength() - 4, [-5.1, -.5], 9, 9, [286, 480], () => 0), boulevardStreet(boulevard, 0, boulevard.getLength(), [150], terrainAt));
  return root;
}
