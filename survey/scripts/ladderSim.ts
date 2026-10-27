// Ladder distribution check (docs/VALIDATION.md): node --experimental-strip-types survey/scripts/ladderSim.ts
// Real code: 200 runs × 40 leaning guests (energy question set), reducer + seed fold + ladderStep + ladderLayout.
import { applyProposalVotes, foldSlotSeeds } from '../src/survey/scoreEngine.ts';
import { initialLadder, ladderStep, ladderLayout, exhibitionLayoutChanges, exhibitionDisplayScores, deriveExhibitionLayout } from '../src/shared/cityView.ts';
import { initialExhibitionState, zeroScores } from '../src/shared/citySurveyState.ts';
import { ENERGY_CHOICES, energyConfiguration, emptyEnergyConfiguration, sameEnergyConfiguration } from '../src/shared/energy.ts';
const AX = ['automation', 'publicSharing', 'urbanConcentration'] as const;
let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const RUNS = 200, GUESTS = 40, N = RUNS * GUESTS;
const oldHist = [0, 0, 0, 0, 0], newHist = [0, 0, 0, 0, 0], tierHist = [0, 0, 0], oldFirst = [0, 0, 0], newFirst = [0, 0, 0];
let oldFlip = 0, rev = 0, moves = 0, focal = 0, district = 0;
for (let r = 0; r < RUNS; r++) {
  const lean = AX.map(() => rnd() * 1.6 - .8), eLean = Math.floor(rnd() * 4);
  let s = initialExhibitionState('sim', 't'), ladder = initialLadder(); const seeds = zeroScores(), last = new Map<string, number>();
  for (let g = 0; g < GUESTS; g++) {
    const v = lean.map(l => { const u = rnd(); return u < .2 ? 0 : u < .2 + .8 * (1 + l) / 2 ? 1 : -1; });
    const energy = rnd() < .5 ? ENERGY_CHOICES[eLean] : ENERGY_CHOICES[Math.floor(rnd() * 4)];
    const votes = { automation: v[0], publicSharing: v[1], urbanConcentration: v[2], environmentalPriority: 0, energy };
    const before = s; s = applyProposalVotes(s, votes, 't');
    const eChanged = sameEnergyConfiguration(before.energy ? energyConfiguration(before.energy.counts) : emptyEnergyConfiguration(), energyConfiguration(s.energy.counts)) ? 0 : 1;
    // Old mapping: unlimited display-score layout.
    const oa = deriveExhibitionLayout(exhibitionDisplayScores(before.scores, before.guestCount)), ob = deriveExhibitionLayout(exhibitionDisplayScores(s.scores, s.guestCount));
    const oldC = (['nw', 'sw', 'se'] as const).filter(id => oa.tiers[id] !== ob.tiers[id]).length;
    const next = ladderStep(ladder, s, votes, foldSlotSeeds(seeds, votes));
    const a = ladderLayout(ladder.tiers, before.energy), b = ladderLayout(next.tiers, s.energy);
    const sites = exhibitionLayoutChanges(a, b).length;
    oldHist[Math.min(4, oldC + eChanged)]++; newHist[Math.min(4, sites + eChanged)]++; tierHist[sites]++;
    if (oldC) oldFlip++;
    if (g < 3) { oldFirst[g] += oldC + eChanged; newFirst[g] += sites + eChanged; }
    for (const id of ['nw', 'sw', 'se'] as const) if (next.tiers[id] !== ladder.tiers[id]) {
      moves++; const dir = next.tiers[id] - ladder.tiers[id]; if (last.get(id) === -dir) rev++; last.set(id, dir);
      if (Math.max(Math.abs(next.tiers[id]), Math.abs(ladder.tiers[id])) === 1) focal++; else district++;
    }
    ladder = next;
  }
}
const pct = (n: number) => `${(100 * n / N).toFixed(1)}%`;
console.log(`old (unlimited tiers at the same edges): ≥2 carriers ${pct(oldHist[2] + oldHist[3] + oldHist[4])}, ≥1 rung change ${pct(oldFlip)}, guests 1-3 ${oldFirst.map(n => (n / RUNS).toFixed(2))}`);
console.log(`ladder sites changed per submission: 0=${pct(tierHist[0])} 1=${pct(tierHist[1])} 2+=${pct(tierHist[2] ?? 0)}`);
console.log(`ladder incl. energy: ${newHist.map((n, i) => `${i}=${pct(n)}`).join(' ')}; guests 1-3 ${newFirst.map(n => (n / RUNS).toFixed(2))}`);
console.log(`rung moves: focal (±1) ${(100 * focal / moves).toFixed(0)}%, district (±2/±3) ${(100 * district / moves).toFixed(0)}%, reversals ${(100 * rev / moves).toFixed(1)}%`);
