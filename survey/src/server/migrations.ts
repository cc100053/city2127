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
  // 3: keep schema-2 answer history intact and start the proposal-based exhibition algorithm in a new run.
  db => {
    db.exec(`ALTER TABLE runs ADD COLUMN algorithm_version INTEGER NOT NULL DEFAULT 1 CHECK (algorithm_version IN (1, 2));
      CREATE TABLE proposal_sessions (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        question_set_version INTEGER NOT NULL,
        question_ids_json TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('reserved', 'submitted', 'expired')),
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        submitted_at TEXT
      );
      CREATE INDEX proposal_sessions_run_status ON proposal_sessions(run_id, status);
      CREATE TABLE proposal_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        run_id TEXT NOT NULL REFERENCES runs(id),
        guest_session_id TEXT NOT NULL UNIQUE REFERENCES proposal_sessions(id),
        canonical_request_json TEXT NOT NULL,
        question_set_version INTEGER NOT NULL,
        algorithm_version INTEGER NOT NULL CHECK (algorithm_version = 2),
        answers_json TEXT NOT NULL,
        votes_json TEXT NOT NULL,
        revision_before INTEGER NOT NULL CHECK (revision_before >= 0),
        revision_after INTEGER NOT NULL CHECK (revision_after = revision_before + 1),
        before_state_json TEXT NOT NULL,
        after_state_json TEXT NOT NULL,
        submitted_at TEXT NOT NULL
      );
      CREATE INDEX proposal_events_run ON proposal_events(run_id, sequence);
      CREATE TRIGGER proposal_events_no_update BEFORE UPDATE ON proposal_events
        BEGIN SELECT RAISE(ABORT, 'proposal_events is append-only'); END;
      CREATE TRIGGER proposal_events_no_delete BEFORE DELETE ON proposal_events
        BEGIN SELECT RAISE(ABORT, 'proposal_events is append-only'); END;
      CREATE TABLE exhibition_snapshots (
        run_id TEXT PRIMARY KEY REFERENCES runs(id),
        revision INTEGER NOT NULL CHECK (revision >= 0),
        guest_count INTEGER NOT NULL CHECK (guest_count = revision),
        algorithm_version INTEGER NOT NULL CHECK (algorithm_version = 2),
        vote_sum_automation REAL NOT NULL,
        vote_sum_public_sharing REAL NOT NULL,
        vote_sum_environmental_priority REAL NOT NULL,
        vote_sum_urban_concentration REAL NOT NULL,
        recent_automation REAL NOT NULL CHECK (recent_automation BETWEEN -1 AND 1),
        recent_public_sharing REAL NOT NULL CHECK (recent_public_sharing BETWEEN -1 AND 1),
        recent_environmental_priority REAL NOT NULL CHECK (recent_environmental_priority BETWEEN -1 AND 1),
        recent_urban_concentration REAL NOT NULL CHECK (recent_urban_concentration BETWEEN -1 AND 1),
        automation REAL NOT NULL CHECK (automation BETWEEN -12 AND 12),
        public_sharing REAL NOT NULL CHECK (public_sharing BETWEEN -12 AND 12),
        environmental_priority REAL NOT NULL CHECK (environmental_priority BETWEEN -12 AND 12),
        urban_concentration REAL NOT NULL CHECK (urban_concentration BETWEEN -12 AND 12),
        updated_at TEXT NOT NULL
      );`);
    const active = db.prepare(`SELECT id FROM runs WHERE status = 'active'`).get();
    if (!active) return;
    const at = new Date().toISOString(), nextRunId = randomUUID();
    db.prepare(`UPDATE runs SET status = 'ended', ended_at = ? WHERE id = ?`).run(at, active.id);
    db.prepare(`UPDATE guest_sessions SET status = 'expired' WHERE run_id = ? AND status = 'reserved'`).run(active.id);
    db.prepare(`INSERT INTO admin_events (type, run_id, detail_json, created_at) VALUES ('run-reset', ?, ?, ?)`)
      .run(active.id, JSON.stringify({ nextRunId, reason: 'schema 3: proposal algorithm' }), at);
    db.prepare(`INSERT INTO runs (id, status, started_at, algorithm_version) VALUES (?, 'active', ?, 2)`).run(nextRunId, at);
    db.prepare(`INSERT INTO exhibition_snapshots (run_id, revision, guest_count, algorithm_version,
      vote_sum_automation, vote_sum_public_sharing, vote_sum_environmental_priority, vote_sum_urban_concentration,
      recent_automation, recent_public_sharing, recent_environmental_priority, recent_urban_concentration,
      automation, public_sharing, environmental_priority, urban_concentration, updated_at)
      VALUES (?, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?)`).run(nextRunId, at);
  },
  // 4: one-row installation lifecycle. Total guests are proposals after total_since_sequence, so a full
  // data reset moves the watermark instead of deleting append-only history. Ready never holds a pending reset.
  db => {
    db.exec(`CREATE TABLE exhibition_lifecycle (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        revision INTEGER NOT NULL CHECK (revision >= 0),
        phase TEXT NOT NULL CHECK (phase IN ('ready', 'in_experience', 'awaiting_exit')),
        pending_reset TEXT NOT NULL CHECK (pending_reset IN ('none', 'city', 'full')),
        total_since_sequence INTEGER NOT NULL CHECK (total_since_sequence >= 0),
        updated_at TEXT NOT NULL,
        CHECK (phase <> 'ready' OR pending_reset = 'none')
      )`);
    db.prepare(`INSERT INTO exhibition_lifecycle (id, revision, phase, pending_reset, total_since_sequence, updated_at)
      VALUES (1, 0, 'ready', 'none', 0, ?)`).run(new Date().toISOString());
  },
  // 5: staff display choice is installation-wide, independent of proposals and city resets.
  `CREATE TABLE display_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    mode TEXT NOT NULL CHECK (mode IN ('auto', 'day', 'night'))
  ); INSERT INTO display_settings (id, mode) VALUES (1, 'auto');`,

  // 6: append-only undo markers; active history is shared by replay, counters and city layout seeds.
  `CREATE TABLE proposal_undos (
    proposal_id TEXT PRIMARY KEY REFERENCES proposal_events(id),
    created_at TEXT NOT NULL
  );
  CREATE TRIGGER proposal_undos_no_update BEFORE UPDATE ON proposal_undos
    BEGIN SELECT RAISE(ABORT, 'proposal_undos is append-only'); END;
  CREATE TRIGGER proposal_undos_no_delete BEFORE DELETE ON proposal_undos
    BEGIN SELECT RAISE(ABORT, 'proposal_undos is append-only'); END;
  CREATE VIEW active_proposal_events AS SELECT * FROM proposal_events
    WHERE id NOT IN (SELECT proposal_id FROM proposal_undos);`,
  // 7: optional A/B stations; existing single-station runs and immutable proposal history stay intact.
  `ALTER TABLE proposal_sessions ADD COLUMN station_id TEXT CHECK (station_id IN ('A', 'B'));
   ALTER TABLE proposal_sessions ADD COLUMN ended_at TEXT;
   ALTER TABLE proposal_sessions ADD COLUMN experience_until TEXT;
   CREATE UNIQUE INDEX proposal_station_active ON proposal_sessions(station_id)
     WHERE station_id IS NOT NULL AND ended_at IS NULL AND status IN ('reserved', 'submitted');
   ALTER TABLE proposal_events ADD COLUMN station_id TEXT CHECK (station_id IN ('A', 'B'));
   ALTER TABLE proposal_events ADD COLUMN display_at TEXT;`,
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
