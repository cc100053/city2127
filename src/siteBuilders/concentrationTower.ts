import * as T from 'three';
import { arc, bake, box, cream, dark, faces, glass, leaf, leafyCrown, paint, shrubs, sign, stone, trim, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import { ConcentrationDistrict, METER_COLORS } from '../districtMeters.ts';
import type { Band } from '../surveyView.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, SITE_TRANSITION_SECONDS, type BuiltSite } from './siteRuntime.ts';

const HIDDEN = 1e-3;
const DEFAULT_TARGET: ConcentrationTowerTarget = { band: 'mixed', functionModules: 4 };
const smoothstep = (t: number) => t * t * (3 - 2 * t);
// Emissive and instance-colour-free, so the Meter amber reads day and night (publicLight x instance colour went white after dark).
export const amber = new T.MeshStandardMaterial({ color: METER_COLORS.urbanConcentration, emissive: METER_COLORS.urbanConcentration, emissiveIntensity: .9, roughness: .5 });
const timber = paint('#c99258', .62);
// Warm interior backing: the lit-room read that glass (it mirrors the sky blue) cannot give.
const warm = new T.MeshStandardMaterial({ color: '#f3cf98', emissive: '#ffb45a', emissiveIntensity: .35, roughness: .7 });
const unitBox = new T.BoxGeometry(1, 1, 1);
const vaultGeometry = new T.CylinderGeometry(1, 1, 1, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
const crownGeometry = leafyCrown(1);
const CABIN_LOW = 1.5, CABIN_HIGH = 37, CABIN_PERIOD = 14;

/** Elevator rise 0..1: 6 s up, 1 s parked, 6 s down, 1 s parked. */
function cabinRise(now: number): number {
  const t = ((now % CABIN_PERIOD) + CABIN_PERIOD) % CABIN_PERIOD;
  return smoothstep(t < 6 ? t / 6 : t < 7 ? 1 : t < 13 ? 1 - (t - 7) / 6 : 0);
}

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
  setTarget(target: ConcentrationTowerTarget, now: number, immediate: boolean, sampleAt?: number): boolean;
  update(now: number): void;
  restoreLegacy(): void;
  getDiagnostics(): ConcentrationTowerDiagnostics;
}

export type ConcentrationTowerBuiltSite = BuiltSite & { readonly concentrationTower: ConcentrationTowerRuntime };

type Part = { group: T.Group; level: number; from: number; to: number };
type TowerGroups = {
  base: T.Group;
  pavilions: T.Group;
  elevator: T.Group;
  lowModules: T.Group[];
  mixedModules: T.Group[];
  highModules: T.Group[];
};

/** One function module: a baked group that scales in from its own origin. */
function addModule(parent: T.Group, name: string, x: number, y: number, z: number, angle: number, build: (group: T.Group) => void): T.Group {
  const group = new T.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.rotation.y = angle;
  parent.add(group);
  build(group);
  group.add(...bake(group));
  group.scale.setScalar(HIDDEN);
  group.visible = false;
  return group;
}

/** Street stall (front = local +Z): cream body, timber roof, glass counter, amber edge. */
function stall(group: T.Group) {
  box(group, [.9, .55, .7], [0, .275, 0], cream, .05);
  box(group, [1, .08, .8], [0, .6, 0], timber, .03);
  box(group, [.7, .3, .06], [0, .33, .36], glass, .02);
  box(group, [.8, .05, .06], [0, .5, .38], amber, .02);
}

/** Mullions are plain scaled unit boxes: far cheaper than rounded boxes at this count. */
function slat(parent: T.Object3D, size: [number, number, number], position: [number, number, number], material: T.Material) {
  const mesh = new T.Mesh(unitBox, material);
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
}

/** Ground-floor shopfront: warm backing with a narrower glass pane, so the interior still reads warm. */
function front(g: T.Group, across: number, out: number, y: number, h: number) {
  box(g, [across, h, .06], [0, y, out + .02], warm, .02);
  box(g, [across * .6, h * .66, .05], [0, y, out + .06], glass, .02);
  box(g, [across, .06, .07], [0, y + h / 2, out + .05], amber, .02);
}

/** Upper-floor window: warm backing, thick cream sill and trim mullions every .9; no glass, so it never mirrors the sky. */
function bay(g: T.Group, across: number, out: number, y: number, h: number, mullions = true) {
  box(g, [across, h, .05], [0, y, out + .02], warm, .01);
  box(g, [across + .1, .22, .12], [0, y - h / 2 - .08, out + .04], cream, .03);
  if (mullions) for (let x = -across / 2 + .45; x < across / 2 - .1; x += .9) slat(g, [.06, h, .08], [x, y, out + .06], trim);
}

/** Amber eave lines on a roof's camera-facing (-Z, -X) edges. */
function eave(parent: T.Object3D, x: number, y: number, z: number, w: number, d: number) {
  box(parent, [w, .1, .1], [x, y, z - d / 2 + .05], amber, .02);
  box(parent, [.1, .1, d], [x - w / 2 + .05, y, z], amber, .02);
}

/** Low pavilion body with shopfronts on the camera-facing (-Z, -X) sides. */
function kiosk(parent: T.Object3D, x: number, z: number, w: number, d: number, h: number): T.Group {
  const g = new T.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  box(g, [w, h, d], [0, h / 2, 0], cream, .08);
  faces(g, w, d, (f, a, out) => front(f, a - .5, out, h / 2, h - .4), [2, 3]);
  return g;
}

/** Half-cylinder timber roof; the long axis runs along X (or Z when `turn` is a quarter turn). */
function vault(parent: T.Object3D, x: number, y: number, z: number, len: number, span: number, rise: number, turn = 0) {
  const mesh = new T.Mesh(vaultGeometry, timber);
  mesh.position.set(x, y, z);
  mesh.rotation.y = turn;
  mesh.scale.set(len, rise, span / 2);
  mesh.castShadow = true;
  parent.add(mesh);
}

function tree(parent: T.Object3D, x: number, y: number, z: number, s: number) {
  box(parent, [.08, .5 * s, .08], [x, y + .25 * s, z], timber, .02);
  const crown = new T.Mesh(crownGeometry, leaf);
  crown.position.set(x, y + s, z);
  crown.scale.setScalar(s);
  crown.castShadow = true;
  parent.add(crown);
}

/** Covered walk between two ground points: stone strip, thin roof plate and posts every 1.6. */
function walk(parent: T.Object3D, [x0, z0]: [number, number], [x1, z1]: [number, number]) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz) + 1.2;
  const g = new T.Group();
  g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  g.rotation.y = Math.atan2(dx, dz);
  parent.add(g);
  box(g, [1.2, .05, len], [0, .025, 0], stone, .02);
  box(g, [1.5, .1, len], [0, 2, 0], trim, .03);
  for (let t = -len / 2 + .3; t <= len / 2 - .2; t += 1.6) for (const s of [-.7, .7]) box(g, [.08, 2, .08], [s, 1, t], trim, .02);
}

