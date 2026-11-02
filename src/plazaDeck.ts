import * as T from 'three';
import { arc, bake, box, leaf, paint } from './cityRig.ts';
import { hash, plantClusters, plantShrubs } from './coastalCanopy.ts';
import { megaGlass, megaRib, megaSeam, megaShell } from './megastructures.ts';
import { publishRoofGardens } from './districtMeters.ts';
import { publishOccupants, publishRoofWalks, type Spot, type Walk } from './occupants.ts';
import { AIR_AT, PLAZA, plazaAt, plazaWalks, VOICES_AT } from './layout.ts';
import { glowTexture } from './glowTexture.ts';
import { deck, offsetTube, pierFree } from './skyways.ts';

// P4 (city-taste-v2): the former Aqua City lot is a civic plaza deck — one white storey, ivory paving with ring and radial inlay, a light-ring
// fountain, two rings of planted terraces and residents — with sweeping elevated walkways to the ring plinth, the civic core and the hull apron,
// and masts carrying the live voices and data hologram panels. Metres.
const ivory = paint('#e9e5da', .8), pool = paint('#7fb6cc', .12, .2), band = paint('#d3d6d2', .8);
const fascia = paint('#c9d0d4', .6), shadow = paint('#98a3a9', .6); // walkway underside and its darker shadow band
const walkSeam = megaSeam.clone(); // day 1.0, night 2.4 (updatePlaza)
const jet = new T.MeshBasicMaterial({ color: '#dff2ff', transparent: true, opacity: .32, blending: T.AdditiveBlending, depthWrite: false });
/** P5 hovering planter discs over the plaza: white machine rim, seam under-ring, emitter plate, a shrub mass and one tree each (no rock look). One group, bobbing +/-.4 m over 7 s. */
const hover = new T.Group();
export const updateHoverBeds = (now: number) => { hover.position.y = Math.sin(now * Math.PI * 2 / 7) * .4; };
function hoverBeds(scene: T.Object3D) {
  hover.name = 'hover-beds';
  const shrubs: [number, number, number, number, number][] = [], part = (geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) => { const m = new T.Mesh(geometry, material); m.position.set(x, y, z); hover.add(m); };
  ([[Math.PI / 4, 10], [Math.PI * .75, 13], [Math.PI * 1.25, 11], [Math.PI * 1.75, 15]] as const).forEach(([a, R], k) => {
    const [x, z] = plazaAt(Math.cos(a) * 42, Math.sin(a) * 22), y = top + 5 + (k % 2) * 1.5;
    part(new T.CylinderGeometry(R, R * .86, 1.6, 40), megaShell, x, y, z); // rim
    part(new T.CylinderGeometry(R * .8, R * .4, 1.6, 40), megaShell, x, y - 1.3, z); // machine hull
    part(new T.CylinderGeometry(R * .93, R * .93, .3, 40), megaSeam, x, y - .55, z); // under-ring seam (proud of the tapered rim)
    part(new T.CylinderGeometry(R * .4, R * .4, .12, 32), megaSeam, x, y - 2.15, z); // emitter plate
    part(new T.CylinderGeometry(R - .5, R - .5, .12, 40), leaf, x, y + .86, z); // bed
    part(new T.CylinderGeometry(.35, .5, 3, 8), megaShell, x + R * .2, y + 2, z); // tree stem (a white pylon)
    shrubs.push([x + R * .2, y + 3.2, z, 3.4, 3.6]); // the one tree's crown
    const n = Math.round(R * 4.4 / 3.4);
    for (let j = 0; j < n; j++) { const b = j / n * Math.PI * 2 + k; shrubs.push([x + Math.cos(b) * R * .74, y + .6, z + Math.sin(b) * R * .74, 1.8 + hash(k * 30 + j) * .6, 1 + hash(k * 30 + j + 3) * .4]); }
    shrubs.push([x - R * .25, y + .6, z, R * .3, 1.5]);
  });
  const merged = bake(hover); merged.forEach(mesh => { mesh.name = 'hover-beds'; mesh.castShadow = mesh.material !== megaSeam; });
  hover.add(...merged); plantShrubs(hover, shrubs); scene.add(hover);
}
// P7 r2: soft cool lamp pools (one instanced additive decal, no lights) on a ~30 m grid over the deck and along the walkways, plus a faint lit paving.
const poolMat = new T.MeshBasicMaterial({ color: '#dfeeff', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false });
const pools: T.Vector3[] = [];
ivory.emissive.set('#2a3340');
export const updatePlaza = (night: number) => { walkSeam.emissiveIntensity = 1 + night * 1.4; poolMat.opacity = .35 * night; ivory.emissiveIntensity = night; };
function lampPools(root: T.Object3D) {
  if (typeof document === 'undefined') return;
  poolMat.map = glowTexture();
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, pools.length), m = new T.Matrix4();
  pools.forEach((p, i) => mesh.setMatrixAt(i, m.compose(p, new T.Quaternion(), new T.Vector3(17, 1, 17))));
  mesh.name = 'plaza-lamp-pools'; mesh.frustumCulled = false; mesh.renderOrder = 2; root.add(mesh);
}
const column = new T.CylinderGeometry(1, 1, 1, 10);
type P3 = readonly [number, number, number];
const pts = (list: readonly P3[]) => new T.CatmullRomCurve3(list.map(p => new T.Vector3(...p)), false, 'centripetal');
const top = PLAZA.h + .25;

