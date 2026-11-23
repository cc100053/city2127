import assert from 'node:assert/strict';
import { SCAN_STEPS, ScanCharge } from '../src/ui/hand/ui/scan.ts';

// 住民登録 scan (住民の窓 page 1): 4 s open palm charges, lock, release, then a pinch registers.
const s = new ScanCharge();
let now = 0;
const run = (ms: number, palm: boolean, seen = palm) => { for (let t = 0; t < ms; t += 16) s.update(16, palm, seen, now += 16, 4000, 150); };
assert.equal(s.pinch(), false, 'no pinch before the scan');
run(2000, true);
assert.equal(s.phase, 'charge');
assert.ok(Math.abs(s.f - 0.5) < 0.01, `half charged after 2 s (${s.f})`);
assert.equal(s.step, Math.floor(s.f * SCAN_STEPS + 1e-6));
run(150, false, true);
assert.ok(s.f > 0.49, 'a tracking gap inside the grace keeps the charge');
run(250, false, true);
assert.ok(s.f < 0.4 && s.phase === 'charge', 'without a palm the ring drains');
run(700, false, false);
assert.equal(s.phase, 'idle');
assert.equal(s.f, 0);

run(4100, true);
assert.equal(s.phase, 'lock', 'a full charge locks');
assert.equal(s.pinch(), false, 'no pinch while locked');
run(160, true);
assert.equal(s.phase, 'release');
assert.equal(s.pinch(), false, 'no pinch while the field is still releasing');
run(720, true);
assert.equal(s.phase, 'ready');
assert.ok(s.rt > 700, 'the release clock keeps running for its animation');
assert.equal(s.pinch(), true);
assert.equal(s.phase, 'registered');

// A hand gone for 4 s while waiting for the pinch starts over.
const r = new ScanCharge();
let t2 = 0;
for (let t = 0; t < 5100; t += 16) r.update(16, true, true, t2 += 16, 4000, 150);
assert.equal(r.phase, 'ready');
for (let t = 0; t < 4100; t += 16) r.update(16, false, false, t2 += 16, 4000, 150);
assert.equal(r.phase, 'idle');
console.log('handScan tests passed');
