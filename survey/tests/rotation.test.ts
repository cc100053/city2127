import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRotationSetFile, parseRotationSet, QuestionSetError } from '../src/survey/questionLoader.ts';
import {
  CROWD_SHARE_MIN_VOTES, crowdShare, drawQuestions, emptyTallies, foldRotation, hasModel, initialRotation, RotationError, rotationStep, rotationVisit,
  swapVisible,
  type RotationSet, type RotationSubmission,
} from '../src/shared/rotation.ts';

// 1.1 — the shipped draft set: nine SURVEY_V2 questions, all drawn (owner 2026-11-18) though only Q01 and Q02 have three models (Q02's flower receiver is unsited).
const ROTATION_PATH = new URL('../src/survey/questions.rotation.v1.json', import.meta.url).pathname;
const shipped = loadRotationSetFile(ROTATION_PATH);
assert.equal(shipped.questions.length, 9);
assert.equal(shipped.draft, true);
assert.ok(shipped.questions.every(q => q.online));
assert.deepEqual(shipped.questions.filter(q => q.options.every(o => o.modelId)).map(q => q.id), ['Q01', 'Q02']);
assert.ok(shipped.questions.every(q => q.options.length === 3));
assert.deepEqual(drawQuestions(shipped, initialRotation(shipped)), ['Q01', 'Q02', 'Q03', 'Q04']);

const base = () => JSON.parse(readFileSync(ROTATION_PATH, 'utf8'));
const rejects = (mutate: (json: ReturnType<typeof base>) => void, pattern: RegExp) => {
  const json = base();
  mutate(json);
  assert.throws(() => parseRotationSet(json), (e: unknown) => e instanceof QuestionSetError && pattern.test((e as Error).message));
};
rejects(j => { delete j.kind; }, /kind "rotation"/);
rejects(j => { j.questions[1].id = 'Q01'; }, /duplicate question id/);
rejects(j => { j.questions[0].options.pop(); }, /exactly three options/);
rejects(j => { j.questions[0].options[1].id = 'A'; }, /duplicate option id/);
rejects(j => { j.questions[1].options[0].modelId = 'automation-hub-low'; }, /more than one option/);
rejects(j => { j.questions[0].initial = 'Z'; }, /initial must name one of its options/);
rejects(j => { j.questions[0].online = 'yes'; }, /online must be a boolean/);
rejects(j => { j.draft = undefined; }, /draft must be a boolean/);

// Fixture: six online questions in fixed order, one offline. Every site starts on option B.
const fixture = (online = 6): RotationSet => ({
  kind: 'rotation', version: 1, draft: true,
  questions: Array.from({ length: online + 1 }, (_, i) => ({
    id: `q${i + 1}`, text: `q${i + 1}`, online: i < online, initial: 'B',
    options: ['A', 'B', 'C'].map(id => ({ id, label: id, modelId: `m${i + 1}${id}`, lotId: `lot${i + 1}` })),
  })),
});
const set = fixture();
const start = initialRotation(set);
const answer = (drawn: string[], pick: (id: string) => string) => Object.fromEntries(drawn.map(id => [id, pick(id)]));

// 1.2 — fresh run: all ties, fixed order; offline q7 is never drawn.
assert.deepEqual(drawQuestions(set, start), ['q1', 'q2', 'q3', 'q4']);
assert.throws(() => drawQuestions(fixture(4), initialRotation(fixture(4))), RotationError);
// Least recently changed first, then fixed order.
const aged = { shown: start.shown, changedAt: { ...start.changedAt, q1: 5, q2: 3, q3: 9 } };
assert.deepEqual(drawQuestions(set, aged), ['q4', 'q5', 'q6', 'q2']);

// 1.3 — a direct swap B→A, exactly one site, the stalest differing one.
const drawn = drawQuestions(set, start);
const first = rotationStep(set, start, { stamp: 1, drawn, answers: answer(drawn, id => id === 'q1' ? 'B' : 'A') });
assert.deepEqual(first.outcome, { kind: 'swap', questionId: 'q2', from: 'B', to: 'A' });
assert.equal(first.state.shown.q2, 'A');
assert.equal(first.state.changedAt.q2, 1);
assert.deepEqual(Object.entries(first.state.shown).filter(([id, o]) => o !== start.shown[id]).map(([id]) => id), ['q2']);
// Non-adjacent jump: A straight to C, no intermediate state.
const jump = rotationStep(set, first.state, { stamp: 2, drawn, answers: answer(drawn, id => id === 'q2' ? 'C' : 'B') });
assert.deepEqual(jump.outcome, { kind: 'swap', questionId: 'q2', from: 'A', to: 'C' });
// No candidate: fallback names the stalest drawn question and leaves the city unchanged.
const same = rotationStep(set, first.state, { stamp: 2, drawn, answers: answer(drawn, id => first.state.shown[id]) });
assert.deepEqual(same.outcome, { kind: 'fallback', questionId: 'q1' });
assert.equal(same.state, first.state);

