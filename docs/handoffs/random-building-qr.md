# Random building QR

- Owner: User with Codex
- Status: IN_PROGRESS
- Branch: `feat/random-building-qr`
- Base commit: `4eda49ebae30e6215e6f67f17e8fef197832b34e`
- Last verified commit: NONE
- Remote availability: NOT PUSHED

## Session Git state

- Session starting branch and HEAD: local `main` at `33227a687ac9d18281e90494a4e9b2ce27f861ce`
- Last fetched origin/main commit: `4eda49ebae30e6215e6f67f17e8fef197832b34e`, 2026-10-07
- Local changes present at session start: installation-generated root `package-lock.json`; restored with explicit user approval
- Upstream integration status: local main fast-forwarded to origin/main, then this task branch created
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Restore the earlier questionnaire-to-building-QR flow on the current Odaiba city. Each submitted proposal deterministically selects one of the prepared Odaiba landmarks, presents that landmark before transitioning to a scannable QR, and keeps the same selection across reloads. The QR opens the archived city produced by that proposal.

## In-scope files and dependencies

Survey result UI/server archive route, QR presentation package, archived city route, launch/build instructions and focused tests. Existing questionnaire scoring, city accumulation, station lifecycle, landmark GLBs and shared-screen presentation remain unchanged.

## Completed work

Ported the earlier integrated QR/archive flow onto current Odaiba main without replacing current city or questionnaire behavior. The result screen opens an embedded building QR after its scheduled reading slot (or by button). `selectQrLandmark` deterministically distributes proposal IDs across Fuji TV, Telecom Center and DiverCity Office Tower. The same QR opens a read-only `/city/:proposalId` view reconstructed from the committed after-state and historical slot seeds. One launcher builds/serves City, Survey and QR from port 8787 for LAN scanning. A standard QR remains the fallback when WebGL creation fails.

## Actual validation results

- Verification status: PARTIAL
- Date and checked commit/worktree: 2026-10-07, uncommitted task branch
- Commands/manual checks and results: root full test PASS and build PASS; survey full test including archive PASS and build PASS; QR build and 12 tests PASS; integrated three-package build PASS; building QR Chrome actual-canvas decode PASS (`divercity-office-tower` selected in that run), including repeat switch, embedded layout and WebGL fallback. Full integration reached questionnaire submission and decoded the correct archive URL, but its shared-display canvas assertion did not complete in headless Chrome; phone step therefore remains unverified in this session.
- Integrated commit and checks: NOT INTEGRATED

## Known issues and blockers

Physical phone scanning and exhibition Wi-Fi require manual validation. Full integration browser run is not yet green because headless Chrome did not create the shared-display canvas, although standalone root build and building-QR browser decoding passed. `qr-hud` dependency audit reports one high-severity advisory in the preserved standalone backend dependency tree; the integrated survey server does not start that backend.

## Important decisions

Random choice is deterministic from proposal ID, so one proposal never changes landmark after refresh. Initial pool uses the three already prepared and previously verified landmark meshes.

## Next expected step

Inspect the integrated display failure in headless Chrome, complete the phone archive browser step, then self-review/commit/push if green.
