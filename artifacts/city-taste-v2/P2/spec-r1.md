# P2 Civic core + floating focal pieces — spec r1 (coordinator, 2026-11-03)

Target: `artifacts/city-taste-v2/target/master-day.png` (compare at 1600×900; night target `target/master-night.png` if present). Taste: `docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md` — every impossible object shows its machine (stabiliser rings, under-emitters, field edge, light beams). P1 (ring building, arch, terraced hull in `src/megastructures.ts`, footprints in `src/megaFootprints.ts`) is already on the integration branch — don't change it. Out of scope: secondary building restyle and facade holograms (P3), ground (P4), greenery (P5), traffic (P6).

Hero settled camera at 1600×900 (`heroSettledCamera` in `src/heroCamera.ts`). Civic chamber (-18, 100, 23) projects to screen (0.52, 0.41).

## 1. Civic core — frame-and-sphere landmark at target strength

Target: a white open megaframe (screen x 0.42→0.67, y 0.23→0.67) with **one big polished chrome sphere** hanging in its centre at (0.49, 0.42), terraced green floors inside the frame, slim vertical glass lifts. r0 (`src/civicCore.ts`) has the frame but a small glass chamber, dark blue window panels and an inner diagonal escalator that read busy.

- **Chrome sphere:** replace/upgrade the chamber look so the frame centre holds a sphere Ø ≈ 42 m at (-18, ~100, 23): `chromeSphere` finish `#e8ecef`, roughness .08, metalness 1.0 (use the scene environment map the renderer already has; if none reaches it, a `CubeCamera` is NOT allowed — fake with a small equirect gradient env texture on that one material). Fine meridian seams (12 thin `megaSeam`-like lines, reuse P1's seam material) and a slim equator ring. Hold it with 4 thin tension members to the frame corners (visible machine). Keep `SPHERE_DOCK` / anything that references the chamber position working (grep callers: `layout.ts SPHERE_DOCK`, sky ring docking, tests).
- **Frame finish:** white `megaShell`-like finish (reuse P1 material exports) on the main frame members; the dark blue window panels on the frame towers become pale glass (`megaGlass`) with white slab bands. Keep the existing planted floors.
- Size: if the frame can grow ~15% in height/width without breaking tests (site clearance, sky ring clearance), do it; otherwise keep size and say why.

## 2. Floating sphere in a field ring (new, upper right)

Target: a large sphere (screen centre ≈ (0.86, 0.16), Ø on screen ≈ 0.11 of width) floating high, wrapped in **two crossed glowing field rings** (one horizontal disc-ring around its equator, one tilted vertical ring), **under-emitter pods** on its underside (3–4 small cylinders with downward cool glow), and a faint **field-edge shell** (transparent, fresnel-rim, additive, low opacity).

- Place at world ≈ (-200, 215, 250) (≈750 m from camera; check by capture that it sits right of the space elevator column and doesn't collide with the Sky Ring or elevator — move ±60 m if needed). Sphere Ø ≈ 55 m, panelled white/silver (`megaShell` + seam lines + a few dark window strips), equator ring Ø ≈ 95 m (tube 1.5 m, `megaSeam` emissive), tilted ring Ø ≈ 85 m at ~70°, field shell Ø ≈ 105 m.
- Motion: slow bob (±1.5 m, 9 s) and ring rotation (one turn / 40 s). Drive from the same clock the city already animates with (find it; no second RAF).
- Role: label nothing; it is the floating civic chamber (taste principle 3).

## 3. Self-assembling building (new)

Target (screen ≈ (0.76–0.88, 0.33–0.60)): a building being built in mid-air — a few white/glass modules (cubes ~14–18 m) hovering apart above a partial core, each module linked to the core by a **cool light beam** (thin transparent additive cone/quad), plus a slim gantry arm.

- Put it on top of the hull's low left end or just in front of it (screen ~ (0.78, 0.45); world near (-190, 0…90, 110) — check `megaFootprints` so it sits ON the hull deck or on free ground, never piercing). Core: 2–3 finished storeys on a 30×30 m base; 4–6 floating modules at heights core-top + 8…40 m, slowly drifting toward their sockets and resetting (cycle ~30 s, ease in-out); beams from each module down to its socket; one robotic gantry arm (2 boxes + joint).
- Instanced or merged; ≤ 6 draw calls for this piece.

## Budget, tests, captures

- New draw calls ≤ 14 total for P2. Hero ≥ 60 FPS day/night.
- Add asserts in a test file (extend `tests/megastructures.test.ts` or new `tests/floaters.test.ts`): floater/assembly positions clear of Sky Ring, space elevator and P1 footprints; civic sphere centre inside the frame.
- Night: field rings, seams, emitters and beams glow cool white-blue (stronger at night via the existing night factor P1 uses — `updateMegastructures`/`updateOdaiba`).
- Captures to `artifacts/city-taste-v2/P2/rN/`: `hero-h16.png`, `hero-h21.png`, `vs-target.jpg` (integration-tip h16 | rN h16 | target), `close-civic.png`, `close-floater.png`, `close-assembly.png` (DEV `?review=…&cam=x,y,z&at=x,y,z` pattern P1 used). FPS day/night (vsync 1920×1080 `data-fps`, discard first, median ≥5).
- `npm test && npm run build && git diff --check`; commit, push `feat/city-taste-v2-p2`, stop servers, report (commit hash + FPS first).
