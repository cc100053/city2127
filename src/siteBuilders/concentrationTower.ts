import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { arc, bake, box, faces, leaf, leafyCrown, paint, shrubs, stone, warm, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import { ConcentrationDistrict, METER_COLORS } from '../districtMeters.ts';
import { remapCityMaterials } from '../siteAssets/assetLoader.ts';
import type { SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import { instanceProps, loadPropKit } from '../siteAssets/propKit.ts';
import { floorKit, forecourtKit, lobbyKit, moduleKit, roofKit, UNITS_PER_METRE, type TowerKit } from './towerHighKit.ts';
import type { Band } from '../surveyView.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, prefersReducedMotion, SITE_TRANSITION_SECONDS, type BuiltSite } from './siteRuntime.ts';

const HIDDEN = 1e-3;
const DEFAULT_TARGET: ConcentrationTowerTarget = { band: 'mixed', functionModules: 4 };
const smoothstep = (t: number) => t * t * (3 - 2 * t);
// Emissive and instance-colour-free, so the Meter amber reads day and night (publicLight x instance colour went white after dark).
export const amber = new T.MeshStandardMaterial({ color: METER_COLORS.urbanConcentration, emissive: METER_COLORS.urbanConcentration, emissiveIntensity: 2, roughness: .5 });
const white = paint('#f4f2ec', .4), oak = paint('#efe3cf', .6), dwood = paint('#efe6d6', .6), fabric = paint('#e9b8a0', .8), dark = paint('#6a737a', .5), pale = paint('#f1e8d6', .6);
const books = ['#c98f6e', '#9fc0b4', '#e6c26a'].map(c => paint(c, .6));
const bark = paint('#c99258', .62);
const room = new T.MeshStandardMaterial({ color: '#f7cfb0', emissive: '#f7cfb0', emissiveIntensity: .55, roughness: .7 });
const floorMat = paint('#f3e6da', .6);
const stripLight = new T.MeshStandardMaterial({ color: '#fff0e0', emissive: '#fff0e0', emissiveIntensity: 1.4, roughness: .5 });
const glassWall = new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffc9a0', emissiveIntensity: .35, roughness: .1, transparent: true, opacity: .2, depthWrite: false, side: T.DoubleSide });
const light = new T.MeshStandardMaterial({ color: '#fff4dc', emissive: '#fff4dc', emissiveIntensity: 2.6, roughness: .5 });
const lamp = new T.MeshStandardMaterial({ color: '#f7cfb0', emissive: '#f7cfb0', emissiveIntensity: .6, roughness: .7, side: T.DoubleSide });
const pane = new T.MeshStandardMaterial({ color: '#cfe6f2', roughness: .1, transparent: true, opacity: .18, depthWrite: false });
const paneBlue = new T.MeshStandardMaterial({ color: '#bfe0f5', roughness: .1, transparent: true, opacity: .45, depthWrite: false });
// +1 only (T4, T9): white ceilings with a mild glow, cream-white upper rooms, pale forecourt paving.
const ceilingHigh = new T.MeshStandardMaterial({ color: '#fff6ea', emissive: '#fff6ea', emissiveIntensity: .6, roughness: .7 });
const cream = new T.MeshStandardMaterial({ color: '#f7e2c8', emissive: '#ffd9b0', emissiveIntensity: .5, roughness: .7 });
// R3: tower glazing that tints nothing (unlit, so it never mirrors the sky over the rooms) and a visible white-blue lift tube.
const paneHigh = new T.MeshBasicMaterial({ color: '#fff8ee', transparent: true, opacity: .08, depthWrite: false });
const liftGlass = new T.MeshStandardMaterial({ color: '#dceefa', roughness: .1, transparent: true, opacity: .35, emissive: '#dceefa', emissiveIntensity: .15, depthWrite: false });
const paving = paint('#ece6da', .8);
const water = new T.MeshStandardMaterial({ color: '#7cc4ea', emissive: '#3a86b8', emissiveIntensity: .15, roughness: .25 });
const unitBox = new T.BoxGeometry(1, 1, 1);
const postGeometry = new T.CylinderGeometry(.03, .03, .94, 6);
const crownGeometry = leafyCrown(1);
const CABIN_LOW = 1.5, CABIN_HIGH = 34.8, CABIN_REST = 19, CABIN_PERIOD = 14;

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


/** One function module: a baked group that scales in from its own origin; `build` may return extra objects (people) added after the bake. */
function addModule(parent: T.Group, name: string, x: number, y: number, z: number, angle: number, build: (group: T.Group) => T.Object3D | void): T.Group {
  const group = new T.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.rotation.y = angle;
  parent.add(group);
  const extra = build(group);
  group.add(...bake(group));
  if (extra) group.add(extra);
  group.scale.setScalar(HIDDEN);
  group.visible = false;
  return group;
}

/** Plain scaled unit box (cheap), optionally turned about Y. */
function strip(parent: T.Object3D, material: T.Material, x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0) {
  const mesh = new T.Mesh(unitBox, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  mesh.castShadow = true;
  parent.add(mesh);
}

/** Mullions are plain scaled unit boxes: far cheaper than rounded boxes at this count. */
export function slat(parent: T.Object3D, size: [number, number, number], position: [number, number, number], material: T.Material) {
  strip(parent, material, ...position, ...size);
}

/** One-sided plane: seen only from the side its normal faces, so a near wall never hides the room behind it. */
function plane(parent: T.Object3D, material: T.Material, w: number, h: number, position: [number, number, number], rotX: number, rotY: number) {
  const mesh = new T.Mesh(new T.PlaneGeometry(w, h), material);
  mesh.position.set(...position);
  mesh.rotation.set(rotX, rotY, 0);
  parent.add(mesh);
}

export function tree(parent: T.Object3D, x: number, y: number, z: number, s: number) {
  box(parent, [.08, .5 * s, .08], [x, y + .25 * s, z], bark, .02);
  const crown = new T.Mesh(crownGeometry, leaf);
  crown.position.set(x, y + s, z);
  crown.scale.setScalar(s);
  crown.castShadow = true;
  parent.add(crown);
}

const bush = (parent: T.Object3D, x: number, y: number, z: number, s: number) => {
  const mesh = new T.Mesh(crownGeometry, leaf);
  mesh.position.set(x, y + s * .75, z);
  mesh.scale.set(s, s * .7, s);
  mesh.castShadow = true;
  parent.add(mesh);
};

/** Glazed warm rooms: slab, lit ceiling, one-sided warm inner walls, thin mullions, optional corner columns, amber slab edge and roof. */
function glazed(g: T.Group, cx: number, y0: number, cz: number, w: number, d: number, h: number, o: { columns?: boolean; amber?: boolean; roof?: boolean; solidEnds?: 'x' | 'z' } = {}) {
  const t = .22, q = new T.Group();
  q.position.set(cx, y0, cz);
  g.add(q);
  box(q, [w + .12, t, d + .12], [0, t / 2, 0], white, .03);
  if (o.roof) box(q, [w + .24, .2, d + .24], [0, h + .1, 0], white, .04);
  plane(q, lamp, w - .3, d - .3, [0, h - .02, 0], Math.PI / 2, 0);
  strip(q, stripLight, 0, h - .05, 0, w * .6, .03, .14);
  strip(q, floorMat, 0, t + .004, 0, w - .2, .01, d - .2);
  faces(q, w, d, (f, a, out, side) => {
    if (o.solidEnds && (o.solidEnds === 'x' ? side % 2 === 1 : side % 2 === 0)) { // solid white end wall
      strip(f, white, 0, (h + t) / 2, out, a, h - t, .14);
      if (o.roof) strip(f, amber, 0, h + .03, out + .14, a + .24, .05, .06);
      return;
    }
    plane(f, room, a - .3, h - t - .08, [0, (h + t) / 2, out - .1], 0, Math.PI);
    const n = Math.max(2, Math.round(a / 1.15));
    for (let i = 0; i <= n; i++) strip(f, white, -a / 2 + a * i / n, (h + t) / 2, out + .01, .06, h - t, .07);
    strip(f, white, 0, h - .04, out + .01, a, .07, .08);
    strip(f, pane, 0, (h + t) / 2, out, a, h - t, .02);
    if (o.amber) strip(f, amber, 0, .06, out + .09, a + .12, .09, .06);
    if (o.roof) strip(f, amber, 0, h + .03, out + .14, a + .24, .05, .06);
  });
  if (o.columns) for (const sx of [-1, 1]) for (const sz of [-1, 1]) strip(q, white, sx * w / 2, h / 2, sz * d / 2, .16, h, .16);
}

/** Hovering roof disc (.14 thick, gap .5) on a collar with bright emissive light rings; `y` is the roof top. */
function emitter(g: T.Object3D, x: number, y: number, z: number, R: number, gap = .5, c = .5) {
  arc(g, 0, c, gap, [x, y, z], white);
  arc(g, c - .04, c + .16, .1, [x, y + gap * .3, z], light);
  arc(g, c - .04, c + .16, .06, [x, y + gap - .1, z], light);
  arc(g, 0, R, .14, [x, y + gap, z], white);
}

// People: separate head, torso, arms and legs; shirt vertices are white so the instance colour tints them.
const tint = (geometry: T.BufferGeometry, hex: string) => {
  const c = new T.Color(hex), n = geometry.attributes.position.count;
  geometry.setAttribute('color', new T.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]), 3));
  return geometry;
};
const bx = (w: number, h: number, d: number, x: number, y: number, z: number, hex: string) => tint(new T.BoxGeometry(w, h, d).translate(x, y, z), hex);
const head = (y: number) => tint(new T.SphereGeometry(.075, 10, 8).translate(0, y, 0), '#e0b08c');
const standingGeometry = mergeGeometries([head(.555), bx(.2, .27, .12, 0, .385, 0, '#fff'), bx(.05, .24, .07, -.125, .39, 0, '#fff'), bx(.05, .24, .07, .125, .39, 0, '#fff'),
  bx(.08, .25, .09, -.05, .125, 0, '#454c55'), bx(.08, .25, .09, .05, .125, 0, '#454c55')])!;
