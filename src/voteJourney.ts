// DEV prototype of "one vote's journey": a resident's four votes fly as light from the station side of the screen to the four focal
// sites, scan rings rise where they land, and each vote stays as a small lantern that brightens at night. Additive and unlit.
import * as T from 'three';
import { CITY_AXES, type CityAxis, type ExhibitionVotes } from '../survey/src/shared/citySurveyState.ts';
import { METER_COLORS } from './districtMeters.ts';
import { changeSites } from './layout.ts';

const SOCKET: Record<CityAxis, keyof typeof changeSites> = { automation: 'nw', publicSharing: 'sw', environmentalPriority: 'ne', urbanConcentration: 'se' };
const NEUTRAL = '#fff1d6';
export const FLIGHT_SECONDS = 2.2, ORB_STAGGER = .14, SCAN_SECONDS = 1.4;
/** The vote has landed at every site once the last staggered orb arrives. */
export const ARRIVAL_SECONDS = FLIGHT_SECONDS + ORB_STAGGER * (CITY_AXES.length - 1);
const TRAIL = 22, LANTERNS = 640;

const hash = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const voteColor = (axis: CityAxis, vote: number) => new T.Color(vote === 0 ? NEUTRAL : METER_COLORS[axis]);

/** Fixed lantern spot for guest `ordinal` on `axis`: a loose halo floating above the focal site's roofs (clear of trees and podiums), so a rebuild lands in the same place. */
export function lanternSpot(ordinal: number, axis: CityAxis): T.Vector3 {
  const s = changeSites[SOCKET[axis]], i = ordinal * 4 + CITY_AXES.indexOf(axis);
  const angle = hash(i) * Math.PI * 2, radius = Math.max(s.w, s.d) * s.scale * (.4 + .7 * Math.sqrt(hash(i + .5)));
  return new T.Vector3(s.x + Math.cos(angle) * radius, 42 + 22 * hash(i + .25), s.z + Math.sin(angle) * radius);
}

function glowTexture(): T.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#fff'); r.addColorStop(.25, '#ffffffcc'); r.addColorStop(1, '#fff0');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

type Flight = { axis: CityAxis; vote: number; color: T.Color; curve: T.CatmullRomCurve3; start: number; landed: boolean; ordinal: number };
type Scan = { x: number; z: number; r: number; color: T.Color; start: number };

export class VoteJourney {
  private readonly points: T.Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly scans: T.InstancedMesh;
  private readonly lanterns: T.InstancedMesh;
  private readonly lanternMaterial: T.MeshBasicMaterial;
  private readonly flights: Flight[] = [];
  private readonly scanList: Scan[] = [];
  private readonly tag: HTMLElement;
  private readonly dummy = new T.Object3D();
  private readonly tint = new T.Color();
  private lanternCount = 0;
  private tagUntil = -1;

  constructor(scene: T.Scene, private readonly camera: T.PerspectiveCamera) {
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
    this.lanterns.count = 0; this.lanterns.frustumCulled = false; this.lanterns.name = 'meter-pulse';
    scene.add(this.points, this.scans, this.lanterns);
    this.tag = document.createElement('div'); this.tag.className = 'journey-tag'; this.tag.hidden = true;
    document.body.appendChild(this.tag);
  }

  /** Launches guest `ordinal`'s four votes from the lower-right (the stations' side of the screen). */
  play(votes: ExhibitionVotes, ordinal: number, now: number): void {
    this.cancel();
    const origin = new T.Vector3(.86, -.78, .5).unproject(this.camera).sub(this.camera.position).setLength(420).add(this.camera.position);
    CITY_AXES.forEach((axis, i) => {
      const s = changeSites[SOCKET[axis]], site = new T.Vector3(s.x, 6, s.z);
      const apex = origin.clone().lerp(site, .55).setY(120 + i * 8);
      const curve = new T.CatmullRomCurve3([origin, origin.clone().lerp(apex, .5).setY(origin.y + 40), apex, site.clone().setY(70), site]);
      this.flights.push({ axis, vote: votes[axis], color: voteColor(axis, votes[axis]), curve, start: now + i * ORB_STAGGER, landed: false, ordinal });
    });
    this.tag.innerHTML = `<span>送信</span>暮らしの声 #${ordinal}`;
    this.tag.hidden = false; this.tag.classList.remove('journey-tag-out'); this.tagUntil = now + ARRIVAL_SECONDS + 1.2;
  }

