# 2127 — Frozen Intersection

## Two concurrent Guest devices — 2026-10-02

Use one survey server on the trusted LAN. Open `http://<exhibition-PC LAN IP>:8787/guest?station=A` on one device and `http://<exhibition-PC LAN IP>:8787/guest?station=B` on the other. Use only one page per station; each station admits one active experience. Bind the survey server with `SURVEY_HOST=0.0.0.0` (PowerShell: `$env:SURVEY_HOST='0.0.0.0'`). Each station has its own four-question draft/result/handoff; submissions accumulate in server arrival order and retries count once. Live City changes are shown at least three seconds apart with proposal/station labels. City reconnect restores the latest snapshot immediately. The existing `/guest` single-station flow remains; do not mix it with active A/B experiences.

A/B reset stops new starts and waits for both experiences, including results/handoffs. Admin can end only the named unfinished station. Disconnected questionnaires expire after five minutes; submitted result leases finish 15 seconds after their scheduled display (active result recovery renews that lease). Rebuild/restart survey and refresh Guest/City/Admin; schema 7 preserves existing data. See [handoff](docs/handoffs/two-guest-devices.md).

**Language:** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

Guests collectively shape a futuristic Shibuya. Each guest answers four questions and submits one proposal; the next guest inherits the accumulated city. The root Three.js scene (`src/`) is the exhibition city. The `survey/` server owns the questions, state, SQLite database, and live WebSocket updates. The separate `module-swap/` viewer is a legacy v1 causal demo and does not accept the current v2 CityView.

## Start the exhibition locally

Development auto-answer (DEV-ONLY): run `cd survey && npm run dev:auto`, open `http://127.0.0.1:8788/guest?dev-auto`, and connect root Vite at `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8788/ws`. Every launch creates a new retained scratch SQLite; it never uses the exhibition DB. The opt-in localhost panel drives the existing Guest flow and uses the same automatic next-session handoff as normal guests. Remove the development panel or move it to Admin before exhibition use. See the [survey guide](survey/README.md).

Install Git and **Node.js 24+** (including npm). Use a desktop browser with WebGL 2. Keep both terminal tabs running. Run each command from the repository root unless a step changes directory. The project has no public deployment setup.

Admin **直前の提案を取り消す** undoes only the latest completed proposal before the next guest starts. It restores the previous city and counts, keeps the proposal marked as undone, and lets the guest start a fresh four-question session. Rebuild/restart the survey server and refresh City/Guest/Admin. Undo was introduced in schema 6; the current SQLite migrates to schema 7 without deleting data. A newer A/B draft closes Undo for an older proposal even if that draft is later cancelled.

### macOS — two Terminal tabs

**Tab 1: survey server** — hosts the API, WebSocket, guest/monitor/admin pages, and SQLite state. Build the pages before starting the server.

```sh
cd survey
npm ci
npm run build
npm run server
```

**Tab 2: 3D city** — open a fresh tab at the repository root. Vite hosts the root Three.js scene.

```sh
npm ci
npm run dev -- --port 5173
```

### Windows — two PowerShell tabs

**Tab 1: survey server** — start at the repository root.

```powershell
Set-Location survey
npm ci
npm run build
npm run server
```

**Tab 2: 3D city** — open a fresh PowerShell tab at the repository root.

```powershell
npm ci
npm run dev -- --port 5173
```

The survey server uses `127.0.0.1:8787` by default. Use the actual URL printed by Vite for the city if port 5173 is busy. If you change the survey port, use an explicit WebSocket URL in the city URL.

### Browser tabs and screens

| Browser tab | Default URL | Purpose |
| --- | --- | --- |
| Guest (single station) | `http://127.0.0.1:8787/guest` | Guest answers four questions, reviews the choices, and submits one proposal. |
| Guest A/B (two stations) | `http://<exhibition-PC LAN IP>:8787/guest?station=A` / `?station=B` | Independent four-question experiences share the accumulated city. |
| City | `http://127.0.0.1:5173/?survey` | Exhibition's 2127 Shibuya scene; receives live state through `ws://127.0.0.1:8787/ws`. Keep `?survey` in the URL. |
| Admin | `http://127.0.0.1:8787/admin` | Staff view the lifecycle, end an unfinished experience, and request/cancel resets. Available only on the server computer through localhost. |
| Monitor (optional) | `http://127.0.0.1:8787/monitor` | Text view of current state and proposals/WebSocket events received since the tab opened; it is not the 3D city. |

Put City on the exhibition display and Guest on the input screen. Keep Admin on the staff computer. The following next-start reset rule applies to unlabelled `/guest`; A/B reset blocks admission and drains both experiences as described above. After a proposal, the next guest can press **はじめる** without Admin confirmation. Any queued reset runs at that next start; otherwise the accumulated city continues. Admin’s **未完了の体験を終了** only ends unfinished questionnaires. The survey server hosts its built pages and API on the same origin; Vite hosts the city separately. The default database is `survey/data/survey.sqlite`, so restarting the server retains the city. `npm ci` is needed on first setup and after lockfile changes; on subsequent starts, keep the build and server commands in Tab 1 and the dev command in Tab 2.

For Guest devices on a **trusted local network**, bind survey to the network. Bind Vite too if City is on a separate device (it may stay loopback when City runs on the host) and replace `127.0.0.1` in Guest and City URLs with the host computer's LAN IP:

```sh
# macOS, in survey/ (Tab 1)
SURVEY_HOST=0.0.0.0 npm run server
# repository root (Tab 2)
npm run dev -- --host 0.0.0.0 --port 5173
```

```powershell
# Windows PowerShell, in survey/ (Tab 1)
$env:SURVEY_HOST='0.0.0.0'; npm run server
# repository root (Tab 2)
npm run dev -- --host 0.0.0.0 --port 5173
```

Both ports must be reachable. Admin stays restricted to localhost on the server computer. The guest endpoint has no authentication, so use a trusted exhibition LAN. If the survey server instead runs on port 8790, for example, open `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8790/ws` for the city (replace the host for LAN access).

To view the standalone city without survey state, open `http://127.0.0.1:5173/`; Tab 1 is unnecessary in that mode. For the older v1 module-swap demo, see its [handoff](docs/handoffs/causal-city-mvp.md); it is not the exhibition city.

## Project references

- [Agent workflow](AGENTS.md), [Git workflow](docs/CONTRIBUTING.md), [architecture](docs/PROJECT.md), and [validation](docs/VALIDATION.md).
- [Exhibition MVP specification](docs/EXHIBITION_MVP.md) and [S4 handoff](docs/handoffs/exhibition-s4.md) describe the current four-question flow and known limits.
- The [Traditional Chinese README](README.md) retains the detailed project history, Plan 02 notes, and original prototype references.
