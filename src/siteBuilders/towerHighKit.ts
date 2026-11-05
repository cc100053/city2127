import type { PropPlacement } from '../siteAssets/propKit.ts';

/** Kit placements for the SE +1 tower (local units: HW 5.2, LOBBY 3.6, HF 2.4). Props are metres for a 1.8 m person; see propKit.ts. */
export type Person = [x: number, y: number, z: number, seated?: boolean, yaw?: number];
export interface TowerKit { props: PropPlacement[]; people: Person[] }

/** SE's standing figure is .74 local units for a 1.8 m person. */
export const UNITS_PER_METRE = .74 / 1.8;
export const HW = 5.2, LOBBY = 3.6, HF = 2.4, TOP = LOBBY + 14 * HF, FLOOR_TOP = .26;
const LOW = 2.2, TALL = 1.5, CHAIR = 1.8; // furniture and tall pieces: scaled up so a desk is person-sized, not 1.8 m-person-sized
const PI = Math.PI, EAST = PI / 2, WEST = -PI / 2;

const BACK = -2.2; // back wall (-X, facing the camera at H)
type Put = (name: string, x: number, z: number, yaw?: number, scale?: number, lift?: number) => void;
type Who = (x: number, z: number, yaw?: number, lift?: number) => void;
interface Floor { garden: boolean; build: (put: Put, seat: Who, stand: Who, y: number) => void }

