# ship-refs-2127 — six reference vessels (draft models)

- Owner: repository owner (requester)
- Status: IN_PROGRESS (models delivered for owner review)
- Branch: feat/ship-refs-2127
- Base commit: 52aa6902 (origin/main, fast-forwarded at session start)
- Last verified commit: d12ad06 (checks below ran on its tree)
- Remote availability: origin/feat/ship-refs-2127 at d12ad06

## Session Git state

- Session starting branch and HEAD: main at 1811cdf90d59a857f6820fddef3ab616eab04914, clean
- Last fetched origin/main commit: 52aa690 (fetched 2026-11-16); local main was 7 behind and was fast-forwarded before branching
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE. `git` is not on PATH on this Windows workstation; the session used GitHub Desktop's bundled git.

## Goal and acceptance criteria

Copy the owner's six ship images into the project and build one `.blend`, one `.glb` and one preview per ship with Blender, hull and on-board equipment only (Rainbow Bridge, sea and spray stay in the images). Accepted when the owner approves each ship from its preview.

## In-scope files and dependencies

- `asset/models/ship-refs-2127/references/*.png` (owner images, original names), `build_ships.py`, `review_ships.py`, `<ship>.blend/.glb/.png`
- `asset/models/vehicle-refs-2127/build_vehicles.py`: `preview()` gained `floor_z`/`floor_half` parameters (defaults keep the vehicle output)
- `asset/models/LIBRARY.md` row (required by `tests/assetLibrary.test.ts`)

## Completed work

| Ship | Reference image | Modelled equipment |
| --- | --- | --- |
| `sail-yacht` | レインボーブリッジを望む未来の帆船.png | faceted silver hull, teak decks, glazed saloon + hardtop, cockpit/saloon lounge, wing mast, battened main and jib, rigging, rails, fin keel, swim platform |
| `robo-fireboat` | レインボーブリッジを望む赤白の未来消防艇.png | red/white faceted hull, three robotic monitors, hose-reel bays, bridge, sensor tower, ladders, yellow rails, deck rings |
| `cargo-ship` | 未来型貨物船、レインボーブリッジ遠景.png | bow block with bridge and mast, four open side bays with cargo pods, hatch deck, knuckle crane with spreader gripper |
| `rescue-patrol` | お台場の未来型救難パトロール艇.png | deep-V white hull, blue stripes, tinted canopy, blue/amber light bar, life ring housing, swim platform |
| `fireboat` | お台場の未来型消防艇.png | red hull with white swoosh and stern stripes, two-tier deckhouse, mast, three monitors, twin hose reels, knuckle crane, fenders, rails |
| `harbour-patrol` | お台場の未来型ハーバーパトロール艇.png | silver faceted hull, lab windows, raked bridge, light bar, mast, satcom dome, A-frame, winch, yellow aft rails |

Contract: real metres, design waterline at z 0 (three.js y 0; underwater hull modelled), bow -Y Blender = +Z three.js, root empty `ROOT_<NAME>`, `ship_*` material roles, no textures.

## Actual validation results

- Verification status: PARTIAL
- Date and checked commit/worktree: 2026-11-16, feat/ship-refs-2127 working tree
- Blender 5.2 (Windows): `build_ships.py` built all six; `review_ships.py` re-imported every GLB: all OK (straddles waterline, stem at -Y, transom at +Y, every mesh has materials). Metrics (tris / GLB bytes): sail-yacht 10456 / 317 KB, robo-fireboat 17484 / 579 KB, cargo-ship 17380 / 437 KB, rescue-patrol 5062 / 138 KB, fireboat 21856 / 637 KB, harbour-patrol 10444 / 314 KB.
- `npm run build`: PASS. `git diff --cached --check`: PASS.
- `npm test` on Windows: `assetLibrary` PASS (25 folders) and every other test PASS except `surveyMeterPipeline` and `energyPipeline`, which fail before touching this change: the question-file path is built from a URL pathname (`C:\C:\...\%E6%96%87%E4%BB%B6\...`), a pre-existing Windows/non-ASCII path bug. The run needed a stale, git-ignored `asset/models/car-candidates-2127/__pycache__` (2026-11-14, not part of this task) moved aside temporarily; it was restored. Not verified on macOS/CI yet.
- Application verification: NOT INTEGRATED (no runtime consumer; not placed in the scene).

## Owner review rounds

