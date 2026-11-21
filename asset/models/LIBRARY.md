# Asset library

The one index of reusable 3D parts. Read it before you model anything. Every new element goes in here first; a site places it afterwards. `tests/assetLibrary.test.ts` fails when a prop, module or `asset/models/` folder exists without a row in this file, or a row exists without its code.

## Decide before you model

Every spec lists each element it needs with one of these four routes, in this order of preference:

1. **Reuse.** The element is listed below. Place it as it is.
2. **Extend.** The element is close. Add a parameter with a default that keeps current output, e.g. width, height, a role override or a flag. Never copy a function and edit the copy.
3. **New entry.** Nothing fits. Write it into the library (props: `city-kit-2127/build_kit.py` `PROPS`; modules: `city-kit-2127/modules.py` `MODULES`), add its row and refresh the lineup. Then place it on the site. It enters as `draft`.
4. **Site-only.** Allowed only for a landmark's own shell or silhouette (Fuji TV, a site's tower massing). The spec states why the element can't serve another site.

An element counts as accepted only when the owner has seen it in a lineup (`draft` → `accepted`). Drafts can be used. A site passes close-up acceptance only when every new element it introduced is `accepted`.

## Entry contract

Every prop or module must have all of these:

- **Name and kind.** snake_case. A *prop* is one object. A *module* is an assembled, parametric part. A *recipe* is a material role set.
- **Where.** Function name and file.
- **Size and anchor.** Real metres for a 1.8 m person. Base centre at ground contact. Coordinates are three.js (`x`, `y` up, `z`), and the front faces +z unless the row says otherwise. Give a triangle count or budget.
- **Parameters.** Each one with its default and sensible range (in the docstring).
- **Materials.** Props use the `kit_*` roles (≤ 3 per prop). Modules write only into `modules.ROLES` roles and never create materials.
- **Usage.** A one-line example for Blender and, for props, for three.js.
- **Preview.** It appears in the lineup render beside the 1.8 m figure.
- **Provenance and status.** Source site and round. `draft` or `accepted` (with date).

## Props — `city-kit-2127` (GLB, instanced at runtime or baked)

- **Blender (bake into a site GLB):** `from modules import kit_prop` → `kit_prop(ctx, 'sofa', x, y, z, yaw)`. Alternatively, call `PROPS[name](p)` with your own accumulator, as `modules.kit_prop` does.
- **three.js (instance at runtime):** `instanceProps(await loadPropKit(assets), [{ name: 'sofa', position: [x, y, z], yaw }], unitsPerMetre)` from [propKit.ts](../../src/siteAssets/propKit.ts). Example: [concentrationTower.ts](../../src/siteBuilders/concentrationTower.ts).
- **Rebuild:** `Blender -b --factory-startup --python-exit-code 1 -P build_kit.py`
- **Lineup:** `Blender -b city-kit-2127.blend --factory-startup -P review_kit.py -- out.png`. Props sit in alphabetical order left to right, after the 1.8 m figure. → [kit-lineup.jpg](../../artifacts/asset-library/kit-lineup.jpg)
- **Status:** `accepted` (merged with SE +1, 2026-11-06), unless a row says otherwise.

Size is width × depth × height in metres.

