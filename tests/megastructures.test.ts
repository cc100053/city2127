import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Box3, BufferGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, MeshStandardMaterial, InstancedMesh, LinearMipmapLinearFilter, Raycaster, Triangle, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshBVH } from 'three-mesh-bvh';
import { ConcentrationDistrict } from '../src/districtMeters.ts';
import { changeSites, guideway, PLAZA, plazaAt, plazaWalks } from '../src/layout.ts';
import { HERO_SETTLED_POSITION } from '../src/heroCamera.ts';
import { hullFront, hullTiers } from '../src/hullFacade.ts';
import { HULL_BOW_GALLERY_END, HULL_BOW_PORTAL } from '../src/hullPortal.ts';
import { ARCH, FOOTPRINTS, groundContacts, HULL, inMega, inRect, megastructures, RING, RING_GATE, updateMegastructures } from '../src/megastructures.ts';
import { routes, TRAIN_SPEED, trainPose } from '../src/mobility.ts';
import { occupants, strollPose } from '../src/occupants.ts';
import { plazaDeck } from '../src/plazaDeck.ts';
import odaibaLayout from '../src/odaiba-layout.json' with {type: 'json'};
import { placeOdaibaModel } from '../src/odaibaPlacement.ts';

const loader = new GLTFLoader();
const bowBytes = Uint8Array.from(readFileSync(new URL('../asset/models/hull-bow-2127/hull-bow-2127.glb', import.meta.url)));
const { scene: bow } = await loader.parseAsync(bowBytes.buffer, '');
const bowRoles: string[] = [];
bow.traverse(part => {
  if (part instanceof Mesh && !Array.isArray(part.material)) bowRoles.push(part.material.name);
});
assert.deepEqual(bowRoles.sort(), ['bow_recess', 'bow_silver', 'bow_silver', 'bow_silver']);
for (const name of ['Bow_Bearing_Seaward', 'Bow_Bearing_Inland']) {
  const bearing = bow.getObjectByName(name);
  assert.ok(bearing instanceof Mesh, `the editable GLB includes ${name}`);
}

// P1: the three megastructures exist, reach their table heights (±25%) and stand clear of the Meter sites (+14 m) and the civic core.
const group = megastructures(undefined, bow), box = new Box3(), parts = new Map<string, Box3>();
group.updateMatrixWorld(true);
group.traverse(o => { if (o instanceof Mesh && !(o instanceof InstancedMesh)) { o.geometry.computeBoundingBox(); parts.set(`${o.material.color.getHexString()}${parts.size}`, box.copy(o.geometry.boundingBox!).clone()); } });
const shell =[...parts.entries()].find(([k]) => k.startsWith('f3f2ec'))![1];
const structureBatches = group.children.filter(part => part instanceof Mesh && !(part instanceof InstancedMesh));
const facadeNames = ['hull-bow-metal', 'hull-frame-metal', 'hull-glass', 'hull-panel-metal', 'hull-room-cove'];
const facadeBatches = structureBatches.filter(part => part.material instanceof MeshStandardMaterial
  && facadeNames.includes(part.material.name));
