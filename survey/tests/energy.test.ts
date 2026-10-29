import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ENERGY_CHOICES, emptyEnergyCounts, energyConfiguration, type EnergyChoice } from '../src/shared/energy.ts';
import { initialExhibitionState, zeroScores } from '../src/shared/citySurveyState.ts';
import { applyProposalVotes, validateExhibitionState } from '../src/survey/scoreEngine.ts';
import { loadQuestionSetFile, validateExhibitionQuestionSet } from '../src/survey/questionLoader.ts';
import { currentState, currentView } from '../src/server/answerService.ts';
import { createContext } from '../src/server/server.ts';
import { createProposalSession, submitProposal, getProposalSession } from '../src/server/proposalService.ts';
import { lifecycleCommand, readLifecycle } from '../src/server/adminService.ts';
import { CorruptStateError, replayExhibitionRun } from '../src/server/runStore.ts';
import { devSurveyConfig } from '../src/server/devSurvey.ts';
import { selectAutoAnswers } from '../src/ui/autoAnswers.ts';
import { CURRENT_EXHIBITION_QUESTIONS_PATH, EXHIBITION_QUESTIONS_PATH, ok, errorCode, staff } from './surveyFixture.ts';
import { DISPLAY_MS } from '../src/shared/displayTiming.ts';

const current = validateExhibitionQuestionSet(loadQuestionSetFile(CURRENT_EXHIBITION_QUESTIONS_PATH));
const legacy = loadQuestionSetFile(EXHIBITION_QUESTIONS_PATH);
assert.equal(current.version, 4);
assert.deepEqual(current.questions.filter(q => q.id !== 'energy-2127'), legacy.questions.filter(q => q.id !== 'cooling-2127'));
assert.deepEqual(current.questions[2].options.map(o => o.energy), ENERGY_CHOICES);
for (const bad of ['duplicate', 'climate-vote', 'old-version', 'unknown'] as const) {
  const set = structuredClone(current);
  if (bad === 'duplicate') set.questions[2].options[1].energy = 'water-storage';
  if (bad === 'climate-vote') set.questions[2].options[1].effects = { environmentalPriority: 0 };
  if (bad === 'old-version') set.version = 3;
  if (bad === 'unknown') set.questions[2].options[1].energy = 'unknown' as EnergyChoice;
  assert.throws(() => validateExhibitionQuestionSet(set));
}
const config = devSurveyConfig(current), settings = { profile: 'zero' as const, count: 4, seed: 2127, extraWaitMs: 0, custom: {} };
assert.equal(config.meters.length, 3);
assert.deepEqual(ENERGY_CHOICES.map((_, i) => selectAutoAnswers(config, settings, i).at(-1)?.optionId), ENERGY_CHOICES);
assert.equal(selectAutoAnswers(config, { ...settings, energy: 'island-supply' }, 0).at(-1)?.optionId, 'island-supply');

let state = initialExhibitionState('pure', 'start');
const vote = (energy: EnergyChoice) => ({ ...zeroScores(), energy });
for (let n = 1; n <= 3; n++) {
  state = applyProposalVotes(state, vote('water-storage'), String(n));
  assert.equal(energyConfiguration(state.energy!.counts).waterGardens, n === 1 ? 0 : n === 2 ? 1 : 2);
  assert.equal(state.energy!.climateGuestCount, 0);
  assert.equal(state.scores.environmentalPriority, 0);
}
const mix = emptyEnergyCounts(); for (const key of ENERGY_CHOICES) mix[key] = 4;
assert.deepEqual(energyConfiguration(mix), { waterGardens: 1, receiver: 'small', flywheel: true, island: true });
assert.throws(() => applyProposalVotes(state, { ...vote('water-storage'), environmentalPriority: 1 }, 'bad'));
assert.throws(() => validateExhibitionState({ ...state, energy: { ...state.energy!, climateGuestCount: 1 } }));
assert.throws(() => validateExhibitionState({ ...state, energy: { ...state.energy!, counts: { ...state.energy!.counts, 'water-storage': -1 } } }));

