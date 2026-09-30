# Odaiba art direction 01 — Fuji civic chassis

- Owner: Codex (this task), sole owner of the runtime delta.
- Branch: `feat/art-direction`; implementation complete, human art review pending. Stop after this pass; no main integration.
- Base: `e587b54` (approved references), on top of main `b97f859`.
- Preflight 2026-09-30: started on main `b97f859`, fetched origin successfully; main/origin main 0/0 divergence. Resumed existing remote `origin/feat/art-direction` at `e587b54`, local/remote 0/0. No main merge needed. Unrelated untracked `.claude/launch.json` preserved.
- Existing venue handoff compared with actual code: P0–P5 are available in main, eight GLBs and 2127 retrofit layer present. Prior art-direction handoff describes Shibuya history, not this pass's source of truth.
- Ownership: no binary asset edits, no overlapping binary work. Source reference PNGs and master taste unchanged.
- Last verified implementation: `274167ef44fa7f0f53647ed06791f0ef4268e5a6` (root checks and browser evidence on the identical implementation tree). No use of historical FPS as new evidence.
- Committed-diff review found trailing whitespace already present in the base reference document's Status line. Replaced its Markdown hard-break spaces with `<br>`; visual/design rules and reference PNGs unchanged. Working-tree and full `origin/main...HEAD` whitespace checks pass after this formatting-only correction.

## Current implementation inspected

| System | Actual source / flow |
| --- | --- |
| Layout / placement | `odaiba-layout.json`, `odaibaPlacement.ts`; Phase 03D environment GLB contains ground/context/guideway. `layout.ts` contains routes, four survey sites and retrofit connections. |
| Fuji civic structure | Before: complete `fuji-tv.glb` via `loadOdaiba`. After: `civicCore.ts` replaces only its rendered model. |
| Secondary architecture | Seven retained named GLBs via `odaibaScene.ts`; anonymous context is in the environment GLB. Four causal sites use `siteBuilders` via `createCityChangeManager`. |
| Ground / roads / structure | Environment mesh/material groups plus original building GLBs; `odaiba2127.ts` adds bridges, guideway edge lights and floating decks. |
| Mobility | `cityRig` → `mobility.ts`; instanced guideway pods, promenade walkers, boats, air taxis. Routes and sphere berth in `layout.ts`. |
| Waterfront / ecology | Environment water/shore/landscape, floating deck green strips, roof material retrofit; causal Park independently driven by the server. |
| Materials / lighting | `cityRig.ts` shared finishes, GLB materials retuned in `odaibaScene.ts`; `main.ts` and `dayCycle.ts` drive sun, sky, fog, environment, AO/bloom/tonemapping. |
| Camera / assets | `heroCamera.ts` fixed hero; `main.ts` OrbitControls. `modelAssets.ts` GLTFLoader; `siteAssets` cache/validate causal GLBs. No new external assets/dependencies. |

CodeGraph was consulted before source searches; broad query was mostly historical, so current Odaiba source and its actual callers were read directly.

## Visual gap audit against R01–R06

| Category | Before-pass diagnosis |
| --- | --- |
| A Future intensity | A recognizable contemporary Odaiba blockout with retrofit objects; removal of vehicles reveals 2027. |
| B Urban typology | Separate malls/hotels/office plots, road grid and promenade remain the organizing system. |
| C Fuji DNA | Original office frame/sphere preserved literally; little suspension or diagonal civic infrastructure. |
| D Massing | Core dominated by windowed office slabs; R01 has deep chassis, occupied voids and distributed layers. |
| E Structure | Original grid frames, conventional guideway columns and flat decks dominate; little transfer logic. |
| F Mobility | Ground trains and aircraft use existing infrastructure or a disc above the sphere; no structural magnetic network. |
| G Ground | Road/grass/pavement subdivision, rather than continuous post-road civic terrain. |
| H Ecology | Flat landscape, small repeated trees and green roof material; ecology mostly decorative. |
| I Waterfront | Thin promenade/seawall, three rectangular floating decks and flat water; no amphibious civic thickness. |
| J Secondary buildings | Hotels/malls/glass office tower retain contemporary silhouettes, independent of Fuji evolution. |
| K Material/light | Restrained palette is compatible, but terrain is flat and maritime haze washes out clear daylight depth; water response and envelope quality are far below R01. |

