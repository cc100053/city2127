import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import type { CarrierChange } from './cityChangeManager.ts';
import { HERO_POSITION, HERO_TARGET } from './heroCamera.ts';
import { energyChangedPart } from './surveyAtmosphere.ts';
import { ARRIVAL_SECONDS } from './voteJourney.ts';

type Site = CarrierChange['socketId'];
export type ShotId = `${Site}:${'focal' | 'district'}` | `energy:${'garden' | 'garden2' | 'ring' | 'wing' | 'island'}`;
type Pose = { position: [number, number, number]; target: [number, number, number] };
export const SHOTS: Record<ShotId, Pose> = {
  'nw:focal': { position: [-105, 150, -475], target: [40, 48, -300] },
  'ne:focal': { position: [-280, 85, -245], target: [-210, 14, -135] },
  'sw:focal': { position: [-150, 40, -10], target: [-105, 12, 60] },
  'se:focal': { position: [-20, 245, -240], target: [175, 65, -45] },
  'nw:district': { position: [-180, 180, -470], target: [10, 28, -210] },
  'ne:district': { position: [-440, 200, -355], target: [-210, 25, -120] },
  'sw:district': { position: [-365, 135, -420], target: [-180, 8, -235] },
  'se:district': { position: [-105, 235, -295], target: [140, 40, -30] },
  'energy:garden': { position: [-372, 62, -232], target: [-306, 12, -150] },
  'energy:garden2': { position: [-16, 48, -452], target: [32, 8, -392] },
  'energy:ring': { position: [-118, 148, -138], target: [-18, 96, -24] },
  'energy:wing': { position: [56, 64, -496], target: [125, 22, -424] },
  'energy:island': { position: [-142, 66, -556], target: [-60, 4, -470] },
};
export function headlineShot(change: CarrierChange | undefined): ShotId | null {
  if (!change) return null;
  if (!change.energy) return `${change.socketId}:${change.focal && !change.district ? 'focal' : 'district'}`;
  const { before, after } = change.energy;
  switch (energyChangedPart(before, after)) {
    case 'waterGardens': return before.waterGardens === 1 && after.waterGardens === 2 ? 'energy:garden2' : 'energy:garden';
    case 'receiver': return 'energy:wing';
    case 'flywheel': return 'energy:ring';
    case 'island': return 'energy:island';
    default: return null;
  }
}
export const FLY_IN = 1.5, FLY_OUT = 2;
export const shotTimeline = (displayMs = DISPLAY_MS) => ({ flyIn: ARRIVAL_SECONDS, hold: ARRIVAL_SECONDS + FLY_IN, flyOut: displayMs / 1000, done: displayMs / 1000 + FLY_OUT });
export function shotStage(elapsed: number, displayMs = DISPLAY_MS) {
  const t = shotTimeline(displayMs);
  return elapsed < t.flyIn ? 'journey' : elapsed < t.hold ? 'fly-in' : elapsed < t.flyOut ? 'hold' : elapsed < t.done ? 'fly-out' : 'done';
}
type Controls = { target: Vector3; enabled: boolean; update(): unknown };
const heroPosition = new Vector3(...HERO_POSITION), heroTarget = new Vector3(...HERO_TARGET);

export class HeadlineCamera {
  private shot: ShotId | null = null;
  private returning = false;
  private started = 0;
  private displayMs = DISPLAY_MS;
  private readonly fromPosition = new Vector3();
  private readonly fromTarget = new Vector3();
  private camera: PerspectiveCamera;
  private controls: Controls;
  private readonly position = new Vector3();
  private readonly target = new Vector3();
  constructor(camera: PerspectiveCamera, controls: Controls) { this.camera = camera; this.controls = controls; }
  get active() { return this.shot !== null || this.returning; }
  play(changes: readonly CarrierChange[], now: number, displayMs = DISPLAY_MS) {
    const shot = headlineShot(changes[0]);
    if (displayMs < DISPLAY_MS - 100 || (!shot && !this.active)) { this.cancel(); return; }
    this.fromPosition.copy(this.camera.position); this.fromTarget.copy(this.controls.target);
    if (shot) { this.position.set(...SHOTS[shot].position); this.target.set(...SHOTS[shot].target); }
    this.returning = shot === null;
    this.shot = shot; this.started = now; this.displayMs = displayMs; this.controls.enabled = false;
  }
  cancel() {
    this.shot = null; this.returning = false;
    this.camera.position.copy(heroPosition); this.controls.target.copy(heroTarget);
    this.controls.update();
    this.camera.position.copy(heroPosition); this.controls.target.copy(heroTarget); this.camera.lookAt(heroTarget);
    this.controls.enabled = true;
  }
  update(now: number) {
    if (!this.active) return;
    const elapsed = Math.max(0, now - this.started), t = shotTimeline(this.displayMs);
    const stage = shotStage(elapsed, this.displayMs);
    if (stage === 'done' || (this.returning && elapsed >= FLY_OUT)) { this.cancel(); return; }
    if (this.returning || stage === 'journey') {
      const blend = MathUtils.smoothstep(elapsed, 0, FLY_OUT);
      this.camera.position.lerpVectors(this.fromPosition, heroPosition, blend);
      this.controls.target.lerpVectors(this.fromTarget, heroTarget, blend);
    } else {
      const blend = stage === 'fly-out' ? 1 - MathUtils.smoothstep(elapsed, t.flyOut, t.done) : MathUtils.smoothstep(elapsed, t.flyIn, t.hold);
      this.camera.position.copy(heroPosition).lerp(this.position, blend);
      this.controls.target.copy(heroTarget).lerp(this.target, blend);
    }
    this.camera.lookAt(this.controls.target);
  }
}
