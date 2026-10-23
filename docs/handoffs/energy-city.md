# energy-city — 能源城市 E1／E2

- Owner: Codex；產品決策cc100053
- Status: IN_PROGRESS — E1、E2完成並發布main，main CI PASS；E3–E5未開始
- Branch: `codex/energy-space-prototype`
- Base commit: `1966ebe4b57567b838ce2613a1a3182d4a5d9daf`
- Last verified commit: 內容commit `afd4c0a1b4416c2c430a9ad2d86fa9e05cf6e7e6`；整合commit `7fa5c9f6d8cd207acf9a7c89e0cbb25b88040e69`重驗PASS
- Remote availability: `origin/codex/energy-space-prototype` @ `afd4c0a`；`origin/main`包含`7fa5c9f`（推送後fetch確認0／0），本次僅補驗證交接
- GitHub Issue (optional): NONE

## Session Git state

- 原checkout `/Users/fatboy/city2127`為`main` @ `29d12db7629b8ffabdb75b53b2cec70d8c15ee9a`，保留未追蹤`.playwright-cli/`與所有截圖，沒有stash／reset／同步原checkout。
- 2026-10-24 fetch成功，origin/main為`1966ebe`；原checkout 0 ahead／14 behind。
- 重用獨立checkout `/private/tmp/city2127-energy-plan-20261024`：main乾淨，fetch後與origin/main 0／0；先核對E1文件／source，再開E2分支。此checkout沒有`.codegraph/`，依AGENTS直接讀source／callers；原checkout index沒有用來假定新checkout內容。
- 無並行模組／binary改動；Owner為本任務Codex；沒有改共享二進位資產。

## Goal and scope

本輪使用者要求直接完成E2靜態空間比較及驗證。原hero能比較基準、A「海と暮らす」、B「空とつながる」、C「陸地を増やす」及M1混合；各一組海上接收翼、上下水庭／渦輪回路、球體外置儲能環、填海能源島。保留富士媒體／劇場、六座water rooms、公共／海空通道、四站視線；不改四題／Meter／歷史資料，不部署。

## Completed work

- [energyPrototype.ts](../../src/energyPrototype.ts)：四組靜態幾何，一次建立，共19個共享材質batch；配置只切visibility／翼scale，rotor獨立於固定支承。無新dependency，沒有逐幀工作。
- [devEnergy.ts](../../src/devEnergy.ts)及main的DEV dynamic import：`?energy=baseline|a|b|c|mixed`原生選單，URL保存；survey／meters／scaleLab優先，production移除整個工具。
- 上下水庭含落水管、渦輪室／轉子、獨立抽水回管、下庭公共看台／4 m緩坡；能源島有分段岸界、檢修橋及兩端升降井。都是量體示意，未模擬服務或工程。
- 水平環在hero太弱、貼近立環碰到斜街；最後採海側前置環，中心`(-18,100,-24)`，半徑31 m，固定支承接既有transfer frame。實際rotor與劇場／工作翼／斜街不相交；沒有轉動劇場本體。
- [幾何測試](../../tests/energyPrototype.test.ts)接root npm test；[計劃](../ENERGY_CITY_PLAN.md)、PROJECT／SPEC／VALIDATION、README與文件索引同步。
- [實際截圖](../../artifacts/energy-city-e2/README.md)：五張同hero日景、M1黃昏／夜景及水庭近景。

## Actual validation results

- Date/environment: 2026-10-24；Node26.0.0；macOS本機Codex in-app Chromium／WebGL2，1920×1080，預設quality；未量GPU型號與展覽硬件FPS。
- PASS — root `npm test`（真實survey HTTP／WebSocket pipeline，81組答案與既有城市／路徑檢查）。首次sandbox跑到pipeline時因listen EPERM中止；允許localhost重跑後整套通過。沒有改survey程式。
- PASS — root `npm run build`；既有>500 kB chunk warning保留；產物搜尋無`energy-prototype`／`海と暮らす`／Energy工具，DEV import已剔除。
- PASS — focused E2 test（補真實tidal-edge新步道檢查後再跑）：五配置／mesh UUID重用、19 batches、rotor vs實際core網格、21,595個可見船體保守包圍盒（完整320秒週期、0.5秒步距）、公共／deck／rooms連岸路、beacons、航空走廊／泊位、四站視線及原hero畫框。
- PASS — 五種day（hour12／reviewTime20）選單切換、URL、五張1920×1080截圖；M1 hour18.5／22及水庭近景；各頁console error／warn為空。資產與城市可見載入，沒有資產失敗console訊息；沒有另錄完整HTTP network trace。
- PASS — standalone與`?meters=nw:high,ne:low&energy=mixed`：城市／既有Meter層正常，能源控制數量0，console error／warn為空；因此不能將能源配置疊到Meter當正式答案。
- PASS — 工作樹whitespace與完整diff／new files自審；9份Markdown的366個本機links／anchors／tracked或本輪新targets通過。Staged／committed `git diff --check`通過。
- PASS — `7fa5c9f`整合tree與`afd4c0a`完全一致；整合後root npm test（含最後E2／tidal-edge檢查）及build、366個links／targets與`git diff --check origin/main..HEAD`重跑通過。原瀏覽器證據對應同一程式／素材tree。
- Main CI：[run 39990353370](https://github.com/cc100053/city2127/actions/runs/39990353370)，2026-10-24完成success：root npm test／build、survey test／build、module-swap test／build、committed whitespace全部PASS（Node24／Ubuntu）。本次後續只補Markdown驗證紀錄，runtime／截圖tree不變。
- 本機survey／module-swap package tests未另跑：兩個package沒有改動；root真實pipeline已跑，main CI三個package的test／build已全部通過。
- 清理：本輪Vite已停止（localhost:5173 curl回應000／connection refused）、測試分頁已關閉、viewport override已reset；未啟動持久survey server。原checkout及既有`.playwright-cli/`保持原狀。

## Known limits and next expected step

E2是可隔離的靜態量體比較，並非最終美術／工程驗收。Hero有四類輪廓，但水管與渦輪需近景；前置環離開球殼，並非同心貼殼機械；核能設施／長橋仍是概念形體。夜間可辨輪廓，細節照明未設計。

離散幾何樣本不等於連續碰撞、完整旋轉掃掠／實際飛行、結構／水質／噪音／電力或海岸工程驗證。沒有測容量、可靠度、GPU性能、Safari、iPad或展覽硬件。E3才設計全城少量擴展與緩慢動態；E4才協調正式四題／權威配置及歷史相容性；不可將A/B/C直接當環境Meter bands。

## Preserved E1 record

E1規劃及四構想系統定義於`0dd1675`，整合`754a05c`，最後交接`1966ebe`。當時為純文件，120個本機links／targets及whitespace通過；沒有runtime測試／截圖，docs-only CI跳過。JAXA正文讀取逾時、僅核對搜尋摘要的限制保留在能源計劃，不用E2幾何推論工程效能。
