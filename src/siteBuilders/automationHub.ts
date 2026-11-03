import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AutomationDistrict, automationBlue } from '../districtMeters.ts';
import { arc, bake, box, cream, futureLight, teal, warm, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import type { SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import type { Band } from '../surveyView.ts';
import { conversationPose, pedestrians, serviceDrones, servicePose } from '../mobility.ts';
import { slat, tree } from './concentrationTower.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, prefersReducedMotion, SITE_TRANSITION_SECONDS, type BuiltSite } from './siteRuntime.ts';

// Pure white structure: the shared `trim` (#eee9df, metallic) reads beige in shade, which the rubric's fl-material rejects.
const white = new T.MeshStandardMaterial({ color: '#f8f9fb', roughness: .42, metalness: .08 });
const HIDDEN = 1e-3;
const PT = 1.2; // plinth top: every state group stands on it
const DRONE = .75 / 3; // parked drone ~3 m across (the district mesh is 4 m at scale 1)
// Target-size scale of each state's stage content (owner 2026-11-03): residents and positions follow it, so people read like the targets'.
const SCALE: Record<Band, number> = { low: 2, mixed: 1.2, high: 1 };
export const FOLK: Record<Band, number> = { low: 2.6, mixed: 1.6, high: 1 }; // residents' size per state (people read at the targets' size, larger than their stage's scale)
// Resident bounds per state on its plinth (stage units): the low plinth is the grown one, mixed and high stand on the shared 9.6 x 9.4.
// The mixed and high states stand on the shared 9.6 x 9.4 plinth; their amber outline is this lot (the low plinth fills the `changeSites.nw` lot).
export const SHARED_LOT = { w: 8, d: 8 };
export const HUB_PLINTH: Record<Band, { x: number; z: number }> = { low: { x: 12, z: 8 }, mixed: { x: 4.8, z: 4.7 }, high: { x: 4.8, z: 4.7 } };
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const beam = new T.MeshBasicMaterial({ color: '#9fe8ff', transparent: true, opacity: .28, blending: T.AdditiveBlending, depthWrite: false });
const glow = new T.MeshBasicMaterial({ color: new T.Color('#b8f2ff').multiplyScalar(2.5), toneMapped: false });
const halo = new T.MeshBasicMaterial({ color: '#7fe3ff', transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false });
// Honest port count per band (the Meter maps 0 / 3 / 6): how many service points are self-service in that state, and how many are staffed.
const PORTS: Record<Band, number> = { low: 0, mixed: 3, high: 6 };

export interface AutomationHubTarget {
  readonly band: Band;
  readonly automatedPorts: number;
}

export interface AutomationHubDiagnostics {
  readonly band: Band;
  readonly targetAutomatedPorts: number;
  readonly visibleAutomatedPorts: number;
  readonly targetHumanCounters: number;
  readonly visibleHumanCounters: number;
}

export interface AutomationHubRuntime {
  setTarget(target: AutomationHubTarget, now: number, immediate: boolean, sampleAt?: number): boolean;
  update(now: number): void;
  restoreLegacy(): void;
  getDiagnostics(): AutomationHubDiagnostics;
}

export type AutomationHubBuiltSite = BuiltSite & { readonly automationHub: AutomationHubRuntime };

/** One animated piece of a band's state: it appears at `at` (0 first .. 1 last) while building up and in reverse order while coming down. */
type Part = { readonly band: Band; readonly at: number; readonly span: number; readonly apply: (level: number) => void; level: number; from: number; to: number };
/** A resident of a state, in stage coordinates (stage +Z is the camera-facing front). `use` walks to a self-service terminal and back. */
type Actor = { x: number; z: number; yaw: number; seated?: boolean; talk?: [number, number, number]; use?: { to: [number, number]; yaw: number } };

function createAutomationHubRuntime(parts: Part[], lead: Record<Band, Part>, frame: (now: number) => void, legacyBand: () => Band): AutomationHubRuntime {
  let target: AutomationHubTarget = { band: 'mixed', automatedPorts: 3 };
  let applied = false;
  let exhibition = false; // legacy v1 never calls setTarget: its tall variant shows hubUpper, which then means the high spire
  let active = false;
  let start = 0;
  const write = () => { for (const part of parts) part.apply(part.level); };
  const settle = (band: Band) => {
    for (const part of parts) part.level = part.from = part.to = part.band === band ? 1 : 0;
    active = false;
    write();
    frame(start);
  };
  const retarget = (band: Band) => { for (const part of parts) { part.from = part.level; part.to = part.band === band ? 1 : 0; } };

  settle('mixed');
  return {
    setTarget(next, now, immediate, sampleAt = now) {
      this.update(sampleAt);
      const changed = !applied || next.band !== target.band || next.automatedPorts !== target.automatedPorts;
      target = next;
      applied = true;
      exhibition = true;
      if (!changed && !immediate) return false;
      retarget(next.band);
      start = now;
      if (immediate) settle(next.band);
      else active = true;
      return changed;
    },
    update(now) {
      if (!exhibition && lead[legacyBand()].level < 1) settle(legacyBand());
      if (active) {
        const raw = clamp01((now - start) / SITE_TRANSITION_SECONDS);
        // Floors stack up bottom-first while a state builds and come down top-first, each over `span` of the 3 s.
        for (const part of parts) {
          const begin = (part.to > part.from ? part.at : 1 - part.at) * (1 - part.span);
          part.level = part.from + (part.to - part.from) * smoothstep(clamp01((raw - begin) / part.span));
        }
        active = raw < 1;
        write();
      }
      frame(now);
    },
    restoreLegacy() {
      target = { band: 'mixed', automatedPorts: 3 };
      applied = false;
      exhibition = false;
      settle('mixed');
    },
    getDiagnostics() {
      const visible = (ports: (band: Band) => number) => Math.round((['low', 'mixed', 'high'] as const).reduce((sum, band) => sum + (lead[band].level > HIDDEN ? lead[band].level * ports(band) : 0), 0));
      return {
        band: target.band,
        targetAutomatedPorts: target.automatedPorts,
        visibleAutomatedPorts: visible(band => PORTS[band]),
        targetHumanCounters: 6 - target.automatedPorts,
        visibleHumanCounters: visible(band => 6 - PORTS[band]),
      };
    },
  };
}

const cyl = (parent: T.Object3D, r0: number, r1: number, h: number, y: number, material: T.Material, x = 0, z = 0) => {
  const mesh = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 40), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};
const torus = (parent: T.Object3D, r: number, tube: number, y: number, material: T.Material) => {
  const mesh = new T.Mesh(new T.TorusGeometry(r, tube, 8, 48).rotateX(Math.PI / 2), material);
  mesh.position.y = y;
  mesh.castShadow = true;
  parent.add(mesh);
};
const bench = (parent: T.Object3D, x: number, z: number) => {
  box(parent, [1.1, .08, .3], [x, .17, z], white, .02);
  for (const s of [-.45, .45]) box(parent, [.06, .15, .26], [x + s, .075, z], white, .01);
};
const counter = (parent: T.Object3D, x: number, z: number) => {
  box(parent, [.82, .4, .4], [x, .2, z], white, .04);
  box(parent, [.46, .26, .04], [x, .53, z - .05], futureLight, .01);
};
const chair = (parent: T.Object3D, x: number, z: number) => box(parent, [.3, .17, .3], [x, .085, z], white, .02);
/** Self-service terminal facing local +Z: housing on a white post with a cool screen. */
function terminal(parent: T.Object3D, x: number, z: number, yaw = 0) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  parent.add(group);
  box(group, [.12, .3, .12], [0, .15, 0], white, .02);
  box(group, [.44, .3, .08], [0, .45, 0], white, .02);
  box(group, [.36, .22, .03], [0, .45, .05], futureLight, .01);
}

