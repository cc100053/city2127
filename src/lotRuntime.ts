// Question rotation lot runtime (QUESTION_ROTATION_PLAN 2.2), Q02 only so far: each of Q02's three models owns its own lot (LOTS in
// layout.ts) and a rotation run shows exactly the one its Q02 option names, the other two lots standing vacant. Version4 runs never
// engage it, so their city stays as built: the hydro terrace as fixed background, the bay flower vacant, the farm on the energy vote.
import type { Object3D, Scene } from 'three';
import { fadeFinishes, ownFinishes, type EnergyRuntime } from './energyRuntime.ts';
import { BAY_FLOWER_SHOWN } from './bayFlower.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';

/** What each Q02 lot shows; `farm` undefined hands the farm back to the energy vote. */
export type Q02Models = { hydro: boolean; flower: boolean; farm: boolean | undefined };

/** Q02 option → its one shown model (A hydro terrace, B bay flower, C rectenna farm); no or an unknown option → the version4 city. */
export function q02Models(option: string | undefined, flowerDefault = false): Q02Models {
  if (option === 'A' || option === 'B' || option === 'C') return { hydro: option === 'A', flower: option === 'B', farm: option === 'C' };
  return { hydro: true, flower: flowerDefault, farm: undefined };
}

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
  private engaged = false;
  private readonly energy?: Pick<EnergyRuntime, 'setFarmOverride'>;
  private readonly flowerDefault: boolean;
  /** `flowerDefault`: the version4 bay flower state (DEV `?bayFlower=1` shows it, see bayFlowerShown). */
  constructor(scene: Scene, energy?: Pick<EnergyRuntime, 'setFarmOverride'>, flowerDefault = false) {
    this.energy = energy; this.flowerDefault = flowerDefault;
    // Looked up until each GLB has loaded (the roots once, then only their own subtrees).
    let hydro: Object3D | undefined, flower: Object3D | undefined;
    this.hydro = new LotFade(() => {
      hydro ??= scene.getObjectByName('q02a-hydro-terrace');
      return hydro && { targets: [hydro], loaded: !!hydro.getObjectByName('q02a-hydro-terrace-glb') };
    }, 1);
    this.flower = new LotFade(() => {
      flower ??= scene.getObjectByName('q02b-bay-flower');
      const nodes = BAY_FLOWER_SHOWN.map(name => flower?.getObjectByName(name));
      return nodes.every(Boolean) ? { targets: nodes as Object3D[], loaded: true } : undefined;
    }, flowerDefault ? 1 : 0);
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
  getDiagnostics() { return { hydro: this.hydro.shown, flower: this.flower.shown }; }
  update(now: number, reducedMotion: boolean) {
    this.hydro.update(now, reducedMotion);
    this.flower.update(now, reducedMotion);
  }
}
