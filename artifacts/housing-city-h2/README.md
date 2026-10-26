# H2 — 生活艙交換／完整小屋更新循環

2026-10-27，唯一 worker `01a1790d-a993-76d3-bf14-fc024a8ed3c8`，batch `housing-h2-r1`，dispatch `housing-h2-r1-rev11`。起點 `6a27106365e1cf7b6b0d38677baf4f971cf102b1`；續做 `codex/housing-city`，不整合main。H0／H1已人類簽收，H1b已coordinator接受；本批完成與驗證另列，不代替H2人類視覺簽收。

[穩定計劃](../../docs/HOUSING_CITY_PLAN.md)／[coordinator交接](../../docs/handoffs/housing-city.md)／[獨立結果](result.json)。本worker不修改共享handoff。

## 實作與機械修正

四軸0／seed0＋水庭2／large receiver／flywheel／island的固定基準、五配置及鎖定原hero保持。M／P／上層U生活艙、植物膜與藻類靜態、不自發光。只在DEV住宅入口運行，survey／meters／scaleLab／energy優先；不改正式問卷、資料庫、Meter、live時序或全局燈。

U下層生活艙由原socket A抽出，在前側專用通道橫移至空socket B，再送入／降下／接通；完整小屋沿前側10.4m更新軌滑至另一底座。後半按相反順序返回。90秒明示「多年更新壓縮示意」，代表數年至數十年的城市更新，並非日常通勤。沒有透明度切換或瞬移換slot。

為使全構件通過，原示意吊架改為前側兩柱門架＋橫移吊車／雙索下承叉架，吊索留在前側，避免穿過上層已停泊艙；生活艙由叉架抬高0.6m、抽出6.8m後才橫移9m。原下層承軌降低0.12m並對齊底鞋，空socket整塊托盤移除，兩邊沿用細承軌；公共廊、升降核及其他主體保留。小屋提高0.14m、軌道提高0.09m以令整個底鞋貼合軌面，沒有截掉下身來通過檢查。水電伸縮接口放在門旁，停止移動後才伸出，起動前先收回。

移動生活艙的矩形板件與小屋依共享材質使用同一unit-box InstancedMesh；只有這個艙原5.5cm小倒角改為直角，輪廓、窗門及底鞋保留。固定更新軌合併入原U batch。沒有新dependency／texture，無逐幀geometry／material建構。Node總量50 meshes／30 geometries／128580 triangles；renderer另量，不能混用。

| 秒 | 示意狀態 |
| --- | --- |
| 0–5 | A停泊，水電接通 |
| 5–8 | A解除水電接駁 |
| 8–12／12–20 | 生活艙抬高／抽出，小屋等待軌道搬運 |
| 20–28 | 艙與小屋沿各自專用通道橫移至B |
| 28–32／32–35 | 艙送入／降下；小屋已到B |
| 35–38／38–45 | 接通B水電／停泊B |
| 45–48／48–52／52–60 | B斷開／抬艙／抽出 |
| 60–68／68–72／72–75 | 返回A／送入／降下 |
| 75–78／78–90 | 接通A／停泊A；90秒接回0秒 |

移除`reviewTime`播放；`reviewTime=0|7|16|24|30|40|56|64|76`固定階段。面板重播重置相對起點；重設／靜態閱讀／系統reduced motion都立即回A停泊且接通。reduced motion優先於手動取消checkbox。日夜仍由既有時鐘處理。

## 原始畫面

全部final原PNG為Chrome156 headless，1920×1080 DPR1；原hero及近景的精確camera／target／locked狀態、URL與SHA256寫在[完整browser記錄](final/browser.json)。日／暮／夜圖用default quality；性能另用low，不拿default圖像證明default FPS。

- 原hero搬運中：[日12](final/hero-transport-12.png)／[暮17](final/hero-transport-17.png)／[夜21](final/hero-transport-21.png)。
- 生活艙：[A停泊](final/mobile-0.png)／[斷開](final/mobile-7.png)／[抽出](final/mobile-16.png)／[橫移](final/mobile-24.png)／[送入](final/mobile-30.png)／[B接通](final/mobile-40.png)／[返回抽出](final/mobile-56.png)／[返回搬運](final/mobile-64.png)／[A接通](final/mobile-76.png)。
- 完整小屋：[A](final/home-0.png)／[途中](final/home-24.png)／[B](final/home-40.png)。
- [靜態停泊](final/static-docked.png)／[reduced motion](final/reduced-docked.png)。

Phase截圖在同頁透過僅供檢查的response instrumentation改`reviewTime`，並把相同時間寫入URL；不修改app公開介面或production。近景實際看過A／搬運中／B和小屋途中，保留周邊建築及行人；沒有為畫面刪除原樹或路徑。

