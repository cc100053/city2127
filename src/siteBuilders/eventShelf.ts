import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { nightLit } from '../cityRig.ts';
import { remapCityMaterials } from '../siteAssets/assetLoader.ts';
import type { CityMaterialRole } from '../siteAssets/assetCatalog.ts';
import { prefersReducedMotion, SITE_TRANSITION_SECONDS } from './siteRuntime.ts';

/** SW mixed flagship, the event module shelf (spec: artifacts/sw-event-shelf/spec.md). All geometry here is in METRES (the GLB's units); the host scales the group by UNITS_PER_METRE. */
export const UNITS_PER_METRE = .25;
export const SHELF = { cell: 12, floor: 4, cols: 3, rows: 2, levels: 10, module: 10.4 } as const;
export const SHELF_BASE_SEATS = 31; // module count = SHELF_BASE_SEATS + sharedSeats, so 4 seats (the default) = 35 of 60 slots
const HIDDEN = 1e-3;
const FRONT_RAIL_Z = -(SHELF.rows * SHELF.cell / 2 + .9 + SHELF.module / 2); // module centre while it hangs on the front guide rails
const REAR_RAIL_Z = -FRONT_RAIL_Z;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const hash = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;

export type ModuleVariant = 'A' | 'B' | 'C' | 'D' | 'H';
export interface ShelfSlot {
  readonly id: string; readonly c: number; readonly r: number; readonly k: number; readonly variant: ModuleVariant;
  /** Rank in the load order: the module with the highest rank below the current count is the last one added. */
  readonly order: number;
  readonly x: number; readonly y: number; readonly z: number;
}

// Front row `c0 c1 c2` | back row; '.' none, '^' occupied by the hall below, H = double-height hall (k and k+1).
const PATTERN: readonly (readonly [string, string])[] = [
  ['A.D', 'B.C'], ['BCA', 'D.B'], ['ACB', 'DAC'], ['H.A', '.CB'], ['^.B', 'A..'],
  ['ABC', 'DA.'], ['C.A', '.B.'], ['...', 'AD.'], ['B.C', 'A.D'], ['...', '...'],
];
const EXTRA: readonly [number, number, number, ModuleVariant][] = [[1, 1, 1, 'C'], [3, 1, 0, 'D'], [6, 0, 1, 'A'], [7, 1, 0, 'B']];
const cellX = (c: number) => (c - 1) * SHELF.cell;
const cellZ = (r: number) => (r - .5) * SHELF.cell;
const levelY = (k: number) => k * SHELF.floor + (k === 0 ? .15 : 0);

