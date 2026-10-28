# energy-demo-camera — DEV energy close-up timing prototype

> 2026-10-29 歸檔：下面嘅 `src/`／`tests/` 路徑指已刪分支上嘅檔案，副本喺 [artifacts/energy-demo-camera/reference](../../../artifacts/energy-demo-camera/reference/devEnergyDemo.ts)（`prototype.diff` 係對 `047cb2c` 嘅完整 source diff）。後續做法見 [closeup-next](../closeup-next.md) N1。

- Owner: cc100053
- Status: ARCHIVED 2026-10-29 — superseded by [headline-camera](../headline-camera.md); owner decided to carry the narrated-cycle idea into the energy stage of [closeup-next](../closeup-next.md) and delete the branch
- Branch: feat/energy-demo-camera
- Base commit: 047cb2c62c5224e1628a418659685d489695a3b9
- Last verified commit: working tree on `feat/energy-demo-camera` before commit (code identical to the commit that adds this handoff)
- Remote availability: branch `feat/energy-demo-camera` (`016f6d1`) deleted 2026-10-29; source, test, diff and images kept in [artifacts/energy-demo-camera](../../../artifacts/energy-demo-camera/reference/devEnergyDemo.ts)

## Session Git state

- Session starting branch and HEAD: `main` 047cb2c62c5224e1628a418659685d489695a3b9
- Last fetched origin/main commit: 047cb2c62c5224e1628a418659685d489695a3b9 (fetched 2026-10-27, 0/0 divergence)
- Local changes present at session start: untracked `.playwright-cli/` (preserved, not touched)
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Measure how long a "fly to the changed facility and narrate how it works" sequence needs after a live result, starting with energy. DEV-only: the exhibition keeps the fixed hero camera ([RESIDENT_EXPERIENCE_PLAN](../../RESIDENT_EXPERIENCE_PLAN.md), [PROJECT](../../PROJECT.md)) until the user changes that decision.

## In-scope files and dependencies

- `src/devEnergyDemo.ts` (new): `energyFocus` (newly added part only: island › receiver growth › flywheel › water garden 1/2), `demoTimeline`/`demoStage`, close-up poses, caption, camera fly/cut, energy clock override.
- `src/main.ts`: loads the module only for `import.meta.env.DEV && ?survey && ?energyDemo`; a live result with a new energy part delays the city transition by `FLY_SECONDS` so the part appears in close-up; every non-live event cancels (cut to hero).
- `src/devEnergy.ts`: phase copy hoisted to exported `ENERGY_PHASES` (same text, shared).
- `src/style.css`: bottom-left `.energy-demo` caption.
- `tests/energyDemo.test.ts` (in `npm test`): focus rules and the 71.6 s full-cycle timeline.

## Completed work

URL: `/?survey=ws://127.0.0.1:8788/ws&energyDemo` with optional `&demoHold=12` (seconds of narrated cycle; default 9). 2026-10-27 revision (user): no full real-time cycle — the whole 60 s storage cycle is compressed into the hold (3 s per phase by default), so the close-up lasts fade-in 3 s + hold 9 s = 12 s and the demo 20.6 s from the live result back to hero. `demoRate` was removed. `document.body.dataset.energyDemo` reports focus, stage, phase and actual stage marks; the console logs plan and result.

Timeline after a live result: hero vote journey 0–2.62 s → fly-in 3 s → part fades in 3 s → compressed narrated cycle (charge / hold / release, highlighted step) → fly-out 3 s.

## Actual validation results

- Verification status: PASSED (prototype scope)
- Date and checked commit/worktree: 2026-10-27, uncommitted `feat/energy-demo-camera` working tree on 047cb2c
- Commands: `npm test` PASS (incl. new energyDemo test), `npm run build` PASS, `git diff --check` PASS. `survey/` and `module-swap/` unchanged, not run.
- Browser: Claude built-in browser pane, 800×600, `?hour=16`, scratch `survey dev:auto`; proposals posted through the real guest HTTP flow (session → proposal).
  - Water garden (2nd water-storage vote), rate 1: marks fly-in 2.64, appear 5.62, cycle 8.63, fly-out 68.64, done 71.62 s (plan 71.62). Returned to hero; no console errors. [charge](../../../artifacts/energy-demo-camera/garden-charge.jpg), [release](../../../artifacts/energy-demo-camera/garden-release.jpg).
  - Flywheel ring (2nd rotor-storage vote), rate 3: done 31.63 s (plan 31.62). [charge](../../../artifacts/energy-demo-camera/ring-charge-rate3.jpg).
  - Wing / island / garden2 poses, cancel by snapshot/Undo/reset, back-to-back live results, A/B stations, night, FPS and exhibition hardware: NOT RUN.
- Integrated commit and checks: NOT INTEGRATED

## Known issues and blockers

- First measurement (before the revision): full real-time cycle 71.6 s, 3× cycle 31.6 s. Quick-demo default: 12 s close-up, 20.6 s total (unit-tested). A browser run of the quick default in the pane was throttled (`visibilityState` hidden), so its marks are not evidence; quick-demo readability (3 s per caption step) is NOT VERIFIED. Even 20.6 s exceeds the 10 s reading slot (`DISPLAY_MS`).
- At the authored close-up distance the water-garden phases look almost identical; the caption carries the story. Visible motion (water level, flow, turbine) needs to be stronger or the camera closer before this is a real "demonstration".
- The resident card returns to the daily rotation after its 10 s while the close-up continues, so card and caption disagree.
- The ring close-up is partly cropped and partly under the resident card; poses need framing passes per part.
- Energy clock jump at cycle start (see `shortcut:` in `devEnergyDemo.ts`).
- No resident actor yet.

## Important decisions

- DEV-only; exhibition behaviour, SPEC and the fixed-hero rule are unchanged.
- Only a newly added part triggers a close-up; removals or no visible change stay in the hero view.

## Next expected step

User decides slot length / trigger (per result vs idle rotation) and whether to lift the fixed-hero rule. Then: strengthen phase motion, frame each part, align the resident card with the caption, add the resident actor.