- Cargo ship, round 1 (2026-11-17): the owner asked for a closer match to the reference: long and low hull, raked/faceted bow, a lower forward bridge, and the positions of the four side bays and the crane. Other ships wait until the cargo ship is accepted. Changed in `cargo_ship()` (same parts, new dimensions): 68.8 → 76.0 m long, deck 7.6 → 6.4 m; the stem rakes from the deck edge at f 38 back to f 30.5 at the waterline with a sharper wedge entry (pw 1.15); a diagonal crease (f 14–26) separates the darker lower hull; chamfered bay openings 2.3–5.95 m between f −30 and 15; bridge 2.6 m tall over f 19–31; the crane sits on a chamfered plinth over the stern block with a short steep boom and a long jib reaching f −8. Removed the foredeck rail and bow hawse plates, which the reference doesn't have. New `compare_ship.py` renders the reference camera (per-ship `CAMS`). Comparison sheet (reference / before / after): `~/city2127-evidence/ship-refs-2127/cargo-r1/cargo-ship-compare.png`. `review_ships.py`: all six OK.

- Cargo ship, round 2 (2026-11-17, session start: main 52aa690 clean = origin/main; switched to feat/ship-refs-2127 at 81f193c, 0/0 against its remote): the owner said the proportions were closer but it still looked like a modern freighter, and asked for (1) a bow cut into a few large facets with a fold running toward midship, (2) a low bridge continuing the bow with a continuous dark window band, (3) bays with clear chamfered frames and recess depth, the crane base and folding gear merged into the stern, plus a no-emission clay view. Changed in `cargo_ship()`: new helpers `plane3`/`mirror3`/`facet` (bisect + cap: one flat facet per plane) and `bay_cutter` (octagonal opening that widens toward the hull side = sloped frame). The hull is lofted as a full block and carved: an inward-leaning upper facet and a lower facet raking to the waterline meet in a knuckle from the stem (f 37.6, h 4.2) down aft into the first bay frame (f 14, h 3.6); a flat dark stem face; a sloped dark band under the bays (h 1.7 → −0.3) carries the fold to the stern; quarter facets at the stern. The bridge (f 16.5–30, top D + 2.7) is a block cut by the same upper planes, so its walls lie in the bow facets, with a chevron front, raked back and a matte dark window band (D + 0.55 … 2.1) round the front and both sides. Bays: ceiling 5.95 → 5.7, frames slope 0.35 m at the hull side, the first bay's fore edge leans aft 1.6 m. Crane: on a faceted stern block (D + 1.8) cut by the quarter planes, hexagonal pedestal, raked slewing house, thicker main boom, twin luffing rams and a knuckle ram; centred on x 0. Cargo glass is matte (roughness .6) so the band stays dark at the reference angle. `compare_ship.py` gained `--clay`. Evidence (`~/city2127-evidence/ship-refs-2127/cargo-r2/`): `cargo-ship-compare-r2.png` (reference / round 1 rendered from the 81f193c `.blend` / round 2, same camera), `cargo-ship-clay-r2.png`. `review_ships.py`: all six OK (cargo 15014 tris, 13.04 × 76.10 × 17.88 m). `npm run build` PASS, `git diff --check` PASS. `npm test` (Windows, stale `car-candidates-2127/__pycache__` moved aside and restored as before): `assetLibrary` and every test up to it PASS; the chain then stops at `surveyMeterPipeline` with the known `C:\C:\...%E6%96%87%E4%BB%B6` question-file path bug, so the tests after it did not run here. Not verified on macOS/CI.

## Known issues and blockers

- The originally requested 未来の台場を航く港湾タグボート.png and 未来の海洋調査船とレインボーブリッジ.png were absent from Downloads; the owner chose お台場の未来型消防艇.png and お台場の未来型ハーバーパトロール艇.png instead (2026-11-16). A tug and a survey ship can follow when those images arrive.
- Draft fidelity: faceted primitives, no textures; panel seams, interior consoles and fine piping from the images are simplified. Glass is opaque tinted except the yacht saloon.

## Important decisions

- Folder and naming follow `vehicle-refs-2127` (one builder, `references/` beside it). Primitives and preview are reused from `build_vehicles.py`, not copied.

## Next expected step

The owner judges cargo-ship round 2 from the comparison sheet and the clay view. Open gaps against the reference: the reference camera sits closer than `CAMS`, the mast is still a plain post (the reference has a dark lattice tower), no hull panel seams. After acceptance, run the same comparison loop on the other five ships, one at a time: add each ship's camera to `CAMS`, edit its builder function and rebuild. Placement in the city is a separate task.
