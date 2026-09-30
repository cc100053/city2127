import * as T from 'three';
import { arc, bake, box, leaf, paint, stone, trail, trim } from './cityRig.ts';
import { changeSites, DISTRICT, floatingDecks, northShore } from './layout.ts';
import { routes } from './mobility.ts';
import layout from './odaiba-layout.json';

type P3 = [number, number, number];
// Silvered glass: pale and warm so the spheres read as mirrors of the golden sky, not blue domes.
const chrome = new T.MeshPhysicalMaterial({ color: '#f1efe8', metalness: .78, roughness: .1, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.35 });
const waterfall = new T.MeshStandardMaterial({ color: '#f3fbff', emissive: '#d8f0ff', emissiveIntensity: .35, roughness: .25, transparent: true, opacity: .85 });
const foam = new T.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: .55, depthWrite: false });
const cherry = paint('#efc2cf', .8);
const crown = new T.IcosahedronGeometry(1, 1), pole = new T.CylinderGeometry(1, 1, 1, 10);

// Skyway network (metres, deck top): a ring around the 151 m tower east of DECKS, a link into the Fuji chassis ring floor (61 m),
// on to a ring around Grand Nikko (92 m, above Hilton's 83 m roof) and two suspended glass spheres. Routed clear of every
// survey site, the 113/151 m context towers and the Fuji chassis members; west of each site's line of sight from the hero pose.
const RINGS: { centre: P3; radius: number }[] = [
  { centre: [259, 90, -351], radius: 50 },
  { centre: [-240, 92, 178], radius: 100 },
];
const SPHERES: { centre: P3; radius: number; deck?: number }[] = [
  { centre: [160, 92, 40], radius: 20, deck: 28 },
  { centre: [-80, 100, 180], radius: 22, deck: 30 },
  { centre: [-300, 104, 40], radius: 17, deck: 26 },
];
const LINKS: P3[][] = [
  [[276.3, 90, -304.1], [300, 78, -240], [285, 67, -150], [262, 62, -60], [215, 62, 0], [140, 62, 20], [70, 62.5, 14], [12.3, 63, 7.6]],
  [[-41.3, 63, 47.8], [-75, 64, 50], [-120, 79, 94], [-159.4, 92, 118.9]],
  [[-106, 98, 180], [-124, 95, 179], [-140, 92, 178]],
  [[-289.6, 102.4, 63.9], [-285, 97, 75], [-280, 92, 86.3]],
];

/** Box-section deck along a curve, `top` at the curve and `depth` below it; outward winding, flat-shaded quads. */
function deck(curve: T.Curve<T.Vector3>, width: number, depth: number, samples: number) {
  const up = new T.Vector3(0, 1, 0), p = new T.Vector3(), t = new T.Vector3(), side = new T.Vector3(), rings: T.Vector3[][] = [];
  for (let i = 0; i <= samples; i++) {
    curve.getPointAt(i / samples, p); curve.getTangentAt(i / samples, t);
    side.crossVectors(up, t).setY(0).normalize().multiplyScalar(width / 2);
    rings.push([p.clone().add(side), p.clone().sub(side), p.clone().sub(side).setY(p.y - depth), p.clone().add(side).setY(p.y - depth)]);
  }
  const position: number[] = [];
  for (let i = 0; i < samples; i++) for (let k = 0; k < 4; k++) {
    const a = rings[i][k], b = rings[i][(k + 1) % 4], c = rings[i + 1][(k + 1) % 4], d = rings[i + 1][k];
    position.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray());
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(position, 3)); geometry.computeVertexNormals();
  return geometry;
}
/** Tube offset sideways from a curve (light trails on both deck faces). */
function offsetTube(curve: T.Curve<T.Vector3>, offset: number, dy: number, radius: number, closed: boolean) {
  const up = new T.Vector3(0, 1, 0), n = closed ? 120 : 80;
  const points = Array.from({ length: closed ? n : n + 1 }, (_, i) => {
    const u = i / n, side = new T.Vector3().crossVectors(up, curve.getTangentAt(u)).setY(0).normalize();
    return curve.getPointAt(u).addScaledVector(side, offset).add(new T.Vector3(0, dy, 0));
  });
  return new T.TubeGeometry(new T.CatmullRomCurve3(points, closed), n * 2, radius, 5, closed);
}

