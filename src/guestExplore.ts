import * as T from 'three';
import { HERO_POSITION, HERO_TARGET } from './heroCamera.ts';
import { SKY_RING } from './layout.ts';
import { berthAngle, berthPark, EXPLORE_BERTH, ringPoint } from './skyRing.ts';
import type { ExploreLook } from './surveyView.ts';

// A guest's look at the Sky Ring after their result (iPad 空の環を見る / 戻る): fly to the explore berth, then loop three 4 s steps —
// a pod climbs in from the regional loop and lands, residents transfer, the camera widens to the whole ring and the guest's own
// voice node glows — until 戻る, the next Start or a new result. The pod is the berth's own parked pod, so at rest nothing changes.
export const EXPLORE_FLY = 2, EXPLORE_STEP = 4, EXPLORE_CYCLE = 3 * EXPLORE_STEP;
export const EXPLORE_COPY = {
  title: '空の環 · 空の港',
  steps: ['航路のポッドが空の港へ入る', 'ここで乗り換え、街の各地へ', '灯る点は住民の声、あなたの声も'],
} as const;

type Pose = { position: T.Vector3; target: T.Vector3 };
const a = berthAngle(EXPLORE_BERTH), park = berthPark(EXPLORE_BERTH);
const out = new T.Vector3(Math.cos(a), 0, Math.sin(a)), along = new T.Vector3(-Math.sin(a), 0, Math.cos(a));
const near = (o: number, t: number, y: number, look: T.Vector3): Pose => ({ position: park.position.clone().addScaledVector(out, o).addScaledVector(along, t).setY(y), target: look });
/** Berth pose `side` (owner pick 2026-11-02); the whole-ring pose looks up from outside the hero-side rim, so the hanging voice nodes read against the sky. */
export const EXPLORE_SHOTS = {
  side: near(75, 70, park.position.y + 14, park.position.clone().addScaledVector(out, 5).setY(park.position.y - 4)),
  ring: { position: new T.Vector3(SKY_RING.x, 0, SKY_RING.z).addScaledVector(out, 760).setY(150), target: new T.Vector3(SKY_RING.x, 250, SKY_RING.z) },
} satisfies Record<string, Pose>;

const bezier = (p0: T.Vector3, p1: T.Vector3, p2: T.Vector3, u: number, into = new T.Vector3()) =>
  into.copy(p0).multiplyScalar((1 - u) ** 2).addScaledVector(p1, 2 * u * (1 - u)).addScaledVector(p2, u * u);
const pad = park.position, rim = 9.5 + 7;
// Arrival climbs from the 160–170 m regional loop on the far side of the berth and drops onto the pad; departure leaves the other way.
const ARRIVE = [ringPoint(a - .25, 170, rim + 180), ringPoint(a - .05, 268, rim + 50), pad] as const;
const DEPART = [pad, ringPoint(a + .05, 270, rim + 50), ringPoint(a + .3, 175, rim + 220)] as const;

/** Pod pose at cycle second `local`: arrive 0–3.5 s, parked to 8 s, depart 8–11 s, out of sight until the cycle restarts. */
export function podPose(local: number) {
  const position = new T.Vector3(), ahead = new T.Vector3();
  if (local < 3.5) {
    const u = 1 - (1 - local / 3.5) ** 2;
    bezier(...ARRIVE, u, position); bezier(...ARRIVE, Math.min(1, u + .02), ahead);
    return { position, heading: ahead.sub(position).setY(0).normalize().lerp(park.heading, T.MathUtils.smoothstep(u, .7, 1)).normalize(), visible: true };
  }
  if (local < 8) return { position: position.copy(pad), heading: park.heading.clone(), visible: true };
  const u = Math.min(1, ((local - 8) / 3) ** 2);
  bezier(...DEPART, u, position); bezier(...DEPART, Math.min(1, u + .02), ahead);
  return { position, heading: ahead.sub(position).setY(0).normalize().lerp(park.heading, 1 - T.MathUtils.smoothstep(u, 0, .3)).normalize(), visible: local < 11 };
}

/** Whole-ring weight at cycle second `local`: widen during step 3, come back while the next pod is still far out. */
export function ringWeight(local: number, cycle: number) {
  if (local >= 2 * EXPLORE_STEP) return T.MathUtils.smoothstep(local, 2 * EXPLORE_STEP, 2 * EXPLORE_STEP + 2);
  return cycle > 0 && local < 2 ? 1 - T.MathUtils.smoothstep(local, 0, 2) : 0;
}

type Controls = { target: T.Vector3; enabled: boolean };
type Ring = { pod: T.Group; highlight(k: number | null, glow?: number): void };
const heroPosition = new T.Vector3(...HERO_POSITION), heroTarget = new T.Vector3(...HERO_TARGET);

