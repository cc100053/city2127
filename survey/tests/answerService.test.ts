import assert from 'node:assert/strict';
import { submitAnswer } from '../src/server/answerService.ts';
import { createGuestSession } from '../src/server/sessionService.ts';
import { errorCode, fixture, ok } from './surveyFixture.ts';

const { ctx } = fixture();
const g1 = ok(createGuestSession(ctx));
const request = { answerId: 'a-1', guestSessionId: g1.session.id, questionId: g1.question.id, optionId: 'fusion-hub', expectedRevision: 0 };
const submit = (body: object) => submitAnswer(ctx, body).response;

// Validation happens before anything is stored.
assert.equal(errorCode(submit({ ...request, questionId: 'nope-01' })), 'unknown_question');
assert.equal(errorCode(submit({ ...request, optionId: 'nope' })), 'unknown_option');
assert.equal(errorCode(submit({ ...request, optionId: 'autonomous-transit' })), 'option_question_mismatch');
assert.equal(errorCode(submit({ ...request, questionId: 'mobility-01', optionId: 'autonomous-transit' })), 'question_not_assigned');
assert.equal(errorCode(submit({ ...request, guestSessionId: 'missing' })), 'session_not_found');
assert.equal(errorCode(submit({ ...request, expectedRevision: 1.5 })), 'bad_request');
assert.equal(errorCode(submit({ ...request, answerId: '' })), 'bad_request');
assert.equal(errorCode(submit({ ...request, expectedRevision: 3 })), 'revision_conflict');

// Normal save.
const first = ok(submit(request));
assert.equal(first.replayed, false);
assert.deepEqual(first.event.effects, { automation: 3, environmentalPriority: 1 });
assert.equal(first.event.questionVersion, 1);
assert.equal(first.event.revisionBefore, 0);
assert.equal(first.event.revisionAfter, 1);
assert.equal(first.state.revision, 1);
assert.equal(first.state.answerCount, 1);
const count = () => Number(ctx.db.prepare('SELECT COUNT(*) AS n FROM answer_events').get()?.n);
assert.equal(count(), 1);

// Idempotent resend: same result, no double application. Checked before the (now stale) revision.
const again = ok(submit(request));
assert.equal(again.replayed, true);
assert.deepEqual(again.event, first.event);
assert.equal(again.state.revision, 1);
assert.deepEqual(again.state.scores, first.state.scores);
assert.equal(count(), 1);
// Same answer ID with different content is a conflict.
assert.equal(errorCode(submit({ ...request, optionId: 'solar-canopy' })), 'answer_conflict');
assert.equal(errorCode(submit({ ...request, expectedRevision: 1 })), 'answer_conflict');
// A second answer ID for an answered session is refused.
assert.equal(errorCode(submit({ ...request, answerId: 'a-1b', expectedRevision: 1 })), 'already_answered');
assert.equal(count(), 1);

// Stale revision: two guests hold revision 1; the first to answer wins, the other gets 409 + latest state.
const g2 = ok(createGuestSession(ctx)), g3 = ok(createGuestSession(ctx));
assert.equal(g2.state.revision, 1);
const second = ok(submit({ answerId: 'a-2', guestSessionId: g2.session.id, questionId: g2.question.id, optionId: g2.question.options[0].id, expectedRevision: 1 }));
const staleBody = { answerId: 'a-3', guestSessionId: g3.session.id, questionId: g3.question.id, optionId: g3.question.options[1].id, expectedRevision: 1 };
const stale = submit(staleBody);
assert.equal(errorCode(stale), 'revision_conflict');
assert.equal(!stale.ok && stale.state?.revision, 2);
const third = ok(submit({ ...staleBody, expectedRevision: 2 }));

// sequence and revision are strictly increasing in acceptance order.
assert.ok(first.event.sequence < second.event.sequence && second.event.sequence < third.event.sequence);
assert.deepEqual([first.state.revision, second.state.revision, third.state.revision], [1, 2, 3]);
// Stored events are append-only.
assert.throws(() => ctx.db.prepare('DELETE FROM answer_events').run(), /append-only/);
assert.throws(() => ctx.db.prepare(`UPDATE answer_events SET option_id = 'x'`).run(), /append-only/);
console.log('PASS: answer validation, save, idempotent resend, conflicting reuse, stale revision, monotonic sequence/revision, append-only events.');
