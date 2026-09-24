import assert from 'node:assert/strict';
import type { AnswerData, GuestQuestionData, ResetData, ServerEvent } from './protocolTypes.ts';
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

  const reset = ok((await server.request<ResetData>('/api/admin/reset', { confirmation: 'RESET' })).body);
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
  b.close(); c.close();
  console.log('PASS: WebSocket snapshot on connect, city-state-updated after answers (not on replay), run-reset after reset.');
} finally {
  await server.close();
}
