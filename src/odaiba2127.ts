import * as T from 'three';
import { arc, bake, box, futureLight, glass, leaf, membrane, publicLight, solar, stone, trail, trim } from './cityRig';
import { INTERCHANGE, skyBridges, SPHERE_DOCK } from './layout';
import { routes } from './mobility';
import { tidalEdge } from './amphibiousShore';
import { laneBeaconSites } from './waterRooms';
import { skyways } from './skyways';

/** What 2127 added around the existing landmarks: sky bridges, the sphere berth, the shore interchange, lane beacons and guideway light lines. */
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
  // Multimodal interchange (local +Z out to sea, +X west along the shore): a 10 m pier to a boat head, a waiting canopy, and beside it
  // an arrival mast whose 11 m berth deck takes shore-lane air taxis; a lit glass lift links pier and deck (vertical transfer).
  const ix = new T.Group(); ix.position.set(INTERCHANGE.shore[0], 0, INTERCHANGE.shore[2]); ix.rotation.y = INTERCHANGE.yaw; root.add(ix);
  const pier = INTERCHANGE.pier, top = INTERCHANGE.deck, [mx, , mz] = [16, 0, 40];
  box(ix, [10, 1.4, pier], [0, -.2, pier / 2], trim, .1);
  box(ix, [22, 1.4, 8], [0, -.2, pier - 4], trim, .1);
  for (const x of [-5.1, 5.1]) box(ix, [.3, .25, pier - 8], [x, .62, (pier - 8) / 2], trail, .05);
  box(ix, [22.2, .25, .3], [0, .62, pier + .1], trail, .05);
  for (const x of [-4.5, 4.5]) for (const z of [pier - 7, pier - 1]) box(ix, [.4, 3.4, .4], [x, 2.2, z], trim, .1);
  box(ix, [11, .35, 8], [0, 4, pier - 4], trim, .1);
  box(ix, [10, .3, 7], [0, 4.3, pier - 4], leaf, .1);
  box(ix, [11, .12, .2], [0, 3.8, pier], publicLight, .03);
  arc(ix, 0, 2.2, 1.6, [mx, -1.4, mz], stone);
  arc(ix, 0, 1.3, top - 1.8, [mx, -.2, mz], solar);
  // Deck top 1.2 m under the parked craft's origin, as at the sphere berth.
  arc(ix, 0, 11, .8, [mx, top - 2, mz], trim);
  arc(ix, 10.2, 10.8, .25, [mx, top - 1.2, mz], futureLight);
  arc(ix, 4, 4.3, .05, [mx, top - 1.2, mz], publicLight);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; box(ix, [.5, 9, .5], [mx + Math.cos(a) * 5, top - 6.5, mz + Math.sin(a) * 5], solar, .1); }
  box(ix, [2.6, top - .6, 2.6], [8.2, top / 2 - .7, mz], glass, .2);
  box(ix, [3.4, .4, 3], [6.5, .3, mz], trim, .1);
  box(ix, [2.4, .14, .14], [8.2, top - 1.8, mz - 1.4], publicLight, .03);
  // Shore-lane beacons: slim masts in the water with a lit ring 22 m under the lane's 80 m inbound leg, so the corridor is anchored.
  for (const [x, z] of laneBeaconSites()) {
    const beacon = new T.Group(); beacon.position.set(x, 0, z); root.add(beacon);
    arc(beacon, 0, 2, 1.4, [0, -1.4, 0], stone);
    arc(beacon, 0, .7, 58, [0, 0, 0], trim);
    arc(beacon, 2.6, 3.2, .3, [0, 57.6, 0], futureLight);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; box(beacon, [.25, .25, 2.4], [Math.cos(a) * 1.6, 57.75, Math.sin(a) * 1.6], trim, .05); }
  }
  // Guideway light trails along both deck edges (the same blue-white as the 2127 skyways).
  const guideway = routes().guideway, up = new T.Vector3(0, 1, 0);
  for (const offset of [-6.8, 6.8]) {
    const points = Array.from({ length: 160 }, (_, i) => {
      const u = i / 159, p = guideway.getPointAt(u), side = new T.Vector3().crossVectors(up, guideway.getTangentAt(u)).normalize();
      return p.addScaledVector(side, offset).setY(14.45);
    });
    root.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 320, .5, 5), trail));
  }
  scene.add(...bake(root),tidalEdge(),skyways());
}
