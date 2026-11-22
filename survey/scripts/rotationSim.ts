// Rotation gate (QUESTION_ROTATION_PLAN 1.7): node --experimental-strip-types survey/scripts/rotationSim.ts
// Real code: drawQuestions + rotationStep (the step foldRotation replays), 400 runs × 120 fake guests, stations A and B
// reserving from the same city and submitting in turn. Fake answers, not real people; initial options are
// drawn per run because the owner has not chosen them. Gate (launch configuration: all nine questions, owner
// 2026-11-18; original preferences): ≤ 2 % no-change. Model coverage and the skewed rows are reported for the
// owner, not gated: at nine or ten questions a few runs leave one model unshown all day.
import { drawQuestions, initialRotation, rotationStep, rotationVisit, swapVisible, type RotationSet, type RotationState } from '../src/shared/rotation.ts';
import { loadRotationSetFile } from '../src/survey/questionLoader.ts';

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
  const cells = [5, 9, 10].map(questions => {
    let unchanged = 0, allShown = 0, coverage = 0;
    for (let r = 0; r < RUNS; r++) {
      const result = run(questions, prefs, lean);
      unchanged += result.unchanged; coverage += result.coverage; if (result.coverage === 1) allShown++;
    }
    const rate = unchanged / RUNS;
    if (prefs === ORIGINAL && questions === 9 && rate > .02) gateFailed = true;
    return `${questions}q no-change ${(100 * rate).toFixed(1)}%, models shown ${(100 * coverage / RUNS).toFixed(1)}% (all in ${allShown}/${RUNS} runs)`;
  });
  console.log(`rotation sim ${label}: ${cells.join('; ')}`);
}
// Plan 3.4, reported only: what guests see with the shipped set as built today (null modelId = no model yet), original preferences.
{
  const shipped = loadRotationSetFile(new URL('../src/survey/questions.rotation.v1.json', import.meta.url).pathname);
  let visible = 0, visited = 0, recorded = 0;
  for (let r = 0; r < RUNS; r++) {
    const pref = shipped.questions.map(() => ORIGINAL[Math.floor(rnd() * ORIGINAL.length)]);
    let state = initialRotation(shipped), stamp = 0;
    for (let g = 0; g < GUESTS; g += 2) {
      const draws = [drawQuestions(shipped, state), drawQuestions(shipped, state)];
      for (const drawn of draws) {
        const personal = Math.floor(rnd() * 3);
        const answers = Object.fromEntries(drawn.map(id => [id, OPTIONS[rnd() < .4 ? personal : pick(pref[shipped.questions.findIndex(q => q.id === id)])]]));
        const submission = { stamp: ++stamp, drawn, answers }, step = rotationStep(shipped, state, submission);
        state = step.state;
        if (swapVisible(shipped, step.outcome)) visible++;
        else if (rotationVisit(shipped, state, submission, step.outcome)) visited++;
        else recorded++;
      }
    }
  }
  const pct = (n: number) => `${(100 * n / (RUNS * GUESTS)).toFixed(1)}%`;
  console.log(`rotation sim shipped set (models as built): visible change ${pct(visible)}, visits a model already showing the answer ${pct(visited)}, recorded only ${pct(recorded)}`);
}
if (gateFailed) { console.error('rotation gate failed: nine questions with original preferences need ≤ 2% no-change'); process.exit(1); }
