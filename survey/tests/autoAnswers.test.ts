import assert from 'node:assert/strict';
import { devSurveyConfig } from '../src/server/devSurvey.ts';
import { autoWait, notReadyReason, runAutoAnswers, selectAutoAnswers, type AutoDriver, type AutoSettings } from '../src/ui/autoAnswers.ts';
import { exhibitionFixture, ok, staff } from './surveyFixture.ts';
import { createProposalSession, submitProposal } from '../src/server/proposalService.ts';
import { currentRun } from '../src/server/adminService.ts';
import type { ProposalSessionData, ProposalData } from '../src/shared/protocol.ts';

const { ctx, clock } = exhibitionFixture();
const config = devSurveyConfig(ctx.questions);
const settings: AutoSettings = { profile: 'high', count: 3, seed: 2127, extraWaitMs: 0, custom: {} };
for (const [profile, vote] of [['low', -1], ['zero', 0], ['high', 1]] as const) {
  const answers = selectAutoAnswers(config, { ...settings, profile }, 0);
  for (const answer of answers) assert.equal(config.meters.find(meter => meter.questionId === answer.questionId)!
    .options.find(option => option.id === answer.optionId)!.vote, vote);
}
assert.deepEqual(selectAutoAnswers(config, { ...settings, profile: 'random' }, 5), selectAutoAnswers(config, { ...settings, profile: 'random' }, 5));
const reversed = { ...config, meters: config.meters.map(meter => ({ ...meter, options: [...meter.options].reverse() })) };
assert.deepEqual(selectAutoAnswers(config, settings, 0), selectAutoAnswers(reversed, settings, 0), 'option order is not a vote contract');
assert.notDeepEqual(selectAutoAnswers(config, { ...settings, profile: 'mixed' }, 0), selectAutoAnswers(config, { ...settings, profile: 'mixed' }, 1));
assert.throws(() => selectAutoAnswers(config, { ...settings, profile: 'custom' }, 0));
assert.deepEqual(selectAutoAnswers(config, { ...settings, profile: 'custom', custom: Object.fromEntries(config.meters.map(m => [m.axis, 1])) }, 0), selectAutoAnswers(config, settings, 0));
assert.equal(selectAutoAnswers({ ...config, meters: [...config.meters, { ...config.meters[0], axis: 'futureMeter', questionId: 'future' }] }, settings, 0).length, 5);

let session: ProposalSessionData, answers: { questionId: string; optionId: string }[] = [], submits = 0;
let latest: ProposalData | undefined, startSignal: AbortSignal | undefined;
const driver: AutoDriver = {
  async readAdmin() { return currentRun(ctx); },
  async start(signal) { startSignal = signal; answers = []; return session = ok(createProposalSession(ctx).response); },
  answer(questionId, optionId) { answers.push({ questionId, optionId }); },
  async submit() {
    const request = { submissionId: `auto-${++submits}`, guestSessionId: session.session.id, expectedRevision: session.state.revision, answers };
    latest = ok(submitProposal(ctx, request).response);
    assert.equal(ok(submitProposal(ctx, request).response).replayed, true, 'the normal same-ID path survives a lost response');
    return latest;
  },
  async wait(ms, signal) { signal.throwIfAborted(); clock.ms += ms; },
};
try {
  const first = new AbortController();
  await runAutoAnswers(config, settings, driver, first.signal, () => {});
  assert.equal(startSignal, first.signal, 'Stop must cancel waiting for the Guest welcome screen');
  assert.equal(submits, 3);
  assert.equal(currentRun(ctx).state.revision, 3);
  assert.equal(currentRun(ctx).lifecycle.phase, 'awaiting_exit');
  assert.equal(notReadyReason(currentRun(ctx)), undefined, 'completed guests need no Admin confirmation');
  const stopped = new AbortController(); stopped.abort();
  await assert.rejects(runAutoAnswers(config, settings, driver, stopped.signal, () => {}));
  assert.equal(submits, 3);
  const duringSubmit = new AbortController();
  await assert.rejects(runAutoAnswers(config, settings, { ...driver, async submit() {
    const result = await driver.submit(); duringSubmit.abort(); return result;
  } }, duringSubmit.signal, () => {}));
  assert.equal(submits, 4);
  assert.equal(currentRun(ctx).lifecycle.phase, 'awaiting_exit');
  assert.equal(notReadyReason(currentRun(ctx)), undefined);
  ok(staff(ctx, 'guest-left'));
  await assert.rejects(runAutoAnswers(config, settings, { ...driver, async submit() { throw new Error('uncertain same-ID submission'); } }, new AbortController().signal, () => {}), /uncertain/);
  ok(staff(ctx, 'guest-left'));
  await assert.rejects(runAutoAnswers(config, { ...settings, count: 1 }, { ...driver, async wait(ms) {
    if (ms > 1000) ok(staff(ctx, 'reset-city', 'RESET'));
  } }, new AbortController().signal, () => {}), /スタッフ/);
  ok(staff(ctx, 'cancel-reset')); ok(staff(ctx, 'guest-left'));
  await assert.rejects(runAutoAnswers(config, { ...settings, count: 1 }, { ...driver, async submit() {
    ok(createProposalSession(ctx).response); // Another guest starts between preflight and our commit.
    return driver.submit();
  } }, new AbortController().signal, () => {}), /スタッフ/);
  ok(staff(ctx, 'guest-left'));
  const ready = currentRun(ctx);
  assert.equal(notReadyReason(ready), undefined);
  ok(createProposalSession(ctx).response); // A manual draft left open blocks the batch with a draft-specific reason.
  await assert.rejects(runAutoAnswers(config, settings, driver, new AbortController().signal, () => {}), /回答中の草稿/);
  assert.match(notReadyReason({ ...ready, lifecycle: { ...ready.lifecycle, pendingReset: 'city' } })!, /リセット待ち/);
  ok(staff(ctx, 'guest-left'));
  const timerAbort = new AbortController();
  const timer = autoWait(60_000, timerAbort.signal); timerAbort.abort(new Error('stop wait'));
  await assert.rejects(timer, /stop wait/);
  await assert.rejects(runAutoAnswers(config, { ...settings, count: 0 }, driver, new AbortController().signal, () => {}), /settings/);
} finally { ctx.db.close(); }
console.log('PASS: profiles, repeatable random, future Meter descriptors, continuous lifecycle, idempotency, cancellation, network failure and pending reset.');
