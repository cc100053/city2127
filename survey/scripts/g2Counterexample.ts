// The former saturation counterexample: every neutral proposal now has a guest-related headline.
import assert from 'node:assert/strict';
import { initialExhibitionState, zeroScores, type ExhibitionVotes } from '../src/shared/citySurveyState.ts';
import { ENERGY_CHOICES, ENERGY_CHOICE_PART } from '../src/shared/energy.ts';
import { initialLadder, ladderLayout, ladderStep, pickGuestHeadline } from '../src/shared/cityView.ts';
import { applyProposalVotes, foldSlotSeeds } from '../src/survey/scoreEngine.ts';

for (const energy of ENERGY_CHOICES) {
  const votes: ExhibitionVotes = { ...zeroScores(), energy };
  let state = initialExhibitionState('g2-counterexample', 't0'), ladder = initialLadder();
  const seeds = zeroScores();
  for (let n = 1; n <= 40; n++) {
    const before = ladderLayout(ladder.tiers, state.energy, ladder.activity);
    state = applyProposalVotes(state, votes, `t${n}`);
    const next = ladderStep(ladder, state, votes, foldSlotSeeds(seeds, votes));
    const after = ladderLayout(next.tiers, state.energy, next.activity);
    assert.deepEqual(pickGuestHeadline(before, after, votes), { energy: true, part: ENERGY_CHOICE_PART[energy] }, `${energy} proposal ${n}`);
    const part = ENERGY_CHOICE_PART[energy];
    if (n > 1 && before.energy?.[part] === after.energy?.[part]) assert.notEqual(next.activity?.[part], ladder.activity?.[part]);
    ladder = next;
  }
}
{
  const votes: ExhibitionVotes = { ...zeroScores(), automation: 1, energy: 'rotor-storage' };
  const state = applyProposalVotes(initialExhibitionState('aligned', 't0'), votes, 't1');
  const next = ladderStep(initialLadder(), state, votes, zeroScores());
  assert.equal(next.activity, undefined, 'aligned site change does not toggle fallback');
}
console.log('G2: all four neutral saturation sequences retain a guest-related energy headline.');
