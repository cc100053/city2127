import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExhibitionState } from '../src/shared/citySurveyState.ts';
import type { ProposalSessionData } from '../src/shared/protocol.ts';
import { currentState } from '../src/server/answerService.ts';
import { lifecycleCommand, readLifecycle } from '../src/server/adminService.ts';
import { createProposalSession, submitProposal } from '../src/server/proposalService.ts';
import { createContext } from '../src/server/server.ts';
import type { SurveyContext } from '../src/server/context.ts';
import { errorCode, EXHIBITION_QUESTIONS_PATH, exhibitionFixture, ok, staff } from './surveyFixture.ts';

const ZERO = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
let counter = 0;
const state = (ctx: SurveyContext) => currentState(ctx) as ExhibitionState;
const request = (ctx: SurveyContext, session: ProposalSessionData, id = `guest-${++counter}`) => ({
  submissionId: id, guestSessionId: session.session.id, expectedRevision: state(ctx).revision,
  answers: session.questions.map(question => ({ questionId: question.id, optionId: question.options[2].id })),
});
const submit = (ctx: SurveyContext, session: ProposalSessionData, id?: string) => submitProposal(ctx, request(ctx, session, id));
const guest = (ctx: SurveyContext) => ok(submit(ctx, ok(createProposalSession(ctx).response)).response);

// Normal cumulative flow: a finished guest keeps their city; the next one inherits it without an Admin command.
const { ctx } = exhibitionFixture();
assert.deepEqual([readLifecycle(ctx.db).phase, readLifecycle(ctx.db).pendingReset, readLifecycle(ctx.db).totalGuestCount], ['ready', 'none', 0]);
const sessionA = ok(createProposalSession(ctx).response);
assert.equal(readLifecycle(ctx.db).phase, 'in_experience', 'starting the questionnaire marks the installation busy');
const a = ok(submit(ctx, sessionA, 'guest-a').response);
assert.equal(readLifecycle(ctx.db).phase, 'awaiting_exit', 'finishing the questionnaire does not mean the guest has left');
assert.deepEqual([a.state.guestCount, readLifecycle(ctx.db).totalGuestCount], [1, 1]);
assert.deepEqual(state(ctx), a.state, 'no reset between normal guests');
const sessionB = ok(createProposalSession(ctx).response);
assert.deepEqual(sessionB.state, a.state, 'guest B inherits guest A\'s city');

// Reset requested during an experience is queued, survives completion, and runs only when the next guest starts.
const queued = ok(staff(ctx, 'reset-city', 'RESET'));
assert.deepEqual([queued.executedReset, queued.lifecycle.pendingReset, queued.state.runId], [null, 'city', a.state.runId]);
const b = ok(submit(ctx, sessionB, 'guest-b').response);
assert.deepEqual([b.state.guestCount, b.state.runId], [2, a.state.runId], 'guest B still contributes to the current city');
assert.deepEqual([readLifecycle(ctx.db).phase, readLifecycle(ctx.db).pendingReset], ['awaiting_exit', 'city']);
assert.deepEqual(state(ctx), b.state, 'the result stays visible after submission');
ctx.db.exec(`CREATE TRIGGER fail_next_guest BEFORE INSERT ON proposal_sessions
  BEGIN SELECT RAISE(ABORT, 'injected handoff failure'); END`);
const beforeHandoff = readLifecycle(ctx.db);
assert.throws(() => createProposalSession(ctx), /injected handoff failure/);
assert.deepEqual(state(ctx), b.state, 'a failed next session rolls the reset back');
assert.deepEqual(readLifecycle(ctx.db), beforeHandoff);
ctx.db.exec('DROP TRIGGER fail_next_guest');
const next = createProposalSession(ctx);
const nextSession = ok(next.response);
assert.equal(next.event?.type, 'run-reset');
assert.equal(next.event?.type === 'run-reset' && next.event.previousRunId, a.state.runId);
assert.equal(nextSession.session.runId, nextSession.state.runId);
const cycle2 = state(ctx);
assert.notEqual(cycle2.runId, a.state.runId);
assert.deepEqual([cycle2.guestCount, cycle2.scores], [0, ZERO]);
assert.deepEqual([readLifecycle(ctx.db).phase, readLifecycle(ctx.db).pendingReset, readLifecycle(ctx.db).totalGuestCount], ['in_experience', 'none', 2]);
assert.deepEqual(nextSession.state, cycle2);
ok(staff(ctx, 'guest-left')); // Fixture cleanup for the separate immediate-reset case.

// Safe immediate city reset between guests keeps the total.
guest(ctx);
ok(staff(ctx, 'guest-left'));
const immediate = ok(staff(ctx, 'reset-city', 'RESET'));
assert.deepEqual([immediate.executedReset, immediate.previousRunId, (immediate.state as ExhibitionState).guestCount, immediate.lifecycle.totalGuestCount],
  ['city', cycle2.runId, 0, 3]);

