// Q05-B breathing giant leaf (asset/models/q05b-breathing-leaf-2127, owner-accepted target 2026-11-26): the GLB's runtime finish and
// motion. It stands on the NE PARK lot hidden until a rotation run shows Q05-B (src/lotRuntime.ts fades it in place of the NE park).
// Nothing turns or moves: the plant breathes in light. Three sets of water dashes up the stems light in turn, so the bay water
// reads as climbing; the leaf veins swell and ease; the mist veils on the leaf rims (alpha-blended through a soft thread map) brighten in antiphase.
// Only emissive intensity changes, read from each mesh's current material every frame, so the lot fade (which owns opacity and
// clones the materials) keeps working.
import { DataTexture, LinearFilter, Mesh, MeshStandardMaterial, RGBAFormat, type Material, type Object3D } from 'three';

export const BREATHING_LEAF = 'q05b-breathing-leaf-2127';
/** Mesh names in the GLB (build_breathing_leaf.py, one mesh per role). */
export const BREATHING_LEAF_MOVING = {
  pulseA: 'q05b_pulse_a', pulseB: 'q05b_pulse_b', pulseC: 'q05b_pulse_c', vein: 'q05b_vein', mistA: 'q05b_mist_a', mistB: 'q05b_mist_b',
} as const;
/** Seconds per cycle: one water dash step climbs a stem every PULSE / 3 s; the leaf breathes once every BREATH s. */
export const BREATHING_LEAF_PERIOD = { pulse: 1.2, breath: 5 } as const;
const MIST = new Set<string>([BREATHING_LEAF_MOVING.mistA, BREATHING_LEAF_MOVING.mistB]);
/** Matte meshes whose sky reflection is dimmed (owner B-R1: the deep-green leaves read pale by day from the bright city sky). */
export const BREATHING_LEAF_MATTE = {
  q05b_leaf: .3, q05b_leaf_u: .4, q05b_leaf_rim: .4, q05b_crown: .45, q05b_crown_l: .45,   // B-R3/R4: the thin edge line
} as const;
/** The translucent glass-green stems (alpha from the GLB), drawn after the opaque plant and before the mist. */
export const BREATHING_LEAF_STEM = 'q05b_stem';
const moving = new Set<string>(Object.values(BREATHING_LEAF_MOVING));

/** B-R5 (owner «霧…似一條條光，唔似霧水»): the mist veils' alpha map (uv.x across a veil, uv.y down it). Fine falling threads of
 *  varied strength and length, faded at the veil's sides, soft at the rim and thinning to nothing toward the ground, so the
 *  flat veils read as water mist, not as bands of light. Built once, deterministic; a DataTexture so it also runs in Node. */
let mistAlpha: DataTexture | undefined;
export function breathingLeafMistAlpha() {
  if (mistAlpha) return mistAlpha;
  const W = 256, H = 128, data = new Uint8Array(W * H * 4);
  let seed = 2127;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const raw = Array.from({ length: W }, rand), ends = Array.from({ length: W }, () => .45 + .55 * rand());
  const thread = raw.map((_, x) => (raw[(x + W - 1) % W] + 2 * raw[x] + raw[(x + 1) % W]) / 4);   // threads two texels wide
  const smooth = (a: number, b: number, t: number) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const side = Math.sin(Math.PI * u) ** 1.6;
      const threads = .3 + .7 * thread[x] ** 2;
      const fall = smooth(0, .06, v) * (1 - smooth(.35, 1, v)) * (1 - smooth(ends[x] - .3, ends[x], v) * .7);
      const a = Math.round(255 * Math.min(1, side * threads * fall * 2.6));
      data.set([a, a, a, 255], (y * W + x) * 4);
    }
  }
  mistAlpha = new DataTexture(data, W, H, RGBAFormat);
  mistAlpha.magFilter = mistAlpha.minFilter = LinearFilter;
  mistAlpha.needsUpdate = true;
  return mistAlpha;
}

/** Whether `bake` may merge this mesh: static, opaque, and none of the glowing parts. */
export const breathingLeafBakes = (mesh: Mesh) => !Array.isArray(mesh.material) && !mesh.material.transparent && !moving.has(mesh.name);

/** Emissive intensities at `now` (seconds), as multiples of the authored glow: dashes a/b/c lit in turn (climbing), veins and the
 *  two mist sets breathing (the mist sets in antiphase). Exported for the unit test. */
export function breathingLeafGlow(now: number) {
  const step = (now / BREATHING_LEAF_PERIOD.pulse * 3) % 3;
  const dash = (k: number) => .25 + .75 * Math.max(0, 1 - Math.min(Math.abs(step - k), 3 - Math.abs(step - k)));
  const breath = Math.sin(now / BREATHING_LEAF_PERIOD.breath * Math.PI * 2);
  return { pulseA: dash(0), pulseB: dash(1), pulseC: dash(2), vein: .8 + .35 * breath, mistA: 1 + .9 * breath, mistB: 1 - .9 * breath };
}

/** Finishes a loaded model (before lotRuntime owns its materials): the leaves and crowns matte (dimmed sky reflection), the
 *  stems drawn after the opaque plant, the mist translucent without depth writes, drawn last; the model hidden. Returns the per-frame motion, or undefined when the GLB lacks a glowing mesh. */
export function prepareBreathingLeaf(model: Object3D) {
  const parts = Object.fromEntries(Object.entries(BREATHING_LEAF_MOVING).map(([key, name]) => [key, model.getObjectByName(name)])) as
    Record<keyof typeof BREATHING_LEAF_MOVING, Object3D | undefined>;
  const base = new Map<string, number>();
  for (const [key, part] of Object.entries(parts)) {
    if (!(part instanceof Mesh)) continue;
    const material = part.material as MeshStandardMaterial;
    base.set(key, material.emissiveIntensity);
    if (!MIST.has(part.name)) continue;
    for (const m of ([] as Material[]).concat(part.material)) {
      m.transparent = true; m.depthWrite = false; m.needsUpdate = true;
      if (m instanceof MeshStandardMaterial) m.alphaMap = breathingLeafMistAlpha();
    }
    part.renderOrder = 2;
  }
  model.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const dim = BREATHING_LEAF_MATTE[object.name as keyof typeof BREATHING_LEAF_MATTE];
    if (dim !== undefined) for (const m of ([] as Material[]).concat(object.material)) if (m instanceof MeshStandardMaterial) m.envMapIntensity = dim;
    if (object.name === BREATHING_LEAF_STEM) object.renderOrder = 1;
  });
  model.visible = false;
  if (Object.values(parts).some(part => !(part instanceof Mesh))) return undefined;
  return (now: number) => {
    const glow = breathingLeafGlow(now);
    for (const key of Object.keys(glow) as (keyof typeof glow)[]) {
      const material = (parts[key] as Mesh).material;
      if (material instanceof MeshStandardMaterial) material.emissiveIntensity = base.get(key)! * glow[key];
    }
  };
}
