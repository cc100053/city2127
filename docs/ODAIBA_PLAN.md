# Odaiba 2127 — venue transition plan (DRAFT)

> 2026-10-02 operation update: the Odaiba venue is already integrated on main. Its four-question experience now supports two independent A/B devices on the same survey server, with ordered city displays and reset draining. This venue plan keeps its dated P0–P6 scope; current station operation and evidence are in the [dual-station handoff](handoffs/two-guest-devices.md).

- Status: APPROVED 2026-09-30 (decisions below). P0–P5 done on `codex/odaiba-venue`; next: integrate into `main`, then P6.
- Drafted: 2026-09-30 against `main` `4bc1646`; Odaiba sources read from `origin/codex/odaiba-preview` `3a8a5f2` (contains all of `origin/feat/odaiba-assets-progress-02` `40d696e`).
- Supersedes on approval: the "single Shibuya setting" constraint in [AGENTS.md](../AGENTS.md), [PROJECT.md](PROJECT.md) and [PLAN02.md](PLAN02.md). Shibuya is **replaced**, not kept selectable; it stays in Git history.

## Goal

The exhibition city moves from the Shibuya crossing to the **Fuji TV / Daiba waterfront** in Odaiba. Everything that makes the exhibition work — four-question proposal, v2 CityView, four change sites, lifecycle/admin, day/night — carries over. Only the *place* changes: ground, landmarks, camera, routes, site coordinates and copy.

Non-goals for this transition: new question axes, server contract changes, module-swap support for v2, responsive/mobile layout, deployment.

## What the Odaiba branches already give us

| Item on `codex/odaiba-preview` | Reuse | Notes |
| --- | --- | --- |
| 8 building GLB + `.blend` pairs (Fuji TV, Aqua City, DECKS, DiverCity Plaza, DiverCity Office Tower, Hilton, Grand Nikko, Telecom Center) | **Yes, as-is** | Real metres, Y-up, front +Z. Inspector: 339,919 tris / 271 draw calls for all eight. Fuji TV alone 127,928 tris. |
| `odaiba_masterplan_v01_phase03d_environment.glb` (terrain, roads, sea, Yurikamome guideway, blockout filler) | **Yes, as-is** | 48,178 tris, 37 meshes, 13 materials. GSI DEM5A terrain, sea at −0.8 m. Grey blockout look — needs the material pass below. |
| `src/odaibaPlacement.ts` + `src/odaiba-layout.json` + `scripts/read-odaiba-layout.py` + `tests/odaiba.test.ts` | **Yes** | Correct Blender→Three placement incl. the Grand Nikko legacy −90° adapter. Keep the test. |
| `tree_instances.json` (5,295 lines), `streetlight_instances.json` | **Yes** | Feed straight into `InstancedMesh` (reuse `cityRig` tree/lamp geometry or `future-tree-2127`). |
| `src/odaiba.ts` standalone page, `odaiba.html`, `odaiba.css`, `vite.config.ts` multi-page entry | **No** | Separate renderer, lights and camera. Fold its loading loop into `main.ts` instead of running two apps. |
| `overlay.ts` "Explore Odaiba ↗" link, `style.css` `.venue-link` | **No** | Based on old `main` `5577195`; overlay has changed since. |
| Previews / handoff PNGs | Reference only | Keep in `docs/handoffs/`. |

**Do not merge the branch wholesale** — its base is `5577195`, 30+ commits behind `main`, and it carries a stale `package.json` / `overlay.ts`. Bring files over path-wise on a fresh branch:

```sh
git checkout -b codex/odaiba-venue origin/main
git checkout origin/codex/odaiba-preview -- asset/models/{fuji-tv,aqua-city-odaiba,decks-tokyo-beach,divercity-tokyo-plaza,divercity-office-tower,hilton-tokyo-odaiba,grand-nikko-tokyo-daiba,telecom-center,odaiba-masterplan} src/odaibaPlacement.ts src/odaiba-layout.json scripts/read-odaiba-layout.py tests/odaiba.test.ts docs/handoffs/odaiba-assets.md docs/handoffs/odaiba-assets-*.png docs/handoffs/telecom-center-*.png
```

## What on `main` is venue-agnostic (keep)

