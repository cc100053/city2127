# Housing A — 正式固定背景與 M 搬位

2026-10-27（Asia/Tokyo）。Owner：Codex，chat `01a17a83-db63-74d1-bc2a-755edb0102e9`；base `d3152b4b4b9d0385b4fe77194ca10062e4777e5b`，branch `codex/housing-background`。[計劃](../../docs/HOUSING_CITY_PLAN.md)／[交接](../../docs/handoffs/housing-city.md)。

人類先選方案A，收到原M與低automation服務館相交報告後，再選「保留服務館，重新選 M 住宅位置並提供對照圖」。M由`(-135,-175)`平移至`(-165,-165)`，距離31.62m；P/U、三類主／次設計、複合外皮、數量／輪廓及所有既有服務館保持。

`main`初始化一次mixed住宅並固定U停泊A；不進入投票／Meter／能源權威、CarrierChange或結果文案。正式frame不呼叫住宅update，snapshot／live／Undo／reset／reconnect均不重建住宅。Standalone與正式survey均顯示；隔離DEV housing／energy比較保留舊有基準，90秒循環只在DEV播放。沒有改問卷、DB、survey／module-swap source或新增依賴或執行部署命令。

## 搬位對照

[候選掃描紀錄](candidates.log)中最近通過初步原城／全部服務館／交通包絡的格點為`(-165,-165)`。最終位置另由下方完整檢查驗證；沒有只用初步格點當作完成證據。

| 固定鏡頭 | 原M位置 | 新M位置 |
| --- | --- | --- |
| 原hero | [搬前](release/before-hero.png) | [搬後](release/after-hero.png) |
| 局部固定鏡頭 | [搬前](release/before-detail.png) | [搬後](release/after-detail.png) |

兩組比較皆用最終source、相同鏡頭／hour12／reviewTime20／low quality，以及`nw:low,ne:high,sw:mixed,se:mixed`。測試只將M root平移回原位置拍「搬前」，再回正式新位置拍「搬後」；沒有改幾何或藏起服務館。這些DEV比較與下方production原圖分開。

## 軟件與幾何檢查

- Feature `npm test` PASS：[log](feature-test.log)。住宅新增324個四軸low/mixed/high × 4 seeds（0/1/2127/uint32 max）snapshot，另4種非對稱hybrid目標 × 7個3秒過渡時點，共352個檢查狀態；max能源共存與small receiver配置都涵蓋。固定住宅JSON／資源／停泊未變。這是明列的樣本，不是任意seed或連續過渡全域證明。
- 精確BVH幾何檢查7482項、交通包絡12項近測、H2完整680個掃掠盒／10923項近測、20條hero focal視線、日夜90秒每0.5秒共5204836個實際actor boxes PASS。動態設備掃掠仍是DEV回歸；actor boxes是離散補驗。`meter-pulse`屬非實體光圈，不當作物理障礙。
- `npm run build` PASS：[log](feature-build.log)，只有既有chunk大小提示。Production有`housing-background`，沒有devHousing／devEnergy chunk及住宅比較／重播文案；共享工廠保留初始化A構造，正式不呼叫循環。
- Survey／module-swap未改，不另外跑本機獨立suite；main CI將驗三個package。`git diff --check` PASS。

## Production 瀏覽器與性能

最終腳本[入口](../../tests/housingBackground.browser.mjs)，fresh scratch SQLite、真實HTTP/WebSocket／提案、production preview；Three原生devtools observer只用來讀場景，不改production bundle。最終原始結果：[browser.json](release/browser.json)。原hero [日12](release/hero-12.png)／[暮17](release/hero-17.png)／[夜21](release/hero-21.png)，[真實live結果](release/live-result.png)。

PASS：live四段觀察、結果沒有住宅變化聲稱、Undo、真TCP離線／重連、queued city reset＋next Start、full reset、reduced motion、普通1280×720 resize及reload，固定三區／mixed複合層／A停泊與住宅mesh/geometry/material身份保持；reload後幾何及姿態相同。DEV另驗24秒搬運位姿、靜態／重播／重設／reduced motion，沒有重複正式背景。Console/page errors及failed requests0；只記錄既有favicon404與刻意離線的WebSocket診斷為expected，非預期HTTP失敗0。

環境：macOS、Chrome 156.0.8078.48 headless、ANGLE (Apple, ANGLE Metal Renderer: Apple M6, Unspecified Version)，1920×1080 DPR1。正式real-clock hour12、每種品質30秒rAF短測：low **60.0197 FPS**，default **35.7305 FPS**。Low通過H0≥50FPS；default未達50，應按既有`quality=low`能力在弱GPU／展覽設備上驗收。這不是長時間穩定性或GPU timer量測，也不是同幀無住宅baseline比較。

八張原PNG及runtime/script hashes見browser.json；搬前／搬後原hero與局部圖已實際查看，M離開服務館20m樓板而完整館及原場景留在同一位置。

未測展覽HDMI／實機持續負載、Safari／iPad／Windows、訪客理解、工程／生態／消防／無障礙法規或新增居民實際使用路徑。正式配置檢查是上述樣本，沒有宣稱所有任意狀態已驗。原H0–H3中值／動態FPS保留為當時歷史，不冒充本輪量測。

## 整合

Feature `d83ee62d2198c27fc3bdef2edd265dccd457e0a3`已push；merge `ba54961ed7cc6c5f137d4609f95ba77b76dad3e6`無衝突，tree與feature完全一致。整合後root test/build/committed whitespace PASS：[test](integrated-test.log)／[build](integrated-build.log)。Browser及FPS沿用同runtime/source hashes的最終release證據，沒有重拍或宣稱新FPS。Main已push並fetch核對 `7ea9ec0100bebd24a1e9144dde1b9006bc23995a`；[main CI 40421964460](https://github.com/cc100053/city2127/actions/runs/40421964460)實際completed／success，root／survey／module-swap test/build及whitespace全部成功。Feature的[CI 40421635474](https://github.com/cc100053/city2127/actions/runs/40421635474)亦成功。後續本輪只提交Markdown交接紀錄，按CI規則skip，runtime沒有再變。所有本輪Vite／preview／browser／scratch survey服務已停止；既有`.playwright-cli/`及舊feature保留。
