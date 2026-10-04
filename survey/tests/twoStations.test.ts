import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProposalData, ProposalSessionData, ServerEvent } from '../src/shared/protocol.ts';
import { currentState, currentView } from '../src/server/answerService.ts';
import { currentRun, lifecycleCommand, readLifecycle, settleStations } from '../src/server/adminService.ts';
import { createProposalSession, endStationSession, submitProposal } from '../src/server/proposalService.ts';
import { lanGuestUrls } from '../src/server/server.ts';
import { errorCode, exhibitionFixture, ok, staff, startServer } from './surveyFixture.ts';

const dir = mkdtempSync(join(tmpdir(), 'city2127-two-stations-'));
const fixture = exhibitionFixture(join(dir, 'survey.sqlite'));
let { ctx } = fixture;
const { clock } = fixture;
const start = (stationId: 'A' | 'B') => ok(createProposalSession(ctx, { stationId }).response);
const request = (session: ProposalSessionData, id: string, option = 2) => ({
  submissionId: id, guestSessionId: session.session.id, expectedRevision: session.state.revision,
  answers: session.questions.map(q => ({ questionId: q.id, optionId: q.options[option].id })),
});
try {
  for (const body of [null, [], { stationId: 'C' }, { stationId: 'A', extra: true }])
    assert.equal(errorCode(createProposalSession(ctx, body).response), 'bad_request');
  const a = start('A'), b = start('B');
  assert.equal(a.state.revision, b.state.revision);
  assert.equal(errorCode(createProposalSession(ctx, { stationId: 'A' }).response), 'lifecycle_blocked');
  assert.equal(errorCode(createProposalSession(ctx).response), 'lifecycle_blocked', 'cannot mix a legacy client into active stations');
  assert.equal(errorCode(submitProposal(ctx, { ...request(b, 'future'), expectedRevision: 99 }).response), 'revision_conflict');
  const ra = request(a, 'a'), rb = request(b, 'b', 0);
  const savedA = ok(submitProposal(ctx, ra).response);
  assert.equal(readLifecycle(ctx.db).phase, 'in_experience', 'B can still answer after A commits');
  const savedB = ok(submitProposal(ctx, rb).response);
  assert.deepEqual([savedA.state.guestCount, savedB.state.guestCount, savedB.proposal.revisionBefore], [1, 2, 1]);
  assert.equal(savedB.displayWaitMs, 10_000);
  assert.equal(savedB.proposal.stationId, 'B');
  assert.equal(ok(submitProposal(ctx, rb).response).replayed, true);
  assert.equal(errorCode(submitProposal(ctx, { ...rb, answers: ra.answers }).response), 'answer_conflict');
  assert.equal(errorCode(endStationSession(ctx, a.session.id).response), 'lifecycle_blocked', 'cannot skip a reading slot');
  const beforeRestart = currentView(ctx);
  ctx.db.close();
  ctx = exhibitionFixture(join(dir, 'survey.sqlite'), clock.ms).ctx;
  assert.deepEqual(currentView(ctx), beforeRestart, 'station attribution, schedule and state survive restart');
  assert.equal(currentRun(ctx).stations.length, 2);
  clock.ms += 10_000;
  ctx.now = () => new Date(clock.ms);
  ok(endStationSession(ctx, a.session.id).response);
  const nextA = start('A');
  assert.equal(currentRun(ctx).stations.find(s => s.stationId === 'B')?.sessionId, b.session.id);
  assert.equal(currentRun(ctx).undoProposal, null, 'a newer draft closes Undo');
  // An unnamed or stale Admin operation cannot cancel both stations (or a replacement guest).
  assert.equal(errorCode(staff(ctx, 'guest-left')), 'lifecycle_blocked');
  const cancelA = { command: 'guest-left', expectedRevision: readLifecycle(ctx.db).revision, guestSessionId: nextA.session.id };
  ok(lifecycleCommand(ctx, cancelA).response);
  assert.equal(errorCode(lifecycleCommand(ctx, cancelA).response), 'lifecycle_conflict');
  assert.equal(currentRun(ctx).stations[0]?.stationId, 'B');
  assert.equal(errorCode(submitProposal(ctx, request(nextA, 'cancelled')).response), 'session_expired');
  assert.equal(currentRun(ctx).undoProposal, null, 'ending the newer draft never reopens an older Undo');
  ok(staff(ctx, 'reset-city', 'RESET'));
  ok(staff(ctx, 'full-reset', 'FULL RESET'));
  assert.equal(errorCode(createProposalSession(ctx, { stationId: 'A' }).response), 'lifecycle_blocked');
  assert.equal(settleStations(ctx), undefined, 'B result protects the city until its experience ends');
  assert.equal(currentState(ctx).runId, a.state.runId);
  clock.ms += 10_000;
  const endedB = endStationSession(ctx, b.session.id);
  ok(endedB.response);
  assert.equal(endedB.event?.type, 'run-reset');
  assert.equal(readLifecycle(ctx.db).totalGuestCount, 0);
  assert.equal(currentView(ctx).revision, 0);
  settleStations(ctx);
  assert.equal(readLifecycle(ctx.db).phase, 'ready', 'the new run cannot inherit an old result phase');
  assert.equal(ok(submitProposal(ctx, rb).response).experienceFinished, true, 'late retry never reopens a finished station');
  assert.equal(currentState(ctx).revision, 0, 'late replay never mutates the new run');
  // Rollback leaves the event, snapshot and station reservation all intact.
  const unfinished = start('A'), survivor = start('B');
  ctx.db.exec(`CREATE TRIGGER fail_station_snapshot BEFORE UPDATE ON exhibition_snapshots
    BEGIN SELECT RAISE(ABORT, 'station rollback'); END`);
  assert.throws(() => submitProposal(ctx, request(unfinished, 'rollback')), /station rollback/);
  assert.equal(ctx.db.prepare('SELECT status FROM proposal_sessions WHERE id = ?').get(unfinished.session.id)?.status, 'reserved');
  assert.equal(ctx.db.prepare("SELECT id FROM proposal_events WHERE id = 'rollback'").get(), undefined);
  ctx.db.exec('DROP TRIGGER fail_station_snapshot');
  const pending = request(survivor, 'survivor');
  ok(submitProposal(ctx, pending).response);
  clock.ms += 10_000;
  ok(submitProposal(ctx, pending).response); // A lost response/reload resumes the original slot without extending the lease.
  ok(staff(ctx, 'reset-city', 'RESET'));
  clock.ms += 6000;
  settleStations(ctx);
  assert.equal(currentRun(ctx).stations.find(s => s.stationId === 'B'), undefined, 'a retry never extends the abandoned result lease');
  clock.ms += 5 * 60_000;
  assert.equal(settleStations(ctx)?.event?.type, 'run-reset', 'disconnect/expiry eventually releases the queued reset');
  assert.equal(readLifecycle(ctx.db).totalGuestCount, 1, 'city reset retains total participation');

  // Real parallel HTTP requests share one authoritative transaction sequence and broadcast once each.
  const server = await startServer(ctx);
  const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`), events: ServerEvent[] = [];
  socket.addEventListener('message', m => events.push(JSON.parse(String(m.data))));
  await new Promise<void>(resolve => socket.addEventListener('open', () => resolve()));
  try {
    const [left, right] = await Promise.all(['A', 'B'].map(stationId => server.request<ProposalSessionData>('/api/proposal-sessions', { stationId })));
    const requests = [request(ok(left.body), 'http-a'), request(ok(right.body), 'http-b')];
    const results = await Promise.all(requests.map(body => server.request<ProposalData>('/api/proposals', body)));
    assert.deepEqual(results.map(r => r.status), [201, 201]);
    assert.deepEqual(results.map(r => ok(r.body).proposal.ordinal).sort(), [1, 2]);
    const second = results.map(r => ok(r.body)).find(r => r.proposal.ordinal === 2)!;
    assert.equal(second.proposal.revisionBefore, 1);
    assert.equal(second.displayWaitMs, 10_000);
    await server.request('/api/proposals', requests[0]);
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(events.filter(e => e.type === 'city-state-updated').length, 2);
    const end = await server.request(`/api/proposal-sessions/${ok(left.body).session.id}/end`, {});
    assert.equal(end.status, 409, 'HTTP end respects display protection');
    assert.equal((await server.request('/api/proposal-sessions', { stationId: 'X' })).status, 400);
  } finally { socket.close(); await server.close(); }
  console.log('PASS: concurrent A/B, latest-state accumulation, station capacity, retries/recovery/restart, targeted Admin cancellation, atomic rollback, reset draining/expiry and real parallel HTTP/WebSocket.');
} finally { ctx.db.close(); rmSync(dir, { recursive: true, force: true }); }

const nic = (address: string, internal = false, family: 'IPv4' | 'IPv6' = 'IPv4') => ({ address, internal, family, netmask: '', mac: '', cidr: null }) as import('node:os').NetworkInterfaceInfo;
assert.deepEqual(lanGuestUrls('127.0.0.1', 8787, { en0: [nic('192.168.8.10')] }), [], 'loopback server prints no LAN URLs');
assert.deepEqual(lanGuestUrls('0.0.0.0', 8787, { lo0: [nic('127.0.0.1', true)], en0: [nic('fe80::1', false, 'IPv6'), nic('192.168.8.10')] }),
  ['http://192.168.8.10:8787/guest?station=A', 'http://192.168.8.10:8787/guest?station=B'], 'external IPv4 only');
assert.deepEqual(lanGuestUrls('192.168.8.10', 8790, {}), ['http://192.168.8.10:8790/guest?station=A', 'http://192.168.8.10:8790/guest?station=B']);
console.log('PASS: LAN Guest A/B URLs.');