const solids = layout.buildings.map(b => { const [min, max] = b.boundsBlender; return { x0: min[0], x1: max[0], z0: -max[1], z1: -min[1] }; });
const guideSamples = routes().guideway.getSpacedPoints(80);
/** A pier may stand here: open ground outside landmarks, survey lots and the Yurikamome deck. */
const pierFree = (x: number, z: number) =>
  solids.every(s => x < s.x0 - 3 || x > s.x1 + 3 || z < s.z0 - 3 || z > s.z1 + 3) &&
  Object.values(changeSites).every(s => Math.abs(x - s.x) > s.w * s.scale / 2 + 12 || Math.abs(z - s.z) > s.d * s.scale / 2 + 12) &&
  guideSamples.every(g => Math.hypot(g.x - x, g.z - z) > 12);

function skyway(root: T.Object3D, curve: T.Curve<T.Vector3>, closed: boolean) {
  const length = curve.getLength(), samples = Math.ceil(length / 3);
  root.add(new T.Mesh(deck(curve, 9, 2.6, samples), trim));
  for (const side of [-4.65, 4.65]) {
    root.add(new T.Mesh(offsetTube(curve, side, -1.1, .55, closed), trail));
    root.add(new T.Mesh(parapet(curve, side * .98, samples), stone));
  }
  for (let d = 30; d < length - 10; d += 64) {
    const p = curve.getPointAt(d / length);
    if (!pierFree(p.x, p.z)) continue;
    const pier = new T.Mesh(pole, trim); pier.scale.set(1.5, p.y - 2.6, 1.5); pier.position.set(p.x, (p.y - 2.6) / 2, p.z); root.add(pier);
    box(root, [7, 1.6, 3], [p.x, p.y - 3.2, p.z], trim, .3);
  }
}
/** 1.1 m parapet strip standing on the deck edge. */
function parapet(curve: T.Curve<T.Vector3>, offset: number, samples: number) {
  const up = new T.Vector3(0, 1, 0);
  const points = Array.from({ length: samples + 1 }, (_, i) => {
    const u = i / samples, side = new T.Vector3().crossVectors(up, curve.getTangentAt(u)).setY(0).normalize();
    return curve.getPointAt(u).addScaledVector(side, offset).setY(curve.getPointAt(u).y + 1.1);
  });
  return deck(new T.CatmullRomCurve3(points), .3, 1.1, samples);
}

function sphere(root: T.Object3D, [x, y, z]: P3, r: number, deckRadius?: number) {
  const g = new T.Group(); g.position.set(x, y, z); root.add(g);
  g.add(new T.Mesh(new T.SphereGeometry(r, 48, 24), chrome));
  for (let i = 0; i < 8; i++) { const rib = new T.Mesh(new T.TorusGeometry(r + .08, .18, 4, 64), trim); rib.rotation.y = i * Math.PI / 8; g.add(rib); }
  for (const f of [-.7, -.35, 0, .35, .7]) { const lat = new T.Mesh(new T.TorusGeometry(Math.sqrt(1 - f * f) * r + .08, .24, 4, 64), trim); lat.rotation.x = Math.PI / 2; lat.position.y = f * r; g.add(lat); }
  // Cradle and a single mast with three splayed struts to the ground.
  arc(g, r * .45, r * .8, 1.4, [0, -r * .78, 0], trim);
  const mast = new T.Mesh(pole, trim); mast.scale.set(2, y - r * .7, 2); mast.position.set(0, -(y + r * .7) / 2, 0); g.add(mast);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + .4, foot = new T.Vector3(Math.cos(a) * 16, -y, Math.sin(a) * 16), top = new T.Vector3(0, -r * .8, 0);
    const strut = new T.Mesh(pole, trim); strut.position.copy(foot).add(top).multiplyScalar(.5); strut.scale.set(.8, foot.distanceTo(top), .8);
    strut.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), top.sub(foot).normalize()); g.add(strut);
  }
  if (deckRadius) {
    // Equatorial promenade ring, lit at its outer edge, held by four spokes.
    arc(g, deckRadius - 5, deckRadius + 4.5, 2.6, [0, -r * .12 - 2.6, 0], trim);
    for (const [inner, outer] of [[deckRadius + 4.4, deckRadius + 4.9], [deckRadius - 5.3, deckRadius - 4.8]]) arc(g, inner, outer, .5, [0, -r * .12 - 1.6, 0], trail);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .3; box(g, [2, 1.2, deckRadius - 5 - r + 1], [Math.cos(a) * (deckRadius - 5 + r) / 2, -r * .12 - 1.2, Math.sin(a) * (deckRadius - 5 + r) / 2], trim).rotation.y = -a + Math.PI / 2; }
  }
}

