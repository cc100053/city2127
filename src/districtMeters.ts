import * as T from 'three';
import { arc, bake, box, glass, leaf, leafyCrown, publicLight, stone, trail, trim } from './cityRig.ts';
import { changeSites, floatingDecks, seaward } from './layout.ts';
import { shoreRoomBays } from './waterRooms.ts';
import { automationActivity, routes } from './mobility.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';
import type { ExhibitionLayout } from './surveyView.ts';

const HIDDEN = 1e-4;

/** 0..1 level per slot, eased toward its target over the shared 3-second site transition. */
export class SlotLevels {
  readonly value: Float32Array;
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
    for (let i = 0; i < this.to.length; i++) {
      const next = Math.fround(target(i));
      if (next !== this.to[i]) changed = true;
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

/** Fixed pseudo-random rank per slot, so a share of slots switches in a scattered rather than end-to-end order. */
const rank = (i: number) => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };

/** Existing planted islands become screened water gardens or open, stepped waterfront commons. */
export class SharingDistrict {
  readonly root = new T.Group();
  readonly bays = [
    ...shoreRoomBays().map(b => ({ x: b.x, z: b.z, yaw: b.yaw, r: b.r + 1.5, y: 2.8, sx: 1, sz: 1 })),
    ...floatingDecks.map(([x, z, yaw]) => ({ x, z, yaw, r: 19, y: 2.3, sx: .8, sz: 1.12 })),
  ];
  private readonly levels = new SlotLevels(this.bays.length);
  private readonly screens: T.InstancedMesh;
  private readonly rims: T.InstancedMesh;
  private readonly skylights: T.InstancedMesh;
  private readonly steps: T.InstancedMesh[];
  private readonly dummy = new T.Object3D();
  private target = .5;

  constructor(parent: T.Object3D) {
    this.root.name = 'sharing-district';
    const privacy = trim.clone(); privacy.color.set('#d5b7aa'); privacy.emissive.set('#b98274'); privacy.emissiveIntensity = .45; privacy.side = T.DoubleSide;
    const commons = stone.clone(); commons.emissive.set('#eac0b2'); commons.emissiveIntensity = .3;
    const light = publicLight.clone(); light.emissive.set('#ffa9b1'); light.emissiveIntensity = 1.8;
    const instance = (geometry: T.BufferGeometry, material: T.Material, name: string) => {
      const mesh = new T.InstancedMesh(geometry, material, this.bays.length);
      mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.root.add(mesh); return mesh;
    };
    // The landward gap aligns with each existing footbridge; the garden and waterfalls remain inside.
    this.screens = instance(new T.SphereGeometry(1, 64, 24, Math.PI + .3, Math.PI * 2 - .6, .18, Math.PI / 2 - .18), privacy, 'sharing-private-gardens');
    const ring = (inner: number, outer: number, height: number, material: T.Material, name: string) => {
      const source = arc(new T.Group(), inner, outer, height, [0, 0, 0], material, .3, Math.PI * 2 - .6);
      return instance(source.geometry, material, name);
    };
    this.rims = ring(.99, 1.025, .025, light, 'sharing-room-rims');
    this.skylights = ring(.17, .19, .012, light, 'sharing-private-skylights');
    this.steps = Array.from({ length: 3 }, (_, i) => ring(1 + i * .08, 1.08 + i * .08, .045, commons, 'sharing-open-steps'));
    this.root.visible = false; parent.add(this.root); this.write();
  }

  setTarget(layout: Pick<ExhibitionLayout, 'sharedSeats'>, now: number, immediate: boolean): boolean {
    this.target = layout.sharedSeats / 8;
    // The first low / high proposals (2 / 7 seats) already read as distinct mature alternatives.
    const share = T.MathUtils.smoothstep(this.target, .25, .875);
    this.root.visible = true;
    const changed = this.levels.setTargets(i => rank(i + 401) < share ? 1 : 0, now, immediate);
    this.write(); return changed;
  }

