# H1 — 建築・居住五配置靜態比較

2026-10-26；owner：Codex。**H1 已實作／軟件驗證，並由 cc100053 於 2026-10-26 簽收；H1b／H2／H3 尚未完成。**
[計劃](../../docs/HOUSING_CITY_PLAN.md)／[已接受 H0](../housing-city-h0/README.md)／[當前交接](../../docs/handoffs/housing-city.md)。

## 開啟與比較

Root Vite 使用實際印出的 loopback URL，開 `?housing=baseline|material|membrane|mobile|mixed&hour=12&reviewTime=20`。
選單可即時切換五配置及原 hero／三處近景；選擇會保存 URL。原 hero 鎖定，日／暮／夜固定 hour 12／17／21，reviewTime 20。
基準為四軸 score0／seed0，以及水庭2、large receiver、flywheel、island 全共存。所有配置使用同一基準及原 hero，沒有刪除舊建築或改動問卷。
一般 renderer resize 保留；未加入 mobile／自適應構圖。近景由 `housingView=material|membrane|mobile` 決定，與 hero 接受檢查分開。
survey、meters、scaleLab、energy 均優先，住宅入口不會混入；production bundle 不包含住宅 DEV 工具。

| 配置 | H1 主設計 | 日12 | 暮17 | 夜21 |
| --- | --- | --- | --- | --- |
| baseline | 原混合城市及四類能源 | [原圖](final/baseline-12.png) | [原圖](final/baseline-17.png) | [原圖](final/baseline-21.png) |
| material | M 輕材架空住宅，分叉支承、可拆接生活艙與公共生活廊 | [原圖](final/material-12.png) | [原圖](final/material-17.png) | [原圖](final/material-21.png) |
| membrane | P 折面住宅、厚植物膜、棚架及集水／回水設備 | [原圖](final/membrane-12.png) | [原圖](final/membrane-17.png) | [原圖](final/membrane-21.png) |
| mobile | U 水庭上方固定交換骨架，兩艙／空接駁位／吊運架均停泊 | [原圖](final/mobile-12.png) | [原圖](final/mobile-17.png) | [原圖](final/mobile-21.png) |
| mixed | 三區共存，M 同一棟架空住宅疊加植物外皮與可換艙 | [原圖](final/mixed-12.png) | [原圖](final/mixed-17.png) | [原圖](final/mixed-21.png) |

近景：[M 輕材／複合](final/detail-material.png)／[P 植物膜](final/detail-membrane.png)／[U 交換骨架](final/detail-mobile.png)。
這些是 H1 停泊靜態構造，未將淡入淡出或固定 slot 稱為搬遷；90秒多年更新壓縮循環留待H2。
植物及未來藻類外皮不自發光，夜間入口／接駁沿用城市共享 publicLight，沒有新 global light。

## 空間與構造

- 三處原位置 M(-135,-175)、P(45,-215)、U(-265,-60)，全部實際頂點仍在各24×18m／最高28m範圍。
- M 保留既有 `automation-drone-ports` 的支柱，在它旁邊用獨立支承建兩層住宅；樓板留庭院空洞，艙體與植物膜移至一側，沒有讓原支柱穿過新房間或把它當新住宅承重柱。
- P 斜面由低側5m升至高側25m，棚架／植被厚度與供水改變住宅截面；360株實例形成連續植被，沒有只在同一平盒上換綠色。
- U 中央原來是 shader 水庭。新平台 y2.5m，由細樁柱承托，保留水面；陸側入口在 local +Z，樓梯與升降核保持在預留區內。它是停泊的更新骨架，未加入完整移動小屋。
- 樓梯採 switchback flights，單級 rise≤18cm；固定升降／utility core、可拆接鞋座、公共廊及獨立接駁點可在近景閱讀。尚未作結構、消防、無障礙規範或地下管線工程驗證。

H0 的早期篩選曾因 actor 名稱過濾，把靜態 `automation-drone-ports` 當成 drone actor 排除，亦不能識別 shader 水域；因此原 H0 線框不代表完整空箱完全淨空。
H1 已改成實際住宅對完整 runtime 場景及 Node 固定中值 district 的精確檢查，並修正 M 樓板／艙／植物層；原 H0 圖及 JSON 沒有覆寫。

