import * as T from 'three';
import { arc, bake, box, chrome, leaf, leafyCrown, paint, stone, trail, trim } from './cityRig.ts';
import { changeSites, DISTRICT, floatingDecks, northShore, sweepway } from './layout.ts';
import { routes } from './mobility.ts';
import layout from './odaiba-layout.json';

type P3 = [number, number, number];
const waterfall = new T.MeshStandardMaterial({ color: '#f3fbff', emissive: '#d8f0ff', emissiveIntensity: .35, roughness: .25, transparent: true, opacity: .85 });
const foam = new T.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: .55, depthWrite: false });
const cherry = paint('#efc2cf', .8);
const crown = leafyCrown(1), pole = new T.CylinderGeometry(1, 1, 1, 10);

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
  [[-291.6, 102, 59.3], [-285, 97, 75], [-280, 92, 86.3]],
  // Front-left: out of the 151 m tower ring over the north-east waterfront to the frame edge (target v2's long front-left skyway).
  [[304, 90, -373], [350, 80, -400], [410, 68, -440], [480, 60, -490], [560, 56, -545]],
  // Mid-level (r5 pass 3, target v2's layered district): Aqua City's east end to Hilton at 30 m, behind the PARK site from the hero pose.
  [[-183, 30, -50], [-205, 30.5, -30], [-228, 30.5, -8], [-248, 30, 8]],
  // Mid-level (r6): Fuji chassis west face to Hilton at 40 m, south of the COMMONS PLAZA lot, so the gap between them reads layered.
  [[-86, 40, 18], [-130, 40.5, 26], [-180, 41, 34], [-220, 40.5, 40], [-250, 40, 44]],
];
// Planted mid-level decks (r6 pass 3, target v2's tree-lined middle layer). Raycast-checked against the environment, landmarks and
// Fuji chassis: clear between their docked ends, and off every survey site's line of sight from the hero pose.
const GARDEN_LINKS: P3[][] = [
  // DECKS south face over the open ground to a landing on Aqua City's planted roof (30 m).
  [[150, 40, -222], [150, 39, -195], [125, 37, -168], [85, 35.5, -150], [40, 34.5, -145], [20, 34.5, -142]],
  // The 151 m tower down to DECKS' east face at 42 m.
  [[252, 42, -346], [250, 42, -315], [232, 42, -290], [195, 42, -281], [168, 42, -280]],
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
    root.add(new T.Mesh(offsetTube(curve, side, -1.1, .75, closed), trail));
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
  // Hairline mullions (r5 pass 3): the panel grid reads only up close, so from the hero pose the sphere is one silver ball, not a geodesic dome.
  for (let i = 0; i < 6; i++) { const rib = new T.Mesh(new T.TorusGeometry(r + .05, .09, 4, 64), trim); rib.rotation.y = i * Math.PI / 6; g.add(rib); }
  for (const f of [-.5, 0, .5]) { const lat = new T.Mesh(new T.TorusGeometry(Math.sqrt(1 - f * f) * r + .05, .11, 4, 64), trim); lat.rotation.x = Math.PI / 2; lat.position.y = f * r; g.add(lat); }
  // Cradle and a single mast with three splayed struts to the ground.
  arc(g, r * .45, r * .8, 1.4, [0, -r * .78, 0], trim);
  const mast = new T.Mesh(pole, trim); mast.scale.set(2, y - r * .7, 2); mast.position.set(0, -(y + r * .7) / 2, 0); g.add(mast);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + .4, foot = new T.Vector3(Math.cos(a) * 16, -y, Math.sin(a) * 16), top = new T.Vector3(0, -r * .8, 0);
    const strut = new T.Mesh(pole, trim); strut.position.copy(foot).add(top).multiplyScalar(.5); strut.scale.set(.8, foot.distanceTo(top), .8);
    strut.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), top.sub(foot).normalize()); g.add(strut);
  }
  // Narrow equatorial walk (where skyway links dock) with a lit outer band; the lower half of the sphere stays visible.
  arc(g, r + .2, r + 4.5, 1.2, [0, -r * .12 - 1.2, 0], trim);
  const band = new T.Mesh(new T.TorusGeometry(r + 4.6, .4, 6, 72), trail); band.rotation.x = Math.PI / 2; band.position.y = -r * .12 - .6; g.add(band);
  if (deckRadius) {
    // Promenade ring under the sphere (not at its equator), so the whole silver sphere stays visible from above; lit at its outer edge.
    // An open annulus on four spokes (not a solid disc), so the silver sphere reads whole against the city below.
    const y = -r * .78 - 2.6;
    arc(g, deckRadius - 2, deckRadius + 4.5, 2.6, [0, y, 0], trim);
    arc(g, deckRadius + 4.4, deckRadius + 4.9, .5, [0, y + 1, 0], trail);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4, m = (r * .45 + deckRadius) / 2; const spoke = box(g, [deckRadius - r * .45, 1.6, 2.4], [Math.cos(a) * m, y + 1.2, -Math.sin(a) * m], trim, .2); spoke.rotation.y = a; }
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
      // Tall white drum (2.8 m above the water) so the terrace reads as a raised island with a visible rim, as in the target.
      const L = 2.4;
      arc(c, 0, r, 4, [0, -1.2, 0], stone);
      arc(c, r - .5, r + .3, .6, [0, .4 + L, 0], trim);
      arc(c, 0, r - .6, .25, [0, .4 + L, 0], leaf);
      arc(c, 0, r * .62, 2.2, [0, .4 + L, 0], stone);
      arc(c, r * .62 - .4, r * .62 + .2, .5, [0, 2.6 + L, 0], trim);
      arc(c, 0, r * .6 - .4, .3, [0, 2.6 + L, 0], leaf);
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + n, rr = k < 2 ? r * .25 : r * .75, top = (k < 2 ? 2.9 : .65) + L, s = 1.6 + (k % 3) * .5;
        // Mostly palms (target v2's seaside palms): a tall slim trunk under a wide, flat crown; every fourth tree a round cherry.
        const palm = (k + n) % 4 !== 0, h = palm ? 5.5 + (k % 2) * 1.5 : 2.2;
        const trunk = new T.Mesh(pole, trim); trunk.scale.set(palm ? .3 : .25, h, palm ? .3 : .25); trunk.position.set(Math.cos(a) * rr, top + h / 2, Math.sin(a) * rr); c.add(trunk);
        const tree = new T.Mesh(crown, palm ? leaf : cherry); tree.position.set(Math.cos(a) * rr, top + h + (palm ? .3 : s * .7), Math.sin(a) * rr);
        if (palm) tree.scale.set(s * 1.5, s * .4, s * 1.5); else tree.scale.set(s * 1.2, s, s * 1.2);
        c.add(tree);
      }
      // Waterfalls on the seaward side: an upper sheet onto the drum, then three wide sheets down the drum into the sea, each with foam.
      const fall = new T.Group(); fall.rotation.y = -c.rotation.y; c.add(fall);
      box(fall, [.35, 2.2, 3.4], [-r * .62 - .2, 1.5 + L, 0], waterfall, .1);
      for (const a of [-.45, 0, .45]) {
        const sheet = new T.Group(); sheet.rotation.y = a; fall.add(sheet);
        box(sheet, [.35, 4.1, 4.6], [-r - .4, .75, 0], waterfall, .1);
        arc(sheet, 0, 3.4, .05, [-r - 2, -.72, 0], foam);
      }
      // Footbridge back to the tidal edge.
      box(g, [OUT - 12 - r, .5, 2.4], [-(OUT + 12 - r) / 2, 1.2, 0], trim, .15);
      n++;
    }
  }
}

