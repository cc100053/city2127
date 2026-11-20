// DEV `?rotation` (src/devRotation.ts): every one of the 27 options plays as a valid live result whose outcome is the pressed option.
import assert from 'node:assert/strict';
import { localRotationRun, ROTATION_SET } from '../src/devRotation.ts';
import { parseSurveyEvent } from '../src/surveyView.ts';
import { residentResult } from '../src/surveyAtmosphere.ts';
import { conceptVisit, rotationLayout, rotationVisit } from '../src/rotationLayout.ts';

const wire = (type: string, view: unknown) => parseSurveyEvent(JSON.parse(JSON.stringify({ type, view })));
const run = localRotationRun();
assert.ok(wire('city-state-snapshot', run.snapshot()), 'the opening snapshot parses');
assert.deepEqual(run.shown, Object.fromEntries(ROTATION_SET.questions.map(q => [q.id, q.initial])));

let count = 0;
for (const question of ROTATION_SET.questions) for (const option of question.options) {
  const before = run.shown[question.id];
  const view = run.play(question.id, option.id);
  assert.ok(wire('city-state-updated', view), `${question.id}-${option.id} parses as a live result`);
  const proposal = view.latestProposal!;
  const outcome = proposal.rotation!.outcome;
  assert.equal(outcome.questionId, question.id, `${question.id}-${option.id} decides on the pressed question`);
  assert.equal(outcome.kind, before === option.id ? 'fallback' : 'swap');
  assert.equal(view.rotation!.shown[question.id], option.id, 'the pressed option now stands');
  // The pressed option either has its own close-up or flies to the concept hologram; it never visits another question.
  const visit = rotationVisit(proposal), concept = conceptVisit(proposal);
  if (visit) assert.equal(visit.questionId, question.id);
  if (concept) assert.equal(concept.questionId, question.id);
  if (!option.modelId) assert.ok(concept || outcome.kind === 'swap', `${question.id}-${option.id} without a model still shows something`);
  if (outcome.kind === 'fallback' && option.modelId) assert.equal(residentResult(proposal).kind, 'already-here');
  count++;
}
assert.equal(count, 27);

// Q01 drives NW through the same layout as a live run; jump sets an option without a result; reset restores the initial options.
assert.equal(rotationLayout(run.jump('Q01', 'C')).bands.nw, 'high');
assert.ok(wire('city-state-snapshot', run.jump('Q01', 'A')), 'a jump parses as a snapshot');
const reset = run.reset();
assert.equal(reset.guestCount, 0);
assert.equal(rotationLayout(reset).bands.nw, 'mixed');
assert.ok(wire('city-state-snapshot', reset));
console.log('dev rotation tests passed');
