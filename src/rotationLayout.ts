// Question rotation, city side (QUESTION_ROTATION_PLAN phase 2; Q01 here, Q02's lots in lotRuntime.ts): rotation proposals carry neutral axis votes, so the
// server's Meter layout never moves. The NW AUTO HUB instead shows the option the run holds for Q01, through the same ±1 focal
// path a version4 ladder rung uses. Views without `rotation` (version4 runs) keep the server layout untouched.
import { ladderLayout } from '../survey/src/shared/cityView.ts';
import type { ExhibitionLayout, ExhibitionProposal, ExhibitionView } from './surveyView.ts';
import type { ShotId } from './headlineCamera.ts';

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

/** Q02 option → the headline shot of its lot (headlineCamera SHOTS). */
export const Q02_SHOTS: Readonly<Record<string, ShotId>> = { A: 'q02:hydro', B: 'q02:flower', C: 'q02:farm' };

/** Q08 (question rotation): its three options share the SW lot. C is the event module shelf; A and B have no model yet (owner
 *  2026-11-19), so the lot stands vacant for them. Provisional result copy (owner copy pending, plan 5.2): option → [place, preference];
 *  the effect depends on whether the shelf left, arrived or the lot stayed empty (q08Result). */
export const Q08_RESULTS: Readonly<Record<string, readonly [string, string]>> = {
  A: ['南岸の空き地', 'あなたは、いつも同じ用途で使える場所を選びました。'],
  B: ['南岸の空き地', 'あなたは、イベントによって用途が変わる場所を選びました。'],
  C: ['南岸の活動モジュール棚', 'あなたは、イベントに合わせて場所も変わる過ごし方を選びました。'],
};

/** A rotation proposal's Q08 swap, or undefined. `shelf` is whether the shelf enters or leaves (A↔B changes nothing visible). */
export function q08Swap(proposal: ExhibitionProposal) {
  const outcome = proposal.rotation?.outcome;
  if (outcome?.kind !== 'swap' || outcome.questionId !== 'Q08' || !Q08_RESULTS[outcome.to] || !Q08_RESULTS[outcome.from]) return undefined;
  return { from: outcome.from, to: outcome.to, shelf: (outcome.from === 'C') !== (outcome.to === 'C') };
}

/** The result card for a Q08 swap: the shelf arriving, leaving, or the lot staying empty for a hall still to come. */
export function q08Result(swap: { from: string; to: string }) {
  const [place, preference] = Q08_RESULTS[swap.to];
  const effect = swap.to === 'C' ? 'お台場の南岸に、イベントに合わせて活動モジュールを運び入れる棚が現れました。'
    : swap.from === 'C' ? 'お台場の南岸から活動モジュールの棚が外れ、新しい施設を待つ空き地になりました。'
    : 'お台場の南岸は、新しい施設を待つ空き地のままです。';
  return { place, effect, preference };
}

/** The Q08 headline shot: the shelf's close-up when it enters or leaves; none (stay at hero) when A↔B leaves the lot empty. */
export const q08Shot = (swap: { shelf: boolean }): ShotId | null => swap.shelf ? 'sw:focal' : null;

/** Q03 (question rotation): its three options share the drawer housing lot. A is the drawer housing; B (shared car shelter) and C
 *  (district mobility hub and park) have no model yet (owner 2026-11-19), so the housing fades and its loop road stays. Provisional
 *  result copy (owner copy pending, plan 5.2): option → [place, preference]; the effect depends on whether the housing left, returned
 *  or the lot stayed empty (q03Result). */
export const Q03_RESULTS: Readonly<Record<string, readonly [string, string]>> = {
  A: ['車が引き出しになる住宅', 'あなたは、自分専用の乗り物を手元に置く暮らしを選びました。'],
  B: ['車が引き出しになる住宅の跡地', 'あなたは、同じ建物の住民と乗り物を分け合う暮らしを選びました。'],
  C: ['車が引き出しになる住宅の跡地', 'あなたは、地域の共有サービスで乗り物を使う暮らしを選びました。'],
};

/** A rotation proposal's Q03 swap, or undefined. `housing` is whether the drawer housing enters or leaves (B↔C changes nothing visible). */
export function q03Swap(proposal: ExhibitionProposal) {
  const outcome = proposal.rotation?.outcome;
  if (outcome?.kind !== 'swap' || outcome.questionId !== 'Q03' || !Q03_RESULTS[outcome.to] || !Q03_RESULTS[outcome.from]) return undefined;
  return { from: outcome.from, to: outcome.to, housing: (outcome.from === 'A') !== (outcome.to === 'A') };
}

/** The result card for a Q03 swap: the drawer housing returning, leaving, or the lot staying empty for a facility still to come. */
export function q03Result(swap: { from: string; to: string }) {
  const [place, preference] = Q03_RESULTS[swap.to];
  const effect = swap.to === 'A' ? 'お台場の西側に、車が引き出しのように収まる住宅が戻りました。'
    : swap.from === 'A' ? 'お台場の西側から車が引き出しになる住宅が外れ、環道だけが残る空き地になりました。'
    : 'お台場の西側の環道沿いは、新しい施設を待つ空き地のままです。';
  return { place, effect, preference };
}

