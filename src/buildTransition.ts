import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { quadFleet } from './automationKit.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';

/** One changed slot: footprint centre at ground height `y`, radius `r`, and the height (metres above `y`) its mass moves `from` and `to`.
 * `to > from` builds up, `to < from` takes down; equal heights (only an accessory changed) get the rig and one sweep over the standing mass. */
export type BuildItem = { x: number; y: number; z: number; r: number; from: number; to: number };

/** Seconds inside the 3 s site transition: the rig stands by `BUILD_RIG`, the mass moves from `BUILD_MASS` until `BUILD_BEAT`, the end beat fills the rest. */
export const BUILD_RIG = .45, BUILD_MASS = .35, BUILD_BEAT = 2.45;
const clamp = (v: number) => Math.min(1, Math.max(0, v)), smooth = (v: number) => { const c = clamp(v); return c * c * (3 - 2 * c); };

/** Mass progress at `raw` (0..1 of the transition): the `SlotLevels` ease of slots that play the choreography, so the building follows the build line. */
export const buildProgress = (raw: number) => smooth((raw * SITE_TRANSITION_SECONDS - BUILD_MASS) / (BUILD_BEAT - BUILD_MASS));

/** Choreography state `t` seconds after the change starts; `null` outside the transition (not started, or finished: nothing is drawn). */
export const buildBeat = (t: number) => t < 0 || t >= SITE_TRANSITION_SECONDS ? null
  : { rig: smooth(t / BUILD_RIG), progress: buildProgress(t / SITE_TRANSITION_SECONDS), beat: clamp((t - BUILD_BEAT) / (SITE_TRANSITION_SECONDS - BUILD_BEAT)) };

const WHITE_HOT = new T.Color(2.6, 2.4, 2.1);
const LEVELS = 4, RINGS = LEVELS + 2, DRONES = 3, HIDDEN = 1e-4;

/** Shared "build" moment for changed slots of any shape: a Meter-colour scaffold cage stands around the slot, a bright build line with three
 * assembly drones rides the mass up (or down), and the end beat lifts the cage off a finished slot with a crown ring, or drops it to the ground
 * with a closing ring. Unlit and instanced (posts, rings, plus the shared drone kit): five draws while playing, none idle.
 * Only live changes `play`; snapshots, resets, Undo, reconnect and reduced motion `clear`. */
export class BuildChoreography {
  private readonly posts: T.InstancedMesh;
  private readonly rings: T.InstancedMesh;
  private readonly drones: ReturnType<typeof quadFleet>;
  private readonly items: (BuildItem & { start: number })[] = [];
  private readonly dummy = new T.Object3D();
  private readonly tint = new T.Color();
  private readonly capacity: number;
  private drawn = 0;

  constructor(parent: T.Object3D, color: T.ColorRepresentation, capacity: number) {
    this.capacity = capacity;
    // Transparent basic material: main.ts keeps such overlays out of GTAO's normal prepass.
    const material = new T.MeshBasicMaterial({ color, transparent: true, toneMapped: false });
    const corners = Array.from({ length: 6 }, (_, k) => k * Math.PI / 3);
    this.posts = new T.InstancedMesh(mergeGeometries(corners.map(a => new T.BoxGeometry(.09, 1, .09).rotateY(-a).translate(Math.cos(a), .5, Math.sin(a))))!, material, capacity);
    this.rings = new T.InstancedMesh(new T.TorusGeometry(1, .05, 4, 6).rotateX(Math.PI / 2), material, capacity * RINGS);
    for (const mesh of [this.posts, this.rings]) {
      mesh.name = 'build-transition'; mesh.frustumCulled = false; mesh.count = 0; mesh.visible = false; mesh.renderOrder = 2;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.setColorAt(0, this.tint.setRGB(1, 1, 1)); parent.add(mesh);
    }
    this.drones = quadFleet(parent, capacity * DRONES, 'build-drones');
    this.drones.show(false);
  }

  play(items: readonly BuildItem[], now: number): void {
    // ponytail: a slot changed again mid-build restarts from its new heights; the oldest builds drop past capacity (every slot of the district).
    for (const item of items) {
      const same = this.items.findIndex(o => o.x === item.x && o.z === item.z);
      if (same >= 0) this.items.splice(same, 1);
      this.items.push({ ...item, start: now });
    }
    if (this.items.length > this.capacity) this.items.splice(0, this.items.length - this.capacity);
  }