- Survey server, v2 reducer, SQLite, lifecycle/admin, Japanese admin UI.
- `cityChangeManager`, `changeCatalog`, `siteRuntime` and all four site builders (`automationHub`, `environmentPark`, `commonsPlaza`, `concentrationTower`) plus `future-tree-2127` / `automation-hub-upper` GLBs.
- `dayCycle`, `worldState`, `surveyAtmosphere` (logic), post chain (GTAO, bloom, vignette), `modelAssets.addCityModel`, `mobility` fleet/instancing machinery.

## What is Shibuya-specific (replace)

| File | Shibuya content | Odaiba replacement |
| --- | --- | --- |
| `src/layout.ts` | crossings, roads, landmarks, `publicRoutes`, `upperLinks`, `DOCK`, `changeSites` | Odaiba deck routes, sphere dock, four new change sites (below). Roads come from the environment GLB, not code. |
| `src/cityRig.ts` | QFRONT, MAGNET tower, shops, crossing paint, sky links | Keep the kit helpers (`box`, `faces`, `sign`, windows, materials); drop the Shibuya landmark builders; add the 2127 retrofit layer. |
| `src/heroCamera.ts`, `main.ts` | 45–180 orbit, far 320, 500 m floor, ±65 shadow box, fog `.0015–.0045`, aria text | Hero frame on the Fuji TV / Aqua City / DECKS cluster (~600 m wide): orbit ~250–900, far ~3000, shadow box fitted to the hero cluster, fog retuned as sea haze. Floor replaced by terrain + sea. |
| `src/mobility.ts` | crossing pedestrians, deck walkers, MAGNET dock | Promenade/deck walkers, Yurikamome pods on the guideway, drones to the sphere, water taxis on the bay. |
| `src/surveyAtmosphere.ts` | `place` names (MAGNET東 …) | Odaiba place names from the new `changeSites`. |
| `survey/src/survey/questions.exhibition.json` | 渋谷 in three questions | Rewritten for the waterfront (draft below); keep question/option ids and effects so the server contract, tests and history are unchanged. |
| `survey/src/ui/guestDebugView.ts`, `src/overlay.ts` | 渋谷 copy, "ONE CROSSING", 35°40′N 139°42′E | お台場 copy, 35°37′N 139°46′E. |

## Scale decision

Shibuya is compressed art units (roughly metres, whole scene ±75). Odaiba is survey metres: the core cluster is ~650 × 630 m and Telecom Center sits ~1.1 km south-east. Keep **real metres** (the placement data and test already assume it) and change the camera instead. Consequences:

- Frame the hero on the Fuji TV – Aqua City – DECKS – Daiba station cluster. Telecom Center and DiverCity become the far background; leave them loaded but outside the default frame.
- A 1.7 m pedestrian is a few pixels at 600 m. Actors read as *flows* (lines of light on decks, pod trains, drone swarms), not individuals. That fits 2127 better anyway.
- Site builders were sized for 8–12 unit lots next to 48 m towers. Add one `scale` per `changeSites` entry, applied at the `siteRuntime` root, instead of rewriting four builders.

## Four change sites on Odaiba (placed in P2, 2026-09-30)

Same sockets, same axes, same builders — only location, scale and name change.

| Socket / axis | Builder | Odaiba candidate | Why it reads |
| --- | --- | --- | --- |
| nw · automation | Automation hub ×3 | Waterfront west of DECKS (40, −300) · デックス西 | Beach-front service node; the station deck was too close to the tower's hero bearing, so the two stacked into one silhouette. |
| ne · environment | Environment park ×4 | Odaiba Seaside Park lawn west of Aqua City (−210, −135) · お台場海浜公園 | Waterfront canopy vs. active-cooling shade roofs, in the foreground of the hero. |
| sw · public sharing | Commons plaza ×4 | Open ground between Aqua City and Hilton (−105, 60) · アクアシティ南 | The Fuji TV–DiverCity promenade is hidden behind Fuji TV from the hero; this open lawn is visible and public. |
| se · concentration | Concentration tower ×3 | Service ground east of Fuji TV (175, −45) · フジテレビ東 | Tall variant (138 m) stands beside the sphere; low variant stays a readable pavilion pair. |

## Making it feel 2127

The landmarks are 1990s–2000s buildings modelled from photographs. 2127 comes from **what has been added and adapted around them**, never from ruin. Low/zero/high Meter values all stay mature futures (AGENTS rule, 2026-09-28).

