// Deterministic leaning-guest simulation; this is not evidence of real guest behaviour.
import { applyProposalVotes, foldSlotSeeds } from '../src/survey/scoreEngine.ts';
import { initialLadder, ladderStep, ladderGap, exhibitionStateDisplay, SOCKET_AXES } from '../src/shared/cityView.ts';
import { initialExhibitionState, zeroScores } from '../src/shared/citySurveyState.ts';
import { ENERGY_CHOICES, energyConfiguration, emptyEnergyConfiguration, sameEnergyConfiguration } from '../src/shared/energy.ts';
const AX = ['automation', 'publicSharing', 'urbanConcentration'] as const, IDS = ['nw', 'sw', 'se'] as const;
let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let N = 0, none = 0, aligned = 0, against = 0, energyOnly = 0, rev = 0, moves = 0, drift = 0, maxDrift = 0, ext = 0, first3 = 0;
for (let r = 0; r < 200; r++) {
  const lean = AX.map(() => rnd() * 1.6 - .8), eLean = Math.floor(rnd() * 4);
  let s = initialExhibitionState('sim', 't'), l = initialLadder(); const seeds = zeroScores(), last = new Map();
  for (let g = 0; g < 40; g++) {
    const v = lean.map(x => { const u = rnd(); return u < .2 ? 0 : u < .2 + .8 * (1 + x) / 2 ? 1 : -1; });
    const energy = rnd() < .5 ? ENERGY_CHOICES[eLean] : ENERGY_CHOICES[Math.floor(rnd() * 4)];
    const votes = { automation: v[0], publicSharing: v[1], urbanConcentration: v[2], environmentalPriority: 0, energy };
    const before = s; s = applyProposalVotes(s, votes, 't');
    const beforeEnergy = before.energy ? energyConfiguration(before.energy.counts) : emptyEnergyConfiguration();
    const fs = foldSlotSeeds(seeds, votes);
    const next = ladderStep(l, s, votes, fs);
    const eCh = !sameEnergyConfiguration({ ...beforeEnergy, activity: l.activity }, { ...energyConfiguration(s.energy!.counts), activity: next.activity });
    N++;
    const moved = IDS.find(id => next.tiers[id] !== l.tiers[id]);
    if (!moved) { if (eCh) energyOnly++; else none++; }
    else {
      const dir = next.tiers[moved] - l.tiers[moved], vv = votes[SOCKET_AXES[moved]];
      if (vv === dir || (vv === 0 && Math.abs(next.tiers[moved]) < Math.abs(l.tiers[moved]))) aligned++; else against++;
      moves++; if (last.get(moved) === -dir) rev++; last.set(moved, dir);
      if (g < 3) first3++;
    }
    const d = exhibitionStateDisplay(s);
    for (const id of IDS) { const distance = Math.abs(next.tiers[id] - ladderGap(0, d[SOCKET_AXES[id]])); drift += distance; maxDrift = Math.max(maxDrift, distance); if (Math.abs(next.tiers[id]) === 3) ext++; }
    l = next;
  }
}
const p = (n: number) => (100 * n / N).toFixed(1) + '%';
console.log(`guest-led LEAD=1: site moved toward guest ${p(aligned)}, against guest ${p(against)}, energy-only ${p(energyOnly)}, nothing ${p(none)}; reversals ${(100*rev/moves).toFixed(0)}%; mean |tier-target| ${(drift/N/3).toFixed(2)}; max |tier-target| ${maxDrift}; tier ±3 share ${(100*ext/N/3).toFixed(0)}%; site moves in guests 1-3 ${(first3/600*100).toFixed(0)}%`);
if (aligned / N < .95 || against / N > .03) throw new Error("Guest agency simulation gate failed");
