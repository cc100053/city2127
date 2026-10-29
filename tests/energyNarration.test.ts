import assert from 'node:assert/strict';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import { emptyEnergyConfiguration } from '../survey/src/shared/energy.ts';
import { ENERGY_PHASES } from '../src/devEnergy.ts';
import { energyCycle, energyPrototype } from '../src/energyPrototype.ts';
import { EnergyNarration, NARRATION, narratedPart, narratedSeconds, narrationPlan, narrationStep } from '../src/energyNarration.ts';
import { shotStage, shotTimeline } from '../src/headlineCamera.ts';
import { SITE_TRANSITION_SECONDS } from '../src/siteBuilders/siteRuntime.ts';
import { ARRIVAL_SECONDS } from '../src/voteJourney.ts';
import type { EnergyRuntime } from '../src/energyRuntime.ts';

// Phase copy: water gardens read the shared A phases, the ring the B phases, in charge → hold → release order.
const phases = (p: { charge: string; hold: string; release: string }) => [p.charge, p.hold, p.release];
assert.deepEqual(NARRATION.garden.steps, phases(ENERGY_PHASES.a));
assert.deepEqual(NARRATION.garden2.steps, phases(ENERGY_PHASES.a));
assert.deepEqual(NARRATION.ring.steps, phases(ENERGY_PHASES.b));
for (const part of ['wing', 'island'] as const) assert.equal(NARRATION[part].steps.length, 3);
// Japanese UI only, and every step readable at ≤5.4 characters per second within its ≈2.79 s.
for (const { title, steps } of Object.values(NARRATION)) for (const text of [title, ...steps]) {
  assert.ok(/[\u3040-\u30ff]/.test(text), `not Japanese: ${text}`);
  assert.ok(!/[儲釋區廣與這們]/.test(text), `Chinese-only glyph: ${text}`);
}

// Only a part that remains after the result is narrated; removals and Meter headlines keep the card alone.
const none = emptyEnergyConfiguration();
const change = (before = none, after = none) => ({ socketId: 'nw' as const, focal: true, district: false, energy: { before, after } });
assert.equal(narratedPart('energy:garden', change(none, { ...none, waterGardens: 1 })), 'garden');
assert.equal(narratedPart('energy:garden', change({ ...none, waterGardens: 1 }, none)), null);
assert.equal(narratedPart('energy:garden2', change({ ...none, waterGardens: 1 }, { ...none, waterGardens: 2 })), 'garden2');
assert.equal(narratedPart('energy:ring', change({ ...none, flywheel: true }, none)), null);
assert.equal(narratedPart('energy:wing', change(none, { ...none, receiver: 'small' })), 'wing');
assert.equal(narratedPart('energy:island', change(none, { ...none, island: true })), 'island');
assert.equal(narratedPart('nw:focal', { socketId: 'nw', focal: true, district: false }), null);

// The compressed cycle sits inside the unchanged hold: from the camera's arrival to the hold's end, starting at charge.
const now = 123.4, plan = narrationPlan(now), t = shotTimeline(DISPLAY_MS);
assert.equal(DISPLAY_MS, 13_000, 'owner-approved 13 s reading slot');
assert.ok(Math.abs(plan.start - now - (ARRIVAL_SECONDS + 2)) < 1e-9 && Math.abs(plan.end - now - DISPLAY_MS / 1000) < 1e-9);
for (const s of [plan.start + .01, plan.end - .01]) assert.equal(shotStage(s - now), 'hold');
const window = plan.end - plan.start;
assert.ok(window > 8.3 && window < 8.4, `narration window ${window}s`);
assert.ok(plan.start - now - ARRIVAL_SECONDS < SITE_TRANSITION_SECONDS, 'the part is still fading in when the camera arrives');
assert.equal(energyCycle(narratedSeconds(plan, plan.start)).phase, 'charge');
assert.ok(Math.abs(energyCycle(narratedSeconds(plan, plan.start)).t) < 1e-9);
assert.equal(energyCycle(narratedSeconds(plan, plan.start + window / 2)).phase, 'hold');
assert.equal(energyCycle(narratedSeconds(plan, plan.end - .01)).phase, 'release');
for (const s of [plan.start, plan.end]) assert.ok(Math.abs(narratedSeconds(plan, s) - narratedSeconds(plan, s - 1e-6)) < 1e-4, `narrated clock jumps at ${s}`);
assert.ok(narratedSeconds(plan, now) >= now, 'the narrated part only runs ahead of the shared clock');
assert.deepEqual([now, plan.start, plan.start + window * .4, plan.start + window * .7, plan.end, now + t.done].map(s => narrationStep(plan, s)), [-1, 0, 1, 2, -1, -1]);
assert.ok(Math.abs(narratedSeconds(plan, plan.end) - plan.base - 60) < 1e-9, 'exactly one cycle is narrated');

