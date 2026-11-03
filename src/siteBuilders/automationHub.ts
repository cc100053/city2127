import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AutomationDistrict, automationBlue } from '../districtMeters.ts';
import { arc, bake, box, futureLight, nightLit, teal, warm, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import type { SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import type { Band } from '../surveyView.ts';
import { conversationPose, pedestrians, servicePose } from '../mobility.ts';
import { slat, tree } from './concentrationTower.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, prefersReducedMotion, SITE_TRANSITION_SECONDS, type BuiltSite } from './siteRuntime.ts';

// Pure white structure: the shared `trim` (#eee9df, metallic) reads beige in shade, which the rubric's fl-material rejects.
const white = new T.MeshStandardMaterial({ color: '#f8f9fb', roughness: .42, metalness: .08 });
// Soft shadow band under the roof slab, amber parcels, an amber lot-edge inlay.
// Room light: warm-white walls with a moderate warm emissive by day (clearly warmer and brighter than the white shell, peach near the floor), amber at night (`nightLit` follows the night rig);
// the back wall's vertex colours grade from peach below to near-white above.
const roomLight = (color: T.ColorRepresentation, emissive: string, day: number, night: number, nightColor: string) => nightLit(new T.MeshStandardMaterial({ color, emissive, emissiveIntensity: day, roughness: 1 }), night, nightColor);
const wallLight = nightLit(new T.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, emissive: '#ffb878', emissiveIntensity: .48, roughness: 1 }), .85, '#ff9a3c');
const glowMid = roomLight('#f6e0c4', '#ffb878', .42, .8, '#ff9a3c');
const glowFloor = roomLight('#f0d2b0', '#ffae6c', .4, .7, '#ff9a3c'), glowCeil = roomLight('#fff3dc', '#ffd9a0', 1.3, 1.7, '#ffb860');
// A cool, faint pane across the glazing, so the room reads behind glass.
const glassPane = new T.MeshBasicMaterial({ color: '#cfe6f5', transparent: true, opacity: .13, depthWrite: false });
const shade = new T.MeshBasicMaterial({ color: '#1b2430', transparent: true, opacity: .2, depthWrite: false });
const parcel = new T.MeshStandardMaterial({ color: '#e9a24f', roughness: .6 });
const amberInlay = new T.MeshStandardMaterial({ color: '#ff9f1c', emissive: '#ff9f1c', emissiveIntensity: .7, roughness: .5 });
const rotorMat = new T.MeshStandardMaterial({ color: '#2b3a47', roughness: .5 });
/** Hub drones: a white body on an X frame, four dark rotor rings and a blue underside light, so they read as quads against sky and tower (5.6 m across at scale 1, like the district mesh). */
function quadFleet(parent: T.Object3D, count: number) {
  const frame = mergeGeometries([new T.BoxGeometry(1.6, .7, 1.6), ...[Math.PI / 4, -Math.PI / 4].map(a => new T.BoxGeometry(5.4, .2, .32).rotateY(a))].map(g => g.toNonIndexed()))!;
  const rotors = mergeGeometries([[1.9, 1.9], [-1.9, 1.9], [1.9, -1.9], [-1.9, -1.9]].map(([x, z]) => new T.TorusGeometry(1.15, .17, 6, 16).rotateX(Math.PI / 2).translate(x, .35, z).toNonIndexed()))!;
  const light = new T.BoxGeometry(.9, .12, .9).translate(0, -.42, 0);
  const meshes = ([[frame, white], [rotors, rotorMat], [light, automationBlue]] as const).map(([geometry, material]) => {
    const mesh = new T.InstancedMesh(geometry, material, count);
    mesh.name = 'hub-drones';
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    parent.add(mesh);
    return mesh;
  });
  return {
    set(index: number, pose: T.Object3D) { pose.updateMatrix(); meshes.forEach(m => m.setMatrixAt(index, pose.matrix)); },
    flush() { meshes.forEach(m => { m.instanceMatrix.needsUpdate = true; }); },
    show(visible: boolean) { meshes.forEach(m => { m.visible = visible; }); },
  };
}
const HIDDEN = 1e-3;
const PT = 1.2; // plinth top: every state group stands on it
const DRONE = .7 / 3, DOCKED = .6 / 3; // flying drones ~3.9 m across, docked ones ~3.4 m (the quad mesh is 5.6 m at scale 1) (the district mesh is 5.6 m at scale 1), so streams read as small quads
// Target-size scale of each state's stage content (owner 2026-11-03): residents and positions follow it, so people read like the targets'.
const SCALE: Record<Band, number> = { low: 2, mixed: 1.2, high: 1 };
export const FOLK: Record<Band, number> = { low: 2.6, mixed: 1.6, high: 1 }; // residents' size per state (people read at the targets' size, larger than their stage's scale)
// Resident bounds per state on its plinth (stage units): the low plinth is the grown one, mixed and high stand on the shared 9.6 x 9.4.
// The mixed and high states stand on the shared 9.6 x 9.4 plinth; their amber outline is this lot (the low plinth fills the `changeSites.nw` lot).
export const SHARED_LOT = { w: 8, d: 8 };
export const HUB_PLINTH: Record<Band, { x: number; z: number }> = { low: { x: 12, z: 7 }, mixed: { x: 4.8, z: 4.7 }, high: { x: 4.8, z: 4.7 } };
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const beam = new T.MeshBasicMaterial({ color: '#9fe8ff', transparent: true, opacity: .16, blending: T.AdditiveBlending, depthWrite: false });
const glow = new T.MeshBasicMaterial({ color: new T.Color('#d8f8ff').multiplyScalar(2.5), toneMapped: false });
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
function terminal(parent: T.Object3D, x: number, z: number, yaw = 0, size = 1) {
  const group = new T.Group();
  group.scale.setScalar(size);
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  parent.add(group);
  box(group, [.12, .3, .12], [0, .15, 0], white, .02);
  box(group, [.44, .3, .08], [0, .45, 0], white, .02);
  box(group, [.36, .22, .03], [0, .45, .05], futureLight, .01);
}