/** R3: each floor has its own back-wall feature (facing +X) and mid-room cluster; garden floors have trees of different kit sizes, potted plants and a bench. */
const FLOORS: Floor[] = [
  { garden: false, build: (put, seat, stand) => { // lounge: long sofa, rug, art
    put('sofa', BACK + .3, -.3, EAST, 2.6); put('rug', -.6, -.3, EAST, 2.4); put('art_panel', BACK + .05, -.9, EAST, 2); put('art_panel', BACK + .05, .3, EAST, 2);
    put('cafe_set', .6, 1.3, EAST, 1.8); put('floor_lamp', 1.9, -1.8, 0, TALL); put('potted_plant', 1.9, 1.7, 0, 2.2);
    seat(BACK + .5, -.6, EAST); stand(1.9, .2); } },
  { garden: false, build: (put, seat, stand) => { // office: two facing desk pairs, meeting table, whiteboard
    for (const z of [-1.5, -.2]) { put('desk_monitor', -1.0, z, EAST); put('chair_office', -.4, z, WEST, CHAIR); put('desk_monitor', .9, z, WEST); put('chair_office', .3, z, EAST, CHAIR); }
    put('meeting_table', .2, 1.6, EAST, 1.4); put('whiteboard', BACK + .1, 1.2, EAST, 1.6);
    seat(-.4, -1.5, WEST); seat(.3, -.2, EAST); stand(1.9, .9); } },
  { garden: true, build: (put, seat, stand) => { // library + garden
    for (const z of [-1.6, -.5, .6]) put('bookshelf', BACK + .1, z, EAST, 1.5);
    put('rug', -.5, 1.5, EAST, 1.8); put('bench', -.5, 1.5, EAST, 1.8);
    put('tree_indoor', 1.7, -1.6, 0, 2.6); put('tree_round_s', 1.5, 1.6, 0, 1.7); put('potted_plant', .3, .2, 0, 2.2); put('potted_plant', 1.9, .5, 0, 2);
    seat(-.5, 1.4, EAST); stand(.9, -.4); } },
  { garden: false, build: (put, seat, stand) => { // studio: pin-board wall, big table, lamps
    for (const z of [-1.5, 0, 1.5]) put('art_panel', BACK + .05, z, EAST, 2.1);
    put('meeting_table', -.2, -.3, EAST, 1.7); put('floor_lamp', 1.9, -2, 0, TALL); put('floor_lamp', 1.9, 2, 0, TALL);
    seat(.34, -.3, WEST); seat(-.74, -.3, EAST); stand(1.8, .9); } },
  { garden: false, build: (put, seat, stand, y) => { // cafe: counter, cabinets, pendants, two tables
    put('kitchen_counter', BACK + .2, .5, EAST, 1.8); put('upper_cabinet', BACK + .05, .5, EAST, 1.8);
    put('cafe_set', .4, -1.4, EAST, 1.8); put('cafe_set', .6, .2, EAST, 1.8); put('potted_plant', 1.9, 1.8, 0, 2);
    for (const z of [-1.4, .2, 1.4]) put('pendant_lamp', .5, z, 0, 1.3, 2.14 - 1.2 * UNITS_PER_METRE * 1.3);
    seat(.4, -1.4 - .8 * 1.8 * UNITS_PER_METRE, 0); stand(1.9, -.4); void y; } },
  { garden: true, build: (put, seat, stand) => { // lounge + garden
    put('sofa', BACK + .35, 1.2, EAST, 2.2); put('art_panel', BACK + .05, 1.2, EAST, 2.1); put('rug', -.5, 1.2, EAST, 2);
    put('tree_indoor', 1.7, .9, 0, 2.4); put('tree_indoor', 1.7, -1.9, 0, 2.7); put('tree_round_s', -.3, -1.7, 0, 1.8); put('potted_plant', 1.0, 0, 0, 2.1);
    seat(BACK + .55, 1.2, EAST); stand(1.9, -.6); } },
  { garden: false, build: (put, seat, stand) => { // gym: mirror wall, treadmills
    for (const z of [-1.5, 0, 1.5]) put('whiteboard', BACK + .1, z, EAST, 1.6);
    for (const z of [-1.4, -.1, 1.2]) put('treadmill', -.1, z, WEST, 1.6);
    put('bench', 1.6, 1.8, EAST, 1.6); put('potted_plant', 1.9, -2, 0, 2);
    people_gym(stand); } },
  { garden: true, build: (put, seat, stand) => { // library + garden, reading sofa
    for (const z of [.2, 1.4]) put('bookshelf', BACK + .1, z, EAST, 1.5);
    put('upper_cabinet', BACK + .05, -1.2, EAST, 1.8); put('sofa', -.1, -1.2, PI, 2.2); put('rug', -.1, -1.2, EAST, 2);
    put('tree_round_s', 1.6, .4, 0, 1.9); put('tree_indoor', 1.8, -1.7, 0, 2.5); put('tree_round_s', -.2, 1.7, 0, 1.5); put('potted_plant', 1.0, 1.7, 0, 2);
    seat(-.1, -1.2, PI); stand(1.2, -.2); } },
  { garden: false, build: (put, seat, stand) => { // office: wall desks, art, meeting table, pendants
    for (const z of [-1.6, -.3, 1.0]) { put('desk_monitor', BACK + .5, z, EAST); put('chair_office', -1.0, z, WEST, CHAIR); put('art_panel', BACK + .05, z, EAST, 2); }
    put('meeting_table', .7, -.4, EAST, 1.5);
    for (const z of [-.9, .1]) put('pendant_lamp', .7, z, 0, 1.3, 2.14 - 1.2 * UNITS_PER_METRE * 1.3);
    seat(-1.0, -.3, WEST); seat(.7 + .5, -.4, WEST); stand(1.9, 1.2); } },
  { garden: true, build: (put, seat, stand) => { // cafe + garden
    put('kitchen_counter', BACK + .2, -1.0, EAST, 1.8); put('upper_cabinet', BACK + .05, -1.0, EAST, 1.8);
    for (const z of [-1.4, -.2]) put('pendant_lamp', -.3, z, 0, 1.3, 2.14 - 1.2 * UNITS_PER_METRE * 1.3);
    put('cafe_set', -.2, .3, EAST, 1.8); put('tree_indoor', 1.7, 1.5, 0, 2.5); put('tree_round_s', .4, 1.9, 0, 1.6); put('tree_indoor', 1.8, -1.6, 0, 2.2); put('bench', 1.2, -.1, EAST, 1.8);
    seat(1.2, -.1, EAST); stand(-.9, 1.2); } },
  { garden: false, build: (put, seat, stand) => { // lounge: two sofas around a rug
    for (const z of [-1.5, .4]) put('bookshelf', BACK + .1, z, EAST, 1.5);
    put('art_panel', BACK + .05, 1.7, EAST, 2); put('rug', .3, -.2, EAST, 2.4); put('sofa', -.3, -1.2, EAST, 2); put('sofa', .9, .9, WEST, 2);
    put('floor_lamp', 1.9, -2, 0, TALL); put('floor_lamp', -1.8, 2, 0, TALL);
    seat(-.3, -1.2, EAST); seat(.9, .9, WEST); stand(1.8, -.2); } },
  { garden: true, build: (put, seat, stand) => { // studio + garden
    for (const z of [-1.6, .8]) { put('desk_monitor', BACK + .5, z, EAST); put('art_panel', BACK + .05, z, EAST, 2.1); }
    put('chair_office', -1.0, .8, WEST, CHAIR);
    put('tree_indoor', 1.7, -.3, 0, 2.6); put('tree_round_s', 1.2, 1.8, 0, 1.7); put('tree_round_s', -.1, -1.9, 0, 1.4); put('potted_plant', .3, .6, 0, 2.1); put('floor_lamp', .3, -.9, 0, TALL);
    seat(-1.0, .8, WEST); stand(.9, 1.3); } },
  { garden: false, build: (put, seat, stand) => { // office: shelves, meeting table, pendants, corner sofa
    for (const z of [-1.7, -.6, .5]) put('bookshelf', BACK + .1, z, EAST, 1.5);
    put('meeting_table', .2, .2, EAST, 1.6); put('sofa', 1.4, -1.5, EAST, 1.6); put('rug', 1.4, -1.5, EAST, 1.4);
    for (const z of [-.5, .2, .9]) put('pendant_lamp', .2, z, 0, 1.3, 2.14 - 1.2 * UNITS_PER_METRE * 1.3);
    seat(.2 + .46, .2, WEST); seat(.2 - .46, .2, EAST); stand(1.9, 1.5); } },
];
export const FLOOR_COUNT = FLOORS.length;
const people_gym = (stand: Who) => { stand(-.1, -1.4, EAST, .2); stand(-.1, 1.2, EAST, .2); stand(1.9, 0.3, PI); };

