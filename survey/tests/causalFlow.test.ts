import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { currentState, currentView, submitAnswer } from '../src/server/answerService.ts';
import { resetRun } from '../src/server/adminService.ts';
import { createGuestSession } from '../src/server/sessionService.ts';
import { createContext } from '../src/server/server.ts';
import type { SurveyContext } from '../src/server/context.ts';
import { answerNext, errorCode, fixture, MVP_QUESTIONS_PATH, ok } from './surveyFixture.ts';

const mvp = (dbPath = ':memory:') => fixture(dbPath, Date.parse('2026-09-24T10:00:00.000Z'), MVP_QUESTIONS_PATH).ctx;
const slots = (ctx: SurveyContext) => Object.values(currentView(ctx).layout.lots).map(l => `${l.socketId}:${l.lot}/${l.building}`);
const BASELINE = ['nw:empty/none', 'ne:empty/none', 'sw:empty/none', 'se:empty/none'];

// Mandatory demo: three different guests, one question each, each question caused by the previous answer.
const dir = mkdtempSync(join(tmpdir(), 'survey-causal-'));
try {
  const dbPath = join(dir, 'survey.sqlite');
  const ctx = mvp(dbPath);
  assert.deepEqual(slots(ctx), BASELINE);

  const g1 = answerNext(ctx, 'automate-services');
  assert.equal(g1.guest.question.id, 'labour-shortage');
  assert.equal(g1.guest.question.year, 2072);
  assert.ok(g1.guest.question.background?.includes('働き手'));
  assert.deepEqual(g1.answer.state.scores, { automation: 2, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 });
  assert.deepEqual(slots(ctx), ['nw:empty/medium', 'ne:empty/none', 'sw:empty/none', 'se:empty/none']);

  const g2 = answerNext(ctx, 'public-commons');
  assert.equal(g2.guest.question.id, 'automation-street-decline', 'automation causes the street-decline question');
  assert.deepEqual(slots(ctx), ['nw:empty/medium', 'ne:empty/none', 'sw:plaza/none', 'se:empty/none']);

  const g3 = answerNext(ctx, 'build-upward');
  assert.equal(g3.guest.question.id, 'commons-land-pressure', 'commons cause the land-pressure question');
  const finalSlots = ['nw:empty/medium', 'ne:empty/none', 'sw:plaza/none', 'se:empty/tall'];
  assert.deepEqual(slots(ctx), finalSlots, 'automation hub, plaza and vertical tower coexist');

  const history = currentView(ctx).history;
  assert.deepEqual(history.map(d => [d.pressure, d.optionLabel, d.policyChange, d.cityChanges.map(c => c.socketId)]), [
    ['労働力不足', '店舗と配達を自動化する', { automation: 2 }, ['nw']],
    ['街のにぎわいの低下', '誰でも集まれる公共のコモンズをつくる', { publicSharing: 2 }, ['sw']],
    ['中心部の土地不足', '上へ伸ばし、機能を垂直に集約する', { urbanConcentration: 2 }, ['se']],
  ]);
  assert.deepEqual(history.map(d => d.revision), [1, 2, 3]);

  // Restart: the same policy state and the same derived city come back from the database.
  const before = currentState(ctx), view = currentView(ctx);
  ctx.db.close();
  const restarted = createContext({ dbPath, questionsPath: MVP_QUESTIONS_PATH });
  assert.deepEqual(currentState(restarted), before);
  assert.deepEqual(currentView(restarted), view);

  // Reset: new run, empty history, baseline city; the old run's answers are kept.
  ok(resetRun(restarted, { confirmation: 'RESET' }).response);
  assert.deepEqual(slots(restarted), BASELINE);
  assert.equal(currentView(restarted).history.length, 0);
  assert.equal(Number(restarted.db.prepare('SELECT COUNT(*) AS n FROM answer_events WHERE run_id = ?').get(before.runId)?.n), 3);
  assert.equal(ok(createGuestSession(restarted)).question.id, 'labour-shortage', 'a new run starts the story again');
  restarted.db.close();
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// Eligibility: the consequence questions are unavailable until their trigger holds.
{
  const ctx = mvp();
  const first = ok(createGuestSession(ctx));
  assert.equal(first.question.id, 'labour-shortage');
  // While labour-shortage is reserved and nothing is automated, a parallel guest gets an untriggered fallback.
  assert.equal(ok(createGuestSession(ctx)).question.id, 'heat-stress');
  assert.equal(ok(createGuestSession(ctx)).question.id, 'social-isolation');
  assert.equal(errorCode(createGuestSession(ctx)), 'no_question_available', 'street-decline and land-pressure are not eligible at zero');
}

// Branching and no dead ends: every first choice leads to at least three answered guests,
// and answered questions are never assigned twice.
const branches: Record<string, string[]> = {
  'automate-services': ['labour-shortage', 'automation-street-decline', 'commons-land-pressure'],
  'neighbourhood-cooperatives': ['labour-shortage', 'commons-land-pressure', 'heat-stress'],
  'compact-services': ['labour-shortage', 'heat-stress', 'social-isolation'],
};
for (const [firstChoice, expected] of Object.entries(branches)) {
  const ctx = mvp();
  const asked = [answerNext(ctx, firstChoice).guest.question.id];
  while (true) {
    const next = createGuestSession(ctx);
    if (!next.ok) break;
    asked.push(next.data.question.id);
    // Later guests pick option 0.
    ok(submitAnswer(ctx, {
      answerId: `branch-${firstChoice}-${asked.length}`, guestSessionId: next.data.session.id, questionId: next.data.question.id,
      optionId: next.data.question.options[0].id, expectedRevision: next.data.state.revision,
    }).response);
  }
  assert.deepEqual(asked.slice(0, 3), expected, `branch after ${firstChoice}`);
  assert.ok(asked.length >= 3, `${firstChoice} must not dead-end before three guests`);
  assert.equal(new Set(asked).size, asked.length, 'no question is assigned twice');
}
console.log('PASS: labour → automation → commons → vertical demo, eligibility triggers, branching without dead ends, restart and reset of the derived city.');
