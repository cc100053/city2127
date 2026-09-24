# AI agent workflow

This repository is **2127 — Frozen Intersection**, an exhibition project for collectively shaping a futuristic Shibuya. It holds the root procedural Three.js Shibuya prototype (`src/`) and the causal choice → city MVP (`survey/` server + `module-swap/` viewer). Read [README.md](README.md), then [docs/PROJECT.md](docs/PROJECT.md) before changing behavior. Use [docs/VALIDATION.md](docs/VALIDATION.md) to verify changes and hand off work.

## Working agreement

- Reply to the user in Traditional Chinese; natural Cantonese is welcome. Keep existing English/Japanese product copy unless localization is requested.
- Desktop presentation only: responsive/mobile adaptation is not required (user decision, 2026-09-17). Do not add responsive layouts, adaptive camera framing or mobile acceptance checks unless explicitly requested. Keep ordinary renderer resize handling.
- Follow the latest user request. Version 2 explicitly allows pedestrians, cars, drones and aerial routes; the original “no characters/NPCs” restriction is superseded for these ambient actors.
- Current product direction (2026-09-18): guests collectively shape a futuristic Shibuya at an exhibition. Each guest answers one question; the next guest continues with the next question. City changes accumulate across guests, and each guest sees the visual change immediately when their experience ends. Prioritize future identity, readable choice effects and continuity over documentary realism.
- Next direction (user decision, 2026-09-24): the exhibition city is the root Shibuya scene (`src/`). Build and extend that scene first — more areas and city objects, visibly changeable city, polished look — and add more questions to the causal MVP. Connecting the survey to the root scene comes after; module-swap's four-lot viewer proves the causal chain but is not the target city. Visual polish is in scope, but it serves readable change rather than replacing it.
- Preserve the single Shibuya setting and desktop presentation scope. Plan 02 architecture, daylight and asset/pic2.png remain visual references, not the product's primary acceptance gate. The automatic day cycle (three moods over a three-minute day), fixed building geometry and the 10-second survey blend describe the current prototype only; they must not prohibit future choice-driven building counts or density. The causal MVP implements its own question JSON, policy → layout mapping (`deriveCityLayout`), SQLite persistence and admin reset; these are MVP mechanisms, not final exhibition rules. Exhibition question content, exhibition-day reset/recovery policy, input hardware and changes to the root `src/` presets still need an explicitly assigned task. Keep existing behavior outside an assigned scope.
- Trace the changed code and its callers before editing. Reuse existing factories, materials and instancing; prefer Three.js/native features over new dependencies.
- Make the smallest complete change. Avoid speculative abstractions, broad formatting rewrites, extra frameworks or infrastructure. Document a deliberate shortcut with a `ponytail:` comment only when it has a real limitation.
- Work in this task. Do not spawn agents unless the user or applicable instructions explicitly request delegation.
- Do not introduce deployment, backend services or external asset packs as incidental work. A debug log does not establish a Firebase deployment configuration.

## Start and finish

Startup (mandatory preflight, every session):

1. Confirm the workspace is the `city2127` repository before running anything else.
2. Inspect branch, HEAD, working tree and diff; preserve unrelated work and screenshots.
3. Fetch the latest remote references so local knowledge of `origin/main` is current.
4. Identify whether the local branch and its remote counterpart have diverged, and record what you found.
5. Read this file and the relevant task-specific [handoff](docs/handoffs/TEMPLATE.md). Confirm one named owner and coordinate overlapping module or binary-asset edits before starting. Primary ownership areas guide coordination, but contributors may work across areas.
   For Blender work, also read [docs/BLENDER.md](docs/BLENDER.md): Mac/Windows MCP setup is per workstation, and a successful check on one collaborator's machine does not verify another's.
6. Compare the handoff's base and last verified commit with actual code; check whether unfinished commits are available remotely. Do not assume chat history or a previous local clone is available.
7. Read affected source, callers, tests and [architecture documentation](docs/PROJECT.md). For bugs, trace all callers and fix the shared cause.
8. Resume from the next expected step within the assigned scope.

```sh
git status --short --branch      # branch, upstream divergence and dirty files
git rev-parse HEAD               # exact starting commit
git fetch --prune origin         # refresh remote references only
```

Fetching updates remote references only. It does not authorize switching branches, merging, pulling, resetting, stashing or discarding local work. Never automatically discard or overwrite local changes; preserve uncommitted work and coordinate instead.

If the fetch fails, report that remote freshness cannot be verified and record it in the handoff. Do not assume local `main` is current, and do not start a new task from an unverified `main`.

Starting a new task requires a clean working tree and an up-to-date `main`; resuming an existing task branch must not pull or merge `main` automatically. Follow the [Git workflow](docs/CONTRIBUTING.md) for both cases.

Finish:

1. Complete implementation and relevant checks. Add a small runnable check for nontrivial logic. Code changes require `npm test`, `npm run build` and `git diff --check` (in each changed package: root, `survey/`, `module-swap/`); visual/motion changes also require relevant [browser checks](docs/VALIDATION.md). Documentation-only changes need link/fact checks, not rendering tests.
2. Self-review the exact diff, including new files.
3. Apply the documentation sync rules below and update the task handoff.
4. Record actual validation results, verified commit, unresolved issues and next step. Separate implementation completion from verification; never claim unmeasured FPS or an untested platform.
5. Follow the [Git workflow](docs/CONTRIBUTING.md), including validation of the integrated result.

## Documentation sync

Keep documentation aligned with the actual working tree in the same implementation stage as the change. Review the relevant rows below; update only affected documents. If no documentation update is needed, briefly explain why in the stage handoff.

| Change | Documents to review and update |
| --- | --- |
| Module ownership, entry points, call/data flow, rendering pipeline, dependencies, resource lifecycle or architectural constraints | [docs/PROJECT.md](docs/PROJECT.md), the current architecture and implementation map; do not create a duplicate `architecture.md` |
| State behavior, controls, timing, actor counts, routes or supported capabilities | [docs/PROJECT.md](docs/PROJECT.md); [README.md](README.md) when the user-facing summary or instructions change |
| Geometry, landmark relationships, camera, materials, lighting, UI layout or motion | [docs/PROJECT.md](docs/PROJECT.md), [docs/PLAN02.md](docs/PLAN02.md) and the affected checks/evidence in [docs/VALIDATION.md](docs/VALIDATION.md) |
| Setup, runtime requirements, dependencies, scripts or development commands | [README.md](README.md), this file's Commands section and [docs/VALIDATION.md](docs/VALIDATION.md) where commands or checks are affected |
| Tests, acceptance criteria, actual validation results, screenshots, performance measurements or known limitations | [docs/VALIDATION.md](docs/VALIDATION.md); [docs/PLAN02.md](docs/PLAN02.md) when completion status or remaining gaps change |
| Scope, visual direction, priorities, milestones or accepted design decisions | [docs/PLAN02.md](docs/PLAN02.md); [docs/PROJECT.md](docs/PROJECT.md) and this file when project constraints change |
| Agent workflow or approval policy | This file; [docs/VALIDATION.md](docs/VALIDATION.md) if handoff procedures change |

Document implemented behavior separately from proposals and pending approval. Date new evidence and identify the stage it describes; never reuse old test results or screenshots as proof of a new change. Preserve historical Plan 01 notes in [docs/SHIBUYA.md](docs/SHIBUYA.md) and earlier acceptance records; correct factual errors or add a clearly dated superseding note instead of rewriting history. Verify local Markdown links after documentation edits.

## Scope-based autonomy

An explicitly assigned task authorizes relevant inspection, implementation, tests and in-scope fixes, documentation updates, committing and pushing the task's feature branch, self-review, merging after required checks and pushing validated main. No PR or external reviewer is required. Follow [CONTRIBUTING.md](docs/CONTRIBUTING.md) for integration and the asset-only direct-main exception. Explicit task restrictions override these defaults; a documentation task that excludes commits does not authorize them.

Do not independently expand a small task into a major architectural rewrite, change approved product direction, delete important shared assets, rewrite shared Git history, force-push main, deploy or introduce incidental infrastructure. Clarify changed scope before proceeding with work outside the assignment. Routine in-scope implementation, validation and Git steps do not require separate stage approvals.

Each task has one named owner and a repository-based handoff under `docs/handoffs/`. Coordinate overlapping edits before modifying the same module or binary asset. Use independent local clones; worktrees and GitHub Issues are optional, not required. Historical Plan 02 prototype constraints are not permanent exhibition requirements.

## Commands

Use Node.js 24+; this project has been run with Node 26. Tests execute TypeScript directly with Node's type stripping, without a test framework.

```sh
npm ci                       # when dependencies are absent or the lockfile changed
npm run dev -- --port 5173    # loopback-only preview; use the URL Vite actually prints
npm test                     # state timing + mobility/route checks
npm run build                # strict source typecheck + production build
git diff --check             # whitespace in uncommitted changes

cd survey && npm ci && npm test && npm run build                  # survey server package
cd module-swap && npm run install:app && npm test && npm run build  # viewer (test also runs check:models)
```

`survey/` and `module-swap/` are separate npm projects; root `npm test`/`build` does not cover them. Run their checks when they change.

Reuse a running preview if it belongs to this project. If the port is occupied, inspect it or use another port; do not kill unrelated processes. Edit source, not `dist/` or `node_modules/`. There is no configured lint command or deployment workflow. [CI](.github/workflows/ci.yml) uses Node 24 on branch pushes and optional PRs and runs install/test/build for the root, `survey/` and `module-swap/` (since 2026-09-24), plus the diff whitespace check. See [validation](docs/VALIDATION.md) for the committed-diff check and activation status.

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it **before** grep/find or reading files when you need to understand or locate code:

- MCP: `codegraph_explore` returns relevant source and call paths. If deferred, discover it by tool name. Name a file or symbol to read its current line-numbered source.
- Shell: `codegraph explore "<symbol names or question>"`.

If `.codegraph/` is absent, skip CodeGraph entirely; indexing is the user's decision. Use `rg` / `rg --files` instead, excluding generated dependencies and builds.
