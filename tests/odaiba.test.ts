import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, Group, Mesh, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { placeOdaibaModel } from '../src/odaibaPlacement.ts';
import { changeSites, skyBridges, floatingDecks } from '../src/layout.ts';
import { heroCamera } from '../src/heroCamera.ts';
import { routes } from '../src/mobility.ts';

const layout = JSON.parse(readFileSync(new URL('../src/odaiba-layout.json', import.meta.url), 'utf8'));
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(readFileSync(new URL('../' + layout.source, import.meta.url))), layout.sourceSha256,
  'Masterplan changed: rerun the read-only Blender metadata extraction');
assert.equal(layout.buildings.length, 8);
assert.equal(new Set(layout.buildings.map((p: { id: string }) => p.id)).size, 8);
let triangles = 0;
const city = new Group();
for (const placement of layout.buildings) {
  assert.deepEqual(placement.scale, [1, 1, 1], 'Preserve authored metres');
  assert.equal(placement.adapterRotationX !== 0, placement.id === 'grand-nikko-tokyo-daiba');
  const bytes = readFileSync(new URL(`../asset/models/${placement.id}/${placement.id}.glb`, import.meta.url));
  assert.equal(hash(bytes), placement.glbSha256, `${placement.id}: source GLB changed`);
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  placeOdaibaModel(scene, placement);
  // Compute precise vertex bounds, not rotated local AABBs. Independent expected
  // bounds were read from actual world-space geometry in the Blender masterplan.
  const actual = new Box3(), point = new Vector3();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const positions = object.geometry.attributes.position;
    triangles += (object.geometry.index?.count ?? positions.count) / 3;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      actual.expandByPoint(point);
    }
  });
  const [min, max] = placement.boundsBlender;
  const expected = [[min[0], min[2], -max[1]], [max[0], max[2], -min[1]]];
  [actual.min.toArray(), actual.max.toArray()].forEach((bound, side) => bound.forEach((v, axis) => {
    assert.ok(Math.abs(v - expected[side][axis]) < .002,
      `${placement.id} bound ${side}/${axis}: ${v} differs from source ${expected[side][axis]}`);
  }));
  assert.ok(Math.abs(actual.min.y) < .002, `${placement.id} grounded at source pad`);
  city.add(scene);
}
assert.equal(triangles, 339919, 'All eight complete GLBs retain reviewed geometry');

