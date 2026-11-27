// Q05-C snow-cloud fountain (asset/models/q05c-snow-cloud-2127, owner-accepted target 2026-11-26): the GLB's runtime finish and
// motion. It stands on the NE PARK lot hidden until a rotation run shows Q05-C (src/lotRuntime.ts fades it in place of the NE park).
// The cloud turns slowly and bobs (its translucent haze shell against it); three snow stacks fall at their own speeds, each moved
// down by (speed * t) mod its repeat period so the fall loops seamlessly (the stack's top hides in the cloud, its bottom under the
// plinth); the ring's two nozzle sets light in turn, the ice arcs flicker, meltwater glints run toward the spillway and the cold
// fog breathes; at night the cloud glows ice white from inside (R2). Only transforms and emissive intensity change, so the lot
// fade (which owns opacity) keeps working. The snowfield and frost take little sky reflection, so their blue shadows read.
import { Mesh, MeshStandardMaterial, type Material, type Object3D } from 'three';

export const SNOW_CLOUD = 'q05c-snow-cloud-2127';
/** Mesh names in the GLB (build_snow_cloud.py, one mesh per role). */
export const SNOW_CLOUD_MOVING = {
  cloud: 'q05c_cloud', haze: 'q05c_haze', snowA: 'q05c_snow_a', snowB: 'q05c_snow_b', snowC: 'q05c_snow_c',
  nozzleA: 'q05c_nozzle_a', nozzleB: 'q05c_nozzle_b', arc: 'q05c_arc', flowA: 'q05c_flow_a', flowB: 'q05c_flow_b',
  flowC: 'q05c_flow_c', fog: 'q05c_fog',
} as const;
/** Snow stacks: repeat period (m, as SNOW_PERIODS in build_snow_cloud.py) and fall speed (m/s). */
export const SNOW_CLOUD_SNOW = { snowA: [3.1, 1.6], snowB: [3.7, 1.25], snowC: [4.3, 1.9] } as const;
/** Seconds per cycle: nozzles alternate every NOZZLE / 2 s; a meltwater glint steps every FLOW / 3 s; the fog breathes every FOG s. */
export const SNOW_CLOUD_PERIOD = { nozzle: 1.6, flow: 1.5, fog: 6, cloud: 8 } as const;
/** The cloud's self-light at full night, as a multiple of the GLB's (day) emissive, breathing ±10 % over `cloud` s. */
export const SNOW_CLOUD_NIGHT = 6;
/** Sky-reflection scale for the snowfield and frost (the sky washed their blue to white in R1). */
const MATTE = new Set(['q05c_snowfield', 'q05c_frost']), MATTE_ENV = .35;
/** Translucent parts: alpha from the GLB, no depth writes, drawn after the opaque model. */
const TRANSLUCENT = new Set<string>([SNOW_CLOUD_MOVING.haze, SNOW_CLOUD_MOVING.fog]);
const GLOWING = ['cloud', 'snowA', 'snowB', 'snowC', 'nozzleA', 'nozzleB', 'arc', 'flowA', 'flowB', 'flowC', 'fog'] as const;
const moving = new Set<string>(Object.values(SNOW_CLOUD_MOVING));

/** Whether `bake` may merge this mesh: static, opaque, and none of the moving parts. */
export const snowCloudBakes = (mesh: Mesh) => !Array.isArray(mesh.material) && !mesh.material.transparent && !moving.has(mesh.name);

/** How far (m, ≤ 0) a snow stack has fallen at `now`: wraps by one period, so the loop never pops. Exported for the unit test. */
export const snowDrop = (now: number, [period, speed]: readonly [number, number]) => -((now * speed) % period);

/** Emissive multiples at `now` (seconds) and night `dark` (0 day … 1 night): the cloud glows at night, nozzle sets alternate, arcs
 *  flicker, meltwater glints a/b/c step in turn, fog breathes. Exported for the unit test. */
export function snowCloudGlow(now: number, dark = 0) {
  const n = .5 + .5 * Math.sin(now / SNOW_CLOUD_PERIOD.nozzle * Math.PI * 2);
  const step = (now / SNOW_CLOUD_PERIOD.flow * 3) % 3;
  const dash = (k: number) => .25 + .75 * Math.max(0, 1 - Math.min(Math.abs(step - k), 3 - Math.abs(step - k)));
  const flicker = .55 + .45 * Math.abs(Math.sin(now * 13.1) * Math.sin(now * 7.7 + 1.3));
  const fog = 1 + .5 * Math.sin(now / SNOW_CLOUD_PERIOD.fog * Math.PI * 2);
  const cloud = 1 + (SNOW_CLOUD_NIGHT - 1) * dark * (1 + .1 * Math.sin(now / SNOW_CLOUD_PERIOD.cloud * Math.PI * 2));
  return { cloud, snowA: 1, snowB: 1, snowC: 1, nozzleA: .35 + .65 * n, nozzleB: 1 - .65 * n, arc: flicker, flowA: dash(0), flowB: dash(1),
    flowC: dash(2), fog };
}

/** Finishes a loaded model (before lotRuntime owns its materials): haze and fog translucent without depth writes, drawn last; the
 *  model hidden. Returns the per-frame motion, or undefined when the GLB lacks a moving mesh. */
export function prepareSnowCloud(model: Object3D) {
  const parts = Object.fromEntries(Object.entries(SNOW_CLOUD_MOVING).map(([key, name]) => [key, model.getObjectByName(name)])) as
    Record<keyof typeof SNOW_CLOUD_MOVING, Object3D | undefined>;
  const base = new Map<string, number>();
  for (const [key, part] of Object.entries(parts)) {
    if (!(part instanceof Mesh)) continue;
    base.set(key, (part.material as MeshStandardMaterial).emissiveIntensity);
    if (!TRANSLUCENT.has(part.name)) continue;
    for (const m of ([] as Material[]).concat(part.material)) { m.transparent = true; m.depthWrite = false; m.needsUpdate = true; }
    part.renderOrder = 2;
  }
  model.traverse(mesh => {
    if (mesh instanceof Mesh && MATTE.has(mesh.name)) for (const m of ([] as Material[]).concat(mesh.material)) {
      if (m instanceof MeshStandardMaterial) m.envMapIntensity = MATTE_ENV;
    }
  });
  model.visible = false;
  if (Object.values(parts).some(part => !(part instanceof Mesh))) return undefined;
  return (now: number, dark = 0) => {
    parts.cloud!.rotation.y = now * .035; parts.cloud!.position.y = .35 * Math.sin(now * .4);
    parts.haze!.rotation.y = -now * .02; parts.haze!.position.y = parts.cloud!.position.y;
    for (const key of Object.keys(SNOW_CLOUD_SNOW) as (keyof typeof SNOW_CLOUD_SNOW)[]) {
      parts[key]!.position.y = snowDrop(now, SNOW_CLOUD_SNOW[key]);
      parts[key]!.rotation.y = now * (key === 'snowB' ? -.05 : .04);
    }
    const glow = snowCloudGlow(now, dark);
    for (const key of GLOWING) {
      const material = (parts[key] as Mesh).material;
      if (material instanceof MeshStandardMaterial) material.emissiveIntensity = base.get(key)! * glow[key];
    }
  };
}
