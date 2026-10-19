# 2127 — Frozen Intersection

**Language:** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

## About the work

"Who will decide what a city looks like in 100 years?" Cities have usually been shaped by governments and large corporations rather than by the people who live in them. What if the residents decided the future 100 years from now? This exhibition explores that possibility. Each visitor answers questions about daily life as one resident of Odaiba in 2127; their voice accumulates with other residents' voices into the city the next visitor inherits. No single answer decides the city alone. The opening city card `intro.origin` introduces the world with the same question (see [RESIDENT_COPY](docs/RESIDENT_COPY.md)).

- Each guest answers four questions and submits one proposal; the next guest inherits the accumulated city.
- The root Three.js scene (`src/`) is the exhibition city.
- The `survey/` server owns the questions, state, SQLite database and live WebSocket updates.
- The separate `module-swap/` viewer is a legacy v1 causal demo and does not accept the current v2 CityView.

## Start the exhibition (Mac / Windows)

- Install Git and **Node.js 24+** (including npm). Use a desktop browser with WebGL 2.
- Run each command from the repository root unless a step changes directory; keep both terminal tabs running.
- Run `npm ci` on first setup and after lockfile changes; on later starts, run only the build/server commands in Tab 1 and the dev command in Tab 2.
- This is a local exhibition flow; there is no public deployment setup.

### macOS — two Terminal tabs

**Tab 1: survey server** — hosts the API, WebSocket, guest/monitor/admin pages and SQLite state. Build the pages before starting the server.

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

- The survey server uses `127.0.0.1:8787` by default; root Vite uses `127.0.0.1:5173`.
- If Vite prints another port, use the URL it actually printed for the city. If you change the survey port, give the full WebSocket URL in the city URL.

### Browser tabs and screens

| Browser tab | Default URL | Purpose |
| --- | --- | --- |
| Guest (single station) | `http://127.0.0.1:8787/guest` | Guest answers four questions, reviews the choices, and submits one proposal. |
| Guest A/B (two stations) | `http://<exhibition-PC LAN IP>:8787/guest?station=A` / `?station=B` | Independent four-question experiences share the accumulated city. |
| City | `http://127.0.0.1:5173/?survey` | Exhibition's 2127 Odaiba scene; receives live state through `ws://127.0.0.1:8787/ws`. Keep `?survey` in the URL. |
| Admin | `http://127.0.0.1:8787/admin` | Staff view the lifecycle, end an unfinished experience, and request/cancel resets. Available only on the server computer through localhost. |
| Monitor (optional) | `http://127.0.0.1:8787/monitor` | Text view of current state and proposals/WebSocket events received since the tab opened; it is not the 3D city. |

- Put City on the exhibition display and Guest on the input screen; keep Admin on the staff computer.
- City needs no separate host or build; Vite in Tab 2 serves it.
- The survey server hosts Guest/Admin/Monitor and the API on one origin, so `npm run build` must finish first.
- The default database is `survey/data/survey.sqlite`; restarting the server keeps the city state.

### Single-station handoff and reset

These rules apply to unlabelled `/guest`; for two stations see the A/B section below.

- After a proposal, Guest shows its result and handoff screens as usual.
- The next guest presses **はじめる** to hand off automatically; no Admin exit confirmation is needed.
- Without a reset the accumulated city continues; a queued reset runs at that next start.
- Admin's **未完了の体験を終了** only ends unfinished questionnaires and runs a queued reset.

### Admin day/night setting

- Admin **昼／夜／自動** fixes connected City views at 12:00 / 22:00 or restores the day cycle.
- The setting is saved and does not affect proposals or scores.
- An explicit `?hour` in the city URL wins.
- After updating this feature, restart the survey server (keeping the existing SQLite) and refresh Admin.

### Other devices on the LAN

- For Guest/City on another device on a **trusted local network**, bind survey to the network. Bind Vite too only if City is on a separate device (it may stay loopback when City runs on the host). Replace `127.0.0.1` in Guest and City URLs with the host computer's LAN IP.

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

