// DEV `?rotation`: a question-rotation run held in the page, no survey server. Each panel press is one simulated guest whose
// proposal swaps exactly the pressed question to the pressed option (or, when that option already stands, visits it), built with
// the server's own pure rotation functions, so the city, vote journey, camera and result card play it like a live result.
import raw from '../survey/src/survey/questions.rotation.v1.json' with { type: 'json' };
import { addTallies, crowdShare, emptyTallies, hasModel, initialRotation, rotationVisit, type RotationOutcome, type RotationSet, type RotationState, type RotationSubmission } from '../survey/src/shared/rotation.ts';
import { ladderLayout } from '../survey/src/shared/cityView.ts';
import type { ExhibitionProposal, ExhibitionView } from './surveyView.ts';

export const ROTATION_SET = raw as unknown as RotationSet;
const ZERO = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };

/**
 * The three questions the simulated guest also "answers": ones whose shown option has no model, answered with what they show, so they
 * are neither swap candidates nor visit candidates and the pressed question alone decides the outcome.
 * ponytail: once fewer than three other questions stand without a model this falls back to any others, which may then be visited instead.
 */
function fillers(set: RotationSet, state: RotationState, questionId: string) {
  const others = set.questions.map(q => q.id).filter(id => id !== questionId);
  const quiet = others.filter(id => !hasModel(set, id, state.shown[id]));
  return [...quiet, ...others.filter(id => !quiet.includes(id))].slice(0, 3);
}

export function localRotationRun(set: RotationSet = ROTATION_SET) {
  // A server run's revision equals its guest count; reset starts a new run id, as the server's run reset does.
  let state = initialRotation(set), tallies = emptyTallies(set), proposals: ExhibitionProposal[] = [], revision = 0, run = 1;
  const runId = () => `dev-rotation-${run}`;
  const layout = ladderLayout({ nw: 0, ne: 0, sw: 0, se: 0 });
  const view = (): ExhibitionView => ({
    version: 2, runId: runId(), revision, guestCount: revision, algorithmVersion: 2,
    voteSums: ZERO, recentVotes: ZERO, scores: ZERO, slotSeeds: ZERO, layout, recentProposals: proposals.slice(-64),
    ...(proposals.length ? { latestProposal: proposals.at(-1) } : {}),
    rotation: { version: set.version, shown: { ...state.shown }, changedAt: { ...state.changedAt } },
  });
  /** One guest choosing `optionId` for `questionId`: a direct swap, or a fallback visit when that option already stands. */
  const submit = (questionId: string, optionId: string) => {
    const question = set.questions.find(q => q.id === questionId);
    if (!question?.options.some(o => o.id === optionId)) throw new Error(`?rotation: no option ${questionId}-${optionId}`);
    const drawn = [questionId, ...fillers(set, state, questionId)], stamp = revision + 1;
    const answers = Object.fromEntries(drawn.map(id => [id, id === questionId ? optionId : state.shown[id]]));
    const submission: RotationSubmission = { stamp, drawn, answers };
    const from = state.shown[questionId];
    const outcome: RotationOutcome = from === optionId ? { kind: 'fallback', questionId } : { kind: 'swap', questionId, from, to: optionId };
    if (outcome.kind === 'swap') state = { shown: { ...state.shown, [questionId]: optionId }, changedAt: { ...state.changedAt, [questionId]: stamp } };
    tallies = addTallies(tallies, answers);
    const visit = rotationVisit(set, state, submission, outcome);
    const at = new Date().toISOString();
    const proposal: ExhibitionProposal = {
      id: `dev-${run}-${stamp}`, runId: runId(), guestSessionId: `dev-guest-${stamp}`, ordinal: stamp, questionSetVersion: set.version, algorithmVersion: 2,
      answers: drawn.map(id => {
        const q = set.questions.find(item => item.id === id)!;
        return { questionId: id, optionId: answers[id], questionText: q.text, optionLabel: q.options.find(o => o.id === answers[id])!.label };
      }),
      votes: ZERO, revisionBefore: revision, revisionAfter: stamp, submittedAt: at, beforeScores: ZERO, afterScores: ZERO,
      beforeLayout: layout, afterLayout: layout, cityChanges: [],
      rotation: { outcome, ...(visit ? { visit } : {}), shares: drawn.map(id => crowdShare(tallies, id, answers[id])) },
    };
    revision = stamp; proposals = [...proposals, proposal];
    return proposal;
  };
  return {
    get shown(): Readonly<Record<string, string>> { return state.shown; },
    /** The run as a reconnect would see it. */
    snapshot: () => view(),
    /** A live result: the pressed option's full guest sequence. */
    play: (questionId: string, optionId: string) => { submit(questionId, optionId); return view(); },
    /** The pressed option set at once; the caller sends it as a snapshot (no journey, transition or card). */
    jump: (questionId: string, optionId: string) => { submit(questionId, optionId); return view(); },
    /** A fresh run at the set's initial options. */
    reset: () => { state = initialRotation(set); tallies = emptyTallies(set); proposals = []; revision = 0; run += 1; return view(); },
  };
}
