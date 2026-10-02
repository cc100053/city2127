import { readDisplayMode, setDisplayMode } from '../src/server/adminService.ts';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { currentState, currentView } from '../src/server/answerService.ts';
import { createContext } from '../src/server/server.ts';
import { SCHEMA_VERSION, migrations, schemaVersion } from '../src/server/migrations.ts';
import { CorruptStateError, replayExhibitionRun, replayRun, runAnswerEvents } from '../src/server/runStore.ts';
import { createProposalSession, submitProposal } from '../src/server/proposalService.ts';
import { ok, EXHIBITION_QUESTIONS_PATH, staff } from './surveyFixture.ts';

const dir = mkdtempSync(join(tmpdir(), 'survey-exhibition-migration-'));
try {
  const dbPath = join(dir, 'schema2.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON');
  const schema1 = migrations[0];
  const migrateTo2 = migrations[1];
  if (typeof schema1 !== 'string' || typeof migrateTo2 !== 'function') throw new Error('expected schema 1 and 2 migrations');
  db.exec(`BEGIN IMMEDIATE; ${schema1}; PRAGMA user_version = 1; COMMIT`);
  db.prepare(`INSERT INTO runs (id, status, started_at) VALUES ('legacy-placeholder', 'active', '2026-09-20T00:00:00.000Z')`).run();
  db.prepare(`INSERT INTO guest_sessions (id, run_id, question_id, status, created_at, expires_at, answered_at)
    VALUES ('legacy-guest', 'legacy-placeholder', 'energy-01', 'answered', 'a', 'b', 'c')`).run();
  db.prepare(`INSERT INTO answer_events (id, run_id, guest_session_id, question_id, option_id, question_version, effects_json, revision_before, revision_after, answered_at)
    VALUES ('legacy-answer', 'legacy-placeholder', 'legacy-guest', 'energy-01', 'solar-canopy', 1, '{"environment":3,"technology":1}', 0, 1, 'c')`).run();
  db.prepare(`INSERT INTO city_snapshots VALUES ('legacy-placeholder', 1, 1, 3, 0, 1, 0, 0, 0, 0, 0, 'c')`).run();
  db.exec('BEGIN IMMEDIATE');
  migrateTo2(db);
  db.exec('PRAGMA user_version = 2; COMMIT');

  // Add one schema-2 policy event and its matching snapshot to the still-active policy run.
  const policyRunId = String(db.prepare("SELECT id FROM runs WHERE status = 'active'").get()?.id);
  db.prepare(`INSERT INTO guest_sessions (id, run_id, question_id, status, created_at, expires_at, answered_at)
    VALUES ('policy-guest', ?, 'urban-forest', 'answered', '2026-09-21T00:00:00.000Z', 'z', '2026-09-21T00:01:00.000Z')`).run(policyRunId);
  db.prepare(`INSERT INTO guest_sessions (id, run_id, question_id, status, created_at, expires_at)
    VALUES ('policy-pending', ?, 'mobility-01', 'reserved', '2026-09-21T00:00:00.000Z', 'z')`).run(policyRunId);
  db.prepare(`INSERT INTO answer_events (id, run_id, guest_session_id, question_id, option_id, question_version, effects_json, revision_before, revision_after, answered_at)
    VALUES ('policy-answer', ?, 'policy-guest', 'urban-forest', 'green-01', 2, '{"environmentalPriority":2,"automation":1}', 0, 1, '2026-09-21T00:01:00.000Z')`).run(policyRunId);
  db.prepare(`UPDATE city_snapshots SET revision = 1, answer_count = 1, automation = 1, environmental_priority = 2,
    updated_at = '2026-09-21T00:01:00.000Z' WHERE run_id = ?`).run(policyRunId);
  db.close();

  // Opening the actual schema-2 file appends migration 3, ends its active legacy run, and starts v2.
  const migrated = createContext({ dbPath, questionsPath: EXHIBITION_QUESTIONS_PATH });
  assert.equal(schemaVersion(migrated.db), SCHEMA_VERSION);
  const exhibition = currentState(migrated);
  assert.equal('algorithmVersion' in exhibition && exhibition.algorithmVersion, 2);
  assert.equal(exhibition.revision, 0);
  assert.equal(migrated.db.prepare('SELECT status FROM runs WHERE id = ?').get(policyRunId)?.status, 'ended');
  assert.equal(migrated.db.prepare('SELECT algorithm_version FROM runs WHERE id = ?').get(policyRunId)?.algorithm_version, 1);
  assert.equal(migrated.db.prepare("SELECT status FROM proposal_sessions WHERE id = 'policy-pending'").get(), undefined,
    'legacy reservation remains in its own session table');
  assert.equal(migrated.db.prepare("SELECT status FROM guest_sessions WHERE id = 'policy-pending'").get()?.status, 'expired');
  assert.deepEqual(runAnswerEvents(migrated.db, policyRunId).map(event => event.id), ['policy-answer']);
  const legacyRun = migrated.db.prepare('SELECT started_at FROM runs WHERE id = ?').get(policyRunId);
  const replayedLegacy = replayRun(migrated.db, policyRunId, String(legacyRun?.started_at));
  const legacySnapshot = migrated.db.prepare('SELECT revision, answer_count, automation, environmental_priority FROM city_snapshots WHERE run_id = ?').get(policyRunId);
  assert.deepEqual([replayedLegacy.revision, replayedLegacy.answerCount, replayedLegacy.scores.automation, replayedLegacy.scores.environmentalPriority],
    [legacySnapshot?.revision, legacySnapshot?.answer_count, legacySnapshot?.automation, legacySnapshot?.environmental_priority]);
  assert.equal(migrated.db.prepare("SELECT environment FROM city_snapshots_v1 WHERE run_id = 'legacy-placeholder'").get()?.environment, 3);
  assert.throws(() => migrated.db.prepare("UPDATE answer_events SET option_id = 'changed' WHERE id = 'policy-answer'").run(), /append-only/);

  const choiceIndices = [[2, 0, 2, 0], [0, 2, 0, 2], [2, 2, 0, 0], [0, 0, 2, 2], [1, 2, 1, 0], [2, 1, 0, 2], [0, 2, 1, 0]];
  let saved = exhibition;
  let frozenQuestionText = '';
  for (let i = 0; i < choiceIndices.length; i++) {
    const session = ok(createProposalSession(migrated));
    frozenQuestionText ||= session.questions[0].text;
    const request = {
      submissionId: `after-migration-${i}`, guestSessionId: session.session.id, expectedRevision: i,
      answers: session.questions.map((question, j) => ({ questionId: question.id, optionId: question.options[choiceIndices[i][j]].id })),
    };
    const accepted = ok(submitProposal(migrated, request).response);
    ok(staff(migrated, 'guest-left'));
    saved = accepted.state;
  }
  assert.ok(Object.values(saved.recentVotes).some(value => !Number.isInteger(value)), 'EMA history contains persisted fractions');
  assert.ok(Object.values(saved.scores).some(value => !Number.isInteger(value)), 'score snapshot contains persisted fractions');
  migrated.questions.questions[0].text = 'Question text changed after the event was stored';
  const stored = migrated.db.prepare('SELECT answers_json FROM proposal_events WHERE id = ?').get('after-migration-0');
  assert.equal(JSON.parse(String(stored?.answers_json))[0].questionText, frozenQuestionText, 'event text is copied when the proposal commits');
  assert.equal(readDisplayMode(migrated.db), 'auto', 'migration defaults to the existing cycle');
  assert.ok(setDisplayMode(migrated, { mode: 'night' }).response.ok);
  const savedView = currentView(migrated);
  migrated.db.close();

  // Restart recomputes the complete v2 state from immutable proposal events and checks the snapshot.
  const restarted = createContext({ dbPath, questionsPath: EXHIBITION_QUESTIONS_PATH });
  assert.deepEqual(currentState(restarted), saved);
  assert.deepEqual(currentView(restarted), savedView, 'full-history slot seeds survive a real SQLite restart');
  assert.equal(readDisplayMode(restarted.db), 'night', 'staff lighting choice survives server restart');
  const exhibitionRun = restarted.db.prepare("SELECT started_at FROM runs WHERE id = ?").get(saved.runId);
  assert.deepEqual(replayExhibitionRun(restarted.db, saved.runId, String(exhibitionRun?.started_at)), saved);
  assert.equal(Number(restarted.db.prepare('SELECT typeof(vote_sum_automation) AS t FROM exhibition_snapshots').get()?.t === 'real'), 1);
  assert.equal(Number(restarted.db.prepare("SELECT COUNT(*) AS n FROM answer_events WHERE id IN ('legacy-answer', 'policy-answer')").get()?.n), 2);
  restarted.db.close();

  // Change the stored sum and EMA by opposite amounts so the meter stays identical. Full-state replay still refuses it.
  const corrupt = new DatabaseSync(dbPath);
  const meter = corrupt.prepare('SELECT vote_sum_automation, recent_automation, guest_count FROM exhibition_snapshots WHERE run_id = ?').get(saved.runId);
  const count = Number(meter?.guest_count);
  corrupt.prepare(`UPDATE exhibition_snapshots SET vote_sum_automation = ?, recent_automation = ? WHERE run_id = ?`)
    .run(Number(meter?.vote_sum_automation) + 1, Number(meter?.recent_automation) - 1 / count, saved.runId);
  corrupt.close();
  assert.throws(() => createContext({ dbPath, questionsPath: EXHIBITION_QUESTIONS_PATH }),
    (error: unknown) => error instanceof CorruptStateError && /snapshot .* does not match its proposal events/.test(error.message));
  console.log('PASS: real schema-2 policy run migrates append-only to v2 while preserving/replaying all legacy records; v2 proposal snapshot survives restart.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
