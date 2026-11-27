// Question rotation lot runtime (QUESTION_ROTATION_PLAN 2.2), Q02, Q03 and Q08 so far: each of Q02's three models owns its own lot (LOTS
// in layout.ts) and a rotation run shows exactly the one its Q02 option names, the other two lots standing vacant. Q08's three options
// share the SW lot: C is the event module shelf, A and B have no model yet (owner 2026-11-19), so the lot stands vacant for them. Q03's
// share the drawer housing lot: A is the drawer housing, B and C have no model yet (owner 2026-11-19), so the housing fades and its
// loop road stays. Q06's share the pod-frame tower lot (the retired housing U site): B is the tower, A and C have no model yet (owner
// 2026-11-19), so the tower fades to lawn. Q05's share the NE PARK lot: A is the reverse air conditioner on its own cooled lawn and B
// the breathing giant leaf on its own shaded lawn and C the snow-cloud fountain over its own snowfield, each standing in place of
// the NE park. Version4 runs never engage it, so
// their city stays as built: the hydro terrace, drawer housing and pod tower as fixed background, the bay flower vacant, the farm on
// the energy vote, SW on its Meter band, the NE park.
import type { Object3D, Scene } from 'three';
import { fadeFinishes, ownFinishes, type EnergyRuntime } from './energyRuntime.ts';
import type { CommonsPlazaRuntime } from './siteBuilders/commonsPlaza.ts';
import type { SharingDistrict } from './districtMeters.ts';
import { LOTS } from './layout.ts';
import { q05Model } from './rotationLayout.ts';
import { BAY_FLOWER_SHOWN } from './bayFlower.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';

/** What each Q02 lot shows; `farm` undefined hands the farm back to the energy vote. */
export type Q02Models = { hydro: boolean; flower: boolean; farm: boolean | undefined };

/** Q02 option → its one shown model (A hydro terrace, B bay flower, C rectenna farm); no or an unknown option → the version4 city. */
export function q02Models(option: string | undefined, flowerDefault = false): Q02Models {
  if (option === 'A' || option === 'B' || option === 'C') return { hydro: option === 'A', flower: option === 'B', farm: option === 'C' };
  return { hydro: true, flower: flowerDefault, farm: undefined };
}

/** Q08 option → whether the SW lot stands vacant: A (fixed-use hall) and B (reconfigurable hall) are not built yet, C shows the
 *  event shelf; no or an unknown option hands the lot back to the SW Meter band (false). */
export const q08Vacant = (option: string | undefined) => option === 'A' || option === 'B';

/** Q03 option → whether the drawer housing stands: B (shared car shelter) and C (mobility hub and park) are not built yet, so their
 *  lot stands vacant around the kept loop road; A and no or an unknown option show it (the version4 city). */
export const q03Housing = (option: string | undefined) => option !== 'B' && option !== 'C';

/** Q06 option → whether the pod-frame tower stands: A (new-material building) and C (module recycling hub) are not built yet, so
 *  their lot stands vacant lawn; B and no or an unknown option show it (the version4 city). */
export const q06Tower = (option: string | undefined) => option !== 'A' && option !== 'C';

export { q05Model };

/** One lot's model fading over the shared 3-second site transition. It touches the scene only once set, and gives its meshes their
 *  own materials (ownFinishes) only once the model has loaded, so a version4 run keeps the shared materials. */
class LotFade {
  private amount: number; private from: number; private to: number; private start = 0; private engaged = false;
  private targets?: Object3D[]; private finishes?: ReturnType<typeof ownFinishes>; private applied = -1;
  private readonly find: () => { targets: Object3D[]; loaded: boolean } | undefined;
  constructor(find: () => { targets: Object3D[]; loaded: boolean } | undefined, initial: number) {
    this.find = find; this.amount = this.from = this.to = initial;
  }
  set(to: number, now: number, immediate: boolean) {
    if (!immediate && this.engaged && to === this.to) return;
    this.engaged = true; this.from = immediate ? to : this.amount; this.to = to; this.start = now; this.applied = -1;
  }
  get shown() { return this.to; }
  /** The drawn amount (0 … 1) at the last update. */
  get level() { return this.amount; }
  update(now: number, reducedMotion: boolean) {
    if (!this.engaged) return;
    const t = reducedMotion ? 1 : Math.min(1, Math.max(0, (now - this.start) / SITE_TRANSITION_SECONDS)), eased = t * t * (3 - 2 * t);
    this.amount = this.from + (this.to - this.from) * eased;
    if (!this.finishes) {
      const found = this.find();
      if (!found) return;
      this.targets = found.targets;
      if (found.loaded) { this.finishes = found.targets.flatMap(ownFinishes); this.applied = -1; }
    }
    if (this.amount === this.applied) return;
    this.applied = this.amount;
    for (const target of this.targets!) target.visible = this.amount > .001;
    if (this.finishes) fadeFinishes(this.finishes, this.amount);
  }
}

