# N1 energy-part narration — 2026-10-29

Branch `feat/energy-narration` from verified `origin/main` `8f2a8d9` (fetch 0/0). Runtime source verified at `045025d`; later commits add evidence/docs only. **Review candidate, not merged: the owner must approve the images first.**

## What changed

- [energyNarration.ts](../../../src/energyNarration.ts): bottom-left `.energy-narration` caption (deliberately not a `.causal-panel`, which runners/styles use for the survey card). Window = camera arrival `ARRIVAL_SECONDS + FLY_IN` (4.12 s) → hold end `DISPLAY_MS/1000` (10 s) = **5.88 s**, three steps ≈1.96 s each, one compressed 60 s cycle starting exactly at charge. `DISPLAY_MS`/`shotTimeline`/survey unchanged.
- Per-part clock: only the narrated part (plus its distribution rail; wing/island drive the rail only) uses `EnergyRuntime.clock`; offset before the window, ×10.2 inside, constant offset after, so it never jumps. Cancel clears the map back to the shared absolute clock.
- Copy: `ENERGY_PHASES` exported from [devEnergy.ts](../../../src/devEnergy.ts) (gardens A, ring B); wing/island keep the prototype's three supply steps. Removed parts (card says 配置から外れました) are never narrated.
- Water garden: pools scale with stored level (upper .55→1, lower 1→.68) and release markers run at z −9.6 (just outside the gravity pipes): inside them the support leg hid all 8 markers from the close-up (ray-checked, then 7/8 clear). Markers are 1.8× while moving.
- `HeadlineCamera.play` now returns its shot (the only headlineCamera change).

## Decisions taken here (owner may overturn)

1. **Time**: start at camera arrival, not at fade-in end (5.62 s → only 4.38 s, 1.46 s/step). Cost: first ≈1.5 s of charge overlaps the part's fade-in (semi-transparent).
2. **Readability (measured, not visitor-tested)**: all three steps stay visible for the whole 5.88 s, the active one highlighted. Step lengths 6–18 CJK chars; at ≈1.96 s per step the long garden step (18 chars) needs ≈9 chars/s, above the ≈4–6 chars/s comfortable for subtitles. One short line per phase does not fit in the current copy; two steps would not fix the 18-char line either. Recommendation: shorter step copy (≤8 chars) or a longer slot (product change, `DISPLAY_MS`).
3. **Card vs caption**: card = whose voice + what changed (existing Japanese copy, unchanged); caption = how the part works only, no counts/added/removed. **The caption is the Chinese DEV copy while the card is Japanese**; language is an owner decision.
4. **Reduced motion**: no narration at all. The client already converts reduced-motion live results into immediate snapshots with no result card (`src/surveyView.ts`, `reduced?.matches → restore()`), so a static reading would be the only result surface. Owner can ask for one; the static devEnergy texts are still in `startEnergyReview`.

## Evidence

- [Live runner](live.mjs) → [live/browser.json](live/browser.json): real dev:auto-mode scratch server/SQLite, HTTP proposals, WebSocket, Chrome 156.0.8078.73 headless 1920×1080 DPR1 default, hour12, real clock. Per part: reduced-motion result (never narrates, stays hero), full live narration (charge ≈t16–17 after fade-in, release ≈t52), measured step durations 1.90–2.00 s, caption first shown 4.17–4.19 s, return to hero, then one mid-narration interrupt: garden Undo 4 ms, garden2 next live result (server holds it to slot end; cleared 4.0 s after the request), ring TCP reconnect 2 ms, wing reset 5 ms, island reload snapshot. Rotor angle equals the shared `energyCycle(time)` afterwards (ring/garden/garden2/island). Errors 0.
- Originals: `live/<part>-charge.jpg`, `live/<part>-release.jpg`, `live/<part>-reduced.jpg`. All 15 inspected. Gardens differ clearly (full upper pool + rising markers vs receding upper pool + falling markers + wider lower pool). **Ring differs only in rotor speed (invisible in stills); wing and island show no model change between steps: their narration is effectively caption-only** (distribution markers are outside these frames).
- [run-captures.sh](run-captures.sh): unmodified [S0 runner](../../closeup-polish/capture.mjs) for the five energy shots + hero → [final/](final/) (34 states × 2 takes) and canonical uncapped perf. [a5-a6.json](a5-a6.json):
  - A6 34/34 PASS; vsync min 59.9.
  - A5 (owner rule: FPS ≥95% S0, hero calls ≤110%, shot calls diagnostic): hero day/night 104.8%/100.3% FPS, calls 950/948 PASS. 8/10 energy rows PASS; **FAIL ring night 94.3% and wing day 94.2%** (ring night calls 561 vs 443 is diagnostic only).
  - Diagnostic same-session A/B ([diagnostic-ab/](diagnostic-ab/), [log](diagnostic-ab.log)): unchanged `origin/main` vs this branch, ring 98.7/98.5 vs 98.3/98.4 FPS, wing 132.9/131.5 vs 131.6/131.7. The FAILs match the ≈5% run-to-run spread C1 recorded, not a regression; they stay recorded as FAIL. (Diagnostic JSON `commit` fields name the runner's checkout, not the served tree; `main-*` was served from a detached `origin/main` worktree.)
- Root `npm test`, `npm run build`, `git diff --check` PASS (unit test [energyNarration.test.ts](../../../tests/energyNarration.test.ts): phase-copy mapping, window inside the hold, start at charge, continuity, one cycle, visible garden phase differences, other parts on the shared clock, cancel/superseding/reduced motion restore the clock).

## Limits

Development Mac only (macOS 27.0.1, Chrome headless); no exhibition hardware, Safari/iPad/Windows, long run or visitor reading test. Survey/module-swap untouched (survey build only for the scratch fixture). Owner's 24-pair two-second tier check remains the known C1 gap.

## Rerun

```sh
npm run build --prefix survey
npm run dev -- --port 5174 --strictPort
CITY2127_CITY_URL=http://127.0.0.1:5174 CITY2127_EVIDENCE_DIR=<fresh dir> node artifacts/closeup-next/N1/live.mjs
CITY2127_EVIDENCE_DIR=<fresh dir> sh artifacts/closeup-next/N1/run-captures.sh
```
