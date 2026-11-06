# skyring-closeup-polish — Blender Sky Ring target study

- Owner: Codex (implementation); visual acceptance: project owner
- Status: IN_PROGRESS
- Branch: `feat/skyring-closeup-polish` (isolated clone `/private/tmp/city2127-skyring-polish`)
- Base commit: `cbc58cca32d11f44b2e03e71fb2bf5c71d2949c8`
- Last verified commit: NONE
- Remote availability: NOT PUSHED

## Session Git state

- Starting checkout: `main` at `304084d58a9541a2dde5d63f2820d01b60d6654b`, 21 commits behind fetched `origin/main`; no local-only commits.
- Origin fetch succeeded 2026-11-06; `origin/main` was `cbc58cca32d11f44b2e03e71fb2bf5c71d2949c8`.
- Original checkout contains unrelated modified and untracked files; preserved. New clean isolated clone checked out at fetched origin/main.
- Existing work: `docs/handoffs/hero-sky-ring.md`, accepted R5, integrated; its target images remain in `~/city2127-evidence/hero-sky-ring/polish/target/`.

## Goal and decisions

Use Blender to improve the Sky Ring against the owner's existing target images, preserving the production explore pod and voice count behavior. On 2026-11-06 the owner chose to enlarge the berth toward the target and to prefer the thick segmented pylon in the truss target over the conflicting thin pylon target. Visual acceptance remains with the owner.

## In-scope files and dependencies

`src/skyRing.ts`, its consumers and tests, authored Blender source/export where needed, corresponding documentation. Existing ring is procedural; `berthPark` and `guestExplore` use the moving explore pod, and voices follow guest count. Maintain the ring location and clearances.

## Completed work

- Fetched remote references; created isolated task clone. Four historical owner-selected targets located outside Git.
- Blender 5.2.2 LTS starts successfully outside the sandbox; Metal GPU Apple M6. Its MCP server was not listening. Background Blender inside sandbox exited 139.
- Historical target and R5 captures compared; live baseline capture pending.

## Actual validation results

- Verification status: NOT RUN; no implementation yet.
- Blender background environment report: PASS outside sandbox. Runtime, geometry QA, build, test, browser and FPS: NOT RUN.
- Integrated commit and checks: NOT INTEGRATED.

## Known issues and next expected step

Capture current origin/main baseline at berth, truss and voice review poses; prepare image-based rubric and a complete Blender/runtime design before modeling. Truss and pylon targets disagree; owner chose the truss image. Do not treat historical R5 validation as validation of this task.