  update(now: number): void { if (this.levels.update(now)) this.write(); }
  hide(): void { this.root.visible = false; }
  getDiagnostics() {
    const open = this.root.visible ? this.levels.visible() : 0;
    return { enabled: this.root.visible, targetSharing: this.target, rooms: this.bays.length,
      visibleOpenRooms: open, visiblePrivateRooms: this.root.visible ? this.levels.value.filter(v => 1 - v > HIDDEN).length : 0 };
  }

  private write(): void {
    this.bays.forEach((bay, i) => {
      const open = this.levels.value[i], height = 28 * (1 - open);
      // Keep hidden matrices invertible: flattened curved normals otherwise poison the G-buffer / SSR.
      const privateScale = Math.max(HIDDEN, 1 - open), publicScale = Math.max(HIDDEN, open);
      this.dummy.position.set(bay.x, bay.y, bay.z); this.dummy.rotation.set(0, bay.yaw, 0);
      this.dummy.scale.set(bay.r * bay.sx, Math.max(HIDDEN, height), bay.r * bay.sz); this.dummy.updateMatrix();
      this.screens.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.y = bay.r; this.dummy.updateMatrix(); this.rims.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.y = bay.y + height * Math.cos(.18);
      this.dummy.scale.set(bay.r * bay.sx * privateScale, bay.r * privateScale, bay.r * bay.sz * privateScale);
      this.dummy.updateMatrix(); this.skylights.setMatrixAt(i, this.dummy.matrix);
      this.steps.forEach((mesh, tier) => {
        this.dummy.position.y = bay.y + tier * .7;
        this.dummy.scale.set(bay.r * bay.sx * publicScale, bay.r * publicScale, bay.r * bay.sz * publicScale);
        this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
      });
    });
    for (const mesh of [this.screens, this.rims, this.skylights, ...this.steps]) mesh.instanceMatrix.needsUpdate = true;
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
  private readonly sails: T.InstancedMesh;
  private readonly slabs: T.InstancedMesh;
  private readonly crowns: T.InstancedMesh;
  private readonly shafts: T.InstancedMesh;
  private readonly rings: T.InstancedMesh;
  private readonly dummy = new T.Object3D();
  private readonly roofs: RoofGarden[] = [];
  private readonly facade = new SlotLevels(2);
  private roofSail = new SlotLevels(0);
  private roofCrown = new SlotLevels(0);
  private roofMeshes?: { sails: T.InstancedMesh; posts: T.InstancedMesh; crowns: T.InstancedMesh };
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
    this.slabs = new T.InstancedMesh(new T.BoxGeometry(SPAN, .5, WIDTH), leaf, n);
    this.crowns = new T.InstancedMesh(leafyCrown(1), this.crownMaterial, n * 3);
    const color = new T.Color();
    for (let i = 0; i < n * 3; i++) this.crowns.setColorAt(i, color.setHSL(.24 + (i % 5) * .009, .36 + (i % 3) * .05, .22 + (i % 7) * .015));
    const towerGeometry = new T.CylinderGeometry(.7, 1.5, TOWER, 12).translate(0, TOWER / 2, 0);
    this.shafts = new T.InstancedMesh(towerGeometry, trim, this.towerBays.length);
    this.rings = new T.InstancedMesh(new T.TorusGeometry(2.6, .35, 6, 24).rotateX(Math.PI / 2), trail, this.towerBays.length * 2);
    posts.name = 'environment-district-posts';
    this.sails.name = 'environment-district-sails';
    this.slabs.name = this.crowns.name = 'environment-district-canopy';
    this.shafts.name = this.rings.name = 'environment-district-cooling-towers';
    for (const mesh of [posts, this.sails, this.slabs, this.crowns, this.shafts]) mesh.castShadow = mesh.receiveShadow = true;
    this.root.add(posts, this.sails, this.slabs, this.crowns, this.shafts, this.rings);
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
    const posts = new T.InstancedMesh(this.postGeometry, trim, n * 4);
    const crowns = new T.InstancedMesh(this.crowns.geometry, this.crownMaterial, n);
    const color = new T.Color();
    for (let i = 0; i < n; i++) crowns.setColorAt(i, color.setHSL(.25 + (i % 5) * .01, .4, .2 + (i % 4) * .02));
    sails.name = posts.name = 'environment-district-roof-sails';
    crowns.name = 'environment-district-roof-forest';
    for (const mesh of [sails, posts, crowns]) mesh.castShadow = mesh.receiveShadow = true;
    this.root.add(sails, posts, crowns);
    this.roofMeshes = { sails, posts, crowns };
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
    this.write();
    return a || b || c || d;
  }

