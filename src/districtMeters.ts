import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { arc, bake, box, glass, leaf, leafyCrown, publicLight, solar, stone, trail, trim } from './cityRig.ts';
import { changeSites, seaward } from './layout.ts';
import { shoreRoomBays } from './waterRooms.ts';
import { automationActivity, routes } from './mobility.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';
import type { ExhibitionLayout } from './surveyView.ts';

const HIDDEN = 1e-4;

/** 0..1 level per slot, eased toward its target over the shared 3-second site transition. */
export class SlotLevels {
  readonly value: Float32Array;
  /** Slots whose target changed in the latest `setTargets` call. */
  readonly changed: number[] = [];
  private readonly from: Float32Array;
  private readonly to: Float32Array;
  private start = -Infinity;
  private active = false;

  constructor(count: number) {
    this.value = new Float32Array(count);
    this.from = new Float32Array(count);
    this.to = new Float32Array(count);
  }

  /** Returns whether any target changed. `immediate` jumps (snapshots, resets, reduced motion). */
  setTargets(target: (i: number) => number, now: number, immediate: boolean): boolean {
    this.update(now);
    let changed = false;
    this.changed.length = 0;
    for (let i = 0; i < this.to.length; i++) {
      const next = Math.fround(target(i));
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
    const raw = Math.min(1, Math.max(0, (now - this.start) / SITE_TRANSITION_SECONDS)), p = raw * raw * (3 - 2 * raw);
    for (let i = 0; i < this.value.length; i++) this.value[i] = this.from[i] + (this.to[i] - this.from[i]) * p;
    this.active = raw < 1;
    return true;
  }

  visible(): number {
    let n = 0;
    for (const level of this.value) if (level > HIDDEN) n++;
    return n;
  }
}

/** P5: each Meter's change-moment colour (the visual language of its district layer). */
export const METER_COLORS = { automation: '#3fa9ff', publicSharing: '#ff6f91', environmentalPriority: '#5fe08a', urbanConcentration: '#ffb347' } as const;
export type PulsePoint = { x: number; y: number; z: number; r: number };
export const PULSE_SECONDS = 3, PULSE_WAVES = 2, PULSE_WAVE_GAP = 1.2;

/** A live change marks where it happened: each changed slot (and the Meter's site) sends two expanding light rings with a fading
 * light shaft, in the Meter's colour. Additive and unlit, so shared city materials never flash; snapshots and resets emit nothing. */
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
      this.tint.setRGB(glow * 2.2, glow * 2.2, glow * 2.2);
      this.rings.setColorAt(i, this.tint);
      this.tint.multiplyScalar(.35); this.beams.setColorAt(i, this.tint);
    });
    for (const mesh of [this.rings, this.beams]) {
      mesh.count = this.pulses.length; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
}

/** The site's own anchor pulses with its district, tying the lot to the district-wide change. */
const sitePulse = (socket: keyof typeof changeSites): PulsePoint => {
  const s = changeSites[socket];
  return { x: s.x, y: 1, z: s.z, r: Math.max(s.w, s.d) * s.scale * .9 };
};

/** Fixed pseudo-random rank per slot, so a share of slots switches in a scattered rather than end-to-end order. */
const rank = (i: number) => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
/** P8: fixed design family (0..n − 1) per slot; the 7.31 stride breaks the long runs neighbouring slots give `rank`, the salt decorrelates carriers. */
export const designOf = (i: number, salt: number, n: number) => Math.floor(rank(i * 7.31 + salt) * n);

/** Private shell height as a share of its radius: a hemispherical vault rather than the former 28 m egg. */
export const PRIVATE_RISE = 1.15;
/** The vault overhangs its island like a shell parasol; the open steps reach 1.38 × radius. */
const SPREAD = 1.45;
/** Halo canopy height as a share of room radius (about 6–8 m). */
const HALO = .42;
/** Inland sharing courts [x, z, yaw]: open ground scanned clear of landmarks, context, routes, P2 pavilions and P4 towers / pods.
 * P7 ranks by estimated visible hero-frame pixels (`SCAN_COURTS=20` in tests/odaiba.test.ts lists candidates best first). */
const COURT_SITES: readonly (readonly [number, number, number])[] = [
  [-220, -140, .4], [-410, 120, 1.1], [-100, 60, 2.3], [50, -340, .9], [170, -360, 3.6], [-70, 180, 1.7], [-290, 290, 5.1], [-460, 290, .2], [220, 0, 2.8], [-20, 210, 4.4],
];
const COURT = 40;
/** Garden crowns inside a private court [x, z, size], clear of the glass room and the entrance. */
const COURT_TREES: readonly (readonly [number, number, number])[] = [[-10, 8, 4.2], [0, -3, 3.4], [8, 9, 3.8], [10, -9, 3.2], [-2, 13, 2.8], [-14, -14, 2.6]];
/** Parasol centres in a shared plaza. */
const PARASOLS: readonly (readonly [number, number])[] = [[-6, -6], [8, -2], [-2, 9]];
/** Existing planted islands become private water gardens (every other one under a glass vault) or open waterfront commons:
 * stepped seating where the vaults stood, planted halo canopies on the others. */
