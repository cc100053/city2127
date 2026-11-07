import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bake, trim, stone, glass, futureLight, chrome, paint, leaf, leafyCrown } from './cityRig.ts';
import { pedestrians } from './mobility.ts';
import { SKY_RING } from './layout.ts';
import { glowTexture } from './glowTexture.ts';

// 空の環 (Sky Ring, Plan B hero megastructure): the regional air tier's shared port. A box truss ellipse (deck top SKY_RING.deck,
// 14 m wide, 12 m deep) carried by diagonal V pylons on the water and open ground, with berths and parked craft on its outer edge.
// Geometry never depends on Meters; only the residents' voice nodes change, lit by proposal count alone (never vote direction).
const PANELS = 120, WIDTH = 14, DEPTH = 12, BERTHS = 10;
export const VOICE_NODES = 240;
/** Standalone (no survey) cities show a plausible mid-exhibition count. */
export const STANDALONE_VOICES = 120;
/** Ellipse angles of the V pylons: feet on the bay or open ground, legs clear of skyways, the Yurikamome and context blocks (browser raycast), and of the hero sightlines to the four sites. */
export const PYLONS = [.25, 1.2, 2, 3.25, 4.45, 5.1];
const UP = new T.Vector3(0, 1, 0);
/** Boarding-hall glazing: the city's pale blue glass made see-through, so the waiting residents show inside. */
const hallGlass = glass.clone(); hallGlass.transparent = true; hallGlass.opacity = .22; hallGlass.depthWrite = false;
const lobbyGlass = hallGlass.clone(); lobbyGlass.opacity = .1;
/** Berth finish (owner target R5): cool satin pearl shells, a cool grey pad field, a slate shadow band and a dark blue-grey pod visor. */
const hallFloor = paint('#b4c0c3', .75, .05);
const warmUnder = paint('#eee5d8', .6, .05); warmUnder.emissive.set('#f4c590'); warmUnder.emissiveIntensity = 0;
const pearl = paint('#eef1f2', .2, .35), padGrey = paint('#c3cbd1', .3, .15), slate = paint('#6b767e', .4, .1), visor = paint('#5f7d90', .08, .55);

/** Point on the ring's centre line at height `y`, offset `out` m along the horizontal outward normal. */
export function ringPoint(a: number, y: number, out = 0) {
  const n = new T.Vector3(Math.cos(a) / SKY_RING.rx, 0, Math.sin(a) / SKY_RING.rz).normalize();
  return new T.Vector3(SKY_RING.x + Math.cos(a) * SKY_RING.rx, y, SKY_RING.z + Math.sin(a) * SKY_RING.rz).addScaledVector(n, out);
}
/** Local transform shared by hall floors, residents, and the exported stairs. */
export function skyRingGate(b: number) {
  const a = (b + .5) / BERTHS * Math.PI * 2, gate = new T.Group();
  gate.position.copy(ringPoint(a, SKY_RING.deck, WIDTH / 2 - 3)); gate.lookAt(ringPoint(a, SKY_RING.deck, 0)); gate.updateMatrixWorld(true);
  return gate;
}
/** Endpoints of the twelve Blender-authored pylon shells. */
export function skyRingPylonLegs() {
  const spread = 55 / Math.hypot(SKY_RING.rx, SKY_RING.rz) * 1.4;
  return PYLONS.flatMap(a => [-1, 1].map(side => ({ foot: ringPoint(a, 8, WIDTH / 2 + 95), top: ringPoint(a + side * spread, SKY_RING.deck - DEPTH - 3, WIDTH / 2 - 1) })));
}
/** Apply the same GLB node transforms in the live scene and in geometry checks. */
export function skyRingArchitecture(model: T.Object3D) {
  const details = new T.Group(), leg = new T.Group(), stairs = new T.Group(), lowerStairs = new T.Group();
  model.updateMatrixWorld(true);
  model.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    const copy = new T.Mesh(o.geometry, o.material); copy.applyMatrix4(o.matrixWorld);
    if (o.name.startsWith('Pylon')) leg.add(copy);
    if (o.name.startsWith('Stair')) { copy.position.z += 100; stairs.add(copy); }
    if (o.name.startsWith('LowerStair')) { copy.position.z += 200; lowerStairs.add(copy); }
  });
  for (const { foot, top } of skyRingPylonLegs()) {
    const shell = leg.clone(); shell.position.copy(foot); shell.quaternion.setFromUnitVectors(UP, top.clone().sub(foot).normalize());
    shell.scale.set(10, foot.distanceTo(top), 10); details.add(shell);
  }
  for (let b = 0; b < BERTHS; b++) {
    const gate = skyRingGate(b), stair = stairs.clone(); stair.position.set(-21, 0, -1.5); gate.add(stair);
    stair.updateMatrixWorld(true); const copy = stair.clone(); copy.applyMatrix4(gate.matrixWorld); details.add(copy);
    const lower = lowerStairs.clone(); lower.position.set(-11, -DEPTH + 1.65, -9); lower.rotation.y = Math.PI / 2; gate.add(lower);
    lower.updateMatrixWorld(true); const lowerCopy = lower.clone(); lowerCopy.applyMatrix4(gate.matrixWorld); details.add(lowerCopy);
  }
  const architecture = new T.Group(); architecture.name = 'sky-ring-architecture'; architecture.add(...bake(details));
  return architecture;
}
/** Guest k (0-based) lights node `voiceSlot(k)`: a stride coprime with VOICE_NODES spreads the accumulated voices around the whole ring. */
export const voiceSlot = (k: number) => (k * 97) % VOICE_NODES;

