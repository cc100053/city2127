# Validation and handoff

## Automated checks

For executable changes, run from the project root:

```sh
npm test
npm run build
```

Tests use `node:assert/strict` and Node's TypeScript stripping; keep new checks small and focused. `tsc` currently checks `src/`, while Node executes the test files. There is no separate lint/format command.

The state test covers midpoint interpolation, the immediate verdict, the four-second lock and choosing again. The mobility test samples three traffic cycles, one walking-cycle boundary and 501 positions per circulation route against layout-derived landmark envelopes, plus delivery transfer/lift continuity and closed-route guide wraparound. The Shibuya checks also sample all five painted walking paths, off-road waiting endpoints and landmark ground footprints against the road polygons. These checks do **not** prove visual correctness, exact mesh collision, every pedestrian pose or drone-to-drone avoidance. Inspect the actual scene after geometry/motion changes.

A Vite warning about the single bundle exceeding 500 kB has been observed; it is not a build failure. Do not hide it or add code splitting solely to silence it. Measure loading needs before changing packaging.

## Browser acceptance

1. Start or reuse `npm run dev -- --port 5173`. Open the actual localhost URL. Reload after relevant changes if HMR has not applied them. Confirm the canvas renders and console has no new errors.
2. Check all three states at the **same viewport and camera**. Confirm the tower, shops, kiosk, crossings and island retain their layout; transitions must not add/remove building meshes or produce a hybrid skyline.
3. Select Pulse. During the first 10 seconds, try another key: it must be ignored. At completion the verdict must appear immediately while controls stay locked for four more seconds. Aircraft, deliveries and window beats must keep moving. After the hold, select Still; then return to neutral and verify the verdict clears.
4. Observe at least 60 seconds of motion. Check car headings, edge fades, walking legs, waiting/queue positions and the cycle boundary. People should cross on the intended zebra paths rather than walk through the tower or props. Inspect aircraft bodies and the 4.4-unit wing span against roofs, gardens and corridor turns. Watch a complete 32-second delivery cycle: berth, horizontal cargo transfer, descent, receiver doors, departure and empty-lift return. Cargo must clear the facade before descending, and the courier must enter the real station opening.
5. Confirm Pulse is visibly busier than Still. All states must retain daylight, readable architectural surfaces and restrained bloom. Check both elevated walking routes, corner landings and terminal lift travel as well as the ground crossing.
6. Exercise buttons and `0/1/2`, keyboard focus at the desktop viewport if the overlay/camera changed. Responsive/mobile acceptance is explicitly out of scope (user decision, 2026-09-17). Check that resize updates both camera projection and composer size. Do not add orbit controls to solve framing problems.

Use the available browser tool and its documented APIs. Browser handles, tab IDs, localhost processes and previous tool sessions can expire; rediscover an existing matching tab rather than assume a previous ID still works. Restore temporary viewport overrides after testing.

## Performance evidence

The canvas publishes:

| Attribute | Meaning |
| --- | --- |
| `data-time` | Last sampled elapsed animation time in seconds; use modulo 32 to identify the delivery phase |
| `data-fps` | Average over the latest **120 rendered frames**, not a fixed two-second interval |
| `data-draw-calls` | Last sampled frame's calls across the composer passes |
| `data-geometries` | Renderer-tracked GPU geometry count; not a scene mesh count |

For a performance claim, use a foreground 1920×1080 viewport, allow shader warm-up and at least 120 frames, and record state, browser/device, viewport, pixel ratio and sampled stats. This FPS includes frame scheduling and is not a GPU timer. Hidden tabs and display refresh rates affect it. Compare geometry counts after warm-up across repeated transitions; stable counts alone do not prove that no objects were regenerated.

Version 1 had a local observation near 60 FPS at a 1080p canvas. Version 2 had an observation near 120 FPS at the normal preview size; its later 1080p diagnostic read did not complete because the browser handle became stale. **Do not reuse either observation as a current, cross-device performance guarantee.** Remeasure when reporting performance after changes.

## Screenshots and completion

