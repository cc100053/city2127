import assert from 'node:assert/strict';
import type { ProposalData, ProposalRequest, ProposalSessionData, ResetData, ServerEvent } from '../src/shared/protocol.ts';
import { currentState, currentView } from '../src/server/answerService.ts';
import { createProposalSession, parseProposalRequest, submitProposal } from '../src/server/proposalService.ts';
import { resetRun } from '../src/server/adminService.ts';
import { exhibitionFixture, ok, startServer } from './surveyFixture.ts';

function requestFor(ctx: ReturnType<typeof exhibitionFixture>['ctx'], session: ProposalSessionData, id: string): ProposalRequest {
  return {
    submissionId: id, guestSessionId: session.session.id, expectedRevision: currentState(ctx).revision,
    answers: session.questions.map(question => ({ questionId: question.id, optionId: question.options[1].id })),
  };
}

// Four unique, assigned answers are mandatory; the parser rejects non-object, extra, duplicate, and oversized IDs.
assert.equal(parseProposalRequest(null), undefined);
assert.equal(parseProposalRequest([]), undefined);
assert.equal(parseProposalRequest({ submissionId: 'x'.repeat(129) }), undefined);
assert.equal(parseProposalRequest({ submissionId: 's', guestSessionId: 'g', expectedRevision: 0, answers: [], extra: true }), undefined);
assert.equal(parseProposalRequest({ submissionId: 's', guestSessionId: 'g', expectedRevision: 0,
  answers: [{ questionId: 'q', optionId: 'a' }, { questionId: 'q', optionId: 'b' }, { questionId: 'r', optionId: 'c' }, { questionId: 't', optionId: 'd' }] }), undefined);

const { ctx, clock } = exhibitionFixture();
const originalRunId = currentState(ctx).runId;
let firstRequest: ProposalRequest | undefined, firstResult: ProposalData | undefined;
let questionIds: string[] | undefined;
for (let ordinal = 0; ordinal < 100; ordinal++) {
  const session = ok(createProposalSession(ctx));
  const ids = session.questions.map(question => question.id);
  questionIds ??= ids;
  assert.deepEqual(ids, questionIds, 'the same four questions are reusable by every guest');
  const request = requestFor(ctx, session, `proposal-${ordinal}`);
  const result = ok(submitProposal(ctx, request).response);
  assert.equal(result.replayed, false);
  assert.equal(result.proposal.ordinal, ordinal + 1);
  if (ordinal === 0) { firstRequest = request; firstResult = result; }
}
assert.ok(firstRequest && firstResult);
assert.equal(currentState(ctx).revision, 100);
const view = currentView(ctx);
assert.equal(view.version, 2);
if (view.version === 2) {
  assert.equal(view.recentProposals.length, 64);
  assert.equal(view.recentProposals[0].ordinal, 37);
  assert.equal(view.recentProposals.at(-1)?.ordinal, 100);
}

// Canonical retries ignore JSON answer order and return the exact saved result, including after reset.
const reordered = { ...firstRequest, answers: [...firstRequest.answers].reverse() };
const replay = ok(submitProposal(ctx, reordered).response);
assert.equal(replay.replayed, true);
assert.deepEqual(replay, { ...firstResult, replayed: true });
const changed = { ...firstRequest, answers: firstRequest.answers.map((answer, i) => ({ ...answer, optionId: i === 0 ? 'different-option' : answer.optionId })) };
const reusedId = submitProposal(ctx, changed).response;
assert.equal(!reusedId.ok && reusedId.error.code, 'answer_conflict');
const reset = ok(resetRun(ctx, { confirmation: 'RESET' }).response);
assert.equal(reset.previousRunId, originalRunId);
assert.equal(reset.state.revision, 0);
assert.deepEqual(ok(submitProposal(ctx, firstRequest).response), { ...firstResult, replayed: true });
assert.equal(currentState(ctx).runId, reset.state.runId);
assert.equal(currentState(ctx).revision, 0, 'retry after reset does not mutate the new run');

// Two sessions can read one revision; the transaction lets one proposal commit and rejects the stale one.
const leftSession = ok(createProposalSession(ctx)), rightSession = ok(createProposalSession(ctx));
const left = requestFor(ctx, leftSession, 'same-revision-left'), right = requestFor(ctx, rightSession, 'same-revision-right');
assert.equal(ok(submitProposal(ctx, left).response).state.revision, 1);
const stale = submitProposal(ctx, right).response;
assert.equal(!stale.ok && stale.error.code, 'revision_conflict');