/** Berth whose pod is left unbaked, so a guest's look at the ring can fly it in and out (the berth nearest the hero side). */
export const EXPLORE_BERTH = 6;
export const berthAngle = (b: number) => (b + .5) / BERTHS * Math.PI * 2;
/** Parked pod position (y = deck + 2.1, over the pad) and its heading along the ring. */
export function berthPark(b: number) {
  const a = berthAngle(b);
  return { position: ringPoint(a, SKY_RING.deck + 2.1, WIDTH / 2 + 9.5), heading: ringPoint(a + .01, 0).sub(ringPoint(a - .01, 0)).normalize() };
}
/** Centre of voice node i (pendants alternate outer / inner under the bottom chords). */
export const voicePosition = (i: number) => ringPoint((i + .5) / VOICE_NODES * Math.PI * 2, SKY_RING.deck - DEPTH - 3.3, i % 2 ? -WIDTH / 2 : WIDTH / 2);

const unit = new T.BoxGeometry(1, 1, 1), basis = new T.Matrix4();
/** A w × h member from a to b, its height axis kept near `up`. */
function member(parent: T.Object3D, a: T.Vector3, b: T.Vector3, w: number, h: number, material: T.Material, up = UP) {
  const mesh = new T.Mesh(unit, material), length = a.distanceTo(b);
  basis.lookAt(a, b, Math.abs(b.clone().sub(a).normalize().dot(up)) > .99 ? new T.Vector3(1, 0, 0) : up);
  mesh.quaternion.setFromRotationMatrix(basis); mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.scale.set(w, h, length);
  parent.add(mesh); return mesh;
}
/** A round member from a (radius r0) to b (radius r1): pylon legs taper towards the ring. */
function strut(parent: T.Object3D, a: T.Vector3, b: T.Vector3, r0: number, r1: number, material: T.Material) {
  const mesh = new T.Mesh(new T.CylinderGeometry(r1, r0, a.distanceTo(b), 8), material);
  mesh.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize()); mesh.position.copy(a).add(b).multiplyScalar(.5);
  parent.add(mesh); return mesh;
}
/** Plan outline of a w × d rectangle with corner radius r (shape y = outward); `open` leaves the deck side (y = -d/2) open as a U strip of width t. */
function plan(w: number, d: number, r: number, open = 0) {
  const s = new T.Shape(), x = w / 2, y = d / 2;
  if (!open) {
    s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false); s.lineTo(x, y - r); s.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
    s.lineTo(-x + r, y); s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false); s.lineTo(-x, -y + r); s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  const t = open, ri = r - t;
  s.moveTo(-x, -y); s.lineTo(-x, y - r); s.absarc(-x + r, y - r, r, Math.PI, Math.PI / 2, true); s.lineTo(x - r, y); s.absarc(x - r, y - r, r, Math.PI / 2, 0, true); s.lineTo(x, -y);
  s.lineTo(x - t, -y); s.lineTo(x - t, y - r); s.absarc(x - r, y - r, ri, 0, Math.PI / 2, false); s.lineTo(-x + r, y - t); s.absarc(-x + r, y - r, ri, Math.PI / 2, Math.PI, false); s.lineTo(-x + t, -y);
  return s;
}
/** A flat slab of `plan` outline, h thick, its top at y = 0 (berth layers with large plan radii, which RoundedBoxGeometry cannot give a thin slab). */
const slab = (shape: T.Shape, h: number, bevel = 0) => new T.ExtrudeGeometry(shape, { depth: h - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 })
  .translate(0, 0, bevel).rotateX(Math.PI / 2);