const person = (parent: T.Object3D, x: number, z: number, seated = false) => {
  const y = seated ? .36 : 0;
  box(parent, [.14, .5, .1], [x, y + .25, z], dark, .03);
  box(parent, [.12, .12, .12], [x, y + .56, z], dark, .03);
};

const bench = (parent: T.Object3D, x: number, z: number) => {
  box(parent, [.8, .1, .25], [x, .3, z], timber, .02);
  for (const s of [-.3, .3]) box(parent, [.06, .26, .2], [x + s, .13, z], trim, .02);
  person(parent, x - .2, z, true);
};

// The geometry rests on y = 0 (instances are placed by their centre), so lot bounds can be read without instance matrices.
const ring = (radius: number, tube: number, spots: [number, number, number][]) => {
  const mesh = new T.InstancedMesh(new T.TorusGeometry(radius, tube, 8, 48).rotateX(Math.PI / 2).translate(0, tube, 0), amber, spots.length);
  mesh.name = 'tower-meter-band';
  spots.forEach(([x, y, z], i) => mesh.setMatrixAt(i, new T.Matrix4().makeTranslation(x, y - tube, z)));
  return mesh;
};

class ConcentrationTowerController implements ConcentrationTowerRuntime {
  private readonly parts: Part[];
  private readonly elevator: T.Group;
  private readonly lowStart: number;
  private readonly mixedStart: number;
  private readonly highStart: number;
  private target = DEFAULT_TARGET;
  private applied = false;
  private active = false;
  private start = 0;

