# H0 — 住宅城市位置、設計矩陣與預算

2026-10-26；實作 owner：Codex，產品／視覺簽收：cc100053。
狀態：**H0 已由 cc100053 於 2026-10-26 在實作 chat 確認；H1–H3 未實作。**

[計劃](../../docs/HOUSING_CITY_PLAN.md)／[當前交接](../../docs/handoffs/housing-city.md)。

## 同一基準

原碼 `615ad9872aeab2cf021a62affc26e34c2b7e7e28`；四軸 display score 全為 0、seed 全為 0。
能源 `{waterGardens:2, receiver:'large', flywheel:true, island:true}`，由既有 `CityChangeManager` 立即套用。
hour 12、reviewTime 20；原 hero `(-520,300,-620)` → `(-40,25,-60)`、FOV 42，OrbitControls 鎖定。
日後五配置仍使用此基準；H1 另以 hour 12／17／21、同一 reviewTime 比較。

本次只是檢查：Playwright 攔截本機 Vite 的 main 回應，暫時暴露既有 scene／camera／manager，沒有修改 runtime source、問卷或展覽 SQLite。
候選框只在截圖前加入。線框與文字是位置標記，**不是住宅設計成品**。

- [基準原圖](review/baseline-day.png)
- [三處候選標示原圖](review/candidates-day.png)
- [原始瀏覽器、逐幀間距、四站視線及性能](review/browser.json)
- [456 個初步候選](review/candidates.json)

## 候選位置與設計矩陣（已確認）

每處完整預留範圍為 24 m（X）×18 m（Z），Y=2–28 m；實際新構造由地面承托，不可任意延伸到框外。
框內包括入口、固定支承、服務線及完整動作掃掠。高度 28 m 是上限，不是所有住宅的高度。

| 區域 | 中心 X/Z（m） | H1 主設計／用途 | 結構、公共出入、接駁與共存 |
| --- | --- | --- | --- |
| M · Aqua City 北側空隙 | −135 / −175 | 兩組輕材中低層住宅、架空共用生活廊；其中一棟複合輕材骨架＋植物外皮＋可換生活艙 | 分叉柱／斜撐及可拆接節點，柱腳至地面；樓梯及無障礙升降核連公共廊；水電在固定核與可分離艙接頭；保留原 Aqua City、屋頂活動和公共步道 |
| P · Aqua City／DECKS 間空隙 | 45 / −215 | 為植物改形的斜面住宅、茂盛苔蘚／灌木膜及棚架 | 可見斜撐、種植層厚度、集水槽／回水管與地面水箱；地面入口至樓梯／升降核；覆蓋集中在自有斜面及棚架，不改原建築外皮 |
| U · Hilton 前側空隙 | −265 / −60 | 固定低矮交換骨架、生活艙、兩個接駁位及專用搬運軌 | 固定核承托樓板／吊運架；人行側與更新軌分開；艙體可見插接點；保留既有道路／步道／高架。完整小屋與兩個底座及移動軌在同一預留框內 |

H1b 在主設計截圖獲接納後加入：M 的單一橫向集約骨架焦點、P 的獨立藻類循環面板設備、U 的一座完整移動小屋。
複合建築是同一棟構造及生活艙，不能用三組不相連物件代替。

Q4 區隔：M 固定位置、最多 28 m、橫向跨距／輕材斜撐／可拆接接點；Q4 在 `(175,-45)` 的既有可變集約塔，位置、垂直量體及 Meter 所屬不變。
新增住宅不由 Q4 分數控制，DEV 面板明示獨立設計比較，不能寫成投票結果。

夜間：植物／苔蘚是受既有城市照明照到的暗面，不發光；藻類面板採反射透光的深綠設備面，不以自發光暗示生物功能。
只用既有暖白公共入口／接駁標記，沒有新增全局燈、霓虹或照亮整面植物的光源。
植物膜本輪保持靜態：形態、厚度及供水可讀性優先，沒有環境感應開合需求。

## H0 已做的空間檢查與界限

