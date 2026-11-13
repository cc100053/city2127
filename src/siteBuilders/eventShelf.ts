import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { nightLit } from '../cityRig.ts';
import { remapCityMaterials } from '../siteAssets/assetLoader.ts';
import type { CityMaterialRole } from '../siteAssets/assetCatalog.ts';
import { prefersReducedMotion, SITE_TRANSITION_SECONDS } from './siteRuntime.ts';

/** SW mixed flagship, the event module shelf (spec: artifacts/sw-event-shelf/spec.md, R2). All geometry here is in METRES (the GLB's units); the host scales the group by UNITS_PER_METRE. */
export const UNITS_PER_METRE = .25;
export const SHELF = { cell: 12, floor: 4, cols: 3, rows: 2, levels: 10, module: 8.6, col: 1.3 } as const;
export const SHELF_BASE_SEATS = 29; // module count = SHELF_BASE_SEATS + sharedSeats, so 4 seats (the default) = 33 of 60 slots
const HIDDEN = 1e-3;
const LEVEL0 = .5; // module underside on the ground tracks (rail top)
const MODULE_H = 3.2, HALL_H = 7.4;
const FRONT_RAIL_Z = -(SHELF.rows * SHELF.cell / 2 + SHELF.col / 2 + .3 + .75 + SHELF.module / 2); // module centre while it hangs on the front guide rails
const TRACK_Z = -17.6; // module centre on the ground tracks, in front of the plinth edge
const TRACK_X = 12, HANG_X = 12, HANG_Y = 22; // showpiece column: arriving module on the right track, hung module above it
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const hash = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;

export type ModuleVariant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'H';
/** Static showpiece poses, so the settled picture always shows the mechanism: arriving on the ground tracks, half slid into a cell, hung from the roof gantry on the facade. */
export type ShelfPose = 'track' | 'slide' | 'hang';
export interface ShelfSlot {
  readonly id: string; readonly c: number; readonly r: number; readonly k: number; readonly variant: ModuleVariant; readonly pose?: ShelfPose;
  /** Rank in the load order: the module with the highest rank below the current count is the last one added. */
  readonly order: number;
  readonly x: number; readonly y: number; readonly z: number;
}

// Front row `c0 c1 c2` | back row; '.' none, '^' occupied by the hall below, H = double-height hall (k and k+1). Level 9 stays the empty transfer deck; the showpiece cells below stay empty.
const PATTERN: readonly (readonly [string, string])[] = [
  ['A..', 'D..'], ['BCA', 'D.B'], ['EAC', 'FBD'], ['D.F', 'A.E'], ['C.B', '.B.'],
  ['H..', 'ACF'], ['^..', 'ADC'], ['...', '.F.'], ['A.D', '...'], ['...', '...'],
];
// Showpieces (cell they belong to): arriving on the right ground track, half slid out of a mid-level front cell, hung on the right facade rails.
const SHOW: readonly [number, number, number, ModuleVariant, ShelfPose][] = [[0, 2, 0, 'C', 'track'], [3, 1, 0, 'A', 'slide'], [5, 2, 0, 'B', 'hang']];
// Extra seats beyond the default: front row only (the headline hoist always runs on the front rails), never in the showpiece column.
const EXTRA: readonly [number, number, number, ModuleVariant][] = [[4, 1, 0, 'F'], [6, 1, 0, 'E'], [7, 0, 0, 'C'], [8, 1, 0, 'B']];
const cellX = (c: number) => (c - 1) * SHELF.cell;
const cellZ = (r: number) => (r - .5) * SHELF.cell;
const levelY = (k: number) => k === 0 ? LEVEL0 : k * SHELF.floor;
const moduleHeight = (v: ModuleVariant) => v === 'H' ? HALL_H : MODULE_H;