assert.deepEqual(facadeBatches.map(part => part.material.name).sort(), facadeNames);
const silver = facadeBatches.find(part => part.material.name === 'hull-frame-metal');
const bowSilver = facadeBatches.find(part => part.material.name === 'hull-bow-metal');
const panel = facadeBatches.find(part => part.material.name === 'hull-panel-metal');
assert.ok(silver && bowSilver && panel);
assert.ok(bowSilver.material.roughness > silver.material.roughness);
assert.equal(bowSilver.material.roughnessMap, silver.material.roughnessMap);
for (const { geometry, material } of [silver, bowSilver, panel]) {
  const uv = geometry.getAttribute('uv'), positions = geometry.getAttribute('position');
  assert.equal(uv.count, positions.count, 'merged metal batch retains UVs for every vertex');
  for (let i = 0; i < uv.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(positions, i);
    const b = new Vector3().fromBufferAttribute(positions, i + 1);
    const c = new Vector3().fromBufferAttribute(positions, i + 2);
    if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-8) continue;
    const area = (uv.getX(i + 1) - uv.getX(i)) * (uv.getY(i + 2) - uv.getY(i))
      - (uv.getY(i + 1) - uv.getY(i)) * (uv.getX(i + 2) - uv.getX(i));
    assert.ok(Math.abs(area) > 1e-6, 'visible metal triangles have a usable bump-map basis');
  }
  assert.ok(material.roughnessMap && material.roughnessMap === material.bumpMap);
  assert.ok(material.roughnessMap.generateMipmaps, 'grain is mipmapped for the city camera');
  assert.equal(material.roughnessMap.minFilter, LinearMipmapLinearFilter);
}
const sharedBatchCount = structureBatches.length - facadeBatches.length;
assert.ok(sharedBatchCount >= 4 && sharedBatchCount <= 12, `shared structure draws ${sharedBatchCount}`);
// Heights: the hoop's top, the arch apex and the hull top all lie inside the shell batch's bounds.
const within = (v: number, want: number, what: string) => assert.ok(v >= want * .75 && v <= want * 1.25, `${what} ${v.toFixed(0)} m vs ${want} m`);
within(RING.centreY + RING.outer, 195, 'ring top'); within(ARCH.apex, 170, 'arch apex'); within(hullTiers.at(-1)!.deck, 120, 'hull top');
assert.ok(shell.max.y >= hullTiers.at(-1)!.deck * .9 && shell.max.y <= 200, `shell top ${shell.max.y}`);
within(RING.outer * 2, 210, 'ring diameter'); within(Math.hypot(ARCH.b[0] - ARCH.a[0], ARCH.b[1] - ARCH.a[1]), 240, 'arch span'); within(HULL.length, 190, 'hull length');
// The three openings have continuous paved floors and retain planted terraces beside them.
{
  const axis = new Vector3(0, 1, 0), origin = new Vector3(HULL.x, 0, HULL.z);
  const floorHit = (tier: number, u: number, inset: number) => {
    const depth = hullFront(tier, u) + inset;
    const start = new Vector3(u, hullTiers[tier].deck + 3, depth).applyAxisAngle(axis, HULL.yaw).add(origin);
    return new Raycaster(start, new Vector3(0, -1, 0), 0, 3.1).intersectObject(group)[0];
  };
  for (const [tier, deck, start, end] of [[0, 15, 35, 71], [3, 60, -39, 9], [6, 105, 31, 67]]) {
    assert.equal(hullTiers[tier].deck, deck);
    for (let u = start + 2; u <= end - 2; u += 2) for (const inset of [3.6, 4.9, tier === 6 ? 2.4 : 6.6]) {
      const hit = floorHit(tier, u, inset);
      assert.ok(hit && Math.abs(hit.point.y - deck - .18) < .01, `terrace ${tier}: paving clear at ${u}, ${inset}`);
    }
    for (const u of [start - 4, end + 4]) {
      const hit = floorHit(tier, u, 3.6);
      assert.ok(hit && hit.point.y >= deck + .59, `terrace ${tier}: planting beside the opening at ${u}`);
    }
  }
}
// Every tier has real, inset glass and interior room faces behind it.
{
  const axis = new Vector3(0, 1, 0);
  const origin = new Vector3(HULL.x, 0, HULL.z);
  const inward = new Vector3(0, 0, 1).applyAxisAngle(axis, HULL.yaw);
  const halfLength = HULL.length / 2;
  const glass = facadeBatches.find(part => part.material.name === 'hull-glass');
  assert.ok(glass && glass.material.transparent && !glass.castShadow);
  for (const [tier, { from, to, base, deck }] of hullTiers.entries()) {
    let insetPanes = 0;
    for (const width of [.12, .24, .36, .48, .6, .72, .84]) {
      const u = from + (to - from) * width;
      const d = hullFront(tier, u);
      for (const fraction of [.23, .43, .63, .83]) {
        const p = new Vector3(u, base + (deck - base) * fraction, d - 4).applyAxisAngle(axis, HULL.yaw).add(origin);
        const hits = new Raycaster(p, inward, 0, tier === 0 ? 23 : 14).intersectObjects(structureBatches, false);
        if (hits[0]?.object !== glass) continue;
        const paneDepth = tier === 0 && width > .65 ? 3.45 : 1.42;
        assert.ok(Math.abs(hits[0].distance - 4 - paneDepth) < .04, `tier ${tier}: glass is inset`);
        assert.ok(hits.some(hit => hit.object !== glass && hit.distance > hits[0].distance + .1),
          `tier ${tier}: window has an interior surface behind the pane`);
        insetPanes++;
      }
    }
    assert.ok(insetPanes >= 4, `tier ${tier}: only ${insetPanes} pane samples visible`);
  }
  for (const u of [51.4, 53, 54.6]) {
    const d = -8 * (1 - (u / halfLength) ** 2);
    for (const y of [1.35, 2.6, 4]) {
      const p = new Vector3(u, y, d - 4).applyAxisAngle(axis, HULL.yaw).add(origin);
      assert.equal(new Raycaster(p, inward, 0, 12).intersectObjects(structureBatches, false).length, 0,
        `plaza door clear at ${u}, ${y}`);
    }
  }

  const cove = facadeBatches.find(part => part.material.name === 'hull-room-cove');
  assert.ok(cove);
  const localPoint = (u: number, y: number, depth: number) =>
    new Vector3(u, y, depth).applyAxisAngle(axis, HULL.yaw).add(origin);
  const front = hullFront;
  // At the entrance centre the full-height pane and warm back wall are separated by over thirteen metres.
  const [pane, rear] = new Raycaster(localPoint(53, 8, front(0, 53) - 4), inward, 0, 24).intersectObjects(structureBatches, false);
  assert.ok(pane?.object === glass && rear?.object === cove && rear.distance - pane.distance > 13.6, 'lobby opens behind its glazing');
  for (const u of [43, 64]) {
    const [mezzanine] = new Raycaster(localPoint(u, 2, front(0, u) + 12), axis, 0, 8).intersectObjects(structureBatches, false);
    assert.ok(mezzanine && Math.abs(mezzanine.point.y - 5.115) < .02, `mezzanine wing at ${u}`);
  }
  const [ceiling] = new Raycaster(localPoint(53, 2, front(0, 53) + 12), axis, 0, 13).intersectObjects(structureBatches, false);
  assert.ok(ceiling?.object === cove && ceiling.point.y > 11, 'warm ceiling above full-height entry');
  for (const depth of [5.5, 15]) {
    const [reveal] = new Raycaster(localPoint(53, 2, front(0, 53) + depth), axis, 0, 13)
      .intersectObjects(structureBatches, false);
    assert.ok(reveal && reveal.object !== cove && reveal.point.y > ceiling.point.y + .25,
      `ceiling reveal stands above the warm panel at ${depth} m`);
  }
  const [header] = new Raycaster(localPoint(53, 4.42, front(0, 53) - 4), inward, 0, 8)
    .intersectObjects(structureBatches, false);
  assert.ok(header && header.object !== glass && Math.abs(header.distance - 7.18) < .04, 'entrance transom sits in front of the pane');
  for (const u of [44.5, 61.5]) {
    const [column] = new Raycaster(localPoint(u, 2.25, front(0, u) + 5), inward, 0, 5).intersectObjects(structureBatches, false);
    assert.ok(column && Math.abs(column.distance - 2.23) < .25, `column behind the pane at ${u}`);
  }
  const [outerPanel] = new Raycaster(localPoint(-1, 37, front(2, -1) - 4), inward, 0, 6)
    .intersectObjects(structureBatches, false);
  assert.equal(outerPanel?.object, panel, 'the dark fascia uses its own metal batch');
  // The middle deck remains open from the walking surface to the water above the existing guardrail.
  for (let u = -37; u <= 7; u++) {
    if (u === -35 || u === -15) continue; // Existing canopy posts.
    for (const y of [61.55, 62.5, 63.3]) {
      const sights = new Raycaster(localPoint(u, y, front(3, u) + 6.2), inward.clone().negate(), 0, 8);
      assert.equal(sights.intersectObjects(structureBatches, false).length, 0, `middle terrace sightline at ${u}, ${y}`);
    }
  }
  // Each cross-tier fold covers the slab nose and meets the upper frame without raising the public deck.
  for (const [tier, head, foot] of [[2, -59.4, -59.12], [2, -2.7, -2.64], [3, 14.32, 14.376], [5, -.074, .368], [6, 24.368, 24.65]]) {
    const { deck } = hullTiers[tier];
    const setback = front(tier + 1, foot) - front(tier, foot);
    for (const [u, rise, depth] of [[head, -.25, -1.8], [foot + .4, 1.35, setback - 1.12]]) {
      const [fold] = new Raycaster(localPoint(u, deck + rise, front(tier, u) + depth - 1.1), inward, 0, 2)
        .intersectObjects(structureBatches, false);
      assert.ok(fold?.object === silver && Math.abs(fold.distance - 1.1) < .22,
        `silver fold at tier ${tier}, ${u}, ${rise}: distance ${fold?.distance}`);
    }
    const [deckFold] = new Raycaster(localPoint(head + .49, deck + 1.4, front(tier, head + .49) + .9),
      axis.clone().negate(), 0, 1).intersectObjects(structureBatches, false);
    assert.ok(deckFold?.object === silver && deckFold.point.y > deck + .8 && deckFold.point.y < deck + 1.1,
      `silver turns above the existing kerb at tier ${tier}, ${head}`);
  }
  // Measure the built roof slab at both shoulders and across the broad middle.
  for (const [u, height] of [[11, 130.75], [32, 134], [55, 134], [80, 130.15]]) {
    const [roof] = new Raycaster(localPoint(u, 135.25, front(7, u) + 2), axis.clone().negate(), 0, 6)
      .intersectObjects(structureBatches, false);
    assert.ok(roof && Math.abs(roof.point.y - height) < .2, `rounded crest slab at ${u}: ${roof?.point.y}`);
  }
  // Both ends of the 105 m deck remain clear above head height beside the crown's extended frame.
  for (const u of [32, 40, 48, 56, 64, 66]) for (const inset of [2.4, 4.9]) {
    const head = new Raycaster(localPoint(u, 105.19, front(6, u) + inset), axis, 0, 2.2);
    assert.equal(head.intersectObjects(structureBatches, false).length, 0, `lookout headroom at ${u}, ${inset}`);
  }
  const positions = cove.geometry.getAttribute('position'), uv = cove.geometry.getAttribute('uv');
  const lightRoles = new Set<number>();
  let canopyVertices = 0;
  for (let i = 0; i < uv.count; i++) {
    lightRoles.add(uv.getX(i));
    if (uv.getX(i) === 2 && Math.abs(positions.getY(i) - 63.96) < .01) canopyVertices++;
  }
  assert.deepEqual([...lightRoles].sort(), [0, 1, 2, 3, 4], 'ordinary rooms, focused rooms, warm soffits, lobby bounce and lobby back wall share one batch');
  assert.equal(canopyVertices, 18, 'all three shade panels have warm soffits');
}
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

