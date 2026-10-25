# Receiver-wing batch 01 — three authorized Plus passes

Actual source: `5db4e6e7f69d06ddc666fee95546807ec92b2256`, SHA256 `27c1e4f36835267eccc64c9d0c2947203d65dd95b7f37dda90c06dfb6576d9fa`. Runtime/tests unchanged. [Owner handoff](../../../docs/handoffs/receiver-wing-polish.md).

- [Actual hero](baseline/hero-day-mixed.png): original authored hero, mixed, hour12, reviewTime50.
- [Actual receiver large day](baseline-corrected/detail-day-large.png), [small day](baseline-corrected/detail-day-small.png), [large night](baseline-corrected/detail-night-large.png).
- [Locked generated target](target.png), [exact prompt](target-prompt.txt), [source protection](protection.json), original source snapshot `baseline-source.ts`.
- `baseline/browser.json` and `baseline-corrected/browser.json`: actual screenshot hashes, URL/time, browser/GPU, console/network records. Initial detail camera was clamped by existing district bounds; those first detail images are retained as failed framing evidence, not valid receiver detail.
- `capture-baseline.mjs` reproduces corrected detail in a fresh evidence folder; change output folder before rerun to preserve evidence. `capture-initial-clamped.mjs` preserves the initial attempt. Both close their own browser in finally; separate Vite needed.
- `SHA256SUMS` hashes all preparation inputs/evidence. `checkpoints/preparation.json` records full-branch Git bundle/full tracked-tree archive hashes and verification; backup files are local and ignored to avoid recursively committing backups.

Platform: macOS, Chrome156 headless, ANGLE Metal Apple M6/WebGL2, 1920×1080 DPR1/default. No runtime implementation, full regressions, FPS, hardware, mobile or engineering claims. Only expected favicon404; no page errors or failed requests. Original hero and all corrected detail images visually inspected. Target is a local visual reference; all unchanged-scope and original envelope constraints override generative drift.

Preparation follows current dispatch only. Wait for separate heavy-pass authorization; no push/deploy/main integration or banked reset use.

Target locked locally after visual inspection: generated output is 1672×941 versus actual1920×1080. Existing panel-array character remains; no target-achieved or design-acceptance claim. Ignore UI/text/background drift and preserve runtime camera/envelope. The accepted ring `.dream-loop/target.png` stays byte-identical; receiver workflow target is `.dream-loop/receiver-wing-batch-01/target.png`.

## Implementation evidence

14:35 JST natural-reset authorization supersedes preparation-only gate. [Pass1 owner review](pass1/review.md), logs,33 DEV originals and formal evidence are in pass1/. Use `python3 .../protect.py`, `node --experimental-strip-types .../receiver-envelope.mjs`, `node .../review.browser.mjs <fresh-output-folder>`, original `tests/energyE4.browser.mjs` with documented env, then `python3 .../review-evidence.py passN`. Run `python3 .../checkpoint.py passN` only after commit and cleanup. No tests relaxed; source snapshots and corrected prompt provenance retained. Final exact commit/backups recorded in locally ignored checkpoints/passN.json.
