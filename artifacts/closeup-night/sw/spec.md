# SW close-up (closeup-night) — spec

Targets (owner-picked 2026-11-04): [flagship-low](target/flagship-low.jpg), [flagship-mixed](target/flagship-mixed.jpg), [flagship-high](target/flagship-high.jpg). Rubric: [rubric.md](rubric.md). Taste: [CITY MASTER TASTE](../../../docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md). Pattern to copy: NW `src/siteBuilders/automationHub.ts` (band state groups as `Part`s, `bake()`, residents via `pedestrians()` + `conversationPose`, settled-state-only people, hovering lens canopy with under-emitters).

Units: site-local, `changeSites.sw` scale 4 (1 unit = 4 m), lot 12 × 10 units centred (−105, 60), i.e. x ∈ [−6, 6], z ∈ [−5, 5]. Camera `sw:n` `[-95,30,-15]` → `[-105,10,60]` looks from local **−Z** toward +Z: camera-facing faces are local **−Z**, screen-left is local **+X**, screen-right is local **−X** (verify with one capture, mirror the layout if wrong). Size (owner): fill the lot, nothing past the orange outline (keep every mesh inside x ±5.9, z ±4.9); hovering discs may rise.

## R1 — rebuild `src/siteBuilders/commonsPlaza.ts`

### Shared

- **Material `sharePink`** (new, in `commonsPlaza.ts`): `MeshStandardMaterial({ color: METER_COLORS.publicSharing, emissive: METER_COLORS.publicSharing, emissiveIntensity: .9, roughness: .5 })` — the only saturated accent: pod glass frames, screen frames, bench tops, terrace edge seams, disc rim/ribs. Never via `publicLight` × instance colour.
- Structure `white` (automationKit); glazing `glassPane` over a warm backing (`glowMid` / `roomWarm` as NW does — not `glass`, it mirrors sky blue); emitters `glow` / `futureLight` (cool white-blue). No `dark`, no `teal`, no beige.
- Retire the old gazebo: 6 columns, roof ring, membrane skylight, old arcs, old pink arcs, and the `sign('公共広場 / COMMONS')` (Latin letters; the target has no text). `createGuestMarker` outline unchanged.
- Trees: `tree()` from `concentrationTower.ts`; shrubs: `shrubs()`/leafy crowns from `cityRig.ts`. Greenery stays lush.
- Residents: one `pedestrians(stage, N, 'commons-people')` crowd, people shown only when a band is settled (NW pattern). Size them like the targets (a standing adult ≈ .5 units; seated people readable through pod glass) — use a per-band FOLK factor like NW if needed.

### State −1 `low` — private pod garden (target flagship-low)

- Terrace: white slab filling the lot, rounded corners, 11.6 × .3 × 9.6 (top y ≈ .3); a continuous clipped-hedge border (≈ .5 high) along the front and both sides, leaving a front entrance gap at the centre; pale paths (`stone`, slightly raised) in a Y from the front entrance to the back.
- **6 pods**, positions ≈ (+3.1, −0.6), (+2.3, +1.9), (+0.7, +3.2), (−2.0, +3.1), (−3.4, +1.1), (−1.1, −0.1) (read from the target; adjust for paths): each a rounded white capsule ≈ 1.8 w × 1.5 h × 1.6 d (rounded box with large radius or a scaled capsule/lathe), floor at y ≈ .75 so it **hovers ≈ .4 above** the terrace; front (−Z, rotate each slightly toward the camera) is one large rounded glass opening ≈ 1.4 × 1.1 with a `sharePink` frame seam all round; inside: warm backing, two facing seats (`sharePink`/white), a small table, **2 seated residents** per pod in ≥ 4 pods (1 in the others).
- Under every pod: ring emitter — `glow` torus r .55 tube .06 at y ≈ .45 + a flat bright disc/halo, on a short white pedestal ring stub so the gap reads.
- **Screens**: 6 tall membrane panels .9 w × 1.9 h × .04 between neighbouring pods, white translucent (`skyGlass` or a white `MeshStandardMaterial` opacity .75) with a `sharePink` frame.
- Planting: 5 small trees between pods, shrub beds filling the gaps, low hedges along paths. 4 slim reservation light-posts (white post + `glow` cap) by pod doors. 3 pink-topped benches along the front path.
- People outside: ≥ 6 (walking the paths, sitting on the benches).

### State 0 `mixed` — half pods, half open circle (target flagship-mixed)

