// Guest agency sim (docs/handoffs/guest-agency.md): LEAD=1 node --experimental-strip-types artifacts/guest-agency/agencySim.ts
import { applyProposalVotes, foldSlotSeeds } from '../../survey/src/survey/scoreEngine.ts';
import { initialLadder, ladderStep, ladderGap, exhibitionStateDisplay, SOCKET_AXES, type ExhibitionLadder } from '../../survey/src/shared/cityView.ts';
import { initialExhibitionState, zeroScores } from '../../survey/src/shared/citySurveyState.ts';
import { ENERGY_CHOICES, energyConfiguration, emptyEnergyConfiguration, sameEnergyConfiguration } from '../../survey/src/shared/energy.ts';
const AX = ['automation', 'publicSharing', 'urbanConcentration'] as const, IDS = ['nw', 'sw', 'se'] as const;
const LEAD = Number(process.env.LEAD ?? 1);
function guestLed(l: ExhibitionLadder, after: any, votes: any, seeds: any): ExhibitionLadder {
  const d = exhibitionStateDisplay(after);
  const target = (id: typeof IDS[number]) => ladderGap(0, d[SOCKET_AXES[id]]);
  let best: any, bestScore = -1, dir = 0;
  for (let j = 0; j < 3; j++) {
    const id = IDS[(after.guestCount + j) % 3], v = votes[SOCKET_AXES[id]], t = l.tiers[id];
    const want = v !== 0 ? v : -Math.sign(t); // neutral: toward mixed
    if (!want) continue;
    const next = t + want;
    if (Math.abs(next) > 3 || Math.abs(next - target(id)) > LEAD) continue;
    const score = Math.abs(target(id) - t) * 4 + (v !== 0 ? 2 : 0);
    if (score > bestScore) { best = id; bestScore = score; dir = want; }
  }
  if (!best) return ladderStep(l, after, votes, seeds); // fall back to current rule
  const tiers = { ...l.tiers, [best]: l.tiers[best] + dir }, s = { ...l.seeds }, ax = SOCKET_AXES[best];
  if (Math.abs(tiers[best]) === 2 && s[ax] === 0) s[ax] = seeds[ax];
  return { tiers, seeds: s };
}
for (const mode of ['current', 'guestLed']) {
  let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  let N = 0, none = 0, aligned = 0, against = 0, energyOnly = 0, rev = 0, moves = 0, drift = 0, ext = 0, first3 = 0;
  for (let r = 0; r < 200; r++) {
    const lean = AX.map(() => rnd() * 1.6 - .8), eLean = Math.floor(rnd() * 4);
    let s = initialExhibitionState('sim', 't'), l = initialLadder(); const seeds = zeroScores(), last = new Map();
    for (let g = 0; g < 40; g++) {
      const v = lean.map(x => { const u = rnd(); return u < .2 ? 0 : u < .2 + .8 * (1 + x) / 2 ? 1 : -1; });
      const energy = rnd() < .5 ? ENERGY_CHOICES[eLean] : ENERGY_CHOICES[Math.floor(rnd() * 4)];
      const votes = { automation: v[0], publicSharing: v[1], urbanConcentration: v[2], environmentalPriority: 0, energy };
      const before = s; s = applyProposalVotes(s, votes, 't');
      const eCh = !sameEnergyConfiguration(before.energy ? energyConfiguration(before.energy.counts) : emptyEnergyConfiguration(), energyConfiguration(s.energy!.counts));
      const fs = foldSlotSeeds(seeds, votes);
      const next = mode === 'current' ? ladderStep(l, s, votes, fs) : guestLed(l, s, votes, fs);
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
      for (const id of IDS) { drift += Math.abs(next.tiers[id] - ladderGap(0, d[SOCKET_AXES[id]])); if (Math.abs(next.tiers[id]) === 3) ext++; }
      l = next;
    }
  }
  const p = (n: number) => (100 * n / N).toFixed(1) + '%';
  console.log(`${mode} LEAD=${LEAD}: site moved toward guest ${p(aligned)}, against guest ${p(against)}, energy-only ${p(energyOnly)}, nothing ${p(none)}; reversals ${(100*rev/moves).toFixed(0)}%; mean |tier-target| ${(drift/N/3).toFixed(2)}; tier ±3 share ${(100*ext/N/3).toFixed(0)}%; site moves in guests 1-3 ${(first3/600*100).toFixed(0)}%`);
}
