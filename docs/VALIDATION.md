# Validation and handoff

## Exhibition acceptance direction — 2026-09-18 (not yet implemented or tested)

The current product goal is collective guest-driven change in a futuristic Shibuya. Documentary-photograph realism is no longer a completion gate. Future implementation stages should turn the following experience requirements into concrete checks after question content and change rules are agreed:

- Each guest answers one question; the next guest receives the next question.
- Each choice acts on the accumulated city. A guest handoff retains previous contributions rather than restoring a preset or initial city.
- At the end of their experience, the guest immediately sees a discernible visual consequence of their choice. Exact timing, animation duration and the experience-end trigger remain to be designed.
- The shared city remains recognizably futuristic Shibuya as it changes. Building count/density and pedestrian activity are candidate effects, not mandatory implemented parameters.
- Reset behavior, end-of-question handling, reload recovery and storage have no acceptance rules yet; define them before implementing or claiming exhibition readiness.

The existing tests and captures below verify the three-preset prototype only. They do not establish a question sequence, cross-guest accumulation, dynamic buildings or exhibition readiness. The old invariant that buildings never change applies to current preset regression checks, not to future choice-driven geometry. New checks require the approved implementation scope; this documentation stage does not authorize them.

## Documentation alignment — 2026-09-18

Scope: README, AGENTS, PROJECT, PLAN02, VALIDATION and SHIBUYA only. Align the exhibition goal, one-question-per-guest sequence, cumulative city and undecided reset rules; preserve historical evidence. No executable changes, new screenshots or new runtime/performance claims. Verification covers local Markdown links, consistency of the new direction, and source checks of the unchanged preset behavior. No rendering or build rerun is needed for this stage.

Results: all 86 local Markdown link targets across the six documents exist; `git diff --check` passed. Reviewed the diff for consistent scope and separation of current goals, prototype behavior and historical evidence. Checked `presets.ts`, `worldState.ts` and startup in `main.ts`: three presets, 10-second transition / 4-second hold and one-time rig initialization remain the baseline. `npm test`, `npm run build` and browser checks were not run for this documentation-only change.

## Task handoff verification — collaboration Stage 1, 2026-09-18

Use a task-specific file under `docs/handoffs/` based on the [template](handoffs/TEMPLATE.md), not a shared central status file. Follow the [collaboration workflow](CONTRIBUTING.md). A new contributor compares the recorded branch, base and last verified commit with the actual checkout and diff, then reads affected source and architecture before resuming. If commits are missing locally, check the recorded remote availability; never infer completion from a handoff alone.

Record implementation status separately from verification: exact commands or manual checks, date, commit checked, results and unresolved limitations. Mark unexecuted checks as NOT RUN. For partial work, record whether commits were pushed and identify the remote branch. A check of an earlier commit is historical evidence, not proof of later changes. Record the integrated commit and checks before pushing main; if only the handoff changed after verification, explicitly record that documentation-only delta rather than inventing a self-referencing commit hash.

Documentation-only tasks require complete diff review, local Markdown link checks, `git diff --check`, scope/preservation checks and consistency with current Git state. Code tasks additionally require `npm test` and `npm run build`; visual/motion tasks require the relevant browser checks below. Stage 1 originally deferred CI to Stage 2. The workflow is now configured locally, but remote execution remains unverified; once verified, require successful branch checks before merging and verify main checks after pushing.

## CI configuration — collaboration Stage 2, 2026-09-18

[Workflow](../.github/workflows/ci.yml): branch pushes and optional PRs run on `ubuntu-latest`, Node 24, with read-only repository permissions, a ten-minute timeout and npm cache. Steps install the existing lockfile with `npm ci`, run tests/build and check committed diff whitespace. Pushes compare the event's previous SHA with HEAD; PRs compare the base SHA with the checked-out merge result. A new branch's zero/missing previous SHA compares the complete tracked tree with an empty tree, so existing whitespace can also fail the first push. Full checkout history supplies comparison commits; a missing nonzero base fails rather than silently skipping the check.

Actual local results (Node 26.0.0, npm 11.12.1, working tree based on `3d670b5`): `npm ci --offline`, `npm test` and `npm run build` passed. The existing >500 kB bundle warning remains. YAML parsed locally; the workflow's exact shell block passed six temporary-repository checks (clean/rejected whitespace for normal, empty and zero-SHA bases). Diff whitespace and local documentation links were checked. No application source, tests, assets, package manifest or lockfile changed; no browser check was needed.

Remote GitHub Actions execution, Node 24 execution and actionlint validation are NOT RUN. Configuration is not proof of a green remote run. The user subsequently authorized reviewing, committing Stage 1 + 2 and pushing main. The combined diff was reviewed against synchronized origin/main; publication proceeds directly on main for this explicit request. Next: verify the pushed main commit on GitHub Actions. No branch protection, deployment or Blender pipeline was added. [Task handoff](handoffs/stage2-ci.md).

