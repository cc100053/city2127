import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { arc, box, leaf, leafyCrown } from './cityRig.ts';
import { amberInlay, automationBlue, glassPane, glow, halo, painted, roomCool, roomWarm, tint, white } from './automationKit.ts';

// R2 metres, built before the bay's own BAY_SCALE: +X along the route, +Z towards it (the review camera sees the +Z long face and the -X end).
// Language of the owner-accepted flagship (siteBuilders/automationHub.ts): white structure, warm night-lit rooms behind faint glass, amber lot edge, articulated arms, quad drones.

/** Hall: 20 x 10 room under a thin slab; roof top, canopy hover and the dock heights below follow these. */
export const HALL_W = 20, HALL_ZB = -8, HALL_ZF = 2, HALL_ROOF = 7, HALL_OVER = 1.5;
const FLOOR = .5, SLAB = .5, GLASS = HALL_ROOF - SLAB - FLOOR, HALL_D = HALL_ZF - HALL_ZB;
/** Centre of the roof slab: column and canopy stand on it. */
export const HALL_Z = (HALL_ZB - .2 + HALL_ZF + HALL_OVER) / 2;
/** Canopy lens half thickness and centre: ~3/4 of the roof's width, its underside floating 3 above the slab. */
export const LENS = 1.3, CANOPY_GAP = 3, CANOPY_R = 8.8, CANOPY_Y = HALL_ROOF + CANOPY_GAP + LENS;
/** Service column above the hall's roof (y = 0 is the roof surface): docking rings and the top ring's landing pad. */
const COLUMN_R = 1.8, COLUMN_RINGS = [8, 11, 14, 17], COLUMN_SHAFT = 19, COLUMN_RING_R = 4.6, COLUMN_TUBE = .9;
export const COLUMN_PAD = COLUMN_RINGS[3] + COLUMN_TUBE / 2, COLUMN_DOCK_X = COLUMN_RING_R + 1.1;
/** Autonomous tower: 12 (design 0) or 10 (design 1) closely stacked rings, .8 thick at a 1.3 pitch (gap .5), above the 5 m lobby. */
const RING0 = 11, PITCH = 1.3, THICK = .8, RING_R = 3.6, PORT_RINGS = 12, MAST_RINGS = 10;
export const PORT_TOP = RING0 + (PORT_RINGS - 1) * PITCH + THICK / 2;
const MAST_CORE = RING0 + (MAST_RINGS - 1) * PITCH + THICK / 2 + .8, MAST_DISC = MAST_CORE + 1.5 + .3;
export const MAST_TOP = MAST_DISC + .3;
/** Radius at which a tower's drones circle, per design (the mast's landing disc is wider than the port's rings). */
export const TOWER_RING_R = [RING_R, 5.5] as const;
export const TOWER_RING0 = RING0, TOWER_PITCH = PITCH, TOWER_RINGS = [PORT_RINGS, MAST_RINGS] as const;

const FOLK = ['#3b5877', '#7a4e34', '#4a7a46', '#7d3a56', '#555563', '#98762f', '#2c5a52'], SKIN = ['#efd0b0', '#dcb28c', '#c4926c'], DARK = '#2b3a47';
/** One painted piece (see `tint`): lands in the shared `painted` batch of whichever group it is baked with. */
const piece = (parent: T.Object3D, geometry: T.BufferGeometry, color: T.ColorRepresentation, x: number, y: number, z: number) => {
  const mesh = new T.Mesh(tint(geometry, color), painted); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
};
const paintBox = (parent: T.Object3D, [w, h, d]: [number, number, number], [x, y, z]: [number, number, number], color: T.ColorRepresentation) => piece(parent, new T.BoxGeometry(w, h, d), color, x, y, z);
/** Lit-room piece: a box in the vertex-coloured warm room material. */
const lit = (parent: T.Object3D, [w, h, d]: [number, number, number], [x, y, z]: [number, number, number], color: T.ColorRepresentation, material: T.Material = roomWarm) => {
  const mesh = new T.Mesh(tint(new T.BoxGeometry(w, h, d), color), material); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
};
const cyl = (parent: T.Object3D, r0: number, r1: number, h: number, y: number, x = 0, z = 0, material: T.Material = white) => {
  const mesh = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 32), material); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
};
/** Thin dark joint ring around a shaft. */
const joint = (parent: T.Object3D, r: number, y: number, x = 0, z = 0) => piece(parent, new T.CylinderGeometry(r, r, .1, 32), DARK, x, y, z);

