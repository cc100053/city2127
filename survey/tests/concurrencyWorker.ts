import { parentPort, workerData } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../src/server/database.ts';
import { loadQuestionSetFile } from '../src/survey/questionLoader.ts';
import { createGuestSession } from '../src/server/sessionService.ts';
import { submitAnswer } from '../src/server/answerService.ts';

// A separate thread with its own SQLite connection, standing in for another server process.
const { dbPath, questionsPath, barrier, workers } = workerData as { dbPath: string; questionsPath: string; barrier: SharedArrayBuffer; workers: number };
// Wait until every worker reaches the same step, so reservations and answers really overlap.
const counters = new Int32Array(barrier);
function arrive(step: number) {
  if (Atomics.add(counters, step, 1) + 1 === workers) Atomics.notify(counters, step);
  while (Atomics.load(counters, step) < workers) Atomics.wait(counters, step, Atomics.load(counters, step), 50);
}
const ctx = { db: openDatabase(dbPath), questions: loadQuestionSetFile(questionsPath), now: () => new Date(), newId: randomUUID, reservationMs: 120_000 };
arrive(0);
const session = createGuestSession(ctx);
arrive(1);
let answered = false, conflicts = 0;
if (session.ok) {
  // Retry with the latest revision until this answer lands; a lost update would show up as a wrong final score.
  for (let revision = session.data.state.revision; !answered; ) {
    const { response } = submitAnswer(ctx, { answerId: randomUUID(), guestSessionId: session.data.session.id, questionId: session.data.question.id, optionId: session.data.question.options[0].id, expectedRevision: revision });
    if (response.ok) answered = true;
    else if (response.error.code === 'revision_conflict' && response.state) { conflicts++; revision = response.state.revision; }
    else throw new Error(response.error.code);
  }
}
ctx.db.close();
parentPort?.postMessage({ questionId: session.ok ? session.data.question.id : null, answered, conflicts });
