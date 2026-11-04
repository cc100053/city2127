import * as T from 'three';
import { METER_COLORS, glassPane, glow, glowCeil, glowFloor, glowMid, halo, white } from '../automationKit.ts';
import { arc, bake, box, leafyCrown, paint, skyGlass, stone } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import { conversationPose, pedestrians } from '../mobility.ts';
import { SharingDistrict } from '../districtMeters.ts';
import type { ExhibitionLayout } from '../surveyView.ts';
import { tree } from './concentrationTower.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, prefersReducedMotion, SITE_TRANSITION_SECONDS, type BuiltSite } from './siteRuntime.ts';

type Band = ExhibitionLayout['bands']['sw'];
const SEAT_COUNT = 8;
const HIDDEN = 1e-3;
const DEFAULT_TARGET = { band: 'mixed', sharedSeats: 4 } as const;
const SLAB = .3, BED = .36; // terrace slab top / planted bed top (low state)
const DECK = .36; // mixed round deck top
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const hash = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
// Residents' size (world metres of a standing adult / 1.65) per state: people read at the target's size, not their stage's.
export const COMMONS_FOLK: Record<Band, number> = { low: 1.9, mixed: 2.0, high: 2.1 };

/** The one saturated accent of the commons: emissive and instance-colour-free, so it reads day and night. */
export const sharePink = new T.MeshStandardMaterial({ color: METER_COLORS.publicSharing, emissive: METER_COLORS.publicSharing, emissiveIntensity: .9, roughness: .5 });
const screenGlass = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .4, transparent: true, opacity: .75, depthWrite: false });
const hedgeGreen = paint('#5c9a4f', .85), shrubGreen = paint('#4a8446', .85), bedGreen = paint('#477a43', .9);

export type CommonsPlazaTarget = {
  readonly band: Band;
  readonly sharedSeats: number;
};

export interface CommonsPlazaDiagnostics {
  readonly band: CommonsPlazaTarget['band'];
  readonly targetSharedSeats: number;
  readonly visibleSharedSeats: number;
  readonly targetScreenedSeats: number;
  readonly visibleScreenedSeats: number;
}

export interface CommonsPlazaRuntime {
  setTarget(target: CommonsPlazaTarget, now: number, immediate: boolean, sampleAt?: number): boolean;
  update(now: number): void;
  restoreLegacy(): void;
  getDiagnostics(): CommonsPlazaDiagnostics;
}

type CommonsPlazaSite = BuiltSite & { readonly commonsPlaza: CommonsPlazaRuntime };

/** One animated piece of a band's state: it appears at `at` (0 first .. 1 last) while building up and in reverse order while coming down. */
type Part = { readonly band: Band; readonly at: number; readonly span: number; readonly apply: (level: number) => void; level: number; from: number; to: number };
/** A resident in stage coordinates (stage -Z is the camera-facing front). `y` is the floor (or seat top when seated); `walk` paces to a second point and back. */
type Actor = { x: number; z: number; y: number; yaw: number; seated?: boolean; kid?: boolean; talk?: [number, number, number]; walk?: { to: [number, number, number]; period: number; phase: number } };

function sharedSlotLevels(sharedSeats: number): Float32Array {
  const levels = new Float32Array(SEAT_COUNT);
  for (let seat = 0; seat < sharedSeats; seat++) levels[Math.floor(seat * SEAT_COUNT / sharedSeats)] = 1;
  return levels;
}

// ponytail: the visible geometry follows the band (pods / circle / amphitheatre); this 8-slot seat counter only drives the diagnostics and its smooth 3 s retarget.
function createCommonsPlazaRuntime(parts: Part[], frame: (now: number) => void): CommonsPlazaRuntime {
  const levels = sharedSlotLevels(DEFAULT_TARGET.sharedSeats), from = new Float32Array(levels), to = new Float32Array(levels);
  let target: CommonsPlazaTarget = DEFAULT_TARGET;
  let exhibitionTargetApplied = false;
  let active = false;
  let start = 0;
  const write = () => { for (const part of parts) part.apply(part.level); };
  const settle = (band: Band) => {
    for (const part of parts) part.level = part.from = part.to = part.band === band ? 1 : 0;
    levels.set(to);
    from.set(to);
    active = false;
    write();
    frame(start);
  };

  settle('mixed');
  const runtime: CommonsPlazaRuntime = {
    setTarget(next, now, immediate, sampleAt = now) {
      if (!Number.isInteger(next.sharedSeats) || next.sharedSeats < 0 || next.sharedSeats > SEAT_COUNT) {
        throw new RangeError(`sharedSeats must be an integer from 0 to ${SEAT_COUNT}.`);
      }
      runtime.update(sampleAt);
      const changed = !exhibitionTargetApplied || next.band !== target.band || next.sharedSeats !== target.sharedSeats;
      target = { band: next.band, sharedSeats: next.sharedSeats };
      exhibitionTargetApplied = true;
      if (!changed && !immediate) return false;
      from.set(levels);
      to.set(sharedSlotLevels(next.sharedSeats));
      for (const part of parts) { part.from = part.level; part.to = part.band === next.band ? 1 : 0; }
      start = now;
      if (immediate) settle(next.band);
      else active = changed;
      return changed;
    },
    update(now) {
      if (active) {
        const raw = clamp01((now - start) / SITE_TRANSITION_SECONDS);
        // A state builds bottom-first and comes down top-first, each part over `span` of the 3 s.
        for (const part of parts) {
          const begin = (part.to > part.from ? part.at : 1 - part.at) * (1 - part.span);
          part.level = part.from + (part.to - part.from) * smoothstep(clamp01((raw - begin) / part.span));
        }
        const eased = smoothstep(raw);
        for (let i = 0; i < SEAT_COUNT; i++) levels[i] = from[i] + (to[i] - from[i]) * eased;
        active = raw < 1;
        write();
      }
      frame(now);
    },
    restoreLegacy() {
      target = DEFAULT_TARGET;
      exhibitionTargetApplied = false;
      to.set(sharedSlotLevels(DEFAULT_TARGET.sharedSeats));
      settle('mixed');
    },
    getDiagnostics() {
      let visibleSharedSeats = 0, visibleScreenedSeats = 0;
      if (exhibitionTargetApplied) {
        for (const level of levels) {
          if (level > HIDDEN) visibleSharedSeats++;
          if (1 - level > HIDDEN) visibleScreenedSeats++;
        }
      }
      return {
        band: target.band,
        targetSharedSeats: target.sharedSeats,
        visibleSharedSeats,
        targetScreenedSeats: SEAT_COUNT - target.sharedSeats,
        visibleScreenedSeats,
      };
    },
  };
  return runtime;
}

