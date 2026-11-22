import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildHullFacade, hullFrameReturns, hullFront, hullLobby, hullRear, hullTiers } from './hullFacade.ts';
import { hash, plantCanopy, plantShrubs } from './coastalCanopy.ts';
import { bodyFootprints, inRect } from './megaFootprints.ts';
import { addCityModel } from './modelAssets.ts';
import { sign, type Kit } from './cityRig.ts';
import { lightSlopePlants, slopePlants, type SlopePlant } from './slopePlants.ts';

// P1 (city-taste-v2): the three colossal megastructures of the master target — ring-on-edge building, white arch, stepped terraced hull.
// Ground contacts and sizes are exported for the test and for carving the context massing they replace. Metres.
export * from './megaFootprints.ts';
import { ARCH, HULL, RING, RING_GATE } from './megaFootprints.ts';

/** Finishes shared by all three pieces; the seam glows with the night. */
export const megaShell = new T.MeshStandardMaterial({ color: '#f3f2ec', roughness: .5, metalness: .08 });
export const megaRib = new T.MeshStandardMaterial({ color: '#dde1e2', roughness: .5, metalness: .2 });
export const megaSeam = new T.MeshStandardMaterial({ color: '#cfe8ff', emissive: '#cfe8ff', emissiveIntensity: .6, roughness: .5 });
export const megaGlass = new T.MeshStandardMaterial({ color: '#8fa3ae', roughness: .15, metalness: .3 });
const megaPlant = new T.MeshStandardMaterial({ color: '#6f9a5c', roughness: .9 });
// Night: about 60% of the glass cells (6 m × 4.2 m, world hash) glow warm, like the retained landmarks' lit rooms.
const roomGlow = { value: 0 }, glassGlow = { value: new T.Vector3(1, .58, .24) };
megaGlass.onBeforeCompile = shader => {
  shader.uniforms.roomGlow = roomGlow; shader.uniforms.glassGlow = glassGlow;
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 megaP;').replace('#include <project_vertex>', '#include <project_vertex>\nmegaP = (modelMatrix * vec4(transformed, 1.)).xyz;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float roomGlow;\nuniform vec3 glassGlow;\nvarying vec3 megaP;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    totalEmissiveRadiance += glassGlow * roomGlow * .74 * step(.4, fract(sin(dot(floor(vec2((megaP.x + megaP.z) / 6., megaP.y / 4.2)), vec2(12.9898, 78.233))) * 43758.5453));`);
};
megaGlass.customProgramCacheKey = () => 'mega-glass';
// polish2: the hoop's two faces are its facade — white frame, 3 m × 4.2 m storey windows (pale blue-grey glass by day), ~65% occupied rooms lit warm at night.
const megaFace = megaShell.clone();
megaFace.onBeforeCompile = shader => {
  shader.uniforms.roomGlow = roomGlow;
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 megaP;').replace('#include <project_vertex>', '#include <project_vertex>\nmegaP = (modelMatrix * vec4(transformed, 1.)).xyz;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float roomGlow;\nvarying vec3 megaP;')
    .replace('#include <color_fragment>', `#include <color_fragment>
    vec2 faceCell = vec2(dot(megaP.xz, vec2(${Math.cos(RING.yaw).toFixed(4)}, ${(-Math.sin(RING.yaw)).toFixed(4)})) / 3., megaP.y / 4.2), faceF = fract(faceCell);
    float faceWin = step(.16, faceF.x) * step(faceF.x, .84) * step(.24, faceF.y) * step(faceF.y, .9);
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(.6, .68, .74), vec3(.2, .22, .26), roomGlow), faceWin * .8); // dark panes at night, so lit rooms stay amber`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    totalEmissiveRadiance += vec3(1., .55, .2) * roomGlow * .8 * faceWin * step(.35, fract(sin(dot(floor(faceCell), vec2(12.9898, 78.233))) * 43758.5453));`);
};
megaFace.customProgramCacheKey = () => 'mega-face';
const megaJoint = new T.MeshStandardMaterial({ color: '#4b5258', roughness: .6, metalness: .3 });
/** The dark mouth of the hull's Yurikamome tunnel, faintly lit from inside. */
const megaPortal = new T.MeshStandardMaterial({ color: '#141b20', emissive: '#30485a', emissiveIntensity: .35, roughness: .8 });
/** Tunnel lights in the ring's road gate (outside the carve, so its own finish). */
const gateLight = new T.MeshStandardMaterial({ color: '#fff4dc', emissive: '#fff1d0', emissiveIntensity: .8, roughness: .4 });
const ringGlazing = new T.MeshStandardMaterial({ color: '#6c8895', emissive: '#c59262', emissiveIntensity: .06, roughness: .22, metalness: .26 });
// The hull's single pane layer reveals the built recesses behind it.
const hullGlass = new T.MeshPhysicalMaterial({
  name: 'hull-glass', color: '#789bac', transparent: true, opacity: .32, depthWrite: false,
  roughness: .15, metalness: .26, clearcoat: .65, clearcoatRoughness: .13,
});
const hullCove = new T.MeshStandardMaterial({
  name: 'hull-room-cove', color: '#b9afa1', emissive: '#ffd29b', emissiveIntensity: .02, roughness: .64,
});
hullCove.onBeforeCompile = shader => {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 hullRoom;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nhullRoom = uv;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 hullRoom;')
    .replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(vec3(1.), vec3(1.12, .92, .73), step(.5, hullRoom.x));`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float cove = smoothstep(.685, .76, hullRoom.y) * (1. - smoothstep(.845, .94, hullRoom.y));
      float rooms = .13 + .28 * hullRoom.y + .71 * cove;
      float focus = mix(.41 + .48 * hullRoom.y, 1.28, step(1.5, hullRoom.x));
      focus = mix(focus, .24, step(2.5, hullRoom.x));
      focus = mix(focus, .23 + .47 * smoothstep(.1, 1., hullRoom.y), step(3.5, hullRoom.x));
      totalEmissiveRadiance *= mix(rooms, focus, step(.5, hullRoom.x));`);
};
hullCove.customProgramCacheKey = () => 'hull-room-cove';
const hullFinishes = { shell: megaShell, silver: megaRib, shadow: megaJoint, glass: hullGlass, cove: hullCove };
const transferCove = gateLight.clone();
transferCove.color.set('#f1cf9d'); transferCove.emissive.set('#ffc77d');
const ringFinishes = new Map([
  ['ring_wayfinding', megaSeam], ['ring_cove', gateLight], ['ring_glazing', ringGlazing],
  ['transfer_wayfinding', megaSeam], ['transfer_cove', transferCove],
]);
/** The megastructures' own copies of the shared finishes: same look, but the hoop is cut open over the road gate (`RING_GATE`, a skewed box in
 * ring-local plan). Skyways and Meter pieces keep the exported originals, so nothing else is carved; the merge swaps in these copies. */
const carved = new Map<T.Material, T.Material>();
function carve(base: T.MeshStandardMaterial, key: string) {
  const m = base.clone(), c = Math.cos(RING.yaw), s = Math.sin(RING.yaw), f = (v: number) => v.toFixed(4), [r0, r1] = RING_GATE.right;
  m.onBeforeCompile = (shader, renderer) => {
    base.onBeforeCompile(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 gateP;').replace('#include <project_vertex>', '#include <project_vertex>\ngateP = (modelMatrix * vec4(transformed, 1.)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 gateP;').replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
    { vec2 g = gateP.xz - vec2(${f(RING.x)}, ${f(RING.z)}); float lx = dot(g, vec2(${f(c)}, ${f(-s)})), lz = dot(g, vec2(${f(s)}, ${f(c)}));
      if (abs(lz) < ${f(RING_GATE.reach)} && lx > ${f(RING_GATE.left)} && lx < mix(${f(r0)}, ${f(r1)}, (lz + ${f(RING.depth / 2)}) / ${f(RING.depth)}) && gateP.y < ${f(RING_GATE.top)}) discard; }`);
  };
  m.customProgramCacheKey = () => key + '-gate';
  carved.set(base, m); return m;
}
const carvedSeam = carve(megaSeam, 'seam');
carve(megaShell, 'shell'); carve(megaRib, 'rib'); carve(megaGlass, 'mega-glass'); carve(megaFace, 'mega-face');
export const updateMegastructures = (night: number) => {
  megaSeam.emissiveIntensity = .6 + night * 1.6; (carvedSeam as T.MeshStandardMaterial).emissiveIntensity = megaSeam.emissiveIntensity;
  gateLight.emissiveIntensity = .8 + night * 1.4; roomGlow.value = night;
  ringGlazing.emissiveIntensity = .06 + night * 1.05;
  transferCove.emissiveIntensity = .62 + night * 1.3;
  hullCove.emissiveIntensity = .02 + night * 1.21;
  lightSlopePlants(night);
};