// The seaward cut opens the side view while keeping the axial clearance and recess.
{
  const { face, recess, centre, width, bottom, top } = HULL_BOW_PORTAL;
  assert.deepEqual([face, recess, centre, width, bottom, top], [92.6, 83.5, 12.75, 18, 9, 23]);
  const up = new Vector3(0, 1, 0), origin = new Vector3(HULL.x, 0, HULL.z);
  const toLocal = new Matrix4().makeRotationY(-HULL.yaw).multiply(new Matrix4().makeTranslation(-HULL.x, 0, -HULL.z));
  const southEdge = centre - width / 2, northEdge = centre + width / 2;
  const envelope = new Box3(new Vector3(recess + .025, bottom + .025, southEdge + .025),
    new Vector3(face + 5, top - .025, northEdge - .025));
  assert.ok(Math.abs(face - recess - 9.1) < 1e-9);
  const triangle = new Triangle(), instance = new Matrix4();
  function assertClear(boxes: Box3[], label: string) {
    const bounds = boxes.reduce((region, box) => region.union(box), new Box3());
    group.traverse(part => {
      if (!(part instanceof Mesh)) return;
      const { geometry } = part, position = geometry.getAttribute('position'), index = geometry.getIndex();
      geometry.computeBoundingBox();
      assert.ok(geometry.boundingBox);
      for (let i = 0; i < (part instanceof InstancedMesh ? part.count : 1); i++) {
        if (part instanceof InstancedMesh) part.getMatrixAt(i, instance);
        else instance.identity();
        instance.premultiply(part.matrixWorld).premultiply(toLocal);
        if (!geometry.boundingBox.clone().applyMatrix4(instance).intersectsBox(bounds)) continue;
        for (let j = 0; j < (index?.count ?? position.count); j += 3) {
          [triangle.a, triangle.b, triangle.c].forEach((p, k) =>
            p.fromBufferAttribute(position, index?.getX(j + k) ?? j + k).applyMatrix4(instance));
          for (const box of boxes) {
            if (!box.intersectsTriangle(triangle)) continue;
            assert.fail(`${label} at ${box.min.x.toFixed(2)} m intersects ${part.name}`);
          }
        }
      }
    });
  }
  assertClear([envelope], 'The 18 × 14 m bow envelope');
  const ray = new Raycaster(new Vector3(face + 4, 19, centre).applyAxisAngle(up, HULL.yaw).add(origin),
    new Vector3(-1, 0, 0).applyAxisAngle(up, HULL.yaw));
  const portalLiner = structureBatches.find(part => part.material.name === 'hull-portal-liner');
  const portalCove = structureBatches.find(part => part.material.name === 'hull-portal-cove');
  assert.ok(portalLiner && portalCove);
  assert.ok(!structureBatches.some(part => part.material.name === 'hull-portal-baffle'));
  assert.ok(ray.intersectObjects(structureBatches, false).every(hit => hit.distance > face + 4 - recess + 5),
    'the 9.1 m throat is open to the continuation');
  const guides = structureBatches.filter(part => part.material instanceof MeshStandardMaterial &&
    part.material.name === 'hull-portal-guide');
  assert.equal(guides.length, 1, 'the recessed guide runs in one batch');
  ray.ray.origin.set(face + 4, 16, northEdge + .25).applyAxisAngle(up, HULL.yaw).add(origin);
  assert.ok(ray.intersectObjects(structureBatches, false)[0]?.object === guides[0], 'the inland jamb keeps its guide');

  const hero = new Vector3(...HERO_SETTLED_POSITION);
  const fromHero = (u: number, y: number, d: number) => {
    const point = new Vector3(u, y, d).applyAxisAngle(up, HULL.yaw).add(origin);
    return new Raycaster(hero, point.sub(hero).normalize()).intersectObjects(structureBatches, false)[0];
  };
  const darkReturn = structureBatches.find(part => part.material.color.getHexString() === '141b20');
  assert.ok(darkReturn);
  for (const y of [10.7, 14, 17.5, 19.6]) {
    for (const u of [84.5, 87]) {
      const hit = fromHero(u, y, northEdge);
      assert.ok(hit?.object === portalLiner, 'Hero looks through the cut across the rail cavity to the inland liner');
      assert.ok(Math.abs(hit.point.clone().applyMatrix4(toLocal).z - northEdge) < .35);
    }
    const deep = fromHero(82.4, y, northEdge);
    assert.ok(deep?.object === portalLiner, 'Hero sees the deeper liner through the seaward cut');
    assert.ok(deep.point.clone().applyMatrix4(toLocal).x < recess);
  }
  assert.ok(fromHero(80.04, 17, hullFront(1, 80) - .88)?.object === guides[0],
    'the light on the new seaward rim is visible from Hero');
  for (const [y, outer, groove, inner] of [[13, 77.8, 79.2, 79.8], [19, 77.4, 78.9, 79.55], [22, 77.8, 79.6, 80.4]]) {
    const depth = hullFront(y < 15 ? 0 : 1, 80) - 2;
    const a = fromHero(outer, y, depth), seam = fromHero(groove, y, depth), b = fromHero(inner, y, depth);
    assert.ok(a?.object === bowSilver && seam?.object === darkReturn && b?.object === bowSilver,
      `Hero sees both silver rims and the shadow seam at ${y} m`);
    const seamDepth = seam.point.clone().applyMatrix4(toLocal).z;
    assert.ok(seamDepth - a.point.clone().applyMatrix4(toLocal).z > .65, 'the softened outer bevel still shadows the gasket');
    assert.ok(seamDepth - b.point.clone().applyMatrix4(toLocal).z > .16, 'the inner lip stays in front of the gasket');
  }
  for (const [depth, y] of [[8, 26.7], [11, 26.7], [14, 26.7], [17, 26], [20, 25.5], [23, 24.5], [25, 23.8]]) {
    ray.ray.origin.set(face + 4, y, depth).applyAxisAngle(up, HULL.yaw).add(origin);
    const hit = ray.intersectObjects(structureBatches, false)[0];
    assert.ok(hit?.object === bowSilver && hit.point.clone().applyMatrix4(toLocal).x > face - .75,
      `the arched crown remains visible as it turns down the inland jamb at ${depth} m`);
  }
  const oblique = new Vector3(-126.6, 29, -30.1);
  for (const depth of [8.5, 9.1, 9.7, 10.4, 11]) {
    const target = new Vector3(face + .6, 28.15, depth).applyAxisAngle(up, HULL.yaw).add(origin);
    const [hit] = new Raycaster(oblique, target.sub(oblique).normalize()).intersectObjects(structureBatches, false);
    assert.ok(hit?.object === bowSilver, `the bulkhead corner stays behind the crown at ${depth} m`);
  }
  const ribbonPaths = [
    [[73, 2.7], [75, 2.95], [77, 3.4], [79, 4.2], [81, 5.25], [83, 6.2], [85, 7.1]],
    [[72, 26.3], [74, 26.1], [76, 26.15], [78, 26.4], [80, 26.2], [82, 25.4], [84, 24.1]],
  ];
  const inwards = new Vector3(0, 0, 1).applyAxisAngle(up, HULL.yaw);
  for (const [tier, path] of ribbonPaths.entries()) for (const [u, y] of path) {
    const from = new Vector3(u, y, hullFront(tier, u) - 8).applyAxisAngle(up, HULL.yaw).add(origin);
    const [hit] = new Raycaster(from, inwards, 0, 8).intersectObjects(structureBatches, false);
    assert.ok((hit?.object === silver || hit?.object === bowSilver), `tier ${tier}: silver ribbon reaches the portal at ${u}, ${y}`);
  }
  const ribbonOrigin = new Vector3(77, 3.4, hullFront(0, 77) - 8).applyAxisAngle(up, HULL.yaw).add(origin);
  const [ribbon] = new Raycaster(ribbonOrigin, inwards, 0, 8).intersectObjects(structureBatches, false);
  assert.ok(ribbon?.object === bowSilver && ribbon.point.clone().applyMatrix4(toLocal).z < -3.30,
    'the Blender return exposes a rolled surface in front of the original lobby sill');
  for (const depth of [-.7, 0, 1, 3, 5]) {
    ray.ray.origin.set(face + 4, 7, depth).applyAxisAngle(up, HULL.yaw).add(origin);
    const hit = ray.intersectObjects(structureBatches, false)[0];
    assert.ok(hit?.object === bowSilver && hit.point.clone().applyMatrix4(toLocal).x > face + .5,
      `the rolled sill covers the bow's corner stiffener at ${depth} m`);
  }
  // The supports start inside the lower bulkhead and meet both surveyed track beds.
  const environmentBytes = Uint8Array.from(readFileSync(new URL(
    '../asset/models/odaiba-masterplan/odaiba_district_v01_environment.glb', import.meta.url)));
  const { scene: environment } = await loader.parseAsync(environmentBytes.buffer, '');
  environment.updateMatrixWorld(true);
  const guidewayMesh = environment.getObjectByName('YURIKAMOME_GUIDEWAY');
  assert.ok(guidewayMesh instanceof Mesh);
  const hullPoint = (u: number, y: number, d: number) => new Vector3(u, y, d).applyAxisAngle(up, HULL.yaw).add(origin);
  // The oblique view reaches three surfaces at increasing axial depths.
  const insideFromOblique = (u: number, y: number, d: number) =>
    new Raycaster(oblique, hullPoint(u, y, d).sub(oblique).normalize()).intersectObjects(structureBatches, false)[0];
  for (const [u, y, d, near, far] of [
    [83.50, 20.31, 4.05, recess - .8, recess],
    [83.50, 17.39, 11.23, 73.9, 75.0],
    [83.50, 20.34, 13.00, HULL_BOW_GALLERY_END, 64],
  ]) {
    const hit = insideFromOblique(u, y, d);
    assert.ok(hit?.object === portalLiner, 'the angled side, deep web and gallery return block light from behind');
    const depth = hit.point.clone().applyMatrix4(toLocal).x;
    assert.ok(depth > near && depth < far, `unexpected liner depth ${depth.toFixed(2)} m`);
  }
  for (const across of [9.75, 18.05]) {
    const [cove] = new Raycaster(hullPoint(89.75, 22.7, across), up).intersectObject(portalCove);
    assert.ok(cove && cove.point.y > top, 'both recessed guides run above the rail envelope');
  }
  for (const [rootDepth, bearingDepth] of [[9.4, 7.8], [16, 13.9]]) {
    const [heel] = new Raycaster(hullPoint(92.2, 10, rootDepth), up.clone().negate(), 0, 4)
      .intersectObject(bowSilver);
    assert.ok(heel && heel.point.y < bottom, 'the shoe extends into the bulkhead below the aperture');
    const down = new Raycaster(hullPoint(101.9, 14.3, bearingDepth), up.clone().negate(), 0, .3);
    const [trackBed] = down.intersectObject(guidewayMesh);
    const [seat] = down.intersectObject(bowSilver);
    assert.ok(trackBed && seat && trackBed.point.y - seat.point.y > 0 && trackBed.point.y - seat.point.y < .03,
      'the bearing seats immediately beneath the original guideway bed');
  }

  updateMegastructures(0);
  const dayGuide = guides[0].material.emissiveIntensity;
  const dayLiner = portalLiner.material.emissiveIntensity;
  const dayCove = portalCove.material.emissiveIntensity;
  updateMegastructures(1);
  assert.ok(guides[0].material.emissiveIntensity > dayGuide && guides[0].material.emissiveIntensity < 1);
  assert.ok(portalLiner.material.emissiveIntensity > dayLiner && portalLiner.material.emissiveIntensity < .4);
  assert.ok(portalCove.material.emissiveIntensity > dayCove);
  updateMegastructures(0);

  // Sample the live train placement against the aperture with all three production car variants.
  const bytes = Uint8Array.from(readFileSync(new URL('../asset/models/train-2127/train-2127.glb', import.meta.url)));
  const { scene: fleet } = await loader.parseAsync(bytes.buffer, '');
  fleet.updateMatrixWorld(true);
  const vertices: Vector3[] = [];
  for (const name of ['train_lead', 'train_mid', 'train_tail']) {
    const car = fleet.getObjectByName(name);
    assert.ok(car);
    const inverse = car.matrixWorld.clone().invert();
    car.traverse(part => {
      if (!(part instanceof Mesh)) return;
      const local = inverse.clone().multiply(part.matrixWorld);
      const position = part.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        vertices.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(local));
      }
    });
  }

  const bearingTop = Math.max(...['Bow_Bearing_Seaward', 'Bow_Bearing_Inland'].map(name =>
    new Box3().setFromObject(bow.getObjectByName(name)!).max.y));
  const lowestCarVertex = vertices.reduce((low, point) => Math.min(low, point.y), Infinity);
  assert.ok(guideway[0][1] + lowestCarVertex > bearingTop,
    'even the lowest vertex of the three production train cars clears both bearing seats');
  const rolled = new Vector3();
  const minGaps: number[] = [], mouthGaps: number[] = [];
  const innerStep = .25, innerClearance = .32;
  for (const track of routes().tracks) {
    const length = track.getLength();
    let gap = Infinity, mouthGap = Infinity;
    const swept = Array.from({ length: Math.ceil((recess - HULL_BOW_GALLERY_END) / innerStep) }, () => new Box3());
    for (let time = 0; time < length / TRAIN_SPEED; time += .02) {
      const { u, visible } = trainPose(time, 0, 2, 0, length);
      const p = track.getPointAt(u).applyMatrix4(toLocal);
      if (visible < 1 || p.x < HULL_BOW_GALLERY_END - 10 || p.x > envelope.max.x + 10) continue;
      const heading = track.getTangentAt(u).applyAxisAngle(up, -HULL.yaw);
      for (const v of vertices) {
        rolled.set(p.x + v.x * heading.z + v.z * heading.x, p.y + v.y, p.z - v.x * heading.x + v.z * heading.z);
        const slice = swept[Math.floor((rolled.x - HULL_BOW_GALLERY_END) / innerStep)];
        slice?.expandByPoint(rolled);
        if (rolled.x < envelope.min.x || rolled.x > envelope.max.x) continue;
        const clearance = Math.min(rolled.y - bottom, top - rolled.y, rolled.z - southEdge, northEdge - rolled.z);
        gap = Math.min(gap, clearance);
        if (rolled.x <= face + 1.05) mouthGap = Math.min(mouthGap, clearance);
      }
    }
    assert.ok(Number.isFinite(gap) && gap > 1.5, `each train clears the real bow recess on its track, got ${gap.toFixed(2)} m`);
    assert.ok(Number.isFinite(mouthGap) && mouthGap > 1.5, 'each train crosses the original R7 mouth');
    assert.ok(swept.every(box => !box.isEmpty()));
    // Quarter-metre bins enclose the swept GLB of all three cars. Expand in
    // rise and across-track only, so the test stays within the tunnel ends.
    for (const box of swept) {
      box.min.y -= innerClearance; box.max.y += innerClearance;
      box.min.z -= innerClearance; box.max.z += innerClearance;
    }
    assertClear(swept, 'The swept production train envelope with added clearance');
    minGaps.push(gap);
    mouthGaps.push(mouthGap);
  }
  assert.deepEqual(minGaps.map(gap => gap.toFixed(2)), ['1.84', '3.12']);
  assert.deepEqual(mouthGaps.map(gap => gap.toFixed(2)), ['1.84', '3.75']);
  console.log(`hull bow portal ok (approach clearance: ${minGaps.map(gap => gap.toFixed(2)).join(' / ')} m; `
    + `R7 mouth clearance: ${mouthGaps.map(gap => gap.toFixed(2)).join(' / ')} m; `
    + `new galleries: ≥ ${innerClearance.toFixed(2)} m on both tracks)`);
}
// The enlarged upper tiers stay at least 1.5 m off the actual Grand Nikko GLB, including its outlying roof edges.
{
  const id = 'grand-nikko-tokyo-daiba';
  const placement = odaibaLayout.buildings.find(entry => entry.id === id);
  assert.ok(placement);
  const bytes = Uint8Array.from(readFileSync(new URL(`../asset/models/${id}/${id}.glb`, import.meta.url)));
  const { scene: hotel } = await loader.parseAsync(bytes.buffer, '');
  placeOdaibaModel(hotel, placement);
  hotel.updateMatrixWorld(true);
  const worldToHull = new Matrix4().makeRotationY(-HULL.yaw).multiply(new Matrix4().makeTranslation(-HULL.x, 0, -HULL.z));
  const vertices: number[] = [];
  const triangle = [new Vector3(), new Vector3(), new Vector3()];
  for (const batch of structureBatches) {
    const positions = batch.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i += 3) {
      triangle.forEach((point, j) => point.fromBufferAttribute(positions, i + j).applyMatrix4(worldToHull));
      if (triangle.every(point => point.y <= 30.0001)
        || triangle.some(point => Math.abs(point.x) > 96 || point.z < -15 || point.z > 94)) continue;
      for (const point of triangle) vertices.push(point.x, point.y, point.z);
    }
  }
  assert.ok(vertices.length > 0, 'upper hull surfaces were sampled');
  const upperHull = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices, 3));
  const tree = new MeshBVH(upperHull);
  hotel.traverse(part => {
    if (!(part instanceof Mesh)) return;
    const clearance = tree.closestPointToGeometry(part.geometry, worldToHull.clone().multiply(part.matrixWorld), {}, {}, 0, 1.5);
    assert.ok(!clearance || clearance.distance >= 1.5, `upper hull clears Grand Nikko at ${part.name}`);
  });
  upperHull.dispose();
}