  /** Drops flights in progress (scrub, reset); landed lanterns stay. */
  cancel(): void {
    this.flights.length = 0; this.scanList.length = 0; this.tag.hidden = true;
  }

  /** Immediate state: one lantern per vote of guests 1..n, with no flight. */
  setLanterns(history: ExhibitionVotes[]): void {
    this.cancel(); this.lanternCount = 0;
    history.forEach((votes, i) => { for (const axis of CITY_AXES) this.addLantern(i + 1, axis, votes[axis]); });
  }

  private addLantern(ordinal: number, axis: CityAxis, vote: number): void {
    const slot = this.lanternCount++ % LANTERNS;
    this.dummy.position.copy(lanternSpot(ordinal, axis)); this.dummy.scale.setScalar(vote === 0 ? .7 : 1); this.dummy.updateMatrix();
    this.lanterns.setMatrixAt(slot, this.dummy.matrix); this.lanterns.setColorAt(slot, voteColor(axis, vote));
    this.lanterns.count = Math.min(this.lanternCount, LANTERNS);
    this.lanterns.instanceMatrix.needsUpdate = true; this.lanterns.instanceColor!.needsUpdate = true;
  }

  update(now: number, darkness: number): void {
    // Lanterns are a quiet trace by day and the city's accumulated voices by night (HDR colour so bloom picks them up).
    this.lanternMaterial.color.setScalar(.35 + 2.4 * darkness); this.lanternMaterial.opacity = .55 + .45 * darkness;
    let n = 0;
    for (const f of this.flights) {
      const raw = (now - f.start) / FLIGHT_SECONDS;
      if (raw < 0) continue;
      if (raw >= 1) {
        if (!f.landed) {
          f.landed = true;
          const s = changeSites[SOCKET[f.axis]];
          this.scanList.push({ x: s.x, z: s.z, r: Math.max(s.w, s.d) * s.scale * 1.15, color: f.color, start: f.start + FLIGHT_SECONDS });
          this.addLantern(f.ordinal, f.axis, f.vote);
        }
        continue;
      }
      const eased = raw * raw * (3 - 2 * raw);
      for (let k = 0; k <= TRAIL; k++) {
        const along = eased - k * .012;
        if (along < 0) break;
        // HDR head (bloom threshold is 1) with a saturated fading tail, so the orb still reads against the bright daytime city.
        const p = f.curve.getPoint(along), fade = k ? .85 * (1 - k / (TRAIL + 1)) ** 1.5 : 2.2;
        this.positions.set([p.x, p.y, p.z], n * 3);
        this.colors.set([f.color.r * fade, f.color.g * fade, f.color.b * fade], n * 3);
        n++;
      }
    }
    const geometry = this.points.geometry;
    geometry.setDrawRange(0, n);
    geometry.attributes.position.needsUpdate = true; geometry.attributes.color.needsUpdate = true;
    for (let i = this.scanList.length - 1; i >= 0; i--) if (now - this.scanList[i].start > SCAN_SECONDS) this.scanList.splice(i, 1);
    this.scanList.slice(-12).forEach((s, i) => {
      const t = (now - s.start) / SCAN_SECONDS;
      this.dummy.position.set(s.x, 2 + 88 * t * t, s.z); this.dummy.scale.setScalar(s.r * (1 + .25 * t)); this.dummy.updateMatrix();
      this.scans.setMatrixAt(i, this.dummy.matrix);
      this.scans.setColorAt(i, this.tint.copy(s.color).multiplyScalar(3 * (1 - t) * Math.min(1, t * 8)));
    });
    this.scans.count = Math.min(this.scanList.length, 12);
    this.scans.instanceMatrix.needsUpdate = true; if (this.scans.instanceColor) this.scans.instanceColor.needsUpdate = true;
    if (!this.tag.hidden && now > this.tagUntil - .6) this.tag.classList.add('journey-tag-out');
    if (!this.tag.hidden && now > this.tagUntil) this.tag.hidden = true;
    if (!this.flights.some(f => !f.landed)) this.flights.length = 0;
  }
}