  /** Legacy v1 views and the standalone city do not show the v2 district layer. */
  hide(): void {
    this.root.visible = false;
    this.facade.setTargets(() => 0, 0, true);
    this.writeFacade();
  }

  update(now: number): void {
    this.now = now;
    if (this.facade.update(now)) this.writeFacade();
    const moved = [this.canopy.update(now), this.sail.update(now), this.tower.update(now), this.roofSail.update(now), this.roofCrown.update(now)].some(Boolean);
    if (moved) this.write();
  }

  getDiagnostics(): EnvironmentDistrictDiagnostics {
    return {
      slots: this.bays.length, targetCanopy: this.targetCanopy,
      visibleCanopies: this.canopy.visible(), visibleSails: this.sail.visible(), visibleCoolingTowers: this.tower.visible(),
      roofs: this.roofs.length, visibleRoofSails: this.roofSail.visible(), visibleRoofCrowns: this.roofCrown.visible(),
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
      this.place(bay, 0, ROOF + .4, 0, w); this.sails.setMatrixAt(i, this.dummy.matrix);
      this.place(bay, 0, ROOF + .2, 0, g); this.slabs.setMatrixAt(i, this.dummy.matrix);
      for (let k = 0; k < 3; k++) {
        this.place(bay, (k - 1) * 6, ROOF + .9, (k - 1) * .8, g);
        this.dummy.scale.set(4.6 * g, 1.5 * g, 6.4 * g);
        this.dummy.updateMatrix();
        this.crowns.setMatrixAt(i * 3 + k, this.dummy.matrix);
      }
    });
    this.towerBays.forEach((bayIndex, j) => {
      const bay = this.bays[bayIndex], level = this.tower.value[j];
      // Beside the bay, outside the posts, rising from the ground.
      this.place(bay, 0, 0, -(WIDTH / 2 + 4), level ? 1 : 0, level);
      this.shafts.setMatrixAt(j, this.dummy.matrix);
      for (let k = 0; k < 2; k++) {
        this.place(bay, 0, (TOWER - 5 + k * 3.5) * level, -(WIDTH / 2 + 4), level * (1 - k * .3));
        this.rings.setMatrixAt(j * 2 + k, this.dummy.matrix);
      }
    });
    const roof = this.roofMeshes;
    if (roof) this.roofs.forEach(([x, z, y, r], i) => {
      // A solar shade sail over each roof terrace (posts rise with it), or one large roof-forest crown at its heart.
      const w = this.roofSail.value[i], g = this.roofCrown.value[i], size = r * 2.4 / SPAN, bay = { x, y, z, yaw: Math.sin(x * .37 + z * .11) * 3 };
      this.place(bay, 0, 9 * w, 0, w * size, w);
      roof.sails.setMatrixAt(i, this.dummy.matrix);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], k) => {
        this.place(bay, a * r * 1.1 * w, 4.5 * w, b * r * .7 * w, w ? 1 : 0, w * 9 / ROOF);
        roof.posts.setMatrixAt(i * 4 + k, this.dummy.matrix);
      });
      this.place(bay, 0, 2 + 3.5 * g, 0, g);
      this.dummy.scale.set(r * .8 * g, r * .55 * g, r * .8 * g);
      this.dummy.updateMatrix();
      roof.crowns.setMatrixAt(i, this.dummy.matrix);
    });
    for (const mesh of [this.sails, this.slabs, this.crowns, this.shafts, this.rings, ...(roof ? Object.values(roof) : [])]) mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Q1: staffed waterfront pavilions give way to autonomous district circulation.
 * World-space batches stay independent of the hub's scaled lot and use the same 3 s clock. */