type Plant = Parameters<typeof plantCanopy>[1]['instances'][number];
type Shrub = [number, number, number, number, number];
type Batch = Map<T.Material, T.BufferGeometry[]>;
/** Queue a geometry (placed by `m`) under a material; everything is normalised so per-material merging always succeeds. */
function put(batch: Batch, material: T.Material, g: T.BufferGeometry, m?: T.Matrix4) {
  const flat = g.index ? g.toNonIndexed() : g.clone();
  if (material !== hullCove) flat.deleteAttribute('uv');
  if (m) flat.applyMatrix4(m);
  (batch.get(material) ?? batch.set(material, []).get(material)!).push(flat);
}
/** Turn a surface inside out (inner faces of the ring). */
function flip(g: T.BufferGeometry) {
  const f = g.index ? g.toNonIndexed() : g, p = f.attributes.position as T.BufferAttribute, n = f.attributes.normal as T.BufferAttribute;
  for (let i = 0; i < p.count; i += 3) for (const a of [p, n]) { const x = a.getX(i + 1), y = a.getY(i + 1), z = a.getZ(i + 1); a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2)); a.setXYZ(i + 2, x, y, z); }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return f;
}
const mat = (pos: T.Vector3Like, rot?: T.Euler, scale?: T.Vector3) => new T.Matrix4().compose(new T.Vector3(pos.x, pos.y, pos.z), new T.Quaternion().setFromEuler(rot ?? new T.Euler()), scale ?? new T.Vector3(1, 1, 1));
const unitBox = new T.BoxGeometry(1, 1, 1);
/** A thin box between two points (seam lines, rail segments). */
function bar(batch: Batch, material: T.Material, a: T.Vector3, b: T.Vector3, w: number, h: number) {
  const d = b.clone().sub(a), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), d.clone().normalize());
  put(batch, material, unitBox, new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), q, new T.Vector3(w, h, d.length() + .02)));
}

// Sightline order, from the left fan and trailers through low bridge-side rosettes to the right spears.
const RING_LEDGES = [-15.75, -4.5, 6.75, 18] as const;
const RING_PLANTING: ReadonlyArray<ReadonlyArray<readonly [
  angle: number, form: SlopePlant['form'], width: number, height: number, yaw?: number,
]>> = [
  [
    [-148, 'fern', 5.1, 5.9], [-131, 'vine', 4, 8], [-118, 'rosette', 4.6, 3.6],
    [-112, 'fern', 4.5, 5.8], [-99, 'rosette', 3.6, 3.2], [-90, 'rosette', 4.5, 4], [-82, 'rosette', 3.8, 4],
    [-70, 'fern', 5, 6], [-59, 'fern', 4.4, 6.8], [-51, 'spear', 2.8, 6.7],
    [-43, 'fern', 5.5, 7], [-34, 'rosette', 4.8, 5.6], [-26, 'fern', 5.2, 8.7],
  ],
  [
    [-156, 'fern', 6, 9], [-145, 'vine', 4.5, 10], [-136, 'fern', 6.2, 8.4], [-125, 'rosette', 4.8, 3.9],
    [-114, 'fern', 5.7, 6.4], [-106, 'rosette', 4.2, 2.7], [-70, 'rosette', 5.5, 3.2],
    [-64, 'fern', 5.4, 6.5], [-55, 'fern', 5.5, 6.7], [-49, 'spear', 2.8, 8],
    [-40, 'fern', 5.8, 6.7], [-32, 'spear', 3.2, 9.2], [-28, 'rosette', 4.5, 5], [-21, 'fern', 5.3, 7.6],
  ],
  [
    [-160, 'fern', 6.6, 10, 1.1], [-153, 'rosette', 4, 5.2], [-144, 'vine', 5.7, 10, .45],
    [-138, 'fern', 6, 8], [-128, 'vine', 4.3, 10.5], [-118, 'fern', 4.7, 6],
    [-108, 'rosette', 5.8, 3.7], [-72, 'fern', 5.9, 6.8], [-67, 'rosette', 5.3, 4.4], [-59, 'fern', 6.6, 9, .65],
    [-53, 'fern', 4.4, 6.5], [-48, 'spear', 3.3, 10], [-40, 'fern', 7.1, 10.3, 1.4],
    [-35, 'fern', 4.6, 6.5], [-29, 'spear', 3.5, 10.8], [-24, 'fern', 5.8, 8], [-17, 'spear', 6.4, 22.8],
  ],
  [
    [-163, 'fern', 8.3, 12.2, -.35], [-156, 'vine', 4.6, 10, .3], [-151, 'spear', 3.2, 7.3],
    [-143, 'rosette', 8, 8.7, .5], [-141, 'vine', 5, 13, 1.05], [-134, 'vine', 4.6, 11.5, .3],
    [-127, 'fern', 5.7, 6.6, 2.1], [-119, 'vine', 7.5, 12, .6], [-114, 'rosette', 6.3, 4.2, 1.9],
    [-108, 'spear', 2.8, 8.2], [-101, 'rosette', 8.2, 5.6, .6], [-72, 'fern', 6, 6.4],
    [-65, 'fern', 7.6, 9.7], [-60, 'rosette', 4.1, 4.6], [-53, 'fern', 6.6, 8.5], [-48, 'spear', 3, 9.5],
    [-39, 'fern', 6, 7.8], [-34, 'fern', 5.4, 7], [-26, 'fern', 6.4, 8.3], [-21, 'spear', 4.5, 13.5],
  ],
];

