# AI agent workflow

This repository is **2127 — Frozen Intersection**, an exhibition project for collectively shaping futuristic Odaiba. It holds the root Three.js exhibition city (`src/`), the proposal server (`survey/`) and a preserved legacy v1 demonstrator (`module-swap/`). Read [README.md](README.md), then [docs/PROJECT.md](docs/PROJECT.md) before changing behavior. Use [docs/VALIDATION.md](docs/VALIDATION.md) to verify changes and hand off work.

## Working agreement

- Reply to the user in Traditional Chinese; natural Cantonese is welcome. Keep existing English/Japanese product copy unless localization is requested.
- Target a desktop presentation (user decision, 2026-09-17): keep ordinary renderer resize handling; responsive layouts, adaptive camera framing and mobile checks happen only on explicit request.
- Venue: **Odaiba / Daiba waterfront in 2127**, root `src/` (user decision, 2026-10-02). Shibuya material — assets, internal IDs, [Plan 01](docs/SHIBUYA.md), [Plan 02](docs/history/SHIBUYA_PLAN02.md) — is closed, read-only history; record current decisions in current documents.
- Product authority: [EXHIBITION_SPEC](docs/EXHIBITION_SPEC.md); current source/data flow: [PROJECT](docs/PROJECT.md); visual authority: [CITY MASTER TASTE](docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) and implementation rules: [ART](docs/ART.md). [Document index](docs/README.md) separates current guidance from history.
- Narrative: the guest is a resident of Odaiba in 2127, expressing daily-life preferences — one voice among many, never a planner whose answer alone decides the accumulated change. The provisional iPad handles questions/choices/actions; the shared screen shows the city, facility stories and change explanations. Current wiring and timing: [RESIDENT_COPY](docs/RESIDENT_COPY.md) and PROJECT.
- Each guest submits one four-question v2 proposal; guests inherit the accumulated city. Low/zero/high Meter values all depict mature 2127 alternatives. Meters affect focal sites and the district; live transitions take 3 s, snapshots/reset/Undo/reconnect are immediate, and v2 scores leave global atmosphere alone.
- Pedestrians, cars, drones and aerial routes are allowed (the original no-NPC restriction is superseded). Root retains standalone and legacy v1 code paths; module-swap is a legacy v1 demonstrator and rejects v2.
- Preserve the current single/A/B guest-station lifecycle described in PROJECT and the [dual-station handoff](docs/handoffs/archive/two-guest-devices.md).
- Trace the changed code and its callers before editing. Reuse existing factories, materials and instancing; prefer Three.js/native features over new dependencies.
- Make the smallest complete change, scoped to the task's lines rather than broad reformatting or speculative abstractions. Document a deliberate shortcut with a `ponytail:` comment only when it has a real limitation.
- Work in this task; spawn agents only when the user or applicable instructions request delegation.
- Deployment, backend services and external asset packs are separate tasks, never incidental work. A debug log does not establish a Firebase deployment configuration.

## Start and finish

Startup (mandatory preflight, every session):

1. Confirm the workspace is the `city2127` repository before running anything else.
2. Inspect branch, HEAD, working tree and diff; preserve unrelated work and screenshots.
3. Fetch the latest remote references so local knowledge of `origin/main` is current.
4. Identify whether the local branch and its remote counterpart have diverged, and record what you found.
5. Read the relevant task [handoff](docs/handoffs/TEMPLATE.md). Each task has one named owner and a handoff under `docs/handoffs/`; coordinate overlapping module or binary-asset edits before starting. Contributors may work across ownership areas.
   For Blender work, also read [docs/BLENDER.md](docs/BLENDER.md): MCP setup is per workstation, so one collaborator's successful check does not verify another's.
6. Compare the handoff's base and last verified commit with actual code; check whether unfinished commits are available remotely. Do not assume chat history or a previous local clone is available.
7. Read affected source, callers, tests and [architecture documentation](docs/PROJECT.md). For bugs, trace all callers and fix the shared cause.
8. Resume from the next expected step within the assigned scope.

```sh
git status --short --branch      # branch, upstream divergence and dirty files
git rev-parse HEAD               # exact starting commit
git fetch --prune origin         # refresh remote references only
```

Fetching updates remote references only. It does not authorize switching branches, merging, pulling, resetting, stashing or discarding local work; preserve uncommitted work and coordinate instead.

If the fetch fails, report that remote freshness cannot be verified and record it in the handoff; start new tasks only from a verified `main`.

Starting a new task requires a clean working tree and an up-to-date `main`; resuming an existing task branch must not pull or merge `main` automatically. Follow the [Git workflow](docs/CONTRIBUTING.md) for both cases.

Finish:

1. Complete implementation and relevant checks. Add a small runnable check for nontrivial logic. Code changes require `npm test`, `npm run build` and `git diff --check` (in each changed package: root, `survey/`, `module-swap/`); visual/motion changes also require relevant [browser checks](docs/VALIDATION.md). Documentation-only changes need link/fact checks, not rendering tests.
2. Self-review the exact diff, including new files.
3. Update affected documents per the [documentation sync table](docs/CONTRIBUTING.md#documentation-sync), and update the task handoff.
4. Record actual validation results, verified commit, unresolved issues and next step. Separate implementation completion from verification; report only measured FPS and tested platforms.
5. Follow the [Git workflow](docs/CONTRIBUTING.md), including validation of the integrated result.

## Scope-based autonomy

An explicitly assigned task authorizes relevant inspection, implementation, tests and in-scope fixes, documentation updates, committing and pushing the task's feature branch, self-review, merging after required checks and pushing validated main. No PR or external reviewer is required. Follow [CONTRIBUTING.md](docs/CONTRIBUTING.md) for integration and the asset-only direct-main exception. Explicit task restrictions override these defaults; a documentation task that excludes commits does not authorize them.

Clarify before going beyond the assignment: a major architectural rewrite, a change to approved product direction, deleting important shared assets, rewriting shared Git history, force-pushing main, deploying or adding infrastructure. Routine in-scope implementation, validation and Git steps need no separate stage approvals. Use independent local clones; worktrees and GitHub Issues are optional.

## Commands

Use Node.js 24+; this project has been run with Node 26. Tests execute TypeScript directly with Node's type stripping, without a test framework; each package's `package.json` lists its scripts.

```sh
npm ci                       # when dependencies are absent or the lockfile changed
npm ci --prefix survey       # root Meter pipeline tests use the real survey HTTP/WebSocket server
npm run dev -- --port 5173    # loopback-only preview; use the URL Vite actually prints
npm test && npm run build && git diff --check

cd survey && npm ci && npm test && npm run build                  # survey server package
cd survey && npm run dev:auto                                   # DEV-ONLY: fresh scratch SQLite, localhost:8788/guest?dev-auto
cd module-swap && npm run install:app && npm test && npm run build  # viewer (test also runs check:models)
```

`survey/` and `module-swap/` are separate npm projects; root `npm test`/`build` does not cover them.

Reuse a running preview if it belongs to this project. If the port is occupied, inspect it or use another port; leave unrelated processes running. Edit source, not `dist/` or `node_modules/`. There is no lint command or deployment workflow; [CI](.github/workflows/ci.yml) runs install/test/build for all three packages plus the whitespace check (details in [VALIDATION](docs/VALIDATION.md)).

## CodeGraph

When `.codegraph/` exists at the repo root, reach for it **before** grep/find or reading files: MCP `codegraph_explore` (load by name if deferred), or shell `codegraph explore "<symbols or question>"`. Without it, use `rg` / `rg --files`, excluding dependencies and builds; indexing is the user's decision.
