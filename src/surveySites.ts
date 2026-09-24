import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { box, sign, cream, teal, sage, pink, dark, trim, futureLight, solar, membrane, paint, type Kit } from './cityRig';
import { changeSites } from './layout';
import type { SitePart } from './surveyAtmosphere';

const GROW = 3; // seconds a part takes to rise or sink
const lawn = paint('#9fbf8a', .9);

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
  for (const y of [4, 7, 10]) { box(hubBase, [7.2, .9, .1], [0, y, 3.03], dark, .03); box(hubBase, [.1, .9, 6.2], [3.53, y, 0], dark, .03); }
  box(hubBase, [7.6, .35, 6.6], [0, 11.4, 0], trim, .1);
  box(hubBase, [4, .08, 4], [0, 11.62, 0], futureLight, .03);
  sign(hubBase, kit, '自動サービス / AUTO HUB', 0, 2.2, 3.2, 6.2, .8, '#46676e');
  box(hubUpper, [5.4, 19, 4.8], [0, 9.5, 0], dark, .2);
  for (let y = 1.5; y < 19; y += 3) box(hubUpper, [5.8, .3, 5.2], [0, y, 0], trim, .05);
  for (let i = 0; i < 4; i++) box(hubUpper, [.12, 1.2, 4], [-1.8 + i * 1.2, 19.6, 0], solar, .02);
  box(hubUpper, [3, .1, 3], [0, 20.25, 0], futureLight, .03);

  // NE environment: a lawn park with hedges and future trees.
  const park = part(site('ne')), { w: pw, d: pd } = changeSites.ne;
  box(park, [pw, .3, pd], [0, .55, 0], lawn, .1);
  for (const [w, d] of [[pw, 1.4], [1.4, pd]] as const) box(park, [w, .06, d], [0, .72, 0], cream, .03);
  for (const [x, z, w, d] of [[-pw / 2 + .4, 0, .8, pd - 1], [pw / 2 - .4, 0, .8, pd - 1], [0, -pd / 2 + .4, pw - 1, .8]] as const) box(park, [w, 1, d], [x, 1.1, z], sage, .3);
  new GLTFLoader().loadAsync(new URL('../asset/models/future-tree-2127/future-tree-2127.glb', import.meta.url).href).then(({ scene: tree }) => {
    const height = new T.Box3().setFromObject(tree).getSize(new T.Vector3()).y || 1;
    for (const [x, z, h] of [[-2.6, -2.6, 7], [2.6, -2.6, 5.5], [-2.6, 2.6, 5], [2.8, 2.6, 6.5], [0, 0, 4]] as const) {
      const copy = tree.clone(); copy.scale.setScalar(h / height); copy.position.set(x, .7, z); copy.rotation.y = x * z;
      copy.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
      park.add(copy);
    }
  }).catch(error => console.error('Park trees failed to load', error));

  // SW public sharing: an open commons plaza under a membrane canopy.
  const plaza = part(site('sw'));
  box(plaza, [12, .25, 10], [0, .55, 0], trim, .08);
  for (let x = -4.5; x <= 4.5; x += 3) box(plaza, [.08, .04, 9], [x, .69, 0], futureLight, .02);
  for (const x of [-4, 4]) for (const z of [-3, 3]) box(plaza, [.25, 4.2, .25], [x, 2.8, z], trim, .05);
  box(plaza, [9.4, .15, 7], [0, 4.95, 0], membrane, .05);
  for (const [x, z] of [[-2, -1.5], [2, -1.5], [0, 1.8]] as const) box(plaza, [2.6, .45, .8], [x, 1, z], pink, .1);
  sign(plaza, kit, '公共広場 / COMMONS', 0, 2, 4.6, 5, .7, '#536f66');

  // SE urban concentration: a mid-rise block; the tall variant adds a residential tower.
  const tower = site('se'), towerBase = part(tower), towerUpper = part(tower, 18);
  box(towerBase, [9, 1, 9], [0, .9, 0], cream, .25);
  box(towerBase, [8, 16.6, 8], [0, 9.6, 0], sage, .35);
  for (let y = 4; y < 17; y += 3) { box(towerBase, [8.2, .3, 8.2], [0, y, 0], trim, .05); box(towerBase, [7, 1.3, .08], [0, y + 1.4, 4.03], dark, .03); box(towerBase, [.08, 1.3, 7], [4.03, y + 1.4, 0], dark, .03); }
  sign(towerBase, kit, '都市集約 / 2127', 0, 2.4, 4.2, 5.5, .8, '#527789');
  box(towerUpper, [6.6, 26, 6.6], [0, 13, 0], cream, .3);
  for (let y = 2; y < 26; y += 2.6) { box(towerUpper, [5.8, 1.2, .08], [0, y, 3.33], dark, .03); box(towerUpper, [.08, 1.2, 5.8], [3.33, y, 0], dark, .03); }
  box(towerUpper, [7.2, .5, 7.2], [0, 26.3, 0], trim, .1);
  for (let i = 0; i < 5; i++) box(towerUpper, [.12, 1.3, 5.6], [-2.4 + i * 1.2, 27.2, 0], solar, .02);

  const parts: Record<SitePart, T.Group> = { hubBase, hubUpper, park, plaza, towerBase, towerUpper };
  const motion = new Map(Object.values(parts).map(g => [g, { from: 0, to: 0, start: -Infinity }]));
  return {
    /** Starts a rise/sink for every part whose target changed; unchanged parts keep their state. */
    apply(targets: Record<SitePart, boolean>, now: number) {
      for (const [name, g] of Object.entries(parts) as [SitePart, T.Group][]) {
        const m = motion.get(g)!, to = targets[name] ? 1 : 0;
        if (m.to !== to) { m.from = g.scale.y > 1e-3 ? g.scale.y : 0; m.to = to; m.start = now; }
      }
    },
    update(now: number) {
      for (const [g, m] of motion) {
        const p = Math.min(1, Math.max(0, (now - m.start) / GROW)), v = m.from + (m.to - m.from) * p * p * (3 - 2 * p);
        g.scale.y = Math.max(1e-3, v); g.visible = v > 1e-3;
      }
    },
  };
}