// ---- A. Ring-on-edge building: local frame, ring in XY, axis +Z, centred on the hoop; the group is turned by `yaw` and lifted to centreY.
function ring(batch: Batch, plants: SlopePlant[], hasPilot: boolean, hasBody: boolean, hasTransfer: boolean) {
  const { outer, inner, depth, plinth, centreY } = RING, half = depth / 2;
  const opening = [-.035, .163]; // Angle from the bottom of the hoop to each edge of the garden landing.
  const L = (r: number, h: number, atLanding = false) => new T.CylinderGeometry(r, r, h, 96, 1, true,
    atLanding ? opening[1] : 0, Math.PI * 2 - (atLanding ? opening[1] - opening[0] : 0)).rotateX(Math.PI / 2);
  const world = new T.Matrix4().compose(new T.Vector3(RING.x, centreY, RING.z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), RING.yaw), new T.Vector3(1, 1, 1));
  const add = (material: T.Material, g: T.BufferGeometry, m?: T.Matrix4) => put(batch, material, g, m ? world.clone().multiply(m) : world);
  const bh = depth / 10;
  if (!hasBody) {
    // Outer skin, both face annuli, a glazed band on each face and the inner skin as stepped glass storeys between shell slabs every 4.2 m.
    add(megaShell, L(outer, depth));
    for (const s of [1, -1]) {
      const q = new T.Matrix4().makeRotationY(s > 0 ? 0 : Math.PI);
      add(megaFace, new T.RingGeometry(inner, outer, 96), q.clone().setPosition(0, 0, s * half));
      add(megaSeam, new T.RingGeometry(inner, inner + 1.6, 96), q.clone().setPosition(0, 0, s * (half + .8)));
      add(megaSeam, L(outer + .15, 1.2), new T.Matrix4().makeTranslation(0, 0, s * (half - 1.4))); // two light bands along the outer edges
    }
    // Outer ribs every 6° (1.5 m proud, running across the hoop depth) and radial ribs on both faces every 6°.
    for (const z of [-14, -4.5, 4.5, 14]) add(megaGlass, L(outer + .3, 2.4), new T.Matrix4().makeTranslation(0, 0, z)); // storey bands round the hoop
    const rib = new T.BoxGeometry(1.5, 1.4, depth), fin = new T.BoxGeometry(outer - inner - 2, 1, .8);
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, rz = new T.Matrix4().makeRotationZ(a);
      add(megaRib, rib, rz.clone().setPosition(Math.cos(a) * (outer + .6), Math.sin(a) * (outer + .6), 0));
      if (i % 2 === 0) for (const s of [1, -1]) {
        // The plaza-facing ribs in this arc are replaced by the pilot's stepped facade.
        if (hasPilot && s === 1 && i >= 46 && i <= 54) continue;
        add(megaRib, fin, rz.clone().setPosition(Math.cos(a) * (inner + outer) / 2, Math.sin(a) * (inner + outer) / 2, s * (half + 1.3)));
      }
    }
    for (let b = 0; b < 10; b++) {
      const z = -half + (b + .5) * bh;
      const atLanding = hasPilot && z > 15;
      add(megaGlass, flip(L(inner, bh - 1.1, atLanding)), new T.Matrix4().makeTranslation(0, 0, z));
      add(megaShell, flip(L(inner - 1.5 - (b % 2) * .8, 1.1, atLanding)), new T.Matrix4().makeTranslation(0, 0, z + bh / 2));
    }
  }
  // Planted ledges on the lower inner arc and the service rail with three static pods.
  for (const [ledge, z] of RING_LEDGES.entries()) {
    const atLanding = hasPilot && z > 15;
    const edges = opening.map(angle => angle - Math.PI / 2);
    const start = -Math.PI * .95, end = -Math.PI * .05;
    // Open the two inner ledges where the concourse and its court pass through.
    const atConcourse = hasTransfer && (z === 6.75 || z === -4.5);
    const gap = atConcourse ? [-Math.PI / 2 - .14, -Math.PI / 2 + .24] : edges;
    const sections = atLanding || atConcourse ? [[start, gap[0]], [gap[1], end]] : [[start, end]];
    for (const [a, b] of sections) {
      const shape = new T.Shape(); shape.absarc(0, 0, inner, a, b, false); shape.absarc(0, 0, inner - 9, b, a, true);
      add(megaShell, new T.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 24 }), new T.Matrix4().makeTranslation(0, 0, z - .5));
      add(megaPlant, new T.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 24 }), new T.Matrix4().makeTranslation(0, 0, z + .5).multiply(new T.Matrix4().makeScale(.97, .97, 1)));
    }
    const blocksLanding = (a: number) => (atLanding || atConcourse) && a > gap[0] - .055 && a < gap[1] + .055;
    const rootRadius = (inner - 9) * .97 + .55;
    for (const [i, [degrees, form, width, height, yaw]] of RING_PLANTING[ledge].entries()) {
      const angle = T.MathUtils.degToRad(degrees);
      if (blocksLanding(angle)) continue;
      const seed = 53 * ledge + i;
      const tint = form === 'spear' ? 0xbbfff0 : ledge < 2 ? 0xc6e0ac : 0xffffff;
      const base = new T.Vector3(Math.cos(angle) * rootRadius, Math.sin(angle) * rootRadius, z + 1.38).applyMatrix4(world);
      const heading = form === 'fern' || form === 'vine' ? -1.58 + (yaw ?? hash(seed) - .5) * .65 : yaw ?? hash(seed) * 6.28;
      plants.push({ form, base, width: width * (form === 'fern' ? 1.38 : 1.15), height: height * 1.32, yaw: RING.yaw + heading, tint });
      // Underplant taller specimens with short leaf fans along the same root strip.
      for (const delta of [-.032, .034]) {
        const companion = angle + delta;
        if (blocksLanding(companion)) continue;
        plants.push({
          form: 'rosette',
          base: new T.Vector3(Math.cos(companion) * (rootRadius + 2.3), Math.sin(companion) * (rootRadius + 2.3), z + 1.38).applyMatrix4(world),
          width: 2.9 + hash(seed + delta) * 2,
          height: 2.9 + hash(seed - delta) * 1.8,
          yaw: RING.yaw + hash(seed + 4) * 6.28,
          tint: 0xbad5a0,
        });
      }
    }
  }
  const railSpans = hasTransfer ? [[-Math.PI * 1.1, -Math.PI / 2 - .13], [-Math.PI / 2 + .216, Math.PI * .1]] : [[-Math.PI * 1.1, Math.PI * .1]];
  for (const [start, end] of railSpans) add(megaRib, new T.TorusGeometry(inner - 1.2, .45, 6, 64, end - start), new T.Matrix4().makeRotationZ(start));
  for (const a of [-1.2, -.9, -2]) add(megaShell, new T.BoxGeometry(5, 2.2, 3.2), new T.Matrix4().makeRotationZ(a - Math.PI / 2).setPosition(Math.cos(a) * (inner - 2.4), Math.sin(a) * (inner - 2.4), 0));
  // Plinth carrying the hoop base, below ground by 15 m, with a seam frame where it meets the ground.
  const pTop = 6, pBot = -15, py = (pTop + pBot) / 2 - centreY;
  add(megaShell, new T.BoxGeometry(plinth[0], pTop - pBot, plinth[1]), new T.Matrix4().makeTranslation(0, py, 0));
  for (const [sx, sz, w, d] of [[0, 1, plinth[0] + 1, .8], [0, -1, plinth[0] + 1, .8], [1, 0, .8, plinth[1] + 1], [-1, 0, .8, plinth[1] + 1]] as const)
    add(megaSeam, new T.BoxGeometry(w, .5, d), new T.Matrix4().makeTranslation(sx * plinth[0] / 2, .3 - centreY, sz * plinth[1] / 2));
  // Entrance polish (owner 2026-11-20): both hoop-facing sides of the plinth are a glazed ground-floor lobby (mullions every 4 m) under a deep
  // canopy with a lit edge, so the base reads as the hoop's entrance hall, not a blank block; the plaza walk lands before the +z lobby.
  for (const s of [1, -1]) {
    const face = s * plinth[1] / 2, lobby = plinth[0] - 12;
    add(megaGlass, new T.BoxGeometry(lobby, 4.4, .4), new T.Matrix4().makeTranslation(0, 2.6 - centreY, face + s * .05));
    for (let x = -lobby / 2; x <= lobby / 2 + .01; x += 4) add(megaRib, new T.BoxGeometry(.5, 4.4, .7), new T.Matrix4().makeTranslation(x, 2.6 - centreY, face + s * .2));
    add(megaShell, new T.BoxGeometry(lobby + 4, .6, 5), new T.Matrix4().makeTranslation(0, 5.1 - centreY, face + s * 2.5));
    add(megaSeam, new T.BoxGeometry(lobby + 4.2, .3, .3), new T.Matrix4().makeTranslation(0, 4.95 - centreY, face + s * 5));
  }
  // The plaza walk (layout `plazaWalks[0]`) ends at the bay face 17 m up, level with the hoop's inner floor: a landing runs in over the floor to the
  // lowest planted ledge (z 18). The pilot supplies its own landing and tunnel lining.
  if (hasPilot) return;
  const gx = 4.1, gy = 17.6 - centreY;
  add(megaShell, new T.BoxGeometry(8, .6, 7.4), new T.Matrix4().makeTranslation(gx, gy - .3, half + 3.1 - 3.7));
  for (const dx of [-4.6, 4.6]) add(megaSeam, new T.BoxGeometry(.6, 7, .6), new T.Matrix4().makeTranslation(gx + dx, gy + 3.5, half));
  add(megaSeam, new T.BoxGeometry(9.8, .6, .6), new T.Matrix4().makeTranslation(gx, gy + 7, half));
  // Road gate (owner 2026-11-20): avenue ① and the guideway run through the south-east foot. The carve opens the hoop over `RING_GATE`; here the
  // tunnel is lined (pale walls and soffit, just outside the carve), strip-lit along its length, and framed on both faces by lit posts and a lintel.
  const { left, right: [r0, r1], top } = RING_GATE, gy0 = -centreY, skew = Math.atan2(r1 - r0, depth), wallLen = Math.hypot(r1 - r0, depth);
  add(megaRib, new T.BoxGeometry(1, top, depth + 1), new T.Matrix4().makeTranslation(left - .55, gy0 + top / 2, 0));
  add(megaRib, new T.BoxGeometry(1, top, wallLen + 1), new T.Matrix4().makeRotationY(skew).setPosition((r0 + r1) / 2 + .56, gy0 + top / 2, 0));
  const soffit = new T.Shape([new T.Vector2(left - 1, -half - .5), new T.Vector2(r0 + 1, -half - .5), new T.Vector2(r1 + 1, half + .5), new T.Vector2(left - 1, half + .5)]);
  add(megaShell, new T.ExtrudeGeometry(soffit, { depth: 1, bevelEnabled: false }).rotateX(Math.PI / 2), new T.Matrix4().makeTranslation(0, gy0 + top + 1.05, 0));
  for (const t of [.12, .37, .63, .88]) {
    const a = left + (r0 - left) * t, b = left + (r1 - left) * t;
    add(gateLight, new T.BoxGeometry(.5, .2, Math.hypot(b - a, depth)), new T.Matrix4().makeRotationY(Math.atan2(b - a, depth)).setPosition((a + b) / 2, gy0 + top - .15, 0));
  }
  for (const [x, rot] of [[left + .1, 0], [(r0 + r1) / 2 - .1, skew]] as const) add(gateLight, new T.BoxGeometry(.2, .35, (rot ? wallLen : depth) - 2), new T.Matrix4().makeRotationY(rot).setPosition(x, gy0 + 3.2, 0));
  for (const sz of [-1, 1]) {
    const edge = sz < 0 ? r0 : r1, fz = sz * (half + .7);
    for (const x of [left - 1.3, edge + 1.3]) add(megaSeam, new T.BoxGeometry(1.4, top + 1.6, 1.4), new T.Matrix4().makeTranslation(x, gy0 + (top + 1.6) / 2, fz));
    add(megaSeam, new T.BoxGeometry(edge - left + 4, 1.4, 1.4), new T.Matrix4().makeTranslation((left + edge) / 2, gy0 + top + .9, fz));
  }
}

