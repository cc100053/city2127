import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../src/server/database.ts';
import { migrations, SCHEMA_VERSION, SchemaVersionError, schemaVersion } from '../src/server/migrations.ts';
import { CorruptStateError, readSnapshot, replayRun, runAnswerEvents } from '../src/server/runStore.ts';
import { currentState } from '../src/server/answerService.ts';
import { recentEvents } from '../src/server/adminService.ts';
import { createContext } from '../src/server/server.ts';
import { answerNext, fixture, QUESTIONS_PATH } from './surveyFixture.ts';

const dir = mkdtempSync(join(tmpdir(), 'survey-persistence-'));
try {
  const dbPath = join(dir, 'survey.sqlite');
  const first = fixture(dbPath);
  answerNext(first.ctx, 'solar-canopy');
  answerNext(first.ctx, 'walkable-blocks');
  answerNext(first.ctx, 'urban-forest');
  const before = currentState(first.ctx);
  first.ctx.db.close();

  // Restart: the same run and CitySurveyState come back, and match a replay of the stored events.
  const restarted = createContext({ dbPath, questionsPath: QUESTIONS_PATH });
  assert.deepEqual(currentState(restarted), before);
  const events = runAnswerEvents(restarted.db, before.runId);
  assert.deepEqual(events.map(e => e.optionId), ['solar-canopy', 'walkable-blocks', 'urban-forest']);
  assert.deepEqual(events.map(e => e.effects), [{ environmentalPriority: 3, automation: 1 }, { environmentalPriority: 2, publicSharing: 2, urbanConcentration: 1 }, { environmentalPriority: 3, publicSharing: 1 }]);
  const run = restarted.db.prepare('SELECT started_at FROM runs WHERE id = ?').get(before.runId);
  const replay = replayRun(restarted.db, before.runId, String(run?.started_at));
  assert.deepEqual({ ...replay, updatedAt: '' }, { ...before, updatedAt: '' });
  assert.equal(schemaVersion(restarted.db), SCHEMA_VERSION);

  // A snapshot that disagrees with its events stops startup instead of being reset.
  restarted.db.prepare('UPDATE city_snapshots SET environmental_priority = environmental_priority - 1').run();
  restarted.db.close();
  assert.throws(() => createContext({ dbPath, questionsPath: QUESTIONS_PATH }), (e: unknown) => e instanceof CorruptStateError && /does not match/.test(e.message));
  const inspect = new DatabaseSync(dbPath);
  assert.equal(Number(inspect.prepare('SELECT COUNT(*) AS n FROM runs').get()?.n), 1, 'no new run was created');
  assert.equal(Number(inspect.prepare('SELECT environmental_priority FROM city_snapshots').get()?.environmental_priority), before.scores.environmentalPriority - 1, 'corrupt row left for inspection');
  assert.equal(Number(inspect.prepare('SELECT COUNT(*) AS n FROM answer_events').get()?.n), 3);
  // A missing snapshot is also refused.
  inspect.exec('DELETE FROM city_snapshots');
  inspect.close();
  assert.throws(() => createContext({ dbPath, questionsPath: QUESTIONS_PATH }), (e: unknown) => e instanceof CorruptStateError && /no city snapshot/.test(e.message));
  // Runs exist but none is active.
  const noActive = new DatabaseSync(dbPath);
  noActive.exec(`UPDATE runs SET status = 'ended'`);
  noActive.close();
  assert.throws(() => createContext({ dbPath, questionsPath: QUESTIONS_PATH }), (e: unknown) => e instanceof CorruptStateError && /none is active/.test(e.message));

  // Schema version: a fresh database is migrated; a newer database is refused and left untouched.
  const fresh = openDatabase(join(dir, 'fresh.sqlite'));
  assert.equal(schemaVersion(fresh), SCHEMA_VERSION);
  assert.equal(Number(fresh.prepare('PRAGMA foreign_keys').get()?.foreign_keys), 1);
  assert.throws(() => fresh.prepare(`INSERT INTO guest_sessions (id, run_id, question_id, status, created_at, expires_at) VALUES ('g', 'missing-run', 'q', 'reserved', 'a', 'b')`).run(), /FOREIGN KEY/);
  fresh.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
  fresh.close();
  assert.throws(() => openDatabase(join(dir, 'fresh.sqlite')), (e: unknown) => e instanceof SchemaVersionError && /newer than this server/.test(e.message));
  const check = new DatabaseSync(join(dir, 'fresh.sqlite'));
  assert.equal(Number(check.prepare('PRAGMA user_version').get()?.user_version), SCHEMA_VERSION + 1);
  check.close();

  // Schema 1 → 2: a run answered on the placeholder axes is ended (not deleted) and a zero policy run starts.
  const v1Path = join(dir, 'v1.sqlite');
  const v1 = new DatabaseSync(v1Path);
  v1.exec(String(migrations[0]));
  v1.exec(`PRAGMA user_version = 1;
    INSERT INTO runs (id, status, started_at) VALUES ('old-run', 'active', '2026-09-20T00:00:00.000Z');
    INSERT INTO guest_sessions (id, run_id, question_id, status, created_at, expires_at, answered_at) VALUES ('g-old', 'old-run', 'energy-01', 'answered', 'a', 'b', 'c');
    INSERT INTO guest_sessions (id, run_id, question_id, status, created_at, expires_at) VALUES ('g-pending', 'old-run', 'mobility-01', 'reserved', 'a', 'z');
    INSERT INTO answer_events (id, run_id, guest_session_id, question_id, option_id, question_version, effects_json, revision_before, revision_after, answered_at)
      VALUES ('old-answer', 'old-run', 'g-old', 'energy-01', 'solar-canopy', 1, '{"environment":3,"technology":1}', 0, 1, 'c');
    INSERT INTO city_snapshots VALUES ('old-run', 1, 1, 3, 0, 1, 0, 0, 0, 0, 0, 'c');`);
  v1.close();
  const migrated = createContext({ dbPath: v1Path, questionsPath: QUESTIONS_PATH });
  assert.equal(schemaVersion(migrated.db), SCHEMA_VERSION);
  const fresh2 = currentState(migrated);
  assert.notEqual(fresh2.runId, 'old-run');
  assert.deepEqual(fresh2.scores, { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 });
  assert.equal(migrated.db.prepare(`SELECT status FROM runs WHERE id = 'old-run'`).get()?.status, 'ended');
  assert.equal(migrated.db.prepare(`SELECT status FROM guest_sessions WHERE id = 'g-pending'`).get()?.status, 'expired');
  assert.equal(Number(migrated.db.prepare('SELECT environment FROM city_snapshots_v1').get()?.environment), 3, 'old snapshot kept');
  const log = recentEvents(migrated);
  assert.deepEqual(log.answers.map(a => [a.id, a.effects]), [['old-answer', { environment: 3, technology: 1 }]], 'legacy events stay readable');
  assert.deepEqual(log.admin.map(a => [a.runId, a.detail.nextRunId]), [['old-run', fresh2.runId]]);
  migrated.db.close();

  // Snapshot reader is used by restart; confirm it is not silently filled for an unknown run.
  const memory = fixture();
  assert.equal(readSnapshot(memory.ctx.db, 'unknown'), undefined);
  console.log('PASS: restart restores run/state, events replay to the snapshot, corrupt/missing state refused, schema version enforced, v1 placeholder run migrated to a fresh policy run, foreign keys on.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