function walkway(root: T.Object3D, curve: T.Curve<T.Vector3>) {
  const length = curve.getLength(), samples = Math.ceil(length / 3);
  // White 9 m top slab on a grey fascia and underside whose upper 1.2 m is a darker shadow band, so the white separates from the pale ground.
  const slab = new T.Mesh(deck(curve, 9, .3, samples), megaShell); root.add(slab);
  const under = new T.Mesh(deck(curve, 8.7, 1.5, samples), fascia); under.position.y = -.3; root.add(under);
  const dark = new T.Mesh(deck(curve, 8.76, 1.2, samples), shadow); dark.position.y = -.3; root.add(dark);
  const lawn = new T.Mesh(deck(curve, 2.2, .3, samples), leaf); lawn.position.y = .3; root.add(lawn); // planted strip down the deck, as the garden decks
  for (const side of [-4.5, 4.5]) root.add(new T.Mesh(offsetTube(curve, side, .05, .42, false), walkSeam));
  for (let d = 15; d < length - 8; d += 30) {
    const p = curve.getPointAt(d / length);
    pools.push(new T.Vector3(p.x, p.y + .45, p.z));
    if (p.y < top + 1.5 || !pierFree(p.x, p.z)) continue;
    const c = new T.Mesh(column, megaShell); c.scale.set(.75, p.y - 1.7, .75); c.position.set(p.x, (p.y - 1.7) / 2, p.z); root.add(c);
    const collar = new T.Mesh(column, walkSeam); collar.scale.set(1, .3, 1); collar.position.set(p.x, p.y - 1.9, p.z); root.add(collar);
  }
}
/** A white mast and cradle rooted on the deck, carrying a hologram panel of `w` m centred at (`x`, `y`, `z`), turned toward `face`. */
function mast(root: T.Object3D, [x, z]: readonly [number, number], y: number, w: number, h: number, face: readonly number[]) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(face[0] - x, face[2] - z); root.add(g);
  const bottom = y - h / 2 - .5;
  box(g, [1.8, .4, 1.8], [0, top + .2, 0], megaShell, .05);
  const post = new T.Mesh(column, megaShell); post.scale.set(.4, bottom - top, .4); post.position.set(0, (bottom + top) / 2, 0); g.add(post);
  box(g, [w * .8, .35, .5], [0, bottom + .2, -.25], megaShell, .05);
  for (const s of [-1, 1]) box(g, [.25, .9, .5], [s * w * .4, bottom + .65, -.25], megaShell, .05);
  const ring = new T.Mesh(column, walkSeam); ring.scale.set(.65, .2, .65); ring.position.set(0, bottom - .8, 0); g.add(ring);
}

