import * as T from 'three';
import { bake, trim, stone, glass, futureLight, chrome } from './cityRig.ts';
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

export function skyRing(scene: T.Scene) {
  const root = new T.Group(); root.name = 'sky-ring';
  const top = SKY_RING.deck, bottom = top - DEPTH;
  const corners = (a: number) => ({ to: ringPoint(a, top - .7, WIDTH / 2), ti: ringPoint(a, top - .7, -WIDTH / 2), bo: ringPoint(a, bottom, WIDTH / 2), bi: ringPoint(a, bottom, -WIDTH / 2) });
  for (let i = 0; i < PANELS; i++) {
    const a0 = i / PANELS * Math.PI * 2, a1 = (i + 1) / PANELS * Math.PI * 2, p = corners(a0), q = corners(a1);
    for (const k of ['to', 'ti', 'bo', 'bi'] as const) member(root, p[k], q[k], 1.4, 1.4, trim);
    member(root, p.to, p.bo, .9, .9, trim); member(root, p.ti, p.bi, .9, .9, trim); member(root, p.bo, p.bi, .8, .8, trim);
    // Warren triangulation on both faces and the soffit, so the ring reads as built structure from below.
    member(root, i % 2 ? p.to : p.bo, i % 2 ? q.bo : q.to, .7, .7, trim); member(root, i % 2 ? p.bi : p.ti, i % 2 ? q.ti : q.bi, .7, .7, trim);
    member(root, p.bo, q.bi, .6, .6, trim);
    // Deck: the walkway and berth apron the corridor traffic lands on; its outer edge carries the corridor's docking line.
    member(root, ringPoint(a0, top - .3), ringPoint(a1, top - .3), WIDTH + 2, .6, stone, UP);
    member(root, ringPoint(a0, top + .1, WIDTH / 2 + 1), ringPoint(a1, top + .1, WIDTH / 2 + 1), .45, .3, futureLight);
  }
  // Berths: cantilevered aprons off the outer face, each braced back to the bottom chord, with a lit docking edge and one parked craft.
  for (let b = 0; b < BERTHS; b++) {
    const a = (b + .5) / BERTHS * Math.PI * 2, t = 12 / Math.hypot(SKY_RING.rx, SKY_RING.rz) * 1.4;
    const inner = ringPoint(a, top - .5, WIDTH / 2), outer = ringPoint(a, top - .5, WIDTH / 2 + 18);
    member(root, inner, outer, 22, 1, stone);
    for (const s of [-1, 1]) member(root, ringPoint(a + s * t * .55, top - 1, WIDTH / 2 + 18), ringPoint(a + s * t * .55, bottom, WIDTH / 2), .8, .8, trim);
    member(root, ringPoint(a - t * .55, top + .05, WIDTH / 2 + 18.1), ringPoint(a + t * .55, top + .05, WIDTH / 2 + 18.1), .5, .25, futureLight);
    // Parked air pod (the mobility fleet's pod proportions at its 5× scale): pale shell, glass canopy, four rotor guards.
    const craft = new T.Group(), heading = ringPoint(a + .01, 0).sub(ringPoint(a - .01, 0)).normalize();
    craft.position.copy(ringPoint(a, top + 2.2, WIDTH / 2 + 9)); craft.lookAt(craft.position.clone().add(heading)); root.add(craft);
    member(craft, new T.Vector3(0, 0, -6), new T.Vector3(0, 0, 6), 7.5, 4, trim);
    member(craft, new T.Vector3(0, 1.6, -2.5), new T.Vector3(0, 1.6, 5), 7.8, 1.5, glass);
    for (const [x, z] of [[-5.8, -4.8], [5.8, -4.8], [-5.8, 4.8], [5.8, 4.8]]) member(craft, new T.Vector3(x, .7, z - 2.5), new T.Vector3(x, .7, z + 2.5), 5, .4, chrome);
  }
  // V pylons: two diagonal legs from one foot on the water / open ground up to the bottom chord, braced at thirds (Fuji frame and diagonal DNA).
  for (const a of PYLONS) {
    const foot = ringPoint(a, -1.2, WIDTH / 2 + 95), spread = 55 / Math.hypot(SKY_RING.rx, SKY_RING.rz) * 1.4;
    const tops = [-1, 1].map(s => ringPoint(a + s * spread, bottom, WIDTH / 2 - 1));
    for (const t of tops) member(root, foot, t, 5, 5, trim);
    for (const f of [.36, .7]) member(root, foot.clone().lerp(tops[0], f), foot.clone().lerp(tops[1], f), 2.2, 2.2, trim);
    member(root, tops[0], tops[1], 2.4, 2.4, trim);
    const plinth = new T.Mesh(new T.CylinderGeometry(9, 11, 6, 8), stone); plinth.position.copy(foot).setY(1); root.add(plinth);
  }
  const fixed = bake(root);
  // Residents' voices: one node per accumulated proposal on the rim, hung below the bottom chords (alternately outer / inner).
  const voices = new T.InstancedMesh(new T.IcosahedronGeometry(1.3, 1), new T.MeshBasicMaterial(), VOICE_NODES); voices.name = 'sky-ring-voices';
  const dummy = new T.Object3D(), warm = new T.Color('#fff0d6'), fitting = new T.Color('#b9bcbd'), lit = new T.Color(), unlit = new T.Color();
  for (let i = 0; i < VOICE_NODES; i++) {
    dummy.position.copy(ringPoint((i + .5) / VOICE_NODES * Math.PI * 2, bottom - 1.2, i % 2 ? -WIDTH / 2 : WIDTH / 2)); dummy.updateMatrix();
    voices.setMatrixAt(i, dummy.matrix);
  }
  scene.add(...fixed, voices);
  let shown = 0, dark = -1;
  const paint = () => {
    for (let i = 0; i < VOICE_NODES; i++) voices.setColorAt(i, unlit);
    for (let k = 0; k < shown; k++) voices.setColorAt(voiceSlot(k), lit);
    voices.instanceColor!.needsUpdate = true;
  };
  return {
    root: [...fixed, voices],
    /** Light one node per proposal so far (count only); the ring is full from VOICE_NODES guests on. */
    setVoices(count: number) {
      const n = Math.min(VOICE_NODES, Math.max(0, Math.floor(count)));
      if (n !== shown) { shown = n; paint(); }
    },
    litVoices: () => shown,
    /** By day the nodes are pale fittings, the lit ones faintly warm; at night lit nodes are HDR points (bloom) and unlit ones go dark. */
    update(darkness: number) {
      if (Math.abs(darkness - dark) < .02) return; dark = darkness;
      lit.copy(warm).multiplyScalar(.95 + 2.8 * darkness); unlit.copy(fitting).multiplyScalar(.75 - .65 * darkness); paint();
    },
  };
}