const seatedGeometry = mergeGeometries([head(.575), bx(.2, .27, .12, 0, .405, 0, '#fff'), bx(.05, .24, .07, -.125, .41, 0, '#fff'), bx(.05, .24, .07, .125, .41, 0, '#fff'),
  bx(.08, .08, .22, -.05, .23, .11, '#454c55'), bx(.08, .08, .22, .05, .23, .11, '#454c55'), bx(.08, .22, .08, -.05, .11, .21, '#454c55'), bx(.08, .22, .08, .05, .11, .21, '#454c55')])!;
standingGeometry.scale(1.2, 1.2, 1.2);
seatedGeometry.scale(1.2, 1.2, 1.2);
const personMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: .7 });
const shirts = ['#ffffff', '#f1e9d6', '#bcd8ee', '#f2c7b0', '#cfe6c9', '#e6d3f0'].map(c => new T.Color(c));
type P = [x: number, y: number, z: number, seated?: boolean, yaw?: number];
/** Standing and seated residents as two instanced meshes; add after the group's bake. */
const crowd = (spots: P[]) => {
  const group = new T.Group();
  group.name = 'tower-crowd';
  for (const seated of [false, true]) {
    const list = spots.filter(s => !!s[3] === seated);
    if (!list.length) continue;
    const mesh = new T.InstancedMesh(seated ? seatedGeometry : standingGeometry, personMaterial, list.length);
    mesh.castShadow = true;
    list.forEach(([x, y, z, , yaw], i) => {
      mesh.setMatrixAt(i, new T.Matrix4().makeRotationY(yaw ?? i * 2.4).setPosition(x, y, z));
      mesh.setColorAt(i, shirts[(i + (seated ? 2 : 0)) % shirts.length]);
    });
    group.add(mesh);
  }
  return group;
};