// ---- B. Giant white arch: parabola swept with a tapering rounded section.
function arch(batch: Batch, tops: [number, number][]) {
  const f1 = new T.Vector3(ARCH.a[0], 0, ARCH.a[1]), f2 = new T.Vector3(ARCH.b[0], 0, ARCH.b[1]), span = f2.clone().sub(f1), N = 32;
  const point = (t: number) => f1.clone().addScaledVector(span, t).setY(ARCH.apex * 4 * t * (1 - t) - 2);
  const tangent = (t: number) => point(t + 1e-3).sub(point(t - 1e-3)).normalize();
  let S = span.clone().setY(0).normalize().cross(new T.Vector3(0, 1, 0)).normalize();
  if (new T.Vector3().crossVectors(tangent(.5), S).y < 0) S = S.negate();
  type Sec = { hw: number; hh: number; os?: number; ou?: number; k?: number };
  /** Sweep a superellipse section between t0..t1 (right-handed S, U, T; outward normals). */
  const sweep = (t0: number, t1: number, steps: number, sec: (t: number) => Sec) => {
    const M = 12, pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = t0 + (t1 - t0) * i / steps, T3 = tangent(t), U = new T.Vector3().crossVectors(T3, S).normalize(), c = point(t), { hw, hh, os = 0, ou = 0, k = 3 } = sec(t);
      for (let j = 0; j < M; j++) {
        const a = j / M * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), x = Math.sign(ca) * Math.abs(ca) ** (2 / k) * hw + os, y = Math.sign(sa) * Math.abs(sa) ** (2 / k) * hh + ou;
        pos.push(c.x + S.x * x + U.x * y, c.y + S.y * x + U.y * y, c.z + S.z * x + U.z * y);
      }
    }
    for (let i = 0; i < steps; i++) for (let j = 0; j < M; j++) { const A = i * M + j, B = i * M + (j + 1) % M, C = A + M, D = B + M; idx.push(A, B, C, B, D, C); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const width = (t: number) => 1.45 * (9 + 5 * Math.abs(2 * t - 1) ** 1.6);
  put(batch, megaShell, sweep(0, 1, N, t => ({ hw: width(t) / 2, hh: width(t) * .3125, k: 4 })));
  // Seam along each edge of the inner (underside) face; joints every ~20 m (≈ 330 m of arc).
  for (const side of [1, -1]) put(batch, megaSeam, sweep(.01, .99, N, t => ({ hw: .4, hh: .35, os: side * width(t) * .36, ou: -width(t) * .3125 - .1, k: 2 })));
  for (let j = 1; j < 16; j++) { const t = j / 16; put(batch, megaJoint, sweep(t - .0013, t + .0013, 1, () => ({ hw: width(t) / 2 + .15, hh: width(t) * .3125 + .15, k: 4 }))); }
  // Foot collars with an emitter seam.
  for (const f of [f1, f2]) {
    put(batch, megaShell, new T.CylinderGeometry(11.5, 12.5, 4, 32), mat({ x: f.x, y: 2, z: f.z }));
    put(batch, megaSeam, new T.CylinderGeometry(11.7, 11.7, .7, 32), mat({ x: f.x, y: 4.2, z: f.z }));
  }
  tops.push([point(.5).x, point(.5).z]);
}

