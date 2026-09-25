import assert from 'node:assert/strict';
import { createWorldState } from '../src/worldState.ts';
import { presets, type WorldState } from '../src/presets.ts';
import { DAY_SECONDS, hourAt, daylight, moodAt, withNight } from '../src/dayCycle.ts';
const close = (a: WorldState, b: WorldState, skip: keyof WorldState = 'timeOfDay') => { for (const key of Object.keys(a) as (keyof WorldState)[]) if (key !== skip) assert.ok(Math.abs(a[key] - b[key]) < 1e-9, key); };

const world = createWorldState();
assert.deepEqual(world.state, presets.neutral);
world.blendTo(presets.pulse, 0);
world.update(5);
assert.ok(Math.abs(world.state.neon - .6) < 1e-10);
world.update(10);
assert.deepEqual(world.state, presets.pulse);

// The clock opens at midday, wraps every DAY_SECONDS and passes through dawn, day and night.
assert.equal(hourAt(0), 12);
assert.equal(hourAt(DAY_SECONDS), 12);
assert.equal(hourAt(DAY_SECONDS / 2), 0);
assert.equal(daylight(12), 1);
assert.equal(daylight(0), 0);
assert.ok(daylight(6) > 0 && daylight(6) < 1);
close(moodAt(14), presets.neutral);
close(moodAt(7), presets.still);
close(moodAt(23), { ...moodAt(23), ...presets.pulse });
close(moodAt(23.9999), moodAt(0));
assert.equal(moodAt(15.5).timeOfDay, 15.5);
for (let h = 0; h < 24; h += .25) for (const v of Object.values(moodAt(h))) assert.ok(Number.isFinite(v));

// Night lifts lights without touching the rest; full daylight leaves the state alone.
assert.deepEqual(withNight(presets.still, 0), presets.still);
const lit = withNight(presets.still, 1);
assert.ok(lit.windowLife > presets.still.windowLife && lit.neon > presets.still.neon && lit.greenery === presets.still.greenery);
console.log('PASS: survey blend, day clock wrap, daylight curve, mood keyframes and midnight continuity, night lights.');