export class GuestExplore {
  /** Accumulated proposals, shown under the caption. */
  voices = 0;
  private look: ExploreLook | null = null;
  private returning = false;
  private started = 0;
  private readonly from: Pose = { position: new T.Vector3(), target: new T.Vector3() };
  private readonly panel = document.createElement('aside');
  private readonly list: HTMLOListElement;
  private readonly note: HTMLElement;
  private camera: T.PerspectiveCamera;
  private controls: Controls;
  private ring: Ring;
  constructor(camera: T.PerspectiveCamera, controls: Controls, ring: Ring) {
    this.camera = camera; this.controls = controls; this.ring = ring;
    this.panel.className = 'explore-narration'; this.panel.hidden = true;
    this.panel.innerHTML = '<h2 class="causal-title"></h2><ol></ol><p class="causal-status"></p>';
    this.panel.querySelector('h2')!.textContent = EXPLORE_COPY.title;
    this.list = this.panel.querySelector('ol')!; this.note = this.panel.querySelector('p')!;
    this.list.replaceChildren(...EXPLORE_COPY.steps.map(step => Object.assign(document.createElement('li'), { textContent: step })));
    document.body.appendChild(this.panel);
  }
  get active() { return this.look !== null || this.returning; }
  /** Start (or keep) a look; the camera flies from wherever it is. */
  play(look: ExploreLook, now: number) {
    if (this.look?.ordinal === look.ordinal && !this.returning) return;
    this.capture(now); this.look = look; this.returning = false; this.controls.enabled = false;
  }
  /** 戻る: fly back to the hero pose, then hand the camera back to the controls. */
  back(now: number) {
    if (!this.look) return;
    this.stop(); this.capture(now); this.returning = true;
  }
  /** A live result, snapshot or reconnect owns the camera now: drop the look without moving the camera. */
  interrupt() { this.stop(); this.returning = false; }
  update(now: number, reducedMotion: boolean) {
    if (!this.active) return;
    const elapsed = Math.max(0, now - this.started), cam = this.camera.position, target = this.controls.target;
    if (this.returning) {
      const blend = reducedMotion ? 1 : T.MathUtils.smoothstep(elapsed, 0, EXPLORE_FLY);
      cam.lerpVectors(this.from.position, heroPosition, blend); target.lerpVectors(this.from.target, heroTarget, blend);
      this.camera.lookAt(target);
      if (blend >= 1) { this.returning = false; this.controls.enabled = true; }
      return;
    }
    const berth = EXPLORE_SHOTS.side, wide = EXPLORE_SHOTS.ring, k = this.look!.ordinal - 1;
    this.panel.hidden = false;
    this.note.textContent = `住民の声 ${this.voices}件 · iPadの「戻る」で街の全景へ`;
    if (reducedMotion) {
      // Still: the berth pose, every step shown, the pod parked and the guest's node steadily lit.
      cam.copy(berth.position); target.copy(berth.target); this.camera.lookAt(target);
      Array.from(this.list.children).forEach(li => li.classList.add('active'));
      this.park(); this.ring.highlight(k, 1);
      document.body.dataset.explore = JSON.stringify({ target: this.look!.target, step: -1 });
      return;
    }
    if (elapsed < EXPLORE_FLY) {
      const blend = T.MathUtils.smoothstep(elapsed, 0, EXPLORE_FLY);
      cam.lerpVectors(this.from.position, berth.position, blend); target.lerpVectors(this.from.target, berth.target, blend);
      this.camera.lookAt(target); this.park(); this.ring.highlight(null);
      Array.from(this.list.children).forEach(li => li.classList.remove('active'));
      return;
    }
    const time = elapsed - EXPLORE_FLY, cycle = Math.floor(time / EXPLORE_CYCLE), local = time - cycle * EXPLORE_CYCLE;
    const step = Math.min(2, Math.floor(local / EXPLORE_STEP)), w = ringWeight(local, cycle);
    cam.lerpVectors(berth.position, wide.position, w); target.lerpVectors(berth.target, wide.target, w); this.camera.lookAt(target);
    const pose = podPose(local), pod = this.ring.pod;
    pod.visible = pose.visible; pod.position.copy(pose.position); pod.lookAt(pose.position.clone().add(pose.heading));
    this.ring.highlight(k, step === 2 ? .5 + .5 * Math.sin((local - 2 * EXPLORE_STEP) * Math.PI * 1.5 - Math.PI / 2) : 0);
    Array.from(this.list.children).forEach((li, i) => li.classList.toggle('active', i === step));
    document.body.dataset.explore = JSON.stringify({ target: this.look!.target, step, local: +local.toFixed(2) });
  }
  private capture(now: number) { this.started = now; this.from.position.copy(this.camera.position); this.from.target.copy(this.controls.target); }
  private park() { const pod = this.ring.pod; pod.visible = true; pod.position.copy(park.position); pod.lookAt(park.position.clone().add(park.heading)); }
  private stop() {
    this.look = null; this.panel.hidden = true; this.park(); this.ring.highlight(null);
    delete document.body.dataset.explore;
  }
}