// Stale and duplicate commands: expectedRevision mismatch, double exit confirmation and replayed submissions change nothing.
const current = readLifecycle(ctx.db);
assert.equal(errorCode(lifecycleCommand(ctx, { command: 'reset-city', expectedRevision: current.revision - 1, confirmation: 'RESET' }).response), 'lifecycle_conflict');
assert.equal(errorCode(staff(ctx, 'guest-left')), 'lifecycle_blocked', 'nothing to confirm while ready');
assert.equal(errorCode(staff(ctx, 'cancel-reset')), 'lifecycle_blocked');
assert.equal(errorCode(staff(ctx, 'reset-city', 'reset')), 'reset_confirmation_invalid');
assert.equal(errorCode(staff(ctx, 'full-reset', 'RESET')), 'reset_confirmation_invalid');
assert.equal(errorCode(lifecycleCommand(ctx, { command: 'explode', expectedRevision: 0 }).response), 'bad_request');
assert.deepEqual(readLifecycle(ctx.db), current);
const sessionC = ok(createProposalSession(ctx).response);
const requestC = request(ctx, sessionC, 'guest-c');
const c = ok(submitProposal(ctx, requestC).response);
assert.equal(ok(submitProposal(ctx, requestC).response).replayed, true);
assert.equal(errorCode(submit(ctx, sessionC, 'guest-c-again').response), 'already_answered');
assert.deepEqual([state(ctx).guestCount, readLifecycle(ctx.db).totalGuestCount], [1, 4], 'a retried submission is counted once');
const exitRevision = readLifecycle(ctx.db).revision;
ok(lifecycleCommand(ctx, { command: 'guest-left', expectedRevision: exitRevision }).response);
assert.equal(errorCode(lifecycleCommand(ctx, { command: 'guest-left', expectedRevision: exitRevision }).response), 'lifecycle_conflict',
  'a second admin confirming the same exit cannot confirm a later guest');
assert.deepEqual(state(ctx), c.state);

// An abandoned questionnaire: staff confirm the exit, the unfinished session cannot count later.
const abandoned = ok(createProposalSession(ctx).response);
ok(staff(ctx, 'guest-left'));
assert.equal(errorCode(submit(ctx, abandoned).response), 'session_expired');
assert.equal(readLifecycle(ctx.db).totalGuestCount, 4);

// Full reset queued during an experience supersedes a city reset, can be cancelled, and clears both counters.
const sessionD = ok(createProposalSession(ctx).response);
ok(staff(ctx, 'full-reset', 'FULL RESET'));
ok(staff(ctx, 'reset-city', 'RESET'));
assert.equal(readLifecycle(ctx.db).pendingReset, 'full', 'full reset has precedence over a later city reset');
ok(staff(ctx, 'cancel-reset'));
assert.equal(readLifecycle(ctx.db).pendingReset, 'none');
ok(staff(ctx, 'reset-city', 'RESET'));
ok(staff(ctx, 'full-reset', 'FULL RESET'));
assert.equal(readLifecycle(ctx.db).pendingReset, 'full');
ok(submit(ctx, sessionD).response);
const beforeFull = state(ctx);
assert.equal(beforeFull.guestCount, 2);
const full = createProposalSession(ctx);
assert.equal(full.event?.type === 'run-reset' && full.event.previousRunId, beforeFull.runId);
assert.deepEqual([readLifecycle(ctx.db).phase, readLifecycle(ctx.db).pendingReset, readLifecycle(ctx.db).totalGuestCount],
  ['in_experience', 'none', 0]);
assert.equal(ok(full.response).state.runId, state(ctx).runId);
assert.deepEqual([state(ctx).guestCount, state(ctx).scores], [0, ZERO]);
assert.equal(Number(ctx.db.prepare('SELECT COUNT(*) AS n FROM proposal_events').get()?.n), 5, 'history is kept; only the count restarts');
guest(ctx);
assert.equal(readLifecycle(ctx.db).totalGuestCount, 1, 'counting resumes after a full reset');
assert.throws(() => ctx.db.prepare("UPDATE exhibition_lifecycle SET phase = 'ready', pending_reset = 'city'").run(), /CHECK/,
  'ready can never hold a pending reset');
ctx.db.close();

// Persistence: a queued reset and the phase survive a server restart and are what any admin client reads.
const dir = mkdtempSync(join(tmpdir(), 'lifecycle-'));
try {
  const dbPath = join(dir, 'survey.sqlite');
  const first = createContext({ dbPath, questionsPath: EXHIBITION_QUESTIONS_PATH });
  const session = ok(createProposalSession(first).response);
  ok(staff(first, 'reset-city', 'RESET'));
  const saved = readLifecycle(first.db);
  first.db.close();
  const restarted = createContext({ dbPath, questionsPath: EXHIBITION_QUESTIONS_PATH });
  assert.deepEqual(readLifecycle(restarted.db), saved);
  assert.deepEqual([saved.phase, saved.pendingReset], ['in_experience', 'city']);
  const result = ok(submit(restarted, session).response);
  assert.equal(result.state.guestCount, 1, 'the guest finishes after a restart without the reset firing');
  const handoff = createProposalSession(restarted);
  assert.equal(handoff.event?.type, 'run-reset');
  assert.equal(ok(handoff.response).state.guestCount, 0);
  assert.deepEqual([readLifecycle(restarted.db).totalGuestCount, state(restarted).guestCount], [1, 0]);
  restarted.db.close();
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log('PASS: lifecycle — cumulative guests, automatic next-guest handoff and deferred reset, immediate safe reset, full reset, stale/duplicate safety, persistence.');
