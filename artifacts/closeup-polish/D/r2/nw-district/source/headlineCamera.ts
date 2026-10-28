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
  'nw:focal': { position: [40, 130, -508], target: [40, 43, -300] },
  'ne:focal': { position: [-280, 85, -245], target: [-210, 14, -135] },
  'sw:focal': { position: [-165, 45, 210], target: [-105, 28, 60] },
  'se:focal': { position: [-90, 200, -170], target: [175, 50, -45] },
  'nw:district': { position: [-390, 300, -330], target: [-200, 0, -80] },
  'ne:district': { position: [-390, 270, -310], target: [-250, 0, -170] },
  'sw:district': { position: [-160, 420, -400], target: [-120, 5, -260] },
  'se:district': { position: [-200, 300, -365], target: [15, 35, -80] },
  'energy:garden': { position: [-420, 65, -210], target: [-304, 12, -135] },
  'energy:garden2': { position: [-16, 48, -452], target: [32, 8, -392] },
  'energy:ring': { position: [-70, 135, -170], target: [-18, 99, -24] },
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
