import * as T from 'three';
import { METER_COLORS, glassPane, glow, glowCeil, glowFloor, glowMid, halo, white } from '../automationKit.ts';
import { arc, bake, box, leafyCrown, nightLit, paint, stone } from '../cityRig.ts';
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
const DECK = .65; // mixed round deck top; the circle floor is .35 below it
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const hash = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
// Residents' size (world metres of a standing adult / 1.65) per state: people read at the target's size, not their stage's.
export const COMMONS_FOLK: Record<Band, number> = { low: 2.4, mixed: 2.6, high: 2.3 };

/** The one saturated accent of the commons: emissive and instance-colour-free, so it reads day and night. */
export const sharePink = new T.MeshStandardMaterial({ color: METER_COLORS.publicSharing, emissive: METER_COLORS.publicSharing, emissiveIntensity: .9, roughness: .5 });
// White membrane (not clear glass): milky and faintly self-lit.
const screenGlass = new T.MeshStandardMaterial({ color: '#f6f7fb', emissive: '#ffffff', emissiveIntensity: .15, roughness: .5, transparent: true, opacity: .85, depthWrite: false });
const paneGlass = new T.MeshStandardMaterial({ color: '#dff1ff', roughness: .1, transparent: true, opacity: .45, depthWrite: false });
const warmWall = nightLit(new T.MeshStandardMaterial({ color: '#ffd9a8', emissive: '#ffa860', emissiveIntensity: .95, roughness: 1 }), 1.3, '#ff9a3c');
const fernGreen = paint('#3f7d3a', .85);
const propBlue = paint('#5d9ad0', .6), propYellow = paint('#eec35a', .6);
const coreGrey = paint('#5d646e', .6);
const peach = nightLit(new T.MeshStandardMaterial({ color: '#ffd2a6', emissive: '#ff9a58', emissiveIntensity: .75, roughness: 1 }), 1.1, '#ff9a3c');
// Cool white-blue halo on the terrace under an emitter (additive, above the bloom threshold's reach so it also reads by day).
const emitRing = new T.MeshBasicMaterial({ color: new T.Color('#9fe8ff').multiplyScalar(2.5), toneMapped: false });
const emitPad = new T.MeshBasicMaterial({ color: new T.Color('#e4faff').multiplyScalar(3), toneMapped: false });
const emitHalo = new T.MeshBasicMaterial({ color: '#8fd8ff', transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
const hedgeGreen = paint('#72b45e', .85), shrubGreen = paint('#5f9f52', .85), bedGreen = paint('#477a43', .9);

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
type Actor = { x: number; z: number; y: number; yaw: number; seated?: boolean; kid?: boolean; big?: number; talk?: [number, number, number]; walk?: { to: [number, number, number]; period: number; phase: number } };

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

const POD_H = .6; // hover gap between the terrace and the pod floor (a visible dark gap)
const POD_BASE = .2; // interior floor above the pod's lowest point
const PD = 1.35; // pod depth
const POD_SEAT = POD_H + POD_BASE + .22; // seat top above the terrace under the pod

/** Softens an extruded shell: sides bulge at mid-depth and the top is deeper than the bottom (centre height cy, half height 0.75). */
function soften(geometry: T.BufferGeometry, cy: number): T.BufferGeometry {
  const pos = geometry.attributes.position as T.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const yn = (pos.getY(i) - cy) / .75, zn = pos.getZ(i) / (PD / 2);
    pos.setX(i, pos.getX(i) * (1 + .07 * (1 - zn * zn)));
    pos.setZ(i, pos.getZ(i) * (1 + .12 * yn));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** One private pod in its own frame: front (the glass) on +Z, resting on y 0, floating POD_H above its emitter; nothing touches the ground. */
function podUnit(withPanel: boolean): T.Group {
  const g = new T.Group(), cy = POD_H + .75, seatY = POD_H + POD_BASE;
  // Soft capsule: a large-radius squircle tube with a big front opening (~80 % of the front), rounded lip and closed back.
  const lip = { bevelEnabled: true, bevelThickness: .07, bevelSize: .07, bevelOffset: -.07, bevelSegments: 4, curveSegments: 14 };
  const shell = rr(new T.Shape(), 1.8, 1.5, .58);
  shell.holes.push(rr(new T.Path(), 1.46, 1.14, .42));
  mesh(g, soften(new T.ExtrudeGeometry(shell, { ...lip, depth: 1.21 }).translate(0, 0, -PD / 2 + .07), 0), white).position.y = cy;
  mesh(g, soften(new T.ExtrudeGeometry(rr(new T.Shape(), 1.8, 1.5, .58), { ...lip, depth: .02 }).translate(0, 0, -PD / 2 + .07), 0), white).position.y = cy;
  // Pink seam around the glass.
  const seam = rr(new T.Shape(), 1.62, 1.3, .5);
  seam.holes.push(rr(new T.Path(), 1.5, 1.18, .46));
  mesh(g, new T.ExtrudeGeometry(seam, { depth: .03, bevelEnabled: false, curveSegments: 12 }).translate(0, cy, PD / 2 - .015), sharePink);
  // Lit room behind the glass: warm liner and back wall, cream floor, ceiling light; two pink seats at the sides near the glass, a low white table between.
  const liner = rr(new T.Shape(), 1.45, 1.13, .48);
  liner.holes.push(rr(new T.Path(), 1.3, .98, .4));
  mesh(g, new T.ExtrudeGeometry(liner, { depth: 1.0, bevelEnabled: false, curveSegments: 10 }).translate(0, cy, -.5), peach);
  mesh(g, new T.ShapeGeometry(rr(new T.Shape(), 1.45, 1.13, .48), 10), peach, 0, cy, -.5);
  box(g, [1.3, .03, 1.0], [0, seatY - .01, 0], glowFloor, .01);
  box(g, [1.0, .04, .9], [0, cy + .54, 0], glowCeil, .01);
  mesh(g, new T.CylinderGeometry(.12, .12, .03, 14), glow, 0, cy + .51, 0);
  for (const s of [-1, 1]) {
    box(g, [.42, .22, .5], [s * .43, seatY + .11, .26], sharePink, .04);
    box(g, [.07, .5, .5], [s * .62, seatY + .36, .26], sharePink, .02);
  }
  box(g, [.3, .18, .4], [0, seatY + .09, .26], white, .03);
  mesh(g, new T.SphereGeometry(1, 28, 14).scale(.76, .6, .13), glassPane, 0, cy, PD / 2 - .1);
  if (withPanel) box(g, [.04, .9, .9], [.93, cy, -.05], sharePink, .015);
  // Emitter: a flat bright pad under the belly, a bright ring at mid-gap and a cool halo on the terrace.
  mesh(g, new T.CylinderGeometry(.45, .45, .04, 28), emitPad, 0, POD_H - .04, 0);
  ringTorus(g, .65, .09, emitRing, 0, POD_H / 2, 0);
  disc(g, 1.0, emitHalo, 0, .03, 0);
  return g;
}

/** Instanced pods: one InstancedMesh per material of the baked unit; `place` positions are stage (x, z, yaw, scale). */
function podFleet(parent: T.Object3D, name: string, spots: readonly { x: number; z: number; yaw: number; k: number }[], withPanel: boolean, baseY: number) {
  const unit = podUnit(withPanel);
  const meshes = bake(unit).map(source => {
    const instanced = new T.InstancedMesh(source.geometry, source.material, spots.length);
    instanced.name = name;
    // no shadows either way: the shell would darken the residents seated inside
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
/** Raised radial pink rib on the lens top, following its profile: a prism .1 high (top and both sides, each double-sided). */
function rib(g: T.Group, angle: number, width: number) {
  const pos: number[] = [], c = Math.cos(angle), s = Math.sin(angle), nx = -s * width / 2, nz = c * width / 2;
  const at = (r: number, y: number, side: number) => [c * r + side * nx, y, s * r + side * nz];
  const quad = (p0: number[], p1: number[], p2: number[], p3: number[]) => pos.push(...p0, ...p1, ...p2, ...p1, ...p3, ...p2, ...p0, ...p2, ...p1, ...p1, ...p2, ...p3);
  for (let i = 0; i < topSurface.length - 1; i++) {
    const [r0, y0] = topSurface[i], [r1, y1] = topSurface[i + 1];
    quad(at(r0, y0 + .1, -1), at(r0, y0 + .1, 1), at(r1, y1 + .1, -1), at(r1, y1 + .1, 1));
    for (const side of [-1, 1]) quad(at(r0, y0 - .01, side), at(r0, y0 + .1, side), at(r1, y1 - .01, side), at(r1, y1 + .1, side));
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
  const LK = .92; // low pods, spread over the whole terrace so none overlaps another from the hero camera
  // Order: front +x, front -x, middle +x, middle -x, back +x, back -x (+x is screen-left).
  const lowPods = [[4.6, -3.0, .14], [-4.6, -3.0, -.14], [2.2, -.4, .06], [-2.2, -.4, -.06], [3.7, 3.4, .04], [-3.7, 3.4, -.04]]
    .map(([x, z, tilt]) => ({ x, z, yaw: FRONT - tilt, k: LK }));
  // An S from the front entrance, then branches to each pod door: Catmull curves cut into short rotated slabs.
  const curves: [number, number][][] = [
    [[0, -5.3], [.9, -4.4], [-.8, -3.2], [0, -1.8]],
    [[.5, -4.3], [2.5, -4.6], [4.6, -4.55]], [[-.5, -3.9], [-2.5, -4.5], [-4.6, -4.55]],
    [[0, -1.8], [1.0, -1.8], [2.2, -1.75]], [[0, -1.8], [-1.0, -1.8], [-2.2, -1.75]],
    [[0, -1.8], [.4, 0], [1.2, 1.5], [2.6, 2.1], [3.6, 2.2]], [[0, -1.8], [-.4, 0], [-1.2, 1.5], [-2.6, 2.1], [-3.6, 2.2]],
  ];
  const sampled = curves.map(points => new T.CatmullRomCurve3(points.map(([x, z]) => new T.Vector3(x, 0, z))).getPoints(points.length * 28).map(v => [v.x, v.z] as [number, number]));
  const walks = sampled.flatMap(line => line.slice(1).map((q, i) => [line[i], q] as [[number, number], [number, number]]));
  const nearPath = (x: number, z: number) => walks.some(([a, b]) => distToSegment(x, z, a, b) < .8);
  const onCurve = (i: number, u: number, y = BED + .03): [number, number, number] => { const l = sampled[i], p = l[Math.round(u * (l.length - 1))]; return [p[0], p[1], y]; };
  const benches: [number, number, number][] = [[1.75, -3.1, -.25], [-1.85, -3.4, .2], [1.55, 1.5, 1.2]];
  stateGroup('commons-state-low', 'low', 0, .6, g => {
    plate(g, 13.2, 11.2, SLAB, 1.4, 0);
    plate(g, 12.6, 10.6, BED - SLAB, 1.1, SLAB, bedGreen);
    for (const [a, b] of walks) segment(g, a, b, .8, .03, BED, stone, .01);
    // Low clipped hedge along the lot edge only (front with an entrance gap, both sides, back).
    for (let x = -6.1; x <= 6.15; x += .5) if (Math.abs(x) > 1.0) bush(g, x, BED - .05, -5.2, .27, hedgeGreen, .62);
    for (let z = -4.7; z <= 5.2; z += .5) for (const s of [-1, 1]) bush(g, s * 6.05, BED - .05, z, .28, hedgeGreen, .62);
    for (let x = -5.8; x <= 5.8; x += .6) bush(g, x, BED - .05, 5.2, .27, hedgeGreen, .6);
    // Open planting: lighter leafy clumps (two greens, flattened, varied scale) between the paths, fern-like spiky clusters, and small trees with trunks.
    const free = (x: number, z: number) => !nearPath(x, z) && !lowPods.some(p => Math.hypot(x - p.x, z - p.z) < 1.3) && z > -4.8 && z < 4.9 && Math.abs(x) < 5.6;
    for (let i = 0; i < 900; i++) {
      const x = (hash(i) - .5) * 11.8, z = (hash(i + 500) - .5) * 10;
      if (!free(x, z)) continue;
      const size = .2 + hash(i + 900) * .22;
      bush(g, x, BED - .05, z, size, hash(i + 77) > .5 ? shrubGreen : hedgeGreen, .6);
    }
    for (let i = 0; i < 160; i++) {
      const x = (hash(i + 2000) - .5) * 11.4, z = (hash(i + 2500) - .5) * 9.8;
      if (!free(x, z)) continue;
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + i, cone = mesh(g, new T.ConeGeometry(.05, .55, 5), fernGreen, x + Math.cos(a) * .1, BED + .24, z + Math.sin(a) * .1);
        cone.rotation.set(Math.sin(a) * .6, 0, -Math.cos(a) * .6);
      }
    }
    for (const [x, z, s] of [[5.4, 1.2, .8], [-5.4, 1.2, .85], [1.5, 4.6, .75], [-1.5, 4.6, .75], [5.4, 4.4, .8], [-5.4, 4.4, .8], [5.3, -.9, .8], [-5.3, -.9, .8], [0, 4.9, .7], [.0, .9, .65]]) tree(g, x, BED, z, s);
    // Three pink-topped benches along the front path and four slim reservation posts by the pod doors.
    for (const [x, z, yaw] of benches) {
      const b = new T.Group();
      b.position.set(x, BED, z);
      b.rotation.y = yaw;
      box(b, [1.15, .1, .32], [0, .2, 0], white, .02);
      for (const s of [-.45, .45]) box(b, [.07, .17, .28], [s, .085, 0], white, .01);
      box(b, [1.15, .04, .34], [0, .27, 0], sharePink, .01);
      g.add(b);
    }
    for (const [x, z] of [[3.2, -4.0], [-3.2, -4.0], [1.4, .9], [-1.4, .9]]) {
      box(g, [.06, .95, .06], [x, BED + .475, z], white, .02);
      mesh(g, new T.SphereGeometry(.08, 10, 8), glow, x, BED + .98, z);
    }
    // Six free-standing membrane screens at the midpoints between neighbouring pods: white translucent, pink frame, slim white foot.
    for (const [pi, qi] of [[0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [0, 4]]) {
      const p = lowPods[pi], q = lowPods[qi], sc = new T.Group();
      sc.position.set((p.x + q.x) / 2, BED, (p.z + q.z) / 2 - .2);
      sc.rotation.y = Math.atan2(q.x - p.x, q.z - p.z) + Math.PI / 2 + (pi % 2 ? .35 : -.35); // slightly angled toward the camera
      box(sc, [1.0, 2.2, .04], [0, 1.1 + .06, 0], screenGlass, .01);
      for (const sx of [-.5, .5]) box(sc, [.05, 2.2, .07], [sx, 1.16, 0], sharePink, .01);
      for (const sy of [.06, 2.26]) box(sc, [1.05, .05, .07], [0, sy, 0], sharePink, .01);
      box(sc, [.5, .06, .24], [0, .03, 0], white, .02);
      g.add(sc);
    }
  }, true);
  const lowPlace = podFleet(stage, 'commons-pods-low', lowPods, false, BED);
  addPart('low', .35, .65, lowPlace);
  lowPods.forEach((pod, i) => {
    for (const s of [-1, 1]) {
      if (i > 3 && s > 0) continue;
      const p = podPoint(pod, s * .43, .3);
      people('low', [{ ...p, y: POD_SEAT * pod.k + BED, yaw: pod.yaw - s * (Math.PI / 2 - .6), seated: true, big: 1.2, talk: [i, s < 0 ? 0 : 1, 2] }]);
    }
  });
  people('low', [
    { x: benches[0][0] - .25, z: benches[0][1], y: BED + .27, yaw: Math.PI - .25, seated: true }, { x: benches[0][0] + .25, z: benches[0][1], y: BED + .27, yaw: Math.PI - .25, seated: true },
    { x: benches[1][0], z: benches[1][1], y: BED + .27, yaw: Math.PI + .2, seated: true }, { x: benches[2][0], z: benches[2][1], y: BED + .27, yaw: 1.2 + Math.PI, seated: true },
    walker('low', onCurve(0, .1), onCurve(0, .95), 18, 0), walker('low', onCurve(5, .95), onCurve(5, .1), 22, .3), walker('low', onCurve(6, .1), onCurve(6, .95), 24, .6),
    walker('low', onCurve(1, .1), onCurve(1, .95), 20, .8), walker('low', onCurve(2, .95), onCurve(2, .15), 17, .45),
  ]);
  talkers('low', 3, -.2, BED + .03, -2.6, 2);

  // ---------- 0 mixed: half pods, half open circle ----------
  const DC = { x: 0, z: .1 }, RC = { x: -2.8, z: .4 }, RING_IN = 1.7, RING_OUT = 2.0, FLOOR = DECK - .35, SEAT = FLOOR + .3;
  const mixedPods = [[3.5, -1.5, .1], [3.9, 1.5, .02], [2.3, 3.2, -.02], [2.2, -3.1, .14]].map(([x, z, tilt]) => ({ x, z, yaw: FRONT - tilt, k: .98 }));
  const divider = (t: number): [number, number] => [(1 - t) * (1 - t) * -.2 + 2 * t * (1 - t) * .9 + t * t * -.6, (1 - t) * (1 - t) * -4.3 + 2 * t * (1 - t) * .2 + t * t * 4.5];
  const WALL = .7;
  stateGroup('commons-state-mixed', 'mixed', 0, .6, g => {
    // Round deck with a stepped edge: a wide foot ring under the deck disc, the deck hollowed by the sunken circle (its riser wall is the hole edge).
    arc(g, 0, 5.6, .15, [DC.x, 0, DC.z], white);
    const deck = new T.Shape();
    deck.absarc(0, 0, 5.45, 0, Math.PI * 2, false);
    const hole = new T.Path();
    hole.absarc(RC.x - DC.x, -(RC.z - DC.z), RING_OUT, 0, Math.PI * 2, true);
    deck.holes.push(hole);
    mesh(g, new T.ExtrudeGeometry(deck, { depth: DECK - .15, bevelEnabled: false, curveSegments: 48 }).rotateX(-Math.PI / 2), white, DC.x, .15, DC.z);
    // Sunken circle: floor .35 below the deck, a narrow pink-topped bench round the wall (two tiers on the back half), a round table in the middle.
    arc(g, 0, RING_OUT + .02, FLOOR, [RC.x, 0, RC.z], white);
    arc(g, RING_IN, RING_OUT, SEAT - FLOOR, [RC.x, FLOOR, RC.z], white);
    arc(g, RING_IN - .02, RING_OUT, .035, [RC.x, SEAT, RC.z], sharePink);
    arc(g, RING_OUT, RING_OUT + .18, .22, [RC.x, DECK, RC.z], white, Math.PI, Math.PI);
    arc(g, RING_OUT, RING_OUT + .18, .035, [RC.x, DECK + .22, RC.z], sharePink, Math.PI, Math.PI);
    mesh(g, new T.CylinderGeometry(.6, .55, .08, 28), white, RC.x, FLOOR + .38, RC.z);
    mesh(g, new T.CylinderGeometry(.14, .2, .34, 16), white, RC.x, FLOOR + .17, RC.z);
    for (const [dx, dz, c] of [[.25, -.15, 0], [-.3, .1, 1], [.1, .3, 2], [-.1, -.3, 3]]) box(g, [.2, .07, .14], [RC.x + dx, FLOOR + .46, RC.z + dz], [propBlue, sharePink, propYellow, shrubGreen][c], .01);
    // Front-right pink steps (three treads) leading in from the lawn.
    [[5.45, 5.7, DECK - .15], [5.7, 5.95, DECK - .32], [5.95, 6.2, DECK - .49]].forEach(([inner, outer, top]) => arc(g, inner, outer, top, [DC.x, 0, DC.z], sharePink, 2.0, .75));
    // Planter wall dividing the pod half from the open circle, packed with four trees of varied height and dense shrubs spilling over the edge.
    const N = 16;
    for (let i = 0; i < N; i++) {
      const a = divider(i / N), b = divider((i + 1) / N);
      segment(g, a, b, .95, WALL, DECK, white, .05);
      segment(g, a, b, .8, .05, DECK + WALL, bedGreen, .01);
    }
    for (let i = 0; i <= 28; i++) {
      const [x, z] = divider(i / 28), side = i % 2 ? 1 : -1;
      bush(g, x + side * (.25 + hash(i) * .3), DECK + WALL - .2, z, .22 + hash(i + 3) * .16, i % 3 ? shrubGreen : hedgeGreen);
      bush(g, x - side * .1, DECK + WALL, z + .15, .2 + hash(i + 9) * .15, i % 3 ? hedgeGreen : shrubGreen);
    }
    [[.03, .65], [.17, .9], [.33, .7], [.5, 1.0], [.66, .75], [.82, .9], [.96, .7]].forEach(([t, s]) => { const [x, z] = divider(t); tree(g, x, DECK + WALL, z, s); });
    for (const [x, z] of [[1.6, .1], [1.45, -.35]]) box(g, [.7, .14, .5], [x, DECK + .07, z], white, .02);
    bush(g, 4.3, DECK, 3.6, .4); bush(g, 4.5, DECK, -3.0, .38); bush(g, 3.4, DECK, -3.8, .36);
  }, true);
  const mixedPlace = podFleet(stage, 'commons-pods-mixed', mixedPods, true, DECK);
  addPart('mixed', .35, .65, mixedPlace);
  const ringSeat = (angle: number, r = (RING_IN + RING_OUT) / 2 + .02) => ({ x: RC.x + Math.cos(angle) * r, z: RC.z - Math.sin(angle) * r, yaw: Math.atan2(-Math.cos(angle), Math.sin(angle)) });
  for (let i = 0; i < 14; i++) {
    const a = (i + .5) / 14 * Math.PI * 2 + .15, s = ringSeat(a);
    people('mixed', [{ ...s, yaw: s.yaw + (i % 2 ? .5 : -.5), y: SEAT + .035, seated: true, big: 1.15, talk: [40 + (i >> 1), i & 1, 2] }]);
  }
  const stepSeat = (a: number) => ({ x: DC.x + Math.cos(a) * 5.58, z: DC.z - Math.sin(a) * 5.58, y: DECK - .15, yaw: Math.atan2(-Math.cos(a), Math.sin(a)) });
  people('mixed', [
    ...mixedPods.slice(0, 2).flatMap((pod, i) => [-1, 1].map(sd => ({ ...podPoint(pod, sd * .43, .3), y: DECK + POD_SEAT * pod.k, yaw: pod.yaw - sd * (Math.PI / 2 - .6), seated: true, big: 1.2, talk: [70 + i, sd < 0 ? 0 : 1, 2] as [number, number, number] }))),
    { x: 1.45, z: -.35, y: DECK + .14, yaw: -1.4, seated: true }, { x: 1.6, z: .2, y: DECK + .14, yaw: -1.4, seated: true },
    ...[2.3, 2.42, 2.54].map(a => ({ ...stepSeat(a), seated: true, kid: true, big: 1.2 })),
  ]);

  // Canopy: a white hovering lens, shared construction for the mixed disc and the +1 roof; each state adds its own seams and emitters.
  const canopy = (band: Band, scale: number, build: (g: T.Group) => void, sx = 1) => {
    const g = new T.Group();
    g.name = `commons-canopy-${band}`;
    g.add(canopyLens());
    build(g);
    g.add(...bake(g));
    g.visible = false;
    g.scale.setScalar(HIDDEN);
    stage.add(g);
    return { group: g, scale, sx };
  };
  const canopyLevel = { mixed: 0, high: 0 };
  const MIX_SCALE = 2.4 / 5.2;
  const mixedCanopy = canopy('mixed', MIX_SCALE, g => {
    ringTorus(g, 5.2, .05, sharePink, 0, 0, 0);
    // Four ring emitters on the camera-facing half of the rim (front-left, front, front-right, right), hanging below it.
    for (const [x, z] of [[1.75, -1.75], [0, -2.45], [-1.75, -1.75], [-2.45, 0]]) {
      ringTorus(g, .45 / MIX_SCALE, .08 / MIX_SCALE, emitRing, x / MIX_SCALE, -.35 / MIX_SCALE, z / MIX_SCALE);
      disc(g, .65 / MIX_SCALE, emitHalo, x / MIX_SCALE, -.4 / MIX_SCALE, z / MIX_SCALE);
    }
  });
  addPart('mixed', .6, .4, level => { canopyLevel.mixed = level; });
  const HIGH_SCALE = 5 / 5.2, HIGH_SX = 1.15; // an ellipse 5.75 x 5.0
  const highCanopy = canopy('high', HIGH_SCALE, g => {
    // Thick pink rim band (.12 high) in 8 segments with short white gaps; 8 raised radial ribs; a solid bright stabiliser ring underneath.
    for (let i = 0; i < 8; i++) arc(g, 5.0, 5.28, .12, [0, -.06, 0], sharePink, i * Math.PI / 4 + .07, Math.PI / 4 - .14);
    ringTorus(g, 5.2, .02, white, 0, -.3, 0);
    for (let i = 0; i < 8; i++) rib(g, i * Math.PI / 4 + Math.PI / 8, .12);
    ringTorus(g, 3, .14, emitRing, 0, -.85, 0);
    mesh(g, new T.CylinderGeometry(1.3, 1.5, .6, 24), white, 0, -.75, 0);
    mesh(g, new T.CylinderGeometry(.7, .9, .5, 16), coreGrey, 0, -1.15, 0);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + .3;
      box(g, [.9, .4, .6], [Math.cos(a) * 2.0, -.8, Math.sin(a) * 2.0], white, .05).rotation.y = -a;
      box(g, [.7, .12, .3], [Math.cos(a) * 2.0, -1.05, Math.sin(a) * 2.0], coreGrey, .02).rotation.y = -a;
      box(g, [.12, .14, 1.6], [Math.cos(a) * 1.7, -.7, Math.sin(a) * 1.7], coreGrey, .02).rotation.y = -a + Math.PI / 2;
    }
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      mesh(g, new T.SphereGeometry(.45, 14, 8).scale(1, .3, 1), emitPad, Math.cos(a) * 3.9, -.42, Math.sin(a) * 3.9);
      disc(g, .7, emitHalo, Math.cos(a) * 3.9, -.6, Math.sin(a) * 3.9);
    }
  }, HIGH_SX);

  // ---------- +1 high: open commons amphitheatre ----------
  // A wide fan: terrace arcs centred off the front-right corner (screen lower-right), sweeping from back-left to the right side; the flat forecourt is the wedge near the centre.
  const AC = { x: -5, z: -6 }, DECK_HIGH = 1.6, PHI_STAIR = .98;
  const terraces = Array.from({ length: 6 }, (_, k) => ({ inner: 4.5 + k, outer: 5.5 + k, top: SLAB + .21 * (k + 1) }));
  const dirAt = (phi: number, r: number) => [AC.x + Math.cos(phi) * r, AC.z + Math.sin(phi) * r] as const;
  // Angular span (from +x towards +z) in which a terrace stays inside the lot.
  const spans = terraces.map(t => {
    let lo = Infinity, hi = -Infinity;
    for (let phi = -.4; phi < 2.4; phi += .003) {
      if ([t.inner, t.outer].every(r => { const [x, z] = dirAt(phi, r); return Math.abs(x) <= 6.35 && z >= -5.45 && z <= 5.35; })) { lo = Math.min(lo, phi); hi = Math.max(hi, phi); }
    }
    return [lo, hi] as const;
  });
  const heightAt = (x: number, z: number) => {
    if (z >= 2) return DECK_HIGH;
    const r = Math.hypot(x - AC.x, z - AC.z);
    return terraces.find(t => r >= t.inner && r < t.outer)?.top ?? SLAB;
  };
  const tables = [[-1.9, 2.75], [1.9, 2.75], [-1.05, 4.0], [1.05, 4.0]];
  stateGroup('commons-state-high', 'high', 0, .6, g => {
    plate(g, 13.2, 11.2, SLAB, 1.4, 0);
    box(g, [12, DECK_HIGH - SLAB, 2.6], [0, SLAB + (DECK_HIGH - SLAB) / 2, 3.3], white, .05);
    const gap = .8;
    terraces.forEach((t, k) => {
      const mid = (t.inner + t.outer) / 2, [lo, hi] = spans[k], d = gap / mid, h = t.top - SLAB;
      for (const [p0, p1] of [[lo, PHI_STAIR - d], [PHI_STAIR + d, hi]]) {
        if (p1 <= p0) continue;
        arc(g, t.inner, t.outer, h, [AC.x, SLAB, AC.z], white, -p1, p1 - p0);
        arc(g, t.outer - .14, t.outer, .06, [AC.x, t.top, AC.z], sharePink, -p1, p1 - p0); // saturated edge seam
        if (k % 2) benchArc(g, mid + .05, t.top, AC.x, AC.z, -(p1 - .06), p1 - p0 - .12); // long continuous bench on every second tread
      }
      const [sx, sz] = dirAt(PHI_STAIR, mid);
      box(g, [gap * 2, h, t.outer - t.inner + .02], [sx, SLAB + h / 2, sz], white, .03).rotation.y = Math.PI / 2 - PHI_STAIR;
    });
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
      box(p, [w - .1, h - .1, .06], [0, h / 2, d / 2 - .1], warmWall, .01); // back wall (the pavilion front is the −Z side)
      for (let k = 0; k <= 5; k++) for (const sz of [-d / 2, d / 2]) box(p, [.05, h, .05], [-w / 2 + k * w / 5, h / 2, sz], white, .01); // mullions every .4
      for (const sx of [-w / 2, w / 2]) for (let k = 0; k <= 4; k++) box(p, [.05, h, .05], [sx, h / 2, -d / 2 + k * d / 4], white, .01);
      box(p, [w, .04, .05], [0, .12, -d / 2], white, .01);
      box(p, [w, .05, .05], [0, h, -d / 2], white, .01);
      box(p, [w, h, .01], [0, h / 2, -d / 2 - .01], paneGlass, .002);
      box(p, [.01, h, d], [-s * w / 2 - .01 * s, h / 2, 0], paneGlass, .002);
      box(p, [.01, h, d], [s * w / 2 + .01 * s, h / 2, 0], paneGlass, .002);
      // Pitched glass roof: two slopes to a white ridge beam, white eaves and rafters, a warm ceiling light under the ridge.
      for (const k of [-1, 1]) {
        box(p, [1.25, .03, d + .2], [k * .6, h + .2, 0], paneGlass, .002).rotation.z = -k * .32;
        box(p, [.06, .07, d + .3], [k * (w / 2 + .05), h, 0], white, .01);
        for (const sz of [-d / 2 - .05, d / 2 + .05]) box(p, [1.25, .05, .05], [k * .6, h + .2, sz], white, .01).rotation.z = -k * .32;
      }
      box(p, [.08, .08, d + .3], [0, h + .39, 0], white, .01);
      box(p, [.6, .03, d - .3], [0, h + .3, 0], glowCeil, .01);
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
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + .6, r = .62;
      people('high', [{ x: x + Math.sin(a) * r, z: z + Math.cos(a) * r, y: DECK_HIGH + .3, yaw: a + Math.PI, seated: true, talk: [80 + i, k, 4] }]);
    }
  });
  // Groups of two or three on the long curved benches (every second terrace), facing down the fan.
  const seatOn = (k: number, frac: number) => {
    const t = terraces[k], [lo, hi] = spans[k], phi = lo + frac * (hi - lo), [x, z] = dirAt(phi, (t.inner + t.outer) / 2 + .05);
    return { x, z, y: t.top + .215, yaw: Math.atan2(-Math.cos(phi), -Math.sin(phi)), seated: true as const };
  };
  [[1, [.12, .18]], [1, [.72, .78]], [3, [.14, .2, .26]], [3, [.72, .78]], [5, [.2, .26]], [5, [.82, .88, .94]]].forEach(([k, fr], gi) => {
    (fr as number[]).forEach((f, j) => people('high', [{ ...seatOn(k as number, f), talk: [90 + gi, j, (fr as number[]).length] }]));
  });
  const stairA = dirAt(PHI_STAIR, 4.2), stairB = dirAt(PHI_STAIR, 9.9);
  people('high', [
    walker('high', [stairA[0], stairA[1], SLAB], [stairB[0], stairB[1], DECK_HIGH], 22, 0), walker('high', [stairB[0], stairB[1], DECK_HIGH], [stairA[0], stairA[1], SLAB], 26, .5),
    // Children on the forecourt wedge, each crossing a different way.
    walker('high', [-4.5, -4.2, SLAB], [-2.5, -3.5, SLAB], 6, 0, true), walker('high', [-3, -5, SLAB], [-1.5, -4.2, SLAB], 7, .3, true), walker('high', [-5, -3, SLAB], [-3.5, -2, SLAB], 5.5, .6, true), walker('high', [-2, -3.2, SLAB], [-3.2, -4.9, SLAB], 6.5, .1, true),
    { x: -2.3, z: -3.0, y: SLAB, yaw: 2.8, talk: [94, 0, 2] }, { x: -2.7, z: -3.2, y: SLAB, yaw: -.3, talk: [94, 1, 2] },
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
      [mixedCanopy, canopyLevel.mixed, RC.x, 3.6, -.9, .06], [highCanopy, canopyLevel.high, 0, 6.8, 0, .08],
    ] as const) {
      c.group.visible = level > HIDDEN;
      c.group.position.set(x, y + (1 - level) * 3 + (still ? 0 : Math.sin(now * Math.PI * 2 / 6) * bobAmp * level), z);
      c.group.scale.set(c.sx, 1, 1).multiplyScalar(Math.max(HIDDEN, smoothstep(level)) * c.scale);
    }
    const settled = (['low', 'mixed', 'high'] as const).find(band => parts.every(part => part.band === band ? part.level > .999 : part.level < HIDDEN));
    let slot = 0;
    for (const actor of settled && ready ? actors[settled] : []) {
      const s = COMMONS_FOLK[settled!] / root.scale.x * (actor.kid ? .6 : 1) * (actor.big ?? 1);
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
      pose.position.set(x, y - (actor.seated ? .56 * s : 0), z);
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