function makeSlots(): readonly ShelfSlot[] {
  type Base = Omit<ShelfSlot, 'order'>;
  const at = (k: number, c: number, r: number, variant: ModuleVariant, pose?: ShelfPose): Base => ({ id: `k${k}c${c}r${r}`, c, r, k, variant, pose, x: cellX(c), y: levelY(k), z: cellZ(r) });
  const show = SHOW.map(([k, c, r, v, pose]) => at(k, c, r, v, pose));
  const defaults: Base[] = [];
  PATTERN.forEach(([front, back], k) => [front, back].forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.' && ch !== '^') defaults.push(at(k, c, r, ch as ModuleVariant)); })));
  // Load order: showpieces first, then rear cells and the showpiece column, then the visible mid-height front modules last, so the headline hoist (the last one added) is always a front module on the left or centre rails.
  const rank = (s: Base) => hash(s.k * 31 + s.c * 7 + s.r * 3) + (s.r === 0 && s.c !== 2 && s.variant !== 'H' ? 2 + (s.k >= 3 && s.k <= 6 ? 1 : 0) : 0);
  defaults.sort((a, b) => rank(a) - rank(b));
  return [...show, ...defaults, ...EXTRA.map(([k, c, r, v]) => at(k, c, r, v))].map((s, order) => ({ ...s, order }));
}
export const SHELF_SLOTS: readonly ShelfSlot[] = makeSlots();
export const shelfCount = (sharedSeats: number) => Math.max(0, Math.min(SHELF_SLOTS.length, SHELF_BASE_SEATS + sharedSeats));

// ---- materials (GLB role -> runtime) ----
const std = (color: string, emissive?: string, intensity = 0, roughness = .6) => new T.MeshStandardMaterial({ color, emissive: emissive ?? '#000000', emissiveIntensity: intensity, roughness });
const shelfMaterial = {
  frame: std('#696a6c', undefined, 0, .8), joint: std('#8b8e92', undefined, 0, .6), rail: std('#d5dade', undefined, 0, .35), teal: std('#25a3a0'), white: std('#f1f2ef'), grey: std('#c9cdd0'), oak: std('#c8935a'),
  paving: std('#bdb9b0'), dark: std('#221d1a'), slate: std('#3d3f42'), green: std('#3f7a2e'),
  cyan: new T.MeshBasicMaterial({ color: new T.Color('#38c8ff').multiplyScalar(1.6), toneMapped: false }),
  glow: nightLit(std('#ffd29a', '#ffb060', .6), 2.4, '#ff9a3c'), glow_y: nightLit(std('#ffe27a', '#ffd23a', 1.2), 2.2, '#ffd45a'),
  glow_w: nightLit(std('#e4f1ff', '#cfe6ff', 1.1), 2.0, '#d8ecff'), glow_c: nightLit(std('#97e8ee', '#5fd8e6', 1.1), 2.0, '#7fe8f0'),
} satisfies Record<string, T.Material>;
export const SHELF_ROLES = Object.keys(shelfMaterial).map(k => `sw_${k}`) as CityMaterialRole[];
const roleMap = Object.fromEntries(Object.entries(shelfMaterial).map(([k, m]) => [`sw_${k}`, m])) as Partial<Record<CityMaterialRole, T.Material>>;

type VariantMesh = { geometry: T.BufferGeometry; material: T.Material };

/** The 60-slot frame, its instanced modules, the roof gantry (bridge, two trolleys) and the headline hoist. */
export function createEventShelf(root: T.Group) {
  const group = new T.Group(); // metres; the host scales it
  group.name = 'event-shelf';
  group.scale.setScalar(UNITS_PER_METRE);
  root.add(group);

  // --- frame (fallback: merged boxes; the GLB replaces it) ---
  const frame = new T.Group();
  frame.name = 'event-shelf-frame';
  group.add(frame);
  const fallbackFrame = (() => {
    const geos: T.BufferGeometry[] = [], W = SHELF.cols * SHELF.cell, D = SHELF.rows * SHELF.cell, H = SHELF.levels * SHELF.floor;
    const add = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => geos.push(new T.BoxGeometry(sx, sy, sz).translate(x, y, z));
    for (let i = 0; i <= SHELF.cols; i++) for (let j = 0; j <= SHELF.rows; j++) add(SHELF.col, H, SHELF.col, -W / 2 + i * SHELF.cell, H / 2, -D / 2 + j * SHELF.cell);
    for (let k = 1; k <= SHELF.levels; k++) {
      for (let j = 0; j <= SHELF.rows; j++) add(W + SHELF.col, .8, .9, 0, k * SHELF.floor - .4, -D / 2 + j * SHELF.cell);
      for (let i = 0; i <= SHELF.cols; i++) add(.9, .8, D + SHELF.col, -W / 2 + i * SHELF.cell, k * SHELF.floor - .4, 0);
    }
    const mesh = new T.Mesh(mergeGeometries(geos.map(g => g.toNonIndexed())), shelfMaterial.frame);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = 'event-shelf-fallback-frame';
    geos.forEach(g => g.dispose());
    frame.add(mesh);
    return mesh;
  })();

  // --- modules: one InstancedMesh per (variant, material) ---
  const moduleGroup = new T.Group();
  moduleGroup.name = 'event-shelf-modules';
  group.add(moduleGroup);
  const hallSlots = SHELF_SLOTS.filter(s => s.variant === 'H');
  const byVariant = new Map<ModuleVariant, ShelfSlot[]>();
  for (const s of SHELF_SLOTS) byVariant.set(s.variant, [...byVariant.get(s.variant) ?? [], s]);
  let variantMeshes: Map<ModuleVariant, T.InstancedMesh[]> = new Map();
  const buildInstances = (parts: Map<ModuleVariant, VariantMesh[]>) => {
    for (const m of variantMeshes.values()) for (const mesh of m) { mesh.removeFromParent(); mesh.dispose(); }
    variantMeshes = new Map();
    for (const [v, list] of byVariant) {
      const meshes = (parts.get(v) ?? []).map(({ geometry, material }) => {
        const mesh = new T.InstancedMesh(geometry, material, list.length);
        mesh.name = `event-shelf-module-${v}`;
        mesh.frustumCulled = false; // instances sit far from the one-module bounding sphere
        mesh.castShadow = false; // like the pods: a shell over the residents would darken them
        moduleGroup.add(mesh);
        return mesh;
      });
      variantMeshes.set(v, meshes);
    }
    placeAll();
  };
  const fallbackModule = () => {
    const parts = new Map<ModuleVariant, VariantMesh[]>();
    for (const v of byVariant.keys()) {
      const h = moduleHeight(v);
      parts.set(v, [{ geometry: new T.BoxGeometry(SHELF.module, h, SHELF.module).translate(0, h / 2, 0), material: v === 'B' || v === 'E' ? shelfMaterial.teal : shelfMaterial.white }]);
    }
    return parts;
  };

  // --- state: presence per slot (0..1), band progress, headline hoist ---
  const slotIndex = new Map<string, number>(); // index inside its variant's InstancedMesh
  for (const list of byVariant.values()) list.forEach((s, i) => slotIndex.set(s.id, i));
  const hangIdx = SHELF_SLOTS.findIndex(s => s.pose === 'hang');
  const presence = new Float32Array(SHELF_SLOTS.length); // authoritative 0 or 1 once settled
  let count = shelfCount(4);
  let bandLevel = 1;
  let hoist: { slot: number; start: number; dir: 1 | -1 } | undefined;
  for (let i = 0; i < count; i++) presence[i] = 1;
  const matrix = new T.Matrix4(), scale = new T.Vector3(), quat = new T.Quaternion(), pos = new T.Vector3();
  const zero = new T.Matrix4().makeScale(0, 0, 0);
  const hangY = (now: number) => HANG_Y + (prefersReducedMotion() ? 0 : Math.sin(now * Math.PI * 2 / 20) * 1.5);
  /** Settled position of a slot: its cell, or its showpiece pose. */
  const settled = (s: ShelfSlot, now: number) => s.pose === 'track' ? { x: TRACK_X, y: LEVEL0, z: TRACK_Z } : s.pose === 'hang' ? { x: HANG_X, y: hangY(now), z: FRONT_RAIL_Z }
    : s.pose === 'slide' ? { x: s.x, y: s.y, z: s.z - 3.5 } : { x: s.x, y: s.y, z: s.z };
  /** Headline path (metres) as a function of progress u in 0..1 (0 = parked on the left ground track, 1 = latched in its front cell): across and up the front rails, then slid in. */
  const hoistPath = (s: ShelfSlot, u: number): { x: number; y: number; z: number } => {
    const t = (a: number, b: number) => smooth(clamp01((u - a) / (b - a)));
    const x0 = -TRACK_X, top = levelY(s.k);
    const z = u < .45 ? TRACK_Z + (FRONT_RAIL_Z - TRACK_Z) * t(0, .2) : FRONT_RAIL_Z + (s.z - FRONT_RAIL_Z) * t(.62, .87);
    return { x: x0 + (s.x - x0) * t(0, .2), y: LEVEL0 + (top - LEVEL0) * t(.2, .6), z };
  };
  const hoistProgress = (now: number) => hoist ? clamp01((now - hoist.start) / SITE_TRANSITION_SECONDS) : 1;
  let clock = 0;
  const placeOne = (i: number) => {
    const s = SHELF_SLOTS[i], idx = slotIndex.get(s.id)!;
    let p = presence[i] * bandLevel, { x, y, z } = settled(s, clock), visible = p > HIDDEN;
    if (hoist && hoist.slot === i) {
      const raw = hoistProgress(clock);
      const u = hoist.dir === 1 ? raw : 1 - raw;
      p = bandLevel;
      ({ x, y, z } = hoistPath(s, u));
      visible = u > HIDDEN || hoist.dir === -1;
    } else if (p > HIDDEN && p < 1 - HIDDEN) {
      z -= (1 - smooth(p)) * SHELF.cell; // everyone else slides in from the front, quietly
    }
    for (const mesh of variantMeshes.get(s.variant) ?? []) mesh.setMatrixAt(idx, visible ? matrix.compose(pos.set(x, y, z), quat.identity(), scale.setScalar(1)) : zero);
  };
  const placeAll = () => {
    SHELF_SLOTS.forEach((_, i) => placeOne(i));
    for (const meshes of variantMeshes.values()) for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
  };
  buildInstances(fallbackModule());

  // --- gantry (code): runway bridge with two trolleys, winch drums, cable carriers, lock lights ---
  const gantry = new T.Group();
  gantry.name = 'event-shelf-gantry';
  group.add(gantry);
  const TOP = SHELF.levels * SHELF.floor, RUNWAY_TOP = TOP + 1;
  const halfW = SHELF.cols * SHELF.cell / 2;
  const mk = (g: T.Object3D, sx: number, sy: number, sz: number, x: number, y: number, z: number, m: T.Material) => {
    const mesh = new T.Mesh(new T.BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  // Bridge: two white box girders across both runways, teal end carriages with cyan strips. It parks over the front cantilever, where the front guide rails end.
  const bridge = new T.Group();
  bridge.position.z = FRONT_RAIL_Z;
  gantry.add(bridge);
  for (const dz of [-1.7, 1.7]) mk(bridge, 2 * halfW + 3.4, 1.3, 1.5, 0, RUNWAY_TOP + 1.25, dz, shelfMaterial.white);
  mk(bridge, 2 * halfW + 3.4, .45, 3.6, 0, RUNWAY_TOP + .5, 0, shelfMaterial.slate);
  for (const s of [-1, 1]) {
    mk(bridge, 2.8, 1.7, 5.6, s * halfW, RUNWAY_TOP + .85, 0, shelfMaterial.teal);
    mk(bridge, 2.8, .35, 5.6, s * halfW, RUNWAY_TOP + 1.85, 0, shelfMaterial.white);
    mk(bridge, .5, .3, 5.0, s * halfW, RUNWAY_TOP + 2.1, 0, shelfMaterial.cyan);
  }
  const GIRDER_TOP = RUNWAY_TOP + 1.9;
  const makeTrolley = () => {
    const g = new T.Group();
    mk(g, 4.4, 1.5, 4.0, 0, GIRDER_TOP + .75, 0, shelfMaterial.slate);
    const drum = new T.Mesh(new T.CylinderGeometry(.85, .85, 3.2, 14).rotateZ(Math.PI / 2), shelfMaterial.rail);
    drum.position.set(0, GIRDER_TOP + 2.0, 0);
    drum.castShadow = true;
    g.add(drum);
    for (const dx of [-1.75, 1.75]) { const flange = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, .3, 14).rotateZ(Math.PI / 2), shelfMaterial.slate); flange.position.set(dx, GIRDER_TOP + 2.0, 0); g.add(flange); }
    mk(g, 1.2, .3, 3.6, 0, GIRDER_TOP + 3.1, 0, shelfMaterial.cyan);
    bridge.add(g);
    return g;
  };
  const trolleyA = makeTrolley(), trolleyB = makeTrolley(); // A holds the hung showpiece module, B carries the headline hoist
  const DRUM_Y = GIRDER_TOP + 2.0;
  const ropeMaterial = shelfMaterial.rail;
  const rope = (mesh: T.Mesh, a: T.Vector3, b: T.Vector3) => {
    const d = pos.copy(b).sub(a), len = Math.max(.05, d.length());
    mesh.position.copy(a).addScaledVector(d, .5);
    mesh.quaternion.setFromUnitVectors(UP, d.normalize());
    mesh.scale.set(1, len, 1);
  };
  const UP = new T.Vector3(0, 1, 0);
  /** One lifting set: four cables from the drum to a spreader ring, four slings to the module's roof rings and four clamps that grip the guide rails. */
  const makeCarrier = () => {
    const g = new T.Group();
    gantry.add(g);
    const line = () => { const m = new T.Mesh(new T.BoxGeometry(.2, 1, .2), ropeMaterial); g.add(m); return m; };
    const cables = [0, 1, 2, 3].map(line), slings = [0, 1, 2, 3].map(line);
    const ring = [-1, 1].flatMap(s => [mk(g, 7.2, .4, .4, 0, 0, 0, shelfMaterial.rail), mk(g, .4, .4, 7.2, 0, 0, 0, shelfMaterial.rail)].map((m, i) => (m.userData.at = [s, i], m)));
    const clamps = [-1, 1].flatMap(sx => [0, 1].map(top => {
      const arm = mk(g, 1.9, .45, .6, 0, 0, 0, shelfMaterial.joint), grip = mk(g, .8, .9, .9, 0, 0, 0, shelfMaterial.rail), led = mk(g, .08, .7, .2, 0, 0, 0, shelfMaterial.cyan);
      return { sx, top, arm, grip, led };
    }));
    const a = new T.Vector3(), b = new T.Vector3();
    const set = (visible: boolean, drumX: number, mx: number, my: number, mz: number, h: number, gripped: boolean) => {
      g.visible = visible;
      if (!visible) return;
      const ringY = my + h + 1.5;
      ring.forEach(m => { const [s, i] = m.userData.at as [number, number]; m.position.set(mx + (i === 0 ? 0 : s * 3.3), ringY, mz + (i === 0 ? s * 3.3 : 0)); });
      cables.forEach((c, i) => { const sx = i & 1 ? 1 : -1, sz = i & 2 ? 1 : -1; rope(c, a.set(drumX + sx * 1.1, DRUM_Y, FRONT_RAIL_Z + sz * .8), b.set(mx + sx * 3.3, ringY, mz + sz * 3.3)); });
      slings.forEach((c, i) => { const sx = i & 1 ? 1 : -1, sz = i & 2 ? 1 : -1; rope(c, a.set(mx + sx * 3.3, ringY, mz + sz * 3.3), b.set(mx + sx * 3.3, my + h + .1, mz + sz * 3.3)); });
      for (const { sx, top, arm, grip, led } of clamps) {
        const yy = my + (top ? h - .6 : .7), rz = mz + SHELF.module / 2 + .35;
        arm.visible = grip.visible = led.visible = gripped;
        arm.position.set(mx + sx * (SHELF.module / 2 + .6), yy, rz);
        grip.position.set(mx + sx * 6, yy, rz - .1);
        led.position.set(mx + sx * 6, yy, rz - .6);
      }
    };
    return { set };
  };
  const carrierA = makeCarrier(), carrierB = makeCarrier();
  const lockLights = [-1, 1].flatMap(sx => [-1, 1].map(sz => {
    const light = new T.Mesh(new T.SphereGeometry(.45, 10, 8), shelfMaterial.cyan);
    light.userData.at = [sx * (SHELF.module / 2 + .3), sz * (SHELF.module / 2 + .3)];
    light.visible = false;
    gantry.add(light);
    return light;
  }));
  const setLocks = (flash: number, mx: number, my: number, mz: number, h: number) => {
    for (const light of lockLights) {
      const [ox, oz] = light.userData.at as [number, number];
      light.visible = flash > 0;
      light.position.set(mx + ox, my + h - .6, mz + oz);
      light.scale.setScalar(flash * 1.6 + .1);
    }
  };

  const update = (now: number) => {
    clock = now;
    const reduced = prefersReducedMotion();
    const idleX = reduced ? -6 : -6 + Math.sin(now * Math.PI * 2 / 9) * 3;
    // Trolley A follows the hung showpiece; its module rides the rails slowly up and down.
    const hangVisible = hangIdx >= 0 && presence[hangIdx] * bandLevel > 1 - HIDDEN;
    const hangPose = settled(SHELF_SLOTS[hangIdx], now);
    trolleyA.position.x = HANG_X;
    carrierA.set(hangVisible, HANG_X, hangPose.x, hangPose.y, hangPose.z, MODULE_H, true);
    // Trolley B: idle above the left runway, or off with the headline module while a hoist runs.
    let flash = 0, bx = idleX;
    if (hoist) {
      const raw = hoistProgress(now), u = hoist.dir === 1 ? raw : 1 - raw, s = SHELF_SLOTS[hoist.slot];
      const mod = hoistPath(s, u), h = moduleHeight(s.variant);
      flash = clamp01(1 - Math.abs(u - .9) / .04);
      const carrying = u < .66 && raw > .02, w = smooth(clamp01(raw / .15)) * smooth(clamp01((1 - raw) / .1));
      bx = idleX + (mod.x - idleX) * w;
      carrierB.set(carrying, bx, mod.x, mod.y, mod.z, h, true);
      setLocks(flash, mod.x, mod.y, mod.z, h);
      if (raw >= 1) { hoist = undefined; for (let i = 0; i < presence.length; i++) presence[i] = i < count ? 1 : 0; }
    } else {
      carrierB.set(false, bx, 0, 0, 0, 0, false);
      setLocks(0, 0, 0, 0, 0);
    }
    trolleyB.position.x = bx;
    if (hoist || bandLevel < 1 - HIDDEN || bandChanged) { placeAll(); bandChanged = false; }
    else if (hangVisible && !reduced) { placeOne(hangIdx); for (const mesh of variantMeshes.get(SHELF_SLOTS[hangIdx].variant) ?? []) mesh.instanceMatrix.needsUpdate = true; }
  };
  let bandChanged = true;

  return {
    group, frame, gantry,
    setBandLevel(level: number) { if (level !== bandLevel) { bandLevel = level; bandChanged = true; } },
    /** Retarget the module count: the last module added or first removed gets the full hoist when animated; the rest snap (they slide with the band). */
    setCount(next: number, now: number, immediate: boolean) {
      const before = count;
      count = Math.max(0, Math.min(SHELF_SLOTS.length, next));
      hoist = undefined;
      if (immediate || prefersReducedMotion() || before === count) {
        for (let i = 0; i < presence.length; i++) presence[i] = i < count ? 1 : 0;
      } else {
        const lo = Math.min(before, count), hi = Math.max(before, count), adding = count > before;
        const slot = adding ? count - 1 : before - 1; // the last module added, or the last one in the load order removed first
        for (let i = 0; i < presence.length; i++) presence[i] = i < lo || (adding && i < hi) ? 1 : 0; // others in the range settle at once; the headline follows the hoist (or its reverse)
        hoist = { slot, start: now, dir: adding ? 1 : -1 };
      }
      bandChanged = true;
      clock = now;
      placeAll();
    },
    update,
    /** Swap the fallback frame/modules for the GLB's. `glb` is a clone of the asset root (nodes SHELF_FRAME, MOD_A..MOD_F, MOD_H). */
    installGlb(glb: T.Object3D) {
      remapCityMaterials(glb, roleMap);
      glb.updateMatrixWorld(true);
      const shelfFrame = glb.getObjectByName('SHELF_FRAME');
      if (!shelfFrame) throw new Error('event-shelf-2127: SHELF_FRAME missing.');
      const parts = new Map<ModuleVariant, VariantMesh[]>();
      for (const v of byVariant.keys()) {
        const node = glb.getObjectByName(`MOD_${v}`);
        if (!node) throw new Error(`event-shelf-2127: MOD_${v} missing.`);
        const toNode = node.matrixWorld.clone().invert(), list: VariantMesh[] = [];
        node.traverse(o => {
          if (o instanceof T.Mesh) list.push({ geometry: o.geometry.clone().applyMatrix4(toNode.clone().multiply(o.matrixWorld)), material: o.material as T.Material });
        });
        parts.set(v, list);
      }
      fallbackFrame.removeFromParent();
      frame.add(shelfFrame);
      shelfFrame.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = o.receiveShadow = true; } });
      buildInstances(parts);
    },
    get count() { return count; },
    visibleModules() { let n = 0; for (let i = 0; i < presence.length; i++) if (presence[i] * bandLevel > HIDDEN || (hoist && hoist.slot === i)) n++; return n; },
    hallSlots,
  };
}
export type EventShelf = ReturnType<typeof createEventShelf>;
