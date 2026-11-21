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
/** Paved ground: slab tone, slab size (m) and the painted block streets on the boulevard grid (`URBAN_FILL`), half width in metres. */
export const PAVING = { slab: '#d8d3c7', street: '#c3c4c0', size: 3, streetHalf: 4 } as const;

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
/** GLSL for the landscape shader: `vec3 groundFinish(vec2 p, vec3 grass)` mixes paving, painted block streets and grass. Inside the
 * district the mask decides; beyond it, backdrop blocks pave and one in about five (`BACKDROP_PARK`) stays a park, fading back to plain
 * lawn towards the fabric's edge (`URBAN_FILL.backdrop.radius`). */
export function groundGLSL() {
  const slab = new T.Color(PAVING.slab), street = new T.Color(PAVING.street), f = (c: T.Color) => `vec3(${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)})`, n = (v: number) => v.toFixed(4);
  const u = (v: number) => `${v >>> 0}u`, R = URBAN_FILL.backdrop.radius, half = URBAN_FILL.backdrop.street / 2;
  return `uniform sampler2D groundMask;
float cellHash(float i, float j) {
  uint h = (uint(int(i) + 4096) * ${u(0x27d4eb2d)}) ^ (uint(int(j) + 4096) * ${u(0x165667b1)});
  h = (h ^ (h >> 15u)) * ${u(0x2c1b3c6d)}; h = (h ^ (h >> 12u)) * ${u(0x297a2d39)};
  return float(h ^ (h >> 15u)) / 4294967296.;
}
vec3 groundFinish(vec2 p, vec3 grass) {
  vec2 cell = floor(p / ${n(PAVING.size)}), joint = abs(fract(p / ${n(PAVING.size)}) - .5);
  float tint = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 pave = ${f(slab)} * (.95 + tint * .07) * (max(joint.x, joint.y) > .485 ? .9 : 1.);
  vec2 d = p - vec2(${n(OX)}, ${n(OZ)});
  float a = d.x * ${n(UX)} + d.y * ${n(UZ)}, b = -d.x * ${n(UZ)} + d.y * ${n(UX)};
  bool inside = p.x >= ${n(DISTRICT.minX)} && p.x <= ${n(DISTRICT.maxX)} && p.y >= ${n(DISTRICT.minZ)} && p.y <= ${n(DISTRICT.maxZ)};
  float green, onStreet, s, sh;
  if (inside) {
    vec2 m = texture2D(groundMask, (p - vec2(${n(GROUND_MASK.minX)}, ${n(GROUND_MASK.minZ)})) / ${n(GROUND_MASK.size)}).rg;
    s = min(abs(fract(a / ${n(PU)} + .5) - .5) * ${n(PU)}, abs(fract(b / ${n(PV)} + .5) - .5) * ${n(PV)}); sh = ${n(PAVING.streetHalf)};
    onStreet = (1. - smoothstep(sh - .3, sh, s)) * (1. - smoothstep(.35, .65, m.g)); green = smoothstep(.35, .65, m.r);
  } else {
    float ea = abs(fract(a / ${n(BU)}) - .5) * ${n(BU)}, eb = abs(fract(b / ${n(BV)}) - .5) * ${n(BV)};
    s = min(${n(BU / 2)} - ea, ${n(BV / 2)} - eb); sh = ${n(half)};
    onStreet = 1. - smoothstep(sh - .3, sh, s);
    float park = cellHash(floor(a / ${n(BU)}), floor(b / ${n(BV)})) < ${n(BACKDROP_PARK)} ? 1. - smoothstep(sh, sh + .6, sh * 2. - s) : 0.;
    green = max(park, smoothstep(${n(R - 160)}, ${n(R)}, length(p)));
  }
  vec3 road = ${f(street)} * (s < .12 ? 1.12 : abs(s - (sh - .6)) < .1 ? .88 : 1.);
  pave = mix(pave, road, onStreet);
  return mix(pave, grass, green);
}`;
}
