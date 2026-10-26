import * as T from 'three';
import { bake, box, dark, glass, leaf, leafyCrown, membrane, paint, publicLight, stone, trim } from './cityRig.ts';

const algaeCulture = paint('#365b42', .35, .15);

export const HOUSING_OPTIONS = {
  baseline: '基準城市', material: 'M · 輕材架空住宅', membrane: 'P · 植物膜住宅', mobile: 'U · 可換生活艙', mixed: '三類共存 · 複合住宅',
} as const;
export type HousingOption = keyof typeof HOUSING_OPTIONS;
export const HOUSING_SITES = { material: [-165, -165], membrane: [45, -215], mobile: [-265, -60] } as const;

export const HOUSING_HOME_ROUTE = { start: [-5.2, 5.14, -4.4], end: [5.2, 5.14, -4.4] } as const;

export const HOUSING_CYCLE_SECONDS = 90;
// Axis-aligned, piecewise-linear translation makes each interval's swept AABB conservative, including between samples.
export const HOUSING_KEYFRAMES = [0, 5, 8, 12, 20, 28, 32, 35, 38, 45, 48, 52, 60, 68, 72, 75, 78, 90] as const;
export function housingCycle(seconds: number, still = false) {
  const time = still || !Number.isFinite(seconds) ? 0 : ((seconds % HOUSING_CYCLE_SECONDS) + HOUSING_CYCLE_SECONDS) % HOUSING_CYCLE_SECONDS;
  const ramp = (a: number, b: number) => Math.max(0, Math.min(1, (time - a) / (b - a)));
  const travel = ramp(20, 28) - ramp(60, 68);
  const out = ramp(12, 20) - ramp(28, 32) + ramp(52, 60) - ramp(68, 72);
  const lift = ramp(8, 12) - ramp(32, 35) + ramp(48, 52) - ramp(72, 75);
  const plugA = 1 - ramp(5, 8) + ramp(75, 78), plugB = ramp(35, 38) - ramp(45, 48);
  const phase = time < 5 || time >= 78 ? 'docked' : time < 8 ? 'disconnect' : time < 20 ? 'departure' : time < 28 ? 'transport' : time < 35 ? 'docking' : time < 45 ? 'connected' : time < 48 ? 'return-disconnect' : time < 60 ? 'return-departure' : time < 68 ? 'return-transport' : time < 75 ? 'return-docking' : 'reconnect';
  return { time, phase, travel, out, lift, plugA, plugB };
}

