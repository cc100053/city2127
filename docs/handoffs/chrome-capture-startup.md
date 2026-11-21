# Chrome capture startup on macOS

- Owner — Codex
- Branch — `codex/chrome-capture-startup`
- Base — `166ed7ff0ffc9fdc01b06416d49082c70974a20d`
- Main checkout at intake — `codex/ring-glb-pilot` at `3de8460c`, even with its upstream after fetch and 8 commits ahead / 8 behind `origin/main`. Preserved the active ring review and the untracked `Dev_QA.md`. Started the fix in an independent checkout at the verified main commit.

On 2026-11-21 at 14:49 JST, the R5 ring isolation script called the shared `launchBrowser()` in Codex's macOS sandbox. Chrome 157.0.8103.79 on macOS 27.2.1 aborted in `TransformProcessType` before opening the page. The same command completed when run through Codex's approval flow. The shared launcher now checks Codex's `CODEX_SANDBOX=seatbelt` marker before starting Chrome and prints the supported launch paths in the terminal. The check covers the capture CLI, the close-up sheet and custom callers of `launchBrowser()`. Scripts that launch Chrome directly follow the [browser validation procedure](../VALIDATION.md#evidence-storage).

## Verification

- `node scripts/capture.mjs --self-test` passed, including the sandbox guard assertion. The actual sandboxed capture command exited 1 with the new terminal message and did not produce a new macOS Chrome crash report.
- An approved invocation of the capture CLI rendered the main city at 12:00, 1600 × 900, DPR 1. The screenshot and sidecar were written, and the sidecar reported zero page errors. The test closed Chrome and its loopback preview. Rendering performance was outside this check.
- Root `npm test`, `npm run build` and `git diff --check` passed in the independent checkout. Survey and module-swap source were unchanged.
- Verified implementation `d4928825` and integration `20aca780`. The merge tree matched the validated task tree and the capture self-test and integrated whitespace check passed. The task branch is available on `origin`.
