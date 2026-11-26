// Q05-A reverse air conditioner (asset/models/q05a-reverse-ac-2127, owner-accepted target 2026-11-26): the GLB's runtime finish and
// motion. It stands on the NE PARK lot hidden until a rotation run shows Q05-A (src/lotRuntime.ts fades it in place of the NE park).
// Two meshes move: the amber heat spiral turns inside the glass core, and the heat plume over the crown is drawn additive and turns
// slowly the other way, so the heat reads as rising.
import { AdditiveBlending, Mesh, type Material, type Object3D } from 'three';

export const REVERSE_AC = 'q05a-reverse-ac-2127';
/** Mesh names in the GLB (build_reverse_ac.py, one mesh per role). */
export const REVERSE_AC_MOVING = { spiral: 'q05a_spiral', plume: 'q05a_plume' } as const;
/** Spiral and plume turn rates, radians per second (spiral up-winding, plume drifting back). */
export const REVERSE_AC_SPIN = { spiral: .9, plume: -.18 } as const;

/** Whether `bake` may merge this mesh: static, opaque, and neither moving part. */
export const reverseAcBakes = (mesh: Mesh) => !Array.isArray(mesh.material) && !mesh.material.transparent
  && mesh.name !== REVERSE_AC_MOVING.spiral && mesh.name !== REVERSE_AC_MOVING.plume;

/** Finishes a loaded model (before lotRuntime owns its materials): the plume additive without depth writes, the model hidden.
 *  Returns the per-frame motion, or undefined when the GLB lacks either moving mesh. */
export function prepareReverseAc(model: Object3D) {
  const spiral = model.getObjectByName(REVERSE_AC_MOVING.spiral), plume = model.getObjectByName(REVERSE_AC_MOVING.plume);
  if (plume instanceof Mesh) {
    for (const material of ([] as Material[]).concat(plume.material)) {
      material.blending = AdditiveBlending; material.transparent = true; material.depthWrite = false; material.needsUpdate = true;
    }
    plume.renderOrder = 2;
  }
  model.visible = false;
  if (!spiral || !plume) return undefined;
  return (now: number) => {
    spiral.rotation.y = now * REVERSE_AC_SPIN.spiral;
    plume.rotation.y = now * REVERSE_AC_SPIN.plume;
  };
}