- Round white deck r 4.8, .35 high, centred (0, 0, +.1), stepped edge; `sharePink` steps (3 treads) at the front-right (≈ (−3, −3.6)).
- Pod half (+X, screen-left): **4 pods** (same pod part, may be smaller ×.85) at ≈ (+3.0, −1.2), (+3.4, +1.4), (+1.6, +2.6), (+1.4, −2.4), on ring emitters; pink side panels; 2–3 residents in / beside them.
- Divider: a curved raised planting bed (white planter wall .6 high) from front (≈ (0, −3)) to back (≈ (−.5, +3.5)) packed with 4 trees and shrubs.
- Open half (−X, screen-right): sunken circle (floor .25 below deck) centred ≈ (−2.6, +.6), r 1.9, ringed by a continuous curved bench with `sharePink` top (two tiers on the back half), a round table at the centre; **≥ 14 residents** seated round it facing in, **3 children** (FOLK ×.6) near the steps.
- **Canopy disc** over the open circle: white lens (NW lathe profile scaled) r 2.4 at y ≈ 4.2, centred over the circle (must stay inside x ≥ −5.9); 4 `glow` stabiliser rings (torus r .4) hanging under its rim + a `sharePink` rim seam; gentle bob ±.06 (still under `prefersReducedMotion`).

### State +1 `high` — open commons amphitheatre (target flagship-high)

