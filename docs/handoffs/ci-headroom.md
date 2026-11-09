# ci-headroom — Root CI test runtime headroom

- Owner: cc100053
- Status: DONE
- Branch: test/odaiba-ci-headroom
- Base commit: 520cd036260a01f8df3b6c384e757cd91a921f13
- Last verified commit: see the branch tip that carries this handoff
- Remote availability: origin/test/odaiba-ci-headroom

## Session Git state

- Session starting branch and HEAD: claude/nervous-kalam-a45126 at 520cd036260a01f8df3b6c384e757cd91a921f13
- Last fetched origin/main commit: 520cd036260a01f8df3b6c384e757cd91a921f13 (2026-11-10)
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED (branch from up-to-date main)
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Main CI run 42613769184 was cancelled at the 15 min job timeout inside `tests/odaiba.test.ts` and passed only on rerun. Make root CI pass with clear headroom (target under ~10 min total) without weakening any check or changing city behaviour.

## In-scope files and dependencies

`tests/odaiba.test.ts` (street-car clearance block only), `docs/VALIDATION.md`. No `src/` change, no CI timeout change.

## Completed work

Timing per section of `tests/odaiba.test.ts` (local, Node 26): the street-car clearance sweep took ~207 s of ~245 s; the housing H2 city check took ~12 s. Cause: three's `InstancedMesh.raycast` tests every instance whenever the ray meets the whole mesh's bounding sphere, and the street kit's bushes/leaves/cypress (~6,700 instances) span every street, so each of ~240k 0.3 m probes looped all of them. The sweep now expands instances into stand-in meshes (same geometry, material, name, world matrix) and files every solid in 8 m cells by world bounds + 0.5 m; each probe casts only against its cell's list. Probe positions, directions, heights, the 0.3 m reach and the ground filter are unchanged.

## Actual validation results

- Verification status: PASSED (local); branch CI see below
- Equivalence: one-off scratch comparison (not committed) of the grid cast against `intersectObjects(solids, true)` on every 7th probe — 20,823 probes, identical names and distances; repeated at 3 m reach with 3.5 m padding, 986 probes with hits, all identical.
- `node --experimental-strip-types tests/odaiba.test.ts`: ~245 s → ~45 s, PASS.
- Root `npm test` PASS in 2 min 58 s locally (2026-11-10, Node 26, Mac); `npm run build` PASS; `git diff --check` PASS.

## Unresolved issues and next step

None for this task. If CI nears the limit again, re-time sections with `performance.now()` markers before raising `timeout-minutes`.
