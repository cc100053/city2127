import type { PropPlacement } from '../siteAssets/propKit.ts';

/** Kit placements for the SE +1 tower (local units: HW 5.2, LOBBY 3.6, HF 2.4). Props are metres for a 1.8 m person; see propKit.ts. */
export type Person = [x: number, y: number, z: number, seated?: boolean, yaw?: number];
export interface TowerKit { props: PropPlacement[]; people: Person[] }

/** SE's standing figure is .74 local units for a 1.8 m person. */
export const UNITS_PER_METRE = .74 / 1.8;
export const HW = 5.2, LOBBY = 3.6, HF = 2.4, TOP = LOBBY + 14 * HF, FLOOR_TOP = .26;
const LOW = 2.2, TALL = 1.5, CHAIR = 1.8; // furniture and tall pieces: scaled up so a desk is person-sized, not 1.8 m-person-sized
const PI = Math.PI, EAST = PI / 2, WEST = -PI / 2;

type Programme = 'lounge' | 'office' | 'library' | 'cafe' | 'gym' | 'studio';
// Office x4, library x2, cafe x2, lounge x2, gym, studio (+ one more office); garden floors add indoor trees (T6).
const FLOORS: { programme: Programme; garden: boolean }[] = [
  { programme: 'lounge', garden: false }, { programme: 'office', garden: false }, { programme: 'library', garden: true },
  { programme: 'office', garden: false }, { programme: 'cafe', garden: false }, { programme: 'lounge', garden: true },
  { programme: 'office', garden: false }, { programme: 'library', garden: true }, { programme: 'gym', garden: false },
  { programme: 'cafe', garden: true }, { programme: 'office', garden: false }, { programme: 'studio', garden: true },
  { programme: 'office', garden: false },
];
export const FLOOR_PROGRAMMES = FLOORS;

/** Contents of floor `index` (0..12): world-local positions on that floor's slab top. Camera H looks in from +X. */
export function floorKit(index: number): TowerKit {
  const { programme, garden } = FLOORS[index];
  const y = LOBBY + index * HF + FLOOR_TOP;
  const props: PropPlacement[] = [], people: Person[] = [];
  const put = (name: string, x: number, z: number, yaw = 0, scale = LOW) => props.push({ name, position: [x, y, z], yaw, scale });
  const seat = (x: number, z: number, yaw: number) => people.push([x, y, z, true, yaw]);
  const stand = (x: number, z: number, yaw = EAST) => people.push([x, y, z, false, yaw]);
  switch (programme) {
    case 'office':
      for (const z of [-1.6, -.2, 1.2]) { put('desk_monitor', -.5, z, EAST); put('chair_office', .1, z, WEST, CHAIR); }
      seat(.1, -.2, WEST); seat(.1, 1.2, WEST); stand(1.9, -1.1);
      put('floor_lamp', 2.0, 2.0, 0, TALL);
      break;
    case 'library':
      for (const z of [-1.7, -.5, .7, 1.9]) put('bookshelf', -2.1, z, EAST, TALL);
      put('sofa', .6, -1.0, EAST); put('floor_lamp', .5, 1.6, 0, TALL); put('potted_plant', 1.9, 1.6, 0, 1.9);
      seat(.6, -1.0, EAST); stand(-1.3, .6, WEST); stand(1.9, -.2);
      break;
    case 'cafe':
      put('kitchen_counter', -2.0, .6, EAST, 1.8);
      for (const z of [-1.6, -.1]) put('cafe_set', .5, z, EAST, 1.8);
      seat(.5, -.1 - .8 * 1.8 * UNITS_PER_METRE, 0); // the set's +x chair, turned to the table
      stand(-1.2, .9, WEST); stand(1.9, 1.4);
      break;
    case 'lounge':
      put('sofa', -1.5, -1.0, EAST); put('sofa', .8, 1.5, PI);
      put('floor_lamp', -1.8, 2.0, 0, TALL); put('floor_lamp', 1.9, -1.9, 0, TALL);
      seat(-1.5, -1.0, EAST); seat(.8, 1.5, PI); stand(1.8, -.4);
      break;
    case 'gym':
      for (const z of [-1.6, -.2, 1.2]) put('treadmill', .2, z, WEST, 1.6);
      people.push([.2, y + .2, -1.6, false, EAST], [.2, y + .2, 1.2, false, EAST]); seat(-1.7, .6, EAST);
      put('potted_plant', 1.9, 2.0, 0, 1.9);
      break;
    case 'studio':
      put('desk_monitor', -1.6, -1.2, EAST); put('chair_office', -1.0, -1.2, WEST, CHAIR);
      put('desk_monitor', -1.6, .6, EAST); put('chair_office', -1.0, .6, WEST, CHAIR);
      put('bookshelf', -2.1, 1.9, EAST, TALL); put('sofa', 1.0, 1.0, WEST);
      seat(-1.0, -1.2, WEST); seat(1.0, 1.0, WEST); stand(1.9, -1.2);
      break;
  }
  if (garden) { // T6: trees inside the floor, behind the +X glass, and a long planter along it
    put('tree_indoor', 1.8, -1.8, 0, 2.3); put('tree_indoor', 1.8, 1.8, 0, 2.4); put('tree_indoor', -.4, 2.0, 0, 2.1);
    put('potted_plant', 1.9, 0, 0, 1.9);
    for (const z of [-.8, 0, .8]) put('planter_1m', 2.1, z + .1, EAST, 1.8);
  }
  return { props, people };
}