// ---- C. Stepped terraced mega-hull; +depth runs inland, +u toward the tall shoulder.
function hull(batch: Batch, trees: Plant[], shrubs: Shrub[]) {
  const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), HULL.yaw);
  const root = new T.Matrix4().compose(new T.Vector3(HULL.x, 0, HULL.z), q, new T.Vector3(1, 1, 1)), L2 = HULL.length / 2;
  const world = (u: number, d: number, y: number) => new T.Vector3(u, y, d).applyQuaternion(q).add(new T.Vector3(HULL.x, 0, HULL.z));
  const front = (k: number, grow: number) => {
    const { from, to, bow } = hullTiers[k];
    const edge = Array.from({ length: 25 }, (_, i) => T.MathUtils.lerp(from - grow, to + grow, i / 24));
    if (bow) {
      for (const fraction of [.015, .05, .12, .25, .5, .75, 1]) {
        const u = from + fraction * bow;
        if (u > from - grow && u < to + grow) edge.push(u);
      }
      edge.sort((a, b) => a - b);
    }
    return edge.map(u => ({ u, d: hullFront(k, u, grow) }));
  };
  const lobby = { start: T.MathUtils.lerp(-L2, L2, hullLobby.start), end: T.MathUtils.lerp(-L2, L2, hullLobby.end) };
  const tierElevation = (k: number, u: number, y: number) => {
    const { from, to, base, deck } = hullTiers[k];
    if (k !== hullTiers.length - 1) return y;
    const drop = 3.6 * (1 - T.MathUtils.smoothstep(u, from, from + 16)) + 4.2 * T.MathUtils.smoothstep(u, to - 17, to);
    return y - drop * T.MathUtils.smoothstep(y, base + 8, deck);
  };
  const slab = (k: number, y: number, h: number, grow: number, material: T.Material, recessLobby = false) => {
    const f = front(k, grow);
    if (k === hullTiers.length - 1) {
      // Section the curved crown across its width so the roof, glass and planting share the same profile.
      const sections = f.map(({ u, d }) => [
        world(u, d, tierElevation(k, u, y)), world(u, hullRear(k, u), tierElevation(k, u, y)),
        world(u, d, tierElevation(k, u, y + h)), world(u, hullRear(k, u), tierElevation(k, u, y + h)),
      ]);
      const positions: number[] = [];
      const face = (a: T.Vector3, b: T.Vector3, c: T.Vector3, d: T.Vector3) => {
        for (const p of [a, b, c, c, b, d]) positions.push(p.x, p.y, p.z);
      };
      const [start, ...rest] = sections;
      face(start[0], start[1], start[2], start[3]);
      let a = start;
      for (const b of rest) {
        face(a[0], a[2], b[0], b[2]);
        face(a[1], b[1], a[3], b[3]);
        face(a[0], b[0], a[1], b[1]);
        face(a[2], a[3], b[2], b[3]);
        a = b;
      }
      face(a[0], a[2], a[1], a[3]);
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      put(batch, material, geometry);
      geometry.dispose();
      return;
    }
    const shape = new T.Shape();
    const rimEnd = f[f.length - 1].u, start = lobby.start, end = Math.min(lobby.end, rimEnd);
    const back = (u: number) => hullFront(k, u) + hullLobby.back + .3;
    const outline = recessLobby ? [
      ...f.filter(({ u }) => u < start), { u: start, d: hullFront(k, start, grow) }, { u: start, d: back(start) },
      ...f.filter(({ u }) => u > start && u < end).map(({ u }) => ({ u, d: back(u) })),
      { u: end, d: back(end) }, ...(end < rimEnd ? [{ u: end, d: hullFront(k, end, grow) }, ...f.filter(({ u }) => u > end)] : []),
    ] : f;
    shape.moveTo(f[0].u, -f[0].d);
    for (const { u, d } of outline) shape.lineTo(u, -d);
    const rear = k < 2 ? [rimEnd, f[0].u] : f.map(({ u }) => u).reverse();
    for (const u of rear) shape.lineTo(u, -hullRear(k, u));
    const geometry = new T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
    put(batch, material, geometry, root.clone().multiply(new T.Matrix4().makeTranslation(0, y, 0)));
    geometry.dispose();
  };
  const at = (u: number, d: number, y: number) => new T.Matrix4().compose(world(u, d, y), q, new T.Vector3(1, 1, 1));
  // Road fix A (owner 2026-11-20): both Yurikamome tracks (deck 14.2 m) pass through the hull's end bulkheads, so each end gets a lit tunnel
  // mouth over them: [end sign, centre d, width] from where the tracks cross u = ±L2 (east d 9.7-15.8, west d 43.7-54.8).
  const portals = [[1, 12.75, 18], [-1, 49.25, 22]] as const, portalY = [9, 23] as const;
  const inPortal = (sgn: number, d: number, k: number) => k < 2 && portals.some(([s, c, w]) => s === sgn && Math.abs(d - c) < w / 2 + 1);
  for (const [sgn, c, w] of portals) {
    const u = sgn * (L2 + 2.6), h = portalY[1] - portalY[0], y = (portalY[0] + portalY[1]) / 2;
    put(batch, megaPortal, new T.BoxGeometry(.3, h, w), at(u, c, y));
    for (const [dy, dd, bh, bw] of [[h / 2, 0, .7, w + 1.4], [-h / 2, 0, .7, w + 1.4], [0, w / 2 + .35, h, .7], [0, -w / 2 - .35, h, .7]])
      put(batch, megaSeam, new T.BoxGeometry(.9, bh, bw), at(u + sgn * .3, c + dd, y + dy));
    // A rounded metal collar stays outside the original rectangular train envelope.
    const collar = new T.Shape(), outerHalf = w / 2 + 1.85, outerTop = h / 2 + 1.85;
    for (const [side, rise, start] of [[1, 1, 0], [-1, 1, 1], [-1, -1, 2], [1, -1, 3]]) {
      collar.absarc(side * (outerHalf - 2.1), rise * (outerTop - 2.1), 2.1, start * Math.PI / 2, (start + 1) * Math.PI / 2, false);
    }
    collar.closePath();
    const edge = collar.getPoints(5).map(({ x, y: rise }) => world(u + sgn * .24, c + x, y + rise));
    for (let i = 1; i < edge.length; i++) bar(batch, megaRib, edge[i - 1], edge[i], .8, .8);
  }
  const entrance = 53; // Existing plaza walk lands here.
  const publicTerraces = new Map([
    [0, { start: entrance - 18, end: entrance + 18 }],
    [3, { start: -39, end: 9 }],
    [6, { start: 31, end: 67 }],
  ]);
  for (const [k, { from: u0, to: u1, base: y0, deck: deckY, bow }] of hullTiers.entries()) {
    const height = deckY - y0, f = front(k, 0);
    slab(k, y0, .72, 1.6, megaRib);
    if (k < 2) slab(k, y0 + .14, .17, 1.62, megaSeam);
    slab(k, y0 + .72, height - 1.22, -8.35, megaShell, k === 0);
    if (k === hullTiers.length - 1) slab(k, deckY - 1.15, 1.15, 1.25, megaRib);
    else slab(k, deckY - .5, .5, .85, megaShell);
    buildHullFacade({
      tier: k, from: u0, to: u1, height, entrance,
      point: (u, rise, inset) => world(u, Math.min(hullFront(k, u) + inset, hullRear(k, u) - .18), tierElevation(k, u, y0 + rise)),
      surface: (finish, geometry) => put(batch, hullFinishes[finish], geometry),
      bar: (finish, a, b, width, height) => bar(batch, hullFinishes[finish], a, b, width, height),
    });

    if (k === 0) {
      // Match the existing plaza walk and keep its projecting entrance canopy.
      const dd = hullFront(k, entrance);
      put(batch, megaShell, new T.BoxGeometry(18, .5, 7), at(entrance, dd - 4.7, y0 + 6.9));
      put(batch, megaSeam, new T.BoxGeometry(18.2, .3, .3), at(entrance, dd - 8.2, y0 + 6.75));
    }
    // end bulkheads: white walls with fins every 8 m and one vertical seam at the front corner
    for (const [u, sgn] of [[u1, 1], [u0, -1]] as const) {
      const d0 = hullFront(k, u), back = hullRear(k, u), len = back - d0;
      const curvedBow = sgn < 0 && bow > 0;
      const edgeHeight = tierElevation(k, u, deckY) - y0;
      const wall = new T.BoxGeometry(curvedBow ? .8 : 2.4, edgeHeight, len);
      put(batch, curvedBow ? megaJoint : megaShell, wall, at(u + sgn * (curvedBow ? .4 : 1.2), d0 + len / 2, y0 + edgeHeight / 2));
      if (curvedBow) {
        // Carry the silver window sill around the prow and back into the sloping roof edge.
        const run = Math.min(11, len - .4);
        const points = [[d0 - .7, 8.8], [d0 + run * .18, 9.4], [d0 + run * .45, 11.1],
          [d0 + run * .73, 13.1], [d0 + run, 14.35]];
        for (let i = 1; i < points.length; i++) {
          const [a, lo] = points[i - 1], [b, hi] = points[i];
          bar(batch, megaRib, world(u - .83, a, tierElevation(k, u, y0 + height * lo / 15)),
            world(u - .83, b, tierElevation(k, u, y0 + height * hi / 15)), .84, 2.3 - .31 * i);
        }
        continue;
      }
      for (let d = d0 + 6; d < back - 2; d += 8) if (!inPortal(sgn, d, k)) put(batch, megaRib, new T.BoxGeometry(1.1, edgeHeight - 1, .8), at(u + sgn * 2.6, d, y0 + edgeHeight / 2));
      if (k < 2 && !inPortal(sgn, d0 + 1, k)) put(batch, megaSeam, new T.BoxGeometry(.6, height, .6), at(u + sgn * 2.6, d0 + 1, y0 + height / 2));
    }
    const terrace = publicTerraces.get(k);
    const deckPoint = (u: number, inset: number, rise: number) => world(u, hullFront(k, u) + inset, tierElevation(k, u, deckY) + rise);
    // One skin wraps the slab nose and returns across the deck to the next tier's frame foot.
    const folds = hullFrameReturns(k).map(({ head, foot }) => {
      const start = T.MathUtils.lerp(u0, u1, head), next = hullTiers[k + 1];
      const end = foot === undefined ? start : T.MathUtils.lerp(next.from, next.to, foot);
      return { start, end, crossesDeck: foot !== undefined };
    });
    for (const { start, end, crossesDeck } of folds) {
      const sections = [
        [start - 2.65, -.94, -4.1, .3],
        [start - 1.45, -1.1, -2.5, 1.14],
        [start - .35, -1.68, -.8, 1.84],
        [start + .26, -1.82, .12, 2.12],
        [start + .52, -1.58, .69, 2.02],
        [start + .65, -.96, 1.03, 1.82],
        [start + .65, .2, 1.06, 1.63],
        [start + .49, 1.51, .78, 1.38],
      ];
      if (crossesDeck) {
        const recede = hullFront(k + 1, end) - hullFront(k, end);
        sections.push(
          [end, 2.4, .09, 1.12],
          [end - .28, recede - 1.73, .09, 1.12],
          [end - .19, recede - 1.73, .65, 1.12],
          [end + .18, recede - 1.13, 1.25, 1.29],
          [end + .9, recede - .98, 2.53, .94],
          [end + 2.3, recede - .94, 3.65, .22],
        );
      } else sections.push([end + .49, 1.84, .1, .9]);

      const edges = sections.map(([u, inset, rise, halfWidth]) => [
        deckPoint(u - halfWidth, inset, rise), deckPoint(u + halfWidth, inset, rise),
      ]);
      const positions: number[] = [];
      for (let i = 1; i < edges.length; i++) {
        const [a, b] = edges[i - 1], [c, d] = edges[i];
        for (const p of [a, c, b, b, c, d]) positions.push(p.x, p.y, p.z);
      }
      const frame = new T.BufferGeometry();
      frame.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      frame.computeVertexNormals();
      put(batch, megaRib, frame);
      frame.dispose();
    }
    const clearForPlanting = (u: number, radius: number) =>
      (!terrace || u + radius <= terrace.start || u - radius >= terrace.end)
      && folds.every(({ start, end }) => u + radius < Math.min(start, end) - 2.1 || u - radius > Math.max(start, end) + 2.1);
    for (let i = 0; i < f.length - 1; i++) {
      const a = f[i].u, b = f[i + 1].u;
      bar(batch, megaShell, deckPoint(a, .75, .25), deckPoint(b, .75, .25), 1.5, .5);
      // Each planter follows the main curve and terminates at the actual edge of the opening.
      const spans = terrace ? [[a, Math.min(b, terrace.start)], [Math.max(a, terrace.end), b]] : [[a, b]];
      for (const [start, end] of spans) if (end > start) {
        for (const [inset, width] of [[3.6, 2.4], [6.6, 2]]) {
          bar(batch, megaPlant, deckPoint(start, inset, .3), deckPoint(end, inset, .3), width, .6);
        }
      }
    }
    // Keep crowns out of the public floor, including their overhang past the trunk.
    for (const [off, gap, r] of [[1.1, 4.2, 3], [5.2, 7, 2.6]] as const) {
      for (let u = u0 + 2, i = 0; u < u1 - 2; u += gap, i++) {
        const radius = r + hash(k * 99 + i + off) * .7;
        if (!clearForPlanting(u, radius * 1.2)) continue;
        const p = deckPoint(u, off, .5);
        shrubs.push([p.x, p.y, p.z, radius, 1.4 + hash(k * 99 + i + 4) * .5]);
      }
    }
    for (let u = u0 + 8 + hash(k) * 12, c = 0; u < u1 - 8; u += 24 + hash(k * 7 + c) * 16, c++) {
      for (let j = 0, n = 4 + Math.floor(hash(k * 13 + c) * 3); j < n; j++) {
        const uj = u + (hash(k * 31 + c * 5 + j) - .5) * 9;
        const scale = .5 + hash(k * 3 + c * 11 + j) * .3;
        if (!clearForPlanting(uj, 5.5 * scale)) continue;
        const p = deckPoint(uj, 4 + hash(k * 17 + c * 3 + j) * 3.5, .5);
        trees.push({ position: [p.x, -p.z, p.y], scale, type: j === 1 ? 'columnar' : 'broadleaf' });
      }
    }
    if (terrace) {
      const { start, end } = terrace;
      const edge = [start, ...f.map(({ u }) => u).filter(u => u > start && u < end), end];
      const paving = new T.Shape();
      paving.moveTo(start, -hullFront(k, start) - 1.5);
      for (const u of edge.slice(1)) paving.lineTo(u, -hullFront(k, u) - 1.5);
      for (let i = edge.length - 1; i >= 0; i--) paving.lineTo(edge[i], -hullFront(k, edge[i]) - 7.25);
      put(batch, megaRib, new T.ExtrudeGeometry(paving, { depth: .18, bevelEnabled: false }).rotateX(-Math.PI / 2),
        root.clone().multiply(new T.Matrix4().makeTranslation(0, deckY, 0)));

      // Dark guardrail follows the pale hull kerb and leaves the bays open to the view.
      for (let i = 1; i < edge.length; i++) {
        for (const rise of [.76, 1.17]) {
          bar(batch, megaJoint, deckPoint(edge[i - 1], .78, rise), deckPoint(edge[i], .78, rise), .12, .11);
        }
      }
      for (let i = 0, n = Math.ceil((end - start) / 2.4); i <= n; i++) {
        const u = T.MathUtils.lerp(start, end, i / n);
        put(batch, megaJoint, new T.BoxGeometry(.15, .73, .15), at(u, hullFront(k, u) + .78, deckY + .845));
      }

      // Broad shade panels keep the middle garden readable from the city camera.
      if (k === 3) {
        const a = start + 4, b = start + 24;
        for (const u of [a, b]) for (const inset of [2.1, 7.2]) {
          put(batch, megaRib, new T.BoxGeometry(.45, 3.8, .45), at(u, hullFront(k, u) + inset, deckY + 1.95));
        }
        for (const inset of [2.1, 7.2]) {
          bar(batch, megaRib, deckPoint(a, inset, 3.85), deckPoint(b, inset, 3.85), .5, .5);
        }
        for (const off of [3, 10, 17]) {
          bar(batch, megaShell, deckPoint(a + off, 1.7, 4.18), deckPoint(a + off, 7.6, 4.18), 6.1, .42);
          const soffit = new T.PlaneGeometry(4.65, 4.9).rotateX(Math.PI / 2);
          const uv = soffit.getAttribute('uv');
          for (let i = 0; i < uv.count; i++) uv.setX(i, 2);
          put(batch, hullCove, soffit, at(a + off, hullFront(k, a + off) + 4.65, deckY + 3.96));
          soffit.dispose();
        }
      }
      if (k === 6) {
        // A built-in seat wall at the back leaves the seaward edge open.
        for (const [inset, height] of [[5.8, .32], [6.55, .68]]) {
          bar(batch, megaShell, deckPoint(start + 7, inset, .18 + height / 2), deckPoint(end - 7, inset, .18 + height / 2), .72, height);
        }
      }
    }
    if (k === 2) { // service rail along this lip with two static pods
      const fl = front(k, 2);
      for (let i = 0; i < fl.length - 1; i++) bar(batch, megaRib, world(fl[i].u, fl[i].d - .8, y0 + 6), world(fl[i + 1].u, fl[i + 1].d - .8, y0 + 6), .7, .5);
      for (const u of [-30, 40]) put(batch, megaShell, new T.BoxGeometry(6, 2.4, 3.4), at(u, hullFront(k, u, 2) - .8, y0 + 7.4));
    }
  }
}

