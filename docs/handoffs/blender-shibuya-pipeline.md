# Blender to Shibuya import channel

- Owner: Codex
- Status: IN_PROGRESS
- Branch: `codex/blender-shibuya-pipeline`
- Base commit: `9ca007c2bbe8423eb52317724133d66b6006f695`
- Last verified commit: NONE; working tree checks below
- Remote availability: NOT PUSHED

## Session Git state

- Starting branch and HEAD: clean `main` at `9ca007c2bbe8423eb52317724133d66b6006f695`.
- Last fetched origin/main: same SHA, 2026-09-23; local and remote main had 0/0 divergence.
- Local changes at start: NONE.
- Upstream integration: NOT NEEDED.
- Conflicts: NONE.

## Goal and scope

Connect Codex desktop to the installed Blender, and make Blender GLBs previewable in the existing Shibuya Three.js scene. The user has not selected a first production Shibuya asset or placement. PR #2 is an in-progress Odaiba-only asset branch; do not merge it or place those landmarks in Shibuya.

## Completed work

- Installed the official Blender Lab MCP server from source revision `ff54e4d8f6b09502f2f466189cca0e52b4a91643` with `uv tool`, registered `blender` in Codex, and installed/enabled the official add-on in Blender 5.2.2.
- Added `src/modelAssets.ts` with Three.js `GLTFLoader` and explicit position/rotation parameters.
- Added a development-only `?asset-preview` picker that loads one local GLB at the scene origin. No production model, new npm dependency, or Odaiba runtime change.
- Updated README, project map, Blender instructions and validation record.

## Actual validation

- Date/worktree: 2026-09-23, uncommitted task branch.
- `codex mcp get blender`: enabled STDIO server. Blender extension list: `mcp` installed; headless preferences check: enabled.
- Temporary Blender background server with `--online-mode`: MCP handshake listed 26 tools; `get_objects_summary` returned success. Stopped temporary server afterward.
- Blender 5.2.2 exported a temporary cube GLB. Local Vite preview at `http://127.0.0.1:5173/?asset-preview` loaded it; file input reported success and browser error log was empty. Temporary GLB is not in the repository.
- `npm test`: PASSED. `npm run build`: PASSED after the initial missing Vite type reference was fixed. Existing bundle-size warning. `git diff --check` and changed-document local Markdown link check: PASSED.
- Production model placement, visual comparison and performance: NOT RUN; no production asset exists.
- Integrated commit/checks: NOT INTEGRATED.

## Known issues and decisions

- The MCP server is registered globally, but this current Codex task may need a new task or app restart to expose the newly installed tools.
- Interactive Blender must run the add-on server from its preferences. The official add-on requires Blender online mode; this was enabled only for the temporary background test, not saved globally. An attempt to persist `use_online_access=True` was rejected by automatic approval review because it broadens future sessions' network access. Do not retry indirectly; request user approval before changing this preference. Keep the MCP socket on localhost.
- The preview model sits at `(0,0,0)` at authored scale and can overlap the crossing. It is for inspection, not production placement.
- The repo still has no Shibuya `.blend`/`.glb` pair. Future production integration must select a specific Shibuya asset, import/serve its URL, set a verified placement and rerun the scene checks.

## Next step

Complete final diff/link/check review, commit/push this branch, verify branch CI, integrate and validate main per `CONTRIBUTING.md`. Once the user supplies the first Shibuya model and placement, integrate it as a separate asset task.