// ---- geometry helpers ----

/** Rounded-rectangle outline (centred, in the XY plane) on a Shape or Path. */
function rr<P extends T.Path>(path: P, w: number, h: number, r: number): P {
  const x = w / 2, y = h / 2;
  path.moveTo(-x + r, -y); path.lineTo(x - r, -y); path.quadraticCurveTo(x, -y, x, -y + r);
  path.lineTo(x, y - r); path.quadraticCurveTo(x, y, x - r, y); path.lineTo(-x + r, y);
  path.quadraticCurveTo(-x, y, -x, y - r); path.lineTo(-x, -y + r); path.quadraticCurveTo(-x, -y, -x + r, -y);
  return path;
}
const mesh = (parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, x = 0, y = 0, z = 0) => {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
};
/** Plan-rounded slab (w along x, d along z) standing on y. */
const plate = (g: T.Object3D, w: number, d: number, h: number, r: number, y: number, material: T.Material = white, x = 0, z = 0) =>
  mesh(g, new T.ExtrudeGeometry(rr(new T.Shape(), w, d, r), { depth: h, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2), material, x, y, z);
/** Horizontal ring (XZ plane) of a torus. */
const ringTorus = (g: T.Object3D, r: number, tube: number, material: T.Material, x: number, y: number, z: number) =>
  mesh(g, new T.TorusGeometry(r, tube, 8, 40).rotateX(Math.PI / 2), material, x, y, z);
const disc = (g: T.Object3D, r: number, material: T.Material, x: number, y: number, z: number) =>
  mesh(g, new T.CircleGeometry(r, 32).rotateX(-Math.PI / 2), material, x, y, z);
const crown = leafyCrown(1);
const bush = (g: T.Object3D, x: number, y: number, z: number, s: number, material: T.Material = shrubGreen, sy = .8) => {
  const m = mesh(g, crown, material, x, y + s * sy * .6, z);
  m.scale.set(s, s * sy, s);
  m.rotation.y = hash(x * 3 + z) * 6;
};
const segment = (g: T.Object3D, [ax, az]: [number, number], [bx, bz]: [number, number], w: number, h: number, y: number, material: T.Material, radius = .03) => {
  const len = Math.hypot(bx - ax, bz - az) + .02;
  box(g, [w, h, len], [(ax + bx) / 2, y + h / 2, (az + bz) / 2], material, radius).rotation.y = Math.atan2(bx - ax, bz - az);
};
const distToSegment = (px: number, pz: number, [ax, az]: [number, number], [bx, bz]: [number, number]) => {
  const dx = bx - ax, dz = bz - az, t = clamp01(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
};
/** Curved white bench with a pink top (centred on the ring radius `r`) over an angle range of `arc()`'s convention. */
const benchArc = (g: T.Object3D, r: number, y: number, x: number, z: number, start: number, length: number) => {
  arc(g, r - .11, r + .11, .18, [x, y, z], white, start, length);
  arc(g, r - .13, r + .13, .035, [x, y + .18, z], sharePink, start, length);
};

// ---- pods ----

const POD_H = .45; // hover gap between the terrace and the pod floor
const POD_BASE = .25; // interior floor above the pod's lowest point
const PD = 1.35; // pod depth
const POD_SEAT = POD_H + POD_BASE + .2; // seat top above the terrace under the pod

/** One private pod in its own frame: front (the glass) on +Z, resting on y 0, floating POD_H above its emitter. */
function podUnit(withPanel: boolean): T.Group {
  const g = new T.Group(), cy = POD_H + .75;
  // Rounded-square shell: a tube with a big front opening, a rounded lip and a closed back.
  const lip = { bevelEnabled: true, bevelThickness: .07, bevelSize: .07, bevelOffset: -.07, bevelSegments: 3, curveSegments: 10 };
  const shell = rr(new T.Shape(), 1.8, 1.5, .55);
  shell.holes.push(rr(new T.Path(), 1.34, 1.04, .36));
  mesh(g, new T.ExtrudeGeometry(shell, { ...lip, depth: 1.21 }).translate(0, 0, -PD / 2 + .07).translate(0, cy, 0), white);
  mesh(g, new T.ExtrudeGeometry(rr(new T.Shape(), 1.8, 1.5, .55), { ...lip, depth: .02 }).translate(0, cy, -PD / 2 + .07), white);
  // Pink seam around the glass.
  const seam = rr(new T.Shape(), 1.54, 1.24, .42);
  seam.holes.push(rr(new T.Path(), 1.42, 1.12, .36));
  mesh(g, new T.ExtrudeGeometry(seam, { depth: .03, bevelEnabled: false, curveSegments: 10 }).translate(0, cy, PD / 2 - .015), sharePink);
  // Lit room behind the glass: warm liner, back wall, floor, ceiling strip, two facing seats and a table.
  const liner = rr(new T.Shape(), 1.33, 1.03, .34);
  liner.holes.push(rr(new T.Path(), 1.2, .9, .3));
  mesh(g, new T.ExtrudeGeometry(liner, { depth: 1.0, bevelEnabled: false, curveSegments: 8 }).translate(0, cy, -.5), glowMid);
  mesh(g, new T.ShapeGeometry(rr(new T.Shape(), 1.33, 1.03, .34), 8), glowMid, 0, cy, -.5);
  box(g, [1.2, .03, 1.0], [0, POD_H + POD_BASE - .01, 0], glowFloor, .01);
  box(g, [.9, .03, .9], [0, cy + .46, 0], glowCeil, .01);
  for (const s of [-1, 1]) {
    box(g, [.4, .2, .45], [s * .5, POD_H + POD_BASE + .1, 0], white, .04);
    box(g, [.07, .36, .45], [s * .7, POD_H + POD_BASE + .3, 0], sharePink, .02);
  }
  box(g, [.4, .22, .5], [0, POD_H + POD_BASE + .11, 0], white, .03);
  mesh(g, new T.ShapeGeometry(rr(new T.Shape(), 1.4, 1.1, .36), 8), glassPane, 0, cy, PD / 2 - .04);
  if (withPanel) box(g, [.04, .8, .8], [.93, cy, -.05], sharePink, .015);
  // Ring emitter on a short pedestal: the gap under the pod reads as lift.
  mesh(g, new T.CylinderGeometry(.82, .86, .15, 32), white, 0, .075, 0);
  ringTorus(g, .7, .055, glow, 0, .165, 0);
  disc(g, .6, glow, 0, .168, 0);
  disc(g, .95, halo, 0, .185, 0);
  return g;
}

/** Instanced pods: one InstancedMesh per material of the baked unit; `place` positions are stage (x, z, yaw, scale). */
function podFleet(parent: T.Object3D, name: string, spots: readonly { x: number; z: number; yaw: number; k: number }[], withPanel: boolean, baseY: number) {
  const unit = podUnit(withPanel);
  const meshes = bake(unit).map(source => {
    const instanced = new T.InstancedMesh(source.geometry, source.material, spots.length);
    instanced.name = name;
    instanced.receiveShadow = true; // no cast: the shell would shade the residents seated inside
    instanced.frustumCulled = false;
    parent.add(instanced);
    return instanced;
  });
  const dummy = new T.Object3D();
  return (level: number) => {
    const visible = level > HIDDEN;
    spots.forEach((spot, i) => {
      // The pods descend onto their emitters while the state builds, and lift off again while it comes down.
      dummy.position.set(spot.x, baseY + (1 - level) * 2.5, spot.z);
      dummy.rotation.set(0, spot.yaw, 0);
      dummy.scale.setScalar(Math.max(HIDDEN, level) * spot.k);
      dummy.updateMatrix();
      for (const m of meshes) m.setMatrixAt(i, dummy.matrix);
    });
    for (const m of meshes) { m.visible = visible; m.instanceMatrix.needsUpdate = true; }
  };
}

/** Stage position of a pod-local point (x across, z forward) for a pod at (px, pz) turned `yaw`, scaled k. */
const podPoint = (pod: { x: number; z: number; yaw: number; k: number }, lx: number, lz: number) => ({
  x: pod.x + (lx * Math.cos(pod.yaw) + lz * Math.sin(pod.yaw)) * pod.k,
  z: pod.z + (-lx * Math.sin(pod.yaw) + lz * Math.cos(pod.yaw)) * pod.k,
});

// ---- canopy ----

const lensProfile = [[0, -.5], [1.6, -.5], [3.4, -.38], [4.7, -.12], [5.2, 0], [4.7, .14], [3.4, .45], [1.7, .8], [0, .9]];
const topSurface = [[.5, .87], [1.7, .8], [3.4, .45], [4.7, .14], [5.2, 0]];
/** A white lens in its own space (radius 5.2); the caller scales the group. */
function canopyLens(): T.Group {
  const g = new T.Group();
  mesh(g, new T.LatheGeometry(lensProfile.map(([r, y]) => new T.Vector2(r, y)), 64), white);
  return g;
}
/** Radial pink rib on the lens top, following its profile (a double-sided ribbon). */
function rib(g: T.Group, angle: number, width: number) {
  const pos: number[] = [], c = Math.cos(angle), s = Math.sin(angle), nx = -s * width / 2, nz = c * width / 2;
  for (let i = 0; i < topSurface.length - 1; i++) {
    const [r0, y0] = topSurface[i], [r1, y1] = topSurface[i + 1];
    const a = [c * r0 - nx, y0 + .03, s * r0 - nz], b = [c * r0 + nx, y0 + .03, s * r0 + nz], d = [c * r1 - nx, y1 + .03, s * r1 - nz], e = [c * r1 + nx, y1 + .03, s * r1 + nz];
    pos.push(...a, ...b, ...d, ...b, ...e, ...d, ...a, ...d, ...b, ...b, ...d, ...e);
  }
  const geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals();
  mesh(g, geometry, sharePink);
}

// ---- stage ----

export function buildCommonsPlaza(scene: T.Scene, _kit?: unknown): CommonsPlazaSite {
  const root = createSiteRoot(scene, 'sw');
  const plazaLayer = createSiteLayer(root, siteLayerDefinition('dogenzakaSouth', 'plaza'));
  const neutralPropsLayer = createSiteLayer(root, siteLayerDefinition('dogenzakaSouth', 'commonsNeutralProps'));
  const stage = plazaLayer.group; // stage -Z is the camera-facing front (the SW hero camera looks +Z)

  const parts: Part[] = [];
  const lead = {} as Record<Band, Part>;
  const addPart = (band: Band, at: number, span: number, apply: (level: number) => void, leader = false) => {
    const level = band === 'mixed' ? 1 : 0;
    const part: Part = { band, at, span, apply, level, from: level, to: level };
    parts.push(part);
    if (leader) lead[band] = part;
    return part;
  };
  /** A baked, static group on the stage that grows from the ground. */
  const stateGroup = (name: string, band: Band, at: number, span: number, build: (g: T.Group) => void, leader = false) => {
    const group = new T.Group();
    group.name = name;
    stage.add(group);
    build(group);
    group.add(...bake(group));
    group.visible = false;
    addPart(band, at, span, level => { group.visible = level > HIDDEN; group.scale.set(1, Math.max(HIDDEN, level), 1); }, leader);
    return group;
  };
  const actors: Record<Band, Actor[]> = { low: [], mixed: [], high: [] };
  const people = (band: Band, list: Actor[]) => actors[band].push(...list);
  const talkers = (band: Band, id: number, cx: number, y: number, cz: number, n: number, r = .3) => people(band, Array.from({ length: n }, (_, j) => {
    const a = j * Math.PI * 2 / n + id;
    return { x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r, y, yaw: a + Math.PI, talk: [100 + id, j, n] as [number, number, number] };
  }));
  const walker = (band: Band, a: [number, number, number], b: [number, number, number], period: number, phase: number, kid = false): Actor =>
    ({ x: a[0], z: a[1], y: a[2], yaw: 0, kid, walk: { to: b, period, phase } });
  const facing = (dx: number, dz: number) => Math.atan2(dx, dz);

  // ---------- -1 low: private pod garden ----------
  const FRONT = Math.PI; // a pod's glass faces stage -Z, nudged toward the camera
  const lowPods = [[3.1, -.9, .12], [3.05, 1.9, .05], [1.35, 3.25, .02], [-1.4, 3.25, -.04], [-3.15, 1.7, -.08], [-3.2, -.9, -.12]]
    .map(([x, z, tilt]) => ({ x, z, yaw: FRONT - tilt, k: 1 }));
  const stem: [number, number][] = [[0, -5.6], [0, -1.7]];
  const branches: [number, number][][] = [[[0, -1.7], [-.9, -.1], [-.7, 2.1], [-.3, 4.2]], [[0, -1.7], [.9, -.1], [.7, 2.1], [.3, 4.2]]];
  const walks = [stem, ...branches].flatMap(line => line.slice(1).map((p, i) => [line[i], p] as [[number, number], [number, number]]));
  const nearPath = (x: number, z: number) => walks.some(([a, b]) => distToSegment(x, z, a, b) < .85);
  stateGroup('commons-state-low', 'low', 0, .6, g => {
    plate(g, 13.2, 11.2, SLAB, 1.4, 0);
    plate(g, 12.6, 10.6, BED - SLAB, 1.1, SLAB, bedGreen);
    for (const [a, b] of walks) segment(g, a, b, 1.05, .03, BED, stone, .01);
    // Clipped hedge border: front and both sides, with a gap at the entrance; low shrubs close the back.
    for (let x = -6.1; x <= 6.15; x += .55) if (Math.abs(x) > 1.05) bush(g, x, BED - .05, -5.2, .36, hedgeGreen, .75);
    for (let z = -4.7; z <= 5.2; z += .58) for (const s of [-1, 1]) bush(g, s * 6.05, BED - .05, z, .38, hedgeGreen, .75);
    for (let x = -5.8; x <= 5.8; x += .8) bush(g, x, BED - .05, 5.2, .34, hedgeGreen, .7);
    // Shrub beds fill the gaps between the pods and the paths.
    for (let i = 0; i < 360; i++) {
      const x = (hash(i) - .5) * 11.6, z = (hash(i + 500) - .5) * 9.8;
      if (nearPath(x, z) || lowPods.some(p => Math.hypot(x - p.x, z - p.z) < 1.25) || z < -4.6) continue;
      bush(g, x, BED - .05, z, .2 + hash(i + 900) * .2);
    }
    for (const [x, z, s] of [[4.5, .5, .85], [-4.3, .3, .85], [-1.9, 1.2, .75], [1.6, .7, .7], [0, 4.2, .75]]) tree(g, x, BED, z, s);
    // Pink-topped benches by the front path and four slim reservation posts by the pod doors.
    for (const [x, z, yaw] of [[-1.55, -3.45, .2], [1.55, -3.1, -.25], [3.5, -3.3, 0]]) {
      const b = new T.Group();
      b.position.set(x, BED, z);
      b.rotation.y = yaw;
      box(b, [1.15, .1, .32], [0, .2, 0], white, .02);
      for (const s of [-.45, .45]) box(b, [.07, .17, .28], [s, .085, 0], white, .01);
      box(b, [1.15, .04, .34], [0, .27, 0], sharePink, .01);
      g.add(b);
    }
    for (const [x, z] of [[2.3, -2.2], [-2.3, -2.2], [1.8, 1.3], [-1.8, .9]]) {
      box(g, [.06, .95, .06], [x, BED + .475, z], white, .02);
      mesh(g, new T.SphereGeometry(.08, 10, 8), glow, x, BED + .98, z);
    }
    // Six translucent membrane screens, each with a pink frame, between neighbouring pods.
    const screenAt = (x: number, z: number, yaw: number) => {
      const s = new T.Group();
      s.position.set(x, BED, z);
      s.rotation.y = yaw;
      box(s, [.9, 1.9, .04], [0, .95, 0], screenGlass, .01);
      for (const sx of [-.45, .45]) box(s, [.05, 1.9, .07], [sx, .95, 0], sharePink, .01);
      for (const sy of [.025, 1.875]) box(s, [.95, .05, .07], [0, sy, 0], sharePink, .01);
      g.add(s);
    };
    // Flanking the central corridor and the front pods, turned to separate neighbouring pods.
    for (const [x, z, yaw] of [[1.65, .1, 1.35], [-1.65, .1, 1.8], [1.6, 2.5, 1.4], [-1.6, 2.45, 1.75], [2.1, -1.8, .9], [-2.1, -1.8, 2.25]]) screenAt(x, z, yaw);
  }, true);
  const lowPlace = podFleet(stage, 'commons-pods-low', lowPods, false, BED);
  addPart('low', .35, .65, lowPlace);
  lowPods.forEach((pod, i) => {
    const seat = POD_SEAT + BED;
    for (const s of [-1, 1]) {
      if (i > 3 && s > 0) continue;
      const p = podPoint(pod, s * .5, 0);
      people('low', [{ ...p, y: seat, yaw: pod.yaw + s * Math.PI / 2, seated: true, talk: [i, s < 0 ? 0 : 1, 2] }]);
    }
  });
  people('low', [
    { x: -1.5, z: -3.45, y: BED + .27, yaw: .2, seated: true }, { x: 1.45, z: -3.1, y: BED + .27, yaw: -.25, seated: true }, { x: 1.75, z: -3.12, y: BED + .27, yaw: -.25, seated: true },
    { x: 3.5, z: -3.3, y: BED + .27, yaw: 0, seated: true },
    walker('low', [0, -4.5, BED + .03], [0, -1.9, BED + .03], 18, 0), walker('low', [-.8, -.2, BED + .03], [-.4, 3.9, BED + .03], 24, .3), walker('low', [.7, 1.9, BED + .03], [.2, -1.6, BED + .03], 21, .6),
  ]);
  talkers('low', 3, .25, BED + .03, -.9, 2);

  // ---------- 0 mixed: half pods, half open circle ----------
  const DC = { x: 0, z: .1 }, RC = { x: -2.8, z: .4 }, RING_IN = 1.55, RING_OUT = 2.0;
  const mixedPods = [[3.5, -1.5, .1], [3.9, 1.5, .02], [2.3, 3.2, -.02], [2.2, -3.1, .14]].map(([x, z, tilt]) => ({ x, z, yaw: FRONT - tilt, k: .85 }));
  const divider = (t: number): [number, number] => [(1 - t) * (1 - t) * -.2 + 2 * t * (1 - t) * .9 + t * t * -.6, (1 - t) * (1 - t) * -3.1 + 2 * t * (1 - t) * .2 + t * t * 3.6];
  stateGroup('commons-state-mixed', 'mixed', 0, .6, g => {
    // Round deck with a stepped edge: a wide foot ring under the deck disc, the deck hollowed by the sunken circle.
    arc(g, 0, 5.6, .15, [DC.x, 0, DC.z], white);
    const deck = new T.Shape();
    deck.absarc(0, 0, 5.45, 0, Math.PI * 2, false);
    const hole = new T.Path();
    hole.absarc(RC.x, -(RC.z - DC.z), RING_OUT, 0, Math.PI * 2, true);
    deck.holes.push(hole);
    mesh(g, new T.ExtrudeGeometry(deck, { depth: DECK - .15, bevelEnabled: false, curveSegments: 48 }).rotateX(-Math.PI / 2), white, DC.x, .15, DC.z);
    // Sunken circle: floor .25 below the deck, a continuous pink-topped bench round it (two tiers on the back half), a round table in the middle.
    arc(g, 0, RING_OUT + .02, .1, [RC.x, 0, RC.z], white);
    arc(g, RING_IN, RING_OUT, .28, [RC.x, .1, RC.z], white);
    arc(g, RING_IN - .01, RING_OUT, .04, [RC.x, .38, RC.z], sharePink);
    arc(g, RING_OUT, RING_OUT + .15, .27, [RC.x, DECK, RC.z], white, Math.PI, Math.PI);
    arc(g, RING_OUT, RING_OUT + .15, .04, [RC.x, DECK + .27, RC.z], sharePink, Math.PI, Math.PI);
    mesh(g, new T.CylinderGeometry(.42, .38, .26, 24), white, RC.x, .23, RC.z);
    mesh(g, new T.CylinderGeometry(.5, .5, .05, 24), white, RC.x, .38, RC.z);
    // Front-right pink steps (three treads) leading in from the lawn.
    [[5.45, 5.7, .26], [5.7, 5.95, .17], [5.95, 6.2, .08]].forEach(([inner, outer, top]) => arc(g, inner, outer, top, [DC.x, 0, DC.z], sharePink, 2.0, .75));
    // Curved planting bed dividing the pod half from the open circle, with four trees and shrubs.
    const N = 12;
    for (let i = 0; i < N; i++) {
      const a = divider(i / N), b = divider((i + 1) / N);
      segment(g, a, b, .95, .6, DECK, white, .05);
      segment(g, a, b, .8, .05, DECK + .6, bedGreen, .01);
    }
    for (let i = 0; i <= 8; i++) { const [x, z] = divider(i / 8); bush(g, x + (hash(i) - .5) * .3, DECK + .6, z, .3 + hash(i + 3) * .15, i % 2 ? shrubGreen : hedgeGreen); }
    [[.12, .9], [.38, .75], [.66, .85], [.9, .7]].forEach(([t, s]) => { const [x, z] = divider(t); tree(g, x, DECK + .6, z, s); });
    // Pod-half steps and planter edge shrubs.
    for (const [x, z] of [[1.6, .1], [1.45, -.35]]) box(g, [.7, .14, .5], [x, DECK + .07, z], white, .02);
    bush(g, 3.8, DECK, 3.3, .4); bush(g, 4.0, DECK, -2.6, .38); bush(g, 3.4, DECK, -3.3, .36);
  }, true);
  const mixedPlace = podFleet(stage, 'commons-pods-mixed', mixedPods, true, DECK);
  addPart('mixed', .35, .65, mixedPlace);
  const ringSeat = (angle: number, r = (RING_IN + RING_OUT) / 2 + .02) => ({ x: RC.x + Math.cos(angle) * r, z: RC.z - Math.sin(angle) * r, yaw: Math.atan2(-Math.cos(angle), Math.sin(angle)) });
  for (let i = 0; i < 14; i++) {
    const a = (i + .5) / 14 * Math.PI * 2 + .15, s = ringSeat(a);
    people('mixed', [{ ...s, y: .38 + .04, seated: true, talk: [40 + (i >> 1), i & 1, 2] }]);
  }
  people('mixed', [
    { x: RC.x + .15, z: RC.z - .4, y: .1, yaw: .3, talk: [60, 0, 2] }, { x: RC.x - .3, z: RC.z + .3, y: .1, yaw: 3.4, talk: [60, 1, 2] },
    { ...podPoint(mixedPods[0], -.35, 0), y: DECK + POD_SEAT * .85, yaw: mixedPods[0].yaw - Math.PI / 2, seated: true },
    { x: 1.45, z: -.35, y: DECK + .14, yaw: -1.4, seated: true }, { x: 1.6, z: .2, y: DECK + .14, yaw: -1.4, seated: true },
    walker('mixed', [-3.4, -3.0, DECK], [-3.0, -2.7, DECK], 6, 0, true), walker('mixed', [-3.7, -3.4, DECK], [-3.2, -3.0, DECK], 5, .5, true), walker('mixed', [-3.0, -2.5, DECK], [-3.6, -3.1, DECK], 7, .2, true),
  ]);

  // Canopy: a white hovering lens, shared construction for the mixed disc and the +1 roof; each state adds its own seams and emitters.
  const canopy = (band: Band, scale: number, build: (g: T.Group) => void) => {
    const g = new T.Group();
    g.name = `commons-canopy-${band}`;
    g.add(canopyLens());
    build(g);
    g.add(...bake(g));
    g.visible = false;
    g.scale.setScalar(HIDDEN);
    stage.add(g);
    return { group: g, scale };
  };
  const canopyLevel = { mixed: 0, high: 0 };
  const MIX_SCALE = 2.8 / 5.2;
  const mixedCanopy = canopy('mixed', MIX_SCALE, g => {
    ringTorus(g, 5.2, .05, sharePink, 0, 0, 0);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      ringTorus(g, .4 / MIX_SCALE, .05 / MIX_SCALE, glow, Math.cos(a) * 3.7, -1.1, Math.sin(a) * 3.7);
      disc(g, .3 / MIX_SCALE, halo, Math.cos(a) * 3.7, -1.05, Math.sin(a) * 3.7);
    }
  });
  addPart('mixed', .6, .4, level => { canopyLevel.mixed = level; });
  const HIGH_SCALE = 5 / 5.2;
  const highCanopy = canopy('high', HIGH_SCALE, g => {
    ringTorus(g, 5.2, .06, sharePink, 0, 0, 0);
    ringTorus(g, 5.2, .02, white, 0, -.3, 0);
    for (let i = 0; i < 8; i++) rib(g, i * Math.PI / 4 + Math.PI / 8, .16);
    ringTorus(g, 3, .07, glow, 0, -.85, 0);
    mesh(g, new T.CylinderGeometry(1.3, 1.5, .5, 24), white, 0, -.75, 0);
    mesh(g, new T.CylinderGeometry(.7, .9, .4, 16), white, 0, -1.1, 0);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + .3;
      box(g, [.9, .4, .6], [Math.cos(a) * 2.0, -.8, Math.sin(a) * 2.0], white, .05).rotation.y = -a;
      box(g, [.12, .14, 1.6], [Math.cos(a) * 1.7, -.7, Math.sin(a) * 1.7], white, .02).rotation.y = -a + Math.PI / 2;
    }
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      mesh(g, new T.SphereGeometry(.45, 14, 8).scale(1, .3, 1), glow, Math.cos(a) * 3.9, -.42, Math.sin(a) * 3.9);
      disc(g, .5, halo, Math.cos(a) * 3.9, -.6, Math.sin(a) * 3.9);
    }
  });

  // ---------- +1 high: open commons amphitheatre ----------
  const AC = { x: 0, z: 6.5 }, DECK_HIGH = 1.6;
  const terraces = [[4.5, 1.4], [5.15, 1.15], [5.8, .9], [6.45, .65], [7.1, .4]].map(([inner, top]) => ({ inner, outer: inner + .65, top }));
  const heightAt = (x: number, z: number) => {
    if (z >= 2) return DECK_HIGH;
    const r = Math.hypot(x - AC.x, z - AC.z);
    return terraces.find(t => r >= t.inner && r < t.outer)?.top ?? SLAB;
  };
  const angles = (t: { inner: number; outer: number }) => Math.max(Math.asin(Math.min(1, 1.7 / t.inner)), t.outer > 6 ? Math.acos(6 / t.outer) : 0);
  const tables = [[-1.9, 2.75], [1.9, 2.75], [-1.05, 4.0], [1.05, 4.0]];
  stateGroup('commons-state-high', 'high', 0, .6, g => {
    plate(g, 13.2, 11.2, SLAB, 1.4, 0);
    box(g, [12, DECK_HIGH - SLAB, 2.6], [0, SLAB + (DECK_HIGH - SLAB) / 2, 3.3], white, .05);
    const gap = .8;
    for (const t of terraces) {
      const mid = (t.inner + t.outer) / 2, a0 = angles(t), d = gap / mid, h = t.top - SLAB;
      for (const [start, end] of [[a0, Math.PI / 2 - d], [Math.PI / 2 + d, Math.PI - a0]]) {
        arc(g, t.inner, t.outer, h, [AC.x, SLAB, AC.z], white, start, end - start);
        arc(g, t.outer - .06, t.outer, .025, [AC.x, t.top, AC.z], sharePink, start, end - start);
      }
      box(g, [gap * 2, h, t.outer - t.inner + .02], [0, SLAB + h / 2, AC.z - mid], white, .03);
      // Long curved bench on the tread (two runs, either side of the stair).
      const bd = (gap + .4) / (mid + .1);
      benchArc(g, mid + .1, t.top, AC.x, AC.z, a0 + .25, Math.PI / 2 - bd - a0 - .25);
      benchArc(g, mid + .1, t.top, AC.x, AC.z, Math.PI / 2 + bd, Math.PI / 2 - bd - a0 - .25);
    }
    box(g, [12, .03, .06], [0, DECK_HIGH, 2.0], sharePink, .01);
    // Raised planters on the terraces: five trees and shrub beds, strongest on the left.
    const planter = (x: number, z: number, w: number, d: number, yaw: number, trees: [number, number][]) => {
      const y = heightAt(x, z), p = new T.Group();
      p.position.set(x, y, z);
      p.rotation.y = yaw;
      box(p, [w, .4, d], [0, .2, 0], white, .04);
      box(p, [w - .12, .04, d - .12], [0, .42, 0], bedGreen, .01);
      for (let i = 0; i < 5; i++) bush(p, (hash(i + x) - .5) * (w - .5), .4, (hash(i + z + 7) - .5) * (d - .4), .3 + hash(i + 11) * .2, i % 2 ? shrubGreen : hedgeGreen);
      g.add(p);
      for (const [tx, ts] of trees) tree(g, x + tx * Math.cos(yaw), y + .4, z - tx * Math.sin(yaw), ts);
    };
    planter(-4.3, .55, 1.7, 1.3, .3, [[-.1, .95]]);
    planter(-3.0, 1.9, 1.5, 1.0, .4, [[.0, .75]]);
    planter(4.45, .7, 1.5, 1.1, -.3, [[.0, .8]]);
    planter(-5.0, 3.1, 1.0, 1.7, 0, [[.0, .7]]);
    planter(5.0, 2.9, 1.0, 1.7, 0, [[.0, .65]]);
    planter(-1.4, 2.35, 1.3, .6, 0, []);
    // Two glazed pavilions at the back corners: warm interior seen through glassPane between white mullions, a sofa inside.
    for (const s of [-1, 1]) {
      const p = new T.Group();
      p.position.set(s * 3.9, DECK_HIGH, 3.4);
      g.add(p);
      const w = 2.2, h = 1.5, d = 1.6;
      box(p, [w, .06, d], [0, .03, 0], glowFloor, .01);
      box(p, [w - .1, h - .1, .06], [0, h / 2, d / 2 - .1], glowMid, .01); // back wall (the pavilion front is the −Z side)
      box(p, [w + .3, .12, d + .3], [0, h + .06, 0], white, .03);
      box(p, [w - .3, .03, d - .3], [0, h - .03, 0], glowCeil, .01);
      for (let k = 0; k <= 4; k++) for (const sz of [-d / 2, d / 2]) box(p, [.05, h, .05], [-w / 2 + k * w / 4, h / 2, sz], white, .01);
      for (const sx of [-w / 2, w / 2]) for (const k of [0, 1]) box(p, [.05, h, .05], [sx, h / 2, -d / 2 + (k + .5) * d / 2], white, .01);
      box(p, [w, .03, .05], [0, .12, -d / 2], white, .01);
      box(p, [w, h, .01], [0, h / 2, -d / 2 - .01], glassPane, .002);
      box(p, [.01, h, d], [s * -w / 2 - .01 * s, h / 2, 0], glassPane, .002);
      box(p, [1.2, .22, .45], [0, .17, .3], white, .05);
      box(p, [1.2, .3, .1], [0, .4, .5], sharePink, .03);
      box(p, [.4, .2, .4], [-s * .7, .13, -.1], white, .03);
    }
    // Four round tables with four stools each.
    for (const [x, z] of tables) {
      mesh(g, new T.CylinderGeometry(.42, .42, .04, 20), white, x, DECK_HIGH + .62, z);
      mesh(g, new T.CylinderGeometry(.05, .08, .6, 8), white, x, DECK_HIGH + .3, z);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .6; mesh(g, new T.CylinderGeometry(.13, .13, .05, 10), white, x + Math.sin(a) * .62, DECK_HIGH + .27, z + Math.cos(a) * .62); mesh(g, new T.CylinderGeometry(.02, .02, .25, 5), white, x + Math.sin(a) * .62, DECK_HIGH + .13, z + Math.cos(a) * .62); }
    }
  }, true);
  addPart('high', .4, .6, level => { canopyLevel.high = level; });
  // Residents of +1.
  tables.forEach(([x, z], i) => {
    for (let k = 0; k < (i === 3 ? 3 : 4); k++) {
      const a = k * Math.PI / 2 + .6, r = .62;
      people('high', [{ x: x + Math.sin(a) * r, z: z + Math.cos(a) * r, y: DECK_HIGH + .3, yaw: a + Math.PI, seated: true, talk: [80 + i, k, 4] }]);
    }
  });
  const onTerrace = (n: number, angle: number, dx = 0) => {
    const t = terraces[n], r = (t.inner + t.outer) / 2 + .1;
    return { x: AC.x + Math.cos(angle) * r + dx, z: AC.z - Math.sin(angle) * r, y: t.top + .2, yaw: Math.atan2(Math.cos(angle), -Math.sin(angle)), seated: true };
  };
  people('high', [
    { ...onTerrace(0, 2.25), talk: [90, 0, 2] }, { ...onTerrace(0, 2.1), talk: [90, 1, 2] },
    { ...onTerrace(1, 1.15), talk: [91, 0, 2] }, { ...onTerrace(1, 1.0), talk: [91, 1, 2] },
    { ...onTerrace(2, 2.05) }, { ...onTerrace(3, 2.3), talk: [92, 0, 2] }, { ...onTerrace(3, 2.15), talk: [92, 1, 2] },
    { ...onTerrace(4, 2.45), talk: [93, 0, 2] }, { ...onTerrace(4, 2.3), talk: [93, 1, 2] }, { ...onTerrace(1, .95) },
    { ...onTerrace(3, .9) },
    walker('high', [.3, 1.6, DECK_HIGH], [.3, -1.2, .4], 22, 0), walker('high', [-.3, -1.2, .4], [-.3, 1.6, DECK_HIGH], 26, .5),
    walker('high', [2.2, -3.4, SLAB], [3.7, -2.4, SLAB], 7, 0, true), walker('high', [-.2, -3.3, SLAB], [1.3, -2.1, SLAB], 6, .3, true), walker('high', [3.5, -3.8, SLAB], [2.1, -2.8, SLAB], 8, .6, true), walker('high', [-2.5, -3.2, SLAB], [-1.3, -4.1, SLAB], 6.5, .1, true),
    { x: 0, z: -3.6, y: SLAB, yaw: 2.8, talk: [94, 0, 2] }, { x: -.4, z: -3.8, y: SLAB, yaw: -.3, talk: [94, 1, 2] },
  ]);

  // Residents, drawn only when a band is settled so a changing state never squashes a visible body.
  const residents = pedestrians(stage, 44, 'commons-people');
  const pose = new T.Object3D();
  const marker = createGuestMarker(root, 'sw');
  const frame = (now: number) => {
    const still = prefersReducedMotion();
    const t = still ? 0 : now;
    const ready = stage.visible && stage.scale.y > .999;
    // Canopies lower in / lift away with their part, and bob gently once up (±.06 over the circle, ±.08 over the lot).
    for (const [c, level, x, y, z, bobAmp] of [
      [mixedCanopy, canopyLevel.mixed, RC.x - .2, 4.2, RC.z - .2, .06], [highCanopy, canopyLevel.high, 0, 6.3, 0, .08],
    ] as const) {
      c.group.visible = level > HIDDEN;
      c.group.position.set(x, y + (1 - level) * 3 + (still ? 0 : Math.sin(now * Math.PI * 2 / 6) * bobAmp * level), z);
      c.group.scale.setScalar(Math.max(HIDDEN, smoothstep(level)) * c.scale);
    }
    const settled = (['low', 'mixed', 'high'] as const).find(band => parts.every(part => part.band === band ? part.level > .999 : part.level < HIDDEN));
    let slot = 0;
    for (const actor of settled && ready ? actors[settled] : []) {
      const s = COMMONS_FOLK[settled!] / root.scale.x * (actor.kid ? .6 : 1);
      let { x, z, y, yaw } = actor;
      let walk = 0, phase = 0;
      if (actor.walk && !still) {
        const u = ((now / actor.walk.period + actor.walk.phase) % 1 + 1) % 1, there = u < .5, e = smoothstep(there ? u * 2 : 2 - u * 2);
        const [bx, bz, by] = actor.walk.to, dx = bx - actor.x, dz = bz - actor.z;
        x = T.MathUtils.lerp(actor.x, bx, e); z = T.MathUtils.lerp(actor.z, bz, e); y = T.MathUtils.lerp(actor.y, by, e);
        yaw = facing(there ? dx : -dx, there ? dz : -dz);
        walk = .4; phase = now * 5 + slot;
      } else if (actor.walk) yaw = facing(actor.walk.to[0] - actor.x, actor.walk.to[1] - actor.z);
      const gesture = actor.talk ? conversationPose(now, actor.talk[0] + (actor.talk[0] < 100 ? 3000 : 0), actor.talk[1], actor.talk[2]).gesture : 0;
      pose.position.set(x, y - (actor.seated ? .5 * s : 0), z);
      pose.rotation.set(0, yaw, 0);
      pose.scale.setScalar(s);
      residents.set(slot, pose);
      residents.gait(slot, phase, walk, actor.seated ? 1 : 0);
      residents.social(slot, 0, gesture);
      slot++;
    }
    pose.scale.setScalar(HIDDEN / root.scale.x);
    for (; slot < 44; slot++) { residents.set(slot, pose); residents.gait(slot, 0, 0); residents.social(slot, 0, 0); }
    residents.show(settled !== undefined && ready);
    residents.flush();
  };
  const commonsPlaza = createCommonsPlazaRuntime(parts, frame);
  return {
    id: 'dogenzakaSouth', root,
    layers: { plaza: plazaLayer, commonsNeutralProps: neutralPropsLayer },
    marker,
    commonsPlaza, sharingDistrict: new SharingDistrict(scene),
  };
}
