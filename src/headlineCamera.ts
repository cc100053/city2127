import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import type { CarrierChange } from './cityChangeManager.ts';
import { HERO_POSITION, HERO_TARGET } from './heroCamera.ts';
import { energyChangedPart } from './surveyAtmosphere.ts';
import { FLY_OUT, shotTimeline } from './resultTimeline.ts';
import { STAGE_SLOTS } from './stages.ts';
export { FLY_IN, FLY_OUT, shotTimeline } from './resultTimeline.ts';

type Site = CarrierChange['socketId'];
export type ShotId = `${Site}:${'focal' | 'district'}` | `${'nw' | 'sw' | 'se'}:${string}` | `energy:${'garden' | 'garden2' | 'ring' | 'wing' | 'island'}`;
type Pose = { position: [number, number, number]; target: [number, number, number] };
export const SHOTS: Record<ShotId, Pose> = {
  'nw:focal': { position: [212, 64, -342], target: [40, 62, -300] },
  'ne:focal': { position: [-280, 85, -245], target: [-210, 14, -135] },
  'sw:focal': { position: [-95, 30, -15], target: [-105, 10, 60] },
  // East pose (owner 2026-11-04): the only clear sightline that frames the full +1 tower; 0<->+1 changes.
  'se:focal': { position: [360, 45, -50], target: [182, 58, -38] },
  // Pulled back and up from the NW (owner 2026-11-05, option b) so the whole lot and the 0 tower fit, clear of the P1 beams; used when a focal change starts or ends at the low band (-1<->0).
  'se:focal-low': { position: [118, 38, -107], target: [182, 18, -38] },
  // nw:focal frames the +1 spire; this east-side pose (clear of the x2 -1 hall) is used when a focal change starts or ends at the low band.
  'nw:focal-low': { position: [140, 28, -332], target: [40, 26, -300] },
  'nw:district': { position: [-30, 115, -455], target: [40, 43, -300] },
  'ne:district': { position: [-320, 110, -300], target: [-210, 14, -135] },
  'sw:district': { position: [-108, 80, 180], target: [-105, 10, 60] },
  'se:district': { position: [27, 150, -188], target: [182, 40, -38] },
  // District stages (2026-11-11): one wide authored view per cluster of slots, so a ±2/±3 change shows several slots changing together.
  'nw:stage-west': { position: [-382, 115, 150], target: [-382, 25, 0] },
  // Bay 3 stands against a megastructure with no clear sightline; this stage frames bay 4 only.
  'nw:stage-mid': { position: [-124, 120, 306], target: [-124, 30, 156] },
  'sw:stage-rooms-east': { position: [79, 185, -710], target: [79, 5, -410] },
  'sw:stage-rooms-west': { position: [-70, 172, 7], target: [-267, 5, -190] },
  'sw:stage-courts-south': { position: [-247, 98, 249], target: [-89, 3, 249] },
  'sw:stage-courts-west': { position: [-578, 139, 393], target: [-418, 3, 233] },
  // Low and close from the east so the pods read at size, with the SE focal lot behind them as the anchor.
  'se:stage-east': { position: [400, 90, 20], target: [225, 5, 20] },
  'se:stage-south': { position: [-161, 201, 372], target: [83, 45, 283] },
  'energy:garden': { position: [-375, 45, -215], target: [-322, 5, -161] },
  'energy:garden2': { position: [-16, 48, -452], target: [32, 8, -392] },
  'energy:ring': { position: [-70, 135, -170], target: [-18, 99, -24] },
  'energy:wing': { position: [56, 64, -496], target: [125, 22, -424] },
  'energy:island': { position: [-142, 66, -556], target: [-60, 4, -470] },
};
/** Each stage's slots; the picker flies to the stage covering most changed slots. */
export const VIEWPOINT_COVERAGE = STAGE_SLOTS;
export function headlineShot(change: CarrierChange | undefined): ShotId | null {
  if (!change) return null;
  if (!change.energy) {
    const focal = change.focalOnly || (change.focal && !change.district);
    return `${change.socketId}:${focal ? (change.low && Object.hasOwn(SHOTS, `${change.socketId}:focal-low`) ? 'focal-low' : 'focal') : 'district'}` as ShotId;
  }
  const { before, after } = change.energy;
  switch (change.energy.part ?? energyChangedPart(before, after)) {
    case 'waterGardens': return before.waterGardens === 1 && after.waterGardens === 2 ? 'energy:garden2' : 'energy:garden';
    case 'receiver': return 'energy:wing';
    case 'flywheel': return 'energy:ring';
    case 'island': return 'energy:island';
    default: return null;
  }
}
export function shotStage(elapsed: number, displayMs = DISPLAY_MS) {
  const t = shotTimeline(displayMs);
  return elapsed < t.flyIn ? 'journey' : elapsed < t.hold ? 'fly-in' : elapsed < t.flyOut ? 'hold' : elapsed < t.done ? 'fly-out' : 'done';
}
type Controls = { target: Vector3; enabled: boolean; update(): unknown };
const heroPosition = new Vector3(...HERO_POSITION), heroTarget = new Vector3(...HERO_TARGET);

export class HeadlineCamera {
  private shot: ShotId | null = null;
  private readonly lastUsed = new Map<ShotId, number>();
  private sequence = 0;
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
  /** Returns the shot it flies to (null when it stays at, or returns to, the hero pose). */
  play(changes: readonly CarrierChange[], now: number, displayMs = DISPLAY_MS): ShotId | null {
    let shot = headlineShot(changes[0]);
    const change = changes[0];
    if (change?.district && !change.focalOnly && !change.energy && change.points?.length) {
      const slots = new Set(change.points.map(point => point.slot));
      const choices = Object.entries(VIEWPOINT_COVERAGE)
        .filter(([id]) => id.startsWith(`${change.socketId}:`))
        .map(([id, covers]) => ({ id: id as ShotId, count: covers.filter(slot => slots.has(slot)).length }))
        .filter(choice => choice.count > 0)
        .sort((a, b) => b.count - a.count || (this.lastUsed.get(a.id) ?? -1) - (this.lastUsed.get(b.id) ?? -1));
      shot = choices[0]?.id ?? shot;
    }
    if (displayMs < DISPLAY_MS - 100 || (!shot && !this.active)) { this.cancel(); return null; }
    if (shot && Object.hasOwn(VIEWPOINT_COVERAGE, shot)) this.lastUsed.set(shot, this.sequence++);
    this.fromPosition.copy(this.camera.position); this.fromTarget.copy(this.controls.target);
    if (shot) { this.position.set(...SHOTS[shot].position); this.target.set(...SHOTS[shot].target); }
    this.returning = shot === null;
    this.shot = shot; this.started = now; this.displayMs = displayMs; this.controls.enabled = false;
    return shot;
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
      const push = .07 * MathUtils.smoothstep(elapsed, t.hold, t.flyOut);
      this.camera.position.copy(this.position).lerp(this.target, push);
      this.camera.position.lerpVectors(heroPosition, this.camera.position, blend);
      this.controls.target.copy(heroTarget).lerp(this.target, blend);
    }
    this.camera.lookAt(this.controls.target);
  }
}