/** Open hall: warm lit interior (floor and back wall), solid white sides, back and fascia, camera face (+Z) open between white mullions and a transom. */
function hall(group: T.Group, w: number, zBack: number, zFront: number, bays: number, h = 3.6, front = .4, glass = 2.25) {
  const d = zFront - zBack, zc = (zBack + zFront) / 2;
  box(group, [w - .3, .01, d - .3], [0, .005, zc], warm, .004);
  box(group, [w - .3, glass - .05, .06], [0, glass / 2 + .025, zBack + .23], warm, .01);
  box(group, [w, h, .2], [0, h / 2, zBack + .1], white, .04);
  for (const s of [-1, 1]) box(group, [.2, h, d], [s * (w / 2 - .1), h / 2, zc], white, .04);
  box(group, [w, h - glass, .2], [0, (h + glass) / 2, zFront - .1], white, .04);
  box(group, [w, .1, .14], [0, glass, zFront - .03], white, .02);
  for (let k = 0; k <= bays; k++) slat(group, [.08, glass, .1], [-w / 2 + k * w / bays, glass / 2, zFront - .02], white);
  box(group, [w + .8, .35, d + .4 + front], [0, h + .175, zc + (front - .4) / 2], white, .06);
  for (const s of [-1, 1]) box(group, [.04, .05, d - .5], [s * (w / 2 + .01), 2.45, zc], automationBlue, .01);
  box(group, [w - .5, .05, .04], [0, 2.45, zBack - .01], automationBlue, .01);
}

/** Flat ring around the core: stack of `count` instances scaled in one by one; optional service arms (+ parcels) on every 2nd ring. */
class RingStack {
  readonly meshes: T.InstancedMesh[];
  readonly levels: number[];
  private readonly rings: T.InstancedMesh;
  private readonly seams: T.InstancedMesh;
  private readonly arms?: T.InstancedMesh;
  private readonly parcels?: T.InstancedMesh;
  private readonly armOf: (number | undefined)[];
  private readonly ys: number[];
  private readonly armAngles: (number | undefined)[];