/** Resident at architecture scale: 1.8 m before the bay's own scaling (so ~3.5 m against an 11 m glazed storey). Faces +Z at yaw 0. */
function person(parent: T.Object3D, x: number, z: number, i: number, { y = FLOOR, yaw = 0, seated = false } = {}) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = yaw; parent.add(g);
  const body = FOLK[i % FOLK.length];
  if (seated) {
    paintBox(g, [.42, .18, .55], [0, .45, .12], DARK); paintBox(g, [.4, .42, .2], [0, .21, .4], DARK);
    piece(g, new T.CapsuleGeometry(.25, .4, 3, 8), body, 0, .88, 0); piece(g, new T.SphereGeometry(.19, 10, 8), SKIN[i % SKIN.length], 0, 1.45, 0);
  } else {
    paintBox(g, [.42, .52, .26], [0, .26, 0], DARK);
    piece(g, new T.CapsuleGeometry(.25, .4, 3, 8), body, 0, .97, 0); piece(g, new T.SphereGeometry(.19, 10, 8), SKIN[i % SKIN.length], 0, 1.6, 0);
  }
}
/** `n` residents in a ring of radius `r` facing each other. */
const cluster = (parent: T.Object3D, cx: number, cz: number, n: number, seed: number, r = .6, y = FLOOR) => {
  for (let j = 0; j < n; j++) { const a = j * Math.PI * 2 / n + seed; person(parent, cx + Math.sin(a) * r, cz + Math.cos(a) * r, Math.floor(seed * 3) + j, { y, yaw: a + Math.PI }); }
};
/** Self-service terminal facing local +Z: a white housing on a post with a cool screen. */
function terminal(parent: T.Object3D, x: number, y: number, z: number, yaw = 0, h = 1.5) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = yaw; parent.add(g);
  box(g, [.2, h, .2], [0, h / 2, 0], white, .02);
  box(g, [.95, .75, .16], [0, h + .1, 0], white, .03);
  box(g, [.78, .58, .03], [0, h + .12, .09], automationBlue, .01);
}
const bench = (parent: T.Object3D, x: number, z: number) => {
  box(parent, [2.4, .14, .7], [x, FLOOR + .5, z], white, .03);
  for (const s of [-1, 1]) box(parent, [.16, .45, .6], [x + s * 1, FLOOR + .25, z], white, .02);
};
const treeAt = (parent: T.Object3D, x: number, z: number, s = 1) => {
  piece(parent, new T.CylinderGeometry(.14 * s, .2 * s, 1.5 * s, 8), '#8a6a4a', x, FLOOR + .75 * s, z);
  const crown = new T.Mesh(leafyCrown(1), leaf); crown.position.set(x, FLOOR + 2 * s, z); crown.scale.setScalar(1.15 * s); crown.castShadow = true; parent.add(crown);
};
/** Amber inlay along every edge of a plinth of half size (hx, hz), flush on its top at `top`. */
const amberEdge = (parent: T.Object3D, hx: number, hz: number, top = FLOOR) => {
  const w = .35, y = top + .02;
  for (const s of [-1, 1]) {
    box(parent, [hx * 2 - w * 2 - .3, .04, w], [0, y, s * (hz - w / 2 - .1)], amberInlay, .01);
    box(parent, [w, .04, hz * 2 - .2], [s * (hx - w / 2 - .1), y, 0], amberInlay, .01);
  }
};

/** Room wall in three lit bands, deep peach below to near-white above (vertex colours of `roomWarm`). */
const warmWall = (w: number, h: number) => {
  const wall = new T.PlaneGeometry(w, h, 1, 6), shades = new Float32Array(14 * 3), low = new T.Color('#ec8f45'), high = new T.Color('#ffd7a3'), c = new T.Color();
  for (let v = 0; v < 14; v++) c.copy(low).lerp(high, 1 - Math.floor(v / 2) / 6).toArray(shades, v * 3);
  return wall.setAttribute('color', new T.BufferAttribute(shades, 3));
};