/** Open hall: a glowing room seen through the open camera face (+Z) between white mullions, under a deep roof slab with a shadow band on the glazing. */
function hall(group: T.Group, w: number, zBack: number, zFront: number, bays: number, h = 3.6, front = .4, glass = 2.25, roofT = .35, side = .4, recess = 0, mullions = bays) {
  // The glazing (mullions, glass, room floor and cove) stands `recess` behind the fascia, so a shaded soffit shows between the slab edge and the glass.
  const zG = zFront - recess, dG = zG - zBack, zcG = (zBack + zG) / 2, d = zFront - zBack, zc = (zBack + zFront) / 2, wall = glass - .05;
  box(group, [w - .3, .01, dG - .3], [0, .005, zcG], glowFloor, .004);
  // Back wall in three lit bands (deep below, brighter above), pilasters between the bays, side walls and a hot ceiling cove: a glowing room, not one flat field.
  const backWall = new T.PlaneGeometry(w - .3, wall, 1, 6), shades = new Float32Array(14 * 3), low = new T.Color('#e6b080'), high = new T.Color('#fbebd4'), c = new T.Color();
  for (let v = 0; v < 14; v++) c.copy(low).lerp(high, 1 - Math.floor(v / 2) / 6).toArray(shades, v * 3);
  backWall.setAttribute('color', new T.BufferAttribute(shades, 3));
  const backMesh = new T.Mesh(backWall, wallLight);
  backMesh.position.set(0, .025 + wall / 2, zBack + .26);
  group.add(backMesh);
  for (let k = 0; k < bays; k++) for (const y of [1, 1.75]) box(group, [w / bays - .5, .06, .22], [-w / 2 + (k + .5) * w / bays, y, zBack + .36], white, .01); // shelves
  for (let k = 0; k <= bays; k++) box(group, [.14, wall, .3], [-w / 2 + .15 + k * (w - .3) / bays, wall / 2 + .025, zBack + .35], white, .02);
  for (const s of [-1, 1]) box(group, [.04, wall, dG - .5], [s * (w / 2 - .27), glass / 2 + .025, zcG], glowMid, .01);
  box(group, [w - .5, .08, dG - .5], [0, glass - .08, zcG], glowCeil, .01);
  box(group, [w - .5, .14, .5], [0, glass - .14, zBack + .5], glowCeil, .01);
  box(group, [w, h, .2], [0, h / 2, zBack + .1], white, .04);
  for (const s of [-1, 1]) box(group, [.2, h, d], [s * (w / 2 - .1), h / 2, zc], white, .04);
  box(group, [w, h - glass, .2], [0, (h + glass) / 2, zFront - .1], white, .04);
  box(group, [w, .08, .1], [0, glass, zG - .03], white, .02);
  for (let k = 0; k <= mullions; k++) slat(group, [.06, glass, .08], [-w / 2 + k * w / mullions, glass / 2, zG - .02], white);
  if (recess) {
    box(group, [w, .02, recess], [0, glass + .02, zFront - recess / 2], shade, .005); // soffit under the fascia, in shade
  }
  box(group, [w + side * 2, roofT, d + .4 + front], [0, h + roofT / 2, zc + (front - .4) / 2], white, .06);
  box(group, [w - .4, .6, .02], [0, glass - .35, zG - .06], shade, .005); // the slab's shadow on the glazing
  box(group, [w, .09, .02], [0, h - .05, zFront + .01], shade, .005); // dark line under the slab's edge
  box(group, [w - .3, glass, .01], [0, glass / 2, zG - .04], glassPane, .002);
  for (let k = 0; k < bays; k++) { const pool = new T.Mesh(new T.CylinderGeometry(.75, .75, .01, 20), glowCeil); pool.position.set(-w / 2 + (k + .5) * w / bays, .012, zBack + 1.4); group.add(pool); } // warm pools on the floor
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
      this.parcels = new T.InstancedMesh(parcelGeometry, parcel, armed);
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
const parcelGeometry = () => new T.BoxGeometry(.4, .34, .36).translate(5.35, .55, 0);

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
    return { x: cx + Math.sin(a) * .38, z: cz + Math.cos(a) * .38, yaw: a + Math.PI, talk: [100 + g, j, n] as [number, number, number] };
  }));
  const seatedPair = (band: Band, x: number, z: number) => people(band, [{ x: x - .25, z, yaw: 0, seated: true }, { x: x + .25, z, yaw: 0, seated: true }]);
  const scaled = (g: T.Group, band: Band) => { const k = new T.Group(); k.scale.setScalar(SCALE[band]); g.add(k); return k; };
  const K = SCALE.low, M = SCALE.mixed;
  const LOW_W = 10.2, LOW_SHIFT = .1, // the hall stands right of the lot centre (screen right, as in the target)
   LOW_H = 4.8, LOW_ZB = -3.4, LOW_ZF = 1, LOW_FRONT = 2.4, LOW_COUNTER = -1.4, LOW_ZC = (LOW_ZB + LOW_ZF) / 2, LOW_ROOF = LOW_H + .22;
  // The counters stand back in the room (LOW_COUNTER), staff behind them, residents seated in front.
  const lowK = (i: number) => -LOW_W / 2 + (i + .5) * LOW_W / 6, lowX = (i: number) => lowK(i) + LOW_SHIFT; // in the shifted group / in stage design units
  stateGroup('hub-state-low', 'low', 0, 0, 1, g => {
    box(g, [HUB_PLINTH.low.x * 2, .8, HUB_PLINTH.low.z * 2], [0, -.4, 0], white, .05);
    // Amber inlay along the forecourt's front and side edges: the lot outline stays readable from the review pose.
    box(g, [HUB_PLINTH.low.x * 2 - .6, .04, .5], [0, .02, HUB_PLINTH.low.z - .35], amberInlay, .01);
    for (const s of [-1, 1]) box(g, [.45, .04, HUB_PLINTH.low.z * 2 - .6], [s * (HUB_PLINTH.low.x - .35), .02, 0], amberInlay, .01);
    const k = scaled(g, 'low');
    k.position.x = LOW_SHIFT * K;
    hall(k, LOW_W, LOW_ZB, LOW_ZF, 6, LOW_H, LOW_FRONT, 3.8, .22, .75, 1.3, 3); // 3 wide bays: the counters stand in pairs between the mullions
    arc(k, 0, 3.2, .05, [0, LOW_ROOF, LOW_ZC + (LOW_FRONT - .4) / 2], white);
    for (let i = 0; i < 6; i++) { counter(k, lowK(i), LOW_COUNTER); chair(k, lowK(i), LOW_COUNTER + .5); }
    bench(k, -3.5, 2.9); bench(k, 0, 3.05); bench(k, 3.4, 2.9);
    tree(k, -3.5, 0, 2.1, .55); tree(k, 1.9, 0, 2.2, .55); tree(k, 4.8, 0, 1.8, .55);
  }, false, true);
  for (let i = 0; i < 6; i++) people('low', [{ x: lowX(i), z: LOW_COUNTER - .55, yaw: 0, talk: [i, 0, 2] }, { x: lowX(i), z: LOW_COUNTER + .5, yaw: Math.PI, seated: true, talk: [i, 1, 2] }]);
  talkers('low', 0, -1.7 + LOW_SHIFT, 2.2, 3); talkers('low', 1, 3.1 + LOW_SHIFT, 2.3, 3); talkers('low', 2, -.2 + LOW_SHIFT, 2.4, 3);
  seatedPair('low', -3.5 + LOW_SHIFT, 2.9);

  // Hovering canopy: the technology signature. Its own group, so it can bob and ride the hall roof up and down.
  const canopy = new T.Group();
  canopy.name = 'hub-canopy';
  const lens = new T.Mesh(new T.LatheGeometry([[0, -.5], [1.6, -.5], [3.4, -.38], [4.7, -.12], [5.2, 0], [4.7, .14], [3.4, .45], [1.7, .8], [0, .9]].map(([r, y]) => new T.Vector2(r, y)), 64), white);
  lens.castShadow = true;
  canopy.add(lens);
  torus(canopy, 5.2, .03, 0, automationBlue);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 3.4, z = Math.sin(a) * 3.4;
    // Under-emitter: a bright flattened pad flush under the lens (white-blue core) with a short, faint downward glow cone.
    const pad = new T.Mesh(new T.SphereGeometry(.6, 16, 8).scale(1, .3, 1), glow);
    pad.position.set(x, -.44, z);
    const cone = new T.Mesh(new T.CylinderGeometry(.45, .75, .55, 16, 1, true), beam);
    cone.position.set(x, -.8, z);
    canopy.add(pad, cone);
  }
  canopy.add(...bake(canopy));
  canopy.visible = false;
  stage.add(canopy);
  const CANOPY_ROOF_Z = (LOW_ZC + (LOW_FRONT - .4) / 2) * K;
  const CANOPY_RIDE = K * (LOW_ROOF + 1.2) + K * .5;

  // 0 mixed: compact hall (staffed counters left, self-service right) with an automated service column.
  const MIX_W = 7, MIX_H = 4.4, MIX_ZB = -3.4, MIX_ZF = 1, MIX_ZC = (MIX_ZB + MIX_ZF) / 2 * M, MIX_ROOF = (MIX_H + .35) * M;
  stateGroup('hub-state-mixed', 'mixed', 0, 0, .5, g => {
    const k = scaled(g, 'mixed');
    hall(k, MIX_W, MIX_ZB, MIX_ZF, 6, MIX_H, .4, 3.4);
    // Left: one staffed counter (staff behind, residents in front); right: tall self-service kiosks.
    box(k, [3.1, .45, .45], [-1.9, .225, -1.4], white, .04);
    for (const x of [-2.8, -1.9, -1]) box(k, [.5, .28, .04], [x, .6, -1.5], futureLight, .01);
    for (const x of [1, 2.1, 3.1]) terminal(k, x, -1.6, 0, 1.7);
    bench(k, -3, 3.3);
    tree(k, 3.6, 0, 2.4, .6); tree(k, -3.6, 0, 2.5, .6);
  }, false, true);
  for (const [i, x] of [-2.8, -1.9, -1].entries()) people('mixed', [{ x, z: -1.95, yaw: 0, talk: [20 + i, 0, 2] }, { x: x + .15, z: -.85, yaw: Math.PI, talk: [20 + i, 1, 2] }]);
  for (const x of [1, 3.1]) people('mixed', [{ x, z: -.95, yaw: Math.PI }]);
  talkers('mixed', 3, 1, 2.6, 3); talkers('mixed', 4, -.8, 3, 2);
  seatedPair('mixed', -3, 3.3);

  const SPIRE_BASE = 3, SPIRE_TOP = 31.5, RINGS = 18; // the crown (antennas, windows) stands inside the review frame
  const COLUMN_TOP = 37, COLUMN_R = 1.6;
  stateGroup('hub-state-mixed-column', 'mixed', MIX_ROOF, .5, .5, g => {
    const h = COLUMN_TOP - MIX_ROOF;
    cyl(g, COLUMN_R, COLUMN_R, h, h / 2 - .05, white, 0, MIX_ZC);
    for (let y = 2; y < h - 1; y += 2) cyl(g, COLUMN_R + .04, COLUMN_R + .04, .08, y, teal, 0, MIX_ZC); // panel joints
    cyl(g, 2.1, 2.1, .9, 14 - MIX_ROOF, white, 0, MIX_ZC);
    cyl(g, 2.14, 2.14, .16, 14 - MIX_ROOF, automationBlue, 0, MIX_ZC);
    for (const a of [.6, -.6]) box(g, [.1, h - .6, .08], [Math.sin(a) * (COLUMN_R + .03), h / 2, MIX_ZC + Math.cos(a) * (COLUMN_R + .03)], automationBlue, .01).rotation.y = a;
    cyl(g, 2.1, COLUMN_R, .5, h - .2, white, 0, MIX_ZC);
  });
  const ringGroup = new T.Group();
  rel.add(ringGroup);
  ringGroup.position.z = MIX_ZC;
  // Docking rings: an open annulus (a hole around the column, bridged by four thin spokes to an inner track ring), an inner rail and an outer lip, four pads on each face (blue; the camera looks up at the rings, so the drones dock on the underside), a thin blue seam on the outer face.
  const MIX_RING = 3.4, MIX_PAD = 3.05, padAngles = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
  const spoke = (k: number) => new T.BoxGeometry(2.8 - COLUMN_R, .12, .12).translate((2.8 + COLUMN_R) / 2, 0, 0).rotateY(k * Math.PI / 2 + Math.PI / 4).toNonIndexed();
  const mixedRingGeometry = mergeGeometries([ringGeo(2.7, MIX_RING, .4, -.2), ringGeo(MIX_RING - .1, MIX_RING, .24, .2), ringGeo(2.7, 2.8, .2, .2), ringGeo(2.25, 2.45, .14, -.07), ...[0, 1, 2, 3].map(spoke)])!;
  const mixedSeams = mergeGeometries([new T.TorusGeometry(MIX_RING + .02, .045, 6, 64).rotateX(Math.PI / 2),
    ...padAngles.flatMap(a => [.22, -.22].map(y => new T.CylinderGeometry(.3, .3, .05, 16).translate(Math.cos(a) * MIX_PAD, y, Math.sin(a) * MIX_PAD).toNonIndexed()))].map(g => g.index ? g.toNonIndexed() : g))!;
  const mixedRings = new RingStack(ringGroup, 'hub-mixed-rings', mixedRingGeometry, mixedSeams, [28.5, 32, 35.5]);
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
  // Gripper: a wrist plate with two dark fingers closed on a large amber parcel.
  box(elbow, [.3, .1, .9], [1.95, .02, 0], teal, .01);
  for (const z of [-.46, .46]) box(elbow, [.12, .55, .1], [1.95, -.25, z], teal, .01);
  box(elbow, [.8, .7, .8], [1.95, -.4, 0], parcel, .04);
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
    // Maglev: a guide beam with two rails runs out of the portal across the plaza on posts; the pod rides it, half inside the portal.
    const TRACK_END = 8.5, trackLen = TRACK_END - DRUM + .4;
    box(g, [1.1, .3, trackLen], [0, .15, DRUM - .4 + trackLen / 2], white, .03);
    for (const x of [-.38, .38]) box(g, [.1, .1, trackLen], [x, .35, DRUM - .4 + trackLen / 2], teal, .01);
    for (const z of [5.6, 7.4]) box(g, [.5, 1.5, .5], [0, -.5, z], white, .03);
    box(g, [.95, .6, 1.6], [0, .8, DRUM + .7], white, .2);
    box(g, [.78, .26, .04], [0, .9, DRUM + 1.5], teal, .01);
    box(g, [.6, .06, .05], [0, .6, DRUM + 1.5], futureLight, .01);
    for (const x of [-.48, .48]) box(g, [.03, .06, 1.3], [x, .72, DRUM + .7], futureLight, .01);
    for (const { a, x, z } of terminalAt) terminal(g, x, z, a);
  }, true, true);
  const CORE_R = 1.8, CORE_H = SPIRE_TOP - SPIRE_BASE, RING_Y0 = 4.4, RING_PITCH = (SPIRE_TOP - 1.7 - RING_Y0) / (RINGS - 1);
  stateGroup('hub-state-high-core', 'high', SPIRE_BASE, .08, .5, g => {
    cyl(g, CORE_R, CORE_R, CORE_H, CORE_H / 2, white);
    for (let y = 1; y < CORE_H; y += 2) cyl(g, CORE_R + .04, CORE_R + .04, .08, y, teal, 0, 0); // panel joints
    // Vertical panel lines, and small lit windows in every gap between two rings, on the camera side.
    const at = (a: number, r: number) => [Math.sin(a) * r, Math.cos(a) * r] as const;
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - .4, [x, z] = at(a, CORE_R + .015); box(g, [.05, CORE_H - 1, .05], [x, CORE_H / 2, z], teal, .01).rotation.y = a; }
    for (let i = 0; i < RINGS - 1; i++) for (const a of [-.75, -.25, .25, .75]) { const [x, z] = at(a, CORE_R + .03); box(g, [.3, .24, .05], [x, RING_Y0 + (i + .5) * RING_PITCH - SPIRE_BASE, z], futureLight, .01).rotation.y = a; }
    for (const a of [.5, -.5]) box(g, [.1, CORE_H - 2, .08], [Math.sin(a) * (CORE_R + .02), CORE_H / 2, Math.cos(a) * (CORE_R + .02)], futureLight, .01).rotation.y = a;
  });
  stateGroup('hub-state-high-cap', 'high', SPIRE_TOP, 1, .3, g => {
    cyl(g, CORE_R, CORE_R, .5, .25, white);
    cyl(g, 1.5, 1.5, .8, .9, white);
    cyl(g, 1, 1, 1.2, 1.9, white);
    for (const x of [-.3, .3]) box(g, [.12, 2.2, .12], [x, 3, -.1], white, .01);
    for (const x of [-.55, .55]) box(g, [.4, .5, .06], [x, 1.1, Math.sqrt(1.5 ** 2 - x * x) - .02], futureLight, .01);
    for (const x of [-.3, .3]) box(g, [.3, .4, .06], [x, 1.95, Math.sqrt(1 - x * x) - .02], futureLight, .01);
  }, true);
  const spireYs = Array.from({ length: RINGS }, (_, i) => RING_Y0 + i * RING_PITCH);
  const armAngles = spireYs.map((_, i) => i % 2 ? undefined : .1 - (i / 2 % 3) * .65); // right side and camera side of the tower: left arms hide behind the DECKS block
  const spireRings = new RingStack(rel, 'hub-spire-rings', ringGeo(CORE_R, 3.3, .95, -.475),
    mergeGeometries([ringGeo(3.3, 3.36, .1, -.05), ringGeo(2.7, 2.78, .04, .475)])!,
    spireYs, armGeometry(), parcelGeometry(), armAngles);
  spireYs.forEach((_, i) => addPart('high', .12 + .88 * i / (RINGS - 1), .3, level => { spireRings.levels[i] = level; if (i === RINGS - 1) spireRings.commit(); }));

  // Drones: a shared fleet in stage space (2 parked on the canopy, 6 on the column rings, one pair on each armed spire ring, 24 in three streams, 3 arriving at the mixed rings).
  const droneSlots = { canopy: 0, column: 2, spire: 8, stream: 8 + armAngles.filter(a => a !== undefined).length * 2, arrive: 0, count: 0 };
  droneSlots.arrive = droneSlots.stream + 24;
  droneSlots.count = droneSlots.arrive + 3;
  const drones = quadFleet(stage, droneSlots.count);
  const dummy = new T.Object3D();
  const place = (slot: number, x: number, y: number, z: number, yaw: number, level: number, size = DRONE) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.setScalar(Math.max(HIDDEN, level) * size);
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
  const lotMarker = createGuestMarker(root, 'nw', { w: HUB_PLINTH.low.z * 2, d: HUB_PLINTH.low.x * 2 });
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
      const l = mixedRings.levels[i], a = padAngles[k];
      place(droneSlots.column + i * 2 + k, Math.cos(a) * MIX_PAD * l, PT + mixedRings.y(i) + .5 * l, MIX_ZC + Math.sin(a) * MIX_PAD * l, a + .6, ready ? l : 0, DOCKED);
    }
    // Two or three arrive in the air around the mixed rings: slow arcs on the camera side, parked when motion is reduced.
    for (let k = 0; k < 3; k++) {
      const ml = mixedRings.levels[k], a = .2 + k * .55 + (still ? 0 : Math.sin(now * .3 + k * 2) * .4), r = 6.8 - k * .5;
      place(droneSlots.arrive + k, Math.cos(a) * r * ml, PT + mixedRings.y(k) + (k - 1) * 1.1 + (still ? 0 : Math.sin(now * .5 + k) * .4), MIX_ZC + Math.sin(a) * r * ml, a + Math.PI / 2, ready ? ml : 0, DOCKED);
    }
    let dock = 0;
    spireYs.forEach((_, i) => {
      const angle = armAngles[i];
      if (angle === undefined) return;
      const l = spireRings.levels[i];
      for (const k of [-1, 1]) {
        const a = -angle + k * 1.25;
        place(droneSlots.spire + dock++, Math.cos(a) * 2.6 * l, PT + spireRings.y(i) + .7 * l, Math.sin(a) * 2.6 * l, a + 1.2, ready ? l : 0, DOCKED);
      }
    });
    // Three streams climb the sky to the right of the tower (screen right = stage +x) and curl into the upper rings (radius 12 -> 6, 20 s); under reduced motion they park on the rings.
    const high = lead.high.level;
    for (let s = 0; s < 3; s++) for (let j = 0; j < 8; j++) {
      const slot = droneSlots.stream + s * 8 + j;
      if (still) {
        const i = RINGS - 1 - ((s * 8 + j) % RINGS), a = (s * 8 + j) * 2.1 + .5, l = spireRings.levels[i];
        place(slot, Math.cos(a) * 2.5 * l, PT + spireRings.y(i) + .85 * l, Math.sin(a) * 2.5 * l, a + 1.2, ready ? l : 0);
        continue;
      }
      const u = (((now / 20 + j / 8 * .75 + s / 3) % 1) + 1) % 1, a = -.25 + s * .22 + u * .35, r = 13 - 6.5 * u;
      place(slot, Math.cos(a) * r, PT + 6 + s * 3 + u * (SPIRE_TOP - 14) + Math.abs(j - 3.5) * .15, Math.sin(a) * r, a + Math.PI / 2, ready ? .7 * high * smoothstep(clamp01(Math.min(u, 1 - u) / .1)) : 0);
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
