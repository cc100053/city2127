// "One vote's journey" (2026-10-13): a resident's four votes fly as light from the station side of the screen to the four focal sites,
// scan rings rise where they land, and each vote stays as a small lantern that brightens at night. Additive and unlit.
import * as T from 'three';
import type { EnergyChoice } from '../survey/src/shared/energy.ts';
import { CITY_AXES, type CityAxis } from '../survey/src/shared/citySurveyState.ts';
import type { RotationOutcome } from '../survey/src/shared/rotation.ts';

/** −1 / 0 / +1 per axis, as the server's proposal record and the root's parsed view both carry it. */
type Votes = Readonly<Record<CityAxis, number> & { energy?: EnergyChoice }>;
import { METER_COLORS } from './districtMeters.ts';
import { changeSites, HOLOGRAMS, LOTS } from './layout.ts';
import { glowTexture } from './glowTexture.ts';

const SOCKET: Record<CityAxis, keyof typeof changeSites> = { automation: 'nw', publicSharing: 'sw', environmentalPriority: 'ne', urbanConcentration: 'se' };
const NEUTRAL = '#fff1d6';
// The fourth new vote visits the energy shore node, not the inherited climate park.
export const ENERGY_VOTE_SITE = { x: -310, z: -105, w: 14, d: 14, scale: 1 };
const voteSite = (axis: CityAxis, energy: boolean) => axis === 'environmentalPriority' && energy ? ENERGY_VOTE_SITE : changeSites[SOCKET[axis]];
export const FLIGHT_SECONDS = 2.2, ORB_STAGGER = .14, SCAN_SECONDS = 1.4;
/** The vote has landed at every site once the last staggered orb arrives. */
export const ARRIVAL_SECONDS = FLIGHT_SECONDS + ORB_STAGGER * (CITY_AXES.length - 1);
/** Lanterns keep the latest 64 guests, the same window the city view's recentProposals carries, so live and restored cities match. */
export const LANTERN_GUESTS = 64;
const TRAIL = 22, LANTERNS = LANTERN_GUESTS * CITY_AXES.length;
const HIDDEN = new T.Matrix4().makeScale(0, 0, 0);

const hash = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const voteColor = (axis: CityAxis, vote: number, energy = false) => new T.Color(energy ? '#75e2c2' : vote === 0 ? NEUTRAL : METER_COLORS[axis]);

/** Fixed lantern spot for guest `ordinal` on `axis`: a loose halo floating above the focal site's roofs (clear of trees and podiums), so a rebuild lands in the same place. */
export function lanternSpot(ordinal: number, axis: CityAxis, energy = false): T.Vector3 {
  const s = voteSite(axis, energy);
  return spotAround(s.x, s.z, Math.max(s.w, s.d) * s.scale, ordinal * 4 + CITY_AXES.indexOf(axis));
}
/** Hashed halo point `i` around (x, z) within `extent` (a site's plan extent, metres). */
function spotAround(x: number, z: number, extent: number, i: number): T.Vector3 {
  const angle = hash(i) * Math.PI * 2, radius = extent * (.4 + .7 * Math.sqrt(hash(i + .5)));
  return new T.Vector3(x + Math.cos(angle) * radius, 42 + 22 * hash(i + .25), z + Math.sin(angle) * radius);
}

// `axis`: a version4 vote (lands, leaves its axis lantern). Rotation runs: `rotation` is the outcome question's big orb (lands on its
// site, leaves the guest's one lantern); `fade` is one of the other answers, which joins the crowd share and fades out at its apex.
type Flight = { axis: CityAxis; vote: number; color: T.Color; curve: T.CatmullRomCurve3; start: number; landed: boolean; ordinal: number; energy: boolean; scans: readonly Omit<Scan, 'color' | 'start'>[];
  mode?: 'rotation' | 'fade'; outcome?: RotationOutcome; answers?: readonly Answer[] };
/** Where a live headline actually changed: the district slots of the guest's axis (CarrierChange.points). */
export type JourneyLanding = { readonly socketId: string; readonly points?: readonly { readonly x: number; readonly z: number; readonly r: number }[] };
const MAX_LANDING_SCANS = 8;