## 驗證方法與實際範圍

Node `housingPrototype.test.ts` 檢查五配置的實際 visibility、複合層、每個實例的所有頂點界限、≤150k triangles、共享材料及切換資源不重建。
`housingCityCheck.ts` 重用既有 Odaiba GLB／外牆／植被 fixture，另建固定中值四站／district＋全能源配置，做 AABB → MeshBVH 精確碰撞，以及 mobility 全曲線每≤0.5m加0.5m保守餘量和20個焦點視線。
只容許實際鋪面交點在地上35cm以下的柱腳／梯腳承托；不因一整個鋪面 mesh 遍及全城便跳過高處碰撞。

Browser runner 對實際載入場景檢查，包含 skyways、四站、能源、已發布入口及當前靜態 actor 位姿；`final/geometry.json` 記錄實際 mesh／instance 數與精確比較。
此項是 reviewTime20 的靜態相交檢查，沒有聲稱涵蓋全部 actor 時間、生活艙全掃掠或新的行人使用模擬；H2仍須完整動作檢查。
住宅在 `loadOdaiba` 完成及原入口發布後才建立，不會用重選既有入口來隱藏碰撞。

本機 macOS、Chrome156.0.8078.47 headless、ANGLE Metal Apple M6／WebGL2，1920×1080、DPR1。
比較原圖用 default quality；性能用 low、hour12／reviewTime20，各配置暖機後30秒rAF。
性能從全新 baseline 頁面開始，之後才首次顯示住宅，避免把已上傳 GPU 的住宅 geometry 計入基準。
精確數字、原始 frame intervals、GPU、source hashes、相機位姿與console／network結果見 [final/browser.json](final/browser.json)／[performance.json](final/performance.json)。

## 重跑與保留的探索證據

```sh
CITY2127_CITY_URL=http://127.0.0.1:5188 \
CITY2127_EVIDENCE_DIR=artifacts/housing-city-h1/new-run \
node tests/housingH1.browser.mjs
```

沿用已安裝 Playwright／Chrome，不加依賴；可用 `CITY2127_PLAYWRIGHT_PATH` 指定既有 Playwright 的 index.mjs。
runner 拒絕覆寫已有 browser.json；服務由執行者啟停。

- pass1：初版原圖保留，runner 誤用不存在的 context.setReducedMotion，未完成驗證；P近景被既有塔樓擋住，M初版亦與port支柱交疊，不能作接受證據。
- pass2：geometry檢查缺少被測既有 mesh 的BVH快取，耗時過長；只終止本任務已辨識Chrome，原錯誤／圖保留。
- pass3：精確檢查指出M仍與port支柱交疊，失敗JSON保留；之後改為偏側住宅與庭院孔洞。
- pass4：舊植被密度的精確碰撞／全部軟件流程PASS，但P近景仍不合用，且geometry記憶體差值錯用已顯示過住宅的基準（0不是真正新增量）。該組不能代替final的近景與資源量測。
- camera-check.png：P近景獨立試構圖，low，不是final default比較圖。
- final：使用新植物覆蓋、已離開建築的P近景及全新基準頁重新驗證；只有這組是本次候選的最終接受入口。

H1b次設計（橫向集約焦點、藻類設備、完整小屋）依計劃等主設計簽收後才做；H2動態、H3正式接入歸屬、硬件／Safari／iPad／Windows、訪客理解、結構及生態工程均未驗收。

H1 人類簽收來源：chat `01a177a5-78d8-7c20-8d07-5daa1f099905`，message `01a17815-5263-7ae2-9f44-5c8f55732aa6`：「簽收，繼續 H1b／H2（建議）」。2026-10-26 closure 核對 final source hashes 全部一致；[完整 root test](root-test.log)／[build](root-build.log) PASS（既有 chunk warning）。最終增量20 geometries／0 textures／21 calls／131940 triangles；low 30秒約60.03 FPS。原始證據及探索失敗均保留。
