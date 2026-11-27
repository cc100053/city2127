// Q05-B breathing giant leaf (asset/models/q05b-breathing-leaf-2127, owner-accepted target 2026-11-26): the GLB's runtime finish and
// motion. It stands on the NE PARK lot hidden until a rotation run shows Q05-B (src/lotRuntime.ts fades it in place of the NE park).
// Nothing turns or moves: the plant breathes in light. Three sets of water dashes up the stems light in turn, so the bay water
// reads as climbing; the leaf veins swell and ease; the mist curtains on the leaf rims (alpha-blended) brighten in antiphase.
// Only emissive intensity changes, read from each mesh's current material every frame, so the lot fade (which owns opacity and
// clones the materials) keeps working.
import { Mesh, MeshStandardMaterial, type Material, type Object3D } from 'three';

export const BREATHING_LEAF = 'q05b-breathing-leaf-2127';
/** Mesh names in the GLB (build_breathing_leaf.py, one mesh per role). */
export const BREATHING_LEAF_MOVING = {
  pulseA: 'q05b_pulse_a', pulseB: 'q05b_pulse_b', pulseC: 'q05b_pulse_c', vein: 'q05b_vein', mistA: 'q05b_mist_a', mistB: 'q05b_mist_b',
} as const;
/** Seconds per cycle: one water dash step climbs a stem every PULSE / 3 s; the leaf breathes once every BREATH s. */
export const BREATHING_LEAF_PERIOD = { pulse: 1.2, breath: 5 } as const;
const MIST = new Set<string>([BREATHING_LEAF_MOVING.mistA, BREATHING_LEAF_MOVING.mistB]);
/** Matte meshes whose sky reflection is dimmed (owner B-R1: the deep-green leaves read pale by day from the bright city sky). */
export const BREATHING_LEAF_MATTE = { q05b_leaf: .3, q05b_leaf_u: .4, q05b_crown: .45, q05b_crown_l: .45 } as const;
/** The translucent glass-green stems (alpha from the GLB), drawn after the opaque plant and before the mist. */
export const BREATHING_LEAF_STEM = 'q05b_stem';
const moving = new Set<string>(Object.values(BREATHING_LEAF_MOVING));

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
    for (const m of ([] as Material[]).concat(part.material)) { m.transparent = true; m.depthWrite = false; m.needsUpdate = true; }
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