/** Ground point and scan rings an orb lands on: the changed slots of the headline axis, else the focal site. */
export function landingFor(axis: CityAxis, energy: boolean, landing?: JourneyLanding): { x: number; z: number; scans: Omit<Scan, 'color' | 'start'>[] } {
  const points = !energy && landing && SOCKET[axis] === landing.socketId ? landing.points?.slice(0, MAX_LANDING_SCANS) ?? [] : [];
  if (points.length) return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length, z: points.reduce((sum, p) => sum + p.z, 0) / points.length,
    scans: points.map(p => ({ x: p.x, z: p.z, r: p.r })),
  };
  const s = voteSite(axis, energy);
  return { x: s.x, z: s.z, scans: [{ x: s.x, z: s.z, r: Math.max(s.w, s.d) * s.scale * 1.15 }] };
}
type Scan = { x: number; z: number; r: number; color: T.Color; start: number };

/** Rotation runs: the Meter site each question's models stand on. A question without a row (or a lot, below) has no site yet; its orb only fades. */
export const ROTATION_SITE_AXIS: Readonly<Record<string, CityAxis>> = { Q01: 'automation', Q08: 'publicSharing' };
/** Q02's models each own a lot (layout LOTS); its orb lands on the lot of the model the outcome shows, in the energy vote's colour. */
export const Q02_LOTS: Readonly<Record<string, keyof typeof LOTS>> = { A: 'q02-west-sea', B: 'q02-bay-flower', C: 'q02-farm-south' };
const Q02_COLOR = '#75e2c2';
/** Lots shared by all of a question's options (layout LOTS): the orb lands there whatever the outcome, in its axis colour and lantern slot.
 *  Q03 (drawer housing; B/C vacant for now) takes the sharing axis, the question's 共有志向 theme (provisional, owner 2026-11-19). */
/** Q06 (pod-frame tower; A/C vacant for now) takes the environment axis, the question's 資源循環志向 theme (provisional, owner 2026-11-19). */
export const ROTATION_SHARED_LOTS: Readonly<Record<string, { lot: keyof typeof LOTS; axis: CityAxis }>> = {
  Q03: { lot: 'drawer-housing', axis: 'publicSharing' },
  Q06: { lot: 'pod-tower', axis: 'environmentalPriority' },
};
/** Where a rotation outcome lands: ground point, plan extent (lantern halo; the scan ring is 1.15×), swap colour and the guest's lantern slot axis. */
export type RotationSite = { x: number; z: number; extent: number; color: string; slot: CityAxis };
type Answer = { questionId: string; optionId?: string };
export function rotationSite(outcome: RotationOutcome, answers: readonly Answer[]): RotationSite | undefined {
  const axis = ROTATION_SITE_AXIS[outcome.questionId];
  if (axis) { const s = voteSite(axis, false); return { x: s.x, z: s.z, extent: Math.max(s.w, s.d) * s.scale, color: METER_COLORS[axis], slot: axis }; }
  const shared = ROTATION_SHARED_LOTS[outcome.questionId];
  if (shared) { const lot = LOTS[shared.lot]; return { x: lot.x, z: lot.z, extent: lot.size / 2, color: METER_COLORS[shared.axis], slot: shared.axis }; }
  if (outcome.questionId !== 'Q02') return undefined;
  // A fallback keeps the guest's own (already shown) Q02 answer.
  const option = outcome.kind === 'swap' ? outcome.to : answers.find(a => a.questionId === 'Q02')?.optionId;
  const lot = option === undefined ? undefined : LOTS[Q02_LOTS[option]];
  return lot && { x: lot.x, z: lot.z, extent: lot.size / 2, color: Q02_COLOR, slot: 'environmentalPriority' };
}
/** The guest's four rotation answers as flights: the outcome question lands on its site (its colour for a swap, neutral for a fallback), the rest fade. */
export function rotationFlights(outcome: RotationOutcome, answers: readonly Answer[]): { questionId: string; site?: RotationSite; color: string }[] {
  const site = rotationSite(outcome, answers);
  const fading = answers.filter(a => !site || a.questionId !== outcome.questionId).map(a => ({ questionId: a.questionId, color: NEUTRAL }));
  return site ? [{ questionId: outcome.questionId, site, color: outcome.kind === 'swap' ? site.color : NEUTRAL }, ...fading] : fading;
}
/** Guest `ordinal`'s one rotation lantern, over the site of the question it swapped or fell back to; none for a question without a site. */
export function rotationLantern(ordinal: number, outcome: RotationOutcome, answers: readonly Answer[] = []): { slot: number; position: T.Vector3; color: T.Color; scale: number } | undefined {
  const site = rotationSite(outcome, answers);
  if (!site) return undefined;
  const swap = outcome.kind === 'swap', axisIndex = CITY_AXES.indexOf(site.slot);
  return { slot: ((ordinal - 1) % LANTERN_GUESTS) * CITY_AXES.length + axisIndex, position: spotAround(site.x, site.z, site.extent, ordinal * 4 + axisIndex),
    color: new T.Color(swap ? site.color : NEUTRAL), scale: swap ? 1 : .7 };
}
/** What `playRotation` and `setRotationLanterns` read from a rotation proposal. */
export type RotationJourney = { ordinal: number; answers: readonly Answer[]; rotation?: { outcome: RotationOutcome; visit?: string } };
/** Where the journey lands: a proposal that changed nothing visible but visits a site (plan 3.4) lands there in neutral, like a fallback. */
export const journeyOutcome = (rotation: { outcome: RotationOutcome; visit?: string }): RotationOutcome =>
  rotation.visit ? { kind: 'fallback', questionId: rotation.visit } : rotation.outcome;
