import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, Group, InstancedMesh, Matrix4, Mesh, Raycaster, Scene, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { placeOdaibaModel } from '../src/odaibaPlacement.ts';
import { changeSites, skyBridges, inDistrict, DISTRICT } from '../src/layout.ts';
import { heroCamera } from '../src/heroCamera.ts';
import { pavilionFlight, plazaPose, routes, mobility, publishDoorways, publishEntrances, forecourtVisits, promenadeBenches, visitPose, entranceJourneys, entrancePose, laneOffset } from '../src/mobility.ts';
import { presets } from '../src/presets.ts';
import { civicCore } from '../src/civicCore.ts';
import { bake } from '../src/cityRig.ts';
import { contextFacades } from '../src/contextFacades.ts';
import { plantCanopy, plantLandscapeCanopy, plantRoofCanopy } from '../src/coastalCanopy.ts';
import { tidalEdge } from '../src/amphibiousShore.ts';
import { AutomationDistrict, ConcentrationDistrict, SharingDistrict } from '../src/districtMeters.ts';
import { bayContext } from '../src/bayContext.ts';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';

// The checks below cast tens of thousands of rays at the full district. A BVH per geometry, built on first hit test, returns the same
// intersections as three's brute-force raycast in a fraction of the time; `indirect` leaves each geometry's own index untouched.
Mesh.prototype.raycast = function (this: Mesh, raycaster, intersects) {
  this.geometry.boundsTree ??= new MeshBVH(this.geometry, { indirect: true });
  return acceleratedRaycast.call(this, raycaster, intersects);
};

const layout = JSON.parse(readFileSync(new URL('../src/odaiba-layout.json', import.meta.url), 'utf8'));
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(readFileSync(new URL('../' + layout.source, import.meta.url))), layout.sourceSha256,
  'Masterplan changed: rerun the read-only Blender metadata extraction');