/** A mesh of `geometry` at `at` in `parent` (berth and pod parts). */
function part(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, at: T.Vector3) {
  const mesh = new T.Mesh(geometry, material); mesh.position.copy(at); parent.add(mesh); return mesh;
}

/** The mobility fleet's rounded pod at its 5× scale: pale shell, pill visors, docking-light keel, four ducted rotors on skids. */
function airPod() {
  const craft = new T.Group();
  part(craft, new RoundedBoxGeometry(7.5, 4, 12, 2, 1.75), pearl, new T.Vector3(0, .5, 0));
  // Pill visors along both top edges (dark blue-grey glass) instead of a wrap-round band.
  for (const x of [-1, 1]) part(craft, new T.CapsuleGeometry(.75, 7.5, 4, 12).rotateX(Math.PI / 2), visor, new T.Vector3(x * 2.75, 1.9, .4));
  part(craft, new RoundedBoxGeometry(6, .4, 10, 2, .15), futureLight, new T.Vector3(0, -1.5, 0));
  for (const [x, z] of [[-6.2, -5], [6.2, -5], [-6.2, 5], [6.2, 5]]) part(craft, new T.TorusGeometry(3, .55, 10, 28).rotateX(Math.PI / 2), pearl, new T.Vector3(x, 1.2, z));
  for (const x of [-2.6, 2.6]) member(craft, new T.Vector3(x, -1.85, -4.5), new T.Vector3(x, -1.85, 4.5), .4, .4, chrome);
  return craft;
}

