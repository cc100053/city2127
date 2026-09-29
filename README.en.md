# 2127 — Frozen Intersection

**Language:** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

Guests collectively shape a futuristic Shibuya. Each guest answers four questions and submits one proposal; the next guest inherits the accumulated city. The root Three.js scene (`src/`) is the exhibition city. The `survey/` server owns the questions, state, SQLite database, and live WebSocket updates. The separate `module-swap/` viewer is a legacy v1 causal demo and does not accept the current v2 CityView.

## Start the exhibition locally

Install Git and **Node.js 24+** (including npm). Use a desktop browser with WebGL 2. Keep both terminal tabs running. Run each command from the repository root unless a step changes directory. The project has no public deployment setup.

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
| Guest | `http://127.0.0.1:8787/guest` | Guest answers four questions, reviews the choices, and submits one proposal. |
| City | `http://127.0.0.1:5173/?survey` | Exhibition's 2127 Shibuya scene; receives live state through `ws://127.0.0.1:8787/ws`. Keep `?survey` in the URL. |
| Admin | `http://127.0.0.1:8787/admin` | Staff view the lifecycle, confirm that a guest has left, and request/cancel resets. Available only on the server computer through localhost. |
| Monitor (optional) | `http://127.0.0.1:8787/monitor` | Text view of current state and proposals/WebSocket events received since the tab opened; it is not the 3D city. |

Put City on the exhibition display and Guest on the input screen. Keep Admin on the staff computer. After a proposal, staff must click **Confirm Guest Has Left** before the next guest can start. A pending reset also runs after this confirmation. The survey server hosts its built pages and API on the same origin; Vite hosts the city separately. The default database is `survey/data/survey.sqlite`, so restarting the server retains the city. `npm ci` is needed on first setup and after lockfile changes; on subsequent starts, keep the build and server commands in Tab 1 and the dev command in Tab 2.

For a second device on a **trusted local network**, bind both services to the network and replace `127.0.0.1` in Guest and City URLs with the host computer's LAN IP:

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
