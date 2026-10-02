# 2127 — Frozen Intersection

## Two concurrent Guest devices — 2026-10-02

Use one survey server on the trusted LAN. Open `http://<exhibition-PC LAN IP>:8787/guest?station=A` on one device and `http://<exhibition-PC LAN IP>:8787/guest?station=B` on the other. Use only one page per station; each station admits one active experience. Bind the survey server with `SURVEY_HOST=0.0.0.0` (PowerShell: `$env:SURVEY_HOST='0.0.0.0'`). Each station has its own four-question draft/result/handoff; submissions accumulate in server arrival order and retries count once. Live City results reserve ten-second reading slots with three-second transitions and proposal/station labels. City reconnect restores the latest snapshot immediately. The existing `/guest` single-station flow remains; do not mix it with active A/B experiences.

A/B reset stops new starts and waits for both experiences, including results/handoffs. Admin can end only the named unfinished station. Disconnected questionnaires expire after five minutes; submitted result leases finish 15 seconds after their scheduled display (retry resumes the remaining slot without renewing the lease). Rebuild/restart survey and refresh Guest/City/Admin; schema 7 preserves existing data. See [handoff](docs/handoffs/archive/two-guest-devices.md).

**Language:** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

Guests collectively shape a futuristic Odaiba. Each guest answers four questions and submits one proposal; the next guest inherits the accumulated city. The root Three.js scene (`src/`) is the exhibition city. The `survey/` server owns the questions, state, SQLite database, and live WebSocket updates. The separate `module-swap/` viewer is a legacy v1 causal demo and does not accept the current v2 CityView.

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
| City | `http://127.0.0.1:5173/?survey` | Exhibition's 2127 Odaiba scene; receives live state through `ws://127.0.0.1:8787/ws`. Keep `?survey` in the URL. |
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

To view the standalone city without survey state, open `http://127.0.0.1:5173/`; Tab 1 is unnecessary in that mode. For the older v1 module-swap demo, see its [handoff](docs/handoffs/archive/causal-city-mvp.md); it is not the exhibition city.

## Current direction

Odaiba is the only exhibition venue. Shibuya is a closed historical decision and will not be developed again (2026-10-02); its unfinished plans are not a future backlog. Meter choices affect both focal sites and the wider district. S5, input hardware and exhibition-day reset/recovery policy remain unaccepted.

## Project references

- [Agent workflow](AGENTS.md), [Git workflow](docs/CONTRIBUTING.md), [architecture](docs/PROJECT.md), and [validation](docs/VALIDATION.md).
- [Current exhibition specification](docs/EXHIBITION_SPEC.md) and [S4 handoff](docs/handoffs/archive/exhibition-s4.md) document the current contract and dated S4 evidence respectively.
- [Document index](docs/README.md) separates current rules from archived plans and task evidence; [visual direction](docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) and [runtime art rules](docs/ART.md) guide Odaiba changes.
- The [Traditional Chinese README](README.md) also describes DEV-only review tools. Module-swap rejects current v2 CityViews; use the root city for the exhibition.

Resident P2 (2026-10-02): rebuild/restart survey and refresh Guest/City. Questions now use resident daily-life copy; review remains before submission. Guest results show save/wait status, station/voice ordinal and a look-up prompt; City shows background/current facilities and a conservative recorded message. Question-set version3 preserves SQLite and stored answer text. Use 「新しい予約で草稿を続ける」 for old drafts; A/B releases its own obsolete reservation and carries valid choices forward. Existing3s transitions/display spacing and result10s/handoff5s remain; coordinated reading slots and causal explanations are P3. See [P2 handoff](docs/handoffs/archive/resident-experience-p2.md).

Resident P3 (2026-10-02) supersedes P2 timing: rebuild/restart survey and refresh Guest/City. Each proposal reserves 10s (identity/place and 3s transition, then selected preference plus actual collective configuration). A/B results stay ordered; early handoff/reset/retry cannot truncate or renew the slot. Renderer carrier evidence includes distribution and visible pairings; local increases never imply more population. Reconnect/Undo/reduced motion restore immediately; lighting preserves valid displays. [P3 handoff](docs/handoffs/archive/resident-experience-p3.md); P4/P5 acceptance remains open.