/** Remove surveyed massing where new city footprints replace it. */
export function carveContext(environment: T.Object3D) {
  const zones = bodyFootprints(), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  environment.updateMatrixWorld(true);
  environment.traverse(object => {
    if (!(object instanceof T.Mesh) || !object.name.startsWith('CTX_')) return;
    const g = object.geometry as T.BufferGeometry, p = g.attributes.position, src = g.index, n = src?.count ?? p.count, keep: number[] = [];
    const at = (i: number) => src ? src.getX(i) : i;
    for (let i = 0; i < n; i += 3) {
      a.fromBufferAttribute(p, at(i)); b.fromBufferAttribute(p, at(i + 1)); c.fromBufferAttribute(p, at(i + 2));
      [a, b, c].forEach(v => v.applyMatrix4(object.matrixWorld));
      const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3;
      // One legacy block (surveyed bounds X −211.68…−203.02, Z 384.01…394.94 m) stands inside the farm entrance.
      const farmShed = object.name === 'CTX_central_west_unknown' && cx > -212 && cx < -203 && cz > 384 && cz < 395;
      if (!farmShed && !zones.some(z => inRect(z, cx, cz))) keep.push(at(i), at(i + 1), at(i + 2));
    }
    if (keep.length !== n) g.setIndex(keep);
  });
}