const table = (g: T.Object3D, x: number, y: number, z: number) => { strip(g, oak, x, y + .42, z, .62, .04, .5); strip(g, white, x, y + .2, z, .06, .4, .06); };
const chair = (g: T.Object3D, x: number, y: number, z: number) => { strip(g, pale, x, y + .29, z, .3, .04, .3); strip(g, white, x, y + .13, z, .05, .26, .05); };
const shelf = (g: T.Object3D, x: number, y: number, z: number, len: number, yaw: number) => {
  const s = new T.Group();
  s.position.set(x, y, z);
  s.rotation.y = yaw;
  g.add(s);
  strip(s, dwood, 0, .5, 0, len, 1, .26);
  [.28, .58, .88].forEach((yy, i) => strip(s, books[i], 0, yy, 0, len - .1, .08, .28));
};
const bench = (g: T.Object3D, x: number, z: number, yaw = 0) => {
  const s = new T.Group();
  s.position.set(x, 0, z);
  s.rotation.y = yaw;
  g.add(s);
  strip(s, white, 0, .32, 0, 1.2, .06, .3);
  for (const k of [-.5, .5]) strip(s, white, k, .15, 0, .06, .3, .24);
  strip(s, white, 0, .58, .14, 1.2, .38, .04);
};
const planter = (g: T.Object3D, x: number, y: number, z: number, w: number, d: number) => {
  strip(g, pale, x, y + .15, z, w, .3, d);
  strip(g, leaf, x, y + .31, z, w - .1, .06, d - .1);
  for (let i = 0; i < Math.max(2, Math.round(w / .45)); i++) bush(g, x - w / 2 + .3 + i * .45, y + .33, z, .26);
};

/** Fit-out of one glazed room (`y` = floor top): six kinds so floors differ; returns the people it seats. */
function furnishBase(g: T.Object3D, kind: number, w: number, cx: number, y: number, cz: number): P[] {
  const e = w / 2 - .25, X = (x: number) => cx + x, Z = (z: number) => cz + z;
  const desk = (x: number, z: number) => { strip(g, oak, X(x), y + .36, Z(z), .9, .04, .5); strip(g, dark, X(x), y + .48, Z(z) - .12, .3, .2, .03); strip(g, white, X(x) - .4, y + .17, Z(z), .05, .34, .4); strip(g, white, X(x) + .4, y + .17, Z(z), .05, .34, .4); };
  const seat = (x: number, z: number, yaw: number): P => [X(x), y, Z(z), true, yaw];
  switch (kind % 6) {
    case 0:
      desk(-.8, -.6); desk(.8, -.6); desk(0, .7);
      chair(g, X(-.8), y, Z(-.1)); chair(g, X(.8), y, Z(-.1)); chair(g, X(0), y, Z(1.2));
      return [seat(-.8, -.1, Math.PI), seat(.8, -.1, Math.PI), [X(.2), y, Z(.1)]];
    case 1:
      shelf(g, X(e), y, Z(0), w - 1.2, Math.PI / 2); shelf(g, X(-e), y, Z(0), w - 1.2, Math.PI / 2); shelf(g, X(0), y, Z(e), w - 1.2, 0);
      table(g, X(-.2), y, Z(-.4)); chair(g, X(-.7), y, Z(-.4)); chair(g, X(.3), y, Z(-.4));
      return [seat(-.7, -.4, Math.PI / 2), seat(.3, -.4, -Math.PI / 2), [X(e - .6), y, Z(.5)]];
    case 2:
      strip(g, white, X(0), y + .25, Z(e - .2), w - 1.6, .5, .4); strip(g, oak, X(0), y + .52, Z(e - .2), w - 1.5, .04, .45);
      for (const [x, z] of [[-.9, -.6], [.8, -.7], [-.2, .35]]) { table(g, X(x), y, Z(z)); chair(g, X(x - .5), y, Z(z)); chair(g, X(x + .5), y, Z(z)); }
      return [seat(-1.4, -.6, Math.PI / 2), seat(1.3, -.7, -Math.PI / 2), [X(-.4), y, Z(e - .7)], seat(.3, .35, -Math.PI / 2)];
    case 3:
      planter(g, X(0), y, Z(e - .2), w - 1.2, .45); planter(g, X(e - .2), y, Z(-.2), 1.4, .45);
      bench(g, X(-.3), Z(-.6)); tree(g, X(-e + .3), y, Z(e - .3), .35);
      return [[X(-.3 - .3), y, Z(-.6), true, Math.PI], [X(-.3 + .3), y, Z(-.6), true, Math.PI], [X(.7), y, Z(.3)]];
    case 4:
      strip(g, dark, X(0), y + .35, Z(e - .2), 1.4, .7, .3);
      for (const x of [-.9, .8]) { strip(g, dark, X(x), y + .2, Z(-.4), .3, .4, 1); strip(g, fabric, X(x + .6), y + .02, Z(-.4), .5, .04, 1.1); }
      return [[X(-.2), y, Z(.2)], [X(.5), y, Z(.5)], [X(.8), y + .4, Z(-.4), true, Math.PI]];
    default:
      strip(g, white, X(.6), y + .25, Z(.2), 1.4, .5, .6); strip(g, oak, X(.6), y + .52, Z(.2), 1.5, .04, .65);
      strip(g, fabric, X(-e + .3), y + .2, Z(0), .55, .4, 1.7); strip(g, fabric, X(-e + .05), y + .45, Z(0), .12, .5, 1.7);
      chair(g, X(.3), y, Z(-.5)); chair(g, X(.9), y, Z(-.5));
      return [seat(.3, -.5, Math.PI), seat(.9, -.5, Math.PI), [X(-.4), y, Z(.9)]];
  }
}