- Save meaningful changed-state screenshots in `artifacts/`; preserve the original version-1 evidence. Version-2 files use the `future-` prefix; version-3 files use `air-commons-`.
- Use the same dimensions and camera for comparisons. Animation time is not pinned: note that aircraft/people can occupy different positions.
- Open saved files to inspect them, not just the live tab. In a previous in-app session, a lower-level screenshot API cropped oversized viewports and its full-page capture stitched incorrectly. The unified `getScreenshot` capture at the default 1280×720 viewport worked. Recheck dimensions and edges with the current tools rather than assume that workaround is still needed.
- Leave a working preview when possible. Keep commands and behavior docs current. Final handoff should briefly name the change, checks actually completed, artifact/preview links, and any unresolved issue. Never report a proposed or timed-out check as passed.

For documentation-only work, verify statements against current source and resolve local Markdown links. Do not rerun rendering or builds merely because prose changed.

## Plan 01 local acceptance — 2026-09-17

- `npm test` and `npm run build` passed with Node 26. The existing >500 kB bundle warning remains.
- In-app browser desktop checks at 1280×720 covered Dusk, Pulse, Still, button and keyboard selection, ignored input during transition, visible verdicts, re-selection and clearing the verdict on returning to Dusk. Exact 10-second / four-second boundaries are verified by the state tests; a browser wait for the brief hold message timed out and is not counted as a timing assertion.
- Sampled motion over multiple street/delivery cycles showed the shared diagonal crossing, waiting groups, circulating aircraft and courier berth. Full delivery phase continuity and conservative building clearance are checked numerically; this is not a frame-by-frame collision recording. Browser error/warning log was empty at the final check. Warmed GPU geometry count remained 94 in the final layout samples. No 1080p performance claim was measured.
- Final `shibuya-neutral.png`, `shibuya-pulse.png` and `shibuya-still.png` use the same 1280×720 camera. The screen and ground remain simplified blockout geometry; recognition and final art direction still need user judgment.
- Responsive adaptation is excluded by the user. Newly attempted mobile adaptations were removed. The user chose local acceptance only; no ChatGPT review was submitted after the automatic approval rejection.

## Plan 02 first vertical slice — 2026-09-17

- Reference: [Pic 2](../asset/pic2.png). Architecture, materials, two authored public decks and lifts, upper occupied link, sky infrastructure and engineered filtration membranes replace the former civic-model direction. All three states now use daylight. Old screenshots and the pre-existing Plan 01 acceptance notes are preserved.
- `npm test` covers the existing state/street/delivery checks plus public-journey continuity, deck endpoints, cargo separation and air clearance of the new upper link. `npm run build` passes; the existing >500 kB warning remains.
- Visual acceptance is deliberately limited to this first spatial slice: the result has stronger vertical connections and fewer actors, but remains visibly procedural. Documentary realism, dense integrated city-scale massing and unmistakable Shibuya recognition remain art-direction gaps; these are not marked as passed.
- Public lifts use small authored platforms, without capacity dispatch or avoidance. Upper occupied links are architectural proxies without interior simulation. Rail/pylon collision is visually sampled rather than exhaustively checked. No 1080p FPS or cross-device performance claim is made.
- Final in-app browser checks at 1280×720 covered Daylight → Pulse → Still → Daylight, keyboard and button selection, ignored `2` during the Pulse transition, visible verdict during the hold with disabled controls, re-selection after hold, and clearing the verdict on neutral selection. Screenshots and diagnostics sampled motion from startup through more than 60 seconds; elevated walkers, terminal platforms, aircraft and delivery changed position. Delivery/collision continuity is principally verified numerically, not by exhaustive video inspection.
- The warmed geometry count was 56 in both Pulse and Still samples, with 115 composer draw calls. Error/warning logs were empty. These are local observations, not a 1080p performance benchmark or proof of exact mesh collision.
- Saved and reopened [Daylight](../artifacts/plan02-neutral.jpg), [Pulse](../artifacts/plan02-pulse.jpg) and [Still](../artifacts/plan02-still.jpg). All are 1280×720 with the same locked camera. The express corridor intentionally exits the upper frame; the screenshot is a complete viewport, not a stitched capture. Browser viewport override is reset after validation.
