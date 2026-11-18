// Question rotation reaches the city (QUESTION_ROTATION_PLAN phase 1): the real survey services' events
// parse on the root side; rotation proposals keep the Meter layout and fall back to the generic result card.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSurveyEvent, type ExhibitionView } from '../src/surveyView.ts';
import { residentResult } from '../src/surveyAtmosphere.ts';
import { createContext } from '../survey/src/server/server.ts';
import { createProposalSession, submitProposal } from '../survey/src/server/proposalService.ts';
import { ok } from '../survey/tests/surveyFixture.ts';

const dir = mkdtempSync(join(tmpdir(), 'city2127-rotation-pipeline-'));
try {
  const ctx = createContext({ dbPath: join(dir, 'survey.sqlite'), questionsPath: new URL('../survey/src/survey/questions.rotation.v1.json', import.meta.url).pathname });
  const session = ok(createProposalSession(ctx).response);
  const outcome = submitProposal(ctx, {
    submissionId: 'p1', guestSessionId: session.session.id, expectedRevision: session.state.revision,
    answers: session.questions.map(q => ({ questionId: q.id, optionId: 'C' })),
  });
  ok(outcome.response);
  const wire = JSON.parse(JSON.stringify(outcome.event));
  const parsed = parseSurveyEvent(wire);
  assert.ok(parsed && 'view' in parsed && parsed.kind === 'city-state-updated', 'rotation update parses');
  const view = parsed.view as ExhibitionView;
  assert.equal(view.rotation?.shown.Q01, 'C');
  assert.deepEqual(view.latestProposal?.rotation?.outcome, { kind: 'swap', questionId: 'Q01', from: 'B', to: 'C' });
  assert.equal(residentResult(view.latestProposal!).kind, 'recorded', 'no Meter change: generic result card until phase 2');

  // Tampered rotation fields are rejected like any malformed proposal.
  const tamper = (edit: (event: typeof wire) => void) => { const copy = JSON.parse(JSON.stringify(wire)); edit(copy); return parseSurveyEvent(copy); };
  assert.equal(tamper(e => { e.view.latestProposal.rotation.outcome.to = 'A'; }), null);
  assert.equal(tamper(e => { e.view.latestProposal.votes.automation = 1; }), null);
  assert.equal(tamper(e => { e.view.rotation.changedAt = {}; }), null);
  assert.equal(tamper(e => { e.view.latestProposal.rotation.shares.pop(); }), null);
  ctx.db.close();
  console.log('rotation pipeline tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
