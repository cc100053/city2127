import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { bake, trim, stone, glass, futureLight, chrome, skyGlass, leaf, leafyCrown } from './cityRig.ts';
import { pedestrians } from './mobility.ts';
import { SKY_RING } from './layout.ts';

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

/** Point on the ring's centre line at height `y`, offset `out` m along the horizontal outward normal. */
export function ringPoint(a: number, y: number, out = 0) {
  const n = new T.Vector3(Math.cos(a) / SKY_RING.rx, 0, Math.sin(a) / SKY_RING.rz).normalize();
  return new T.Vector3(SKY_RING.x + Math.cos(a) * SKY_RING.rx, y, SKY_RING.z + Math.sin(a) * SKY_RING.rz).addScaledVector(n, out);
}
/** Guest k (0-based) lights node `voiceSlot(k)`: a stride coprime with VOICE_NODES spreads the accumulated voices around the whole ring. */
export const voiceSlot = (k: number) => (k * 97) % VOICE_NODES;

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
/** A mesh of `geometry` at `at` in `parent` (berth and pod parts). */
function part(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, at: T.Vector3) {
  const mesh = new T.Mesh(geometry, material); mesh.position.copy(at); parent.add(mesh); return mesh;
}

export function skyRing(scene: T.Scene) {
  const root = new T.Group(); root.name = 'sky-ring';
  const top = SKY_RING.deck, bottom = top - DEPTH;
  const corners = (a: number) => ({ to: ringPoint(a, top - .7, WIDTH / 2), ti: ringPoint(a, top - .7, -WIDTH / 2), bo: ringPoint(a, bottom, WIDTH / 2), bi: ringPoint(a, bottom, -WIDTH / 2) });
  for (let i = 0; i < PANELS; i++) {
    const a0 = i / PANELS * Math.PI * 2, a1 = (i + 1) / PANELS * Math.PI * 2, p = corners(a0), q = corners(a1);
    // Member hierarchy: heavy bottom chords (the line seen from the city), lighter top chords, posts, then slim web diagonals.
    for (const k of ['to', 'ti'] as const) member(root, p[k], q[k], 1.5, 1.5, trim);
    for (const k of ['bo', 'bi'] as const) member(root, p[k], q[k], 2.2, 2.2, trim);
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
    // Cast nodes where chords, posts and diagonals meet, so joints read as built connections rather than crossing boxes.
    for (const k of ['to', 'ti', 'bo', 'bi'] as const) { const n = k[0] === 'b' ? 3 : 2.2; part(root, new RoundedBoxGeometry(n, n, n, 1, n * .3), trim, p[k]).lookAt(q[k]); }
    // Planted inner edge: a stone planter per panel under a continuous hedge and three crowns of varied size, the residents' garden walk.
    member(root, ringPoint(a0 + .006, top + .45, -WIDTH / 2 + 1.6), ringPoint(a1 - .006, top + .45, -WIDTH / 2 + 1.6), 2.4, .9, stone);
    member(root, ringPoint(a0 + .004, top + 1.2, -WIDTH / 2 + 1.6), ringPoint(a1 - .004, top + 1.2, -WIDTH / 2 + 1.6), 2.1, .8, leaf);
    for (const [j, f] of [.18, .5, .82].entries()) {
      const size = .7 + ((i * 7 + j * 3) % 5) * .14, crown = part(root, leafyCrown(1), leaf, ringPoint(a0 + (a1 - a0) * f, top + 1.6 + size * 1.6, -WIDTH / 2 + 1.6));
      crown.scale.set(2.2, 2.4, 2.2).multiplyScalar(size);
    }
  }
  // Berths: cantilevered aprons off the outer face, each braced back to the bottom chord, with a lit docking edge and one parked craft.
  for (let b = 0; b < BERTHS; b++) {
    const a = (b + .5) / BERTHS * Math.PI * 2, t = 12 / Math.hypot(SKY_RING.rx, SKY_RING.rz) * 1.4;
        // Rounded apron (24 m along the ring, 19 m out) with a docking-light band round its edge.
    const apron = new T.Group(); apron.position.copy(ringPoint(a, top, WIDTH / 2 + 9)); apron.lookAt(ringPoint(a, top, 0)); root.add(apron);
    part(apron, new RoundedBoxGeometry(24, 1.6, 19, 2, .75), stone, new T.Vector3(0, -.8, 0));
    part(apron, new RoundedBoxGeometry(24.4, .35, 19.4, 2, .2), futureLight, new T.Vector3(0, -.9, 0));
    for (const s of [-1, 1]) member(root, ringPoint(a + s * t * .55, top - 1.5, WIDTH / 2 + 17), ringPoint(a + s * t * .55, bottom, WIDTH / 2), .8, .8, trim);
    // Pad: a docking ring on the apron (the same docking light) and a glazed boarding hall on the outer half of the deck behind it.
    part(root, new T.TorusGeometry(7, .22, 4, 40).rotateX(Math.PI / 2), futureLight, ringPoint(a, top + .05, WIDTH / 2 + 9.5));
    const gate = new T.Group(); gate.position.copy(ringPoint(a, top, WIDTH / 2 - 3)); gate.lookAt(ringPoint(a, top, 0)); root.add(gate);
    part(gate, new RoundedBoxGeometry(24, 4.6, 5.4, 2, .5), skyGlass, new T.Vector3(0, 2.3, 0));
    part(gate, new RoundedBoxGeometry(28, .5, 8.5, 2, .22), trim, new T.Vector3(0, 4.85, -.6));
    for (const x of [-13, 13]) member(gate, new T.Vector3(x, 0, -4), new T.Vector3(x, 4.6, -4), .35, .35, trim);
    // Parked air pod (the mobility fleet's rounded pod at its 5× scale): pale shell, glass canopy, docking-light keel, four ducted rotors on skids.
    const craft = new T.Group(), heading = ringPoint(a + .01, 0).sub(ringPoint(a - .01, 0)).normalize();
    craft.position.copy(ringPoint(a, top + 2.2, WIDTH / 2 + 9.5)); craft.lookAt(craft.position.clone().add(heading)); root.add(craft);
    part(craft, new RoundedBoxGeometry(7.5, 4, 12, 2, 1.75), trim, new T.Vector3(0, .5, 0));
    part(craft, new RoundedBoxGeometry(7.8, 1.5, 7.5, 2, .6), glass, new T.Vector3(0, 1.6, 1.25));
    part(craft, new RoundedBoxGeometry(6, .4, 10, 2, .15), futureLight, new T.Vector3(0, -1.5, 0));
    for (const [x, z] of [[-5.75, -4.75], [5.75, -4.75], [-5.75, 4.75], [5.75, 4.75]]) part(craft, new T.TorusGeometry(2.75, .4, 6, 20).rotateX(Math.PI / 2), trim, new T.Vector3(x, .75, z));
    for (const x of [-2.6, 2.6]) member(craft, new T.Vector3(x, -1.9, -4.5), new T.Vector3(x, -1.9, 4.5), .4, .4, chrome);
  }
  // V pylons: two tapering diagonal legs from one cast knuckle on a stone pier (water / open ground) up to saddle beams under both
  // bottom chords, tied once (Fuji frame and diagonal DNA).
  for (const a of PYLONS) {
    const foot = ringPoint(a, 8, WIDTH / 2 + 95), spread = 55 / Math.hypot(SKY_RING.rx, SKY_RING.rz) * 1.4;
    const tops = [-1, 1].map(s => ringPoint(a + s * spread, bottom - 3, WIDTH / 2 - 1));
    for (const t of tops) strut(root, foot, t, 3.4, 2, trim);
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
  const dummy = new T.Object3D(), warm = new T.Color('#fff0d6'), fitting = new T.Color('#b9bcbd'), lit = new T.Color(), unlit = new T.Color();
  for (let i = 0; i < VOICE_NODES; i++) {
    dummy.position.copy(ringPoint((i + .5) / VOICE_NODES * Math.PI * 2, bottom - 3.3, i % 2 ? -WIDTH / 2 : WIDTH / 2)); dummy.updateMatrix();
    voices.setMatrixAt(i, dummy.matrix);
  }
  // Residents on the deck: a few waiting at each boarding hall, others strolling the garden walk (standing poses; the ring is a review subject, not a route).
  const RESIDENTS = 200, people = pedestrians(scene, RESIDENTS, 'sky-ring-residents'), pose = new T.Object3D();
  for (let k = 0; k < RESIDENTS; k++) {
    const atGate = k < 80, b = k % BERTHS, j = Math.floor(k / BERTHS);
    const a = atGate ? (b + .5) / BERTHS * Math.PI * 2 + ((j * 37) % 23 - 11) / SKY_RING.rx : (k * 1.618) % (Math.PI * 2);
    const out = atGate ? (j % 2 ? WIDTH / 2 - 7.2 : WIDTH / 2 + 4 + (j * 5) % 9) : -WIDTH / 2 + 4 + ((k * 13) % 7);
    pose.position.copy(ringPoint(a, top, out)); pose.rotation.set(0, (k * 2.39) % (Math.PI * 2), 0); people.set(k, pose); people.gait(k, 0, 0);
  }
  people.flush();
  scene.add(...fixed, voices);
  let shown = 0, dark = -1;
  const paint = () => {
    for (let i = 0; i < VOICE_NODES; i++) voices.setColorAt(i, unlit);
    for (let k = 0; k < shown; k++) voices.setColorAt(voiceSlot(k), lit);
    voices.instanceColor!.needsUpdate = true;
  };
  return {
    root: [...fixed, voices, ...people.meshes],
    /** Light one node per proposal so far (count only); the ring is full from VOICE_NODES guests on. */
    setVoices(count: number) {
      const n = Math.min(VOICE_NODES, Math.max(0, Math.floor(count)));
      if (n !== shown) { shown = n; paint(); }
    },
    litVoices: () => shown,
    /** By day the nodes are pale fittings, the lit ones faintly warm; at night lit nodes are HDR points (bloom) and unlit ones go dark. */
    update(darkness: number) {
      if (Math.abs(darkness - dark) < .02) return; dark = darkness;
      lit.copy(warm).multiplyScalar(.95 + 2.8 * darkness); unlit.copy(fitting).multiplyScalar(.75 - .5 * darkness); paint();
    },
  };
}