export class SharingDistrict {
  readonly root = new T.Group();
  readonly bays = shoreRoomBays().map(b => ({ x: b.x, z: b.z, yaw: b.yaw, r: b.r + 1.5, y: 2.8, sx: 1, sz: 1 }));
  private readonly levels = new SlotLevels(this.bays.length);
  private readonly screens: T.InstancedMesh;
  /** Rooms that carry a glass vault when private; the rest stay open gardens and become halo commons. */
  readonly vaulted = this.bays.map((_, i) => i % 2 === 0);
  /** Second carrier, inland: 40 m courts that are walled private gardens or open shared plazas under parasols. */
  readonly courts = COURT_SITES.map(([x, z, yaw]) => ({ x, z, yaw }));
  private readonly court = new SlotLevels(COURT_SITES.length);
  private readonly courtWalls: T.InstancedMesh;
  private readonly courtPavilions: T.InstancedMesh;
  private readonly courtCrowns: T.InstancedMesh;
  private readonly plazaPaving: T.InstancedMesh;
  private readonly plazaParasols: T.InstancedMesh;
  /** P8 design per court: private = walled garden (0) / glass winter garden (1); open = parasol plaza (0) / long-table pergola (1). */
  readonly privateDesign = COURT_SITES.map((_, i) => designOf(i, 1013, 2));
  // Salt picked so court 2, in the COMMONS PLAZA sight line, keeps the open parasols (a solid pergola roof would hide the site).
  readonly openDesign = COURT_SITES.map((_, i) => designOf(i, 1052, 2));
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
  private readonly dummy = new T.Object3D();
  private target = .5;
  private now = 0;

  constructor(parent: T.Object3D) {
    this.root.name = 'sharing-district';
    // Gridshell vault: frosted pearl glass over the garden on ivory ribs and ring beams; rose (the sharing colour) stays on the rim and oculus.
    const privacy = glass.clone(); privacy.color.set('#f4f1ea'); privacy.emissive.set('#ffe2cf'); privacy.emissiveIntensity = .3;
    privacy.side = T.DoubleSide; privacy.transparent = true; privacy.opacity = .62; privacy.depthWrite = false;
    const commons = stone.clone(); commons.emissive.set('#eac0b2'); commons.emissiveIntensity = .3;
    const light = publicLight.clone(); light.emissive.set('#ffa9b1'); light.emissiveIntensity = 1.8;
    const warm = publicLight.clone(); warm.emissive.set('#ffd6a0'); warm.emissiveIntensity = 1.6;
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
    // Shared plaza: a pale paved disc with three white parasols on slim masts (9 m canopies about 9 m up).
    this.plazaPaving = batch(new T.CylinderGeometry(H - 1, H - 1, .3, 48).translate(0, .15, 0), commons, 'sharing-open-plazas');
    this.plazaParasols = batch(mergeGeometries(PARASOLS.flatMap(([x, z]) => [
      new T.ConeGeometry(9, 2.2, 24, 1, true).rotateX(Math.PI).translate(x, 9.1, z).toNonIndexed(),
      new T.CylinderGeometry(.25, .3, 9, 8).translate(x, 4.5, z).toNonIndexed(),
    ])), trim, 'sharing-open-plazas');
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
    this.pulses = new PulseRings(this.root, METER_COLORS.publicSharing, (this.bays.length + n + 1) * PULSE_WAVES);
    this.root.visible = false; parent.add(this.root); this.write();
  }

  setTarget(layout: Pick<ExhibitionLayout, 'sharedSeats'>, now: number, immediate: boolean): boolean {
    this.target = layout.sharedSeats / 8;
    // The first low / high proposals (2 / 7 seats) already read as distinct mature alternatives.
    const share = T.MathUtils.smoothstep(this.target, .25, .875);
    this.root.visible = true;
    const rooms = this.levels.setTargets(i => rank(i + 401) < share ? 1 : 0, now, immediate);
    const courts = this.court.setTargets(i => rank(i + 977) < share ? 1 : 0, now, immediate), changed = rooms || courts;
    if (changed && !immediate) this.pulses.emit([sitePulse('sw'), ...(rooms ? this.levels.changed : []).map(i => {
      const b = this.bays[i]; return { x: b.x, y: b.y, z: b.z, r: b.r * b.sx * 1.3 };
    }), ...(courts ? this.court.changed : []).map(i => ({ x: this.courts[i].x, y: 0, z: this.courts[i].z, r: COURT * .75 }))], now);
    this.write(); return changed;
  }

  update(now: number): void {
    this.now = now; this.deckGlow.emissiveIntensity = .2 + 2 * (towerGlow.value - .3);
    const rooms = this.levels.update(now), courts = this.court.update(now);
    if (rooms || courts) this.write(); this.pulses.update(now);
  }
  hide(): void { this.root.visible = false; this.pulses.clear(); }
  getDiagnostics() {
    const open = this.root.visible ? this.levels.visible() : 0;
    return { enabled: this.root.visible, targetSharing: this.target, rooms: this.bays.length, activePulses: this.pulses.active(this.now),
      vaults: this.vaulted.filter(Boolean).length, courts: this.courts.length,
      visibleOpenCourts: this.root.visible ? this.court.visible() : 0, visibleOpenRooms: open, visiblePrivateRooms: this.root.visible ? this.levels.value.filter(v => 1 - v > HIDDEN).length : 0 };
  }