export function skyRing(scene: T.Scene) {
  const root = new T.Group(); root.name = 'sky-ring';
  let explorePod: T.Group | undefined;
  const gates: T.Group[] = [];
  const top = SKY_RING.deck, bottom = top - DEPTH;
  const corners = (a: number) => ({ to: ringPoint(a, top - .7, WIDTH / 2), ti: ringPoint(a, top - .7, -WIDTH / 2), bo: ringPoint(a, bottom, WIDTH / 2), bi: ringPoint(a, bottom, -WIDTH / 2) });
  for (let i = 0; i < PANELS; i++) {
    const a0 = i / PANELS * Math.PI * 2, a1 = (i + 1) / PANELS * Math.PI * 2, p = corners(a0), q = corners(a1);
    // Member hierarchy: heavy bottom chords (the line seen from the city), lighter top chords, posts, then slim web diagonals.
    for (const k of ['to', 'ti'] as const) member(root, p[k], q[k], 1.5, 1.5, trim);
    for (const k of ['bo', 'bi'] as const) member(root, p[k], q[k], 2.2, 2.2, trim);
    // A second public deck sits inside the open truss, clear of its outer braces.
    member(root, ringPoint(a0, bottom + 1.4), ringPoint(a1, bottom + 1.4), WIDTH - 3, .5, warmUnder);
    for (const side of [-1, 1]) member(root, ringPoint(a0, bottom + 2.35, side * (WIDTH / 2 - 1.4)), ringPoint(a1, bottom + 2.35, side * (WIDTH / 2 - 1.4)), .1, 1.4, hallGlass);
    member(root, p.to, p.bo, .9, .9, trim); member(root, p.ti, p.bi, .9, .9, trim); member(root, p.bo, p.bi, .8, .8, trim);
    // Warren triangulation on both faces and the soffit, so the ring reads as built structure from below.
    member(root, i % 2 ? p.to : p.bo, i % 2 ? q.bo : q.to, .55, .55, trim); member(root, i % 2 ? p.bi : p.ti, i % 2 ? q.ti : q.bi, .55, .55, trim);
    member(root, p.bo, q.bi, .45, .45, trim);
    // Deck: the walkway and berth apron the corridor traffic lands on, edged by a deep stone fascia and a glass parapet on both sides;
    // both fascias carry the corridor's docking-light line.
    member(root, ringPoint(a0, top - .3), ringPoint(a1, top - .3), WIDTH + 2, .6, stone, UP);
    // The outer parapet opens where a berth meets the deck (berths sit on the boundary of panels 12b+5 and 12b+6).
    for (const s of [-1, 1]) {
      member(root, ringPoint(a0, top - 1.4, s * (WIDTH / 2 + 1.2)), ringPoint(a1, top - 1.4, s * (WIDTH / 2 + 1.2)), .5, 3.2, stone);
      if (s < 0 || i % 12 < 5 || i % 12 > 6) member(root, ringPoint(a0, top + .75, s * (WIDTH / 2 + .9)), ringPoint(a1, top + .75, s * (WIDTH / 2 + .9)), .15, 1.5, glass);
      member(root, ringPoint(a0, top - .9, s * (WIDTH / 2 + 1.5)), ringPoint(a1, top - .9, s * (WIDTH / 2 + 1.5)), .12, .55, futureLight);
    }
    // Close-spaced diagonal gussets along the lower chord.
    for (let j = 0; j < 4; j++) {
      const aa = a0 + (a1 - a0) * j / 4, ab = a0 + (a1 - a0) * (j + 1) / 4;
      for (const side of [-1, 1]) member(root, ringPoint(aa, bottom + .8, side * WIDTH / 2), ringPoint(ab, bottom + 2.3, side * WIDTH / 2), .22, .22, trim);
    }
    // Cast nodes where chords, posts and diagonals meet, so joints read as built connections rather than crossing boxes.
    for (const k of ['to', 'ti', 'bo', 'bi'] as const) { const n = k[0] === 'b' ? 3 : 2.2; part(root, new RoundedBoxGeometry(n, n, n, 1, n * .3), trim, p[k]).lookAt(q[k]); }
    // Irregular planted islands leave a clear inner-deck walking lane between them.
    if (i % 5 !== 0) {
      member(root, ringPoint(a0 + .006, top + .4, -WIDTH / 2 + 1.6), ringPoint(a1 - .006, top + .4, -WIDTH / 2 + 1.6), 2.6, .8, stone);
      for (let j = 0; j < 9; j++) {
        const f = (j + .25 + ((i * 11 + j * 7) % 7) / 14) / 9, size = .55 + ((i * 7 + j * 3) % 8) * .09;
        const tree = j === 2 + i % 4, at = a0 + (a1 - a0) * f, out = -WIDTH / 2 + 1.6 + (j % 2 ? .35 : -.35);
        if (tree) strut(root, ringPoint(at, top + .65, out), ringPoint(at, top + 3.2, out), .16, .1, trim);
        const crown = part(root, leafyCrown(1), leaf, ringPoint(at, top + 1 + (tree ? 2.4 : size * .6), out));
        crown.scale.set(tree ? 1.2 : 1.15, tree ? 1.25 + (i % 3) * .25 : .6 + (j % 3) * .2, tree ? 1.2 : 1.15).multiplyScalar(tree ? 1.1 : size);
        if (tree && i % 3 !== 0) {
          const crown2 = part(root, leafyCrown(1), leaf, ringPoint(at + .001, top + 3.4, out + .55));
          crown2.scale.set(.8, .8 + (i % 2) * .35, .8);
        }
      }
    }
  }
  // Berths: cantilevered aprons off the outer face, each braced back to the bottom chord, with a lit docking edge and one parked craft.
  for (let b = 0; b < BERTHS; b++) {
    const a = berthAngle(b), t = 12 / Math.hypot(SKY_RING.rx, SKY_RING.rz) * 1.4;
    // Layered apron (24 m along the ring, 19 m out, 5 m plan radius), owner target R5: a satin pearl deck whose raised rounded curb
    // frames a cool grey pad field, a low glass rim on the three open sides, a thick rounded pearl fascia carrying docking-light bars
    // on its straight faces, a recessed slate shadow band, then a smaller rounded belly so the cantilever reads shaped.
    const apron = new T.Group(); apron.position.copy(ringPoint(a, top, WIDTH / 2 + 9)); apron.lookAt(ringPoint(a, top, 0)); apron.rotateY(Math.PI); root.add(apron);
    part(apron, slab(plan(24, 19, 5), .3), pearl, new T.Vector3(0, 0, 0));
    part(apron, slab(plan(23.7, 18.7, 4.85, 1.3), .5, .15), pearl, new T.Vector3(0, .45, 0));
    part(apron, slab(plan(19.6, 16, 3.4), .04), padGrey, new T.Vector3(0, .04, .8));
    part(apron, new T.BoxGeometry(14, .8, .12), hallGlass, new T.Vector3(0, .85, 9.25));
    for (const side of [-1, 1]) part(apron, slab(plan(10, 9, 3), .35, .1), pearl, new T.Vector3(side * 13, -.04, -5));
    part(apron, slab(plan(23.5, 18.5, 4.75), 1.3, .45), pearl, new T.Vector3(0, -.2, 0));
    part(apron, slab(plan(23.2, 18.2, 4.6), .6), slate, new T.Vector3(0, -1.45, 0));
    part(apron, slab(plan(21, 16, 4.2), 1.2, .5), pearl, new T.Vector3(0, -2, -.4));
    apron.scale.set(1.25, 1, 1.25);
    // Docking-light bars set into the fascia's straight faces (outer face and both sides), stopping short of the rounded corners.
    part(apron, new T.BoxGeometry(12, .3, .12), futureLight, new T.Vector3(0, -.85, 9.74));
    for (const x of [-1, 1]) part(apron, new T.BoxGeometry(.12, .3, 7), futureLight, new T.Vector3(x * 12.24, -.85, .5));
    for (const s of [-1, 1]) member(root, ringPoint(a + s * t * .55, top - 1.5, WIDTH / 2 + 17), ringPoint(a + s * t * .55, bottom, WIDTH / 2), .8, .8, trim);
    // Pad: a docking ring on the apron (the same docking light) and a glazed boarding hall on the outer half of the deck behind it.
    // Pad markings (target R5): one broad flat docking circle under the pod's rotors, an inner guide line along the pad field's deck
    // side and two short corner dashes on its outer side.
    part(root, new T.RingGeometry(5.7, 6.5, 56).rotateX(-Math.PI / 2), futureLight, ringPoint(a, top + .045, WIDTH / 2 + 9.5));
    part(apron, new T.BoxGeometry(16, .05, .3), futureLight, new T.Vector3(0, .08, -6.6));
    for (const x of [-1, 1]) part(apron, new T.BoxGeometry(.3, .05, 3.2), futureLight, new T.Vector3(x * 9.2, .08, 5.4));
    const gate = skyRingGate(b); root.add(gate);
    // Two-level glass pavilion: clear blue glazing on slim mullions, a white mezzanine band, and a long rounded roof cantilevered past
    // both ends (kept under the ring's 8 m roofline).
    for (const z of [-2.8, 2.8]) {
      if (z < 0) for (const side of [-1, 1]) part(gate, new T.BoxGeometry(13.5, 6.8, .12), lobbyGlass, new T.Vector3(side * 8.25, 3.5, z));
      else part(gate, new T.BoxGeometry(30, 6.8, .12), lobbyGlass, new T.Vector3(0, 3.5, z));
      for (let x = -15; x <= 15; x += 2) if (z > 0 || Math.abs(x) > 1) member(gate, new T.Vector3(x, .1, z), new T.Vector3(x, 6.9, z), .18, .18, trim);
    }
    for (const x of [15]) part(gate, new T.BoxGeometry(.12, 6.8, 5.6), lobbyGlass, new T.Vector3(x, 3.5, 0));
    part(gate, slab(plan(31, 7.6, 1.5), .45), hallFloor, new T.Vector3(0, 3.6, 0));
    part(gate, slab(plan(44, 10, 4), .5), trim, new T.Vector3(0, 7.5, -.4));
    for (const x of [-20, 20]) member(gate, new T.Vector3(x, 0, -4), new T.Vector3(x, 7, -4), .3, .3, trim);
    part(gate, slab(plan(31, 7.6, 1.5), .12), stone, new T.Vector3(0, .08, 0));
    // Raised landing joins the external stair to the mezzanine through the open end.
    part(gate, new T.BoxGeometry(3, .3, 3), trim, new T.Vector3(-15.8, 3.44, -1.5));
    // The lower stair starts inside the truss and ends at the adjoining apron.
    part(gate, new T.BoxGeometry(4, .35, 4), stone, new T.Vector3(-11, bottom + 1.475 - top, -2));
    part(gate, new T.BoxGeometry(3, .25, 3), pearl, new T.Vector3(-11, -.125, -14.5));
    gates.push(gate);
    // Parked air pod; the explore berth's pod stays a separate group so a guest's look can fly it.
    const craft = airPod(), park = berthPark(b);
    craft.position.copy(park.position); craft.lookAt(craft.position.clone().add(park.heading));
    if (b === EXPLORE_BERTH) explorePod = craft; else root.add(craft);
  }
  // V pylons: two tapering diagonal legs from one cast knuckle on a stone pier (water / open ground) up to saddle beams under both
  // bottom chords, tied once (Fuji frame and diagonal DNA).
  for (const a of PYLONS) {
    const foot = ringPoint(a, 8, WIDTH / 2 + 95), spread = 55 / Math.hypot(SKY_RING.rx, SKY_RING.rz) * 1.4;
    const tops = [-1, 1].map(s => ringPoint(a + s * spread, bottom - 3, WIDTH / 2 - 1));
    for (const t of tops) strut(root, foot.clone().lerp(t, .002), t.clone().lerp(foot, .002), 3.4, 2, trim);
    member(root, foot.clone().lerp(tops[0], .55), foot.clone().lerp(tops[1], .55), 1.6, 1.6, trim);
    for (const s of [-1, 1]) member(root, ringPoint(a + s * spread, bottom - 2.3, WIDTH / 2 + 2.5), ringPoint(a + s * spread, bottom - 2.3, -WIDTH / 2 - 2.5), 3.6, 3.4, trim);
    part(root, new T.CylinderGeometry(9, 12, 9.2, 8), stone, foot.clone().setY(1.4));
    part(root, new T.CylinderGeometry(3.6, 5.2, 4, 8), trim, foot.clone().setY(8));
  }
  // Voice fittings: a pendant stem and cap under each bottom chord, so every node (lit or still waiting) hangs from the structure.
  for (let i = 0; i < VOICE_NODES; i++) {
    const at = (i + .5) / VOICE_NODES * Math.PI * 2, out = i % 2 ? -WIDTH / 2 : WIDTH / 2;
    member(root, ringPoint(at, bottom - 1, out), ringPoint(at, bottom - 2.4, out), .25, .25, trim);
    part(root, new T.CylinderGeometry(.5, .9, .4, 8), trim, ringPoint(at, bottom - 2.3, out));
  }
  const fixed = bake(root);
  // Residents' voices: one node per accumulated proposal on the rim, hung below the bottom chords (alternately outer / inner).
  const voices = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial(), VOICE_NODES); voices.name = 'sky-ring-voices';
  const dummy = new T.Object3D(), warm = new T.Color('#fff0d6'), coolLamp = new T.Color('#e6f2ff'), fitting = new T.Color('#b9bcbd'), lit = new T.Color(), unlit = new T.Color();
  for (let i = 0; i < VOICE_NODES; i++) {
    dummy.position.copy(voicePosition(i)); dummy.updateMatrix();
    voices.setMatrixAt(i, dummy.matrix);
  }
  // Residents on the deck: a few waiting at each boarding hall, others strolling the garden walk (standing poses; the ring is a review subject, not a route).
  const RESIDENTS = 640, people = pedestrians(scene, RESIDENTS, 'sky-ring-residents'), pose = new T.Object3D();
  const contact = new T.InstancedMesh(new T.CircleGeometry(.32, 12).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: '#5c6a6d', transparent: true, opacity: .32, depthWrite: false }), 300);
  contact.name = 'sky-ring-hall-contact';
  for (let k = 0; k < RESIDENTS; k++) {
    if (k < 300) {
      // Hall occupants use the hall's actual local floor, not the curved ring approximation.
      const gate = gates[k % BERTHS], j = Math.floor(k / BERTHS);
      pose.position.set((Math.floor(j / 2) % 5 - 2) * 5, j % 2 ? 3.6 : .08, (Math.floor(j / 10) - 1) * .9).applyMatrix4(gate.matrixWorld);
    } else {
      const lower = k >= 480, j = k - (lower ? 480 : 300);
      const a = lower ? (Math.floor(j / 2) + (j % 2 ? .67 : .33)) / PANELS * Math.PI * 2 : (j * 1.618) % (Math.PI * 2);
      pose.position.copy(ringPoint(a, lower ? bottom + 1.65 : top, lower ? (j % 2 ? 1 : -1) : (j % 3 - 1) * 2));
    }
    pose.position.y -= .05;
    pose.rotation.set(0, (k * 2.39) % (Math.PI * 2), 0); people.set(k, pose); people.gait(k, 0, 0);
    if (k < 300) { pose.position.y += .065; pose.updateMatrix(); contact.setMatrixAt(k, pose.matrix); }
  }
  people.flush(); contact.instanceMatrix.needsUpdate = true; scene.add(contact);
  // One guest's own node during their look: a halo drawn over the structure (it may hang on the far side of the ring) above a node brightened by the caller's pulse.
  const halo = new T.Sprite(new T.SpriteMaterial({ map: typeof document === 'undefined' ? null : glowTexture(), color: '#ffd9a0', transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  halo.name = 'sky-ring-own-voice'; halo.visible = false;
  const pod = explorePod!; pod.name = 'sky-ring-explore-pod';
  const architecture = new T.Group(); architecture.name = 'sky-ring-architecture';
  scene.add(...fixed, voices, pod, halo, architecture);
  // Blender-authored pylon shells and stairs remain separate from the animated pod and count-controlled lamps.
  if (typeof window !== 'undefined') new GLTFLoader().load(new URL('../asset/models/sky-ring-architecture/sky-ring-architecture.glb', import.meta.url).href, ({ scene: model }) => {
    architecture.add(skyRingArchitecture(model));
  }, undefined, error => console.error('Sky Ring architecture failed to load', error));
  let shown = 0, dark = -1, own = -1, ownGlow = 0;
  const ownColor = new T.Color();
  const paint = () => {
    for (let i = 0; i < VOICE_NODES; i++) voices.setColorAt(i, unlit);
    for (let k = 0; k < shown; k++) voices.setColorAt(voiceSlot(k), lit);
    if (own >= 0) voices.setColorAt(own, ownColor.copy(lit).lerp(warm, .3).multiplyScalar(1 + 3 * ownGlow));
    voices.instanceColor!.needsUpdate = true;
  };
  return {
    root: [...fixed, voices, pod, architecture, contact, ...people.meshes],
    /** The explore berth's pod, parked unless a guest's look is flying it. */
    pod,
    /** Guest k's own node (0-based, null to clear) at glow 0–1; the halo is sized for the whole-ring view. */
    highlight(k: number | null, glow = 0) {
      own = k === null ? -1 : voiceSlot(k); ownGlow = glow;
      halo.visible = own >= 0 && glow > 0;
      if (halo.visible) { halo.position.copy(voicePosition(own)); halo.scale.setScalar(18 + 22 * glow); halo.material.opacity = .35 + .65 * glow; }
      paint();
    },
    /** Light one node per proposal so far (count only); the ring is full from VOICE_NODES guests on. */
    setVoices(count: number) {
      const n = Math.min(VOICE_NODES, Math.max(0, Math.floor(count)));
      if (n !== shown) { shown = n; paint(); }
    },
    litVoices: () => shown,
    /** By day the nodes are pale fittings, the lit ones faintly warm; at night lit nodes are HDR points (bloom) and unlit ones go dark. */
    update(darkness: number) {
      if (Math.abs(darkness - dark) < .02) return; dark = darkness;
      warmUnder.emissiveIntensity = darkness * .7;
      lit.copy(warm).lerp(coolLamp, darkness).multiplyScalar(.95 + 2.8 * darkness); unlit.copy(fitting).multiplyScalar(.75 - .5 * darkness); paint();
    },
  };
}
