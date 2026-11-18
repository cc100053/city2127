import { Group, Mesh, MeshStandardMaterial, type Material, type Object3D, type Scene } from 'three';
import { buildFarmGarden } from './rectennaGarden.ts';
import { addCityModel } from './modelAssets.ts';
import { energyPrototype, type EnergyClock } from './energyPrototype.ts';
import { sameEnergyConfiguration, emptyEnergyConfiguration, type EnergyConfiguration } from '../survey/src/shared/energy.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';

const FARM_URL = new URL('../asset/models/rectenna-farm-canopy/rectenna-farm-canopy.glb', import.meta.url).href;
export const FARM_CENTRE: [number, number, number] = [-152, -.15, 408];

type Finish = { source: Material; material: Material; opacity: number; transparent: boolean; depthWrite: boolean };
/** Gives every mesh under `root` its own clone of each material, so the group can fade without touching shared materials. */
export function ownFinishes(root: Object3D): Finish[] {
  const finishes = new Map<Material, Finish>();
  const finish = (source: Material) => {
    let entry = finishes.get(source);
    if (!entry) {
      entry = { source, material: source.clone(), opacity: source.opacity, transparent: source.transparent, depthWrite: source.depthWrite };
      finishes.set(source, entry);
    }
    return entry.material;
  };
  root.traverse(object => {
    if (object instanceof Mesh) object.material = Array.isArray(object.material) ? object.material.map(finish) : finish(object.material);
  });
  return [...finishes.values()];
}
/** Sets owned finishes to `amount` (0 hidden … 1 as authored), following the shared sources' emissive and env-map intensity. */
export function fadeFinishes(finishes: readonly Finish[], amount: number) {
  for (const f of finishes) {
    if (f.source instanceof MeshStandardMaterial && f.material instanceof MeshStandardMaterial) {
      f.material.emissiveIntensity = f.source.emissiveIntensity; f.material.envMapIntensity = f.source.envMapIntensity;
    }
    const transparent = f.transparent || amount < 1;
    if (f.material.transparent !== transparent) { f.material.transparent = transparent; f.material.needsUpdate = true; }
    f.material.opacity = f.opacity * amount; f.material.depthWrite = amount === 1 && f.depthWrite;
  }
}

/** Local fades keep bridges, supports and public paths at their authored clearances throughout a change. */
export class EnergyRuntime {
  readonly model = energyPrototype();
  private target = emptyEnergyConfiguration();
  private readonly motions;
  /** Question rotation Q02-C (src/lotRuntime.ts): when set, the farm follows the run's Q02 option instead of the receiver vote. */
  private farmOverride: boolean | undefined;
  readonly farm = new Group();
  readonly farmReady: Promise<void>;
  /** Per-part narrated seconds (see energyNarration); empty = every part on the shared clock. */
  clock: EnergyClock = {};
  constructor(scene: Scene) {
    this.model.root.name = 'energy-city'; scene.add(this.model.root);
    this.farm.name = 'energy-farm';
    this.farm.position.set(...FARM_CENTRE);
    this.farm.visible = false;
    this.model.root.add(this.farm);
    this.model.parts.wing.scale.setScalar(.65);
    this.model.parts.wing.visible = false;
    this.farm.add(buildFarmGarden(this.farm.position));
    this.motions = [this.model.parts.wing, ...this.model.gardens, this.model.parts.ring, this.model.parts.island, this.model.parts.distribution, this.farm, ...Object.values(this.model.activity).flat()]
      .map(group => ({ group, finishes: this.finishes(group), amount: 0, from: 0, to: 0, start: 0 }));
    this.farmReady = typeof window === 'undefined' ? Promise.resolve() :
      addCityModel(this.farm, FARM_URL, [0, 0, 0], 4.4115).then(model => {
        model.scale.setScalar(2);
        const motion = this.motions[6];
        motion.finishes.push(...this.finishes(model));
        this.fade(motion, motion.amount);
      }).catch(error => console.error('Could not load the rectenna farm', error));
  }
  // Each independently fading group owns its materials.
  private finishes(root: Group) { return ownFinishes(root); }
  getConfiguration(): EnergyConfiguration { return { ...this.target, ...(this.target.activity ? { activity: { ...this.target.activity } } : {}) }; }
  getDiagnostics() {
    return { target: this.getConfiguration(), rotorAngle: this.model.rotor.rotation.z,
      parts: this.motions.slice(0, 6).map(({ group, amount }) => ({ visible: group.visible, scaleY: group.scale.y, opacity: amount })),
      farm: { visible: this.farm.visible, opacity: this.motions[6].amount },
      activity: this.motions.slice(7).map(({ group, amount }) => ({ visible: group.visible, opacity: amount })) };
  }
  setTarget(next: EnergyConfiguration, now: number, immediate: boolean) {
    const before = this.getConfiguration(), changed = !sameEnergyConfiguration(before, next);
    if (!changed && !immediate) return undefined;
    this.model.configure(next);
    this.target = { ...next, ...(next.activity ? { activity: { ...next.activity } } : {}) };
    this.model.parts.wing.scale.setScalar(.65);
    this.model.parts.wing.visible = next.receiver === 'small';
    this.farm.visible = this.farmOverride ?? next.receiver === 'large';
    for (const m of this.motions) {
      const to = m.group.visible ? 1 : 0;
      m.from = immediate ? to : m.amount; m.to = to; m.start = now;
      this.fade(m, m.from);
    }
    return changed ? { before, after: this.getConfiguration() } : undefined;
  }
  /** Shows (true) or vacates (false) the farm lot regardless of the energy vote; undefined hands it back to the receiver vote. The fade
   *  starts at `now` (held until then when `now` is ahead) unless `immediate`. */
  setFarmOverride(shown: boolean | undefined, now: number, immediate: boolean) {
    this.farmOverride = shown;
    const m = this.motions[6], to = (shown ?? this.target.receiver === 'large') ? 1 : 0;
    if (!immediate && m.to === to) return;
    m.from = immediate ? to : m.amount; m.to = to; m.start = now;
    this.fade(m, m.from);
  }
  private fade(m: typeof this.motions[number], amount: number) {
    m.amount = amount; m.group.visible = amount > .001;
    fadeFinishes(m.finishes, amount);
  }
  update(now: number, reducedMotion: boolean) {
    this.model.update(now, reducedMotion, this.clock);
    for (const m of this.motions) {
      const t = reducedMotion ? 1 : Math.min(1, Math.max(0, (now - m.start) / SITE_TRANSITION_SECONDS));
      const eased = t * t * (3 - 2 * t);
      this.fade(m, m.from + (m.to - m.from) * eased);
    }
  }
}
