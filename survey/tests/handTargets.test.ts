import assert from 'node:assert/strict';
import { AutoAdvance, TargetGate, boxDistance, nearestBox } from '../src/ui/hand/handTargets.ts';

// Magnetic snap: inside wins, else nearest within the radius.
const boxes = [{ left: 0, top: 0, right: 100, bottom: 100 }, { left: 200, top: 0, right: 300, bottom: 100 }];
assert.equal(boxDistance({ x: 50, y: 50 }, boxes[0]), 0);
assert.equal(boxDistance({ x: 130, y: 50 }, boxes[0]), 30);
assert.equal(nearestBox({ x: 250, y: 50 }, boxes, 60), 1);
assert.equal(nearestBox({ x: 130, y: 50 }, boxes, 60), 0, 'snaps to the nearer box');
assert.equal(nearestBox({ x: 180, y: 50 }, boxes, 60), 1);
assert.equal(nearestBox({ x: 150, y: 300 }, boxes, 60), -1, 'nothing within the radius');

// Dwell fires once; staying never re-fires; leaving re-arms after the cooldown.
const a = { name: 'a' }, b = { name: 'b' }, c = { name: 'c' };
const g = new TargetGate<object>(1000, 600);
assert.equal(g.hover(a, 0), null);
assert.equal(g.hover(a, 999), null);
assert.ok(g.progress(500) > 0.49 && g.progress(500) < 0.51);
assert.equal(g.hover(a, 1000), a);
assert.equal(g.hover(a, 4000), null, 'held on the fired target');
assert.equal(g.pinch(a, 4001), null, 'pinch on the fired target ignored');
assert.equal(g.hover(b, 4002), null);
assert.equal(g.pinch(b, 4003), b, 'other target pinch after the cooldown');
assert.equal(g.pinch(c, 4100), null, 'cooldown blocks every target');
assert.equal(g.hover(null, 4700), null);
assert.equal(g.hover(b, 4701), null);
assert.equal(g.hover(b, 5701), b, 'left and came back: dwell again');

// A new screen under a still cursor: the first target seen is blocked until the cursor leaves it.
const s = new TargetGate<object>(1000, 600);
s.hover(a, 0); assert.equal(s.hover(a, 1000), a);
s.blockUntilLeave();
assert.equal(s.hover(c, 2000), null, 'new screen button under the cursor');
assert.equal(s.hover(c, 9000), null, 'still blocked while the cursor stays');
assert.equal(s.pinch(c, 9001), null);
assert.equal(s.hover(null, 9002), null);
assert.equal(s.hover(c, 9003), null); assert.equal(s.hover(c, 10003), c, 'fires after leaving and returning');
// blockUntilLeave with no target under the cursor blocks nothing.
const n = new TargetGate<object>(1000, 0);
n.blockUntilLeave(); n.hover(null, 0); n.hover(a, 1); assert.equal(n.hover(a, 1001), a);

// Auto-advance: fires once on the same screen after the delay; a screen change cancels it.
const adv = new AutoAdvance(800);
adv.schedule('question:0', 0);
assert.equal(adv.due('question:0', 799), false);
assert.equal(adv.due('question:0', 800), true);
assert.equal(adv.due('question:0', 900), false, 'only once');
adv.schedule('question:1', 1000);
assert.equal(adv.due('review', 1900), false, 'screen changed: cancelled');
assert.equal(adv.scheduled, false);
console.log('handTargets tests passed');