以實際載入的既有場景（7,506 個靜態 mesh／instance）作 BVH 表面相交檢查；每個候選完整框須不與 Y=2–28 m 的既有表面相交。
另在九個腳點作地面承托及上方到 180 m 的 ray 淨空檢查，排除只有空腔而沒有可用空地的位置。
每條 `mobility.routes()` 曲線取 401 點：航空走廊保留 22 m、道路／導軌／水上線 8 m、行人／公共 deck 4 m，候選框與樣點保持相應距離。
Hero 至每個候選的 22 m 高點有直接視線；三個完整框均不擋四站六成高度的中心視線（12 項 PASS）。

這是 **H0 的候選篩選**：九個地面腳點、離散曲線樣點及四條中心視線，不等於完整地基、連續碰撞或整個 focal 外形均可見。
H1 實際構造須加入 Node 幾何檢查；H2 須驗證全掃掠、固定支承、實際 published 入口／行人及 skyways，不能只沿用 H0 候選結果。
現有植物、道路、能源、主建築均未移除或改動。未驗證地下公用管線、承載工程或展覽硬件。

## 性能數字與提議上限

本機 macOS、Chrome 156.0.8078.47 headless、ANGLE Metal Apple M6／WebGL2，1920×1080、DPR1、quality=low。
最終基準 rAF 10 秒平均 **60.08 FPS**；原始間距在 browser.json。renderer sample：431 geometries、24 textures、486 calls、8,699,769 triangles。
固定 reviewTime 會固定城市動態，這不是 live soak 或展覽硬件結果。

H1／H2 提議硬預算（同機、同基準、low）：

- 新增 renderer geometries **≤36**（總數≤467）、textures **0**（總數24）、calls **≤80**（總數≤566）。
- 新增 triangles **≤150,000**；幾何／材質一次建立，切換／循環不得持續增加資源。
- 動態及混合配置暖機後至少 **50 FPS**，各量 30 秒 rAF；超標先減少幾何／數量，不能用改相機或關掉既有城市內容通過。
- 日／暮／夜以 default quality 另做視覺比較及記錄實際數字；未量 default FPS，因此沒有聲稱它達到 50 FPS。上述上限只適用於本機 low，比較器須列明 quality。

H2 觸發已由 cc100053 在本 chat 選定：**90 秒「多年更新壓縮示意」可重播循環**；靜態閱讀及 prefers-reduced-motion 固定停泊接駁，重設回相同起點。
本輪不將更新動畫當成日常通勤，也不加全城搬遷或植物膜開合模擬。

## 重跑與證據沿革

先啟動 root Vite，使用實際 localhost URL；以全新 evidence 目錄執行，禁止覆寫原圖：

```sh
CITY2127_CITY_URL=http://127.0.0.1:5188 \
CITY2127_EVIDENCE_DIR=artifacts/housing-city-h0/new-run \
node artifacts/housing-city-h0/capture.mjs
```

runner 使用現有 `/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs` 和本機 Chrome，沒有新增依賴。
第一次 sandbox 內 Chrome SIGABRT；改用已獲允許的本機 browser 執行後成功。沒有 automatic approval rejection。
初輪（本目錄）僅表面框檢查，直接匯入另一個 Three module，記錄 duplicate-Three warning；`ground-search/` 加地面但仍有該 warning；`clearance-search/` 改用既有 Three 並加上方淨空；`route-search/` 再加交通及候選視線。
這些探索原圖／JSON 全部保留，不能把早期候選當成已通過最終檢查。
**review/** 才是本次提案的最終原圖／候選／性能及 12 項焦點視線證據；page errors／console warnings 均 0。

本批closure：root [npm test](root-test.log) PASS、[build](root-build.log) PASS（既有>500kB chunk warning）、runner語法、diff whitespace、本地Markdown targets及[最終證據hash](verified-evidence.json)檢查PASS。[原sandbox test失敗](root-test-sandbox.log)保留，原因為localhost listen EPERM；獲准本機重跑後完整通過。survey／module-swap source無差異，未另跑其package suite。Vite5188已停止，port無listener；全部本批browser已關閉。
