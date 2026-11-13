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
| `ring_doorways` | cylindrical glass wall with two 2.5 m doorways on ±x: amber door frame, white canopy, threshold, a resident at each door | `radius, y0, y1, cx=0, cz=0` | glass, white, amber |

**Recipe `modules.ROLES`** (`accepted` 2026-11-13, SE R4/R5, polish 1): warm interior glow seen through 10 % glass, warm amber-cream floors instead of glowing salmon planes, and residents in saturated clothing so they read as people, not silhouettes, by day and night. On `feat/se-stage-closeup-polish`, SE `build_district.py` takes its `district_*` materials from this recipe. Reuse it for any lit habitable interior before you tune a new one.

## Shared geometry — `geo_helpers.py`

Low-level primitives every builder uses: `Acc`, `obox`, `cyl`, `tube`, `sweep`, `blob`, `plane`, `circle_pts`, `rrect_pts`, `ring_section`, `rot`, `yawed`, `material`, `finish_mesh`. Add a primitive here only when a second builder needs it.

## Folders under `asset/models/`

Whole assets. Reuse a site asset elsewhere only as background context, and ask the owner first.

| Folder | Kind | Builder | Reuse |
| --- | --- | --- | --- |
| `city-kit-2127` | props + modules (above) | `build_kit.py`, `modules.py` | everywhere |
| `car-family-2127` | street pod, human-driven car | `build_car.py` | traffic anywhere |
| `train-2127` | guideway train | `build_train.py` | guideway only |
| `future-tree-2127` | landmark tree (catalog `prop`) | imported GLB | any planted deck |
| `resident-minato` | named character Minato | `build_minato.py` | resident scenes |
| `resident-kiosk` | Minato's service kiosk | `build_kiosk.py` | Minato's scene |
| `concentration-tower-high` | SE +1 tower shell | `build_tower.py` | site-only |
| `se-district-2127` | SE stage towers and pods (six variants) | `build_district.py` (uses modules) | site-only shells; parts come from modules |
| `automation-hub-upper` | automation hub upper level | imported GLB | site-only |
| `sky-ring-architecture` | Sky Ring | imported GLB | site-only |
| `rectenna-farm-canopy` | rectenna canopy over terrace farm (draft, not placed) | `export_glb.py` text inside the .blend | site-only |
| `odaiba-masterplan` | district environment | `odaiba_masterplan_v01_phase03d_generator.py` | site-only |
| `aqua-city-odaiba` | landmark context | imported GLB | context |
| `decks-tokyo-beach` | landmark context | imported GLB | context |
| `divercity-office-tower` | landmark context | imported GLB | context |
| `divercity-tokyo-plaza` | landmark context | imported GLB | context |
| `fuji-tv` | landmark context | imported GLB | context |
| `grand-nikko-tokyo-daiba` | landmark context | imported GLB | context |
| `hilton-tokyo-odaiba` | landmark context | imported GLB | context |
| `telecom-center` | landmark context | imported GLB | context |
