# resident-experience-p2 — Resident copy and two-screen presentation

- Owner: Codex
- Status: IN_PROGRESS
- Branch: `codex/resident-experience-p2`
- Base commit: `a2271b5e8cd9fb9e86ecc5caea92e6ad9cd0a392`
- Last verified commit: base `a2271b5e8cd9fb9e86ecc5caea92e6ad9cd0a392` + uncommitted P2 delta verified; source SHA recorded after commit
- Remote availability: NOT PUSHED

## Session Git state

2026-10-02 (Asia/Tokyo): confirmed `/Users/fatboy/city2127`, clean main at base above; origin fetch succeeded, main/origin/main 0/0. No dirty files/screenshots to preserve. P1 and plan source/integration commits are available on remote main; no unfinished runtime commits. Codex owns question copy/loader, Guest presentation, root narrative panel and related checks/docs; no other local owner or binary edits.

## Goal and scope

Implement [P2](../RESIDENT_EXPERIENCE_PLAN.md) using [P1 copy](../RESIDENT_COPY.md). Keep ids/effects, algorithm/CityView v2, schema7, 3s transitions/A-B scheduling and Guest result10s/handoff5s. Preserve history, draft recovery, same-ID retry, focus and selection. No P3 district causal inference or coordinated reading schedule, hardware/deployment/dependencies.

## Completed work

Formal question-set version3 uses all P1 four question/background/12 option copy; ids/order/effects preserved. Loader validates copy revisions independently of algorithm v2. Guest keeps native radio/focus/selection, pre-submit review/edit and same-ID failure recovery, then shows saved/wait/look-up, shared station/ordinal identity and handoff. For an obsolete A/B draft, the explicit fresh-reservation action ends only its own old reservation before carrying valid choices forward. Existing single-revision conflict scores remain a recovery tool before submit.

Root reuses the panel for title + at most2 sentences + actual focal place: ambient card rotation12s, local live recorded-fallback10s. Focal service/shared counts, Park trees+cooling and rendered tower band select facility cards. No district/seed causal claim; P3 still needs actual-carrier comparison and coordinated reading slots. Opening identity body uses first2 P1 sentences. Current-run recentProposals, never lifetime count alone, permits inherited-city copy. Authoritative snapshots/reset/Undo replace cards; lighting-only snapshots preserve valid queue/current card; reload restores ambient, not an old live story. Camera/geometry/resources unchanged.

## Actual validation results

- Verification status: PASSED locally; source/main CI and integration pending
- Supplementary task screenshots retained outside checkout at `/private/tmp/city2127-resident-p2-extra-evidence`; six focused screenshots committed as current evidence
- Date/worktree: 2026-10-02, P2 delta against base above; exact source SHA recorded after commit
- Root `npm test` + `npm run build`: PASS (Node26.0.0). Survey `npm test` + `npm run build`: PASS. Existing root bundle-size warning remains; no new dependency/code split.
- Initial sandbox test attempt reached real local socket checks and failed with `listen EPERM`; reran with approved execution permissions and all checks passed. No application failure hidden.
- Expanded native checks: real SQLite question2→3 restart in single/A/B; immutable original text/version/effects and same-ID saved retry, reserved-version rejection/new reservation, no extra vote, schema7 unchanged. Card selections/counts/places, current-run inherited guard and identity PASS; existing81-combination/Meter/HTTP/WebSocket suites PASS.
- `tests/adminUndo.browser.mjs`: PASS, fresh scratch8796; single next-start, exact Undo restore/reload, Guest storage clear, audit/revoked retry and Monitor. `tests/twoStations.browser.mjs`: PASS, scratch8795; A/B lost commit reply/reload counted once, identities,3018ms ordered display starts, independent drafts/handoff, reset admission/drain/count preservation, named cancellation and City/reload.
- `tests/residentP2.browser.mjs`: PASS; own temporary real SQLite/server with old-version A/B drafts. Valid selections carried into new copy/background; native keyboard Space/radio, visible selection/focus, review edit, no partial vote, pre-commit network loss same-ID retry, no result tables, matching City/Guest identity, ambient/live/reload card; final12s facility rotation and actual service place PASS on rerun.
- Browser environment: installed Google Chrome headless,1280×720, deviceScaleFactor1, Mac; root loopback Vite5173, `?hour=16`. Page exceptions NONE; aborted submission requests are deliberate test inputs. This is not actual iPad/Safari/touch/GPU/FPS acceptance.
- Evidence: [question](../../artifacts/resident-p2-question-A.png), [review](../../artifacts/resident-p2-review.png), [look up](../../artifacts/resident-p2-look-up.png), [ambient city](../../artifacts/resident-p2-city-ambient.png), [facility](../../artifacts/resident-p2-city-facility.png), [result](../../artifacts/resident-p2-city-result.png). Visual review plus panel bounding-area assertion <16% of1280×720; no reading-time claim.
- Whitespace/full diff/Markdown links: PASS;347 local links, ordered4 question/12 option ids/effects against base, exact tracked diff and new files/screenshots reviewed
- Integrated commit/checks: NOT INTEGRATED

## Documentation sync and limits

PROJECT/SPEC/plan/current narrative/index/VALIDATION and startup guides record the implemented split, copy3 versus algorithm2, old-draft behavior and retained timing; P1 original conditions/handoffs remain dated history. ART needs no change because no geometry/material/light/camera changes. module-swap untouched (legacy v1). No deployment, infrastructure, binary model or shared asset edits.

P3/P4/P5/S5 remain open: P2 local result may be replaced at existing≥3s A/B start, so no complete10s reading slot guarantee. Conservative result text intentionally does not infer full district change, pairing/seed or increased population. Facility cards describe focal targets; true district causal truth is P3. Hardware/Safari/LAN-on-real-devices, understanding, external Japanese review, sustained stability and exhibition-day recovery policy remain unverified.

## Next expected step

Complete final checks, source commit/push/CI, self-review and main integration/revalidation under [Git workflow](../CONTRIBUTING.md). After completion, next assigned implementation is P3; Codex does not start it implicitly. Existing preview is only local; no deployment.
