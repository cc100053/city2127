import assert from 'node:assert/strict';
import * as T from 'three';
import { hybridShare, AutomationDistrict, ConcentrationDistrict, EnvironmentDistrict, PULSE_SECONDS, PULSE_WAVE_GAP, SharingDistrict, SlotLevels, PRIVATE_RISE, facadeClimate, publishRoofGardens } from '../src/districtMeters.ts';
import { mobility } from '../src/mobility.ts';
import { presets } from '../src/presets.ts';
import { deriveExhibitionLayout } from '../survey/src/shared/cityView.ts';

const env = (score: number) => deriveExhibitionLayout({ automation: 0, publicSharing: 0, environmentalPriority: score, urbanConcentration: 0 });

// SlotLevels eases over the shared 3 s transition and reports target changes.
const levels = new SlotLevels(2);
assert.equal(levels.setTargets(() => 1, 0, false), true);
levels.update(1.5);
assert.ok(levels.value[0] > .4 && levels.value[0] < .6, 'halfway through the 3 s ease');
levels.update(3);
assert.deepEqual([...levels.value], [1, 1]);
assert.equal(levels.setTargets(() => 1, 4, false), false, 'same target is not a change');

const district = new EnvironmentDistrict(new T.Scene());
let d = district.getDiagnostics();
assert.ok(d.slots >= 12, `promenade bays: ${d.slots}`);

// Low: mostly sails, mist towers, white louvres. High: mostly planted pergolas, no towers, planted facades.
district.setTarget(env(-7.5), 0, true);
d = district.getDiagnostics();
assert.equal(d.visibleCanopies + d.visibleSails, d.slots);
assert.ok(d.visibleSails > d.slots * .6 && d.visibleCoolingTowers > 0);
assert.ok(facadeClimate.louvre.value > .5 && facadeClimate.green.value === 0);
const lowSails = d.visibleSails;

district.setTarget(env(0), 1, true);
d = district.getDiagnostics();
assert.equal(d.visibleCoolingTowers, 0, 'mist towers only below mixed');
assert.ok(d.visibleSails < lowSails && d.visibleCanopies > 0, 'mixed is a hybrid');
assert.ok(Math.abs(facadeClimate.green.value - facadeClimate.louvre.value) < 1e-9 && facadeClimate.green.value < .2);

// Live change animates; roofs published mid-run adopt the current target.
district.setTarget(env(7.5), 2, false);
assert.ok(district.getDiagnostics().visibleSails > 0, 'sails sink over the transition, not instantly');
publishRoofGardens([[0, 0, 20, 8], [40, 0, 20, 8], [80, 0, 20, 4.4]]);
district.update(5.1);
d = district.getDiagnostics();
assert.ok(d.visibleCanopies > d.slots * .6 && facadeClimate.green.value > .5 && facadeClimate.louvre.value === 0);
assert.equal(d.roofs, 3);
assert.equal(d.visibleRoofCrowns + d.visibleRoofSails, 3);

// Legacy v1 hides the district layer and clears facades back to the art-reviewed look.
district.hide();
assert.equal(facadeClimate.green.value + facadeClimate.louvre.value, 0);
console.log(`PASS: environment district — ${d.slots} promenade bays, sails/pergolas/mist towers, roof sails/forest, facade shares, late roofs, legacy hide.`);

// Reapplying an unchanged fractional target must keep the running ease (including Float32 rounding).
const repeated = new SlotLevels(1);
repeated.setTargets(() => 1 / 6, 0, false);
assert.equal(repeated.setTargets(() => 1 / 6, 1, false), false);
repeated.update(1.5);
assert.ok(Math.abs(repeated.value[0] - 1 / 12) < 1e-7);