## 幾何與恢復驗證

- `housingPrototype.test.ts`：五配置、實際頂點／instance與三處24×18m／28m預留、全部11個狀態、斷開先於移動、橫移前完全抽出／抬高、隨機時間跳讀、90秒wrap、重播／靜態A停泊、全程資源identity；每0.125秒檢查整組移動設備範圍。
- 不同移動組件之間另解每個keyframe區間的六條線性重疊不等式；矩形件沒有旋轉，每個AABB bound隨時間線性，能覆蓋兩樣物件同時移動之間的碰撞。只容許7cm吊索在上端插入吊車3cm、下端插入叉架橫桿最多10cm的實際小接點；沒有按物件名跳過整件設備。
- `housingCityCheck.ts`重用真實Odaiba GLB／civic core／環境／外牆／植被fixture，加中值district／四focal／全能源與完整`build2127`（含skyways）。Node可直接載入原factory，故`odaiba2127.ts`只補`.ts`副檔名、skyways JSON補type attribute，無改城市形狀。
- 固定城碰撞：AABB篩選→MeshBVH精確三角形。原鋪面只容許35cm以下的實際地面基腳接觸。
- 完整掃掠：每個moving mesh／instance（含牆、底鞋、叉架、吊索、吊車及伸縮plug）在17個線性區間取端點union，共680個保守掃掠盒；每段只作單軸平移或單軸伸縮，union覆蓋中間所有位置。對固定住宅／軌道及全城BVH檢查，只收縮1mm作面接觸數值容差，不裁切底部、不跳過命名物件。
- 交通：既有所有`routes()`曲線以≤0.5m弧長採樣，保守半徑（航空22m、車／軌／水8m、步道4m）再加0.5m覆蓋樣本之間；整個H2掃掠與此包絡分開。另用實際fleet matrices日12／夜21、90秒每0.5秒，共5204836個mesh／instance邊界對全部掃掠盒檢查，含已發布門口、forecourt及屋頂居民；這項實際actor補充檢查屬離散時間，不冒稱所有actor任意時間的連續幾何證明。沒有隱藏或減少actor。
- Node：7544項實城精確檢查、10923項掃掠近測及20條原hero focal視線PASS。完整runtime browser：478住宅mesh／instances對27301城物件，7964項精確檢查、11265項掃掠近測、hits0，見[geometry](final/geometry.json)。

完整命令與logs：[root test](root-test-final.log)／[root build](root-build-final.log)／[browser](browser-final.log)／[production排除](production.json)。只有既有>500kB build chunk warning。browser另外檢查靜態／reduced motion／重設／重播、普通1280×720 resize、其他DEV模式優先序；survey優先序用隔離mock WebSocket，只檢查入口互斥，不冒稱重跑正式survey流程。

## 性能與驗證範圍

最終low baseline 30.0013秒平均 **60.0307 FPS**，mixed動態91.0013秒平均 **60.0101 FPS**，全部11狀態均實際出現。原始frame intervals／每120幀renderer snapshot在[performance.json](final/performance.json)，另以全新baseline、同一幀同步隱藏／顯示住宅，在0／12／20／24／28／40／64／76秒配對render：住宅增量 **30 geometries／0 textures／51 calls／128652 rendered triangles**，全部階段相同，見[配對renderer原始資料](renderer-budget.json)及[可重跑probe](renderer-budget.mjs)。這也與live全循環上限一致。Node128580與renderer差72為透光面額外繪製，不混用。量測摘要由[result.json](result.json)記錄。性能階段不做BVH／碰撞檢查；root tests／build在計時前結束。總預算為住宅增量≤36 geometries／0 textures／80 calls／150000 rendered triangles、平均≥50 FPS。

`pass1/`保留第一輪實城零碰撞原圖；runner以strict equality比鏡頭時遇浮點-620.0000000000002而中止，已改容差。`pass2/`為後續機械接口修正前探索，保留所有原圖；因source已更新，停止該run，不能當最終驗證。`odaiba-pass1/2`記吊車與門架、plug與socket接點初版相交；後續修正後重跑完整suite與final browser，沒有略過測試來通過。

重跑：啟動root Vite，設定`CITY2127_CITY_URL`、全新`CITY2127_EVIDENCE_DIR`後執行`node tests/housingH2.browser.mjs`；沿用已安裝Playwright／Chrome，runner拒絕覆寫既有browser.json。服務及browser由執行者清理。

未測default sustained FPS、展覽硬件、Safari／iPad／Windows、訪客理解或結構／生態／無障礙法規可行性。survey／module-swap source未改，未重跑其獨立suite。H3正式背景／偏好／累積狀態歸屬待人類決定；本批沒有main整合或部署。
