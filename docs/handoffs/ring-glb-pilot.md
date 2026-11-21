# ring-glb-pilot — 直立環形巨構

- Owner — Codex。視覺驗收由 cc100053 決定。
- Status — R6 候選待業主審圖，整合由業主決定。
- Branch — `codex/ring-glb-pilot`。
- Remote — `origin/codex/ring-glb-pilot`，供審圖。
- Base — `6239fa813857e3a321c8f4a8189af2d4e5113159`。
- Implementation — R6 `dadffcc2`，R5 `f1fd0933`，R4 `865cd5058e6d4b01f48c0dab37b67911ee08e4fc`，R3 `1cfe3321d5444ab262d5043a3b70200752f21cdc`，R2 `5d80004d5a04d9427e276213016b85adde98ae3d`，R1 `0bbb94da91a885a53f233afa3db760c3eefb504e`.

## Round 6

2026-11-21 由 R5 審圖提交 `a9142f226de474ce11ae18c549e6e9dcc5b13f92` 接手。沿用主 checkout、原候選分支及本機未追蹤的 `Dev_QA.md`。啟動時候選與遠端為 0 / 0，`origin/main` 為 `c804fe89231fb7d7083df2348fde5e7cc74270be`，候選相差 10 ahead / 12 behind。恢復工作後再 fetch，候選與遠端仍為 0 / 0，`origin/main` 為 `f177157682d1f33357210f0a4106857b77f71650`，候選相差 10 ahead / 19 behind。共同基準 `6239fa81`。

- [R5／R6 全幅 Hero 同鏡位，12:00／21:00](../../artifacts/ring-glb-pilot/r6/compare-hero.jpg)
- [R5／R6 日夜同座標裁圖](../../artifacts/ring-glb-pilot/r6/compare-planting.jpg)
- [R5／Gemini／R6 日景同區對照](../../artifacts/ring-glb-pilot/r6/compare-gemini.jpg)
- [Gemini 全幅審閱圖](../../artifacts/ring-glb-pilot/r6/gemini-original.jpg) · [送出的提示、原對話及下載檔雜湊](../../artifacts/ring-glb-pilot/r6/gemini-prompt.md) · [四種植株模型](../../artifacts/ring-glb-pilot/r6/plant-lineup.jpg)

### 從 Gemini 圖落到場景

Gemini 的 Create image 收到 R5 Hero 日景原圖及同圖裁切。採用首張輸出，因為放回整幅 Hero 仍見到左側扇葉、中央低葉叢及右側高莖的輪廓。四道原種植帶在 `RING_PLANTING` 逐株落位，沿用各版本的入口缺口。實裝 191 株、五個渲染批次，莖脈的點光隨原日夜更新。

| 概念圖可見特徵 | 實裝 |
| --- | --- |
| 左坡扇葉由可見主莖分叉，垂葉越過斜坡前緣 | 羽狀複葉及折面主脈，蕨葉轉向環前，八組垂葉掛在種植帶前緣 |
| 近白橋有向外展開的寬葉叢，左右高低有間隔 | 大小相間的折葉叢沿較低弧段接續，較矮的伴生植株根位退入帶面 |
| 右坡青綠層疊向上收成長尖葉，葉脈有斷續青光 | 較寬蕨葉與疏落尖葉交錯，右側最高植株在深色環壁前，光只落在莖脈 |
| 前方白橋、大堂和庭園留有通行口，後方 DECKS 仍見 | 沿用四道原種植帶、前橋及 R4 接駁；保留台階邊與部份留空帶面，底部垂藤及右坡覆蓋比 Gemini 圖疏 |