// Test the actual exported triangles in ring-local metres against the tunnel and garden walk keep-outs.
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
for (const variant of [group, megastructures({ entrance: new Group() }), installed, candidate]) {
  const plants = variant.getObjectByName('slope-plants');
  const soil = variant.children.find(part => part instanceof Mesh &&
    part.material instanceof MeshStandardMaterial && part.material.color.getHexString() === '6f9a5c');
  assert.ok(plants && soil);
  variant.updateMatrixWorld(true);
  const foliage = plants.children.filter(part => part instanceof InstancedMesh);
  assert.deepEqual(foliage.map(part => part.name), ['fern', 'spear', 'rosette', 'vine']);
  assert.equal(plants.children.length, 5, 'plant forms and stem lights are batched');
  const roots = new Map<number, Set<number>>();
  const instance = new Matrix4();
  const worldToRing = new Matrix4().makeRotationY(-RING.yaw)
    .multiply(new Matrix4().makeTranslation(-RING.x, 0, -RING.z));
  const plantBounds = new Box3();
  let triangles = 0;
  for (const part of foliage) {
    triangles += part.count * part.geometry.attributes.position.count / 3;
    part.geometry.computeBoundingBox();
    const footprint = part.geometry.boundingBox;
    assert.ok(footprint);
    for (let i = 0; i < part.count; i++) {
      part.getMatrixAt(i, instance);
      plantBounds.copy(footprint).applyMatrix4(instance.clone().premultiply(worldToRing));
      assert.ok(plantBounds.max.x < RING_GATE.left || plantBounds.min.y > RING_GATE.top,
        `${part.name} stays outside the road and Yurikamome gate envelope`);
      const base = new Vector3().setFromMatrixPosition(instance);
      const local = base.clone().sub(ringOrigin).applyAxisAngle(up, -RING.yaw);
      const ledge = Math.round((local.z - 1.38) * 4) / 4;
      const flanks = roots.get(ledge) ?? new Set<number>();
      flanks.add(Math.sign(local.x));
      roots.set(ledge, flanks);
      const out = new Vector3(local.x, local.y - RING.centreY, 0).normalize().applyAxisAngle(up, RING.yaw);
      const [ground] = new Raycaster(base.clone().addScaledVector(out, -3.2), out, 0, 3.2).intersectObject(soil);
      assert.ok(ground, `${part.name} at ${local.x.toFixed(2)}, ${local.z.toFixed(2)} roots into its ledge`);
    }
  }
  assert.equal(roots.size, 4);
  assert.ok([...roots.values()].every(flanks => flanks.size === 2), 'vegetation follows both flanks of every ledge');
  assert.ok(triangles < 100_000, `ledge foliage has ${triangles} triangles`);
}
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
