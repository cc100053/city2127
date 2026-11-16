# ship-refs-2127 — six reference vessels (draft models)

- Owner: repository owner (requester)
- Status: IN_PROGRESS (models delivered for owner review)
- Branch: feat/ship-refs-2127
- Base commit: 52aa6902 (origin/main, fast-forwarded at session start)
- Last verified commit: working tree on feat/ship-refs-2127 before the first commit (see validation)
- Remote availability: NOT PUSHED

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

## Known issues and blockers

- The originally requested 未来の台場を航く港湾タグボート.png and 未来の海洋調査船とレインボーブリッジ.png were absent from Downloads; the owner chose お台場の未来型消防艇.png and お台場の未来型ハーバーパトロール艇.png instead (2026-11-16). A tug and a survey ship can follow when those images arrive.
- Draft fidelity: faceted primitives, no textures; panel seams, interior consoles and fine piping from the images are simplified. Glass is opaque tinted except the yacht saloon.

## Important decisions

- Folder and naming follow `vehicle-refs-2127` (one builder, `references/` beside it). Primitives and preview are reused from `build_vehicles.py`, not copied.

## Next expected step

Owner reviews the six previews; record per-ship feedback, adjust `build_ships.py` and rebuild. Placement in the city is a separate task.