/** The three megastructures, with the optional Blender ring exterior. */
export function megastructures(ringModels?: { entrance: T.Group; body?: T.Group; hasTransfer?: boolean }): T.Group {
  const root = new T.Group(); root.name = 'megastructures';
  const batch: Batch = new Map(), trees: Plant[] = [], shrubs: Shrub[] = [], plants: SlopePlant[] = [], tops: [number, number][] = [];
  ring(batch, plants, Boolean(ringModels), Boolean(ringModels?.body), Boolean(ringModels?.hasTransfer)); arch(batch, tops); hull(batch, trees, shrubs);
  for (const [material, list] of batch) {
    const mesh = new T.Mesh(mergeGeometries(list), carved.get(material) ?? material);
    mesh.castShadow = material !== hullGlass;
    mesh.receiveShadow = true;
    mesh.name = 'megastructure';
    root.add(mesh);
    list.forEach(g => g.dispose());
  }
  // R5 seeded hull planting after these ring instances. Retain its poses and pigments after removing the ring from the shared batches.
  const treeOffset = ringModels?.hasTransfer ? 82 : 87;
  const shrubOffset = ringModels?.hasTransfer ? 260 : ringModels ? 288 : 296;
  plantCanopy(root, { instances: trees, seedOffset: treeOffset });
  plantShrubs(root, shrubs, shrubOffset);
  root.add(slopePlants(plants));
  if (ringModels) {
    if (ringModels.hasTransfer) ringModels.entrance.getObjectByName('Ring_LandingRail')?.removeFromParent();
    root.add(ringModels.entrance);
    if (ringModels.body) root.add(ringModels.body);
  }
  return root;
}