| Prop | Use | Size (m) | Tris | Materials |
| --- | --- | --- | --- | --- |
| `art_panel` | wall art, planted panel | 1.20 × 0.05 × 0.80 | 48 | fabric, leaf_a, white |
| `bench` | outdoor/lobby bench | 1.60 × 0.49 × 0.91 | 108 | white, wood |
| `bookshelf` | wall shelving with books | 1.00 × 0.32 × 1.92 | 444 | fabric, white, wood |
| `cafe_set` | round table, two chairs | 2.00 × 0.90 × 0.91 | 308 | dark, white, wood |
| `chair_office` | swivel chair | 0.62 × 0.56 × 0.97 | 88 | dark, white |
| `desk_monitor` | desk with lit screen | 1.40 × 0.70 × 1.17 | 96 | dark, screen, wood |
| `floor_lamp` | standing lamp | 0.44 × 0.44 × 1.78 | 132 | dark, screen |
| `kitchen_counter` | counter run | 2.04 × 0.66 × 0.90 | 84 | dark, white, wood |
| `lift_cabin` | lit cabin only (shaft: module `glass_lift`) | 2.06 × 2.06 × 3.20 | 168 | amber, screen, white |
| `meeting_table` | table and six chairs | 2.40 × 2.00 × 0.96 | 252 | dark, white, wood |
| `pendant_lamp` | ceiling lamp, hangs 1.2 m | 0.56 × 0.56 × 1.20 | 72 | dark, screen |
| `planter_1m` | 1 m planter box | 1.07 × 0.41 × 0.82 | 376 | leaf_a, soil, white |
| `potted_plant` | small pot plant | 0.64 × 0.58 × 0.97 | 264 | bark, leaf_a, white |
| `rug` | floor rug | 2.00 × 1.40 × 0.03 | 120 | fabric, white |
| `shrub_cluster` | low shrubs | 1.77 × 1.09 × 0.67 | 960 | leaf_a, leaf_b |
| `sofa` | three-seat sofa | 2.08 × 0.90 × 0.85 | 96 | dark, fabric |
| `treadmill` | gym treadmill | 0.70 × 1.70 × 1.14 | 96 | dark, screen, white |
| `tree_indoor` | potted indoor tree | 1.51 × 1.30 × 1.91 | 788 | bark, leaf_a, white |
| `tree_round_s` | street tree, small | 2.55 × 1.86 × 1.87 | 1156 | bark, leaf_a, leaf_b |
| `tree_round_m` | street tree, medium | 3.93 × 3.10 × 2.88 | 1316 | bark, leaf_a, leaf_b |
| `tree_round_l` | street tree, large | 5.70 × 4.49 × 4.17 | 1316 | bark, leaf_a, leaf_b |
| `upper_cabinet` | wall cabinet | 1.80 × 0.38 × 0.70 | 60 | dark, white, wood |
| `whiteboard` | standing board | 1.70 × 0.30 × 1.92 | 120 | dark, fabric, white |

## Modules — `city-kit-2127/modules.py` (Python, baked into a site GLB)

