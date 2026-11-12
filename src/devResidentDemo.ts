// DEV-only `?residentDemo` (with `?survey=`): when a live result's headline is the NW hub (focal shot), the camera visits 湊 and his kiosk after the building change, then returns to the headline shot (src/devMinato.ts, minatoTimeline.ts).
import * as T from 'three';
import { CAM_REL, CLOSE, createMinato, FACTOR, KIOSK_BY, RESIDENT_FOV, residentPose, type Band } from './devMinato.ts';
import { BEAT_ACTION, residentBeat } from './minatoTimeline.ts';

const DETOUR = new T.Vector3(0, 8, -14);
/** Minato's line per arrival: +1, -1, and 0 coming from +1 or from -1. */
const LINES = {
  high: '真夜中でも荷物は届きます。でも、私の窓口は今日で閉まりました。',
  low: '窓口に列ができています。待たせるけれど、顔を見て話せます。',
  mixedFromHigh: '昼だけ窓口が戻りました。夜は、機械に任せています。',
  mixedFromLow: '簡単な用事は機械へ。そのぶん、困った人とゆっくり話せます。',
} as const;
const caption = (to: Band, from: Band) => to === 'high' ? LINES.high : to === 'low' ? LINES.low : from === 'low' ? LINES.mixedFromLow : LINES.mixedFromHigh;

export function startResidentDemo(scene: T.Scene, camera: T.PerspectiveCamera, controls: { target: T.Vector3 }) {
  const fov = camera.fov, position = new T.Vector3(), target = new T.Vector3(), control = new T.Vector3();
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:44px;bottom:44px;z-index:4;max-width:560px;padding:14px 20px;border-radius:10px;background:#f9f8f0e6;color:#2f3d36;font:600 22px/1.5 system-ui,"Noto Sans JP",sans-serif;pointer-events:none;box-shadow:0 8px 30px #38432b26';
  box.hidden = true;
  document.body.append(box);
  let minato: ReturnType<typeof createMinato> | null = null;
  let phase: 'idle' | 'beat' | 'done' = 'idle', from = 0, band: Band = 'mixed', seen: Band | null = null, held = 0;
  const setFov = (value: number) => { if (camera.fov !== value) { camera.fov = value; camera.updateProjectionMatrix(); } };
  const card = () => document.querySelector<HTMLElement>('.resident-panel'); // the right-hand result card: only its opacity is touched here
  const end = () => { phase = 'done'; setFov(fov); box.hidden = true; const c = card(); if (c) c.style.opacity = ''; };
  let last = { phase: 'idle', u: 0, blend: 0, headline: false, band: 'mixed' as string, probe: null as unknown }; // `window.cityResidentDemo()`: for timing checks
  Object.assign(window, { cityResidentDemo: () => last });
  return {
    /** The headline camera's building change ends at `changeEnd` (clock seconds); NW arrives at band `to`, coming from `previous`. */
    start(changeEnd: number, to: Band, previous: Band) {
      phase = 'beat'; from = changeEnd; band = to;
      const pose = residentPose(KIOSK_BY[to], CAM_REL, FACTOR[to] * CLOSE[to]);
      position.set(...pose.position); target.set(...pose.target);
      box.textContent = caption(to, previous);
    },
    /** A snapshot, reset, Undo, reconnect or new live result: drop the beat; the existing handling owns the camera and the set follows the hub's settled state. */
    cancel() { if (phase === 'beat') end(); },
    frame(now: number, headlineActive: boolean) {
      if (!minato && scene.getObjectByName('hub-state-high') && scene.getObjectByName('hub-state-low') && scene.getObjectByName('hub-state-mixed')) minato = createMinato(scene, undefined, true, true);
      if (!minato) return;
      if (minato.band !== seen) { if (phase === 'done') phase = 'idle'; seen = minato.band; held = 0; } // the hub switched state: the next arrival starts a fresh set
      const holdFinal = minato.band === 'high'; // the +1 action ends with the shutter closed and 湊 gone; the 0 and -1 loops go back to the opening pose
      let action = phase === 'done' && holdFinal ? BEAT_ACTION : 0;
      if (phase === 'beat') {
        const u = now - from, beat = residentBeat(u);
        if (!headlineActive || beat.done) end();
        else if (u >= 0) {
          action = beat.action;
          held = action;
          // Quadratic curve through a control point pushed north and up, so the move clears the ring facade south of the hub.
          const w = beat.blend, base = camera.position;
          control.copy(base).lerp(position, .5).add(DETOUR);
          base.multiplyScalar((1 - w) * (1 - w)).addScaledVector(control, 2 * (1 - w) * w).addScaledVector(position, w * w);
          controls.target.lerp(target, beat.blend);
          camera.lookAt(controls.target);
          setFov(T.MathUtils.lerp(fov, RESIDENT_FOV, beat.blend));
          box.hidden = beat.blend < .02;
          box.style.opacity = beat.blend.toFixed(3);
          const c = card();
          if (c) c.style.opacity = (1 - beat.blend).toFixed(3); // fades out as the camera goes to 湊 and back in as it returns
        }
      }
      if (phase === 'beat' && now < from) action = held; // a new result arrived after a beat: the set keeps its last pose until its building change completes
      else if (phase !== 'beat') held = action;
      last = { phase, u: phase === 'beat' ? now - from : 0, blend: phase === 'beat' ? residentBeat(now - from).blend : 0, headline: headlineActive, band: minato.band ?? '', probe: minato.probe() as unknown };
      minato.show(true, action);
    },
  };
}