/** Staffed pavilion: a warm, peopled hall glazed on its +Z face and both ends (corner piers only), a thin slab overhanging the glass, and a forecourt on its plinth. */
export function buildPavilion(): T.Group {
  const g = new T.Group(), W = HALL_W, zc = (HALL_ZB + HALL_ZF) / 2, mid = FLOOR + GLASS / 2, topY = FLOOR + GLASS;
  box(g, [24, FLOOR, 18], [0, FLOOR / 2, 0], white, .05);
  amberEdge(g, 12, 9);
  // Warm room: floor pool, graded back wall, the far end wall and a hot ceiling cove behind the faint glass.
  lit(g, [W - .4, .02, HALL_D - .4], [0, FLOOR + .01, zc], '#f2a05c');
  lit(g, [W - .4, .08, HALL_D - .4], [0, topY - .06, zc], '#ffd29a');
  const back = new T.Mesh(warmWall(W - .5, GLASS - .1), roomWarm); back.position.set(0, FLOOR + GLASS / 2, HALL_ZB + .4); g.add(back);
  const east = new T.Mesh(warmWall(HALL_D - .5, GLASS - .1), roomWarm); east.rotation.y = -Math.PI / 2; east.position.set(W / 2 - .7, FLOOR + GLASS / 2, zc); g.add(east);
  // Structure: solid back wall, corner piers, 4 thin mullions across the front and 2 on each end, sills and head rails, faint panes.
  box(g, [W, GLASS, .3], [0, mid, HALL_ZB + .15], white, .03);
  for (const x of [-6.6, 0, 6.6]) box(g, [.12, GLASS - .6, .04], [x, mid, HALL_ZB - .01], automationBlue, .01); // seams on the solid back, seen from the district shot
  for (const sx of [-1, 1]) for (const z of [HALL_ZB + .25, HALL_ZF - .25]) box(g, [.5, GLASS, .5], [sx * (W / 2 - .25), mid, z], white, .04);
  for (let k = 1; k < 5; k++) box(g, [.12, GLASS, .14], [-W / 2 + k * W / 5, mid, HALL_ZF - .07], white, .01);
  for (const sx of [-1, 1]) for (let k = 1; k < 3; k++) box(g, [.14, GLASS, .12], [sx * (W / 2 - .07), mid, HALL_ZB + k * HALL_D / 3], white, .01);
  box(g, [W, .22, .2], [0, FLOOR + .11, HALL_ZF - .1], white, .02);
  box(g, [W, .18, .2], [0, topY - .09, HALL_ZF - .1], white, .02);
  for (const sx of [-1, 1]) { box(g, [.2, .22, HALL_D], [sx * (W / 2 - .1), FLOOR + .11, zc], white, .02); box(g, [.2, .18, HALL_D], [sx * (W / 2 - .1), topY - .09, zc], white, .02); }
  lit(g, [W - .6, GLASS, .02], [0, mid, HALL_ZF - .03], '#ffffff', glassPane);
  for (const sx of [-1, 1]) lit(g, [.02, GLASS, HALL_D - .6], [sx * (W / 2 - .03), mid, zc], '#ffffff', glassPane);
  // Thin roof slab, overhanging the glazed sides, with a dark line under its edge and a pale landing disc.
  const slabFront = HALL_ZF + HALL_OVER, slabBack = HALL_ZB - .2;
  box(g, [W + 2 * HALL_OVER, SLAB, slabFront - slabBack], [0, HALL_ROOF - SLAB / 2, (slabFront + slabBack) / 2], white, .06);
  paintBox(g, [W + 2 * HALL_OVER - .1, .14, .1], [0, HALL_ROOF - SLAB - .07, slabFront - .06], DARK);
  for (const sx of [-1, 1]) paintBox(g, [.1, .14, slabFront - slabBack - .1], [sx * (W / 2 + HALL_OVER - .06), HALL_ROOF - SLAB - .07, (slabFront + slabBack) / 2], DARK);
  piece(g, new T.CylinderGeometry(6, 6, .06, 40), '#e2e6eb', 0, HALL_ROOF + .03, HALL_Z);
  // Four counters, staff behind each, a resident across it; the east end carries three self-service terminals with a resident at one.
  for (let k = 0; k < 4; k++) {
    const x = -4.6 + k * 2.8, z = -3.6;
    box(g, [2.5, 1.1, 1], [x, FLOOR + .55, z], white, .05);
    box(g, [1.1, .5, .06], [x, FLOOR + 1.45, z - .15], automationBlue, .01);
    lit(g, [2.9, .02, 2.4], [x, FLOOR + .03, z + .4], '#ffc27d');
    box(g, [.6, .4, .6], [x, FLOOR + .2, z - 1.75], white, .04);
    person(g, x, z - 1.45, k, { seated: true }); // staff sit behind the counter, facing the residents
    if (k % 2) { box(g, [.6, .4, .6], [x, FLOOR + .2, z + 1.5], white, .04); person(g, x, z + 1.5, k + 4, { yaw: Math.PI, seated: true }); }
    else person(g, x, z + 1.6, k + 4, { yaw: Math.PI });
  }
  // The west end faces the review camera square-on: three terminals in a row (screens towards the glass) with a resident at the middle one. The east end meets the megastructure's skirt.
  for (const z of [-6.4, -4.5, -2.6]) terminal(g, -7.5, FLOOR, z, -Math.PI / 2);
  person(g, -8.7, -4.5, 11, { yaw: Math.PI / 2 }); person(g, -8.6, -1.4, 12, { yaw: .9 });
  // Forecourt on the plinth: benches, three small trees, three groups of residents talking.
  bench(g, -7.8, 7.7); bench(g, .4, 7.9); bench(g, 7.6, 7.7);
  treeAt(g, -10.4, 5.3, 1.05); treeAt(g, 10.6, 5.8, .95); treeAt(g, -3.9, 8, .8);
  cluster(g, -6, 5.5, 3, .3); cluster(g, 1.6, 6, 3, 1.4); cluster(g, 7, 4.9, 3, 2.2);
  return g;
}

