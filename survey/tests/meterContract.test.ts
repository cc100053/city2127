import assert from 'node:assert/strict';
import { CITY_AXES } from '../src/shared/citySurveyState.ts';
import { parseQuestionSet, validateExhibitionQuestionSet } from '../src/survey/questionLoader.ts';
import { createProposalSession, submitProposal } from '../src/server/proposalService.ts';
import { currentView } from '../src/server/answerService.ts';
import { exhibitionFixture, ok } from './surveyFixture.ts';
import { answersForVotes, assertMeterQuestions, firstProposalGolden, METER_CONTRACTS, meterCombinations } from './meterContract.ts';

let cases = 0;
for (const votes of meterCombinations(METER_CONTRACTS)) {
  const { ctx } = exhibitionFixture();
  try {
    assertMeterQuestions(ctx.questions, CITY_AXES, METER_CONTRACTS);
    const session = ok(createProposalSession(ctx).response);
    assert.ok(session.questions.every(question => question.options.every(option => !('effects' in option))), 'public API hides effects');
    const request = { submissionId: `matrix-${cases}`, guestSessionId: session.session.id, expectedRevision: 0,
      answers: answersForVotes(METER_CONTRACTS, votes) };
    const outcome = submitProposal(ctx, request), result = ok(outcome.response);
    const golden = firstProposalGolden(METER_CONTRACTS, votes);
    assert.deepEqual(result.proposal.votes, votes);
    assert.deepEqual(result.state.voteSums, votes);
    assert.deepEqual(result.state.recentVotes, golden.recent);
    assert.deepEqual(result.state.scores, golden.scores);
    assert.equal(result.state.revision, 1);
    assert.equal(result.state.guestCount, 1);
    assert.deepEqual(result.proposal.afterLayout, golden.layout);
    const view = currentView(ctx);
    assert.ok(view.version === 2);
    assert.deepEqual(view.scores, golden.scores);
    assert.deepEqual(view.voteSums, votes);
    assert.deepEqual(view.recentVotes, golden.recent);
    assert.deepEqual(view.layout, golden.layout);
    assert.deepEqual(view.latestProposal, result.proposal);
    assert.deepEqual(outcome.event?.view, view);
    assert.deepEqual(result.proposal.cityChanges.map(change => change.socketId).sort(),
      METER_CONTRACTS.filter(meter => votes[meter.axis] !== 0).map(meter => meter.socket).sort());
    const row = ctx.db.prepare('SELECT votes_json, after_state_json FROM proposal_events WHERE id = ?').get(request.submissionId)!;
    assert.deepEqual(JSON.parse(String(row.votes_json)), votes);
    assert.deepEqual(JSON.parse(String(row.after_state_json)), result.state);
    assert.equal(ok(submitProposal(ctx, request).response).replayed, true);
    assert.equal(currentView(ctx).revision, 1, 'same-ID retry counted once');
    cases++;
  } finally { ctx.db.close(); }
}
const { ctx } = exhibitionFixture();
try {
  const rejects = (change: (set: typeof ctx.questions) => void) => {
    const set = structuredClone(ctx.questions);
    change(set);
    assert.throws(() => validateExhibitionQuestionSet(parseQuestionSet(set)));
  };
  rejects(set => { set.questions[0].id = set.questions[1].id; });
  rejects(set => { set.questions[0].text = ' '; });
  rejects(set => { set.questions[0].options[0].label = ''; });
  rejects(set => { set.questions[0].options[0].id = set.questions[0].options[1].id; });
  rejects(set => { set.questions.pop(); });
  rejects(set => { set.questions.push(structuredClone(set.questions[0])); });
  rejects(set => { set.questions[0].options[0].effects = { automation: -1, publicSharing: 1 }; });
  rejects(set => { set.questions[0].options[0].effects = { automation: 0 }; });
  rejects(set => { set.questions[0].options[0].effects = { publicSharing: -1 }; });
  rejects(set => { set.questions[0].options[0].effects = { automation: 2 }; });
  assert.throws(() => assertMeterQuestions(ctx.questions, CITY_AXES, METER_CONTRACTS.slice(1)), /Meter test definition/);
  const wrongMeaning = structuredClone(ctx.questions);
  for (const option of wrongMeaning.questions[0].options) option.effects.automation! *= -1;
  validateExhibitionQuestionSet(wrongMeaning); // Structurally valid but semantically reversed.
  assert.throws(() => assertMeterQuestions(wrongMeaning, CITY_AXES, METER_CONTRACTS), /assigned Meter/);
  const extra = { ...METER_CONTRACTS[0], axis: 'futureMeter' };
  assert.equal([...meterCombinations([extra])].length, 3, 'generic helpers accept future axes');
} finally { ctx.db.close(); }
console.log(`PASS: ${cases} real answer combinations → Meter state, persistence, layout, events and independent question semantics.`);
