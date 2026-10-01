# meter-variety — Readable, district-wide Meter changes

- Owner: cc100053 (P0/P1: Claude Code; P2: this Codex session)
- Status: IN_PROGRESS — P0 + P1 + P2 implemented; P3–P5 planned; P6 evidence recorded per stage
- Branch: `feat/meter-variety`
- Base commit: `33227a687ac9d18281e90494a4e9b2ce27f861ce`
- Last verified commit: P2 implementation `d03efa7e7ec2afb871e9bbac82b278b940a4e2fa` (local checks, lossless captures, real WebSocket browser smoke and feature CI PASS)
- Remote availability: `origin/feat/meter-variety`

## Session Git state

- Session starting branch and HEAD: `main` `33227a6`, clean.
- Last fetched origin/main commit: `33227a6` (2026-10-01; local `main` 0/0 with `origin/main`).
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
| P3 | Sharing: floating decks as private pods vs open steps, water rooms | planned |
| P4 | Concentration: context tower crowns vs scattered pavilion pods | planned |
| P5 | Change-moment pulse in the Meter's colour | planned |
| P6 | Pipeline diagnostics, docs, draw-call measurement | per stage |

Readability gate: a low ↔ high change of one Meter alters ≥ 3 % of the 1920×929 hero frame (`scripts/meter-diff.py`), day and night.

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

## Next step

P3 (sharing) on this branch, using `SlotLevels` and the same capture/diff gate. P0–P2 remain on the feature branch for capture review; preserve the existing handoff's review-before-main integration condition.
