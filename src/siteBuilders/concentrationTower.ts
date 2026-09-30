import * as T from 'three';
import { arc, bake, box, cream, faces, futureLight, glass, leaf, publicLight, sage, shrubs, sign, solar, trim, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import type { Band } from '../surveyView.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, SITE_TRANSITION_SECONDS, type BuiltSite } from './siteRuntime.ts';

const HIDDEN = 1e-3;
const DEFAULT_TARGET: ConcentrationTowerTarget = { band: 'mixed', functionModules: 4 };
const smoothstep = (t: number) => t * t * (3 - 2 * t);

export interface ConcentrationTowerTarget {
  readonly band: Band;
  readonly functionModules: number;
}

export interface ConcentrationTowerDiagnostics {
  readonly band: Band;
  readonly targetFunctionModules: number;
  readonly activeFunctionModules: number;
  readonly transitioning: boolean;
  readonly representation: 'pavilion-pair' | 'mid-rise-hall' | 'vertical-tower';
}

export interface ConcentrationTowerRuntime {
  setTarget(target: ConcentrationTowerTarget, now: number, immediate: boolean): boolean;
  update(now: number): void;
  restoreLegacy(): void;
  getDiagnostics(): ConcentrationTowerDiagnostics;
}

export type ConcentrationTowerBuiltSite = BuiltSite & { readonly concentrationTower: ConcentrationTowerRuntime };

type Part = { group: T.Group; level: number; from: number; to: number };
type TowerGroups = {
  base: T.Group;
  pavilions: T.Group;
  lowModules: T.Group[];
  mixedModules: T.Group[];
  highModules: T.Group[];
};

function addFunctionModule(parent: T.Group, name: string, x: number, y: number, z: number, angle = 0): T.Group {
  const group = new T.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.rotation.y = angle;
  parent.add(group);
  box(group, [1.05, .72, .9], [0, .36, 0], cream, .09);
  box(group, [.84, .42, .1], [0, .37, .48], glass, .04);
  box(group, [.58, .07, .07], [0, .65, .54], futureLight, .02);
  box(group, [.78, .08, .12], [0, .05, .48], trim, .025);
  group.add(...bake(group));
  group.scale.setScalar(HIDDEN);
  group.visible = false;
  return group;
}

class ConcentrationTowerController implements ConcentrationTowerRuntime {
  private readonly parts: Part[];
  private readonly lowStart: number;
  private readonly mixedStart: number;
  private readonly highStart: number;
  private target = DEFAULT_TARGET;
  private applied = false;
  private active = false;
  private start = 0;

  constructor(groups: TowerGroups) {
    this.lowStart = 2;
    this.mixedStart = this.lowStart + groups.lowModules.length;
    this.highStart = this.mixedStart + groups.mixedModules.length;
    const levels = [1, 0, ...groups.lowModules.map(() => 0), ...groups.mixedModules.map((_, i) => i < 4 ? 1 : 0), ...groups.highModules.map(() => 0)];
    this.parts = [groups.base, groups.pavilions, ...groups.lowModules, ...groups.mixedModules, ...groups.highModules]
      .map((group, i) => ({ group, level: levels[i], from: levels[i], to: levels[i] }));
    this.write();
  }

  setTarget(target: ConcentrationTowerTarget, now: number, immediate: boolean): boolean {
    this.update(now);
    const changed = !this.applied || target.band !== this.target.band || target.functionModules !== this.target.functionModules;
    this.target = target;
    this.applied = true;
    const next = this.targetLevels(target);
    if (!changed) {
      if (immediate) {
        for (let i = 0; i < this.parts.length; i++) this.parts[i].level = this.parts[i].to = this.parts[i].from = next[i];
        this.active = false;
        this.write();
      }
      return false;
    }
    for (let i = 0; i < this.parts.length; i++) {
      this.parts[i].from = this.parts[i].level;
      this.parts[i].to = next[i];
    }
    this.start = now;
    this.active = !immediate;
    if (immediate) {
      for (let i = 0; i < this.parts.length; i++) this.parts[i].level = this.parts[i].from = this.parts[i].to;
    }
    this.write();
    return true;
  }

  update(now: number): void {
    if (!this.active) return;
    const raw = Math.min(1, Math.max(0, (now - this.start) / SITE_TRANSITION_SECONDS));
    const progress = smoothstep(raw);
    for (const part of this.parts) part.level = part.from + (part.to - part.from) * progress;
    this.active = raw < 1;
    this.write();
  }

  restoreLegacy(): void {
    this.target = DEFAULT_TARGET;
    this.applied = false;
    this.active = false;
    const levels = this.targetLevels(DEFAULT_TARGET);
    for (let i = 0; i < this.parts.length; i++) this.parts[i].level = this.parts[i].from = this.parts[i].to = levels[i];
    this.write();
  }

  getDiagnostics(): ConcentrationTowerDiagnostics {
    return {
      band: this.target.band,
      targetFunctionModules: this.target.functionModules,
      activeFunctionModules: this.parts.slice(this.lowStart).filter(part => part.level > HIDDEN).length,
      transitioning: this.active,
      representation: this.target.band === 'low' ? 'pavilion-pair' : this.target.band === 'mixed' ? 'mid-rise-hall' : 'vertical-tower',
    };
  }

  private targetLevels(target: ConcentrationTowerTarget): number[] {
    return [
      target.band === 'low' ? 0 : 1,
      target.band === 'low' ? 1 : 0,
      ...this.parts.slice(this.lowStart, this.mixedStart).map((_, i) => target.band === 'low' && i < target.functionModules ? 1 : 0),
      ...this.parts.slice(this.mixedStart, this.highStart).map((_, i) => target.band === 'mixed' && i < target.functionModules ? 1 : 0),
      ...this.parts.slice(this.highStart).map((_, i) => target.band === 'high' && i < target.functionModules ? 1 : 0),
    ];
  }

  private write(): void {
    for (const { group, level } of this.parts) {
      group.scale.setScalar(Math.max(HIDDEN, level));
      group.visible = level > HIDDEN;
    }
  }
}

export function buildConcentrationTower(scene: T.Scene, kit: Kit): ConcentrationTowerBuiltSite {
  const root = createSiteRoot(scene, 'se');
  const towerBaseLayer = createSiteLayer(root, siteLayerDefinition('centerGaiRear', 'towerBase'));
  const towerUpperLayer = createSiteLayer(root, siteLayerDefinition('centerGaiRear', 'towerUpper'), 18);
  const neutralPropsLayer = createSiteLayer(root, siteLayerDefinition('centerGaiRear', 'towerNeutralProps'));
  const towerBase = towerBaseLayer.group;
  const towerUpper = towerUpperLayer.group;

  const base = new T.Group();
  base.name = 'tower-mid-rise-hall';
  towerBase.add(base);
  box(base, [9, 1, 9], [0, .9, 0], cream, .25);
  box(base, [8, 16.6, 8], [0, 9.6, 0], sage, .35);
  for (let y = 4; y < 17; y += 3) {
    box(base, [8.2, .3, 8.2], [0, y, 0], trim, .05);
    faces(base, 8.2, 8.2, (face, across, out) => box(face, [across - .4, .07, .08], [0, y - .12, out + .04], publicLight, .02));
    faces(base, 8, 8, (face, across, out) => box(face, [across - 1, 1.3, .08], [0, y + 1.4, out + .03], glass, .03));
    if (y % 6 === 4) {
      box(base, [7.6, .35, .4], [0, y + .32, 4.25], leaf, .15);
      box(base, [.4, .35, 7.6], [4.25, y + .32, 0], leaf, .15);
    }
  }
  sign(base, kit, '都市集約 / 2127', 0, 2.4, 4.2, 5.5, .8, '#527789');
  base.add(...bake(base));

  const pavilions = new T.Group();
  pavilions.name = 'tower-low-pavilion-pair';
  towerBase.add(pavilions);
  for (const x of [-1.95, 1.95]) {
    const pod = new T.Group();
    pod.position.x = x;
    pavilions.add(pod);
    box(pod, [3.35, .45, 4.1], [0, .25, 0], cream, .12);
    box(pod, [3.05, 2.1, 3.75], [0, 1.55, 0], sage, .12);
    faces(pod, 3.05, 3.75, (face, across, out) => box(face, [across - .55, 1.35, .08], [0, 1.5, out + .03], glass, .04));
    box(pod, [3.55, .28, 4.35], [0, 2.75, 0], trim, .08);
    box(pod, [2.95, .12, 3.75], [0, 2.95, 0], leaf, .08);
    box(pod, [2.65, .08, .35], [0, 3.08, -1.65], solar, .02);
  }
  pavilions.add(...bake(pavilions));

  const serviceSpines = new T.Group();
  serviceSpines.name = 'tower-low-service-spines';
  pavilions.add(serviceSpines);
  // Twin glazed service heads clear the foreground roofline; the occupied pavilion bodies remain at ground height.
  for (const [i, x] of [-3.1, 3.1].entries()) {
    const spine = new T.Group();
    spine.name = `tower-low-service-spine-${i + 1}`;
    spine.position.x = x;
    serviceSpines.add(spine);
    const mast = new T.Group();
    mast.name = `tower-low-service-mast-${i + 1}`;
    spine.add(mast);
    box(mast, [.18, 32.45, .18], [0, 18.225, 0], solar, .03);
    mast.add(...bake(mast));

    const cap = new T.Group();
    cap.name = `tower-low-service-cap-${i + 1}`;
    spine.add(cap);
    box(cap, [2.5, 1.2, .08], [0, 33.84, 1.04], glass, .03);
    box(cap, [.08, 1.2, 2], [1.21, 33.84, 0], glass, .03);
    box(cap, [2.6, .18, 2.2], [0, 34.52, 0], cream, .1);
    box(cap, [1.5, .06, 1.35], [0, 34.65, 0], solar, .04);
    box(cap, [2, .06, .1], [0, 34.65, 1.02], futureLight, .02);
    box(cap, [.1, .06, 1.7], [1.17, 34.65, 0], futureLight, .02);
    cap.add(...bake(cap));
  }

  const core = new T.Mesh(new T.CylinderGeometry(3, 3, 26, 40), glass);
  core.position.y = 13;
  towerUpper.add(core);
  for (let y = 0, floor = 0; y < 25; y += 2.6, floor++) {
    arc(towerUpper, 0, 3.2, 1, [0, y, 0], cream);
    arc(towerUpper, 0, 3.45, .14, [0, y + 1, 0], trim);
    arc(towerUpper, 3.35, 3.46, .035, [0, y + .97, 0], publicLight);
    if (floor % 3 === 1) {
      arc(towerUpper, 3.05, 3.45, .3, [0, y + 1.14, 0], leaf);
      shrubs(towerUpper, 3.25, y + 1.2, 0, Math.PI * 2, 16);
    }
  }
  arc(towerUpper, 0, 3.7, .5, [0, 25.9, 0], trim);
  arc(towerUpper, 0, 3.1, .12, [0, 26.4, 0], leaf);
  arc(towerUpper, 3.1, 3.7, .45, [0, 26.4, 0], trim);
  shrubs(towerUpper, 2.8, 26.5, 0, Math.PI * 2, 18);
  for (let i = 0; i < 4; i++) box(towerUpper, [.12, 1.1, 3], [-1.2 + i * .8, 27.1, 0], solar, .02);
  towerUpper.add(...bake(towerUpper));

  // Mixed keeps the existing four-module baseline; two symmetric slots extend it to six.
  const mixedModules = [-.825, .825, -2.475, 2.475, -3.3, 3.3].map((x, i) => {
    const group = new T.Group();
    group.name = `tower-function-mixed-${i + 1}`;
    group.position.set(x, 1.02, 3.85);
    neutralPropsLayer.group.add(group);
    box(group, [1.28, .92, .88], [0, 0, 0], cream, .08);
    box(group, [1.02, .46, .12], [0, .02, .5], glass, .04);
    box(group, [.68, .08, .05], [0, .36, .57], futureLight, .02);
    box(group, [.82, .08, .12], [0, -.49, .5], trim, .02);
    group.add(...bake(group));
    group.scale.setScalar(i < 4 ? 1 : HIDDEN);
    group.visible = i < 4;
    return group;
  });

  const lowModules = Array.from({ length: 6 }, (_, i) =>
    addFunctionModule(pavilions, `tower-function-low-${i + 1}`, i % 2 ? 1.95 : -1.95, 3.12, [-.9, -.9, 0, 0, .9, .9][i]));
  const highY = [1.2, 19.2, 10.2, 14.7, 5.7, 8.0];
  const highAngles = [0, Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, Math.PI * 1.25];
  const highModules = highY.map((y, i) => {
    const angle = highAngles[i];
    return addFunctionModule(towerUpper, `tower-function-high-${i + 1}`, Math.sin(angle) * 3.05, y, Math.cos(angle) * 3.05, angle);
  });

  const concentrationTower = new ConcentrationTowerController({ base, pavilions, lowModules, mixedModules, highModules });
  return {
    id: 'centerGaiRear', root,
    layers: { towerBase: towerBaseLayer, towerUpper: towerUpperLayer, towerNeutralProps: neutralPropsLayer },
    marker: createGuestMarker(root, 'se'),
    concentrationTower,
  };
}