const dir = mkdtempSync(join(tmpdir(), 'energy-authority-'));
try {
  const path = join(dir, 'schema7.sqlite');
  let clock = Date.parse('2026-10-24T00:00:00.000Z');
  let ctx = createContext({ dbPath: path, questionsPath: EXHIBITION_QUESTIONS_PATH, now: () => new Date(clock) });
  const oldSession = ok(createProposalSession(ctx).response);
  const oldRequest = { submissionId: 'legacy', guestSessionId: oldSession.session.id, expectedRevision: 0,
    answers: oldSession.questions.map(q => ({ questionId: q.id, optionId: q.options[2].id })) };
  const oldSaved = ok(submitProposal(ctx, oldRequest).response);
  clock += DISPLAY_MS + 1;
  const oldDraft = ok(createProposalSession(ctx).response);
  const oldView = currentView(ctx);
  const oldRows = ctx.db.prepare('SELECT * FROM proposal_events').all();
  // Recreate a real pre-E4 database shape, then open it with the actual migration.
  ctx.db.exec('ALTER TABLE exhibition_snapshots DROP COLUMN energy_json; PRAGMA user_version = 7');
  ctx.db.close();
  ctx = createContext({ dbPath: path, questionsPath: CURRENT_EXHIBITION_QUESTIONS_PATH, now: () => new Date(clock) });
  assert.equal(ctx.db.prepare('PRAGMA user_version').get()?.user_version, 8);
  assert.deepEqual(currentView(ctx), oldView, 'upgrade preserves the inherited city and all old records');
  assert.deepEqual(ctx.db.prepare('SELECT * FROM proposal_events').all(), oldRows);
  assert.equal(errorCode(getProposalSession(ctx, oldDraft.session.id)), 'unsupported_version');
  assert.deepEqual(ok(submitProposal(ctx, oldRequest).response).proposal, oldSaved.proposal);
  ok(staff(ctx, 'guest-left'));
  const oldClimate = oldSaved.state.scores.environmentalPriority;
  const oldLayout = oldSaved.proposal.afterLayout;
  let lastRequest: Parameters<typeof submitProposal>[1], beforeLast: ReturnType<typeof currentView> | undefined;
  for (let i = 0; i < 70; i++) {
    beforeLast = currentView(ctx);
    const session = ok(createProposalSession(ctx).response);
    assert.equal(session.session.questionSetVersion, 4);
    lastRequest = { submissionId: `new-${i}`, guestSessionId: session.session.id, expectedRevision: session.state.revision,
      answers: session.questions.map(q => ({ questionId: q.id, optionId: q.id === 'energy-2127' ? ENERGY_CHOICES[i % 4] : q.options[1].id })) };
    const accepted = ok(submitProposal(ctx, lastRequest).response);
    assert.equal(accepted.state.scores.environmentalPriority, oldClimate);
    assert.equal(accepted.state.recentVotes.environmentalPriority, oldSaved.state.recentVotes.environmentalPriority);
    assert.equal(accepted.state.energy!.climateGuestCount, 1);
    assert.deepEqual([accepted.proposal.afterLayout.bands.ne, accepted.proposal.afterLayout.treeCount, accepted.proposal.afterLayout.plantedFraction, accepted.proposal.afterLayout.coolingFins],
      [oldLayout.bands.ne, oldLayout.treeCount, oldLayout.plantedFraction, oldLayout.coolingFins], 'energy guests never rescale the old climate');
    assert.deepEqual(ok(submitProposal(ctx, lastRequest).response).state, accepted.state, 'same-ID retries do not add energy votes');
    clock += DISPLAY_MS + 1;
  }
  const undo = lifecycleCommand(ctx, { command: 'undo-proposal', proposalId: 'new-69', expectedRevision: readLifecycle(ctx.db).revision });
  ok(undo.response);
  assert.deepEqual(currentView(ctx), beforeLast, 'Undo restores energy, climate, seeds and previous layout');
  assert.equal(errorCode(submitProposal(ctx, lastRequest).response), 'proposal_undone');
  const savedView = currentView(ctx), savedState = currentState(ctx);
  assert.ok('recentProposals' in savedView && savedView.recentProposals.length === 64);
  assert.equal(Object.values(savedState.energy!.counts).reduce((n, v) => n + v, 0), 69, 'tallies keep the full run beyond the 64-record display window');
  ctx.db.close();
  ctx = createContext({ dbPath: path, questionsPath: CURRENT_EXHIBITION_QUESTIONS_PATH, now: () => new Date(clock) });
  assert.deepEqual(currentView(ctx), savedView);
  const run = ctx.db.prepare('SELECT started_at FROM runs WHERE id = ?').get(savedState.runId)!;
  assert.deepEqual(replayExhibitionRun(ctx.db, savedState.runId, String(run.started_at)), savedState);
  ctx.db.close();
  const corrupt = new DatabaseSync(path);
  const energy = structuredClone(savedState.energy!);
  energy.counts['water-storage']++; energy.counts['rotor-storage']--;
  corrupt.prepare('UPDATE exhibition_snapshots SET energy_json = ? WHERE run_id = ?').run(JSON.stringify(energy), savedState.runId);
  corrupt.close();
  assert.throws(() => createContext({ dbPath: path, questionsPath: CURRENT_EXHIBITION_QUESTIONS_PATH }), CorruptStateError);
  const repair = new DatabaseSync(path);
  repair.prepare('UPDATE exhibition_snapshots SET energy_json = ? WHERE run_id = ?').run(JSON.stringify(savedState.energy), savedState.runId);
  repair.close();
  ctx = createContext({ dbPath: path, questionsPath: CURRENT_EXHIBITION_QUESTIONS_PATH, now: () => new Date(clock) });
  ok(staff(ctx, 'reset-city', 'RESET'));
  const reset = ok(createProposalSession(ctx).response);
  assert.equal(reset.state.revision, 0);
  assert.equal('energy' in reset.state, false);
  assert.deepEqual(ok(submitProposal(ctx, oldRequest).response).proposal, oldSaved.proposal, 'old retry survives energy reset');
  ctx.db.close();
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log('PASS: E4 question4, exact thresholds, independent energy, frozen climate, schema7→8, immutable old copy, retry, replay, Undo, reset and auto runner.');
