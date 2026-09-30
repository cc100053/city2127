# admin-day-night — Admin city lighting control

- Owner: Codex
- Status: IN_PROGRESS
- Branch: codex/admin-day-night
- Base commit: f094dee39f79c9a6eb42655c85e3b8f6101ab2ca
- Last verified commit: NONE for this task
- Remote availability: NOT PUSHED

## Session Git state

Started on clean main at f094dee39f79c9a6eb42655c85e3b8f6101ab2ca. Initial sandbox fetch could not write FETCH_HEAD; elevated retry succeeded 2026-09-30, origin/main matched and divergence was 0/0. Codex owns admin/server display control and root clock integration; no overlapping edits observed. Historical lifecycle handoff has stale pre-integration status; actual schema 4 lifecycle and night-lighting work are present on current main.

## Goal and acceptance criteria

Add Day/Night buttons to localhost Admin, plus Auto to restore the existing cycle. Persist the choice independently of city scores, runs and lifecycle; send it to connected root survey viewers and on reconnect. A staff lighting change must not reapply site layouts or cancel a live site transition. Standalone and explicit ?hour captures retain their existing behavior.

## In-scope files and dependencies

Survey shared protocol, migration/admin service, HTTP/WS wiring, admin UI; root survey client/atmosphere/clock and existing tests. Reuse SQLite and WS. No new dependencies, actors, assets or deployment. README/PROJECT/PLAN02/VALIDATION and survey README synchronized.

## Completed work

Implemented schema 5 installation-wide display mode, loopback/same-origin Admin API, native Day/Night/Auto buttons with pressed state and error feedback, and root clock integration through existing snapshot metadata. No CityView/revision or guest lifecycle changes. Documentation synchronized.

## Actual validation results

2026-09-30: root and survey npm test/npm run build passed; git diff --check passed. Root tests cover fixed hours, Auto and unchanged-revision filtering; survey tests cover input/origin/loopback restrictions, two-client broadcasts, restart and reset persistence. Headed Chrome browser checks used scratch SQLite on 8791 and existing Vite 5173: actual buttons synchronized two root viewers, reload retained Night, Auto resumed local clock, explicit ?hour stayed authoritative, and CityView remained identical. No uncaught page errors. Screenshots: artifacts/admin-day-night-controls.png, admin-day-night-city-day.png, admin-day-night-city-night.png. No FPS benchmark claimed.

## Known issues and blockers

Existing survey server on 8787 still runs pre-update code and has lifecycle awaiting_exit. It was deliberately preserved; after staff handles the current guest, restart the server with the same SQLite and reload Admin to activate the new controls. Scratch server/browser were closed.

## Important decisions

Day=12:00, Night=22:00, Auto=existing 180-second cycle. Schema 5 stores one display-mode setting, retained across city/full resets. Existing snapshot envelope carries optional displayMode metadata; CityView and its revision stay unchanged. Local ?hour remains the explicit capture override.

## Next expected step

Push feature, require CI, then integrate and verify main per [CONTRIBUTING](../CONTRIBUTING.md).