## Automated checks for the current prototype

For executable changes, run from the project root:

```sh
npm test
npm run build
```

Tests use `node:assert/strict` and Node's TypeScript stripping; keep new checks small and focused. `tsc` currently checks `src/`, while Node executes the test files. There is no separate lint/format command.

The state test covers midpoint interpolation, the immediate verdict, the four-second lock and choosing again. The mobility test samples three traffic cycles, one walking-cycle boundary and 501 positions per circulation route against layout-derived landmark envelopes, plus delivery transfer/lift continuity and closed-route guide wraparound. The Shibuya checks also sample all five painted walking paths, off-road waiting endpoints and landmark ground footprints against the road polygons. These checks do **not** prove visual correctness, exact mesh collision, every pedestrian pose or drone-to-drone avoidance. Inspect the actual scene after geometry/motion changes.

A Vite warning about the single bundle exceeding 500 kB has been observed; it is not a build failure. Do not hide it or add code splitting solely to silence it. Measure loading needs before changing packaging.

## Browser regression checks for the current prototype

1. Start or reuse `npm run dev -- --port 5173`. Open the actual localhost URL. Reload after relevant changes if HMR has not applied them. Confirm the canvas renders and console has no new errors.
2. Check all three states at the **same viewport and camera**. Confirm the tower, shops, kiosk, crossings and island retain their layout; transitions must not add/remove building meshes or produce a hybrid skyline.
3. Select Pulse. During the first 10 seconds, try another key: it must be ignored. At completion the verdict must appear immediately while controls stay locked for four more seconds. Aircraft, deliveries and window beats must keep moving. After the hold, select Still; then return to neutral and verify the verdict clears.
4. Observe at least 60 seconds of motion. Check car headings, edge fades, walking legs, waiting/queue positions and the cycle boundary. People should cross on the intended zebra paths rather than walk through the tower or props. Inspect aircraft bodies and the 4.4-unit wing span against roofs, gardens and corridor turns. Watch a complete 32-second delivery cycle: berth, horizontal cargo transfer, descent, receiver doors, departure and empty-lift return. Cargo must clear the facade before descending, and the courier must enter the real station opening.
5. Confirm Pulse is visibly busier than Still. All states must retain daylight, readable architectural surfaces and restrained bloom. Check both elevated walking routes, corner landings and terminal lift travel as well as the ground crossing.
6. Exercise buttons and `0/1/2`, keyboard focus at the desktop viewport if the overlay/camera changed. Responsive/mobile acceptance is explicitly out of scope (user decision, 2026-09-17). Check that resize updates both camera projection and composer size. OrbitControls were added in commit 5ad7dd0 (2026-09-17); do not change the initial hero pose to solve framing problems, and take comparison screenshots before touching the camera.

Use the available browser tool and its documented APIs. Browser handles, tab IDs, localhost processes and previous tool sessions can expire; rediscover an existing matching tab rather than assume a previous ID still works. Restore temporary viewport overrides after testing.

## Performance evidence

The canvas publishes:

| Attribute | Meaning |
| --- | --- |
| `data-time` | Last sampled elapsed animation time in seconds; use modulo 32 to identify the delivery phase |
| `data-fps` | Average over the latest **120 rendered frames**, not a fixed two-second interval |
| `data-draw-calls` | Last sampled frame's calls across the composer passes |
| `data-geometries` | Renderer-tracked GPU geometry count; not a scene mesh count |

For a performance claim, use a foreground 1920×1080 viewport, allow shader warm-up and at least 120 frames, and record state, browser/device, viewport, pixel ratio and sampled stats. This FPS includes frame scheduling and is not a GPU timer. Hidden tabs and display refresh rates affect it. Compare geometry counts after warm-up across repeated transitions; stable counts alone do not prove that no objects were regenerated.

Version 1 had a local observation near 60 FPS at a 1080p canvas. Version 2 had an observation near 120 FPS at the normal preview size; its later 1080p diagnostic read did not complete because the browser handle became stale. **Do not reuse either observation as a current, cross-device performance guarantee.** Remeasure when reporting performance after changes.

## Screenshots and completion

- Save meaningful changed-state screenshots in `artifacts/`; preserve the original version-1 evidence. Version-2 files use the `future-` prefix; version-3 files use `air-commons-`.
- Use the same dimensions and camera for comparisons. Animation time is not pinned: note that aircraft/people can occupy different positions.
- Open saved files to inspect them, not just the live tab. In a previous in-app session, a lower-level screenshot API cropped oversized viewports and its full-page capture stitched incorrectly. The unified `getScreenshot` capture at the default 1280×720 viewport worked. Recheck dimensions and edges with the current tools rather than assume that workaround is still needed.
- Leave a working preview when possible. Keep commands and behavior docs current. Final handoff should briefly name the change, checks actually completed, artifact/preview links, and any unresolved issue. Never report a proposed or timed-out check as passed.

