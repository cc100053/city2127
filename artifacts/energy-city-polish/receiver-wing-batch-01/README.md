# Receiver-wing batch 01 — three authorized Plus passes

Single owner: current receiver batch chat. [Current handoff](../../../docs/handoffs/receiver-wing-polish.md). 2026-10-25 14:35 JST natural-reset authorization supersedes preparation-only gate; no push/deploy/main integration or banked reset use.

## Locked inputs

- [Actual baseline hero](baseline/hero-day-mixed.png), [large day](baseline-corrected/detail-day-large.png), [small day](baseline-corrected/detail-day-small.png), [large night](baseline-corrected/detail-night-large.png).
- [Locked generated target](target.png), [exact recovered prompt](target-prompt.txt), [prompt correction provenance](prompt-recovery.md), [source protection](protection.json), original source `baseline-source.ts`.
- Baseline source `5db4e6e7f69d06ddc666fee95546807ec92b2256`, SHA256 `27c1e4f36835267eccc64c9d0c2947203d65dd95b7f37dda90c06dfb6576d9fa`. Current source is recorded per pass below. Original tests and all source outside receiver block stay unchanged.
- Target SHA256 `02bbde1032c230d51199d1d9cc219ca39fb9935f0af44b456fd843895ef51a40` remains fixed; output1672×941 differs from actual1920×1080. Ignore generated UI/text/background drift, preserve runtime camera and envelope. Panel-array character remains; target is craft reference, no design/engineering acceptance claim.
- Accepted ring `.dream-loop/target.png` remains byte-identical; receiver workflow target is `.dream-loop/receiver-wing-batch-01/target.png`.
- Initial `baseline/` detail used an out-of-district aim and was clamped by existing OrbitControls; retained as failed framing evidence. `baseline-corrected/` uses existing legal review aim, without camera source changes. Both browser JSONs retain actual URLs/time/hash/errors.

## Per-pass evidence

[Pass1 owner review](pass1/review.md): source0f1941bd, root tests/build/diff,33 DEV originals and original formal scratch runner PASS. Full branch bundle and scoped source/target/evidence archive verified before pass2; exact commit/hash in local `checkpoints/pass1.json`.

`passN/` contains original PNGs, raw logs, browser JSONs, exact source snapshot, envelope/protection logs and `evidence-check.json`. Every pass uses true same-chat fresh empty-context gpt-6-astra/low worker for implementation only; owner validates and backs up before next pass. `SHA256SUMS` covers current artifact files except itself/checkpoints; historical preparation manifest remains in preparation commit/bundle.

Platform: macOS, Chrome156 headless, ANGLE Metal Apple M6/WebGL2,1920×1080 DPR1/default. No new FPS, exhibition hardware, Safari/iPad/Windows or engineering claim. Formal runner preserves assertions/quality/timeouts and uses its own scratch DB/server, never exhibition SQLite.

## Reproduce owner gates

Root `npm test`, `npm run build`, `git diff --check`, then `python3 artifacts/energy-city-polish/receiver-wing-batch-01/protect.py` and `node --experimental-strip-types artifacts/energy-city-polish/receiver-wing-batch-01/receiver-envelope.mjs`.

Use existing installed Playwright/Chrome and a loopback Vite on5187. `node artifacts/energy-city-polish/receiver-wing-batch-01/review.browser.mjs <fresh-output-folder>` runs33 DEV screenshots; refuses to overwrite existing browser.json. Run original `tests/energyE4.browser.mjs` with `CITY2127_PLAYWRIGHT_PATH`, `CITY2127_CITY_URL`, `CITY2127_EVIDENCE_DIR`, `CITY2127_CHECKED_COMMIT` as in per-pass logs/hand-off. Run `python3 artifacts/energy-city-polish/receiver-wing-batch-01/review-evidence.py passN` after both browser gates.

After source/diff/document review, local Conventional Commit and cleanup, `python3 artifacts/energy-city-polish/receiver-wing-batch-01/checkpoint.py passN` saves a full branch bundle and archive of all receiver evidence plus complete current src/tests/docs and both workflow targets. It verifies bundle and every archived file and refuses to overwrite a prior checkpoint. Local `checkpoints/` is ignored to avoid recursive backups; preparation also retains a full tracked-tree archive.

[Pass2 owner review](pass2/review.md)：sourcede556764，同一完整root／DEV33／正式gate PASS，固定static PNG一致、live21.39→28.88；checkpoints/pass2.json保存exact commit與完整branch bundle／evidence archive驗證。

[Pass3 owner review](pass3/review.md)：source01987a48，相同完整gate PASS，static PNG一致、live21.45→26.50。三輪後停止等coordinator review，不再實作；最後source commit與文件收尾commit由checkpoints/pass3.json分列。
