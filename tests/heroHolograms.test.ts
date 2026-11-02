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

// 8 panels (newgen, release, smartlife, daily and tide are gone), every visible string free of Latin letters (Japanese copy and numerals only).
const texts = holo.texts();
assert.equal(texts.size, 8); assert.equal(holo.root.children.length, 8);
for (const gone of ['newgen', 'release', 'smartlife', 'daily', 'tide']) assert.ok(!texts.has(gone) && !holo.root.getObjectByName(`hologram-${gone}`), `${gone} is removed`);
for (const [id, strings] of texts) { assert.ok(id.startsWith('tag-') || strings.length > 0, `${id} has copy`); for (const s of strings) assert.ok(!/[A-Za-z]/.test(s), `${id}: "${s}" contains Latin letters`); }

// Copy: at most two strings per panel, tags carry no text, the culture panel is the Fuji TV broadcast card.
const culture = texts.get('culture')!;
for (const word of ['フジ', '文化放送']) assert.ok(culture.includes(word), `culture panel shows ${word}`);
for (const [id, glyphs] of holo.glyphs()) {
  assert.ok(glyphs.length <= 2, `${id} has ${glyphs.length} strings`);
  if (id.startsWith('tag-')) assert.equal(glyphs.length, 0, `${id} is text-free`);
}

// Resident scale (spec "居民尺度"): every panel is a real size, hangs at a real height, faces the walkers it is for, and its main word is readable from its viewing distance
// (word height in metres >= view / 40).
const RANGE: Record<string, readonly [number, number, number, number]> = { // [min width, max width, min bottom, max bottom] in metres
  district: [24, 32, 40, 70], transit: [10, 14, 14, 30], air: [8, 12, 25, 40], voices: [12, 16, 8, 12], culture: [18, 24, 30, 55], 'tag-a': [3, 5, 20, 40], 'tag-b': [3, 5, 20, 40], 'tag-c': [3, 5, 30, 55],
};
for (const place of HOLOGRAMS.panels) {
  const [w0, w1, b0, b1] = RANGE[place.id], bottom = place.at[1] - place.h / 2;
  assert.ok(place.w >= w0 && place.w <= w1, `${place.id} is ${place.w} m wide`);
  assert.ok(bottom >= b0 && bottom <= b1, `${place.id} bottom edge is ${bottom} m`);
  const group = holo.root.getObjectByName(`hologram-${place.id}`)!, normal = new Vector3(0, 0, 1).applyQuaternion(group.quaternion);
  const toFace = new Vector3(...place.face).sub(new Vector3(...place.at));
  assert.ok(normal.dot(toFace.normalize()) > .999, `${place.id} faces its viewers`);
  assert.ok(toFace.set(...place.face).distanceTo(new Vector3(...place.at)) <= place.view * 1.6, `${place.id} view distance ${place.view} m`);
  const tilt = Math.asin(-normal.y) * 180 / Math.PI;
  assert.ok(tilt >= -1 && tilt <= 22, `${place.id} tilts ${tilt.toFixed(1)} degrees`);
  const glyphs = holo.glyphs().get(place.id)!;
  if (glyphs.length) {
    const mainMetres = Math.max(...glyphs.map(g => g.px)) / holo.designWidth(place.id) * place.w;
    assert.ok(mainMetres >= place.view / 40, `${place.id}: main word ${mainMetres.toFixed(2)} m, needs ${(place.view / 40).toFixed(2)} m for ${place.view} m`);
  }
}

// Hero: every panel is front-facing to the settled hero camera and its centre is inside the frame (occlusion by buildings is checked in the browser).
{
  const cam = heroSettledCamera(1600, 900);
  for (const place of HOLOGRAMS.panels) {
    const group = holo.root.getObjectByName(`hologram-${place.id}`)!, normal = new Vector3(0, 0, 1).applyQuaternion(group.quaternion), c = new Vector3(...place.at);
    assert.ok(normal.dot(cam.position.clone().sub(c).normalize()) > .05, `${place.id} faces away from the hero camera`);
    const ndc = c.clone().project(cam); assert.ok(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1, `${place.id} is outside the hero frame`);
  }
}

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

// Live panel: rungs clamp to −3..3 and a bar is (tier + 3) / 6 long; the secondary word reads 「1,284件」 and the main word 「住民の声」.
assert.equal(tierBar(9), 1); assert.equal(tierBar(-9), 0); assert.equal(tierBar(0), .5);
holo.setTiers({ nw: 3, ne: -3, sw: 0, se: 9 });
assert.deepEqual(HOLOGRAM_AXES.map(a => a.socket), ['nw', 'sw', 'ne', 'se']);
assert.deepEqual(holo.bars(), [1, .5, 0, 1]);
holo.setVoices(1284); assert.deepEqual(holo.texts().get('voices'), ['住民の声', '1,284件']);
// The longest count (99,999件) never touches the main word: the two boxes are separated by at least the secondary's height.
holo.setVoices(99999);
{
  const [main, secondary] = holo.glyphs().get('voices')!; assert.equal(secondary.str, '99,999件');
  const gapX = Math.max(main.box[0] - secondary.box[2], secondary.box[0] - main.box[2]), gapY = Math.max(main.box[1] - secondary.box[3], secondary.box[1] - main.box[3]);
  assert.ok(gapX >= secondary.px || gapY >= secondary.px, `voices main and 99,999件 overlap (gap x ${gapX.toFixed(1)}, y ${gapY.toFixed(1)})`);
  assert.ok(secondary.box[2] <= 176 && secondary.box[0] >= 0, 'the count stays inside the panel (176 px wide)');
}
holo.setVoices(-5); assert.ok(holo.texts().get('voices')!.includes('0件'));
for (const strings of holo.texts().values()) for (const s of strings) assert.ok(!/[A-Za-z]/.test(s));

// Day / night parameters blend and nothing throws in a frame.
holo.update(12.5, 0); holo.update(13, 1);
console.log('heroHolograms tests passed: 8 panels at resident scale, no Latin copy, hero sightlines clear');
