# Asset library — reusable 3D parts index

- Owner: cc100053 (owner accepts library entries from lineups). Implementation: Claude.
- Status: INTEGRATED (2026-11-13, owner instruction "Merge 入 main"). The SE modules stay `draft` until the owner accepts them from the lineup.
- Branch: `feat/asset-library`
- Base commit: `056ce514a99587798756bcfcf2a74463e7b81cf5`
- Last verified commit: `8653e54` (branch). Merged into main as `e1388bd`, with a tree identical to `8653e54`.
- Remote availability: `origin/main` `e1388bd`, `origin/feat/asset-library` `8653e54`

## Session Git state

- 2026-11-13. The session started on `main` `056ce51` in the owner's checkout. It holds unrelated uncommitted docs, Blender skills and screenshots, all preserved. The work ran in an independent clone, `~/city2127-library`.
- Fetch succeeded. `main...origin/main` 0/0.
- `docs/README.md` and `docs/BLENDER.md` were deliberately not edited, because the owner's checkout has uncommitted changes to both. Add a library row to the docs index once those land.

## Goal and acceptance criteria

The owner observed (2026-11-13) that agents re-model parts already polished. Codex's SE tower+pod R1–R3 took ≈ 100 M input tokens (orchestrator) and ≈ 78 M (Terra). Furniture, residents, lit rooms and lifts were rebuilt by hand while `city-kit-2127` sat unused until R5.

Rules adopted:

1. One index (`asset/models/LIBRARY.md`) of props, modules, material recipes and model folders, with sizes, parameters, usage and lineups.
2. Every element is routed reuse / extend / new entry / site-only. A new reusable element enters the library to a fixed contract before a site places it.
3. Pointers lead to the index from AGENTS.md, PROJECT and the polish skills.
4. A test fails when code and index drift.

## Completed work

- `asset/models/LIBRARY.md`: decision routes, entry contract, 23 props with measured sizes, tris and materials, 7 modules, the `modules.ROLES` recipe, `geo_helpers` and 18 model folders.
- `asset/models/city-kit-2127/modules.py`: `kit_prop`, `person`, `seated_person`, `furnish` (`Rect`, `Ring`), `glass_room`, `glass_lift` and `ring_doorways`, with the `MODULES` registry and the `ROLES` recipe. These were extracted from the SE R5 builder (`feat/se-stage-closeup-polish` `0f9afde`). `ring_doorways` gained `cx`/`cz`, and its threshold and resident heights are now relative to `y0`.
- `review_modules.py` renders the modules lineup. The lineups are published as `artifacts/asset-library/{modules,kit}-lineup.jpg`.
- `tests/assetLibrary.test.ts` (in `npm test`) checks that `PROPS`, `MODULES` and `asset/models/*` folders equal the index rows, and that every index link resolves.
- Pointers: AGENTS.md (one line), `docs/PROJECT.md`, and the `closeup-polish` skill: spec `## Library` table, round builds new entries first, lineup sent with scores, Blender route "Library first". The `polish-ladder` and `resident-scene` skills got one line each. `.gitignore` now ignores `__pycache__/`.

## Actual validation results

- Verification status: PASSED for the scope above.
- Equivalence: an adapted copy of the R5 builder calling `modules.py` was built in Blender 5.2 headless against the original. All six variants and 62,766 vertices matched. The faces are identical, and the maximum vertex delta is 1.1e-16 m, from the float noise of `.7 + .09`.
- The test fails as intended on an unindexed folder (`fake-x`) and an unregistered module (`ghost`).
- Merged main `e1388bd`: root `npm test`, `npm run build` and `git diff --check` re-run, all PASS. Main CI run 43350884050 on `e1388bd`: success.
- Root `npm test` PASS, `npm run build` PASS, `git diff --check` PASS, `scripts/check-artifacts.sh origin/main` PASS.
- No runtime code changed, so there was no browser check. `survey/` and `module-swap/` are untouched.

## Unresolved issues and next step

- **SE branch adoption** (Codex/Terra task, not done here): when `feat/se-stage-closeup-polish` integrates, replace the builder closures with `modules.py` calls. Mapping: `room`→`glass_room`, `lift`→`glass_lift`, `entrance_glass`→`ring_doorways`, `Rect/Ring/furnish/person/seated_person` the same, with role keys mapped from `district_*`. Add a `se-district-2127` folder row, or `tests/assetLibrary.test.ts` fails. Also drop its committed `__pycache__/*.pyc`.
- Owner: review `modules-lineup.jpg` and the `ROLES` recipe, then mark modules `accepted`.
- Not done (suggested separately): token savings in the polish loop. These are a fresh implementer per round, fewer judges in middle rounds, and persistent clone directories.

## Module polish 1 — 2026-11-13

On owner instruction ("模組要再Polish"), the modules were polished against the owner-picked SE stage targets (`artifacts/se-stage-closeup-polish/target/`). The changes were iterated on `feat/se-stage-closeup-polish` (the only consumer). The library files were applied to main from that branch's `20ae829`, which also carries the SE district rebuild; the SE parts stay on the branch.

- `person`/`seated_person`: slimmer ≈ 1.78 m figure with shoes, slimmer arms, and a narrower head under a tapered hair cap (it used to read as a hat).
- `glass_room`: thinner mullions, a planted trough inside each glass wall of sides ≥ 5 m (`planters=True`), an amber slab-edge line (`edge=True`), and area-based furnishing of ≈ 1 vignette per 16 m² (3–12; 6 above 8 m).
- `glass_lift`: the capsule has an amber frame (rims and corner posts) and a lit back panel, and carries two riders facing −z.
- `ring_doorways`: amber door frames and a white canopy over each door.
- Recipe `ROLES`: `glass` alpha .16 → .10. `floor` is now warm amber-cream `(.88,.68,.44)` with emission `(1,.6,.26)` × .8, instead of glowing salmon `(.46,.30,.19)` with emission `(.62,.28,.10)` × 1.6.
- `review_modules.py`: added `--eevee` (real glass, glow and sun; camera faces the −z side the lift cabins face) and `MODDIR` for old/new comparison. The lineup was republished.
- Verification: see the SE handoff "Module polish 1". The lineup was reviewed against the old modules (EEVEE). Status stays `draft` until the owner accepts.