/** Double-height lobby (floor y 0): reception desk, plants, lamps and a resident by the door. */
export function lobbyKit(): TowerKit {
  const y = FLOOR_TOP, props: PropPlacement[] = [];
  props.push({ name: 'desk_monitor', position: [-1.2, y, -.4], yaw: EAST, scale: LOW }, { name: 'chair_office', position: [-.6, y, -.4], yaw: WEST, scale: CHAIR });
  for (const z of [-1.5, 1.5]) props.push({ name: 'potted_plant', position: [1.9, y, z], scale: 1.9 }, { name: 'floor_lamp', position: [1.6, y, z * 1.3], scale: TALL });
  props.push({ name: 'sofa', position: [-1.5, y, 1.5], yaw: EAST, scale: LOW });
  return { props, people: [[-.6, y, -.4, true, WEST], [1.2, y, .4, false, EAST], [-1.5, y, 1.5, true, EAST]] };
}

/** Paved forecourt (T9): two benches flanking the path, hedge planters along the base, tree clusters both sides, five residents. */
export function forecourtKit(): TowerKit {
  const y = .04, props: PropPlacement[] = [], people: Person[] = [];
  for (const z of [-1.2, 1.2]) props.push({ name: 'bench', position: [3.7, y, z], yaw: EAST, scale: 1.8 });
  for (const s of [-1, 1]) {
    for (let z = 1.1; z <= 3.0; z += .6) props.push({ name: 'planter_1m', position: [3.0, .12, s * z], yaw: EAST, scale: 1.9 });
    for (const [x, z, name, k] of [[3.4, 3.3, 'tree_round_m', 2.0], [5.4, 4.3, 'tree_round_l', 1.7], [4.2, 5.0, 'tree_round_s', 2.4]] as const) {
      props.push({ name, position: [x, 0, s * z], yaw: x + s, scale: k });
      props.push({ name: 'shrub_cluster', position: [x + .9, 0, s * (z - .7)], yaw: z, scale: 1.9 });
    }
  }
  people.push([3.7, y, -1.4, true, EAST], [3.7, y, 1.0, true, EAST], [4.9, y, .5, false, WEST], [5.6, y, -.5, false, EAST], [4.3, y, -.2, false, EAST]);
  return { props, people };
}

/** Roof garden (T7) on the cap top: five trees and shrubs around the rim. */
export function roofKit(): TowerKit {
  const y = TOP + .7, props: PropPlacement[] = [];
  for (let i = 0; i < 5; i++) {
    const a = .3 + i * 1.26;
    props.push({ name: i % 2 ? 'tree_round_s' : 'tree_round_m', position: [Math.cos(a) * 1.9, y, Math.sin(a) * 1.9], yaw: i, scale: 2.1 });
  }
  for (let i = 0; i < 11; i++) {
    const a = i * .57, r = i % 3 === 0 ? 2.9 : 2.5;
    props.push({ name: 'shrub_cluster', position: [Math.cos(a) * r, y, Math.sin(a) * r], yaw: i, scale: 1.9 });
  }
  props.push({ name: 'shrub_cluster', position: [0, y, 0], scale: 2.2 });
  return { props, people: [] };
}

/** Function module `i` (0..5, on floors 1,3,5,7,9,11): a small fit-out relative to that floor's origin, scaled in by the controller. */
export function moduleKit(i: number): TowerKit {
  const y = FLOOR_TOP;
  const name = ['potted_plant', 'floor_lamp', 'shrub_cluster', 'potted_plant', 'floor_lamp', 'shrub_cluster'][i];
  const props: PropPlacement[] = [{ name, position: [1.5, y, -1.6], scale: name === 'floor_lamp' ? TALL : 2 }, { name: 'planter_1m', position: [1.4, y, -2.1], yaw: EAST, scale: 1.8 }];
  return { props, people: [[1.2, y, -1.2, false, EAST]] };
}