1. **A living waterfront (quiet backdrop, not a story beat).** Stepped promenade edge with floating decks and planted seawalls, and a readable water surface (`three/addons` `Water`, no dependency). Do not frame it as sea-level rise or disaster; it is simply what a 2127 bay edge looks like.
2. **The sphere becomes a hub.** Fuji TV's sphere is the obvious 2127 anchor: a drone/air-taxi dock (reuse the `DOCK` berth logic) and, at night, an emissive media globe showing landscape rather than adverts (the QFRONT drum idea moved).
3. **Retrofit, not replace.** One shared kit on the existing GLBs: PV/fin skins on south faces, green roofs, deck-level sky bridges linking Fuji TV ↔ Aqua City ↔ DECKS (reuse `publicRoutes`/`upperLinks` concepts), light lines along the Yurikamome guideway.
4. **Mobility on water and air.** Autonomous water taxis crossing to the Rainbow Bridge side, pod trains on the guideway, drone lanes over the bay. All reuse the `mobility` fleet instancing.
5. **One material language.** On load, remap the photo-estimate materials to the project palette in [ART.md](ART.md) (by material name), add night emissive windows. This is what stops the scene looking like a GIS blockout.
6. **De-brand.** No Fuji TV / Aqua City / DECKS logos or trademarked characters (e.g. the DiverCity statue). Place names in UI copy are fine; signage on the models is not.

## Phases

Each phase is one branch, merged after `npm test`, `npm run build`, `git diff --check` and the relevant browser check, per [CONTRIBUTING.md](CONTRIBUTING.md).

| # | Scope | Gate |
| --- | --- | --- |
| P0 ✅ | **Approval + spike.** Path-wise import (command above). Load environment + 8 buildings into root `main.ts` with the existing post chain; temporary hero pose. | Measured FPS / draw calls at 1920×1080 on the exhibition machine (Shibuya baseline 60 FPS, 356 draws). If it fails, decimate Fuji TV / DiverCity in Blender or drop Telecom first. The asset inspector's 3.3 FPS was not on exhibition hardware — measure, don't assume. |
| P1 ✅ | **Ground swap.** Remove Shibuya landmark builders from runtime; terrain + sea + buildings; (trees/streetlights are already consolidated in the environment GLB, so no instancing is needed); hero camera, orbit limits, fog, shadow box; material remap. | Browser capture day/dusk/night; no console errors; Shibuya-only tests updated or retired. |
| P2 ✅ | **Sites.** New `changeSites` coordinates + per-site scale; place names; `surveyAtmosphere` panel. | `?survey` shows all four sites changing with 3 s transitions; snapshot/reset immediate; site tests pass. |
| P3 ✅ | **Mobility.** Deck walkers, guideway pods, sphere drones, water taxis. | `tests/mobility.test.ts` route checks rewritten for Odaiba routes; no actor clips a building. |
| P4 ✅ | **2127 layer.** Raised sea + tidal promenade, sphere hub, retrofit kit, sky bridges, night media globe. | Art review against this section; FPS re-measured. |
| P5 ✅ | **Copy + docs.** Questions (お台場, ids unchanged), guest UI, overlay, README, PROJECT, PLAN02, AGENTS, VALIDATION. | `survey` tests/build; local Markdown links. |
| P6 | **Exhibition acceptance (S5) on Odaiba.** | Full guest flow on exhibition hardware. |

## Phase results

Measurements are on the exhibition machine (the user confirmed on 2026-09-30 that this Apple M6 is it): headed Chrome 154, ANGLE Metal, 1920×1080, pixel ratio 1. Full records: [VALIDATION.md](VALIDATION.md) "Odaiba venue P0–P4".