export class AutomationDistrict {
  readonly root = new T.Group();
  readonly bays: { x: number; y: number; z: number; yaw: number }[] = [];
  private readonly automation = new SlotLevels(1);
  private readonly staffed: SlotLevels;
  private readonly meshes: T.InstancedMesh[];
  private readonly dummy = new T.Object3D();
  private target = .5;

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
    this.meshes = bake(pavilion).map(source => {
      const mesh = new T.InstancedMesh(source.geometry, source.material, this.bays.length);
      mesh.name = 'automation-staffed-pavilions'; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.root.add(mesh); return mesh;
    });
    this.root.visible = false; parent.add(this.root); this.write();
  }

  get level(): number | undefined { return this.root.visible ? this.automation.value[0] : undefined; }

  setTarget(layout: Pick<ExhibitionLayout, 'automatedPorts'>, now: number, immediate: boolean): boolean {
    this.target = layout.automatedPorts / 6;
    const activity = automationActivity(this.target);
    this.root.visible = true;
    const a = this.automation.setTargets(() => this.target, now, immediate);
    const b = this.staffed.setTargets(i => rank(i + 203) >= activity.level ? 1 : 0, now, immediate);
    this.write(); return a || b;
  }

  update(now: number): void {
    this.automation.update(now);
    if (this.staffed.update(now)) this.write();
  }

  hide(): void { this.root.visible = false; }

  getDiagnostics() {
    const activity = automationActivity(this.level ?? .5);
    return { enabled: this.root.visible, targetAutomation: this.target, automation: this.level,
      pavilions: this.bays.length, visibleStaffedPavilions: this.root.visible ? this.staffed.visible() : 0,
      loopAircraft: this.root.visible ? Math.ceil(activity.aircraft) : undefined,
      guidewayPods: this.root.visible ? Math.ceil(activity.pods) : undefined, walkers: this.root.visible ? Math.ceil(activity.walkers) : undefined };
  }

  private write(): void {
    this.bays.forEach((bay, i) => {
      this.dummy.position.set(bay.x, bay.y, bay.z); this.dummy.rotation.set(0, bay.yaw, 0);
      this.dummy.scale.setScalar(this.staffed.value[i]); this.dummy.updateMatrix();
      for (const mesh of this.meshes) mesh.setMatrixAt(i, this.dummy.matrix);
    });
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
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
  [-293, 147], [-253, -33], [-233, 47], [-223, -23], [-173, -53], [-163, -133], [-103, 17], [-53, 147], [-33, 167], [-23, 107], [-3, -53], [27, 87], [77, 107], [87, 57], [97, -73], [107, -123], [107, 77], [117, 7], [137, -103], [207, 37], [217, -43], [217, 87], [237, -73], [237, 57], [247, -103], [247, 147],
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
  private readonly towerMeshes: T.InstancedMesh[];
  private readonly podMeshes: T.InstancedMesh[];
  readonly bridges: { i: number; j: number; y: number }[] = [];
  private readonly bridgeMeshes: T.InstancedMesh[];
  private readonly dummy = new T.Object3D();
  private target = .5;

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
    // Unit-height tower (1 m tall, scaled per site): podium, glass shaft with ivory floor bands, two lit sky lobbies, planted crown.
    const tower = new T.Group();
    const unit = (geometry: T.BufferGeometry, material: T.Material, y: number) => { const m = new T.Mesh(geometry, material); m.position.y = y; tower.add(m); };
    unit(new T.CylinderGeometry(17.5, 18.5, .05, 32), trim, .025);
    unit(new T.CylinderGeometry(13.5, 16, .94, 32), facade, .52);
    for (let y = .1; y < .94; y += .09) unit(new T.CylinderGeometry(16.1 - y * 2.6, 16.1 - y * 2.6, .005, 32), trim, y);
    // Two sky lobbies: wide ivory decks with a planted outer ring and a warm-lit glazed band (a street lifted into the air).
    for (const y of [.4, .72]) {
      unit(new T.CylinderGeometry(23, 23, .02, 40), trim, y);
      unit(new T.CylinderGeometry(22.6, 22.6, .006, 40), leaf, y + .013);
      unit(new T.CylinderGeometry(17.5, 17.5, .03, 40, 1, true), lobby, y + .03);
    }
    unit(new T.CylinderGeometry(16, 13, .035, 32), trim, .97);
    unit(new T.SphereGeometry(13, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .002, 1), leaf, .99);
    unit(new T.CylinderGeometry(.5, .9, .12, 8), trim, 1.05);
    this.towerMeshes = this.instances(bake(tower), this.towers.length, 'concentration-vertical-towers');
    // Sky bridges join neighbouring towers at both lobby levels of the lower one (a connected vertical street).
    this.towers.forEach((a, i) => this.towers.forEach((b, j) => {
      if (j > i && Math.hypot(a.x - b.x, a.z - b.z) < 80) for (const level of [.4, .72]) this.bridges.push({ i, j, y: level * Math.min(a.h, b.h) });
    }));
    const bridge = new T.Group();
    box(bridge, [1, 4.5, 10], [0, 0, 0], trim);
    box(bridge, [1, 2, 10.4], [0, .8, 0], lobby);
    this.bridgeMeshes = this.instances(bake(bridge), this.bridges.length, 'concentration-sky-bridges');
    // Pod: a ring of warm-lit glass under a floating ivory disc with a planted top, on a slim stem.
    const pod = new T.Group();
    box(pod, [2.4, 4, 2.4], [0, 2, 0], trim);
    const drum = new T.Mesh(new T.CylinderGeometry(7, 7, 4.2, 28), lobby); drum.position.y = 6; pod.add(drum);
    const disc = new T.Mesh(new T.CylinderGeometry(10.5, 9, 1.4, 32), trim); disc.position.y = 8.8; pod.add(disc);
    const bed = new T.Mesh(new T.CylinderGeometry(9.2, 9.2, .4, 28), leaf); bed.position.y = 9.6; pod.add(bed);
    this.podMeshes = this.instances(bake(pod), this.pods.length, 'concentration-distributed-pods');
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
    this.write(); return a || b;
  }

  update(now: number): void {
    const a = this.towerLevels.update(now), b = this.podLevels.update(now);
    if (a || b) this.write();
  }

  hide(): void { this.root.visible = false; }

  getDiagnostics() {
    return { enabled: this.root.visible, targetConcentration: this.target, towers: this.towers.length, pods: this.pods.length,
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
      for (const mesh of this.towerMeshes) mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.pods.forEach((site, i) => {
      this.dummy.position.set(site.x, 0, site.z); this.dummy.rotation.set(0, site.yaw, 0);
      this.dummy.scale.setScalar(Math.max(HIDDEN, this.podLevels.value[i])); this.dummy.updateMatrix();
      for (const mesh of this.podMeshes) mesh.setMatrixAt(i, this.dummy.matrix);
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
    for (const mesh of [...this.towerMeshes, ...this.podMeshes, ...this.bridgeMeshes]) mesh.instanceMatrix.needsUpdate = true;
  }
}
