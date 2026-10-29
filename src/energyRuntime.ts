import { Mesh, MeshStandardMaterial, type Material, type Scene } from 'three';
import { energyPrototype, type EnergyClock } from './energyPrototype.ts';
import { sameEnergyConfiguration, emptyEnergyConfiguration, type EnergyConfiguration } from '../survey/src/shared/energy.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';

/** Local fades keep bridges, supports and public paths at their authored clearances throughout a change. */
export class EnergyRuntime {
  readonly model = energyPrototype();
  private target = emptyEnergyConfiguration();
  private readonly motions;
  private wingFrom = 1;
  private wingTo = 1;
  /** Per-part narrated seconds (see energyNarration); empty = every part on the shared clock. */
  clock: EnergyClock = {};
  constructor(scene: Scene) {
    this.model.root.name = 'energy-city'; scene.add(this.model.root);
    this.motions = [this.model.parts.wing, ...this.model.gardens, this.model.parts.ring, this.model.parts.island, this.model.parts.distribution]
      .map(group => {
        // Clone shared finishes once per independently fading group; never fade the city's shared materials.
        const finishes = new Map<Material, { source: Material; material: Material; opacity: number; transparent: boolean; depthWrite: boolean }>();
        const finish = (source: Material) => {
          if (!finishes.has(source)) finishes.set(source, { source, material: source.clone(), opacity: source.opacity, transparent: source.transparent, depthWrite: source.depthWrite });
          return finishes.get(source)!.material;
        };
        group.traverse(object => { if (object instanceof Mesh) object.material = Array.isArray(object.material) ? object.material.map(finish) : finish(object.material); });
        return { group, finishes: [...finishes.values()], amount: 0, from: 0, to: 0, start: 0 };
      });
  }
  getConfiguration(): EnergyConfiguration { return { ...this.target }; }
  getDiagnostics() {
    return { target: this.getConfiguration(), rotorAngle: this.model.rotor.rotation.z,
      parts: this.motions.map(({ group, amount }) => ({ visible: group.visible, scaleY: group.scale.y, opacity: amount })) };
  }
  setTarget(next: EnergyConfiguration, now: number, immediate: boolean) {
    const before = this.getConfiguration(), changed = !sameEnergyConfiguration(before, next);
    if (!changed && !immediate) return undefined;
    this.wingFrom = this.model.parts.wing.scale.x;
    this.wingTo = next.receiver === 'small' ? .65 : next.receiver === 'none' ? this.wingFrom : 1;
    if (immediate) this.wingFrom = this.wingTo;
    this.model.configure(next); this.target = { ...next };
    this.model.parts.wing.scale.setScalar(this.wingFrom);
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
      if (m.group === this.model.parts.wing) m.group.scale.setScalar(this.wingFrom + (this.wingTo - this.wingFrom) * eased);
    }
  }
}