function makeSlots(): readonly ShelfSlot[] {
  const base: Omit<ShelfSlot, 'order'>[] = [];
  const at = (k: number, c: number, r: number, variant: ModuleVariant) => base.push({ id: `k${k}c${c}r${r}`, c, r, k, variant, x: cellX(c), y: levelY(k), z: cellZ(r) });
  PATTERN.forEach(([front, back], k) => [front, back].forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.' && ch !== '^') at(k, c, r, ch as ModuleVariant); })));
  const defaults = base.slice();
  // Load order: shuffled, then the visible mid-height front modules last so the 35th (the default headline) is read from the front.
  const rank = (s: Omit<ShelfSlot, 'order'>) => hash(s.k * 31 + s.c * 7 + s.r * 3) + (s.r === 0 && s.k >= 3 && s.k <= 6 && s.variant !== 'H' ? 2 : 0);
  defaults.sort((a, b) => rank(a) - rank(b));
  const extras: Omit<ShelfSlot, 'order'>[] = [];
  for (const [k, c, r, v] of EXTRA) extras.push({ id: `k${k}c${c}r${r}`, c, r, k, variant: v, x: cellX(c), y: levelY(k), z: cellZ(r) });
  return [...defaults, ...extras].map((s, order) => ({ ...s, order }));
}
export const SHELF_SLOTS: readonly ShelfSlot[] = makeSlots();
export const shelfCount = (sharedSeats: number) => Math.max(0, Math.min(SHELF_SLOTS.length, SHELF_BASE_SEATS + sharedSeats));

// ---- materials (GLB role -> runtime) ----
const std = (color: string, emissive?: string, intensity = 0, roughness = .6) => new T.MeshStandardMaterial({ color, emissive: emissive ?? '#000000', emissiveIntensity: intensity, roughness });
const shelfMaterial = {
  frame: std('#3a3f45'), rail: std('#8d96a0', undefined, 0, .45), teal: std('#1f9a9a'), white: std('#eef0ec'), paving: std('#bdb9b0'), dark: std('#221d1a'),
  cyan: new T.MeshBasicMaterial({ color: new T.Color('#38c8ff').multiplyScalar(1.6), toneMapped: false }),
  glass: new T.MeshStandardMaterial({ color: '#dff1ff', roughness: .1, transparent: true, opacity: .22, depthWrite: false }),
  room: nightLit(std('#ad6e45', '#d9661f', .5, 1), 1.1, '#ff9a3c'), floor: nightLit(std('#e0ad70', '#ff9a42', .35, 1), .8, '#ff9a3c'),
  glow: nightLit(std('#ff9e47', '#ff8c2e', 1.6), 2.4, '#ff9a3c'),
  amber: std('#ff8514', '#ff6b0a', .5), green: std('#3f7a2e'), wood: std('#80542f'), slate: std('#33383f'), fabric: std('#d69978'),
  skin: std('#cc916b'), skin_b: std('#855a42'), cloth_a: std('#2b4d80'), cloth_b: std('#cc4733'), cloth_c: std('#338074'),
} satisfies Record<string, T.Material>;
export const SHELF_ROLES = Object.keys(shelfMaterial).map(k => `sw_${k}`) as CityMaterialRole[];
const roleMap = Object.fromEntries(Object.entries(shelfMaterial).map(([k, m]) => [`sw_${k}`, m])) as Partial<Record<CityMaterialRole, T.Material>>;
const hookMaterial = std('#dfe3e6', undefined, 0, .5), tealMaterial = shelfMaterial.teal;

type VariantMesh = { geometry: T.BufferGeometry; material: T.Material };

/** The 60-slot frame, its instanced modules, the roof gantry and the headline hoist. */
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
    for (let i = 0; i <= SHELF.cols; i++) for (let j = 0; j <= SHELF.rows; j++) add(.9, H, .9, -W / 2 + i * SHELF.cell, H / 2, -D / 2 + j * SHELF.cell);
    for (let k = 1; k <= SHELF.levels; k++) {
      for (let j = 0; j <= SHELF.rows; j++) add(W + .7, .6, .7, 0, k * SHELF.floor - .3, -D / 2 + j * SHELF.cell);
      for (let i = 0; i <= SHELF.cols; i++) add(.7, .58, D + .7, -W / 2 + i * SHELF.cell, k * SHELF.floor - .3, 0);
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
      const h = v === 'H' ? 7.2 : 3.2;
      parts.set(v, [{ geometry: new T.BoxGeometry(SHELF.module, h, SHELF.module).translate(0, h / 2, 0), material: v === 'B' ? shelfMaterial.teal : shelfMaterial.white }]);
    }
    return parts;
  };

  // --- state: presence per slot (0..1), band progress, headline hoist ---
  const slotIndex = new Map<string, number>(); // index inside its variant's InstancedMesh
  for (const list of byVariant.values()) list.forEach((s, i) => slotIndex.set(s.id, i));
  const presence = new Float32Array(SHELF_SLOTS.length); // authoritative 0 or 1 once settled
  let count = shelfCount(4);
  let bandLevel = 1;
  let hoist: { slot: number; start: number; dir: 1 | -1 } | undefined;
  for (let i = 0; i < count; i++) presence[i] = 1;
  const matrix = new T.Matrix4(), scale = new T.Vector3(), quat = new T.Quaternion();
  const zero = new T.Matrix4().makeScale(0, 0, 0);
  /** Headline path (metres) as a function of progress u in 0..1 (0 = parked on the ground track, 1 = latched in its cell). */
  const hoistPath = (s: ShelfSlot, u: number): { x: number; y: number; z: number } => {
    const top = levelY(s.k), ground = levelY(0) + .5;
    const rear = s.r === 1;
    const lift = rear ? (SHELF.levels - 1) * SHELF.floor : top; // rear cells: lift to the empty transfer deck first
    const t = (a: number, b: number) => smooth(clamp01((u - a) / (b - a)));
    const z0 = -SHELF.rows * SHELF.cell / 2 - 8; // parked on the ground track at the lot edge
    let x = s.x, y = ground, z = z0;
    z = z0 + (FRONT_RAIL_Z - z0) * t(0, .2);
    y = ground + (lift - ground) * t(.2, .6);
    if (!rear) z = FRONT_RAIL_Z + (s.z - FRONT_RAIL_Z) * t(.62, .87);
    else {
      z = FRONT_RAIL_Z + (REAR_RAIL_Z - FRONT_RAIL_Z) * t(.6, .74);
      y = lift + (top - lift) * t(.74, .85);
      z = z + (s.z - REAR_RAIL_Z) * t(.85, .93);
    }
    return { x, y, z };
  };
  const hoistProgress = (now: number) => hoist ? clamp01((now - hoist.start) / SITE_TRANSITION_SECONDS) : 1;
  let clock = 0;
  const placeOne = (i: number) => {
    const s = SHELF_SLOTS[i], idx = slotIndex.get(s.id)!;
    let p = presence[i] * bandLevel, x = s.x, y = s.y, z = s.z, visible = p > HIDDEN;
    if (hoist && hoist.slot === i) {
      const raw = hoistProgress(clock);
      const u = hoist.dir === 1 ? raw : 1 - raw;
      p = bandLevel;
      ({ x, y, z } = hoistPath(s, hoist.dir === 1 ? raw : 1 - raw));
      visible = u > HIDDEN || hoist.dir === -1;
    } else if (p > HIDDEN && p < 1 - HIDDEN) {
      z = s.z - (1 - smooth(p)) * SHELF.cell; // everyone else slides in from the front, quietly
    }
    for (const mesh of variantMeshes.get(s.variant) ?? []) mesh.setMatrixAt(idx, visible ? matrix.compose(new T.Vector3(x, y, z), quat.identity(), scale.setScalar(1)) : zero);
  };
  const placeAll = () => {
    SHELF_SLOTS.forEach((_, i) => placeOne(i));
    for (const meshes of variantMeshes.values()) for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
  };
  buildInstances(fallbackModule());

  // --- gantry (code): runway carriages, bridge, trolley, cables, spreader, lock lights ---
  const gantry = new T.Group();
  gantry.name = 'event-shelf-gantry';
  group.add(gantry);
  const TOP = SHELF.levels * SHELF.floor;
  const bridge = new T.Group();
  gantry.add(bridge);
  const mk = (g: T.Object3D, sx: number, sy: number, sz: number, x: number, y: number, z: number, m: T.Material) => {
    const mesh = new T.Mesh(new T.BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  const halfW = SHELF.cols * SHELF.cell / 2;
  mk(bridge, 2 * halfW + 3, 1.3, 1.5, 0, TOP + 2.0, 0, shelfMaterial.white);
  for (const s of [-1, 1]) { mk(bridge, 2.2, 1.0, 2.6, s * halfW, TOP + 1.1, 0, tealMaterial); mk(bridge, .5, .5, 2.4, s * halfW, TOP + 1.85, 0, shelfMaterial.cyan); }
  const trolley = new T.Group();
  bridge.add(trolley);
  mk(trolley, 3.2, 1.2, 2.2, 0, TOP + 3.2, 0, shelfMaterial.slate);
  const drum = new T.Mesh(new T.CylinderGeometry(.55, .55, 2.0, 12).rotateZ(Math.PI / 2), hookMaterial);
  drum.position.set(0, TOP + 4.2, 0);
  trolley.add(drum);
  const cables: T.Mesh[] = [];
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cable = new T.Mesh(new T.BoxGeometry(.1, 1, .1), shelfMaterial.rail);
    cable.userData.off = [dx * 1.4, dz * 1.4];
    gantry.add(cable);
    cables.push(cable);
  }
  const spreader = new T.Mesh(new T.BoxGeometry(6, .35, 6), hookMaterial);
  spreader.castShadow = true;
  gantry.add(spreader);
  const lockLights = [-1, 1].flatMap(sx => [-1, 1].map(sz => {
    const light = new T.Mesh(new T.SphereGeometry(.45, 10, 8), shelfMaterial.cyan);
    light.userData.at = [sx * (SHELF.module / 2 + .2), sz * (SHELF.module / 2 + .2)];
    light.visible = false;
    gantry.add(light);
    return light;
  }));
  const place = (x: number, y: number, z: number, ropeBottom: number, hasLoad: boolean, flash: number, loadX = 0, loadZ = 0, loadTop = 0) => {
    bridge.position.z = z;
    trolley.position.x = x;
    const top = TOP + 2.7;
    spreader.visible = hasLoad;
    spreader.position.set(x, ropeBottom + .2, z);
    for (const cable of cables) {
      const [ox, oz] = cable.userData.off as [number, number];
      const len = Math.max(.2, top - ropeBottom);
      cable.scale.y = len;
      cable.position.set(x + ox, ropeBottom + len / 2, z + oz * (hasLoad ? 1 : .4));
    }
    for (const light of lockLights) {
      const [ox, oz] = light.userData.at as [number, number];
      light.visible = flash > 0;
      light.position.set(loadX + ox, loadTop - .3, loadZ + oz);
      light.scale.setScalar(flash * 1.6 + .1);
    }
  };

  const update = (now: number) => {
    clock = now;
    const reduced = prefersReducedMotion();
    let flash = 0;
    if (hoist) {
      const raw = hoistProgress(now), u = hoist.dir === 1 ? raw : 1 - raw, s = SHELF_SLOTS[hoist.slot];
      const mod = hoistPath(s, u), h = s.variant === 'H' ? 7.2 : 3.2;
      flash = hoist.dir === 1 ? clamp01(1 - Math.abs(u - .9) / .04) : clamp01(1 - Math.abs(u - .9) / .04);
      const w = smooth(clamp01(raw / .15)) * smooth(clamp01((1 - raw) / .1));
      // Gantry follows the module over the hoist span, otherwise idles above the roof.
      const idleX = reduced ? 0 : Math.sin(now * Math.PI * 2 / 9) * 10, idleZ = reduced ? 0 : Math.sin(now * Math.PI * 2 / 12) * 6;
      const gx = idleX + (mod.x - idleX) * w, gz = idleZ + (mod.z - idleZ) * w;
      place(gx, mod.y + h + 1.2, gz, mod.y + h + 1.2 + (1 - w) * (TOP - mod.y), w > .05, flash, mod.x, mod.z, mod.y + h);
      if (raw >= 1) { hoist = undefined; for (let i = 0; i < presence.length; i++) presence[i] = i < count ? 1 : 0; }
    } else {
      const idleX = reduced ? 0 : Math.sin(now * Math.PI * 2 / 9) * 10, idleZ = reduced ? 0 : Math.sin(now * Math.PI * 2 / 12) * 6;
      place(idleX, TOP + 1, idleZ, TOP - 2.6, false, 0);
    }
    if (hoist || bandLevel < 1 - HIDDEN || bandChanged) { placeAll(); bandChanged = false; }
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
    /** Swap the fallback frame/modules for the GLB's. `glb` is a clone of the asset root (nodes SHELF_FRAME, MOD_A..MOD_H). */
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
