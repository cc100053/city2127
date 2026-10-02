# meter-variety — Readable, district-wide Meter changes

- Owner: cc100053 (P0/P1/P4/P5: Claude Code; P2/P3/P11/P12: Codex session)
- Status: IN_PROGRESS — P0–P5 and P7–P12 implemented; P6 evidence recorded per stage; awaiting capture review before main
- Branch: `feat/meter-variety`
- Base commit: `33227a687ac9d18281e90494a4e9b2ce27f861ce`
- Last verified commit: P11 source `ab6a3a165ff6c5448699661c23f7e23d59c0372c` (root/survey local checks, lossless captures, real HTTP/WebSocket browser smoke and [feature CI run 36886838863](https://github.com/cc100053/city2127/actions/runs/36886838863) PASS).
- Remote availability: `origin/feat/meter-variety`

## Session Git state

- P12 session starting branch and HEAD: `feat/meter-variety` `0e2efdf`, clean.
- Last fetched origin/main commit: `33227a6` (2026-10-02; feature vs origin/main 18/0 at startup; feature vs remote counterpart 0/0).
- Local changes present at session start: NONE.
- Upstream integration status: NOT INTEGRATED.
- Pending Git conflicts or synchronization blockers: NONE.

## Problem (measured 2026-10-01)

From the fixed hero pose (`HERO_POSITION`, ~300 m up, 650–950 m away) each change site covers about 40–90 px of a 1080 px frame. Counts of ports, seats, trees or modules inside a lot are not readable there. Baseline: environment low ↔ high changed **0.16 %** of a 1920×929 day frame.

## Plan (user-approved 2026-10-01)

Each Meter keeps its site as the focal anchor and additionally drives 2–3 large district-wide carriers (roofs, facades, water, moving actors, skyline), each with its own visual language. Low / mixed / high are three distinct mature 2127 identities; no server contract change (the root derives each axis' 0..1 position from the existing layout fields). User decisions: spreading Meter changes across the district is allowed; no camera glance for now; environment low = existing greenery kept plus white shade sails and cooling towers.

| Stage | Scope | Status |
| --- | --- | --- |
| P0 | DEV `?meters=` + `window.cityMeters()`, `scripts/meter-diff.py` | done |
| P1 | Environment: promenade sails/pergolas, mist towers, roof sails/forest, facade louvres/planted bays | done |
| P2 | Automation: drones, pods, walker density, staffed pavilions | done; local/browser/feature CI passed |
| P3 | Sharing: floating decks as private pods vs open steps, water rooms | done; local/browser/feature CI passed |
| P4 | Concentration: glass towers with sky lobbies vs scattered pavilion pods | done; local/browser checks passed |
| P5 | Change-moment pulse in the Meter's colour | done; local/browser checks passed |
| P6 | Pipeline diagnostics, docs, draw-call measurement | per stage |

Readability gate: a low ↔ high change of one Meter alters ≥ 3 % of the 1920×929 hero frame (`scripts/meter-diff.py`), day and night. Exception (user, 2026-10-01): sharing accepted at ~1.6–1.9 % for a calmer shore (P3d).

## P0 + P1 implementation

- `src/devMeters.ts` (DEV only, tree-shaken from production): `?meters=nw:high,ne:low` (band → ±7.5 or a raw score) applies `deriveExhibitionLayout` from `survey/src/shared/cityView.ts` as a snapshot, without the survey server. `window.cityMeters('ne:high')` then applies a live (animated) update.
- `scripts/meter-diff.py a.png b.png [heat.png]`: share of pixels with any channel changed by > 24/255.
- `src/districtMeters.ts`: `SlotLevels` (per-slot 0..1 eased over the shared 3 s transition; reusable by P2–P4) and `EnvironmentDistrict`, owned by the NE site runtime (`BuiltSite.environmentDistrict`) and driven by `CityChangeManager.applyExhibitionLayout` from `plantedFraction`:
  - 17 promenade bays (every 24 m on both seaside promenades, clear of sites) on static white posts; each bay carries a white hypar sail or a planted pergola, with the canopy share = (plantedFraction − .2)/.6 in a fixed scattered order.
  - Mist-cooling towers (every third bay, landward) only below mixed.
  - Roof gardens (`plantRoofCanopy` now returns its clusters; `odaibaScene` publishes them via `publishRoofGardens`): each roof terrace gets a solar shade sail on posts or one large roof-forest crown, by the same share.
  - `facadeClimate` uniforms in the shared `curtainWall` shader: up to 60 % of bays become planted balconies (high) or white louvres (low); mixed keeps about 13 % of each.
  - Legacy v1 hides the layer and clears the facade uniforms; standalone (no `?survey`/`?meters`) never creates it.
- Draw cost: nine instanced meshes (six promenade + three roof batches) plus shadow passes; no new textures, assets or dependencies.

## Validation (2026-10-01, P0 + P1 working tree)

- Root `npm test` (including new `tests/districtMeters.test.ts` and district assertions on all 81 combinations in `surveyMeterPipeline`), `npm run build`, `git diff --check`: PASS. `survey/` and `module-swap/` unchanged.
- Headless Chrome 1920×929, `?hour=16&reviewTime=20&meters=ne:<band>`: low ↔ high **4.33 %** (was 0.16 %), low ↔ mixed 2.05 %, mixed ↔ high 2.60 %; night (`hour=21`) low ↔ high 4.34 %. Captures: [low](meter-variety-p1-env-low.jpg), [mixed](meter-variety-p1-env-mixed.jpg), [high](meter-variety-p1-env-high.jpg), [diff](meter-variety-p1-env-diff.jpg).
- Built-in browser: `window.cityMeters('ne:high')` from low eased sails/towers out and canopies/roof crowns in over 3 s (diagnostics mid-transition and after); 1115 draw calls with all four sites plus district layer in one dev sample (no before/after draw-call pair measured; pane frames are throttled while hidden). One console error seen came from a stale HMR module during editing; not reproduced after reload.
- Not verified: live `?survey` with the real server in a browser, real-GPU FPS, exhibition hardware, human art review.

## P2 — Automation (2026-10-01)

- Preflight: resumed `feat/meter-variety` at `8b21ae2`, clean; fetched origin successfully; task branch vs remote counterpart **0/0**; `origin/main` remained `33227a6` (task branch one commit ahead, no main-only commits). P0/P1 and the handoff are available remotely. No overlapping uncommitted modules or binary assets were present. No automatic main merge.
- `AutomationDistrict` in `src/districtMeters.ts` is owned by the NW built site. It derives `automation = automatedPorts / 6`; `automationActivity()` smoothsteps ports 1..5 across the three readable identities. Live targets use the shared 3 s `SlotLevels`; snapshot/reset/reduced motion settle immediately. The manager updates first, then passes its current scalar through `cityRig` to the existing `mobility` fleets in the same frame. No singleton actor state or server change.
- Human-led: **11 raised staffed pavilions**, 160 promenade walkers, 12 guideway pods and 2 circulating aircraft. Mixed: 3 pavilions, 100 walkers, 18 pods and 16 circulating aircraft. Autonomous: 0 district staffed pavilions, 40 walkers, 24 pods and 30 circulating aircraft; the existing hub, buildings and all infrastructure remain. The four sweep cars and one berth shuttle are separate and unchanged. Water fleets are unchanged.
- Pavilions use an ivory 38 × 54 m domed canopy over a 38 × 34 m terrace at 20 m, four grounded piers, canopy supports, lift shaft, service counter and six static staff figures. Six bays follow the existing promenades, clear of the lots/context block; five occupy traced open mall/waterfront approaches. Four shared-material instanced batches; no model binary, texture, dependency or render pass added. Staff/lifts are visual proxies; interior journeys and actor-to-actor avoidance are not simulated.
- Reuses the existing aerial/guideway/promenade paths. The autonomous loop fleet is evenly spaced at one speed; actors activate in a scattered phase order and expand from 22 to 31 m wingspan. Mint guides widen with automation and aircraft shells gain emission, retaining night readability. Legacy v1 hides pavilions and supplies no automation scalar; standalone/legacy fleet matrices, lighting and original poses are restored.
- Shared `SlotLevels` fix: unchanged targets no longer overwrite the interpolation origin or falsely retarget due to Float32 rounding. A runnable regression checks an unchanged fractional target mid-transition.

### P2 validation

- Root `npm test`, `npm run build`, working-tree `git diff --check`: PASS. Tests check actual fleet matrices at low/mixed/high independently of day mood; transitions, interruption, same targets, reset/legacy; 81 real server-answer combinations; actual GLB terrain/column locations and guideway/sweep/walker clearance. `survey/` and `module-swap/` sources unchanged. Existing root bundle-size warning remains.
- Readability gate: headless Chrome **154.0.8037.58**, 1920×929 CSS pixels, DPR 1, untouched hero, `?hour=16&reviewTime=20&meters=nw:<band>`; Q1 low ↔ high **3.98 %** (before P2: 0.35 %). Low ↔ mixed **2.35 %**, mixed ↔ high **1.85 %**. Night (`hour=21`) low ↔ high **3.17 %** (before P2: 0.17 %). Other axes remain at zero/mixed; no camera, post-processing or clock changes. Measurement uses the lossless PNGs and threshold >24/255 from `scripts/meter-diff.py`.
- Captures: [low](meter-variety-p2-auto-low.png), [mixed](meter-variety-p2-auto-mixed.png), [high](meter-variety-p2-auto-high.png), [night low](meter-variety-p2-auto-night-low.png), [night high](meter-variety-p2-auto-night-high.png). Reproduce the gate with `python3 scripts/meter-diff.py docs/handoffs/meter-variety-p2-auto-low.png docs/handoffs/meter-variety-p2-auto-high.png` (repeat with night pair).
- Same-condition draw submissions before → after P2: day low/mixed **1115 → 1131**, high **1131 → 1147**; night low/mixed **1121 → 1137**, high **1137 → 1153**. P2 adds four pavilion batches plus existing shadow/G-buffer passes (**+16** in the full pipeline); increasing actor pools adds no fleet batches. This is a draw-call comparison, not an FPS acceptance. Final capture console: existing favicon 404 only; no application/page/shader exceptions.
- Real HTTP/WebSocket browser smoke uses a fresh scratch SQLite: mixed snapshot → Q1-only +1 proposal → animated high (observed mid-transition) → same-ID retry → reload high → city reset → Q1-only −1 → low → night reload/reset → reduced-motion live high → standalone. Other three site variants stay mixed. Final full rerun PASS, no page exceptions; scratch DB retained at `/var/folders/st/ml4_0zfx7g129gh2305ynz5c0000gn/T/city2127-meter-p2-PF81Uw/survey.sqlite`. A prior rerun was interrupted when the reused Vite preview stopped; restarting loopback 5173 restored the check. No exhibition database was touched.
- Documentation: PROJECT records the controller/actor flow and counts; PLAN02/VALIDATION record this dated stage. README and AGENTS need no edit: startup, server API, guest UI and product constraints are unchanged.
- Not verified: controlled real-GPU FPS, Windows, exhibition endurance, human art acceptance, exact actor-to-actor avoidance or structural engineering. A pixel-change gate is a visibility measurement, not art acceptance.

### P2 Git / CI closure

- P2 implementation `d03efa7e7ec2afb871e9bbac82b278b940a4e2fa` pushed to `origin/feat/meter-variety`; [feature CI 36840452458](https://github.com/cc100053/city2127/actions/runs/36840452458) PASS (root, survey, module-swap and committed-diff whitespace). Self-review includes all source/tests/docs and five new lossless captures. `git diff --check origin/main...HEAD` passed.
- Latest fetched `origin/main` remains `33227a6`; no upstream-only work or task-branch divergence. No main integration: the existing capture-review-before-main condition remains. This closure is documentation only.

## P3 — Sharing (2026-10-01)

- Preflight: resumed `feat/meter-variety` at `6f2bd3563f881bfb505a0e7eba6e33485a9dcbdb`, clean; fetched origin successfully; task branch vs remote **0/0**. `origin/main` remained `33227a6` (three task commits, no main-only work). P0–P2 and the handoff are available remotely. Owner remains cc100053; this Codex session owns P3 source/captures, with no overlapping dirty modules/assets. No automatic upstream integration.
- `SharingDistrict` in `src/districtMeters.ts` is held by the SW built site. The manager applies `sharedSeats / 8`, updates it and hides it on legacy v1. `src/waterRooms.ts` shares the existing shore-island position/boat-exclusion calculation with `skyways`, without changing standalone island geometry. No server contract or actor route changes.
- **14 rooms**: eleven existing planted waterfall islands and three existing crescent/floating-deck rooms. Low (2 seats): 14 rose ceramic private garden pods; mixed (4): 10 private / 4 open; high (7): 14 open waterfront commons. Zero and endpoints remain fully developed. Private canopies are 28 m high, with a top oculus and landward entry; open rooms have three seating tiers expanding to 1.24× their rim radius. A warm rose rim remains in both modes. Existing gardens, waterfalls, plates and footbridges remain. The three deck rooms retain their authored elliptical footprint.
- Sharing smoothsteps seats 2..7 into a fixed scattered slot order. `SlotLevels` lowers the canopy and expands seating over 3 seconds; snapshots/reset/reduced motion settle immediately, retargeting preserves the current shape. Six instanced batches, three cloned shared finishes, no per-frame geometry, new texture/model/dependency/render pass. Architectural proxies: no occupancy, tide or structural simulation.

### P3 validation

- Root `npm test`, `npm run build`, working-tree `git diff --check`: PASS. Tests cover actual canopy matrices, same target / interruption / snapshot / legacy hide, all 81 real server-answer combinations and manager v2→legacy→v2 restore. Actual room meshes preserve both boat routes with ±6 m beams, pedestrian lanes with ±2.8 m width and their landward entrances at seats 0/4/8. `survey/` and `module-swap/` sources unchanged; existing root bundle-size warning remains.
- Readability: headless Chrome **154.0.8037.58**, 1920×929 CSS pixels, DPR 1, untouched hero, `?hour=16&reviewTime=20&meters=sw:<band>`; only Q2 differs. Low ↔ high **3.51%** (before P3 at `6f2bd35`: **0.07%**); low ↔ mixed **1.06%**, mixed ↔ high **2.64%**. Night (`hour=21`) low ↔ high **3.32%** (before **0.03%**). Both ≥3% gates pass. Lossless PNGs, any RGB channel changed by >24/255; no camera, clock, lighting or post-process adjustment.
- Captures: [low](meter-variety-p3-sharing-low.png), [mixed](meter-variety-p3-sharing-mixed.png), [high](meter-variety-p3-sharing-high.png), [night low](meter-variety-p3-sharing-night-low.png), [night high](meter-variety-p3-sharing-night-high.png). Reproduce with `python3 scripts/meter-diff.py docs/handoffs/meter-variety-p3-sharing-low.png docs/handoffs/meter-variety-p3-sharing-high.png` and the night pair.
- Same-condition full-pipeline draws before → after: day all three bands **1131 → 1155**; night **1137 → 1161**. Six new instanced batches plus existing shadow/G-buffer passes, **+24** submissions. This is a draw-call measurement, not an FPS/hardware acceptance.
- Browser verification found a completely flattened curved canopy could corrupt G-buffer normals and blacken the scene at high. Hidden matrices now keep a small nonzero scale; a determinant regression and fresh day/night captures verify the correction. Final capture console: existing favicon 404 only; no application/page/shader errors.
- Real HTTP/WebSocket browser smoke PASS with a fresh retained scratch SQLite: mixed snapshot → Q2-only +1 → observed animated high → same-ID retry → reload high → reset → Q2-only −1 → low → night reload/reset → reduced-motion immediate high → standalone. Other three sites stay mixed; no page exceptions. Scratch DB: `/var/folders/st/ml4_0zfx7g129gh2305ynz5c0000gn/T/city2127-meter-p3-JwCl5g/survey.sqlite`; exhibition DB untouched.
- PROJECT records SW ownership, shared island positions and runtime behavior; PLAN02/VALIDATION record this stage. README/AGENTS need no edit because startup, UI, server contract and project constraints are unchanged. Not verified: human art acceptance, Windows, controlled real-GPU FPS, exhibition endurance, occupancy/structural engineering. Pixel readability does not establish those.

### P3 Git / CI closure

- P3 implementation `30db2043e76f6e2541b4aaf92becaec6afa828c3` and whitespace correction `357b91784910d1bdc4411659ab8b8acdd99c13b6` pushed to `origin/feat/meter-variety`. The initial new file had an extra blank line at EOF (the first CI run 36844973965 failed its whitespace step); it was corrected without rewriting pushed history. Final committed task diff `git diff --check origin/main...HEAD` PASS.
- [Feature CI 36845024909](https://github.com/cc100053/city2127/actions/runs/36845024909) PASS on `357b917`: root, survey, module-swap and committed-diff whitespace. All P3 source/tests/docs, the new shared placement file and five lossless captures were self-reviewed; local Markdown targets passed.
- Independent temporary Node comparison against `6f2bd35` confirmed every merged `skyways` geometry attribute, material property and shadow flag is unchanged byte-for-byte in standalone. This supplements the browser standalone smoke; no temporary comparison module is shipped.
- Latest fetched `origin/main` remains `33227a6`; task branch has no divergence or upstream-only work. No main integration under the existing capture-review condition. This closure changes documentation only; next scope remains P4.

## P4 — Concentration (2026-10-01)

- Preflight: resumed `feat/meter-variety` at `73d3dda`, clean; fetch succeeded; branch 0/0 with its remote; `origin/main` still `33227a6`. P2/P3 (Codex) were already pushed with passing CI; no overlapping dirty modules. No upstream integration.
- Design change from the plan: the district has only one large flat context roof (raycast survey of `CTX_*` roofs), so "context tower crowns" became new towers on traced open ground. Candidate sites came from a grid scan with the same checks the test now runs, plus a hero-pose visibility pass and a browser check against live skyway triangles; four first-choice towers that hit skyways, two that hit context massing and one that hid the SE site were replaced.
- `ConcentrationDistrict` (`src/districtMeters.ts`, held by the SE built site): 10 towers `[x, z, h]` with podium, tapered sky-blue glass shaft, ivory floor bands, two planted/lit sky lobbies, planted crown and spire; 6 sky bridges between towers within 80 m at both lobby levels of the lower tower (they grow with the lower of the two towers); 26 pods. `share = smoothstep((functionModules − 2)/4, .3, .75)` in golden-ratio order (a hash rank clustered with only ten towers): 3 / 4 / 5 modules → 0 / 5 / 10 towers, 26 / 15 / 0 pods. Towers keep footprint 1 and rise in height; hidden ones keep an invertible tiny scale.
- Tower glass uses its own shader hook: 4.2 m storeys, about half the rooms lit, strength `towerGlow` (.3 by day → 1.2 at night via `updateOdaiba`). Without it the towers read grey at night (night gate 2.66 %).
- Nine instanced batches (tower: trim / glass / leaf / lobby light; pod: trim / lobby / leaf; bridge: trim / lobby). No new textures, models, dependencies, render passes or server rules. Architectural proxies only: no interior, structure or occupancy simulation.

### P4 validation

- Root `npm test`, `npm run build`, `git diff --check`: PASS. New unit checks in `tests/districtMeters.test.ts`; actual-mesh placement/route/site-visibility checks in `tests/odaiba.test.ts` (with a `PROBE_CONCENTRATION` dev aid that prints the first problem for candidate sites); district assertions on all 81 combinations and the legacy hide in `surveyMeterPipeline`. `survey/` and `module-swap/` unchanged.
- Readability (headless Chrome, 1920×929, DPR 1, untouched hero, `?hour=16|21&reviewTime=20&meters=se:<band>`, other axes mixed): low ↔ high **4.47 %** day (before P4 at `73d3dda`: 0.38 %), **3.81 %** night (before 0.29 %); day low ↔ mixed 2.69 %, mixed ↔ high 2.39 %; night 2.29 % / 1.87 %. Lossless captures: [low](meter-variety-p4-concentration-low.png), [mixed](meter-variety-p4-concentration-mixed.png), [high](meter-variety-p4-concentration-high.png), [night low](meter-variety-p4-concentration-night-low.png), [night high](meter-variety-p4-concentration-night-high.png). Reproduce with `python3 scripts/meter-diff.py docs/handoffs/meter-variety-p4-concentration-low.png docs/handoffs/meter-variety-p4-concentration-high.png` and the night pair.
- Same-condition full-pipeline draws (`data-draw-calls` via DevTools protocol, before = `73d3dda` worktree): day low 1175 → 1211, high 1195 → 1231; night low 1181 → 1217, high 1201 → 1237 (**+36**). Draw-call comparison only, not an FPS acceptance.
- Built-in browser: `cityMeters('se:high')` from low converged to 10 towers / 0 pods; no console errors. Skyway clearance against the live skyway triangles: 0 conflicts for the final towers, lobbies, bridges and pods.
- Not verified: real HTTP/WebSocket browser smoke for P4 (server → client → model is covered by the 81-combination pipeline test), human art review (towers read partly as banded cylinders; the low pods are modest in the hero frame), Windows, real-GPU FPS, exhibition endurance.

## P5 — Change-moment pulse (2026-10-01)

- Preflight: resumed `feat/meter-variety` at `7ffb43c`, clean, 0/0 with its remote; `origin/main` still `33227a6`. P4 [feature CI 36852613307](https://github.com/cc100053/city2127/actions/runs/36852613307) passed on `7ffb43c` (root, survey, module-swap, committed whitespace). No upstream integration.
- `METER_COLORS` follows each district's visual language: automation blue `#3fa9ff` (the `trail` lines), sharing rose `#ff6f91` (water-room rims), environment green `#5fe08a`, concentration amber `#ffb347` (lobby light). No per-axis colour existed in the UI to reuse.
- `PulseRings` per district: an additive unlit ring (expands .6 → 2.2 × radius) and a vertically fading shaft (height 40 m + 2 × radius), two waves 1.2 s apart, 3 s each. Emitted from `setTarget` only when targets changed and the change is not `immediate`; the manager already passes `immediate` for snapshots, resets and reduced motion, so `CityChangeManager` needed no change. Points: the district's site anchor plus each changed slot (`SlotLevels.changed`) — environment bays, mist towers and roof terraces; staffed pavilions; water rooms; towers and pods. Automation's fleet changes have no slot positions, so its hub anchors the pulse.
- Pulses are additive overlays: shared city finishes (trim, leaf, curtain walls) never flash. Batches are named `meter-pulse`; `main.ts` hides them during GTAO's normal prepass like the boat wakes. Idle batches have `count = 0`. Capacity is two waves of every slot (environment allows ~90 roof terraces; `ponytail:` notes the overflow behaviour).
- DEV capture aid: `&metersTo=<sites>&metersAge=<s>` applies a live change that started `s` seconds earlier; the DEV hook now waits for the first frame so `now` already holds the held `reviewTime`.

### P5 validation

- Root `npm test`, `npm run build`, `git diff --check`: PASS. P5 unit block covers all four districts (snapshot no pulse, live pulse with site + changed slots, second wave, fade, unchanged target, legacy clear, GTAO-excluded batch names).
- Captures (real-time headless Chrome via DevTools protocol, 1920×929, `hour=16&reviewTime=20&meters=<site>:low&metersTo=<site>:high&metersAge=0.7`; each capture waits until the DEV hook has applied): [NW automation](meter-variety-p5-pulse-nw.png), [NE environment](meter-variety-p5-pulse-ne.png), [SW sharing](meter-variety-p5-pulse-sw.png), [SE concentration](meter-variety-p5-pulse-se.png), [NE at 21:00](meter-variety-p5-pulse-ne-night.png). Difference to the settled high frame 4.83 / 5.92 / 5.19 / 5.16 % (includes the transition itself); SE at 4.6 s matches settled within 0.09 %.
- Draw submissions (DevTools protocol): idle SE low / high 1211 / 1231, identical to P4; 1347 mid-change.
- Capture-tool finding: in zsh, `"$m:low"` / `"$m:high"` expand through the `:l` / `:h` history modifiers (`nwow`, `.igh`), so ad-hoc loops silently loaded standalone frames. P5 captures use `${m}` plus a readiness gate. P1 used `ne:$b`, P4 `se:$b` (literal prefixes), so their recorded numbers are unaffected; `--virtual-time-budget` captures were also not used for P5.
- Not verified: real HTTP/WebSocket browser smoke for P5 (live path covered by unit tests and the DEV live hook), human review of pulse strength/colour/timing, Windows, real-GPU FPS, exhibition hardware.

## P3b — Sharing pod polish (2026-10-01)

- User review of a hero frame: the low-sharing private pods read as skin-toned blobs. Cause: a 28 m fixed height over 14–19 m radii (an egg), `#d5b7aa` / `#b98274` emissive in the skin range, a smooth opaque shell hiding the garden, plus rose pulse shafts on top. A minimal ivory / hemispherical retint passed visually but fell to 2.43 % day / 2.29 % night, so the user chose the gridshell route.
- `SharingDistrict` private vault: frosted pearl glass (`glass` clone, opacity .62, no depth write, no shadow), 17 glowing rose meridian ribs (the sharing colour) and three ivory ring beams (oculus, mid, haunch) as two merged-tube instanced batches; spread 1.3 × room radius, rise = radius (`PRIVATE_RISE`), about 14–19 m. Open steps widen to 1.38 × radius (was 1.24). Behaviour, slot order, pulses, transitions and the server contract are unchanged.
- Root `npm test`, `npm run build`, `git diff --check`: PASS (boat beams, walker lanes and landward entrances recheck the wider steps and vault). `survey/` and `module-swap/` unchanged.
- Readability (headless Chrome, 1920×929, `?hour=16|21&reviewTime=20&meters=sw:<band>`, repeat-capture noise 0.02 %): low ↔ high **3.26 %** day, **3.03 %** night (thin margin); low ↔ mixed 0.97 %, mixed ↔ high 2.40 %. Captures: [low](meter-variety-p3b-gridshell-low.png), [mixed](meter-variety-p3b-gridshell-mixed.png), [high](meter-variety-p3b-gridshell-high.png), [night low](meter-variety-p3b-gridshell-night-low.png), [night high](meter-variety-p3b-gridshell-night-high.png). A `metersTo=sw:high&metersAge=1.5` capture showed vaults lowering and steps widening under the pulse.
- +2 instanced batches (plus their shadow / G-buffer passes); draw calls not re-measured. Not verified: human art acceptance, real-GPU FPS, Windows.

## P3c — Fewer, calmer vaults and halo commons (2026-10-01)

- User review of P3b: rose ribs too loud, too many vaults and ribs; wanted a second open-commons design for high sharing.
- Every other room (`vaulted`, 7 of 14) carries the glass vault; the other seven stay open planted islands while private. Vault: 9 ivory meridian ribs + 3 ring beams in one `trim` batch, spread 1.45 × radius, rise 1.15 × radius (`PRIVATE_RISE`); rose only on the base rim and oculus.
- High sharing alternates: vaulted rooms open into the stepped seating; the others gain a **halo canopy** — an open annular roof (0.5–1.38 × radius at 0.42 × radius ≈ 6–8 m) on seven slim columns clear of the landward gap, planted on top, with a warm edge light and a lit boardwalk ring beneath. The boardwalk's emission follows `towerGlow` (0.2 by day → 2.0 at night).
- Gate history while tuning: halving the vaults cost readability (2.39 % day); larger halo/vault footprints recovered the day gate, but night stayed ≈ 2.8 % until the user chose night lighting for the commons (option 3).
- Root `npm test` (new checks: 7 vaults, glass only on vaulted rooms, steps / halos alternate when open), `npm run build`, `git diff --check`: PASS; boat beams, walker lanes and landward entrances recheck the new halos.
- Readability (same conditions as P3b, repeat noise 0.02 %): low ↔ high **3.30 %** day, **3.84 %** night; low ↔ mixed 0.90 %, mixed ↔ high 2.48 %. Captures: [low](meter-variety-p3c-sharing-low.png), [mixed](meter-variety-p3c-sharing-mixed.png), [high](meter-variety-p3c-sharing-high.png), [night low](meter-variety-p3c-sharing-night-low.png), [night high](meter-variety-p3c-sharing-night-high.png). P3b captures remain as history.
- Batches vs P3b: rib + beam merged (−1), four halo batches (+4); draw calls not re-measured. Not verified: human art acceptance, real-GPU FPS, Windows.

## P3d — Calmer shore and inland sharing courts (2026-10-01)

- User review of P3c: too many waterfront structures; keep three glass vaults and three garden islands. The user also removed the three floating decks (and their `amphibiousShore` crescents) from the venue, standalone included.
- `waterRooms.ts` keeps six evenly spread shore islands (`ROOMS`); `floatingDecks`, `amphibiousShore()` and the deck plates in `odaiba2127.ts` are deleted; `tidalEdge` now runs continuously past the former deck site. Sharing rooms 0/2/4 carry vaults (steps when open), 1/3/5 stay garden islands (halo canopies when open).
- Six rooms halved the change: 1.37 % day / 1.47 % night. A sky-gallery carrier on the plain skyway links (glazed galleries vs sky parks) added only 0.17 % and was discarded. The user chose inland courts: ten 40 m `COURT_SITES` from a scan (`SCAN_COURTS=20`) of open ground clear of context, routes, P2 pavilions and P4 towers / pods, centre visible from the hero pose. Private: 2.4 m ivory walls with an entrance gap, a glass garden room, six crowns; open: pale paving and three white funnel parasols about 10 m up. Courts add about 0.3 %: most inland ground is occluded by landmarks from the hero pose; a 2× bolder court only reached 1.72 %.
- **User decision (2026-10-01): sharing is accepted below the 3 % gate** in exchange for a calmer shore.
- Root `npm test` (new: court ground / clearance / route / site-visibility checks in both identities; six rooms, three vaults), `npm run build`, `git diff --check`: PASS.
- Readability (same conditions, only Q2 changes): low ↔ high **1.63 %** day, **1.85 %** night; low ↔ mixed 0.91 %, mixed ↔ high 0.77 %. Captures: [low](meter-variety-p3d-sharing-low.png), [mixed](meter-variety-p3d-sharing-mixed.png), [high](meter-variety-p3d-sharing-high.png), [night low](meter-variety-p3d-sharing-night-low.png), [night high](meter-variety-p3d-sharing-night-high.png), [standalone](meter-variety-p3d-sharing-standalone.png).
- Batches: +5 court batches; the deck plates / crescents merged meshes are gone. Draw calls not re-measured. Not verified: close-up court review (hero only), human art acceptance, real-GPU FPS, Windows.

## P7 — Weak spots (2026-10-01)

- Preflight: resumed `feat/meter-variety` at `18da54a`, clean; fetch succeeded; branch 0/0 with its remote; `origin/main` still `33227a6`. Owner cc100053 (Claude Code session); no overlapping dirty modules or assets. The user asked to "do p7"; P8–P12 remain proposals.
- **Automation** (`AutomationDistrict`): every bay now carries an autonomous counterpart that rises as its staffed pavilion folds away on the same `SlotLevels` — a slate mast lifting a 31 m landing deck at `PORT_DECK` = 46 m (above the 42 m pavilion dome), blue `trail` apron rings, a ringed charging spire to 64 m and three parked drones. High therefore reads as 11 drone ports, not empty ground; mixed bays are each staffed or autonomous. Diagnostics add `visibleDronePorts`. +4 instanced batches (slate / trim / trail / glass).
- **Concentration** (`ConcentrationDistrict`): the single banded cylinder is replaced by three silhouette families by slot (`i % 3`, 4 / 3 / 3 towers): a twisted shaft (18 square storeys turning 100°, two sky lobbies), a terraced setback tower (three stepped tiers with planted, lit terraces at the .4 / .72 lobby levels) and linked twin shafts (unequal heights joined by lit links at both levels). All keep the podium footprint, `towerGlow` glass and bridge levels. Pods became two-tier (stacked lit drums under two ivory discs, about 15 m tall, 24 m across). Five pods moved (≤ 15 m) where the wider discs met tree crowns or overhung the guideway: `[-218,-23]`, `[-183,-43]`, `[-168,-128]`, `[7,-58]`, `[252,147]`. Deviation: "pod clusters" became larger two-tier pods; a multi-pod cluster would not fit the traced open ground. Tower batches 4 → 12.
- **Sharing**: `tests/odaiba.test.ts` now estimates each court's visible ground pixels in the 1920 × 929 hero frame (9 × 9 sample rays weighted by projected area) instead of one centre ray, asserts ≥ 600 px per court, and `SCAN_COURTS=20` lists candidates best first. The three most hidden courts (485 / 542 / 654 px) moved to `[50,-340]`, `[170,-360]`, `[-460,290]` (2545 / 1938 / 1434 px); total visible court ground 10.7k → 14.8k px.

### P7 validation

- Root `npm test` (new: drone ports 0 / all / complementary at low / high / mixed and full-size matrix; three tower families of 4 / 3 / 3; pod clearance at 9 m and 13 m; court pixel floor), `npm run build`, `git diff --check`: PASS. `survey/` and `module-swap/` unchanged.
- Readability (headless Chrome via DevTools protocol, 1920 × 929, DPR 1, untouched hero, `?hour=16|21&reviewTime=20&meters=<site>:<band>`, readiness gate on DEV hook + loaded fonts, repeat noise 0.05 %), before at `18da54a` → after:

| Meter | Day low ↔ high | Night low ↔ high | Day low ↔ mixed / mixed ↔ high |
| --- | --- | --- | --- |
| Automation (NW) | 3.77 → **4.02 %** | 3.11 → **3.58 %** | 2.21 / 1.78 → 2.42 / 1.88 % |
| Sharing (SW) | 1.63 → **1.89 %** | 1.85 → **2.10 %** | 0.91 / 0.78 → 1.12 / 0.82 % |
| Concentration (SE) | 4.49 → **4.04 %** | 3.81 → **3.42 %** | 2.72 / 2.39 → 2.45 / 2.19 % |

  All gates pass (automation / concentration ≥ 3 %, sharing no regression below 1.6 %). Concentration dropped about 0.4 % because the twisted and twin silhouettes are slimmer than the old 23 m lobby discs; it stays above the gate. The NW day "before" (3.77 %) is lower than P2's 3.98 % because later stages share the frame.
- Captures: automation [low](meter-variety-p7-auto-low.png) / [mixed](meter-variety-p7-auto-mixed.png) / [high](meter-variety-p7-auto-high.png) / [night low](meter-variety-p7-auto-night-low.png) / [night high](meter-variety-p7-auto-night-high.png); sharing [low](meter-variety-p7-sharing-low.png) / [mixed](meter-variety-p7-sharing-mixed.png) / [high](meter-variety-p7-sharing-high.png) / [night low](meter-variety-p7-sharing-night-low.png) / [night high](meter-variety-p7-sharing-night-high.png); concentration [low](meter-variety-p7-concentration-low.png) / [mixed](meter-variety-p7-concentration-mixed.png) / [high](meter-variety-p7-concentration-high.png) / [night low](meter-variety-p7-concentration-night-low.png) / [night high](meter-variety-p7-concentration-night-high.png). Before captures were not committed (they match the P2 / P3d / P4 forms).
- Same-condition draw submissions (`data-draw-calls`): all-mixed day 1204 → 1252, NW high 1220 → 1268, SE low / high 1224 / 1244 → 1272 / 1292 (**+48**: 4 port + 8 extra tower batches with their shadow / G-buffer passes). Draw-call comparison only, not an FPS acceptance.
- Not verified: skyway clearance of the new tower silhouettes in the browser (footprints stay inside the checked 24 m reach; the new pod sites were not rechecked against skyways), real HTTP/WebSocket smoke for P7, human art review, Windows, real-GPU FPS.

## P8 — Design families (2026-10-01)

- Preflight: resumed `feat/meter-variety` at `9ba4292` (P7), clean, 0/0 with its remote; `origin/main` still `33227a6`. The user asked for "p8" without choosing variants, so the proposal's examples were used where they fit the hero view.
- `designOf(i, salt, n)` in `src/districtMeters.ts` gives each slot a fixed family (a 7.31 stride breaks the long runs neighbouring slots give `rank`; the salt decorrelates carriers). Switching order, transitions, pulses and the server contract are unchanged; each slot draws only its own design and the others keep an invertible tiny scale.

| Carrier | Low / private / staffed | High / open / autonomous |
| --- | --- | --- |
| Environment promenade bays (17) | hypar sail / solar louvre roof (six slate slats) | planted pergola / green screen (planted edge wall with a half-width planted canopy, clear of the walker lanes) |
| Environment roofs | solar sail / photovoltaic pergola | roof-forest crown / stepped meadow terraces |
| Environment mist towers | slender shaft / squat cooling drum (same batch, scaled) | — |
| Automation bays (11) | domed hall / stacked-deck hall (terraces at 20 m and 28.5 m, flat lit roof at 37 m, staff on both bars) | drone port / charging mast (72 m, three cantilevered docks with lit rings and drones) |
| Sharing courts (10) | walled garden / glass winter garden (30 × 24 × 6.5 m on seven portal frames, crowns inside) | parasol plaza / long-table pergola (34 m planted pergola over two shared tables) |
| Concentration pods (26) | two-tier pod / garden ring pavilion (lit glass ring, planted roof, courtyard tree) | towers keep the P7 three families |
| Sharing water rooms (6) | already vault / garden island | already steps / halo |

- Sight lines found by `tests/odaiba.test.ts`: a 9 m winter garden on court 0 hid PARK, so the glass house is 6.5 m; a pergola roof on court 2 hid COMMONS PLAZA, so the open-court salt (1052) keeps parasols there. The stacked-deck hall's first draft had a 12 m terrace over the guideway; it now starts at the domed hall's 20 m.
- New check (`tests/districtMeters.test.ts`): every carrier above uses ≥ 2 families, and at high automation each bay's matrices draw only its own autonomous design.

### P8 validation

- Root `npm test`, `npm run build`, `git diff --check`: PASS. `survey/` and `module-swap/` unchanged.
- Readability (same capture conditions as P7, repeat noise 0.05 %), before at `9ba4292` → after, low ↔ high day / night: environment 3.93 / 3.96 → **4.09 / 4.05 %**, automation 4.02 / 3.58 → **4.03 / 3.51 %**, sharing 1.89 / 2.10 → **1.86 / 2.10 %**, concentration 4.04 / 3.42 → **4.07 / 3.42 %**. Gate unchanged and met (sharing stays above its 1.6 % floor). Environment's 3.93 % before is below P1's 4.33 % because later stages share the frame.
- Captures: environment [low](meter-variety-p8-env-low.png) / [mixed](meter-variety-p8-env-mixed.png) / [high](meter-variety-p8-env-high.png) / [night low](meter-variety-p8-env-night-low.png) / [night high](meter-variety-p8-env-night-high.png); automation [low](meter-variety-p8-auto-low.png) / [mixed](meter-variety-p8-auto-mixed.png) / [high](meter-variety-p8-auto-high.png) / [night low](meter-variety-p8-auto-night-low.png) / [night high](meter-variety-p8-auto-night-high.png); sharing [low](meter-variety-p8-sharing-low.png) / [mixed](meter-variety-p8-sharing-mixed.png) / [high](meter-variety-p8-sharing-high.png) / [night low](meter-variety-p8-sharing-night-low.png) / [night high](meter-variety-p8-sharing-night-high.png); concentration [low](meter-variety-p8-concentration-low.png) / [mixed](meter-variety-p8-concentration-mixed.png) / [high](meter-variety-p8-concentration-high.png) / [night low](meter-variety-p8-concentration-night-low.png) / [night high](meter-variety-p8-concentration-night-high.png).
- Draw submissions (`data-draw-calls`, all-mixed day): 1252 → **1337** (+85; 17 new instanced batches with their shadow / G-buffer passes). This is the largest single-stage increase; merging same-material variant batches is the upgrade path if real-GPU FPS needs it. Not an FPS acceptance.
- Not verified: browser skyway clearance of the charging masts (72 m, at bays already clear of skyways) and stacked-deck halls, close-up review of the new designs (hero only), human art review, real HTTP/WebSocket smoke, Windows, real-GPU FPS.

## P9 — Mixed identity (2026-10-02)

- Preflight: resumed `feat/meter-variety` at `b3923b6` (P8), clean, 0/0 with its remote; `origin/main` still `33227a6`.
- `hybridShare(t) = .6 × max(0, 1 − |t − .5| / .25)`: hybrids peak at 60 % of slots at mixed (axis position .5) and are zero at every low / high band (positions ≤ .25 / ≥ .75 for all four Meters). Each carrier has one extra `SlotLevels` on the shared 3 s clock; changed hybrid slots pulse like other changes. A hybrid mostly composes the two endpoint designs on the same slot:
  - Automation: a 60 % staffed kiosk under the bay's drone port / charging mast (`hybridBays`).
  - Sharing: half-open rooms — vaulted rooms keep the vault at half height over the open steps; garden islands get the steps instead of the halo. Shared garden courts compose walls, crowns, paving and parasols (`hybridRooms`, `hybridCourts`).
  - Concentration: hybrid tower sites without a full tower stand as 45 % mid-rises in their P7 family; bridges only span between towers above half height (`midRises`).
  - Environment: bays keep their planted cover with the low design lifted 1.2 m above it (greenery through sails / louvres); roofs keep sail / PV over forest / meadow (`hybridBays`, `hybridRoofs`).
- Tuning: full-size halls made mixed automation look like low (low ↔ mixed 1.36 %), so the kiosk is 60 %; halo-only hybrids on garden islands matched high, so they show steps.
- New check (`tests/districtMeters.test.ts`): no hybrids at any low / high band, hybrids on every Meter at mixed (6 automation bays / 8 sharing rooms + courts / 2 mid-rises / 12 environment bays), a hybrid bay draws its kiosk at 60 % and its autonomous design at full size, and a mid-rise stands at 45 % height.

### P9 validation

- Root `npm test`, `npm run build`, `git diff --check`: PASS. `survey/` and `module-swap/` unchanged.
- Low ↔ mixed / mixed ↔ high (gate ≥ 1.5 % each), before at `b3923b6` → after, day | night:

| Meter | Day | Night | Low ↔ high day / night |
| --- | --- | --- | --- |
| Environment | 1.91 / 2.48 → **2.20 / 2.49 %** | 1.97 / 2.42 → **2.16 / 2.42 %** | 4.07 / 4.01 % |
| Automation | 2.39 / 1.86 → **2.27 / 2.23 %** | 2.17 / 1.61 → **2.11 / 1.96 %** | 4.01 / 3.50 % |
| Sharing | 1.11 / 0.81 → **1.11 / 1.26 %** | 1.26 / 0.86 → **1.12 / 1.42 %** | 1.87 / 2.10 % |
| Concentration | 2.44 / 2.21 → **2.73 / 2.01 %** | 2.01 / 1.83 → **2.27 / 1.64 %** | 4.04 / 3.41 % |

  Environment, automation and concentration pass. **Sharing does not** (accepted by the user on 2026-10-02, like its 3 % exception): its whole low ↔ high change is 1.87 % day, so both halves ≥ 1.5 % would need mixed to differ from each end by about 80 % of the total; composed hybrids of the same small shore / court elements raise the weaker half (0.81 → 1.11 %) but cannot reach it. **User decision (2026-10-02): accepted.** Low ↔ high values move slightly because the other three Meters sit at mixed in every frame and now show their hybrids.
- Captures: environment [low](meter-variety-p9-env-low.png) / [mixed](meter-variety-p9-env-mixed.png) / [high](meter-variety-p9-env-high.png) / [night low](meter-variety-p9-env-night-low.png) / [night mixed](meter-variety-p9-env-night-mixed.png) / [night high](meter-variety-p9-env-night-high.png); automation [low](meter-variety-p9-auto-low.png) / [mixed](meter-variety-p9-auto-mixed.png) / [high](meter-variety-p9-auto-high.png) / [night low](meter-variety-p9-auto-night-low.png) / [night mixed](meter-variety-p9-auto-night-mixed.png) / [night high](meter-variety-p9-auto-night-high.png); sharing [low](meter-variety-p9-sharing-low.png) / [mixed](meter-variety-p9-sharing-mixed.png) / [high](meter-variety-p9-sharing-high.png) / [night low](meter-variety-p9-sharing-night-low.png) / [night mixed](meter-variety-p9-sharing-night-mixed.png) / [night high](meter-variety-p9-sharing-night-high.png); concentration [low](meter-variety-p9-concentration-low.png) / [mixed](meter-variety-p9-concentration-mixed.png) / [high](meter-variety-p9-concentration-high.png) / [night low](meter-variety-p9-concentration-night-low.png) / [night mixed](meter-variety-p9-concentration-night-mixed.png) / [night high](meter-variety-p9-concentration-night-high.png).
- Draw submissions: unchanged at 1337 (all-mixed day) — hybrids reuse existing batches.
- Not verified: browser skyway clearance (no new geometry footprints), close-up review, human art review, real HTTP/WebSocket smoke, Windows, real-GPU FPS.

## P10 — Cross-Meter combinations (2026-10-02)

- Preflight: resumed `feat/meter-variety` at `7ae1d57` (P9), clean, 0/0 with its remote; `origin/main` still `33227a6`. User decision recorded first: sharing below the P9 mixed gate is accepted.
- The manager already passes the whole layout to every district, so each pairing lives in the district that owns its carrier and reads the partner axis (`PairingAxes`; absent axes read as mixed). `agree(a, b, side)` is true when both axis positions are ≥ .7 (high) or ≤ .3 (low); every first low / high proposal clears these, mixed never does. Each extra has its own `SlotLevels` on the shared 3 s clock, pulses where it changes, and its batches are invisible (no draw submissions) while inactive.

| Pairing | Extra | Owner |
| --- | --- | --- |
| Sharing + automation high | drone kiosk (12 m mast, lit landing disc, docked drone) in a corner of each open court | `SharingDistrict` |
| Sharing + environment high | blossom orchard (six white / pink / green crowns) around each open court | `SharingDistrict` |
| Concentration + environment high | vertical-forest crowns on each tower roof and three at the lower lobby edge | `ConcentrationDistrict` |
| Concentration + automation high | drone dock ring (radius 26 m, lit blue) with two drones at each tower's upper lobby | `ConcentrationDistrict` |
| Concentration + environment low | solar canopy (22 m slate disc) above each pod / ring pavilion | `ConcentrationDistrict` |

- Extras ride only full towers / open courts / visible pods. The placement test found a swapped y / z argument in the forest crowns (crowns placed over a walker route); fixed before capture.

### P10 validation

- Root `npm test`, `npm run build`, `git diff --check`: PASS. `tests/surveyMeterPipeline.test.ts` now asserts, for all 81 real answer combinations, that each extra shows on every slot exactly when its two bands agree and on none otherwise, and that all five pairings occur. `tests/odaiba.test.ts` checks dock rings (27.5 m reach at the upper lobby) and court kiosks (21.5 m at 12.5 m) against existing geometry, and reruns route / site-visibility checks with the pairings shown at both ends. `survey/` and `module-swap/` unchanged.
- Captures (1920 × 929, same conditions as P7): [kiosks](meter-variety-p10-kiosk.png) (`sw:high,nw:high`), [orchards](meter-variety-p10-orchard.png) (`sw:high,ne:high`), [vertical forest](meter-variety-p10-forest.png) (`se:high,ne:high`), [drone docks at 21:00](meter-variety-p10-docks.png) (`se:high,nw:high`), [solar pods](meter-variety-p10-solar.png) (`se:low,ne:low`). Each differs from the same frame with the partner at mixed by 2.2–2.7 %, which includes the partner Meter's own change, so it is not an isolated measure of the extra.
- Single-Meter gates are unaffected: their frames keep the other axes at mixed, where no pairing shows (all-mixed draw submissions unchanged at 1337). Draws with a pairing active: +4 to +28 (e.g. kiosks 1365 vs 1337, docks 1407 vs 1383 at night).
- Not verified: browser skyway clearance of the dock rings, close-up review, human art review (forest crowns are modest at hero distance), real HTTP/WebSocket smoke beyond the pipeline test, Windows, real-GPU FPS.

## P11 — Path dependence (2026-10-02)

- Owner: cc100053; implementation in this task: Codex. User request `do docs/handoffs/meter-variety.md p11` authorizes the history contract use. Resumed `feat/meter-variety` at `261e036c26cb1fca62c7a3c3487d5b6122fd28c3`, clean; fetch succeeded, branch vs remote 0/0, vs `origin/main` (`33227a6`) 16/0. P0–P10 are available remotely; no overlapping local module / asset changes. Keep the existing capture-review-before-main restriction.
- `viewOf` sends four uint32 `slotSeeds` on v2 CityView. `runProposalSlotSeeds` streams every active-run proposal in sequence order, hashes each axis' nonzero votes (`Math.imul(seed ^ (vote + 2), 16777619) >>> 0`), and ignores IDs, times and other axes. Full history is used even though the feedback band stays at 64. Seeds are derived from existing append-only SQLite events, so restart / replay need no migration or additional persistence. Empty / all-neutral histories use zero. The deliberate O(guests) view scan is marked `ponytail:`; incremental persisted hashes are deferred until cost is measured.
- Root validates the optional field (exact four axes, integers 0..2³²−1, zero for an empty run), accepts older servers without it using the original fixed order, and passes it through `main` → manager → the four districts. `SlotLevels` shuffles the old selection ranks with an integer Fisher–Yates permutation; the same seed restores the same slot targets, preserving selection counts and sail/canopy complements. Fixed design families, footprints, site parameters, actor counts, pairings, lighting and camera are unchanged. Roofs published later adopt the remembered environment seed.
- Each directional proposal can retarget the axis' slot pattern, including at equal layout values; it does not enforce monotonic building growth. Live retargets retain the current transforms and use the existing 3 s ease / pulses. Snapshot/reset/reduced motion are immediate and clear old pulses. Fully saturated carriers can look identical across histories; path dependence reads where a carrier has a mix of slots. A 32-bit seed does not promise a unique city for every possible history.
- Compatibility: older root clients reject the added field under their strict parser. Update/restart survey and refresh root together; new root supports both seeded and unseeded v2. v1 and module-swap behavior is unchanged.

### P11 validation

- Source commit `ab6a3a165ff6c5448699661c23f7e23d59c0372c` is pushed to `origin/feat/meter-variety`; [CI run 36886838863](https://github.com/cc100053/city2127/actions/runs/36886838863) PASS (Node 24, root/survey/module-swap install/test/build and whitespace). This closure changes documentation only. P11 implementation and verification are complete; branch integration remains blocked on the existing human capture review, with P12 unimplemented.
- Root and `survey/` `npm test`, `npm run build`: PASS; existing root chunk-size warning only. Tests requiring localhost sockets initially hit sandbox `EPERM`; authorized elevated reruns passed. `module-swap/` source unchanged. Whitespace and local Markdown links checked before commit.
- `surveyMeterPipeline` checks two real 142-proposal histories: `+1,−1` vs `−1,+1`, followed by the same 140 alternating votes on all axes. The final scores are **exactly equal**, layouts and latest 64 votes match, but full-history seeds and actual instance transforms differ in **all four districts**. Live → serialized snapshot, same-ID retries, reset / old retry after reset, interrupted snapshot with zero lingering pulses, and full replay with fresh run / session / submission IDs restore exact transforms. P10 assertions now also cover non-extreme carriers and use the actual .7/.3 thresholds rather than assuming every high band is saturated.
- Small checks cover seeded count preservation / complementary covers / same target / smooth retarget, late roof publication, malformed and missing uint32 seeds, old-server compatibility, and actual SQLite server restart restoring the whole seeded view.
- Headless Chrome **154.0.8037.58**, 1920×929 CSS, DPR 1, original hero, held `reviewTime=20`, 16:00 / 21:00, actual GLBs and fonts ready. Two real HTTP/WebSocket 142-proposal sequences reproduce the Node equal-score case (all scores −0.8571428571428571; seeds 362594520 vs 371612256). Fresh-page reload restores **every actual district instance matrix**, and reset plus reset reload return exactly to the initial city. Neutral proposals keep seeds unchanged. No application / shader console errors or page exceptions. The test observer is injected only into the served main module; no production test hook.
- Equal-score order A ↔ B changes **5.27 % day / 4.76 % night** of the hero frame (`scripts/meter-diff.py`, >24/255), with identical feedback-band votes, score/layout and clock. Captures: [A day](meter-variety-p11-order-1-day.png) / [B day](meter-variety-p11-order-2-day.png), [A night](meter-variety-p11-order-1-night.png) / [B night](meter-variety-p11-order-2-night.png). Selected day/night captures reopened and visually inspected: tower, service-bay, shade and shore patterns differ while the venue remains continuous.
- P6 full-city band reference captures: [low day](meter-variety-p11-low-day.png) / [mixed day](meter-variety-p11-mixed-day.png) / [high day](meter-variety-p11-high-day.png); [low night](meter-variety-p11-low-night.png) / [mixed night](meter-variety-p11-mixed-night.png) / [high night](meter-variety-p11-high-night.png); [reset day](meter-variety-p11-reset-day.png). These move **all four Meters**, with a different causal panel, so their full-frame deltas (low ↔ high 12.33 / 11.78 %, low ↔ mixed 10.26 / 9.82 %, mixed ↔ high 10.16 / 9.82 %, day / night) are references, **not single-Meter gates**. DEV `?meters` without seeds retains its prior order and geometry; no new single-Meter gate claim.
- Draw submissions: P10's recorded all-mixed day **1337 → P11 1337** (same full pipeline, hero, held time); both seeded equal-score histories also **1337 day / 1343 night**. Full-city seeded low **1361 / 1367**, high **1421 / 1427** (extras active). No meshes, assets, materials or render passes added by P11.
- Scratch databases retained at `/var/folders/st/ml4_0zfx7g129gh2305ynz5c0000gn/T/city2127-meter-p11-CnWWqc/survey.sqlite` (history smoke) and `city2127-meter-p11-GM4dq6/survey.sqlite` in the same temp parent (band references). Existing Vite 5173 was reused; no exhibition SQLite or unrelated process changed. Temporary browser harnesses: `/private/tmp/meter-p11-browser.mjs`, `/private/tmp/meter-p11-bands.mjs`.
- Not verified: controlled real-GPU FPS, Windows, exhibition hardware/endurance, human art acceptance or fresh browser skyway mesh-clearance sampling. Geometry/route footprints are unchanged; existing complete geometry checks passed.
- Documentation: PROJECT records wire / ownership / hash / renderer flow and compatibility; PLAN02 and VALIDATION record this stage. README/AGENTS startup commands, controls and product scope stay the same; no edits needed there.

## P12 — Life and motion (2026-10-02)

- Preflight: resumed `feat/meter-variety` at `0e2efdf2f6ad3b9717911ffed3c334412ebc9e57`, clean. Fetch succeeded; feature/remote **0/0**, feature/`origin/main` **18/0** (`33227a6`), no automatic integration. Owner cc100053 (Codex execution); no overlapping modules or binary edits at startup. P11 source and closure available remotely. User explicitly requested optional P12.
- Open courts reuse the promenade capsule/palette factory: **12 gathering figures per open non-hybrid court**, low/mixed/high seed-zero **0/24/96**. The existing SlotLevels drive visibility; crowds fade only once private/hybrid geometry is >98% cleared. Two courts overlap PARK / COMMONS site footprints and exclude the new actors; the other eight are eligible. Two bounded gathering lanes remain inside the paving and clear of parasol masts, pergola tables, trees, orchards and drone kiosks. No crowd draws when all courts are private. These are authored gatherings, not a crowd simulation or interior occupancy.
- **11 service quadrotors**, one per automation bay. Staffed domed/stacked pavilions gain a small rooftop pad at 44 m; drone ports and charging masts replace one static parked drone with the animated actor. Staggered **48 s** descent/dock/ascent/hover, **12 s each**, inside a **24 m vertical column**. Carrier handover fades the drone before changing landing columns; legacy hides the whole layer. Existing air loop, berth shuttle, pods and promenade traffic remain intact. `ponytail:` no inter-bay dispatch; add it only for required journeys.
- Four independent **night light rhythms** follow current eased carrier shares and the day clock's darkness; factor .75–1.25, steady in daylight. Period automation **12–20 s**, sharing **16–24 s**, environment **20–28 s**, concentration **24–32 s**. Reuses district-owned pad/tower rings, sharing rims/halos, environment sails/cooling rings and concentration lobbies/pods. Shared civic/route materials do not pulse. The manager remembers darkness for target callbacks; no global light flash, new assets/dependencies/render passes or per-frame geometry/material allocation.
- P6 lossless references, headless Chrome **154.0.8037.58**, 1920×929 CSS, DPR 1, fixed hero, hour 16/21, `reviewTime=20`, all four Meters changed together, seed zero: [low day](meter-variety-p12-low-day.png), [mixed day](meter-variety-p12-mixed-day.png), [high day](meter-variety-p12-high-day.png); [low night](meter-variety-p12-low-night.png), [mixed night](meter-variety-p12-mixed-night.png), [high night](meter-variety-p12-high-night.png). Additional [night phase 26](meter-variety-p12-high-night-phase26.png), [staffed pavilion](meter-variety-p12-pavilion-night.png), [overhead crowd review](meter-variety-p12-plaza-night.png). The last two use temporary test-only camera poses, not product camera changes.
- Full-city low ↔ mixed / mixed ↔ high / low ↔ high: **7.92 / 7.91 / 13.19% day**, **7.56 / 7.68 / 12.79% night** (`scripts/meter-diff.py`, >24/255). These are composite reference deltas, **not single-Meter gates**. Same-condition draw calls before → after: day **1361→1377 / 1337→1369 / 1421→1453**, night **1367→1383 / 1343→1375 / 1427→1459**, low/mixed/high. +16 when crowds hidden, +32 with crowds; no measured FPS claim.
- Real HTTP/WebSocket Chrome smoke PASS: running-clock mixed → high live → reload → reset mixed → low live → reduced-motion reset/proposal → standalone. Actual drone matrices change over time; crowd diagnostics follow targets. Low/high body/rotor-centre samples along the full drone columns checked against browser-loaded geometry **including skyways**; final all-high body rays for all 96 crowd figures clear the complete loaded scene, including site assets. The first crowd pass exposed PARK/COMMONS intersections; the occupied-lot exclusion fixes them. No application/page/shader errors; existing favicon 404 excluded. Scratch DB: `/var/folders/st/ml4_0zfx7g129gh2305ynz5c0000gn/T/city2127-meter-p12-Kwfk06/survey.sqlite`; exhibition data untouched.
- Local root `npm test`, `npm run build` and `git diff --check`: PASS (existing bundle-size warning only). New checks cover current-slot visibility, occupied-site footprint exclusion, transitions/snapshot/legacy, material isolation, bounded night rhythms, two flight cycles, actor separation and sampled actual-mesh clearance with orchard/kiosk extras. P11 architecture determinism remains exact; P12 animated actor matrices restore at a common clock phase across reload/reset/full replay. The first full suite failed its old animated-matrix comparison at different times; corrected phase-aware checks and final full suite PASS. Feature CI pending push. Survey/module-swap unchanged. README has no control/setup changes to synchronize; PROJECT and PLAN02 document runtime/visual scope, VALIDATION records this stage's evidence. Human art review, hardware/FPS, Windows and exhaustive arbitrary-history/interior collision acceptance remain open. Existing capture-review-before-main condition remains.

## Proposed P7–P12 — More variety per Meter (2026-10-01, pending user approval)

P7–P12 implemented (P11 and optional P12 requested by the user on 2026-10-02). Goal: each Meter reads as several distinct mature 2127 identities, not one object family that is present or absent. Constraints carry over: desktop hero pose unchanged, no server contract change (P11 excepted), every value futuristic, greenery stays lush with no uniform grids, no new assets, dependencies or render passes.

### Where each Meter stands

| Meter (site) | Carriers today | Day / night low ↔ high | Known weakness |
| --- | --- | --- | --- |
| Automation (NW) | 11 staffed pavilions; walker, pod and aircraft fleet counts | 3.98 / 3.17 % | High = pavilions disappear (absence, not an identity); thin night margin |
| Sharing (SW) | 6 water rooms (vault / garden → steps / halo); 10 inland courts | 1.63 / 1.85 % | Below gate by user decision; courts mostly hidden by landmarks |
| Environment (NE) | Promenade sails / pergolas, mist towers, roof sails / forest, facade louvres / balconies | 4.33 / 4.34 % | One design per state |
| Concentration (SE) | 10 towers + 6 bridges vs 26 pods | 4.47 / 3.81 % | Towers read as banded cylinders; low pods small in the hero frame |

Mixed values only scatter the two endpoint designs (low ↔ mixed 0.9–2.7 %).

### Stages (recommended order)

| Stage | Scope | Acceptance beyond the standard checks |
| --- | --- | --- |
| P7 (done, see [P7](#p7--weak-spots-2026-10-01)) | Weak spots. **Concentration**: three tower silhouette families by slot (twisted shaft, terraced setback, linked twin) and pod clusters large enough to read. **Sharing**: rank court sites by rendered visible pixels, not a centre ray; move the hidden ones. **Automation**: high gets autonomous counterparts on the pavilion bays (drone ports / charging masts) instead of empty ground. | Each touched Meter ≥ 3 % day and night (sharing: no regression below 1.6 %); before/after captures |
| P8 (done, see [P8](#p8--design-families-2026-10-01)) | Design families. Every slot-based carrier gets 2–3 variants chosen by a fixed per-slot hash, e.g. environment bays: sail / pergola / vertical garden screen; roofs: sail / forest / meadow terraces; sharing courts: walled garden / glass winter garden / courtyard cluster and parasols / long-table pergola / amphitheatre lawn; automation pavilions: domed / stacked deck / garden kiosk. | New check: within one band, slots of a carrier use ≥ 2 families; gate unchanged |
| P9 (done, see [P9](#p9--mixed-identity-2026-10-02)) | Mixed identity. At mid values a share of slots shows a hybrid design (half-open room, shared-staffed pavilion, terraced mid-rise), so low / mixed / high read as three identities. | low ↔ mixed and mixed ↔ high each ≥ 1.5 % |
| P10 (done, see [P10](#p10--cross-meter-combinations-2026-10-02)) | Cross-Meter combinations. 4–6 pairings add visible extras only when both axes agree, e.g. sharing + automation high → drone kiosks in shared plazas; environment + concentration high → vertical-forest tower crowns. | 81-combination pipeline test asserts each extra appears only in its pairing |
| P11 (done, see [P11](#p11--path-dependence-2026-10-02)) | Path dependence: proposal history seeds which slots switch first, so equal scores grown in a different order give different cities. Needs the client to read history and identical results after reload / reset. | Determinism test over reload, reset and replay; user approval of the contract use |
| P12 (done, see [P12](#p12--life-and-motion-2026-10-02)) | Life and motion: crowds in open plazas, drones landing at pavilions, a per-Meter night light rhythm. | Actor route / avoidance checks as in P2 |

P6 (pipeline diagnostics, docs, draw-call measurement) stays per stage: each stage records lossless low / mixed / high day and night captures, `scripts/meter-diff.py` results and a same-condition draw-call before / after.

### Open questions for the user

- Approve P7 → P10 in this order, or start from a different stage?
- Preferred variants for each Meter in P8 (the examples above are proposals).
- P11 / P12 were requested and implemented on 2026-10-02; final human visual review remains open.
- Whether to integrate P0–P5 + P3b–P3d into `main` before P7, or keep one branch.

## Next step

Capture review of P0–P12 with the user, then integrate `feat/meter-variety` into `main` per CONTRIBUTING (preserve the review-before-main condition).