Three largest perceptual gaps: **Fuji office-block silhouette**, **road-and-mall urban organization**, **thin conventional waterfront**. Select only the first: replace the primary architectural type, retaining site memory and operational contracts. R01 controls silhouette/restraint/void; R02 informs suspension and load transfer; R03/R05 inform public diagonals/arrival; R06 informs the different crescent volume within one family. R04 remains an unresolved district gap.

## Implemented design reasoning

| Before archetype | 2127 replacement and system connection |
| --- | --- |
| Fuji office towers and connecting office floors | Bifurcating foundations and two deep transfer frames carry civic spaces through an open central void. No copied office facades or windows. Suspension/grid/void become the load system. |
| Opaque silver observation object | Three-level environmental civic chamber, mineral lower bowl, membrane enclosure, structural ring and suspended cradle. Existing air berth retains its coordinates. Ring struts connect into the cradle; hangers meet transfer headers. |
| Solid podium / enclosed bridge arrival | Open forum at the existing 24 m Aqua link; inclined spines, ring-level public deck and a chamber transfer link express vertical public continuity. These are architectural proxies, not an added circulation simulation. |
| Single landmark sphere as logo | A different hung crescent public volume uses the same transfer chassis without another identical sphere. |

Six material batches / 50,876 triangles. Reuses shared factories/materials, no new dependencies, no per-frame geometry. Original Fuji GLB/blend retained unchanged; seven original landmarks remain loaded. Generated non-cache geometry disposed after bake. Hero and lighting unchanged. Dev-only `reviewTime` and `review=civic` make repeatable evidence possible; they are ignored by production.

## Comparable evidence

1920×1080 CSS viewport, DPR 1, headed Chrome on ANGLE Metal Apple M6, standalone state, fixed **16:00**, actor time **20 s**. Same original hero camera for both; same authored civic camera for both. Exposure, fog, sky, AO, shadows and bloom identical. Before uses the exact `odaibaScene.ts` from `e587b54`, served by a temporary Vite module / browser route; the temporary module is removed after capture. Main has the same review harness in both. Compare only these four images:

| View | Before | After |
| --- | --- | --- |
| Original hero | [Before](../../artifacts/odaiba-art1-before-hero.png) | [After](../../artifacts/odaiba-art1-after-hero.png) |
| R02-like civic review | [Before](../../artifacts/odaiba-art1-before-civic.png) | [After](../../artifacts/odaiba-art1-after-civic.png) |

## Critical self-review and remaining limits

1. Selected problem: contemporary office slabs dominate the principal Fuji silhouette.
2. Changed: office/podium type replaced by an open, load-bearing chassis and suspended civic rooms; inclined routes and arrival deck belong to that structure.
3. Reference convergence: R01/R02 suspension/void/transfer logic is now visible even without emissive decoration; pale structure, blue-grey membrane and dark precision members stay in the approved family.
4. Visible improvement: sky and background pass through the core; circular space is inhabitable across three levels; circulation and support replace office-window repetition. Bay area and original hero framing remain open.
5. Not improved: road-and-mall organization, seven secondary landmarks, coast, water, terrain ecology, overall daylight material depth. Chamber interior still reads as a geometric prototype; no human activity on the new decks, no magnetic capsules on the new diagonals.
6. Regressions/tradeoffs: original Fuji documentary silhouette and mint sphere night beacon are deliberately replaced. New silhouette is more skeletal and less occupied than R01. Transparent shell and simple joints are below the reference standard. No functional regression found in the scoped checks; structural believability is visual, not an engineering certification.
7. Most 2027 remaining element: the large Aqua City mall slab in front of the core (with the road/guideway parcel separation); hotel and office curtains follow closely.
8. Single highest-priority visual gap: **core-to-waterfront civic organization**, now still separated by ordinary mall/road plots. This is a recommendation for human review, not an automatically started second pass.

GLB candidate: the **suspended civic chamber and its transfer joints**, once this massing is approved. Procedural geometry is adequate for this pass's large-scale replacement, but R02 envelope joints, selective transparency and occupied ecological interior merit a deliberately authored hero GLB. No whole-city conversion or Blender edits in this task.

## Validation and next step

See [dated validation](../VALIDATION.md#odaiba-art-direction-pass-1--2026-09-30) for current results. Full root tests/build and whitespace checks pass; survey/module-swap code unchanged. New actual-mesh raycasts cover aerial approach, original bridge landing, all four site visibility/ground checks and existing actor routes. A top-frame conflict was found and fixed by lowering transfer headers; the test retains the original flight envelope.

Human art director reviews the paired images and decides whether this architectural direction should proceed. No target reached / polish complete claim. No main merge, deployment or second pass.