  constructor(parent: T.Object3D, name: string, ring: T.BufferGeometry, seam: T.BufferGeometry, ys: number[],
    armGeometry?: T.BufferGeometry, parcelGeometry?: T.BufferGeometry, armAngles: (number | undefined)[] = []) {
    this.ys = ys;
    this.armAngles = armAngles;
    this.levels = ys.map(() => 0);
    this.rings = new T.InstancedMesh(ring, white, ys.length);
    this.seams = new T.InstancedMesh(seam, automationBlue, ys.length);
    const armed = armAngles.filter(angle => angle !== undefined).length;
    this.armOf = armAngles.map((angle, i) => angle === undefined ? undefined : armAngles.slice(0, i).filter(a => a !== undefined).length);
    this.meshes = [this.rings, this.seams];
    if (armGeometry && parcelGeometry && armed) {
      this.arms = new T.InstancedMesh(armGeometry, white, armed);
      this.parcels = new T.InstancedMesh(parcelGeometry, cream, armed);
      this.meshes.push(this.arms, this.parcels);
    }
    this.meshes.forEach(mesh => { mesh.name = name; mesh.castShadow = true; mesh.visible = false; parent.add(mesh); });
    this.commit();
  }

  /** Rings rise a little as they scale in, so each floor slides up its core. */
  y(i: number) { return this.ys[i] - (1 - this.levels[i]) * 1.5; }

  commit() {
    const m = new T.Matrix4(), armed = new T.Matrix4(), turn = new T.Matrix4();
    this.ys.forEach((_, i) => {
      const l = Math.max(HIDDEN, this.levels[i]);
      m.makeScale(l, l, l).setPosition(0, this.y(i), 0);
      this.rings.setMatrixAt(i, m);
      this.seams.setMatrixAt(i, m);
      const k = this.armOf[i];
      if (k !== undefined) {
        armed.copy(m).multiply(turn.makeRotationY(this.armAngles[i]!));
        this.arms!.setMatrixAt(k, armed);
        this.parcels!.setMatrixAt(k, armed);
      }
    });
    const visible = this.levels.some(level => level > HIDDEN);
    for (const mesh of this.meshes) { mesh.visible = visible; mesh.instanceMatrix.needsUpdate = true; }
  }
}

/** Extruded annulus resting on y (a standalone geometry for instancing). */
const ringGeo = (inner: number, outer: number, height: number, y: number) => arc(new T.Group(), inner, outer, height, [0, 0, 0], white).geometry.translate(0, y, 0);
const geo = (geometry: T.BufferGeometry, at: [number, number, number], rotateZ = 0) => geometry.rotateZ(rotateZ).translate(...at);
/** Service arm in ring space (ring outer radius 3, top at .475): base post, shoulder ball, segment up-and-out, elbow ball, segment back down, wrist ball and a gripper. */
const armGeometry = () => mergeGeometries([
  geo(new T.CylinderGeometry(.3, .36, .45, 12), [2.65, .7, 0]),
  geo(new T.SphereGeometry(.26, 10, 8), [2.63, .66, 0]),
  geo(new T.BoxGeometry(2.2, .28, .28), [3.4, 1.45, 0], .8),
  geo(new T.SphereGeometry(.24, 10, 8), [4.17, 2.24, 0]),
  geo(new T.BoxGeometry(1.7, .22, .22), [4.76, 1.63, 0], -.8),
  geo(new T.SphereGeometry(.17, 10, 8), [5.35, 1.02, 0]),
  geo(new T.BoxGeometry(.2, .28, .7), [5.35, .86, 0]),
].map(g => g.index ? g.toNonIndexed() : g))!;
const parcelGeometry = () => new T.BoxGeometry(.6, .5, .55).translate(5.35, .45, 0);

