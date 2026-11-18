// Question rotation through the real proposal services (QUESTION_ROTATION_PLAN 1.4–1.6): reserve, reload,
// submit, two stations, Undo, restart and the run-kind guard, on the shipped nine-question draft set.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { currentView } from '../src/server/answerService.ts';
import { lifecycleCommand, readLifecycle } from '../src/server/adminService.ts';
import { createProposalSession, getProposalSession, submitProposal } from '../src/server/proposalService.ts';
import { createContext } from '../src/server/server.ts';
import type { ExhibitionCityView } from '../src/shared/cityView.ts';
import { DISPLAY_MS } from '../src/shared/displayTiming.ts';
import type { ProposalSessionData } from '../src/shared/protocol.ts';
import { CURRENT_EXHIBITION_QUESTIONS_PATH, errorCode, ok } from './surveyFixture.ts';

const ROTATION_PATH = new URL('../src/survey/questions.rotation.v1.json', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'city2127-rotation-'));
const clock = { ms: Date.parse('2026-11-18T10:00:00.000Z') };
const open = (name: string, questionsPath = ROTATION_PATH) => createContext({ dbPath: join(dir, name), questionsPath, now: () => new Date(clock.ms) });
const view = (ctx: ReturnType<typeof open>) => currentView(ctx) as ExhibitionCityView;
const answer = (session: ProposalSessionData, id: string, pick: (questionId: string) => string) => ({
  submissionId: id, guestSessionId: session.session.id, expectedRevision: session.state.revision,
  answers: session.questions.map(q => ({ questionId: q.id, optionId: pick(q.id) })),
});

try {
  let ctx = open('single.sqlite');
  assert.equal(ctx.rotation?.questions.length, 9);
  const fresh = view(ctx);
  assert.deepEqual(fresh.rotation?.shown, { Q01: 'B', Q02: 'A', Q03: 'A', Q04: 'A', Q05: 'A', Q06: 'B', Q07: 'A', Q08: 'C', Q09: 'A' });

  // Reserve: the four stalest questions in set order, stored and returned unchanged on reload.
  const first = ok(createProposalSession(ctx).response);
  assert.deepEqual(first.session.questionIds, ['Q01', 'Q02', 'Q03', 'Q04']);
  assert.deepEqual(first.questions.map(q => q.options.length), [3, 3, 3, 3]);
  assert.deepEqual(ok(getProposalSession(ctx, first.session.id)).questions, first.questions);
  const undrawn = answer(first, 'undrawn', () => 'A');
  undrawn.answers[3] = { questionId: 'Q09', optionId: 'A' };
  assert.equal(errorCode(submitProposal(ctx, undrawn).response), 'question_not_assigned');
  assert.equal(errorCode(submitProposal(ctx, { ...answer(first, 'wrong', () => 'A'), answers: answer(first, 'x', id => id === 'Q01' ? 'Z' : 'A').answers }).response), 'unknown_option');

  // Submit: Q01 (stalest, shows B) swaps straight to C; the Meter does not move.
  const saved = ok(submitProposal(ctx, answer(first, 'p1', () => 'C')).response);
  assert.deepEqual(saved.proposal.rotation?.outcome, { kind: 'swap', questionId: 'Q01', from: 'B', to: 'C' });
  assert.deepEqual(saved.proposal.rotation?.shares.map(s => [s.questionId, s.votes, s.total, s.percent]), [['Q01', 1, 1, undefined], ['Q02', 1, 1, undefined], ['Q03', 1, 1, undefined], ['Q04', 1, 1, undefined]]);
  assert.deepEqual(saved.proposal.votes, { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 });
  assert.deepEqual(saved.proposal.cityChanges, []);
  const afterFirst = view(ctx);
  assert.equal(afterFirst.rotation?.shown.Q01, 'C');
  assert.deepEqual(afterFirst.layout, fresh.layout);
  assert.deepEqual(afterFirst.latestProposal?.rotation, saved.proposal.rotation);
  assert.equal(ok(submitProposal(ctx, answer(first, 'p1', () => 'C')).response).replayed, true);
  assert.deepEqual(ok(submitProposal(ctx, answer(first, 'p1', () => 'C')).response).proposal.rotation, saved.proposal.rotation);

  // The next guest (after the reading slot) draws the stalest four, now skipping Q01.
  clock.ms += DISPLAY_MS;
  const second = ok(createProposalSession(ctx).response);
  assert.deepEqual(second.session.questionIds, ['Q02', 'Q03', 'Q04', 'Q05']);
  const secondSaved = ok(submitProposal(ctx, answer(second, 'p2', () => 'B')).response);
  assert.deepEqual(secondSaved.proposal.rotation?.outcome, { kind: 'swap', questionId: 'Q02', from: 'A', to: 'B' });
  assert.deepEqual(secondSaved.proposal.rotation?.shares[0], { questionId: 'Q02', optionId: 'B', votes: 1, total: 2 });

  // Undo removes the proposal from the fold; restart rebuilds the same city.
  ok(lifecycleCommand(ctx, { command: 'undo-proposal', proposalId: 'p2', expectedRevision: readLifecycle(ctx.db).revision }).response);
  assert.deepEqual(view(ctx).rotation, afterFirst.rotation);
  const beforeRestart = view(ctx);
  ctx.db.close();
  ctx = open('single.sqlite');
  assert.deepEqual(view(ctx), beforeRestart);

  // The four-axis set refuses a run that already holds rotation proposals, until the city is reset.
  ctx.db.close();
  clock.ms += DISPLAY_MS;
  const axes = open('single.sqlite', CURRENT_EXHIBITION_QUESTIONS_PATH);
  assert.equal(axes.rotation, undefined);
  assert.equal(errorCode(createProposalSession(axes).response), 'lifecycle_blocked');
  assert.equal(view(axes).rotation, undefined);
  axes.db.close();

  // Two stations reserve the same four; A swaps Q01, B (judged on A's city) skips it for Q02.
  const two = open('two.sqlite');
  const a = ok(createProposalSession(two, { stationId: 'A' }).response), b = ok(createProposalSession(two, { stationId: 'B' }).response);
  assert.deepEqual(a.session.questionIds, b.session.questionIds);
  assert.deepEqual(ok(submitProposal(two, answer(a, 'a1', () => 'A')).response).proposal.rotation?.outcome, { kind: 'swap', questionId: 'Q01', from: 'B', to: 'A' });
  assert.deepEqual(ok(submitProposal(two, answer(b, 'b1', () => 'C')).response).proposal.rotation?.outcome, { kind: 'swap', questionId: 'Q02', from: 'A', to: 'C' });
  assert.deepEqual(view(two).rotation?.changedAt, { Q01: 1, Q02: 2, Q03: 0, Q04: 0, Q05: 0, Q06: 0, Q07: 0, Q08: 0, Q09: 0 });
  two.db.close();
  console.log('rotation flow tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
