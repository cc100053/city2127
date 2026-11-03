import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AutomationDistrict, automationBlue } from '../districtMeters.ts';
import { arc, bake, box, cream, futureLight, trim, warm, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import type { SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import type { Band } from '../surveyView.ts';
import { conversationPose, pedestrians, serviceDrones, servicePose } from '../mobility.ts';
import { slat, tree } from './concentrationTower.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, prefersReducedMotion, SITE_TRANSITION_SECONDS, type BuiltSite } from './siteRuntime.ts';

const HIDDEN = 1e-3;
const PT = 1.2; // plinth top: every state group stands on it
const DRONE = .7 / 3; // parked drone ~2.8 m across (the district mesh is 4 m at scale 1)
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const beam = new T.MeshBasicMaterial({ color: '#9fe8ff', transparent: true, opacity: .2, blending: T.AdditiveBlending, depthWrite: false });
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
  box(parent, [1.1, .08, .3], [x, .17, z], trim, .02);
  for (const s of [-.45, .45]) box(parent, [.06, .15, .26], [x + s, .075, z], trim, .01);
};
const counter = (parent: T.Object3D, x: number, z: number) => {
  box(parent, [.82, .4, .4], [x, .2, z], cream, .04);
  box(parent, [.46, .26, .04], [x, .53, z - .05], warm, .01);
};
const chair = (parent: T.Object3D, x: number, z: number) => box(parent, [.3, .17, .3], [x, .085, z], trim, .02);
/** Self-service terminal facing local +Z: housing on a trim post with a cool screen. */
function terminal(parent: T.Object3D, x: number, z: number, yaw = 0) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  parent.add(group);
  box(group, [.12, .3, .12], [0, .15, 0], trim, .02);
  box(group, [.44, .3, .08], [0, .45, 0], trim, .02);
  box(group, [.36, .22, .03], [0, .45, .05], futureLight, .01);
}