assert.equal(layout.buildings.length, 8);
assert.equal(new Set(layout.buildings.map((p: { id: string }) => p.id)).size, 8);
let triangles = 0;
const city = new Group();
const landmarks: Group[]=[];
for (const placement of layout.buildings) {
  assert.deepEqual(placement.scale, [1, 1, 1], 'Preserve authored metres');
  assert.equal(placement.adapterRotationX !== 0, placement.id === 'grand-nikko-tokyo-daiba');
  const bytes = readFileSync(new URL(`../asset/models/${placement.id}/${placement.id}.glb`, import.meta.url));
  assert.equal(hash(bytes), placement.glbSha256, `${placement.id}: source GLB changed`);
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.name=placement.id; // runtime loadOdaiba assigns the same landmark identity before publishing entrances
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
  if(placement.id!=='fuji-tv' && placement.id!=='telecom-center'){
    // Runtime merge (odaibaScene): one mesh per finish, identical triangles, same placed bounds.
    const materials=new Set<unknown>(),tris=(root:Group)=>{let n=0;root.traverse(o=>{if(o instanceof Mesh){materials.add(o.material);n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return n;};
    const before=tris(scene),merged=bake(scene);scene.clear();scene.add(...merged);
    assert.equal(merged.length,materials.size,`${placement.id} merges to one mesh per material`);
    assert.equal(tris(scene),before,`${placement.id} keeps every triangle when merged`);
    const mergedBounds=new Box3().setFromObject(scene,true);
    assert.ok(mergedBounds.min.distanceTo(actual.min)<.01 && mergedBounds.max.distanceTo(actual.max)<.01,`${placement.id} merged bounds unchanged`);
    city.add(scene);landmarks.push(scene);
  }
  if(placement.id==='aqua-city-odaiba' || placement.id==='decks-tokyo-beach')plantRoofCanopy(city,scene);
}
assert.equal(triangles, 339919, 'All eight complete GLBs retain reviewed geometry');
const core=civicCore();city.add(core);
landmarks.push(core);
const coreBounds=new Box3().setFromObject(core);
assert.ok(coreBounds.min.y>=-5 && coreBounds.max.y<155, 'Civic chassis stays below the district aerial corridor');
assert.ok(core.children.length<=8, 'Static civic chassis batches by shared material');
assert.ok(core.children.every(object=>object instanceof Mesh && !Array.isArray(object.material)), 'No per-member draws');
// Actual chassis must preserve the bay approach and berth, including a 22 m aircraft wing envelope.
core.updateMatrixWorld(true);
const approach=routes().approach,clearanceRay=new Raycaster();
for(let i=0;i<=160;i++) {
  const p=approach.getPointAt(i/160);
  for(const dx of [-11,0,11]) {
    clearanceRay.set(p.clone().add(new Vector3(dx,0,0)),new Vector3(0,-1,0));
    const hit=clearanceRay.intersectObject(core,true)[0];
    assert.ok(!hit || hit.distance>5, `Civic core obstructs aerial approach at ${i}, wing ${dx}`);
  }
}

// Survey sites: the whole scaled lot (plus a 5 m margin) lands on open ground, and the hero pose sees each site unobstructed.
const environmentBytes = readFileSync(new URL('../asset/models/odaiba-masterplan/odaiba_district_v01_environment.glb', import.meta.url));
const environment=(await new GLTFLoader().parseAsync(environmentBytes.buffer.slice(environmentBytes.byteOffset, environmentBytes.byteOffset + environmentBytes.byteLength), '')).scene;
// Hero district: every site and retained landmark inside, Telecom Center the only one cut; detail pieces outside are dropped whole.
assert.deepEqual(layout.buildings.filter((p: {positionBlender:number[]}) => !inDistrict(p.positionBlender[0], -p.positionBlender[1])).map((p: {id:string}) => p.id), ['telecom-center']);
for (const site of Object.values(changeSites)) assert.ok(inDistrict(site.x, site.z), `${site.name} outside the district`);
// District GLB (scripts/crop-odaiba-district.py): street detail only inside; ground, roads, guideway, context massing and sea stay whole.
const beyond = (x: number, z: number) => Math.hypot(Math.max(0, x - DISTRICT.maxX, DISTRICT.minX - x), Math.max(0, z - DISTRICT.maxZ, DISTRICT.minZ - z));
environment.updateMatrixWorld(true);
environment.traverse(object => {
  if (!(object instanceof Mesh) || !/^(PUBLIC_|STREETLIGHT_|LANDSCAPE_TREE|STATIONS)/.test(object.name)) return;
  const position = object.geometry.attributes.position, c = new Vector3();
  for (let i = 0; i < position.count; i++) {
    c.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
    // Kept pieces are centred inside and may overhang by part of one piece.
    assert.ok(beyond(c.x, c.z) < 60, `${object.name} keeps detail ${beyond(c.x, c.z).toFixed(0)} m beyond the district at ${c.x.toFixed(0)},${c.z.toFixed(0)}`);
  }
});
assert.ok(!environment.getObjectByName('ROADSIDE_TREE_INSTANCES'), 'Hidden roadside blockout is dropped');
// Street cars pass through nothing: every lane's car body (±0.95 m, 0.5 and 1.2 m up, scaled as drawn by the 12 m fade at each
// avenue end) along both avenues, probed 0.3 m in four directions against the landmarks, civic core and environment (guideway
// piers, Hilton's chapel, Aqua City's walls). Faces are hit from either side for this check only.
{
  const solids = [environment, ...landmarks], sides = new Map<any, number>(), ground = /^(road|road_marking|sidewalk|plaza|landscape|water|service_area)$/;
  for (const root of solids) root.traverse(o => { if (o instanceof Mesh && !Array.isArray(o.material)) { sides.set(o.material, o.material.side); o.material.side = 2; } });
  environment.updateMatrixWorld(true);
  const probe = new Raycaster(), dirs = [new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1)], hits: string[] = [];
  routes().streets.forEach((street, r) => {
    const length = street.getLength();
    for (let d = 0; d <= length; d += 1) for (const lane of [0, 1]) {
      const p = street.getPointAt(d / length), t = street.getTangentAt(d / length), n = lane ? -laneOffset(r, 1) : laneOffset(r, 0);
      const drawn = Math.min(1, d / 12, (length - d) / 12);
      for (const across of [-.95, -.45, 0, .45, .95]) for (const y of [.5, 1.2]) for (const dir of dirs) {
        probe.set(new Vector3(p.x + t.z * (n + across * drawn), y * drawn, p.z - t.x * (n + across * drawn)), dir); probe.far = .3;
        const hit = probe.intersectObjects(solids, true).find(h => !ground.test(((h.object as Mesh).material as { name: string }).name));
        if (hit) hits.push(`${r}|${lane}|${d}|${hit.object.name}|${hit.object.parent?.name}|${hit.point.y.toFixed(1)}|${hit.distance.toFixed(2)}`);
      }
    }
  });
  for (const [material, side] of sides) material.side = side;
  assert.deepEqual([...new Set(hits.map(h => h.split('|').slice(0, 4).join('|')))].slice(0, 5), [], 'street cars pass through solid geometry');
}
const backdrop = new Box3().setFromObject(environment.getObjectByName('TERRAIN_LOW_DENSITY')!);
assert.ok(environment.getObjectByName('CTX_south_east_unknown') && environment.getObjectByName('ROAD_MAJOR') && backdrop.max.z > 1300 && backdrop.max.x > 680, 'Odaiba backdrop ground, roads and massing continue past the district');
const panels=contextFacades(environment);
assert.ok(panels.count>100, 'Context facades have occupied panel rows');
{ const m = new Matrix4(), c = new Vector3(); for (let i = 0; i < panels.count; i++) { panels.getMatrixAt(i, m); c.setFromMatrixPosition(m); assert.ok(inDistrict(c.x, c.z), 'Facade panels stay inside the district'); } }
const edge=tidalEdge();
assert.ok(edge.children.length>0 && edge.children.length<=5, 'North tidal edge batches by shared finish');
const bay=bayContext();
assert.ok(bay.children.length<=5, 'Bay bridges, shores and Ariake parkland batch by finish; skyline is one instanced draw');
city.add(environment,panels,edge,bay);
plantCanopy(city, JSON.parse(readFileSync(new URL('../asset/models/odaiba-masterplan/tree_instances.json', import.meta.url), 'utf8')));
const groveStart=city.children.length;
plantLandscapeCanopy(city,environment,landmarks);
assert.ok(city.children[groveStart] instanceof InstancedMesh && city.children[groveStart].count>100, 'Authored landscape carries coastal groves');
for (const grove of city.children.filter(o => o instanceof InstancedMesh && o.name === 'surveyed-coastal-trunks') as InstancedMesh[]) {
  const m = new Matrix4(), c = new Vector3();
  for (let i = 0; i < grove.count; i++) { grove.getMatrixAt(i, m); c.setFromMatrixPosition(m); assert.ok(inDistrict(c.x, c.z), `tree outside the district at ${c.x.toFixed(0)},${c.z.toFixed(0)}`); }
}
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
// Air taxis keep 20 m above the bay bridges and backdrop they overfly.
for (const route of [actorPaths.air, actorPaths.approach]) for (let i = 0; i <= 400; i++) {
  const p = route.getPointAt(i / 400); ray.set(p, down);
  const hit = ray.intersectObject(bay, true)[0];
  assert.ok(!hit || hit.distance > 20, `air route within ${hit?.distance.toFixed(0)} m of the bay context at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
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
console.log('Odaiba: hero district keeps six landmarks and four sites; street detail, trees and facades stay inside it; the Odaiba backdrop and bay bridges stay clear of every route.');
console.log('Odaiba: sky bridges span clear air above the trains.');
console.log('Odaiba: pods ride the guideway deck, walkers keep to open ground outside site lots, water taxis stay afloat.');
console.log('Odaiba: survey sites sit on open ground, clear of roads, landmarks and guideway, and are visible from the hero pose.');
console.log('Odaiba: eight GLBs match Phase 03D world bounds within 2 mm, grounded, unit scale, legacy axis verified.');

// P2 raised service pavilions: terraces clear existing context/trees; piers land off roads and routes remain unobstructed.
const serviceDistrict = new AutomationDistrict(new Group());
serviceDistrict.setTarget({ automatedPorts: 1 }, 0, true);
serviceDistrict.root.updateMatrixWorld(true);
for (const bay of serviceDistrict.bays) {
  const at = (x: number, z: number) => new Vector3(bay.x + x * Math.cos(bay.yaw) + z * Math.sin(bay.yaw), 0,
    bay.z - x * Math.sin(bay.yaw) + z * Math.cos(bay.yaw));
  for (const x of [-19, 0, 19]) for (const z of [-27, 0, 27]) {
    const p = at(x, z), hit = groundAt(p.x, p.z);
    assert.ok(hit && hit.point.y < 18, `service terrace obstructed by ${hit?.object.name} at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
  }
  for (const x of [-16, 16]) for (const z of [-12, 12]) {
    const p = at(x, z), hit = groundAt(p.x, p.z, 18);
    assert.ok(hit && (openGround.test(hit.object.name) || /canopy/.test(hit.object.name)), `service pier on ${hit?.object.name} at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
    const foot = groundAt(p.x, p.z, 3);
    assert.ok(foot && openGround.test(foot.object.name), `service pier foot on ${foot?.object.name}`);
  }
}
for (const route of [actorPaths.guideway, actorPaths.sweep, ...actorPaths.promenades]) for (let i = 0; i <= 200; i++) {
  const p = route.getPointAt(i / 200);
  for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3]) {
    ray.set(p.clone().add(new Vector3(dx, 3, dz)), down);
    assert.equal(ray.intersectObject(serviceDistrict.root, true).length, 0, 'service pavilions block pod/walker route');
  }
}
console.log(`Odaiba: ${serviceDistrict.bays.length} raised staffed pavilions clear context and actor routes; piers land on open ground.`);

// Both water-room identities preserve boat beams, promenade lanes and the landward entrance.
const sharingDistrict = new SharingDistrict(new Group());
for (const seats of [0, 4, 8]) {
  sharingDistrict.setTarget({ sharedSeats: seats }, 0, true);
  sharingDistrict.root.updateMatrixWorld(true);
  for (const route of [actorPaths.water, actorPaths.ferry, ...actorPaths.promenades]) for (let i = 0; i <= 400; i++) {
    const p = route.getPointAt(i / 400), beam = route === actorPaths.water || route === actorPaths.ferry ? 6 : 2.8;
    route.getTangentAt(i / 400, tangent);
    for (const lane of [-beam, 0, beam]) {
      const position = p.clone().addScaledVector(side.crossVectors(up, tangent).normalize(), lane);
      ray.set(position.setY(80), down);
      assert.equal(ray.intersectObject(sharingDistrict.root, true).length, 0, `sharing ${seats} obstructs boat / pedestrian route`);
    }
  }
  for (const bay of sharingDistrict.bays) {
    const outward = new Vector3(Math.cos(bay.yaw), 0, -Math.sin(bay.yaw));
    const start = new Vector3(bay.x, bay.y + 1, bay.z).addScaledVector(outward, bay.r * bay.sx * 1.3);
    ray.set(start, outward.clone().negate()); ray.far = bay.r * bay.sx * .5;
    assert.equal(ray.intersectObject(sharingDistrict.root, true).length, 0, 'landward entrance stays open');
    ray.far = Infinity;
  }
}
console.log(`Odaiba: ${sharingDistrict.bays.length} private / open water rooms preserve boat beams, walker lanes and landward access.`);

// P4 concentration: towers, sky bridges and pods stand on open ground clear of landmarks, context and actor routes; sites stay visible.
const concentration = new ConcentrationDistrict(new Group());
const blocked = (x: number, z: number, y: number, reach: number) => {
  for (let k = 0; k < 12; k++) {
    ray.set(new Vector3(x, y, z), new Vector3(Math.cos(k / 12 * Math.PI * 2), 0, Math.sin(k / 12 * Math.PI * 2))); ray.far = reach;
    const hit = ray.intersectObject(city, true)[0]; ray.far = Infinity;
    if (hit) return hit.object.name;
  }
  return undefined;
};
const offGround = (x: number, z: number, radius: number) => {
  for (const f of [0, .5, 1]) for (let k = 0; k < (f ? 8 : 1); k++) {
    const a = k / 8 * Math.PI * 2, hit = groundAt(x + Math.cos(a) * radius * f, z + Math.sin(a) * radius * f);
    if (!hit || !openGround.test(hit.object.name) || hit.point.y > 3) return hit?.object.name ?? 'nothing';
  }
  return undefined;
};
/** Podium on open ground; trees may stand beside it but not above the podium; shaft, lobbies and crown clear of everything. */
const towerProblem = (x: number, z: number, h: number) => offGround(x, z, 18.5) ?? blocked(x, z, 3, 18.5)
  ?? [.4 * h, .72 * h, h].map(y => blocked(x, z, y, 24)).find(Boolean) ?? (h * 1.06 < 165 ? undefined : 'air-taxi loop');
const podProblem = (x: number, z: number) => offGround(x, z, 10.5) ?? blocked(x, z, 6, 11) ?? blocked(x, z, 9, 12.5) ?? blocked(x, z, 13, 9.5);
if (process.env.PROBE_CONCENTRATION) {
  // Dev aid: PROBE_CONCENTRATION=x,z,h;x,z;... prints the problem (or OK) for candidate tower [x,z,h] / pod [x,z] sites.
  for (const entry of process.env.PROBE_CONCENTRATION.split(';')) {
    const [x, z, h] = entry.split(',').map(Number);
    console.log('PROBE', entry, (h ? towerProblem(x, z, h) : podProblem(x, z)) ?? 'OK');
  }
}
for (const tower of concentration.towers) assert.equal(towerProblem(tower.x, tower.z, tower.h), undefined, `tower at ${tower.x},${tower.z}`);
// P10 drone dock rings (radius 26 at the upper lobby) and kiosks in court corners clear existing geometry.
for (const tower of concentration.towers) assert.equal(blocked(tower.x, tower.z, .72 * tower.h, 27.5), undefined, `drone dock at ${tower.x},${tower.z}`);
for (const pod of concentration.pods) assert.equal(podProblem(pod.x, pod.z), undefined, `pod at ${pod.x},${pod.z}`);
for (const tower of concentration.towers) for (const pod of concentration.pods) assert.ok(Math.hypot(tower.x - pod.x, tower.z - pod.z) > 30, 'pods and towers share no ground');
for (const { i, j, y } of concentration.bridges) {
  const a = concentration.towers[i], b = concentration.towers[j], dir = new Vector3(b.x - a.x, 0, b.z - a.z), length = dir.length();
  dir.normalize();
  for (const dy of [-2, 2]) {
    ray.set(new Vector3(a.x, y + dy, a.z).addScaledVector(dir, 15), dir); ray.far = length - 30;
    assert.equal(ray.intersectObject(city, true)[0]?.object.name, undefined, `sky bridge ${i}-${j} crosses existing geometry`);
    ray.far = Infinity;
  }
}
for (const functionModules of [2, 4, 6]) {
  // Ends also show their pairings: high with forest crowns and drone docks, low with solar pods.
  concentration.setTarget({ functionModules, automatedPorts: functionModules === 6 ? 6 : 3, plantedFraction: [.2, .5, .8][functionModules / 2 - 1] }, 0, true);
  concentration.root.updateMatrixWorld(true);
  for (const route of [actorPaths.guideway, actorPaths.sweep, ...actorPaths.promenades]) for (let i = 0; i <= 200; i++) {
    const p = route.getPointAt(i / 200);
    for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3]) {
      ray.set(p.clone().add(new Vector3(dx, 3, dz)), down);
      assert.equal(ray.intersectObject(concentration.root, true).length, 0, `concentration ${functionModules} blocks a pod/walker route`);
    }
  }
  city.add(concentration.root);
  for (const site of Object.values(changeSites)) {
    const look = new Vector3(site.x, site.h * site.scale / 4, site.z);
    ray.set(camera.position, look.clone().sub(camera.position).normalize());
    const blocker = ray.intersectObject(city, true)[0];
    assert.ok(!blocker || blocker.distance > camera.position.distanceTo(look) - 1, `${site.name} hidden by ${blocker?.object.name} at concentration ${functionModules}`);
  }
  city.remove(concentration.root);
}
console.log(`Odaiba: ${concentration.towers.length} vertical towers, ${concentration.bridges.length} sky bridges and ${concentration.pods.length} pods stand on open ground, clear of landmarks, context and routes; sites stay visible.`);
// Sharing courts: open ground, clear of context, routes, P2 pavilions and P4 towers / pods in both identities; sites stay visible.
for (const court of sharingDistrict.courts) {
  assert.equal(offGround(court.x, court.z, 20) ?? blocked(court.x, court.z, 3, 20) ?? blocked(court.x, court.z, 10, 20), undefined, `court at ${court.x},${court.z}`);
  assert.ok(concentration.towers.every(t => Math.hypot(t.x - court.x, t.z - court.z) > 48) && concentration.pods.every(p => Math.hypot(p.x - court.x, p.z - court.z) > 36), 'courts share no ground with towers / pods');
  assert.ok(serviceDistrict.bays.every(b => Math.hypot(b.x - court.x, b.z - court.z) > 54), 'courts share no ground with staffed pavilions');
}
for (const court of sharingDistrict.courts) assert.equal(blocked(court.x, court.z, 12.5, 21.5), undefined, `drone kiosk at court ${court.x},${court.z}`);
for (const sharedSeats of [0, 8]) {
  // Sharing high also shows its high pairings (kiosks, orchards) in the route / site-visibility checks.
  sharingDistrict.setTarget({ sharedSeats, automatedPorts: sharedSeats ? 6 : 3, plantedFraction: sharedSeats ? .8 : .5 }, 0, true);
  sharingDistrict.root.updateMatrixWorld(true);
  for (const route of [actorPaths.guideway, actorPaths.sweep, ...actorPaths.promenades]) for (let i = 0; i <= 200; i++) {
    const p = route.getPointAt(i / 200);
    ray.set(p.clone().add(new Vector3(0, 3, 0)), down);
    assert.equal(ray.intersectObject(sharingDistrict.root, true).length, 0, `sharing ${sharedSeats} court blocks a pod/walker route`);
  }
  city.add(sharingDistrict.root);
  for (const site of Object.values(changeSites)) {
    const look = new Vector3(site.x, site.h * site.scale / 4, site.z);
    ray.set(camera.position, look.clone().sub(camera.position).normalize());
    const blocker = ray.intersectObject(city, true)[0];
    assert.ok(!blocker || blocker.distance > camera.position.distanceTo(look) - 1, `${site.name} hidden by ${blocker?.object.name} at sharing ${sharedSeats}`);
  }
  city.remove(sharingDistrict.root);
}
console.log(`Odaiba: ${sharingDistrict.courts.length} sharing courts stand on open ground clear of context, routes and other Meter sites; sites stay visible.`);

/** Estimated hero-frame pixels (1920 × 929 capture) of a court's 40 m ground square left visible: a 9 × 9 sample grid, each visible
 * sample weighted by its share of the square's projected area. Replaces a single centre ray, which kept courts that landmarks mostly hide. */
const capture = heroCamera(1920, 929); capture.updateMatrixWorld(true);
const courtPixels = (x: number, z: number, yaw = 0, half = 20) => {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new Vector3(x + a * half, 0, z + b * half).project(capture))
    .map(p => [(p.x + 1) * 960, (1 - p.y) * 464.5]);
  const area = Math.abs(corners.reduce((sum, [ax, ay], k) => { const [bx, by] = corners[(k + 1) % 4]; return sum + ax * by - bx * ay; }, 0)) / 2;
  let seen = 0;
  for (let i = 0; i < 9; i++) for (let k = 0; k < 9; k++) {
    const u = (i - 4) / 4.5 * half, v = (k - 4) / 4.5 * half;
    const look = new Vector3(x + u * Math.cos(yaw) + v * Math.sin(yaw), 1, z - u * Math.sin(yaw) + v * Math.cos(yaw)), ndc = look.clone().project(capture);
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) continue;
    ray.set(capture.position, look.clone().sub(capture.position).normalize());
    const hit = ray.intersectObject(city, true)[0];
    if (!hit || hit.distance > capture.position.distanceTo(look) - 2) seen++;
  }
  return area * seen / 81;
};
const courtVisibility = sharingDistrict.courts.map(c => courtPixels(c.x, c.z, c.yaw));
for (const [i, px] of courtVisibility.entries()) assert.ok(px >= 600, `court ${i} shows only ${px.toFixed(0)} px from the hero pose`);
console.log(`Odaiba: sharing courts show ${courtVisibility.map(px => px.toFixed(0)).join(' / ')} px of ground in the hero frame.`);

if (process.env.SCAN_COURTS) {
  const R = Number(process.env.SCAN_COURTS), routePoints = [actorPaths.guideway, actorPaths.sweep, ...actorPaths.promenades].flatMap(r => r.getSpacedPoints(400));
  const out: [number, string][] = [];
  for (let x = DISTRICT.minX; x <= DISTRICT.maxX; x += 10) for (let z = DISTRICT.minZ; z <= DISTRICT.maxZ; z += 10) {
    if (concentration.towers.some(t => Math.hypot(t.x - x, t.z - z) < R + 28) || concentration.pods.some(p => Math.hypot(p.x - x, p.z - z) < R + 16)) continue;
    if (serviceDistrict.bays.some(b => Math.hypot(b.x - x, b.z - z) < R + 34) || routePoints.some(p => Math.hypot(p.x - x, p.z - z) < R + 4)) continue;
    if (offGround(x, z, R) ?? blocked(x, z, 3, R) ?? blocked(x, z, 10, R)) continue;
    const px = courtPixels(x, z);
    if (px > 0) out.push([px, `${x},${z} ${px.toFixed(0)}px`]);
  }
  console.log('COURTS', out.sort((a, b) => b[0] - a[0]).map(o => o[1]).join(' | '));
}

// P12: two full flight cycles are continuous; gathering lanes preserve person-to-person clearance.
for (let time = 0; time <= 96; time += .25) {
  for (let i = 0; i < serviceDistrict.bays.length; i++) {
    const altitude = pavilionFlight(time, i);
    assert.ok(altitude >= 0 && altitude <= 1);
    assert.ok(Math.abs(altitude - pavilionFlight(time + .001, i)) < .001);
  }
  for (let i = 0; i < 12; i++) {
    const a = plazaPose(time, i);
    assert.ok(Math.hypot(a.x, a.z) < 18, 'crowd remains on the plaza paving');
    for (let j = i + 1; j < 12; j++) {
      const b = plazaPose(time, j);
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > .9, 'gathering lanes never overlap actors');
    }
  }
}
const crowdMatrix = new Matrix4(), actorPosition = new Vector3();
for (const share of [0, 4, 8]) {
  sharingDistrict.setTarget({ sharedSeats: share, automatedPorts: 6, plantedFraction: .8 }, 0, true);
  const crowd = sharingDistrict.root.children.find(o => o.name === 'plaza-crowds') as InstancedMesh;
  const obstacles = sharingDistrict.root.children.filter(o => o.name !== 'plaza-crowds' && o.name !== 'meter-pulse');
  for (const time of [0, 12, 24]) {
    sharingDistrict.update(time, 1); sharingDistrict.root.updateMatrixWorld(true);
    for (let i = 0; i < crowd.count; i++) {
      crowd.getMatrixAt(i, crowdMatrix); if (new Vector3().setFromMatrixScale(crowdMatrix).x < .001) continue;
      actorPosition.setFromMatrixPosition(crowdMatrix);
      for (const height of [.4, 1, 1.55]) for (const direction of [new Vector3(1,0,0),new Vector3(-1,0,0),new Vector3(0,0,1),new Vector3(0,0,-1)]) {
        ray.set(actorPosition.clone().add(new Vector3(0,height,0)), direction); ray.far = .45;
        assert.equal(ray.intersectObjects([...city.children, ...obstacles], true).length, 0, 'crowd intersects garden / orchard / kiosk / pavilion geometry');
      }
    }
  }
}
// The entire 24 m drone column (body / rotor-centre samples) clears real city and its own carrier; the landing surface is below the body.
for (const automatedPorts of [0, 3, 6]) {
  serviceDistrict.setTarget({ automatedPorts }, 0, true); serviceDistrict.update(0, 1); serviceDistrict.root.updateMatrixWorld(true);
  const drone = serviceDistrict.root.children.find(o => o.name === 'service-drones') as InstancedMesh;
  const obstacles = [...city.children, ...serviceDistrict.root.children.filter(o => o.name !== 'service-drones' && o.name !== 'meter-pulse')];
  for (let i = 0; i < drone.count; i++) {
    drone.getMatrixAt(i, crowdMatrix); actorPosition.setFromMatrixPosition(crowdMatrix);
    const bottom = actorPosition.y - 24 * pavilionFlight(0, i) - .84;
    for (const dx of [-1.8, 0, 1.8]) for (const dz of [-1.8, 0, 1.8]) {
      ray.set(new Vector3(actorPosition.x + dx, bottom + 25.68, actorPosition.z + dz), down); ray.far = 25.68;
      const hit = ray.intersectObjects(obstacles, true)[0];
      assert.equal(hit?.object.name, undefined, `service drone column ${i} intersects ${hit?.object.name}`);
    }
  }
}
ray.far = Infinity;
console.log('Odaiba: P12 two-cycle continuity, separated plaza crowds, orchard/kiosk clearance and full service-drone columns pass actual geometry checks.');

// Late-loaded landmarks publish real door-to-group journeys. Sample their swept body on paving and the actual visitor fleet
// against every walking/resting person and robot over several complete cycles at all automation levels.
const peopleScene = new Scene(), updatePeople = mobility(peopleScene);
for (const landmark of landmarks.filter(m => m !== core)) publishDoorways(landmark, environment);
assert.equal(entranceJourneys().length,0,'entrances must wait for complete static geometry');
publishEntrances(city,environment);
const visits = forecourtVisits();
const entrances=entranceJourneys();
assert.equal(entrances.length,2,'two real landmark frontages support complete entrance meetings');
assert.ok(visits.length >= 2, 'actual landmarks publish at least two complete daily-life journeys');
for (const v of visits) {
  const samples = v.curve.getSpacedPoints(Math.ceil(v.length / .25));
  for (let i = 0; i < samples.length; i++) {
    if (i * v.length / (samples.length - 1) < 1.2) continue; // origin lies .6 m inside its doorway
    const p = samples[i]; ray.far = 3; ray.set(p.clone().setY(2), down);
    const ground = ray.intersectObjects([environment, ...landmarks], true)[0];
    const finish = ground && (ground.object as Mesh).material;
    assert.ok(ground && ground.point.y < .6 && finish && !Array.isArray(finish) && /^(sidewalk|plaza)$/.test(finish.name), `visit ${v.group} leaves paving at ${p.toArray()}: ${ground?.object.name}`);
    for (const height of [.4, 1.2]) for (const direction of [new Vector3(1,0,0), new Vector3(-1,0,0), new Vector3(0,0,1), new Vector3(0,0,-1)]) {
      ray.set(p.clone().setY(height), direction); ray.far = .4;
      assert.equal(ray.intersectObjects([environment, ...landmarks], true).length, 0, `visit ${v.group} body clips city geometry`);
    }
    for (const site of Object.values(changeSites)) assert.ok(Math.abs(p.x - site.x) > site.w * site.scale / 2 + .4 || Math.abs(p.z - site.z) > site.d * site.scale / 2 + .4, 'visit crosses a changing site');
  }
}
const restStart = promenadeBenches(actorPaths.promenades.map(p => p.getLength())).length * 4;
const peopleFleets = ['promenade-walkers', 'doorway-walkers', 'resting-people', 'delivery-robots'].map(name => peopleScene.children.find(o => o.name === name) as InstancedMesh);
const resting = peopleFleets[2], m = new Matrix4(), scale = new Vector3(), p = new Vector3();
const seenVisits = new Set<string>();
const previousEntrances=new Map<string,Vector3>();
const strides = new Map<string, {time: number; at: Vector3; phase: number}>(), slow = [0, 0], inPlace = [0, 0];
for (const share of [0, .5, 1]) for (const hour of [12, 21]) for (let time = 0; time < 240; time += .25) {
  updatePeople(presets.neutral, time, share, hour === 21 ? 1 : 0, hour);
  const drawn = peopleFleets.flatMap(mesh => {
    const positions: {mesh: InstancedMesh; slot: number; at: Vector3}[] = [];
    for (let slot = 0; slot < mesh.count; slot++) { mesh.getMatrixAt(slot, m); if (scale.setFromMatrixScale(m).x > .5) positions.push({mesh, slot, at: new Vector3().setFromMatrixPosition(m)}); }
    return positions;
  });
  // Doorway people and robots keep their shoulders (robots .85 m) clear of each other, and nobody walks in place: a person drawn
  // covering under .3 m/s must not also be striding (swing > .2 with the phase advancing), as queued walkers once did.
  const door = drawn.filter(d => d.mesh === peopleFleets[1] || d.mesh === peopleFleets[3]);
  for (let a = 0; a < door.length; a++) for (let b = a + 1; b < door.length; b++) if (Math.abs(door[a].at.y - door[b].at.y) < 1)
    assert.ok(door[a].at.distanceTo(door[b].at) > (door[a].mesh === peopleFleets[3] || door[b].mesh === peopleFleets[3] ? .85 : .62), `${door[a].mesh.name}#${door[a].slot} grazes ${door[b].mesh.name}#${door[b].slot} at ${time}s`);
  for (const [f, limit] of [[0, 400], [1, 116]] as const) {
    const gait = peopleFleets[f].geometry.getAttribute('gait');
    for (const d of drawn) if (d.mesh === peopleFleets[f] && d.slot < limit) {
      const key = `${f}/${d.slot}`, prev = strides.get(key);
      if (prev && prev.time === time - .25 && gait.getW(d.slot) < .5 && d.at.distanceTo(prev.at) < .075) {
        slow[f]++; if (gait.getY(d.slot) > .2 && Math.abs(gait.getX(d.slot) - prev.phase) > .5) inPlace[f]++;
      }
      strides.set(key, {time, at: d.at.clone(), phase: gait.getX(d.slot)});
    }
  }
  for (const v of visits) {
    const slot = restStart + v.group * 3 + 2, pose = visitPose(time, v.group, v.length);
    resting.getMatrixAt(slot, m); p.setFromMatrixPosition(m);
    if (scale.setFromMatrixScale(m).x < .5) continue;
    seenVisits.add(`${share}/${hour}/${v.group}`);
    assert.ok(p.distanceTo(v.curve.getPointAt(pose.u)) < 1e-4, 'drawn visitor follows the published round trip');
    assert.equal(resting.geometry.getAttribute('gait').getY(slot) > 0, pose.walking, 'visitor stops their feet while chatting');
    for (const other of drawn) if (!(other.mesh === resting && other.slot === slot) && Math.abs(other.at.y - p.y) < 1)
      assert.ok(p.distanceTo(other.at) > (other.mesh === peopleFleets[3] ? .85 : .65), `visitor ${v.group} overlaps ${other.mesh.name}#${other.slot} at ${time}s`);
  }
  for(const [g,trip] of entrances.entries())for(let j=0;j<2;j++){
    const mesh=peopleFleets[1],slot=116+g*2+j,w=entrancePose(time,g,trip.length,j);mesh.getMatrixAt(slot,m);p.setFromMatrixPosition(m);
    const key=`${share}/${hour}/${g}/${j}`;
    if(scale.setFromMatrixScale(m).x<.5){previousEntrances.delete(key);continue;}
    const previous=previousEntrances.get(key);if(previous)assert.ok(p.distanceTo(previous)<.32,'drawn entrance person jumps or rushes through a curved lane');
    previousEntrances.set(key,p.clone());
    assert.equal(mesh.geometry.getAttribute('gait').getY(slot)>0,w.walking,'waiting person walks in place');
    for(const other of drawn)if(!(other.mesh===mesh&&other.slot===slot)&&Math.abs(other.at.y-p.y)<1)
      assert.ok(p.distanceTo(other.at)>(other.mesh===peopleFleets[3]?.85:.65),`entrance ${g}/${j} overlaps ${other.mesh.name}#${other.slot} at ${time}s`);
    if(Math.min(w.d,trip.length-w.d)<1.2)continue;
    ray.set(p.clone().setY(2),down);ray.far=3;const ground=ray.intersectObjects([environment,...landmarks],true)[0];
    const finish=ground&&(ground.object as Mesh).material;
    assert.ok(ground&&ground.point.y<.6&&finish&&!Array.isArray(finish)&&/^(sidewalk|plaza)$/.test(finish.name),`entrance ${g}/${j} at ${time}s leaves paving at ${p.toArray()}: ${ground?.object.name}/${!Array.isArray(finish)&&finish?.name}/${ground?.point.y}`);
    for(const height of [.4,1.2])for(let k=0;k<8;k++){
      ray.set(p.clone().setY(height),new Vector3(Math.cos(k*Math.PI/4),0,Math.sin(k*Math.PI/4)));ray.far=.4;
      assert.equal(ray.intersectObjects([environment,...landmarks],true).length,0,'entrance actor clips city');
    }
  }
}
// Only the inside of a tight forecourt corner (a body pivoting while its trip distance advances) may still read as a step.
assert.ok(slow[0] > 1000 && inPlace[0] === 0 && slow[1] > 100 && inPlace[1] < slow[1] * .02, `walking in place: ${inPlace} of ${slow} slow frames`);
assert.equal(seenVisits.size, 3 * 2 * visits.length, 'every journey is actually inhabited at low/mixed/high by day and night');
// Conversation animation does not rotate/slide the seated body or change its folded leg pose.
updatePeople(presets.neutral, 5, 0); const seat = new Matrix4(); resting.getMatrixAt(0, seat);
updatePeople(presets.neutral, 9, 0); resting.getMatrixAt(0, m); assert.deepEqual(m.elements, seat.elements);
assert.equal(resting.geometry.getAttribute('gait').getW(0), 1);
ray.far = Infinity;
console.log(`Odaiba: ${visits.length} forecourt visits and ${entrances.length} doorway meetings clear real paving, geometry and actual low/mixed/high day/night fleets; doorway people/robots keep clear, nobody walks in place (${inPlace} of ${slow}); seated bodies remain fixed.`);