const lowerUrl = new URL('../asset/models/ring-gate-2127/ring-lower-2127.glb', import.meta.url).href;
const transferUrl = new URL('../asset/models/ring-gate-2127/ring-transfer-2127.glb', import.meta.url).href;
const ringUpperUrls = [
  new URL('../asset/models/ring-gate-2127/ring-shoulders-2127.glb', import.meta.url).href,
  new URL('../asset/models/ring-gate-2127/ring-crown-2127.glb', import.meta.url).href,
];

export async function loadMegastructures(): Promise<T.Group> {
  const entranceUrl = new URL('../asset/models/ring-gate-2127/ring-gate-2127.glb', import.meta.url).href;
  const loadRingPart = async (url: string, parent: T.Group) => {
    const model = await addCityModel(parent, url, [RING.x, 0, RING.z], RING.yaw);
    model.traverse(part => {
      if (!(part instanceof T.Mesh) || Array.isArray(part.material)) return;
      const material = ringFinishes.get(part.material.name);
      if (material) part.material = material;
    });
    return model;
  };

  const body = new T.Group();
  body.name = 'ring-body-2127';
  const [entrance, sections] = await Promise.allSettled([
    loadRingPart(entranceUrl, new T.Group()),
    Promise.all([
      loadRingPart(transferUrl, body).catch(error => {
        console.warn('Ring concourse could not load. Keeping the R2 lower shell.', error);
        return loadRingPart(lowerUrl, body);
      }),
      ...ringUpperUrls.map(url => loadRingPart(url, body)),
    ]),
  ]);
  if (entrance.status === 'rejected') {
    console.warn('Ring entrance model could not load. Using the procedural ring and entrance.', entrance.reason);
    return megastructures();
  }
  entrance.value.name = 'ring-gate-2127';
  if (sections.status === 'rejected') {
    console.warn('Ring shell could not load. Using the procedural shell with the Blender entrance.', sections.reason);
    return megastructures({ entrance: entrance.value });
  }
  const [lower] = sections.value;
  const transfer = lower.getObjectByName('Concourse_floor') ? lower : undefined;
  if (transfer) {
    transfer.name = 'ring-transfer-2127';
    const kit: Kit = { signs: [], windows: [], random: Math.random };
    for (const [text, z, yaw] of [
      ['乗換ホール', 13.76, 0], ['空中庭園', 4.96, 0], ['乗換・広場', 4.31, Math.PI], ['広場', 13.43, Math.PI],
    ] as const) {
      const panel = new T.Group();
      panel.position.set(4.1354, 21.52, z);
      panel.rotation.y = yaw;
      sign(panel, kit, text, 0, 0, 0, 3.6, .54, '#263d48', '#dcf3ff');
      panel.traverse(o => { if (o instanceof T.Mesh) o.castShadow = false; });
      transfer.add(panel);
    }
  }
  return megastructures({ entrance: entrance.value, body, hasTransfer: Boolean(transfer) });
}