- **P0** — Assets imported path-wise; `tests/odaiba.test.ts` in root `npm test`. Spike (reverted) with environment + 8 buildings over Shibuya: 60.0 FPS, 1,223–1,311 draw calls (Shibuya alone 60.0 / 356).
- **P1** — Shibuya landmark builders removed; `src/odaibaScene.ts` loads terrain, sea and buildings with a palette remap and warm night glazing; hero over the bay, open-sea floor, fitted shadow box and fog. Trees/streetlights were already consolidated in the environment GLB, so no instancing. 60.0 FPS, ~1,245 draws. [12:00](../artifacts/odaiba-p1-1200.png) · [18:30](../artifacts/odaiba-p1-1830.png) · [22:00](../artifacts/odaiba-p1-2200.png)
- **P2** — `changeSites` in Odaiba metres with a per-site `scale` at the site root (table above); lot-ground and hero-visibility test; lot-bound tests in site-local units. Scratch survey server: 59–60 FPS, 1,525–1,581 draws. [baseline](../artifacts/odaiba-p2-baseline.png) · [high](../artifacts/odaiba-p2-high.png) · [low](../artifacts/odaiba-p2-low.png) · [low 22:00](../artifacts/odaiba-p2-low-2200.png)
- **P3** — `layout.ts` holds only Odaiba routes: guideway centreline traced on the deck, east/west promenades (the park lot reaches the revetment), sphere berth, water loop and ferry lane, air loop and bay approach. `mobility.ts` rewritten: two teal six-car trains, 40 walkers, four water taxis and a ferry, six air taxis at 5× plus a 40 s berth shuttle. Tests: 20 m air clearance, continuity, pod spacing; raycasts onto deck, ground and water. 60.2–60.3 FPS, ~1,308 draws. Walkers read only when zoomed; trains are often behind Aqua City from the hero; no road traffic. [12:00](../artifacts/odaiba-p3-1200.png) · [22:00](../artifacts/odaiba-p3-2200.png) · [zoomed](../artifacts/odaiba-p3-close.png)
- **P4** — `src/odaiba2127.ts`: two 24 m sky bridges (Aqua City ↔ Fuji TV over the guideway, Aqua City ↔ DECKS) between raycast facade points, a lit berth ring above the sphere, guideway edge light lines, three planted floating decks. Roofs retrofitted by material (malls planted, hotels photovoltaic); the sphere glows mint at night. Skipped from the plan: a stepped promenade edge (the floating decks carry the waterfront cue), a media texture on the sphere (a glow reads at hero distance; its UV layout was not checked), per-building PV fins. Known: Aqua City's `Roof and Shadow` material also covers a few facade recesses, which now read green. 60.0–60.1 FPS, ~1,341 draws. [12:00](../artifacts/odaiba-p4-1200.png) · [22:00](../artifacts/odaiba-p4-2200.png) · [zoomed 12:00](../artifacts/odaiba-p4-close-1200.png) · [zoomed 22:00](../artifacts/odaiba-p4-close-2200.png)
- **P5** — `survey/src/survey/questions.exhibition.json` rewritten for the waterfront (ids, option ids, effects and version unchanged, so the server contract and history hold); guest welcome/masthead say お台場 / ODAIBA; root overlay reads "ONE WATERFRONT. TWO FUTURES.", "The same shore.", 35°37′ N 139°46′ E; page title and remaining Shibuya strings in code updated; README, AGENTS, PROJECT and PLAN02 note the venue. `survey/` 15 suites and build pass.

## Waterfront questions (implemented in P5)

Ids, option ids and effects are unchanged; only `text`/`label` change. Implemented from this draft on 2026-09-30 at the user's go-ahead; wording can still be revised.

| id | text | options (−1 / 0 / +1) |
| --- | --- | --- |
| `service-2127` | 2127年のお台場。訪れる人も暮らす人も多いベイエリアで、駅やモールの案内・買い物をどう支えてほしい？ | 待ち時間があっても、人が主役。技術は接客を支える / 普段は自動、困ったときは人に相談 / 相談の機会より、いつでも使える自動サービス |
| `commons-2127` | 海辺で1時間の空き時間。限られた水辺の広場を、どんな場所にしたい？ | 一人や小グループで予約できる、海の見える静かな空間 / 静かな席と、自由に集まれる場所を半分ずつ / 予約なしで、誰でも一緒に使える水辺 |
| `cooling-2127` | 2127年の厳しい夏。同じ予算を、海辺のプロムナードのどんな暑さ対策に使いますか？ | 木陰より、日差しを調整する屋根と冷却設備 / 冷却設備と、木陰・植栽を半分ずつ / 設備より、海風が通る木陰と植栽 |
| `functions-2127` | 新しい店や生活サービスを増やすなら、どんなお台場で暮らしたい？ | 少し歩いても、水辺に点在する低層の機能ポッド / 低い建物と高い建物が混ざった街 / 上へ移動すれば、一つのタワーで用事が済む街 |

## Decisions (user, 2026-09-30)

1. Odaiba **replaces** Shibuya as the exhibition city; no venue switch.
2. The four change sites in the table above are accepted as recommended.
3. Questions are rewritten for the waterfront (draft above), not a place-name swap.
4. The waterfront is a quiet 2127 backdrop; sea-level rise is not emphasised.
5. Blender vs. runtime ownership is provisional: runtime by Codex/Claude sessions under cc100053, Blender assets by the Odaiba asset owner; revisit when P4 needs new GLBs.