/** Floating canopy: a thick lens (~3/4 of the roof's width) centred over the roof with a clear gap under it, a thin blue rim seam and four bright white-blue emitter pads, each in a soft additive halo. */
export function buildCanopy(): T.Group {
  const g = new T.Group(), R = CANOPY_R;
  const lens = new T.Mesh(new T.LatheGeometry([[0, -LENS], [R * .45, -1.15], [R * .77, -.7], [R * .95, -.2], [R, 0], [R * .95, .2], [R * .68, .75], [R * .32, 1.2], [0, LENS]].map(([r, y]) => new T.Vector2(r, y)), 56), white);
  lens.position.set(0, CANOPY_Y, HALL_Z); lens.castShadow = true; g.add(lens);
  const rim = new T.Mesh(new T.TorusGeometry(R, .12, 6, 64).rotateX(Math.PI / 2), automationBlue); rim.position.copy(lens.position); g.add(rim);
  // The review camera looks down at ~10 degrees from the -X/+Z side: pads on that rim hang just outside the lens edge, where they are seen below it.
  for (const a of [-65, -22, 22, 65].map(d => (138 + d) * Math.PI / 180)) {
    const x = Math.cos(a) * (R + .3), z = HALL_Z + Math.sin(a) * (R + .3), y = CANOPY_Y - 1;
    const pad = new T.Mesh(new T.SphereGeometry(1.1, 16, 8).scale(1, .45, 1), glow); pad.position.set(x, y, z);
    const light = new T.Mesh(mergeGeometries([1.1, 1.5, 1.9, 2.3, 2.7].map(r => new T.SphereGeometry(r, 16, 12).toNonIndexed())), halo); light.position.set(x, y - .1, z);
    g.add(pad, light);
  }
  return g;
}

/** Cantilevered landing pad off a ring: the drone's whole column must clear the core, whatever the bay's yaw. */
const pad = (g: T.Object3D, ring: number, top: number, z: number) => {
  cyl(g, 2.2, 2.2, .4, top - .2, ring + 1.1, z);
  box(g, [2, .4, .8], [ring, top - .2, z], white, .04);
};
/** Flagship-style articulated arm: dark base disc and joints, two white segments, wrist, gripper and an amber parcel. Reaches +X (turned by `yaw`). */
function robotArm(parent: T.Object3D, x: number, y: number, z: number, scale: number, yaw = 0) {
  const a = new T.Group(); a.position.set(x, y, z); a.rotation.y = yaw; a.scale.setScalar(scale); parent.add(a);
  const link = (x0: number, y0: number, x1: number, y1: number, t: number) => {
    const m = box(a, [Math.hypot(x1 - x0, y1 - y0), t, t], [(x0 + x1) / 2, (y0 + y1) / 2, 0], white, .05); m.rotation.z = Math.atan2(y1 - y0, x1 - x0);
  };
  piece(a, new T.CylinderGeometry(.8, .95, .3, 24), DARK, 0, .15, 0);
  link(0, .9, 1.7, 3.5, .38);
  piece(a, new T.SphereGeometry(.36, 12, 8), DARK, 0, .9, 0);
  piece(a, new T.SphereGeometry(.32, 12, 8), DARK, 1.7, 3.5, 0);
  link(1.7, 3.5, 3.3, 2.4, .32);
  piece(a, new T.SphereGeometry(.24, 12, 8), DARK, 3.3, 2.4, 0);
  paintBox(a, [.9, .14, .7], [3.3, 2.1, 0], DARK);
  for (const s of [-1, 1]) paintBox(a, [.12, .7, .1], [3.3, 1.75, s * .38], DARK);
  paintBox(a, [.8, .7, .7], [3.3, 1.55, 0], '#e9a24f');
}

