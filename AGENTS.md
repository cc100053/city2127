# AI agent workflow

This repository is **2127 — Frozen Intersection**, a small procedural Three.js demo. Read [README.md](README.md), then [docs/PROJECT.md](docs/PROJECT.md) before changing behavior. Use [docs/VALIDATION.md](docs/VALIDATION.md) to verify changes and hand off work.

## Working agreement

- Reply to the user in Traditional Chinese; natural Cantonese is welcome. Keep existing English/Japanese product copy unless localization is requested.
- Desktop presentation only: responsive/mobile adaptation is not required (user decision, 2026-09-17). Do not add responsive layouts, adaptive camera framing or mobile acceptance checks unless explicitly requested. Keep ordinary renderer resize handling.
- Follow the latest user request. Version 2 explicitly allows pedestrians, cars, drones and aerial routes; the original “no characters/NPCs” restriction is superseded for these ambient actors.
- Preserve one Shibuya intersection, three states and the locked presentation camera. Plan 02 (2026-09-17) supersedes the warm painted civic-model style: use maintained architectural materials, daylight, monumental connected massing, authored multi-level circulation and engineered ecology, with asset/pic2.png as the design-language reference. Keep thin wings and the open mid-tower station. State switching must never regenerate buildings.
- Trace the changed code and its callers before editing. Reuse existing factories, materials and instancing; prefer Three.js/native features over new dependencies.
- Make the smallest complete change. Avoid speculative abstractions, broad formatting rewrites, extra frameworks or infrastructure. Document a deliberate shortcut with a `ponytail:` comment only when it has a real limitation.
- Work in this task. Do not spawn agents unless the user or applicable instructions explicitly request delegation.
- Do not introduce deployment, backend services or external asset packs as incidental work. A debug log does not establish a Firebase deployment configuration.

## Start and finish

1. Inspect the working tree and applicable instructions. Use `git status --short` if this checkout is a Git repository; do not assume it is. Preserve unrelated work and existing screenshots.
2. Read the relevant source, tests and the project contract. For a bug, trace all callers and fix the shared cause.
3. Implement within the requested scope. Add or update a small runnable check for nontrivial logic; documentation-only edits need link/fact checks, not rendering tests.
4. For code changes, run `npm test` and `npm run build`. For visual/motion changes, also use the browser checks in `docs/VALIDATION.md`; a build alone is not visual verification.
5. Apply the documentation sync rules below before handing off each stage. Report what changed, actual checks performed, and any remaining limitation. Do not claim an unmeasured FPS or an untested platform.

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

## Stage approval gates

- Read-only inspection may proceed to prepare a concrete proposal. Before implementation, present the stage's scope, intended files, documentation updates and validation plan, then obtain explicit user approval for that stage. A request explicitly authorizing a defined stage already supplies that approval; do not ask again for the same scope.
- Keep approval scoped to the named stage and actions. A general request to finish a feature does not approve every later stage. Each subsequent implementation stage needs its own approval; changed scope or material changes to an approved proposal require renewed approval before proceeding.
- Validation is a separate gate unless its specific checks were explicitly included in the approved stage. Prepare the check list before requesting approval. After approved checks, present the actual diff, documentation updates, results and unresolved limitations for stage acceptance; do not begin the next stage merely because checks passed.
- Before staging or committing, show the exact intended file list, change summary, proposed commit message and validation results, then obtain explicit approval to stage and commit that reviewed change. Stage only those files or hunks; never include unrelated working-tree changes. Implementation approval, successful tests and stage acceptance alone do not authorize a commit.
- Push, PR creation/publication, merge, release and deployment each require explicit approval for the named action and destination after the relevant result is ready to review. Commit approval does not authorize these later actions. Do not amend commits, rewrite history or perform destructive Git operations without approval for that exact operation.
- At every gate, stop the dependent action until the user replies; silence, elapsed time and approval of an earlier stage are not approval. Explain briefly that this file's Stage approval gates require the pause, identify the pending action and link to this section. Record approval scope and stage status in the task conversation; no separate approval infrastructure is needed.

These gates apply to the Start and finish workflow and to referenced validation/handoff procedures.

## Commands

Use Node.js 24+; this project has been run with Node 26. Tests execute TypeScript directly with Node's type stripping, without a test framework.

```sh
npm ci                       # when dependencies are absent or the lockfile changed
npm run dev -- --port 5173    # loopback-only preview; use the URL Vite actually prints
npm test                     # state timing + mobility/route checks
npm run build                # strict source typecheck + production build
```

Reuse a running preview if it belongs to this project. If the port is occupied, inspect it or use another port; do not kill unrelated processes. Edit source, not `dist/` or `node_modules/`. There is no configured lint command or deployment workflow.

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it **before** grep/find or reading files when you need to understand or locate code:

- MCP: `codegraph_explore` returns relevant source and call paths. If deferred, discover it by tool name. Name a file or symbol to read its current line-numbered source.
- Shell: `codegraph explore "<symbol names or question>"`.

If `.codegraph/` is absent, skip CodeGraph entirely; indexing is the user's decision. Use `rg` / `rg --files` instead, excluding generated dependencies and builds.