/** The plaza deck (one baked group, ~9 draws), its planted terraces and people, the masts and the elevated walkways. */
export function plazaDeck(scene: T.Object3D, panels: readonly { id: string; at: readonly number[]; w: number; h: number; face: readonly number[] }[] = []) {
  const root = new T.Group(); root.name = 'plaza-deck';
  const g = new T.Group(); g.position.set(PLAZA.x, 0, PLAZA.z); g.rotation.y = PLAZA.yaw; root.add(g);
  const { hu, hv, h } = PLAZA;
  pools.length = 0;
  for (const [x, z] of [[-60, -20], [-60, 20], [-30, -20], [-30, 20], [30, -20], [30, 20], [60, -20], [60, 20], [0, -30], [0, 30], [-45, 0], [45, 0]]) { const [wx, wz] = plazaAt(x, z); pools.push(new T.Vector3(wx, h + .45, wz)); }
  box(g, [hu * 2, h, hv * 2], [0, h / 2, 0], megaShell, .2);
  box(g, [hu * 2 + .3, 1.3, hv * 2 + .3], [0, 3.1, 0], megaGlass, .1); // glazed storey band round the podium
  box(g, [hu * 2 - 1, .25, hv * 2 - 1], [0, h + .1, 0], ivory, .05);
  // Radial paving bands (wider grey strips from the pool to the deck edge) and ring inlays, so the plaza reads patterned from a distance.
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), end = Math.min(c > 1e-6 ? (hu - 2) / c : 1e9, s > 1e-6 ? (hv - 2) / s : 1e9), len = end - 12;
    const b = box(g, [len, .04, 3.6], [Math.cos(a) * (12 + len / 2), top - .005, -Math.sin(a) * (12 + len / 2)], band, .015); b.rotation.y = a;
  }
  for (const r of [14, 24, 36]) arc(g, r - .25, r + .25, .06, [0, top + .01, 0], megaRib);
  // Light-ring fountain: shallow pool, a thin seam ring 1.5 m above the water on six posts, and six soft additive jets.
  arc(g, 0, 9, .3, [0, h, 0], pool);
  arc(g, 8.8, 9.3, .14, [0, h + 1.5, 0], megaSeam);
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3, post = new T.Mesh(column, megaShell); post.scale.set(.1, 1.5, .1); post.position.set(Math.cos(a) * 9.05, h + .75, Math.sin(a) * 9.05); g.add(post);
    const a2 = a + Math.PI / 6, j = new T.Mesh(new T.CylinderGeometry(.08, .22, 1, 8), jet); j.scale.set(1, 3.2 + (k % 2) * 1.3, 1); j.position.set(Math.cos(a2) * 5, h + .15 + j.scale.y / 2, Math.sin(a2) * 5); g.add(j);
  }
  arc(g, 9.3, 9.9, .12, [0, top + .02, 0], megaSeam);
  for (const [w, d, x, z] of [[hu * 2, .5, 0, hv - .25], [hu * 2, .5, 0, -hv + .25], [.5, hv * 2, hu - .25, 0], [.5, hv * 2, -hu + .25, 0]]) box(g, [w, .15, d], [x, top + .05, z], megaSeam, .03);
  // Broad ramps down to the ground at both ends of the deck, and a second ring set round each end.
  for (const side of [1, -1]) {
    const shape = new T.Shape().moveTo(0, 0).lineTo(18, 0).lineTo(0, h).lineTo(0, 0);
    const m = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: 26, bevelEnabled: false }).translate(0, 0, -13), megaShell); m.rotation.y = side > 0 ? 0 : Math.PI; m.position.set(side * hu, 0, 0); g.add(m);
    for (const r of [8, 15]) arc(g, r - .25, r + .25, .06, [side * 55, top + .01, 0], megaRib);
  }
  // Planted terraces (the roof-garden Meter and strollers read these) on two rings round the fountain: 6 inner and 8 outer.
  const ring = (n: number, a0: number, rx: number, rz: number, r: number) => Array.from({ length: n }, (_, k) => {
    const a = a0 + k * 2 * Math.PI / n, [x, z] = plazaAt(Math.cos(a) * rx, Math.sin(a) * rz);
    return [x, z, h + .25, r + (k % 2) * .5] as [number, number, number, number];
  });
  const clusters = [...ring(6, Math.PI / 6, 22, 22, 4.6), ...ring(8, Math.PI / 8, 62, 33, 5.2)];
  plantClusters(scene, clusters, .6); publishRoofGardens(clusters);
  hoverBeds(scene);
  for (const p of panels) if (p.id === 'voices' || p.id === 'air') mast(root, p.id === 'voices' ? VOICES_AT : AIR_AT, p.at[1], p.w, p.h, p.face);
  root.updateMatrixWorld(true);
  const roofPeople = publishRoofWalks(root, clusters);
  // Loose flows along the radial bands and the ring inlay, and standing groups beside every planter.
  const spots: Spot[] = [], walks: Walk[] = [];
  const line = (a: number, f0: number, f1: number, off: number) => {
    const at = (f: number) => plazaAt(Math.cos(a) * 68 * f - Math.sin(a) * off, Math.sin(a) * 34 * f + Math.cos(a) * off);
    const [x0, z0] = at(f0), [x1, z1] = at(f1); return new T.LineCurve3(new T.Vector3(x0, top, z0), new T.Vector3(x1, top, z1));
  };
  const arcCurve = (r: number, a0: number, a1: number) => new T.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => { const a = a0 + (a1 - a0) * i / 8, [x, z] = plazaAt(Math.cos(a) * r, Math.sin(a) * r); return new T.Vector3(x, top, z); }));
  const kinds: Crowd[] = ['public', 'resident', 'public'];
  for (let k = 0; k < 6; k++) for (const [f0, f1, pair, off] of [[.2, .8, .45, 0], [.25, .95, 0, 1.4], [.2, .55, 0, -1.4], [.35, 1, .4, 2.6], [.3, .75, 0, -2.4]] as const) {
    const a = k * Math.PI / 3; walks.push({ curve: line(a, f0, f1, off), crowd: kinds[(k + walks.length) % 3], pair: pair || undefined, view: a, rest: [3, 10] });
  }
  for (let k = 0; k < 12; k++) for (const [r, pair, span] of [[13, .4, .55], [14.2, 0, .4]] as const) {
    const a0 = k * Math.PI / 6 + (pair ? 0 : .12); walks.push({ curve: arcCurve(r, a0, a0 + span), crowd: kinds[(k + walks.length) % 3], pair: pair || undefined, rest: [3, 9] });
  }
  clusters.forEach(([x, z, , r], k) => {
    const out = new T.Vector2(x - PLAZA.x, z - PLAZA.z).normalize();
    for (const side of [1, -1]) { // two small groups either side of each planter
      const c = new T.Vector3(x - out.y * side * (r * 1.4 + 2.2), top, z + out.x * side * (r * 1.4 + 2.2));
      for (let j = 0; j < 3 + ((k + side) & 1); j++) spots.push({ at: c.clone().add(new T.Vector3(Math.cos(j * 2.1) * .7, 0, Math.sin(j * 2.1) * .7)), yaw: 0, mode: 'talk', crowd: kinds[(k + j) % 3] });
    }
  });
  for (const points of plazaWalks) {
    const curve = pts(points); walkway(root, curve);
    for (const pair of [2.2, 0]) walks.push({ curve, crowd: 'public', pair: pair || undefined, rest: [5, 15] }); // strollers on each walkway
  }
  publishOccupants({ walks, spots });
  const generated = new Set<T.BufferGeometry>();
  root.traverse(o => { if (o instanceof T.Mesh && o.geometry !== column && o.geometry.type !== 'RoundedBoxGeometry') generated.add(o.geometry); });
  const merged = bake(root); generated.forEach(x => x.dispose()); root.clear();
  for (const mesh of merged) { mesh.name = 'plaza-deck'; mesh.receiveShadow = true; if (mesh.material === megaSeam || mesh.material === walkSeam || mesh.material === jet) mesh.castShadow = false; }
  root.add(...merged); lampPools(root);
  const people = roofPeople.spots.length + roofPeople.walks.reduce((n, w) => n + (w.pair ? 2 : 1), 0) + spots.length + walks.reduce((n, w) => n + (w.pair ? 2 : 1), 0);
  return Object.assign(root, { people });
}
type Crowd = 'staff' | 'public' | 'resident';
