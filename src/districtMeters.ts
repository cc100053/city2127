import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { arc, bake, box, chrome, cream, glass, leaf, leafyCrown, publicLight, skyGlass, solar, stone, trail, trim, warm } from './cityRig.ts';
import { changeSites, seaward } from './layout.ts';
import { inHeroClear, inMega } from './megaFootprints.ts';
import { automationBays, BAY_SCALE } from './automationBays.ts';
import { automationBlue, METER_COLORS, quadFleet } from './automationKit.ts';
import { buildCanopy, buildColumn, buildMast, buildPavilion, buildPort, CANOPY_Y, COLUMN_DOCK_X, COLUMN_PAD, HALL_ROOF, HALL_Z, MAST_TOP, PORT_TOP, TOWER_PITCH, TOWER_RING0, TOWER_RING_R, TOWER_RINGS } from './automationBayModels.ts';
import { megaGlass, megaRib, megaShell } from './megastructures.ts';
import { shoreRoomBays } from './waterRooms.ts';
import { automationActivity, pavilionFlight, pedestrians, plazaPose, routes, serviceDrones } from './mobility.ts';
import { prefersReducedMotion, SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';
import { BuildChoreography, buildProgress, type BuildItem } from './buildTransition.ts';
import type { ExhibitionLayout } from './surveyView.ts';
import { STAGE_SLOTS } from './stages.ts';

const HIDDEN = 1e-4;

/** Slow, bounded breathing of district-owned accents; daylight remains steady. */
export const meterNightRhythm = (now: number, share: number, axis: number, darkness: number) =>
  1 + .25 * darkness * Math.sin(now * Math.PI * 2 / (12 + axis * 4 + (1 - share) * 8) + axis);
const mean = (levels: SlotLevels) => levels.value.reduce((a, b) => a + b, 0) / levels.value.length;

/** 0..1 level per slot, eased toward its target over the shared 3-second site transition. */
export class SlotLevels {
  readonly value: Float32Array;
  /** Slots whose target changed in the latest `setTargets` call. */
  readonly changed: number[] = [];
  private readonly from: Float32Array;
  private readonly to: Float32Array;
  private start = -Infinity;
  private active = false;
  private readonly ease: (raw: number) => number;

  /** `ease` maps transition progress 0..1 to level progress; slots that play the build choreography pass `buildProgress`. */
  constructor(count: number, ease = (raw: number) => raw * raw * (3 - 2 * raw)) {
    this.ease = ease;
    this.value = new Float32Array(count);
    this.from = new Float32Array(count);
    this.to = new Float32Array(count);
  }

  /** Returns whether any target changed. `immediate` jumps (snapshots, resets, reduced motion). */
  setTargets(target: (i: number) => number, now: number, immediate: boolean, seed = 0, sampleAt = now): boolean {
    this.update(sampleAt);
    // Shuffle the existing ranks, preserving their counts and complementary covers. Zero keeps the original order.
    const order = Array.from({ length: this.to.length }, (_, i) => i);
    let random = seed;
    if (seed) for (let i = order.length - 1; i > 0; i--) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const j = Math.floor(random / 0x100000000 * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    let changed = false;
    this.changed.length = 0;
    for (let i = 0; i < this.to.length; i++) {
      const next = Math.fround(target(order[i]));
      if (next !== this.to[i]) { changed = true; this.changed.push(i); }
      this.to[i] = next;
    }
    if (immediate) { this.value.set(this.to); this.active = false; }
    else if (changed) { this.from.set(this.value); this.start = now; this.active = true; }
    return changed;
  }

  /** Returns whether values moved this frame. */
  update(now: number): boolean {
    if (!this.active) return false;
    const raw = Math.min(1, Math.max(0, (now - this.start) / SITE_TRANSITION_SECONDS)), p = this.ease(raw);
    for (let i = 0; i < this.value.length; i++) this.value[i] = this.from[i] + (this.to[i] - this.from[i]) * p;
    this.active = raw < 1;
    return true;
  }

  /** Settled targets, independent of animation time; used to describe actual carrier configuration. */
  get targets(): Readonly<Float32Array> { return this.to; }

  visible(): number {
    let n = 0;
    for (const level of this.value) if (level > HIDDEN) n++;
    return n;
  }
}

export { METER_COLORS, automationBlue };
export { BAY_SCALE };
export type ChangedPoint = PulsePoint & { slot: string };
/** `focus`: the Meter's site anchor, the one place a change is read from; other changed slots only ring faintly. */
export type PulsePoint = { x: number; y: number; z: number; r: number; focus?: boolean };
export const PULSE_SECONDS = 3, PULSE_WAVES = 2, PULSE_WAVE_GAP = 1.2;

/** A live change marks where it happened: each changed slot sends two faint expanding light rings and the Meter's site sends bright
 * rings with a fading light shaft, in the Meter's colour. Additive and unlit, so shared city materials never flash; snapshots and resets emit nothing. */
export class PulseRings {
  private readonly rings: T.InstancedMesh;
  private readonly beams: T.InstancedMesh;
  private readonly pulses: (PulsePoint & { start: number })[] = [];
  private readonly dummy = new T.Object3D();
  private readonly tint = new T.Color();
  private readonly capacity: number;

  constructor(parent: T.Object3D, color: T.ColorRepresentation, capacity: number) {
    this.capacity = capacity;
    const material = (vertexColors: boolean) => new T.MeshBasicMaterial({ color, vertexColors, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false });
    this.rings = new T.InstancedMesh(new T.RingGeometry(.8, 1, 48).rotateX(-Math.PI / 2), material(false), capacity);
    // Unit shaft, bright at its foot and fading to nothing 1 unit up.
    const beam = new T.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, .5, 0), shade = new Float32Array(beam.attributes.position.count * 3);
    for (let i = 0; i < beam.attributes.position.count; i++) shade.fill(1 - beam.attributes.position.getY(i), i * 3, i * 3 + 3);
    beam.setAttribute('color', new T.BufferAttribute(shade, 3));
    this.beams = new T.InstancedMesh(beam, material(true), capacity);
    for (const mesh of [this.rings, this.beams]) {
      // Named for main.ts, which keeps these unlit overlays out of GTAO's normal prepass.
      mesh.name = 'meter-pulse'; mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = 2;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.setColorAt(0, this.tint.setRGB(0, 0, 0)); parent.add(mesh);
    }
  }

  emit(points: readonly PulsePoint[], now: number): void {
    for (let wave = 0; wave < PULSE_WAVES; wave++) for (const p of points) this.pulses.push({ ...p, start: now + wave * PULSE_WAVE_GAP });
    // ponytail: oldest pulses drop past capacity; capacity is two waves of every slot, so only rapid repeated changes lose rings.
    if (this.pulses.length > this.capacity) this.pulses.splice(0, this.pulses.length - this.capacity);
  }

  clear(): void { this.pulses.length = 0; this.rings.count = this.beams.count = 0; }

  /** Pulses currently drawing (started and not yet faded). */
  active(now: number): number { return this.pulses.filter(p => now >= p.start && now - p.start < PULSE_SECONDS).length; }

  update(now: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) if (now - this.pulses[i].start >= PULSE_SECONDS) this.pulses.splice(i, 1);
    this.pulses.forEach((p, i) => {
      const age = (now - p.start) / PULSE_SECONDS, t = Math.min(1, Math.max(0, age));
      // Not yet started: zero colour (additive, so it adds nothing) at its own position.
      const glow = age < 0 ? 0 : T.MathUtils.smoothstep(t, 0, .08) * (1 - t) ** 2;
      this.dummy.position.set(p.x, p.y + .5, p.z); this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(p.r * (.6 + 1.6 * t)); this.dummy.updateMatrix();
      this.rings.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.set(p.r * .25, 40 + p.r * 2, p.r * .25); this.dummy.updateMatrix();
      this.beams.setMatrixAt(i, this.dummy.matrix);
      // Only the site carries a shaft, so a whole-district change still reads as one place per Meter.
      const ring = glow * (p.focus ? 2.2 : .8);
      this.tint.setRGB(ring, ring, ring);
      this.rings.setColorAt(i, this.tint);
      this.tint.multiplyScalar(p.focus ? .5 : 0); this.beams.setColorAt(i, this.tint);
    });
    for (const mesh of [this.rings, this.beams]) {
      mesh.count = this.pulses.length; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
}

/** Build items of a district's changed slots from each slot's settled mass height before and after the change (`null`: not a built slot). */
const buildItems = (points: readonly ChangedPoint[], before: ReadonlyMap<string, number>, site: (slot: string) => Omit<BuildItem, 'from' | 'to'> & { top: number } | null): BuildItem[] =>
  points.flatMap(({ slot }) => { const o = site(slot); return o ? [{ x: o.x, y: o.y, z: o.z, r: o.r, from: before.get(slot) ?? 0, to: o.top }] : []; });

/** The site's own anchor pulses with its district, tying the lot to the district-wide change. */
const sitePulse = (socket: keyof typeof changeSites): PulsePoint => {
  const s = changeSites[socket];
  return { x: s.x, y: 1, z: s.z, r: Math.max(s.w, s.d) * s.scale * .9, focus: true };
};

/** Fixed pseudo-random rank per slot, so a share of slots switches in a scattered rather than end-to-end order. */
const rank = (i: number) => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
/** P8: fixed design family (0..n − 1) per slot; the 7.31 stride breaks the long runs neighbouring slots give `rank`, the salt decorrelates carriers. */
export const designOf = (i: number, salt: number, n: number) => Math.floor(rank(i * 7.31 + salt) * n);
/** Ladder rung → progress of a district from its mixed toward its complete form: rungs 0–1 (focal only) keep mixed, 2 is halfway, 3 complete. */
export const rungStep = (tier: number) => [0, 0, .5, 1][Math.min(3, Math.abs(tier))];
/** A district's switched share at `tier`, from its mixed share toward 1 (high) or 0 (low); a fixed seed keeps the switched slots nested. */
export const ladderShare = (tier: number, mixed: number) => mixed + ((tier > 0 ? 1 : 0) - mixed) * rungStep(tier);
/** Threshold for `rank < cut` slots at `tier`: mixed and complete as `ladderShare`, while rung 2 switches half the slots between them
 * counted in rank order, since hashed ranks bunch (the 11 service bays already show 8 drone ports at mixed). */
export function ladderCut(ranks: readonly number[], tier: number, mixed: number): number {
  if (rungStep(tier) !== .5) return ladderShare(tier, mixed);
  const sorted = [...ranks].sort((a, b) => a - b), n = sorted.length;
  const k = Math.round((sorted.filter(r => r < mixed).length + (tier > 0 ? n : 0)) / 2);
  return k >= n ? 1 : k <= 0 ? 0 : (sorted[k - 1] + sorted[k]) / 2;
}
const ranks = (n: number, key: (i: number) => number) => Array.from({ length: n }, (_, i) => key(i));
/** Stage index of each slot `${prefix}${i + 1}` in `STAGE_SLOTS`; −1 outside every stage. */
const stagesOf = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => Object.values(STAGE_SLOTS).findIndex(slots => slots.includes(`${prefix}${i + 1}`)));
/** Rank index per slot: slots of one close-up stage take neighbouring ranks of `key`, so they switch at the same rung and the stage's wide shot
 * shows them changing together. The seed reorders whole stages only (zero keeps table order), never the number of slots switched. */
export function stageRanks(stages: readonly number[], key: (i: number) => number, seed = 0): number[] {
  const order = [...Object.keys(STAGE_SLOTS).keys(), -1];
  let random = seed;
  if (seed) for (let i = order.length - 1; i > 0; i--) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(random / 0x100000000 * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const slots = stages.map((_, i) => i).sort((a, b) => order.indexOf(stages[a]) - order.indexOf(stages[b]) || a - b);
  const byRank = stages.map((_, i) => i).sort((a, b) => key(a) - key(b));
  const out: number[] = [];
  slots.forEach((slot, k) => { out[slot] = byRank[k]; });
  return out;
}
/** P9: share of slots showing a hybrid design: 60 % at mixed, 30 % at rung 2, none in the complete form. */
export const ladderHybrid = (tier: number) => .6 * (1 - rungStep(tier));
/** P10: a pairing shows only when both its sites complete the same side (rung 3, or −3 for the low pairing). */
export const agree = (tiers: ExhibitionLayout['tiers'], a: keyof ExhibitionLayout['tiers'], b: keyof ExhibitionLayout['tiers'], side: 'high' | 'low') =>
  (side === 'high' ? Math.min(tiers[a], tiers[b]) : -Math.max(tiers[a], tiers[b])) >= 3;
type LadderTarget = Pick<ExhibitionLayout, 'tiers'>;

/** Private shell height as a share of its radius: a hemispherical vault rather than the former 28 m egg. */
export const PRIVATE_RISE = 1.15;
/** The vault overhangs its island like a shell parasol; the open steps reach 1.38 × radius. */
const SPREAD = 1.45;
/** Halo canopy height as a share of room radius (about 6–8 m). */
const HALO = .42;
/** Inland sharing courts [x, z, yaw]: open ground scanned clear of landmarks, context, routes, P2 pavilions and P4 towers / pods. Court 4 moved from (50, -340) to (110, -320) when the AUTO HUB lot grew over it (R4).
 * Street network stage 2 (2026-11-04): courts 2, 5, 6 and 8 stood on the ④ boulevard's line and moved to the nearest site passing the same checks with their
 * square 15 m off its centreline (from -110, 230; -70, 180; -290, 290; 220, 0).
 * P7 ranks by estimated visible hero-frame pixels (`SCAN_COURTS=20` in tests/odaiba.test.ts lists candidates best first). */
const COURT_SITES: readonly (readonly [number, number, number])[] = ([
  [-220, -140, .4], [-410, 120, 1.1], [-110, 250, 2.3], [110, -320, .9], [170, -360, 3.6], [-137, 286, 1.7], [-385, 290, 5.1], [-460, 290, .2], [190, 0, 2.8], [-20, 210, 4.4],
] as const).filter(([x, z]) => !inMega(x, z, 22)); // P1: nothing stands inside a megastructure footprint
const COURT = 40;
/** Garden crowns inside a private court [x, z, size], clear of the glass room and the entrance. */
const COURT_TREES: readonly (readonly [number, number, number])[] = [[-10, 8, 4.2], [0, -3, 3.4], [8, 9, 3.8], [10, -9, 3.2], [-2, 13, 2.8], [-14, -14, 2.6]];
/** Blossom orchard crowns around a shared court's edge [x, z], clear of parasols, pergola and the kiosk corner (13, 12). */
const ORCHARD: readonly (readonly [number, number])[] = [[-15, -15], [0, -16], [15, -15], [-17, 9], [17, -8], [-12, 16]];
/** Parasol centres in a shared plaza. */
const PARASOLS: readonly (readonly [number, number])[] = [[-6, -6], [8, -2], [-2, 9]];
/** Existing planted islands become private water gardens (every other one under a glass vault) or open waterfront commons:
 * stepped seating where the vaults stood, planted halo canopies on the others. */
export class SharingDistrict {
  changedPoints: ChangedPoint[] = [];
  readonly root = new T.Group();
  readonly bays = shoreRoomBays().map(b => ({ x: b.x, z: b.z, yaw: b.yaw, r: b.r + 1.5, y: 2.8, sx: 1, sz: 1 }));
  private readonly levels = new SlotLevels(this.bays.length, buildProgress);
  private readonly screens: T.InstancedMesh;
  /** Rooms that carry a glass vault when private; the rest stay open gardens and become halo commons. */
  readonly vaulted = this.bays.map((_, i) => i % 2 === 0);
  /** Second carrier, inland: 40 m courts that are walled private gardens or open shared plazas under parasols. */
  readonly courts = COURT_SITES.map(([x, z, yaw]) => ({ x, z, yaw }));
  private readonly court = new SlotLevels(COURT_SITES.length, buildProgress);
  /** P9 hybrids at mixed: half-open rooms (a half-height vault over the open steps; garden islands gain the steps instead of a halo)
   * and shared garden courts (walls, crowns, paving, parasols). */
  private readonly hybridRooms: SlotLevels;
  private readonly hybridCourts = new SlotLevels(COURT_SITES.length, buildProgress);
  private readonly courtWalls: T.InstancedMesh;
  private readonly courtPavilions: T.InstancedMesh;
  private readonly courtCrowns: T.InstancedMesh;
  private readonly plazaPaving: T.InstancedMesh;
  private readonly plazaParasols: T.InstancedMesh;
  /** P8 design per court: private = walled garden (0) / glass winter garden (1); open = parasol plaza (0) / long-table pergola (1). */
  readonly privateDesign = COURT_SITES.map((_, i) => designOf(i, 1013, 2));
  // Salt picked so court 2, in the COMMONS PLAZA sight line, keeps the open parasols (a solid pergola roof would hide the site).
  readonly openDesign = COURT_SITES.map((_, i) => designOf(i, 1052, 2));
  /** P10 extras on open courts: drone kiosks (sharing + automation high) and blossom orchards (sharing + environment high). */
  private readonly kiosk = new SlotLevels(COURT_SITES.length);
  private readonly orchard = new SlotLevels(COURT_SITES.length);
  private readonly kioskMeshes: T.InstancedMesh[];
  private readonly orchardCrowns: T.InstancedMesh;
  private readonly winterGardens: T.InstancedMesh;
  private readonly winterFrames: T.InstancedMesh;
  private readonly pergolaFrames: T.InstancedMesh;
  private readonly pergolaRoofs: T.InstancedMesh;
  private readonly ribs: T.InstancedMesh;
  private readonly halos: T.InstancedMesh;
  private readonly haloGardens: T.InstancedMesh;
  private readonly haloLights: T.InstancedMesh;
  private readonly haloDecks: T.InstancedMesh;
  private readonly deckGlow = publicLight.clone();
  private readonly rims: T.InstancedMesh;
  private readonly skylights: T.InstancedMesh;
  private readonly steps: T.InstancedMesh[];
  private readonly pulses: PulseRings;
  private readonly build: BuildChoreography;
  private readonly crowd: ReturnType<typeof pedestrians>;
  private readonly lights: T.MeshStandardMaterial[];
  private nightRhythm = 1;
  private readonly dummy = new T.Object3D();
  private target = .5;
  private now = 0;

  constructor(parent: T.Object3D) {
    this.root.name = 'sharing-district';
    this.hybridRooms = new SlotLevels(this.bays.length, buildProgress);
    // Gridshell vault: frosted pearl glass over the garden on ivory ribs and ring beams; rose (the sharing colour) stays on the rim and oculus.
    const privacy = glass.clone(); privacy.color.set('#f4f1ea'); privacy.emissive.set('#ffe2cf'); privacy.emissiveIntensity = .3;
    privacy.side = T.DoubleSide; privacy.transparent = true; privacy.opacity = .62; privacy.depthWrite = false;
    const commons = stone.clone(); commons.emissive.set('#eac0b2'); commons.emissiveIntensity = .3;
    const light = publicLight.clone(); light.emissive.set('#ffa9b1'); light.emissiveIntensity = 1.8;
    const warm = publicLight.clone(); warm.emissive.set('#ffd6a0'); warm.emissiveIntensity = 1.6;
    this.lights = [light, warm];
    this.deckGlow.emissive.set('#ffcf94');
    const instance = (geometry: T.BufferGeometry, material: T.Material, name: string) => {
      const mesh = new T.InstancedMesh(geometry, material, this.bays.length);
      mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.root.add(mesh); return mesh;
    };
    // The landward gap aligns with each existing footbridge; the garden and waterfalls remain inside.
    const START = Math.PI + .3, LENGTH = Math.PI * 2 - .6, OCULUS = .18;
    const shell = new T.SphereGeometry(1, 64, 24, START, LENGTH, OCULUS, Math.PI / 2 - OCULUS);
    // Unit-sphere point at longitude φ / polar θ, matching SphereGeometry so ribs sit on the glass.
    const at = (phi: number, theta: number) => new T.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
    const tube = (points: T.Vector3[], radius: number) => new T.TubeGeometry(new T.CatmullRomCurve3(points), points.length * 2, radius, 6);
    const ribs = mergeGeometries([
      ...Array.from({ length: 9 }, (_, i) =>
        tube(Array.from({ length: 13 }, (_, k) => at(START + LENGTH * i / 8, OCULUS + (Math.PI / 2 - OCULUS) * k / 12)), .032)),
      ...[OCULUS, .62, 1.05].map(theta => tube(Array.from({ length: 41 }, (_, k) => at(START + LENGTH * k / 40, theta)), .026)),
    ]);
    this.screens = instance(shell, privacy, 'sharing-private-gardens');
    this.screens.castShadow = false;
    this.ribs = instance(ribs, trim, 'sharing-private-ribs');
    const ringGeometry = (inner: number, outer: number, height: number, y = 0) =>
      arc(new T.Group(), inner, outer, height, [0, 0, 0], trim, .3, Math.PI * 2 - .6).geometry.translate(0, y, 0);
    const ring = (inner: number, outer: number, height: number, material: T.Material, name: string) => instance(ringGeometry(inner, outer, height), material, name);
    // Halo commons: an open annular roof on seven slim columns (clear of the landward gap), planted on top.
    const columns = Array.from({ length: 7 }, (_, k) => {
      const a = .3 + LENGTH * (k + .5) / 7;
      return new T.CylinderGeometry(.022, .028, HALO, 8).translate(Math.cos(a) * .9, HALO / 2, -Math.sin(a) * .9).toNonIndexed();
    });
    this.halos = instance(mergeGeometries([ringGeometry(.5, 1.38, .035, HALO), ...columns]), trim, 'sharing-open-halos');
    this.haloGardens = instance(ringGeometry(.58, 1.3, .03, HALO + .035), leaf, 'sharing-open-halos');
    this.haloLights = instance(ringGeometry(1.31, 1.38, .05, HALO + .035), warm, 'sharing-open-halos');
    // Lit boardwalk ring under the canopy: brightens with the city's night glow so the commons read after dark.
    this.haloDecks = instance(ringGeometry(.92, 1.3, .04), this.deckGlow, 'sharing-open-halos');
    this.rims = ring(.99, 1.025, .025, light, 'sharing-room-rims');
    this.skylights = ring(.17, .19, .012, light, 'sharing-private-skylights');
    this.steps = Array.from({ length: 3 }, (_, i) => ring(1 + i * .14, 1.1 + i * .14, .06, commons, 'sharing-open-steps'));
    const n = this.courts.length;
    const batch = (geometry: T.BufferGeometry, material: T.Material, name: string, count = n) => {
      const mesh = new T.InstancedMesh(geometry, material, count);
      mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.root.add(mesh); return mesh;
    };
    // Private court (court-local metres, entrance gap on +X): 2.4 m ivory walls, a glass garden room and dense crowns.
    const H = COURT / 2;
    this.courtWalls = batch(mergeGeometries([
      new T.BoxGeometry(COURT, 2.4, .6).translate(0, 1.2, -H), new T.BoxGeometry(COURT, 2.4, .6).translate(0, 1.2, H),
      new T.BoxGeometry(.6, 2.4, COURT).translate(-H, 1.2, 0),
      new T.BoxGeometry(.6, 2.4, H - 5).translate(H, 1.2, -(H + 5) / 2), new T.BoxGeometry(.6, 2.4, H - 5).translate(H, 1.2, (H + 5) / 2),
    ]), trim, 'sharing-private-courts');
    this.courtPavilions = batch(new T.BoxGeometry(12, 4.2, 9).translate(-8, 2.1, -7), privacy, 'sharing-private-courts');
    this.courtCrowns = batch(leafyCrown(1), new T.MeshStandardMaterial({ color: '#ffffff', roughness: .92 }), 'sharing-private-courts', n * COURT_TREES.length);
    const color = new T.Color();
    for (let i = 0; i < n * COURT_TREES.length; i++) this.courtCrowns.setColorAt(i, i % 4 === 2 ? color.set('#efc2cf') : color.setHSL(.26 + (i % 5) * .01, .4, .22 + (i % 3) * .02));
    // Shared plaza: a pale paved disc with three rose parasols on slim masts (9 m canopies about 9 m up).
    this.plazaPaving = batch(new T.CylinderGeometry(H - 1, H - 1, .3, 48).translate(0, .15, 0), commons, 'sharing-open-plazas');
    const parasol = trim.clone(); parasol.color.set('#a66f72'); parasol.side = T.DoubleSide;
    this.plazaParasols = batch(mergeGeometries(PARASOLS.flatMap(([x, z]) => [
      new T.ConeGeometry(9, 2.2, 24, 1, true).rotateX(Math.PI).translate(x, 9.1, z).toNonIndexed(),
      new T.CylinderGeometry(.25, .3, 9, 8).translate(x, 4.5, z).toNonIndexed(),
    ])), parasol, 'sharing-open-plazas');
    // Winter garden: a 30 × 24 m glass house, 6.5 m high on seven ivory portal frames, the court's crowns growing inside
    // (kept low: the court in front of PARK must not hide the site from the hero pose).
    this.winterGardens = batch(new T.BoxGeometry(30, 6.5, 24).translate(0, 3.25, 0), privacy, 'sharing-private-courts');
    this.winterFrames = batch(mergeGeometries(Array.from({ length: 7 }, (_, k) => {
      const x = -15 + k * 5;
      return [new T.BoxGeometry(.5, 6.7, .5).translate(x, 3.35, -12), new T.BoxGeometry(.5, 6.7, .5).translate(x, 3.35, 12), new T.BoxGeometry(.5, .5, 24.5).translate(x, 6.7, 0)];
    }).flat()), trim, 'sharing-private-courts');
    // Long-table pergola: a 34 m planted pergola about 6 m up over two long shared tables.
    this.pergolaFrames = batch(mergeGeometries([
      ...Array.from({ length: 7 }, (_, k) => [-1, 1].map(side => new T.BoxGeometry(.5, 6, .5).translate(-16.5 + k * 5.5, 3, side * 3.6))).flat(),
      new T.BoxGeometry(34, .5, .5).translate(0, 6.1, -3.6), new T.BoxGeometry(34, .5, .5).translate(0, 6.1, 3.6),
      new T.BoxGeometry(28, .9, 1.4).translate(0, .75, -1.6), new T.BoxGeometry(28, .9, 1.4).translate(0, .75, 1.6),
    ]), trim, 'sharing-open-plazas');
    this.pergolaRoofs = batch(mergeGeometries(Array.from({ length: 6 }, (_, k) => new T.BoxGeometry(4.6, .5, 8.6).translate(-13.75 + k * 5.5, 6.6, 0))), leaf, 'sharing-open-plazas');
    // Drone kiosk in a court corner: a 12 m mast and landing disc with a lit blue ring and a docked drone.
    this.kioskMeshes = [
      batch(mergeGeometries([new T.CylinderGeometry(.35, .6, 12, 8).translate(0, 6, 0), new T.CylinderGeometry(3.2, 1.2, .6, 24).translate(0, 12, 0)]), trim, 'sharing-drone-kiosks'),
      batch(new T.TorusGeometry(3.2, .22, 6, 24).rotateX(Math.PI / 2).translate(0, 12.4, 0), trail, 'sharing-drone-kiosks'),
      batch(new T.SphereGeometry(1, 12, 8).scale(1.3, .55, 1).translate(0, 13, 0), glass, 'sharing-drone-kiosks'),
    ];
    this.orchardCrowns = batch(leafyCrown(1), new T.MeshStandardMaterial({ color: '#ffffff', roughness: .9 }), 'sharing-orchards', n * ORCHARD.length);
    for (let i = 0; i < n * ORCHARD.length; i++) this.orchardCrowns.setColorAt(i, color.set(i % 3 === 0 ? '#f6f1e8' : i % 3 === 1 ? '#f2bfd0' : '#7fa35e'));
    this.crowd = pedestrians(this.root, this.courts.length * 12, 'plaza-crowds');
    this.pulses = new PulseRings(this.root, METER_COLORS.publicSharing, (this.bays.length + n + 1) * PULSE_WAVES);
    this.build = new BuildChoreography(this.root, METER_COLORS.publicSharing, this.bays.length + n);
    this.root.visible = false; parent.add(this.root); this.write();
  }

  /** `quiet` settles a live change without pulses (another site carries the result's headline). */
  setTarget({ tiers }: LadderTarget, now: number, immediate: boolean, seed = 0, quiet = false, sampleAt = now): boolean {
    if (immediate) { this.pulses.clear(); this.build.clear(); }
    const tier = tiers.sw, before = this.tops();
    this.target = ladderShare(tier, .5);
    const kiosks = this.kiosk.setTargets(() => agree(tiers, 'sw', 'nw', 'high') ? 1 : 0, now, immediate, 0, sampleAt);
    const orchards = this.orchard.setTargets(() => agree(tiers, 'sw', 'ne', 'high') ? 1 : 0, now, immediate, 0, sampleAt);
    // Mixed keeps about a third of rooms and courts open (the former mixed curve); rung 2 goes halfway to all open / all private.
    const mixed = T.MathUtils.smoothstep(.5, .25, .875);
    const roomCut = ladderCut(ranks(this.bays.length, i => rank(i + 401)), tier, mixed), courtCut = ladderCut(ranks(COURT_SITES.length, i => rank(i + 977)), tier, mixed);
    this.root.visible = true;
    const roomStages = stagesOf('sw:room', this.bays.length), courtStages = stagesOf('sw:court', COURT_SITES.length);
    // Hybrids take the opposite end of the stage order: they sit on still-private slots, and a rung that opens a slot also clears its hybrid.
    const by = (stages: readonly number[], salt: number, end = 1) => { const r = stageRanks(stages, i => end * rank(i + salt), seed); return (i: number) => rank(r[i] + salt); };
    const room = by(roomStages, 401), court = by(courtStages, 977), hybridRoom = by(roomStages, 433, -1), hybridCourt = by(courtStages, 1019, -1);
    const rooms = this.levels.setTargets(i => room(i) < roomCut ? 1 : 0, now, immediate, 0, sampleAt);
    const courts = this.court.setTargets(i => court(i) < courtCut ? 1 : 0, now, immediate, 0, sampleAt);
    const hybrid = ladderHybrid(tier);
    const hr = this.hybridRooms.setTargets(i => hybridRoom(i) < hybrid ? 1 : 0, now, immediate, 0, sampleAt);
    const hc = this.hybridCourts.setTargets(i => hybridCourt(i) < hybrid ? 1 : 0, now, immediate, 0, sampleAt);
    const changed = rooms || courts || hr || hc || kiosks || orchards;
    const roomSlots = new Set([...(rooms ? this.levels.changed : []), ...(hr ? this.hybridRooms.changed : [])]);
    const courtSlots = new Set([...(courts ? this.court.changed : []), ...(hc ? this.hybridCourts.changed : []), ...(kiosks ? this.kiosk.changed : []),
      ...(orchards ? this.orchard.changed : [])]);
    this.changedPoints = [...[...roomSlots].map(i => {
      const b = this.bays[i]; return { slot: `sw:room${i + 1}`, x: b.x, y: b.y, z: b.z, r: b.r * b.sx * 1.3 };
    }), ...[...courtSlots].map(i => ({ slot: `sw:court${i + 1}`, x: this.courts[i].x, y: 0, z: this.courts[i].z, r: COURT * .75 }))];
    if (changed && !immediate && !quiet) {
      this.pulses.emit([sitePulse('sw'), ...this.changedPoints], now);
      const after = this.tops();
      this.build.play(buildItems(this.changedPoints, before, slot => {
        const room = slot.startsWith('sw:room'), i = Number(slot.replace(/\D+/g, '')) - 1, b = this.bays[i], c = this.courts[i];
        return room ? { x: b.x, y: b.y, z: b.z, r: b.r * b.sx * SPREAD, top: after.get(slot)! } : { x: c.x, y: 0, z: c.z, r: COURT * .68, top: after.get(slot)! };
      }), now);
    }
    this.write(); return changed;
  }

  /** Settled top (metres above the slot's ground) of each room and court: vault or halo canopy; walls, glasshouse, parasols, pergola or kiosk. */
  private tops(): Map<string, number> {
    const [rooms, courts] = this.getConfiguration();
    return new Map([...rooms.map(([rise, , steps, halo], i) => [`sw:room${i + 1}`, Math.max(PRIVATE_RISE * this.bays[i].r * rise, HALO * this.bays[i].r * halo, 2.2 * steps)] as const),
      ...courts.map(([walls, winter, , parasols, tables, crowns, kiosk], i) => [`sw:court${i + 1}`, Math.max(2.4 * walls, 6.7 * winter, 10.2 * parasols, 6.9 * tables, 5 * crowns, 13.5 * kiosk)] as const)]);
  }

  update(now: number, darkness = 0): void {
    this.now = now;
    const moved = [this.levels.update(now), this.court.update(now), this.hybridRooms.update(now), this.hybridCourts.update(now), this.kiosk.update(now),
      this.orchard.update(now)].some(Boolean);
    if (moved) this.write();
    this.nightRhythm = meterNightRhythm(now, mean(this.court), 1, darkness);
    this.lights.forEach((light, i) => light.emissiveIntensity = (i ? 1.6 : 1.8) * this.nightRhythm);
    this.deckGlow.emissiveIntensity = (.2 + darkness * 1.8) * this.nightRhythm;
    this.writeCrowd(now); this.pulses.update(now); this.build.update(now);
  }
  hide(): void { this.root.visible = false; this.pulses.clear(); this.build.clear(); }
  // ponytail: mirrors settled write() transforms; update this projection when adding carrier geometry.
  getConfiguration() {
    return [Array.from(this.levels.targets, (open, i) => {
      const hybrid = this.hybridRooms.targets[i], vault = Math.max(1 - open, hybrid), vaulted = this.vaulted[i];
      return [vaulted ? vault * (1 - .5 * hybrid) : 0, vaulted ? vault : 0,
        vaulted ? Math.max(open, hybrid) : hybrid, vaulted ? 0 : open * (1 - hybrid)];
    }), Array.from(this.court.targets, (open, i) => {
      const hybrid = this.hybridCourts.targets[i], walled = Math.max(1 - open, hybrid), shared = Math.max(open, hybrid);
      const glasshouse = this.privateDesign[i] === 1, pergola = this.openDesign[i] === 1;
      return [glasshouse ? hybrid : walled, glasshouse ? (1 - open) * (1 - hybrid) : 0, shared,
        pergola ? hybrid : shared, pergola ? open * (1 - hybrid) : 0, walled, this.kiosk.targets[i] * open, this.orchard.targets[i] * open];
    })];
  }

  getDiagnostics() {
    const open = this.root.visible ? this.levels.visible() : 0;
    return { enabled: this.root.visible, nightRhythm: this.nightRhythm, plazaPeople: this.root.visible ? this.courts.reduce((n, _, i) => n + (this.crowdLevel(i) > HIDDEN ? 12 : 0), 0) : 0, targetSharing: this.target, rooms: this.bays.length, activePulses: this.pulses.active(this.now), activeBuilds: this.build.active(this.now),
      vaults: this.vaulted.filter(Boolean).length, courts: this.courts.length,
      hybridRooms: this.root.visible ? this.hybridRooms.visible() : 0, hybridCourts: this.root.visible ? this.hybridCourts.visible() : 0,
      droneKiosks: this.root.visible ? this.courts.filter((_, i) => this.kiosk.value[i] * this.court.value[i] > HIDDEN).length : 0,
      orchardCourts: this.root.visible ? this.courts.filter((_, i) => this.orchard.value[i] * this.court.value[i] > HIDDEN).length : 0,
      visibleOpenCourts: this.root.visible ? this.court.visible() : 0, visibleOpenRooms: open, visiblePrivateRooms: this.root.visible ? this.levels.value.filter(v => 1 - v > HIDDEN).length : 0 };
  }

  private crowdLevel(i: number): number {
    const c = this.courts[i];
    // Two legacy courts overlap PARK / COMMONS lot geometry; keep their new actors outside those occupied footprints.
    if (Object.values(changeSites).some(s => Math.abs(c.x - s.x) < s.w * s.scale / 2 + 6 && Math.abs(c.z - s.z) < s.d * s.scale / 2 + 12)) return 0;
    // Wait until private geometry is nearly gone; hybrid garden crowns keep their gathering lanes unoccupied.
    return T.MathUtils.smoothstep(this.court.value[i], .98, 1) * T.MathUtils.smoothstep(1 - this.hybridCourts.value[i], .98, 1);
  }

  private writeCrowd(now: number): void {
    this.courts.forEach(({ x, z, yaw }, i) => {
      const level = this.crowdLevel(i), c = Math.cos(yaw), s = Math.sin(yaw);
      for (let k = 0; k < 12; k++) {
        const p = plazaPose(now, k);
        this.dummy.position.set(x + p.x * c + p.z * s, .3, z - p.x * s + p.z * c);
        this.dummy.rotation.set(0, yaw + p.yaw, 0); this.dummy.scale.setScalar(Math.max(HIDDEN, level));
        this.crowd.set(i * 12 + k, this.dummy);
      }
    });
    this.crowd.flush(); this.crowd.show(this.courts.some((_, i) => this.crowdLevel(i) > HIDDEN));
  }

  private write(): void {
    this.writeCrowd(this.now);
    this.bays.forEach((bay, i) => {
      // A hybrid (half-open) room keeps its vault at half height over the open steps.
      const hybrid = this.hybridRooms.value[i], open = this.levels.value[i], vaulted = this.vaulted[i];
      const vault = Math.max(1 - open, hybrid), height = vaulted ? PRIVATE_RISE * bay.r * vault * (1 - .5 * hybrid) : 0;
      // Keep hidden matrices invertible: flattened curved normals otherwise poison the G-buffer / SSR.
      const privateScale = vaulted ? Math.max(HIDDEN, vault) : HIDDEN, publicScale = Math.max(HIDDEN, open, hybrid);
      const stepScale = vaulted ? publicScale : Math.max(HIDDEN, hybrid), haloScale = vaulted ? HIDDEN : Math.max(HIDDEN, open * (1 - hybrid));
      this.dummy.position.set(bay.x, bay.y, bay.z); this.dummy.rotation.set(0, bay.yaw, 0);
      // A settled-open vault collapses completely; a flat glass disc would otherwise tint the garden.
      const footprint = height > HIDDEN ? SPREAD : HIDDEN;
      this.dummy.scale.set(bay.r * bay.sx * footprint, Math.max(HIDDEN, height), bay.r * bay.sz * footprint); this.dummy.updateMatrix();
      for (const mesh of [this.screens, this.ribs]) mesh.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.y = bay.r; this.dummy.updateMatrix(); this.rims.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.y = bay.y + height * Math.cos(.18);
      this.dummy.scale.set(bay.r * bay.sx * SPREAD * privateScale, bay.r * privateScale, bay.r * bay.sz * SPREAD * privateScale);
      this.dummy.updateMatrix(); this.skylights.setMatrixAt(i, this.dummy.matrix);
      // ponytail: the oculus ring keeps the full-vault radius on a half-height hybrid vault; at hero distance it reads as the rim of the shell.
      this.steps.forEach((mesh, tier) => {
        this.dummy.position.y = bay.y + tier * .7;
        this.dummy.scale.set(bay.r * bay.sx * stepScale, bay.r * stepScale, bay.r * bay.sz * stepScale);
        this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
      });
      this.dummy.position.y = bay.y; this.dummy.scale.set(bay.r * bay.sx * haloScale, bay.r * haloScale, bay.r * bay.sz * haloScale);
      this.dummy.updateMatrix(); for (const mesh of [this.halos, this.haloGardens, this.haloLights, this.haloDecks]) mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.courts.forEach(({ x, z, yaw }, i) => {
      // A hybrid (shared garden) court composes the walled garden with the parasol plaza, whatever the slot's own designs.
      const hybrid = this.hybridCourts.value[i], open = this.court.value[i];
      const walled = Math.max(HIDDEN, 1 - open, hybrid), shared = Math.max(HIDDEN, open, hybrid);
      this.dummy.position.set(x, 0, z); this.dummy.rotation.set(0, yaw, 0);
      // Walls and the garden room sink into the ground; the plaza paving spreads and the parasols open.
      const glasshouse = this.privateDesign[i] === 1, pergola = this.openDesign[i] === 1;
      this.dummy.scale.set(1, glasshouse ? Math.max(HIDDEN, hybrid) : walled, 1); this.dummy.updateMatrix();
      this.courtWalls.setMatrixAt(i, this.dummy.matrix); this.courtPavilions.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.set(1, glasshouse ? Math.max(HIDDEN, (1 - open) * (1 - hybrid)) : HIDDEN, 1); this.dummy.updateMatrix();
      this.winterGardens.setMatrixAt(i, this.dummy.matrix); this.winterFrames.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.set(shared, 1, shared); this.dummy.updateMatrix(); this.plazaPaving.setMatrixAt(i, this.dummy.matrix);
      const parasols = pergola ? Math.max(HIDDEN, hybrid) : shared, tables = pergola ? Math.max(HIDDEN, open * (1 - hybrid)) : HIDDEN;
      this.dummy.scale.set(parasols, parasols, parasols); this.dummy.updateMatrix(); this.plazaParasols.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.set(tables, tables, tables); this.dummy.updateMatrix();
      this.pergolaFrames.setMatrixAt(i, this.dummy.matrix); this.pergolaRoofs.setMatrixAt(i, this.dummy.matrix);
      const c = Math.cos(yaw), s = Math.sin(yaw), kiosk = Math.max(HIDDEN, this.kiosk.value[i] * open), orchard = Math.max(HIDDEN, this.orchard.value[i] * open);
      this.dummy.position.set(x + 13 * c + 12 * s, 0, z - 13 * s + 12 * c); this.dummy.scale.setScalar(kiosk); this.dummy.updateMatrix();
      for (const mesh of this.kioskMeshes) mesh.setMatrixAt(i, this.dummy.matrix);
      ORCHARD.forEach(([tx, tz], k) => {
        const r = (3.2 + (k % 3) * .5) * orchard;
        this.dummy.position.set(x + tx * c + tz * s, r * .8, z - tx * s + tz * c); this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(r * 1.15, r, r * 1.15); this.dummy.updateMatrix(); this.orchardCrowns.setMatrixAt(i * ORCHARD.length + k, this.dummy.matrix);
      });
      this.dummy.rotation.set(0, yaw, 0);
      COURT_TREES.forEach(([tx, tz, size], k) => {
        const r = size * walled;
        this.dummy.position.set(x + tx * c + tz * s, r * .75, z - tx * s + tz * c); this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(r * 1.2, r, r * 1.2); this.dummy.updateMatrix(); this.courtCrowns.setMatrixAt(i * COURT_TREES.length + k, this.dummy.matrix);
      });
    });
    for (const mesh of [this.courtWalls, this.courtPavilions, this.courtCrowns, this.plazaPaving, this.plazaParasols, this.winterGardens, this.winterFrames,
      this.pergolaFrames, this.pergolaRoofs, ...this.kioskMeshes, this.orchardCrowns]) mesh.instanceMatrix.needsUpdate = true;
    // Inactive pairings submit no draws.
    for (const mesh of this.kioskMeshes) mesh.visible = this.kiosk.visible() > 0;
    this.orchardCrowns.visible = this.orchard.visible() > 0;
    for (const mesh of [this.screens, this.ribs, this.halos, this.haloGardens, this.haloLights, this.haloDecks, this.rims, this.skylights, ...this.steps]) mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Shared curtain-wall uniforms (odaibaScene.ts): share of facade bays planted (canopy) or louvred (active cooling). */
export const facadeClimate = { green: { value: 0 }, louvre: { value: 0 } };
/** Extremes reach 60 % of bays; mixed keeps a light hybrid (about 13 % each) so the art-reviewed facade still leads. */
const facadeShare = (share: number) => { const t = Math.min(1, Math.max(0, (share - .35) / .5)); return t * t * (3 - 2 * t) * .6; };

/** Roof garden terraces [x, z, roof y, radius] published by odaibaScene once each landmark has loaded. */
type RoofGarden = [number, number, number, number];
const roofGardens: RoofGarden[] = [];
const roofListeners = new Set<(gardens: readonly RoofGarden[]) => void>();
export function publishRoofGardens(gardens: readonly RoofGarden[]): void {
  roofGardens.push(...gardens);
  for (const listener of roofListeners) listener(gardens);
}

export interface EnvironmentDistrictDiagnostics {
  readonly nightRhythm: number;
  readonly slots: number;
  readonly targetCanopy: number;
  readonly visibleCanopies: number;
  readonly visibleSails: number;
  readonly visibleCoolingTowers: number;
  readonly roofs: number;
  readonly visibleRoofSails: number;
  readonly visibleRoofCrowns: number;
  readonly hybridBays: number;
  readonly hybridRoofs: number;
  readonly activePulses: number;
}

const SLOT_STEP = 24, SPAN = 18, WIDTH = 12, ROOF = 8, TOWER = 22;
/** The Q3 cooling choice made district-wide: every promenade bay is shaded either by a white tensile sail
 * (active cooling) or by a planted pergola (canopy cooling); low environment adds slender mist-cooling towers. */
export class EnvironmentDistrict {
  readonly root = new T.Group();
  private readonly bays: { x: number; y: number; z: number; yaw: number }[] = [];
  private readonly canopy: SlotLevels;
  private readonly sail: SlotLevels;
  private readonly tower: SlotLevels;
  /** P9 hybrids at mixed: a bay keeps its planted cover with its low design lifted above (greenery growing through the sail / louvres);
   * a roof keeps its sail / PV over the forest / meadow. */
  private readonly hybrid: SlotLevels;
  private roofHybrid = new SlotLevels(0);
  private readonly towerBays: number[];
  /** P8 design per bay: low = hypar sail (0) / solar louvre roof (1); high = planted pergola (0) / green screen (1). */
  readonly lowDesign: number[];
  readonly highDesign: number[];
  /** Mist towers: slender shaft (0) / squat cooling drum (1), the same batch scaled. */
  readonly towerDesign: number[];
  private readonly sails: T.InstancedMesh;
  private readonly louvres: T.InstancedMesh;
  private readonly screens: T.InstancedMesh;
  private readonly screenCaps: T.InstancedMesh;
  private readonly slabs: T.InstancedMesh;
  private readonly crowns: T.InstancedMesh;
  private readonly shafts: T.InstancedMesh;
  private readonly rings: T.InstancedMesh;
  private readonly light = trail.clone();
  private nightRhythm = 1;
  private readonly dummy = new T.Object3D();
  private readonly roofs: RoofGarden[] = [];
  private readonly facade = new SlotLevels(2);
  private roofSail = new SlotLevels(0);
  private roofCrown = new SlotLevels(0);
  private readonly pulses: PulseRings;
  /** Roofs: low = solar sail (0) / photovoltaic pergola (1); high = roof-forest crown (0) / meadow terraces (1). */
  private roofLow: number[] = [];
  private roofHigh: number[] = [];
  private roofMeshes?: { sails: T.InstancedMesh; pv: T.InstancedMesh; posts: T.InstancedMesh; crowns: T.InstancedMesh; meadows: T.InstancedMesh };
  private readonly pvGeometry = new T.BoxGeometry(SPAN, .3, WIDTH).rotateZ(.18);
  private readonly meadowGeometry = mergeGeometries([
    new T.CylinderGeometry(1, 1.08, .5, 28).translate(0, .25, 0), new T.CylinderGeometry(.66, .72, .5, 24).translate(0, .75, 0),
    new T.CylinderGeometry(.34, .4, .5, 20).translate(0, 1.25, 0),
  ]);
  private readonly sailMaterial = new T.MeshStandardMaterial({ color: '#fbf8f1', roughness: .55, side: T.DoubleSide, emissive: '#fff4e0', emissiveIntensity: .08 });
  private readonly crownMaterial = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .92 });
  private sailGeometry!: T.BufferGeometry;
  private readonly postGeometry = new T.CylinderGeometry(.22, .3, ROOF, 8);
  private targetCanopy = .5;
  private targetHybrid = .6;
  private orderSeed = 0;
  private now = 0;
  private applied = false;

  constructor(parent: T.Object3D) {
    this.root.name = 'environment-district';
    const clear = (x: number, z: number) => !seaward(x, z) && !Object.values(changeSites)
      .some(site => Math.abs(x - site.x) < site.w * site.scale / 2 + 14 && Math.abs(z - site.z) < site.d * site.scale / 2 + 14);
    for (const path of routes().promenades) {
      const count = Math.floor(path.getLength() / SLOT_STEP);
      for (let i = 1; i < count; i++) {
        const p = path.getPointAt(i / count), t = path.getTangentAt(i / count);
        if (clear(p.x, p.z)) this.bays.push({ x: p.x, y: p.y, z: p.z, yaw: Math.atan2(-t.z, t.x) });
      }
    }
    const n = this.bays.length;
    this.towerBays = this.bays.map((_, i) => i).filter(i => i % 3 === 1);
    this.canopy = new SlotLevels(n);
    this.sail = new SlotLevels(n);
    this.hybrid = new SlotLevels(n);
    this.tower = new SlotLevels(this.towerBays.length);
    this.lowDesign = this.bays.map((_, i) => designOf(i, 503, 2));
    this.highDesign = this.bays.map((_, i) => designOf(i, 541, 2));
    this.towerDesign = this.towerBays.map((_, j) => designOf(j, 709, 2));

    // Static frame: four white posts per bay.
    const posts = new T.InstancedMesh(this.postGeometry, trim, n * 4);
    this.bays.forEach((bay, i) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], k) => {
      this.place(bay, a * (SPAN / 2 - 1), ROOF / 2, b * (WIDTH / 2 - .5));
      posts.setMatrixAt(i * 4 + k, this.dummy.matrix);
    }));
    // Hypar sail: two high and two low corners, so it reads as tensile fabric rather than a flat roof.
    const sailGeometry = new T.PlaneGeometry(SPAN, WIDTH, 12, 8).rotateX(-Math.PI / 2);
    const sp = sailGeometry.attributes.position as T.BufferAttribute;
    for (let i = 0; i < sp.count; i++) sp.setY(i, 1.6 * (sp.getX(i) / (SPAN / 2)) * (sp.getZ(i) / (WIDTH / 2)));
    sailGeometry.computeVertexNormals();
    this.sailGeometry = sailGeometry;
    this.sails = new T.InstancedMesh(sailGeometry, this.sailMaterial, n);
    // Solar louvre roof: six tilted slate slats between the posts (active shading without fabric).
    this.louvres = new T.InstancedMesh(mergeGeometries(Array.from({ length: 6 }, (_, k) =>
      new T.BoxGeometry(SPAN, .14, 1.6).rotateX(-.55).translate(0, 0, (k - 2.5) * 1.95))), solar, n);
    // Green screen: a planted wall along one edge (clear of the walker lanes) carrying a half-width planted canopy.
    this.screens = new T.InstancedMesh(mergeGeometries([
      new T.BoxGeometry(SPAN - 2, ROOF - .6, .9).translate(0, (ROOF - .6) / 2, WIDTH / 2 - .5),
      new T.BoxGeometry(SPAN, .5, WIDTH / 2).translate(0, ROOF + .2, WIDTH / 4),
    ]), leaf, n);
    this.screenCaps = new T.InstancedMesh(mergeGeometries([
      new T.BoxGeometry(SPAN + .4, .35, 1.3).translate(0, ROOF - .4, WIDTH / 2 - .5),
      new T.BoxGeometry(SPAN + .4, .25, .4).translate(0, ROOF + .55, 0),
    ]), trim, n);
    this.slabs = new T.InstancedMesh(new T.BoxGeometry(SPAN, .5, WIDTH), leaf, n);
    this.crowns = new T.InstancedMesh(leafyCrown(1), this.crownMaterial, n * 3);
    const color = new T.Color();
    for (let i = 0; i < n * 3; i++) this.crowns.setColorAt(i, color.setHSL(.24 + (i % 5) * .009, .36 + (i % 3) * .05, .22 + (i % 7) * .015));
    const towerGeometry = new T.CylinderGeometry(.7, 1.5, TOWER, 12).translate(0, TOWER / 2, 0);
    this.shafts = new T.InstancedMesh(towerGeometry, trim, this.towerBays.length);
    this.rings = new T.InstancedMesh(new T.TorusGeometry(2.6, .35, 6, 24).rotateX(Math.PI / 2), this.light, this.towerBays.length * 2);
    posts.name = 'environment-district-posts';
    this.sails.name = this.louvres.name = 'environment-district-sails';
    this.screens.name = this.screenCaps.name = 'environment-district-canopy';
    this.slabs.name = this.crowns.name = 'environment-district-canopy';
    this.shafts.name = this.rings.name = 'environment-district-cooling-towers';
    for (const mesh of [posts, this.sails, this.louvres, this.screens, this.screenCaps, this.slabs, this.crowns, this.shafts]) mesh.castShadow = mesh.receiveShadow = true;
    this.root.add(posts, this.sails, this.louvres, this.screens, this.screenCaps, this.slabs, this.crowns, this.shafts, this.rings);
    // ponytail: capacity allows two waves over ~90 roof terraces (53 today); more roofs only drop the oldest rings.
    this.pulses = new PulseRings(this.root, METER_COLORS.environmentalPriority, (n + 90 + 1) * PULSE_WAVES);
    this.root.visible = false;
    parent.add(this.root);
    this.write();
    if (roofGardens.length) this.addRoofs(roofGardens);
    roofListeners.add(gardens => this.addRoofs(gardens));
  }

  /** Roof terraces arrive with each landmark; the batch is rebuilt at the full count and keeps the current target. */
  private addRoofs(gardens: readonly RoofGarden[]): void {
    this.roofs.push(...gardens);
    if (this.roofMeshes) for (const mesh of Object.values(this.roofMeshes)) { this.root.remove(mesh); mesh.dispose(); }
    const n = this.roofs.length;
    const sails = new T.InstancedMesh(this.sailGeometry, this.sailMaterial, n);
    const pv = new T.InstancedMesh(this.pvGeometry, solar, n);
    const meadows = new T.InstancedMesh(this.meadowGeometry, this.crownMaterial, n);
    const posts = new T.InstancedMesh(this.postGeometry, trim, n * 4);
    const crowns = new T.InstancedMesh(this.crowns.geometry, this.crownMaterial, n);
    const color = new T.Color();
    for (let i = 0; i < n; i++) {
      crowns.setColorAt(i, color.setHSL(.25 + (i % 5) * .01, .4, .2 + (i % 4) * .02));
      meadows.setColorAt(i, color.setHSL(.21 + (i % 4) * .012, .45, .34 + (i % 3) * .03));
    }
    sails.name = pv.name = posts.name = 'environment-district-roof-sails';
    crowns.name = meadows.name = 'environment-district-roof-forest';
    for (const mesh of [sails, pv, posts, crowns, meadows]) mesh.castShadow = mesh.receiveShadow = true;
    this.root.add(sails, pv, posts, crowns, meadows);
    this.roofMeshes = { sails, pv, posts, crowns, meadows };
    this.roofLow = this.roofs.map((_, i) => designOf(i, 811, 2));
    this.roofHigh = this.roofs.map((_, i) => designOf(i, 857, 2));
    this.roofSail = new SlotLevels(n);
    this.roofCrown = new SlotLevels(n);
    this.roofHybrid = new SlotLevels(n);
    if (this.applied) this.setRoofTargets(this.now, true);
    this.write();
  }

  private setRoofTargets(now: number, immediate: boolean, sampleAt = now): boolean {
    const green = (i: number) => rank(i + 37) < this.targetCanopy ? 1 : 0;
    const a = this.roofSail.setTargets(i => 1 - green(i), now, immediate, this.orderSeed, sampleAt);
    const b = this.roofCrown.setTargets(green, now, immediate, this.orderSeed, sampleAt);
    const c = this.roofHybrid.setTargets(i => rank(i + 887) < this.targetHybrid ? 1 : 0, now, immediate, this.orderSeed, sampleAt);
    return a || b || c;
  }

  /** The share of canopy-shaded bays is .5 at mixed, .25 / .75 at rung ∓2 and 0 / 1 in the complete form. */
  setTarget({ tiers }: LadderTarget, now: number, immediate: boolean, seed = 0, quiet = false, sampleAt = now): boolean {
    if (immediate) this.pulses.clear();
    const share = ladderShare(tiers.ne, .5);
    this.targetCanopy = share;
    this.targetHybrid = ladderHybrid(tiers.ne);
    this.orderSeed = seed;
    this.now = now;
    this.applied = true;
    this.root.visible = true;
    const green = (i: number) => rank(i) < share ? 1 : 0;
    const a = this.canopy.setTargets(green, now, immediate, seed, sampleAt);
    const b = this.sail.setTargets(i => 1 - green(i), now, immediate, seed, sampleAt);
    // Mist towers only below the midpoint: most at the low end, none from mixed upward.
    const c = this.tower.setTargets(i => rank(i + 101) >= share * 2 ? 1 : 0, now, immediate, seed, sampleAt);
    const h = this.hybrid.setTargets(i => rank(i + 577) < this.targetHybrid ? 1 : 0, now, immediate, seed, sampleAt);
    const d = this.setRoofTargets(now, immediate, sampleAt) || h;
    this.facade.setTargets(i => facadeShare(i ? 1 - share : share), now, immediate, 0, sampleAt);
    if ((a || b || c || d) && !immediate && !quiet) {
      const bays = new Set([...this.canopy.changed, ...this.sail.changed, ...this.hybrid.changed, ...this.tower.changed.map(j => this.towerBays[j])]);
      const roofs = new Set([...this.roofSail.changed, ...this.roofCrown.changed, ...this.roofHybrid.changed]);
      this.pulses.emit([
        sitePulse('ne'),
        ...[...bays].map(i => ({ x: this.bays[i].x, y: this.bays[i].y + ROOF, z: this.bays[i].z, r: 13 })),
        ...[...roofs].map(i => { const [x, z, y, r] = this.roofs[i]; return { x, y: y + 9, z, r: r * 1.6 }; }),
      ], now);
    }
    this.write();
    return a || b || c || d;
  }

  /** Legacy v1 views and the standalone city do not show the v2 district layer. */
  hide(): void {
    this.root.visible = false;
    this.pulses.clear();
    this.facade.setTargets(() => 0, 0, true);
    this.writeFacade();
  }

  update(now: number, darkness = 0): void {
    this.now = now;
    if (this.facade.update(now)) this.writeFacade();
    const moved = [this.canopy.update(now), this.sail.update(now), this.hybrid.update(now), this.tower.update(now), this.roofSail.update(now), this.roofCrown.update(now),
      this.roofHybrid.update(now)].some(Boolean);
    if (moved) this.write();
    this.nightRhythm = meterNightRhythm(now, mean(this.canopy), 2, darkness);
    this.sailMaterial.emissiveIntensity = .08 + darkness * .35 * this.nightRhythm;
    this.pulses.update(now);
  }

  // ponytail: mirrors settled write() transforms; update this projection when adding carrier geometry.
  getConfiguration() {
    return [Array.from(this.canopy.targets, (green, i) => [Math.max(green, this.hybrid.targets[i]), Math.max(this.sail.targets[i], this.hybrid.targets[i]), this.hybrid.targets[i]]),
      Array.from(this.tower.targets), Array.from(this.facade.targets),
      Array.from(this.roofCrown.targets, (green, i) => [Math.max(green, this.roofHybrid.targets[i]), Math.max(this.roofSail.targets[i], this.roofHybrid.targets[i])])];
  }

  getDiagnostics(): EnvironmentDistrictDiagnostics {
    return {
      nightRhythm: this.nightRhythm, slots: this.bays.length, targetCanopy: this.targetCanopy,
      visibleCanopies: this.canopy.visible(), visibleSails: this.sail.visible(), visibleCoolingTowers: this.tower.visible(),
      roofs: this.roofs.length, visibleRoofSails: this.roofSail.visible(), visibleRoofCrowns: this.roofCrown.visible(),
      hybridBays: this.hybrid.visible(), hybridRoofs: this.roofHybrid.visible(),
      activePulses: this.pulses.active(this.now),
    };
  }

  private place(bay: { x: number; y: number; z: number; yaw: number }, along: number, up: number, across: number, scale = 1, sy = scale) {
    const c = Math.cos(bay.yaw), s = Math.sin(bay.yaw);
    this.dummy.position.set(bay.x + along * c + across * s, bay.y + up, bay.z - along * s + across * c);
    this.dummy.rotation.set(0, bay.yaw, 0);
    this.dummy.scale.set(scale, sy, scale);
    this.dummy.updateMatrix();
  }

  private writeFacade(): void {
    facadeClimate.green.value = this.facade.value[0];
    facadeClimate.louvre.value = this.facade.value[1];
  }

  private write(): void {
    this.writeFacade();
    this.bays.forEach((bay, i) => {
      // Covers unfurl from the bay centre; hidden covers stay as zero-scale instances (degenerate, nothing rasterised).
      const h = this.hybrid.value[i], g = Math.max(this.canopy.value[i], h), w = Math.max(this.sail.value[i], h), lift = 1.2 * h;
      const sail = this.lowDesign[i] ? 0 : w, louvre = this.lowDesign[i] ? w : 0, pergola = this.highDesign[i] ? 0 : g, screen = this.highDesign[i] ? g : 0;
      this.place(bay, 0, ROOF + .4 + lift, 0, sail); this.sails.setMatrixAt(i, this.dummy.matrix);
      this.place(bay, 0, ROOF + .3 + lift, 0, louvre); this.louvres.setMatrixAt(i, this.dummy.matrix);
      this.place(bay, 0, 0, 0, screen); this.screens.setMatrixAt(i, this.dummy.matrix); this.screenCaps.setMatrixAt(i, this.dummy.matrix);
      this.place(bay, 0, ROOF + .2, 0, pergola); this.slabs.setMatrixAt(i, this.dummy.matrix);
      for (let k = 0; k < 3; k++) {
        this.place(bay, (k - 1) * 6, ROOF + .9, (k - 1) * .8, pergola);
        this.dummy.scale.set(4.6 * pergola, 1.5 * pergola, 6.4 * pergola);
        this.dummy.updateMatrix();
        this.crowns.setMatrixAt(i * 3 + k, this.dummy.matrix);
      }
    });
    this.towerBays.forEach((bayIndex, j) => {
      const bay = this.bays[bayIndex], level = this.tower.value[j], drum = this.towerDesign[j] === 1;
      const wide = drum ? 2.2 : 1, tall = drum ? .55 : 1;
      // Beside the bay, outside the posts, rising from the ground: a slender mist shaft or a squat cooling drum.
      this.place(bay, 0, 0, -(WIDTH / 2 + 4), level ? wide : 0, level * tall);
      this.shafts.setMatrixAt(j, this.dummy.matrix);
      for (let k = 0; k < 2; k++) {
        this.place(bay, 0, (TOWER - 5 + k * 3.5) * level * tall, -(WIDTH / 2 + 4), level * (1 - k * .3) * wide);
        this.rings.setMatrixAt(j * 2 + k, this.dummy.matrix);
      }
    });
    const roof = this.roofMeshes;
    if (roof) this.roofs.forEach(([x, z, y, r], i) => {
      // A solar shade sail over each roof terrace (posts rise with it), or one large roof-forest crown at its heart.
      const h = this.roofHybrid.value[i], w = Math.max(this.roofSail.value[i], h), g = Math.max(this.roofCrown.value[i], h), size = r * 2.4 / SPAN, bay = { x, y, z, yaw: Math.sin(x * .37 + z * .11) * 3 };
      const pv = this.roofLow[i] ? w : 0, forest = this.roofHigh[i] ? 0 : g, meadow = this.roofHigh[i] ? g : 0;
      this.place(bay, 0, 9 * w, 0, (w - pv) * size, w - pv);
      roof.sails.setMatrixAt(i, this.dummy.matrix);
      this.place(bay, 0, 9 * pv, 0, pv * size, pv);
      roof.pv.setMatrixAt(i, this.dummy.matrix);
      this.place(bay, 0, .2, 0, meadow);
      this.dummy.scale.set(r * 1.1 * meadow, 2.2 * meadow, r * 1.1 * meadow); this.dummy.updateMatrix();
      roof.meadows.setMatrixAt(i, this.dummy.matrix);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], k) => {
        this.place(bay, a * r * 1.1 * w, 4.5 * w, b * r * .7 * w, w ? 1 : 0, w * 9 / ROOF);
        roof.posts.setMatrixAt(i * 4 + k, this.dummy.matrix);
      });
      this.place(bay, 0, 2 + 3.5 * forest, 0, forest);
      this.dummy.scale.set(r * .8 * forest, r * .55 * forest, r * .8 * forest);
      this.dummy.updateMatrix();
      roof.crowns.setMatrixAt(i, this.dummy.matrix);
    });
    for (const mesh of [this.sails, this.louvres, this.screens, this.screenCaps, this.slabs, this.crowns, this.shafts, this.rings, ...(roof ? Object.values(roof) : [])]) mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Elongated canopy depth factor: .65 keeps its rim 3 m clear of the 14 m deck that crosses bay 3 (the spec's .8 reached it). */
const CANOPY_SQUEEZE = .65;
/** Drones per bay in the ring towers' streams. */
const STREAM = 8;
/** Q1: staffed waterfront pavilions give way to autonomous ring towers on the same bays, with denser district circulation.
 * World-space batches stay independent of the hub's scaled lot and use the same 3 s clock. Bay frame: +X along the route, +Z towards it. */
export class AutomationDistrict {
  changedPoints: ChangedPoint[] = [];
  readonly root = new T.Group();
  readonly bays: { x: number; y: number; z: number; yaw: number }[] = [];
  /** Per-bay scale: BAY_SCALE unless that bay's footprint only clears the city smaller (never below 1.5). */
  readonly scales: number[] = [];
  private readonly automation = new SlotLevels(1);
  private readonly staffed: SlotLevels;
  /** P9: hybrid bays at mixed show both designs composed — a smaller (60 %) staffed pavilion under a service column. */
  private readonly hybrid: SlotLevels;
  private readonly meshes: T.InstancedMesh[];
  private readonly canopies: T.InstancedMesh[];
  private readonly columns: T.InstancedMesh[];
  private readonly ports: T.InstancedMesh[];
  private readonly masts: T.InstancedMesh[];
  /** P8 design per bay: staffed = round (0) / elongated (1) canopy; autonomous = ring tower (0) / six rings and a floating landing disc (1). */
  readonly staffedDesign: number[];
  readonly autonomousDesign: number[];
  private readonly pulses: PulseRings;
  private readonly build: BuildChoreography;
  private readonly drones: ReturnType<typeof serviceDrones>;
  /** Quad drones circling each ring tower's upper rings (STREAM per bay, in two loose streams). */
  private readonly streams: ReturnType<typeof quadFleet>;
  private nightRhythm = 1;
  private readonly dummy = new T.Object3D();
  private target = .5;
  private now = 0;

  constructor(parent: T.Object3D) {
    this.root.name = 'automation-district';
    const placed = automationBays();
    this.bays = placed.bays; this.scales = placed.scales;
    this.staffed = new SlotLevels(this.bays.length, buildProgress);
    this.hybrid = new SlotLevels(this.bays.length, buildProgress);
    const instances = (group: T.Object3D, name: string) => bake(group).map(source => {
      const mesh = new T.InstancedMesh(source.geometry, source.material, this.bays.length);
      mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.root.add(mesh); return mesh;
    });
    // Staffed pavilion (also the hybrid's 60 % hall), hovering canopy, hybrid service column and the two autonomous tower designs: models in automationBayModels.ts.
    this.meshes = instances(buildPavilion(), 'automation-staffed-pavilions');
    this.canopies = instances(buildCanopy(), 'automation-staffed-pavilions');
    this.columns = instances(buildColumn(), 'automation-hybrid-columns');
    this.ports = instances(buildPort(), 'automation-drone-ports');
    this.masts = instances(buildMast(), 'automation-drone-ports');
    this.staffedDesign = this.bays.map((_, i) => designOf(i, 233, 2));
    this.autonomousDesign = this.bays.map((_, i) => designOf(i, 271, 2));
    this.drones = serviceDrones(this.root, this.bays.length);
    this.streams = quadFleet(this.root, this.bays.length * STREAM, 'automation-bay-drones');
    this.pulses = new PulseRings(this.root, METER_COLORS.automation, (this.bays.length + 2) * PULSE_WAVES);
    this.build = new BuildChoreography(this.root, METER_COLORS.automation, this.bays.length);
    this.root.visible = false; parent.add(this.root); this.write();
  }

  get level(): number | undefined { return this.root.visible ? this.automation.value[0] : undefined; }

  setTarget({ tiers }: LadderTarget, now: number, immediate: boolean, seed = 0, quiet = false, sampleAt = now): boolean {
    if (immediate) { this.pulses.clear(); this.build.clear(); }
    const tier = tiers.nw, before = this.tops();
    // Fleets, aircraft and street pods stay mixed until rung 3 completes the district; the bays switch from rung 2.
    this.target = rungStep(tier) === 1 ? tier > 0 ? 1 : 0 : .5;
    this.root.visible = true;
    const a = this.automation.setTargets(() => this.target, now, immediate, 0, sampleAt);
    const cut = ladderCut(ranks(this.bays.length, i => rank(i + 203)), tier, .5);
    const stages = stagesOf('nw:bay', this.bays.length), staffed = stageRanks(stages, i => rank(i + 203), seed), hybrid = stageRanks(stages, i => rank(i + 307), seed);
    const b = this.staffed.setTargets(i => rank(staffed[i] + 203) >= cut ? 1 : 0, now, immediate, 0, sampleAt);
    const h = this.hybrid.setTargets(i => rank(hybrid[i] + 307) < ladderHybrid(tier) ? 1 : 0, now, immediate, 0, sampleAt);
    // Changed bays mark their terraces; fleet-wide changes also mark one street route.
    const bays = new Set([...(b ? this.staffed.changed : []), ...(h ? this.hybrid.changed : [])]);
    const street = routes().streets[0].getPointAt(.908); // the seaside avenue north of DECKS
    this.changedPoints = [...[...bays].map(i => ({ slot: `nw:bay${i + 1}`, x: this.bays[i].x, y: this.bays[i].y + 20, z: this.bays[i].z, r: 26 })),
      ...(a ? [{ slot: 'nw:street', x: street.x, y: street.y, z: street.z, r: 20 }] : [])];
    if ((a || b || h) && !immediate && !quiet) {
      this.pulses.emit([sitePulse('nw'), ...this.changedPoints], now);
      const after = this.tops();
      // The street slot is fleet traffic, not a built slot.
      this.build.play(buildItems(this.changedPoints, before, slot => {
        const i = Number(slot.replace(/\D+/g, '')) - 1, bay = this.bays[i];
        return slot.startsWith('nw:bay') ? { x: bay.x, y: bay.y, z: bay.z, r: 9.5 * this.scales[i], top: after.get(slot)! } : null;
      }), now);
    }
    this.write(); return a || b || h;
  }

  /** Settled top (metres above the bay's terrace) of each bay: staffed canopy, hybrid service column or autonomous tower. */
  private tops(): Map<string, number> {
    return new Map(Array.from(this.staffed.targets, (s, i) => {
      const h = this.hybrid.targets[i], tower = this.autonomousDesign[i] ? MAST_TOP : PORT_TOP;
      return [`nw:bay${i + 1}`, this.scales[i] * (h ? HALL_ROOF * .6 + COLUMN_PAD : s ? CANOPY_Y + 2 : tower)] as const;
    }));
  }

  update(now: number, darkness = 0): void {
    this.now = now;
    this.automation.update(now);
    const b = this.staffed.update(now), h = this.hybrid.update(now);
    if (b || h) this.write();
    this.nightRhythm = meterNightRhythm(now, this.automation.value[0], 0, darkness);
    this.writeDrones(now); this.pulses.update(now); this.build.update(now);
  }

  hide(): void { this.root.visible = false; this.pulses.clear(); this.build.clear(); }

  // ponytail: mirrors settled write() transforms; update this projection when adding carrier geometry.
  getConfiguration() {
    const activity = automationActivity(this.automation.targets[0]);
    return [[Math.ceil(activity.walkers), Math.ceil(activity.pods), Math.ceil(activity.aircraft)],
      Array.from(this.staffed.targets, (staffed, i) => [Math.max(staffed, .6 * this.hybrid.targets[i]), Math.max(1 - staffed, this.hybrid.targets[i])])];
  }

  getDiagnostics() {
    const activity = automationActivity(this.level ?? .5);
    return { enabled: this.root.visible, serviceDrones: this.root.visible ? this.bays.length : 0, nightRhythm: this.nightRhythm, targetAutomation: this.target, automation: this.level, activePulses: this.pulses.active(this.now), activeBuilds: this.build.active(this.now),
      pavilions: this.bays.length, visibleStaffedPavilions: this.root.visible ? this.staffed.visible() : 0,
      visibleDronePorts: this.root.visible ? this.staffed.value.filter(v => 1 - v > HIDDEN).length : 0,
      hybridBays: this.root.visible ? this.hybrid.visible() : 0,
      loopAircraft: this.root.visible ? Math.ceil(activity.aircraft) : undefined,
      guidewayPods: this.root.visible ? Math.ceil(activity.pods) : undefined, walkers: this.root.visible ? Math.ceil(activity.walkers) : undefined };
  }

  /** Landing spot of the bay's drone, in the bay frame: the canopy's top, the column's top ring or the tower's top ring / landing disc. */
  private dock(i: number): { x: number; y: number; z: number; level: number } {
    const s = this.staffed.value[i], h = this.hybrid.value[i], hall = Math.max(s, .6 * h);
    const canopy = s * (1 - h), column = h, tower = (1 - s) * (1 - h);
    if (column >= canopy && column >= tower) return { x: COLUMN_DOCK_X, y: HALL_ROOF * hall + COLUMN_PAD + .9, z: HALL_Z, level: column };
    if (canopy >= tower) { const wide = this.staffedDesign[i] ? 1.35 : 1; return { x: 7 * wide, y: CANOPY_Y + 1.9, z: HALL_Z * (this.staffedDesign[i] ? CANOPY_SQUEEZE : 1), level: canopy }; }
    return this.autonomousDesign[i] ? { x: 2.6, y: MAST_TOP + .95, z: 0, level: tower } : { x: 4.7, y: PORT_TOP + .9, z: 0, level: tower };
  }

  private writeDrones(now: number): void {
    this.bays.forEach((bay, i) => {
      // ponytail: one reserved vertical service column per bay, no inter-bay travel; add dispatch only if journeys are required.
      const { x, y, z, level } = this.dock(i);
      const c = Math.cos(bay.yaw), s = Math.sin(bay.yaw);
      const k = this.scales[i];
      this.dummy.position.set(bay.x + (x * c + z * s) * k, bay.y + y * k + 24 * pavilionFlight(now, i), bay.z + (-x * s + z * c) * k);
      this.dummy.rotation.set(0, bay.yaw, 0);
      // Fade through the carrier handover rather than teleport a visible drone to its other landing spot.
      this.dummy.scale.setScalar(Math.max(HIDDEN, T.MathUtils.smoothstep(level, .98, 1)) * k);
      this.drones.set(i, this.dummy);
      this.writeStream(i, now);
    }); this.drones.flush(); this.streams.flush();
  }

  /** Eight small quads (3.9 m, like the hub's stream drones) circle the tower's upper rings at ring radius + 3-8 m in two loose streams; parked on the rings under reduced motion. */
  private writeStream(i: number, now: number): void {
    const bay = this.bays[i], k = this.scales[i], c = Math.cos(bay.yaw), s = Math.sin(bay.yaw), design = this.autonomousDesign[i];
    const level = T.MathUtils.smoothstep((1 - this.staffed.value[i]) * (1 - this.hybrid.value[i]), .98, 1), still = prefersReducedMotion();
    const top = design ? MAST_TOP : PORT_TOP, rings = TOWER_RINGS[design];
    for (let j = 0; j < STREAM; j++) {
      const stream = j >> 2, n = j & 3, dir = stream ? -1 : 1;
      let r: number, y: number, a = n * Math.PI / 2 + stream * 1.1 + (stream ? .5 : 0);
      if (still) { const ring = rings - 1 - j; r = 2.7; y = TOWER_RING0 + ring * TOWER_PITCH + .5 + .35; a = j * 2.1; }
      else { a += now * .28 * dir; r = TOWER_RING_R[design] + 3 + n * 1.6 + stream * .6; y = top - 7 + stream * 3.4 + n * 2.1 + Math.sin(now * .6 + j) * .4; }
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      this.dummy.position.set(bay.x + (x * c + z * s) * k, bay.y + y * k, bay.z + (-x * s + z * c) * k);
      this.dummy.rotation.set(0, bay.yaw - a + Math.PI / 2 * dir, 0);
      this.dummy.scale.setScalar(Math.max(HIDDEN, level) * .7);
      this.streams.set(i * STREAM + j, this.dummy);
    }
  }

  private write(): void {
    this.writeDrones(this.now);
    this.bays.forEach((bay, i) => {
      // The autonomous tower rises from its foot as the staffed hall folds away (same 3 s clock); hidden designs keep an invertible tiny scale.
      const s = this.staffed.value[i], h = this.hybrid.value[i], hall = Math.max(s, .6 * h);
      const k = this.scales[i];
      const scale = (level: number, x = 1, z = 1) => this.dummy.scale.set(Math.max(HIDDEN, level) * x * k, Math.max(HIDDEN, level) * k, Math.max(HIDDEN, level) * z * k);
      const place = (meshes: T.InstancedMesh[], y = 0) => {
        this.dummy.position.set(bay.x, bay.y + y, bay.z); this.dummy.rotation.set(0, bay.yaw, 0); this.dummy.updateMatrix();
        for (const mesh of meshes) mesh.setMatrixAt(i, this.dummy.matrix);
      };
      scale(hall); place(this.meshes);
      this.staffedDesign[i] ? scale(s * (1 - h), 1.35, CANOPY_SQUEEZE) : scale(s * (1 - h)); place(this.canopies);
      scale(h); place(this.columns, HALL_ROOF * hall * k);
      scale(this.autonomousDesign[i] ? 0 : (1 - s) * (1 - h)); place(this.ports);
      scale(this.autonomousDesign[i] ? (1 - s) * (1 - h) : 0); place(this.masts);
    });
    for (const mesh of [...this.meshes, ...this.canopies, ...this.columns, ...this.ports, ...this.masts]) mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Lit-room strength on the concentration towers' glass (odaibaScene.updateOdaiba follows the night). */
export const towerGlow = { value: .3 }, towerNight = { value: 0 };

// Traced open ground (tests/odaiba.test.ts checks ground, landmarks, context and routes): towers rise beside the SE site, at the DECKS
// waterfront and from the western lawns where low concentration scatters its pods.
// ponytail: skyway clearance was checked once in the browser (skyways.ts imports JSON Node cannot load); recheck these sites if skyways move.
const ALL_TOWERS: readonly (readonly [number, number, number])[] = [
  [115, -25, 128], [67, -89, 112], [27, -249, 120], [83, -305, 104], [-189, -1, 140], [-221, -73, 116], [-157, 63, 124], [-61, 111, 104], [179, 287, 120], [-13, 279, 110],
];
// P1: towers that would pierce a megastructure are not built; hero frame slots follow their towers to the new indices.
const TOWER_KEPT = ALL_TOWERS.map((t, i) => [t, i] as const).filter(([t]) => !inMega(t[0], t[1], 16) && !inHeroClear(t[0], t[1]));
const TOWER_SITES: readonly (readonly [number, number, number])[] = TOWER_KEPT.map(([t]) => t);
/** Hero-view slots (392–631 m from the c2 camera, where the blue-striped cylinders stood) rebuilt as open structural frames; the rest keep their i % 3 family. */
export const HERO_FRAME_SLOTS = [0, 2, 3, 5].flatMap(a => { const i = TOWER_KEPT.findIndex(([, o]) => o === a); return i < 0 ? [] : [i]; });
const slotFamilies = TOWER_SITES.map((_, i) => HERO_FRAME_SLOTS.includes(i) ? 3 : i % 3);
/** Silhouette family (0 twisted, 1 terraced, 2 twin, 3 open frame) of tower slot `i` and its instance index in that family's batches. */
export const towerFamily = (i: number) => ({ family: slotFamilies[i], instance: slotFamilies.slice(0, i).filter(f => f === slotFamilies[i]).length });
// Street network stage 2 (2026-11-04): two pods stood on the ④ boulevard's line and moved to the nearest site passing the pod checks, 25.5 m off its centreline
// (from -33, 167 and 207, 37).
const POD_SITES: readonly (readonly [number, number])[] = ([
  [-293, 147], [-253, -33], [-233, 47], [-218, -23], [-183, -43], [-168, -128], [-103, 17], [-53, 147], [-79, 137], [-23, 107], [7, -58], [27, 87], [77, 107], [87, 57], [97, -73], [107, -123], [107, 77], [117, 7], [137, -103], [182, 37], [217, -43], [217, 87], [237, -73], [237, 57], [247, -103], [252, 147],
] as const).filter(([x, z]) => !inMega(x, z, 14) && !inHeroClear(x, z));

/** Q4: one walkable vertical district or functions spread through the parks.
 * High raises slender glass towers with lit sky lobbies on open ground; low scatters low glass pavilion pods across the lawns.
 * Both are complete 2127 forms; mixed shows about half of each. Positions are traced open ground (actual-mesh checks in odaiba.test.ts). */
export class ConcentrationDistrict {
  changedPoints: ChangedPoint[] = [];
  readonly root = new T.Group();
  /** [x, z, height]: spire tips (1.06 × height) stay below the 170 m air-taxi loop. */
  readonly towers: readonly { x: number; z: number; h: number }[] = TOWER_SITES.map(([x, z, h]) => ({ x, z, h }));
  readonly pods: readonly { x: number; z: number; yaw: number }[] = POD_SITES.map(([x, z], i) => ({ x, z, yaw: i * 2.1 }));
  private readonly towerLevels = new SlotLevels(this.towers.length, buildProgress);
  /** P9: at mixed a share of tower sites stands as a terraced mid-rise (45 % of the tower height) instead of open lawn. */
  private readonly midRise = new SlotLevels(this.towers.length, buildProgress);
  private readonly podLevels = new SlotLevels(this.pods.length, buildProgress);
  /** Tower meshes per silhouette family (slot i: `towerFamily(i)`). */
  private readonly families: T.InstancedMesh[][];
  private readonly podMeshes: T.InstancedMesh[];
  /** P8 design per pod site: two-tier pod (0) / garden ring pavilion (1). */
  readonly podDesign: number[] = POD_SITES.map((_, i) => designOf(i, 1201, 2));
  private readonly ringMeshes: T.InstancedMesh[];
  /** P10 extras: vertical-forest crowns (concentration + environment high), drone docks (concentration + automation high) on towers,
   * and solar canopies over pods (concentration + environment low). */
  private readonly forest = new SlotLevels(TOWER_SITES.length);
  private readonly docks = new SlotLevels(TOWER_SITES.length);
  private readonly solarPods = new SlotLevels(POD_SITES.length);
  private readonly forestCrowns: T.InstancedMesh;
  private readonly dockMeshes: T.InstancedMesh[];
  private readonly solarDiscs: T.InstancedMesh;
  readonly bridges: { i: number; j: number; y: number }[] = [];
  private readonly bridgeMeshes: T.InstancedMesh[];
  private readonly pulses: PulseRings;
  private readonly build: BuildChoreography;
  private readonly light = publicLight.clone();
  private nightRhythm = 1;
  private readonly dummy = new T.Object3D();
  private target = .5;
  private now = 0;

  constructor(parent: T.Object3D) {
    this.root.name = 'concentration-district';
    // Sky-blue glass with warm-lit rooms on 4.2 m storeys (about half the bays occupied): the new vertical district reads apart from the
    // ivory mid-rise city by day and as lit towers at night (`towerGlow`, driven by updateOdaiba).
    // r1 (P3): one mega material family — white frame and slab bands, pale blue-grey glass, cool seam light under each band.
    const trim = megaShell, cream = megaShell, chrome = megaRib;
    const facade = new T.MeshStandardMaterial({ color: '#' + megaGlass.color.getHexString(), roughness: .18, metalness: .15, emissive: '#ffd6a0' });
    facade.onBeforeCompile = shader => {
      shader.uniforms.towerGlow = towerGlow; shader.uniforms.towerNight = towerNight;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 towerP;\nvarying vec2 towerC;')
        .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 w = vec4(transformed, 1.), c = vec4(0., 0., 0., 1.);
        #ifdef USE_INSTANCING
          w = instanceMatrix * w; c = instanceMatrix * c;
        #endif
          towerP = (modelMatrix * w).xyz; towerC = (modelMatrix * c).xz; }`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float towerGlow, towerNight;\nvarying vec3 towerP;\nvarying vec2 towerC;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 room = vec2(floor(atan(towerP.x - towerC.x, towerP.z - towerC.y) * 2.546), floor(towerP.y / 4.2));
        // Hero atmosphere: half the rooms lit by day, about one in four at night (fewer, brighter rooms instead of a lamp).
        float lit = step(.5 + .25 * towerNight, fract(sin(dot(room + towerC, vec2(12.9898, 78.233))) * 43758.5453)) * step(.25, fract(towerP.y / 4.2));
        totalEmissiveRadiance *= lit * towerGlow;`);
    };
    facade.customProgramCacheKey = () => 'concentration-tower-glass';
    const lobby = this.light; lobby.emissive.set('#cfe8ff'); lobby.emissiveIntensity = .9;
    // Unit-height (1 m, scaled per site) silhouette families by slot (`towerFamily`), all on an ivory podium and all marked at the .4 / .72 sky-lobby
    // levels where bridges land: a twisted glass shaft, a terraced setback tower with planted terraces, and linked twin shafts.
    const family = (build: (unit: (geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z?: number, yaw?: number) => void) => void) => {
      const tower = new T.Group();
      build((geometry, material, x, y, z = 0, yaw = 0) => { const m = new T.Mesh(geometry, material); m.position.set(x, y, z); m.rotation.y = yaw; tower.add(m); });
      tower.add(new T.Mesh(new T.CylinderGeometry(17.5, 18.5, .05, 32).translate(0, .025, 0), trim));
      return tower;
    };
    const skyLobby = (unit: (geometry: T.BufferGeometry, material: T.Material, x: number, y: number) => void, y: number, r: number) => {
      unit(new T.CylinderGeometry(r, r, .02, 40), trim, 0, y);
      unit(new T.CylinderGeometry(r - .4, r - .4, .006, 40), leaf, 0, y + .013);
      unit(new T.CylinderGeometry(r - 5.5, r - 5.5, .03, 40, 1, true), lobby, 0, y + .03);
    };
    const twisted = family(unit => {
      // 18 square glass storeys turning 100° over the height, each with an ivory floor plate.
      for (let k = 0; k < 18; k++) {
        const y = .05 + k * .05, side = 24 - k * .35, yaw = k * .097;
        unit(new T.BoxGeometry(side, .046, side), facade, 0, y + .023, 0, yaw);
        unit(new T.BoxGeometry(side + 1, .004, side + 1), trim, 0, y + .048, 0, yaw);
      }
      for (const y of [.4, .72]) skyLobby(unit, y, 21);
      unit(new T.SphereGeometry(9, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .002, 1), leaf, 0, .95);
      unit(new T.CylinderGeometry(.5, .9, .12, 8), trim, 0, 1.01);
    });
    const terraced = family(unit => {
      // Three stepped glass tiers; each setback (.4 / .72) is a planted terrace over a warm-lit band.
      for (const [y0, y1, w, d] of [[.05, .4, 32, 26], [.4, .72, 24, 20], [.72, 1, 16, 14]]) {
        unit(new T.BoxGeometry(w, y1 - y0, d), facade, 0, (y0 + y1) / 2);
        unit(new T.BoxGeometry(w + 1.2, .012, d + 1.2), trim, 0, y1);
        unit(new T.BoxGeometry(w - 1, .006, d - 1), leaf, 0, y1 + .008);
        unit(new T.BoxGeometry(w + .3, .02, d + .3), lobby, 0, y1 - .02);
      }
      for (const [x, z] of [[-13, -10], [13, 9], [-10, 9], [9, -8]]) unit(leafyCrown(1).scale(2.4, .02, 2.4), leaf, x, .42, z);
      unit(new T.CylinderGeometry(.5, .9, .1, 8), trim, 0, 1.06);
    });
    const twin = family(unit => {
      // Two slim shafts of unequal height joined at both lobby levels by lit glass links.
      for (const [x, top] of [[-10.5, 1], [10.5, .84]]) {
        unit(new T.CylinderGeometry(8, 9, top - .05, 24), facade, x, .05 + (top - .05) / 2);
        for (let y = .12; y < top; y += .08) unit(new T.CylinderGeometry(9.1 - y, 9.1 - y, .005, 24), trim, x, y);
        unit(new T.CylinderGeometry(8.6, 8, .03, 24), trim, x, top);
        unit(new T.SphereGeometry(7.6, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .002, 1), leaf, x, top + .015);
      }
      for (const y of [.4, .72]) { unit(new T.BoxGeometry(14, .03, 7), trim, 0, y); unit(new T.BoxGeometry(13, .02, 6), lobby, 0, y + .025); }
      unit(new T.CylinderGeometry(.4, .8, .12, 8), trim, -10.5, 1.06);
    });
    const openFrame = family(unit => {
      // Megaframe: four 4 m corner columns, one chrome zig-zag mega-diagonal on each of the two faces towards the hero camera (the instance
      // is not turned, see `write`), fascia beams only at the slab levels with a lit strip under each, around stacked cream terraces that
      // cantilever ±6 m alternately and are planted; two sky-glass spheres with warm cores sit between the terraces.
      const sy = .0087, jitter = (k: number, n: number) => Math.sin((k * 3 + n + 1) * 91.7), levels = [.16, .3, .44, .58, .72, .86, 1];
      for (const x of [-12, 12]) for (const z of [-12, 12]) unit(new T.BoxGeometry(4, .95, 4), trim, x, .525, z);
      // Corner-to-corner in unit space, so the y scale shears each leg with the frame and it keeps meeting the columns: 2.6 m across in the
      // plane of its face (ix, iz), 2.4 m deep out of it (nx, nz).
      const leg = (a: number[], b: number[], ix: number, iz: number, nx: number, nz: number) => {
        const g = new T.BoxGeometry(1, 1, 1), p = g.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const u = p.getX(k) + .5, v = p.getY(k) * 2.6, w = p.getZ(k) * 2.4;
          p.setXYZ(k, a[0] + (b[0] - a[0]) * u + ix * v + nx * w, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + iz * v + nz * w);
        }
        return g.computeVertexNormals(), g;
      };
      for (const [lo, hi] of [[.05, .55], [.55, 1]]) {
        unit(leg([lo === .05 ? -12 : 12, lo, -12], [lo === .05 ? 12 : -12, hi, -12], 1, 0, 0, 1), chrome, 0, 0, 0);
        unit(leg([-12, lo, lo === .05 ? -12 : 12], [-12, hi, lo === .05 ? 12 : -12], 0, 1, 1, 0), chrome, 0, 0, 0);
      }
      for (const y of levels) for (const e of [-12, 12]) {
        unit(new T.BoxGeometry(28, .017, 2), trim, 0, y, e); unit(new T.BoxGeometry(2, .017, 24), trim, e, y, 0);
        unit(new T.BoxGeometry(24, .004, 1.2), lobby, 0, y - .0105, e); unit(new T.BoxGeometry(1.2, .004, 22), lobby, e, y - .0105, 0);
      }
      for (let k = 0; k < 6; k++) {
        const y = levels[k], alongX = k % 2 === 0, dir = k % 4 < 2 ? 1 : -1, sx = alongX ? 6 * dir : 0, sz = alongX ? 0 : 6 * dir;
        unit(new T.BoxGeometry(24, .012, 24), cream, sx, y, sz);
        unit(new T.BoxGeometry(24.8, .006, 24.8), trim, sx, y - .0045, sz);
        unit(new T.BoxGeometry(22.4, .006, 22.4), leaf, sx, y + .009, sz);
        // Hedge round the rim: from the hero's level eye the planted tops are edge-on, so the green has to stand up.
        for (const e of [-11.2, 11.2]) { unit(new T.BoxGeometry(24, .016, 1.6), leaf, sx, y + .014, sz + e); unit(new T.BoxGeometry(1.6, .016, 21), leaf, sx + e, y + .014, sz); }
        unit(new T.BoxGeometry(23, .02, 23), lobby, sx, y - .016, sz);
        for (let n = 0; n < 5; n++) {
          const r = 3 + 1.6 * ((k + n * 2) % 5) / 4, along = dir * (14.2 + .8 * jitter(k, n)), across = (n - 2) * 4.4 + 1.2 * jitter(k, n + 3);
          unit(leafyCrown(1).scale(r, r * sy, r), leaf, alongX ? along : across, y + .012 + .0035 * r, alongX ? across : along);
        }
      }
      for (const y of [.37, .65]) {
        unit(new T.SphereGeometry(9, 24, 16).scale(1, sy, 1), skyGlass, 0, y, 0);
        unit(new T.SphereGeometry(3.4, 12, 8).scale(1, sy, 1), lobby, 0, y, 0);
      }
      unit(new T.CylinderGeometry(3.5, 3.5, .95, 16), lobby, 0, .525, 0);
      unit(new T.TorusGeometry(15, .9, 6, 48).rotateX(Math.PI / 2).scale(1, sy, 1), trim, 0, 1.02, 0);
      unit(new T.CylinderGeometry(.4, .8, .1, 8), chrome, 0, 1.05, 0);
    });
    this.families = [twisted, terraced, twin, openFrame].map((group, f) =>
      this.instances(bake(group), slotFamilies.filter(g => g === f).length, 'concentration-vertical-towers'));
    // Sky bridges join neighbouring towers at both lobby levels of the lower one (a connected vertical street).
    this.towers.forEach((a, i) => this.towers.forEach((b, j) => {
      if (j > i && Math.hypot(a.x - b.x, a.z - b.z) < 80) for (const level of [.4, .72]) this.bridges.push({ i, j, y: level * Math.min(a.h, b.h) });
    }));
    const bridge = new T.Group();
    box(bridge, [1, 4.5, 10], [0, 0, 0], trim);
    box(bridge, [1, 2, 10.4], [0, .8, 0], lobby);
    this.bridgeMeshes = this.instances(bake(bridge), this.bridges.length, 'concentration-sky-bridges');
    // Pod: two stacked rings of warm-lit glass under floating ivory discs (the upper one planted) on a slim stem, about 15 m tall and
    // 24 m across, so the scattered alternative reads at hero distance.
    const pod = new T.Group();
    box(pod, [2.4, 4, 2.4], [0, 2, 0], trim);
    const piece = (geometry: T.BufferGeometry, material: T.Material, y: number) => { const m = new T.Mesh(geometry, material); m.position.y = y; pod.add(m); };
    piece(new T.CylinderGeometry(7, 7, 4.2, 28), lobby, 6);
    piece(new T.CylinderGeometry(12, 9.5, 1.4, 36), trim, 8.8);
    piece(new T.CylinderGeometry(6, 6, 3.6, 24), lobby, 11.3);
    piece(new T.CylinderGeometry(9, 7.5, 1.2, 32), trim, 13.7);
    piece(new T.CylinderGeometry(8, 8, .4, 28), leaf, 14.5);
    piece(new T.CylinderGeometry(11.6, 11.6, .3, 36), leaf, 9.6);
    this.podMeshes = this.instances(bake(pod), this.pods.length, 'concentration-distributed-pods');
    // Garden ring pavilion: a low lit glass ring under an ivory roof with a planted top, around a courtyard tree (21 m across).
    const ring = new T.Group();
    arc(ring, 6.5, 10, 4, [0, .4, 0], lobby);
    arc(ring, 5.6, 10.5, .8, [0, 4.4, 0], trim);
    arc(ring, 6, 10.1, .35, [0, 5.2, 0], leaf);
    box(ring, [1, 5, 1], [0, 2.5, 0], trim);
    const tree = new T.Mesh(new T.IcosahedronGeometry(1, 1), leaf); tree.position.y = 7.5; tree.scale.set(4.6, 3.6, 4.6); ring.add(tree);
    this.ringMeshes = this.instances(bake(ring), this.pods.length, 'concentration-distributed-pods');
    const extra = (geometry: T.BufferGeometry, material: T.Material, count: number, name: string) => {
      const mesh = new T.InstancedMesh(geometry, material, count);
      mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.root.add(mesh); return mesh;
    };
    this.forestCrowns = extra(leafyCrown(1), new T.MeshStandardMaterial({ color: '#ffffff', roughness: .92 }), this.towers.length * 4, 'concentration-vertical-forest');
    const green = new T.Color();
    for (let i = 0; i < this.towers.length * 4; i++) this.forestCrowns.setColorAt(i, green.setHSL(.25 + (i % 5) * .01, .42, .24 + (i % 3) * .03));
    this.dockMeshes = [
      extra(new T.TorusGeometry(26, .7, 8, 64).rotateX(Math.PI / 2), trail, this.towers.length, 'concentration-drone-docks'),
      extra(mergeGeometries([0, Math.PI].map(a => new T.SphereGeometry(1.6, 12, 8).scale(1.4, .6, 1).translate(Math.cos(a) * 26, 1.4, Math.sin(a) * 26))), glass,
        this.towers.length, 'concentration-drone-docks'),
    ];
    this.solarDiscs = extra(new T.CylinderGeometry(11, 11, .4, 32).rotateZ(.12), solar, this.pods.length, 'concentration-solar-pods');
    this.pulses = new PulseRings(this.root, METER_COLORS.urbanConcentration, (this.towers.length + this.pods.length + 1) * PULSE_WAVES);
    this.build = new BuildChoreography(this.root, METER_COLORS.urbanConcentration, this.towers.length + this.pods.length);
    this.root.visible = false; parent.add(this.root); this.write();
  }

  setTarget({ tiers }: LadderTarget, now: number, immediate: boolean, seed = 0, quiet = false, sampleAt = now): boolean {
    if (immediate) { this.pulses.clear(); this.build.clear(); }
    const tier = tiers.se;
    this.target = ladderShare(tier, .5);
    const towerTarget = (i: number) => [Math.max(this.towerLevels.targets[i], .45 * this.midRise.targets[i]),
      this.forest.targets[i] * this.towerLevels.targets[i], this.docks.targets[i] * this.towerLevels.targets[i]];
    const podTarget = (i: number) => [this.podLevels.targets[i], this.solarPods.targets[i] * this.podLevels.targets[i]];
    const beforeTowers = this.towers.map((_, i) => towerTarget(i)), beforePods = this.pods.map((_, i) => podTarget(i));
    const f = this.forest.setTargets(() => agree(tiers, 'se', 'ne', 'high') ? 1 : 0, now, immediate, 0, sampleAt);
    const d = this.docks.setTargets(() => agree(tiers, 'se', 'nw', 'high') ? 1 : 0, now, immediate, 0, sampleAt);
    const sp = this.solarPods.setTargets(() => agree(tiers, 'se', 'ne', 'low') ? 1 : 0, now, immediate, 0, sampleAt);
    // Mixed keeps about half of towers and pods (the former mixed curve); rung 2 goes halfway to the complete form.
    const share = ladderShare(tier, T.MathUtils.smoothstep(.5, .3, .75));
    this.root.visible = true;
    // Golden-ratio order: with only ten towers a hash rank clusters, this keeps any share evenly spread across both groups.
    const order = (i: number, offset: number) => (i * .6180339887 + offset) % 1;
    const towerStages = stagesOf('se:tower', this.towers.length);
    const tower = stageRanks(towerStages, i => order(i, .31), seed), pod = stageRanks(stagesOf('se:pod', this.pods.length), i => order(i, .77), seed);
    // Mid-rises take the opposite end of the stage order, so they stand on slots whose tower is not built yet.
    const mid = stageRanks(towerStages, i => -rank(i + 1301), seed);
    const a = this.towerLevels.setTargets(i => order(tower[i], .31) < share ? 1 : 0, now, immediate, 0, sampleAt);
    const b = this.podLevels.setTargets(i => order(pod[i], .77) >= share ? 1 : 0, now, immediate, 0, sampleAt);
    const m = this.midRise.setTargets(i => rank(mid[i] + 1301) < ladderHybrid(tier) ? 1 : 0, now, immediate, 0, sampleAt);
    this.changedPoints = [
      ...this.towers.flatMap((site, i) => towerTarget(i).some((v, j) => v !== beforeTowers[i][j]) ? [{ slot: `se:tower${i + 1}`, x: site.x, y: 1, z: site.z, r: 30 }] : []),
      ...this.pods.flatMap((site, i) => podTarget(i).some((v, j) => v !== beforePods[i][j]) ? [{ slot: `se:pod${i + 1}`, x: site.x, y: 1, z: site.z, r: 14 }] : []),
    ];
    if ((a || b || m || f || d || sp) && !immediate && !quiet) {
      this.pulses.emit([sitePulse('se'), ...this.changedPoints], now);
      // Build heights in metres: tower or mid-rise top, two-tier pod (14.7 m) or ring pavilion (11.1 m).
      const builds: BuildItem[] = this.changedPoints.map(({ slot, x, z }) => {
        const tower = slot.startsWith('se:tower'), i = Number(slot.replace(/\D+/g, '')) - 1, scale = tower ? this.towers[i].h : this.podDesign[i] === 1 ? 11.1 : 14.7;
        return { x, y: 0, z, r: tower ? 24 : 15, from: (tower ? beforeTowers : beforePods)[i][0] * scale, to: (tower ? towerTarget(i) : podTarget(i))[0] * scale };
      });
      this.build.play(builds, now);
    }
    this.write(); return a || b || m || f || d || sp;
  }

  update(now: number, darkness = 0): void {
    this.now = now;
    const moved = [this.towerLevels.update(now), this.podLevels.update(now), this.midRise.update(now), this.forest.update(now), this.docks.update(now),
      this.solarPods.update(now)].some(Boolean);
    if (moved) this.write();
    this.nightRhythm = meterNightRhythm(now, mean(this.towerLevels), 3, darkness);
    this.light.emissiveIntensity = .9 * this.nightRhythm;
    this.pulses.update(now); this.build.update(now);
  }

  hide(): void { this.root.visible = false; this.pulses.clear(); this.build.clear(); }

  // ponytail: mirrors settled write() transforms; update this projection when adding carrier geometry.
  getConfiguration() {
    return [Array.from(this.towerLevels.targets, (tower, i) => [Math.max(tower, .45 * this.midRise.targets[i]), this.forest.targets[i] * tower, this.docks.targets[i] * tower]),
      Array.from(this.podLevels.targets, (pod, i) => [pod, this.solarPods.targets[i] * pod])];
  }

  getDiagnostics() {
    return { enabled: this.root.visible, nightRhythm: this.nightRhythm, targetConcentration: this.target, towers: this.towers.length, pods: this.pods.length, activePulses: this.pulses.active(this.now), activeBuilds: this.build.active(this.now),
      visibleTowers: this.root.visible ? this.towerLevels.visible() : 0, visiblePods: this.root.visible ? this.podLevels.visible() : 0,
      midRises: this.root.visible ? this.towers.filter((_, i) => this.midRise.value[i] > HIDDEN && this.towerLevels.value[i] <= HIDDEN).length : 0,
      forestTowers: this.root.visible ? this.towers.filter((_, i) => this.forest.value[i] * this.towerLevels.value[i] > HIDDEN).length : 0,
      droneDocks: this.root.visible ? this.towers.filter((_, i) => this.docks.value[i] * this.towerLevels.value[i] > HIDDEN).length : 0,
      solarPods: this.root.visible ? this.pods.filter((_, i) => this.solarPods.value[i] * this.podLevels.value[i] > HIDDEN).length : 0 };
  }

  private instances(sources: T.Mesh[], count: number, name: string): T.InstancedMesh[] {
    return sources.map(source => {
      const mesh = new T.InstancedMesh(source.geometry, source.material, count);
      mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.root.add(mesh); return mesh;
    });
  }

  /** Tower height share: full tower, or a 45 % mid-rise on hybrid sites. */
  private height(i: number): number { return Math.max(this.towerLevels.value[i], .45 * this.midRise.value[i]); }

  private write(): void {
    this.towers.forEach((site, i) => {
      // Towers rise from the plaza; hidden ones keep a tiny invertible scale (flattened normals poison the G-buffer).
      const level = this.height(i), footprint = level > .02 ? 1 : HIDDEN;
      const { family, instance } = towerFamily(i), yaw = family === 3 ? 0 : i;
      this.dummy.position.set(site.x, 0, site.z); this.dummy.rotation.set(0, yaw, 0);
      this.dummy.scale.set(footprint, Math.max(HIDDEN, level) * site.h, footprint); this.dummy.updateMatrix();
      for (const mesh of this.families[family]) mesh.setMatrixAt(instance, this.dummy.matrix);
      // Pairing extras ride full towers only (never mid-rises): a crown on the roof plus three at the lower lobby edge, and a dock ring
      // with two drones at the upper lobby.
      const full = this.towerLevels.value[i], forest = this.forest.value[i] * full, dock = this.docks.value[i] * full, h = full * site.h;
      const roof = [.95, 1, 1, 1][family] * h, c = Math.cos(yaw), s = Math.sin(yaw), shift = [0, 0, -10.5, 8][family], ox = shift * c, oz = -shift * s;
      const crown = (k: number, x: number, y: number, z: number, r: number) => {
        this.dummy.position.set(x, y + r * .4, z); this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(r, r * .7, r).multiplyScalar(Math.max(HIDDEN, forest)); this.dummy.updateMatrix(); this.forestCrowns.setMatrixAt(i * 4 + k, this.dummy.matrix);
      };
      crown(0, site.x + ox, roof, site.z + oz, [9, 7, 7, 5][family]);
      for (let k = 0; k < 3; k++) {
        const a = i + k * 2.1, r = [19, 14, 12, 16][family];
        crown(k + 1, site.x + Math.cos(a) * r, .4 * h, site.z + Math.sin(a) * r, 4.5);
      }
      this.dummy.position.set(site.x, .72 * h, site.z); this.dummy.rotation.set(0, i, 0); this.dummy.scale.setScalar(Math.max(HIDDEN, dock)); this.dummy.updateMatrix();
      for (const mesh of this.dockMeshes) mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.pods.forEach((site, i) => {
      this.dummy.position.set(site.x, 0, site.z); this.dummy.rotation.set(0, site.yaw, 0);
      const level = this.podLevels.value[i], ring = this.podDesign[i] === 1;
      this.dummy.scale.setScalar(Math.max(HIDDEN, ring ? 0 : level)); this.dummy.updateMatrix();
      for (const mesh of this.podMeshes) mesh.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.setScalar(Math.max(HIDDEN, ring ? level : 0)); this.dummy.updateMatrix();
      for (const mesh of this.ringMeshes) mesh.setMatrixAt(i, this.dummy.matrix);
      // Solar canopy just above the pod's planted top (14.7 m two-tier pod, 11.1 m ring-pavilion tree).
      const solarLevel = this.solarPods.value[i] * level;
      this.dummy.position.y = ring ? 12.6 : 16.2; this.dummy.scale.setScalar(Math.max(HIDDEN, solarLevel)); this.dummy.updateMatrix();
      this.solarDiscs.setMatrixAt(i, this.dummy.matrix);
    });
    this.bridges.forEach(({ i, j, y }, k) => {
      // A bridge spans only once both towers stand; it grows out from the midpoint.
      // Mid-rises stay below the lobby levels, so a bridge only spans between full towers (growing over their upper half).
      const a = this.towers[i], b = this.towers[j], level = Math.min(this.height(i), this.height(j));
      const length = Math.hypot(b.x - a.x, b.z - a.z) - 30, s = Math.max(HIDDEN, T.MathUtils.smoothstep(level, .5, 1));
      this.dummy.position.set((a.x + b.x) / 2, y * s, (a.z + b.z) / 2);
      this.dummy.rotation.set(0, Math.atan2(-(b.z - a.z), b.x - a.x), 0);
      this.dummy.scale.set(length * s, s, s); this.dummy.updateMatrix();
      for (const mesh of this.bridgeMeshes) mesh.setMatrixAt(k, this.dummy.matrix);
    });
    for (const mesh of [...this.families.flat(), ...this.podMeshes, ...this.ringMeshes, ...this.bridgeMeshes, this.forestCrowns, ...this.dockMeshes, this.solarDiscs]) mesh.instanceMatrix.needsUpdate = true;
    // Inactive pairings submit no draws.
    this.forestCrowns.visible = this.forest.visible() > 0;
    for (const mesh of this.dockMeshes) mesh.visible = this.docks.visible() > 0;
    this.solarDiscs.visible = this.solarPods.visible() > 0;
  }
}
