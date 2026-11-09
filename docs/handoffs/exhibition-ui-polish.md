# exhibition-ui-polish — Exhibition UI delivery

- Owner: Codex
- Status: DONE
- Branch: feat/exhibition-ui-polish
- Base commit: 4ecee296ce2b80a66af006da34c11c2881fc4ce2
- Last verified implementation commit: 1aaeb0ace96caa68dcbc567367798c05bdf12af7. The subsequent delta is this handoff record.
- Remote availability: origin/feat/exhibition-ui-polish. No main integration.

## Session Git state

Fetched main and the staff console branch on 2026-11-09. The checkout started on `fix/guest-ui-evidence` at the same commit as main. The untracked city-card trial was moved outside the checkout. The review branch started from main and included the verified staff console commits `e1c79f6` and `6ca9f96` by cherry-pick.

## Scope

- Apply the approved staff console and finish the Monitor and Guest recovery UI on one branch.
- Monitor displays socket state, snapshot recovery, latest received proposal or action, a 30-event timeline, and expandable diagnostics.
- Guest presents Japanese next-step prompts for waiting, expiry, lost submission responses, and staff assistance. Existing protocol, retry identity and timing apply.
- Retain the existing city result card per owner feedback.

## Actual validation results

- Survey build and focused Chrome 157.0.8103.38 browser check passed with in-memory SQLite at 1280×900. The test observed a real disconnection and snapshot recovery, Guest idle continuation and expiry, and an exact retry of a committed proposal after the response was lost.
- The Admin browser check passed on the combined branch. The Guest browser check passed at 1024×900 with emulated touch, including A/B queuing, submission, recovery and exploration.
- Root and survey builds and regression tests passed on Windows. The test commands use the external Windows file-URL path adapter documented in the Admin handoff. The committed whitespace check passed.
- [GitHub CI](https://github.com/cc100053/city2127/actions/runs/42608517817) was cancelled during root tests near the configured 15-minute job limit. Subsequent CI steps were skipped. The local suite finished successfully.
- Screenshots are kept outside Git. Exhibition hardware and venue conditions have not been tested.