  constructor(groups: TowerGroups) {
    this.elevator = groups.elevator;
    this.lowStart = 2;
    this.mixedStart = this.lowStart + groups.lowModules.length;
    this.highStart = this.mixedStart + groups.mixedModules.length;
    const levels = [1, 0, ...groups.lowModules.map(() => 0), ...groups.mixedModules.map((_, i) => i < 4 ? 1 : 0), ...groups.highModules.map(() => 0)];
    this.parts = [groups.base, groups.pavilions, ...groups.lowModules, ...groups.mixedModules, ...groups.highModules]
      .map((group, i) => ({ group, level: levels[i], from: levels[i], to: levels[i] }));
    this.write();
  }

  setTarget(target: ConcentrationTowerTarget, now: number, immediate: boolean, sampleAt = now): boolean {
    this.update(sampleAt);
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
    // A pure function of the clock, so snapshots and reconnects need no special case.
    if (this.target.band === 'high') this.elevator.position.y = CABIN_LOW + (CABIN_HIGH - CABIN_LOW) * cabinRise(now);
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
      target.band === 'mixed' ? 1 : 0,
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
  const towerUpperLayer = createSiteLayer(root, siteLayerDefinition('centerGaiRear', 'towerUpper'));
  const neutralPropsLayer = createSiteLayer(root, siteLayerDefinition('centerGaiRear', 'towerNeutralProps'));
  const towerBase = towerBaseLayer.group;
  const towerUpper = towerUpperLayer.group;

  // 0: a cream mid-rise with three stepped, planted setbacks, pushed to the lot's +X/+Z corner so the court sits on the camera side.
  const base = new T.Group();
  base.name = 'tower-mid-rise-hall';
  towerBase.add(base);
  const body = new T.Group();
  body.position.set(1.2, 0, 1.2);
  base.add(body);
  const tiers: [number, number, number][] = [[7, 0, 11], [6, 11, 13], [5, 13, 15], [4, 15, 17]];
  for (const [w, y0, y1] of tiers) {
    box(body, [w, y1 - y0, w], [0, (y0 + y1) / 2, 0], cream, .12);
    for (let y = y0 ? y0 + .9 : 3.4; y < y1 - .3; y += 1.5) faces(body, w, w, (f, a, out, side) => bay(f, a - 1.2, out, y, .55, side > 1));
    if (y1 === 17) continue;
    for (const s of [-1, 1]) {
      box(body, [w - .3, .28, .3], [0, y1 + .14, s * (w / 2 - .22)], leaf, .08);
      box(body, [.3, .28, w - .3], [s * (w / 2 - .22), y1 + .14, 0], leaf, .08);
      for (const t of [-1, 1]) tree(body, s * (w / 2 - .5), y1 + .1, t * (w / 2 - .5), .35);
    }
    shrubs(body, w / 2 - .3, y1 + .2, 0, Math.PI * 2, 14);
  }
  faces(body, 7, 7, (f, a, out) => front(f, a - 1, out, .8, 1.2));
  faces(body, 7, 7, (f, a, out) => { for (const s of [-1, 1]) box(f, [.3, 9, .08], [s * (a / 2 - .5), 6, out + .04], amber, .02); }, [2, 3]);
  faces(body, 7, 7, (f, _a, out) => sign(f, kit, '都市集約 / 2127', 0, 2, out, 3.4, .6, '#527789'), [2]);
  box(body, [3.8, .2, 3.8], [0, 17.1, 0], leaf, .08);
  shrubs(body, 1.3, 17.2, 0, Math.PI * 2, 12);
  for (const x of [-1, 1]) for (const z of [-1, 1]) tree(body, x, 17.2, z, .7);
  base.add(...bake(base));
  base.add(ring(2.3, .08, [[1.2, 18.2, 1.2]]));

  // -1: four pavilions on a covered S-walk, with stalls and people.
  const pavilions = new T.Group();
  pavilions.name = 'tower-low-pavilion-pair';
  towerBase.add(pavilions);
  kiosk(pavilions, -2.8, -2.8, 4.2, 3, 1.8);
  vault(pavilions, -2.8, 1.8, -2.8, 4.4, 3.4, 1.9);
  eave(pavilions, -2.8, 1.85, -2.8, 4.4, 3.4);
  const garden = kiosk(pavilions, 2.95, -2.9, 3.7, 3.4, 1.6);
  box(garden, [3.9, .16, 3.6], [0, 1.68, 0], trim, .04);
  box(garden, [3, 1.2, 2.6], [0, 2.36, 0], cream, .06);
  faces(garden, 3, 2.6, (f, a, out) => front(f, a - .5, out, 2.36, .9), [2, 3]);
  box(garden, [3.5, .24, 3.1], [0, 3.08, 0], leaf, .05);
  shrubs(garden, 1.2, 3.2, 0, Math.PI * 2, 10);
  tree(garden, .7, 3.2, .4, .45);
  eave(garden, 0, 1.75, 0, 3.9, 3.6);
  kiosk(pavilions, -2.7, 2.9, 3.4, 2.9, 2);
  box(pavilions, [4.4, .2, 3.8], [-2.7, 2.1, 2.9], trim, .04);
  for (const z of [-1.9, 1.9]) box(pavilions, [4.4, .07, .08], [-2.7, 2.23, 2.9 + z], amber, .02);
  for (const x of [-2.2, 2.2]) box(pavilions, [.08, .07, 3.8], [-2.7 + x, 2.23, 2.9], amber, .02);
  kiosk(pavilions, 2.9, 3, 2.8, 2.8, 1.5);
  vault(pavilions, 2.9, 1.5, 3, 3, 3, 1.5);
  eave(pavilions, 2.9, 1.55, 3, 3, 3);
  const path: [number, number][] = [[.2, -4.3], [.2, -1.2], [.9, -1.2], [.9, 1.2], [.2, 1.2], [.2, 4.4]];
  for (let i = 1; i < path.length; i++) walk(pavilions, path[i - 1], path[i]);
  for (const [x, z] of [[.1, -4], [.4, -3.2], [0, -2.4], [.3, -1.6], [.9, -.4], [.7, .6], [.2, 1.9], [.3, 3], [-3.3, -4.75], [2.2, -4.85], [-4.8, 3], [1.2, 3.8]]) person(pavilions, x, z);
  for (const [x, z] of [[-4, -4.85], [3.9, -4.85], [-2.7, 0]]) bench(pavilions, x, z);
  tree(pavilions, -4.3, 0, -.1, .6);
  tree(pavilions, 4.3, 0, .3, .6);
  pavilions.add(...bake(pavilions));
  pavilions.add(ring(.9, .06, [[2.95, 3.65, -2.9], [-2.7, 2.7, 2.9]]));

  // +1: a street tower rising from the ground, one elevator and six two-storey function bands.
  const sx = -3;
  box(towerUpper, [8.4, 1.4, 8.4], [0, .7, 0], cream, .15);
  faces(towerUpper, 8.4, 8.4, (f, a, out) => front(f, a - 1, out, .7, .9));
  for (const [a, b] of [[1.4, 11.9], [13.1, 24.4], [25.6, 39]]) {
    box(towerUpper, [5.4, b - a, 5.4], [0, (a + b) / 2, 0], warm, .05);
    faces(towerUpper, 5.6, 5.6, (f, _w, out) => { for (let x = -1.8; x < 1.85; x += .9) slat(f, [.06, b - a, .08], [x, (a + b) / 2, out + .06], trim); });
    const n = Math.round((b - a) / 1.3);
    for (let k = 0; k <= n; k++) {
      const y = a + (b - a) * k / n;
      box(towerUpper, [5.75, .22, 5.75], [0, y, 0], cream, .04);
      if (k % 3 === 0) faces(towerUpper, 5.6, 5.6, (f, w, out) => box(f, [w - .2, .07, .1], [0, y, out + .1], amber, .02), [2, 3]);
    }
  }
  for (const x of [-2.45, 2.45]) for (const z of [-2.45, 2.45]) box(towerUpper, [.7, 37.6, .7], [x, 20.2, z], cream, .05);
  for (const yc of [12.5, 25]) {
    box(towerUpper, [4.4, 1.2, 4.4], [0, yc, 0], warm, .08);
    box(towerUpper, [5.9, .14, 5.9], [0, yc - .53, 0], cream, .04);
    box(towerUpper, [3.6, .3, .4], [.9, yc - .31, -2.6], leaf, .08);
    box(towerUpper, [.4, .3, 3.6], [-2.6, yc - .31, .9], leaf, .08);
    box(towerUpper, [5, .3, .4], [0, yc - .31, 2.6], leaf, .08);
    box(towerUpper, [.4, .3, 5], [2.6, yc - .31, 0], leaf, .08);
    shrubs(towerUpper, 2.15, yc - .46, 0, Math.PI * 2, 10);
    for (const [x, z] of [[1.5, -2.6], [2.6, -1.2], [-1, 2.6]]) tree(towerUpper, x, yc - .16, z, .45);
  }
  // The shaft is an open cream frame without glass, so the amber cabin is plainly visible as it travels.
  for (const x of [-.86, .86]) for (const z of [-.86, .86]) box(towerUpper, [.18, 37.6, .18], [sx + x, 20.2, sx + z], cream, .03);
  for (let y = 1.4; y < 39; y += 3.9) {
    box(towerUpper, [1.9, .12, .18], [sx, y, sx - .86], cream, .02);
    box(towerUpper, [.18, .12, 1.9], [sx - .86, y, sx], cream, .02);
  }
  for (const y of [1.4, 39]) box(towerUpper, [2, .14, 2], [sx, y, sx], cream, .03);
  // Crown: round terraced roof garden behind a parapet, with the Meter ring on top of it.
  arc(towerUpper, 0, 3.9, .4, [0, 39, 0], cream);
  arc(towerUpper, 3.6, 4, 1.1, [0, 39.4, 0], cream);
  arc(towerUpper, 0, 3.6, .15, [0, 39.4, 0], leaf);
  arc(towerUpper, 0, 2.1, .8, [0, 39.4, 0], cream);
  arc(towerUpper, 0, 2.1, .15, [0, 40.2, 0], leaf);
  shrubs(towerUpper, 2.8, 39.55, 0, Math.PI * 2, 14);
  shrubs(towerUpper, 1.7, 40.35, 0, Math.PI * 2, 8);
  for (let i = 0; i < 5; i++) tree(towerUpper, Math.cos(.5 + i * 1.26) * 2.9, 39.55, Math.sin(.5 + i * 1.26) * 2.9, .7);
  for (let i = 0; i < 3; i++) tree(towerUpper, Math.cos(1 + i * 2.1) * .9, 40.35, Math.sin(1 + i * 2.1) * .9, .65);
  towerUpper.add(...bake(towerUpper));
  towerUpper.add(ring(4.2, .35, [[0, 40.5, 0]]));

  const elevator = new T.Group();
  elevator.name = 'tower-elevator-cabin';
  elevator.position.set(sx, CABIN_LOW, sx);
  box(elevator, [1.3, 1.68, 1.3], [0, .96, 0], amber, .05);
  for (const y of [.06, 1.86]) box(elevator, [1.4, .12, 1.4], [0, y, 0], cream, .03);
  elevator.add(...bake(elevator));
  towerUpper.add(elevator);

  const lowStalls: [number, number, number][] = [[-1, -.5, 1], [-1, .5, 1], [2.1, -.5, -1], [2.1, .5, -1], [3.3, -.4, -1], [3.3, .5, -1]];
  const lowModules = lowStalls.map(([x, z, q], i) => addModule(pavilions, `tower-function-low-${i + 1}`, x, 0, z, q * Math.PI / 2, stall));

  // Mixed court: two timber-vault pavilions and a short walk to the tower foot, only while mixed shows.
  const court = new T.Group();
  court.name = 'tower-mixed-court';
  neutralPropsLayer.group.add(court);
  kiosk(court, -3.6, .5, 2, 3.2, 1.6);
  vault(court, -3.6, 1.6, .5, 3.4, 2.3, 1.5, Math.PI / 2);
  eave(court, -3.6, 1.65, .5, 2.3, 3.4);
  kiosk(court, .8, -3.5, 3.2, 2, 1.6);
  vault(court, .8, 1.6, -3.5, 3.4, 2.3, 1.5);
  eave(court, .8, 1.65, -3.5, 3.4, 2.3);
  walk(court, [-3.4, -3.7], [-2.1, -2.1]);
  for (const [x, z] of [[-3, -3.1], [-2.65, -2.7], [-2.3, -2.3], [-1.7, -3.4], [.8, -4.7], [3, -3], [3.9, -2.6], [-4.4, -.8]]) person(court, x, z);
  tree(court, 4.2, 0, -2.6, .6);
  tree(court, -4.2, 0, 3.4, .6);
  tree(court, -3, 0, 4, .5);
  court.add(...bake(court));
  const mixedStalls: [number, number, number][] = [[-4.2, -4.1, 0], [-3, -4.4, 0], [-1.9, -4.1, 0], [-4.45, -2.8, 1], [-4.45, -1.6, 1], [3.8, -4, 0]];
  const mixedModules = mixedStalls.map(([x, z, q], i) => addModule(neutralPropsLayer.group, `tower-function-mixed-${i + 1}`, x, 0, z, q * Math.PI / 2, stall));

  // Two-storey bands up the vertical street: a wood face with furniture silhouettes and amber lines, proud of the floor slabs.
  const highModules = [4, 9, 15, 21, 27, 33].map((y, i) => addModule(towerUpper, `tower-function-high-${i + 1}`, 0, y, 0, 0, group =>
    faces(group, 5.6, 5.6, (f, a, out) => {
      const w = a - 1.6;
      box(f, [w, 2.3, .05], [0, 0, out + .1], timber, .02);
      box(f, [.8, .34, .28], [-1.2, -.98, out + .24], cream, .04);
      box(f, [.5, .26, .34], [.1, -1.02, out + .24], cream, .04);
      box(f, [.28, .95, .22], [1.4, -.67, out + .21], cream, .03);
      for (const s of [-1, 1]) box(f, [w, .05, .08], [0, s * 1.2, out + .14], amber, .02);
    }, [2, 3])));

  const concentrationTower = new ConcentrationTowerController({ base, pavilions, elevator, lowModules, mixedModules, highModules });
  return {
    id: 'centerGaiRear', root,
    layers: { towerBase: towerBaseLayer, towerUpper: towerUpperLayer, towerNeutralProps: neutralPropsLayer },
    marker: createGuestMarker(root, 'se'),
    concentrationTower, concentrationDistrict: new ConcentrationDistrict(scene),
  };
}