// Expiry is enforced for a fresh session, with no event or snapshot mutation.
const expiring = ok(createProposalSession(ctx));
const expiredRequest = requestFor(ctx, expiring, 'expired-proposal');
clock.ms += 6 * 60 * 1000;
const expired = submitProposal(ctx, expiredRequest).response;
assert.equal(!expired.ok && expired.error.code, 'session_expired');
assert.equal(currentState(ctx).revision, 1);
assert.equal(Number(ctx.db.prepare("SELECT COUNT(*) AS n FROM proposal_events WHERE id = 'expired-proposal'").get()?.n), 0);

// An exception in the final snapshot write rolls the event and session update back together.
const rollbackFixture = exhibitionFixture();
const rollbackSession = ok(createProposalSession(rollbackFixture.ctx));
const rollbackRequest = requestFor(rollbackFixture.ctx, rollbackSession, 'rollback-proposal');
rollbackFixture.ctx.db.exec(`CREATE TRIGGER fail_exhibition_snapshot BEFORE UPDATE ON exhibition_snapshots
  BEGIN SELECT RAISE(ABORT, 'injected snapshot failure'); END`);
assert.throws(() => submitProposal(rollbackFixture.ctx, rollbackRequest), /injected snapshot failure/);
assert.equal(Number(rollbackFixture.ctx.db.prepare('SELECT COUNT(*) AS n FROM proposal_events').get()?.n), 0);
assert.equal(rollbackFixture.ctx.db.prepare('SELECT status FROM proposal_sessions WHERE id = ?').get(rollbackSession.session.id)?.status, 'reserved');
assert.equal(Number(rollbackFixture.ctx.db.prepare('SELECT revision FROM exhibition_snapshots').get()?.revision), 0);
rollbackFixture.ctx.db.close();

// Real HTTP and WebSocket path: commits broadcast once, retries do not, reset preserves v2.
async function monitor(url: string) {
  const socket = new WebSocket(url), queue: ServerEvent[] = [], waiters: ((event: ServerEvent) => void)[] = [];
  socket.addEventListener('message', message => {
    const event = JSON.parse(String(message.data)) as ServerEvent;
    const waiter = waiters.shift();
    if (waiter) waiter(event); else queue.push(event);
  });
  await new Promise<void>((resolve, reject) => { socket.addEventListener('open', () => resolve()); socket.addEventListener('error', reject); });
  const next = () => {
    const queued = queue.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise<ServerEvent>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timed out waiting for exhibition event')), 2000);
      waiters.push(event => { clearTimeout(timeout); resolve(event); });
    });
  };
  return { next, close: () => socket.close() };
}

const httpFixture = exhibitionFixture();
const server = await startServer(httpFixture.ctx);
const client = await monitor(`ws://127.0.0.1:${server.port}/ws`);
try {
  const snapshot = await client.next();
  assert.equal(snapshot.type, 'city-state-snapshot');
  assert.equal(snapshot.type === 'city-state-snapshot' && snapshot.view.version, 2);
  const created = await server.request<ProposalSessionData>('/api/proposal-sessions', {});
  assert.equal(created.status, 201);
  const session = ok(created.body);
  assert.equal((await server.request<ProposalSessionData>(`/api/proposal-sessions/${session.session.id}`)).status, 200);
  const request = requestFor(httpFixture.ctx, session, 'http-proposal');
  const submitted = await server.request<ProposalData>('/api/proposals', request);
  assert.equal(submitted.status, 201);
  const saved = ok(submitted.body);
  assert.equal(Number(httpFixture.ctx.db.prepare('SELECT COUNT(*) AS n FROM proposal_events').get()?.n), 1,
    'the commit is visible before the event is observed');
  const event = await client.next();
  assert.equal(event.type, 'city-state-updated');
  assert.equal(event.type === 'city-state-updated' && 'proposal' in event && event.proposal.id, 'http-proposal');
  assert.equal((await server.request<ProposalData>('/api/proposals', request)).status, 200, 'idempotent HTTP retry');
  const resetResponse = await server.request<ResetData>('/api/admin/reset', { confirmation: 'RESET' });
  assert.equal(resetResponse.status, 200);
  const resetEvent = await client.next();
  assert.equal(resetEvent.type, 'run-reset', 'retry does not emit a second proposal event');
  assert.equal(resetEvent.type === 'run-reset' && resetEvent.state.algorithmVersion, 2);
  assert.equal(ok(resetResponse.body).state.revision, 0);
  assert.equal(saved.state.revision, 1);
  console.log('PASS: reusable four-question proposals, canonical idempotency across reset, expiry, rollback, 100 guests, latest-64 history, HTTP and post-commit WebSocket updates.');
} finally {
  client.close();
  await server.close();
  httpFixture.ctx.db.close();
}