採用 Three.js 植株實例與既有日夜材質更新，沿用現場種植帶及環身 GLB。新植株已收入資產庫，狀態為 draft。[植株程式](../../src/slopePlants.ts) · [環內配置](../../src/megastructures.ts) · [資產庫](../../asset/models/LIBRARY.md#procedural-planting--threejs)

### 驗證

- 實作 `dadffcc29e010a1e9d00f2ac636fe97b232ca9fe` 的根目錄 `npm test`、`npm run build`、`git diff --check` 通過。
- [幾何測試](../../tests/megastructures.test.ts) 在程序環、R1、R2、R4 四種載入組合，用實際種植面確認每株落土、四帶兩側均有植栽及道路 ①／Yurikamome 淨空。橋至庭園的連續樓面、2.2 m 頭頂淨空及 R4 庭園植栽沿環軸距 DECKS 1.723 m 的檢查通過。四種組合的階梯巨構原有 154 棵樹及 390 叢灌木，實例矩陣與色彩與 R5 相同。
- 本機 Chrome 日夜各從居民眼高沿兩條路線抽樣 558 條視線，均先命中指定門牌。兩個時段各見到一名居民同步步態移動至少 10.0 m。零 page error。
- 正式 build 的 12:00／21:00 頁面均成功載入入口、大堂下環、雙肩及冠部 GLB；夜間模擬大堂下環回應 404 後，退回 R2 下環並完成渲染。Apple M6／Chrome 157.0.8103.79 headless／ANGLE Metal、1920 × 1080／DPR 1，三個頁面各取一個 120 幀窗口，均為 60.0 FPS，零 page error。正常日夜樣本為 1,391／1,392 draws。
- 拍攝保留 UI 及原 Hero 鏡位，3200 × 1800／DPR 1、`reviewTime=20`，日夜零 page error。原圖裁切 x 330–950、y 710–1230；Gemini 全圖按相同比例對位。R6 sidecar 記錄 R5 基準及擷取時的工作樹改動。Gemini 下載原檔、提示、擷取 sidecar 及瀏覽器記錄均存於 `~/city2127-evidence/ring-glb-pilot/r6/`。

候選推送至 `origin/codex/ring-glb-pilot`。下一步由業主按 Hero 對照審圖並決定整合，展覽機實測待安排。

## Round 5

2026-11-21 由 R4 審圖提交 `3de8460c` 接手。Fetch 後本機候選與遠端為 0 / 0，相對 `origin/main` 為 8 ahead / 8 behind，共同基準 `6239fa81`。沿用主 checkout、同一候選分支，保留本機未追蹤的 `Dev_QA.md`。[R4 候選 CI](https://github.com/cc100053/city2127/actions/runs/44870540215)

- [R4／R5 Hero 原鏡位對照，12:00／21:00](../../artifacts/ring-glb-pilot/r5/compare-hero.jpg)
- [紅圈範圍裁圖，12:00／21:00](../../artifacts/ring-glb-pilot/r5/compare-planting.jpg)

CodeGraph 追到 `megastructures.ts` 的四道下環內側種植帶。用 Chrome 暫時隱藏該段程序樹冠及灌木，確認消失範圍與業主圈選吻合。沿用 `coastalCanopy.ts` 的合批植栽、造型及材質。每簇一棵較高主樹，搭配較低的伴生樹，交錯開展的闊冠及收窄的柱形樹冠。樹幹植入種植帶上緣，灌木沿坡面聚散，留出可辨認的帶面及空隙。環身、橋、道路 ①、Yurikamome、大堂與兩個庭園花床沿用 R4。

`npm run capture` 以原 Hero 鏡位、3200 × 1800／DPR 1、`reviewTime=20` 擷取 R5。R4 採用 `865cd505` 當輪同設定原圖。裁圖取兩個時段同一原圖座標 x 330–950、y 710–1230，保留斜坡與前橋的關係。R5 原圖在提交前擷取，sidecar 記錄了 R4 基準及 dirty 狀態。兩張 R5 原圖均零 page error。

### 驗證

- 實作 `f1fd0933` 的根目錄 `npm test`、`npm run build`、`git diff --check` 均通過。
- [幾何測試](../../tests/megastructures.test.ts) 以樹幹實例底部對實際種植面發射射線，核對兩側樹根都有落土。道路 ①、Yurikamome、橋至庭園的連續樓面及居民 2.2 m 頭頂淨空均通過。比較四種資產載入組合，環外的巨構植栽實例矩陣及顏色與 R4 相同。
- Chrome 以 1.65 m 眼高沿兩條接駁路線取樣，日夜各 558 條視線均先命中指定門牌。兩時段各記錄到一名可見居民連同步態移動至少 11.1 m。零 page error。
- 正式 build 在 12:00／21:00 均載入入口、大堂下環、雙肩及冠部 GLB。夜間模擬大堂下環 404，R2 下環正常接手。Apple M6／Chrome 157 headless／ANGLE Metal、1920 × 1080／DPR 1，三頁各取一個 120 幀窗口，均為 60.0 FPS，零 page error。日夜一般幀分別為 1,381／1,382 draws，與 R4 正式版紀錄相同。

原圖、sidecar、辨認來源用的遮罩圖及檢查記錄存於 `~/city2127-evidence/ring-glb-pilot/r5/`。

業主否決 R5：「唔收貨. 佢啲植物全部都好似波波咁樣，其實唔係好睇得出係植物。」指定由 Gemini 自由設計植種、形態、配置次序及疏密，再把生成圖的植物逐一做進場景。

## Round 4

2026-11-21 從 R3 審圖提交 `930ce96e90b8cfb3f9e6fa87b09c75f7a26cbcb6` 接手。Fetch 後候選分支與遠端為 0 / 0，相對 `origin/main` 6 ahead / 8 behind，共同基準 `6239fa81`。沿用主 checkout、同一候選分支及本機未追蹤的 `Dev_QA.md`。R3 候選 CI 已通過。[CI 記錄](https://github.com/cc100053/city2127/actions/runs/44868492459)

| 審圖 | 12:00 | 21:00 |
| --- | --- | --- |
| R3／R4 同鏡位，大堂及兩個花床近鏡 | [日間對照](../../artifacts/ring-glb-pilot/r4/compare-day.jpg) | [夜間對照](../../artifacts/ring-glb-pilot/r4/compare-night.jpg) |
| 廣場橋 → 大堂入口 | [日間](../../artifacts/ring-glb-pilot/r4/01-entry-day.jpg) | [夜間](../../artifacts/ring-glb-pilot/r4/01-entry-night.jpg) |
| 大堂 → 花園門 | [日間](../../artifacts/ring-glb-pilot/r4/02-hall-day.jpg) | [夜間](../../artifacts/ring-glb-pilot/r4/02-hall-night.jpg) |
| 居民眼高，左花床 | [日間](../../artifacts/ring-glb-pilot/r4/left-day.jpg) | [夜間](../../artifacts/ring-glb-pilot/r4/left-night.jpg) |
| 居民眼高，右花床 | [日間](../../artifacts/ring-glb-pilot/r4/right-day.jpg) | [夜間](../../artifacts/ring-glb-pilot/r4/right-night.jpg) |
| 花園回望大堂 | [日間](../../artifacts/ring-glb-pilot/r4/03-garden-day.jpg) | [夜間](../../artifacts/ring-glb-pilot/r4/03-garden-night.jpg) |
| R3／R4 主遠景 | [日夜同板](../../artifacts/ring-glb-pilot/r4/compare-hero.jpg) | |

### 植栽

- 兩床各兩棵高低錯落的既有 kit 樹。左床留出西角收邊，四叢矮灌木沿床內分成幾組。右床較深，五叢矮灌木填補樹冠下及座椅後方。植物採用下環自己的兩款霧面葉色。
- 大堂靠內兩側換為較高的盆栽，兩道門內側用低花槽接續庭園的植栽尺度，候座位置沿用 R3。重用 `city-kit-2127` 的 `tree`、`shrub_cluster`、`tree_indoor` 及 `planter_1m`，在下環 GLB 按材質合批。[建模器](../../asset/models/ring-gate-2127/build_ring_transfer.py) · [下環 GLB](../../asset/models/ring-gate-2127/ring-transfer-2127.glb)

### 驗證

- Blender 5.2.2 game-profile QA 通過，無浮離或共面閃爍。純色材質跳過 UV 查核。保留樓板、花槽及矮灌木落土位置的隱藏背靠背接面，環腳深入地面約 15 m。已檢視分件、線框及 Chrome 日夜材質。空場景重匯得到 32,038 三角面、14 個網格及材質、1,034,204 bytes，無外部貼圖。由實作提交的獨立暫存副本重建，GLB 逐位元組相同。
- 匯出 GLB 驗證 5.4 m 中央帶的植栽淨空，枝葉與 DECKS 實際外牆沿環身軸線最少相距 1.723 m。保留庭園樓板收角、步行路線 2.2 m 頭頂淨空，以及道路 ① 和 Yurikamome 的原包絡檢查。與 R3 比對，四個下環外殼網格、連續樓面及導向線的匯出頂點與索引逐位元組相同。[GLB 測試](../../tests/megastructures.test.ts)
- Chrome 在兩條已接通的居民路線以 1.65 m 眼高、約每 0.45 m 取樣，涵蓋雙人路線兩側。每個時段 558 條射線均先命中目標指示牌。日夜各錄到一名可見居民至少移動 11.3 m，步態同步更新，零 page error。
- 根目錄 `npm test`、`npm run build`、`git diff --check` 通過。正式 build 在 12:00／21:00 載入入口、下環、雙肩及冠部 GLB 均回應 HTTP 200。夜間模擬下環回應 404，確認載入 R2 下段並持續渲染。三個頁面均零 page error。Apple M6／Chrome 157 headless／ANGLE Metal、1080p／DPR 1，正式主遠景每頁各取一個 120 幀窗口，依次為 59.9、60.0、60.0 FPS。
- R4 圖片在乾淨的實作提交上以 3200 × 1800／DPR 1 擷取，時間及鏡位與 R3 對照相同。兩個花床近鏡的 R3 基準於接手時重拍。原圖、參數、Blender QA、正式 build 及走路記錄見 `~/city2127-evidence/ring-glb-pilot/r4/`。

下一步由業主審圖及決定整合。展覽機實測仍待安排。

## Round 3

2026-11-21 從 R2 審圖提交 `68340a8bb43c736236bf426834f7e820191532ed` 接手。Fetch 後本機與遠端候選 0 / 0，與 `origin/main` 4 ahead / 0 behind，基準為 `6239fa81`。沿用主 checkout、同一分支，保留未追蹤的 `Dev_QA.md`。

| 審圖 | 12:00 | 21:00 |
| --- | --- | --- |
| 廣場橋 → R1 簷篷 | [日間](../../artifacts/ring-glb-pilot/r3/01-entry-day.jpg) | [夜間](../../artifacts/ring-glb-pilot/r3/01-entry-night.jpg) |
| 轉乘大堂 → 花園出口 | [日間](../../artifacts/ring-glb-pilot/r3/02-hall-day.jpg) | [夜間](../../artifacts/ring-glb-pilot/r3/02-hall-night.jpg) |
| 露天花園回望大堂 | [日間](../../artifacts/ring-glb-pilot/r3/03-garden-day.jpg) | [夜間](../../artifacts/ring-glb-pilot/r3/03-garden-night.jpg) |
| 主遠景 R2 → R3 | [日間對照](../../artifacts/ring-glb-pilot/r3/compare-hero-day.jpg) | [夜間對照](../../artifacts/ring-glb-pilot/r3/compare-hero-night.jpg) |

Chrome 以 3200 × 1800、DPR 1 擷取，八張均無 page error。主遠景同 R2 用同一相機與 `reviewTime=20`。三組近鏡固定在 `reviewTime=0 / 17.25 / 29.5`，依次看到同一位藍衣、紅背囊居民由橋端走入大堂再到庭園。原圖、拍攝參數、Blender 圖及原始診斷存於 `~/city2127-evidence/ring-glb-pilot/r3/`。截圖在提交前擷取，sidecar 如實記錄來源與修改狀態。

### 接駁方案與模型

由既有廣場橋頭經 R1 簷篷斜面，接入標高 17.6 m 的平層公共大堂，再穿過另一道門到露天庭園。入口原斜面延伸 0.45 m，以覆蓋橋端斜角。大堂約 23 m 闊、9 m 深，有兩側候座、暖色天花燈槽、冷白門線／地面導向，以及「乗換ホール」「空中庭園」「広場」標示。兩段行人淨通道闊約 5.5 m。初稿庭園左角抵入 DECKS 外牆，最終沿實際斜牆將樓板、欄杆及左花床收角，保留原住客動線。道路 ① 同 Yurikamome 仍從東南隧道經過。

- [下環大堂來源](../../asset/models/ring-gate-2127/ring-transfer-2127.blend)、[GLB](../../asset/models/ring-gate-2127/ring-transfer-2127.glb) 及 [建模](../../asset/models/ring-gate-2127/build_ring_transfer.py)。由 Blender 5.2.2 以 `blender -b --factory-startup --python-exit-code 1 -P asset/models/ring-gate-2127/build_ring_body.py -- --transfer` 重建。沿用 R2 下環，Exact Boolean 切出室內樓面凹位，保留原匯出的雙肩、冠部與 R2 下環作回退。庭園樹、花槽同長椅重用 city-kit-2127。
- [R1 入口來源](../../asset/models/ring-gate-2127/ring-gate-2127.blend) 將門前欄杆拆成 `Ring_LandingRail` 節點，由同目錄 `build_ring_gate.py` 重建。有完整 R3 資產先拆欄杆、打開兩段內側種植帶、鋪通橋面同延伸居民路線。R3 GLB 載入失敗改用完整 R2 下環與欄杆，其他必要模型失敗沿用上一輪的逐級回退。
- `plazaDeck` 沿用 `occupants` 的單人及並排行走，兩條原橋路線接到庭園，另加一條局部往返同兩個候座位置。角色沿原有晝夜出現率與步態更新。DEV `?review=ring` 可以用更近的視距審閱室內。

### 驗證

- Blender 5.2.2 game-profile QA 通過（純色及自發光材質，停用 UV 檢查）。兩份 GLB 使用米制、環心投影為原點、glTF +Y 向上且 +Z 朝廣場。空場景重匯確認 R3 下環 21,502 三角面、14 個網格／材質、745,716 bytes、尺寸約 181.35 × 68.09 × 45 m；R1 入口 4,480 三角面、7 個網格及 5 種材質、172,852 bytes。兩份均無貼圖或壓縮解碼器。從實作提交抽出的獨立目錄重建，兩份 GLB 與已提交檔案逐位元組相同。已檢視 Blender 材質、分件和線框。QA 的背靠背面位於樓板、花床、零件接觸面與原隧道的隱藏接縫；保留閉合零件。下環達地面下約 15 m，符合 R2 基座。
- [淨空測試](../../tests/megastructures.test.ts) 使用匯出三角面核對道路 ① 與 Yurikamome 原包絡、R1 入口標高、橋端至庭園的兩條接續步行線與局部往返。行人取樣中心及兩側，全段驗證地面連續與至少 2.2 m 頭頂淨空；另以實際 DECKS GLB 驗證收角樓板全寬預留至少 18 cm。Chrome 完整場景另驗橋、大堂、庭園 36 個地面／頭頂點，71 點量得庭園板邊與 DECKS 最窄相距 0.342 m。實際居民 instance 錄到 3.55 m 位移，步態相位同步更新。
- 根目錄 `npm test`、`npm run build`、`git diff --check` 通過。Vite 保留既有 JSON import attributes 與大型 chunk 提示。

### 1080p 主遠景

Apple M6、Chrome 157.0.8103.79 headless（ANGLE Metal）、1920 × 1080／DPR 1、預設畫質。DEV 主鏡固定 `reviewTime=20`，首次 FPS 診斷後暖機 5 秒，再取三個 120 幀窗口。R2 效能基準由同一 build 模擬 R3 GLB 404 得出，所以仍包含改造後的 R1 橋端重疊段及拆件欄杆。上面審圖對照使用 R2 當輪原圖。

| 時段 | R2（FPS） | R3（FPS） | 一般幀 draws（R2 → R3） |
| --- | ---: | ---: | ---: |
| 12:00 | 56.2–60.0 | 60.0 | 1,349 → 1,381 |
| 21:00 | 60.0 | 59.5–60.0 | 1,350 → 1,382 |

一般幀增加 21,680 個渲染三角面。讀數接近 60 FPS 上限，為開發機短時段實測。

正式 build 於 21:00 以原主鏡驗證四份 R3 展示 GLB 均回應 HTTP 200。分別模擬大堂、冠部及入口三個資源 404，確認對應退回 R2 下環、有 Blender 入口的程序環身、或全程序版本。成功頁及三個回退頁各取一個 120 幀窗口，均為 60.0 FPS、零 page error；三組回退各只出現預期的 404 資源錯誤與提示。原始資料見本機 `r3/performance.json`。

下一步由業主審圖同決定整合。下環步行接駁現已接通，月台登車流程及展覽機實測尚未納入本輪。

## Round 2

2026-11-21 由已推送的 R1 審圖提交 `84e9267941328cab4ff62de7c3ed46c466b79eac` 接手。Fetch 後任務分支與遠端為 0 / 0，與 `origin/main` 相差兩個任務提交，基準仍為 `6239fa81`。沿用主 checkout 及原候選分支。未追蹤的 `Dev_QA.md` 保留原位。

**審圖** · [日間主遠景](../../artifacts/ring-glb-pilot/r2/hero-day.jpg) · [夜間主遠景](../../artifacts/ring-glb-pilot/r2/hero-night.jpg) · [日間斜側近鏡](../../artifacts/ring-glb-pilot/r2/oblique.jpg) · [夜間斜側近鏡](../../artifacts/ring-glb-pilot/r2/oblique-night.jpg)。Chrome 以 3200 × 1800、DPR 1、`reviewTime=20` 拍攝，四張皆無 page error。遠景沿用原展覽主鏡；近鏡用 `?review=ring&cam=-31,58,-100&at=93,40,-155`。原圖、sidecar、Blender 材質／物件／線框圖在 `~/city2127-evidence/ring-glb-pilot/r2/`；原圖於實作提交前拍攝，sidecar 如實標為 dirty。

### 模型與接入

[Blender 來源](../../asset/models/ring-gate-2127/ring-body-2127.blend) 有三個環身 collection。重建指令：`blender -b --factory-startup --python-exit-code 1 -P asset/models/ring-gate-2127/build_ring_body.py`。同一弧段函式生成下環（較密玻璃分格、露台腰線、轉乘處加厚肋）、兩肩和冠部（較長玻璃帶、較細肋）。三段在共用原點合攏。最高點 195 m、直徑約 210 m；下段深 45 m、冠頂深約 26 m。陶板包住外緣，前後兩面玻璃退入窗框。夜景沿用 R1 冷白交通識別及暖色玻璃／燈槽，部分玻璃保持暗色。玻璃以實心窗片及後退窗框表現深度，室內留待下一輪。

| GLB | 三角面 | 大小 |
| --- | ---: | ---: |
| [下環](../../asset/models/ring-gate-2127/ring-lower-2127.glb) | 12,026 | 402,488 bytes |
| [雙肩](../../asset/models/ring-gate-2127/ring-shoulders-2127.glb) | 9,352 | 360,836 bytes |
| [冠部](../../asset/models/ring-gate-2127/ring-crown-2127.glb) | 8,466 | 320,552 bytes |

每份 Blender 5.2.2 GLB 以 +Y 向上匯出，四種材質各合一個網格，無外部紋理或壓縮解碼器。R1 入口獨立保留，斜隧道在 Blender 用 Exact Boolean 切出，四道程序花園露台與基座沿用。[`loadMegastructures`](../../src/megastructures.ts) 只有在 R1 和三份環身 GLB 齊全時才接入 R2。單一環身資源失敗會回到完整 R1，入口資源失敗會回到程序外殼與入口。

### 驗證

- Blender game-profile QA 通過，零相交共面或脫離部件，唯一提示為環底深入地面約 15 m，符合原基座標高。已檢視材質、分件及線框，並在空場景重匯三段環身及 R1 入口。三段共 29,844 三角面、12 個網格。
- [淨空測試](../../tests/megastructures.test.ts) 用四份匯出 GLB 的實際三角面以 0.5 m 間距取樣隧道；原有道路 ①、Yurikamome 包絡仍穿過 R1 孔徑。核對 6 m 花園入口、接入後步行淨空、橋端斜面高度、冠部收薄及 12 個角度的外殼覆蓋。保留原有道路、軌道及居民路線資料。
- `5d80004d` 的根目錄 `npm test`、`npm run build`、`git diff --check` 均通過。Vite 仍提示既有的 JSON import attributes 不一致和大型 chunk。

### 1080p 主遠景

Apple M6、Chrome 157 headless（ANGLE Metal）、1920 × 1080／DPR 1，預設畫質。DEV 展覽主鏡以 `reviewTime=20` 凍結模擬，首次 FPS 診斷後等 5 秒，再用三個 120 幀窗口取樣。R1 基準在同一 build 模擬冠部 GLB 404，觸發完整 R1 回退。

| 時段 | R1（FPS） | R2（FPS） | 一般幀 draw calls（R1 → R2） |
| --- | ---: | ---: | ---: |
| 12:00 | 60.0 | 58.5–60.0 | 1,323 → 1,345 |
| 21:00 | 55.4–58.1 | 60.0 | 1,324 → 1,346 |

一般幀增加 45,024 個渲染三角面，陰影更新幀另外計入。夜間基準有波動，呢組短窗口只反映開發機實測。

正式 build 於 21:00 驗證四份 GLB 皆回應 HTTP 200。分別模擬冠部及入口 404，均顯示相應回退並繼續渲染。三個測試頁面各取一個 120 幀窗口，均為 60.0 FPS、零 page error。模擬 404 各錄得一次預期的資源錯誤與回退提示。原始資料見本機 `r2/performance.json`。

下一步由業主看日夜與接縫近鏡後決定整合。室內、新動線及展覽機實測留待後續。

## Round 1

### Session Git state

2026-11-21 從 `main` 的 `aee2662a2355bf8c82ee6e223ca295afc50c0eee` 開始。Fetch 後確認本機 0 ahead／7 behind，快轉至 `6239fa81` 再開分支。未追蹤的 `Dev_QA.md` 暫存後原位還原。核對 [入口交接](entrance-polish.md) 的 `ae88154e` 已在新基準內。

### 試作範圍

先做道路 ① 及 Yurikamome 穿過的東南隧道，到廣場天橋接最低層花園的一段。原比例及軌道、道路、天橋接點沿用。淺色陶板以分節收邊，內凹深色框承托較大的玻璃片。隧道有冷白識別燈及側牆維修照明。花園簷篷後的最前層花槽與內壁讓出入口，斜面平台接原有天橋。

- [Blender 來源](../../asset/models/ring-gate-2127/ring-gate-2127.blend)、[GLB](../../asset/models/ring-gate-2127/ring-gate-2127.glb) 及 [生成器](../../asset/models/ring-gate-2127/build_ring_gate.py)。環形外殼及斜隧道係場地專用幾何，花園簷篷重用 `city-kit-2127` 的 `arch_shell`。
- 由 Blender 5.2.2 LTS 執行 `blender -b --factory-startup --python-exit-code 1 -P asset/models/ring-gate-2127/build_ring_gate.py`。米制，原點投影到環心下方地面，GLB +Y 向上、+Z 朝廣場。可重建，毋須外部紋理。
- [城市接入](../../src/megastructures.ts) 在 `loadOdaiba` 平行載入入口和地形，GLB 失敗會使用程序入口。日夜燈光沿用 `updateMegastructures`；外露入口的 GLB 不依賴原環身的隧道裁切 shader。

### 驗證與限制

- `0bbb94da` 的 root `npm test`、`npm run build`、`git diff --check` 通過。完整測試在沙盒外跑，供問卷測試用 HTTP/WebSocket 綁定本機端口。
- Blender game-profile QA 通過。五件合批網格有 4,480 個三角面（陶板 1,938、暖光 256、玻璃 300、深色結構 1,410、導光 576），五種材質，171,476 bytes。已檢視材質與線框並在空場景重匯。三軸尺寸約 87.39 m × 55.72 m × 56.26 m（寬／高／深）。QA 提示深色結構內有八對背靠背三角面，屬隱藏面。簷篷兩層各有開口邊界，供與現有環身銜接。
- [幾何測試](../../tests/megastructures.test.ts) 檢查 GLB 隧道淨空、6 m 闊花園入口、接入後的行人通道射線及斜面平台高度。原有交通線穿洞測試一併覆蓋。
- Apple M6、Chrome 157 headless、1920×1080、DPR 1。正式 build 載入 GLB 200，以及模擬 404 回到程序入口，兩者均完成渲染。晚上 21:00 的三次讀數均為 60.0 FPS。日景首次非定格比較的讀數波動（`production-perf.json`）。用 DEV hero、`hour=12&reviewTime=20` 定格覆核，跳過暖機後取三個 120 幀窗口，原入口 57.1–58.5 FPS，GLB 58.1–60.0 FPS，同一視角的 draw calls 由 1,315 到 1,323。原始數據見 `held-day-perf.json`。
- 原圖連瀏覽器側錄存於 `~/city2127-evidence/ring-glb-pilot/`。審圖用 [日景](../../artifacts/ring-glb-pilot/gate.jpg)、[夜景](../../artifacts/ring-glb-pilot/gate-night.jpg)、[花園入口](../../artifacts/ring-glb-pilot/garden.jpg)、[街面](../../artifacts/ring-glb-pilot/street.jpg) 同 [改造前](../../artifacts/ring-glb-pilot/before-gate.jpg)。
- 這一輪只建模固定入口及觀景平台。全環造型、室內運作、展覽硬件與業主驗收仍未完成。
