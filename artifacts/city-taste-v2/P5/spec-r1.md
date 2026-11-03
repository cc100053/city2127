# P5 Greenery — spec r1 (coordinator, 2026-11-03)

Target: `target/master-day.png` / `master-night.png` at 1600×900. Owner rules (memory + taste): **greenery stays lush — futurism through form (edges, terraces, hovering beds), never sparse grids**; no rooftop-tree filler; no floating islands. P1–P4 are merged; don't move buildings. Keep every Meter publishing path (`publishRoofGardens`, environment district terraces, `facadeClimate`) working.

## What the target shows vs now (see latest `P4/rN/hero-h16.png`)

Target: planting is **massed and shaped** — hedge bands and shrub masses spilling over terrace lips, dense clumps of round-crowned trees at plinths and plaza edges, lush terraced cascades inside the ring, round planters on decks. Crowns are varied greens (no pink). Now: (a) the hull and ring ledges carry evenly spaced single "lollipop" trees in rows (reads as a grid); (b) flowering-cherry pink blobs scattered everywhere (`coastalCanopy.ts` cherry rule, roughly one tree in eleven + `cherry` types + landscape allées); (c) tall context towers carry rooftop tree clumps (`plantRoofCanopy(..., tower=true)`) — filler.

## 1. Megastructure planting = massed terraces

- `megastructures.ts` `ring()` / `hull()`: replace "a tree every 13 m" rows with **clustered masses**: per terrace segment, a continuous low shrub band (0.9–1.4 m, slightly bumpy — instanced squashed crowns, 3–4 m spacing, overlapping) along the lip that spills 0.5 m over it, plus **tree clusters** of 3–5 crowns (mixed scales .8–1.5, some `columnar`) every 30–45 m with irregular gaps (hash-based, not even). Same or fewer instances than now.
- Ring inner ledges: dense cascade — shrub bands on every ledge plus clusters, so the lower inner arc reads green like the target.

## 2. No pink, varied greens

- `coastalCanopy.ts`: remove the pink cherry colouring (map `cherry` to a light spring-green broadleaf tint `hsl(.27,.45,.55)` variant instead). Keep 3–4 green tones (deep `hsl(.30,.45,.30)`, mid, light, olive) with per-instance variation.

## 3. Tower roofs: designed crowns, not tree clumps

- `plantRoofCanopy(..., tower=true)` on tall CTX towers: replace the loose tree clump with a **terraced roof garden crown**: two stepped white planter rims (`megaShell`, 0.8 m) with continuous shrub bands and at most 2–3 small trees per roof. Return the same terrace data (`[x,y,z,r]` list) so the Meter publishing still works. Non-tower roofs (mall/landmark) keep their gardens but with the same rim+shrub language.

## 4. Hovering beds (one signature)

- On the P4 plaza deck or at the ring plinth: 3–5 **hovering planter discs** (Ø 8–14 m, white rim with a `megaSeam` under-ring and a faint downward emitter glow), 3–6 m above the deck, each with a shrub mass + one tree. Slow bob (±0.4 m, 7 s) driven from the existing update clock. Machine signature mandatory (no "floating island" rock look).

## Budget, tests, captures

- Tree/shrub instances ≤ current count +15%; ≤ +4 draw calls. Hero ≥ 60 FPS.
- Tests: update counts that pin tree numbers/types (list them); keep Meter and clearance asserts (the far tree-clearance tests in `tests/odaiba.test.ts` are sensitive to crown indices — see `.agents/skills/closeup-polish/SKILL.md` lesson on `plantCanopy` ordering; prefer adding new instances after existing ones).
- Captures `artifacts/city-taste-v2/P5/rN/`: `hero-h16.png`, `hero-h21.png`, `vs-target.jpg` (integration-tip h16 | rN h16 | target), `close-hull-green.png`, `close-ring-green.png`, `close-hover-beds.png`. FPS day/night as before.
- `npm test && npm run build && git diff --check` (read the `fail` count); commit, push `feat/city-taste-v2-p5`, stop servers, report (commit + FPS first).