/** furnishBase plus a table and 3 residents standing by the camera-side glass (-X, -Z and +X faces). */
function furnish(g: T.Object3D, kind: number, w: number, cx: number, y: number, cz: number): P[] {
  const e = w / 2 - .25;
  table(g, cx + e - .5, y, cz - .9);
  return [...furnishBase(g, kind, w, cx, y, cz), [cx - e + .15, y, cz - .3], [cx + .5, y, cz - e + .15], [cx + e - .15, y, cz + .6]];
}

/** Plant + one resident: a function module's fit-out. */
const fitout = (g: T.Group, x: number, y: number, z: number): T.Object3D => {
  planter(g, x, y, z, .8, .4);
  return crowd([[x + .7, y, z + .1]]);
};

/** Meter ring(s); each spot is [x, y, z, scale]. The geometry rests on y = 0 (instances are placed by their base), so lot bounds can be read without instance matrices. */
const ring = (radius: number, tube: number, spots: [number, number, number, number?][], tubular = 48, radial = 8) => {
  const mesh = new T.InstancedMesh(new T.TorusGeometry(radius, tube, radial, tubular).rotateX(Math.PI / 2).translate(0, tube, 0), amber, spots.length);
  mesh.name = 'tower-meter-band';
  spots.forEach(([x, y, z, s = 1], i) => mesh.setMatrixAt(i, new T.Matrix4().makeScale(s, s, s).setPosition(x, y - tube * s, z)));
  return mesh;
};

/** Glazed warm cylinder pavilion: floor, white roof, lit ceiling, warm far wall (the camera looks in through the open near half), mullions all round, lawn ring. */
function drum(g: T.Group, x: number, z: number, r: number, H: number) {
  const q = new T.Group();
  q.position.set(x, 0, z);
  g.add(q);
  arc(q, 0, r + .05, .12, [0, 0, 0], white);
  arc(q, 0, r + .1, .18, [0, H, 0], white);
  arc(q, 0, r - .08, .04, [0, H - .04, 0], lamp);
  arc(q, r - .2, r - .1, H - .14, [0, .12, 0], room, -Math.PI / 4 - .8 * Math.PI, 1.6 * Math.PI);
  arc(q, r - .04, r + .02, .06, [0, H - .08, 0], white);
  arc(q, 0, r - .12, .02, [0, .12, 0], floorMat);
  const wall = new T.Mesh(new T.CylinderGeometry(r - .02, r - .02, H - .14, 32, 1, true), glassWall);
  wall.position.y = .12 + (H - .14) / 2;
  q.add(wall);
  arc(q, r + .04, r + .4, .04, [0, 0, 0], stone);
  for (let i = 0, n = Math.round(Math.PI * 2 * r / .8); i < n; i++) {
    const a = i / n * Math.PI * 2;
    strip(q, white, r * Math.cos(a), (H + .12) / 2, r * Math.sin(a), .05, H - .12, .06, Math.PI / 2 - a);
  }
}
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
    if (this.target.band === 'high') this.elevator.position.y = prefersReducedMotion() ? CABIN_REST : CABIN_LOW + (CABIN_HIGH - CABIN_LOW) * cabinRise(now);
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

const FACE_CAM = -3 * Math.PI / 4; // yaw that turns a resident to face the -X/-Z camera
/** Lift cabin: white body, warm-lit windows, amber trim (origin on its floor). */
const cabinParts = (g: T.Object3D, w = 1, h = 1.7) => {
  strip(g, white, 0, h / 2, 0, w, h, w);
  faces(g as T.Group, w, w, (f, a, out) => { strip(f, room, 0, h * .6, out + .01, a * .72, h * .55, .02); strip(f, amber, 0, h * .96, out + .02, a, .06, .02); });
};
/** Lift shaft: white posts (half-width `hw`), rails every `step`, faint glazing on three faces, optional thin amber guide rails. */
const shaft = (g: T.Object3D, x: number, z: number, h: number, step: number, hw = .7, rails = false, front: T.Material = pane) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) strip(g, white, x + sx * hw, h / 2, z + sz * hw, .12, h, .12);
  for (let y = .04; y <= h; y += step) strip(g, white, x, y, z, hw * 2, .08, hw * 2);
  strip(g, front, x, h / 2, z - hw, hw * 2, h, .02); strip(g, pane, x - hw, h / 2, z, .02, h, hw * 2); strip(g, front, x + hw, h / 2, z, .02, h, hw * 2);
  if (rails) for (const sx of [-1, 1]) { strip(g, amber, x + sx * (hw - .1), h / 2, z - hw + .08, .04, h, .04); strip(g, amber, x + hw - .08, h / 2, z + sx * (hw - .1), .04, h, .04); }
};