- Both ports must be reachable. Admin stays restricted to localhost on the server computer.
- The default loopback setup is for this computer only; the guest endpoint has no authentication, so use a trusted exhibition LAN.
- If the survey server runs on another port, for example 8790, open `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8790/ws` for the city (replace the host for LAN access).

### Undo the latest proposal

- Admin **直前の提案を取り消す** undoes only the latest completed proposal, and only before the next guest starts.
- It restores the previous city and counts, keeps the proposal marked as undone, and lets the guest start a fresh four-question session.
- A newer A/B draft closes Undo for an older proposal, even if that draft is later cancelled.
- After updating, rebuild/restart the survey server and refresh City/Guest/Admin.
- Undo was introduced in schema 6; the current SQLite migrates to schema 7 without deleting data.

### Two concurrent Guest devices (2026-10-02)

- Use one survey server on the trusted LAN; open `http://<exhibition-PC LAN IP>:8787/guest?station=A` on one device and `/guest?station=B` on the other.
- Start the server as in the LAN section; if City stays on the exhibition PC, root Vite may stay loopback.
- With `SURVEY_HOST=0.0.0.0` the server prints the full A/B `LAN Guest:` URLs to type on the iPads; router/iPad setup is in the [LAN station handoff](docs/handoffs/lan-guest-stations.md).
- Each station has its own draft, four questions, result and handoff; finishing one never clears the other.
- Submissions accumulate in server arrival order; retries count once.
- Each station admits one active experience; use only one page per station.
- The existing `/guest` single-station flow remains; do not mix it with active A/B experiences.
- Live City results keep reading slots of at least 10 s in record order, with 3 s transitions and proposal/station labels.
- A queued Guest shows saved / waiting for display, then its own result for 10 s and handoff for 5 s.
- City reconnect restores the latest full state immediately.
- A/B reset stops new starts and waits for both questionnaires and results/handoffs; Admin can end one station with **A／B の未完了の体験を終了**.
- A disconnected station is released after the 5-minute questionnaire limit, or when its submitted result lease ends (15 s after display start; retry resumes the remaining slot without renewing the lease). No Admin exit confirmation is needed.
- City reset keeps the total count; full reset clears it but keeps history.
- After updating, rebuild/restart survey and refresh Guest/City/Admin; SQLite migrates to schema 7 and keeps the existing city and history.
- Implementation and validation: [two-device handoff](docs/handoffs/archive/two-guest-devices.md).

### Standalone city

- To view the city prototype without survey state, open `http://127.0.0.1:5173/`; Tab 1 is unnecessary and no guest proposals arrive.
- `module-swap/` is the preserved v1 causal demo ([handoff](docs/handoffs/archive/causal-city-mvp.md)); it is not the exhibition city and does not accept v2 CityView.

### Project references

- Docs: [document index](docs/README.md) (current rules vs archived plans/task evidence) · [current exhibition specification](docs/EXHIBITION_SPEC.md) · [glossary](docs/GLOSSARY.md).
- AI agent entry: [AGENTS.md](AGENTS.md) · [architecture](docs/PROJECT.md) · [validation and handoff](docs/VALIDATION.md) · [Git workflow](docs/CONTRIBUTING.md).
- Visual direction: [CITY MASTER TASTE](docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md); runtime art rules: [ART](docs/ART.md).
- Dated S4 evidence: [S4 handoff](docs/handoffs/archive/exhibition-s4.md).

### Development auto-answer (DEV-ONLY, 2026-09-30)

