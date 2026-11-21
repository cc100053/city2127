import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Box3, Group, Mesh, InstancedMesh, Raycaster, Triangle, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ConcentrationDistrict } from '../src/districtMeters.ts';
import { changeSites, guideway, PLAZA, plazaAt, plazaWalks } from '../src/layout.ts';
import { ARCH, FOOTPRINTS, groundContacts, HULL, inMega, inRect, megastructures, RING, RING_GATE } from '../src/megastructures.ts';
import { routes } from '../src/mobility.ts';
import { occupants, strollPose } from '../src/occupants.ts';
import { plazaDeck } from '../src/plazaDeck.ts';
import odaibaLayout from '../src/odaiba-layout.json' with {type: 'json'};
import { placeOdaibaModel } from '../src/odaibaPlacement.ts';

// P1: the three megastructures exist, reach their table heights (±25%) and stand clear of the Meter sites (+14 m) and the civic core.
const group = megastructures(), box = new Box3(), parts = new Map<string, Box3>();
group.updateMatrixWorld(true);
group.traverse(o => { if (o instanceof Mesh && !(o instanceof InstancedMesh)) { o.geometry.computeBoundingBox(); parts.set(`${o.material.color.getHexString()}${parts.size}`, box.copy(o.geometry.boundingBox!).clone()); } });
const shell =[...parts.entries()].find(([k]) => k.startsWith('f3f2ec'))![1];
assert.ok(group.children.length >= 4 && group.children.length <= 12, `draw calls ${group.children.length}`);
// Heights: the hoop's top, the arch apex and the hull top all lie inside the shell batch's bounds.
const within = (v: number, want: number, what: string) => assert.ok(v >= want * .75 && v <= want * 1.25, `${what} ${v.toFixed(0)} m vs ${want} m`);
within(RING.centreY + RING.outer, 195, 'ring top'); within(ARCH.apex, 170, 'arch apex'); within(HULL.steps * HULL.step, 120, 'hull top');
assert.ok(shell.max.y >= HULL.steps * HULL.step * .9 && shell.max.y <= 200, `shell top ${shell.max.y}`);
within(RING.outer * 2, 210, 'ring diameter'); within(Math.hypot(ARCH.b[0] - ARCH.a[0], ARCH.b[1] - ARCH.a[1]), 240, 'arch span'); within(HULL.length, 190, 'hull length');
// Ground contacts (plinth, arch feet, hull footprint) keep 14 m clear of every Meter site and of the civic core base.
const contacts = groundContacts(), all = [contacts.ring, ...contacts.archFeet, contacts.hull];
for (const site of Object.values(changeSites)) {
  const hw = site.w * site.scale / 2 + 14, hd = site.d * site.scale / 2 + 14;
  for (const [i, r] of all.entries()) for (let a = -r.hu; a <= r.hu; a += 4) for (let b = -r.hv; b <= r.hv; b += 4) {
    const x = r.cx + a * r.ux - b * r.uz, z = r.cz + a * r.uz + b * r.ux;
    assert.ok(Math.abs(x - site.x) > hw || Math.abs(z - site.z) > hd, `contact ${i} covers ${site.name}`);
  }
}
for (const r of all) assert.ok(!inRect(r, -18, 23) && Math.hypot(r.cx + 18, r.cz - 23) > 60, 'contact too near the civic core');
// Nothing pierces a megastructure: no district tower or pod stands inside the shared footprint list.
const district = new ConcentrationDistrict(new Group());
for (const t of [...district.towers, ...district.pods]) assert.ok(!FOOTPRINTS.some(r => inRect(r, t.x, t.z)) && !inMega(t.x, t.z), `district structure at ${t.x},${t.z} stands inside a megastructure`);
// P4: the plaza deck's corners stand clear of the megastructures.
for (const [lx, lz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const [x, z] = plazaAt(lx * PLAZA.hu, lz * PLAZA.hv); assert.ok(!inMega(x, z, 4), `plaza corner ${x},${z} in a megastructure`); }
// Road fix 2: the plaza walks are [x, y, z] with decks up to 17 m (they once dived to −176 m), and cross the Yurikamome deck (14.2 m) from below.
// Entrance polish: only a walk's last point may come down to a forecourt (0.45 m); every other point stays a raised deck (≥ 3 m).
for (const walk of plazaWalks) for (const [i, [x, y, z]] of walk.entries()) {
  assert.ok(y >= (i === walk.length - 1 ? .4 : 3) && y <= 17, `plaza walk point ${x},${y},${z} out of deck height`);
  if (guideway.some(([gx, , gz]) => Math.hypot(gx - x, gz - z) < 8)) assert.ok(y < 10, `plaza walk point ${x},${y},${z} meets the guideway deck`);
}
// Road gate (owner 2026-11-20): wherever avenue ① (carriageway) or the guideway deck (light trails ±6.8 m) is inside the hoop's south-east foot,
// it stays within the gate's walls and under its soffit.
{
  const c = Math.cos(RING.yaw), s = Math.sin(RING.yaw), { streets, tracks } = routes();
  for (const [curve, half, h] of [[streets[0], 3.5, 0], ...tracks.map(t => [t, 6.8, 14.2 + 4] as const)] as const) {
    const L = curve.getLength();
    for (let d = 0; d <= L; d += 1) {
      const p = curve.getPointAt(d / L), dx = p.x - RING.x, dz = p.z - RING.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lz) > RING.depth / 2 || lx < 15 || lx > 90) continue;
      const right = RING_GATE.right[0] + (RING_GATE.right[1] - RING_GATE.right[0]) * (lz + RING.depth / 2) / RING.depth;
      assert.ok(lx - half > RING_GATE.left && lx + half < right && h < RING_GATE.top, `route through the ring foot at ${p.x.toFixed(1)},${p.z.toFixed(1)} misses the road gate`);
    }
  }
}