// Two stations reserve the same draw before either submits. Station A swaps q1; station B, judged
// on the city at its own submission, skips q1 (changed since its reservation) for the stalest untouched one.
const both = answer(drawn, () => 'C');
const stationA = rotationStep(set, start, { stamp: 1, drawn, answers: both });
assert.deepEqual(stationA.outcome, { kind: 'swap', questionId: 'q1', from: 'B', to: 'C' });
const stationB = rotationStep(set, stationA.state, { stamp: 2, drawn, answers: answer(drawn, id => id === 'q1' ? 'A' : 'C') });
assert.deepEqual(stationB.outcome, { kind: 'swap', questionId: 'q2', from: 'B', to: 'C' });
// Only the touched site still differs: B takes it rather than falling back.
const onlyTouched = rotationStep(set, stationA.state, { stamp: 2, drawn, answers: answer(drawn, id => id === 'q1' ? 'A' : 'B') });
assert.deepEqual(onlyTouched.outcome, { kind: 'swap', questionId: 'q1', from: 'C', to: 'A' });

// Submission validation: answers must match the draft's drawn questions and real options.
const bad = (submission: Partial<RotationSubmission>, pattern: RegExp) =>
  assert.throws(() => rotationStep(set, start, { stamp: 1, drawn, answers: both, ...submission }), (e: unknown) => e instanceof RotationError && pattern.test((e as Error).message));
bad({ answers: answer(['q1', 'q2', 'q3', 'q5'], () => 'A') }, /exactly the drawn questions/);
bad({ answers: answer(drawn.slice(0, 3), () => 'A') }, /exactly the drawn questions/);
bad({ answers: { ...both, q1: 'Z' } }, /no option "Z"/);
bad({ drawn: ['q1', 'q1', 'q2', 'q3'] }, /4 distinct questions/);
bad({ drawn: ['q1', 'q2', 'q3', 'q9'], answers: answer(['q1', 'q2', 'q3', 'q9'], () => 'A') }, /unknown rotation question "q9"/);

// 1.4 — fold: deterministic, Undo is "fold without that proposal", stamps strictly increase.
const submissions: RotationSubmission[] = [
  { stamp: 1, drawn: ['q1', 'q2', 'q3', 'q4'], answers: { q1: 'A', q2: 'C', q3: 'B', q4: 'B' } },
  { stamp: 2, drawn: ['q2', 'q3', 'q4', 'q5'], answers: { q2: 'C', q3: 'A', q4: 'A', q5: 'C' } },
  { stamp: 4, drawn: ['q1', 'q4', 'q5', 'q6'], answers: { q1: 'C', q4: 'B', q5: 'A', q6: 'B' } },
];
const full = foldRotation(set, submissions);
assert.deepEqual(full.outcomes.map(o => o.kind === 'swap' ? `${o.questionId}:${o.from}>${o.to}` : `fallback:${o.questionId}`), ['q1:B>A', 'q2:B>C', 'q5:B>A']);
assert.deepEqual(foldRotation(set, submissions), full);
const undone = foldRotation(set, [submissions[0], submissions[2]]);
assert.deepEqual(undone.outcomes.map(o => o.kind === 'swap' ? `${o.questionId}:${o.from}>${o.to}` : `fallback:${o.questionId}`), ['q1:B>A', 'q5:B>A']);
assert.equal(undone.state.shown.q2, 'B');
assert.deepEqual(undone.tallies.q2, { A: 0, B: 0, C: 1 });
assert.throws(() => foldRotation(set, [submissions[1], submissions[0]]), /increasing stamp order/);

