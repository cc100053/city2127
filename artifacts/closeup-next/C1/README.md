# C1 selected closeup candidate — 2026-10-29

Feature `feat/closeup-accepted`, baseline `cd401e0b0ca25a87c5cb754289d3f56664251d37`; runtime `9bd0605`, mesh-fixture correction `d6bed36`. Owner cc100053; sole worker `01a185a2-dd7b-7711-ba9f-97204080bf80`. This is a review candidate. No main merge, new art round or N1 work is authorized by its technical checks.

Scope: copy only four selected SHOTS rows from `f66cc3a` (`energy:ring`, `se:district`, `sw:district`, `nw:focal`), exact `eebff28` automationHub service faces/operating joints and their tests, then one SW focal pose-only candidate. Its position `[-164,61,147]`, target `[-105,10,60]` stays near B r2, after inspecting original S0/r2/r3; no candidate was substituted after measurement. The test asset stub contains one mesh so late-load batching is actually exercised. All other source poses/builders remain main. [Scope assertion](exact-scope.json), [source preparation](prepare.json).

The complete selected S0 matrix is 40 day/night states, 80 unmodified JPEG90 originals, 12 canonical performance cases × two raw windows, and 38 numeric A4 comparisons. Each state uses `reviewTime=20`, hour12/22, 1920×1080/DPR1/default and two fresh navigations; second take is always the formal original. The unmodified [S0 runner](../../closeup-polish/capture.mjs) records pose/GPU/diagnostics/errors and refuses image replacement. [Batch command](run-captures.sh) runs one renderer at a time. [Compare adapter](compare.mjs) only selects these six views in that same runner, so the final comparison JSON contains all selected pairs rather than the last shot alone.

Canonical A5 uses both `--disable-gpu-vsync` and `--disable-frame-rate-limit`, each navigation ≥16s warmup and each independent rAF sample ≥5s. Compare the exact original S0 FPS at ≥95%, mean calls ≤110%, plus all per-state vsync ≥58; raw calls and shadow-pass outliers stay visible. Chrome patch changed from S0 `156.0.8078.48` to `156.0.8078.73`; no same-version isolated optimization claim. A3 stays diagnostic at7/9 and numeric A4 at6% adjacent/12% extremes. The owner two-second adjacent-tier visual comparison is a separate PENDING hard gate. A1/A2/A5/A6 and V gates retain FAILs.

[Full S0/C1 side-by-side review](REVIEW.md), [structured report](report.json), [original-image judgments](visual-review.json), [checks](checks.json), [all original hashes](original-images.json), [raw capture](final/capture.json), [raw canonical performance](final/performance.json), [numeric A4](final/comparison.json), [capture log](captures.log). Every final second take and its S0 counterpart is inspected directly as a full original; the Markdown links preserve the complete comparison matrix. Session V1 judgments are not visitor tests and do not clear owner acceptance.

The [live runner](live.mjs) adapts the prior Z fixture to actual NW focal, SW focal/district, SE district and ring headlines, retaining four-site and energy authority assertions. It uses real current-v4 HTTP/WebSocket on isolated scratch SQLite with dev:auto config; checks intermediate shared3s geometry, matching result place, normal return, reload, Undo and reduced motion. Diagnostic refresh is120frames, so intermediate states prove easing; exact3s duration remains covered by root tests. [Live results](live/browser.json). The unchanged [formal E4 runner](../../../tests/energyE4.browser.mjs) additionally covers current Guest Q3, SQLite7→8 history, same-ID retry, energy Undo, mixed portfolio, day/dusk/night, TCP reconnect, reduced motion, ordinary resize and reset. [Formal results](formal/browser.json).

Reproduce from repository root with installed Node26, root/survey dependencies and existing Playwright/Chrome, using the actual Vite URL:

```sh
npm run dev -- --port 5194
sh artifacts/closeup-next/C1/run-captures.sh
CITY2127_CITY_URL=http://127.0.0.1:5194 node artifacts/closeup-next/C1/live.mjs
CITY2127_CITY_URL=http://127.0.0.1:5194 CITY2127_PLAYWRIGHT_PATH=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs CITY2127_EVIDENCE_DIR=artifacts/closeup-next/C1/formal node tests/energyE4.browser.mjs
node artifacts/closeup-next/C1/report.mjs --self-test
node artifacts/closeup-next/C1/report.mjs
```

Choose fresh evidence folders for a new run; do not overwrite existing originals. [Root suite](test.log), [root build](build.log), [survey fixture build](survey-build.log), [headline checks](headline.log), [initial service checks](automation.log), [local link checks](link-check.json). The initial empty fixture warning is preserved in automation.log; the full root suite uses the corrected mesh fixture and has no such warning. No runtime source changed after captures started.

Preflight fetched main0/0 and inspected a clean independent clone. The clone initially fetched only main, so the old feature reference was fetched explicitly for the selected row/source comparison. Actual quota exhaustion interrupted the worker once before capture; recovery kept the same owner and exactly verified the three dirty source hashes before continuing. [Handoff](../../../docs/handoffs/closeup-next.md) separates validated source, final metadata SHA, pending owner gates and cleanup.

Limits: development Mac macOS27.0.1/Chrome only; no exhibition hardware, HDMI/4K, Safari/iPad, Windows, long-run FPS or visitor understanding claim. Static originals do not prove all-time flicker freedom. Global V3 vegetation and focal facility redesign are outside C1. Survey/module-swap source and their independent suites are unchanged; no new dependencies/assets or deployment. N1 and F3 remain separate.