// Automation uses authoritative ports; same-target events, interrupted live changes and reset/legacy remain deterministic.
const automation = new AutomationDistrict(new T.Scene());
assert.equal(automation.level, undefined);
automation.setTarget({ automatedPorts: 1 }, 0, true);
const low = automation.getDiagnostics();
assert.ok(low.pavilions >= 6);
assert.equal(low.visibleStaffedPavilions, low.pavilions);
assert.equal(low.visibleDronePorts, 0, 'human-led bays carry no drone ports');
assert.deepEqual([low.loopAircraft, low.guidewayPods, low.walkers], [2, 12, 160]);
automation.setTarget({ automatedPorts: 5 }, 1, false);
automation.update(2.5);
const midway = automation.level!;
assert.ok(Math.abs(midway - .5) < 1e-7);
assert.equal(automation.setTarget({ automatedPorts: 5 }, 2.5, false), false);
automation.update(4);
const high = automation.getDiagnostics();
assert.equal(high.visibleStaffedPavilions, 0);
assert.equal(high.visibleDronePorts, high.pavilions, 'P7: every bay becomes a drone port, not empty ground');
const portMatrix = new T.Matrix4(), portScale = new T.Vector3();
(automation.root.getObjectByName('automation-drone-ports') as T.InstancedMesh).getMatrixAt(automation.autonomousDesign.indexOf(0), portMatrix);
assert.ok(Math.abs(portScale.setFromMatrixScale(portMatrix).y - 1) < 1e-6, 'drone port stands at full size');
assert.deepEqual([high.loopAircraft, high.guidewayPods, high.walkers], [30, 24, 40]);
automation.setTarget({ automatedPorts: 1 }, 5, false);
automation.update(6);
const interrupted = automation.level!;
automation.setTarget({ automatedPorts: 3 }, 6, false);
assert.equal(automation.level, interrupted, 'retarget preserves current level');
automation.update(9);
const mixed = automation.getDiagnostics();
assert.ok(mixed.visibleStaffedPavilions > 0 && mixed.visibleStaffedPavilions < mixed.pavilions);
assert.equal(mixed.visibleStaffedPavilions + mixed.visibleDronePorts, mixed.pavilions, 'mixed bays are each staffed or autonomous');
assert.deepEqual([mixed.loopAircraft, mixed.guidewayPods, mixed.walkers], [16, 18, 100]);
automation.setTarget({ automatedPorts: 1 }, 10, true);
assert.equal(automation.getDiagnostics().walkers, 160, 'snapshot/reset is immediate');
automation.hide(); automation.update(20);
assert.equal(automation.level, undefined);
assert.equal(automation.root.visible, false);
console.log(`PASS: automation district — ${low.pavilions} staffed pavilions ↔ drone ports, aircraft/pods/walker mapping, same targets, live retarget, reset and legacy hide.`);

// Check the actual actor matrices, not just the diagnostic counts, and preserve standalone/legacy poses.
const actorScene = new T.Scene(), updateActors = mobility(actorScene);
const fleet = (name: string) => actorScene.children.find(o => o.name === name) as T.InstancedMesh;
const visible = (name: string) => {
  const mesh = fleet(name), matrix = new T.Matrix4(), scale = new T.Vector3(); let count = 0;
  for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); scale.setFromMatrixScale(matrix); if (scale.length() > 1e-4) count++; }
  return count;
};
updateActors(presets.neutral, 20);
const names = ['guideway-pods', 'promenade-walkers', 'air-taxis', 'water-taxis'];
const legacyMatrices = names.map(name => [...fleet(name).instanceMatrix.array]);
for (const [ports, aircraft, pods, walkers] of [[1, 3, 12, 160], [3, 17, 18, 100], [5, 31, 24, 40]]) {
  for (const state of [presets.still, presets.pulse]) {
    updateActors(state, 20, ports / 6);
    assert.deepEqual([visible('air-taxis'), visible('guideway-pods'), visible('promenade-walkers')], [aircraft, pods, walkers]);
  }
}
updateActors(presets.neutral, 20);
names.forEach((name, i) => assert.deepEqual([...fleet(name).instanceMatrix.array], legacyMatrices[i], `${name} restores legacy matrices`));
console.log('PASS: actual P2 actor matrices match low/mixed/high independently of day mood; original standalone/legacy poses restored.');

