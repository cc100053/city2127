import * as T from 'three';
import { bake, box, dark, glass, leaf, leafyCrown, publicLight, stone, trim } from './cityRig.ts';

export const HOUSING_OPTIONS = {
  baseline: '基準城市', material: 'M · 輕材架空住宅', membrane: 'P · 植物膜住宅', mobile: 'U · 可換生活艙', mixed: '三類共存 · 複合住宅',
} as const;
export type HousingOption = keyof typeof HOUSING_OPTIONS;
export const HOUSING_SITES = { material: [-135, -175], membrane: [45, -215], mobile: [-265, -60] } as const;

/** H1: fixed parked configurations, independent of votes; every part is built once. */
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
  const cabin = (parent: T.Group, x: number, y: number, z: number) => {
    const room = new T.Group(); room.name = 'housing-living-cabin'; room.position.set(x, y, z); parent.add(room);
    for (const h of [-2.15, 2.15]) box(room, [7.6, .28, 5.4], [0, h, 0], trim);
    box(room, [7.2, 3.95, .18], [0, 0, 2.5], trim);
    for (const dx of [-3.65, 3.65]) box(room, [.22, 4.1, 5.2], [dx, 0, 0], trim);
    // Recessed glazing, removable service shoes and a visible door make this a dwelling rather than a solid pod.
    box(room, [6.9, 3.6, .14], [0, 0, -2.42], glass);
    for (const dx of [-3.45, -1.2, 1.2, 3.45]) box(room, [.09, 3.9, .15], [dx, 0, -2.55], trim);
    box(room, [1.1, 2.6, .18], [2.5, -.55, -2.58], dark);
    box(room, [.45, .05, .05], [2.6, -.2, -2.7], publicLight);
    for (const dx of [-2.8, 2.8]) for (const dz of [-2, 2]) box(room, [.65, .28, .65], [dx, -2.4, dz], dark);
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
    // The existing skyway mast passes through an open courtyard, never through a new floor or home.
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
    for (const x of [-4.5, 4.5]) for (const dx of [-3.2, 3.2]) box(u, [.14, .14, 8], [x + dx, y + .3, 1.8], dark);
  }
  for (const x of [-9, 9]) member(u, [x, 8, 5.6], [x, 22.6, 0], .2, dark);
  cabin(u, -4.5, 10.8, 2.8); cabin(u, 4.5, 18, 2.8);
  // One empty socket, a receiving cradle and an overhead travelling hoist show the route without H2 motion.
  box(u, [7.6, .28, 6.2], [4.5, 8.3, 2.8], trim);
  for (const x of [-7.7, -1.3]) member(u, [x, 23, -4], [x, 25.5, -4], .22);
  member(u, [-8.3, 25.5, -4], [8.3, 25.5, -4], .32);
  box(u, [3.4, .6, 2], [-4.5, 25.1, -4], dark);
  for (const x of [-6.8, -2.2]) member(u, [x, 24.8, -4], [x, 22.7, -4], .06, dark);
  box(u, [7.4, .25, 5.4], [-4.5, 22.6, -3.8], trim);
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
  u.add(...bake(u));

  let option: HousingOption = 'baseline';
  const select = (next: HousingOption) => {
    option = next;
    for (const [key, part] of Object.entries(parts)) part.visible = next === key || next === 'mixed';
    composite.visible = next === 'mixed';
  };
  select(option);
  return { root, parts, composite, select, get option() { return option; } };
}
