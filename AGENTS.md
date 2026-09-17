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
5. Update docs when behavior, commands, layout or validation limits change. Report what changed, actual checks performed, and any remaining limitation. Do not claim an unmeasured FPS or an untested platform.

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
