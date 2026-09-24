import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { box, sign, arc, shrubs, bake, faces, cream, teal, sage, pink, trim, futureLight, solar, membrane, stone, leaf, glass, paint, type Kit } from './cityRig';
import { changeSites } from './layout';
import type { SitePart } from './surveyAtmosphere';

const GROW = 3; // seconds a part takes to rise or sink
const lawn = paint('#9fbf8a', .9);
// Guest accent (docs/ART.md): saffron is reserved for city changes made by guests and appears nowhere else.
const GUEST = '#ff9a2e', FRESH = 10; // seconds a new change keeps its pulsing outline

/** Survey change sites in the Shibuya scene. Every variant is built once; answers only rise or sink parts. */
export function surveySites(scene: T.Scene) {
  const kit: Kit = { windows: [], signs: [], random: Math.random };
  const site = (id: keyof typeof changeSites) => {
    const g = new T.Group(); g.name = `survey-site-${id}`; g.position.set(changeSites[id].x, 0, changeSites[id].z); scene.add(g); return g;
  };
  const part = (parent: T.Group, y = 0) => { const g = new T.Group(); g.position.y = y; g.visible = false; g.scale.y = 1e-3; parent.add(g); return g; };

  // NW automation: a service hub with a drone pad; the tall variant adds a logistics shaft.
  const hub = site('nw'), hubBase = part(hub), hubUpper = part(hub, 12);
  box(hubBase, [8.4, .8, 7.4], [0, .8, 0], cream, .25);
  box(hubBase, [7, 10, 6], [0, 6.2, 0], teal, .3);
  for (const y of [4, 7, 10]) faces(hubBase, 7, 6, (f, across, out) => box(f, [across - .2, .9, .1], [0, y, out + .03], glass, .03));
  box(hubBase, [7.6, .35, 6.6], [0, 11.4, 0], trim, .1);
  box(hubBase, [4, .08, 4], [0, 11.62, 0], futureLight, .03);
  sign(hubBase, kit, '自動サービス / AUTO HUB', 0, 2.2, 3.2, 6.2, .8, '#46676e');
  box(hubUpper, [5.4, 19, 4.8], [0, 9.5, 0], glass, .2);
  for (let y = 1.5; y < 19; y += 3) box(hubUpper, [5.8, .3, 5.2], [0, y, 0], trim, .05);
  for (let i = 0; i < 4; i++) box(hubUpper, [.12, 1.2, 4], [-1.8 + i * 1.2, 19.6, 0], solar, .02);
  box(hubUpper, [3, .1, 3], [0, 20.25, 0], futureLight, .03);

  // NE environment: a lawn park with hedges and future trees.
  const park = part(site('ne')), { w: pw, d: pd } = changeSites.ne;
  box(park, [pw, .3, pd], [0, .55, 0], lawn, .1);
  for (const [w, d] of [[pw, 1.4], [1.4, pd]] as const) box(park, [w, .06, d], [0, .72, 0], cream, .03);
  for (const [x, z, w, d] of [[-pw / 2 + .4, 0, .8, pd - 1], [pw / 2 - .4, 0, .8, pd - 1], [0, -pd / 2 + .4, pw - 1, .8]] as const) box(park, [w, 1, d], [x, 1.1, z], sage, .3);
  new GLTFLoader().loadAsync(new URL('../asset/models/future-tree-2127/future-tree-2127.glb', import.meta.url).href).then(({ scene: tree }) => {
    const height = new T.Box3().setFromObject(tree).getSize(new T.Vector3()).y || 1, grove = new T.Group();
    for (const [x, z, h] of [[-2.6, -2.6, 7], [2.6, -2.6, 5.5], [-2.6, 2.6, 5], [2.8, 2.6, 6.5], [0, 0, 4]] as const) {
      const copy = tree.clone(); copy.scale.setScalar(h / height); copy.position.set(x, .7, z); copy.rotation.y = x * z;
      grove.add(copy);
    }
    park.add(...bake(grove), grove); // five GLB copies → one mesh per tree material; anything unbakeable stays in grove
  }).catch(error => console.error('Park trees failed to load', error));

  // SW public sharing: a round commons under a ringed canopy, the Hachiko plaza language at neighbourhood scale.
  const plaza = part(site('sw'));
  arc(plaza, 0, 5, .2, [0, .42, 0], stone);
  arc(plaza, 2.05, 2.15, .02, [0, .62, 0], futureLight);
  // The planted ring shelters the north, west and south; the plaza opens east to the street.
  arc(plaza, 4.3, 5, .5, [0, .62, 0], trim, 1.2, 3.6);
  arc(plaza, 4.4, 4.9, .08, [0, 1.12, 0], leaf, 1.2, 3.6);
  shrubs(plaza, 4.65, 1.15, 1.2, 3.6, 23);
  for (const [start, length] of [[.35, 1.2], [2.45, 1.2], [4.55, 1.2]]) arc(plaza, 2.6, 3, .42, [0, .62, 0], pink, start, length);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .26; box(plaza, [.2, 4.3, .2], [Math.cos(a) * 3.8, 2.8, -Math.sin(a) * 3.8], trim, .05); }
  arc(plaza, 3.1, 4.5, .22, [0, 4.95, 0], trim);
  arc(plaza, 0, 3.1, .06, [0, 5.03, 0], membrane);
  sign(plaza, kit, '公共広場 / COMMONS', 2.2, 2.1, 4, 4, .55, '#536f66');

  // SE urban concentration: a mid-rise block; the tall variant adds a residential tower.
  const tower = site('se'), towerBase = part(tower), towerUpper = part(tower, 18);
  box(towerBase, [9, 1, 9], [0, .9, 0], cream, .25);
  box(towerBase, [8, 16.6, 8], [0, 9.6, 0], sage, .35);
  for (let y = 4; y < 17; y += 3) {
    box(towerBase, [8.2, .3, 8.2], [0, y, 0], trim, .05); faces(towerBase, 8, 8, (f, across, out) => box(f, [across - 1, 1.3, .08], [0, y + 1.4, out + .03], glass, .03));
    if (y % 6 === 4) { box(towerBase, [7.6, .35, .4], [0, y + .32, 4.25], leaf, .15); box(towerBase, [.4, .35, 7.6], [4.25, y + .32, 0], leaf, .15); }
  }
  sign(towerBase, kit, '都市集約 / 2127', 0, 2.4, 4.2, 5.5, .8, '#527789');
  box(towerUpper, [6.6, 26, 6.6], [0, 13, 0], cream, .3);
  for (let y = 2; y < 26; y += 2.6) faces(towerUpper, 6.6, 6.6, (f, across, out) => box(f, [across - .8, 1.2, .08], [0, y, out + .03], glass, .03));
  box(towerUpper, [7.2, .5, 7.2], [0, 26.3, 0], trim, .1);
  for (let i = 0; i < 5; i++) box(towerUpper, [.12, 1.3, 5.6], [-2.4 + i * 1.2, 27.2, 0], solar, .02);

  const parts: Record<SitePart, T.Group> = { hubBase, hubUpper, park, plaza, towerBase, towerUpper };
  for (const g of Object.values(parts)) g.add(...bake(g)); // one draw call per material per part; trees load later and stay separate
  const motion = new Map(Object.values(parts).map(g => [g, { from: 0, to: 0, start: -Infinity, fresh: -Infinity }]));
  // Every site wears the same saffron footprint outline while it holds a guest's change; it pulses while the change is new.
  const markers = (Object.keys(changeSites) as (keyof typeof changeSites)[]).map(id => {
    const { w, d } = changeSites[id], material = new T.MeshStandardMaterial({ color: GUEST, emissive: GUEST, emissiveIntensity: .2, roughness: .5, transparent: true, depthWrite: false });
    const outline = <P extends T.Path>(hw: number, hd: number, r: number, path: P): P => { path.moveTo(-hw + r, -hd); path.lineTo(hw - r, -hd); path.quadraticCurveTo(hw, -hd, hw, -hd + r); path.lineTo(hw, hd - r); path.quadraticCurveTo(hw, hd, hw - r, hd); path.lineTo(-hw + r, hd); path.quadraticCurveTo(-hw, hd, -hw, hd - r); path.lineTo(-hw, -hd + r); path.quadraticCurveTo(-hw, -hd, -hw + r, -hd); return path; };
    const shape = outline(w / 2 + 1.2, d / 2 + 1.2, 1.4, new T.Shape()); shape.holes.push(outline(w / 2 + .8, d / 2 + .8, 1.05, new T.Path()));
    const mesh = new T.Mesh(new T.ShapeGeometry(shape, 6).rotateX(-Math.PI / 2), material); mesh.position.y = .47; mesh.visible = false; mesh.name = `guest-marker-${id}`;
    scene.getObjectByName(`survey-site-${id}`)!.add(mesh);
    return { mesh, material, parts: { nw: [hubBase, hubUpper], ne: [park], sw: [plaza], se: [towerBase, towerUpper] }[id] };
  });
  let first = true; // the snapshot on (re)connect restores the city; only later answers count as new changes
  return {
    /** Starts a rise/sink for every part whose target changed; unchanged parts keep their state. */
    apply(targets: Record<SitePart, boolean>, now: number) {
      for (const [name, g] of Object.entries(parts) as [SitePart, T.Group][]) {
        const m = motion.get(g)!, to = targets[name] ? 1 : 0;
        if (m.to !== to) { m.from = g.scale.y > 1e-3 ? g.scale.y : 0; m.to = to; m.start = now; m.fresh = first ? -Infinity : now; }
      }
      first = false;
    },
    update(now: number) {
      for (const [g, m] of motion) {
        const p = Math.min(1, Math.max(0, (now - m.start) / GROW)), v = m.from + (m.to - m.from) * p * p * (3 - 2 * p);
        g.scale.y = Math.max(1e-3, v); g.visible = v > 1e-3;
      }
      for (const { mesh, material, parts } of markers) {
        const shown = Math.max(...parts.map(g => g.visible ? g.scale.y : 0)), rose = Math.max(...parts.map(g => motion.get(g)!.to ? motion.get(g)!.fresh : -Infinity));
        mesh.visible = shown > 1e-3; material.opacity = Math.min(1, shown * 3); // the outline lands first, the building follows
        const age = now - rose; // a fresh change breathes for FRESH seconds, then holds a steady saffron line
        material.emissiveIntensity = .2 + (age < FRESH ? (1 - age / FRESH) * (1 - Math.cos(age * Math.PI * 2 / 1.25)) * .9 : 0);
      }
    },
  };
}
