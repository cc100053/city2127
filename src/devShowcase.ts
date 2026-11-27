// DEV `?showcase`: the draft Q10-A sphere furnace and Q11-C storm vortex (asset/models/q10a-solar-furnace, q11c-storm-vortex; owner
// 2026-11-27: shown in the city before any question or lot is chosen) stand on the open west bay, clear of the land fill, the Q02 lots
// and the boat routes. Not a rotation lot: no vote, card or close-up reaches them, and production builds never load them.
import * as T from 'three';
import { bake } from './cityRig.ts';
import { addCityModel } from './modelAssets.ts';

/** World centre (x, z) and yaw of each draft; both GLBs face their land side (+z) east, toward the city. Sea at −0.8, pads at 0. */
export const SHOWCASE = {
  q10a: { url: new URL('../asset/models/q10a-solar-furnace/q10a-solar-furnace-nocrown.glb', import.meta.url).href, x: -800, z: -170, yaw: Math.PI / 2, name: 'q10a-solar-furnace' },
  q11c: { url: new URL('../asset/models/q11c-storm-vortex/q11c-storm-vortex.glb', import.meta.url).href, x: -900, z: 420, yaw: Math.PI / 2, name: 'q11c-storm-vortex' },
} as const;

/** Turn rates, radians per second, of the storm vortex's animation nodes (build_storm_vortex.py names them). */
const SPIN = { rotor: 2.4, streaks: .25, ring: [.05, -.04, .03] } as const;

const opaque = (mesh: T.Mesh) => !Array.isArray(mesh.material) && !mesh.material.transparent;

/** Keyboard fly for the free showcase camera: W/S along the view (level), A/D sideways, E/Space up, Q/C down, Shift ×4.
 *  Camera and orbit target move together, so mouse orbit still turns about what is ahead. Speed grows with height (≈ 60 m/s near
 *  the water). Returns the per-frame step. */
export function showcaseKeys(camera: T.Camera, target: T.Vector3) {
  const held = new Set<string>();
  const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  addEventListener('keydown', e => { if (!typing(e)) held.add(e.code); });
  addEventListener('keyup', e => held.delete(e.code));
  addEventListener('blur', () => held.clear());
  const forward = new T.Vector3(), side = new T.Vector3(), move = new T.Vector3(), up = new T.Vector3(0, 1, 0);
  let last = performance.now();
  return () => {
    const t = performance.now(), dt = Math.min(.1, (t - last) / 1000); last = t;
    if (!held.size) return;
    camera.getWorldDirection(forward); forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1).applyQuaternion(camera.quaternion).setY(0);
    forward.normalize(); side.crossVectors(forward, up);
    const key = (...codes: string[]) => codes.some(c => held.has(c)) ? 1 : 0;
    move.set(0, 0, 0)
      .addScaledVector(forward, key('KeyW', 'ArrowUp') - key('KeyS', 'ArrowDown'))
      .addScaledVector(side, key('KeyD', 'ArrowRight') - key('KeyA', 'ArrowLeft'))
      .addScaledVector(up, key('KeyE', 'Space') - key('KeyQ', 'KeyC'));
    if (!move.lengthSq()) return;
    const speed = (60 + Math.max(0, camera.position.y) * .6) * (key('ShiftLeft', 'ShiftRight') ? 4 : 1);
    move.normalize().multiplyScalar(speed * dt);
    // Keep the eye above the water.
    if (camera.position.y + move.y < 3) move.y = 3 - camera.position.y;
    camera.position.add(move); target.add(move);
  };
}

/** Loads both drafts into `scene`; returns the per-frame motion (turbines, vortex streaks and rings turn once Q11-C is in). */
export function startShowcase(scene: T.Object3D) {
  let frame: ((now: number) => void) | undefined;
  for (const site of Object.values(SHOWCASE)) {
    void addCityModel(scene, site.url, [site.x, 0, site.z], site.yaw).then(model => {
      // Glass, vortex and cloud stay separately sortable after the opaque structure; named once complete.
      model.traverse(o => { if (o instanceof T.Mesh && !opaque(o)) { o.renderOrder = 2; for (const m of ([] as T.Material[]).concat(o.material)) m.depthWrite = false; } });
      if (site === SHOWCASE.q11c) {
        const rotors: T.Object3D[] = [];
        model.traverse(o => { if (/^TURBINE_ROTOR_\d+$/.test(o.name)) rotors.push(o); });
        const streaks = model.getObjectByName('VORTEX_STREAKS');
        const rings = ['RING_LOW', 'RING_MID', 'RING_HIGH'].map(name => model.getObjectByName(name));
        const moving = new Set<T.Object3D>([...rotors, ...(streaks ? [streaks] : []), ...rings.filter(r => !!r) as T.Object3D[]]);
        const isMoving = (mesh: T.Mesh) => { for (let o: T.Object3D | null = mesh; o && o !== model; o = o.parent) if (moving.has(o)) return true; return false; };
        model.add(...bake(model, mesh => opaque(mesh) && !isMoving(mesh)));
        // Each node's rest pose, so the turn is applied about its own axis (rotors: local +x, radial; streaks and rings: the vertical axis).
        const turning = [...moving].map(o => ({
          o, rest: o.quaternion.clone(),
          axis: rotors.includes(o) ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0).applyQuaternion(o.quaternion.clone().invert()),
          rate: rotors.includes(o) ? SPIN.rotor : o === streaks ? SPIN.streaks : SPIN.ring[rings.indexOf(o)],
        }));
        const spin = new T.Quaternion();
        frame = now => { for (const t of turning) t.o.quaternion.copy(t.rest).multiply(spin.setFromAxisAngle(t.axis, now * t.rate)); };
      } else model.add(...bake(model, opaque));
      model.name = site.name;
    }).catch(error => console.error(`${site.name} could not load`, error));
  }
  return (now: number) => frame?.(now);
}
