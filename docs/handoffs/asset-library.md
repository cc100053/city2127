# Asset library — reusable 3D parts index

- Owner: cc100053 (owner accepts library entries from lineups). Implementation: Claude.
- Status: IN_PROGRESS. The index, enforcement test and workflow pointers are done. The SE modules are `draft` until the owner accepts the SE stage round.
- Branch: `feat/asset-library`
- Base commit: `056ce514a99587798756bcfcf2a74463e7b81cf5`
- Last verified commit: the branch head that carries this handoff (checks below ran on its tree).
- Remote availability: `origin/feat/asset-library`

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
- Root `npm test` PASS, `npm run build` PASS, `git diff --check` PASS, `scripts/check-artifacts.sh origin/main` PASS.
- No runtime code changed, so there was no browser check. `survey/` and `module-swap/` are untouched.

## Unresolved issues and next step

- **SE branch adoption** (Codex/Terra task, not done here): when `feat/se-stage-closeup-polish` integrates, replace the builder closures with `modules.py` calls. Mapping: `room`→`glass_room`, `lift`→`glass_lift`, `entrance_glass`→`ring_doorways`, `Rect/Ring/furnish/person/seated_person` the same, with role keys mapped from `district_*`. Add a `se-district-2127` folder row, or `tests/assetLibrary.test.ts` fails. Also drop its committed `__pycache__/*.pyc`.
- Owner: review `modules-lineup.jpg` and the `ROLES` recipe, then mark modules `accepted`.
- Not done (suggested separately): token savings in the polish loop. These are a fresh implementer per round, fewer judges in middle rounds, and persistent clone directories.