/** 2127 identity at height: lit skyways, tower rings and suspended glass spheres, plus the round waterfall terraces on the bay. */
export function skyways() {
  const root = new T.Group(); root.name = 'skyways';
  // Planted decks (target v2's tree-lined middle layer): a lawn bed down the deck's middle with a tree every ~9 m, every third a cherry.
  // r8 (user): tower rings keep the bed but no trees.
  const garden = (curve: T.Curve<T.Vector3>, closed: boolean, trees = true) => {
    const length = curve.getLength(), count = trees ? Math.round(length / 9) : 0;
    root.add(new T.Mesh(deck(curve, 5.2, .45, Math.ceil(length / 3)), leaf)); root.children.at(-1)!.position.y = .45;
    for (let i = closed ? 0 : 1; i < count; i++) {
      const p = curve.getPointAt(i / count), s = 1.9 + (i % 3) * .4;
      const trunk = new T.Mesh(pole, trim); trunk.scale.set(.3, 2.6, .3); trunk.position.set(p.x, p.y + 1.5, p.z); root.add(trunk);
      const tree = new T.Mesh(crown, i % 3 === 1 ? cherry : leaf); tree.scale.set(s * 1.15, s, s * 1.15); tree.position.set(p.x, p.y + 2.6 + s * .8, p.z); root.add(tree);
    }
  };
  for (const ring of RINGS) { skyway(root, circle(ring), true); garden(circle(ring), true, false); }
  for (const points of [...LINKS, sweepway.map(p => [...p] as P3)]) skyway(root, new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal'), false);
  for (const points of GARDEN_LINKS) { const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal'); skyway(root, curve, false); garden(curve, false); }
  for (const s of SPHERES) sphere(root, s.centre, s.radius, s.deck);
  // Lit blue lines at street level too (target v2): both edges of the seaside promenades.
  for (const walk of routes().promenades) for (const side of [-3.6, 3.6]) root.add(new T.Mesh(offsetTube(walk, side, .25, .3, false), trail));
  shoreTerraces(root);
  const generated = new Set<T.BufferGeometry>();
  root.traverse(o => { if (o instanceof T.Mesh && o.geometry !== pole && o.geometry !== crown && o.geometry.type !== 'RoundedBoxGeometry') generated.add(o.geometry); });
  const merged = bake(root); generated.forEach(g => g.dispose()); root.clear();
  for (const mesh of merged) { mesh.name = 'skyways'; if (mesh.material === trail || mesh.material === foam || mesh.material === waterfall) mesh.castShadow = false; }
  root.add(...merged);
  return root;
}
