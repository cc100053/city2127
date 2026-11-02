import * as T from 'three';
import { arc, bake, box, leaf, paint } from './cityRig.ts';
import { plantClusters } from './coastalCanopy.ts';
import { megaGlass, megaRib, megaSeam, megaShell } from './megastructures.ts';
import { publishRoofGardens } from './districtMeters.ts';
import { publishOccupants, publishRoofWalks, type Spot, type Walk } from './occupants.ts';
import { PLAZA, plazaAt, plazaWalks } from './layout.ts';
import { deck, offsetTube, pierFree } from './skyways.ts';

// P4 (city-taste-v2): the former Aqua City lot is a civic plaza deck — one white storey, ivory paving with ring inlay, a central pool,
// planted terraces and residents — with sweeping elevated walkways to the ring plinth, the civic core and the hull apron. Metres.
const ivory = paint('#e9e5da', .8), pool = paint('#7fb6cc', .12, .2);
const column = new T.CylinderGeometry(1, 1, 1, 10);
type P3 = readonly [number, number, number];
const pts = (list: readonly P3[]) => new T.CatmullRomCurve3(list.map(p => new T.Vector3(...p)), false, 'centripetal');
const top = PLAZA.h + .25;

function walkway(root: T.Object3D, curve: T.Curve<T.Vector3>) {
  const length = curve.getLength(), samples = Math.ceil(length / 3);
  root.add(new T.Mesh(deck(curve, 7, .9, samples), megaShell));
  const lawn = new T.Mesh(deck(curve, 2.2, .3, samples), leaf); lawn.position.y = .3; root.add(lawn); // planted strip down the deck, as the garden decks
  for (const side of [-3.55, 3.55]) root.add(new T.Mesh(offsetTube(curve, side, -.2, .4, false), megaSeam));
  for (let d = 15; d < length - 8; d += 30) {
    const p = curve.getPointAt(d / length);
    if (p.y < top + 1.5 || !pierFree(p.x, p.z)) continue;
    const c = new T.Mesh(column, megaShell); c.scale.set(.7, p.y - .8, .7); c.position.set(p.x, (p.y - .8) / 2, p.z); root.add(c);
  }
}

/** The plaza deck (one baked group, ~6 draws), its planted terraces and people, and the elevated walkways. */
export function plazaDeck(scene: T.Object3D) {
  const root = new T.Group(); root.name = 'plaza-deck';
  const g = new T.Group(); g.position.set(PLAZA.x, 0, PLAZA.z); g.rotation.y = PLAZA.yaw; root.add(g);
  const { hu, hv, h } = PLAZA;
  box(g, [hu * 2, h, hv * 2], [0, h / 2, 0], megaShell, .2);
  box(g, [hu * 2 + .3, 1.3, hv * 2 + .3], [0, 3.1, 0], megaGlass, .1); // glazed storey band round the podium
  box(g, [hu * 2 - 1, .25, hv * 2 - 1], [0, h + .1, 0], ivory, .05);
  // Soft radial inlay and a shallow round pool lit at its rim.
  for (const r of [15, 24, 36]) arc(g, r - .25, r + .25, .06, [0, top, 0], megaRib);
  arc(g, 0, 9, .3, [0, h, 0], pool); arc(g, 9, 9.7, .12, [0, top + .02, 0], megaSeam);
  for (const [w, d, x, z] of [[hu * 2, .5, 0, hv - .25], [hu * 2, .5, 0, -hv + .25], [.5, hv * 2, hu - .25, 0], [.5, hv * 2, -hu + .25, 0]]) box(g, [w, .15, d], [x, top + .05, z], megaSeam, .03);
  // Broad ramps down to the ground at both ends of the deck, and a second ring set round each end pool.
  for (const side of [1, -1]) {
    const shape = new T.Shape().moveTo(0, 0).lineTo(18, 0).lineTo(0, h).lineTo(0, 0);
    const m = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: 26, bevelEnabled: false }).translate(0, 0, -13), megaShell); m.rotation.y = side > 0 ? 0 : Math.PI; m.position.set(side * hu, 0, 0); g.add(m);
    for (const r of [8, 15]) arc(g, r - .25, r + .25, .06, [side * 55, top, 0], megaRib);
  }
  // Planted terraces (the roof-garden Meter and strollers read these) on an ellipse round the pool.
  const clusters: [number, number, number, number][] = Array.from({ length: 10 }, (_, k) => {
    const a = (k + .5) * Math.PI / 5, [x, z] = plazaAt(Math.cos(a) * 60, Math.sin(a) * 27);
    return [x, z, h + .25, 5.5 + (k % 2)];
  });
  plantClusters(scene, clusters, .6); publishRoofGardens(clusters);
  root.updateMatrixWorld(true);
  const roofPeople = publishRoofWalks(root, clusters);
  // Strolling pairs on radial lines between the terraces, and standing groups on the inner ring.
  const spots: Spot[] = [], walks: Walk[] = [];
  const along = (a: number, f0: number, f1: number) => {
    const [x0, z0] = plazaAt(Math.cos(a) * 66 * f0, Math.sin(a) * 30 * f0), [x1, z1] = plazaAt(Math.cos(a) * 66 * f1, Math.sin(a) * 30 * f1);
    return new T.LineCurve3(new T.Vector3(x0, top, z0), new T.Vector3(x1, top, z1));
  };
  for (let k = 0; k < 10; k++) for (const [f0, f1, pair, da] of [[.3, .95, .4, 0], [.35, 1, 0, .07], [.3, .6, 0, -.07]] as const) {
    const a = k * Math.PI / 5 + da;
    walks.push({ curve: along(a, f0, f1), crowd: 'public', pair: pair || undefined, view: a, rest: [4, 12] });
  }
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6 + .26, [cx, cz] = plazaAt(Math.cos(a) * 26, Math.sin(a) * 15);
    for (let j = 0; j < 3 + (k % 2); j++) spots.push({ at: new T.Vector3(cx + Math.cos(j * 2) * .7, top, cz + Math.sin(j * 2) * .7), yaw: 0, mode: 'talk', crowd: 'public' });
  }
  for (const points of plazaWalks) {
    const curve = pts(points); walkway(root, curve);
    for (const pair of [1.6, 0]) walks.push({ curve, crowd: 'public', pair: pair || undefined, rest: [5, 15] }); // strollers on each walkway
  }
  publishOccupants({ walks, spots });
  const generated = new Set<T.BufferGeometry>();
  root.traverse(o => { if (o instanceof T.Mesh && o.geometry !== column && o.geometry.type !== 'RoundedBoxGeometry') generated.add(o.geometry); });
  const merged = bake(root); generated.forEach(x => x.dispose()); root.clear();
  for (const mesh of merged) { mesh.name = 'plaza-deck'; mesh.receiveShadow = true; if (mesh.material === megaSeam) mesh.castShadow = false; }
  root.add(...merged);
  return Object.assign(root, { people: roofPeople.spots.length + roofPeople.walks.length + spots.length + walks.length });
}