- In `survey/`, run `npm run dev:auto`, then open `http://127.0.0.1:8788/guest?dev-auto`.
- Keep the city Vite running and connect it at `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8788/ws` (replace the Vite port if different).
- Every launch creates a new retained scratch SQLite and prints its path; it never touches the exhibition `survey/data/survey.sqlite`.
- The panel offers all −1 / 0 / +1, rotating mix, per-Meter choice or seeded random; set the proposal count and press **自動回答を開始**.
- Defaults: 10 proposals, seed 2127. It drives the normal Guest draft/review/submit: 0.3 s per question, result 10 s, handoff 5 s, back to Start; the next one hands off automatically.
- Stop or an error creates no further proposal; requests already sent complete; unknown results retry with the same ID.
- Ordinary `/guest` shows no panel.
- Localhost only; the server needs `SURVEY_DEV_AUTO=1` (the launcher sets it).
- It stops on another guest, a conflict or a pending reset, and never resets automatically.
- **Before the exhibition, remove the DEV-ONLY panel/endpoint/launcher or move them to Admin; single station keeps the accepted automatic handoff, with no old exit lock.** The code entry points and the [spec](docs/EXHIBITION_SPEC.md#開發工具與待完成驗收) carry `DEV-ONLY` removal/migration notes. See the [survey guide](survey/README.md).
- Meter tests alone: `cd survey && npm run test:meters`; the full pipeline is also part of root/survey `npm test`.

## Current city and scope

- Odaiba (the **2127 Odaiba waterfront**) is the only exhibition city.
- Shibuya is a closed historical decision and will not be developed again (2026-10-02); there is no venue switch, and old Plan 01/02 and screenshots are history only, not a backlog.
- Root `src/` loads the Odaiba district terrain, six landmark GLBs and the procedural civic core with Three.js / WebGL 2, plus a quiet connected backdrop.
- 2127 skyways, the tidal edge and six waterfront islands are in the current city; the early version that faded to an island at 150 m is no longer used.
- The four Meters change both the focal sites and the district, keep low/mixed/high as mature futures, and support hybrids, cross-axis facilities and history-seeded layouts.
- The city runs an automatic day/night cycle of 180 s per day; `?hour=22` fixes the time.
- Camera, shared materials/InstancedMesh, 3 s changes and immediate reset/reconnect are in [PROJECT](docs/PROJECT.md).
- Post-processing: MSAA, GTAO, bloom, vignette, output and colour grade.
- On weaker GPUs (for example an M1 driving a 4K monitor), add `&quality=low` to the city URL: MSAA, GTAO and shadows off, pixel ratio capped at 1; the default look is unchanged (2026-10-15).

### Development review tools

- `?meters=nw:high,ne:low` (band or −12..12) reviews a v2 layout directly.
- Console `cityMeters('ne:high')` shows a live transition; `&metersTo=ne:high&metersAge=0.7` with `reviewTime` is for screenshots.
- These tools submit no proposals and do not change exhibition data.
- `?asset-preview` loads a local GLB at the origin; reload to pick another. Production has no picker. Asset standards: [BLENDER](docs/BLENDER.md).

### Acceptance status

- S1–S4, the Odaiba venue change and Meter P0–P12 are integrated.
- **S5 / exhibition hardware, input devices and exhibition-day reset/recovery policy remain unaccepted.**
- Stage measurements, CI, limits and history sources are linked from [VALIDATION](docs/VALIDATION.md) and the [document index](docs/README.md); old Shibuya FPS does not prove current performance.
- If Google Fonts cannot be reached, system fonts are used; other runtime resources are served locally.

### Resident P2/P3 updates (2026-10-02)

- P2:
  - After updating, rebuild/restart the survey server and refresh Guest/City.
  - Questions use resident daily-life copy; review stays before submission; results show only save/wait status, station/voice ordinal and a look-up prompt.
  - City shows background/current facilities and a conservative recorded message.
  - Question-set version 3 preserves SQLite and stored answer text; use 「新しい予約で草稿を続ける」 for old drafts; A/B first releases its own obsolete reservation.
  - Existing 3 s transitions/A-B spacing and result 10 s / handoff 5 s remain; coordinated reading slots and causal explanations are P3. See [P2 handoff](docs/handoffs/archive/resident-experience-p2.md).
- P3:
  - Rebuild/restart survey and refresh Guest/City.
  - Each proposal reserves 10 s of reading (0–3 s identity/place/city transition, 3–10 s preference + actual result).
  - A/B results stay ordered; waiting/early handoff/reset and retries continue the original slot.
  - Results compare actual carrier configurations; a local increase never implies a citywide or population increase.
  - Reconnect/Undo/reduced motion restore immediately; lighting preserves valid displays.
  - See [P3 handoff](docs/handoffs/archive/resident-experience-p3.md); P4/P5 acceptance remains open.
