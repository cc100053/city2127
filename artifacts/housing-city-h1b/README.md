# H1b — 次設計靜態比較

2026-10-26，worker owner `01a17828-38f5-73f1-8ec9-480ecc60db07`。Dispatch `housing-h1b-r1-rev5`；本批只做 H1 closure＋H1b，未做 H2 動畫或 main 整合。H1 的直接人類簽收已記在 [H1 README](../housing-city-h1/README.md)；**H1b 已通過 coordinator 原圖／diff／source hash review；未冒稱人類視覺簽收。H2 待配額恢復。**

[穩定計劃](../../docs/HOUSING_CITY_PLAN.md)／[current coordinator 交接](../../docs/handoffs/housing-city.md)／[獨立結果](result.json)。

## 設計與保留範圍

沿用四軸0／seed0、水庭2＋large receiver＋flywheel＋island，鎖定原 hero，hour12／17／21、reviewTime20。五配置及 production 排除、survey／meters／scaleLab／energy 優先沿用 H1。

- M：原輕材住宅、分叉支承、植物複合層及原 drone-port 庭院保留。原右側公共 deck 上只加一組約9m長、5.3m高的橫向共享骨架，兩個共同生活室與連廊使用原固定升降核同一樓面，保留可拆接節點。它在(-135,-175)，固定背景，遠離(175,-45)的Q4集約塔，不由Meter改動。
- P：原斜面／厚植物膜不變。後側加五片深綠藻類設備面板，獨立支架／基腳、上下集配管、垂直回水管及過濾槽。共用一個深綠 paint 材質及既有透光膜；所有藻類材質 emissive=0，沒有新全局燈或生物發光暗示。
- U：原水庭架高平台／交換骨架／停泊艙／吊運架／公共廊不變。前側另加一座約3.6m的完整小屋（牆、頂、前後門、窗、底鞋），沿兩條10.4m端點距離的專用更新軌停泊。兩個底座、水電服務柱、設備箱及陸側平台／斜坡獨立；更新軌與後側公共廊分開。本批沒有移動，路徑不稱為日常通勤。

所有新頂點及兩個小屋停泊端點仍在 M/P/U 各24×18m／最高28m框內；沒有刪除原主要建築、植物、能源或路徑。次設備用既有單位 stair BoxGeometry 配共享材質合批；主 H1 幾何沒有簡化。整體 Node 住宅量為37 meshes／36 geometries／133344 triangles。

## 原始畫面

全部 final 比較原圖為 macOS、Chrome156 headless／ANGLE Metal Apple M6／WebGL2、1920×1080 DPR1、default quality；固定原 hero。近景另記鏡頭位姿，不拿近景替代 hero。

| 配置 | 日12 | 暮17 | 夜21 |
| --- | --- | --- | --- |
| baseline | [原圖](final/baseline-12.png) | [原圖](final/baseline-17.png) | [原圖](final/baseline-21.png) |
| material | [原圖](final/material-12.png) | [原圖](final/material-17.png) | [原圖](final/material-21.png) |
| membrane | [原圖](final/membrane-12.png) | [原圖](final/membrane-17.png) | [原圖](final/membrane-21.png) |
| mobile | [原圖](final/mobile-12.png) | [原圖](final/mobile-17.png) | [原圖](final/mobile-21.png) |
| mixed | [原圖](final/mixed-12.png) | [原圖](final/mixed-17.png) | [原圖](final/mixed-21.png) |

近景：[M主設計](final/detail-material.png)／[P主設計](final/detail-membrane.png)／[U主設計](final/detail-mobile.png)／[M共享室](final/detail-collective.png)／[P藻類](final/detail-algae.png)／[U小屋及更新軌](final/detail-home.png)／[藻類夜間](final/detail-algae-21.png)。既有環境會遮住部分次設備，特寫用來解釋構造；沒有移除樹木或高架使鏡頭通過。

## 實際驗證

- `housingPrototype.test.ts`：五配置／複合層實際 visibility、全部mesh／instance頂點與兩個停泊端點、橫向比例、藻類不自發光、全住宅預算、切換20次資源不變。
- `housingCityCheck.ts`：完整 Odaiba GLB／外牆／植被 fixture＋中值四站／district＋全能源；AABB→MeshBVH精確相交，地上35cm以下只容許實際柱腳／梯腳鋪面接點；既有 mobility 曲線≤0.5m採樣＋保守半徑；20條 focal hero 視線。新小屋上方本體的預留通道另以25個停靠位姿檢查固定住宅／原城幾何；它只驗y≥3.35m上方的保守本體框，軌／底鞋／插接接點及H2吊運全掃掠仍未驗。
- browser：實際完整 runtime（包括 skyways、入口、能源、四站及 reviewTime20 靜態actor）精確相交；同一小屋本體通道檢查。不是全部actor時間的連續碰撞檢查。
- 五配置日／暮／夜、六種近景、藻類夜間、鎖定hero及拖曳、一般1280×720 resize、reduced motion靜態、互斥模式及重選資源不增。
- 全新 low baseline 頁面起，之後首次顯示 mixed；各暖機後30秒 rAF，root tests／build及其他browser已結束才進入性能階段。相同視角／時間／能源，不用調低既有城市內容通過預算。default 圖像不代表default FPS達50。

最終命令、平台、SHA256、renderer差值、全部原始 frame intervals、console／network及逐圖位姿：[browser.json](final/browser.json)／[geometry.json](final/geometry.json)／[performance.json](final/performance.json)。完整 logs：[root test](root-test-final.log)／[build](root-build-final.log)／[browser](browser-final.log)。

探索保留：`odaiba-initial.log`記M骨架初版碰到port；pass3 Node／pass1 browser記接駁管高出軌道接口；已移位／降管修正。`pass2/`完整軟件流程通過，但M/P特寫有高架遮擋，後來調整特寫；新增深綠透光設備面及M室位置微調後另跑final。`camera-*`是探索構圖，有些更差，不能代替final。全部原PNG／JSON／失敗log保留，沒有覆寫H1證據。

重跑：啟動root Vite，設定 `CITY2127_CITY_URL`、全新 `CITY2127_EVIDENCE_DIR`，執行 `node tests/housingH1.browser.mjs`。沿用已安裝Playwright／Chrome，不加依賴；runner拒絕覆寫已有browser.json。服務須由執行者清理。

H2 90秒多年更新壓縮循環、完整搬運／底鞋／接駁掃掠及replay/reset仍未實作。本批只證明所列靜態幾何及桌面情境；未測展覽硬件、Safari／iPad／Windows、訪客理解、結構／生態／無障礙法規或地下管線工程。survey／module-swap source未改，沒有另跑其獨立suite；沒有main整合／CI完成宣稱。

最終量測：low baseline **60.0143 FPS**、mixed **60.0163 FPS**（各30秒）；renderer增量 **36 geometries／0 textures／38 calls／133416 triangles**。Node幾何三角形133344與renderer差72，因透光面多一次繪製；不得混用。final browser全部PASS：7086項實城精確比較、475項小屋本體通道近測、443個住宅mesh／instances對25529個原城物件，hits0；25張原PNG與6份source hash核對一致，exceptions／console warnings／failed requests均0。Root test／build PASS，只有既有chunk warning。
