# Dev Q&A — Mind craft― 選択の積み重ねでつくる都市 ―

> Historical Q&A from the version4 period. For the current nine-question exhibition, see [the exhibition specification](../EXHIBITION_SPEC.md#抽題輪換唯一現行版本).

The owner's questions and the answers, recorded from 2026-11-05. Each answer cites the code or doc it was checked against, so it can be re-verified when the code changes.

---

## Q1 (2026-11-05). Theoretically, how many changes can guests see? Is the number the same as the close-up shots?

**Short answer:** there are three different numbers. They are not the same thing:

| What | Count | Meaning |
| --- | --- | --- |
| City states (Meter part) | **343** | 3 Meter sites × 7 rungs each: 7³ |
| City states (energy part) | **31** reachable | 36 combinations, minus 5 the thresholds can never reach |
| Whole-city structural states | **343 × 31 = 10,633** | Before slot-seed variation (see below) |
| Change types one guest can trigger | **48** | 36 ladder steps + 12 energy part steps |
| Close-up camera shots | **74** | Fixed camera poses, not changes |

### 1. City states

- **Meter sites:** NW (automation), SW (sharing) and SE (concentration). Each has a ladder from −3 to +3, so 7 rungs (`layout.tiers`). That gives 7 × 7 × 7 = **343** combinations. NE (environment) has been frozen at mixed since E4, so it adds no rungs. Source: [EXHIBITION_SPEC](../EXHIBITION_SPEC.md) "分級階梯＋headline" section.
  - ±1 changes only the focal building.
  - ±2 turns half of the district carriers.
  - ±3 shows the full form.
  - When two sites both reach ±3 on the same side, a P10 paired facility appears. That pairing is decided by the rungs, so it adds no extra states.
- **Energy (Q3):** four independent parts ([survey/src/shared/energy.ts](../../survey/src/shared/energy.ts)):
  - water gardens: 0 / 1 / 2
  - orbital receiver wing: none / small / large
  - flywheel ring: off / on
  - island: off / on

  That is 3 × 3 × 2 × 2 = 36 combinations.
  - **How a part turns on:** a part appears only when its choice has at least 2 votes and at least 20 % of (energy answers + 4). Level 2 needs at least 40 %.
  - **The 5 unreachable combinations:** their minimum shares add up to 100 % or more, which can never happen:
    - water 2 + receiver large + ring and/or island (3 combinations)
    - water 2 + receiver small + ring + island
    - water 1 + receiver large + ring + island

  So **31** energy states are reachable. All four parts at once needs at least 16 energy answers.
- **More variety on top of 10,633:** the vote order sets each district's `slotSeeds` when it first reaches ±2. Two runs with the same rungs can therefore light up different slots. Mixed rungs also use their own hybrid mix. The *structure* has 10,633 states, but the exact visible layouts are more than that.

### 2. What one guest can change

The rule is that each proposal moves **at most one Meter site by one rung** (G1, `ladderStep` in [survey/src/shared/cityView.ts](../../survey/src/shared/cityView.ts)).

- **Ladder steps:** 3 sites × 12 directed adjacent steps (−3→−2 … +2→+3 and back) = **36**.
- **Energy steps:**
  - water 0↔1↔2: 4
  - receiver none↔small↔large: 4
  - ring on/off: 2
  - island on/off: 2

  That is **12**. One vote adds one count, so a part cannot jump 0→2 in one step.

So a guest can trigger **48** kinds of headline change.

- **More than one change at once:** an energy step can happen together with a ladder step, and other energy parts can drop as shares shift.
- **Only one is shown as the headline:** `pickHeadline` picks one change for the close-up and result card. The others transition quietly.
- **When nothing changes:** a proposal can also change nothing structurally. In that case G2 switches the activity of the guest's chosen energy part, so there is still something to watch.

### 3. Close-up shots: 74, not the same number

The 74 shots in `SHOTS` ([src/headlineCamera.ts](../../src/headlineCamera.ts), asserted in `tests/headlineCamera.test.ts`) are **camera poses**:

| Group | Shots | Used when |
| --- | --- | --- |
| `*:focal`, `se/nw:focal-low` | 6 | A ±1 focal change. `focal-low` is a closer, lower pose when SE/NW moves toward low |
| `*:district` | 4 | Fallback when a district change has no changed-slot points |
| NW / SW / SE hand-written viewpoints (incl. `nw:street`) | 59 | A ±2/±3 district change. The camera takes the viewpoint covering the most changed slots, and on a tie the one used longest ago |
| `energy:*` (garden, garden2, ring, wing, island) | 5 | Energy part changes |

By site: SE 39, SW 18, NW 10, energy 5, NE 2.

- **Why the numbers differ:** a shot is chosen *from* a change. One change type (for example SE +1→+2) can be filmed from many SE viewpoints depending on which slots moved. One focal shot also serves both directions of a ±1 step. So 48 change types map onto 74 poses, and 10,633 states map onto those same 74 poses.

---

## Q2 (2026-11-05). A guest must see an obvious change after the vote, but the city lacks 2127 taste and the models are bad. Does that mean the first job is to rebuild and polish the models of those 48 changes?

**Short answer:** yes, the close-up models come first, but it's not 48 models. It's about **24 model looks**, judged as **before→after pairs**, and the taste target is locked before any modelling.

### Why it's not 48

The 48 are *transitions*. Many of them reuse the same few models:

- **Focal building (±1):** the focal value only reads the rung's sign (`t` = 0 / .5 / 1 in `ladderLayout`, [EXHIBITION_SPEC](../EXHIBITION_SPEC.md)). So each focal site has only **3 looks**: low, mixed and high. 0→+1 and +1→0 are the same two models.
- **District carriers (±2, ±3):** these use the same low / mixed / high carrier forms. ±2 turns half of them and ±3 turns the rest. So that's **3 looks** per site, with the rung only deciding *how many*.
- **Energy:** water gardens 1 and 2, receiver small and large, ring, island: **6 looks**.

Total: 3 sites × (3 focal + 3 carrier) + 6 energy ≈ **24 looks**. If those 24 are good, all 48 transitions improve.

### What to polish first

1. **Taste before models.** Lock the 2127 target first (current authority: [CITY_MASTER_TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md), the 2026-11-02 "visible super-high-tech" rewrite). Then make owner-picked Gemini target images per look (the closeup-polish skill rule). A good model with the wrong taste still fails problem 1.
2. **Judge the pair, not the single model.** "Obvious change" means the two adjacent looks differ in a two-second glance from the headline camera. The owner two-second recognition gate (24 groups) is still recorded as **not done** ([closeup-next](../handoffs/closeup-next.md)).
3. **Focal ±1 first.** Every site starts at 0, and a run's first changes are always 0→±1 focal steps, so the focal low/mixed/high looks are seen most early on.
4. **Then district carriers.** ±2 changes only half the carriers, so it's the weakest change to read.

### Where it stands (2026-11-05)

| Site | Close-up status |
| --- | --- |
| SE (concentration) | Day golden sample accepted (R4). Night redo merged at R6 20/38, below the 90 % bar |
| NW (automation) | Flagship R9 25/28 and bays R2 19/20, owner accepted |
| SW (sharing) | Night redo merged at R8 23/30, below the bar |
| NE (environment) | Frozen at mixed since E4, so not part of the ladder |
| Energy (5 shots) | Earlier energy polish batch integrated; not re-judged against the 2127 taste v2 |

Tools that already exist for this: the `closeup-polish` skill (one site per pass, Gemini targets, blind judge, owner acceptance) and `?shot` / the DEV close-up panel (simulates one-rung guest choices).

---

## Q3 (2026-11-05). Should we use Blender for the building models? After many rounds the model is still not close to the target photo.

**Short answer:** yes, for the **focal buildings** (the main object in each close-up). Keep code for the parts code is good at. Run one pilot first to prove the switch is worth it.

### Why rounds stall

The Meter close-up models are built in TypeScript from Three.js primitives (boxes, cylinders, a few extrusions) in [src/siteBuilders/](../../src/siteBuilders): `commonsPlaza.ts` 744 lines, `concentrationTower.ts` 609, `automationHub.ts` 594. A Gemini target image has curved shells, bevels, panel seams, layered facades and soft forms. With primitives, each round edits numbers in code, so the result stays boxy no matter how many rounds run. That is a tool ceiling, not a lack of effort.

Blender has bevel, subdivision, booleans, curves, arrays and proper UV/material work. That's what is needed to get close to a photo. The pipeline already exists:

- [docs/BLENDER.md](../BLENDER.md) holds the export rules: metres, Z-up → glTF +Y, `.blend` + `.glb` committed together, stable node names.
- The GLB loader already serves `future-tree-2127` and `automation-hub-upper` ([src/siteAssets/assetCatalog.ts](../../src/siteAssets/assetCatalog.ts)).
- Blender MCP is installed on this Mac (per-workstation setup).

### Split of work

| Blender (GLB) | Keep in code |
| --- | --- |
| Focal building per look (low / mixed / high) | Ladder logic, which look shows, `ladderLayout` |
| One district carrier per look (then instanced) | Instancing many carriers, slot seeds |
| Detailed materials, emissive window/light materials | Build/demolish transitions (`BuildCut` clips any mesh), pulses, journey |
| | Day/night light control, people, traffic |

### Things to watch

- **Names:** transitions and night lights address parts by name, so the GLB needs stable child node and material names.
- **Performance:** existing tests check mesh budgets (for example `automationHub.test.ts`). Keep triangle counts and draw calls in budget, and instance the carriers.
- **Not everything is the model.** Night scores (SE R6 20/38, SW R8 23/30) also depend on lighting, bloom and camera. Gemini images have painterly light real-time can't fully match. Separate "shape wrong" from "light wrong" when judging.
- **Binary assets:** one named owner per `.blend` with no parallel edits (BLENDER.md).

### Pilot before rollout

Rebuild **one** focal look in Blender, for example one SE focal look, since SE scored lowest at night (20/38 ≈ 53 %, vs SW 23/30 ≈ 77 %). Judge it with the same closeup-polish judge kit and the same camera as its last code round. Roll out to the other ~24 looks only if the score clearly beats the code version.

---

## Q4 (2026-11-05). Are these installed, and do we need them? (1) MCP for Blender (30k+ stars, can call Meshy / Tripo / Rodin / Hunyuan), (2) blender-skills (Blender 5.2: QA, baking, rigging, export), (3) threejs-skills.

**Checked on this Mac:** `claude mcp list`, `uv tool list`, the Blender 5.2 extensions folder, and `~/.claude/skills`, `.claude/skills`, `.agents/skills`.

| Package | Installed? | Need it now? |
| --- | --- | --- |
| 1. `ahujasid/blender-mcp` | **No.** We have a *different* Blender MCP: the official **Blender Lab MCP** (`blender-mcp` v1.0.2 from projects.blender.org, pinned rev `ff54e4d`, add-on in Blender 5.2 `extensions/user_default/mcp`), which is connected and is what [docs/BLENDER.md](../BLENDER.md) specifies | **No** as a second MCP. Maybe a one-off AI-mesh trial |
| 2. `EL4CTEO/blender-skills` | No | **Optional.** Only the modeling / UV / bake / web export / QA skills, after reading them |
| 3. `CloudAI-X/threejs-skills` | No | **No** |

### 1. ahujasid blender-mcp

- **What it adds over our MCP:** Rodin and Hunyuan3D AI generation, plus Poly Haven / Sketchfab assets. Meshy and Tripo are not in the official repo; Tripo only shows up in a fork.
- **What we already have:** the official MCP already runs Python in Blender, summarises scenes and takes screenshots. That's all that hand-modelling a focal building needs.
- **Why not install it:**
  - Two Blender add-ons acting as servers in the same Blender is extra risk.
  - It runs third-party code.
  - The AI services need paid API keys, and AGENTS.md treats external services and asset packs as separate tasks.
- **Why AI meshes don't fit our models:** they come out as one heavy, messy mesh with no named parts. Our build-cut transitions, module order and night lights need named child nodes and a low triangle budget, so a generated mesh would need retopology and splitting first.
- **Where it could help:** turning a Gemini target image into a rough 3D *block-out* for reference. That can be tested once on the Rodin / Hunyuan website without installing anything.

### 2. blender-skills

- **What it is:** 22 skills for Blender 5.2: modeling, UVs, PBR, baking, rigging, animation, export (incl. web) and QA. It installs into `~/.claude/skills` and `~/.agents/skills`.
- **Which parts matter:**
  - **Useful:** modeling, UV / bake and GLB export QA. These match the Blender pilot in Q3.
  - **Not useful:** rigging and animation, since the buildings are static and motion stays in code.
- **How to install:** read the skill files first. Then install only the needed ones into the repo's `.agents/skills`, so they don't clash with BLENDER.md's export rules. Don't install all 22.

### 3. threejs-skills

- It's general Three.js basics (fundamentals, geometry, loaders, shaders), checked against r160+. This project is on three **0.180** and already has its own conventions in [docs/PROJECT.md](../PROJECT.md) and [docs/ART.md](../ART.md), plus a large existing codebase.
- The problem is shape quality, not Three.js knowledge, so this skill won't fix it.

Sources: [ahujasid/blender-mcp (ecosyste.ms)](https://awesome.ecosyste.ms/projects/github.com%2Fahujasid%2Fblender-mcp), [blender-mcp 1.8.0 on PyPI](https://pypi.org/project/blender-mcp/1.8.0/), [naab007 fork](https://github.com/naab007/blender_mcp), [EL4CTEO/blender-skills](https://github.com/EL4CTEO/blender-skills/wiki), [CloudAI-X/threejs-skills](https://github.com/cloudai-x/threejs-skills).

**Outcome (2026-11-05, owner: "Add useful blender skills"):** 8 of the 28 upstream skills were vendored into `.agents/skills/blender-*` (core, hardsurface-modeling, pbr-materials, retopology-uv, texture-baking, export-pipelines, asset-qa, game-optimization). The scripts were scanned for network/shell calls: the only one is `blender-core/scripts/run_in_blender.py`, which launches local Blender headless. Use the `gltf` export preset, not `web` (Meshopt is unsupported here); see [docs/BLENDER.md](../BLENDER.md#agent-skills-2026-11-05).

## Q5 (2026-11-05). Why does the SE +1 Blender R1 look like it targets R6 instead of the target photo?

Because the R1 spec was written from R6, not from the target image ([spec](../../artifacts/se-high-blender/spec.md), branch `feat/se-high-blender`):

- **The spec was a fix-list for R6.** Its diagnosis table listed R6 faults and their fixes. It also kept R6's dimensions, lift position and terrace positions so the existing code would still fit.
- **Most of what you see was locked.** The spec marked furniture (`furnish()`), people (`crowd()`), greenery, terraces and the room materials as **Keep**. So every room, person, plant and terrace bush in R1 is R6's code.
- **Blender only replaced the white shell.** That is slabs, columns, mullions and the crown, which are a few pixels wide at `se:focal`.
- **Target features never made it into the spec:**
  - 3 wide bays per floor (not 5)
  - indoor trees inside the floors instead of external bush terraces
  - a full-height lift tube beside the tower with a large visible cabin
  - an open top floor with a white water-tank drum and lights under the cap
  - white ceilings with linear lights
  - a thick amber band every few floors
  - a paved forecourt with benches and people
- **The judging rewarded closeness to R6.** The pairwise judges compared R1 with R6 (wins 5–0 at night), but the absolute score against the target stayed at 6/12. So "better than R6" was reported as progress while the distance to the target did not change.

**Fix:** write the next spec item by item from the target image; unlock rooms, people and greenery for +1 only (high-only materials and fit-outs, so −1/0 stay untouched); judge absolute against the target first.

## Q6 (2026-11-05). Is this plan aligned with the project? (1) the city lacks future taste, (2) shift to "one vote one change" with a close-up and explanation, (3) refine the 3D asset workflow. Then: didn't `feat(guest-agency)` already shift the logic, and should we review and polish all 64 angles?

**Short answer:** direction (1) and (3) fit with guard-rails; (2) is **already implemented as logic** and only needs its visual and explanation gates closed.

**1. Future taste — fits, with limits**
- Hologram / floating / mega-structure belong in the **baseline city (ambient layer)**, not tied to Meter values. Low, zero and high Meter values must all look like mature 2127 ([AGENTS.md](../../AGENTS.md)); v2 scores leave global atmosphere alone.
- Keep greenery lush; futurism through edges, terraces and form, not sparse grids.
- Use **one** clear hero mega-structure as the visual anchor, not scattered small holograms, and budget instancing and draw calls.

**2. "One vote one change" — already done in logic** (`95b3e4c`, [guest-agency handoff](../handoffs/archive/guest-agency.md))
- G1: each proposal moves at most one site by one rung, guest-led (LEAD=1); the accumulated city is kept.
- G3: the headline is always the guest's own same-direction change.
- G2: when no tier can move, a mature energy facility alternates between two visible configurations, so every vote has a change and a close-up.
- G7: the close-up flies to the slots that actually changed.
- Still open: G5 Japanese attribution copy (the "explanation"), G4/G7 visuals (SE hard to read, SW court3 overlapping focal, street foreground pillar, water-court framing), shadow-redraw performance, and the owner's two-second recognition test.
- Not the same as the original wording: "one building". G7 can change several slots of a district at once (±2/±3). Making it strictly one building is a new product decision. Do not rewrite the Meter system; "guest = one voice among many" still holds.

**3. The 64 angles**
- `VIEWPOINT_COVERAGE` in [src/headlineCamera.ts](../../src/headlineCamera.ts) holds the viewpoints. `play()` uses them **only** for a district change (±2/±3) at NW/SW/SE that has `points` and is not energy or `focalOnly`. ±1 uses the focal shot; energy uses the 5 `energy:*` shots.
- So guests do not see all 64 equally. The handoff records 40 real proposals hitting only 22 shots.
- Plan: (a) measure how often each viewpoint is picked (200×40 sim); (b) polish by frequency: high = full closeup-polish (Gemini target → owner approval → Blender → day/night), mid = occlusion/near-plane/framing only, never-picked = delete or merge (bay1/bay2 is the precedent); (c) clear known problems first; (d) accept by the owner's two-second recognition test.
- Open decision for the owner: cut the 64 to roughly 30–40?

**Not checked:** the frequency stats were not run, the 64 viewpoint screens were not re-inspected, and "22 shots" is quoted from the handoff.

### Refined statement / 精煉版 / 整理版

**繁體中文**

| 問題 | 方向 |
| --- | --- |
| 整座城市未有 2127 年的未來感 | 在 Hero 鏡頭加入打破常規的未來元素（全息投影、浮空物、超大型構造物）。這些屬於**基線城市**，不隨 Meter 數值改變；以一個明確的巨構作視覺錨點，保持茂盛綠化，並控制 instancing 與 draw calls。 |
| 每一票的城市變化不夠明顯 | 邏輯已在 guest-agency（G1–G3、G7、G2）落實：每位 Guest 的一票都產生一個變化，並有近鏡與說明。現在要做的是令變化**一眼可辨**：補齊 G5 日文歸因文案、解決 G4／G7 視覺問題，並通過 owner 的兩秒辨認測試。保留累積制，不改 Meter 系統。 |
| 3D 資產外觀不佳 | 流程：建築故事 → 加入未來感 → 生成 Gemini 目標圖 → owner 審批目標圖 → Blender MCP 建模 → `blender-asset-qa` 檢查 → 面數與材質預算 → 放入城市，並在 Hero 與近鏡兩種距離驗收。規格要**逐項對照目標圖**撰寫，不可只修正上一版（見 Q5）。 |
| 近鏡視角（64 個）的打磨 | 先統計各視角被選中的頻率；高頻者完整打磨，中頻者只修遮擋與構圖，從未被選中者刪除或合併。 |

**日本語**

| 課題 | 方針 |
| --- | --- |
| 街全体に 2127 年らしい未来感が足りない | ヒーローショットに常識を破る未来要素（ホログラム、浮遊物、超大型構造物）を加える。これらは**ベースラインの街**に属し、Meter の値では変化させない。明確な巨大構造物を 1 つ視覚の軸とし、緑の豊かさを保ち、インスタンシングと draw call を管理する。 |
| 一票ごとの街の変化がわかりにくい | ロジックは guest-agency（G1–G3、G7、G2）で実装済み：ゲスト一人の一票が一つの変化と、近接ショット、説明を生む。残る課題は変化を**ひと目で分かる**ものにすること：G5 の日本語帰属文の確定、G4／G7 の視覚問題の解消、オーナーによる 2 秒認識テストの通過。累積制は維持し、Meter システムは変更しない。 |
| 3D アセットの見た目が悪い | 手順：建物のストーリー → 未来感の付加 → Gemini ターゲット画像の生成 → オーナーがターゲット画像を承認 → Blender MCP でモデリング → `blender-asset-qa` で検査 → ポリゴン数・マテリアル予算 → 街に配置し、ヒーローと近接の両距離で検収。仕様はターゲット画像に**項目ごと照らして**書き、前バージョンの修正リストにしない（Q5 参照）。 |
| 近接アングル（64 個）の磨き込み | まず各アングルの選択頻度を計測する。高頻度は完全に磨き込み、中頻度は遮蔽と構図のみ修正し、一度も選ばれないものは削除または統合する。 |

## Q7 (2026-11-10). After reading the guest-agency handoff: what is the next effective move? Should we build a sheet of every voting close-up now, then polish each building or element one by one?

**Short answer:** Yes to a sheet, but count first and do not cover everything. Order: (1) frequency sim, (2) review sheet of the changes that really fire, (3) polish one by one in frequency order.

- A sheet already exists: `~/city2127-evidence/untracked-artifacts-20261113/city-change-review/` (2026-10-29/30, untracked). It is stale: it predates G7 (only the 13 fixed shots, none of the 64 viewpoints), the G2 energy activity states, and the SE / NW / train Blender polish. Reuse `build-index.mjs`; do not start a new format.
- Step 1 — frequency (handoff next step 5, not started): run the 200×40 sim and count each `(site, rung from→to, shot)` and each energy part. With guest-led `LEAD=1` every proposal moves one rung, and ±1 uses the focal shot, so focal shots and the 5 `energy:*` shots probably carry most guests; the 64 viewpoints only fire on ±2/±3 district changes (40 real proposals hit 22 shots, per the handoff, not re-measured).
- Step 2 — sheet: before/after pairs **in the real close-up frame**, both directions (e.g. +2→+1), day 12:00 and night 22:00, sorted by frequency. The owner marks each row: OK / framing only / full polish / delete or merge.
- Step 3 — polish in that order with the closeup-polish flow (Gemini target → owner approval → Blender → day/night). Never-picked viewpoints are deleted or merged, not polished.
- Limits: the sheet is static, so it is a triage tool only. Acceptance is still the owner's live two-second recognition test (G0-4). G5 Japanese attribution copy and the SE tower6 draw-call check (1191 vs 718) stay open in parallel.

**Sources:** [docs/handoffs/guest-agency.md](../handoffs/archive/guest-agency.md) "Next expected step" 1–6 and G4; `~/city2127-evidence/untracked-artifacts-20261113/city-change-review/build-index.mjs`. **Not checked:** the sim was not run; the frequency claim about focal/energy shots is an expectation, not a measurement.

## Q8 (2026-11-10). Besides Blender focal models, is there an alternative or better way to make each vote's change obvious and entertaining?

**Short answer:** Yes. The frequency sim (8000 simulated proposals, `scripts/closeupFrequencySim.ts`) shows about 64% of close-ups land on 37 district viewpoints and only about 32% on the 5 focal shots, so polishing focal models alone misses most guests. Four other levers, by entertainment per unit of work:

1. **Polish the transition, not each model.** One shared "build" choreography (drones or cranes assemble, a light sweep, parts rise in sequence) runs on every slot of every site. The guest watches the change happen, which is the entertaining part, and it is written once.
2. **One Blender kit per district, instanced.** SE has 4 towers + 10 pods, SW 6 rooms + 10 courts, NW 6 bays: 5 module families. Polishing 5 modules (each with its states) improves all 37 viewpoints at once.
3. **Fewer, wider shots with bigger changes.** Replace the 37 slot viewpoints with 1–2 authored shots per site and make one rung change more slots at once, so the change reads by quantity. This is a vote-rule change (owner decision).
4. **Readability aids in the frame.** A before/after wipe, an outline or a short label on the changed thing. Cheap, and it targets the two-second recognition test directly, but it adds UI over the city.

**Recommendation:** 1 + 2, with 3 to cut the shot count; keep Blender focal models for the pieces already done (SE, NW). Use 4 only if the two-second test still fails.

**Not checked:** none of these is prototyped; the review sheet was still being captured when this was answered, so which sites are weakest is not yet known. The percentages are from a leaning-guest simulation, not real guests.

## Q9 (2026-11-11). Should we polish in the order of the frequency table, starting from the scene guests trigger most?

**Short answer:** Mostly yes, with two changes: sort by frequency × how weak the shot looks now (not frequency alone), and polish per reusable module family (one kit serves several shots), not per table row.

- Current numbers (rerun on main `8773dab`, 8000 simulated proposals): `se:stage-east` 16.7%, `nw:stage-west` 13.9%, `sw:stage-rooms-west` 11.0%, `sw:focal` 10.5%, `sw:stage-rooms-east` 6.4%, the four SE/NW focal shots 5.0–5.6% each, `sw:stage-courts-west` 4.4%, `nw:stage-mid` 4.1%, `se:stage-south` 2.9%, `sw:stage-courts-south` 2.8%, `nw:district` fallback 1.3%, four energy shots 1.1–1.2% each.
- Grouped by what would actually be modelled: SE tower + pod kit 19.7%, NW bays 18.1%, SW rooms 17.4%, SE focal 10.9%, NW focal 10.6%, SW focal 10.5%, SW courts 7.2%, energy 4.5%.
- Already polished and owner-accepted: SE focal (R4), NW flagship and bays (R9 / R2). So the largest unpolished shares are the SE pod/tower kit, the SW rooms and the SW focal.
- Suggested order: (1) SE pod/tower kit, (2) SW rooms, (3) SW focal, (4) SW courts, (5) energy last. NW needs a live check, not a new round.
- Every row also plays the shared build transition (merged 2026-11-11), so the owner's pending look at NW/SW build motion should come before choosing targets: it may change which shots still look weak.

**Sources:** `scripts/closeupFrequencySim.ts` output on 2026-11-11; [docs/handoffs/guest-agency.md](../handoffs/archive/guest-agency.md) 2026-11-10/11 entries; archived SE / NW close-up handoffs. **Not checked:** no shot was viewed in the browser for this answer; "weak" comes from the 2026-11-11 static sheet notes. The percentages come from a leaning-guest simulation, not real guests, and from seed-0 stage ordering.

## Q10 (2026-11-11). As an exhibition piece aiming for awards, what is the project still missing? Is the base concept (a vote dressed up as choosing the future) the problem?

**Short answer:** Partly the concept, not the craft. The piece is currently "survey → 3D visualisation": it has no stated thesis, the choices carry no cost (every Meter end is an equally mature 2127), and a guest's contribution vanishes after the 13 s result slot. Model and transition polish is a hygiene factor with diminishing returns; it will not change how the piece is judged. The existing material (accumulation, inheritance, "one voice among many") is strong enough to keep; it needs a twist that makes it felt.

Missing elements, by impact per unit of work:

1. **A one-sentence thesis.** Suggested: the gap between "my ideal city" and "our city" (あなたの理想の街は、みんなの街にはならない). This also answers the "people may not agree with how the city looks" worry: disagreement becomes the content.
2. **My city → our city.** Show the guest's solo city (all sites at their own vote) for a few seconds, then dissolve into the accumulated city and state the gap. `deriveExhibitionLayout` and the immediate snapshot path already exist.
3. **Cost in every choice.** Each option names what is given up, voiced by a resident on the losing side. Keeps "all ends are mature futures"; this is a product-direction change (owner decision).
4. **A personal trace and a takeaway.** A persistent, numbered mark of this guest in the city (the 64 vote lanterns are the starting point) plus a card or QR with the 暮らしの声 number and that moment's city.
5. **Time-lapse of the whole run.** Replay all proposals in ~30 s (the reducer replay exists); it is also the core of the award submission video.
6. **The minority made visible.** The city shows only the mean; show what the losing votes wanted.
7. **Real guests.** S5 has never run; five observed first-time guests before further polish.

Building stories (the owner's idea) fit under 3 if told as changed resident lives, not facility facts.

**References named (from memory, not looked up for this answer):** teamLab Sketch Town, Lozano-Hemmer *Pulse Room*, MIT CityScope, MIT Moral Machine, Superflux *Mitigation of Shock*, Dunne & Raby *United Micro Kingdoms*. **Not checked:** no web research, no specific award's judging criteria, nothing prototyped; the app was not run for this answer.

**Q10 follow-up (2026-11-11).** The owner rejected item 2 ("my city → our city"): the three Meter positions are all mature 2127 and differ only by degree (a bit more green, a bit more privacy), so a solo city and the accumulated city would look nearly the same. Accepted. Revised reading: the root gap is that the axes are sliders of degree, not opposed worldviews, so no effect can make a change dramatic. Two paths: (a) leave the city subtle and move the drama to residents' lives, a personal trace, the run time-lapse and live A/B tug-of-war; (b) redesign the ±3 ends to differ in kind (silhouette, colour, crowd, motion). Suggested first check: all −3 vs all +3 hero frames side by side, shown to someone new for two seconds. **Not checked:** those frames were not captured for this answer.

## Q11 (2026-11-11). Path A is chosen (keep the city subtle, move the drama elsewhere). How do we actually execute it and turn the current project that way?

**Short answer:** Path A is a copy-and-card layer on top of the existing system; scoring, ladder, the 13 s timeline, A/B lifecycle and the DB stay as they are. Three of its pieces already exist in part: the question 街は、誰が決めるのか (`intro.origin`), the guest's own light on the Sky Ring, and the planned [day-replay](../handoffs/archive/day-replay.md).

Reading of the frequency sheet (contact-01, contact-05 viewed): focal ±1 changes differ in kind and read well in close-up (SW amphitheatre vs pod garden, SE tower vs low pavilions); district ±2/±3 single-slot changes are weak. So the weak part is the frequent district shots, which path A stops relying on.

Order of work:

1. **Resident bible (paper).** One fixed resident per site, each with a gain-and-loss line per direction of change, plus the thesis sentence. About 20 short Japanese lines. Owner approves.
2. **Wire into the result card.** Replace or follow the "…が増えました" sentence with the resident's line, keyed to the actual tier change (`residentResult()` in `src/surveyAtmosphere.ts`; copy recorded in RESIDENT_COPY). Supersedes the "formal version" left open in [change-explanation](../handoffs/archive/change-explanation.md).
3. **Five observed first-time guests** on `dev:auto`, before anything else is built.
4. **Photo card on the iPad handoff screen:** voice number, four choices, the resident line. No hosting; the guest photographs it.
5. **Day replay**, with chapters narrated by the same resident lines; doubles as the award video.
6. **Tug-of-war / tipping-voice attribution** (and the A-vs-B case). This is G5 attribution copy, still pending owner approval.

Model polish: stop after the unit in progress; district kits drop in priority.

**Not checked:** whether per-option vote counts per axis are available to the client (needed for 6); whether a resident line fits the 360 px card and the 13 s slot; only 2 of 9 contact sheets were viewed; nothing prototyped.

**Q11 follow-up (2026-11-12).** Owner direction after the Minato demo: every change unit is done in two stages — first polish the building or change element where it needs it, then build a resident scene (a character model acting out the change). This supersedes "Model polish: stop after the unit in progress" above and folds the Q9 polish order into one unit table: [docs/RESIDENT_SCENE_PLAN.md](../RESIDENT_SCENE_PLAN.md). Skills: `polish-ladder` (pick unit, gate, record), `resident-scene` (stage 2), `closeup-polish` (stage 1). **Not checked:** how district results (about 60% of close-ups in the simulation) reach a resident is not designed.

## Q12 (2026-11-13). A 60 m event-facility "module shelf" (3×2×2 frame, crane gantry, 12 swappable event modules): which Meter, and where?

**Decision (owner):** it follows the vote on **publicSharing (SW)** and becomes the **new SW flagship**. The SW focal socket moves from COMMONS PLAZA (`src/layout.ts:213`, 12×10 m, between Aqua City and Hilton) to a new 60 m lot, and **COMMONS PLAZA is retired** (or demoted to a district prop). No sea backdrop needed. The target image (owner-supplied) is the mixed (0) state; −1 and +1 still need generating.

**Correction (same day):** the lot first chosen, (40, −300), is **wrong**. It is the NW AUTO HUB lot (`changeSites.nw` = (43, −300), 48 × 72 m at scale 3; `HUB_LEGACY_LOT` (40, −300)). The scan harness raycasts only `city`, which does not contain the survey change sites, so it reported the AUTO HUB's ground as free (and its 14,110 px "hero visibility" was the hub's own plinth). Re-filtered with every change-site footprint excluded, the usable lots are, best first by hero pixels: (−100, 320) ≈ 870 px, 6 cells, court 6 at 50 m; (30, 320) ≈ 490 px, 2 cells; (−350, 320) ≈ 100 px, 1 cell; then hero-hidden (−200, 310), (110, 300), a large area around (210–250, 230–260), (240, −180). **Lot chosen (owner, 2026-11-13): (−100, 320).** Probe: the 36 × 24 core is clear at 3/12/20 m and a 24 m radius is clear at (−100, 315) (hero ≈ 920 px); a coastal-canopy tree row sits on the 30 m edge (keep as border planting); the lot's north half crosses the district edge (`DISTRICT.maxZ` 320), so the build centre is nudged to about (−100, 312). Nearest street is 75 m away, so the frontage direction is still open.

**Why SW, flagship:** open bays read as shared public space; SW is the least polished axis; a focal shows at ±1 (≈10.5% of headlines), a single court only at ±2/±3. Four-site contract is kept by moving the socket rather than adding a fifth.

**Overlap noted:** housing U (fixed frame + swappable pods + track, background, not voted) is the same idea at small scale; this one is larger, event-use, crane on top, open bays.

**Not checked:** which of the remaining lots to use, 60 m corners, render, stage camera, air lanes, non-`city` objects (housing M/P/U beyond distance, energy, Sky Ring), impact of retiring COMMONS PLAZA. Nothing implemented.

## Q13 (2026-11-13). Module shelf: height, handling, and states.

**Decision (owner):** 40 m tall (ten tiers of 4 m, 60 slots of about 12 × 12 × 4 m); handling option A (roof gantry with extended rails, vertical guide rails on the front and back column faces, cable hoist along the outer wall, modules slide into the slot on their own drive shoes and latch at the four corner couplings; the empty top tier is a transfer deck for rear slots; ground tier is fed by the two ground rails). The shelf is the **mixed (0) state only**; if the vote moves SW to −1 or +1, it is replaced by another building (not yet chosen; suggestion: reuse the current COMMONS PLAZA private-garden and open-plaza models on the new lot).

**Not checked:** air-lane clearance at 40 m (service lane is 30–45 m), ten-tier target image (existing images are two-tier), and the replacement buildings.

**Q13 follow-up (2026-11-13).** Replacement for SW −1/+1: reuse the existing COMMONS PLAZA models (private garden, open plaza), moved onto the new lot and scaled; only the location of COMMONS PLAZA retires. **Not checked:** how `commonsPlaza.ts` scales to a 60 m lot.

**Q13 follow-up 2 (2026-11-13).** Style/mechanism target: ten-tier candidate B (`gen/tower10-b.jpg`: two full-height guide rails, module arriving on the ground rails, module half-slid into a mid-tier slot). Build to 10 tiers × 4 m, not the 7–8 tiers drawn.

## Q14 (2026-11-13). How should the next "place a finished building image" task run, and which skill applies?

**Answer:** use the new `place-building` skill (branch `feat/place-building-skill`). A decide session asks the four massing questions together, writes a fit table in metres, sites the lot with `SCAN_LOT=w,d[,x,z]` in `tests/odaiba.test.ts` (rejects change sites, courts, housing, towers, pods, bays, routes and the district edge by footprint), generates only missing state targets, and writes the handoff. Then **owner judges each round, and each round is a fresh session** that ends committed, pushed and sent. The skill map lives in one AGENTS.md line; `dream-loop` now fires only on "dream loop".

**Lessons behind it (SW shelf):** the old scan missed survey sites (NW AUTO HUB lot offered twice) and checked an inscribed circle (court 6 overlap, district-edge overshoot fixed only in R3); four ±1 images wasted before the massing was locked; a stale shared prompt block capped targets at 7–8 tiers; R2 ended its turn uncommitted; the coordinator session compacted.

## Q15 (2026-11-15). Where does the Rectenna Farm Canopy fit and when does it appear?

**Decision (owner):** the original-size GLB is the target and follows votes. Use it as Q3's large orbital receiver on the land site at (−117.75, 82.4); the owner confirmed “近鏡跟去新址 is fine. go”. Under 20% (or fewer than two orbital votes) there is no receiver; 20% to below 40% uses the existing small offshore wing; 40% or more uses the farm. The denominator is all Q3 energy votes plus four. The host terrain probe reported CLEAR for 64.5 × 64.8 m. See [R1 handoff](../handoffs/archive/rectenna-farm-placement.md).

## Q16 (2026-11-17). Q02-A 水の棚田 (64.8 × 65.1 m, 32 m): role and where to place it?

**Decision (owner):** role pending (it will follow a Meter later); this task covers placement and surroundings only. GLB as-is is the target; load at original size and measure FPS before any decimation. Lot: west-shore sea at (−375, −170), beside water court 1 (−310, −151), coexisting with it, not replacing it. Facing: front toward the city (east), falls to the southern sea (`rotation.y = π/2`).

**Why sea:** `SCAN_LOT=66,66` finds no clear land lot anywhere; the sea probe at (−375, −170) has only water reasons and 3,059 hero px, about 18 m west of water court 1.

**Not checked:** service-drone sweeps, boat lanes, water level vs the GLB's own ocean plane, shore access line, FPS. Handoff: [q02a-hydro-placement](../handoffs/archive/q02a-hydro-placement.md).

**Q16 follow-up (2026-11-17).** R1 built in the same session (owner: 「做埋 R1，喺呢度做」) and accepted as is (「R1 可以接受」): island at (−375, −170), 74 m walk from its north edge to the north revetment, water-taxi loop's west turn moved south of the lot (phase 11.25 s), three water rooms re-spread. The building does not show in the hero frame. Merged to main.

## Q17 (2026-11-18). The guest questions were updated (SURVEY_V2, nine questions). How should the Meter scoring change so the new questions fit, reuse the existing buildings, and give every guest a real change?

**Answer (proposal, nothing implemented; owner decisions pending):** keep the engine (S/R/M reducer, scale A, G1 guest-led ladder, `pickHeadline`, one proposal per guest) and swap what the axes mean. Each SURVEY_V2 parameter that has a polished site becomes an axis; guests answer the **P** (daily-life) wording, the **U** "city change" is what the site shows.

| Phase 1 question | Axis (internal key kept) | Site and states |
| --- | --- | --- |
| Q01 委任度 | automation | NW AUTO HUB + bays, unchanged (U01 = delivery hub, Minato) |
| Q02 技術受容性 | new ordinal `technology` replacing the 4-way energy vote | −1 Q02-A 水の棚田 (built), 0 Q02-B bay-flower receiver (built, unplaced), +1 Q02-C rectenna farm (placed) |
| Q03 共有志向 | publicSharing | SW unchanged (shelf, rooms, courts, Nagi); Q03-A drawer housing as an extra −1 slot later |
| Q07 生活効率 | urbanConcentration, re-read as "people go to the hub (+1) vs goods come to you (−1)" | SE tower and pods unchanged (Tokiko) |

Why: all four sites are already owner-accepted or built, so G1 keeps ≈95% guest-direction changes (agencySim, 200×40 biased model, not real people), and Q02 moves energy from share thresholds (weakest agency, 4.5% of headlines, needs G2 fallback) onto the ladder. Phase 2 adds Q05 (revive the frozen environment axis), Q06 (housing M/P/U + pod-frame tower = Q06-B), Q08 (event modules) and Q09 as "4 of N" questions drawn per guest, preferring axes where every answer can move a tier; categorical questions (Q05/Q06/Q07/Q09 per the planning notes) use a seat ladder (one slot flips to the guest's option per proposal while within ±1 seat of vote share). Q04 stays off stage (SURVEY_V2 itself notes a small visual effect). Per-axis `n` (answers to that axis) replaces total guests in `g(n)` once questions are drawn.

**Sources:** `docs/planning-team/SURVEY_V2.md`, `SURVEY_V2_REVIEW.md` R01–R05 (unanswered), `docs/EXHIBITION_SPEC.md` (累積與權威 layout, G1, E4), `docs/handoffs/guest-agency.md`, `docs/RESIDENT_SCENE_PLAN.md`, `asset/models/LIBRARY.md` (bay-flower-receiver, pod-frame-tower-2127, q02a-hydro-terrace, drawer-housing-2127).

**Not checked:** simulation of the draw rule and the seat ladder; bay-flower lot; whether owner accepts the SE re-reading for Q07.

**Q17 follow-up (2026-11-18).** Owner's idea: rotate among 20–30 polished models; one proposal moves exactly one model; the question pool grows, each guest gets 4 questions drawn from the city state, then sees one change. **Answer:** sound. One question ↔ one site ↔ about three polished models, so 20–30 models need only 7–10 questions (SURVEY_V2's nine fit). G1 already moves at most one site per proposal; to make "one change = one polished model" true, each site drops to three focal states (district ±2/±3 only where a stage is polished). Selection runs in two stages: before answering, draw the 4 least-recently-changed sites whose every possible move lands on a polished model; after answering, move one of them toward the guest's choice (least recently shown first). For categorical questions, and optionally all, the site swaps straight to the chosen model. Toy simulation (scratchpad, 10 sites × 3 states, 60 guests, 500 runs, biased fake guests): adaptive draw gives every site 5.0–6.6 changes vs 4.2–7.9 for a random draw; a fixed 4 leaves six sites unchanged; about 2% of guests still see no change (all four answers equal the current state), so a fallback is needed. Trade-offs: the city reflects recent voters more than the crowd; three of four answers show no change; the adaptive draw biases the planning team's parameter statistics.

**Q17 follow-up 2 (2026-11-18).** How to keep the crowd's view when every guest swaps one model? **Answer (proposal):** represent the crowd by screen time: over the run, each model's share of time on screen should track its share of votes. A guest's choice may swap in only if that model has not already had more screen time than its vote share plus a slack (10 points), and among the guest's four answers the most under-shown model wins. Toy simulation (scratchpad `share.py`, 10 sites × 3 models, 120 fake guests, 400 runs): the screen-time vs vote-share gap falls from 11.4 to 3.4 points, sites showing the crowd's majority at the end rise from 43% to 53%, no-change rises from 2.1% to 3.4%. Pair it with the crowd share in the result card and hologram so the guest sees both their change and where the crowd stands. Not checked with the real ladder or real guests.

**Q17 decision (owner, 2026-11-18).** Show the crowd share; do **not** use the screen-time = vote-share rule; swap **directly** to the chosen model. Simulation of that rule (`~/city2127-evidence/question-rotation-sim/swap400.py`, 400 runs × 120 fake guests, draw the 4 least-recently-changed sites, change the least-recently-changed site whose answer differs from the shown model):

| Sites (models) | No change | Changes per site, min–max | Models seen | Longest wait for a site (guests) | Card share median / p10 | Swapped to a <33% option |
| --- | --- | --- | --- | --- | --- | --- |
| 4 (12) | 1.6% | 27.3–31.7 | 100% | 9.2 | 35% / 21% | 43% |
| 7 (21) | 1.6% | 15.6–18.1 | 100% | 12.2 | 35% / 20% | 42% |
| 10 (30) | 1.5% | 10.9–12.8 | 99.8% | 15.2 | 36% / 20% | 40% |

Reading: about 1 in 65 guests needs the fallback; rotation stays even; about four in ten changes put a minority choice on screen, so the crowd-share line on the result card is what tells the guest where the crowd stands. Fake guests (crowd preference per site plus a 40% personal lean), not the real ladder or real people.

**Q17 follow-up 3 (2026-11-18).** Placement, fixed vs free lots, roads, and whether questions match buildings. **Answer (proposal):** (1) Current lots: AUTO HUB (43, −300) north shore, event shelf (−100, 297) south shore, SE tower (182, −38), drawer housing (−104, 81), rectenna farm `FARM_CENTRE` (−152, 408), hydro terrace (−375, −170) west sea; bay-flower and pod-frame tower unplaced. Each lot is sensible for its building; what is wrong is the question each lot answers. (2) Use a lot catalogue rather than four fixed sockets: a question whose three models share terrain and size swaps in one lot; a question whose models need different terrain (Q02: sea, bay, land) gives each model its own lot with a polished "empty" state (park, water, pad). Lots carry size class, terrain, height limit (service air lane 30–45 m) and access anchor, and stay subject to `SCAN_LOT`. (3) Roads: freeze the network; each lot owns a fixed spur ending at a threshold pad (today `automationHubAccess` and `drawerHousingAccess` in `src/streetKit.ts` are per building); each model puts its entrance on that pad and brings its own forecourt dressing, which swaps with it; a test checks every model's entrance against its lot. (4) Fit: strong for Q01 ↔ AUTO HUB, Q02 ↔ hydro / bay-flower / rectenna, Q03-A ↔ drawer housing, Q06-B ↔ pod-frame tower, Q08-C ↔ event shelf; weak for the earlier proposal Q03 ↔ SW commons and Q07 ↔ SE tower (withdrawn). Several P wordings ask about a different object than the building shown (P02 water bus vs power plant, P06 furniture vs building), so questions should be rewritten as a resident's daily-life view of that facility. Not checked visually today.

## Q18 (2026-11-18). Where in the city does the Q02-B bay flower receiver go?

**Answer (owner decisions, decide session):** off the south park's west shore, outside the Sky Ring: flower centre (−712, 300), yaw 149.5° so the machine room sits due east of the flower on a short platform off the west promenade (x ≈ −596). Full size (flower about 128 m across, 42 m tall, beam to 900 m). When Q02 shows A or C the lot is plain sea and the machine-room platform stays. Owner picks: 「西南公園外海」, 「淨海面，機房平台保留」, 「原尺寸 1:1」, 「接受 (−712, 300)」. Alternatives turned down: the north bay inside the ring (too tight, taxis, beam through the ring deck) and the open sea north of the ring (version4 energy island and wing, no shore). Checked by raycast in the DEV page: only sea in the footprint, one bay cruiser run at z ≈ 250 crosses it and must move; not in the hero frame (0 px). Not checked: the water-plane seam at x ≈ −755 under the flower's west edge, the 0.9 m step between platform and promenade, FPS. Handoff: `docs/handoffs/bay-flower-placement.md`.

## Q19 (2026-11-19). Where does the Q06-B pod-frame tower go, and what do Q06 A and C show?

- The hero district had no clear 58 × 46 m lot except the far south-east corner, unseen from hero. Owner: "should we deal with the old building first? To clear out the space or rearrange?" → housing U was retired from the city and the tower stands on its old lot (−258, −75), front north ("好，拆住宅 U"). Placement and north-east close-up: "接受".
- Q06 A and C (no models yet): the tower fades out to lawn; A↔C stays on hero. In version4 runs the tower stands as fixed background.
- Live Q06 swaps day/night (tower fades to lawn and back, mid-fade warm slab glow included): "Accept".

## Q20 (2026-11-19). Which old buildings should be removed or relocated for question rotation?

- Scan (`feat/question-rotation` `19de91f3`, captures `~/city2127-evidence/question-rotation/old-scan/sheet.jpg`, neutral layout as in a rotation run). Recommendation only, nothing changed:
  - Housing M (stilt cabins, (−165, −165)): unpolished, sits 54 m from NE PARK inside the NE close-up frame with the pod tower. Recommend remove from the city as with U (version4 changes too; DEV `?housing` keeps it).
  - Housing P (plant-membrane A-frame, (45, −215)): wedged under the ring building, 85 m from the NW AUTO HUB, barely visible. Keep as background; low priority.
  - NE PARK (cooling axis, no question in the rotation set, frozen at mixed): do not move it; repurpose its lot as the Q05 (environment) lot.
  - SE TOWER and pods (concentration, frozen at mixed): keep as background; candidate lot for Q09-A.
  - Water garden, flywheel ring, energy island, offshore wing: the rotation set has no energy question, so they never appear in rotation runs. Not a space issue; deletion only matters for version4 and waits for owner decision per item.
- Owner answer: pending.
