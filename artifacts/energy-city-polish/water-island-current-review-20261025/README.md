# 水庭／能源島現行視覺核對 — 2026-10-25 JST

**結論：水庭建議收尾；能源島只完成 hero／部分 orbit 核對，近景驗收未完成。沒有足夠證據提出一個值得續做的 source 視覺修改，也不能據此宣布兩者全部達標。** 保留現版，交回 coordinator 決定是否另授權補島取證；本 chat 停止，不自行開 pass。

## 當前證據與範圍

唯一 source 為 `333e984f1a4bb315238aa6d8baeded797c659fc6`，`energyPrototype.ts` SHA256 `01987a48101b59559709dc2ce5461ec51617f0a73a06803e45c50354612556f3`；capture HEAD `abf838156880e6dc8686e9610fc644756e7b9e3b`。本輪 source、tests、assets、config、lockfiles 全部未改。既有 ring-night rejected trial 未套回；沒有新 target／imagegen／worker／實作輪。

macOS／已安裝 Chrome156.0.8078.47 headless，ANGLE Metal Apple M6／WebGL2，1920×1080、DPR1、default quality。正式 `?survey` 經真實 scratch SQLite／server／WebSocket，以 question-set4 四類各4份有效提案產生 `waterGardens:1, receiver:small, flywheel:true, island:true`；Q1／Q2／Q4均用 index1。`reviewTime=50`，hour12／22。這是單一正式代表配置，不覆蓋兩庭／所有seed或極值。全新原PNG恰好10張；沒有使用縮圖替代原圖，也沒有重拍或覆寫。

[原圖／URL／時間／hash及browser記錄](browser.json)、[正式提案與完整snapshot](formal-fixture.json)、[取證腳本](capture.mjs)、[執行log](capture.log)、[相機取證審核](camera-audit.json)。只用現成 `review=street&cam&at`／reviewTime hook，未改產品source。

| 證據 | 適用判斷 |
| --- | --- |
| [hero日](hero-day.png)／[夜](hero-night.png) | 正常 authored hero，全島／水庭與Fuji及岸線關係 |
| [水庭orbit日](water-orbit-day.png)／[夜](water-orbit-night.png) | 有效，camera距target168.91m |
| [水庭detail日](water-detail-day.png)／[夜](water-detail-night.png) | 有效，77.08m；不是極端放大；前方既有mast保留 |
| [島orbit日](island-orbit-day.png)／[夜](island-orbit-night.png) | **部分有效**：橋與兩端、上部殼／機械屋可看；島的下緣被畫面裁掉 |
| [預定島detail日](island-detail-day.png)／[夜](island-detail-night.png) | **不合格取證**：畫面是water room，不能當能源島近景證明 |

相機問題由既有 `main.ts` 每幀把 target clamp 到 `DISTRICT.minZ=-360` 引起。要求島orbit target z−427，整個camera/target向岸移67m；detail z−470則移110m。根因是本次腳本未在拍攝前把pan bounds納入鏡位驗證；不是能源島模型bug。實際圖像與source推論一致，但未取得runtime camera telemetry。[camera-audit.json](camera-audit.json)區分 requested 與推算後座標。browser log 的 PASS 只表示配置／尺寸／runtime assertions通過，**不表示構圖或視覺接受**。其note手算水庭75.7m有誤，以audit的77.08m為準。十張上限已用盡，沒有偷偷補拍。

## 美術判斷

水庭對照既有 [locked target](../../energy-polish-recovery-20261025/targets/water-garden.png) 及其prompt：近景可讀上盆面板縫／銀色coping、下方放射承托、斜柱接頭／套環、分開的雙管、渦輪框／百葉層次、分片深色遮棚、連續欄杆和入口接岸。orbit仍能讀到「上盆＋承托＋機械亭＋公共底座」，hero保留纖細輪廓。晚間外殼及渦輪較暗，輪廓／入口仍辨識；沒有證據顯示加小零件會改善訪客正常距離的閱讀。建議停止水庭polish；不宣稱與生成target逐pixel一致。

能源島對照既有 [locked target](../../energy-polish-recovery-20261025/targets/energy-island.png)：hero看得出分離於岸的矩形基座、成對封閉穹殼、兩個深色服務屋及跨水橋。部分orbit已見穹殼縱橫接縫／環箍、屋頂百葉、升降端框、橋側深色桁架及踏板深度；夜間橋線及殼體仍可分辨。這支持保留目前已完成的組裝方向；**島的完整基座邊、側面與近距離細節不在本次有效畫框內，不能給完整收尾驗收。** 沒有把看不見的東西列為模型缺口。

Fuji craft對照已存在的 [v3r9日](../../fuji-tv-polish/v3r9-pass3.jpg)／[夜](../../fuji-tv-polish/v3r9-pass3-night.jpg)，並以本次hero的現行Fuji作同場關係校對。水庭／可見島部件沿用淡殼、深色精密機械、金屬邊與分層接頭，沒有要求它們像Fuji的透明劇場一樣明亮或佔據主角地位。這兩張Fuji圖是歷史材質／組裝reference，不冒充今日新證據。

**續做排序：0個 source 修正候選。** 水庭建議收尾；能源島判斷維持 PARTIAL，而非以三輪數目、console PASS或target存在宣稱匹配。若coordinator另派取證，先用既有bounds內target、離岸camera向岸看的合理視角，確認島在畫框再拍；只補取證，不改全局camera／pan bounds／light或設施用途。本dispatch不執行這一步。

## 功能與未驗工程

外形／管道／橋只能支持空間敘事推論：水庭是外部充能儲能，島是封閉能源設施與檢修連接。圖像不能證明水力、核能、容量、維修安全或訪客理解。原有公共／air／boat／sweep敘事未重驗，亦未改。

有限live/static觀察：正式rotor diagnostic live21.67→24.80秒、角1.133456→1.383952；browser reduced-motion時28.14→31.16秒仍0.7。只證明該diagnostic，沒有水位／渦輪transform instrumentation或新motion完整驗收。10原圖均固定actor50秒。Page exceptions0；無未預期console/network錯誤，只有既有favicon404。未重跑完整產品矩陣／root tests／build（source不變）；沒有新FPS、實際展覽硬件／Safari／iPad／Windows／長時間／工程驗證。

[Preflight](preflight.json) 記錄fetch／branch／owner release／quota；[reference hashes](references.json)鎖定比較來源。自己的Vite5193已exit130，scratch64102及browser由finally關閉，scratch檔案移除；清理與whitespace／hash／link結果見 [checks.json](checks.json)。獨立小archive／checksum／local commit見 handoff 指定backup checkpoint；沒有push／deploy／main整合，沒有複製1.5GB source bundle。
