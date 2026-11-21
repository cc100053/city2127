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
 * colour family with the street kit's roads; slabs keep the owner's mid stone (#aaa69d) so noon does not glare, the carriageway a
 * cooler grey than the footway so the two separate. */
export const PAVING = { slab: '#aaa69d', footway: '#c0bdb5', road: '#a9acad', kerb: '#dfddd7', marking: '#f3f5f6', seam: '#9ec4e0', size: 3,
  roadHalf: 2.8, kerbWidth: .22, footHalf: 5.5 } as const;

const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
if (canvas) canvas.width = canvas.height = GROUND_MASK.px;
if (canvas && import.meta.env?.DEV) (globalThis as { groundMaskCanvas?: HTMLCanvasElement }).groundMaskCanvas = canvas; // dev: inspect the mask
const ctx = canvas?.getContext('2d', { willReadFrequently: true }) ?? null;
/** The mask texture, empty (all paved, streets everywhere) until `paintGroundMask` runs. */
export const groundMaskTexture = canvas ? new T.CanvasTexture(canvas) : new T.Texture();
groundMaskTexture.colorSpace = T.NoColorSpace; groundMaskTexture.flipY = false; groundMaskTexture.minFilter = groundMaskTexture.magFilter = T.LinearFilter; groundMaskTexture.generateMipmaps = false;

const S = GROUND_MASK.px / GROUND_MASK.size, px = (x: number) => (x - GROUND_MASK.minX) * S, pz = (z: number) => (z - GROUND_MASK.minZ) * S;
type Channel = 'green' | 'noStreet';
const style = (c: Channel) => c === 'green' ? 'rgb(255,0,0)' : 'rgb(0,255,0)';
export type GroundPainter = {
  circle(c: Channel, x: number, z: number, r: number): void;
  /** Rect centred (x, z) with half sizes `hu` along (ux, uz) and `hv` across it. */
  rect(c: Channel, x: number, z: number, ux: number, uz: number, hu: number, hv: number): void;
  band(c: Channel, points: readonly { x: number; z: number }[], width: number): void;
  /** Per-pixel test, for shapes defined by a function (water belts). Pixels already marked in `unless` are left alone. */
  where(c: Channel, test: (x: number, z: number) => boolean, unless?: Channel): void;
};

/** Paints the mask (both channels additive) and uploads it. */
export function paintGroundMask(draw: (g: GroundPainter) => void) {
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
      const n = GROUND_MASK.px, step = 2, image = ctx.getImageData(0, 0, n, n), k = c === 'green' ? 0 : 1, skip = unless === undefined ? -1 : unless === 'green' ? 0 : 1;
      for (let j = 0; j < n; j += step) for (let i = 0; i < n; i += step) {
        if (skip >= 0 && image.data[(j * n + i) * 4 + skip] > 127) continue;
        if (!test(GROUND_MASK.minX + (i + step / 2) / S, GROUND_MASK.minZ + (j + step / 2) / S)) continue;
        for (let dj = 0; dj < step && j + dj < n; dj++) for (let di = 0; di < step && i + di < n; di++) { const o = ((j + dj) * n + i + di) * 4; image.data[o + k] = image.data[o + 3] = 255; }
      }
      ctx.putImageData(image, 0, 0);
    },
  };
  draw(g);
  // Soften once (about 1.2 m): painted rects and the 2 px `where` blocks would otherwise show as stair steps where the shader thresholds
  // the mask at one half; the shader also reads the blurred ramp as a distance for its kerbs.
  const copy = document.createElement('canvas'); copy.width = copy.height = GROUND_MASK.px; copy.getContext('2d')!.drawImage(ctx.canvas, 0, 0);
  ctx.globalCompositeOperation = 'copy'; ctx.filter = 'blur(1.5px)'; ctx.drawImage(copy, 0, 0); ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  groundMaskTexture.needsUpdate = true;
}

/** Share of mask pixels inside `inside` (x, z) that are green, for the ratio report. */
export function greenShare(inside: (x: number, z: number) => boolean) {
  if (!ctx) return NaN;
  const n = GROUND_MASK.px, data = ctx.getImageData(0, 0, n, n).data;
  let all = 0, green = 0;
  for (let j = 0; j < n; j += 2) for (let i = 0; i < n; i += 2) {
    if (!inside(GROUND_MASK.minX + i / S, GROUND_MASK.minZ + j / S)) continue;
    all++; if (data[(j * n + i) * 4] > 127) green++;
  }
  return green / all;
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
  bool inside = p.x >= ${n(DISTRICT.minX)} && p.x <= ${n(DISTRICT.maxX)} && p.y >= ${n(DISTRICT.minZ)} && p.y <= ${n(DISTRICT.maxZ)};
  float sa, sb, green, kerbG, open; // street centre distances, lawn, lawn-edge kerb, metres inside street ground
  if (inside) {
    vec2 m = texture2D(groundMask, (p - vec2(${n(GROUND_MASK.minX)}, ${n(GROUND_MASK.minZ)})) / ${n(GROUND_MASK.size)}).rg;
    sa = abs(fract(a / ${n(PU)} + .5) - .5) * ${n(PU)}; sb = abs(fract(b / ${n(PV)} + .5) - .5) * ${n(PV)};
    // The blurred mask ramps over about two metres: its value over its own screen gradient is a signed distance to the 0.5 edge.
    float gr = (m.r - .5) * pm / max(fwidth(m.r), 1e-4), gs = (.5 - m.g) * pm / max(fwidth(m.g), 1e-4);
    green = below(-gr, 0.) * lawn; kerbG = line(abs(gr + .15), .15, pm, 3.) * lawn; open = gs;
  } else {
    float ea = abs(fract(a / ${n(BU)}) - .5) * ${n(BU)}, eb = abs(fract(b / ${n(BV)}) - .5) * ${n(BV)};
    sa = ${n(BU / 2)} - ea; sb = ${n(BV / 2)} - eb; open = 1e4;
    float s = min(sa, sb), park = cellHash(floor(a / ${n(BU)}), floor(b / ${n(BV)})) < ${n(BACKDROP_PARK)} ? 1. : 0.;
    float gr = park > .5 ? s - ${n(P.footHalf + .5)} : -1e4;
    green = max(below(-gr, 0.), smoothstep(${n(R - 160)}, ${n(R)}, length(p))) * lawn; kerbG = line(abs(gr + .15), .15, pm, 3.) * lawn;
  }
  // Street cross-section from the centreline: carriageway, seam line, kerb, footway. A street that meets a lot ends in a kerb with the
  // footway wrapped round its end.
  float s = min(sa, sb), across = sa < sb ? sa : sb, along = sa < sb ? b : a, other = sa < sb ? sb : sa;
  float road = below(s, ${n(P.roadHalf)}) * (1. - below(open, ${n(P.kerbWidth)}));
  float kerb = below(s, ${n(P.roadHalf + P.kerbWidth)}) * (1. - below(open, 0.)) - road;
  float foot = below(s, ${n(P.footHalf)}) * (1. - below(open, -1.5));
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