/** Contents of floor `index` (0..12): world-local positions on that floor's slab top. Camera H looks in from +X. */
export function floorKit(index: number): TowerKit {
  const { garden, build } = FLOORS[index];
  const y = LOBBY + index * HF + FLOOR_TOP;
  const props: PropPlacement[] = [], people: Person[] = [];
  const put: Put = (name, x, z, yaw = 0, scale = LOW, lift = 0) => props.push({ name, position: [x, y + lift, z], yaw, scale });
  build(put, (x, z, yaw = EAST, lift = 0) => people.push([x, y + lift, z, true, yaw]), (x, z, yaw = EAST, lift = 0) => people.push([x, y + lift, z, false, yaw]), y);
  void garden;
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

/** Roof garden: a dense low mound on the cap top (R3): four low cluster trees and many overlapping shrubs, nothing above ~2.2 over the cap. */
export function roofKit(): TowerKit {
  const y = TOP + .7, props: PropPlacement[] = [];
  // Camera H looks up at the roof from +X, so crowns need ~2.5 over the cap to clear the near rim (the spec's 2.2 is not visible from H).
  [[2.6, 2.2, 'tree_round_m'], [3.7, 2.1, 'tree_round_m'], [.5, 1.9, 'tree_round_s'], [5.1, 2.0, 'tree_round_s']].forEach(([a, k, name], i) => {
    props.push({ name: name as string, position: [Math.cos(a as number) * 1.6, y, Math.sin(a as number) * 1.6], yaw: i, scale: k as number });
  });
  for (let i = 0; i < 14; i++) {
    const a = i * .9, r = [2.8, 2.2, 1.0][i % 3] + (i % 2) * .15;
    props.push({ name: 'shrub_cluster', position: [Math.cos(a) * r, y, Math.sin(a) * r], yaw: i, scale: 2.1 + (i % 3) * .2 });
  }
  return { props, people: [] };
}

/** Function module `i` (0..5, on floors 1,3,5,7,9,11): a small fit-out relative to that floor's origin, scaled in by the controller. */
export function moduleKit(i: number): TowerKit {
  const y = FLOOR_TOP;
  const name = ['potted_plant', 'floor_lamp', 'shrub_cluster', 'potted_plant', 'floor_lamp', 'shrub_cluster'][i];
  const props: PropPlacement[] = [{ name, position: [1.5, y, -1.6], scale: name === 'floor_lamp' ? TALL : 2 }, { name: 'planter_1m', position: [1.4, y, -2.1], yaw: EAST, scale: 1.8 }];
  return { props, people: [[1.2, y, -1.2, false, EAST]] };
}
