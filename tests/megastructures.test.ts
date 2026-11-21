import assert from 'node:assert/strict';
import { Box3, Group, Mesh, InstancedMesh } from 'three';
import { ConcentrationDistrict } from '../src/districtMeters.ts';
import { changeSites, guideway, PLAZA, plazaAt, plazaWalks } from '../src/layout.ts';
import { ARCH, FOOTPRINTS, groundContacts, HULL, inMega, inRect, megastructures, RING, RING_GATE } from '../src/megastructures.ts';
import { routes } from '../src/mobility.ts';

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
console.log('megastructures ok');
