import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../src/server/database.ts';
import { SCHEMA_VERSION, SchemaVersionError, schemaVersion } from '../src/server/migrations.ts';
import { CorruptStateError, readSnapshot, replayRun, runAnswerEvents } from '../src/server/runStore.ts';
import { currentState } from '../src/server/answerService.ts';
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
  assert.equal(before.milestones.greenNetwork, true);
  first.ctx.db.close();

  // Restart: the same run and CitySurveyState come back, and match a replay of the stored events.
  const restarted = createContext({ dbPath, questionsPath: QUESTIONS_PATH });
  assert.deepEqual(currentState(restarted), before);
  const events = runAnswerEvents(restarted.db, before.runId);
  assert.deepEqual(events.map(e => e.optionId), ['solar-canopy', 'walkable-blocks', 'urban-forest']);
  assert.deepEqual(events.map(e => e.effects), [{ environment: 3, technology: 1 }, { environment: 2, community: 2, mobility: 1 }, { environment: 3, community: 1 }]);
  const run = restarted.db.prepare('SELECT started_at FROM runs WHERE id = ?').get(before.runId);
  const replay = replayRun(restarted.db, before.runId, String(run?.started_at));
  assert.deepEqual({ ...replay, updatedAt: '' }, { ...before, updatedAt: '' });
  assert.equal(schemaVersion(restarted.db), SCHEMA_VERSION);

  // A snapshot that disagrees with its events stops startup instead of being reset.
  restarted.db.prepare('UPDATE city_snapshots SET environment = environment - 1').run();
  restarted.db.close();
  assert.throws(() => createContext({ dbPath, questionsPath: QUESTIONS_PATH }), (e: unknown) => e instanceof CorruptStateError && /does not match/.test(e.message));
  const inspect = new DatabaseSync(dbPath);
  assert.equal(Number(inspect.prepare('SELECT COUNT(*) AS n FROM runs').get()?.n), 1, 'no new run was created');
  assert.equal(Number(inspect.prepare('SELECT environment FROM city_snapshots').get()?.environment), before.scores.environment - 1, 'corrupt row left for inspection');
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

  // Snapshot reader is used by restart; confirm it is not silently filled for an unknown run.
  const memory = fixture();
  assert.equal(readSnapshot(memory.ctx.db, 'unknown'), undefined);
  console.log('PASS: restart restores run/state, events replay to the snapshot, corrupt/missing state refused, schema version enforced, foreign keys on.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