For documentation-only work, verify statements against current source and resolve local Markdown links. Do not rerun rendering or builds merely because prose changed.

## Historical evidence (not exhibition acceptance)

The dated records below retain their original criteria and observations. References to documentary realism or unfinished art describe the former Plan 02 goals; they do not override the 2026-09-18 direction.

## Plan 01 local acceptance — 2026-09-17

- `npm test` and `npm run build` passed with Node 26. The existing >500 kB bundle warning remains.
- In-app browser desktop checks at 1280×720 covered Dusk, Pulse, Still, button and keyboard selection, ignored input during transition, visible verdicts, re-selection and clearing the verdict on returning to Dusk. Exact 10-second / four-second boundaries are verified by the state tests; a browser wait for the brief hold message timed out and is not counted as a timing assertion.
- Sampled motion over multiple street/delivery cycles showed the shared diagonal crossing, waiting groups, circulating aircraft and courier berth. Full delivery phase continuity and conservative building clearance are checked numerically; this is not a frame-by-frame collision recording. Browser error/warning log was empty at the final check. Warmed GPU geometry count remained 94 in the final layout samples. No 1080p performance claim was measured.
- Final `shibuya-neutral.png`, `shibuya-pulse.png` and `shibuya-still.png` use the same 1280×720 camera. The screen and ground remain simplified blockout geometry; recognition and final art direction still need user judgment.
- Responsive adaptation is excluded by the user. Newly attempted mobile adaptations were removed. The user chose local acceptance only; no ChatGPT review was submitted after the automatic approval rejection.

## Plan 02 first vertical slice — 2026-09-17

- Reference: [Pic 2](../asset/pic2.png). Architecture, materials, two authored public decks and lifts, upper occupied link, sky infrastructure and engineered filtration membranes replace the former civic-model direction. All three states now use daylight. Old screenshots and the pre-existing Plan 01 acceptance notes are preserved.
- `npm test` covers the existing state/street/delivery checks plus public-journey continuity, deck endpoints, cargo separation and air clearance of the new upper link. `npm run build` passes; the existing >500 kB warning remains.
- Visual acceptance is deliberately limited to this first spatial slice: the result has stronger vertical connections and fewer actors, but remains visibly procedural. Documentary realism, dense integrated city-scale massing and unmistakable Shibuya recognition remain art-direction gaps; these are not marked as passed.
- Public lifts use small authored platforms, without capacity dispatch or avoidance. Upper occupied links are architectural proxies without interior simulation. Rail/pylon collision is visually sampled rather than exhaustively checked. No 1080p FPS or cross-device performance claim is made.
- Final in-app browser checks at 1280×720 covered Daylight → Pulse → Still → Daylight, keyboard and button selection, ignored `2` during the Pulse transition, visible verdict during the hold with disabled controls, re-selection after hold, and clearing the verdict on neutral selection. Screenshots and diagnostics sampled motion from startup through more than 60 seconds; elevated walkers, terminal platforms, aircraft and delivery changed position. Delivery/collision continuity is principally verified numerically, not by exhaustive video inspection.
- The warmed geometry count was 56 in both Pulse and Still samples, with 115 composer draw calls. Error/warning logs were empty. These are local observations, not a 1080p performance benchmark or proof of exact mesh collision.
- Saved and reopened [Daylight](../artifacts/plan02-neutral.jpg), [Pulse](../artifacts/plan02-pulse.jpg) and [Still](../artifacts/plan02-still.jpg). All are 1280×720 with the same locked camera. The express corridor intentionally exits the upper frame; the screenshot is a complete viewport, not a stitched capture. Browser viewport override is reset after validation.

## Plan 02 stage 1 — vertical block massing, 2026-09-17

- Change: QFRONT crown and hung west wing, MAGNET mid-block collar and east wing on two ground columns, and an open commons floor at Y=24 between the cores. All new volumes are entries in `upperLinks`; landmark footprints, crossings, routes, dock and camera pose are unchanged.
- `npm test` and `npm run build` passed with Node 26; the >500 kB bundle warning remains. New checks: every upper volume bears on its named cores by ≥1.5 units and stays under their roof, columns are inside the volume and off the road polygons, and the courier column and public journeys clear every volume.
- Playwright (Chromium) at exactly 1280×720 captured `artifacts/plan02-block-neutral.png`, `-pulse.png`, `-still.png` with the initial camera; `artifacts/plan02-*.jpg` remain the pre-stage baseline at the same pose. Console had only the pre-existing favicon 404. Stats after warm-up in Daylight: 60.1 FPS, 115 draw calls, 56 GPU geometries at 1280×720. **This is not a 1080p measurement.**
- A separate Chrome extension session confirmed the page loads and renders without errors at 1920×825; that window could not be resized, so it was not used for comparison captures.
- Not verified: full mesh collision of the new wings against rails and pylons, interior readability of the commons floor (partly hidden behind the loop rail from the hero pose), and final art acceptance. The three captures are evidence of massing, not documentary-photograph acceptance.

