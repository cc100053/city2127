# Building QR presentation

## GitHub publication preparation — 2026-09-30

User explicitly requested publication for teammates. Target is `feature/qr-city-results` only. Remote fetch succeeded with a command-local OpenSSL backend (Windows Schannel failed); origin/main is now `0027eb1`, 12 commits newer than base `4bc1646`. This branch intentionally preserves the verified integration base; no upstream city migration merge or main push is included. Existing README/VALIDATION import conflicts had already been resolved in content; staging records those resolutions. Root tests/build passed; survey tests and archive preservation test passed, and survey build passed with `--configLoader=native` after default esbuild could not traverse a sandboxed parent directory. Integrated build and final QR checks are recorded below. Published preview PNGs are in `artifacts/fuji-tv-qr-{building,scan}.png`; `.env`, SQLite, dependencies and build outputs remain excluded. Historical “not pushed” notes below describe earlier stages.

## Latest update: single Fuji TV, 2026-09-30

Owner jerrycai88 with Codex; continuing `feature/qr-city-results` at base HEAD `4bc1646`, preserving the pre-existing import merge. The user now chose a single Fuji TV building, superseding the multi-miniature scope below. One full Mesh appears in presentation view; a QR-mask shader cuts white columns from the same building during camera transition, turns it dark and combines it with low QR plinths for scanning. Source Fuji panel positions/normals retained: 127,928 triangles. Both production builds, 10 tests and Chrome actual-canvas decoding/view/fallback checks PASS after the final geometry update; building and scan screenshots reviewed. `git diff --check` PASS (line-ending warnings only). Full guest flow was not rerun, because destination/server/phone behavior did not change. No physical phone/FPS claim. Detailed QR bundle is 14.3 MB raw / 1.42 MB gzip; later optimize asset loading if exhibition measurements require it. Per-person model choice remains future work; everyone currently sees Fuji, with independent result links. Preview port5198 is available; click `フジテレビを見る` for the building, `真上からスキャン` for stable QR. Original D:/2127-qr-hud remains untouched. Fetch failed (GitHub unreachable), no publication attempted.

## Latest update: Odaiba, 2026-09-30

User chose Odaiba venue. Replaced Shibuya factories with lightweight geometry generated from the team's existing Fuji TV, Telecom Center and DiverCity Office Tower GLBs at cached commit `40d696e09f5d119a3ba6aff72c19d935c8838333`. `prepare-odaiba-qr.mjs` generates the tracked JSON; no runtime root-source dependency. Preserve sphere and arch proportions; enlarged landmarks fit the finders' dark centers. Terminal labels updated to Odaiba. Both QR builds, 10 package tests, parcel bounds, and browser decode/controls/embedded/fallback checks PASS. No physical phone/Docker test. Full questionnaire test below is earlier evidence, not rerun for this model swap. Desktop/phone archive scene still uses original city, so venue migration is not yet complete. The pre-existing uncommitted merge remains; no publication attempted.

- Owner: jerrycai88, implemented with Codex
- Branch: feature/qr-city-results
- Base HEAD: 4bc16463a34879083d64debb4587a0d036297d4d
- Remote: NOT PUSHED. Fetch failed (network unavailable); remote freshness unverified.
- Starting state: ongoing QR import merge plus uncommitted personal-3D integration. README/VALIDATION already marked unmerged; this task preserves that state and does not switch branches or publish the unfinished merge.
- Scope: the user confirmed multiple existing-city buildings arranged into QR; no AI training or QR-Bloom assets/code copied.

## Implementation

`qr-hud/src/buildingQr.js` imports root tower/shop factories, simplifies geometry into miniature masses with original vertex colors, instances three types, and constrains all x/z extents to one dark QR parcel. Parcel plinths make the complete top projection precise. High-contrast unlit scan view, five-module margin, preserved finder patterns, oblique growth view and explicit buttons. qrcode-generator promoted from transitive to direct dependency; Three deduplicated in Vite. Standard QR retained if WebGL creation/build fails. Rebuild both normal and exhibition QR distributions for the two server modes.

## Verification

- QR 10 backend/bundle tests: passed.
- Normal and integrated Vite builds: passed; expected chunk-size warnings.
- Browser `scripts/verify-building-qr.mjs`: passed after final visual refinement: actual canvas decoding for demo and long personal URL, view toggles, URL changes, embedded 750x620 scan layout, repeat scan, and standard QR fallback when WebGL is disabled.
- Full scratch-server `scripts/verify-integration.mjs`: PASS after this change; actual questionnaire submission → building QR decode → phone 3D, rotation/zoom, no live WebSocket, later guest/reset isolation.
- Docker build context updated for the shared root source; Docker itself NOT RUN here.
- Browser images under ignored `qr-hud/test-results/building-qr-*.png`.
- Root city sources are imported but not edited. Phone archive, server and questionnaire behavior unchanged in this task.
- Physical camera/phone, public network and exhibition load are not verified.

## Next action

Rebuild integration, refresh questionnaire QR iframe and try scanning from a real phone. Finish the existing integration merge separately before publishing; do not discard its uncommitted work. The original D:/2127-qr-hud standalone folder is not this working copy.