const sharing = new SharingDistrict(new T.Scene());
sharing.setTarget({ sharedSeats: 2 }, 0, true);
assert.equal(sharing.getDiagnostics().visiblePrivateRooms, sharing.bays.length);
assert.equal(sharing.getDiagnostics().visibleOpenRooms, 0);
assert.equal(sharing.getDiagnostics().vaults, Math.ceil(sharing.bays.length / 2), 'every other room carries a vault');
{
  const vaultScale = (i: number) => { const m = new T.Matrix4(), v = new T.Vector3();
    (sharing.root.getObjectByName('sharing-private-gardens') as T.InstancedMesh).getMatrixAt(i, m); return v.setFromMatrixScale(m).x; };
  assert.ok(vaultScale(0) > 10 && vaultScale(1) < 1e-2, 'only vaulted rooms show glass when private');
}
sharing.setTarget({ sharedSeats: 7 }, 1, false);
sharing.update(2.5);
const screens = sharing.root.getObjectByName('sharing-private-gardens') as T.InstancedMesh;
const matrix = new T.Matrix4(), scale = new T.Vector3();
screens.getMatrixAt(0, matrix); scale.setFromMatrixScale(matrix);
assert.ok(Math.abs(scale.y - PRIVATE_RISE * sharing.bays[0].r / 2) < 1e-4, 'private wall lowers halfway through the 3-second transition');
assert.equal(sharing.setTarget({ sharedSeats: 7 }, 2.5, false), false);
sharing.update(4);
assert.equal(sharing.getDiagnostics().visibleOpenRooms, sharing.bays.length);
assert.equal(sharing.getDiagnostics().visiblePrivateRooms, 0);
{
  const scaleOf = (mesh: T.InstancedMesh, i: number) => { const m = new T.Matrix4(), v = new T.Vector3(); mesh.getMatrixAt(i, m); return v.setFromMatrixScale(m).x; };
  const halos = sharing.root.getObjectsByProperty('name', 'sharing-open-halos')[0] as T.InstancedMesh;
  const steps = sharing.root.getObjectByName('sharing-open-steps') as T.InstancedMesh;
  assert.ok(scaleOf(steps, 0) > 10 && scaleOf(halos, 0) < 1e-2 && scaleOf(halos, 1) > 10 && scaleOf(steps, 1) < 1e-2, 'open rooms alternate steps / halo canopies');
}
for (const object of sharing.root.children) {
  const mesh = object as T.InstancedMesh;
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    assert.ok(matrix.determinant() > 0, 'hidden parts keep invertible matrices for G-buffer normals');
  }
}
sharing.setTarget({ sharedSeats: 0 }, 5, false); sharing.update(6);
screens.getMatrixAt(0, matrix); scale.setFromMatrixScale(matrix); const interruptedHeight = scale.y;
sharing.setTarget({ sharedSeats: 4 }, 6, false);
screens.getMatrixAt(0, matrix); scale.setFromMatrixScale(matrix);
assert.equal(scale.y, interruptedHeight, 'retarget does not jump');
sharing.update(9);
const hybrid = sharing.getDiagnostics();
assert.ok(hybrid.visibleOpenRooms > 0 && hybrid.visiblePrivateRooms > 0);
assert.equal(hybrid.visibleOpenRooms + hybrid.visiblePrivateRooms, hybrid.rooms);
sharing.setTarget({ sharedSeats: 8 }, 10, true);
assert.equal(sharing.getDiagnostics().visibleOpenRooms, hybrid.rooms, 'snapshot/reset is immediate');
sharing.hide(); sharing.update(20);
assert.equal(sharing.root.visible, false);
assert.equal(sharing.getDiagnostics().visibleOpenRooms + sharing.getDiagnostics().visiblePrivateRooms, 0);
console.log(`PASS: sharing — ${hybrid.rooms} water gardens, actual screen matrices, mixed, same target, interruption, snapshot and legacy hide.`);

// P4: low scatters every pod with no towers; high raises every tower with no pods; mixed keeps about half of each.
const concentration = new ConcentrationDistrict(new T.Scene());
const counts = () => { const d = concentration.getDiagnostics(); return [d.visibleTowers, d.visiblePods]; };
concentration.setTarget({ functionModules: 3 }, 0, true);
assert.deepEqual(counts(), [0, concentration.pods.length]);
concentration.setTarget({ functionModules: 5 }, 1, false);
concentration.update(2.5);
const towerMesh = concentration.root.getObjectByName('concentration-vertical-towers') as T.InstancedMesh;
// P7: three silhouette families (twisted / terraced / twin) split the slots; their batches hold exactly the ten towers.
const towerBatches = concentration.root.children.filter(o => o.name === 'concentration-vertical-towers') as T.InstancedMesh[];
assert.deepEqual([...new Set(towerBatches.map(m => m.count))].sort(), [3, 4], 'towers split into three families of 4 / 3 / 3');
const rising = new T.Vector3();
towerMesh.getMatrixAt(0, matrix); rising.setFromMatrixScale(matrix);
assert.ok(rising.y > concentration.towers[0].h * .3 && rising.y < concentration.towers[0].h * .7, 'towers rise over the 3-second transition');
assert.equal(concentration.setTarget({ functionModules: 5 }, 2.5, false), false);
concentration.update(4);
assert.deepEqual(counts(), [concentration.towers.length, 0]);
for (const object of concentration.root.children) {
  const mesh = object as T.InstancedMesh;
  for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); assert.ok(matrix.determinant() > 0, `${mesh.name} keeps invertible matrices`); }
}
concentration.setTarget({ functionModules: 4 }, 5, true);
const [mixedTowers, mixedPods] = counts();
assert.ok(mixedTowers > 0 && mixedTowers < concentration.towers.length && mixedPods > 0 && mixedPods < concentration.pods.length, 'mixed is a hybrid');
concentration.hide();
assert.deepEqual(counts(), [0, 0]);
assert.equal(concentration.root.visible, false);
console.log(`PASS: concentration district — ${concentration.towers.length} towers in 3 silhouette families / ${concentration.bridges.length} sky bridges vs ${concentration.pods.length} pods, rise, same target, mixed hybrid, invertible hidden matrices, legacy hide.`);

