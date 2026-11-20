import { MathUtils, Spherical, Vector3, type PerspectiveCamera } from 'three';
import { HERO_TARGET, heroSettledCamera } from './heroCamera.ts';

// Idle attract loop (owner 2026-11-20): when no guest result, Sky Ring look or staff input has reached the big screen for
// IDLE_SECONDS, the camera drifts slowly around the hero pose (the only automatic main-camera motion outside a live
// result; no site tour) and a 次は、あなたの声 call to action invites the next guest. Any survey event or input stops it
// at once; the camera code that owns the event (headline flight, snapshot, explore) then takes the camera from wherever it is.

export const IDLE_SECONDS = 90;
export const LOOP_SECONDS = 60;
/** One loop: drift, then 声の灯 (today's proposals as lights, Step B; until then the drift continues), then the call to action. */
export const SEGMENTS = { drift: [0, 25], voices: [25, 50], cta: [50, 60] } as const;
export type AttractSegment = keyof typeof SEGMENTS;
/** Seconds to blend from wherever the camera was into the drift path. */
export const EASE_IN = 4;
export const CTA_FADE = .8;
/** Sway ±12° around the hero target; one sway per 150 s keeps the peak rate near 0.5°/s. */
export const DRIFT_YAW = MathUtils.degToRad(12);
export const YAW_PERIOD = 150;
/** The hero sits at OrbitControls' polar limit (1.42), so the camera only breathes upward from it. */
export const DRIFT_LIFT = .06;
export const LIFT_PERIOD = 47;

export function attractSegment(elapsed: number): AttractSegment {
  const t = ((elapsed % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
  return t < SEGMENTS.drift[1] ? 'drift' : t < SEGMENTS.voices[1] ? 'voices' : 'cta';
}

/** 0 → 1 → 0 over the call-to-action segment of each loop. */
export function ctaOpacity(elapsed: number) {
  const t = ((elapsed % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS, [from, until] = SEGMENTS.cta;
  if (t <= from || t >= until) return 0;
  return Math.min(1, (t - from) / CTA_FADE, (until - t) / CTA_FADE);
}

const heroOrbit = (() => {
  const camera = heroSettledCamera(16, 9);
  return new Spherical().setFromVector3(camera.position.clone().sub(new Vector3(...HERO_TARGET)));
})();

/** Camera position on the drift path `elapsed` seconds into the loop; continuous with the settled hero pose at 0. */
export function driftPosition(elapsed: number, into = new Vector3()) {
  const s = heroOrbit.clone();
  s.theta += DRIFT_YAW * Math.sin(2 * Math.PI * elapsed / YAW_PERIOD);
  s.phi -= DRIFT_LIFT * (1 - Math.cos(2 * Math.PI * elapsed / LIFT_PERIOD)) / 2;
  return into.setFromSpherical(s).add(new Vector3(...HERO_TARGET));
}

type Controls = { target: Vector3; enabled: boolean };
export type AttractCta = { update(opacity: number, voices: number): void };

export class AttractLoop {
  private started: number | null = null;
  private lastActive: number;
  private readonly fromPosition = new Vector3();
  private readonly fromTarget = new Vector3();
  private readonly path = new Vector3();
  private readonly heroTarget = new Vector3(...HERO_TARGET);
  private camera: PerspectiveCamera;
  private controls: Controls;
  private cta: AttractCta | null;
  readonly idleSeconds: number;
  constructor(camera: PerspectiveCamera, controls: Controls, cta: AttractCta | null, idleSeconds = IDLE_SECONDS, now = 0) {
    this.camera = camera; this.controls = controls; this.cta = cta; this.idleSeconds = idleSeconds; this.lastActive = now;
  }
  get active() { return this.started !== null; }
  /** Seconds since the loop started, or null while waiting. */
  elapsed(now: number) { return this.started === null ? null : now - this.started; }
  /** A survey event or staff input: restart the idle wait and hand the camera back where it is. */
  wake(now: number) {
    this.lastActive = now;
    if (this.started === null) return;
    this.started = null; this.controls.enabled = true; this.cta?.update(0, 0);
  }
  /** `busy`: another camera owner (headline flight, Sky Ring look) is playing. Reduced motion keeps the camera still. */
  update(now: number, busy: boolean, reduced: boolean, voices: number) {
    if (busy) { this.wake(now); return; }
    if (this.started === null) {
      if (now - this.lastActive < this.idleSeconds) return;
      this.started = now; this.fromPosition.copy(this.camera.position); this.fromTarget.copy(this.controls.target);
    }
    const elapsed = now - this.started;
    if (!reduced) {
      const blend = MathUtils.smoothstep(elapsed, 0, EASE_IN);
      this.camera.position.lerpVectors(this.fromPosition, driftPosition(elapsed, this.path), blend);
      this.controls.target.lerpVectors(this.fromTarget, this.heroTarget, blend);
      this.controls.enabled = false;
      this.camera.lookAt(this.controls.target);
    }
    this.cta?.update(ctaOpacity(elapsed), voices);
  }
}

/** Bottom-centre call to action; Japanese copy only (owner rule for all UI text). */
export function attractCta(parent: HTMLElement = document.body): AttractCta {
  const element = document.createElement('div');
  element.className = 'attract-cta'; element.hidden = true;
  element.innerHTML = '<p class="attract-cta-title">次は、あなたの声。</p><p class="attract-cta-count"></p><p class="attract-cta-hint">iPad で、2127年の台場の暮らしを選んでください。</p>';
  parent.append(element);
  const count = element.querySelector('.attract-cta-count') as HTMLElement;
  return {
    update(opacity, voices) {
      element.hidden = opacity <= 0;
      if (element.hidden) return;
      element.style.opacity = opacity.toFixed(3);
      count.hidden = voices <= 0;
      count.textContent = `これまでに ${voices} の声が、この街を形づくりました。`;
    },
  };
}
