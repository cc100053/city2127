# exhibition-ui-polish — Exhibition UI delivery

- Owner: Codex
- Status: IN_PROGRESS
- Branch: feat/exhibition-ui-polish
- Base commit: 4ecee296ce2b80a66af006da34c11c2881fc4ce2
- Last verified commit: NONE. Checks cover the implementation delta on the base.
- Remote availability: NOT PUSHED

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
- Root build and survey tests passed on Windows. Survey tests use the external Windows file-URL path adapter documented in the Admin handoff. The root regression suite is running with the same adapter.
- Screenshots are kept outside Git. Exhibition hardware and venue conditions have not been tested.
