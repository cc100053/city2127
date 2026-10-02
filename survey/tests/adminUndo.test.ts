import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { currentRun, lifecycleCommand, readLifecycle, recentEvents, setDisplayMode } from '../src/server/adminService.ts';
import { currentState, currentView } from '../src/server/answerService.ts';
import { createProposalSession, getProposalSession, submitProposal } from '../src/server/proposalService.ts';
import type { LifecycleData, ProposalRequest, ProposalSessionData, ServerEvent } from '../src/shared/protocol.ts';
import { exhibitionFixture, errorCode, ok, staff, startServer } from './surveyFixture.ts';

const dir = mkdtempSync(join(tmpdir(), 'admin-undo-'));
const dbPath = join(dir, 'survey.sqlite');
let { ctx } = exhibitionFixture(dbPath);
function request(session: ProposalSessionData, id: string, option = 0): ProposalRequest {
  return { submissionId: id, guestSessionId: session.session.id, expectedRevision: session.state.revision,
    answers: session.questions.map(q => ({ questionId: q.id, optionId: q.options[option].id })) };
}
const undo = (id: string) => lifecycleCommand(ctx, { command: 'undo-proposal', proposalId: id, expectedRevision: readLifecycle(ctx.db).revision });
try {
  assert.equal(currentRun(ctx).undoProposal, null);
  assert.equal(errorCode(undo('missing').response), 'lifecycle_blocked');
  assert.equal(errorCode(staff(ctx, 'undo-proposal')), 'bad_request', 'target ID is required');
  // More than the visible 64 proposals: Undo restores the full-history hash, not just the visible band.
  for (let i = 0; i < 65; i++) ok(submitProposal(ctx, request(ok(createProposalSession(ctx).response), `history-${i}`, i % 3)).response);
  const before = currentState(ctx), beforeView = currentView(ctx);
  const session = ok(createProposalSession(ctx).response);
  const proposalRequest = request(session, 'target', 2);
  const saved = ok(submitProposal(ctx, proposalRequest).response);
  const lcBefore = readLifecycle(ctx.db);
  assert.deepEqual(currentRun(ctx).undoProposal, { id: 'target', ordinal: 66 });
  assert.equal(errorCode(undo('history-64').response), 'lifecycle_blocked', 'cannot undo an earlier proposal');
  assert.equal(errorCode(lifecycleCommand(ctx, { command: 'undo-proposal', proposalId: 'target', expectedRevision: lcBefore.revision - 1 }).response), 'lifecycle_conflict');
  // Any failure rolls back marker, snapshot, audit and lifecycle together.
  ctx.db.exec(`CREATE TRIGGER fail_undo BEFORE INSERT ON admin_events WHEN NEW.type = 'proposal-undone'
    BEGIN SELECT RAISE(ABORT, 'injected undo failure'); END`);
  assert.throws(() => undo('target'), /injected undo failure/);
  assert.deepEqual(currentState(ctx), saved.state);
  assert.deepEqual(readLifecycle(ctx.db), lcBefore);
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM proposal_undos').get()?.n, 0);
  ctx.db.exec('DROP TRIGGER fail_undo');
  ok(setDisplayMode(ctx, { mode: 'night' }).response);
  const outcome = undo('target');
  const result = ok(outcome.response);
  assert.deepEqual(result.state, before, 'scores, EMA, sums, count, timestamp and run are exact');
  assert.deepEqual(currentView(ctx), beforeView, 'layout, full-history seeds, latest proposal and recent band are exact');
  assert.equal(result.lifecycle.totalGuestCount, 65);
  assert.equal(currentRun(ctx).answeredSessions, 65);
  assert.equal(currentRun(ctx).undoProposal, null, 'Undo cannot cascade into older proposals');
  assert.equal(errorCode(undo('target').response), 'lifecycle_blocked');
  assert.equal(errorCode(submitProposal(ctx, proposalRequest).response), 'proposal_undone', 'retry never resurrects a revoked result');
  assert.equal(errorCode(getProposalSession(ctx, session.session.id)), 'proposal_undone', 'reloaded Guest detects revocation');
  assert.equal(outcome.event?.type, 'city-state-snapshot');
  assert.equal(outcome.event?.type === 'city-state-snapshot' && outcome.event.undoneProposalId, 'target');
  assert.equal(outcome.event?.type === 'city-state-snapshot' && outcome.event.displayMode, 'night', 'Undo preserves staff lighting');
  assert.deepEqual(outcome.event?.view, beforeView);
  assert.equal(recentEvents(ctx).proposals[0].undoneAt !== null, true);
  assert.equal(recentEvents(ctx).admin[0].type, 'proposal-undone');
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM proposal_events').get()?.n, 66, 'original records are retained');
  assert.throws(() => ctx.db.exec("DELETE FROM proposal_undos WHERE proposal_id = 'target'"), /append-only/);
  ctx.db.close();
  ctx = exhibitionFixture(dbPath).ctx;
  assert.deepEqual(currentState(ctx), before);
  assert.deepEqual(currentView(ctx), beforeView, 'restart replay ignores revoked proposals');
  const next = ok(createProposalSession(ctx).response);
  assert.equal(currentRun(ctx).undoProposal, null);
  assert.equal(errorCode(undo('target').response), 'lifecycle_blocked', 'next Guest closes Undo');
  const replacement = ok(submitProposal(ctx, request(next, 'replacement', 1)).response);
  assert.equal(replacement.proposal.ordinal, 66, 'replacement counts as one new contribution');
  assert.equal(readLifecycle(ctx.db).totalGuestCount, 66);
  // A queued reset remains deferred through Undo and is applied by the next Guest start.
  ok(staff(ctx, 'reset-city', 'RESET'));
  ok(undo('replacement').response);
  assert.equal(readLifecycle(ctx.db).pendingReset, 'city');
  const reset = createProposalSession(ctx);
  assert.equal(reset.event?.type, 'run-reset');
  assert.equal(ok(reset.response).state.guestCount, 0);
  assert.equal(readLifecycle(ctx.db).totalGuestCount, 65);
  // A later unfinished Guest cannot expose the preceding proposal by staff ending its draft.
  ok(staff(ctx, 'guest-left'));
  assert.equal(currentRun(ctx).undoProposal, null);
  assert.equal(errorCode(undo('history-64').response), 'lifecycle_blocked');

  // Real HTTP/WebSocket publishing and the existing loopback + same-origin Admin boundary.
  const server = await startServer(ctx);
  const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
  const events: ServerEvent[] = [];
  socket.addEventListener('message', e => events.push(JSON.parse(String(e.data))));
  await new Promise<void>((resolve, reject) => { socket.addEventListener('open', () => resolve()); socket.addEventListener('error', reject); });
  try {
    const newSession = ok((await server.request<ProposalSessionData>('/api/proposal-sessions', {})).body);
    ok((await server.request('/api/proposals', request(newSession, 'http-target'))).body);
    const command = { command: 'undo-proposal', proposalId: 'http-target', expectedRevision: readLifecycle(ctx.db).revision };
    const forbidden = await fetch(`${server.base}/api/admin/lifecycle`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://other.example' }, body: JSON.stringify(command) });
    assert.equal(forbidden.status, 403);
    const response = await server.request<LifecycleData>('/api/admin/lifecycle', command);
    assert.equal(response.status, 200);
    for (let i = 0; i < 100 && !events.some(e => e.type === 'city-state-snapshot' && e.undoneProposalId); i++) await new Promise(r => setTimeout(r, 10));
    const frame = events.find(e => e.type === 'city-state-snapshot' && e.undoneProposalId === 'http-target');
    assert.deepEqual(frame?.view, JSON.parse(JSON.stringify(currentView(ctx))), 'wire JSON omits undefined optional fields');
    assert.equal((await server.request('/api/admin/lifecycle', command)).status, 409, 'duplicate command is stale');
    assert.equal(events.filter(e => e.type === 'city-state-snapshot' && e.undoneProposalId === 'http-target').length, 1);
  } finally { socket.close(); await server.close(); }
  const remote = await startServer(ctx, () => '192.168.1.2');
  try {
    assert.equal((await remote.request('/api/admin/lifecycle', { command: 'undo-proposal', proposalId: 'http-target', expectedRevision: readLifecycle(ctx.db).revision })).status, 403);
  } finally { await remote.close(); }
  console.log('PASS: Admin Undo — exact full-history restore, latest-only timing, atomic rollback, immutable audit/retry, restart, queued reset, HTTP/WebSocket and Admin access.');
} finally { ctx.db.close(); rmSync(dir, { recursive: true, force: true }); }
