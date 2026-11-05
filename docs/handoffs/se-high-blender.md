# se-high-blender — SE +1 tower 用 Blender 重建

- Owner: cc100053（唯一驗收人）
- Status: MERGED — owner 2026-11-06「stop at r3」後叫 merge：R3 `8e7478c` 經 merge commit 入 `main`（未過全部 2 分，已知問題見下）
- Branch: `feat/se-high-blender`（worktree `../city2127-se-blender`）
- Base commit: `304084d58a9541a2dde5d63f2820d01b60d6654b`（origin/main）
- Last verified commit: `734533b`（R1）
- Remote availability: `origin/feat/se-high-blender` `734533b`

## Session Git state

- Session starting branch and HEAD: owner checkout `main` `304084d`，有未追蹤／未 commit 嘅 owner 工作（`docs/BLENDER.md`、`.agents/skills/blender-*`、artifacts 截圖等），冇郁；task 喺新 worktree 由 `origin/main` 開
- Last fetched origin/main commit: `304084d`（2026-11-05），local `main` 同 origin 0/0
- Local changes present at session start: 見上，保留喺 owner checkout
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 2026-11-05：SE 夜間分最低（closeup-night R6 20/38，SW 23/30），用 Blender 重建一個 SE focal 版本。Owner 揀 **+1 high**（`se:focal`，H 鏡位），headless Blender（vendored `blender-*` skills）。Rubric 沿用 [closeup-night SE rubric](../../artifacts/closeup-night/se/rubric.md) `fh-*` 六項；收貨只由 owner 決定。Spec 同診斷：[spec](../../artifacts/se-high-blender/spec.md)。

## In-scope files and dependencies

`asset/models/concentration-tower-high/`（`.blend`、`.glb`、`build_tower.py`）、`src/siteBuilders/concentrationTower.ts`（+1 block）、`src/siteAssets/*`、`src/changeCatalog.ts`、`src/siteBuilders/index.ts`、相關 tests。−1／0 唔郁。

## Completed work

- R1：Blender headless（5.2.2）由 `asset/models/concentration-tower-high/build_tower.py` 生成 `.blend`＋`.glb`（22,628 tris、6 個 `se_*` 材質角色、每材質一個 mesh、bounds x −3.5..3.95 / y 0..39.2 / z ±3.5、760,860 B）。`towerUpper` 綁 asset id，`setPreparation` 用 GLB 換走 `tower-high-shell`（R6 procedural 殼留做 fallback），build 時即刻 preload。升降井改 1.2×1.2 喺 (3.3, −1.8)，cabin 1.0×2.0；roof garden 同 meter ring 跟 GLB crown 升高。
- 新 test：`siteAssets.test.ts` parse 真 GLB 驗 root／bounds／roles；`concentrationTower.test.ts` 驗 stub loader 換殼。

## Actual validation results

- Verification status: PARTIAL（未經 owner 收貨）
- `npm test`、`npm run build`、`git diff --check`：Opus 喺 worktree 自己重跑，全綠。
- Blender QA（`qa_check`）：normals／non-manifold／z-fight 全部 0；`se_room`／`se_pane` 開邊同 lamp／light 薄片 floating 係設計（單面牆、浮喺 slab 下 .02）。
- Capture（`se:focal`，3200×1800，12 時／22 時）：`~/city2127-evidence/se-high-blender/r1/`；GLB 200 載入，冇 fallback。
- Judge（`fh-*` 6 項，fresh blind）：absolute 三個 6/6/7 → median **6/12**（R6 喺同 rubric 7/12）；pairwise 對 R6：日 3 勝 1 負 2 和（輸 fh-base），夜 5 勝 0 負 1 和 → keep。Board：`r1/review.jpg`（日）、`r1n/review.jpg`（夜）。
- FPS：NOT RUN。

- R2（`333678a`）：由 target 逐項重做塔 GLB（3 bays、每 3 層 amber、頂層開放＋水缸、獨立升降井、鋪地前庭）＋新 reusable prop kit `city-kit-2127`（19 件，7,202 tris，198 KB，`propKit.ts`）。共用材質冇改（只加 +1 專用 `ceilingHigh`／`cream`／`paving`），所以 −1／0 冇重影。Opus 重跑 test／build／diff-check 全綠。
- R2 judge：absolute 日 10/10/10 → median **10/12**，夜 9/12；pairwise 對 R1 日夜都係 5 勝 1 負（輸 fh-crown：屋頂樹疏、似棒棒糖，amber 環下緣雙層鋸齒）→ keep。Board：`~/city2127-evidence/se-high-blender/r2/review.jpg`、`r2n/review.jpg`、`r2/compare-r6-r2.jpg`。FPS：NOT RUN。

