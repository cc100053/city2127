import assert from 'node:assert/strict';
import { zeroScores, type CityScores } from '../src/shared/citySurveyState.ts';
import { deriveCityLayout, layoutChanges } from '../src/shared/cityView.ts';

const s = (partial: Partial<CityScores>): CityScores => ({ ...zeroScores(), ...partial });
const slots = (scores: CityScores) => Object.values(deriveCityLayout(scores).lots).map(l => `${l.socketId}:${l.lot}/${l.building}`);

// Neutral policy → four empty lots, no buildings.
assert.deepEqual(slots(zeroScores()), ['nw:empty/none', 'ne:empty/none', 'sw:empty/none', 'se:empty/none']);
// Negative scores never add geometry.
assert.deepEqual(slots(s({ automation: -12, publicSharing: -12, environmentalPriority: -12, urbanConcentration: -12 })), slots(zeroScores()));

// Each axis owns one slot; thresholds are inclusive.
assert.equal(deriveCityLayout(s({ automation: 1 })).lots.nw.building, 'none');
assert.equal(deriveCityLayout(s({ automation: 2 })).lots.nw.building, 'medium');
assert.equal(deriveCityLayout(s({ automation: 4 })).lots.nw.building, 'tall');
assert.equal(deriveCityLayout(s({ environmentalPriority: 1 })).lots.ne.lot, 'empty');
assert.equal(deriveCityLayout(s({ environmentalPriority: 2 })).lots.ne.lot, 'park');
assert.equal(deriveCityLayout(s({ publicSharing: 1 })).lots.sw.lot, 'empty');
assert.equal(deriveCityLayout(s({ publicSharing: 2 })).lots.sw.lot, 'plaza');
assert.equal(deriveCityLayout(s({ urbanConcentration: 0 })).lots.se.building, 'none');
assert.equal(deriveCityLayout(s({ urbanConcentration: 1 })).lots.se.building, 'medium');
assert.equal(deriveCityLayout(s({ urbanConcentration: 2 })).lots.se.building, 'tall');

// Effects accumulate instead of replacing one another.
assert.deepEqual(slots(s({ automation: 2, publicSharing: 2, environmentalPriority: 2, urbanConcentration: 2 })),
  ['nw:empty/medium', 'ne:park/none', 'sw:plaza/none', 'se:empty/tall']);
// Parks and plazas never carry a building (module-swap's validateCityLayout rule).
for (let v = -12; v <= 12; v++) {
  const lots = Object.values(deriveCityLayout(s({ automation: v, publicSharing: v, environmentalPriority: v, urbanConcentration: v })).lots);
  assert.ok(lots.every(l => l.lot === 'empty' || l.building === 'none'));
}
// Deterministic: same input, same layout.
const input = s({ automation: 3, publicSharing: 5, urbanConcentration: 1 });
assert.deepEqual(deriveCityLayout(input), deriveCityLayout({ ...input }));

// Only slots that actually changed are reported, labelled by what they represent.
assert.deepEqual(layoutChanges(deriveCityLayout(zeroScores()), deriveCityLayout(s({ automation: 2 }))),
  [{ socketId: 'nw', label: '自動サービス拠点（自動化）' }]);
assert.deepEqual(layoutChanges(deriveCityLayout(s({ automation: 2 })), deriveCityLayout(s({ automation: 2, publicSharing: 2 }))),
  [{ socketId: 'sw', label: '公共コモンズ広場（公共共有）' }]);
console.log('PASS: neutral baseline, per-axis thresholds, accumulation, park/plaza carry no building, determinism, change labels.');
