import assert from 'node:assert/strict';
import type { ProposalSessionData, ServerEvent } from '../src/shared/protocol.ts';
import { createProposalSession, submitProposal } from '../src/server/proposalService.ts';
import { createExplore } from '../src/server/exploreService.ts';
import { DISPLAY_MS } from '../src/shared/displayTiming.ts';
import { errorCode, exhibitionFixture, ok, startServer } from './surveyFixture.ts';

const { ctx, clock } = exhibitionFixture();
const explore = createExplore(ctx);
const submit = (session: ProposalSessionData, id: string) => ok(submitProposal(ctx, {
  submissionId: id, guestSessionId: session.session.id, expectedRevision: session.state.revision,
  answers: session.questions.map(q => ({ questionId: q.id, optionId: q.options[1].id })),
}).response);

for (const body of [null, [], {}, { guestSessionId: 'x' }, { guestSessionId: 'x', target: 'tower' }, { guestSessionId: '', target: null }, { guestSessionId: 'x', target: null, extra: 1 }])
  assert.equal(errorCode(explore.request(body).response), 'bad_request');
assert.equal(errorCode(explore.request({ guestSessionId: 'nobody', target: 'sky-ring' }).response), 'session_not_found');

const a = ok(createProposalSession(ctx, { stationId: 'A' }).response), b = ok(createProposalSession(ctx, { stationId: 'B' }).response);
const savedA = submit(a, 'a');
assert.equal(errorCode(explore.request({ guestSessionId: a.session.id, target: 'sky-ring' }).response), 'lifecycle_blocked', 'not during your own result');
clock.ms += DISPLAY_MS;
const started = explore.request({ guestSessionId: a.session.id, target: 'sky-ring' });
assert.deepEqual(started.event, { type: 'explore', target: 'sky-ring', ordinal: savedA.proposal.ordinal, stationId: 'A' });
assert.equal(explore.request({ guestSessionId: a.session.id, target: 'sky-ring' }).response.ok, true, 'repeat taps are idempotent');

submit(b, 'b');
assert.equal(errorCode(explore.request({ guestSessionId: b.session.id, target: 'sky-ring' }).response), 'lifecycle_blocked');
clock.ms += DISPLAY_MS;
assert.equal(errorCode(explore.request({ guestSessionId: b.session.id, target: 'sky-ring' }).response), 'explore_busy', 'one guest at a time');
assert.equal(explore.request({ guestSessionId: b.session.id, target: null }).event, undefined, 'only the holder can end it');
assert.equal(explore.endFor('B'), undefined);
assert.deepEqual(explore.endFor('A'), { type: 'explore', target: null }, "station A's next Start ends A's look");
assert.equal(explore.request({ guestSessionId: b.session.id, target: 'sky-ring' }).response.ok, true);
assert.deepEqual(explore.request({ guestSessionId: b.session.id, target: null }).event, { type: 'explore', target: null });
assert.equal(explore.holder, null);

// HTTP: start/stop reach every viewer; that station's next Start takes the screen back.
const server = await startServer(ctx);
const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`), events: ServerEvent[] = [];
socket.addEventListener('message', message => events.push(JSON.parse(String(message.data)) as ServerEvent));
await new Promise(resolve => socket.addEventListener('open', resolve));
const explores = async (n: number) => { for (let i = 0; i < 50 && events.filter(e => e.type === 'explore').length < n; i++) await new Promise(r => setTimeout(r, 20)); return events.filter(e => e.type === 'explore'); };
try {
  assert.equal((await server.request('/api/explore', { target: 'sky-ring' })).status, 400);
  assert.equal((await server.request('/api/explore', { guestSessionId: a.session.id, target: 'sky-ring' })).status, 200);
  assert.deepEqual((await explores(1))[0], { type: 'explore', target: 'sky-ring', ordinal: savedA.proposal.ordinal, stationId: 'A' });
  clock.ms += 60_000;
  for (let i = 0; i < 40 && (await server.request<ProposalSessionData>('/api/proposal-sessions', { stationId: 'A' })).status !== 201; i++) await new Promise(r => setTimeout(r, 100));
  assert.deepEqual((await explores(2))[1], { type: 'explore', target: null });
} finally { socket.close(); await server.close(); }
console.log('explore tests passed');