  private write(): void {
    this.bays.forEach((bay, i) => {
      const open = this.levels.value[i], vaulted = this.vaulted[i], height = vaulted ? PRIVATE_RISE * bay.r * (1 - open) : 0;
      // Keep hidden matrices invertible: flattened curved normals otherwise poison the G-buffer / SSR.
      const privateScale = vaulted ? Math.max(HIDDEN, 1 - open) : HIDDEN, publicScale = Math.max(HIDDEN, open);
      const stepScale = vaulted ? publicScale : HIDDEN, haloScale = vaulted ? HIDDEN : publicScale;
      this.dummy.position.set(bay.x, bay.y, bay.z); this.dummy.rotation.set(0, bay.yaw, 0);
      // A settled-open vault collapses completely; a flat glass disc would otherwise tint the garden.
      const footprint = height > HIDDEN ? SPREAD : HIDDEN;
      this.dummy.scale.set(bay.r * bay.sx * footprint, Math.max(HIDDEN, height), bay.r * bay.sz * footprint); this.dummy.updateMatrix();
      for (const mesh of [this.screens, this.ribs]) mesh.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.y = bay.r; this.dummy.updateMatrix(); this.rims.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.y = bay.y + height * Math.cos(.18);
      this.dummy.scale.set(bay.r * bay.sx * SPREAD * privateScale, bay.r * privateScale, bay.r * bay.sz * SPREAD * privateScale);
      this.dummy.updateMatrix(); this.skylights.setMatrixAt(i, this.dummy.matrix);
      this.steps.forEach((mesh, tier) => {
        this.dummy.position.y = bay.y + tier * .7;
        this.dummy.scale.set(bay.r * bay.sx * stepScale, bay.r * stepScale, bay.r * bay.sz * stepScale);
        this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
      });
      this.dummy.position.y = bay.y; this.dummy.scale.set(bay.r * bay.sx * haloScale, bay.r * haloScale, bay.r * bay.sz * haloScale);
      this.dummy.updateMatrix(); for (const mesh of [this.halos, this.haloGardens, this.haloLights, this.haloDecks]) mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.courts.forEach(({ x, z, yaw }, i) => {
      const open = this.court.value[i], walled = Math.max(HIDDEN, 1 - open), shared = Math.max(HIDDEN, open);
      this.dummy.position.set(x, 0, z); this.dummy.rotation.set(0, yaw, 0);
      // Walls and the garden room sink into the ground; the plaza paving spreads and the parasols open.
      const glasshouse = this.privateDesign[i] === 1, pergola = this.openDesign[i] === 1;
      this.dummy.scale.set(1, glasshouse ? HIDDEN : walled, 1); this.dummy.updateMatrix();
      this.courtWalls.setMatrixAt(i, this.dummy.matrix); this.courtPavilions.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.set(1, glasshouse ? walled : HIDDEN, 1); this.dummy.updateMatrix();
      this.winterGardens.setMatrixAt(i, this.dummy.matrix); this.winterFrames.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.set(shared, 1, shared); this.dummy.updateMatrix(); this.plazaPaving.setMatrixAt(i, this.dummy.matrix);
      const parasols = pergola ? HIDDEN : shared, tables = pergola ? shared : HIDDEN;
      this.dummy.scale.set(parasols, parasols, parasols); this.dummy.updateMatrix(); this.plazaParasols.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.set(tables, tables, tables); this.dummy.updateMatrix();
      this.pergolaFrames.setMatrixAt(i, this.dummy.matrix); this.pergolaRoofs.setMatrixAt(i, this.dummy.matrix);
      const c = Math.cos(yaw), s = Math.sin(yaw);
      COURT_TREES.forEach(([tx, tz, size], k) => {
        const r = size * walled;
        this.dummy.position.set(x + tx * c + tz * s, r * .75, z - tx * s + tz * c); this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(r * 1.2, r, r * 1.2); this.dummy.updateMatrix(); this.courtCrowns.setMatrixAt(i * COURT_TREES.length + k, this.dummy.matrix);
      });
    });
    for (const mesh of [this.courtWalls, this.courtPavilions, this.courtCrowns, this.plazaPaving, this.plazaParasols, this.winterGardens, this.winterFrames,
      this.pergolaFrames, this.pergolaRoofs]) mesh.instanceMatrix.needsUpdate = true;
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
  readonly slots: number;
  readonly targetCanopy: number;
  readonly visibleCanopies: number;
  readonly visibleSails: number;
  readonly visibleCoolingTowers: number;
  readonly roofs: number;
  readonly visibleRoofSails: number;
  readonly visibleRoofCrowns: number;
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
    this.rings = new T.InstancedMesh(new T.TorusGeometry(2.6, .35, 6, 24).rotateX(Math.PI / 2), trail, this.towerBays.length * 2);
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
    if (this.applied) this.setRoofTargets(this.now, true);
    this.write();
  }

  private setRoofTargets(now: number, immediate: boolean): boolean {
    const green = (i: number) => rank(i + 37) < this.targetCanopy ? 1 : 0;
    const a = this.roofSail.setTargets(i => 1 - green(i), now, immediate);
    const b = this.roofCrown.setTargets(green, now, immediate);
    return a || b;
  }

  /** `plantedFraction` runs .2–.8 over the environment axis; its 0..1 position is the share of canopy-shaded bays. */
  setTarget(layout: Pick<ExhibitionLayout, 'plantedFraction'>, now: number, immediate: boolean): boolean {
    const share = Math.min(1, Math.max(0, (layout.plantedFraction - .2) / .6));
    this.targetCanopy = share;
    this.now = now;
    this.applied = true;
    this.root.visible = true;
    const green = (i: number) => rank(i) < share ? 1 : 0;
    const a = this.canopy.setTargets(green, now, immediate);
    const b = this.sail.setTargets(i => 1 - green(i), now, immediate);
    // Mist towers only below the midpoint: most at the low end, none from mixed upward.
    const c = this.tower.setTargets(i => rank(i + 101) >= share * 2 ? 1 : 0, now, immediate);
    const d = this.setRoofTargets(now, immediate);
    this.facade.setTargets(i => facadeShare(i ? 1 - share : share), now, immediate);
    if ((a || b || c || d) && !immediate) {
      const bays = new Set([...this.canopy.changed, ...this.sail.changed, ...this.tower.changed.map(j => this.towerBays[j])]);
      const roofs = new Set([...this.roofSail.changed, ...this.roofCrown.changed]);
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

  update(now: number): void {
    this.now = now;
    if (this.facade.update(now)) this.writeFacade();
    const moved = [this.canopy.update(now), this.sail.update(now), this.tower.update(now), this.roofSail.update(now), this.roofCrown.update(now)].some(Boolean);
    if (moved) this.write();
    this.pulses.update(now);
  }

  getDiagnostics(): EnvironmentDistrictDiagnostics {
    return {
      slots: this.bays.length, targetCanopy: this.targetCanopy,
      visibleCanopies: this.canopy.visible(), visibleSails: this.sail.visible(), visibleCoolingTowers: this.tower.visible(),
      roofs: this.roofs.length, visibleRoofSails: this.roofSail.visible(), visibleRoofCrowns: this.roofCrown.visible(),
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
      const g = this.canopy.value[i], w = this.sail.value[i];
      const sail = this.lowDesign[i] ? 0 : w, louvre = this.lowDesign[i] ? w : 0, pergola = this.highDesign[i] ? 0 : g, screen = this.highDesign[i] ? g : 0;
      this.place(bay, 0, ROOF + .4, 0, sail); this.sails.setMatrixAt(i, this.dummy.matrix);
      this.place(bay, 0, ROOF + .3, 0, louvre); this.louvres.setMatrixAt(i, this.dummy.matrix);
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
      const w = this.roofSail.value[i], g = this.roofCrown.value[i], size = r * 2.4 / SPAN, bay = { x, y, z, yaw: Math.sin(x * .37 + z * .11) * 3 };
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

/** Drone port deck height: well above the 42 m pavilion dome, so the autonomous counterpart reads as a new silhouette. */
export const PORT_DECK = 46;
/** Q1: staffed waterfront pavilions give way to autonomous drone ports on the same bays, with denser district circulation.
 * World-space batches stay independent of the hub's scaled lot and use the same 3 s clock. */
export class AutomationDistrict {
  readonly root = new T.Group();
  readonly bays: { x: number; y: number; z: number; yaw: number }[] = [];
  private readonly automation = new SlotLevels(1);
  private readonly staffed: SlotLevels;
  private readonly meshes: T.InstancedMesh[];
  private readonly ports: T.InstancedMesh[];
  /** P8 design per bay: staffed = domed hall (0) / stacked-deck hall (1); autonomous = drone port (0) / charging mast (1). */
  readonly staffedDesign: number[];
  readonly autonomousDesign: number[];
  private readonly decks: T.InstancedMesh[];
  private readonly masts: T.InstancedMesh[];
  private readonly pulses: PulseRings;
  private readonly dummy = new T.Object3D();
  private target = .5;
  private now = 0;

  constructor(parent: T.Object3D) {
    this.root.name = 'automation-district';
    for (const path of routes().promenades) {
      const n = Math.floor(path.getLength() / 40);
      for (let i = 1; i < n; i++) {
        const p = path.getPointAt(i / n), t = path.getTangentAt(i / n), yaw = Math.atan2(-t.z, t.x);
        p.x -= Math.sin(yaw) * 22; p.z -= Math.cos(yaw) * 22;
        if (Object.values(changeSites).some(s => Math.abs(p.x - s.x) < s.w * s.scale / 2 + 24 && Math.abs(p.z - s.z) < s.d * s.scale / 2 + 24)) continue;
        if (p.x > -65 && p.x < -25) continue; // Existing north-west context block.
        this.bays.push({ x: p.x, y: p.y, z: p.z, yaw });
      }
    }
    // Traced open plazas at the mall approaches and western waterfront (actual-mesh checks in odaiba.test.ts).
    for (const [x, z, yaw] of [[20, 145, 0], [-200, 80, 0], [-130, 170, 0], [75, -160, 0], [-438, 45, -.9]])
      this.bays.push({ x, y: 0, z, yaw });
    this.staffed = new SlotLevels(this.bays.length);
    const pavilion = new T.Group();
    const ceramic = trim.clone(); ceramic.emissive.set('#e5cab0'); ceramic.emissiveIntensity = 1;
    // Open service hall: ivory canopy, glass service bar and warm-lit fascia, with people behind the counter.
    box(pavilion, [38, .8, 34], [0, 20, 0], ceramic);
    for (const x of [-16, 16]) for (const z of [-12, 12]) box(pavilion, [.8, 20, .8], [x, 10, z], trim);
    const roof = new T.Mesh(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), ceramic);
    roof.scale.set(19, 10, 27); roof.position.y = 32; pavilion.add(roof);
    box(pavilion, [32, .2, .3], [0, 31.3, -13.8], publicLight);
    for (const x of [-14, 14]) for (const z of [-7, 7]) {
      const height = 32 + 10 * Math.sqrt(1 - (x / 19) ** 2 - (z / 27) ** 2) - 20.4;
      box(pavilion, [.6, height + .2, .6], [x, 20.4 + height / 2, z], trim);
    }
    box(pavilion, [2.4, 20, 2.4], [16, 10, -12], glass); // Lift access to the staffed terrace.
    box(pavilion, [26, 1, 2], [0, 20.95, 2], glass);
    box(pavilion, [26, .18, 3], [0, 21.54, 2], trim);
    for (let i = 0; i < 6; i++) {
      const torso = new T.Mesh(new T.CapsuleGeometry(.35, .65, 4, 8), glass);
      torso.position.set((i - 2.5) * 4.2, 21.5, 4); pavilion.add(torso);
      const head = new T.Mesh(new T.SphereGeometry(.25, 10, 8), trim);
      head.position.set(torso.position.x, 22.35, 4); pavilion.add(head);
      for (const dx of [-.14, .14]) box(pavilion, [.15, .8, .18], [torso.position.x + dx, 20.85, 4], glass, .04);
    }
    const instances = (group: T.Object3D, name: string) => bake(group).map(source => {
      const mesh = new T.InstancedMesh(source.geometry, source.material, this.bays.length);
      mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.root.add(mesh); return mesh;
    });
    this.meshes = instances(pavilion, 'automation-staffed-pavilions');
    // Autonomous counterpart on the same bay: a slate mast lifts a round landing deck with a lit blue apron ring, a charging spire
    // and parked drones; no people. A single-footed silhouette above the old dome, so absence never stands in for the identity.
    const port = new T.Group();
    const at = (geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) => {
      const m = new T.Mesh(geometry, material); m.position.set(x, y, z); port.add(m);
    };
    at(new T.CylinderGeometry(1.6, 2.4, PORT_DECK, 12), solar, 0, PORT_DECK / 2, 0);
    at(new T.CylinderGeometry(15, 6, 3, 40), solar, 0, PORT_DECK - 1.5, 0);
    at(new T.CylinderGeometry(15.4, 15.4, .5, 48), trim, 0, PORT_DECK + .25, 0);
    at(new T.TorusGeometry(12, .45, 6, 48).rotateX(Math.PI / 2), trail, 0, PORT_DECK + .6, 0);
    at(new T.TorusGeometry(15.4, .35, 6, 48).rotateX(Math.PI / 2), trail, 0, PORT_DECK - .2, 0);
    at(new T.CylinderGeometry(.5, 1, 18, 8), solar, 0, PORT_DECK + 9, 0);
    for (const y of [5, 10, 15]) at(new T.TorusGeometry(1.6 - y * .04, .22, 6, 20).rotateX(Math.PI / 2), trail, 0, PORT_DECK + y, 0);
    for (const a of [0, 2.1, 4.2]) {
      const x = Math.cos(a) * 8, z = Math.sin(a) * 8;
      at(new T.SphereGeometry(1.4, 12, 8).scale(1.4, .6, 1), glass, x, PORT_DECK + 1.3, z);
      for (const [dx, dz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) at(new T.CylinderGeometry(1, 1, .12, 12), trim, x + dx, PORT_DECK + 1.6, z + dz);
    }
    this.ports = instances(port, 'automation-drone-ports');
    // Stacked-deck staffed hall: two open terraces on the same four piers, a planted upper edge and a flat lit roof, staff at both bars.
    const deck = new T.Group();
    // Lower terrace at the domed hall's 20 m, so the guideway still passes beneath.
    for (const x of [-16, 16]) for (const z of [-12, 12]) box(deck, [.8, 37, .8], [x, 18.5, z], trim);
    box(deck, [38, .8, 34], [0, 20, 0], ceramic);
    box(deck, [30, .8, 26], [0, 28.5, 0], ceramic);
    box(deck, [30.4, .6, 2], [0, 29.2, 12.4], leaf); box(deck, [30.4, .6, 2], [0, 29.2, -12.4], leaf);
    box(deck, [36, .6, 32], [0, 37, 0], ceramic);
    box(deck, [36.2, .3, .3], [0, 36.5, -16], publicLight);
    box(deck, [2.4, 37, 2.4], [16, 18.5, -12], glass);
    for (const [y, w] of [[20.95, 26], [29.45, 20]] as const) { box(deck, [w, 1, 2], [0, y, 2], glass); box(deck, [w, .18, 3], [0, y + .6, 2], trim); }
    for (let i = 0; i < 6; i++) {
      const y = i < 3 ? 21.5 : 30, x = (i % 3 - 1) * 6;
      const torso = new T.Mesh(new T.CapsuleGeometry(.35, .65, 4, 8), glass); torso.position.set(x, y, 4); deck.add(torso);
      const head = new T.Mesh(new T.SphereGeometry(.25, 10, 8), trim); head.position.set(x, y + .85, 4); deck.add(head);
    }
    this.decks = instances(deck, 'automation-staffed-pavilions');
    // Charging mast: a slender slate mast with three cantilevered charging arms, each with a lit dock ring and a drone docked.
    const mast = new T.Group();
    const piece = (geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) => {
      const m = new T.Mesh(geometry, material); m.position.set(x, y, z); mast.add(m);
    };
    piece(new T.CylinderGeometry(4, 5, 1.2, 16), trim, 0, .6, 0);
    piece(new T.CylinderGeometry(1, 2.2, 72, 12), solar, 0, 36, 0);
    piece(new T.TorusGeometry(2.2, .3, 6, 20).rotateX(Math.PI / 2), trail, 0, 72, 0);
    [[40, 0], [52, 2.1], [64, 4.2]].forEach(([y, a]) => {
      const x = Math.cos(a) * 9, z = -Math.sin(a) * 9;
      piece(new T.BoxGeometry(14, .9, 1.4).rotateY(a), solar, x / 2 * 1.4, y, z / 2 * 1.4);
      piece(new T.TorusGeometry(3.4, .3, 6, 24).rotateX(Math.PI / 2), trail, x * 1.4, y + .6, z * 1.4);
      piece(new T.SphereGeometry(1.5, 12, 8).scale(1.4, .6, 1), glass, x * 1.4, y + 1.4, z * 1.4);
    });
    this.masts = instances(mast, 'automation-drone-ports');
    this.staffedDesign = this.bays.map((_, i) => designOf(i, 233, 2));
    this.autonomousDesign = this.bays.map((_, i) => designOf(i, 271, 2));
    this.pulses = new PulseRings(this.root, METER_COLORS.automation, (this.bays.length + 1) * PULSE_WAVES);
    this.root.visible = false; parent.add(this.root); this.write();
  }

  get level(): number | undefined { return this.root.visible ? this.automation.value[0] : undefined; }

  setTarget(layout: Pick<ExhibitionLayout, 'automatedPorts'>, now: number, immediate: boolean): boolean {
    this.target = layout.automatedPorts / 6;
    const activity = automationActivity(this.target);
    this.root.visible = true;
    const a = this.automation.setTargets(() => this.target, now, immediate);
    const b = this.staffed.setTargets(i => rank(i + 203) >= activity.level ? 1 : 0, now, immediate);
    // The fleets change everywhere at once, so the hub anchors the pulse; changed bays (pavilion ↔ drone port) mark their terraces.
    if ((a || b) && !immediate) this.pulses.emit([sitePulse('nw'), ...this.staffed.changed.map(i => ({ x: this.bays[i].x, y: this.bays[i].y + 20, z: this.bays[i].z, r: 26 }))], now);
    this.write(); return a || b;
  }

  update(now: number): void {
    this.now = now;
    this.automation.update(now);
    if (this.staffed.update(now)) this.write();
    this.pulses.update(now);
  }

  hide(): void { this.root.visible = false; this.pulses.clear(); }

  getDiagnostics() {
    const activity = automationActivity(this.level ?? .5);
    return { enabled: this.root.visible, targetAutomation: this.target, automation: this.level, activePulses: this.pulses.active(this.now),
      pavilions: this.bays.length, visibleStaffedPavilions: this.root.visible ? this.staffed.visible() : 0,
      visibleDronePorts: this.root.visible ? this.staffed.value.filter(v => 1 - v > HIDDEN).length : 0,
      loopAircraft: this.root.visible ? Math.ceil(activity.aircraft) : undefined,
      guidewayPods: this.root.visible ? Math.ceil(activity.pods) : undefined, walkers: this.root.visible ? Math.ceil(activity.walkers) : undefined };
  }

  private write(): void {
    this.bays.forEach((bay, i) => {
      this.dummy.position.set(bay.x, bay.y, bay.z); this.dummy.rotation.set(0, bay.yaw, 0);
      // The autonomous design rises from its foot as the staffed hall folds away (same 3 s clock); hidden designs keep an invertible tiny scale.
      const staffed = this.staffed.value[i], autonomous = 1 - staffed;
      const scales: [T.InstancedMesh[], number][] = [[this.meshes, this.staffedDesign[i] ? 0 : staffed], [this.decks, this.staffedDesign[i] ? staffed : 0],
        [this.ports, this.autonomousDesign[i] ? 0 : autonomous], [this.masts, this.autonomousDesign[i] ? autonomous : 0]];
      for (const [meshes, level] of scales) {
        this.dummy.scale.setScalar(Math.max(HIDDEN, level)); this.dummy.updateMatrix();
        for (const mesh of meshes) mesh.setMatrixAt(i, this.dummy.matrix);
      }
    });
    for (const mesh of [...this.meshes, ...this.decks, ...this.ports, ...this.masts]) mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Lit-room strength on the concentration towers' glass (odaibaScene.updateOdaiba follows the night). */
export const towerGlow = { value: .3 };

// Traced open ground (tests/odaiba.test.ts checks ground, landmarks, context and routes): towers rise beside the SE site, at the DECKS
// waterfront and from the western lawns where low concentration scatters its pods.
// ponytail: skyway clearance was checked once in the browser (skyways.ts imports JSON Node cannot load); recheck these sites if skyways move.
const TOWER_SITES: readonly (readonly [number, number, number])[] = [
  [115, -25, 128], [67, -89, 112], [27, -249, 120], [83, -305, 104], [-189, -1, 140], [-221, -73, 116], [-157, 63, 124], [-61, 111, 104], [179, 287, 120], [-13, 279, 110],
];
const POD_SITES: readonly (readonly [number, number])[] = [
  [-293, 147], [-253, -33], [-233, 47], [-218, -23], [-183, -43], [-168, -128], [-103, 17], [-53, 147], [-33, 167], [-23, 107], [7, -58], [27, 87], [77, 107], [87, 57], [97, -73], [107, -123], [107, 77], [117, 7], [137, -103], [207, 37], [217, -43], [217, 87], [237, -73], [237, 57], [247, -103], [252, 147],
];

/** Q4: one walkable vertical district or functions spread through the parks.
 * High raises slender glass towers with lit sky lobbies on open ground; low scatters low glass pavilion pods across the lawns.
 * Both are complete 2127 forms; mixed shows about half of each. Positions are traced open ground (actual-mesh checks in odaiba.test.ts). */
export class ConcentrationDistrict {
  readonly root = new T.Group();
  /** [x, z, height]: spire tips (1.06 × height) stay below the 170 m air-taxi loop. */
  readonly towers: readonly { x: number; z: number; h: number }[] = TOWER_SITES.map(([x, z, h]) => ({ x, z, h }));
  readonly pods: readonly { x: number; z: number; yaw: number }[] = POD_SITES.map(([x, z], i) => ({ x, z, yaw: i * 2.1 }));
  private readonly towerLevels = new SlotLevels(this.towers.length);
  private readonly podLevels = new SlotLevels(this.pods.length);
  /** Tower meshes per silhouette family (slot i uses family i % 3, instance ⌊i / 3⌋). */
  private readonly families: T.InstancedMesh[][];
  private readonly podMeshes: T.InstancedMesh[];
  /** P8 design per pod site: two-tier pod (0) / garden ring pavilion (1). */
  readonly podDesign: number[] = POD_SITES.map((_, i) => designOf(i, 1201, 2));
  private readonly ringMeshes: T.InstancedMesh[];
  readonly bridges: { i: number; j: number; y: number }[] = [];
  private readonly bridgeMeshes: T.InstancedMesh[];
  private readonly pulses: PulseRings;
  private readonly dummy = new T.Object3D();
  private target = .5;
  private now = 0;

  constructor(parent: T.Object3D) {
    this.root.name = 'concentration-district';
    // Sky-blue glass with warm-lit rooms on 4.2 m storeys (about half the bays occupied): the new vertical district reads apart from the
    // ivory mid-rise city by day and as lit towers at night (`towerGlow`, driven by updateOdaiba).
    const facade = new T.MeshStandardMaterial({ color: '#6f9cbd', roughness: .18, metalness: .15, emissive: '#ffd6a0' });
    facade.onBeforeCompile = shader => {
      shader.uniforms.towerGlow = towerGlow;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 towerP;\nvarying vec2 towerC;')
        .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 w = vec4(transformed, 1.), c = vec4(0., 0., 0., 1.);
        #ifdef USE_INSTANCING
          w = instanceMatrix * w; c = instanceMatrix * c;
        #endif
          towerP = (modelMatrix * w).xyz; towerC = (modelMatrix * c).xz; }`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float towerGlow;\nvarying vec3 towerP;\nvarying vec2 towerC;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 room = vec2(floor(atan(towerP.x - towerC.x, towerP.z - towerC.y) * 2.546), floor(towerP.y / 4.2));
        float lit = step(.5, fract(sin(dot(room + towerC, vec2(12.9898, 78.233))) * 43758.5453)) * step(.25, fract(towerP.y / 4.2));
        totalEmissiveRadiance *= lit * towerGlow;`);
    };
    facade.customProgramCacheKey = () => 'concentration-tower-glass';
    const lobby = publicLight.clone(); lobby.emissive.set('#ffe1b8'); lobby.emissiveIntensity = .9;
    // Three unit-height (1 m, scaled per site) silhouette families by slot, all on an ivory podium and all marked at the .4 / .72 sky-lobby
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
    this.families = [twisted, terraced, twin].map((group, f) =>
      this.instances(bake(group), this.towers.filter((_, i) => i % 3 === f).length, 'concentration-vertical-towers'));
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
    this.pulses = new PulseRings(this.root, METER_COLORS.urbanConcentration, (this.towers.length + this.pods.length + 1) * PULSE_WAVES);
    this.root.visible = false; parent.add(this.root); this.write();
  }

  setTarget(layout: Pick<ExhibitionLayout, 'functionModules'>, now: number, immediate: boolean): boolean {
    this.target = (layout.functionModules - 2) / 4;
    // First low / high proposals (3 / 5 modules) read as the two complete forms; mixed (4) keeps about half of each.
    const share = T.MathUtils.smoothstep(this.target, .3, .75);
    this.root.visible = true;
    // Golden-ratio order: with only ten towers a hash rank clusters, this keeps any share evenly spread across both groups.
    const order = (i: number, offset: number) => (i * .6180339887 + offset) % 1;
    const a = this.towerLevels.setTargets(i => order(i, .31) < share ? 1 : 0, now, immediate);
    const b = this.podLevels.setTargets(i => order(i, .77) >= share ? 1 : 0, now, immediate);
    if ((a || b) && !immediate) this.pulses.emit([
      sitePulse('se'),
      ...this.towerLevels.changed.map(i => ({ x: this.towers[i].x, y: 1, z: this.towers[i].z, r: 30 })),
      ...this.podLevels.changed.map(i => ({ x: this.pods[i].x, y: 1, z: this.pods[i].z, r: 14 })),
    ], now);
    this.write(); return a || b;
  }

  update(now: number): void {
    this.now = now;
    const a = this.towerLevels.update(now), b = this.podLevels.update(now);
    if (a || b) this.write();
    this.pulses.update(now);
  }

  hide(): void { this.root.visible = false; this.pulses.clear(); }

  getDiagnostics() {
    return { enabled: this.root.visible, targetConcentration: this.target, towers: this.towers.length, pods: this.pods.length, activePulses: this.pulses.active(this.now),
      visibleTowers: this.root.visible ? this.towerLevels.visible() : 0, visiblePods: this.root.visible ? this.podLevels.visible() : 0 };
  }

  private instances(sources: T.Mesh[], count: number, name: string): T.InstancedMesh[] {
    return sources.map(source => {
      const mesh = new T.InstancedMesh(source.geometry, source.material, count);
      mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.root.add(mesh); return mesh;
    });
  }

  private write(): void {
    this.towers.forEach((site, i) => {
      // Towers rise from the plaza; hidden ones keep a tiny invertible scale (flattened normals poison the G-buffer).
      const level = this.towerLevels.value[i], footprint = level > .02 ? 1 : HIDDEN;
      this.dummy.position.set(site.x, 0, site.z); this.dummy.rotation.set(0, i, 0);
      this.dummy.scale.set(footprint, Math.max(HIDDEN, level) * site.h, footprint); this.dummy.updateMatrix();
      for (const mesh of this.families[i % 3]) mesh.setMatrixAt(Math.floor(i / 3), this.dummy.matrix);
    });
    this.pods.forEach((site, i) => {
      this.dummy.position.set(site.x, 0, site.z); this.dummy.rotation.set(0, site.yaw, 0);
      const level = this.podLevels.value[i], ring = this.podDesign[i] === 1;
      this.dummy.scale.setScalar(Math.max(HIDDEN, ring ? 0 : level)); this.dummy.updateMatrix();
      for (const mesh of this.podMeshes) mesh.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.setScalar(Math.max(HIDDEN, ring ? level : 0)); this.dummy.updateMatrix();
      for (const mesh of this.ringMeshes) mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.bridges.forEach(({ i, j, y }, k) => {
      // A bridge spans only once both towers stand; it grows out from the midpoint.
      const a = this.towers[i], b = this.towers[j], level = Math.min(this.towerLevels.value[i], this.towerLevels.value[j]);
      const length = Math.hypot(b.x - a.x, b.z - a.z) - 30, s = Math.max(HIDDEN, level);
      this.dummy.position.set((a.x + b.x) / 2, y * s, (a.z + b.z) / 2);
      this.dummy.rotation.set(0, Math.atan2(-(b.z - a.z), b.x - a.x), 0);
      this.dummy.scale.set(length * s, s, s); this.dummy.updateMatrix();
      for (const mesh of this.bridgeMeshes) mesh.setMatrixAt(k, this.dummy.matrix);
    });
    for (const mesh of [...this.families.flat(), ...this.podMeshes, ...this.ringMeshes, ...this.bridgeMeshes]) mesh.instanceMatrix.needsUpdate = true;
  }
}
