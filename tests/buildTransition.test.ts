import assert from 'node:assert/strict';
import * as T from 'three';
import { BUILD_BEAT, BUILD_MASS, BuildChoreography, buildBeat, buildProgress } from '../src/buildTransition.ts';
import { AutomationDistrict, ConcentrationDistrict, SharingDistrict } from '../src/districtMeters.ts';
import { SITE_TRANSITION_SECONDS } from '../src/siteBuilders/siteRuntime.ts';

// Timing: nothing outside the 3 s window; the mass waits for the rig, moves monotonically and is complete before the end beat.
assert.equal(buildBeat(-.01), null); assert.equal(buildBeat(SITE_TRANSITION_SECONDS), null);
assert.equal(buildProgress(BUILD_MASS / SITE_TRANSITION_SECONDS), 0); assert.equal(buildProgress(BUILD_BEAT / SITE_TRANSITION_SECONDS), 1);
let last = 0;
for (let t = 0; t < SITE_TRANSITION_SECONDS; t += .05) {
  const s = buildBeat(t)!;
  assert.ok(s.progress >= last && s.rig >= 0 && s.rig <= 1 && s.beat >= 0 && s.beat < 1); last = s.progress;
  assert.equal(s.beat > 0, t > BUILD_BEAT, 'the end beat starts only after the mass has settled');
}
assert.equal(buildBeat(.5)!.rig, 1, 'rig stands before the mass has moved far'); assert.ok(buildBeat(.5)!.progress < .02);

// Batches: no instances or visible meshes before the start, after the end, or after clear(); a scheduled (future) start draws nothing early.
{
  const root = new T.Group(), rig = new BuildChoreography(root, '#ffb347', 4), batches = root.getObjectsByProperty('name', 'build-transition') as T.InstancedMesh[];
  const drones = root.getObjectsByProperty('name', 'build-drones'), shown = () => [...batches, ...drones].filter(m => m.visible).length;
  assert.equal(batches.length, 2); assert.equal(drones.length, 3);
  rig.update(0); assert.equal(shown(), 0, 'idle draws nothing');
  rig.play([{ x: 0, y: 0, z: 0, r: 20, from: 0, to: 100 }, { x: 50, y: 0, z: 0, r: 14, from: 15, to: 0 }], 5);
  rig.update(4.9); assert.equal(rig.active(4.9), 0); assert.equal(shown(), 0, 'a change scheduled after the fly-in draws nothing early');
  rig.update(6.5); assert.equal(rig.active(6.5), 2); assert.equal(shown(), 5); assert.equal(batches[0].count, 2); assert.equal(batches[1].count, 12);
  // Build line (ring 4 of each slot): halfway up the appearing slot, halfway down the removed one at the middle of the mass phase.
  const lineY = (slot: number, now: number) => { rig.update(now); const m = new T.Matrix4(); batches[1].getMatrixAt(slot * 6 + 4, m); return m.elements[13]; };
  const mid = 5 + (BUILD_MASS + BUILD_BEAT) / 2;
  assert.ok(Math.abs(lineY(0, mid) - 50) < 1e-3 && Math.abs(lineY(1, mid) - 7.5) < 1e-3, 'build line tracks both directions');
  assert.ok(lineY(0, 5.6) < lineY(0, 6.2) && lineY(1, 5.6) > lineY(1, 6.2));
  rig.play([{ x: 0, y: 0, z: 0, r: 20, from: 100, to: 0 }], 7); rig.update(7.5);
  assert.equal(rig.active(7.5), 2, 'a slot changed again restarts instead of stacking');
  rig.update(10.1); assert.equal(shown(), 0, 'everything is gone when the transition ends'); assert.equal(batches[0].count, 0);
  rig.play([{ x: 0, y: 0, z: 0, r: 20, from: 0, to: 100 }], 20); rig.update(21); assert.equal(shown(), 5);
  rig.clear(); assert.equal(shown(), 0, 'clear is immediate'); assert.equal(rig.active(21), 0);
}

// SE district: only a live, non-quiet change plays; snapshots / reduced motion (immediate) and legacy hide skip or cancel it, and levels still land on target.
{
  const at = (se: number) => ({ tiers: { nw: 0, ne: 0, sw: 0, se } }) as never;
  const d = new ConcentrationDistrict(new T.Scene()), builds = (now: number) => { d.update(now); return d.getDiagnostics().activeBuilds; };
  d.setTarget(at(0), 0, true); assert.equal(builds(.5), 0, 'snapshot plays no build');
  d.setTarget(at(2), 1, false, 0, true); assert.equal(builds(2), 0, 'quiet live change plays no build');
  d.setTarget(at(3), 10, false);
  assert.equal(builds(9.5), 0); assert.equal(builds(11), d.changedPoints.length, 'one build per changed slot'); assert.ok(d.changedPoints.length > 0);
  d.setTarget(at(-3), 11.2, true); assert.equal(builds(11.3), 0, 'an immediate state cancels a running build');
  d.setTarget(at(3), 20, false); assert.ok(builds(21) > 0);
  assert.equal(builds(23.1), 0); assert.equal(d.getDiagnostics().visibleTowers, d.towers.length, 'towers settle on target');
  d.setTarget(at(-3), 30, false); assert.ok(builds(31) > 0); d.hide(); assert.equal(builds(31.1), 0, 'legacy hide clears builds');
}
// NW and SW: the same rig on every changed bay, room and court (never the street slot); snapshots and quiet changes play nothing.
for (const [district, axis] of [[new AutomationDistrict(new T.Scene()), 'nw'], [new SharingDistrict(new T.Scene()), 'sw']] as const) {
  const at = (tier: number) => ({ tiers: { nw: 0, ne: 0, sw: 0, se: 0, [axis]: tier } }) as never;
  const builds = (now: number) => { district.update(now); return district.getDiagnostics().activeBuilds; };
  district.setTarget(at(-3), 0, true); assert.equal(builds(1), 0, `${axis}: snapshot plays no build`);
  district.setTarget(at(-2), 2, false, 0, true); assert.equal(builds(3), 0, `${axis}: quiet change plays no build`);
  for (const [tier, now] of [[3, 10], [-3, 20]] as const) {
    district.setTarget(at(tier), now, false);
    const slots = district.changedPoints.filter(p => p.slot !== 'nw:street').length;
    assert.ok(slots > 0); assert.equal(builds(now + 1), slots, `${axis}: one build per changed slot`); assert.equal(builds(now + 3.1), 0);
  }
  district.setTarget(at(3), 30, false); assert.ok(builds(31) > 0); district.setTarget(at(3), 31.2, true); assert.equal(builds(31.3), 0, `${axis}: immediate cancels`);
}
console.log('PASS: build transition (SE, NW, SW) — timing window, both directions, live-only, immediate/clear/hide cancel, zero idle batches.');