// Water gardens: the three phases differ in pool size, flow and turbine at close-up distance, not only in a 0.8 m rise.
const study = energyPrototype(); study.select('a');
const [g] = study.gardens;
const read = (s: number) => {
  study.update(0, false, { garden: s });
  const flow = g.getObjectByName('energy-water-flow')!;
  return { upper: g.getObjectByName('energy-upper-water')!.scale.x, lower: g.getObjectByName('energy-lower-water')!.scale.x, flow: flow.visible, turbine: g.getObjectByName('energy-turbine')!.rotation.z };
};
const charge = read(1), hold = read(30), release = read(50);
assert.ok(hold.upper - charge.upper > .4 && charge.lower - hold.lower > .28, 'stored water does not visibly move between the pools');
assert.ok(charge.flow && !hold.flow && release.flow);
assert.equal(hold.turbine, 0); assert.notEqual(release.turbine, 0);
// A narrated garden leaves the other garden and the ring on the shared clock.
study.update(7); const shared = [study.gardens[1].getObjectByName('energy-upper-water')!.scale.x, study.rotor.rotation.z];
study.update(7, false, { garden: 30 });
assert.deepEqual([study.gardens[1].getObjectByName('energy-upper-water')!.scale.x, study.rotor.rotation.z], shared);
assert.notEqual(g.getObjectByName('energy-upper-water')!.scale.x, shared[0]);

// Cancelling (snapshot, Undo, reset, reconnect, next result) hides the caption and restores the shared clock.
const node = () => ({ hidden: false, textContent: '', className: '', innerHTML: '', children: [] as { classList: { toggle(): void } }[],
  querySelector: () => node(), replaceChildren(...c: never[]) { this.children = c; }, classList: { toggle() {} } });
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: node, body: { appendChild() {}, dataset: {} as Record<string, string> } } });
try {
  const runtime = { clock: {} } as EnergyRuntime, narration = new EnergyNarration(() => runtime);
  const panel = (narration as unknown as { panel: { hidden: boolean } }).panel;
  narration.play('energy:garden2', change({ ...none, waterGardens: 1 }, { ...none, waterGardens: 2 }), now);
  narration.update(plan.start + 1, false);
  assert.equal(panel.hidden, false);
  assert.deepEqual(Object.keys(runtime.clock).sort(), ['distribution', 'garden2']);
  narration.update(plan.end + 5, false);
  assert.equal(panel.hidden, true, 'caption leaves with the fly-out');
  assert.ok(Math.abs(runtime.clock.garden2! - (plan.base + 65)) < 1e-9, 'the part continues smoothly after its cycle');
  narration.cancel();
  assert.deepEqual(runtime.clock, {}); assert.equal(panel.hidden, true);
  narration.update(plan.start + 1, false); assert.deepEqual(runtime.clock, {}, 'a cancelled narration restarts');
  // A second live result supersedes the first; switching to reduced motion stops the cycle.
  narration.play('energy:ring', change(none, { ...none, flywheel: true }), now);
  narration.play('nw:focal', undefined, now + 3);
  narration.update(plan.start + 1, false); assert.deepEqual(runtime.clock, {});
  narration.play('energy:ring', change(none, { ...none, flywheel: true }), now);
  narration.update(plan.start + 1, true); assert.deepEqual(runtime.clock, {}, 'reduced motion stops the cycle'); assert.equal(panel.hidden, true);
} finally {
  if (descriptor) Object.defineProperty(globalThis, 'document', descriptor);
  else Reflect.deleteProperty(globalThis, 'document');
}
for (const { steps } of Object.values(NARRATION)) for (const step of steps) assert.ok(step.replace(/[\s→]/g, '').length / (window / 3) <= 5.4, `too long to read: ${step}`);
console.log(`energyNarration: PASS (window ${window.toFixed(2)} s, ${(window / 3).toFixed(2)} s per step)`);