/** Hybrid service column from the hall roof (y = 0): a stout panelled core with blue seams, two small window modules, a collar, four thick docking rings (flat deck, bright blue edge), a stepped cap and a long needle spire; an articulated arm stands on the roof's camera side. */
export function buildColumn(): T.Group {
  const g = new T.Group(), top = COLUMN_SHAFT, cam = -.84; // `cam`: the bearing of the review camera from +Z
  cyl(g, COLUMN_R, COLUMN_R, top, top / 2, 0, HALL_Z);
  for (let y = 2.5; y < top; y += 2.5) joint(g, COLUMN_R + .04, y, 0, HALL_Z);
  for (const a of [cam + .55, cam - .55]) { const seam = new T.Mesh(new T.BoxGeometry(.2, top - 3, .1), automationBlue); seam.rotation.y = a; seam.position.set(Math.sin(a) * (COLUMN_R + .02), top / 2 + .5, HALL_Z + Math.cos(a) * (COLUMN_R + .02)); g.add(seam); }
  // Two window modules between the rings, facing the camera.
  for (const y of [9.5, 15.5]) {
    const m = new T.Group(); m.rotation.y = cam; m.position.set(Math.sin(cam) * COLUMN_R, y, HALL_Z + Math.cos(cam) * COLUMN_R); g.add(m);
    box(m, [2.4, 1.7, .5], [0, 0, 0], white, .06);
    for (const x of [-.55, .55]) box(m, [.65, .55, .06], [x, .1, .27], automationBlue, .01);
    box(m, [1.9, .1, .06], [0, -.6, .27], automationBlue, .01);
  }
  cyl(g, COLUMN_R + .45, COLUMN_R + .45, .8, .4, 0, HALL_Z);
  cyl(g, COLUMN_R + .5, COLUMN_R + .5, .1, .55, 0, HALL_Z, automationBlue);
  for (const y of COLUMN_RINGS) {
    arc(g, COLUMN_R, COLUMN_RING_R, COLUMN_TUBE, [0, y - COLUMN_TUBE / 2, HALL_Z], white);
    arc(g, COLUMN_RING_R, COLUMN_RING_R + .14, .38, [0, y + COLUMN_TUBE / 2 - .38, HALL_Z], automationBlue);
  }
  pad(g, COLUMN_RING_R, COLUMN_PAD, HALL_Z);
  cyl(g, COLUMN_R + .3, COLUMN_R, .9, top + .45, 0, HALL_Z);
  cyl(g, 1.2, 1.2, 1.2, top + 1.5, 0, HALL_Z);
  cyl(g, .7, .7, .5, top + 2.35, 0, HALL_Z);
  cyl(g, .1, .5, 8, top + 6.6, 0, HALL_Z); // tapering to the tip
  for (const y of [top + 4, top + 6.2]) cyl(g, .45 - (y - top - 4) * .1, .45 - (y - top - 4) * .1, .16, y, 0, HALL_Z, automationBlue);
  robotArm(g, -3.2, 0, HALL_Z + .6, 1.2, -.84);
  return g;
}

