import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export class SchemaVersionError extends Error {
  override name = 'SchemaVersionError';
}

/** Schema version is PRAGMA user_version. Append new steps; never edit an applied one. */
export const migrations: (string | ((db: DatabaseSync) => void))[] = [
  `CREATE TABLE runs (
     id TEXT PRIMARY KEY,
     status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
     started_at TEXT NOT NULL,
     ended_at TEXT
   );
   CREATE UNIQUE INDEX runs_single_active ON runs(status) WHERE status = 'active';

   CREATE TABLE guest_sessions (
     id TEXT PRIMARY KEY,
     run_id TEXT NOT NULL REFERENCES runs(id),
     question_id TEXT NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('reserved', 'answered', 'expired')),
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     answered_at TEXT
   );
   CREATE INDEX guest_sessions_run_status ON guest_sessions(run_id, status, question_id);

   CREATE TABLE answer_events (
     sequence INTEGER PRIMARY KEY AUTOINCREMENT,
     id TEXT NOT NULL UNIQUE,
     run_id TEXT NOT NULL REFERENCES runs(id),
     guest_session_id TEXT NOT NULL UNIQUE REFERENCES guest_sessions(id),
     question_id TEXT NOT NULL,
     option_id TEXT NOT NULL,
     question_version INTEGER NOT NULL,
     effects_json TEXT NOT NULL,
     revision_before INTEGER NOT NULL,
     revision_after INTEGER NOT NULL,
     answered_at TEXT NOT NULL
   );
   CREATE INDEX answer_events_run ON answer_events(run_id, sequence);
   CREATE TRIGGER answer_events_no_update BEFORE UPDATE ON answer_events
     BEGIN SELECT RAISE(ABORT, 'answer_events is append-only'); END;
   CREATE TRIGGER answer_events_no_delete BEFORE DELETE ON answer_events
     BEGIN SELECT RAISE(ABORT, 'answer_events is append-only'); END;

   CREATE TABLE city_snapshots (
     run_id TEXT PRIMARY KEY REFERENCES runs(id),
     revision INTEGER NOT NULL CHECK (revision >= 0),
     answer_count INTEGER NOT NULL CHECK (answer_count >= 0),
     environment INTEGER NOT NULL CHECK (environment BETWEEN -12 AND 12),
     culture INTEGER NOT NULL CHECK (culture BETWEEN -12 AND 12),
     technology INTEGER NOT NULL CHECK (technology BETWEEN -12 AND 12),
     community INTEGER NOT NULL CHECK (community BETWEEN -12 AND 12),
     mobility INTEGER NOT NULL CHECK (mobility BETWEEN -12 AND 12),
     green_network INTEGER NOT NULL CHECK (green_network IN (0, 1)),
     civic_commons INTEGER NOT NULL CHECK (civic_commons IN (0, 1)),
     autonomous_grid INTEGER NOT NULL CHECK (autonomous_grid IN (0, 1)),
     updated_at TEXT NOT NULL
   );

   CREATE TABLE admin_events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     type TEXT NOT NULL,
     run_id TEXT NOT NULL REFERENCES runs(id),
     detail_json TEXT NOT NULL,
     created_at TEXT NOT NULL
   );`,
  // 2: placeholder axes and milestones → four policy axes. Answers stored under the old axes cannot be
  // replayed on the new ones, so the active run is ended exactly like an admin reset and a zero run starts.
  // Nothing is deleted: old events stay in answer_events and old snapshots move to city_snapshots_v1.
  db => {
    db.exec(`ALTER TABLE city_snapshots RENAME TO city_snapshots_v1;
      CREATE TABLE city_snapshots (
        run_id TEXT PRIMARY KEY REFERENCES runs(id),
        revision INTEGER NOT NULL CHECK (revision >= 0),
        answer_count INTEGER NOT NULL CHECK (answer_count >= 0),
        automation INTEGER NOT NULL CHECK (automation BETWEEN -12 AND 12),
        public_sharing INTEGER NOT NULL CHECK (public_sharing BETWEEN -12 AND 12),
        environmental_priority INTEGER NOT NULL CHECK (environmental_priority BETWEEN -12 AND 12),
        urban_concentration INTEGER NOT NULL CHECK (urban_concentration BETWEEN -12 AND 12),
        updated_at TEXT NOT NULL
      );`);
    const active = db.prepare(`SELECT id FROM runs WHERE status = 'active'`).get();
    if (!active) return;
    const at = new Date().toISOString(), nextRunId = randomUUID();
    db.prepare(`UPDATE runs SET status = 'ended', ended_at = ? WHERE id = ?`).run(at, active.id);
    db.prepare(`UPDATE guest_sessions SET status = 'expired' WHERE run_id = ? AND status = 'reserved'`).run(active.id);
    db.prepare(`INSERT INTO admin_events (type, run_id, detail_json, created_at) VALUES ('run-reset', ?, ?, ?)`)
      .run(active.id, JSON.stringify({ nextRunId, reason: 'schema 2: policy axes' }), at);
    db.prepare(`INSERT INTO runs (id, status, started_at) VALUES (?, 'active', ?)`).run(nextRunId, at);
    db.prepare(`INSERT INTO city_snapshots (run_id, revision, answer_count, automation, public_sharing, environmental_priority,
      urban_concentration, updated_at) VALUES (?, 0, 0, 0, 0, 0, 0, ?)`).run(nextRunId, at);
  },
];

export const SCHEMA_VERSION = migrations.length;

export function schemaVersion(db: DatabaseSync): number {
  const row = db.prepare('PRAGMA user_version').get();
  return Number(row?.user_version ?? 0);
}

/** Applies pending migrations in one transaction; refuses a database written by a newer schema. */
export function migrate(db: DatabaseSync): void {
  const current = schemaVersion(db);
  if (current > SCHEMA_VERSION) {
    throw new SchemaVersionError(`database schema version ${current} is newer than this server (${SCHEMA_VERSION}); refusing to open it`);
  }
  if (current === SCHEMA_VERSION) return;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let version = current; version < SCHEMA_VERSION; version++) {
      const step = migrations[version];
      if (typeof step === 'string') db.exec(step); else step(db);
    }
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