/** The Q03 headline shot: the housing's close-up when it enters or leaves; none (stay at hero) when B↔C leaves the lot empty. */
export const q03Shot = (swap: { housing: boolean }): ShotId | null => swap.housing ? 'q03:housing' : null;

/** Q06 (question rotation): its three options share the pod-frame tower lot (the retired housing U site). B is the tower; A
 *  (new-material building) and C (module recycling hub) have no model yet (owner 2026-11-19), so the tower fades to lawn.
 *  Provisional result copy (owner copy pending, plan 5.2): option → [place, preference]; the effect depends on whether the tower left,
 *  returned or the lot stayed empty (q06Result). */
export const Q06_RESULTS: Readonly<Record<string, readonly [string, string]>> = {
  A: ['蛋形ポッドの塔の跡地', 'あなたは、古くなった物を新しい物に替える暮らしを選びました。'],
  B: ['蛋形ポッドの塔', 'あなたは、直しながら長く使い続ける暮らしを選びました。'],
  C: ['蛋形ポッドの塔の跡地', 'あなたは、物を誰かに譲り、中古品を使い回す暮らしを選びました。'],
};

/** A rotation proposal's Q06 swap, or undefined. `tower` is whether the pod-frame tower enters or leaves (A↔C changes nothing visible). */
export function q06Swap(proposal: ExhibitionProposal) {
  const outcome = proposal.rotation?.outcome;
  if (outcome?.kind !== 'swap' || outcome.questionId !== 'Q06' || !Q06_RESULTS[outcome.to] || !Q06_RESULTS[outcome.from]) return undefined;
  return { from: outcome.from, to: outcome.to, tower: (outcome.from === 'B') !== (outcome.to === 'B') };
}

/** The result card for a Q06 swap: the pod-frame tower returning, leaving, or the lot staying empty for a facility still to come. */
export function q06Result(swap: { from: string; to: string }) {
  const [place, preference] = Q06_RESULTS[swap.to];
  const effect = swap.to === 'B' ? 'お台場の西岸に、蛋形ポッドを抱えた塔が戻りました。'
    : swap.from === 'B' ? 'お台場の西岸から蛋形ポッドの塔が外れ、芝生の空き地になりました。'
    : 'お台場の西岸の芝生は、新しい施設を待つ空き地のままです。';
  return { place, effect, preference };
}

/** The Q06 headline shot: the tower's close-up when it enters or leaves; none (stay at hero) when A↔C leaves the lot empty. */
export const q06Shot = (swap: { tower: boolean }): ShotId | null => swap.tower ? 'q06:tower' : null;

/** Plan 3.4: what the guest's answer already shows at a visited site (a model that stands there): its headline shot and card place. */
export const ROTATION_VISITS: Readonly<Record<string, Readonly<Record<string, { shot: ShotId; place: string }>>>> = {
  Q01: { A: { shot: 'nw:focal-low', place: 'デックス西 AUTO HUB' }, B: { shot: 'nw:focal', place: 'デックス西 AUTO HUB' }, C: { shot: 'nw:focal', place: 'デックス西 AUTO HUB' } },
  Q02: Object.fromEntries(Object.entries(Q02_RESULTS).map(([option, [place]]) => [option, { shot: Q02_SHOTS[option], place }])),
  Q03: { A: { shot: 'q03:housing', place: Q03_RESULTS.A[0] } },
  Q06: { B: { shot: 'q06:tower', place: Q06_RESULTS.B[0] } },
  Q08: { C: { shot: 'sw:focal', place: Q08_RESULTS.C[0] } },
};

/**
 * Interim (owner 2026-11-20, until every option has a model): a rotation result that shows nothing new — a swap on a question without
 * models, vacant to vacant, or a fallback — and has no site to visit flies to the concept lot (`concept:lot`), where a hologram names the
 * guest's option for the outcome question. Undefined for every other result.
 */
export function conceptVisit(proposal: ExhibitionProposal) {
  const outcome = proposal.rotation?.outcome;
  if (!outcome || rotationVisit(proposal) || q01Swap(proposal) || q02Swap(proposal) || q03Swap(proposal)?.housing || q06Swap(proposal)?.tower || q08Swap(proposal)?.shelf) return undefined;
  const answer = proposal.answers.find(item => item.questionId === outcome.questionId);
  return answer && { questionId: answer.questionId, optionId: answer.optionId, label: answer.optionLabel, shot: 'concept:lot' as ShotId };
}

/** A rotation proposal that changed nothing visible but visits a site already showing the guest's answer: question, option, shot and place. */
export function rotationVisit(proposal: ExhibitionProposal) {
  const questionId = proposal.rotation?.visit;
  if (!questionId) return undefined;
  const optionId = proposal.answers.find(answer => answer.questionId === questionId)?.optionId;
  const visit = optionId ? ROTATION_VISITS[questionId]?.[optionId] : undefined;
  return visit && { questionId, optionId: optionId!, ...visit };
}
