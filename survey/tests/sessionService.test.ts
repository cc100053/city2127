import assert from 'node:assert/strict';
import { submitAnswer } from '../src/server/answerService.ts';
import { createGuestSession, getGuestQuestion, RESERVATION_MS } from '../src/server/sessionService.ts';
import { errorCode, fixture, ok } from './surveyFixture.ts';

const { ctx, clock } = fixture();
const total = ctx.questions.questions.length;
assert.equal(RESERVATION_MS, 120_000);

// One question per guest, in JSON order, no duplicates while reserved.
const guests = Array.from({ length: total }, () => ok(createGuestSession(ctx)));
assert.deepEqual(guests.map(g => g.question.id), ctx.questions.questions.map(q => q.id));
assert.ok(guests.every(g => g.session.status === 'reserved' && g.question.options.length === 3));
assert.equal(Date.parse(guests[0].session.expiresAt) - Date.parse(guests[0].session.createdAt), RESERVATION_MS);
assert.equal(errorCode(createGuestSession(ctx)), 'no_question_available', 'no wrap-around while everything is reserved');

// Answered sessions cannot answer again and still report answered.
const g = guests[0];
ok(submitAnswer(ctx, { answerId: 's-1', guestSessionId: g.session.id, questionId: g.question.id, optionId: g.question.options[0].id, expectedRevision: 0 }).response);
assert.equal(ok(getGuestQuestion(ctx, g.session.id)).session.status, 'answered');
assert.equal(errorCode(submitAnswer(ctx, { answerId: 's-1x', guestSessionId: g.session.id, questionId: g.question.id, optionId: g.question.options[1].id, expectedRevision: 1 }).response), 'already_answered');

// After 2 minutes unanswered reservations expire and are reassigned; the answered question is not.
clock.ms += RESERVATION_MS;
assert.equal(errorCode(getGuestQuestion(ctx, guests[1].session.id)), 'session_expired');
const late = guests[2];
assert.equal(errorCode(submitAnswer(ctx, { answerId: 's-late', guestSessionId: late.session.id, questionId: late.question.id, optionId: late.question.options[0].id, expectedRevision: 1 }).response), 'session_expired');
const reassigned = ok(createGuestSession(ctx));
assert.equal(reassigned.question.id, guests[1].question.id, 'first expired question is reassigned');
assert.notEqual(reassigned.session.id, guests[1].session.id);

// Use up every question: answer all remaining, then the run reports no question (end state).
let revision = 1;
const answerAll = (first = reassigned) => {
  for (let guest = first; ; ) {
    ok(submitAnswer(ctx, { answerId: `fill-${guest.session.id}`, guestSessionId: guest.session.id, questionId: guest.question.id, optionId: guest.question.options[1].id, expectedRevision: revision++ }).response);
    const next = createGuestSession(ctx);
    if (!next.ok) return errorCode(next);
    guest = next.data;
  }
};
assert.equal(answerAll(), 'no_question_available');
assert.equal(revision, total, "every question answered exactly once");
clock.ms += RESERVATION_MS * 10;
assert.equal(errorCode(createGuestSession(ctx)), 'no_question_available', 'answered questions never come back');
const statuses = ctx.db.prepare('SELECT status, COUNT(*) AS n FROM guest_sessions GROUP BY status ORDER BY status').all();
assert.deepEqual(statuses.map(r => [r.status, Number(r.n)]), [['answered', total], ['expired', total - 1]]);
console.log('PASS: one question per guest, no duplicate reservations, no re-answer, expiry reassignment, exhaustion without wrap-around.');
