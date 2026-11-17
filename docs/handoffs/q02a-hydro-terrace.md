# q02a-hydro-terrace — Q02-A 空中の水の棚田（Blender 素材）

- Owner: noifex
- Status: DONE（素材 source／GLB 已提交；未放入 runtime）
- Branch: main（asset-only 例外；worktree `../city2127-q02a`，由 origin/main 快進）
- Base commit: 52aa690fcd162d0a27b5bfa45f92325f989d5ca7
- Last verified commit: 本 handoff 所在 commit（提交前喺 worktree 驗證，見下）
- Remote availability: NOT PUSHED
- GitHub Issue (optional): 無

## Session Git state

- Session starting branch and HEAD: `docs/q06-prompts` d0fb27632b066e63d2c0c76b6808e6d8868e2077（主 checkout）
- Last fetched origin/main commit: 52aa690fcd162d0a27b5bfa45f92325f989d5ca7（2026-11-17 fetch 成功；本地 main 64a145a 係其祖先，無分歧，於 worktree 內 `merge --ff-only`）
- Local changes present at session start: 主 checkout 有 `docs/planning-team/*` 修改及 `resident-bedroom` 相關未追蹤檔，全部保留冇郁；本任務只喺獨立 worktree 進行
- Upstream integration status: NOT NEEDED（直接由最新 origin/main 開始）
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

將 2127 設施畫像 Q02-A「古い変電所をまたいで育った、空中の水の棚田」（`.dream-loop/prompts/Q02-A_imag_v2.png`，U02-A「既存の電力設備を中心に更新する」）做成 Blender 模型。尺寸對齊 `rectenna-farm-canopy`（約 ±32 m、地面以上約 34 m）。用戶分 r1→r3 逐輪目視（r3：提高精度、刪除人形、不理檔案大小），之後要求輸出 GLB 並按 AGENTS.md 放置及提交。

## In-scope files and dependencies

- `asset/models/q02a-hydro-terrace/`：`build_hydro_terrace.py`（生成器）、`q02a-hydro-terrace.blend`（source）、`q02a-hydro-terrace.glb`（export）
- `asset/models/LIBRARY.md`：Folders 表新增一行（`tests/assetLibrary.test.ts` 要求）
- 本 handoff 及 `docs/handoffs/README.md` 索引一行
- 排除：`src/`、layout、change site、Meter、任何 runtime 整合

## Completed work

- 生成器 `build_hydro_terrace.py`：舊變電所（四面古典立面、框窗、中央高廳、入口雨篷）、變壓器場（礙子、儲油櫃、散熱片、門架）、四層錯開圓形水池（金屬包邊、欄杆、路燈、種植帶）、瀑布（弧形水唇、三層水幕、泡沫、水珠）、四架 7.6 m 水車（各自獨立物件，driver 旋轉）、發電機房（鋼架台座）、抽水管束＋頂部水缸、六支 Y 形腳柱（光帶、斜撐）、下沉蓄水池（10 級梯級、堰、出海細瀑布）、Ocean modifier 海面、地面光線溝、100 棵樹。無人形。
- 材質：23 個；水面／瀑布為 procedural shader（波紋、向下流動條紋，以 frame driver 驅動），另設 viewport display 色（Solid 模式可見顏色）。
- 動畫（只喺 .blend）：frame 1–120，水流與水車旋轉。
- GLB：靜態（frame 30），procedural 材質壓平為單色 PBR（Fall 0.85、Foam 0.9、Mist 0.25、Glass 0.3 alpha）。

## Actual validation results

- Verification status: PASSED（素材層面）；Application verification: NOT INTEGRATED
- Date and checked commit/worktree: 2026-11-17，worktree `../city2127-q02a` 基於 52aa690＋本任務檔案
- Blender：5.2.2 LTS，glTF exporter 隨附版本
- Source 重現：`Blender -b --factory-startup --python-exit-code 1 -P build_hydro_terrace.py -- q02a-hydro-terrace.blend` 喺乾淨 factory 設定下成功（BUILT 28 groups），提交嘅 .blend 即此輸出；無外部貼圖／library 依賴
- Export 設定：glTF 2.0 Binary（.glb）、+Y up、`use_selection`（root `q02a_hydro_terrace` 及其子物件）、apply modifiers、no animation／camera／light、no Draco／Meshopt／KTX2。Export 前喺背景程序把材質壓平（不寫回 source）。
- 空 scene 重新匯入 GLB：root `q02a_hydro_terrace`；28 meshes；299,652 tris；23 materials；bounds（Blender 軸）x −32.84..32.02、y −32.10..33.00、z −3.40..32.20；origin 為地面中心；海面中心 x ≈ +26（不對稱特徵方向正確，無翻轉）。截圖 `~/city2127-evidence/q02a-hydro-terrace/glb-reimport.png`
- 檔案大小：.blend 3,915,614 B；.glb 8,537,420 B（現有 GLB 中最大，用戶指示不理大小）
- `npm test`：exit 0（含 `asset library index OK (23 props, 9 modules, 25 folders)`）；`npm run build`：成功（只有既有 chunk size 警告）；`git diff --check`：無輸出。2026-11-17 喺 worktree 提交前執行
- Evidence/environment：`~/city2127-evidence/q02a-hydro-terrace/`（目標圖、r1–r3 渲染、GLB 重匯入圖），Git 外
- Integrated commit and checks: NOT INTEGRATED（無 runtime 消費者）
- Changes since verification: 無

## Known issues and blockers

- GLB 無水流動畫、波紋、水車旋轉；runtime 若要水效果需另寫 Three.js shader 或 bake 貼圖（另一任務）。
- 未量 FPS；三角面 30 萬、GLB 8.5 MB，放入城市前要同整合 owner 定預算。
- 視覺差距（用戶未要求修）：前方 Y 形腳柱斜撐略生硬；池身偏淺灰（原圖偏白銀）；頂部水缸比原圖管道群簡單。
- 用戶目視只到 r3 渲染圖；未做 owner 驗收（LIBRARY 狀態 `draft`）。

## Important decisions

- 尺寸以 `rectenna-farm-canopy` 為準（用戶 2026-11-17）。
- r3：刪除人形、不理檔案大小（用戶 2026-11-17）。
- GLB 只作靜態素材；動態水只保留喺 .blend。
- 生成器自帶 primitives，未用 city-kit（工作起源於 `.dream-loop/` 探索，site-only）。

## Next expected step

如要放入台場城市：開 feature branch，定位置／比例／三角面預算，用 `src/modelAssets.ts` 的 `addCityModel` 載入並跑 VALIDATION 的瀏覽器檢查。另外 push main 需用戶確認。