## Plan 02 stage 2 — hero pose and ground edge, 2026-09-17

- Change: initial camera moved to `(34,34,76)` looking at `(-3,17,-1)` with FOV 46°; the orbit target now imports the same constant. Ground plate enlarged to 150×140 and the five road arms extended to ±70–75 so no plate edge is visible from the pose. Car travel range, crossings, waiting positions and landmark footprints are unchanged.
- `npm test` and `npm run build` passed; road-polygon tests (waiting positions, landmark footprints, column positions) still pass against the extended arms.
- Playwright (Chromium) at 1280×720 captured `artifacts/plan02-frame-neutral.png`, `-pulse.png`, `-still.png`. These are a **new pose** and are not a same-camera comparison with `plan02-block-*` or `plan02-*.jpg`. Console showed no errors after reload. Warm Daylight stats: 60.1 FPS, 115 draw calls, 56 geometries at 1280×720; not a 1080p measurement.
- Not verified: the pose at other aspect ratios (desktop-only remains the contract), and art acceptance of the framing.

## Plan 02 stage 3 — materials, facade depth and light, 2026-09-17

- Change: shared materials split into matte composite, refined metal and reflective glass; pavement gets its own matte material; one sun-shade fin per window floor per face on all buildings; shop slabs thickened; environment intensity .6, sun 3.0, hemisphere 1.05, exposure .9. No new textures, passes or assets.
- `npm test` and `npm run build` passed. Playwright (Chromium) at 1280×720 captured `artifacts/plan02-surface-neutral.png`, `-pulse.png`, `-still.png` at the stage 2 pose, so they compare directly with `plan02-frame-*`. No console errors. Warm Daylight stats: 60.1 FPS, 117 draw calls, 57 geometries at 1280×720; not a 1080p measurement.
- Not verified: art acceptance. Implementer's read: floors and glass now have depth, but the flat single-colour sky and the absence of a distant city still read as a model. That is outside this stage.

## Plan 02 stage 4 — sky gradient and distant skyline, 2026-09-17

- Change: camera-following gradient sky dome with per-state zenith colours; seeded ring of 60 hazed blocks at radius 125–165 with a per-state tint; camera far plane 240→320. No new assets or passes.
- `npm test` and `npm run build` passed. Playwright (Chromium) at 1280×720 captured `artifacts/plan02-sky-neutral.png`, `-pulse.png`, `-still.png` at the stage 2 pose. No console errors. Warm Daylight stats: 59.8 FPS, 120 draw calls, 59 geometries at 1280×720; not a 1080p measurement.
- Not verified: art acceptance of skyline density and height, and appearance when the user orbits toward the ring edge, where the plate edge and the ring gap can become visible.

## Plan 02 stage 5 — public lift and deck junctions, 2026-09-17

- Change: same-route walkers start 16 s apart so a lift carries one rider at a time; each direction walks on its own side (lane ±.5, mitred at corners, returning to the shaft centreline during the lift ride); platforms stay on the shaft centreline and turn with the deck; terminals are deck-aligned landing frames with a 1.6-unit opening, decks stop 1.5 units short of each terminal, and deck rails are mitred at interior corners (outer rail extended, inner rail shortened by the signed mitre length). Routes, endpoints, timing split (15/70/15) and the hero pose are unchanged.
- `npm test` and `npm run build` passed with Node 26; the >500 kB bundle warning remains. New checks: rider within .5 of the platform centre while riding, no two same-route walkers riding within 3 units of each other, and a >.9 horizontal gap between any two same-route walkers at every .1 s over 96 s.
- Playwright (Chromium) at 1280×720 captured `artifacts/plan02-lift-neutral.png`, `-pulse.png`, `-still.png` at the stage 2 pose, so they compare directly with `plan02-sky-*`. Console had only the pre-existing favicon 404. Warm Daylight stats: 60.0 FPS, 120 draw calls, 59 geometries at 1280×720; not a 1080p measurement.
- Orbited diagnostic frames (not saved as artifacts) showed walkers keeping to one side of the decks and decks meeting the terminal frames without gaps; a close frame of a platform mid-ride through the opening was not captured, so that is verified by geometry (1.35 platform in a 1.6 opening) rather than by screenshot.
- After the corner-rail mitre the three captures were retaken (same pose, same stats: 60.0 FPS, 120 draw calls, 59 geometries); an orbited diagnostic frame showed both route corners closed on the outer side. Not verified: art acceptance.