/** Plinth, glazed cool-blue lobby (back wall solid, glazing on the +Z face and both ends), terminals and parcel locker, residents outside. */
function foot(g: T.Group) {
  const LW = 10, LD = 8, LH = 5, z0 = -5.5, zc = z0 + LD / 2, top = FLOOR + LH, zF = z0 + LD;
  box(g, [16, FLOOR, 12], [0, FLOOR / 2, 0], white, .05);
  amberEdge(g, 8, 6);
  lit(g, [LW - .4, .02, LD - .4], [0, FLOOR + .01, zc], '#ffffff', roomCool);
  lit(g, [LW - .4, .08, LD - .4], [0, top - .06, zc], '#ffffff', roomCool);
  lit(g, [LW - .5, LH - .1, .04], [0, FLOOR + LH / 2, z0 + .4], '#ffffff', roomCool);
  lit(g, [.04, LH - .1, LD - .5], [LW / 2 - .6, FLOOR + LH / 2, zc], '#ffffff', roomCool);
  box(g, [LW, LH, .3], [0, FLOOR + LH / 2, z0 + .15], white, .03);
  for (const sx of [-1, 1]) for (const z of [z0 + .25, zF - .25]) box(g, [.5, LH, .5], [sx * (LW / 2 - .25), FLOOR + LH / 2, z], white, .04);
  for (let k = 1; k < 4; k++) box(g, [.12, LH, .14], [-LW / 2 + k * LW / 4, FLOOR + LH / 2, zF - .07], white, .01);
  for (const sx of [-1, 1]) for (let k = 1; k < 3; k++) box(g, [.14, LH, .12], [sx * (LW / 2 - .07), FLOOR + LH / 2, z0 + k * LD / 3], white, .01);
  box(g, [LW, .2, .2], [0, FLOOR + .1, zF - .1], white, .02);
  box(g, [LW + 1, .4, LD + .6], [0, top + .2, zc + .3], white, .05);
  paintBox(g, [LW + .9, .12, .1], [0, top - .06, zF + .55], DARK);
  // Four glowing terminals at the front, two of them in use; a parcel locker at the east end; residents on the apron.
  for (const x of [-3.3, -1.1, 1.1, 3.3]) terminal(g, x, FLOOR, zF + 1.2, 0, 1.4);
  for (const [i, x] of [-1.1, 1.1].entries()) person(g, x, zF + 2.2, i, { yaw: Math.PI });
  person(g, 5.6, zF + 2.6, 4, { yaw: 1 }); person(g, 6.4, zF + 2.4, 5, { yaw: -2.1 }); person(g, -6.4, zF + 2.4, 6, { yaw: 2.4 });
  box(g, [1.8, 2.6, 1], [-6.6, FLOOR + 1.3, 0], white, .05);
  box(g, [1.2, .5, .04], [-6.6, FLOOR + 2.1, .52], automationBlue, .01);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) paintBox(g, [.42, .5, .04], [-7.2 + c * .6, FLOOR + .55 + r * .6, .52], '#e9a24f');
}

/** Tower of `rings` closely stacked rings with blue seams around a panelled core; every second ring carries a small service arm when `armed`. */
function tower(g: T.Group, rings: number, armed: boolean) {
  foot(g);
  const base = FLOOR + 5.4, coreTop = RING0 + (rings - 1) * PITCH + THICK / 2 + .8;
  cyl(g, 1.4, 1.4, coreTop - base, (coreTop + base) / 2);
  for (let y = base + 1.3; y < RING0 - .5; y += 1.3) joint(g, 1.44, y);
  for (let k = 0; k < rings; k++) {
    const y = RING0 + k * PITCH;
    if (k) joint(g, 1.44, y - PITCH / 2);
    arc(g, 1.4, RING_R, THICK, [0, y - THICK / 2, 0], white);
    arc(g, RING_R, RING_R + .1, .26, [0, y - .13, 0], automationBlue);
    if (armed && k % 3 === 1) { const a = -.5 - k * .9; robotArm(g, Math.cos(a) * 3.2, y + THICK / 2, Math.sin(a) * 3.2, .4, -a); } // outward past the ring above
  }
  for (const a of [.7, -.7]) { const seam = new T.Mesh(new T.BoxGeometry(.16, coreTop - base - 1, .1), automationBlue); seam.rotation.y = a; seam.position.set(Math.sin(a) * 1.43, (coreTop + base) / 2, Math.cos(a) * 1.43); g.add(seam); }
  return coreTop;
}

/** Design 0: twelve rings under a stepped cap and an antenna; the top ring carries the drone's pad. */
export function buildPort(): T.Group {
  const g = new T.Group(), coreTop = tower(g, PORT_RINGS, true);
  cyl(g, 1.5, 1.5, .8, coreTop + .4); cyl(g, 1, 1, 1.2, coreTop + 1.4);
  cyl(g, .12, .12, 4, coreTop + 4);
  pad(g, RING_R, PORT_TOP, 0);
  return g;
}

/** Design 1: ten rings under a floating landing disc. */
export function buildMast(): T.Group {
  const g = new T.Group();
  tower(g, MAST_RINGS, false);
  cyl(g, 5.5, 5.5, .6, MAST_DISC);
  const edge = new T.Mesh(new T.TorusGeometry(5.5, .2, 6, 48).rotateX(Math.PI / 2), automationBlue); edge.position.y = MAST_TOP; g.add(edge);
  return g;
}