export class LotRuntime {
  private readonly hydro: LotFade;
  private readonly flower: LotFade;
  private readonly housing: LotFade;
  private readonly tower: LotFade;
  private readonly reverseAc: LotFade;
  private readonly breathingLeaf: LotFade;
  private readonly snowCloud: LotFade;
  private readonly nePark: LotFade;
  private engaged = false;
  private q03Engaged = false;
  private q06Engaged = false;
  private q05Engaged = false;
  private q08Engaged = false;
  private readonly energy?: Pick<EnergyRuntime, 'setFarmOverride'>;
  private readonly commons?: Pick<CommonsPlazaRuntime, 'setVacant'>;
  private readonly flowerDefault: boolean;
  private readonly sharing?: Pick<SharingDistrict, 'courtAt' | 'setCourtKeep'>;
  /** `flowerDefault`: the version4 bay flower state (DEV `?bayFlower=1` shows it, see bayFlowerShown); `commons` the SW focal runtime;
   *  `sharing` the frozen sharing district, whose court on the NE PARK lot follows the NE park (it stands under the Q05 tower's lawn). */
  constructor(scene: Scene, energy?: Pick<EnergyRuntime, 'setFarmOverride'>, flowerDefault = false, commons?: Pick<CommonsPlazaRuntime, 'setVacant'>,
    sharing?: Pick<SharingDistrict, 'courtAt' | 'setCourtKeep'>) {
    this.energy = energy; this.flowerDefault = flowerDefault; this.commons = commons; this.sharing = sharing;
    // Looked up until each GLB has loaded (the roots once, then only their own subtrees).
    let hydro: Object3D | undefined, flower: Object3D | undefined, housing: Object3D | undefined, tower: Object3D | undefined;
    let reverseAc: Object3D | undefined, breathingLeaf: Object3D | undefined, snowCloud: Object3D | undefined, nePark: Object3D | undefined;
    this.hydro = new LotFade(() => {
      hydro ??= scene.getObjectByName('q02a-hydro-terrace');
      return hydro && { targets: [hydro], loaded: !!hydro.getObjectByName('q02a-hydro-terrace-glb') };
    }, 1);
    this.flower = new LotFade(() => {
      flower ??= scene.getObjectByName('q02b-bay-flower');
      const nodes = BAY_FLOWER_SHOWN.map(name => flower?.getObjectByName(name));
      return nodes.every(Boolean) ? { targets: nodes as Object3D[], loaded: true } : undefined;
    }, flowerDefault ? 1 : 0);
    // main.ts names the drawer housing (with its foundation pad) only once its GLB has loaded and baked, so a found root is complete.
    this.housing = new LotFade(() => {
      housing ??= scene.getObjectByName('drawer-housing-2127');
      return housing && { targets: [housing], loaded: true };
    }, 1);
    // Likewise the pod-frame tower: main.ts names it once its GLB has loaded and baked.
    this.tower = new LotFade(() => {
      tower ??= scene.getObjectByName('pod-frame-tower-2127');
      return tower && { targets: [tower], loaded: true };
    }, 1);
    // The reverse air conditioner: main.ts names it once its GLB has loaded and baked; it stands hidden until a rotation run shows Q05-A.
    this.reverseAc = new LotFade(() => {
      reverseAc ??= scene.getObjectByName('q05a-reverse-ac-2127');
      return reverseAc && { targets: [reverseAc], loaded: true };
    }, 0);
    // Likewise the breathing giant leaf, hidden until a rotation run shows Q05-B.
    this.breathingLeaf = new LotFade(() => {
      breathingLeaf ??= scene.getObjectByName('q05b-breathing-leaf-2127');
      return breathingLeaf && { targets: [breathingLeaf], loaded: true };
    }, 0);
    // And the snow-cloud fountain, hidden until a rotation run shows Q05-C.
    this.snowCloud = new LotFade(() => {
      snowCloud ??= scene.getObjectByName('q05c-snow-cloud-2127');
      return snowCloud && { targets: [snowCloud], loaded: true };
    }, 0);
    // The NE park they replace (the frozen tier-0 Meter site); its own finishes once the park's tree GLB is in, so the trees fade too.
    this.nePark = new LotFade(() => {
      nePark ??= scene.getObjectByName('survey-site-ne');
      return nePark && { targets: [nePark], loaded: !!nePark.getObjectByName('park-tree-glb-instances') };
    }, 1);
  }
  /** Shows the Q02 lots for `option` (a rotation run's shown option), fading from `now` (held until then when ahead) unless `immediate`;
   *  undefined after a rotation run restores the version4 city, and before one leaves the scene untouched. */
  setQ02(option: string | undefined, now: number, immediate: boolean) {
    if (option === undefined && !this.engaged) return;
    this.engaged = option !== undefined || this.engaged;
    const models = q02Models(option, this.flowerDefault);
    this.hydro.set(models.hydro ? 1 : 0, now, immediate);
    this.flower.set(models.flower ? 1 : 0, now, immediate);
    this.energy?.setFarmOverride(models.farm, now, immediate);
  }
  /** Shows the SW lot for Q08 `option` (vacant for A/B, the shelf for C) from `now` unless `immediate`; the shelf's own 5 s
   *  sequence runs the change. Undefined after a rotation run hands SW back to its Meter band, and before one leaves it untouched. */
  setQ08(option: string | undefined, now: number, immediate: boolean) {
    if (option === undefined && !this.q08Engaged) return;
    this.q08Engaged = option !== undefined || this.q08Engaged;
    this.commons?.setVacant(q08Vacant(option), now, immediate);
  }
  /** Shows the drawer housing for Q03 `option` (A) or fades it, leaving its loop road (B/C), over the shared transition from `now`
   *  unless `immediate`. Undefined after a rotation run restores the housing, and before one leaves it untouched. */
  setQ03(option: string | undefined, now: number, immediate: boolean) {
    if (option === undefined && !this.q03Engaged) return;
    this.q03Engaged = true;
    this.housing.set(q03Housing(option) ? 1 : 0, now, immediate);
  }
  /** Shows the pod-frame tower for Q06 `option` (B) or fades it to lawn (A/C) over the shared transition from `now` unless
   *  `immediate`. Undefined after a rotation run restores the tower, and before one leaves it untouched. */
  setQ06(option: string | undefined, now: number, immediate: boolean) {
    if (option === undefined && !this.q06Engaged) return;
    this.q06Engaged = true;
    this.tower.set(q06Tower(option) ? 1 : 0, now, immediate);
  }
  /** Shows Q05 `option`'s model in place of the NE park (A the reverse air conditioner, B the breathing giant leaf, C the snow-cloud
   *  fountain) over the shared transition from `now` unless `immediate`. Undefined after a rotation run restores the park, and
   *  before one leaves it untouched. */
  setQ05(option: string | undefined, now: number, immediate: boolean) {
    if (option === undefined && !this.q05Engaged) return;
    this.q05Engaged = true;
    const shown = q05Model(option);
    this.reverseAc.set(shown === 'tower' ? 1 : 0, now, immediate);
    this.breathingLeaf.set(shown === 'leaf' ? 1 : 0, now, immediate);
    this.snowCloud.set(shown === 'cloud' ? 1 : 0, now, immediate);
    this.nePark.set(shown ? 0 : 1, now, immediate);
  }
  getDiagnostics() {
    return { hydro: this.hydro.shown, flower: this.flower.shown, housing: this.housing.shown, tower: this.tower.shown, reverseAc: this.reverseAc.shown,
      breathingLeaf: this.breathingLeaf.shown, snowCloud: this.snowCloud.shown };
  }
  update(now: number, reducedMotion: boolean) {
    this.hydro.update(now, reducedMotion);
    this.flower.update(now, reducedMotion);
    this.housing.update(now, reducedMotion);
    this.tower.update(now, reducedMotion);
    this.reverseAc.update(now, reducedMotion);
    this.breathingLeaf.update(now, reducedMotion);
    this.snowCloud.update(now, reducedMotion);
    this.nePark.update(now, reducedMotion);
    if (this.q05Engaged) this.sharing?.setCourtKeep(this.sharing.courtAt(LOTS['ne-park'].x, LOTS['ne-park'].z), this.nePark.level);
  }
}