const VOICES_BOARD = new T.Vector3(...HOLOGRAMS.panels.find(p => p.id === 'voices')!.at);

export class VoteJourney {
  private readonly points: T.Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  /** Rotation runs' one big orb (the outcome question), larger than the version4 and fading orbs. */
  private readonly bigPoints: T.Points;
  private readonly scans: T.InstancedMesh;
  private readonly lanterns: T.InstancedMesh;
  private readonly lanternMaterial: T.MeshBasicMaterial;
  private readonly flights: Flight[] = [];
  private readonly scanList: Scan[] = [];
  private readonly dummy = new T.Object3D();
  private readonly tint = new T.Color();

  private readonly camera: T.PerspectiveCamera;

  constructor(scene: T.Scene, camera: T.PerspectiveCamera) {
    this.camera = camera;
    const capacity = CITY_AXES.length * 3 * (TRAIL + 1);
    this.positions = new Float32Array(capacity * 3); this.colors = new Float32Array(capacity * 3);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(this.positions, 3).setUsage(T.DynamicDrawUsage));
    geometry.setAttribute('color', new T.BufferAttribute(this.colors, 3).setUsage(T.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    this.points = new T.Points(geometry, new T.PointsMaterial({ size: 38, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    this.points.frustumCulled = false; this.points.name = 'meter-pulse';
    // A thin horizontal band that rises through the site: the "scan" before the change materialises.
    this.scans = new T.InstancedMesh(new T.RingGeometry(.86, 1, 96, 1).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }), 12);
    this.scans.count = 0; this.scans.frustumCulled = false; this.scans.name = 'meter-pulse';
    this.lanternMaterial = new T.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    this.lanterns = new T.InstancedMesh(new T.SphereGeometry(1.1, 10, 6), this.lanternMaterial, LANTERNS);
    this.lanterns.frustumCulled = false; this.lanterns.name = 'meter-pulse';
    this.lanterns.setColorAt(0, this.tint.setRGB(0, 0, 0)); this.clearLanterns();
    const big = new T.BufferGeometry();
    big.setAttribute('position', new T.BufferAttribute(new Float32Array((TRAIL + 1) * 3), 3).setUsage(T.DynamicDrawUsage));
    big.setAttribute('color', new T.BufferAttribute(new Float32Array((TRAIL + 1) * 3), 3).setUsage(T.DynamicDrawUsage));
    big.setDrawRange(0, 0);
    this.bigPoints = new T.Points(big, new T.PointsMaterial({ size: 64, map: (this.points.material as T.PointsMaterial).map, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    this.bigPoints.frustumCulled = false; this.bigPoints.name = 'meter-pulse';
    scene.add(this.points, this.scans, this.lanterns, this.bigPoints);
  }

  private origin(): T.Vector3 {
    return new T.Vector3(.86, -.78, .5).unproject(this.camera).sub(this.camera.position).setLength(420).add(this.camera.position);
  }

  /** Launches guest `ordinal`'s four votes from the lower-right (the stations' side of the screen); the headline axis lands on its changed slots. */
  play(votes: Votes, ordinal: number, now: number, landing?: JourneyLanding): void {
    this.cancel();
    const origin = this.origin();
    CITY_AXES.forEach((axis, i) => {
      const energy = axis === 'environmentalPriority' && !!votes.energy;
      const land = landingFor(axis, energy, landing), site = new T.Vector3(land.x, 6, land.z);
      const apex = origin.clone().lerp(site, .55).setY(120 + i * 8);
      const curve = new T.CatmullRomCurve3([origin, origin.clone().lerp(apex, .5).setY(origin.y + 40), apex, site.clone().setY(70), site]);
      this.flights.push({ axis, vote: votes[axis], color: voteColor(axis, votes[axis], energy), curve, start: now + i * ORB_STAGGER, landed: false, ordinal, energy, scans: land.scans });
    });
  }

  /** Rotation runs: the outcome question's big orb lands on its site with the scan ring; the other answers fly as small neutral orbs
   * that fade out at their apex over the 住民の声 board (they join the crowd share). Same origin, stagger and arrival as `play`. */
  playRotation(proposal: RotationJourney, now: number): void {
    this.cancel();
    if (!proposal.rotation) return;
    const outcome = journeyOutcome(proposal.rotation);
    // No site: no orb lands, but the guest's lantern slots are still freed, as setRotationLanterns would.
    if (!rotationSite(outcome, proposal.answers)) this.addRotationLantern(proposal.ordinal, outcome, proposal.answers);
    const origin = this.origin();
    rotationFlights(outcome, proposal.answers).forEach((f, i) => {
      const color = new T.Color(f.color);
      if (f.site) {
        const scans = [{ x: f.site.x, z: f.site.z, r: f.site.extent * 1.15 }], site = new T.Vector3(f.site.x, 6, f.site.z), apex = origin.clone().lerp(site, .55).setY(120);
        const curve = new T.CatmullRomCurve3([origin, origin.clone().lerp(apex, .5).setY(origin.y + 40), apex, site.clone().setY(70), site]);
        this.flights.push({ axis: f.site.slot, vote: 0, color, curve, start: now + i * ORB_STAGGER, landed: false, ordinal: proposal.ordinal, energy: false, scans, mode: 'rotation', outcome, answers: proposal.answers });
        return;
      }
      const apex = origin.clone().lerp(VOICES_BOARD, .45 + .1 * i).setY(110 + 14 * i);
      const curve = new T.CatmullRomCurve3([origin, origin.clone().lerp(apex, .5).setY(origin.y + 40), apex]);
      this.flights.push({ axis: 'automation', vote: 0, color, curve, start: now + i * ORB_STAGGER, landed: false, ordinal: proposal.ordinal, energy: false, scans: [], mode: 'fade' });
    });
  }

  /** Drops flights in progress (snapshot, reset, scrub); landed lanterns stay. */
  cancel(): void {
    this.flights.length = 0; this.scanList.length = 0;
  }

  /** Immediate state (snapshot, reset, Undo, reduced motion): one lantern per vote of the latest guests, with no flight. */
  setLanterns(history: readonly { ordinal: number; votes: Votes }[]): void {
    this.cancel(); this.clearLanterns();
    for (const { ordinal, votes } of history.slice(-LANTERN_GUESTS)) for (const axis of CITY_AXES) this.addLantern(ordinal, axis, votes[axis], axis === 'environmentalPriority' && !!votes.energy);
  }

  /** Rotation runs' immediate state: one lantern per proposal, over the site of the question it swapped or fell back to. */
  setRotationLanterns(history: readonly RotationJourney[]): void {
    this.cancel(); this.clearLanterns();
    for (const p of history.slice(-LANTERN_GUESTS)) if (p.rotation) this.addRotationLantern(p.ordinal, journeyOutcome(p.rotation), p.answers);
  }

  private addRotationLantern(ordinal: number, outcome: RotationOutcome, answers: readonly Answer[]): void {
    // The guest's four slots are cleared first, so the 65th guest also drops the 1st guest's lantern, wherever it stood.
    const base = ((ordinal - 1) % LANTERN_GUESTS) * CITY_AXES.length;
    for (let i = 0; i < CITY_AXES.length; i++) this.lanterns.setMatrixAt(base + i, HIDDEN);
    this.lanterns.instanceMatrix.needsUpdate = true;
    const lantern = rotationLantern(ordinal, outcome, answers);
    if (!lantern) return;
    this.dummy.position.copy(lantern.position); this.dummy.scale.setScalar(lantern.scale); this.dummy.updateMatrix();
    this.lanterns.setMatrixAt(lantern.slot, this.dummy.matrix); this.lanterns.setColorAt(lantern.slot, lantern.color);
    this.lanterns.instanceMatrix.needsUpdate = true; this.lanterns.instanceColor!.needsUpdate = true;
  }

  private clearLanterns(): void {
    for (let i = 0; i < LANTERNS; i++) this.lanterns.setMatrixAt(i, HIDDEN);
    this.lanterns.instanceMatrix.needsUpdate = true;
  }

  private addLantern(ordinal: number, axis: CityAxis, vote: number, energy = false): void {
    // Guest #n always owns the same four slots, so the 65th guest replaces the 1st.
    const slot = ((ordinal - 1) % LANTERN_GUESTS) * CITY_AXES.length + CITY_AXES.indexOf(axis);
    this.dummy.position.copy(lanternSpot(ordinal, axis, energy)); this.dummy.scale.setScalar(vote === 0 && !energy ? .7 : 1); this.dummy.updateMatrix();
    this.lanterns.setMatrixAt(slot, this.dummy.matrix); this.lanterns.setColorAt(slot, voteColor(axis, vote, energy));
    this.lanterns.instanceMatrix.needsUpdate = true; this.lanterns.instanceColor!.needsUpdate = true;
  }

  update(now: number, darkness: number): void {
    // Lanterns are a quiet trace by day and the city's accumulated voices by night (HDR colour so bloom picks them up).
    this.lanternMaterial.color.setScalar(.35 + 2.4 * darkness); this.lanternMaterial.opacity = .55 + .45 * darkness;
    let n = 0, nBig = 0;
    const bigGeometry = this.bigPoints.geometry, bigPositions = bigGeometry.attributes.position.array as Float32Array, bigColors = bigGeometry.attributes.color.array as Float32Array;
    for (const f of this.flights) {
      const raw = (now - f.start) / FLIGHT_SECONDS;
      if (raw < 0) continue;
      if (raw >= 1) {
        if (!f.landed) {
          f.landed = true;
          for (const scan of f.scans) this.scanList.push({ ...scan, color: f.color, start: f.start + FLIGHT_SECONDS });
          // shortcut: the lantern stays in the focal halo (setLanterns can rebuild it without the change points), even when the orb landed on district slots.
          if (f.mode === 'rotation') this.addRotationLantern(f.ordinal, f.outcome!, f.answers!);
          else if (f.mode !== 'fade') this.addLantern(f.ordinal, f.axis, f.vote, f.energy);
        }
        continue;
      }
      const eased = raw * raw * (3 - 2 * raw);
      const big = f.mode === 'rotation', positions = big ? bigPositions : this.positions, colors = big ? bigColors : this.colors;
      // A fading orb holds full brightness for the first half of its climb, then dims to nothing as it reaches the apex (additive, so black is invisible).
      const dim = f.mode === 'fade' ? Math.min(1, 2 * (1 - raw)) ** 2 : 1;
      for (let k = 0; k <= TRAIL; k++) {
        const along = eased - k * .012;
        if (along < 0) break;
        // HDR head (bloom threshold is 1) with a saturated fading tail, so the orb still reads against the bright daytime city.
        const p = f.curve.getPoint(along), fade = (k ? .85 * (1 - k / (TRAIL + 1)) ** 1.5 : 2.2) * dim, at = (big ? nBig : n) * 3;
        positions.set([p.x, p.y, p.z], at);
        colors.set([f.color.r * fade, f.color.g * fade, f.color.b * fade], at);
        if (big) nBig++; else n++;
      }
    }
    const geometry = this.points.geometry;
    geometry.setDrawRange(0, n);
    geometry.attributes.position.needsUpdate = true; geometry.attributes.color.needsUpdate = true;
    bigGeometry.setDrawRange(0, nBig);
    bigGeometry.attributes.position.needsUpdate = true; bigGeometry.attributes.color.needsUpdate = true;
    for (let i = this.scanList.length - 1; i >= 0; i--) if (now - this.scanList[i].start > SCAN_SECONDS) this.scanList.splice(i, 1);
    this.scanList.slice(-12).forEach((s, i) => {
      const t = (now - s.start) / SCAN_SECONDS;
      this.dummy.position.set(s.x, 2 + 88 * t * t, s.z); this.dummy.scale.setScalar(s.r * (1 + .25 * t)); this.dummy.updateMatrix();
      this.scans.setMatrixAt(i, this.dummy.matrix);
      this.scans.setColorAt(i, this.tint.copy(s.color).multiplyScalar(3 * (1 - t) * Math.min(1, t * 8)));
    });
    this.scans.count = Math.min(this.scanList.length, 12);
    this.scans.instanceMatrix.needsUpdate = true; if (this.scans.instanceColor) this.scans.instanceColor.needsUpdate = true;
    if (!this.flights.some(f => !f.landed)) this.flights.length = 0;
  }
}
