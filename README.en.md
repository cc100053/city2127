# Mind craft― 選択の積み重ねでつくる都市 ―

**Language:** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

An exhibition set in Odaiba in 2127. Each visitor answers four of nine questions on an iPad, the city on the shared screen changes, and the next visitor inherits the accumulated city. This file is the exhibition start-up guide; the work and its specification are in the [document index](docs/README.md).

## Before you start

- Exhibition PC (Mac or Windows): Git, **Node.js 24+**, and a desktop browser with WebGL 2.
- iPads: on the same trusted LAN as the exhibition PC, with the HTTPS certificate installed and trusted (mkcert `rootCA.pem`, with full trust enabled in iPadOS Certificate Trust Settings).
- On first setup and after lockfile changes, run `npm ci` at the repository root, and `npm ci` and `npm run fetch:hand-model` in `survey/`. Put the certificate and key in `survey/data/tls/`; see the [survey guide](survey/README.md#ipad住民の窓與手勢操作).

## 1. Start the two servers

Keep both terminal windows open for the whole exhibition.

**Windows one-click start:** double-click `start-windows.cmd` at the repo root. It uses Node 24 (switching to nvm's copy when an older Node comes first on PATH), runs `npm ci` when dependencies are missing or stale, starts the two servers below in their own windows, then opens the shared screen in a dedicated Chrome profile with `--force_high_performance_gpu`, so Intel + NVIDIA laptops use the discrete GPU. With certificates in `survey/data/tls/` it starts in LAN/HTTPS mode and prints the iPad URLs, otherwise loopback only. Options: `-Low` (`&quality=low`), `-Kiosk` (full screen), `-NoBrowser` and `-Local` (loopback only even with certificates), e.g. `.\start-windows.cmd -Kiosk -Low`. iPad setup on Windows: `winget install FiloSottile.mkcert`, `mkcert -install`, then in `survey/` run `mkcert -cert-file data/tls/ipad.pem -key-file data/tls/ipad-key.pem <LAN IP> localhost 127.0.0.1` (reissue when the LAN IP changes); install `%LOCALAPPDATA%\mkcert\rootCA.pem` (never `rootCA-key.pem`) on each iPad and trust it; allow inbound TCP 8443 and 8787 in Windows Firewall (an administrator `New-NetFirewallRule -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8443,8787 -RemoteAddress LocalSubnet`). The script uses the nine-question rotation, so a database whose active run is the old four-question set needs a city reset in Admin before guests can start.

**Terminal 1 — survey server** (API, WebSocket, Guest/Admin pages and SQLite data)

Mac:

```sh
cd survey
npm run build
SURVEY_HOST=0.0.0.0 \
  SURVEY_QUESTIONS=src/survey/questions.rotation.v1.json \
  SURVEY_TLS_CERT=data/tls/ipad.pem \
  SURVEY_TLS_KEY=data/tls/ipad-key.pem \
  npm run server
```

Windows PowerShell:

```powershell
Set-Location survey
npm run build
$env:SURVEY_HOST='0.0.0.0'
$env:SURVEY_QUESTIONS='src/survey/questions.rotation.v1.json'
$env:SURVEY_TLS_CERT='data/tls/ipad.pem'
$env:SURVEY_TLS_KEY='data/tls/ipad-key.pem'
npm run server
```

`SURVEY_QUESTIONS` must name the nine-question rotation set, because the server default is still the retired question set. On start the terminal prints `LAN Guest:` URLs for the iPads.

**Terminal 2 — 3D city** (at the repository root)

```sh
npm run dev -- --port 5173
```

## 2. What each device opens

| Device | URL | Purpose |
| --- | --- | --- |
| Shared screen (exhibition PC) | `http://127.0.0.1:5173/?survey` | The city; add `&quality=low` on a weak GPU |
| iPad A | `https://<exhibition-PC LAN IP>:8443/guest?station=A&hand` | Visitor questions (hand gestures and touch) |
| iPad B | `https://<exhibition-PC LAN IP>:8443/guest?station=B&hand` | Second station |
| Staff (exhibition PC) | `http://127.0.0.1:8787/admin` | Status, resets, Undo, day/night; localhost only |
| Monitor (optional) | `http://127.0.0.1:8787/monitor` | Text view of state and events |

With a single iPad, open `https://<exhibition-PC LAN IP>:8443/guest?hand`. Do not mix the single station with A/B stations while an experience is unfinished, and open only one page per station. Drop `hand` from the URL for the touch-only interface.

## 3. During the exhibition

- **Handoff:** after a visitor submits, the iPad shows the result and handoff page; the next visitor presses 「はじめる」 and the handoff happens without staff confirmation.
- **Admin:** 「未完了の体験を終了」 ends an unfinished questionnaire; 「直前の提案を取り消す」 undoes the latest proposal only before the next visitor starts; 「昼／夜／自動」 fixes the shared screen's time or restores the day cycle. City reset keeps the total count; full reset clears it but keeps history.
- **Data:** SQLite lives at `survey/data/survey.sqlite`, and a restart keeps the accumulated city. When switching from the old question set to the rotation set, reset the city in Admin first.
- **After a code update:** rerun Terminal 1's build and start commands, then reload the shared screen, iPads and Admin.
- **Different server port (for example 8790):** open `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8790/ws` on the shared screen.

## Local trial (no iPad)

In Terminal 1, run `npm run build` in `survey/`, then `SURVEY_QUESTIONS=src/survey/questions.rotation.v1.json npm run server`; Terminal 2 is unchanged. On the same computer, open `http://127.0.0.1:8787/guest` to answer and `http://127.0.0.1:5173/?survey` to watch the city. `http://127.0.0.1:5173/` alone is the city prototype, which receives no proposals.

## More documents

- [Exhibition specification](docs/EXHIBITION_SPEC.md) · [Validation guide](docs/VALIDATION.md) (exhibition PC, two iPads, long runs) · [LAN station setup](docs/handoffs/lan-guest-stations.md)
- Developers and AI agents: [AGENTS.md](AGENTS.md) · [Architecture](docs/PROJECT.md) · [Document index](docs/README.md) · DEV auto-answer in the [survey guide](survey/README.md)
- `module-swap/` is a preserved v1 demonstrator, not the exhibition city.
