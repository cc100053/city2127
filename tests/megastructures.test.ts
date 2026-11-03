import assert from 'node:assert/strict';
import { Box3, Group, Mesh, InstancedMesh } from 'three';
import { ConcentrationDistrict } from '../src/districtMeters.ts';
import { changeSites, PLAZA, plazaAt } from '../src/layout.ts';
import { ARCH, FOOTPRINTS, groundContacts, HULL, inMega, inRect, megastructures, RING } from '../src/megastructures.ts';

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
console.log('megastructures ok');
