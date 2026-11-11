// DEV-only `?residentDemo` (with `?survey=`): when a live result's headline is the NW hub arriving at +1, the camera visits 湊 after the building change, then returns to the headline shot (src/devMinato.ts, minatoTimeline.ts).
import * as T from 'three';
import { createMinato, RESIDENT_FOV, residentPose } from './devMinato.ts';
import { BEAT_ACTION, residentBeat } from './minatoTimeline.ts';

export const RESIDENT_POSE = residentPose();
const DETOUR = new T.Vector3(0, 8, -14);
const LINE = '真夜中でも荷物は届きます。でも、私の窓口は今日で閉まりました。';

export function startResidentDemo(scene: T.Scene, camera: T.PerspectiveCamera, controls: { target: T.Vector3 }) {
  const fov = camera.fov, position = new T.Vector3(...RESIDENT_POSE.position), target = new T.Vector3(...RESIDENT_POSE.target);
  const control = new T.Vector3();
  const caption = document.createElement('div');
  caption.style.cssText = 'position:fixed;left:44px;bottom:44px;z-index:4;max-width:560px;padding:14px 20px;border-radius:10px;background:#f9f8f0e6;color:#2f3d36;font:600 22px/1.5 system-ui,"Noto Sans JP",sans-serif;pointer-events:none;box-shadow:0 8px 30px #38432b26';
  caption.textContent = LINE;
  caption.hidden = true;
  document.body.append(caption);
  let minato: ReturnType<typeof createMinato> | null = null;
  let phase: 'idle' | 'beat' | 'done' = 'idle', from = 0;
  const setFov = (value: number) => { if (camera.fov !== value) { camera.fov = value; camera.updateProjectionMatrix(); } };
  const end = () => { phase = 'done'; setFov(fov); caption.hidden = true; };
  let last = { phase: 'idle', u: 0, blend: 0, headline: false }; // `window.cityResidentDemo()`: for timing checks
  Object.assign(window, { cityResidentDemo: () => last });
  return {
    /** The headline camera's building change ends at `changeEnd` (clock seconds). */
    start(changeEnd: number) { phase = 'beat'; from = changeEnd; },
    /** A snapshot, reset, Undo, reconnect or new live result: drop the beat; the existing handling owns the camera. */
    cancel() { if (phase === 'beat') end(); },
    frame(now: number, headlineActive: boolean) {
      if (!minato && scene.getObjectByName('hub-state-high')) minato = createMinato(scene);
      if (!minato) return;
      const settled = minato.settled();
      if (!settled && phase === 'done') phase = 'idle'; // the +1 state went away: the next arrival starts a fresh booth
      let action = phase === 'done' ? BEAT_ACTION : 0;
      if (phase === 'beat') {
        const u = now - from, beat = residentBeat(u);
        if (!headlineActive || beat.done) end();
        else if (u >= 0) {
          action = beat.action;
          // Quadratic curve through a control point pushed north and up, so the move clears the ring facade south of the hub.
          const w = beat.blend, base = camera.position;
          control.copy(base).lerp(position, .5).add(DETOUR);
          base.multiplyScalar((1 - w) * (1 - w)).addScaledVector(control, 2 * (1 - w) * w).addScaledVector(position, w * w);
          controls.target.lerp(target, beat.blend);
          camera.lookAt(controls.target);
          setFov(T.MathUtils.lerp(fov, RESIDENT_FOV, beat.blend));
          caption.hidden = beat.blend < .02;
          caption.style.opacity = beat.blend.toFixed(3);
        }
      }
      last = { phase, u: phase === 'beat' ? now - from : 0, blend: phase === 'beat' ? residentBeat(now - from).blend : 0, headline: headlineActive };
      minato.show(settled, action);
    },
  };
}