/** Open hall: warm lit interior (floor and back wall), solid trim sides, back and fascia, camera face (+Z) open between trim mullions and a transom. */
function hall(group: T.Group, w: number, zBack: number, zFront: number, bays: number, h = 3.6) {
  const d = zFront - zBack, zc = (zBack + zFront) / 2, glass = 2.25;
  box(group, [w - .3, .01, d - .3], [0, .005, zc], warm, .004);
  box(group, [w - .3, glass - .05, .06], [0, glass / 2 + .025, zBack + .23], warm, .01);
  box(group, [w, h, .2], [0, h / 2, zBack + .1], trim, .04);
  for (const s of [-1, 1]) box(group, [.2, h, d], [s * (w / 2 - .1), h / 2, zc], trim, .04);
  box(group, [w, h - glass, .2], [0, (h + glass) / 2, zFront - .1], trim, .04);
  box(group, [w, .1, .14], [0, glass, zFront - .03], trim, .02);
  for (let k = 0; k <= bays; k++) slat(group, [.08, glass, .1], [-w / 2 + k * w / bays, glass / 2, zFront - .02], trim);
  box(group, [w + .8, .35, d + .8], [0, h + .175, zc], trim, .06);
  for (const s of [-1, 1]) box(group, [.04, .06, d - .5], [s * (w / 2 + .01), 2.45, zc], futureLight, .01);
  box(group, [w - .5, .06, .04], [0, 2.45, zBack - .01], futureLight, .01);
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
    this.rings = new T.InstancedMesh(ring, trim, ys.length);
    this.seams = new T.InstancedMesh(seam, automationBlue, ys.length);
    const armed = armAngles.filter(angle => angle !== undefined).length;
    this.armOf = armAngles.map((angle, i) => angle === undefined ? undefined : armAngles.slice(0, i).filter(a => a !== undefined).length);
    this.meshes = [this.rings, this.seams];
    if (armGeometry && parcelGeometry && armed) {
      this.arms = new T.InstancedMesh(armGeometry, trim, armed);
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
const ringGeo = (inner: number, outer: number, height: number, y: number) => arc(new T.Group(), inner, outer, height, [0, 0, 0], trim).geometry.translate(0, y, 0);
const geo = (geometry: T.BufferGeometry, at: [number, number, number], rotateZ = 0) => geometry.rotateZ(rotateZ).translate(...at);
/** Service arm in ring space (ring outer radius 2.25, top at .35): base post, shoulder segment up-and-out, elbow segment back down. */
const armGeometry = () => mergeGeometries([
  geo(new T.CylinderGeometry(.22, .28, .4, 12), [2.1, .55, 0]),
  geo(new T.BoxGeometry(1.8, .2, .2), [2.7, 1.2, 0], .8),
  geo(new T.BoxGeometry(1.4, .16, .16), [3.6, 1.1, 0], -.8),
].map(g => g.index ? g.toNonIndexed() : g))!;
const parcelGeometry = () => new T.BoxGeometry(.48, .42, .48).translate(4.2, .6, 0);

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
  box(plinth, [8.2, .8, 9.4], [0, .8, 0], cream, .05);
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

  // -1 low: open civic service hall under a hovering canopy.
  const actors: Record<Band, Actor[]> = { low: [], mixed: [], high: [] };
  const people = (band: Band, list: Actor[]) => actors[band].push(...list);
  const talkers = (band: Band, g: number, cx: number, cz: number, n: number) => people(band, Array.from({ length: n }, (_, j) => {
    const a = j * Math.PI * 2 / n + g;
    return { x: cx + Math.sin(a) * .3, z: cz + Math.cos(a) * .3, yaw: a + Math.PI, talk: [100 + g, j, n] as [number, number, number] };
  }));
  const seatedPair = (band: Band, x: number, z: number) => people(band, [{ x: x - .25, z, yaw: 0, seated: true }, { x: x + .25, z, yaw: 0, seated: true }]);
  const LOW_ZB = -3.4, LOW_ZF = 1, LOW_ZC = (LOW_ZB + LOW_ZF) / 2, LOW_ROOF = 4.0;
  const lowX = (i: number) => -3.8 + (i + .5) * 7.6 / 6;
  stateGroup('hub-state-low', 'low', 0, 0, 1, g => {
    hall(g, 7.6, LOW_ZB, LOW_ZF, 6);
    arc(g, 0, 2.6, .05, [0, 3.95, LOW_ZC], cream);
    for (let i = 0; i < 6; i++) { counter(g, lowX(i), .12); chair(g, lowX(i), .62); }
    bench(g, -3.1, 3.9); bench(g, -.4, 3.95); bench(g, 1.4, 4);
    tree(g, -3.5, 0, 2.1, .6); tree(g, 3.6, 0, 1.9, .6);
  }, false, true);
  for (let i = 0; i < 6; i++) people('low', [{ x: lowX(i), z: -.4, yaw: 0, talk: [i, 0, 2] }, { x: lowX(i), z: .62, yaw: Math.PI, seated: true, talk: [i, 1, 2] }]);
  talkers('low', 0, -1.6, 2.3, 3); talkers('low', 1, 1.2, 2, 3); talkers('low', 2, 2.8, 3.2, 3);
  seatedPair('low', -3.1, 3.9);

  // Hovering canopy: the technology signature. Its own group, so it can bob and ride the hall roof up and down.
  const canopy = new T.Group();
  canopy.name = 'hub-canopy';
  const lens = new T.Mesh(new T.LatheGeometry([[0, -.22], [3.2, -.22], [4.1, -.14], [4.6, 0], [4.1, .14], [3.0, .22], [0, .22]].map(([r, y]) => new T.Vector2(r, y)), 56), trim);
  lens.castShadow = true;
  canopy.add(lens);
  torus(canopy, 4.6, .06, 0, automationBlue);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 2.8, z = Math.sin(a) * 2.8;
    cyl(canopy, .35, .35, .06, -.26, futureLight, x, z);
    const cone = new T.Mesh(new T.CylinderGeometry(.1, .6, 1.3, 16, 1, true), beam);
    cone.position.set(x, -.95, z);
    canopy.add(cone);
  }
  canopy.add(...bake(canopy));
  canopy.visible = false;
  stage.add(canopy);
  const CANOPY_RIDE = LOW_ROOF + 1.6 + .22;

  // 0 mixed: compact hall (staffed counters left, self-service right) with an automated service column.
  const MIX_ZB = -3.8, MIX_ZF = 1, MIX_ZC = (MIX_ZB + MIX_ZF) / 2, MIX_ROOF = 3.95;
  const mixX = (k: number) => -2.8 + (k + .5) * 5.6 / 6;
  stateGroup('hub-state-mixed', 'mixed', 0, 0, .5, g => {
    hall(g, 5.6, MIX_ZB, MIX_ZF, 6);
    for (let k = 0; k < 3; k++) { counter(g, mixX(k), .12); chair(g, mixX(k), .62); terminal(g, mixX(k + 3), .3); }
    bench(g, -2.9, 3.9);
    tree(g, 3.5, 0, 2.4, .6); tree(g, -3.4, 0, 2.2, .6);
  }, false, true);
  for (let k = 0; k < 3; k++) people('mixed', [{ x: mixX(k), z: -.4, yaw: 0, talk: [20 + k, 0, 2] }, { x: mixX(k), z: .62, yaw: Math.PI, seated: true, talk: [20 + k, 1, 2] }]);
  people('mixed', [{ x: mixX(3), z: .72, yaw: Math.PI }, { x: mixX(5), z: .72, yaw: Math.PI }]);
  talkers('mixed', 3, 1, 2.6, 3); talkers('mixed', 4, -.8, 3.1, 2);
  seatedPair('mixed', -2.9, 3.9);

  const COLUMN_TOP = 24, COLUMN_R = 1.05;
  stateGroup('hub-state-mixed-column', 'mixed', MIX_ROOF, .5, .5, g => {
    const h = COLUMN_TOP - MIX_ROOF;
    cyl(g, COLUMN_R, COLUMN_R, h, h / 2 - .05, trim, 0, MIX_ZC);
    cyl(g, 1.35, 1.35, .5, 9 - MIX_ROOF, trim, 0, MIX_ZC);
    cyl(g, 1.38, 1.38, .12, 9 - MIX_ROOF, automationBlue, 0, MIX_ZC);
    for (const a of [.6, -.6]) box(g, [.08, h - .6, .06], [Math.sin(a) * (COLUMN_R + .02), h / 2, MIX_ZC + Math.cos(a) * (COLUMN_R + .02)], futureLight, .01).rotation.y = a;
    cyl(g, 1.5, COLUMN_R, .5, h - .2, trim, 0, MIX_ZC);
  });
  const ringGroup = new T.Group();
  rel.add(ringGroup);
  ringGroup.position.z = MIX_ZC;
  const dockRing = new T.TorusGeometry(2.4, .34, 10, 40).rotateX(Math.PI / 2);
  const struts = [0, 1, 2, 3].map(k => new T.BoxGeometry(1.4, .16, .18).translate(1.6, 0, 0).rotateY(k * Math.PI / 2));
  const mixedRingGeometry = mergeGeometries([dockRing, ...struts].map(g => g.index ? g.toNonIndexed() : g))!;
  const mixedRings = new RingStack(ringGroup, 'hub-mixed-rings', mixedRingGeometry, new T.TorusGeometry(2.4, .08, 6, 48).rotateX(Math.PI / 2).translate(0, .3, 0), [16.5, 19, 21.5]);
  [0, 1, 2].forEach(i => addPart('mixed', .7 + i * .12, .3, level => { mixedRings.levels[i] = level; if (i === 2) mixedRings.commit(); }));

  // Robotic arm on the hall roof: reaches from the column over the counters, lifting and lowering a parcel.
  const arm = new T.Group();
  arm.name = 'hub-roof-arm';
  arm.position.set(0, PT + MIX_ROOF, MIX_ZC + 1.4);
  cyl(arm, .6, .65, .15, .075, trim);
  cyl(arm, .3, .3, .3, .3, trim);
  arm.add(...bake(arm));
  const reach = new T.Group(); // turned so the arm points over the counters (-X)
  reach.rotation.y = Math.PI;
  const shoulder = new T.Group();
  shoulder.position.y = .3;
  const pivot = new T.Group();
  box(pivot, [2.2, .3, .3], [1.1, 0, 0], trim, .05);
  const elbow = new T.Group();
  elbow.position.set(2.2, 0, 0);
  elbow.rotation.z = -1.1;
  box(elbow, [1.8, .26, .26], [.9, 0, 0], trim, .05);
  box(elbow, [.4, .34, .4], [1.85, -.2, 0], cream, .04);
  pivot.add(elbow);
  pivot.add(...bake(pivot));
  shoulder.add(pivot);
  reach.add(shoulder);
  arm.add(reach);
  arm.visible = false;
  stage.add(arm);
  addPart('mixed', .5, .4, level => { arm.visible = level > HIDDEN; arm.scale.setScalar(Math.max(HIDDEN, level)); });

  // +1 high: autonomous service spire — a drum with a pod portal and terminals, a tall core, stacked docking rings, a capped crown.
  const SPIRE_BASE = 3, SPIRE_TOP = 36, RINGS = 14;
  const terminalAt = [-1, -.55, .55, 1].map(a => ({ a, x: Math.sin(a) * 3.5, z: Math.cos(a) * 3.5 }));
  stateGroup('hub-state-high', 'high', 0, 0, .35, g => {
    cyl(g, 2.7, 2.7, SPIRE_BASE, SPIRE_BASE / 2, trim);
    cyl(g, 2.8, 2.8, .15, SPIRE_BASE, cream);
    // Arched portal with a maglev pod stub half inside: cyan backing, trim frame, trim capsule with a lit nose.
    const portal = new T.Group();
    portal.position.set(0, .9, 2.62);
    portal.rotation.x = Math.PI / 2;
    arc(portal, .8, 1.05, .22, [0, 0, 0], trim, 0, Math.PI);
    g.add(portal);
    for (const x of [-.925, .925]) box(g, [.25, .9, .22], [x, .45, 2.7], trim, .02);
    cyl(g, .8, .8, .05, .9, futureLight, 0, 2.6).rotation.x = Math.PI / 2;
    box(g, [1.6, .9, .05], [0, .45, 2.6], futureLight, .01);
    const pod = new T.Mesh(new T.CapsuleGeometry(.4, 1.0, 4, 12).rotateX(Math.PI / 2).scale(.9, 1, 1), trim);
    pod.position.set(0, .55, 3.25);
    pod.castShadow = true;
    g.add(pod);
    box(g, [.5, .08, .1], [0, .62, 4.12], futureLight, .01);
    for (const { a, x, z } of terminalAt) terminal(g, x, z, a);
  }, true, true);
  stateGroup('hub-state-high-core', 'high', SPIRE_BASE, .08, .5, g => {
    cyl(g, 1.5, 1.5, SPIRE_TOP - SPIRE_BASE, (SPIRE_TOP - SPIRE_BASE) / 2, trim);
    for (const a of [.5, -.5]) box(g, [.08, SPIRE_TOP - SPIRE_BASE - 2, .06], [Math.sin(a) * 1.51, (SPIRE_TOP - SPIRE_BASE) / 2, Math.cos(a) * 1.51], futureLight, .01).rotation.y = a;
  });
  stateGroup('hub-state-high-cap', 'high', SPIRE_TOP, 1, .3, g => {
    cyl(g, 1.5, 1.5, .5, .25, trim);
    cyl(g, 1.25, 1.25, .8, .9, trim);
    cyl(g, .8, .8, 1.2, 1.9, trim);
    for (const x of [-.18, .18]) box(g, [.06, 2.1, .06], [x, 3.4, -.1], trim, .01);
    for (const x of [-.32, .32]) box(g, [.24, .34, .05], [x, 1.1, Math.sqrt(1.25 ** 2 - x * x) - .02], futureLight, .01);
  }, true);
  const spireYs = Array.from({ length: RINGS }, (_, i) => 5 + i * 2.25);
  const armAngles = spireYs.map((_, i) => i % 2 ? undefined : i * 1.9);
  const spireRings = new RingStack(rel, 'hub-spire-rings', ringGeo(1.5, 2.5, .7, -.35),
    mergeGeometries([ringGeo(2.5, 2.57, .22, -.1), ringGeo(2.0, 2.1, .03, .35)])!,
    spireYs, armGeometry(), parcelGeometry(), armAngles);
  spireYs.forEach((_, i) => addPart('high', .12 + .88 * i / (RINGS - 1), .3, level => { spireRings.levels[i] = level; if (i === RINGS - 1) spireRings.commit(); }));

  // Drones: a shared fleet in stage space (2 parked on the canopy, 6 on the column rings, 14 on spire rings, 15 in three streams).
  const droneSlots = { canopy: 0, column: 2, spire: 8, stream: 22, count: 37 };
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
  const spireUsers = terminalAt.map(t => ({ x: t.x + Math.sin(t.a) * .5, z: t.z + Math.cos(t.a) * .5 }));
  terminalAt.forEach((t, i) => people('high', [{
    x: spireUsers[i].x + Math.sin(t.a) * .7, z: spireUsers[i].z + Math.cos(t.a) * .7, yaw: t.a + Math.PI,
    use: { to: [spireUsers[i].x, spireUsers[i].z], yaw: t.a + Math.PI },
  }]));
  people('high', [{ x: -2, z: 4, yaw: 1.2, talk: [30, 0, 2] }, { x: -1.7, z: 4.3, yaw: -2, talk: [30, 1, 2] }]);

  const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const frame = (now: number) => {
    const still = prefersReducedMotion();
    const t = still ? 0 : now;
    const ready = hubBase.visible && hubBase.scale.y > .999;
    // Canopy rides the hall roof and bobs +-.08 over a 6 s period.
    const lowLevel = lead.low.level, bob = still ? 0 : Math.sin(now * Math.PI * 2 / 6) * .08 * lowLevel;
    canopy.visible = lowLevel > HIDDEN;
    canopy.position.set(0, PT + CANOPY_RIDE * lowLevel + bob, LOW_ZC);
    canopy.scale.setScalar(Math.max(HIDDEN, smoothstep(clamp01(lowLevel / .35))));
    for (let i = 0; i < 2; i++) {
      const a = i ? 2.5 : .5;
      place(droneSlots.canopy + i, Math.cos(a) * 4.0 * canopy.scale.x, canopy.position.y + .3 * canopy.scale.x, LOW_ZC + Math.sin(a) * 4.0 * canopy.scale.x, a + 1.2, ready ? canopy.scale.x : 0);
    }
    // Docked drones sit on their ring, scaling and lifting with it.
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) {
      const l = mixedRings.levels[i], a = i * 1.3 + k * Math.PI + .6;
      place(droneSlots.column + i * 2 + k, Math.cos(a) * 2.7 * l, PT + mixedRings.y(i) + .65 * l, MIX_ZC + Math.sin(a) * 2.7 * l, a + 1.2, ready ? l : 0);
    }
    let dock = 0;
    spireYs.forEach((_, i) => {
      const angle = armAngles[i];
      if (angle === undefined) return;
      const l = spireRings.levels[i];
      for (const k of [-1, 1]) {
        const a = angle + k * 1.25;
        place(droneSlots.spire + dock++, Math.cos(a) * 2.1 * l, PT + spireRings.y(i) + .55 * l, Math.sin(a) * 2.1 * l, a + 1.2, ready ? l : 0);
      }
    });
    // Three V streams spiral into the upper rings (radius 7 -> 4.2, 20 s); under reduced motion they park on the rings.
    const high = lead.high.level;
    for (let s = 0; s < 3; s++) for (let j = 0; j < 5; j++) {
      const slot = droneSlots.stream + s * 5 + j;
      if (still) {
        const i = RINGS - 1 - ((s * 5 + j) % RINGS), a = (s * 5 + j) * 2.1 + .5, l = spireRings.levels[i];
        place(slot, Math.cos(a) * 2.1 * l, PT + spireRings.y(i) + .55 * l, Math.sin(a) * 2.1 * l, a + 1.2, ready ? l : 0);
        continue;
      }
      const u = (((now / 20 + j / 5 * .42 + s / 3) % 1) + 1) % 1, a = u * Math.PI * 4 + s * Math.PI * 2 / 3 + j * .12, r = 7.5 - 3 * u;
      place(slot, Math.cos(a) * r, PT + 12 + u * 23 + Math.abs(j - 2) * .25, Math.sin(a) * r, a + Math.PI / 2, ready ? high * smoothstep(clamp01(Math.min(u, 1 - u) / .12)) : 0);
    }
    drones.show(ready && (lowLevel > HIDDEN || lead.mixed.level > HIDDEN || high > HIDDEN));
    drones.flush();
    // Arm: lifts and lowers a parcel over the counters, 8 s per cycle.
    shoulder.rotation.z = (still ? .35 : .35 + .35 * Math.sin(now * Math.PI * 2 / 8));
    // Residents: only a settled state has people, so changing a state never squashes a visible body.
    const shownProps = ready && neutralPropsLayer.group.visible && neutralPropsLayer.group.scale.y > .999;
    let slot = 0;
    const settledBand = (['low', 'mixed', 'high'] as const).find(band => parts.every(part => part.band === band ? part.level > .999 : part.level < HIDDEN));
    for (const actor of settledBand && shownProps ? actors[settledBand] : []) {
      let x = actor.x, z = actor.z, yaw = actor.yaw, walk = 0, phase = 0, gesture = 0;
      if (actor.talk) gesture = conversationPose(now, actor.talk[0] + (actor.talk[0] < 100 ? 3000 : 0), actor.talk[1], actor.talk[2]).gesture;
      if (actor.use) {
        const from: [number, number] = [actor.x, actor.z], length = Math.hypot(actor.use.to[0] - from[0], actor.use.to[1] - from[1]) * 3;
        const w = servicePose(t, slot, length), course = Math.atan2(actor.use.to[0] - from[0], actor.use.to[1] - from[1]) + Math.PI * w.turn;
        x = T.MathUtils.lerp(from[0], actor.use.to[0], w.u);
        z = T.MathUtils.lerp(from[1], actor.use.to[1], w.u);
        yaw = course + wrap(actor.use.yaw - course) * w.dwell;
        walk = w.walking ? .4 : 0;
        phase = w.phase;
        gesture = w.dwell * .65;
      }
      pose.position.set(x, PT, z);
      pose.rotation.set(0, yaw, 0);
      pose.scale.setScalar(1 / root.scale.x);
      crowd.set(slot, pose);
      crowd.gait(slot, phase, walk, actor.seated ? 1 : 0);
      crowd.social(slot, 0, gesture);
      slot++;
    }
    pose.scale.setScalar(HIDDEN / root.scale.x);
    for (; slot < 24; slot++) { crowd.set(slot, pose); crowd.gait(slot, 0, 0); crowd.social(slot, 0, 0); }
    crowd.show(shownProps);
    crowd.flush();
  };

  const automationHub = createAutomationHubRuntime(parts, lead, frame, () => hubUpperLayer.group.visible ? 'high' : 'mixed');
  const automationDistrict = new AutomationDistrict(scene);
  // The hub's upper layer is procedural and empty: the spire lives in the three state groups the runtime shows per band.
  return { id: 'magnetEast', root, layers: { hubBase: hubBaseLayer, hubUpper: hubUpperLayer, hubNeutralProps: neutralPropsLayer }, marker: createGuestMarker(root, 'nw'), automationHub, automationDistrict };
}
