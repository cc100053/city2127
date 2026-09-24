import assert from 'node:assert/strict';
import type { AdminCurrentRun, AdminEventsData, AnswerData, CitySurveyState, GuestQuestionData, HealthData, ResetData } from './protocolTypes.ts';
import { isLoopbackAddress } from '../src/server/adminService.ts';
import { answerNext, fixture, ok, startServer } from './surveyFixture.ts';

assert.ok(isLoopbackAddress('127.0.0.1') && isLoopbackAddress('::1') && isLoopbackAddress('::ffff:127.0.0.1'));
assert.ok(!isLoopbackAddress('192.168.1.20') && !isLoopbackAddress('10.0.0.5') && !isLoopbackAddress('::ffff:192.168.1.20') && !isLoopbackAddress(undefined));

const { ctx } = fixture();
answerNext(ctx, 'solar-canopy');
answerNext(ctx, 'autonomous-transit');
const local = await startServer(ctx);
const lan = await startServer(ctx, () => '192.168.1.20'); // same server code, request seen as coming from a LAN phone
try {
  // Public API over HTTP.
  const health = await local.request<HealthData>('/api/health');
  assert.equal(health.status, 200);
  const before = ok((await local.request<CitySurveyState>('/api/city-state')).body);
  assert.equal(before.revision, 2);
  assert.equal(ok(health.body).runId, before.runId);
  const created = await lan.request<GuestQuestionData>('/api/guest-sessions', {});
  assert.equal(created.status, 201, 'guests may use the survey API from the LAN');
  const guest = ok(created.body);
  assert.equal((await lan.request<GuestQuestionData>(`/api/guest-sessions/${guest.session.id}/question`)).status, 200);
  const body = { answerId: 'http-1', guestSessionId: guest.session.id, questionId: guest.question.id, optionId: guest.question.options[0].id, expectedRevision: 1 };
  const conflict = await lan.request<AnswerData>('/api/answers', body);
  assert.equal(conflict.status, 409);
  assert.equal(!conflict.body.ok && conflict.body.state?.revision, 2);
  assert.equal((await lan.request<AnswerData>('/api/answers', { ...body, expectedRevision: 2 })).status, 201);
  assert.equal((await lan.request<AnswerData>('/api/answers', { ...body, expectedRevision: 2 })).status, 200, 'replay');
  assert.equal((await lan.request<AnswerData>('/api/answers', 'not json')).status, 400);
  assert.equal((await lan.request<AnswerData>('/api/answers', '{}', { 'content-type': 'text/plain' })).status, 415);
  const internal = await lan.request<AnswerData>('/api/answers', '{"answerId":');
  assert.ok(!internal.body.ok && !/SQL|sqlite|stack/i.test(internal.body.error.message));
  assert.equal((await local.request('/api/guest-sessions/nope/question')).status, 404);
  assert.equal((await local.request('/api/guest-sessions/%E0/question')).status, 404);

  // Non-loopback admin access is refused, including the admin page.
  for (const path of ['/api/admin/current-run', '/api/admin/events', '/admin', '/admin.html']) {
    const response = await fetch(lan.base + path);
    assert.equal(response.status, 403, path);
  }
  const lanReset = await lan.request<ResetData>('/api/admin/reset', { confirmation: 'RESET' });
  assert.equal(lanReset.status, 403);
  assert.equal(!lanReset.body.ok && lanReset.body.error.code, 'forbidden');
  const stillSame = ok((await local.request<CitySurveyState>('/api/city-state')).body);
  assert.equal(stillSame.runId, before.runId);

  // Loopback: wrong confirmation and cross-origin posts are refused.
  assert.equal((await local.request<ResetData>('/api/admin/reset', { confirmation: 'reset' })).status, 400);
  assert.equal((await local.request<ResetData>('/api/admin/reset', {})).status, 400);
  assert.equal((await local.request<ResetData>('/api/admin/reset', { confirmation: 'RESET' }, { origin: 'http://evil.example' })).status, 403);
  const current = ok((await local.request<AdminCurrentRun>('/api/admin/current-run')).body);
  assert.equal(current.run.id, before.runId);
  assert.equal(current.state.revision, 3);
  assert.equal(current.answeredSessions, 3);
  assert.equal(current.reservedSessions, 0);

  const pending = ok((await lan.request<GuestQuestionData>('/api/guest-sessions', {})).body);

  // Successful reset: new run, zero scores, old answers kept, reset event recorded.
  const reset = await local.request<ResetData>('/api/admin/reset', { confirmation: 'RESET' }, { origin: local.base });
  assert.equal(reset.status, 200);
  const data = ok(reset.body);
  assert.equal(data.previousRunId, before.runId);
  assert.notEqual(data.state.runId, before.runId);
  assert.deepEqual(data.state.scores, { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 });
  assert.equal(data.state.revision, 0);
  const after = ok((await local.request<CitySurveyState>('/api/city-state')).body);
  assert.equal(after.runId, data.state.runId);
  const runs = ctx.db.prepare('SELECT id, status, ended_at FROM runs ORDER BY started_at, status').all();
  assert.equal(runs.length, 2);
  assert.equal(runs.find(r => r.id === before.runId)?.status, 'ended');
  assert.equal(Number(ctx.db.prepare('SELECT COUNT(*) AS n FROM answer_events WHERE run_id = ?').get(before.runId)?.n), 3, 'history kept');
  const events = ok((await local.request<AdminEventsData>('/api/admin/events')).body);
  assert.equal(events.answers.length, 3);
  assert.deepEqual(events.admin.map(e => [e.type, e.runId, e.detail.nextRunId]), [['run-reset', before.runId, data.state.runId]]);
  // A guest from the old run cannot answer into the new one; the new run starts at the first question.
  assert.equal((await lan.request('/api/guest-sessions/' + pending.session.id + '/question')).status, 410);
  const lateAnswer = await lan.request<AnswerData>('/api/answers', { answerId: 'late', guestSessionId: pending.session.id, questionId: pending.question.id, optionId: pending.question.options[0].id, expectedRevision: 0 });
  assert.equal(!lateAnswer.body.ok && lateAnswer.body.error.code, 'session_expired');
  assert.equal(ok((await lan.request<GuestQuestionData>('/api/guest-sessions', {})).body).question.id, 'energy-01');
  console.log('PASS: HTTP API statuses, loopback-only admin (403 from LAN), RESET confirmation, new zero run, history and reset event kept.');
} finally {
  await local.close();
  await lan.close();
}
