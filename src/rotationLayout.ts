// Question rotation, city side (QUESTION_ROTATION_PLAN phase 2, Q01 only): rotation proposals carry neutral axis votes, so the
// server's Meter layout never moves. The NW AUTO HUB instead shows the option the run holds for Q01, through the same ±1 focal
// path a version4 ladder rung uses. Views without `rotation` (version4 runs) keep the server layout untouched.
import { ladderLayout } from '../survey/src/shared/cityView.ts';
import type { ExhibitionLayout, ExhibitionProposal, ExhibitionView } from './surveyView.ts';

/** Q01 option → NW focal rung: A human window (−1), B human–machine (0), C fully automated with drones (+1). */
export const Q01_NW_TIERS: Readonly<Record<string, number>> = { A: -1, B: 0, C: 1 };

/** `layout` with the NW focal site at the rung of Q01 option `option`; an unknown option leaves it unchanged. */
export function withQ01(layout: ExhibitionLayout, option: string | undefined): ExhibitionLayout {
  const tier = option === undefined ? undefined : Q01_NW_TIERS[option];
  if (tier === undefined) return layout;
  const nw = ladderLayout({ nw: tier, ne: 0, sw: 0, se: 0 });
  return { ...layout, bands: { ...layout.bands, nw: nw.bands.nw }, tiers: { ...layout.tiers, nw: tier }, automatedPorts: nw.automatedPorts };
}

/** The layout the city renders: the server layout, with Q01's shown option on NW in a rotation run (identical object otherwise). */
export function rotationLayout(view: ExhibitionView): ExhibitionLayout {
  return view.rotation ? withQ01(view.layout, view.rotation.shown.Q01) : view.layout;
}

/** A rotation proposal's Q01 swap as NW bands and ports, or undefined when it swapped another question or fell back. */
export function q01Swap(proposal: ExhibitionProposal) {
  const outcome = proposal.rotation?.outcome;
  if (outcome?.kind !== 'swap' || outcome.questionId !== 'Q01') return undefined;
  const before = withQ01(proposal.beforeLayout, outcome.from), after = withQ01(proposal.afterLayout, outcome.to);
  return before === proposal.beforeLayout || after === proposal.afterLayout ? undefined : { from: outcome.from, to: outcome.to, before, after };
}