// Test the actual exported triangles in ring-local metres against the tunnel and garden walk keep-outs.
const loader = new GLTFLoader();
async function parseRingAsset(name: string) {
  const bytes = Uint8Array.from(readFileSync(new URL(`../asset/models/ring-gate-2127/${name}-2127.glb`, import.meta.url)));
  const { scene } = await loader.parseAsync(bytes.buffer, '');
  scene.updateMatrixWorld(true);
  const triangles: Triangle[] = [];
  scene.traverse(part => {
    if (!(part instanceof Mesh)) return;
    const { geometry, matrixWorld } = part, positions = geometry.getAttribute('position');
    const index = geometry.getIndex();
    const at = (i: number) => new Vector3().fromBufferAttribute(positions, index?.getX(i) ?? i).applyMatrix4(matrixWorld);
    for (let i = 0; i < (index?.count ?? positions.count); i += 3) triangles.push(new Triangle(at(i), at(i + 1), at(i + 2)));
  });
  return { scene, triangles };
}
const { scene: pilot, triangles: pilotTriangles } = await parseRingAsset('ring-gate');
const sections = await Promise.all(['ring-lower', 'ring-shoulders', 'ring-crown'].map(parseRingAsset));
const exteriorTriangles = sections.flatMap(({ triangles }) => triangles);
assert.ok(pilotTriangles.length > 0 && pilotTriangles.length < 6000, 'ring pilot contains bounded geometry');
assert.ok(sections.every(({ triangles }) => triangles.length > 0) && exteriorTriangles.length < 30000, 'all three exterior GLBs fit the geometry budget');
const body = new Group();
body.add(...sections.map(({ scene }) => scene));
body.updateMatrixWorld(true);