// P8: every slot-based carrier mixes ≥ 2 design families within each band, and only the slot's own design is drawn.
{
  const families = (designs: readonly number[]) => new Set(designs).size;
  const environment = new EnvironmentDistrict(new T.Scene());
  publishRoofGardens([[0, 0, 40, 10], [30, 0, 40, 10], [60, 0, 40, 10], [90, 0, 40, 10], [120, 0, 40, 10], [150, 0, 40, 10]]);
  const roofs = environment as unknown as { roofLow: number[]; roofHigh: number[] };
  const automationDesigns = new AutomationDistrict(new T.Scene()), sharingDesigns = new SharingDistrict(new T.Scene()), podDesigns = new ConcentrationDistrict(new T.Scene());
  for (const [name, designs] of Object.entries({
    'promenade low': environment.lowDesign, 'promenade high': environment.highDesign, 'mist towers': environment.towerDesign,
    'roof low': roofs.roofLow, 'roof high': roofs.roofHigh, 'staffed halls': automationDesigns.staffedDesign, 'autonomous bays': automationDesigns.autonomousDesign,
    'private courts': sharingDesigns.privateDesign, 'open courts': sharingDesigns.openDesign, pods: podDesigns.podDesign,
  })) assert.ok(families(designs) >= 2, `${name} use ≥ 2 design families`);
  // Actual matrices at high automation: a mast bay draws the mast, never the port, and vice versa.
  automationDesigns.setTarget({ automatedPorts: 6 }, 0, true);
  // First batch belongs to the port group, last to the mast group (both share the name).
  const autonomous = automationDesigns.root.children.filter(o => o.name === 'automation-drone-ports') as T.InstancedMesh[];
  const ports = autonomous[0], masts = autonomous.at(-1)!;
  const size = (mesh: T.InstancedMesh, i: number) => { mesh.getMatrixAt(i, matrix); return new T.Vector3().setFromMatrixScale(matrix).y; };
  automationDesigns.autonomousDesign.forEach((d, i) => {
    assert.ok(Math.abs(size(d ? masts : ports, i) - 1) < 1e-6 && size(d ? ports : masts, i) < 1e-3, `bay ${i} draws only its own autonomous design`);
  });
  console.log('PASS: P8 design families — every carrier mixes ≥ 2 families per band; each slot draws only its own design.');
}

