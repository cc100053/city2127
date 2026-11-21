// Ground mask (owner 2026-11-21: "a real city has far less lawn; buildings should stand among streets and paving, not sprout from grass").
// The landscape shader (odaibaScene.ts) paves the district by default and lets grass through only where this mask is green; the
// same mask switches off the painted block streets on lots, landmarks and plazas. One canvas over the district and its margin, two
// channels: R green (lawn shows), G no street. Beyond the canvas the ground stays lawn (the backdrop fabric paves its own blocks).
import * as T from 'three';
import { DISTRICT, URBAN_FILL } from './layout.ts';

/** World rect the mask covers (metres) and its resolution: about 0.8 m per pixel. */
export const GROUND_MASK = { minX: -560, minZ: -460, size: 920, px: 1152 } as const;
/** Beyond the district the backdrop paves too: a block on the coarser `URBAN_FILL.backdrop` grid stays a park when `cellHash` falls below
 * this, the rest are city blocks (urbanFill.ts `backdropFabric` builds on exactly those) with painted streets between them. */
export const BACKDROP_PARK = .18;
/** Integer hash of a grid cell in [0, 1), identical in JS and in the landscape shader (GLSL uint maths), so built and open backdrop
 * blocks agree with the ground under them. */
export function cellHash(i: number, j: number) {
  let h = (Math.imul(i + 4096, 0x27d4eb2d) ^ Math.imul(j + 4096, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
/** Paved ground (owner 2026-11-21): block paving `slab` in `size` m slabs laid on the boulevard grid, and on every grid street a street
 * cross-section — light ceramic carriageway `road` (the street kit's road language) with a pale blue `seam` line along each edge, a stone
 * `kerb`, then a `footway` band — ending in a kerb where a lot, landmark or plaza stops it. Lawn edges get the same kerb. Half widths
 * from the street centreline in metres: carriageway `roadHalf`, kerb `kerbWidth`, footway `footHalf`. Option A of the 2026-11-21 review: one
 * colour family with the street kit's light ceramic roads (#d3d2cd, a touch darker on terrain), while the slabs keep the owner's mid stone
 * (#aaa69d) so the large paved areas do not glare at noon. */
export const PAVING = { slab: '#aaa69d', footway: '#bdbab2', road: '#c6c8c8', kerb: '#e2e0da', marking: '#f3f5f6', seam: '#9ec4e0', size: 3,
  roadHalf: 2.8, kerbWidth: .22, footHalf: 5.5 } as const;

const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
if (canvas) canvas.width = canvas.height = GROUND_MASK.px;
if (canvas && import.meta.env?.DEV) (globalThis as { groundMaskCanvas?: HTMLCanvasElement }).groundMaskCanvas = canvas; // dev: inspect the mask
const ctx = canvas?.getContext('2d') ?? null;
// Painting happens on `raw`; the texture canvas gets a softened copy (see `publish`).
const raw = typeof document === 'undefined' ? null : document.createElement('canvas');
if (raw) raw.width = raw.height = GROUND_MASK.px;
const rctx = raw?.getContext('2d', { willReadFrequently: true }) ?? null;
/** The mask texture, empty (all paved, streets everywhere) until `paintGroundMask` runs. */
export const groundMaskTexture = canvas ? new T.CanvasTexture(canvas) : new T.Texture();
groundMaskTexture.colorSpace = T.NoColorSpace; groundMaskTexture.flipY = false; groundMaskTexture.minFilter = groundMaskTexture.magFilter = T.LinearFilter; groundMaskTexture.generateMipmaps = false;

const S = GROUND_MASK.px / GROUND_MASK.size, px = (x: number) => (x - GROUND_MASK.minX) * S, pz = (z: number) => (z - GROUND_MASK.minZ) * S;
/** `built`: the ground under and round standing structures (`paveUnderStructures`): never lawn, and streets stop short of it. */
type Channel = 'green' | 'noStreet' | 'built';
const CHANNEL = { green: 0, noStreet: 1, built: 2 } as const;
const style = (c: Channel) => ['rgb(255,0,0)', 'rgb(0,255,0)', 'rgb(0,0,255)'][CHANNEL[c]];
export type GroundPainter = {
  circle(c: Channel, x: number, z: number, r: number): void;
  /** Rect centred (x, z) with half sizes `hu` along (ux, uz) and `hv` across it. */
  rect(c: Channel, x: number, z: number, ux: number, uz: number, hu: number, hv: number): void;
  band(c: Channel, points: readonly { x: number; z: number }[], width: number): void;
  /** Per-pixel test, for shapes defined by a function (water belts). Pixels already marked in `unless` are left alone. */
  where(c: Channel, test: (x: number, z: number) => boolean, unless?: Channel): void;
};

let lastDraw: ((g: GroundPainter) => void) | null = null;
/** Paints the mask (channels additive) and uploads it. */
export function paintGroundMask(draw: (g: GroundPainter) => void) {
  lastDraw = draw;
  const ctx = rctx;
  if (!ctx) return;
  // Start opaque: a canvas keeps colour premultiplied, so channels written into transparent pixels (`where`) would be lost.
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, GROUND_MASK.px, GROUND_MASK.px);
  ctx.globalCompositeOperation = 'lighter';
  const g: GroundPainter = {
    circle(c, x, z, r) { ctx.fillStyle = style(c); ctx.beginPath(); ctx.arc(px(x), pz(z), r * S, 0, Math.PI * 2); ctx.fill(); },
    rect(c, x, z, ux, uz, hu, hv) {
      const corner = (s: number, t: number) => [px(x + ux * hu * s - uz * hv * t), pz(z + uz * hu * s + ux * hv * t)] as const;
      ctx.fillStyle = style(c); ctx.beginPath(); ctx.moveTo(...corner(-1, -1)); ctx.lineTo(...corner(1, -1)); ctx.lineTo(...corner(1, 1)); ctx.lineTo(...corner(-1, 1)); ctx.closePath(); ctx.fill();
    },
    band(c, points, width) {
      ctx.strokeStyle = style(c); ctx.lineWidth = width * S; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(px(p.x), pz(p.z)) : ctx.moveTo(px(p.x), pz(p.z))); ctx.stroke();
    },
    where(c, test, unless) {
      const n = GROUND_MASK.px, step = 2, image = ctx.getImageData(0, 0, n, n), k = CHANNEL[c], skip = unless === undefined ? -1 : CHANNEL[unless];
      for (let j = 0; j < n; j += step) for (let i = 0; i < n; i += step) {
        if (skip >= 0 && image.data[(j * n + i) * 4 + skip] > 127) continue;
        if (!test(GROUND_MASK.minX + (i + step / 2) / S, GROUND_MASK.minZ + (j + step / 2) / S)) continue;
        for (let dj = 0; dj < step && j + dj < n; dj++) for (let di = 0; di < step && i + di < n; di++) { const o = ((j + dj) * n + i + di) * 4; image.data[o + k] = image.data[o + 3] = 255; }
      }
      ctx.putImageData(image, 0, 0);
    },
  };
  draw(g);
  // Built ground: the occupied metre cells as an image, and a disc of the apron radius on each edge cell (their union keeps diagonal walls
  // smooth); one path.
  if (builtImage) { ctx.imageSmoothingEnabled = false; ctx.drawImage(builtImage, 0, 0, GROUND_MASK.px, GROUND_MASK.px); }
  if (builtCells.length) {
    ctx.fillStyle = style('built'); ctx.beginPath();
    for (let k = 0; k < builtCells.length; k += 2) { const x = px(builtCells[k]), z = pz(builtCells[k + 1]); ctx.moveTo(x + BUILT_APRON * S, z); ctx.arc(x, z, BUILT_APRON * S, 0, Math.PI * 2); }
    ctx.fill();
  }
  // Soften once (about 1.2 m) into the texture canvas: painted rects and the 2 px `where` blocks would otherwise show as stair steps where
  // the shader thresholds the mask at one half; the shader also reads the blurred ramp as a distance for its kerbs.
  if (ctx && raw && canvas) {
    const out = canvas.getContext('2d')!;
    out.globalCompositeOperation = 'copy'; out.filter = 'blur(1.5px)'; out.drawImage(raw, 0, 0); out.filter = 'none'; out.globalCompositeOperation = 'source-over';
  }
  groundMaskTexture.needsUpdate = true;
}

/** Share of mask pixels inside `inside` (x, z) that are green, for the ratio report. */
export function greenShare(inside: (x: number, z: number) => boolean) {
  if (!rctx) return NaN;
  const n = GROUND_MASK.px, data = rctx.getImageData(0, 0, n, n).data;
  let all = 0, green = 0;
  for (let j = 0; j < n; j += 2) for (let i = 0; i < n; i += 2) {
    if (!inside(GROUND_MASK.minX + i / S, GROUND_MASK.minZ + j / S)) continue;
    all++; if (data[(j * n + i) * 4] > 127 && data[(j * n + i) * 4 + 2] < 128) green++;
  }
  return green / all;
}

/** Paved apron round every standing structure, metres: no lawn up to the walls, and painted streets end this far out. */
const BUILT_APRON = 4;
/** Centres (x, z pairs) of the edge cells of the 1 m cells structures stand on, and all of those cells as a blue image. */
let builtCells: number[] = [], builtImage: HTMLCanvasElement | null = null;
/** Structures that stand on the district ground (owner 2026-11-21 review): retained landmarks (`builtRoots`, set by odaibaScene), the civic
 * chassis, the megastructure feet, the context massing, the district elements (pavilions, drone ports, towers, courts) and the rotation lot models. Inside one,
 * people and vehicles are skipped and only parts within 2.5 m of the ground count, so flying drones and roofs never reach the mask. */
const BUILT = /^CTX_|-district$|-2127$|^fuji-civic-chassis$|^megastructures$/, NOT_BUILT = /people|pedestrian|walker|resident|crowd|occupant|vehicle|car|taxi|drone-flight|service-drones|aircraft|boat|glow|label|pulse/i;
export const builtRoots = new Set<string>();
const GROUND_FINISH = new Set(['landscape', 'water', 'road', 'sidewalk', 'road_marking', 'plaza', 'service_area', 'pool-water']);
/** Ground mask, built channel (owner 2026-11-21 review: buildings stood on lawn, and the axis-aligned landmark boxes left big plain
 * squares at the wrong angle): every triangle of a standing structure that comes within 2.5 m of the ground, projected to plan, so the
 * real footprint at its real angle (walls as their outline, plinths and decks filled) plus `BUILT_APRON` is paved and streets stop at it.
 * Run once the city has loaded (and again for models that arrive later); repaints the last mask with the footprints. */
export function paveUnderStructures(scene: T.Object3D) {
  if (!lastDraw) return;
  const N = GROUND_MASK.size, grid = new Uint8Array(N * N), v = [new T.Vector3(), new T.Vector3(), new T.Vector3()], m = new T.Matrix4(), w = new T.Matrix4();
  const mark = (x: number, z: number) => { const i = Math.floor(x - GROUND_MASK.minX), j = Math.floor(z - GROUND_MASK.minZ); if (i >= 0 && j >= 0 && i < N && j < N) grid[j * N + i] = 1; };
  /** Marks every metre cell a plan triangle covers: its edges walked at half a metre (walls project to lines), its inside by cell centres. */
  const raster = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number) => {
    for (const [x0, z0, x1, z1] of [[ax, az, bx, bz], [bx, bz, cx, cz], [cx, cz, ax, az]]) {
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 2) || 1;
      for (let t = 0; t <= n; t++) mark(x0 + (x1 - x0) * t / n, z0 + (z1 - z0) * t / n);
    }
    const area = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
    if (Math.abs(area) < 2) return;
    for (let z = Math.floor(Math.min(az, bz, cz)) + .5; z < Math.max(az, bz, cz); z++) for (let x = Math.floor(Math.min(ax, bx, cx)) + .5; x < Math.max(ax, bx, cx); x++) {
      const e0 = (bx - ax) * (z - az) - (x - ax) * (bz - az), e1 = (cx - bx) * (z - bz) - (x - bx) * (cz - bz), e2 = (ax - cx) * (z - cz) - (x - cx) * (az - cz);
      if ((e0 >= 0 && e1 >= 0 && e2 >= 0) || (e0 <= 0 && e1 <= 0 && e2 <= 0)) mark(x, z);
    }
  };
  const inMask = (x: number, z: number) => x > GROUND_MASK.minX && x < GROUND_MASK.minX + GROUND_MASK.size && z > GROUND_MASK.minZ && z < GROUND_MASK.minZ + GROUND_MASK.size;
  const visit = (o: T.Object3D, built: boolean) => {
    if (!o.visible || (built && NOT_BUILT.test(o.name))) return;
    built ||= BUILT.test(o.name) || builtRoots.has(o.name);
    if (built && o instanceof T.Mesh && !(o instanceof T.SkinnedMesh)) {
      const material = [o.material].flat()[0] as T.Material | undefined, geometry = o.geometry as T.BufferGeometry, position = geometry.getAttribute('position');
      if (!position || (material && (GROUND_FINISH.has(material.name) || material.transparent))) return;
      const index = geometry.getIndex(), count = index ? index.count : position.count, instances = o instanceof T.InstancedMesh ? o.count : 1;
      if (instances > 400 || count * instances > 3e6) return;
      // A post or lamp (plan under 2 m) needs no apron: measure the low part first, then rasterize it.
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      const low: number[] = [];
      for (let k = 0; k < instances; k++) {
        if (o instanceof T.InstancedMesh) { o.getMatrixAt(k, m); w.multiplyMatrices(o.matrixWorld, m); } else w.copy(o.matrixWorld);
        for (let t = 0; t < count; t += 3) {
          for (let c = 0; c < 3; c++) v[c].fromBufferAttribute(position, index ? index.getX(t + c) : t + c).applyMatrix4(w);
          if (Math.min(v[0].y, v[1].y, v[2].y) > 2.5 || Math.max(v[0].y, v[1].y, v[2].y) < -2 || !inMask(v[0].x, v[0].z)) continue;
          low.push(v[0].x, v[0].z, v[1].x, v[1].z, v[2].x, v[2].z);
          x0 = Math.min(x0, v[0].x, v[1].x, v[2].x); x1 = Math.max(x1, v[0].x, v[1].x, v[2].x); z0 = Math.min(z0, v[0].z, v[1].z, v[2].z); z1 = Math.max(z1, v[0].z, v[1].z, v[2].z);
        }
      }
      if (Math.max(x1 - x0, z1 - z0) > 2) for (let t = 0; t < low.length; t += 6) raster(low[t], low[t + 1], low[t + 2], low[t + 3], low[t + 4], low[t + 5]);
    }
    o.children.forEach(child => visit(child, built));
  };
  scene.updateMatrixWorld(true);
  scene.children.forEach(child => visit(child, false));
  builtCells = [];
  builtImage = document.createElement('canvas'); builtImage.width = builtImage.height = N;
  const bctx = builtImage.getContext('2d')!, image = bctx.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i; image.data[k * 4 + 3] = 255;
    if (!grid[k]) continue;
    image.data[k * 4 + 2] = 255;
    if (i === 0 || j === 0 || i === N - 1 || j === N - 1 || !grid[k - 1] || !grid[k + 1] || !grid[k - N] || !grid[k + N]) builtCells.push(GROUND_MASK.minX + i + .5, GROUND_MASK.minZ + j + .5);
  }
  bctx.putImageData(image, 0, 0);
  paintGroundMask(lastDraw);
  return builtCells.length / 2;
}

