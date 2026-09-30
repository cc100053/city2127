import assert from 'node:assert/strict';
import type { AnswerData, GuestQuestionData, LifecycleData, ServerEvent } from './protocolTypes.ts';
import { readDisplayMode } from '../src/server/adminService.ts';
import { fixture, ok, startServer } from './surveyFixture.ts';

/** Collects WebSocket events and lets the test await the next one. */
async function monitor(url: string) {
  const socket = new WebSocket(url), queue: ServerEvent[] = [], waiters: ((event: ServerEvent) => void)[] = [];
  socket.addEventListener('message', message => {
    const event = JSON.parse(String(message.data)) as ServerEvent;
    const waiter = waiters.shift();
    if (waiter) waiter(event); else queue.push(event);
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });
  const next = () => {
    const queued = queue.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise<ServerEvent>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for WebSocket event')), 2000);
      waiters.push(event => { clearTimeout(timer); resolve(event); });
    });
  };
  return { next, close: () => socket.close() };
}

const { ctx } = fixture();
const server = await startServer(ctx);
try {
  const a = await monitor(`ws://127.0.0.1:${server.port}/ws`), b = await monitor(`ws://127.0.0.1:${server.port}/ws`);
  const hello = await a.next();
  assert.equal(hello.type, 'city-state-snapshot');
  assert.equal(hello.type === 'city-state-snapshot' && hello.state.revision, 0);
  assert.equal(hello.type === 'city-state-snapshot' && hello.view.history.length, 0);
  assert.equal((await b.next()).type, 'city-state-snapshot');
  assert.equal(hello.type === 'city-state-snapshot' && hello.displayMode, 'auto');
  for (const mode of ['day', 'night', 'auto'] as const) {
    assert.equal((await server.request('/api/admin/display-mode', { mode }, { origin: server.base })).status, 200);
    assert.equal(readDisplayMode(ctx.db), mode);
    for (const client of [a, b]) {
      const event = await client.next();
      assert.equal(event.type, 'city-state-snapshot');
      if (event.type !== 'city-state-snapshot') throw new Error('expected display snapshot');
      assert.equal(event.displayMode, mode);
      assert.deepEqual(event.state, hello.type === 'city-state-snapshot' && hello.state, 'lighting does not change city state');
    }
  }
  for (const body of [null, {}, { mode: 'dusk' }, { mode: 12 }, { mode: 'night', scores: {} }, []]) {
    assert.equal((await server.request('/api/admin/display-mode', body)).status, 400);
  }
  assert.equal((await server.request('/api/admin/display-mode', { mode: 'night' }, { origin: 'http://evil.test' })).status, 403);
  assert.equal(readDisplayMode(ctx.db), 'auto');
  const lan = await startServer(ctx, () => '192.168.1.20');
  try { assert.equal((await lan.request('/api/admin/display-mode', { mode: 'night' })).status, 403); }
  finally { await lan.close(); }


  const guest = ok((await server.request<GuestQuestionData>('/api/guest-sessions', {})).body);
  const answer = ok((await server.request<AnswerData>('/api/answers', { answerId: 'ws-1', guestSessionId: guest.session.id, questionId: guest.question.id, optionId: 'solar-canopy', expectedRevision: 0 })).body);
  for (const client of [a, b]) {
    const event = await client.next();
    assert.equal(event.type, 'city-state-updated');
    if (event.type !== 'city-state-updated') throw new Error('unreachable');
    assert.equal(event.answerId, 'ws-1');
    assert.deepEqual(event.state, answer.state);
    assert.equal(event.optionLabel, '建物と道路を太陽光設備で覆う');
    assert.deepEqual(event.change, { scores: { environmentalPriority: 3, automation: 1 } });
    assert.deepEqual(event.view.history.map(d => d.optionId), ['solar-canopy']);
    assert.equal(event.view.layout.lots.ne.lot, 'park', 'environmentalPriority 3 derives the NE park');
  }
  // A replayed answer does not broadcast a second update.
  await server.request<AnswerData>('/api/answers', { answerId: 'ws-1', guestSessionId: guest.session.id, questionId: guest.question.id, optionId: 'solar-canopy', expectedRevision: 0 });

  await server.request('/api/admin/display-mode', { mode: 'night' });
  await a.next(); await b.next();
  const reset = ok((await server.request<LifecycleData>('/api/admin/lifecycle', { command: 'reset-city', expectedRevision: 0, confirmation: 'RESET' })).body);
  const resetEvent = await a.next();
  assert.equal(resetEvent.type, 'run-reset', 'next event after the replay is the reset, not a duplicate update');
  assert.equal(resetEvent.type === 'run-reset' && resetEvent.previousRunId, answer.state.runId);
  assert.deepEqual(resetEvent.type === 'run-reset' && resetEvent.state, reset.state);
  assert.equal(resetEvent.type === 'run-reset' && resetEvent.view.history.length, 0);
  assert.equal(resetEvent.type === 'run-reset' && resetEvent.view.layout.lots.ne.lot, 'empty', 'reset returns to the baseline layout');

  // A reconnecting monitor immediately receives the new run's full state.
  a.close();
  const c = await monitor(`ws://127.0.0.1:${server.port}/ws`);
  const again = await c.next();
  assert.equal(again.type === 'city-state-snapshot' && again.state.runId, reset.state.runId);
  assert.equal(again.type === 'city-state-snapshot' && again.view.runId, reset.state.runId);
  assert.equal(again.type === 'city-state-snapshot' && again.displayMode, 'night', 'reconnect and city reset retain lighting');
  b.close(); c.close();
  console.log('PASS: WebSocket snapshot on connect, city-state-updated after answers (not on replay), run-reset after reset.');
} finally {
  await server.close();
}
