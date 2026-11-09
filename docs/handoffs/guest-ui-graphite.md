# guest-ui-graphite — Resident terminal UI

- Owner: Codex, assigned by cc100053 in this chat.
- Status: DONE
- Branch: feat/guest-ui-graphite
- Base commit: cbc58cca32d11f44b2e03e71fb2bf5c71d2949c8
- Last verified commit: NONE. Checks apply to the listed UI working-tree delta on the base above, before the feature commit.
- Remote availability: origin/feat/guest-ui-graphite; final branch publication is verified with git ls-remote.

## Session Git state

- Started on clean `feat/random-building-qr` at `fcbf9bf2eb9f1ba0fb19912bc6ad2c3cb07a3b36`; its remote counterpart was identical after fetch.
- Fetched origin on 2026-11-07. Local main and origin/main were identical at the base above.
- Created this task branch from verified origin/main, as explicitly requested by the user. The existing QR feature branch was preserved.
- `dist-exhibition/` and `qr-hud/` become untracked on this main-based branch because they belong to the previous QR feature. They are preserved and excluded from this task's commits.
- Final fetch found origin/main advanced to `2d7c25d7797bd2e436b3d0aec03e20cddc48de7d` with six commits for car model polish. No Guest source overlaps. This UI branch retains its tested starting base and does not merge those unrelated changes. A later merge of this UI branch into main can retain the car work. The user requested a separate branch, not main integration.
- No conflicts.

## Goal and acceptance criteria

Implement the approved questionnaire visual direction in the real Guest flow and publish a separate GitHub branch. Graphite background, soft cyan selection, warm amber actions and 5px corners reflect the exhibition-desk reference. The real server remains authoritative for sessions, answers and result timing.

## In-scope files and dependencies

- `survey/src/ui/guestDebugView.ts` — presentation markup, welcome copy and short display headings.
- `survey/src/ui/guestTheme.css` — scoped Guest theme imported after the shared debug stylesheet.
- `tests/guestUi.browser.mjs` — focused browser regression using the existing external Playwright convention.
- `docs/PROJECT.md`, `docs/EXHIBITION_SPEC.md`, `docs/VALIDATION.md` and this handoff.
- `artifacts/guest-ui-graphite/` — actual browser captures and report.

## Completed work

- The new palette covers welcome, questions, review, pending/result, handoff, warnings and recovery/conflict tables.
- The four-option energy question uses two columns. Three-option questions retain vertical rows. Native radios and selected text remain keyboard accessible.
- Short option headings supplement the server's full Japanese labels. Unrecognised legacy option IDs use their original label alone.
- Existing real form handlers, request IDs, persistence, single/A/B lifecycle, reading slot, next-guest controls and both exploration destinations remain in the existing adapter.
- Admin and Monitor use their existing shared stylesheet. No new dependencies.

## Actual validation results

- Verification date: 2026-11-07, Windows, Node 24.19.0.
- Root native `npm test`: all commands through `odaiba.test.ts`, plus megastructures/floaters, PASS. It then stops at `surveyMeterPipeline.test.ts` on the same pre-existing Windows file-URL path issue. Every command after `odaiba.test.ts` was separately run with the external path adapter and PASSed, including real survey/model pipelines and the energy geometry suite. Together the two runs cover every command in the root test script. The unadapted full npm command does not pass on this Windows checkout.
- Root `npm run build`: PASS. Existing >500kB chunk warning.
- Survey `npm run build`: PASS.
- Survey native `npm test`: existing platform failure in `questionLoader.test.ts` because `new URL(...).pathname` produces `/C:/...` and encoded non-ASCII paths on Windows.
- Survey `npm test` with a temporary external Node load hook converting file-URL path expressions through `fileURLToPath`: PASS. This adapter is outside the repository and does not modify runtime source, assertions or test data.
- `node --experimental-strip-types tests/guestUi.browser.mjs`: PASS, actual Chrome 157.0.8103.38 at 1024x900, emulated touch, fresh temporary SQLite. Four questions, disabled-until-chosen action, native keyboard radios, selected colors, 2x2 energy layout, no horizontal overflow, review reload/restoration and editing, no partial vote, one real single-station submission, result/handoff, Sky Ring and space-elevator requests/return, next guest, independent A/B drafts, queued B result and three accumulated submissions, Admin stylesheet isolation. Zero page exceptions. Temporary browser/server/database teardown completed.
- Screenshots `welcome.png`, `energy-selected.png` and `review.png` visually inspected. Additional result/handoff/A-B screenshots were captured locally. [Browser report](../../artifacts/guest-ui-graphite/report.json).
- Working and staged `git diff --check`: PASS. New documentation links checked against local files.
- Main integration: feature branch only.

To repeat the focused browser check, first build `survey/`, then set `CITY2127_PLAYWRIGHT_PATH` to an existing Playwright entry point. Set `CITY2127_CHROME_PATH` when using a locally installed browser and `CITY2127_EVIDENCE_DIR` for captures. Run `node --experimental-strip-types tests/guestUi.browser.mjs` from the repository root. It starts a loopback server on an ephemeral port with a fresh temporary database.

## Known issues and limits

- Real iPad/Safari, shared 3D viewer playback and physical exhibition lighting/brightness comfort were not tested. The browser check validates the Guest UI and real server API, not the 3D presentation.
- Existing Windows file-URL path handling in native survey tests requires the external test-only adapter described above. It is outside this UI task's production code.

## Decisions and next step

The owner accepted this palette and changed the option corner radius to 5px in the design preview. Welcome wording and short option headings follow that preview. Full question/option data stays server-provided. This implementation uses the existing live lifecycle, including the current 20-second exploration offer, rather than the illustrative preview's timers.

The validated task files are published on `feat/guest-ui-graphite`. Review this branch independently, then validate on the exhibition iPad and under venue lighting before deciding on main integration.