const [OX, OZ] = URBAN_FILL.origin, [UX, UZ] = URBAN_FILL.axis, [PU, PV] = URBAN_FILL.pitch, [BU, BV] = URBAN_FILL.backdrop.pitch;
/** GLSL for the landscape shader: `vec3 groundFinish(vec2 p, vec3 grass, float lawn)` lays block paving, the street cross-section and
 * kerbed lawn edges (`lawn` 0 paves even where the mask is green: the fill blocks' own paving meshes). Inside the district the mask decides
 * lawn and where streets stop; beyond it backdrop blocks pave and one in about five (`BACKDROP_PARK`) stays a park, fading back to plain
 * lawn towards the fabric's edge (`URBAN_FILL.backdrop.radius`). Every line is drawn at least a pixel wide with its contrast scaled down
 * and fades out once a pixel covers too much ground, so joints and markings do not shimmer at distance. */
export function groundGLSL() {
  const c = (hex: string) => { const k = new T.Color(hex); return `vec3(${k.r.toFixed(4)},${k.g.toFixed(4)},${k.b.toFixed(4)})`; }, n = (v: number) => v.toFixed(4);
  const u = (v: number) => `${v >>> 0}u`, R = URBAN_FILL.backdrop.radius, P = PAVING;
  return `uniform sampler2D groundMask;
float cellHash(float i, float j) {
  uint h = (uint(int(i) + 4096) * ${u(0x27d4eb2d)}) ^ (uint(int(j) + 4096) * ${u(0x165667b1)});
  h = (h ^ (h >> 15u)) * ${u(0x2c1b3c6d)}; h = (h ^ (h >> 12u)) * ${u(0x297a2d39)};
  return float(h ^ (h >> 15u)) / 4294967296.;
}
// 1 inside x < e, 0 beyond, antialiased over the pixel footprint of x.
float below(float x, float e) { float f = max(fwidth(x), 1e-4); return 1. - smoothstep(e - f, e + f, x); }
// A line of half width w at distance d: at least a pixel wide, contrast scaled to its true width, gone when a pixel spans more than 'fade' m.
float line(float d, float w, float pm, float fade) { float W = max(w, pm * .75); return (1. - smoothstep(W - pm * .5, W + pm * .5, d)) * (w / W) * (1. - smoothstep(fade * .5, fade, pm)); }
vec3 groundFinish(vec2 p, vec3 grass, float lawn) {
  vec2 d = p - vec2(${n(OX)}, ${n(OZ)});
  float a = d.x * ${n(UX)} + d.y * ${n(UZ)}, b = -d.x * ${n(UZ)} + d.y * ${n(UX)};
  float pm = max(max(fwidth(p.x), fwidth(p.y)), 1e-3); // metres per pixel
  // Block paving: slabs on the street grid, a per-slab tint and a slow drift so a square reads as stone, not a printed checkerboard.
  vec2 q = vec2(a, b) / ${n(P.size)}, cell = floor(q), e = (.5 - abs(fract(q) - .5)) * ${n(P.size)};
  float tint = .965 + cellHash(cell.x, cell.y) * .06 + sin(a * .021 + sin(b * .017) * 2.) * .018;
  vec3 pave = ${c(P.slab)} * tint * (1. - .16 * line(min(e.x, e.y), .025, pm, .35));
  // Derivatives only in uniform control flow: sample and differentiate both the district mask and the backdrop grid, then pick.
  float inside = p.x >= ${n(DISTRICT.minX)} && p.x <= ${n(DISTRICT.maxX)} && p.y >= ${n(DISTRICT.minZ)} && p.y <= ${n(DISTRICT.maxZ)} ? 1. : 0.;
  vec3 mk = texture2D(groundMask, clamp((p - vec2(${n(GROUND_MASK.minX)}, ${n(GROUND_MASK.minZ)})) / ${n(GROUND_MASK.size)}, 0., 1.)).rgb;
  // Built ground (structures and their apron) is never lawn and never street.
  vec2 m = vec2(min(mk.r, 1. - mk.b), max(mk.g, mk.b));
  // The blurred mask ramps over about two metres: its value over its own screen gradient is a signed distance to the 0.5 edge.
  // The gradient floor (0.08 per metre, a fifth of the ramp's) keeps the 8-bit tails from reading as a near edge and speckling kerbs.
  float mgr = (m.r - .5) * pm / max(fwidth(m.r), pm * .08), mgs = (.5 - m.g) * pm / max(fwidth(m.g), pm * .08);
  float da = abs(fract(a / ${n(PU)} + .5) - .5) * ${n(PU)}, db = abs(fract(b / ${n(PV)} + .5) - .5) * ${n(PV)};
  float ba = ${n(BU / 2)} - abs(fract(a / ${n(BU)}) - .5) * ${n(BU)}, bb = ${n(BV / 2)} - abs(fract(b / ${n(BV)}) - .5) * ${n(BV)};
  float park = cellHash(floor(a / ${n(BU)}), floor(b / ${n(BV)})) < ${n(BACKDROP_PARK)} ? 1. : 0.;
  // Antialias each source on its own continuous distance, then select (mixing the distances would smear a seam along every switch).
  float bgr = min(ba, bb) - ${n(P.footHalf + .5)}; // + inside a backdrop park, past its footway
  float green = mix(max(park * below(-bgr, 0.), smoothstep(${n(R - 160)}, ${n(R)}, length(p))), below(-mgr, 0.), inside) * lawn;
  float kerbG = mix(park * line(abs(bgr + .15), .15, pm, 3.), line(abs(mgr + .15), .15, pm, 3.), inside) * lawn;
  float sa = mix(ba, da, inside), sb = mix(bb, db, inside);
  // Street ground: inside the district only where the mask's no-street channel allows (mgs metres in), always beyond it.
  float roadOk = mix(1., 1. - below(mgs, ${n(P.kerbWidth)}), inside), kerbOk = mix(1., 1. - below(mgs, 0.), inside), footOk = mix(1., 1. - below(mgs, -1.5), inside);
  // Street cross-section from the centreline: carriageway, seam line, kerb, footway. A street that meets a lot ends in a kerb with the
  // footway wrapped round its end.
  float s = min(sa, sb), across = sa < sb ? sa : sb, along = sa < sb ? b : a, other = sa < sb ? sb : sa;
  float road = below(s, ${n(P.roadHalf)}) * roadOk;
  float kerb = below(s, ${n(P.roadHalf + P.kerbWidth)}) * kerbOk - road;
  float foot = below(s, ${n(P.footHalf)}) * footOk;
  // Streets run on through district lawns (owner review: no road may stop dead at a lawn): the lawn gives way to the footway and takes a
  // kerb along it. Backdrop parks already sit between their streets.
  float lawnIn = below(-mgr, 0.) * lawn * inside, cut = foot * inside;
  kerbG = max(kerbG * (1. - cut), line(abs(s - ${n(P.footHalf + .15)}), .15, pm, 3.) * footOk * lawnIn);
  green *= 1. - cut;
  vec3 col = mix(pave, ${c(P.footway)} * (.98 + tint * .03), foot);
  col = mix(col, ${c(P.kerb)}, max(kerb, 0.));
  vec3 lane = ${c(P.road)} * (.985 + sin(along * .05 + across) * .01);
  lane = mix(lane, ${c(P.seam)}, line(abs(across - ${n(P.roadHalf - .35)}), .07, pm, .6));
  // Centre dashes away from junctions, zebra crossings on each junction approach.
  float zebra = step(${n(P.roadHalf + P.kerbWidth + .8)}, other) * (1. - step(${n(P.roadHalf + P.kerbWidth + 4)}, other));
  float dash = line(across, .07, pm, .5) * step(.55, fract(along / 6.)) * step(${n(P.roadHalf + P.kerbWidth + 4)}, other);
  float stripes = zebra * (1. - smoothstep(.5 - pm, .5 + pm, abs(fract(across / 1.1) - .5) * 2.)) * (1. - smoothstep(.3, .5, pm));
  lane = mix(lane, ${c(P.marking)}, max(dash, stripes * .9));
  col = mix(col, lane, road);
  col = mix(col, ${c(P.kerb)}, kerbG * (1. - green));
  return mix(col, grass, green);
}`;
}

/** Lays the same paving on a mesh's own surface (the fill blocks' street and lot plinths), so built blocks and painted ground read as one
 * street network. World xz drives the pattern; lawn stays off (a lot plinth is paving even over a mask courtyard). */
export function paveMaterial(material: T.MeshStandardMaterial, key: string) {
  material.color.set('#ffffff');
  material.onBeforeCompile = shader => {
    shader.uniforms.groundMask = { value: groundMaskTexture };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 paveXZ;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\npaveXZ = (modelMatrix * vec4(transformed, 1.)).xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 paveXZ;\n${groundGLSL()}`)
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = groundFinish(paveXZ, vec3(0.), 0.);');
  };
  material.customProgramCacheKey = () => `paved-${key}`;
}
