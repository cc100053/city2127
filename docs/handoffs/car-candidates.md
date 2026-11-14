# car-candidates — 兩台 2127 街道車候選（Blender）

- Owner: cc100053
- Status: IN_PROGRESS — 候選可預覽，等 owner 揀外觀；未替換展示場景車輛
- Branch: `feat/car-candidates-2127`
- Base commit: `28c03b85b656222e2008b0beb3523010f57eea38`
- Last verified commit: 見 branch tip（驗證結果見下）
- Remote availability: origin/feat/car-candidates-2127

## Session Git state

- Session starting branch and HEAD: `main` `28c03b8`，working tree 乾淨，同 origin/main 一致
- Last fetched origin/main commit: 開工時 `28c03b8`（2026-11-14）；之後 origin/main 前進到 `1f4e5c0`（Nagi round 4–5，與本任務無關，可能同 `asset/models/LIBRARY.md` 表格相鄰）
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED（未 merge／pull main）
- Pending Git conflicts or synchronization blockers: NONE；merge 時留意 LIBRARY.md Folders 表

## Goal and acceptance criteria

Owner 要兩台台場 2127 街道車候選，沿用 `car_human` 嘅尺寸、朝向、原點：

- **未來綠能風 `car_green`**：圓潤車身、開闊窗面，暖白＋低飽和青綠；太陽能板融入車頂。
- **未來科技風 `car_tech`**：低伏車身、俐落輪拱（八角）同車身折線，深灰金屬、煙燻玻璃、細窄冷色燈帶。

兩台都要認得出前後輪廓，近看有窗框接縫、頭尾燈組、輪拱。另存 `.blend`／`.glb`，保留現有車輛檔案；同一台場街景、同鏡頭同光線對照，加近照；驗證 GLB 可載入。這一輪做到可預覽，owner 確認外觀後先替換場景車輛。

## 交付

- 模型：`asset/models/car-candidates-2127/`
  - `build_candidates.py`：Blender 5.2.2 headless 重建兩台（`blender -b --factory-startup --python-exit-code 1 -P build_candidates.py`）；import `car-family-2127/build_car.py` 嘅 `Mesh`、`box`、`person`、`seat`、`ground`、`lerp_table`、`to_object`，車殼係同一套 loft（t 車尾 0..車頭 1，row 由底中線到頂中線，左右鏡像），改成每台車一份 table。
  - `car-green-2127.blend/.glb`（root `ROOT_CAR_GREEN_2127` → empty `car_green`）、`car-tech-2127.blend/.glb`（`ROOT_CAR_TECH_2127` → `car_tech`）。
  - `review_candidates.py`：由 GLB 重新 import（即 Blender 載入驗證），同 `car_human` 一齊出 studio 審查圖；`close` 參數加車頭、車尾、車輪、車頂近照。
- 合約（同 `car_human`）：實米、長 4.6 m、地面接觸 y = 0、車頭 +Z（three.js）、車輪 z = ±1.42；material roles `car_body`／`car_interior`（colour attribute）、`car_glass`、`car_seam`、`car_head`、`car_tail`、`car_shadow`。
- 測試：`tests/carCandidates.test.ts`（已加入 `npm test`）用 three.js GLTFLoader 解析兩個 GLB，檢查 variant 名、7 個 roles、colour attribute、尺寸、貼地、頭燈 +z／尾燈 −z、預算。
- LIBRARY.md：`car-candidates-2127` folder row，`draft`。

| | car_human（現有） | car_green | car_tech |
| --- | --- | --- | --- |
| 尺寸 W × H × L（不含地面陰影） | 1.85 × 1.91 × 4.6 | 2.01 × 1.63 × 4.63（含 camera pod、輪拱唇） | 2.04 × 1.33 × 4.64 |
| Tris（GLB 重新 import） | 3,776 | 9,120 | 8,916 |
| GLB | 275 KB | 307 KB | 322 KB |

## Actual validation results

- Verification status: PARTIAL（見下）
- Date and checked commit/worktree: 2026-11-14，`feat/car-candidates-2127` 未 commit 工作樹
- Blender 載入：`review_candidates.py` import 兩個 GLB 成功；bounds、地面 z = 0、roles 如上表。
- three.js 載入：`node --experimental-strip-types tests/carCandidates.test.ts` PASS（兩台）。
- 街景對照：Vite DEV `?review=street&hour=12&reviewTime=20`（時間凍結、正午），用 Chrome headless（CDP）把三台車逐一放喺同一個 street-car lane pose（`street-cars` slot 19，x −3.66 z −221.57），隱藏 traffic fleets，鏡頭固定（三個視角：街景、前 3/4 近照、後 3/4 近照），1920 × 1080。三台都用 GLB 本身嘅材質（runtime 嘅 `carBody` tint／材質覆蓋未套用）。
- Evidence（Git 以外）：`~/city2127-evidence/car-candidates/r10/street-noon/`（9 張 PNG + `pose.json`）、`r10/street-sheet.png`；studio 審查圖 `r9`／`r10/studio/`。CDP 腳本 `~/city2127-evidence/car-candidates/tmp/street.mjs`。
- `npm run build`：PASS。`git diff --check`：PASS。
- `npm test`（Windows 11，Node 24.19.0）：FAILED，喺 `surveyMeterPipeline.test.ts` 停；之後逐個跑，`energyPipeline.test.ts` 亦失敗，其餘全部 PASS。兩個失敗都係同一個原因：`survey/src/survey/questionLoader.ts` 將 URL pathname 當檔案路徑（`C:\C:\…%E6%96%87…`），喺 Windows／非 ASCII 路徑讀唔到 question JSON。同本任務無關、冇改；喺 macOS 應該唔會出現，未驗證。新加嘅 `carCandidates.test.ts` 同 `assetLibrary.test.ts` PASS。
- Application verification: NOT INTEGRATED（`mobility.ts` 仍載入 `car-family-2127`）。

## Known issues and blockers

- Tris 約係 `car_human` 嘅 2.4 倍；`tests/siteAssets.test.ts` 對 `car_family` 嘅上限係 4,000，替換時要放寬或者減面（車輪 lathe 段數、station 密度係最大頭）。未量度 FPS。
- 闊度 2.01–2.04 m（含 camera pod）比現有 1.85 m 闊；替換前要跑 `tests/odaiba.test.ts` 嘅 carriageway clearance。
- Runtime 會用自己嘅 `carGlass`（淺藍）同白色 `carBody` × instance tint 覆蓋材質：`car_tech` 嘅煙燻玻璃同深灰車身、`car_green` 嘅暖白喺現行 tint 下會變。替換時要決定：新增 role（例如 `car_glass_smoke`）或改 tint 表。
- `car_green` 太陽能板用 `car_body` 深色 vertex colour，冇獨立反光；夜間燈光（emissive）未喺 app 內檢查，只檢查咗正午。
- 舊 `car-family-2127` 保持不變。

## Important decisions

- 兩台各自一個 GLB（同一 role 名、唔同材質值），替換時只改 asset id 同 variant 名。
- 用 build_car 嘅 loft 同 helper，冇複製 function；新嘢（燈條 strip、輪拱 liner／lip、lathe 車輪、太陽能格）留喺 candidates builder，等 owner 揀定先決定入唔入 library。
- 街景對照用 app 本身嘅台場街道同光線，而唔係 Blender 入面嘅 masterplan（後者粗糙好多）。

## Next expected step

Owner 睇對照圖揀一台（或要求修改）。揀定之後另開 integration 步驟：`mobility.ts` 換 asset、處理材質 role／tint、放寬 tri 上限、跑 clearance 同 browser 檢查，再 merge。
