// Q05-A reverse air conditioner (asset/models/q05a-reverse-ac-2127, owner-accepted target 2026-11-26): the GLB's runtime finish and
// motion. It stands on the NE PARK lot hidden until a rotation run shows Q05-A (src/lotRuntime.ts fades it in place of the NE park).
// Four meshes move: the amber heat spiral turns inside the glass core; over the crown the saturated flame tongues (alpha-blended)
// and the soft heat shimmer round them (additive) turn against each other, so the heat reads as rising; and the ice-blue cold-air
// streams on the lawn (additive) turn so their inward spiral reads as air flowing into the skirt.
import { AdditiveBlending, Mesh, NormalBlending, type Material, type Object3D } from 'three';

export const REVERSE_AC = 'q05a-reverse-ac-2127';
/** Mesh names in the GLB (build_reverse_ac.py, one mesh per role). */
export const REVERSE_AC_MOVING = { spiral: 'q05a_spiral', flame: 'q05a_flame', plume: 'q05a_plume', flow: 'q05a_flow' } as const;
/** Turn rates, radians per second: spiral up-winding, flame and shimmer against each other, cold streams winding inward
 *  (positive rotation.y moves the built spiral inward). */
export const REVERSE_AC_SPIN = { spiral: .9, flame: .35, plume: -.18, flow: .22 } as const;
/** How each moving translucent mesh blends (the spiral is opaque). */
const BLEND = { flame: NormalBlending, plume: AdditiveBlending, flow: AdditiveBlending } as const;

const moving = new Set<string>(Object.values(REVERSE_AC_MOVING));
/** Whether `bake` may merge this mesh: static, opaque, and none of the moving parts. */
export const reverseAcBakes = (mesh: Mesh) => !Array.isArray(mesh.material) && !mesh.material.transparent && !moving.has(mesh.name);

/** Finishes a loaded model (before lotRuntime owns its materials): flame, shimmer and cold streams translucent without depth
 *  writes, drawn after the glass; the model hidden. Returns the per-frame motion, or undefined when the GLB lacks a moving mesh. */
export function prepareReverseAc(model: Object3D) {
  const parts = Object.fromEntries(Object.entries(REVERSE_AC_MOVING).map(([key, name]) => [key, model.getObjectByName(name)])) as
    Record<keyof typeof REVERSE_AC_MOVING, Object3D | undefined>;
  for (const [key, blending] of Object.entries(BLEND) as [keyof typeof BLEND, typeof NormalBlending][]) {
    const part = parts[key];
    if (!(part instanceof Mesh)) continue;
    for (const material of ([] as Material[]).concat(part.material)) {
      material.blending = blending; material.transparent = true; material.depthWrite = false; material.needsUpdate = true;
    }
    part.renderOrder = 2;
  }
  model.visible = false;
  if (Object.values(parts).some(part => !part)) return undefined;
  return (now: number) => {
    for (const key of Object.keys(REVERSE_AC_SPIN) as (keyof typeof REVERSE_AC_SPIN)[]) parts[key]!.rotation.y = now * REVERSE_AC_SPIN[key];
  };
}