/** Shared dwellings, initially docked A; only the DEV study calls the compressed-years update. */
export function housingPrototype() {
  const root = new T.Group(); root.name = 'housing-prototype';
  const parts = { material: new T.Group(), membrane: new T.Group(), mobile: new T.Group() };
  for (const [key, group] of Object.entries(parts)) {
    group.name = `housing-${key}`; const [x, z] = HOUSING_SITES[key as keyof typeof HOUSING_SITES];
    group.position.set(x, 0, z); root.add(group);
  }
  const member = (parent: T.Group, a: number[], b: number[], width = .22, finish: T.Material = trim) => {
    const from = new T.Vector3(...a), to = new T.Vector3(...b), delta = to.clone().sub(from);
    const mesh = box(parent, [width, delta.length(), width], from.add(to).multiplyScalar(.5).toArray(), finish);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  };
  const rail = (parent: T.Group, x: number, y: number, z: number, length: number) => {
    for (const dx of [-length / 2, 0, length / 2]) box(parent, [.07, 1.1, .07], [x + dx, y + .55, z], dark);
    box(parent, [length, .08, .08], [x, y + 1.1, z], trim);
  };
  const treadGeometry = new T.BoxGeometry(1, 1, 1);
  const block = (parent: T.Group, size: [number, number, number], at: [number, number, number], finish: T.Material = trim) => {
    const mesh = new T.Mesh(treadGeometry, finish); mesh.scale.set(...size); mesh.position.set(...at);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  // Moving rectangular equipment shares one unit box across all material instances; fixed H1 rounded parts stay baked.
  const instanceBlocks = (group: T.Group) => {
    const finishes = new Map<T.Material, T.Matrix4[]>();
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert();
    group.traverse(o => {
      if (!(o instanceof T.Mesh) || Array.isArray(o.material)) return;
      const list = finishes.get(o.material) ?? [];
      list.push(inverse.clone().multiply(o.matrixWorld)); finishes.set(o.material, list);
    });
    group.clear();
    for (const [finish, matrices] of finishes) {
      const batch = new T.InstancedMesh(treadGeometry, finish, matrices.length);
      matrices.forEach((matrix, i) => batch.setMatrixAt(i, matrix));
      batch.castShadow = batch.receiveShadow = true; group.add(batch);
    }
  };
  const access = (parent: T.Group, x: number, floor: number, z: number) => {
    // Switchback stairs use ordinary <=18 cm risers beside a fixed accessible lift / utility core.
    box(parent, [2.5, floor, 2.4], [x - 4, floor / 2 + .15, z], trim);
    box(parent, [1.55, floor - .1, .12], [x - 4, floor / 2 + .15, z - 1.26], glass);
    for (const y of [.8, floor - .4]) box(parent, [1.4, .08, .08], [x - 4, y, z - 1.35], publicLight);
    const flights = Math.ceil(floor / 2.4), rise = floor / flights, steps = Math.ceil(rise / .18);
    for (let f = 0; f < flights; f++) {
      const direction = f % 2 ? -1 : 1, side = f % 2 ? .85 : -.85;
      for (let i = 0; i < steps; i++) {
        const t = (i + .5) / steps;
        const tread = new T.Mesh(treadGeometry, stone); tread.scale.set(4.2 / steps, .1, 1.1);
        tread.position.set(x + direction * (t * 4.2 - 2.1), .15 + rise * (f + t), z + side);
        tread.castShadow = tread.receiveShadow = true; parent.add(tread);
      }
      member(parent, [x - direction * 2.1, .15 + rise * f, z + side], [x + direction * 2.1, .15 + rise * (f + 1), z + side], .14, dark);
      member(parent, [x - direction * 2.1, 1.25 + rise * f, z + side + Math.sign(side) * .55], [x + direction * 2.1, 1.25 + rise * (f + 1), z + side + Math.sign(side) * .55], .06);
      box(parent, [1.3, .22, 3.1], [x + direction * 2.75, .15 + rise * (f + 1), z], stone);
    }
  };
  const cabin = (parent: T.Group, x: number, y: number, z: number, moving = false) => {
    const make = moving ? block : box;
    const room = new T.Group(); room.name = 'housing-living-cabin'; room.position.set(x, y, z); parent.add(room);
    for (const h of [-2.15, 2.15]) make(room, [7.6, .28, 5.4], [0, h, 0], trim);
    make(room, [7.2, 3.95, .18], [0, 0, 2.5], trim);
    for (const dx of [-3.65, 3.65]) make(room, [.22, 4.1, 5.2], [dx, 0, 0], trim);
    // Recessed glazing, removable service shoes and a visible door make this a dwelling rather than a solid pod.
    make(room, [6.9, 3.6, .14], [0, 0, -2.42], glass);
    for (const dx of [-3.45, -1.2, 1.2, 3.45]) make(room, [.09, 3.9, .15], [dx, 0, -2.55], trim);
    make(room, [1.1, 2.6, .18], [2.5, -.55, -2.58], dark);
    make(room, [.45, .05, .05], [2.6, -.2, -2.7], publicLight);
    for (const dx of [-2.8, 2.8]) for (const dz of [-2, 2]) make(room, [.65, .28, .65], [dx, -2.4, dz], dark);
    if (moving) instanceBlocks(room);
    return room;
  };
  const plantGeometry = leafyCrown(1), pose = new T.Object3D();
  const planted = (parent: T.Group, points: [number, number, number, number][], tilt: number) => {
    const plants = new T.InstancedMesh(plantGeometry, leaf, points.length); plants.name = 'housing-living-membrane';
    points.forEach(([x, y, z, scale], i) => {
      pose.position.set(x, y, z); pose.rotation.set(tilt, i * 1.3, 0); pose.scale.set(scale, scale * .6, scale);
      pose.updateMatrix(); plants.setMatrixAt(i, pose.matrix);
    });
    plants.castShadow = plants.receiveShadow = true; parent.add(plants);
  };

  // M: forked, bolted composite frames lift two modest homes over a public ground-level void.
  const m = parts.material;
  for (const x of [-8.8, 8.8]) for (const z of [-4, 4]) {
    box(m, [1.6, .4, 1.6], [x, .3, z], stone);
    member(m, [x, .5, z], [x * .68, 7.1, z], .42);
    member(m, [x * .68, 7.1, z], [x, 16.5, z], .32);
    for (const y of [7.1, 16.5]) box(m, [.7, .45, .7], [y < 8 ? x * .68 : x, y, z], dark);
  }
  for (const y of [7, 16.2]) {
    // The open central courtyard preserves ground-level breathing room between the two deck halves.
    box(m, [9.9, .4, 9.8], [-5.55, y, 0], trim);
    box(m, [4.5, .4, 9.8], [8.25, y, 0], trim);
    for (const z of [-4.1, 4.1]) box(m, [6.6, .4, 1.6], [2.7, y, z], trim);
    rail(m, 0, y + .2, -4.9, 20.6);
    for (const z of [-4, 4]) member(m, [-8.8, y - .5, z], [8.8, y - .5, z], .25, dark);
  }
  cabin(m, -6, 9.8, 1.5); cabin(m, -6, 19, 1.5);
  // The other half of each deck remains a shared outdoor room, with a service spine, benches and demountable joints.
  for (const [x, y] of [[8.3, 7.5], [8.3, 16.7]]) {
    box(m, [3, .45, 1.2], [x, y, 2.6], stone);
    for (const z of [-2.5, 2.5]) member(m, [x - 3.6, y, z], [x - 3.6, y + 4.4, z], .2);
  }
  access(m, -5.8, 16.4, 6.4);
  for (const y of [7.2, 16.4]) box(m, [7, .22, 1.4], [-5.8, y, 4.9], stone);
  member(m, [10, .4, 4], [10, 22, 4], .2, dark);
  member(m, [10, 7.5, 4], [5.5, 7.5, 4], .15, dark);
  member(m, [10, 17, 4], [5.5, 17, 4], .15, dark);
  // A parked replacement cradle and separable utility collars are part of this same frame.
  for (const x of [-9.2, -2.8]) box(m, [.16, .16, 7.6], [x, 16.5, .5], dark);
  const composite = new T.Group(); composite.name = 'housing-composite-skin'; m.add(composite);
  for (const x of [-9.3, -2.7]) member(composite, [x, 21.4, -1.7], [x, 24.3, 3.9], .14);
  box(composite, [8.6, .25, 6.3], [-6, 22.8, 1.1], leaf).rotation.x = -.45;
  member(composite, [-10.3, 24.3, 3.9], [-10.3, .5, 3.9], .14, dark);
  composite.add(...bake(composite));
  planted(composite, Array.from({ length: 48 }, (_, i) => {
    const x = -9.5 + i % 8, z = -1.7 + Math.floor(i / 8);
    return [x, 21.9 + (z + 1.7) * .48, z, .7];
  }), -.45);
  // Keep the optional composite layer separate while batching the fixed frame.
  composite.removeFromParent(); m.add(...bake(m)); m.add(composite);

  // P: a folded planted roof forms the living section; real trellis ribs, thick growth and a return-water loop.
  const p = parts.membrane, slope = Math.atan2(20, 12), roofLength = Math.hypot(20, 12);
  box(p, [21, .5, 8], [0, 3, 2], stone);
  box(p, [10, .25, 3.2], [-2.5, 3.3, -3.4], stone);
  for (const x of [-9, 0, 9]) for (const z of [-5.5, 5.5]) member(p, [x, .2, z], [x * .85, 3, z], .4);
  for (const x of [-9, -4.5, 0, 4.5, 9]) {
    member(p, [x, 5, -6], [x, 25, 6], .28);
    member(p, [x, 25, 6], [x, 3.3, 6], .32);
  }
  const roof = box(p, [20.4, .4, roofLength], [0, 15, 0], leaf); roof.rotation.x = -slope;
  for (const x of [-10.4, 10.4]) {
    member(p, [x, 4.8, -6.2], [x, 25.4, 6.2], .32);
    member(p, [x, 3.4, -6.2], [x, 4.8, -6.2], .3);
  }
  box(p, [18, 2.8, .16], [0, 4.8, -5.8], glass);
  box(p, [18, 20, .16], [0, 14, 5.8], glass);
  for (const y of [6, 12, 18, 24]) box(p, [18.4, .18, .4], [0, y, 6], trim);
  for (const x of [-7, -3.5, 0, 3.5, 7]) box(p, [.12, 20, .25], [x, 14, 6], trim);
  // Gutter → filter cistern → riser → top distributor; plant growth is a dark, non-emissive surface at night.
  box(p, [21, .4, .65], [0, 4.5, -6.5], trim);
  box(p, [2.5, 2, 2.5], [9.4, 1.2, -6], dark);
  for (const z of [-6.5, 6]) member(p, [10, 1.5, z], [10, z < 0 ? 5 : 26, z], .14, dark);
  member(p, [10, 1.5, -6.5], [10, 1.5, 6], .14, dark);
  box(p, [20, .12, .16], [0, 25.6, 6], dark);
  access(p, -3.5, 3.3, -5.3);
  rail(p, 0, 3.3, -7, 20.5);
  p.add(...bake(p));
  planted(p, Array.from({ length: 360 }, (_, i) => {
    const x = -9.5 + i % 20 + Math.sin(i * 2.1) * .12, z = -5.6 + Math.floor(i / 20) * .65 + Math.cos(i * 1.7) * .06;
    return [x, 15.55 + z * 20 / 12, z, 1.05 + (i % 3) * .04];
  }), -slope);

  // U stands over an existing shader-water swale: slender piles preserve the wet ground rather than filling it.
  const u = parts.mobile;
  box(u, [22, .45, 15], [0, 2.5, 0], stone);
  for (const x of [-9, 0, 9]) for (const z of [-6, 6]) member(u, [x, .15, z], [x, 2.5, z], .4);
  for (const x of [-9, 0, 9]) for (const z of [0, 5.6]) {
    member(u, [x, 2.7, z], [x, 23, z], .4);
    for (const y of [8, 15.2, 22.6]) box(u, [.7, .5, .7], [x, y, z], dark);
  }
  for (const y of [8, 15.2, 22.6]) for (const z of [0, 5.6]) {
    member(u, [-9.5, y, z], [9.5, y, z], .38);
    for (const x of [-4.5, 4.5]) for (const side of [-1, 1]) box(u, [.14, .14, 8], [x + side * (y === 8 ? 2.8 : 3.2), y + (y === 8 ? .18 : .3), 1.8], dark);
  }
  for (const x of [-9, 9]) member(u, [x, 8, 5.6], [x, 22.6, 0], .2, dark);
  const exchangeCabin = cabin(u, -4.5, 10.8, 2.8, true);
  exchangeCabin.removeFromParent();
  cabin(u, 4.5, 18, 2.8);
  // Front hoist avoids the occupied upper socket; its fork enters below the lower cabin's side sills.
  for (const x of [-10.5, 10.5]) member(u, [x, 2.7, -7.8], [x, 25.5, -7.8], .4);
  member(u, [-10.7, 25.5, -7.8], [10.7, 25.5, -7.8], .32);
  for (const x of [-4.5, 4.5]) {
    member(u, [x, 8.2, 6.1], [x, 10.8, 6.1], .18, dark);
    box(u, [.8, .5, .24], [x, 10.8, 6.1], dark);
  }
  box(u, [1.6, 2.2, 1], [9.4, 3.8, 5.6], dark);
  for (const y of [8.5, 15.7]) {
    box(u, [1.4, .8, .3], [8.8, y, 5.7], trim);
    box(u, [.8, .09, .06], [8.8, y, 5.9], publicLight);
  }
  access(u, 4, 2.7, 7.1);
  box(u, [1.4, 2.2, .12], [0, 1.25, 8.34], dark);
  // Continuous public gallery stays behind the exchange lane, linked by the fixed lift core.
  access(u, -4.8, 15.5, 7.1);
  for (const y of [8, 15.2]) { box(u, [20.5, .3, 1.5], [0, y, 6.5], trim); rail(u, 0, y + .15, 7.3, 20.5); }


  // Secondary equipment shares the unit stair box.
  const collective = new T.Group(); collective.name = 'housing-collective-frame'; m.add(collective);
  collective.rotation.y = Math.PI / 2; collective.position.set(8.2, 0, 5.9); collective.scale.z = .7;
  // One horizontal communal room spans the existing outdoor deck, distinct from the separate Q4 tower.
  for (const z of [-3, 3]) {
    block(collective, [8.8, .3, .3], [6.4, 21.3, z]);
    for (const x of [2, 6.4, 10.8]) {
      block(collective, [.25, 5, .25], [x, 18.8, z]);
      block(collective, [.65, .35, .65], [x, 21.3, z], dark);
    }
  }
  for (const x of [2, 10.8]) block(collective, [.3, .3, 6.3], [x, 21.3, 0]);
  block(collective, [8.5, .2, 5.7], [6.4, 21.55, 0]);
  for (const x of [4.1, 8.4]) {
    block(collective, [3.6, .18, 3.5], [x, 16.4, .8]);
    block(collective, [3.5, 2.8, .14], [x, 17.9, 2.5], glass);
    block(collective, [3.5, 2.8, .14], [x, 17.9, -.9], glass);
    for (const dx of [-1.8, 1.8]) block(collective, [.14, 3, 3.5], [x + dx, 17.9, .8]);
    block(collective, [2.4, .5, .7], [x, 16.8, 2], stone);
    block(collective, [3.6, .12, .12], [x, 20.6, -.9], dark);
  }
  block(collective, [8.5, .2, 1.6], [6.4, 16.4, -2]);
  collective.add(...bake(collective));

  const algae = new T.Group(); algae.name = 'housing-algae-equipment'; p.add(algae);
  // Non-emissive green culture behind reflective glass; manifolds, return pipes and filter tank make the loop legible.
  for (const x of [-8, -4, 0, 4, 8]) {
    block(algae, [.22, 13, .22], [x, 6.5, 8.1]);
    block(algae, [3.5, 7, .32], [x, 8.8, 7.6], algaeCulture);
    block(algae, [3.5, 7, .08], [x, 8.8, 7.82], membrane);
    for (const dx of [-1.85, 1.85]) block(algae, [.12, 7.4, .4], [x + dx, 8.8, 7.6]);
    for (const y of [5.1, 12.5]) block(algae, [3.8, .18, .5], [x, y, 7.6]);
    block(algae, [.12, 9.1, .12], [x, 7.05, 8.35], dark);
    block(algae, [1.2, .3, 1.2], [x, .25, 8.1], stone);
  }
  for (const y of [2.5, 12.9]) block(algae, [18.5, .18, .18], [0, y, 8.35], dark);
  block(algae, [2.4, 2, 1], [9, 1.2, 7.6], dark);
  block(algae, [1.8, 1.5, .12], [9, 1.3, 7.02], membrane);
  algae.add(...bake(algae));

  const relocation = new T.Group(); relocation.name = 'housing-home-infrastructure'; u.add(relocation);
  // Dedicated update rails stay on the water-side half of the pile deck, separate from the public gallery and module hoist.
  for (const z of [-5.6, -3.2]) {
    block(relocation, [16, .18, .22], [0, 3.04, z], dark);
  }
  for (const x of [-7.5, -5, -2.5, 0, 2.5, 5, 7.5]) block(relocation, [.5, .18, 3.2], [x, 2.8, -4.4]);
  for (const x of [-5.2, 5.2]) {
    block(relocation, [4.2, .14, 4.6], [x, 3.05, -4.4]);
    block(relocation, [.5, 1.5, .6], [x + 1.9, 3.7, -1.8], dark);
    block(relocation, [.35, .1, .1], [x + 1.9, 4.3, -2.15], publicLight);
    block(relocation, [.15, .15, 1], [x + 1.9, 3.1, -2.3], dark);
    block(relocation, [3.8, .12, 1.4], [x, 3.2, -1.9]);
    block(relocation, [1.4, .12, 3], [x, 2.96, .3]).rotation.x = Math.atan2(.48, 3);
  }
  block(relocation, [1.5, 1.8, 1.2], [9.3, 3.7, -4.4], dark);
  u.add(...bake(u)); u.add(exchangeCabin);
  const wholeHome = new T.Group(); wholeHome.name = 'housing-whole-home'; wholeHome.position.set(...HOUSING_HOME_ROUTE.start); u.add(wholeHome);
  for (const y of [-1.7, 1.7]) block(wholeHome, [3.6, .2, 3.6], [0, y, 0]);
  for (const x of [-1.7, 1.7]) block(wholeHome, [.2, 3.2, 3.6], [x, 0, 0]);
  block(wholeHome, [3.2, 3.2, .18], [0, 0, 1.7]);
  block(wholeHome, [3.1, 2.8, .12], [0, 0, -1.7], glass);
  block(wholeHome, [.85, 2.3, .14], [.95, -.35, -1.8], dark);
  block(wholeHome, [.85, 2.3, .14], [.95, -.35, 1.82], dark);
  block(wholeHome, [.08, 3.1, .15], [-.3, 0, -1.8]);
  for (const x of [-1.25, 1.25]) for (const z of [-1.2, 1.2]) block(wholeHome, [.5, .22, .5], [x, -1.9, z], dark);
  block(wholeHome, [1.2, .4, .7], [0, -1.4, 1], stone);
  instanceBlocks(wholeHome);
  const rig = new T.Group(); rig.name = 'housing-transfer-rig'; u.add(rig);
  const trolley = block(rig, [7.2, .6, 1], [-4.5, 25.02, -7.8], dark);
  const fork = new T.Group(); fork.name = 'housing-transfer-fork'; rig.add(fork);
  block(fork, [7.2, .2, .3], [0, 0, -7.8], dark);
  const fingers = [-3.4, 3.4].map(x => block(fork, [.18, .14, 12.9], [x, 0, -1.35], trim));
  const cables = [-3.4, 3.4].map(x => block(rig, [.07, 16.3, .07], [x - 4.5, 16.6, -7.8], dark));
  const utilities = new T.Group(); utilities.name = 'housing-utility-connectors'; u.add(utilities);
  const cabinPlugs = [-4.5, 4.5].map(x => block(utilities, [.18, .18, .57], [x, 10.8, 5.685], dark));
  const homePlugs = [-5.2, 5.2].map(x => block(utilities, [.18, .18, .69], [x + .3, 4.3, -2.245], dark));
  // Fixed service elbows lead from each original column to the retracting whole-home plug.
  for (const x of [-5.2, 5.2]) block(utilities, [1.8, .18, .18], [x + 1.05, 4.3, -1.8], dark);
  const moving = [exchangeCabin, wholeHome, trolley, fork, ...cables, ...cabinPlugs, ...homePlugs];
  const update = (seconds: number, still = false) => {
    const cycle = housingCycle(seconds, still), x = -4.5 + 9 * cycle.travel, y = 8.43 + .6 * cycle.lift;
    exchangeCabin.position.set(x, 10.8 + .6 * cycle.lift, 2.8 - 6.8 * cycle.out);
    wholeHome.position.set(-5.2 + 10.4 * cycle.travel, 5.14, -4.4);
    trolley.position.x = x; fork.position.set(x, y, 0);
    fingers.forEach(finger => { const length = 12.9 - 6.8 * cycle.out; finger.scale.z = length; finger.position.z = -7.8 + length / 2; });
    cables.forEach((cable, i) => { cable.position.set(x + (i ? 3.4 : -3.4), (24.75 + y) / 2, -7.8); cable.scale.y = 24.75 - y; });
    for (const [i, amount] of [cycle.plugA, cycle.plugB].entries()) {
      cabinPlugs[i].scale.z = .04 + .53 * amount; cabinPlugs[i].position.z = 5.97 - cabinPlugs[i].scale.z / 2;
      homePlugs[i].scale.z = .04 + .65 * amount; homePlugs[i].position.z = -1.9 - homePlugs[i].scale.z / 2;
    }
    return cycle;
  };
  update(0);

  let option: HousingOption = 'baseline';
  const select = (next: HousingOption) => {
    option = next;
    for (const [key, part] of Object.entries(parts)) part.visible = next === key || next === 'mixed';
    composite.visible = next === 'mixed';
  };
  select(option);
  return { root, parts, composite, collective, algae, wholeHome, exchangeCabin, rig, utilities, moving, update, select, get option() { return option; } };
}
