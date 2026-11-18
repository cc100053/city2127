// Rotation gate (QUESTION_ROTATION_PLAN 1.7): node --experimental-strip-types survey/scripts/rotationSim.ts
// Real code: drawQuestions + rotationStep (the step foldRotation replays), 400 runs × 120 fake guests, stations A and B
// reserving from the same city and submitting in turn. Fake answers, not real people; initial options are
// drawn per run because the owner has not chosen them. Gate (launch configuration: five online questions,
// original preferences): ≤ 2 % no-change and every model shown in every run. Ten questions and the skewed rows
// are reported for the owner, not gated: at ten questions a few runs leave one model unshown all day.
import { drawQuestions, initialRotation, rotationStep, type RotationSet, type RotationState } from '../src/shared/rotation.ts';

let seed = 20261118; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const pick = (weights: readonly number[]) => { let u = rnd(); for (let i = 0; i < weights.length; i++) if ((u -= weights[i]) < 0) return i; return weights.length - 1; };
const OPTIONS = ['A', 'B', 'C'] as const;
const ORIGINAL = [[.6, .25, .15], [.2, .5, .3], [.15, .25, .6], [.34, .33, .33], [.45, .45, .10]] as const;
const DISTRIBUTIONS = [
  { label: 'original prefs + 40% lean', prefs: ORIGINAL, lean: .4 },
  { label: 'all 70/20/10 + 40% lean', prefs: [[.7, .2, .1]], lean: .4 },
  { label: 'all 70/20/10, no lean', prefs: [[.7, .2, .1]], lean: 0 },
  { label: 'all 85/10/5, no lean', prefs: [[.85, .1, .05]], lean: 0 },
] as const;
const RUNS = 400, GUESTS = 120;

function run(questions: number, prefs: readonly (readonly number[])[], lean: number) {
  const set: RotationSet = {
    kind: 'rotation', version: 1, draft: true,
    questions: Array.from({ length: questions }, (_, i) => ({
      id: `q${i + 1}`, text: '', online: true, initial: OPTIONS[Math.floor(rnd() * 3)],
      options: OPTIONS.map(id => ({ id, label: id, modelId: `q${i + 1}${id}`, lotId: `lot${i + 1}` })),
    })),
  };
  const pref = set.questions.map(() => prefs[Math.floor(rnd() * prefs.length)]);
  let state: RotationState = initialRotation(set), stamp = 0, unchanged = 0;
  const shown = new Set(set.questions.map(q => `${q.id}${q.initial}`));
  for (let g = 0; g < GUESTS; g += 2) {
    // Both stations reserve from the same city, then A submits and B is judged on the city A left.
    const draws = [drawQuestions(set, state), drawQuestions(set, state)];
    for (const drawn of draws) {
      const personal = Math.floor(rnd() * 3);
      const answers = Object.fromEntries(drawn.map(id => {
        const k = Number(id.slice(1)) - 1;
        return [id, OPTIONS[rnd() < lean ? personal : pick(pref[k])]];
      }));
      const step = rotationStep(set, state, { stamp: ++stamp, drawn, answers });
      state = step.state;
      if (step.outcome.kind === 'fallback') unchanged++;
      else shown.add(`${step.outcome.questionId}${step.outcome.to}`);
    }
  }
  return { unchanged: unchanged / GUESTS, coverage: shown.size / (questions * 3) };
}

let gateFailed = false;
for (const { label, prefs, lean } of DISTRIBUTIONS) {
  const cells = [5, 10].map(questions => {
    let unchanged = 0, allShown = 0, coverage = 0;
    for (let r = 0; r < RUNS; r++) {
      const result = run(questions, prefs, lean);
      unchanged += result.unchanged; coverage += result.coverage; if (result.coverage === 1) allShown++;
    }
    const rate = unchanged / RUNS;
    if (prefs === ORIGINAL && questions === 5 && (rate > .02 || allShown < RUNS)) gateFailed = true;
    return `${questions}q no-change ${(100 * rate).toFixed(1)}%, models shown ${(100 * coverage / RUNS).toFixed(1)}% (all in ${allShown}/${RUNS} runs)`;
  });
  console.log(`rotation sim ${label}: ${cells.join('; ')}`);
}
if (gateFailed) { console.error('rotation gate failed: five questions with original preferences need ≤ 2% no-change and every model shown in every run'); process.exit(1); }
