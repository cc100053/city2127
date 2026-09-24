import assert from 'node:assert/strict';
import { initialCitySurveyState, zeroScores } from '../src/shared/citySurveyState.ts';
import { applyEffects, scoreChange } from '../src/survey/scoreEngine.ts';
import { submitAnswer } from '../src/server/answerService.ts';
import { createGuestSession } from '../src/server/sessionService.ts';
import { fixture, ok } from './surveyFixture.ts';

const initial = initialCitySurveyState('run', '2026-09-23T00:00:00.000Z');
assert.deepEqual(initial.scores, { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 });
assert.equal(initial.revision, 0);

assert.deepEqual(applyEffects(zeroScores(), { environmentalPriority: 3, automation: 1 }), { automation: 1, publicSharing: 0, environmentalPriority: 3, urbanConcentration: 0 });
assert.deepEqual(applyEffects({ ...zeroScores(), urbanConcentration: 2 }, { urbanConcentration: -3, publicSharing: 2 }), { automation: 0, publicSharing: 2, environmentalPriority: 0, urbanConcentration: -1 });

const high = { ...zeroScores(), environmentalPriority: 11 }, low = { ...zeroScores(), publicSharing: -11 };
assert.equal(applyEffects(high, { environmentalPriority: 3 }).environmentalPriority, 12);
assert.equal(applyEffects(low, { publicSharing: -3 }).publicSharing, -12);
assert.equal(applyEffects({ ...zeroScores(), environmentalPriority: 12 }, { environmentalPriority: 3 }).environmentalPriority, 12);
assert.deepEqual(scoreChange(high, applyEffects(high, { environmentalPriority: 3, automation: 1 })), { environmentalPriority: 1, automation: 1 });

// The server takes effects from the question JSON even when a client sends its own.
const { ctx } = fixture();
const guest = ok(createGuestSession(ctx));
assert.equal(guest.question.id, 'energy-01');
assert.ok(!('effects' in guest.question.options[0]), 'guest question must not expose effects');
const result = ok(submitAnswer(ctx, {
  answerId: 'forged', guestSessionId: guest.session.id, questionId: 'energy-01', optionId: 'solar-canopy', expectedRevision: 0,
  effects: { environmentalPriority: 12, publicSharing: 12 }, scores: { environmentalPriority: 12 },
}).response);
assert.deepEqual(result.event.effects, { environmentalPriority: 3, automation: 1 });
assert.deepEqual(result.state.scores, { automation: 1, publicSharing: 0, environmentalPriority: 3, urbanConcentration: 0 });
console.log('PASS: zero start, vector addition, clamp at -12/12, client-sent effects ignored.');
