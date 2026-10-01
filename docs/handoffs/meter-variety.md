# meter-variety — Readable, district-wide Meter changes

- Owner: cc100053 (Claude Code session)
- Status: IN_PROGRESS — P0 + P1 implemented; P2–P6 planned
- Branch: `feat/meter-variety`
- Base commit: `33227a687ac9d18281e90494a4e9b2ce27f861ce`
- Last verified commit: P0 + P1 working tree on the base (see Validation); commit SHA recorded in Git history
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
| P2 | Automation: drones, pods, walker density, staffed pavilions | planned |
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

## Next step

P2 (automation) on this branch, using `SlotLevels` and the same capture/diff gate. Merge P0 + P1 to `main` after the user reviews the captures.
