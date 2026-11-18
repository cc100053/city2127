// Question rotation, city side (QUESTION_ROTATION_PLAN phase 2; Q01 here, Q02's lots in lotRuntime.ts): rotation proposals carry neutral axis votes, so the
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

/** Q02 lots and their provisional result copy (question rotation, plan 2.2/5.2; owner copy pending): option → [place, effect, preference]. */
export const Q02_RESULTS: Readonly<Record<string, readonly [string, string, string]>> = {
  A: ['西岸の水の棚田', 'お台場の西岸の海に、水の棚田が戻りました。', 'あなたは、使い慣れた暮らしを大切にしました。'],
  B: ['南部公園沖の湾の花', '南部公園の沖に、宇宙からの光の柱を受ける湾の花が開きました。', 'あなたは、評判を確かめてから新しい技術を試す暮らしを選びました。'],
  C: ['受電テラス農園', 'お台場の南側に受電テラス農園が加わり、膜の下に斜路で訪ねられる畑ができました。', 'あなたは、新しい技術をすぐに試す暮らしを選びました。'],
};

/** A rotation proposal's Q02 swap (the shown lot moved from one model to another), or undefined. */
export function q02Swap(proposal: ExhibitionProposal) {
  const outcome = proposal.rotation?.outcome;
  return outcome?.kind === 'swap' && outcome.questionId === 'Q02' && Q02_RESULTS[outcome.to] ? { from: outcome.from, to: outcome.to } : undefined;
}