export function buildAutomationHub(scene: T.Scene, _kit: Kit, _assets: SiteAssetLoaderCache): AutomationHubBuiltSite {
  const root = createSiteRoot(scene, 'nw');
  const hubBaseLayer = createSiteLayer(root, siteLayerDefinition('magnetEast', 'hubBase'));
  const hubUpperLayer = createSiteLayer(root, siteLayerDefinition('magnetEast', 'hubUpper'));
  const neutralPropsLayer = createSiteLayer(root, siteLayerDefinition('magnetEast', 'hubNeutralProps'));
  const hubBase = hubBaseLayer.group;
  // The composition is authored with its front on +Z and turned a quarter so that front faces the +X focal camera.
  const stage = new T.Group();
  stage.name = 'hub-stage';
  stage.rotation.y = Math.PI / 2;
  hubBase.add(stage);

  const plinth = new T.Group();
  plinth.name = 'hub-plinth';
  box(plinth, [9.6, .8, 9.4], [0, .8, 0], white, .05);
  stage.add(plinth);
  plinth.add(...bake(plinth));

  const parts: Part[] = [];
  const lead = {} as Record<Band, Part>;
  const addPart = (band: Band, at: number, span: number, apply: (level: number) => void, leader = false) => {
    const level = band === 'mixed' ? 1 : 0;
    const part: Part = { band, at, span, apply, level, from: level, to: level };
    parts.push(part);
    if (leader) lead[band] = part;
    return part;
  };
  /** A baked, static group on the plinth that grows from its origin (`axis`: y only, or all three). */
  const stateGroup = (name: string, band: Band, y: number, at: number, span: number, build: (g: T.Group) => void, uniform = false, leader = false) => {
    const group = new T.Group();
    group.name = name;
    group.position.y = PT + y;
    stage.add(group);
    build(group);
    group.add(...bake(group));
    group.visible = false;
    addPart(band, at, span, level => {
      group.visible = level > HIDDEN;
      group.scale.set(uniform ? Math.max(HIDDEN, level) : 1, Math.max(HIDDEN, level), uniform ? Math.max(HIDDEN, level) : 1);
    }, leader);
    return group;
  };
  const rel = new T.Group();
  rel.position.y = PT;
  stage.add(rel);

  // -1 low: open civic service hall under a hovering canopy; the whole group stands at target size (x2) on a grown plinth.
  const actors: Record<Band, Actor[]> = { low: [], mixed: [], high: [] };
  const people = (band: Band, list: Actor[]) => actors[band].push(...list);
  const talkers = (band: Band, g: number, cx: number, cz: number, n: number) => people(band, Array.from({ length: n }, (_, j) => {
    const a = j * Math.PI * 2 / n + g;
    return { x: cx + Math.sin(a) * .45, z: cz + Math.cos(a) * .45, yaw: a + Math.PI, talk: [100 + g, j, n] as [number, number, number] };
  }));
  const seatedPair = (band: Band, x: number, z: number) => people(band, [{ x: x - .25, z, yaw: 0, seated: true }, { x: x + .25, z, yaw: 0, seated: true }]);
  const scaled = (g: T.Group, band: Band) => { const k = new T.Group(); k.scale.setScalar(SCALE[band]); g.add(k); return k; };
  const K = SCALE.low, M = SCALE.mixed;
  const LOW_W = 10.6, LOW_SHIFT = .25, // the hall stands right of the lot centre (screen right, as in the target)
   LOW_H = 4.8, LOW_ZB = -3.4, LOW_ZF = 1, LOW_FRONT = 2, LOW_ZC = (LOW_ZB + LOW_ZF) / 2, LOW_ROOF = LOW_H + .35;
  const lowK = (i: number) => -LOW_W / 2 + (i + .5) * LOW_W / 6, lowX = (i: number) => lowK(i) + LOW_SHIFT; // in the shifted group / in stage design units
  stateGroup('hub-state-low', 'low', 0, 0, 1, g => {
    box(g, [HUB_PLINTH.low.x * 2, .8, HUB_PLINTH.low.z * 2], [0, -.4, 0], white, .05);
    const k = scaled(g, 'low');
    k.position.x = LOW_SHIFT * K;
    hall(k, LOW_W, LOW_ZB, LOW_ZF, 6, LOW_H, LOW_FRONT, 3.8);
    arc(k, 0, 3.2, .05, [0, LOW_ROOF, LOW_ZC + (LOW_FRONT - .4) / 2], white);
    for (let i = 0; i < 6; i++) { counter(k, lowK(i), .12); chair(k, lowK(i), .62); }
    bench(k, -3.4, 3.4); bench(k, -.4, 3.45); bench(k, 2.4, 3.5);
    tree(k, -4.6, 0, 2.1, .6); tree(k, 4.7, 0, 1.9, .6);
  }, false, true);
  for (let i = 0; i < 6; i++) people('low', [{ x: lowX(i), z: -.4, yaw: 0, talk: [i, 0, 2] }, { x: lowX(i), z: .62, yaw: Math.PI, seated: true, talk: [i, 1, 2] }]);
  talkers('low', 0, -2.2 + LOW_SHIFT, 2.4, 3); talkers('low', 1, .6 + LOW_SHIFT, 2.2, 3); talkers('low', 2, 3.4 + LOW_SHIFT, 2.9, 3);
  seatedPair('low', -3.4 + LOW_SHIFT, 3.4);

  // Hovering canopy: the technology signature. Its own group, so it can bob and ride the hall roof up and down.
  const canopy = new T.Group();
  canopy.name = 'hub-canopy';
  const lens = new T.Mesh(new T.LatheGeometry([[0, -.5], [1.6, -.5], [3.4, -.38], [4.7, -.12], [5.2, 0], [4.7, .14], [3.4, .45], [1.7, .8], [0, .9]].map(([r, y]) => new T.Vector2(r, y)), 64), white);
  lens.castShadow = true;
  canopy.add(lens);
  torus(canopy, 5.2, .09, 0, automationBlue);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 3.4, z = Math.sin(a) * 3.4;
    cyl(canopy, .65, .65, .06, -.55, glow, x, z);
    cyl(canopy, .95, .95, .01, -.6, halo, x, z);
    const cone = new T.Mesh(new T.CylinderGeometry(.15, .75, 1.1, 16, 1, true), beam);
    cone.position.set(x, -1.15, z);
    canopy.add(cone);
  }
  canopy.add(...bake(canopy));
  canopy.visible = false;
  stage.add(canopy);
  const CANOPY_ROOF_Z = (LOW_ZC + (LOW_FRONT - .4) / 2) * K;
  const CANOPY_RIDE = K * (LOW_ROOF + 1.2) + K * .5;

  // 0 mixed: compact hall (staffed counters left, self-service right) with an automated service column.
  const MIX_W = 7, MIX_H = 4.4, MIX_ZB = -3.4, MIX_ZF = 1, MIX_ZC = (MIX_ZB + MIX_ZF) / 2 * M, MIX_ROOF = (MIX_H + .35) * M;
  const mixX = (k: number) => -MIX_W / 2 + (k + .5) * MIX_W / 6;
  stateGroup('hub-state-mixed', 'mixed', 0, 0, .5, g => {
    const k = scaled(g, 'mixed');
    hall(k, MIX_W, MIX_ZB, MIX_ZF, 6, MIX_H, .4, 3.4);
    for (let i = 0; i < 3; i++) { counter(k, mixX(i), .12); chair(k, mixX(i), .62); terminal(k, mixX(i + 3), .3); }
    bench(k, -3, 3.3);
    tree(k, 3.6, 0, 2.4, .6); tree(k, -3.6, 0, 2.5, .6);
  }, false, true);
  for (let k = 0; k < 3; k++) people('mixed', [{ x: mixX(k), z: -.4, yaw: 0, talk: [20 + k, 0, 2] }, { x: mixX(k), z: .62, yaw: Math.PI, seated: true, talk: [20 + k, 1, 2] }]);
  people('mixed', [{ x: mixX(3), z: .72, yaw: Math.PI }, { x: mixX(5), z: .72, yaw: Math.PI }]);
  talkers('mixed', 3, 1, 2.6, 3); talkers('mixed', 4, -.8, 3, 2);
  seatedPair('mixed', -3, 3.3);

  const SPIRE_BASE = 3, SPIRE_TOP = 36, RINGS = 18;
  const COLUMN_TOP = SPIRE_TOP + 1, COLUMN_R = 1.6;
  stateGroup('hub-state-mixed-column', 'mixed', MIX_ROOF, .5, .5, g => {
    const h = COLUMN_TOP - MIX_ROOF;
    cyl(g, COLUMN_R, COLUMN_R, h, h / 2 - .05, white, 0, MIX_ZC);
    for (let y = 2; y < h - 1; y += 2) cyl(g, COLUMN_R + .04, COLUMN_R + .04, .08, y, teal, 0, MIX_ZC); // panel joints
    cyl(g, 2.1, 2.1, .6, 14 - MIX_ROOF, white, 0, MIX_ZC);
    cyl(g, 2.14, 2.14, .14, 14 - MIX_ROOF, automationBlue, 0, MIX_ZC);
    for (const a of [.6, -.6]) box(g, [.1, h - .6, .08], [Math.sin(a) * (COLUMN_R + .03), h / 2, MIX_ZC + Math.cos(a) * (COLUMN_R + .03)], automationBlue, .01).rotation.y = a;
    cyl(g, 2.1, COLUMN_R, .5, h - .2, white, 0, MIX_ZC);
  });
  const ringGroup = new T.Group();
  rel.add(ringGroup);
  ringGroup.position.z = MIX_ZC;
  const MIX_RING = 3;
  const dockRing = new T.TorusGeometry(MIX_RING, .42, 10, 48).rotateX(Math.PI / 2);
  const struts = [0, 1, 2, 3].map(k => new T.BoxGeometry(MIX_RING - COLUMN_R, .2, .24).translate((MIX_RING + COLUMN_R) / 2, 0, 0).rotateY(k * Math.PI / 2));
  const mixedRingGeometry = mergeGeometries([dockRing, ...struts].map(g => g.index ? g.toNonIndexed() : g))!;
  const mixedRings = new RingStack(ringGroup, 'hub-mixed-rings', mixedRingGeometry, new T.TorusGeometry(MIX_RING + .4, .1, 6, 56).rotateX(Math.PI / 2).translate(0, .05, 0), [28.5, 32, 35.5]);
  [0, 1, 2].forEach(i => addPart('mixed', .7 + i * .12, .3, level => { mixedRings.levels[i] = level; if (i === 2) mixedRings.commit(); }));

  // Robotic arm on the hall roof: base, shoulder ball, two segments, wrist and gripper over the counters, lifting and lowering a parcel.
  const arm = new T.Group();
  arm.name = 'hub-roof-arm';
  arm.position.set(1.2, PT + MIX_ROOF, .8);
  cyl(arm, .65, .7, .15, .075, white);
  cyl(arm, .34, .34, .8, .4, teal);
  arm.add(...bake(arm));
  const reach = new T.Group(); // turned so the arm points over the counters (-X)
  reach.rotation.y = Math.PI;
  const shoulder = new T.Group();
  shoulder.position.y = .8;
  const pivot = new T.Group();
  const ball = (parent: T.Object3D, r: number, x: number) => { const m = new T.Mesh(new T.SphereGeometry(r, 12, 8), teal); m.position.x = x; parent.add(m); };
  ball(pivot, .32, 0);
  box(pivot, [2.2, .36, .36], [1.1, 0, 0], white, .05);
  ball(pivot, .28, 2.2);
  const elbow = new T.Group();
  elbow.position.set(2.2, 0, 0);
  elbow.rotation.z = -1;
  box(elbow, [1.8, .3, .3], [.9, 0, 0], white, .05);
  ball(elbow, .2, 1.8);
  for (const z of [-.26, .26]) box(elbow, [.08, .4, .08], [1.95, -.15, z], white, .01);
  box(elbow, [.2, .08, .66], [1.95, .06, 0], white, .01);
  box(elbow, [.46, .4, .46], [1.95, -.15, 0], cream, .04);
  pivot.add(elbow);
  pivot.add(...bake(pivot));
  shoulder.add(pivot);
  reach.add(shoulder);
  arm.add(reach);
  arm.visible = false;
  stage.add(arm);
  addPart('mixed', .5, .4, level => { arm.visible = level > HIDDEN; arm.scale.setScalar(Math.max(HIDDEN, level) * 1.3); });

  // +1 high: autonomous service spire — a drum with a pod portal and terminals, a tall core, stacked docking rings, a capped crown.
  const DRUM = 3.25, TERMINAL_R = 3.7;
  const terminalAt = [-1, -.55, .55, 1].map(a => ({ a, x: Math.sin(a) * TERMINAL_R, z: Math.cos(a) * TERMINAL_R }));
  stateGroup('hub-state-high', 'high', 0, 0, .35, g => {
    cyl(g, DRUM, DRUM, SPIRE_BASE, SPIRE_BASE / 2, white);
    cyl(g, DRUM + .1, DRUM + .1, .15, SPIRE_BASE, white);
    // Arched portal with a maglev pod stub half inside: cyan backing, white frame, white capsule with a lit nose.
    const portal = new T.Group();
    portal.position.set(0, .9, DRUM - .08);
    portal.rotation.x = Math.PI / 2;
    arc(portal, .8, 1.05, .22, [0, 0, 0], white, 0, Math.PI);
    g.add(portal);
    for (const x of [-.925, .925]) box(g, [.25, .9, .22], [x, .45, DRUM], white, .02);
    cyl(g, .8, .8, .05, .9, futureLight, 0, DRUM - .1).rotation.x = Math.PI / 2;
    box(g, [1.6, .9, .05], [0, .45, DRUM - .1], futureLight, .01);
    const pod = new T.Mesh(new T.CapsuleGeometry(.4, 1.0, 4, 12).rotateX(Math.PI / 2).scale(.9, 1, 1), white);
    pod.position.set(0, .55, DRUM + .55);
    pod.castShadow = true;
    g.add(pod);
    box(g, [.5, .08, .1], [0, .62, DRUM + 1.42], futureLight, .01);
    for (const { a, x, z } of terminalAt) terminal(g, x, z, a);
  }, true, true);
  const CORE_R = 1.8, CORE_H = SPIRE_TOP - SPIRE_BASE;
  stateGroup('hub-state-high-core', 'high', SPIRE_BASE, .08, .5, g => {
    cyl(g, CORE_R, CORE_R, CORE_H, CORE_H / 2, white);
    for (let y = 1; y < CORE_H; y += 2) cyl(g, CORE_R + .04, CORE_R + .04, .08, y, teal, 0, 0); // panel joints
    for (const a of [.5, -.5]) box(g, [.1, CORE_H - 2, .08], [Math.sin(a) * (CORE_R + .02), CORE_H / 2, Math.cos(a) * (CORE_R + .02)], futureLight, .01).rotation.y = a;
  });
  stateGroup('hub-state-high-cap', 'high', SPIRE_TOP, 1, .3, g => {
    cyl(g, CORE_R, CORE_R, .5, .25, white);
    cyl(g, 1.5, 1.5, .8, .9, white);
    cyl(g, 1, 1, 1.2, 1.9, white);
    for (const x of [-.25, .25]) box(g, [.12, 3, .12], [x, 3.4, -.1], white, .01);
    for (const x of [-.4, .4]) box(g, [.36, .5, .06], [x, 1.1, Math.sqrt(1.5 ** 2 - x * x) - .02], futureLight, .01);
    for (const x of [-.25, .25]) box(g, [.28, .36, .06], [x, 2.1, Math.sqrt(1 - x * x) - .02], futureLight, .01);
  }, true);
  const spireYs = Array.from({ length: RINGS }, (_, i) => 4.4 + i * 30.1 / (RINGS - 1));
  const armAngles = spireYs.map((_, i) => i % 2 ? undefined : (i % 4 ? Math.PI : 0) + [.3, -.35, .2, -.25, .4][i / 2 % 5 | 0]); // pointing to either side of the camera
  const spireRings = new RingStack(rel, 'hub-spire-rings', ringGeo(CORE_R, 3.3, .95, -.475),
    mergeGeometries([ringGeo(3.3, 3.4, .3, -.15), ringGeo(2.7, 2.8, .04, .475)])!,
    spireYs, armGeometry(), parcelGeometry(), armAngles);
  spireYs.forEach((_, i) => addPart('high', .12 + .88 * i / (RINGS - 1), .3, level => { spireRings.levels[i] = level; if (i === RINGS - 1) spireRings.commit(); }));

  // Drones: a shared fleet in stage space (2 parked on the canopy, 6 on the column rings, one pair on each armed spire ring, 18 in three streams).
  const droneSlots = { canopy: 0, column: 2, spire: 8, stream: 8 + armAngles.filter(a => a !== undefined).length * 2, count: 0 };
  droneSlots.count = droneSlots.stream + 18;
  const drones = serviceDrones(stage, droneSlots.count);
  drones.meshes.forEach(mesh => { mesh.name = 'hub-drones'; });
  const dummy = new T.Object3D();
  const place = (slot: number, x: number, y: number, z: number, yaw: number, level: number) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.setScalar(Math.max(HIDDEN, level) * DRONE);
    drones.set(slot, dummy);
  };

  const crowd = pedestrians(stage, 24, 'hub-service-people');
  const pose = new T.Object3D();
  const spireUsers = terminalAt.map(t => ({ x: t.x + Math.sin(t.a) * .45, z: t.z + Math.cos(t.a) * .45 }));
  terminalAt.forEach((t, i) => people('high', [{
    x: spireUsers[i].x + Math.sin(t.a) * .5, z: spireUsers[i].z + Math.cos(t.a) * .5, yaw: t.a + Math.PI,
    use: { to: [spireUsers[i].x, spireUsers[i].z], yaw: t.a + Math.PI },
  }]));
  people('high', [{ x: -2, z: 4, yaw: 1.2, talk: [30, 0, 2] }, { x: -1.7, z: 4.3, yaw: -2, talk: [30, 1, 2] }]);

  // The amber outline hugs the plinth in use: the grown low plinth, or the shared one for mixed and high.
  const marker = createGuestMarker(root, 'nw', SHARED_LOT);
  const lotMarker = createGuestMarker(root, 'nw');
  lotMarker.mesh.removeFromParent();
  const mainOutline = marker.mesh.geometry, lowOutline = lotMarker.mesh.geometry;
  const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const frame = (now: number) => {
    const still = prefersReducedMotion();
    const t = still ? 0 : now;
    const ready = hubBase.visible && hubBase.scale.y > .999;
    // Canopy rides the hall roof and bobs +-.08 over a 6 s period.
    const lowLevel = lead.low.level, bob = still ? 0 : Math.sin(now * Math.PI * 2 / 6) * .08 * lowLevel;
    canopy.visible = lowLevel > HIDDEN;
    canopy.position.set(LOW_SHIFT * K, PT + CANOPY_RIDE * lowLevel + bob, CANOPY_ROOF_Z);
    const grow = Math.max(HIDDEN, smoothstep(clamp01(lowLevel / .35)));
    canopy.scale.setScalar(grow * K);
    for (let i = 0; i < 2; i++) {
      const a = i ? 2.5 : .5;
      place(droneSlots.canopy + i, canopy.position.x + Math.cos(a) * 4.4 * canopy.scale.x, canopy.position.y + .25 * canopy.scale.x, CANOPY_ROOF_Z + Math.sin(a) * 4.4 * canopy.scale.x, a + 1.2, ready ? grow : 0);
    }
    // Docked drones sit on their ring, scaling and lifting with it.
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) {
      const l = mixedRings.levels[i], a = i * 1.3 + k * Math.PI + .6;
      place(droneSlots.column + i * 2 + k, Math.cos(a) * MIX_RING * l, PT + mixedRings.y(i) + .85 * l, MIX_ZC + Math.sin(a) * MIX_RING * l, a + 1.2, ready ? l : 0);
    }
    let dock = 0;
    spireYs.forEach((_, i) => {
      const angle = armAngles[i];
      if (angle === undefined) return;
      const l = spireRings.levels[i];
      for (const k of [-1, 1]) {
        const a = angle + k * 1.25;
        place(droneSlots.spire + dock++, Math.cos(a) * 2.6 * l, PT + spireRings.y(i) + .85 * l, Math.sin(a) * 2.6 * l, a + 1.2, ready ? l : 0);
      }
    });
    // Three V streams spiral into the upper rings (radius 7.8 -> 4.4, 20 s); under reduced motion they park on the rings.
    const high = lead.high.level;
    for (let s = 0; s < 3; s++) for (let j = 0; j < 6; j++) {
      const slot = droneSlots.stream + s * 6 + j;
      if (still) {
        const i = RINGS - 1 - ((s * 6 + j) % RINGS), a = (s * 6 + j) * 2.1 + .5, l = spireRings.levels[i];
        place(slot, Math.cos(a) * 2.5 * l, PT + spireRings.y(i) + .85 * l, Math.sin(a) * 2.5 * l, a + 1.2, ready ? l : 0);
        continue;
      }
      const u = (((now / 20 + j / 6 * .42 + s / 3) % 1) + 1) % 1, a = u * Math.PI * 4 + s * Math.PI * 2 / 3 + j * .12, r = 7.8 - 3.4 * u;
      place(slot, Math.cos(a) * r, PT + 12 + u * 23 + Math.abs(j - 2.5) * .25, Math.sin(a) * r, a + Math.PI / 2, ready ? .7 * high * smoothstep(clamp01(Math.min(u, 1 - u) / .12)) : 0);
    }
    drones.show(ready && (lowLevel > HIDDEN || lead.mixed.level > HIDDEN || high > HIDDEN));
    drones.flush();
    // Arm: lifts and lowers a parcel over the counters, 8 s per cycle.
    shoulder.rotation.z = still ? .75 : .75 + .3 * Math.sin(now * Math.PI * 2 / 8);
    // Residents: only a settled state has people, so changing a state never squashes a visible body.
    const shownProps = ready && neutralPropsLayer.group.visible && neutralPropsLayer.group.scale.y > .999;
    let slot = 0;
    const settledBand = (['low', 'mixed', 'high'] as const).find(band => parts.every(part => part.band === band ? part.level > .999 : part.level < HIDDEN));
    for (const actor of settledBand && shownProps ? actors[settledBand] : []) {
      const S = SCALE[settledBand!];
      let x = actor.x * S, z = actor.z * S, yaw = actor.yaw, walk = 0, phase = 0, gesture = 0;
      if (actor.talk) gesture = conversationPose(now, actor.talk[0] + (actor.talk[0] < 100 ? 3000 : 0), actor.talk[1], actor.talk[2]).gesture;
      if (actor.use) {
        const from: [number, number] = [actor.x, actor.z], length = Math.hypot(actor.use.to[0] - from[0], actor.use.to[1] - from[1]) * 3;
        const w = servicePose(t, slot, length), course = Math.atan2(actor.use.to[0] - from[0], actor.use.to[1] - from[1]) + Math.PI * w.turn;
        x = T.MathUtils.lerp(from[0], actor.use.to[0], w.u) * S;
        z = T.MathUtils.lerp(from[1], actor.use.to[1], w.u) * S;
        yaw = course + wrap(actor.use.yaw - course) * w.dwell;
        walk = w.walking ? .4 : 0;
        phase = w.phase;
        gesture = w.dwell * .65;
      }
      pose.position.set(x, PT, z);
      pose.rotation.set(0, yaw, 0);
      pose.scale.setScalar(FOLK[settledBand!] / root.scale.x);
      crowd.set(slot, pose);
      crowd.gait(slot, phase, walk, actor.seated ? 1 : 0);
      crowd.social(slot, 0, gesture);
      slot++;
    }
    pose.scale.setScalar(HIDDEN / root.scale.x);
    for (; slot < 24; slot++) { crowd.set(slot, pose); crowd.gait(slot, 0, 0); crowd.social(slot, 0, 0); }
    crowd.show(shownProps);
    crowd.flush();
    marker.mesh.geometry = lead.low.level > .5 ? lowOutline : mainOutline;
  };

  const automationHub = createAutomationHubRuntime(parts, lead, frame, () => hubUpperLayer.group.visible ? 'high' : 'mixed');
  const automationDistrict = new AutomationDistrict(scene);
  // The hub's upper layer is procedural and empty: the spire lives in the three state groups the runtime shows per band.
  return { id: 'magnetEast', root, layers: { hubBase: hubBaseLayer, hubUpper: hubUpperLayer, hubNeutralProps: neutralPropsLayer }, marker, automationHub, automationDistrict };
}