- Plinth filling the lot (as −1), white; the whole lot is open: no pods, no screens.
- Upper back deck (z +2 … +4.6) at y ≈ 1.6 with **2 glazed pavilions** at the back corners (x ±3.9, z +3.4): 2.2 × 1.5 × 1.6, `glassPane` + white mullions + warm-lit interior with sofa/bench.
- **Amphitheatre**: 5 curved terraces (concentric arcs facing −Z, centre ≈ (0, +6)), each .3 rise, tread ≈ .65, descending from the back deck to the forecourt (y ≈ .3, z −1.5 … −4.6); every terrace edge a thin `sharePink` seam; long curved white benches on the treads; a straight central stair (≈ 1.6 wide) through the middle. The front forecourt is open, flat, white.
- Raised planters on the terraces with **5 trees** + shrub beds (left side strong, as in the target).
- **4 round tables** (white, 4 stools) on the upper deck / left terrace with residents.
- Residents **≥ 22**: seated on terrace benches in groups, around tables, 4 children playing on the forecourt, 2–3 walking the stair.
- **Big canopy disc**: white lens r 5.3 (x extent must stay within ±5.9; trim r if needed), centred (0, +.5), underside at y ≈ 8.5–9.5 (raise until it sits in the target's frame position, upper third); 8 radial `sharePink` ribs on the top surface and a `sharePink` rim seam; under it a stabiliser ring (torus r 3, `glow`) and 4–6 white machinery pods/boxes around a hub; 6 small under-emitters. No mast. Bob ±.08.

### Transition (3 s, `SITE_TRANSITION_SECONDS`)

- Band state groups as NW `Part`s: the outgoing state sinks/shrinks, the incoming grows; pods descend onto / lift off their emitters; the disc lowers in / lifts away. People only in a settled state.

### Runtime and diagnostics

- `CommonsPlazaRuntime` API and `CommonsPlazaDiagnostics` fields stay as they are: `cityChangeManager`, `tests/surveyMeterPipeline.test.ts`, `tests/*.browser.mjs` read `band` and `visibleSharedSeats` (must equal `layout.sharedSeats` once settled). Keep the 8-slot seat-level counter for diagnostics and the smooth 3 s count retarget; the visible geometry follows the band. Mark that split with a `ponytail:` comment.
- Update `tests/commonsPlaza.test.ts` to the new structure; keep every intent (diagnostics, smooth retarget, hidden before the exhibition target / after `restoreLegacy`, everything inside the SW lot incl. the discs) — no assertion deleted without a replacement.

### Camera

- `SHOTS['sw:focal']` (`src/headlineCamera.ts`) → `{ position: [-95, 30, -15], target: [-105, 10, 60] }` (= `sw:n`). Fix any test that pins the old pose. `sw:district` unchanged.

### Budget and checks

- Report visible mesh/draw counts per state like NW; `bake()` static parts, instancing for pods/emitters/benches where repeated.
- `npm test && npm run build && git diff --check` green.

### Screenshots

Evidence `~/city2127-evidence/closeup-night/sw/r1/`, Vite on port 5191: copy `~/city2127-evidence/closeup-night/sw/capture.mjs` and change the port; 3200×1800, HUD hidden, pose via `cityPose([-95,30,-15],[-105,10,60])`, `?meters=sw:<band>&hour=12` and `hour=22`. Name day captures `flagship-low.png`, `flagship-mixed.png`, `flagship-high.png` and night `flagship-<state>-night.png`. Build `vs-target.jpg` (3 rows: round day | target, 1200×675 cells). Do not publish anything to `artifacts/`.

## R2 — items below 2 (R1 18/30)

Keep (scored 2; re-crop and compare with R1, must not lose): `fm-deck`, `fh-amph`, `fh-people`, `fh-planting`.

- **Seated people (fl-people-in, fm-ring, fm-pods).** Residents in pods and on the ring bench render *standing on* the seat. Fix the seated pose (NW `crowd.gait(slot, phase, walk, seated ? 1 : 0)` and the seat height/offset): every seated actor sits on a seat top, knees forward, facing the table/circle centre. Pod residents sit in profile to the camera, facing each other across the table.
- **Pods (fl-pods, fl-people-in, fm-pods).** Grow pods ×1.15 (stay in the lot). Glass opening larger (≈ 80 % of the front, rounded corners) with a slight forward bulge (a curved `glassPane` sheet or scaled sphere segment), `sharePink` frame seam. Interior warm-lit like the target: `glowCeil`-style ceiling light + warm emissive back wall (`roomWarm`/`glowMid`), floor warm cream, seats `sharePink`, small white table — not beige sand. Mixed pods: add a flat `sharePink` emissive side panel on the camera-visible side of each pod; ≥ 2 residents seated inside.
- **Emitters (fl-emitters, fm-pods).** Under each pod: pod floor ≥ .55 above the terrace (a visible dark gap), a bright cool emitter ring (`glow`-type `MeshBasicMaterial`, toneMapped false, torus r .65 tube .09) plus an additive halo disc (r .9, white-blue, opacity ~.35) on the terrace; the pedestal stub becomes a thin dark-grey core (r .18) so the gap reads. Same for mixed pods.
- **Screens (fl-screens).** Free-standing membrane screens on the ground at midpoints between neighbouring pods, not attached to pod sides: 6 panels 1.0 × 2.1, white translucent (opacity ~.7) with a `sharePink` frame, each on a slim white foot.
- **Garden (fl-garden).** Replace the uniform ball-shrub carpet: curving pale paths (an S from the front entrance branching to each pod door; build from short rotated slabs or a flattened tube), leafy low planting (smaller `leafyCrown` clumps at varied scale and two greens), 7 small trees, low clipped hedge only along the lot edge (≤ .35 high). ≥ 8 residents outside: walking the paths, 4 seated on the 3 pink benches.
- **Ring (fm-ring).** Circle floor sunken .35 below the deck with an inner riser wall; bench ring two-tier on the back half, `sharePink` seat tops; a clear round table (white, r .6, with a few props) at the centre; 14 adults seated facing in, 3 children (scale ×.6) sitting on the front steps / circle edge.
- **Divider (fm-divider).** Planter wall .7 high, packed: 4 trees of varied height + dense leafy shrubs spilling over the edge, running front-to-back between pods and circle.
- **Mixed canopy (fm-canopy).** Must read above the open circle and inside the lot: centre (−2.8, y 3.0, −0.9) — pulled toward the camera so its image sits over the circle, not over the water; r 2.4; 4 bright `glow` stabiliser rings under the rim with additive halos; `sharePink` rim seam.
- **High disc (fh-disc).** Make it wider in frame without leaving the lot: scale the lens x ×1.15 (ellipse ≈ 5.75 × 5.0), keep it inside x ±5.9, z ±4.9; centre y so it sits in the upper third like the target (≈ 6.8). Underside must read: glowing stabiliser torus (r 3, `glow`, tube .12), a central hub drum, 6 machinery pods/boxes with dark-grey detail, 6 bright under-emitters with halos.
- **Pavilions (fh-tables).** Back-corner pavilions glazed: pitched glass roof + glass walls (`glassPane`) with white mullions, warm-lit interior (warm back wall + ceiling light, a sofa); 4 round tables with residents seated around them.

Screenshots to `~/city2127-evidence/closeup-night/sw/r2/` (same names as R1) + `vs-target.jpg`.

## R3 — items below 2 (R2 19/30, kept)

Keep (2 in R2, pairwise `=`; re-crop and compare with R2, must not lose): `fm-deck`, `fh-amph`, `fh-people`, `fh-planting`.

Opus zoom of R2 (`r2/flagship-low.png` x1100–2200 y700–1250, `flagship-mixed.png` x1100–2200 y800–1300):

- **Residents still read as standing columns (fl-people-in, fm-pods, fm-ring).** In pods the two residents stand at the *back wall behind* the pink seats, dark; on the ring they stand upright in a circle. Before anything else, render one test view low and close (e.g. `cityPose` 6 m from a pod, eye level) and prove a seated actor bends at hip and knee; compare with NW's seated low-hall residents (`automationHub.ts` `seated: true`). Then: pod residents sit ON the pink seats, seats moved to the sides of the pod near the glass (x ≈ ±.45 of pod width, z ≈ .2 behind the glass), people in profile facing each other over a small table (narrower, lower than the seats' backs), not behind them. Exclude pod shells from shadow casting/receiving onto people if they darken them. Ring residents: hips on the bench top, thighs/knees toward the circle centre, facing in.
- **Pods on dark stems (fl-emitters, fm-pods).** Remove the dark-grey core; nothing touches the ground. Under each pod's belly a bright flattened emitter pad (`glow`, r .45) + the ring (`glow` torus r .65 tube .09, toneMapped false, at mid-gap) + a cool halo on the terrace (`MeshBasicMaterial` #bfeaff additive, opacity .45, r 1.0). Gap ≥ .55.
- **Pod shape (fl-pods).** Softer capsule: the front glass outline a squircle with large corner radius, the shell sides bulging (e.g. a superellipsoid/scaled sphere lathe, or a rounded box with corner radius ≈ 40 % of height); the shell deeper at the top than at the bottom, as in the target.
- **Screens (fl-screens).** White membrane, not clear glass: `MeshStandardMaterial` #f6f7fb, emissive #ffffff .15, opacity .85, `sharePink` frame .05 wide; ≥ 6 placed where the camera sees them, each standing between two pods, 1.0 × 2.2.
- **Garden (fl-garden).** It reads as open lawn + slabs. Cover every non-path area inside the hedge with planting: dense leafy clumps (2–3 greens, varied scale .25–.6, flattened `leafyCrown`), fern-like spiky clumps (a few thin cone/plane clusters), 10 small trees; paths smooth curves (more segments, no fan spikes at bends).
- **Mixed ring (fm-ring).** Seated (as above); a solid white table r .6 on a pedestal with 3–4 small coloured props; 3 children sitting together on the front step edge (×.6), readable.
- **Divider (fm-divider).** 6 trees varied height (.8–1.3) and dense shrubs spilling over both sides of the planter; the planter runs the full depth of the deck between the pods and the circle.
- **Mixed canopy (fm-canopy).** Keep its R2 position (pairwise won); the 4 stabiliser rings must show: hang them .35 below the rim at radius 2.0, torus r .35 tube .07 bright `glow` + additive halo discs, visible from the camera below the rim.
- **High disc (fh-disc).** Rim: a thick `sharePink` band (.12 high) all round, segmented by 8 short white gaps; 8 raised `sharePink` radial ribs on the top surface (.12 wide, emissive, readable from this camera); underside: solid bright stabiliser ring (`glow` torus r 3, tube .14, opaque), central hub drum, 10–12 dark-grey machinery boxes and 6 under-emitters with halos.
- **Pavilions (fh-tables).** Glass must read as glass rooms: tinted panes (#dff1ff, opacity .45) on all visible faces incl. a pitched glass roof, white mullions every .4, strong warm interior (warm back wall emissive ≥ .9, sofa, ceiling light); 4 tables keep their residents.

Screenshots to `~/city2127-evidence/closeup-night/sw/r3/` (same names) + `vs-target.jpg`.

## R4 — last round (R3 18/30, kept 4–3; lost fl-emitters, fl-garden, fh-amph)

Keep (re-crop and compare with R3, must not lose): `fm-deck`, `fh-tables`, `fh-planting`; restore R2's `fh-amph` pink-seam saturation.

Opus zoom of R3: high forecourt is a huge empty white plane in front, the terraces sit in the back half as straight bleachers; pod residents read as tall dark bottles (backs/heads above the seats, no legs); pods overlap in two clumps; emitter rings are white-green, not cool blue.

- **High amphitheatre (fh-amph, fh-people).** Re-lay as a wide fan like the target: arcs centred off the lot's front-right corner (≈ local (−5, −6), screen lower-right), 6 terraces at radii ≈ 4.5 … 9.5 sweeping diagonally from back-left to the right side, so curved terraces fill most of the lot and the flat forecourt is only the front-right wedge. Long continuous curved benches on every second tread, saturated `sharePink` edge seams (emissive ≥ .9, as R2). Back deck, pavilions, tables and trees stay where they are (fh-tables, fh-planting keep). Residents seated along the curved benches in groups of 2–3 (≥ 12), children running on the forecourt (walking gait, varied directions).
- **Pod residents (fl-people-in, fm-pods).** Turn the two residents 3/4 toward the camera (yaw ±.6 from facing each other), lower the seats to .22 and pull people forward so thighs and knees show above the seat front behind the glass; residents ×1.15 inside pods; light, varied clothing if the crowd supports per-instance colour.
- **Pod layout (fl-pods, fl-screens).** No overlap from the camera: pod scale ×.92 and spread them over the whole terrace (use the lot width), 6 membrane screens each standing in a visible gap between two pods, slightly angled toward the camera.
- **Emitters (fl-emitters, fm-pods, fm-canopy).** Cool blue-white: ring colour #9fe8ff × 2.5 (toneMapped false), halo #8fd8ff additive opacity .5; under-belly pad brighter. Mixed canopy: raise to y 3.6, ring emitters r .45 on the camera-facing half of the rim (front-left, front, front-right, right) so all read below the rim.
- **Garden (fl-garden).** Fewer blob clumps, more readable small trees with trunks (≥ 8 visible), fern clusters between, lighter greens; pink benches visible on the path edges with seated residents.
- **Divider (fm-divider).** 7 trees, lighter varied greens and smaller crowns (target-like), shrubs spilling over the planter edge.
- **Ring children (fm-ring).** 3 children in bright clothes sitting on the front step edge facing the circle.

Screenshots to `~/city2127-evidence/closeup-night/sw/r4/` (same names) + `vs-target.jpg`.

## R5 — cap raised to 6 (owner); from R4 20/30

Keep (2 in R4; re-crop and compare with R4, must not lose): `fl-pods`, `fl-screens`, `fm-deck`, `fh-amph`, `fh-planting`.

1. **Site-local residents (fl-people-in, fm-ring, fh-people, fm-pods)** — the Blocked option (a), touches only `commonsPlaza.ts`. Replace the shared `pedestrians()` crowd on this site with local figures built like SE's (`concentrationTower.ts` lines ≈160–195: separate head / torso / arms / legs merged per pose, white shirt vertices tinted by `setColorAt`, light shirt palette, dark-grey legs): a **standing**, a **seated** (thighs forward, shins down, clearly bent at hip and knee — exaggerate the thighs so they read from a 15° camera: thigh length ≥ .45 × standing height) and a **child** (×.65) pose, as `InstancedMesh`es per state group. Size: adults ≈ .55–.6 units standing (≈ 2.3 m in this 4 m/unit site — larger than real, as the targets show people), seated proportionally; light clothing (white, cream, pale blue, peach, pale green, lilac; a few saturated: one red, one yellow, one blue per state for children). Faces toward the camera where the target shows faces (pod pairs 3/4 to camera; ring residents on the far side face the camera, near side in profile). Residents still show only in a settled state (fade/scale with the band group is fine since the figures are part of it). Walkers become standing figures placed mid-stride is not needed — stand them on paths in pairs/groups, a few with an arm forward (talking).
2. **Emitters (fl-emitters, fm-pods)** — not a flat disc: under each pod a **vertical emissive collar** (open cylinder r .5, height .18, cool `#9fe8ff`×2.5 toneMapped false) hanging from the pod belly, a smaller bright ring at the bottom of the collar, then a **visible dark gap** (≥ .45) to the terrace; on the terrace only a small soft halo (r .7, opacity .3), not a big flat disc. The ring must read as a glowing torus seen in perspective, brighter in the centre.
3. **Garden (fl-garden)** — match the target density: ≥ 12 small trees with visible trunks spread over the beds (not just 2–3 visible), dense leafy fern clusters covering all beds (spiky lighter greens, varied heights .2–.6), hedge border; curving paths stay; benches visible.
4. **Mixed canopy (fm-canopy)** — the cyan halos read as large ovals outside the lot: drop the halo discs, keep only the 4 compact glowing ring emitters (torus r .3) hanging *directly under* the rim on the camera side; disc must read inside the lot.
5. **High disc (fh-disc)** — continuous saturated `sharePink` rim band (no white gaps), the stabiliser ring an opaque bright torus (not a translucent slab), machinery boxes dark-grey and readable.
6. **Pavilions / tables (fh-tables)** — pavilions as warm-lit glass rooms: brighter warm interior (emissive back wall + floor glow), clear glass, white frame; ≥ 3 tables clearly visible in front of them with seated residents.

Screenshots to `~/city2127-evidence/closeup-night/sw/r5/` (same names) + `vs-target.jpg`.