- **Setup:** add `asset/models/city-kit-2127` to `sys.path` → `import modules as M` → `ctx = M.Ctx({role: Acc() for role in M.ROLES}, random.Random(seed))` → call modules → `finish_mesh` each non-empty `ctx.a[role]` with `M.ROLES[role]` (or your site's material for that role). The same seed and call order give the same geometry.
- **Lineup:** `Blender -b --factory-startup --python-exit-code 1 -P review_modules.py -- out.png [--eevee]`. Workbench hides glass; `--eevee` shows real glass, glow and sun. `MODDIR=<dir>` renders another `modules.py` for a side-by-side comparison. → [modules-lineup.jpg](../../artifacts/asset-library/modules-lineup.jpg) (EEVEE, polish 1)
- **Provenance:** SE stage R5, `feat/se-stage-closeup-polish` `0f9afde`. The extraction reproduced all six R5 district variants byte for byte. Polish 1 (2026-11-13) targets the owner-picked SE stage images (`artifacts/se-stage-closeup-polish/target/`).
- **Status:** `accepted` (polish 1, owner 2026-11-13 「收貨」, from the lineup and SE captures).

| Module | Use | Key parameters (defaults) | Roles |
| --- | --- | --- | --- |
| `kit_prop` | bake one kit prop into the site mesh | `name, x, y, z, yaw=0, fabric=None` (role override for `kit_fabric`) | mapped by `KITMAP` |
| `person` | standing resident ≈ 1.78 m, shoes, slim arms, tapered hair cap; varied clothing/skin/height | `x, y, z, scale=1, yaw=None` (random) | cloth_*, white, slate, wood, skin*, dark |
| `seated_person` | seated resident | `x, ysit` (seat top), `z, yaw` | as person |
| `furnish` | scatter furniture vignettes + residents on a floor | `reg` (`Rect(ctx, cx, cz, w, d, ang=0)` or `Ring(ctx, cx, cz, r0, r1)`), `y, hh, items, people` | via props |
| `glass_room` | glazed lit room, slim mullions, warm ceiling glow, planted troughs inside the glass, amber slab-edge line, furnished ≈ 1 vignette / 16 m² (3–12) | `x, z, y, width, depth, height, planters=True, edge=True`. Keep `height` near 4–5 m per floor; >8 m caps furniture at 6 | white, floor, room, glow, glass, green, amber + furnish |
| `glass_lift` | glass shaft, white frame, amber front (−z) edges, landings every 12 m; capsule with amber frame, lit back panel (+z), one or two riders facing −z | `x, z, y0, y1, ycap, wd=2.2, sz=2.0` | glass, white, amber, glow, floor |
| `event_module` | R3 small-building event module: rounded capsule (8.6 × 8.6 × 3.2 m, plan radius 1.1 m, 0.55 m edges), entrance with canopy and two steps, thin-framed warm-glass windows with flat interior cut-outs (people, table and chairs, plant), awnings, accent panels, panel seams, roof plant, drive shoes + 11.2 m slide rails, four corner couplings, four roof lifting rings; front −z | `x, y, z, variant='A'` (A event hall, B cafe with striped awning, C exhibit, D workshop with roller door + roof garden, E lounge with porthole sides + solar roof, F study room, H double-height hall `h=7.4`), `w=8.6, d=8.6, h=3.2` | white, teal, grey, oak, slate, dark, rail, joint, cyan, green, pane_w, pane_a, pane_c |
| `lattice_frame` | sparse heavy dark-grey frame (R3): 1.3 m columns, one 0.9 × 0.8 m floor-edge beam per face per level (no interior along-z beams), joint blocks every other level on the front/back columns, front/back guide rails (rack teeth every 4 m, cyan strips) at every column line, white runway beams 7.5 m cantilevered at the front and 2 m at the back, two ground tracks (gauge 7.2 m), paving plinth | `cx=0, cz=0, y0=0, cols=3, rows=2, levels=10, cell=12, floor_h=4, col=1.3, ground_tracks=(-12, 12), gauge=7.2` | frame, joint, rail, white, teal, dark, cyan, paving |
| `ring_doorways` | cylindrical glass wall with two 2.5 m doorways on ±x: amber door frame, white canopy, threshold, a resident at each door | `radius, y0, y1, cx=0, cz=0` | glass, white, amber |
| `limb` | tapered round tube along a 3D polyline: struts, arches, stems; `flat` < 1 squashes the section into a flat limb or rail | `acc, pts, r0, r1, n=8, flat=1` (writes one accumulator) | any |
| `branch_strut` | white organic tree strut: one curved trunk per base (a list of bases grabs a column side and a beam underside) meeting at a knuckled fork, one limb per tip (3–5) and a second-order twig per limb; R3 `web` adds smooth webbing between limbs near the fork, `pads` turns each foot into a round disc on its member face; R4 `fork` places the fork (e.g. out in front of the pod so forks and webs stay visible), `web_k` scales the webbing | `base, tips, r=.32, role='white', twigs=True, web=False, pads=None, limb_r=.6, flat=1` | white |
| `egg_pod` | glossy pastel egg pod with an oval window (white rim and reveal), +x porthole, warm lit lining, floor and a small lounge with a resident; front −z. R3 options: window size and upward tilt, slim rim, curved glazing bars, porthole drawn on the shell, a side oval window, and a lit back wall (rug, plant, pendant from 6 m, bookshelf from 8 m) | `x, y, z, length=8, height=4.4, depth=5, yaw=0, shell='pod_y'` (`pod_p` pink, `pod_s` sage), `furnish_pod=True`, `ni=48`, `win=(58, 34)`, `tilt=0`, `rim=.13`, `mullions=0`, `port=.14` (or `('L', f)`), `side_port=False`, `back_wall=False`; R3 tower pod ≈ 3.9k tris average | shell, pod_in, white, glass, pane_w, floor + kit props |
| `grid_frame` | open concrete grid: square columns, perimeter beam ring per column line per level, 0.45 m slabs, paving plinth, optional board-form joint strips; R3 adds a second concrete shade at random (`alt`), 4 cm form-tie holes 2 × 2 per board on outer faces (`ties`) and node bands at beam joints (`nodes`); returns `(xs, zs, slab tops)` | `cx=0, cz=0, y0=0, cols=5, rows=4, levels=7, cell=7, floor_h=4.5, col=1.1, beam=.85, role='concrete', beam_w=None, joint=None, joint_step=1.5, joint_w=.04, alt=None, ties=None, nodes=False` (35 × 28 × 31.5 m) | concrete, concrete_j, paving (+ alt, ties roles) |
| `roof_farm` | rooftop farm: beds with crops and fruit, planted edge trough, hoop vine tunnels (3.2 m), optional perimeter hoop tunnel, farming residents; R3 options for a pale crop leaf, dark metal hoops with more tufts and a canopy, spilling edge plants, flower dots and no trough (farm floors inside railings); R4 `cards` makes every plant a `leaf_clump` (crops as upright rosettes, hoop and canopy leaves hanging) and spill plants `leaf_strand`s | `cx, cz, y, w, d, arbors=4, people=4, density=1, crops=1, ring=False, bed='wood', soil='soil', leaf=None, hoop='white', tufts=5, canopy=False, spill=0, flowers=(), hoop_step=2.3, edges=True, cards=False` | soil, wood, green, leaf_l, crop, concrete, white + person |
| `ell` | closed ellipsoid (UV sphere) with any three semi-axis vectors: webbing, leaf ribbons, rungs, mounds | `acc, c, ax, ay, az, n=10, m=6` | any |
| `disc` | round pad of radius r and thickness t on an axis: strut feet, joint plates, planter trays | `acc, c, nrm, r, t, n=16` | any |
| `bone_arm` | flat perforated white "bone" arm from p0 to p1: plate w wide, t thick, bowed up, with oval holes between two flat rails and a joint disc at each end; hooks a column top over a pod crown; R4 `solid` lofts one smooth dog-bone plate with dark oval recesses (`hole_role`) instead of rails and rungs, so it never reads as a chain | `p0, p1, w=1.0, t=.3, holes=3, sag=.12, up=(0, 1, 0), role='white', solid=False, hole_role='concrete_t'` | white |
| `vine_curtain` | hanging vine curtain from a beam edge: strands of 2–3 flat leaf ribbons every `step` m, optional flower dots, `skip(x, z)` to keep strands short over pods; R4 `cards` makes each strand a `leaf_strand` | `a, b, y, out, length=(1.5, 3), step=1, role='leaf_l', flowers=(), fl=.3, skip=None, cards=False` | given leaf and flower roles |
| `arch_shell` | white half-egg entrance hood: an arched vault standing on the facade plane, reaching out and tapering, with a lit inner face and a front rim | `c, out, span=5.5, rise=4, reach=2, t=.4, role='white', inner='pane_w', n=14` | white, pane_w |
| `flower_bed` | low rounded grass mound along a direction, dotted with flowers, with small round trees; R4 `cards`: leaf_clump shrubs and `leafy_tree` trees | `c, along, length, width=1.3, grass='leaf_l', flowers=('white',), trees=1, cards=False` | given roles + kit tree_round_s |
| `leaf_card` | one leaf: a folded diamond (2 tris) from a base point along a direction, midrib curled toward `out`; single-sided, give the role a double-sided material | `acc, p, d, ln, wd, curl=.1, out=None` | the given accumulator |
| `leaf_clump` | foliage clump that reads as leaves, not an ellipsoid: 1–3 irregular sub-clumps with small dark cores, covered by leaf cards that break the silhouette, lower cards drooping (`up=True`: upright rosettes for crops) | `c, r, roles=('leaf_l',), core='green', n=36, size=.24, droop=.35, lobes=3, up=False` | given leaf roles + core role |
| `leafy_tree` | small tree with visible branching: trunk to 55 % of h, 3–4 limbs bending out to leaf_clump crown lobes, plus a top lobe; replaces the kit lollipop trees at close range | `base, h=3, crown=1.4, trunk='wood', roles=('leaf_l', 'green'), core='green', n=70, size=.3, branches=4` | trunk + leaf roles |
| `leaf_strand` | hanging vine strand: thin stem with alternating drooping leaf cards every `step` m, leaning out, optional flower dots | `top, ln, out, role='vine', size=.3, step=.22, flowers=(), fl=.3, sway=.25` | given leaf and flower roles |

*Event shelf (2026-11-13, `feat/sw-event-shelf`, status `draft`; R2/R3 2026-11-13 reshaped both entries):* `event_module` and `lattice_frame` and the roles `frame`, `joint`, `rail`, `teal`, `grey`, `oak`, `cyan`, `paving`, `pane_w`, `pane_a`, `pane_c` (R3 replaced `glow_y/w/c`) enter with the SW event module shelf; lineup `asset/models/event-shelf-2127/review_shelf.py`. They become `accepted` when the owner accepts the SW close-up.

*Pod frame tower (2026-11-17, `feat/pod-frame-tower`, status `draft`):* `limb`, `branch_strut`, `egg_pod`, `grid_frame`, `roof_farm` and the roles `concrete`, `concrete_j` (R2), `pod_y`, `pod_p`, `pod_s`, `pod_in`, `soil`, `leaf_l`, `crop` enter with the owner's pod-frame image (placed 2026-11-19 as question-rotation Q06-B; R2 2026-11-17 reshaped the frame, struts, roof farm and pod colours; R3 2026-11-18 added `ell`, `disc`, `bone_arm`, `vine_curtain`, `arch_shell`, `flower_bed` and options on the five R1 modules; build-only roles `concrete_b`, `concrete_t`, `leaf_c`, `vine`, `arch`, `flower_v` live in `build_pod_tower.py`; R4 2026-11-18 added `leaf_card`, `leaf_clump`, `leafy_tree`, `leaf_strand`, card-foliage options and a solid `bone_arm`, plus build-only role `shop`); lineup `asset/models/pod-frame-tower-2127/review_pod_tower.py`.

**Recipe `modules.ROLES`** (`accepted` 2026-11-13, SE R4/R5, polish 1): warm interior glow seen through 10 % glass, warm amber-cream floors instead of glowing salmon planes, and residents in saturated clothing so they read as people, not silhouettes, by day and night. On `feat/se-stage-closeup-polish`, SE `build_district.py` takes its `district_*` materials from this recipe. Reuse it for any lit habitable interior before you tune a new one.

## Shared geometry — `geo_helpers.py`

Low-level primitives every builder uses: `Acc`, `obox`, `cyl`, `tube`, `sweep`, `blob`, `plane`, `circle_pts`, `rrect_pts`, `ring_section`, `rot`, `yawed`, `material`, `finish_mesh`. Add a primitive here only when a second builder needs it.

## Folders under `asset/models/`

Whole assets. Reuse a site asset elsewhere only as background context, and ask the owner first.

| Folder | Kind | Builder | Reuse |
| --- | --- | --- | --- |
| `city-kit-2127` | props + modules (above) | `build_kit.py`, `modules.py` | everywhere |
| `car-family-2127` | street pod, human-driven car | `build_car.py` | traffic anywhere |
| `vehicle-refs-2127` | four vehicles from the owner's `references/*.png`: `personal-trike` (1.40 × 2.13 × 1.65 m), `tandem-ev` (1.41 × 3.65 × 1.47), `autonomous-shuttle` (2.04 × 4.65 × 2.70, sliding door closed by default: separate `shuttle_door` object flush in its opening), `amphibious-shuttle` (2.40 × 6.58 × 3.45); one `.blend`/`.glb`/`.png` each; real metres, ground z 0, nose -Y Blender (+z three.js), `car_*` roles; 24–46k tris, not budgeted (draft, not placed) | `build_vehicles.py` (reuses no builder; own primitives); check `review_vehicles.py -- <out.png>` | traffic, transit, waterfront, once picked |
| `bay-flower-receiver` | Q02-B space-solar receiver from the owner's PDF p.3 (`references/q02-b.jpg`): floating lotus of 46 cupped petals with tapered roots in three rings, opened about their hinges by `OPEN` (outer 3°, middle 16.5°, inner 30°) with alternate petals ±2.5° (`LAYER`) so each ring lies in two layers without crossing (inner face: blue-grey receiver panels with 6 px silver cell frames, the material-round-1 grid restored by the owner 2026-11-18, from two packed 256 px textures, base colour + metallic-roughness; outer guard plates silver-white from a packed 512 px plate texture: 2 × 2 plates of slightly different silver-greys, grooved seams with lit and shaded edges, fastener dots. Each petal also has a low matte-silver spine rib and a blue-grey root shoe with four bolts on its hinge seat; silver rims). Under every petal: a hinge seat (plate, column, cheek plates, dark pin) and two diagonal support arms (deck mount, dark hydraulic sleeve, silver rod, head block); ring beams and a laced ring truss tie them to a 52.5 m pontoon of 24 segments (seam texture, joint pilasters, deck mounts, one cyan light each). Bright silver-blue central dome with a receiver aperture, sitting on a serviceable receiver base. The base has a thick bevelled silver bearing ring carried by 16 diagonal braces (base plates and shoes) and blue-grey collar bands. Its 8 equipment bays alternate dark louvred grilles recessed 0.7 m with silver access covers split by 8 cm seams. A railed service walkway runs round the base, and a three-pipe flanged junction toward the shore duct leads to a deck manifold, with the cyan lights clustered there. a glass sub-sea stem. From the stem, an opaque cyan-blue duct (r 1.5 m, joint collars about every 7 m and at the two drop elbows, dark seams between them) runs over the bay floor to the shore, bends along the shore under the water, climbs past the platform end and runs level into the machine room's arched front, which faces along the shore. There it enters through a portal with a three-layer bolted flange and saddles. The machine room has a silver-white arched roof whose solid bays alternate with translucent skylight bays. The silver ribs bear on column capitals, with brackets out to their eave legs and eave fascias. Each side elevation runs, from the pipe end, a deep-framed big window with mullions and a transom, a framed blue-grey service door with a handle, and two louvred plant bays. Under each big window a recessed louvred service hatch sits at the cabinet end, with clean wall toward the pipe-end corner. Warm-white seamed wall panels stand on a dark blue-grey skirting all round, with column feet below. Colours: matte silver ribs, dark blue-grey frames, louvres and skirting, pale-cyan glass, cyan pipes. Behind the windows, branch take-offs from the trunk carry gate valves and floor flanges, with control cabinets set back behind them; standing pipe sets and tanks sit further in. It sits on a floor plate, with service steps up to both side doors, on a short platform off the promenade: light-grey 1.2 m paving tiles, a coping kerb with a dark drip fascia, a slim rail and low bollard lights on the water edges (open where the duct drops), a small planter with a tree on the promenade side, and a three-row rock revetment; ≈ 123 m across, 42 m tall without the beam; real metres, waterline y 0, origin at the flower centre, shore station to −x/+z; nodes `Q02B_Receiver`, `Q02B_SubseaLink`, `Q02B_ShoreStation`, `Q02B_LightBeam` (beam to 900 m, hide or remove on its own); the shore station (platform, rocks, machine room) and the duct's shore run stand `SHORE_DY` −0.88 m lower than the flower's waterline, so the paving meets the city promenade (0.61 m above the bay), and a 1.5 m paving apron (`PLAT_APRON`) runs landward onto it; two deliverables, `bay-flower-receiver` with the beam (94,119 tris, beam 816) and `bay-flower-receiver-nobeam` without it (93,303 tris), not budgeted; placed by `src/bayFlower.ts` at (−712, 300) (placement R2: version4 shows only the shore station; DEV `?bayFlower=1` shows the flower) | `build_flower.py` (uses `geo_helpers`); check `review_flower.py -- <out_dir> [--cam ref|close|root|dome|water|waterzoom|junction|shore|front|side|petal|platform|top] [--blend <file>]` (beam / no beam / clay / reference comparison; one shared sun) | site-only landmark; the pavilion and duct may move with the shoreline |
| `train-2127` | guideway train | `build_train.py` | guideway only |
| `future-tree-2127` | landmark tree (catalog `prop`) | imported GLB | any planted deck |
| `resident-minato` | named character Minato (1.70 m, 20 rigid nodes, built with `build_nagi.Part`) | `build_minato.py`; review `review_minato.py` | resident scenes |
| `resident-aoi` | named Weather Library resident (1.71 m, rigid hands and arms) | [build_aoi.py](resident-aoi/build_aoi.py); [three-angle lineup](../../artifacts/resident-aoi/character.jpg) | DEV scene candidate |
| `resident-nagi` | named character Nagi (2.0 m, 20 rigid nodes, sit / phone / walk recipes in `review_nagi.py`) | `build_nagi.py`; lineup `review_nagi.py` | resident scenes (draft, awaiting owner review) |
| `resident-kiosk` | Minato's service kiosk | `build_kiosk.py` | Minato's scene |
| `concentration-tower-high` | SE +1 tower shell | `build_tower.py` | site-only |
| `se-district-2127` | SE stage towers and pods (six variants) | `build_district.py` (uses modules) | site-only shells; parts come from modules |
| `automation-hub-upper` | automation hub upper level | imported GLB | site-only |
| `sky-ring-architecture` | Sky Ring | imported GLB | site-only |
| `rectenna-farm-canopy` | rectenna canopy over terrace farm (Q3 large receiver) | `export_glb.py` text inside the .blend | site-only |
| `q02a-hydro-terrace` | Q02-A facility (image `Q02-A_imag_v2`): old substation straddled by four offset pumped-storage water-terrace pools with waterfalls, 7.6 m turbine wheels and generator houses, sunken basin and weir to the sea; 64.8 × 65.1 m, 32.2 m above ground (basin/sea to −3.4 m), origin ground centre, front −Y Blender (+z three.js), sea +X; ≈ 300k tris, 23 materials; GLB is static with flat colours, procedural water and wheel rotation live only in the .blend (draft; R1 places it as fixed background on the west-shore sea at (−375, −170), `src/hydroTerrace.ts`, which drops its `q02a_sea` strip at load) | `build_hydro_terrace.py` (own primitives, no kit) | site-only |
| `pod-frame-tower-2127` | Pod frame tower from the owner image (2026-11-17): 35 × 28 m concrete grid (1.45 m columns), ground + 6 floors of 4.5 m, roof farm with perimeter arbors to ≈ 35 m, 26 egg pods (cream, pink, sage) up to 13.5 m long, nine seated in front bays, all on webbed branching struts, five with bone arms, reaching ≈ 6 m past the frame; farmed levels 5–6, vine curtains, entrance hoods; front −z, ≈ 347k tris (draft R4; placed 2026-11-19 on the retired housing U lot, `POD_TOWER` in `src/layout.ts`, question-rotation Q06-B) | `build_pod_tower.py` (uses modules `grid_frame`, `glass_room`, `egg_pod`, `branch_strut`, `bone_arm`, `roof_farm`, `vine_curtain`, `arch_shell`, `flower_bed`, `leaf_clump`, `leafy_tree`, `leaf_strand`); review `review_pod_tower.py` | site-only massing; pods and frame are modules |
| `event-shelf-2127` | SW mixed flagship: 36 × 24 × 40 m lattice (`SHELF_FRAME`) and seven rounded event modules `MOD_A..F, MOD_H` (draft, placed on the SW south-shore lot) | `build_shelf.py` (uses modules `lattice_frame`, `event_module`); lineup `review_shelf.py` | site-only frame; modules reusable as event rooms |
| `drawer-housing-2127` | Five-storey Q03-A drawer housing with two projecting vehicle drawers (49.25 × 25.465 × 30.073 m) | [Blender source](drawer-housing-2127/drawer-housing-2127.blend), [city lineup](../../artifacts/change-review/index.html#drawer-housing) | site-only at A, static pending vote design |
| `q08c-housing-tower-2127` | Q08-C redo (2026-11-21) from the owner's 8C image (`.dream-loop/q08c/target.png`): the 8C boat-room tower's frame (8 × 3 bays of 6 m, 48 × 18 m; 6 m arcaded ground, seven 5 m levels, roof 41 m, delivery rail at 46 m on arched loops with a glass canopy) filled by a seeded draw (`layout.py`, default seed 2127) with five house pods: `ellipse_view` (white shell, 3 × 2.5 m elliptical window in a deep champagne frame, through-wall portholes, brow, viewing balcony, sofa + floor lamp), `rib_vault` (pink glass barrel vault on proud white ribs, gridded portal, dining table), `stepped_terrace` (back block, glazed living step with an upper deck, lower terrace with rail, planters, bench), `glass_garden` (living box + blue curved-glass winter garden with tree and café table), `folded_roof` (asymmetric folded slate roof, slit / square / balcony-door windows, recessed entrance, small balcony). House contract in `houses.py`: origin = bay centre at the corridor edge on the slab top, view +z, entrance on −z onto the corridor, \|x\| ≤ 2.2, height ≤ 3.8, projection ≤ 8.4 m on beam-face brackets; repeated types share one mesh. 57 houses + one hanging under the rail at the delivery bay, 6 pocket gardens, double-height and single-height sky gardens, side public terraces, glass lift lobby, U corridor. Real metres, origin ground centre, front −Y Blender (+z three.js), 58.7 × 32.2 × 49.2 m; 195,584 tris expanded per placed instance in the reimported GLB (houses 148,416; commons 21,036; frame 20,364; rail 5,148; trolley + spreader 620), 43 materials, no textures; owner budget < 200k (2026-11-21; the 269,528-tri first version is kept in the evidence folder) (draft, model only, not placed) | `build_housing_tower.py [-- --seed N --out DIR]` (uses `geo_helpers`, modules `kit_prop`, `person`, `seated_person`, `leafy_tree`, `limb`, `ROLES`; kit props sofa, floor_lamp, rug, potted_plant, meeting_table, pendant_lamp, kitchen_counter, planter_1m, bench, bookshelf, tree_indoor, cafe_set, desk_monitor, chair_office, lift_cabin, shrub_cluster); reviews `review_houses.py`, `review_tower.py`; checks `check_glb.py`, `python test_layout.py`; sheets `sheet.py` | site-only frame; the five pods could become kit modules once accepted |
| `odaiba-masterplan` | district environment | `odaiba_masterplan_v01_phase03d_generator.py` | site-only |
| `aqua-city-odaiba` | landmark context | imported GLB | context |
| `decks-tokyo-beach` | landmark context | imported GLB | context |
| `divercity-office-tower` | landmark context | imported GLB | context |
| `divercity-tokyo-plaza` | landmark context | imported GLB | context |
| `fuji-tv` | landmark context | imported GLB | context |
| `grand-nikko-tokyo-daiba` | landmark context | imported GLB | context |
| `hilton-tokyo-odaiba` | landmark context | imported GLB | context |
| `telecom-center` | landmark context | imported GLB | context |