export function buildConcentrationTower(scene: T.Scene, _kit: Kit, assets?: SiteAssetLoaderCache): ConcentrationTowerBuiltSite {
  const root = createSiteRoot(scene, 'se');
  const towerBaseLayer = createSiteLayer(root, siteLayerDefinition('centerGaiRear', 'towerBase'));
  const towerUpperLayer = createSiteLayer(root, siteLayerDefinition('centerGaiRear', 'towerUpper'));
  const neutralPropsLayer = createSiteLayer(root, siteLayerDefinition('centerGaiRear', 'towerNeutralProps'));
  const towerBase = towerBaseLayer.group;
  const towerUpper = towerUpperLayer.group;

  // 0: one slender glazed tower, two low glazed wings under hovering discs, a bridge, an escalator and a lift.
  const MX = .5, MZ = .5, TW = 4.6, FH = 2.4, SL = .22;
  const base = new T.Group();
  base.name = 'tower-mid-rise-hall';
  base.position.set(1.6, 0, 1.6); // the whole 0 composition sits toward +X/+Z so the forecourt shows at L
  towerBase.add(base);
  const mixedPeople: P[] = [];
  for (let k = 0; k < 6; k++) {
    glazed(base, MX, k * FH, MZ, TW, TW, FH, { columns: true, amber: k % 2 === 1 });
    mixedPeople.push(...furnish(base, k, TW - .4, MX, k * FH + SL, MZ));
  }
  box(base, [TW + .12, SL, TW + .12], [MX, 6 * FH + SL / 2, MZ], white, .03);
  for (const s of [-1, 1]) {
    strip(base, white, MX, 6 * FH + .4, MZ + s * (TW / 2 - .05), TW, .4, .1);
    strip(base, white, MX + s * (TW / 2 - .05), 6 * FH + .4, MZ, .1, .4, TW);
  }
  strip(base, leaf, MX, 6 * FH + .35, MZ, TW - .2, .2, TW - .2);
  const roof = new T.Group();
  roof.position.set(MX, 0, MZ);
  base.add(roof);
  shrubs(roof, 1.7, 6 * FH + .45, 0, Math.PI * 2, 12);
  shrubs(roof, .8, 6 * FH + .45, 0, Math.PI * 2, 6);
  for (const [x, z] of [[1.2, 1.2], [-1.2, 1.2], [1.2, -1.2], [-1.3, -1.1], [0, 0]]) tree(roof, x, 6 * FH + .45, z, .6);
  for (const k of [2, 4]) { // planted balcony edges (white planters with shrubs) on the -Z and -X faces
    strip(base, white, MX, k * FH + .37, MZ - TW / 2 - .3, TW, .3, .45); strip(base, white, MX - TW / 2 - .3, k * FH + .37, MZ, .45, .3, TW);
    for (let i = 0; i < 5; i++) { bush(base, MX - TW / 2 + .4 + i * .85, k * FH + .52, MZ - TW / 2 - .3, .28); bush(base, MX - TW / 2 - .3, k * FH + .52, MZ - TW / 2 + .4 + i * .85, .28); }
  }
  shaft(base, 3.6, -1, 6 * FH, FH, .8, true, paneBlue);
  const cabin = new T.Group();
  cabin.position.set(3.6, 4.9, -1);
  cabinParts(cabin, 1.2, 1.8);
  base.add(cabin);
  // Escalator on the -Z face: white side walls, dark tread, faint balustrade, rising to the floor-2 slab.
  const eStart = new T.Vector3(-.9, 0, -5.7), eEnd = new T.Vector3(-.9, 2 * FH, -1.9);
  const eLen = eStart.distanceTo(eEnd), eAng = Math.atan2(eEnd.y - eStart.y, eEnd.z - eStart.z);
  const esc = new T.Group();
  esc.position.copy(eStart.clone().add(eEnd).multiplyScalar(.5)).y += .1;
  esc.rotation.x = -eAng;
  base.add(esc);
  for (const s of [-.45, .45]) { strip(esc, white, s, .35, 0, .08, .5, eLen); strip(esc, pane, s, .8, 0, .02, .5, eLen); }
  strip(esc, dark, 0, .12, 0, .8, .05, eLen);
  for (const t of [.2, .4, .62, .85]) { const p = eStart.clone().lerp(eEnd, t); mixedPeople.push([p.x, p.y + .24, p.z, false, 0]); }
  base.add(...bake(base));
  base.add(ring(2.6, .09, [[MX, 16.6, MZ]]));
  base.add(crowd(mixedPeople));

  // -1: five round glazed pavilions (two big, nearest the camera at screen-left and -right; three small behind), hovering emitter discs, one S-shaped raised walkway, water, lawns and residents.
  const pavilions = new T.Group();
  pavilions.name = 'tower-low-pavilion-pair';
  towerBase.add(pavilions);
  const PH = 2.0;
  const spots: [number, number, number][] = [[4, -3.4, 2], [-2.85, -.2, 2], [4.4, .85, 1.6], [-2.45, 4, 1.6], [4.4, 4.95, 1.6]];
  const uv = (u: number, v: number): [number, number] => [(u - v) * .7071, (u + v) * .7071];
  const lowPeople: P[] = [];
  const seams: [number, number, number, number][] = [];
  strip(pavilions, leaf, 0, .03, 0, 13.8, .06, 13.8); // lawn under everything; paved aprons and the path ribbon sit on it
  spots.forEach(([x, z, r]) => {
    drum(pavilions, x, z, r, PH);
    emitter(pavilions, x, PH + .18, z, r + .35, .8, .6 * r);
    seams.push([x, PH - .02, z, r + .08]);
    const at = (u: number, v: number): [number, number] => { const [a, b] = uv(u, v); return [x + a, z + b]; };
    const piece = (u: number, v: number, fn: (s: T.Group) => void) => { const [a, b] = at(u, v); const s = new T.Group(); s.position.set(a, .12, b); s.rotation.y = Math.PI / 4; pavilions.add(s); fn(s); };
    piece(.6 * r, .35 * r, s => { strip(s, white, 0, .25, 0, 1.2, .5, .4); strip(s, oak, 0, .52, 0, 1.3, .04, .45); });
    piece(.35 * r, -.7 * r, s => { strip(s, fabric, 0, .17, 0, 1.1, .34, .45); strip(s, fabric, 0, .4, .2, 1.1, .3, .1); });
    for (const v of [-.4, .55]) { const [a, b] = at(r - .3, v * r); shelf(pavilions, a, .12, b, 1, Math.PI / 4); }
    for (const [u, v] of [[-.05 * r, .15 * r], [.05 * r, -.3 * r]]) {
      const [a, b] = at(u, v);
      arc(pavilions, 0, .3, .04, [a, .12 + .34, b], pale); strip(pavilions, white, a, .29, b, .06, .34, .06);
      chair(pavilions, a - .45, .12, b);
      lowPeople.push([a - .45, .12, b, true, Math.PI / 2]);
    }
    const [n1, n2] = at(-.65 * r, .35 * r), [n3, n4] = at(-.4 * r, -.45 * r);
    const [n5, n6] = at(-.75 * r, -.05 * r);
    lowPeople.push([n1, .12, n2], [n3, .12, n4], [n5, .12, n6]);
  });
  const curve = new T.CatmullRomCurve3([[-1.3, 0, -6.1], [-.2, 0, -4.3], [.9, 0, -2.5], [.2, 0, -.5], [.9, 0, 1.8], [.2, 0, 3.8], [.9, 0, 5.1], [.4, 0, 6.1]].map(p => new T.Vector3(...p)));
  const pts = curve.getSpacedPoints(48);
  pts.forEach((p, i) => {
    if (!i) return;
    const a = pts[i - 1], dx = p.x - a.x, dz = p.z - a.z, len = Math.hypot(dx, dz) + .08, yaw = Math.atan2(dx, dz), mx = (p.x + a.x) / 2, mz = (p.z + a.z) / 2, nx = Math.cos(yaw), nz = -Math.sin(yaw);
    strip(pavilions, stone, mx, .08, mz, 1.8, .04, len, yaw); // paved ribbon under the walkway
    strip(pavilions, white, mx, 1.1, mz, 1, .12, len, yaw);
    strip(pavilions, amber, mx, 1.17, mz, .08, .02, len, yaw);
    if (i % 4 === 0) for (const s of [-.4, .4]) { const post = new T.Mesh(postGeometry, white); post.position.set(mx + nx * s, .52, mz + nz * s); post.scale.y = 1.1; pavilions.add(post); }
    if (i < 30) { strip(pavilions, water, mx + nx * 1.15, .09, mz + nz * 1.15, .7, .04, len, yaw); strip(pavilions, leaf, mx - nx * 1.2, .15, mz - nz * 1.2, .35, .3, len, yaw); } // water along the walk, hedge on its other side
    else if (i > 32) strip(pavilions, leaf, mx + nx * 1.2, .15, mz + nz * 1.2, .35, .3, len, yaw);
  });
  const onWalk = (t: number): P => { const p = curve.getPointAt(t); return [p.x, 1.16, p.z]; };
  for (const [x, z, w, d] of [[-4.8, -6.7, 4.4, .4], [4.8, -6.7, 4.4, .4], [-6.8, -1, .4, 11], [6.8, -6, .4, 1.6]]) strip(pavilions, leaf, x, .15, z, w, .3, d); // hedge borders
  for (const [bx0, bz0] of [[-2.8, -4.8], [2.4, -5]]) { // 3-step terraced planting beds in the front garden
    for (const [i, [w, d]] of [[2.2, 1.9], [1.8, 1.5], [1.4, 1.1]].entries()) strip(pavilions, leaf, bx0, .12 + i * .2, bz0, w, .2, d);
    for (const x of [-.45, .45]) bush(pavilions, bx0 + x, .65, bz0, .3);
  }
  for (const [x, z, k] of [[-6.1, -6.1, .55], [-6.2, -3.2, .5], [-6.2, 1, .5], [-6.1, 5.2, .5], [-1.6, -3.6, .45], [2.4, -5.6, .5], [6.2, -6, .5], [6.3, -1.6, .45], [2.5, .3, .35], [2.9, 3.3, .4], [-.9, 6.3, .4], [-6.2, 6.2, .5], [6.3, 6.3, .4], [-4.6, -2.3, .45], [-1.2, -.3, .35], [-.1, 3.2, .35]]) tree(pavilions, x, 0, z, k);
  const benches: [number, number, number][] = [[-1.1, 2.3, 0], [2, 3, 0], [2.4, -.3, 0], [-5.6, 1.5, Math.PI / 2]];
  for (const [x, z, yaw] of benches) bench(pavilions, x, z, yaw);
  pavilions.add(...bake(pavilions));
  pavilions.add(ring(1, .025, seams));
  const outside: P[] = [onWalk(.1), onWalk(.3), onWalk(.5), onWalk(.7), onWalk(.9),
    ...benches.flatMap(([x, z, yaw]): P[] => yaw ? [[x, 0, z - .3, true, FACE_CAM], [x, 0, z + .3, true, FACE_CAM]] : [[x - .3, 0, z, true, FACE_CAM], [x + .3, 0, z, true, FACE_CAM]]),
    [1.1, 0, -1.6], [-.3, 0, .9], [1.2, 0, .4], [1, 0, 2.3], [-.3, 0, 3.0], [2.8, 0, 1.9], [-.2, 0, 4.4], [2.9, 0, -1.0], [1.3, 0, 3.8], [-3.4, 0, -6.3], [.9, 0, -3.8]];
  pavilions.add(crowd([...lowPeople, ...outside]));

  // +1: one vertical street: 13 glazed floors and an open top floor between square white piers, a separate lift tube, a round crown.
  // Procedural fallback: `highShell` (R6 slabs, glazing, crown, lift shaft) and `dressing` (R6 furniture, terraces, base greenery, residents).
  // Once `concentration-tower-high` and the prop kit are ready both are replaced (see the preparation below).
  const HW = 5.2, LOBBY = 3.6, HF = 2.4, TOP = LOBBY + 14 * HF;
  const highShell = new T.Group();
  highShell.name = 'tower-high-shell';
  const dressing = new T.Group();
  dressing.name = 'tower-high-dressing';
  const roofGarden = new T.Group();
  roofGarden.name = 'tower-roof-garden';
  const highPeople: P[] = [];
  glazed(highShell, 0, 0, 0, HW, HW, LOBBY, { amber: true });
  highPeople.push(...furnish(dressing, 2, HW - .5, 0, SL, 0));
  for (let i = 0; i < 14; i++) {
    const y0 = LOBBY + i * HF;
    glazed(highShell, 0, y0, 0, HW, HW, HF, { amber: true });
    highPeople.push(...furnish(dressing, i, HW - .5, 0, y0 + SL, 0));
    if ([1, 4, 7, 10, 12].includes(i)) { // sky terraces projecting 1.2 off the +X face: white slab and planter, two big trees with visible trunks
      strip(highShell, white, HW / 2 + .6, y0 + .07, 1.1, 1.2, .14, 3);
      strip(highShell, white, HW / 2 + 1.1, y0 + .27, 1.1, .3, .26, 2.8);
      for (const z of [-.2, .6, 1.4, 2.2]) bush(dressing, HW / 2 + 1.1, y0 + .35, z, .22);
      for (const z of [.2, 2]) tree(dressing, HW / 2 + .55, y0 + .14, z, 1);
    }
  }
  strip(highShell, white, 0, TOP + .11, 0, HW + .12, .22, HW + .12);
  for (const x of [-1, 1]) for (const z of [-1, 1]) arc(highShell, 0, .3, TOP, [x * (HW / 2 - .02), 0, z * (HW / 2 - .02)], white);
  for (const z of [-.9, .9]) strip(highShell, white, HW / 2 + .06, 1.4, z, .14, 2.8, .14); // portal on +X
  strip(highShell, white, HW / 2 + .06, 2.85, 0, .14, .14, 2); strip(highShell, light, HW / 2 + .1, 2.72, 0, .05, .06, 1.7);
  const lx = 1, lz = -3.6; // lift tube beside the -Z face (screen-right at H), 1.6 x 1.6
  shaft(highShell, lx, lz, TOP, HF, .8, true);
  // Crown: white cap (radius 3.4) overhanging the shaft with a glowing amber edge ring, parapet and roof garden.
  arc(highShell, 0, 3.4, .6, [0, TOP, 0], white);
  arc(highShell, 3, 3.4, .5, [0, TOP + .6, 0], white);
  arc(roofGarden, 0, 3, .2, [0, TOP + .6, 0], leaf);
  shrubs(roofGarden, 2.4, TOP + .8, 0, Math.PI * 2, 14);
  shrubs(roofGarden, 1.2, TOP + .8, 0, Math.PI * 2, 8);
  for (let i = 0; i < 6; i++) tree(roofGarden, Math.cos(.4 + i * 1.05) * 1.9, TOP + .8, Math.sin(.4 + i * 1.05) * 1.9, .95);
  tree(roofGarden, 0, TOP + .8, 0, 1);
  // Base: ring of trees, hedged beds, planters, benches, residents.
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + .2, r = 4.8; if (Math.cos(a) > .35) continue; tree(dressing, Math.cos(a) * r, 0, Math.sin(a) * r * .95, .55 + (i % 3) * .08); }
  for (const [x, z, w, d] of [[0, 4.1, HW + 1.2, .5], [-3.6, 0, .5, HW], [0, -4.6, HW + 1.2, .5], [3.7, 3.2, .5, 1.6], [3.7, -3.7, .5, 1.6]]) { strip(dressing, leaf, x, .17, z, w, .34, d); for (let k = -2; k <= 2; k++) bush(dressing, x + (w > d ? k * w / 5 : 0), .3, z + (w > d ? 0 : k * d / 5), .24); }
  planter(dressing, 3.7, 0, 1.9, .8, 1.2);
  for (const z of [1.8, 3.7]) bench(dressing, 4.7, z, Math.PI / 2);
  for (const [x, z] of [[5.5, -3.4], [5.9, -1.4], [5.9, .6], [5.6, 2.8], [5.2, 4.6], [4.4, -4.7]]) tree(dressing, x, 0, z, .9);
  dressing.add(...bake(dressing));
  highShell.add(...bake(highShell));
  roofGarden.add(...bake(roofGarden));
  highPeople.push([4.7, 0, 1.5, true, Math.PI / 2], [4.7, 0, 2.1, true, Math.PI / 2], [4.7, 0, 3.4, true, Math.PI / 2], [4.7, 0, 4, true, Math.PI / 2], [5.3, 0, -1.0], [3.4, 0, .1], [5.2, 0, 1.0], [4.0, 0, -3.4], [5.0, 0, 3.1], [3.2, 0, 3.4]);
  dressing.add(crowd(highPeople));
  towerUpper.add(highShell, dressing, roofGarden);
  const meterRing = ring(3.4, .25, [[0, TOP + .7, 0]]);
  towerUpper.add(meterRing);

  // Cabins: the static mid-height one and the animated one; each keeps its procedural body (`proc`) until the kit cabin replaces it.
  const lift = (name: string, y: number) => {
    const group = new T.Group(), proc = new T.Group();
    group.name = name;
    group.position.set(lx, y, lz);
    cabinParts(proc, 1, 2);
    proc.add(...bake(proc));
    group.add(proc);
    towerUpper.add(group);
    return { group, proc };
  };
  const midCabin = lift('tower-mid-cabin', 17);
  const liftCabin = lift('tower-elevator-cabin', CABIN_LOW);
  const elevator = liftCabin.group;

  const lowModules = [...spots, [-3, -6.2, 0] as [number, number, number]].map(([x, z, r], i) => addModule(pavilions, `tower-function-low-${i + 1}`, x, 0, z, 0, g => { const [a, b] = uv(.1 * r, .8 * r); return fitout(g, a, i < 5 ? .12 : .06, b); }));

  // Mixed court: two glazed wings under hovering discs and the bridge (shifted toward +X/+Z so a forecourt shows in front at L), plus the forecourt, only while mixed shows.
  const court = new T.Group();
  court.name = 'tower-mixed-court';
  neutralPropsLayer.group.add(court);
  const mv = new T.Group();
  mv.position.set(1.2, 0, 1.6);
  court.add(mv);
  const wingPeople: P[] = [];
  const W1: [number, number] = [3, -4.6], W2: [number, number] = [-4.95, 2.6];
  glazed(mv, W1[0], 0, W1[1], 4.6, 3.2, 2.2, { columns: true, roof: true, solidEnds: 'x' });
  glazed(mv, W2[0], 0, W2[1], 3.2, 5, 2.2, { columns: true, roof: true, solidEnds: 'z' });
  wingPeople.push(...furnish(mv, 2, 2.9, W1[0] - 1, SL, W1[1]), ...furnish(mv, 1, 2.9, W1[0] + 1, SL, W1[1]), ...furnish(mv, 5, 2.9, W2[0], SL, W2[1] - 1.2), ...furnish(mv, 2, 2.9, W2[0], SL, W2[1] + 1.2));
  emitter(mv, W1[0], 2.4, W1[1], 2);
  emitter(mv, W2[0], 2.4, W2[1], 2);
  // Bridge (L-shaped, y 2.3..2.5) from the wing-1 roof to the wing-2 roof, in front of the tower.
  strip(mv, white, -1.6, 2.4, -5, 5, .2, 1.2); strip(mv, white, -4.2, 2.4, -2.2, 1.2, .2, 5.6);
  strip(mv, amber, -1.6, 2.51, -5, 5, .02, .08); strip(mv, amber, -4.2, 2.51, -2.2, .08, .02, 5.6);
  strip(mv, pane, -1.6, 2.75, -5.6, 5, .5, .02); strip(mv, pane, -4.8, 2.75, -2.2, .02, .5, 5.6);
  // Forecourt in the band in front of the wings: planters, three white benches with seated pairs, standing residents.
  for (const [x, z] of [[-4.8, -1.8], [-1.9, -4.5]]) planter(court, x, 0, z, 1.6, .7);
  const courtBenches: [number, number][] = [[-1, -6.3], [-3.6, -6.3], [-5.8, -4.2]];
  for (const [x, z] of courtBenches) bench(court, x, z, 0);
  for (const [x, z, k] of [[6.1, -6.1, .5], [6.2, -.4, .5], [6.2, 5, .5], [-.4, 6.2, .5], [-6.1, 6.1, .5], [-6.1, -6.1, .5], [1.6, 6.3, .45]]) tree(court, x, 0, z, k);
  court.add(...bake(court));
  mv.add(crowd(wingPeople));
  court.add(crowd([...courtBenches.flatMap(([x, z]): P[] => [[x - .3, 0, z, true, FACE_CAM], [x + .3, 0, z, true, FACE_CAM]]),
    [-2.2, 0, -5.4], [-.2, 0, -5.9], [-4.6, 0, -5.0], [-6.0, 0, -2.4], [-3.2, 0, -2.2], [-2.6, 0, -3.2], [.5, 0, -5.3], [-5.5, 0, -.3], [-4.0, 0, -3.6], [-6.2, 0, -5.4]]));
  const mixedModules = [0, 1, 2, 3, 4, 5].map(k => addModule(neutralPropsLayer.group, `tower-function-mixed-${k + 1}`, MX + 1.6, k * FH, MZ + 1.6, 0, g => fitout(g, 1.2, SL, -1.1)));

  const highModulePool = [1, 3, 5, 7, 9, 11].map((f, i) => { // like addModule, but the procedural fit-out stays swappable (`proc`)
    const group = new T.Group(), proc = new T.Group();
    group.name = `tower-function-high-${i + 1}`;
    group.position.set(0, LOBBY + f * HF, 0);
    towerUpper.add(group);
    const extra = fitout(proc, 1.5, SL, -1.6);
    proc.add(...bake(proc), extra);
    group.add(proc);
    group.scale.setScalar(HIDDEN);
    group.visible = false;
    return { group, proc };
  });
  const highModules = highModulePool.map(module => module.group);

  if (assets) {
    towerUpperLayer.setPreparation(async () => {
      const glb = await assets.cloneRoot('concentration-tower-high', 'centerGaiRear', 'towerUpper');
      const kit = await loadPropKit(assets); // sequential: a load that never resolves must not start the kit
      remapCityMaterials(glb, { se_white: white, se_amber: amber, se_room: room, se_cream: cream, se_ceiling: ceilingHigh, se_light: light, se_glass: paneHigh, se_lift_glass: liftGlass, se_paving: paving });
      const place = (spec: TowerKit, parent: T.Object3D, name: string) => {
        const group = instanceProps(kit, spec.props, UNITS_PER_METRE);
        group.name = name;
        group.add(crowd(spec.people));
        parent.add(group);
      };
      towerUpper.remove(highShell, dressing);
      roofGarden.visible = false;
      towerUpper.add(glb);
      const furniture: TowerKit = { props: [], people: [] };
      for (const spec of [lobbyKit(), ...Array.from({ length: 13 }, (_, i) => floorKit(i)), forecourtKit(), roofKit()]) { furniture.props.push(...spec.props); furniture.people.push(...spec.people); }
      place(furniture, towerUpper, 'tower-high-kit');
      const soil = new T.Group();
      arc(soil, 0, 3.4, .1, [0, TOP + .7, 0], leaf);
      towerUpper.add(...bake(soil));
      for (const [i, module] of highModulePool.entries()) { module.proc.visible = false; place(moduleKit(i), module.group, 'tower-high-module-kit'); }
      for (const cabinGroup of [midCabin, liftCabin]) {
        cabinGroup.proc.visible = false;
        const spec: TowerKit = { props: [{ name: 'lift_cabin', position: [0, 0, 0], yaw: Math.PI / 2, scale: 1.2 / (2 * UNITS_PER_METRE) }], people: [[0, .08, 0, false, Math.PI / 2]] };
        place(spec, cabinGroup.group, 'tower-cabin-kit');
      }
      towerUpper.remove(meterRing); // the Meter ring moves onto the GLB cap rim: y TOP + .35, radius 3.7, tube .3
      towerUpper.add(ring(3.7, .3, [[0, TOP + .35, 0]], 96, 12));
    });
    void towerUpperLayer.prepare(); // load now, so the first 3 s rise already shows the GLB
  }

  const concentrationTower = new ConcentrationTowerController({ base, pavilions, elevator, lowModules, mixedModules, highModules });
  return {
    id: 'centerGaiRear', root,
    layers: { towerBase: towerBaseLayer, towerUpper: towerUpperLayer, towerNeutralProps: neutralPropsLayer },
    marker: createGuestMarker(root, 'se'),
    concentrationTower, concentrationDistrict: new ConcentrationDistrict(scene),
  };
}
