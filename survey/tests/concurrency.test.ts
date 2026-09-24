import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { applyEffects } from '../src/survey/scoreEngine.ts';
import { zeroScores } from '../src/shared/citySurveyState.ts';
import { currentState } from '../src/server/answerService.ts';
import { fixture, QUESTIONS_PATH } from './surveyFixture.ts';

type Result = { questionId: string | null; answered: boolean; conflicts: number };
const dir = mkdtempSync(join(tmpdir(), 'survey-concurrency-'));
try {
  const dbPath = join(dir, 'survey.sqlite');
  const { ctx } = fixture(dbPath, Date.now());
  const workers = 8, barrier = new SharedArrayBuffer(8);
  const results = await Promise.all(Array.from({ length: workers }, () => new Promise<Result>((resolve, reject) => {
    const worker = new Worker(new URL('./concurrencyWorker.ts', import.meta.url), { workerData: { dbPath, questionsPath: QUESTIONS_PATH, barrier, workers } });
    worker.once('message', resolve);
    worker.once('error', reject);
  })));
  const assigned = results.map(r => r.questionId);
  assert.ok(assigned.every(id => id !== null));
  assert.equal(new Set(assigned).size, workers, `each concurrent guest got a different question: ${assigned.join(', ')}`);
  assert.ok(results.every(r => r.answered));

  // Every answer counted once: final scores equal the sum of the chosen options, revision equals answers.
  const state = currentState(ctx);
  let expected = zeroScores();
  for (const q of ctx.questions.questions) expected = applyEffects(expected, q.options[0].effects);
  assert.equal(state.revision, workers);
  assert.equal(state.answerCount, workers);
  assert.deepEqual(state.scores, expected);
  const sequences = ctx.db.prepare('SELECT sequence, revision_after FROM answer_events ORDER BY sequence').all();
  assert.deepEqual(sequences.map(r => Number(r.revision_after)), Array.from({ length: workers }, (_, i) => i + 1));
  const conflicts = results.reduce((n, r) => n + r.conflicts, 0);
  assert.ok(conflicts > 0, 'guests answering the same revision must see revision conflicts');
  ctx.db.close();
  console.log(`PASS: ${workers} concurrent connections — distinct questions, no lost updates (${conflicts} revision conflicts retried).`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
