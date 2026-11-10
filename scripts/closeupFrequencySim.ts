// Counts which close-up shot each simulated proposal triggers, to order close-up polish by how often guests see it.
// Same leaning-guest model as survey/scripts/agencySim.ts; this is not evidence of real guest behaviour.
// Run: node --experimental-strip-types scripts/closeupFrequencySim.ts [--json]
import assert from 'node:assert/strict';
import * as T from 'three';
import { applyProposalVotes, foldSlotSeeds } from '../survey/src/survey/scoreEngine.ts';
import { initialLadder, ladderLayout, ladderStep, pickHeadline, SOCKET_AXES } from '../survey/src/shared/cityView.ts';
import { initialExhibitionState, zeroScores } from '../survey/src/shared/citySurveyState.ts';
import { ENERGY_CHOICES, emptyEnergyConfiguration } from '../survey/src/shared/energy.ts';
import { AutomationDistrict, ConcentrationDistrict, SharingDistrict } from '../src/districtMeters.ts';
import { HeadlineCamera, SHOTS, VIEWPOINT_COVERAGE } from '../src/headlineCamera.ts';
import type { CarrierChange } from '../src/cityChangeManager.ts';

const AX = ['automation', 'publicSharing', 'urbanConcentration'] as const, RUNS = 200, GUESTS = 40;
let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const districts = { nw: new AutomationDistrict(new T.Scene()), sw: new SharingDistrict(new T.Scene()), se: new ConcentrationDistrict(new T.Scene()) };
const shots = new Map<string, number>(), transitions = new Map<string, number>();
const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`;
let N = 0;
for (let r = 0; r < RUNS; r++) {
  const lean = AX.map(() => rnd() * 1.6 - .8), eLean = Math.floor(rnd() * 4);
  let state = initialExhibitionState('sim', 't'), ladder = initialLadder(), layout = ladderLayout(ladder.tiers);
  const seeds = zeroScores();
  // One camera per run: its least-recently-used tie-break lasts one exhibition run.
  const camera = new HeadlineCamera(new T.PerspectiveCamera(), { target: new T.Vector3(), enabled: true, update() {} });
  for (const id of ['nw', 'sw', 'se'] as const) districts[id].setTarget(layout, 0, true, 0);
  for (let g = 0; g < GUESTS; g++) {
    const v = lean.map(x => { const u = rnd(); return u < .2 ? 0 : u < .2 + .8 * (1 + x) / 2 ? 1 : -1; });
    const energy = rnd() < .5 ? ENERGY_CHOICES[eLean] : ENERGY_CHOICES[Math.floor(rnd() * 4)];
    const votes = { automation: v[0], publicSharing: v[1], urbanConcentration: v[2], environmentalPriority: 0, energy };
    state = applyProposalVotes(state, votes, 't');
    const next = ladderStep(ladder, state, votes, foldSlotSeeds(seeds, votes));
    const after = ladderLayout(next.tiers, state.energy, next.activity);
    const changed = Object.fromEntries((['nw', 'sw', 'se'] as const).map(id => {
      const before = JSON.stringify(districts[id].getConfiguration());
      districts[id].setTarget(after, g + 1, false, next.seeds[SOCKET_AXES[id]]);
      return [id, before !== JSON.stringify(districts[id].getConfiguration())];
    }));
    const headline = pickHeadline(layout, after, votes);
    let change: CarrierChange | undefined, label = 'none';
    if (headline && 'energy' in headline) {
      change = { socketId: 'ne', focal: false, district: true, energy: { before: layout.energy ?? emptyEnergyConfiguration(), after: after.energy ?? emptyEnergyConfiguration(), ...(headline.part ? { part: headline.part } : {}) } };
      const part = headline.part ?? 'energy', a = change.energy!.before, b = change.energy!.after;
      label = `energy ${part} ${part !== 'energy' && a[part] === b[part] ? 'activity' : `${part === 'energy' ? '' : `${a[part]}→${b[part]}`}`}`;
    } else if (headline) {
      const id = headline.socketId, a = layout.tiers[id], b = after.tiers[id];
      // ponytail: `focal` is taken as "the band changed", which is how the focal sites read the ladder (complete low/high form from rung 1); the real focal controllers are not built here.
      change = { socketId: id, focal: layout.bands[id] !== after.bands[id], district: id !== 'ne' && changed[id],
        ...(layout.bands[id] === 'low' || after.bands[id] === 'low' ? { low: true as const } : {}),
        focalOnly: Math.max(Math.abs(a), Math.abs(b)) <= 1,
        ...(id !== 'ne' ? { points: districts[id].changedPoints } : {}) };
      label = `${id} ${sign(a)}→${sign(b)}`;
    }
    const shot = camera.play(change ? [change] : [], g) ?? 'none';
    if (shot !== 'none') assert.ok(Object.hasOwn(SHOTS, shot), `unknown shot ${shot}`);
    bump(shots, shot); bump(transitions, `${label} | ${shot}`); N++;
    ladder = next; layout = after;
  }
}
assert.equal(N, RUNS * GUESTS);
const sorted = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1]);
const never = Object.keys(VIEWPOINT_COVERAGE).filter(id => !shots.has(id));
// DEV `?meters=` captures use slot seed 0 with the other sites mixed: list the one-rung changes that move each slot there, for the review sheet.
const seed0: Record<string, string[]> = {};
for (const id of ['nw', 'sw', 'se'] as const) for (let a = -3; a <= 3; a++) for (const b of [a - 1, a + 1]) {
  if (Math.abs(b) > 3 || Math.max(Math.abs(a), Math.abs(b)) <= 1) continue;
  const at = (tier: number) => ladderLayout({ nw: 0, ne: 0, sw: 0, se: 0, [id]: tier });
  districts[id].setTarget(at(a), 0, true, 0); districts[id].setTarget(at(b), 1, false, 0);
  for (const point of districts[id].changedPoints) (seed0[point.slot] ??= []).push(`${id} ${sign(a)}→${sign(b)}`);
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ proposals: N, shots: sorted(shots), transitions: sorted(transitions), never, seed0 }));
else {
  const pct = (n: number) => (100 * n / N).toFixed(2).padStart(6) + '%';
  console.log(`${N} proposals (${RUNS} runs × ${GUESTS} guests)\n\nShot frequency:`);
  for (const [id, n] of sorted(shots)) console.log(`${pct(n)} ${String(n).padStart(5)}  ${id}`);
  console.log('\nChange → shot:');
  for (const [id, n] of sorted(transitions)) console.log(`${pct(n)} ${String(n).padStart(5)}  ${id}`);
  console.log(`\nViewpoints never picked (${never.length}/${Object.keys(VIEWPOINT_COVERAGE).length}): ${never.join(', ') || 'none'}`);
}