const bounds = new Box3().setFromObject(body);
assert.ok(Math.abs(bounds.max.y - (RING.centreY + RING.outer)) < .1, 'crown keeps the original skyline height');
assert.ok(bounds.max.z <= RING.depth / 2 && bounds.min.z >= -RING.depth / 2, 'shell stays inside its axial route envelope');
const inward = new Raycaster(new Vector3(0, RING.centreY + RING.outer - 6, RING.depth), new Vector3(0, 0, -1));
const [crownFace] = inward.intersectObject(body);
assert.ok(crownFace && crownFace.point.z < 14, 'the shell tapers in depth at the crown');
for (const degrees of [-140, -110, -80, -50, -20, 10, 40, 70, 100, 130, 160, 190]) {
  const angle = degrees * Math.PI / 180, radial = new Vector3(Math.cos(angle), Math.sin(angle), 0);
  const ray = new Raycaster(new Vector3(0, RING.centreY, 0).addScaledVector(radial, RING.outer + 4), radial.negate(), 0, 5);
  assert.ok(ray.intersectObject(body).length > 0, `outer rim visible at ${degrees}°`);
}
const { scene: transfer, triangles: transferTriangles } = await parseRingAsset('ring-transfer');
assert.ok(transferTriangles.length > sections[0].triangles.length && transferTriangles.length < 34_000);
const ringTriangles = [...pilotTriangles, ...exteriorTriangles, ...transferTriangles];
const halfDepth = RING.depth / 2;
for (let z = -halfDepth - 6; z < halfDepth + 6; z += .5) {
  const f = Math.max(0, Math.min(1, (z + halfDepth) / RING.depth));
  const right = RING_GATE.right[0] + (RING_GATE.right[1] - RING_GATE.right[0]) * f;
  const clearance = new Box3(new Vector3(RING_GATE.left + .3, .1, z), new Vector3(right - .3, RING_GATE.top - .25, z + .5));
  assert.ok(!ringTriangles.some(triangle => clearance.intersectsTriangle(triangle)), `GLB tunnel is obstructed at local depth ${z}`);
}
const landing = new Vector3(...plazaWalks[0][0]).sub(new Vector3(RING.x, 0, RING.z)).applyAxisAngle(new Vector3(0, 1, 0), -RING.yaw);
const gardenClearance = new Box3(new Vector3(landing.x - 3, 17.7, 14.3), new Vector3(landing.x + 3, 20.1, landing.z + 1.8));
assert.ok(!ringTriangles.some(triangle => gardenClearance.intersectsTriangle(triangle)), 'GLB garden entrance has a 6 m wide pedestrian opening');
const ringOrigin = new Vector3(RING.x, 0, RING.z), up = new Vector3(0, 1, 0);
const toWorld = (point: Vector3) => point.applyAxisAngle(up, RING.yaw).add(ringOrigin);
pilot.position.copy(ringOrigin);
pilot.rotation.y = RING.yaw;
body.position.copy(ringOrigin);
body.rotation.y = RING.yaw;
const installed = megastructures({ entrance: pilot, body });
installed.updateMatrixWorld(true);
const towardsGarden = new Vector3(0, 0, -1).applyAxisAngle(up, RING.yaw);
for (const x of [landing.x - 2.8, landing.x, landing.x + 2.8]) for (const y of [17.8, 19, 20.1]) {
  const ray = new Raycaster(toWorld(new Vector3(x, y, landing.z + 1)), towardsGarden, 0, landing.z + 1 - 14.3);
  assert.equal(ray.intersectObject(installed).length, 0, `installed ring blocks the garden landing at x=${x.toFixed(1)}, y=${y}`);
}
for (const z of [15, 18, 22.5, landing.z - .05]) {
  const down = new Raycaster(toWorld(new Vector3(landing.x, 20, z)), new Vector3(0, -1, 0));
  const [floor] = down.intersectObject(installed);
  const expectedHeight = z <= 22.5 ? 17.6 : 17.6 - .58 * (z - 22.5) / 3.15;
  assert.ok(floor && Math.abs(floor.point.y - expectedHeight) < .03, `garden floor joins the bridge at local depth ${z}`);
}
// Install the same lower variant and procedural ledge cuts as the live app.
const transferBody = body.clone();
transferBody.remove(transferBody.children[0]);
transferBody.add(transfer);
const candidate = megastructures({ entrance: pilot.clone(), body: transferBody, hasTransfer: true });
assert.ok(!candidate.getObjectByName('Ring_LandingRail') && installed.getObjectByName('Ring_LandingRail'), 'opening the R3 threshold leaves the R2 barrier available');
const firstWalk = occupants().walks.length;
const plaza = plazaDeck(new Group(), [], true);
candidate.add(plaza);
candidate.updateMatrixWorld(true);
const paths = occupants().walks.slice(firstWalk);
const through = paths.filter(({curve}) => curve.getPointAt(1).distanceTo(new Vector3(...plazaWalks[0].at(-1)!)) < .01);
assert.equal(through.length, 2, 'the two original ring bridge walks continue through the hall to the garden');
const hallWalk = paths.at(-1)!;
assert.ok(hallWalk.curve.getLength() > 20, 'the local concourse walk connects the canopy and the court');
const down = new Vector3(0, -1, 0), tangent = new Vector3(), side = new Vector3();
for (const [walkIndex, walk] of [...through, hallWalk].entries()) {
  const {curve, pair, length, rest} = walk;
  const check = (d: number, o: number) => {
    const p = curve.getPointAt(d / length);
    curve.getTangentAt(d / length, tangent);
    side.set(-tangent.z, 0, tangent.x).normalize();
    p.addScaledVector(side, o);
    const label = `walk ${walkIndex}/${o.toFixed(2)} at ${p.toArray().map(n => n.toFixed(2)).join(',')}`;
    const [floor] = new Raycaster(p.clone().addScaledVector(up, .27), down, 0, .54).intersectObject(candidate);
    const inNewFloor = walk === hallWalk || d < 27;
    assert.ok(floor && Math.abs(floor.point.y - p.y) <= (inNewFloor ? .06 : .16), `continuous floor beneath ${label}, got ${floor?.point.y}`);
    const head = new Raycaster(p.clone().addScaledVector(up, .13), up, 0, 2.08);
    assert.equal(head.intersectObject(candidate).length, 0, `2.2 m of head clearance above ${label}`);
  };
  for (let d = .12; d < length - .1; d += .32) for (const lane of pair ? [-pair, pair] : [0]) {
    for (const edge of [-.36, 0, .36]) check(d, lane + edge);
  }
  const stamps = Array.from({length: 600}, (_, i) => strollPose(i, walkIndex, length, rest));
  assert.ok(stamps.some(s => s.d < 3 && s.resting < 0) && stamps.some(s => s.d > length - 4 && s.resting < 0), 'existing gait visits both ends of the route');
  assert.ok(stamps.every((s, i) => !i || Math.abs(s.d - stamps[i - 1].d) <= 1.101), 'resident does not teleport at a joint or turn');
}
// Compare the actual sloped court edge to the retained DECKS facade along the full width.
const decksPlacement = odaibaLayout.buildings.find(b => b.id === 'decks-tokyo-beach');
assert.ok(decksPlacement);
const decksBytes = Uint8Array.from(readFileSync(new URL('../asset/models/decks-tokyo-beach/decks-tokyo-beach.glb', import.meta.url)));
const {scene: decks} = await loader.parseAsync(decksBytes.buffer, '');
placeOdaibaModel(decks, decksPlacement);
const courtFloor = transfer.getObjectByName('Concourse_floor');
assert.ok(courtFloor);
for (let x = -7.9; x <= 14.8; x += .32) {
  const [floorEdge] = new Raycaster(toWorld(new Vector3(x, 17.4, -13)), towardsGarden.clone().negate(), 0, 13).intersectObject(courtFloor);
  const [facade] = new Raycaster(toWorld(new Vector3(x, 17.4, 1)), towardsGarden, 0, 35).intersectObject(decks);
  assert.ok(floorEdge && facade && floorEdge.distance + facade.distance >= 14.18, `court floor keeps 18 cm clear of DECKS at local x=${x.toFixed(2)}`);
}
// Use the exported crown and shrub vertices at their full heights, including the cut-back bed.
let minCanopyGap = Infinity;
for (const name of ['Concourse_kit_leaf_a', 'Concourse_kit_leaf_b']) {
  const foliage = transfer.getObjectByName(name);
  assert.ok(foliage instanceof Mesh);
  const verts = foliage.geometry.getAttribute('position');
  for (let i = 0; i < verts.count; i++) {
    const point = transfer.worldToLocal(foliage.localToWorld(new Vector3().fromBufferAttribute(verts, i)));
    assert.ok(Math.abs(point.x - landing.x) >= 2.7, 'foliage leaves the 5.4 m sign and walking corridor clear');
    if (point.z > 4.3) continue;
    const [facade] = new Raycaster(toWorld(new Vector3(point.x, point.y, 1)), towardsGarden, 0, 35).intersectObject(decks);
    if (facade) minCanopyGap = Math.min(minCanopyGap, facade.distance - (1 - point.z));
  }
}
assert.ok(Number.isFinite(minCanopyGap) && minCanopyGap >= .18, `planting setback from DECKS: ${minCanopyGap.toFixed(3)} m`);
console.log(`megastructures ok (planting setback from DECKS: ${minCanopyGap.toFixed(3)} m along the ring axis)`);
