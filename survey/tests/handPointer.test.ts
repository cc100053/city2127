import assert from 'node:assert/strict';
import { HandPointer, History, OneEuro, Pinch, Predictor, SelectGate, percentile, pickHand, pinchRatio, zoneToScreen } from '../src/ui/hand/handPointer.ts';

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

// Predictor: extrapolates along velocity, capped at maxAhead; no motion before two samples.
const pr = new Predictor(40);
pr.push(0, { x: 0, y: 0 });
assert.deepEqual(pr.at(30), { x: 0, y: 0 });
pr.push(33, { x: 33, y: 0 });
assert.equal(pr.at(53)?.x, 53, '20 ms ahead at 1 px/ms');
assert.equal(pr.at(500)?.x, 73, 'capped at 40 ms ahead');
assert.equal(pr.at(10)?.x, 33, 'never behind the last sample');

// HandPointer: no hand -> no cursor; lost fires once; pinch freezes the cursor at the earlier point.
const hp = new HandPointer({ predictMs: 0, beta: 0, minCutoff: 1000 });
const open = (x: number) => { const h = Array.from({ length: 21 }, () => ({ x, y: 0.5 })); h[0] = { x, y: 0.7 }; h[9] = { x, y: 0.5 }; h[4] = { x: x + 0.1, y: 0.5 }; h[8] = { x, y: 0.5 }; return h; };
const closed = (x: number) => { const h = open(x); h[4] = { x, y: 0.5 }; return h; };
assert.equal(hp.update([], 0, 1000, 800).lost, false);
assert.equal(hp.cursorAt(0), undefined);
hp.update([open(0.5)], 0, 1000, 800); hp.update([open(0.5)], 33, 1000, 800);
assert.ok(Math.abs(hp.cursorAt(40)!.x - 500) < 1, 'centre maps to centre');
hp.update([open(0.4)], 66, 1000, 800); hp.update([open(0.4)], 99, 1000, 800);
const up = hp.update([closed(0.3)], 132, 1000, 800);
assert.ok(up.pinchAt && Math.abs(up.pinchAt.x - 500) < 2, `pinch selects where the cursor was 100 ms ago (${up.pinchAt?.x})`);
hp.update([closed(0.2)], 165, 1000, 800);
assert.deepEqual(hp.cursorAt(170), up.pinchAt, 'frozen while closed');
assert.equal(hp.update([], 200, 1000, 800).lost, true);
assert.equal(hp.update([], 233, 1000, 800).lost, false, 'lost fires once');
console.log('handPointer tests passed');
