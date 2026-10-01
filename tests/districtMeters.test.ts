import assert from 'node:assert/strict';
import * as T from 'three';
import { EnvironmentDistrict, SlotLevels, facadeClimate, publishRoofGardens } from '../src/districtMeters.ts';
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
