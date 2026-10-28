# Sector C evidence

Owner `01a17f7d-839f-74d0-8660-22e9c1ec1435`; handoff base `ca22a92769e596b3c168ae0579aadef4b5420d9d`. [Final side-by-side review](REVIEW.md), [raw report](report.json), [checks](checks.json), [image manifest](original-images.json), [scope assertions](scope-check.py), [work log](work-log.json). Art acceptance remains with the owner; this evidence does not authorize a main merge.

Final rounds: focal r3, district r3 (including low-solar/high-forest/high-docks), ring r2. Ring stops at two rounds: four sparse operating marks complete the local readability change. Filling the hollow or inventing different b/mixed rotor geometry to force A3/A4 would change the intended part. Background greenery is outside the ring block. All prior rounds and failed gates remain available.

Focal r3 was authored before district polish but its full capture was deliberately deferred until all C source was final. District's later difference is the ring-only operating marks; diagnostics verify the flywheel is hidden in every Meter/hero capture. Source hashes record each round. Comparisons against S0 include the accumulated A/B/C candidate, not isolated C performance.

Capture uses the existing shared runner with `CITY_SHOTS`, `CITY2127_EVIDENCE_DIR` and, for district, `CITY_SE_PAIRINGS=1`. Use a new directory for any independent run; never overwrite these originals. Each state uses the identical URL twice, 1920×1080/DPR1/default, reviewTime20, hour12/22, after the FPS overlay appears plus six seconds. The second original is formal. Full subject/root/carrier bounds, first-hit rays and the original thresholds are unchanged.

Performance launches Chrome with both `--disable-gpu-vsync` and `--disable-frame-rate-limit`, waits at least16s from navigation and measures two rAF windows of at least5s. Raw intervals, poses, GPU strings, browser patch, calls and errors are retained in every performance.json. A4 uses the union of both full projected subject boxes and keeps invalid/absent cases. Pairings compare against their same-tier unpaired state at the original6% gate; partner Meter changes are real and not an isolated C difference. There is no same-state S0 pairing draw baseline, so paired A5 is UNVERIFIED.

Runnable checks, from the checkout root (Node24+; Node26 used):

```sh
python3 artifacts/closeup-polish/C/scope-check.py
node artifacts/closeup-polish/capture.mjs --self-test
node artifacts/closeup-polish/C/report.mjs --self-test
node artifacts/closeup-polish/C/report.mjs
npm test
npm run build
git diff --check
```

`live.mjs` runs against Vite5194 with real current-v4 proposals and isolated scratch HTTP/WebSocket/SQLite services, closing them in finally. It writes a fresh `C/live` directory and refuses an existing directory. Do not rerun over the accepted originals. Browser diagnostics refresh every120frames; exact3s duration/retarget coverage is in the root tests. Static V6 judgments do not establish all-state temporal flicker absence. Exhibition hardware, other platforms, visitor recognition and Z remain unverified.

Ring r1's Chrome unexpectedly closed during a mixed load after four completed states. The failure log, partial JSON and eight hashes remain. A combined retry was initially rejected by automatic approval review for possible overwrites. Read-only checks then proved skip-complete and refusal of existing image paths, absent remaining files and unchanged source/environment. The approved capture-only continuation preserved every old row/hash; perf/compare were separate new files. See [preservation](r1/energy-ring/retry-preservation.json) and the work log; this is not an all-attempts-error-free claim.