const circle = ({ centre: [x, y, z], radius }: { centre: P3; radius: number }) =>
  new T.CatmullRomCurve3(Array.from({ length: 48 }, (_, i) => { const a = i / 48 * Math.PI * 2; return new T.Vector3(x + Math.cos(a) * radius, y, z + Math.sin(a) * radius); }), true, 'centripetal');

/** Round floating terraces stepping into the bay off the north shore, each with a small waterfall on its seaward face. */
function shoreTerraces(root: T.Object3D) {
  const boats = [routes().water, routes().ferry].flatMap(route => route.getSpacedPoints(300));
  let n = 0;
  for (let i = 0; i < northShore.length - 1; i++) {
    const [ax, az] = northShore[i], [bx, bz] = northShore[i + 1], length = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az);
    for (let d = 22; d < length; d += 46) {
      const t = d / length, sx = ax + (bx - ax) * t, sz = az + (bz - az) * t;
      // Local -X faces the sea (as in tidalEdge); the terrace centre sits OUT m out, clear of the tidal islets (to 28.5 m).
      const r = 12.5 + (n % 3) * 2, OUT = 46, cx = sx - Math.cos(yaw) * OUT, cz = sz + Math.sin(yaw) * OUT;
      if (cx < DISTRICT.minX || cx > 250 || cz > DISTRICT.maxZ || floatingDecks.some(([x, z]) => Math.hypot(cx - x, cz - z) < 60) || boats.some(p => Math.hypot(p.x - cx, p.z - cz) < r + 24)) continue;
      const g = new T.Group(); g.position.set(sx, 0, sz); g.rotation.y = yaw; root.add(g);
      const c = new T.Group(); c.position.set(-OUT, 0, 0); c.rotation.y = n * 1.7; g.add(c);
      arc(c, 0, r, 1.6, [0, -1.2, 0], stone);
      arc(c, r - .5, r + .3, .6, [0, .4, 0], trim);
      arc(c, 0, r - .6, .25, [0, .4, 0], leaf);
      arc(c, 0, r * .62, 2.2, [0, .4, 0], stone);
      arc(c, r * .62 - .4, r * .62 + .2, .5, [0, 2.6, 0], trim);
      arc(c, 0, r * .6 - .4, .3, [0, 2.6, 0], leaf);
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + n, rr = k < 2 ? r * .25 : r * .75, top = k < 2 ? 2.9 : .65, s = 1.6 + (k % 3) * .5;
        const trunk = new T.Mesh(pole, trim); trunk.scale.set(.25, 2.2, .25); trunk.position.set(Math.cos(a) * rr, top + 1.1, Math.sin(a) * rr); c.add(trunk);
        const tree = new T.Mesh(crown, (k + n) % 4 === 0 ? cherry : leaf); tree.position.set(Math.cos(a) * rr, top + 2.2 + s * .7, Math.sin(a) * rr); tree.scale.set(s * 1.2, s, s * 1.2); c.add(tree);
      }
      // Two-step waterfall on the seaward side: upper tier onto the base, base into the sea, with a foam disc.
      const fall = new T.Group(); fall.rotation.y = -c.rotation.y; c.add(fall);
      box(fall, [.35, 2.2, 3.4], [-r * .62 - .2, 1.5, 0], waterfall, .1);
      box(fall, [.35, 1.9, 4.4], [-r - .45, -.5, 0], waterfall, .1);
      arc(fall, 0, 3.2, .05, [-r - 1.8, -.72, 0], foam);
      // Footbridge back to the tidal edge.
      box(g, [OUT - 12 - r, .5, 2.4], [-(OUT + 12 - r) / 2, .5, 0], trim, .15);
      n++;
    }
  }
}

/** 2127 identity at height: lit skyways, tower rings and suspended glass spheres, plus the round waterfall terraces on the bay. */
export function skyways() {
  const root = new T.Group(); root.name = 'skyways';
  for (const ring of RINGS) skyway(root, circle(ring), true);
  for (const points of LINKS) skyway(root, new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal'), false);
  for (const s of SPHERES) sphere(root, s.centre, s.radius, s.deck);
  shoreTerraces(root);
  const generated = new Set<T.BufferGeometry>();
  root.traverse(o => { if (o instanceof T.Mesh && o.geometry !== pole && o.geometry !== crown && o.geometry.type !== 'RoundedBoxGeometry') generated.add(o.geometry); });
  const merged = bake(root); generated.forEach(g => g.dispose()); root.clear();
  for (const mesh of merged) { mesh.name = 'skyways'; if (mesh.material === trail || mesh.material === foam || mesh.material === waterfall) mesh.castShadow = false; }
  root.add(...merged);
  return root;
}
