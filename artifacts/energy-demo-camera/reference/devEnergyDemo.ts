import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CityChangeManager } from './cityChangeManager.ts';
import { ENERGY_PHASES } from './devEnergy.ts';
import { energyCycle } from './energyPrototype.ts';
import { HERO_POSITION, HERO_TARGET } from './heroCamera.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';
import { ARRIVAL_SECONDS } from './voteJourney.ts';
import { emptyEnergyConfiguration, type EnergyConfiguration } from '../survey/src/shared/energy.ts';

export type EnergyFocus = 'island' | 'wing' | 'ring' | 'garden' | 'garden2';
export const FLY_SECONDS = 3;
const CYCLE_SECONDS = 60;
/** Seconds of narrated cycle in close-up; the whole 60 s storage cycle is compressed into it (close-up ≈ fade-in + hold). */
export const DEFAULT_HOLD = 9;

const RECEIVER_RANK = { none: 0, small: 1, large: 2 } as const;
/** The newly added energy part a close-up should show; removals and unchanged layouts return null. */
export function energyFocus(before: EnergyConfiguration, after: EnergyConfiguration): EnergyFocus | null {
  if (after.island && !before.island) return 'island';
  if (RECEIVER_RANK[after.receiver] > RECEIVER_RANK[before.receiver]) return 'wing';
  if (after.flywheel && !before.flywheel) return 'ring';
  if (after.waterGardens > before.waterGardens) return after.waterGardens === 2 && before.waterGardens === 1 ? 'garden2' : 'garden';
  return null;
}

export type DemoStage = 'arrive' | 'fly-in' | 'appear' | 'cycle' | 'fly-out' | 'done';
/** Seconds after the live result at which each stage starts: hero vote journey, fly in, the part fades in, narrated cycle, fly back. */
export function demoTimeline(hold: number) {
  const flyIn = ARRIVAL_SECONDS, appear = flyIn + FLY_SECONDS, cycle = appear + SITE_TRANSITION_SECONDS, flyOut = cycle + hold;
  return { arrive: 0, flyIn, appear, cycle, flyOut, done: flyOut + FLY_SECONDS };
}
export function demoStage(elapsed: number, hold: number): DemoStage {
  const t = demoTimeline(hold);
  return elapsed < t.flyIn ? 'arrive' : elapsed < t.appear ? 'fly-in' : elapsed < t.cycle ? 'appear' : elapsed < t.flyOut ? 'cycle' : elapsed < t.done ? 'fly-out' : 'done';
}

// Close-up poses from the hero side (camera, target), authored against energyPrototype part positions.
const POSES: Record<EnergyFocus, [[number, number, number], [number, number, number]]> = {
  garden: [[-372, 62, -232], [-306, 12, -150]],
  garden2: [[-16, 48, -452], [32, 8, -392]],
  ring: [[-118, 148, -138], [-18, 96, -24]],
  wing: [[56, 64, -496], [125, 22, -424]],
  island: [[-142, 66, -556], [-60, 4, -470]],
};
const COPY: Record<EnergyFocus, { title: string; steps: [string, string, string] }> = {
  garden: { title: '上下水庭 · 水力儲能', steps: [ENERGY_PHASES.a.charge, ENERGY_PHASES.a.hold, ENERGY_PHASES.a.release] },
  garden2: { title: '第二處水庭 · 水力儲能', steps: [ENERGY_PHASES.a.charge, ENERGY_PHASES.a.hold, ENERGY_PHASES.a.release] },
  ring: { title: '富士儲能環 · 旋轉儲能', steps: [ENERGY_PHASES.b.charge, ENERGY_PHASES.b.hold, ENERGY_PHASES.b.release] },
  wing: { title: '接收翼 · 外部供電', steps: ['接收翼 → 接收外部供電', '岸邊配電門架 → 承接供電', '街區配電節點 → 街區用電'] },
  island: { title: '能源島 · 島嶼供電', steps: ['能源島 → 供電', '跨水檢修橋 → 服務線', '街區配電節點 → 街區用電'] },
};

/**
 * DEV-only `?survey&energyDemo` (`&demoHold=12`): after a live result adds an energy part, the camera flies to it and a
 * caption narrates one storage cycle compressed into a quick close-up, then returns to the hero pose. A timing prototype, not exhibition copy.
 */