  clear(): void { this.items.length = 0; this.update(0); }

  /** Builds currently drawing (started and not finished). */
  active(now: number): number { return this.items.filter(o => buildBeat(now - o.start)).length; }

  update(now: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) if (now - this.items[i].start >= SITE_TRANSITION_SECONDS) this.items.splice(i, 1);
    const live = this.items.filter(o => buildBeat(now - o.start));
    if (!live.length && !this.drawn) return;
    const ring = (index: number, o: BuildItem, y: number, r: number, thick: number, glow: number, white = 0) => {
      this.dummy.position.set(o.x, o.y + y, o.z); this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(r, Math.max(HIDDEN, thick * o.r), r); this.dummy.updateMatrix();
      this.rings.setMatrixAt(index, this.dummy.matrix);
      this.rings.setColorAt(index, this.tint.setRGB(glow, glow, glow).lerp(WHITE_HOT, white));
    };
    live.forEach((o, i) => {
      const t = now - o.start, { rig, progress, beat } = buildBeat(t)!;
      const up = o.to >= o.from, top = Math.max(o.from, o.to) + 3, from = o.to === o.from ? 0 : o.from;
      const line = from + (o.to - from) * progress, out = smooth(beat), flash = 1 + 2.2 * Math.sin(Math.PI * beat);
      // Cage: unfolds from the ground, then lifts off a finished slot while thinning, or drops to the ground of a cleared one.
      const cage = top * rig * (up ? 1 : 1 - out), lift = up ? out * top * .35 : 0, slim = up ? 1 - out : 1 - out * out;
      this.dummy.position.set(o.x, o.y + lift, o.z); this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(o.r * slim, Math.max(HIDDEN, cage), o.r * slim); this.dummy.updateMatrix();
      this.posts.setMatrixAt(i, this.dummy.matrix); this.posts.setColorAt(i, this.tint.setRGB(flash, flash, flash));
      // Level rings light up once the build line has passed them (built floors), and dim again above a descending line.
      for (let k = 0; k < LEVELS; k++) {
        const y = cage * (k + 1) / LEVELS;
        ring(i * RINGS + k, o, y + lift, o.r * slim, .5 * slim, (y <= line + .5 ? 1 : .45) * flash);
      }
      // Build line: white-hot, wider than the cage, riding the top of the mass.
      ring(i * RINGS + LEVELS, o, line, o.r * 1.18, beat > 0 ? 0 : 1.1 * rig, 2.2, .45);
      // End beat: a crown ring opens over the finished top, or a ground ring closes on the cleared slot.
      ring(i * RINGS + LEVELS + 1, o, up ? o.to : .6, o.r * (up ? 1 + 1.3 * out : 1.9 - 1.6 * out), beat > 0 ? 1.2 * (1 - out) : 0, 2.6, .6);
      // Drones arrive from above with the rig, circle just over the build line and leave upward on the beat.
      for (let k = 0; k < DRONES; k++) {
        const a = k * Math.PI * 2 / DRONES + t * 1.7 + i;
        this.dummy.position.set(o.x + Math.cos(a) * o.r * 1.35, o.y + line + 5 + (1 - rig) * 70 + beat * beat * 110, o.z + Math.sin(a) * o.r * 1.35);
        this.dummy.rotation.set(0, -a, 0); this.dummy.scale.setScalar(T.MathUtils.clamp(o.r / 11, 1.2, 2.4));
        this.drones.set(i * DRONES + k, this.dummy);
      }
    });
    // Drone batches have a fixed count: park the ones the previous frame drew.
    this.dummy.scale.setScalar(HIDDEN);
    for (let i = live.length * DRONES; i < this.drawn * DRONES; i++) this.drones.set(i, this.dummy);
    this.drawn = live.length;
    this.posts.count = live.length; this.rings.count = live.length * RINGS;
    for (const mesh of [this.posts, this.rings]) {
      mesh.visible = live.length > 0; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.drones.flush(); this.drones.show(live.length > 0);
  }
}
