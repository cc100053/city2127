# journey-landing — Vote orb lands on the changed slots

- Owner: cc100053
- Status: DONE (implementation); owner visual acceptance pending
- Branch: feat/journey-landing
- Base commit: b565368828877f58818ab827a22efbd10928ae71
- Last verified commit: see the branch tip (working tree checked before commit)
- Remote availability: origin/feat/journey-landing

## Session Git state

- Session starting branch and HEAD: main b565368828877f58818ab827a22efbd10928ae71
- Last fetched origin/main commit: b565368828877f58818ab827a22efbd10928ae71 (2026-11-03, main equal to origin)
- Local changes present at session start: untracked `.playwright-cli/` and `artifacts/*` captures, preserved
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner discussion 2026-11-03: a guest's vote should visibly fly to where it changed the city. Before, every orb landed on its axis's focal site, while a full-day simulation through the real reducer/ladder (300 guests × 20 runs) showed about 75–78% of headlines are district (±2/±3) changes at other slots. Done when a district headline's orb lands on its changed slots, with focal, energy and snapshot behaviour unchanged.

## In-scope files and dependencies

`src/voteJourney.ts` (`landingFor`, `JourneyLanding`, per-flight scans), `src/main.ts` (changes computed before `journey.play`), `tests/voteJourney.test.ts`. Uses the existing `CarrierChange.points`. No server, ladder, timing or data change.

## Completed work

- The headline axis's orb flies to the centroid of `CarrierChange.points`, one scan ring per changed slot (cap 8; scan pool 12).
- Lanterns stay in the focal halo (`shortcut:` comment) so `setLanterns` still rebuilds them from `recentProposals`.

## Actual validation results

- Verification status: PARTIAL
- Commands: root `npm test`, `npm run build`, `git diff --check` PASS.
- Browser: see [VALIDATION](../VALIDATION.md) entry "Journey landing on changed slots"; NW district only, day only.

## Known issues and blockers

- Night, SW/SE district landings, A/B stations, FPS, owner visual acceptance NOT RUN.
- When changed slots are spread wide, the orb lands between them (centroid); the per-slot scans mark each one.

## Next expected step

Owner views the before/after frames; then the agreed plan continues: rebuild NW flagship + district carriers in the current taste, then SW, then disperse district slots city-wide.