export type EnergyDemo = ReturnType<typeof startEnergyDemo>;
export function startEnergyDemo(camera: PerspectiveCamera, controls: OrbitControls, manager: CityChangeManager, params: URLSearchParams) {
  const hold = Math.max(3, Number(params.get('demoHold') ?? DEFAULT_HOLD) || DEFAULT_HOLD), rate = CYCLE_SECONDS / hold;
  const panel = document.createElement('aside'); panel.className = 'causal-panel energy-demo'; panel.hidden = true;
  panel.innerHTML = '<h2 class="causal-title"></h2><ol></ol><p class="causal-status">原型示意 · 非正式文案<br>未驗證容量或工程可行性。</p>';
  document.body.appendChild(panel);
  const title = panel.querySelector('h2')!, list = panel.querySelector('ol')!;
  const fromPos = new Vector3(), fromAim = new Vector3(), toPos = new Vector3(), toAim = new Vector3(), aim = new Vector3();
  const hero = [new Vector3(...HERO_POSITION), new Vector3(...HERO_TARGET)] as const;
  let demo: { focus: EnergyFocus; start: number; stage: DemoStage; marks: Partial<Record<DemoStage, number>> } | null = null;
  // Energy motion runs on its own clock so the narrated cycle starts at charge and fits the close-up hold.
  // shortcut: other energy parts jump to the cycle start (and drift from wall time); replace with a per-part phase if this ships.
  let clock = 0, last: number | null = null;
  const status = (data: object) => { document.body.dataset.energyDemo = JSON.stringify(data); };
  function finish(snap: boolean) {
    if (!demo) return;
    if (snap) { camera.position.copy(hero[0]); controls.target.copy(hero[1]); camera.lookAt(controls.target); }
    controls.enabled = true; controls.update(); panel.hidden = true;
    status({ focus: demo.focus, stage: snap ? 'cancelled' : 'done', marks: demo.marks, planned: demoTimeline(hold), rate, hold });
    console.info('[energyDemo]', demo.focus, snap ? 'cancelled' : 'done', JSON.stringify(demo.marks));
    demo = null;
  }
  function flyFrom(target: readonly [Vector3, Vector3]) { fromPos.copy(camera.position); fromAim.copy(controls.target); toPos.copy(target[0]); toAim.copy(target[1]); }
  return {
    /** Starts a demo for a live layout and returns the extra seconds the city transition should wait (0 without a new part). */
    play(next: EnergyConfiguration | undefined, now: number) {
      const focus = energyFocus(manager.energy?.getConfiguration() ?? emptyEnergyConfiguration(), next ?? emptyEnergyConfiguration());
      finish(true);
      if (!focus) return 0;
      demo = { focus, start: now, stage: 'arrive', marks: { arrive: 0 } };
      title.textContent = COPY[focus].title;
      list.replaceChildren(...COPY[focus].steps.map(step => Object.assign(document.createElement('li'), { textContent: step })));
      console.info('[energyDemo]', focus, 'planned', JSON.stringify(demoTimeline(hold)), { rate, hold });
      return FLY_SECONDS;
    },
    /** Snapshots, resets, Undo and reconnects settle immediately: cut back to the hero pose. */
    cancel() { finish(true); },
    update(now: number) {
      const dt = last === null ? 0 : Math.max(0, now - last); last = now;
      const stage = demo ? demoStage(now - demo.start, hold) : 'done';
      if (demo && stage !== demo.stage) {
        demo.marks[stage] = +(now - demo.start).toFixed(2);
        if (stage === 'fly-in') { flyFrom([new Vector3(...POSES[demo.focus][0]), new Vector3(...POSES[demo.focus][1])]); controls.enabled = false; }
        if (stage === 'appear') panel.hidden = false;
        if (stage === 'cycle') clock = Math.ceil(clock / CYCLE_SECONDS) * CYCLE_SECONDS;
        if (stage === 'fly-out') { flyFrom(hero); panel.hidden = true; }
        demo.stage = stage;
      }
      clock += dt * (stage === 'cycle' ? rate : 1);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) manager.energy?.model.update(clock);
      if (!demo) return;
      if (stage === 'done') return finish(false);
      const t = demoTimeline(hold);
      if (stage === 'fly-in' || stage === 'fly-out') {
        const k = MathUtils.smoothstep(now - demo.start, stage === 'fly-in' ? t.flyIn : t.flyOut, (stage === 'fly-in' ? t.flyIn : t.flyOut) + FLY_SECONDS);
        camera.position.lerpVectors(fromPos, toPos, k); controls.target.copy(aim.lerpVectors(fromAim, toAim, k));
      } else if (stage !== 'arrive') { camera.position.copy(toPos); controls.target.copy(toAim); }
      // OrbitControls' distance/pan limits run before this each frame; the authored pose overrides them while the demo holds the camera.
      if (stage !== 'arrive') camera.lookAt(controls.target);
      const active = stage === 'cycle' ? Math.min(2, Math.floor(energyCycle(clock).t / 20)) : -1;
      Array.from(list.children).forEach((li, i) => li.classList.toggle('active', i === active));
      status({ focus: demo.focus, stage, elapsed: +(now - demo.start).toFixed(2), phase: stage === 'cycle' ? energyCycle(clock).phase : null, marks: demo.marks, planned: t, rate, hold });
    },
  };
}