// P9: hybrids appear only around mixed (never at a low / high band) and compose both designs on the same slot.
{
  assert.deepEqual([hybridShare(.25), hybridShare(.5), hybridShare(.75), hybridShare(.1875), hybridShare(.8125)], [0, .6, 0, 0, 0]);
  const a = new AutomationDistrict(new T.Scene()), sh = new SharingDistrict(new T.Scene()), c = new ConcentrationDistrict(new T.Scene()), e = new EnvironmentDistrict(new T.Scene());
  const counts = () => [a.getDiagnostics().hybridBays, sh.getDiagnostics().hybridRooms + sh.getDiagnostics().hybridCourts, c.getDiagnostics().midRises, e.getDiagnostics().hybridBays];
  const band = (name: string) => { const l = deriveExhibitionLayout({ automation: { low: -7.5, mixed: 0, high: 7.5 }[name]!, publicSharing: { low: -7.5, mixed: 0, high: 7.5 }[name]!,
    environmentalPriority: { low: -7.5, mixed: 0, high: 7.5 }[name]!, urbanConcentration: { low: -7.5, mixed: 0, high: 7.5 }[name]! });
    a.setTarget(l, 0, true); sh.setTarget(l, 0, true); c.setTarget(l, 0, true); e.setTarget(l, 0, true); return counts(); };
  assert.deepEqual(band('low'), [0, 0, 0, 0], 'no hybrids at low');
  assert.deepEqual(band('high'), [0, 0, 0, 0], 'no hybrids at high');
  const mixedHybrids = band('mixed');
  assert.ok(mixedHybrids.every(n => n > 0), `every Meter shows hybrids at mixed (${mixedHybrids})`);
  // A hybrid automation bay draws its autonomous design at full size over a 60 % staffed kiosk (full hall where the bay stays staffed).
  const staffing = a as unknown as { hybrid: SlotLevels; staffed: SlotLevels };
  const i = staffing.hybrid.value.findIndex((h, k) => h === 1 && staffing.staffed.value[k] === 0);
  const full = (name: string, slot: number, y = 1) => (a.root.children.concat(c.root.children).filter(o => o.name === name) as T.InstancedMesh[])
    .some(mesh => slot < mesh.count && (mesh.getMatrixAt(slot, matrix), Math.abs(new T.Vector3().setFromMatrixScale(matrix).y - y) < 1e-4));
  assert.ok(i >= 0 && full('automation-staffed-pavilions', i, .6) && full('automation-drone-ports', i), 'hybrid bay composes staffed kiosk and autonomous deck');
  // A mid-rise (hybrid site without a full tower) stands at 45 % of its tower height in its family batch.
  const levels = c as unknown as { midRise: SlotLevels; towerLevels: SlotLevels };
  const m = c.towers.findIndex((_, k) => levels.midRise.value[k] === 1 && levels.towerLevels.value[k] === 0);
  assert.ok(m >= 0 && full('concentration-vertical-towers', Math.floor(m / 3), .45 * c.towers[m].h), 'mid-rise at 45 % height');
  console.log(`PASS: P9 hybrids — none at low / high, ${mixedHybrids.join(' / ')} (automation / sharing / mid-rise / environment) at mixed; hybrid bay composes both designs.`);
}

// P5: a live change pulses only where its district changed, in two waves that fade within PULSE_WAVE_GAP + PULSE_SECONDS;
// snapshots / resets / reduced motion (immediate) never pulse, and a legacy hide clears pulses.
const pulseCases: [string, { setTarget(l: never, now: number, immediate: boolean): boolean; update(now: number): void; hide(): void; getDiagnostics(): { activePulses: number }; root: T.Group }, object, object][] = [
  ['environment', new EnvironmentDistrict(new T.Scene()) as never, env(-7.5), env(7.5)],
  ['automation', new AutomationDistrict(new T.Scene()) as never, { automatedPorts: 1 }, { automatedPorts: 5 }],
  ['sharing', new SharingDistrict(new T.Scene()) as never, { sharedSeats: 2 }, { sharedSeats: 7 }],
  ['concentration', new ConcentrationDistrict(new T.Scene()) as never, { functionModules: 3 }, { functionModules: 5 }],
];
for (const [name, district, low, high] of pulseCases) {
  district.setTarget(low as never, 0, true); district.update(.5);
  assert.equal(district.getDiagnostics().activePulses, 0, `${name}: snapshot does not pulse`);
  district.setTarget(high as never, 1, false); district.update(1.2);
  const first = district.getDiagnostics().activePulses;
  assert.ok(first > 1, `${name}: live change pulses its site and changed slots`);
  district.update(1 + PULSE_WAVE_GAP + .1);
  assert.equal(district.getDiagnostics().activePulses, first * 2, `${name}: second wave follows`);
  district.update(1 + PULSE_WAVE_GAP + PULSE_SECONDS + .1);
  assert.equal(district.getDiagnostics().activePulses, 0, `${name}: pulses fade`);
  assert.equal(district.setTarget(high as never, 6, false), false); district.update(6.2);
  assert.equal(district.getDiagnostics().activePulses, 0, `${name}: unchanged target does not pulse`);
  district.setTarget(low as never, 7, false); district.update(7.2);
  district.hide(); district.update(7.3);
  assert.equal(district.getDiagnostics().activePulses, 0, `${name}: legacy hide clears pulses`);
  assert.equal(district.root.getObjectsByProperty('name', 'meter-pulse').length, 2, `${name}: GTAO-excluded pulse batches`);
}
console.log('PASS: P5 pulses — live changes only, two waves, fade, no pulse on snapshot / unchanged target, cleared on legacy hide, GTAO-excluded.');
