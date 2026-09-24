import assert from 'node:assert/strict';
import { initialCitySurveyState, toCityViewInput, zeroScores } from '../src/shared/citySurveyState.ts';
import { applyEffects, scoreChange } from '../src/survey/scoreEngine.ts';
import { submitAnswer } from '../src/server/answerService.ts';
import { createGuestSession } from '../src/server/sessionService.ts';
import { fixture, ok } from './surveyFixture.ts';

const initial = initialCitySurveyState('run', '2026-09-23T00:00:00.000Z');
assert.deepEqual(initial.scores, { environment: 0, culture: 0, technology: 0, community: 0, mobility: 0 });
assert.equal(initial.revision, 0);

assert.deepEqual(applyEffects(zeroScores(), { environment: 3, technology: 1 }), { environment: 3, culture: 0, technology: 1, community: 0, mobility: 0 });
assert.deepEqual(applyEffects({ ...zeroScores(), mobility: 2 }, { mobility: -3, community: 2 }), { environment: 0, culture: 0, technology: 0, community: 2, mobility: -1 });

const high = { ...zeroScores(), environment: 11 }, low = { ...zeroScores(), culture: -11 };
assert.equal(applyEffects(high, { environment: 3 }).environment, 12);
assert.equal(applyEffects(low, { culture: -3 }).culture, -12);
assert.equal(applyEffects({ ...zeroScores(), environment: 12 }, { environment: 3 }).environment, 12);
assert.deepEqual(scoreChange(high, applyEffects(high, { environment: 3, technology: 1 })), { environment: 1, technology: 1 });

// The server takes effects from the question JSON even when a client sends its own.
const { ctx } = fixture();
const guest = ok(createGuestSession(ctx));
assert.equal(guest.question.id, 'energy-01');
assert.ok(!('effects' in guest.question.options[0]), 'guest question must not expose effects');
const result = ok(submitAnswer(ctx, {
  answerId: 'forged', guestSessionId: guest.session.id, questionId: 'energy-01', optionId: 'solar-canopy', expectedRevision: 0,
  effects: { environment: 12, culture: 12 }, scores: { environment: 12 },
}).response);
assert.deepEqual(result.event.effects, { environment: 3, technology: 1 });
assert.deepEqual(result.state.scores, { environment: 3, culture: 0, technology: 1, community: 0, mobility: 0 });
console.log('PASS: zero start, vector addition, clamp at -12/12, client-sent effects ignored.');
const view = toCityViewInput({ ...result.state, milestones: { greenNetwork: true, civicCommons: false, autonomousGrid: false } });
assert.deepEqual(view.normalized, { environment: .25, culture: 0, technology: 1 / 12, community: 0, mobility: 0 });
assert.deepEqual(view.unlocked, ['greenNetwork']);
console.log('PASS: CitySurveyState → normalized view input entry point.');
