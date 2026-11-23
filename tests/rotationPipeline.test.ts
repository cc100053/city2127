// Question rotation reaches the city (QUESTION_ROTATION_PLAN phase 1): the real survey services' events
// parse on the root side; rotation proposals keep the Meter layout, and the city draws Q01 on NW (phase 2, src/rotationLayout.ts).
import assert from './assert.ts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSurveyEvent, type ExhibitionView } from '../src/surveyView.ts';
import { residentResult } from '../src/surveyAtmosphere.ts';
import { rotationLayout } from '../src/rotationLayout.ts';
import { createContext } from '../survey/src/server/server.ts';
import { createProposalSession, submitProposal } from '../survey/src/server/proposalService.ts';
import { ok } from '../survey/tests/surveyFixture.ts';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';

const dir = mkdtempSync(join(tmpdir(), 'city2127-rotation-pipeline-'));
try {
  const clock = { ms: Date.parse('2026-11-18T10:00:00.000Z') };
  const ctx = createContext({ dbPath: join(dir, 'survey.sqlite'), questionsPath: new URL('../survey/src/survey/questions.rotation.v1.json', import.meta.url).pathname, now: () => new Date(clock.ms) });
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
  assert.equal(residentResult(view.latestProposal!).kind, 'recorded', 'without renderer evidence the card makes no visual claim');
  assert.deepEqual(view.layout.tiers, { nw: 0, ne: 0, sw: 0, se: 0 }, 'neutral votes: the Meter layout never moves');
  assert.equal(rotationLayout(view).bands.nw, 'high', 'Q01 B→C: NW renders the +1 hub');
  assert.match(residentResult(view.latestProposal!, [{ socketId: 'nw', focal: true, district: false }]).effect, /自律サービスの端口が増えました/);

  // Tampered rotation fields are rejected like any malformed proposal.
  const tamper = (edit: (event: typeof wire) => void) => { const copy = JSON.parse(JSON.stringify(wire)); edit(copy); return parseSurveyEvent(copy); };
  assert.equal(tamper(e => { e.view.latestProposal.rotation.outcome.to = 'A'; }), null);
  assert.equal(tamper(e => { e.view.latestProposal.votes.automation = 1; }), null);
  assert.equal(tamper(e => { e.view.rotation.changedAt = {}; }), null);
  assert.equal(tamper(e => { e.view.latestProposal.rotation.shares.pop(); }), null);
  // Plan 3.4: a visible swap visits nothing; a visit must name one of the guest's own questions.
  assert.equal(view.latestProposal?.rotation?.visit, undefined);
  assert.equal(tamper(e => { e.view.latestProposal.rotation.visit = 'Q09'; }), null);
  assert.ok(tamper(e => { e.view.latestProposal.rotation.visit = 'Q02'; }));

  // Q01 returns once it is the least recently changed question; the direct C→A jump then plays as NW +1 → −1.
  let latest = view, guest = 1;
  const answerAll = (pick: (questionId: string, shown: string, drawn: string[]) => string) => {
    clock.ms += DISPLAY_MS;
    const s = ok(createProposalSession(ctx).response);
    const result = submitProposal(ctx, {
      submissionId: `p${++guest}`, guestSessionId: s.session.id, expectedRevision: s.state.revision,
      answers: s.questions.map(q => ({ questionId: q.id, optionId: pick(q.id, latest.rotation!.shown[q.id], s.questions.map(d => d.id)) })),
    });
    ok(result.response);
    const next = parseSurveyEvent(JSON.parse(JSON.stringify(result.event)));
    assert.ok(next && 'view' in next);
    latest = next.view as ExhibitionView;
    return s.questions.map(q => q.id);
  };
  const other = (shown: string) => shown === 'A' ? 'B' : 'A';
  // Later guests change other sites until Q01 is drawn again; that guest asks only for Q01 A.
  let waited = 0;
  while (!answerAll((id, shown, drawn) => drawn.includes('Q01') ? (id === 'Q01' ? 'A' : shown) : other(shown)).includes('Q01')) {
    assert.equal(rotationLayout(latest).bands.nw, 'high', 'other swaps leave NW alone');
    assert.ok(++waited < 9, 'Q01 is drawn again once it is the stalest');
  }
  assert.ok(waited >= 4, 'a just-swapped question waits for others to change');
  assert.deepEqual(latest.latestProposal?.rotation?.outcome, { kind: 'swap', questionId: 'Q01', from: 'C', to: 'A' });
  assert.equal(rotationLayout(latest).tiers.nw, -1, 'Q01 C→A: NW renders the −1 hub directly');
  assert.match(residentResult(latest.latestProposal!, [{ socketId: 'nw', focal: true, district: false, low: true }]).effect, /人に相談できる窓口が増えました/);
  ctx.db.close();
  console.log('rotation pipeline tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