// 1.5 — crowd share counts all four answers of every active proposal, own vote included.
assert.deepEqual(full.tallies.q4, { A: 1, B: 2, C: 0 });
assert.deepEqual(full.tallies.q7, { A: 0, B: 0, C: 0 });
assert.deepEqual(crowdShare(full.tallies, 'q4', 'B'), { questionId: 'q4', optionId: 'B', votes: 2, total: 3 });
assert.deepEqual(crowdShare(full.tallies, 'q4', 'B', 3), { questionId: 'q4', optionId: 'B', votes: 2, total: 3, percent: 67 });
assert.equal(CROWD_SHARE_MIN_VOTES, 10);
assert.deepEqual(crowdShare(emptyTallies(set), 'q1', 'A', 0), { questionId: 'q1', optionId: 'A', votes: 0, total: 0 });

// 3.4 — nothing visible changed: the fallback and the visit go to a drawn site already showing the guest's answer with a model.
const home = initialRotation(shipped); // Q01 B, Q02 A, Q03 A, Q04 A, Q05 A, Q06 B, Q07 A, Q08 C, Q09 A
const stale = { shown: home.shown, changedAt: { ...home.changedAt, Q01: 9, Q03: 4 } };
assert.equal(hasModel(shipped, 'Q01', 'B'), true);
assert.equal(hasModel(shipped, 'Q08', 'A'), false);
assert.equal(hasModel(shipped, 'Q04', 'A'), false);
const quiet = ['Q01', 'Q04', 'Q05', 'Q07'];
// Every drawn site already shows the guest's answer: the stalest with a model (Q01), not the stalest overall (Q04, no model).
const held = rotationStep(shipped, stale, { stamp: 10, drawn: quiet, answers: answer(quiet, id => home.shown[id]) });
assert.deepEqual(held.outcome, { kind: 'fallback', questionId: 'Q01' });
assert.equal(rotationVisit(shipped, held.state, { stamp: 10, drawn: quiet, answers: answer(quiet, id => home.shown[id]) }, held.outcome), 'Q01');
// A fallback with no model anywhere keeps the stalest question and visits nothing.
const bare = ['Q04', 'Q05', 'Q07', 'Q09'];
const empty = rotationStep(shipped, home, { stamp: 1, drawn: bare, answers: answer(bare, () => 'A') });
assert.deepEqual(empty.outcome, { kind: 'fallback', questionId: 'Q04' });
assert.equal(rotationVisit(shipped, empty.state, { stamp: 1, drawn: bare, answers: answer(bare, () => 'A') }, empty.outcome), undefined);
// A swap on a question without models changes nothing visible: the camera visits Q01, whose AUTO HUB already shows the answer.
const unseen = { stamp: 10, drawn: quiet, answers: { Q01: 'B', Q04: 'B', Q05: 'A', Q07: 'A' } };
const q04 = rotationStep(shipped, stale, unseen);
assert.deepEqual(q04.outcome, { kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' });
assert.equal(swapVisible(shipped, q04.outcome), false);
assert.equal(rotationVisit(shipped, q04.state, unseen, q04.outcome), 'Q01');
// Vacant↔vacant (Q08 A↔B) is invisible too; with no other drawn model matching, nothing is visited.
const vacant = ['Q08', 'Q04', 'Q05', 'Q07'];
const lot = { shown: { ...home.shown, Q08: 'A' }, changedAt: home.changedAt };
const ab = { stamp: 2, drawn: vacant, answers: { Q08: 'B', Q04: 'B', Q05: 'B', Q07: 'B' } };
const q08 = rotationStep(shipped, lot, ab);
assert.deepEqual(q08.outcome, { kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' });
assert.equal(rotationVisit(shipped, q08.state, ab, q08.outcome), undefined);
// A model entering or leaving is a visible swap: no visit.
const shelf = { stamp: 2, drawn: vacant, answers: { Q08: 'A', Q04: 'A', Q05: 'A', Q07: 'A' } };
const gone = rotationStep(shipped, home, shelf);
assert.deepEqual(gone.outcome, { kind: 'swap', questionId: 'Q08', from: 'C', to: 'A' });
assert.equal(swapVisible(shipped, gone.outcome), true);
assert.equal(rotationVisit(shipped, gone.state, shelf, gone.outcome), undefined);
// The fold hands each step its visit, so snapshots and Undo rebuild the same camera stop.
const visits: (string | undefined)[] = [];
foldRotation(shipped, [{ ...unseen, stamp: 1 }, { ...shelf, stamp: 2 }], (_, step) => visits.push(step.visit));
assert.deepEqual(visits, ['Q01', undefined]);

console.log('rotation tests passed');
