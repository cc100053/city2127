import * as T from 'three';
import { arc, bake, box, futureLight, glass, leaf, membrane, publicLight, solar, stone, trim } from './cityRig';
import { floatingDecks, skyBridges, SPHERE_DOCK } from './layout';
import { routes } from './mobility';
import { amphibiousShore, tidalEdge } from './amphibiousShore';

/** What 2127 added around the existing landmarks: sky bridges, the sphere berth, guideway light lines and floating decks. */
export function build2127(scene: T.Scene) {
  const root = new T.Group(); root.name = 'odaiba-2127';
  // Sky bridges: an enclosed glass link between trim slabs, membrane rails and a mint light line, sunk 1 m into each facade.
  for (const bridge of skyBridges) {
    const a = new T.Vector3(...bridge.from), b = new T.Vector3(...bridge.to), length = a.distanceTo(b) + 2;
    const g = new T.Group(); g.position.copy(a).add(b).multiplyScalar(.5); g.lookAt(b); root.add(g);
    box(g, [8, 4, length], [0, 0, 0], glass, .3);
    for (const y of [-2.2, 2.2]) box(g, [8.6, .5, length], [0, y, 0], trim, .1);
    for (const x of [-4.4, 4.4]) { box(g, [.2, 1.1, length], [x, 3, 0], membrane, .05); box(g, [.15, .15, length], [x, -2.5, 0], futureLight, .05); }
    for (let z = -length / 2 + 4; z < length / 2 - 2; z += 6) box(g, [8.2, 4, .3], [0, 0, z], trim, .05);
  }
  // Sphere berth: a landing ring on four struts above the sphere top (123.4 m), lit at its edge.
  const [bx, by, bz] = SPHERE_DOCK, berth = new T.Group(); berth.position.set(bx, 0, bz); root.add(berth);
  arc(berth, 0, 7.5, .5, [0, by - 1.7, 0], trim);
  arc(berth, 7.2, 7.8, .2, [0, by - 1.3, 0], futureLight);
  arc(berth, 3.5, 3.8, .05, [0, by - 1.15, 0], publicLight);
  for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; box(berth, [.6, 5, .6], [Math.cos(t) * 6, by - 4.2, Math.sin(t) * 6], solar, .1); }
  // Guideway light lines along both deck edges.
  const guideway = routes().guideway, up = new T.Vector3(0, 1, 0);
  for (const offset of [-6.8, 6.8]) {
    const points = Array.from({ length: 160 }, (_, i) => {
      const u = i / 159, p = guideway.getPointAt(u), side = new T.Vector3().crossVectors(up, guideway.getTangentAt(u)).normalize();
      return p.addScaledVector(side, offset).setY(14.45);
    });
    root.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 320, .22, 4), futureLight));
  }
  // Floating decks: stone plates with planted edges and rails, riding just above the sea.
  for (const [x, z, yaw] of floatingDecks) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; root.add(g);
    box(g, [10, 1.2, 36], [0, -.1, 0], stone, .3);
    box(g, [2, .8, 34], [-3.8, .9, 0], leaf, .3);
    for (let i = 0; i < 6; i++) arc(g, 0, 1.1 + (i % 3) * .3, 1.6 + (i % 2), [-3.8, .6, -14 + i * 5.6], leaf);
    box(g, [.12, 1.1, 36], [4.8, 1, 0], membrane, .04);
    box(g, [10.1, .12, .3], [0, .55, 18], futureLight, .04);
  }
  scene.add(...bake(root),amphibiousShore(),tidalEdge());
}
