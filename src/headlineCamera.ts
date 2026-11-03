import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import type { CarrierChange } from './cityChangeManager.ts';
import { HERO_POSITION, HERO_TARGET } from './heroCamera.ts';
import { energyChangedPart } from './surveyAtmosphere.ts';
import { FLY_OUT, shotTimeline } from './resultTimeline.ts';
export { FLY_IN, FLY_OUT, shotTimeline } from './resultTimeline.ts';

type Site = CarrierChange['socketId'];
export type ShotId = `${Site}:${'focal' | 'district'}` | `${'nw' | 'sw' | 'se'}:${string}` | `energy:${'garden' | 'garden2' | 'ring' | 'wing' | 'island'}`;
type Pose = { position: [number, number, number]; target: [number, number, number] };
export const SHOTS: Record<ShotId, Pose> = {
  'nw:focal': { position: [212, 64, -342], target: [40, 62, -300] },
  'ne:focal': { position: [-280, 85, -245], target: [-210, 14, -135] },
  'sw:focal': { position: [-120, 64, 152], target: [-105, 10, 60] },
  'se:focal': { position: [12, 115, -208], target: [182, 72, -38] },
  // The -1 pavilions are ~5% of a lot-wide frame at se:focal; this pushed-in pose is used when a focal change starts or ends at the low band.
  'se:focal-low': { position: [100, 34, -120], target: [182, 26, -38] },
  'nw:district': { position: [-30, 115, -455], target: [40, 43, -300] },
  'ne:district': { position: [-320, 110, -300], target: [-210, 14, -135] },
  'sw:district': { position: [-108, 80, 180], target: [-105, 10, 60] },
  'se:district': { position: [27, 150, -188], target: [182, 40, -38] },
  'sw:room1': { position: [145, 72, -555], target: [214, 5, -475] },
  'sw:room2': { position: [8, 72, -503], target: [77, 5, -423] },
  'sw:room3': { position: [-123, 72, -413], target: [-54, 5, -333] },
  'sw:room4': { position: [-242, 72, -325], target: [-173, 5, -245] },
  'sw:room5': { position: [-318, 72, -298], target: [-249, 5, -218] },
  'sw:room6': { position: [-449, 72, -188], target: [-380, 5, -108] },
  'nw:bay1': { position: [-115, 150, -55], target: [-95, 20, -195] },
  'nw:bay2': { position: [-152, 150, -34], target: [-132, 20, -174] },
  'nw:bay3': { position: [-281, 150, 44], target: [-261, 20, -96] },
  'nw:bay4': { position: [-208, 65, -145], target: [-303, 20, -55] },
  'nw:bay5': { position: [-245, 65, -122], target: [-340, 20, -32] },
  'nw:bay6': { position: [-404, 150, 136], target: [-384, 20, -4] },
  'nw:bay7': { position: [-100, 130, 125], target: [20, 20, 145] },
  'nw:bay8': { position: [-270, 55, 70], target: [-200, 20, 80] },
  'nw:bay9': { position: [-140, 55, 100], target: [-130, 20, 170] },
  'nw:bay10': { position: [5, 110, -250], target: [75, 20, -160] },
  'nw:bay11': { position: [-508, 110, -45], target: [-438, 20, 45] },
  'sw:court1': { position: [-290, 93, -230], target: [-220, 3, -140] },
  'sw:court2': { position: [-480, 160, 30], target: [-410, 3, 120] },
  'sw:court3': { position: [-122, 60, 360], target: [-110, 3, 230] },
  'sw:court4': { position: [-20, 93, -430], target: [50, 3, -340] },
  'sw:court5': { position: [100, 93, -450], target: [170, 3, -360] },
  'sw:court6': { position: [-5, 203, 95], target: [-70, 3, 180] },
  'sw:court7': { position: [-325, 113, 390], target: [-290, 3, 290] },
  'sw:court8': { position: [-530, 93, 200], target: [-460, 3, 290] },
  'sw:court9': { position: [320, 113, -35], target: [220, 3, 0] },
  'sw:court10': { position: [45, 203, 125], target: [-20, 3, 210] },
  'se:tower1': { position: [-53, 351, -177], target: [115, 55, -25] },
  'se:tower2': { position: [-28, 265, -304], target: [67, 75, -89] },
  'se:tower3': { position: [187, 255, -459], target: [27, 75, -249] },
  'se:tower4': { position: [-12, 265, -520], target: [83, 75, -305] },
  'se:tower5': { position: [-319, 290, -281], target: [-189, 85, -1] },
  'se:tower6': { position: [-316, 265, -288], target: [-221, 75, -73] },
  'se:tower7': { position: [3, 255, -147], target: [-157, 75, 63] },
  'se:tower8': { position: [-291, 260, 171], target: [-61, 75, 111] },
  'se:tower9': { position: [84, 265, 72], target: [179, 75, 287] },
  'se:tower10': { position: [-108, 265, 64], target: [-13, 75, 279] },
  'se:pod1': { position: [-318, 78, 227], target: [-293, 3, 147] },
  'se:pod2': { position: [-343, 43, -43], target: [-253, 3, -33] },
  'se:pod3': { position: [-173, 38, 22], target: [-233, 3, 47] },
  'se:pod4': { position: [-308, 43, -33], target: [-218, 3, -23] },
  'se:pod5': { position: [-273, 43, -53], target: [-183, 3, -43] },
  'se:pod6': { position: [-108, 38, -153], target: [-168, 3, -128] },
  'se:pod7': { position: [-173, 38, 7], target: [-103, 3, 17] },
  'se:pod8': { position: [42, 153, 107], target: [-53, 3, 147] },
  'se:pod9': { position: [62, 153, 127], target: [-33, 3, 167] },
  'se:pod10': { position: [-43, 203, 87], target: [-23, 3, 107] },
  'se:pod11': { position: [97, 43, -68], target: [7, 3, -58] },
  'se:pod12': { position: [-43, 38, 77], target: [27, 3, 87] },
  'se:pod13': { position: [-3, 78, 82], target: [77, 3, 107] },
  'se:pod14': { position: [62, 78, 137], target: [87, 3, 57] },
  'se:pod15': { position: [77, 203, -93], target: [97, 3, -73] },
  'se:pod16': { position: [87, 203, -143], target: [107, 3, -123] },
  'se:pod17': { position: [82, 78, 157], target: [107, 3, 77] },
  'se:pod18': { position: [87, 153, 107], target: [117, 3, 7] },
  'se:pod19': { position: [57, 78, -128], target: [137, 3, -103] },
  'se:pod20': { position: [267, 38, 12], target: [207, 3, 37] },
  'se:pod21': { position: [277, 38, -68], target: [217, 3, -43] },
  'se:pod22': { position: [282, 108, 2], target: [217, 3, 87] },
  'se:pod23': { position: [212, 38, -13], target: [237, 3, -73] },
  'se:pod24': { position: [297, 38, 32], target: [237, 3, 57] },
  'se:pod25': { position: [222, 78, -23], target: [247, 3, -103] },
  'se:pod26': { position: [312, 38, 122], target: [252, 3, 147] },
  'nw:street': { position: [213, 75, -345], target: [113, 4, -333] },
  'energy:garden': { position: [-375, 45, -215], target: [-322, 5, -161] },
  'energy:garden2': { position: [-16, 48, -452], target: [32, 8, -392] },
  'energy:ring': { position: [-70, 135, -170], target: [-18, 99, -24] },
  'energy:wing': { position: [56, 64, -496], target: [125, 22, -424] },
  'energy:island': { position: [-142, 66, -556], target: [-60, 4, -470] },
};
// Each authored view identifies the slots it can show; the paired north-shore bays fit together.
export const VIEWPOINT_COVERAGE: Readonly<Record<string, readonly string[]>> = {
  'nw:street': ['nw:street'],
  'nw:bay1': ['nw:bay1', 'nw:bay2'],
  'nw:bay2': ['nw:bay1', 'nw:bay2'],
  'nw:bay3': ['nw:bay3'],
  'nw:bay4': ['nw:bay4'],
  'nw:bay5': ['nw:bay5'],
  'nw:bay6': ['nw:bay6'],
  'nw:bay7': ['nw:bay7'],
  'nw:bay8': ['nw:bay8'],
  'nw:bay9': ['nw:bay9'],
  'nw:bay10': ['nw:bay10'],
  'nw:bay11': ['nw:bay11'],
  'sw:room1': ['sw:room1'],
  'sw:room2': ['sw:room2'],
  'sw:room3': ['sw:room3'],
  'sw:room4': ['sw:room4'],
  'sw:room5': ['sw:room5'],
  'sw:room6': ['sw:room6'],
  'sw:court1': ['sw:court1'],
  'sw:court2': ['sw:court2'],
  'sw:court3': ['sw:court3'],
  'sw:court4': ['sw:court4'],
  'sw:court5': ['sw:court5'],
  'sw:court6': ['sw:court6'],
  'sw:court7': ['sw:court7'],
  'sw:court8': ['sw:court8'],
  'sw:court9': ['sw:court9'],
  'sw:court10': ['sw:court10'],
  'se:tower1': ['se:tower1'],
  'se:tower2': ['se:tower2'],
  'se:tower3': ['se:tower3'],
  'se:tower4': ['se:tower4'],
  'se:tower5': ['se:tower5'],
  'se:tower6': ['se:tower6'],
  'se:tower7': ['se:tower7'],
  'se:tower8': ['se:tower8'],
  'se:tower9': ['se:tower9'],
  'se:tower10': ['se:tower10'],
  'se:pod1': ['se:pod1'],
  'se:pod2': ['se:pod2'],
  'se:pod3': ['se:pod3'],
  'se:pod4': ['se:pod4'],
  'se:pod5': ['se:pod5'],
  'se:pod6': ['se:pod6'],
  'se:pod7': ['se:pod7'],
  'se:pod8': ['se:pod8'],
  'se:pod9': ['se:pod9'],
  'se:pod10': ['se:pod10'],
  'se:pod11': ['se:pod11'],
  'se:pod12': ['se:pod12'],
  'se:pod13': ['se:pod13'],
  'se:pod14': ['se:pod14'],
  'se:pod15': ['se:pod15'],
  'se:pod16': ['se:pod16'],
  'se:pod17': ['se:pod17'],
  'se:pod18': ['se:pod18'],
  'se:pod19': ['se:pod19'],
  'se:pod20': ['se:pod20'],
  'se:pod21': ['se:pod21'],
  'se:pod22': ['se:pod22'],
  'se:pod23': ['se:pod23'],
  'se:pod24': ['se:pod24'],
  'se:pod25': ['se:pod25'],
  'se:pod26': ['se:pod26'],
};
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
