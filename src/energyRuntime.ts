import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Material, type Scene } from 'three';
import { addCityModel } from './modelAssets.ts';
import { energyPrototype, type EnergyClock } from './energyPrototype.ts';
import { sameEnergyConfiguration, emptyEnergyConfiguration, type EnergyConfiguration } from '../survey/src/shared/energy.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';

const FARM_URL = new URL('../asset/models/rectenna-farm-canopy/rectenna-farm-canopy.glb', import.meta.url).href;
export const FARM_CENTRE: [number, number, number] = [-152, -.15, 408];

/** Local fades keep bridges, supports and public paths at their authored clearances throughout a change. */
export class EnergyRuntime {
  readonly model = energyPrototype();
  private target = emptyEnergyConfiguration();
  private readonly motions;
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
    // The 2× ramp faces the existing footway west of the farm.
    const approach = new Mesh(new BoxGeometry(14.5, .28, 4.8), new MeshStandardMaterial({ color: '#ddd8cc', roughness: .78 }));
    approach.name = 'rectenna-walking-approach';
    approach.position.set(-53.25, -.0725, 0);
    approach.rotation.z = -.055 / 14.5;
    approach.receiveShadow = true;
    this.farm.add(approach);
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
  private finishes(root: Group) {
    // Each independently fading group owns its materials.
    const finishes = new Map<Material, { source: Material; material: Material; opacity: number; transparent: boolean; depthWrite: boolean }>();
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
    this.farm.visible = next.receiver === 'large';
    for (const m of this.motions) {
      const to = m.group.visible ? 1 : 0;
      m.from = immediate ? to : m.amount; m.to = to; m.start = now;
      this.fade(m, m.from);
    }
    return changed ? { before, after: this.getConfiguration() } : undefined;
  }
  private fade(m: typeof this.motions[number], amount: number) {
    m.amount = amount; m.group.visible = amount > .001;
    for (const f of m.finishes) {
      if (f.source instanceof MeshStandardMaterial && f.material instanceof MeshStandardMaterial) {
        f.material.emissiveIntensity = f.source.emissiveIntensity; f.material.envMapIntensity = f.source.envMapIntensity;
      }
      const transparent = f.transparent || amount < 1;
      if (f.material.transparent !== transparent) { f.material.transparent = transparent; f.material.needsUpdate = true; }
      f.material.opacity = f.opacity * amount; f.material.depthWrite = amount === 1 && f.depthWrite;
    }
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
