import assert from 'node:assert/strict';
import { Mesh, Raycaster, Scene, Vector3 } from 'three';
import { changeSites, HOLOGRAMS } from '../src/layout.ts';
import { heroSettledCamera } from '../src/heroCamera.ts';
import { heroHolograms, HOLOGRAM_AXES, tierBar } from '../src/heroHolograms.ts';

// Canvas stand-in: every 2D call is a no-op, so only the drawn strings matter.
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
const context = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ width: 0, height: 0, getContext: () => context }) } });
const scene = new Scene(), holo = heroHolograms(scene);
if (descriptor) Object.defineProperty(globalThis, 'document', descriptor); else delete (globalThis as { document?: Document }).document;
scene.updateMatrixWorld(true);

// 13 panels, every visible string free of Latin letters (Japanese copy and numerals only).
const texts = holo.texts();
assert.equal(texts.size, 13); assert.equal(holo.root.children.length, 13);
for (const [id, strings] of texts) { assert.ok(strings.length > 0, `${id} has copy`); for (const s of strings) assert.ok(!/[A-Za-z]/.test(s), `${id}: "${s}" contains Latin letters`); }

// Hero sightlines: no panel (pane, halo or content plane) stands between the settled hero camera and a focal site (ground, a quarter up, the top, and the
// four footprint corners at the ground), the Civic Core centre, or the screen's own centre.
const camera = heroSettledCamera(1600, 900), eye = camera.position, ray = new Raycaster();
assert.ok(eye.distanceTo(new Vector3(...HOLOGRAMS.eye)) < 1.5, `HOLOGRAMS.eye matches the settled hero camera (${eye.toArray().map(Math.round)})`);
// (The halo is a soft glow that fades to nothing at its rim, so it is not counted as covering.)
const planes: Mesh[] = []; holo.root.traverse(o => { if (o instanceof Mesh && o.renderOrder !== 9) planes.push(o); });
const clear = (look: Vector3, what: string) => {
  ray.set(eye, look.clone().sub(eye).normalize()); ray.far = eye.distanceTo(look);
  const hit = ray.intersectObjects(planes)[0];
  assert.equal(hit, undefined, `${what} is hidden by hologram ${hit?.object.parent?.name}`);
};
for (const site of Object.values(changeSites)) {
  for (const height of [1, site.h * site.scale / 4, site.h * site.scale]) clear(new Vector3(site.x, height, site.z), `${site.name} at ${height} m`);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) clear(new Vector3(site.x + sx * site.w * site.scale / 2, 1, site.z + sz * site.d * site.scale / 2), `${site.name} outline`);
}
clear(new Vector3(-20, 65, -10), 'Civic Core centre');

// Live panel: rungs clamp to −3..3 and a bar is (tier + 3) / 6 long; the proposal count reads 「提案 1,284件」.
assert.equal(tierBar(9), 1); assert.equal(tierBar(-9), 0); assert.equal(tierBar(0), .5);
holo.setTiers({ nw: 3, ne: -3, sw: 0, se: 9 });
assert.deepEqual(HOLOGRAM_AXES.map(a => a.socket), ['nw', 'sw', 'ne', 'se']);
assert.deepEqual(holo.bars(), [1, .5, 0, 1]);
holo.setVoices(1284); assert.ok(holo.texts().get('voices')!.includes('提案 1,284件'));
holo.setVoices(-5); assert.ok(holo.texts().get('voices')!.includes('提案 0件'));
for (const strings of holo.texts().values()) for (const s of strings) assert.ok(!/[A-Za-z]/.test(s));

// Day / night parameters blend and nothing throws in a frame.
holo.update(12.5, 0); holo.update(13, 1);
console.log('heroHolograms tests passed: 13 panels, no Latin copy, hero sightlines clear');