// Survey sites: the whole scaled lot (plus a 5 m margin) lands on open ground, and the hero pose sees each site unobstructed.
const environmentBytes = readFileSync(new URL('../asset/models/odaiba-masterplan/odaiba_masterplan_v01_phase03d_environment.glb', import.meta.url));
city.add((await new GLTFLoader().parseAsync(environmentBytes.buffer.slice(environmentBytes.byteOffset, environmentBytes.byteOffset + environmentBytes.byteLength), '')).scene);
city.updateMatrixWorld(true);
const openGround = /^(TERRAIN|PHASE03C_LANDSCAPE|PHASE03C_PLAZA|PRIMARY_PLAZA|PHASE03C_SERVICE|SERVICE_BAY|SIDEWALK|WATERFRONT_PROMENADE)/;
const ray = new Raycaster(), down = new Vector3(0, -1, 0);
const camera = heroCamera(1920, 1080);
camera.updateMatrixWorld(true);
for (const site of Object.values(changeSites)) {
  const w = site.w * site.scale, d = site.d * site.scale;
  for (let x = -w / 2 - 5; x <= w / 2 + 5; x += 5) for (let z = -d / 2 - 5; z <= d / 2 + 5; z += 5) {
    ray.set(new Vector3(site.x + x, 500, site.z + z), down);
    const hit = ray.intersectObject(city, true)[0];
    assert.ok(hit && openGround.test(hit.object.name) && hit.point.y < 3, `${site.name} lot meets ${hit?.object.name ?? 'nothing'} at ${Math.round(site.x + x)},${Math.round(site.z + z)}`);
  }
  // A point a quarter of the way up the tallest variant must be in frame and not hidden behind a landmark or context block.
  const look = new Vector3(site.x, site.h * site.scale / 4, site.z), ndc = look.clone().project(camera);
  assert.ok(Math.abs(ndc.x) < .95 && Math.abs(ndc.y) < .95, `${site.name} leaves the hero frame: ${ndc.x.toFixed(2)},${ndc.y.toFixed(2)}`);
  ray.set(camera.position, look.clone().sub(camera.position).normalize());
  const blocker = ray.intersectObject(city, true)[0];
  assert.ok(!blocker || blocker.distance > camera.position.distanceTo(look) - 1, `${site.name} hidden from the hero pose by ${blocker?.object.name}`);
}
// Actors: pods ride on the guideway deck, walkers (both lanes) stay on open ground outside the site lots, boats stay on water.
const actorPaths = routes(), side = new Vector3(), tangent = new Vector3(), up = new Vector3(0, 1, 0);
const groundAt = (x: number, z: number, from = 500) => { ray.set(new Vector3(x, from, z), down); return ray.intersectObject(city, true)[0]; };
for (let i = 0; i <= 400; i++) {
  // Guardrails and station roofs sit on the deck; only landmark geometry above it would block a pod.
  const p = actorPaths.guideway.getPointAt(i / 400);
  ray.set(new Vector3(p.x, p.y + 6, p.z), down);
  const hits = ray.intersectObject(city, true), deck = hits.find(h => /^YURIKAMOME/.test(h.object.name));
  assert.ok(deck && Math.abs(deck.point.y - p.y) < .5, `pod path leaves the guideway at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
  assert.ok(!hits.some(h => h.distance < deck.distance && !/^(YURIKAMOME|PHASE03D_GUARDRAILS|STATIONS|PUBLIC_LINK_BRIDGES)/.test(h.object.name)), `pod path blocked at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
}
for (const promenade of actorPaths.promenades) for (let i = 0; i <= 400; i++) for (const lane of [-2.8, 0, 2.8]) {
  const p = promenade.getPointAt(i / 400); promenade.getTangentAt(i / 400, tangent);
  p.addScaledVector(side.crossVectors(up, tangent).normalize(), lane);
  const hit = groundAt(p.x, p.z);
  assert.ok(hit && openGround.test(hit.object.name) && hit.point.y < 3, `walker lane ${lane} meets ${hit?.object.name} at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
  for (const site of Object.values(changeSites))
    assert.ok(Math.abs(p.x - site.x) > site.w * site.scale / 2 + 1 || Math.abs(p.z - site.z) > site.d * site.scale / 2 + 1, `walker path crosses the ${site.name} lot`);
}
for (const [name, route] of [['water loop', actorPaths.water], ['ferry lane', actorPaths.ferry]] as const) for (let i = 0; i <= 400; i++) for (const beam of [-6, 0, 6]) {
  const p = route.getPointAt(i / 400); route.getTangentAt(i / 400, tangent); p.addScaledVector(side.crossVectors(up, tangent).normalize(), beam);
  const hit = groundAt(p.x, p.z);
  assert.ok(!hit || /^WATER/.test(hit.object.name), `${name} runs aground on ${hit?.object.name} at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
}
// 2127 layer: each sky bridge spans open air between its two facades and clears the trains; floating decks float clear of boat routes.
for (const bridge of skyBridges) {
  const a = new Vector3(...bridge.from), b = new Vector3(...bridge.to), dir = b.clone().sub(a).normalize();
  for (const [x, y] of [[-4, -2.5], [4, -2.5], [-4, 2.5], [4, 2.5], [0, 0]]) {
    const offset = new Vector3(-dir.z, 0, dir.x).multiplyScalar(x).setY(y);
    ray.set(a.clone().add(offset).addScaledVector(dir, 3), dir);
    const first = ray.intersectObject(city, true)[0];
    assert.ok(first && first.distance > a.distanceTo(b) - 12, `${bridge.name} hits ${first?.object.name} after ${first?.distance.toFixed(0)} m`);
  }
  for (let i = 0; i <= 100; i++) {
    const p = a.clone().lerp(b, i / 100);
    for (let j = 0; j <= 400; j++) { const g = actorPaths.guideway.getPointAt(j / 400); if (Math.hypot(g.x - p.x, g.z - p.z) < 8) assert.ok(p.y - 2.5 - (g.y + 3) > 3, `${bridge.name} too low over the guideway`); }
  }
}
const boatPoints = [actorPaths.water, actorPaths.ferry].flatMap(route => Array.from({ length: 400 }, (_, i) => route.getPointAt(i / 400)));
for (const [x, z, yaw] of floatingDecks) {
  const along = new Vector3(Math.sin(yaw), 0, Math.cos(yaw)), across = new Vector3(along.z, 0, -along.x);
  for (const [u, v] of [[-18, -5], [18, -5], [-18, 5], [18, 5], [0, 0]]) {
    const p = new Vector3(x, 0, z).addScaledVector(along, u).addScaledVector(across, v), hit = groundAt(p.x, p.z);
    assert.ok(!hit || /^WATER/.test(hit.object.name), `floating deck at ${x},${z} grounds on ${hit?.object.name}`);
  }
  assert.ok(Math.min(...boatPoints.map(p => Math.hypot(p.x - x, p.z - z))) > 30, `floating deck at ${x},${z} sits in a boat route`);
}
console.log('Odaiba: sky bridges span clear air above the trains; floating decks float clear of boat routes.');
console.log('Odaiba: pods ride the guideway deck, walkers keep to open ground outside site lots, water taxis stay afloat.');
console.log('Odaiba: survey sites sit on open ground, clear of roads, landmarks and guideway, and are visible from the hero pose.');
console.log('Odaiba: eight GLBs match Phase 03D world bounds within 2 mm, grounded, unit scale, legacy axis verified.');
