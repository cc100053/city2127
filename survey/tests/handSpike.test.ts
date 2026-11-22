import assert from 'node:assert/strict';
import { History, OneEuro, Pinch, SelectGate, percentile, pickHand, pinchRatio, zoneToScreen } from '../src/ui/handSpikeCore.ts';

// Sticky hand: the kept hand stays unless another is more than 30% larger.
const a = { area: 0.04, cx: 0.3, cy: 0.5 }, b = { area: 0.05, cx: 0.7, cy: 0.5 }, big = { area: 0.06, cx: 0.7, cy: 0.5 };
assert.equal(pickHand([a, b], undefined), 1, 'largest wins without history');
assert.equal(pickHand([b, a], a), 1, 'previous hand kept when the other is only 25% larger');
assert.equal(pickHand([a, big], a), 1, 'a 50% larger hand steals');
assert.equal(pickHand([b], a), 0, 'previous gone: remaining hand');
assert.equal(pickHand([], a), -1);

// Mirrored active zone: frame centre maps to screen centre, the zone edges to the screen edges.
assert.deepEqual(zoneToScreen({ x: 0.5, y: 0.5 }, 1000, 800), { x: 500, y: 400 });
assert.deepEqual(zoneToScreen({ x: 0.8, y: 0.2 }, 1000, 800), { x: 0, y: 0 });
assert.deepEqual(zoneToScreen({ x: 0.0, y: 1.0 }, 1000, 800), { x: 1000, y: 800 });

// Pinch ratio and hysteresis.
const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
hand[0] = { x: 0.5, y: 0.7 }; hand[9] = { x: 0.5, y: 0.5 }; hand[4] = { x: 0.5, y: 0.45 }; hand[8] = { x: 0.5, y: 0.42 };
assert.ok(Math.abs(pinchRatio(hand) - 0.15) < 1e-9);
const pinch = new Pinch();
assert.equal(pinch.update(0.2), true); assert.equal(pinch.update(0.3), false); assert.equal(pinch.update(0.2), false, 'no re-fire inside hysteresis');
assert.equal(pinch.update(0.5), false); assert.equal(pinch.update(0.2), true, 'fires again after opening');

// One-Euro: holds still input steady and converges toward a step.
const f = new OneEuro(1, 0);
let v = 0; for (let i = 0; i <= 60; i++) v = f.filter(i === 0 ? 0 : 100, i / 30);
assert.ok(v > 99 && v <= 100, `converged ${v}`);

// History lookup 100 ms back.
const h = new History();
for (let t = 0; t <= 300; t += 33) h.push(t, { x: t, y: 0 });
assert.equal(h.at(297 - 100)?.x, 165);
assert.equal(h.at(-5)?.x, 0, 'older than history: oldest sample');

assert.equal(percentile([5, 1, 3, 2, 4], 0.5), 3);
assert.equal(percentile([1, 2, 3, 4, 100], 0.95), 100);

// Dwell selects after 1 s; cooldown + leave-to-rearm; pinch respects both.
const g = new SelectGate(1000, 600);
assert.equal(g.hover(0, 0), -1); assert.equal(g.hover(0, 999), -1); assert.equal(g.hover(0, 1000), 0);
assert.equal(g.hover(0, 5000), -1, 'staying on the selected card never re-fires');
assert.equal(g.pinch(0, 5000), -1, 'pinch on the blocked card ignored');
assert.equal(g.hover(1, 5001), -1); assert.equal(g.pinch(1, 5002), 1, 'other card pinch after cooldown');
assert.equal(g.pinch(2, 5100), -1, 'cooldown blocks every card');
assert.equal(g.hover(-1, 5700), -1); assert.equal(g.hover(1, 5701), -1); assert.equal(g.hover(1, 6701), 1, 'left and came back: dwell again');
console.log('handSpike tests passed');