- R3（`8e7478c`）：上層暖色＋`paneHigh`、每層唔同 back-wall＋中間傢俬、`liftGlass`＋每層白環＋大 cabin、cap 單一 meter 環、低屋頂 mound、kit 樹改短樹幹 5–7 lobe、新 kit props（pendant_lamp、rug、whiteboard、upper_cabinet、art_panel、meeting_table）。Keep 區（frame、lobby、forecourt、paving、人仔）同 R2 一樣。Opus 重跑 test／build／diff-check 全綠。
- R3 judge：absolute 日 10/9/9 → median **9/12**（R2 10/12），夜 9/12。逐項 median：floors 2（↑）、frame 1（↓，code 冇改，judge 話角柱似薄平邊）、crown 1（↓，屋頂得矮 mound 冇樹）、lift 1（=，似 amber 梯）、gardens 2、base 2。Pairwise 對 R2：日 4 勝 0 負 2 和；夜 2 勝 2 負（輸 crown、lift）2 和。
- FPS（Sonnet，headed，hero `se:high`，第一個 sample 冇剔）：日 60×6；夜 53.1–56.9。R6 夜係 60；R2 冇量，未知邊個改動拖慢（疑 transparent glass 或 kit instance 數）。

## Known issues and blockers

- R2 低過 2：fh-floors（上層冷白、每層傢俬重複）、fh-lift（得 amber 扶手，玻璃管同 cabin 睇唔到）；夜間 fh-gardens 1。fh-crown 2 分但 pairwise 輸 R1（樹疏＋環鋸齒）。
- Kit 樹幹太長（棒棒糖），同 target 矮叢樹唔同。

- fh-lift 0：井冇凸出、cabin 喺 H 幾乎睇唔到；amber 扶手似立面上嘅 amber 格（fh-frame 由 2 跌到 1）。
- fh-floors 1：傢俬細、每層一樣；fh-gardens 1：露台綠化仍係 procedural 圓球。
- fh-base 1、日間 pairwise 輸：lot 地面由 R6 嘅鋪地變咗草地——呢個 diff 冇郁地面，相信係 R6 之後 main 嘅改動，**未用乾淨 main 確認**。
- Console 有一個未識別嘅 404（Sonnet 報告），GLB 本身 200。

## Important decisions

- Owner 2026-11-05：R1 似 R6 因為 spec 由 R6 出發、鎖咗房間／綠化（Dev_QA Q5）。R2 起 judge 先對 target（absolute），R6／R1 pairwise 只做回歸。
- Owner 2026-11-05：材質唔鎖，只鎖人仔；做出嚟嘅部件（例如樹）要可以喺其他 scene 重用。其他 site 換 kit 係之後嘅 task，今輪唔郁。

- 塔殼（slab、柱、玻璃、升降井、露台、頂）入 GLB，用 `city-roles` 材質名 remap 去 SE 現有材質（夜間 emissive 照舊）；傢俬、人、綠化、cabin 動畫、meter 光環留喺 procedural。R6 嘅 procedural 殼保留做 GLB load 失敗時嘅 fallback。

## Next expected step

Owner 2026-11-06 叫停喺 R3 並 merge 入 main。如果再開：R4 建議（逐項揀）：floors／gardens 用 R3；crown 用 R3 單環＋R2 嗰種高樹（新 kit 樹）；lift 白環減到每 4 層、玻璃更實、cabin 更大更實；角柱加粗圓角（frame 係 locked，要 owner 批）；查夜間 FPS。（舊：R3 建議：上層暖色、每層傢俬唔同、升降井玻璃管要讀到＋cabin 大而實、kit 樹改矮叢、頂環修鋸齒加密屋頂花園。（R2 背景：owner 2026-11-05 叫寫 R2（[spec](../../artifacts/se-high-blender/spec.md) `# R2`）：由 target 逐項寫（T1–T10），材質唔再鎖（只鎖人仔），新做 reusable prop kit `city-kit-2127`（樹、室內植物、傢俬、長凳、lift cabin，真實米＋每 site `unitsPerMetre`）。下一步：owner 批 spec → Sonnet 實作 R2 → 三個 absolute judge 對 target。）
