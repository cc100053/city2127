# 水庭／能源島現行視覺核對 — 2026-10-25 JST

**補證後結論：水庭與能源島均建議停止本輪polish，保留現版，0個值得續做的source視覺修改候選。** 總指揮另授權修正取證，新增2張有效日夜原圖，合共12張；原10張及無效標記全部保留。這是有限正常桌面視覺review，並非生成target逐pixel匹配、工程或全產品驗收。下方原10張的限制記錄保留，最新結論以「兩張補證」為準。

## 當前證據與範圍

唯一 source 為 `333e984f1a4bb315238aa6d8baeded797c659fc6`，`energyPrototype.ts` SHA256 `01987a48101b59559709dc2ce5461ec51617f0a73a06803e45c50354612556f3`；capture HEAD `abf838156880e6dc8686e9610fc644756e7b9e3b`。本輪 source、tests、assets、config、lockfiles 全部未改。既有 ring-night rejected trial 未套回；沒有新 target／imagegen／worker／實作輪。

macOS／已安裝 Chrome156.0.8078.47 headless，ANGLE Metal Apple M6／WebGL2，1920×1080、DPR1、default quality。正式 `?survey` 經真實 scratch SQLite／server／WebSocket，以 question-set4 四類各4份有效提案產生 `waterGardens:1, receiver:small, flywheel:true, island:true`；Q1／Q2／Q4均用 index1。`reviewTime=50`，hour12／22。這是單一正式代表配置，不覆蓋兩庭／所有seed或極值。首批全新原PNG恰好10張（追加2張見末節）；沒有使用縮圖替代原圖，也沒有重拍或覆寫。

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

## 兩張補證 — coordinator追加授權，2026-10-25 17:00 JST

追加只允許能源島日／夜各1張原1920×1080 PNG，非新polish輪。原10張的每個PNG SHA256不變，舊島detail兩圖仍無效；**12 total / 2 supplemental**。沒有試拍、覆寫原圖或新增target。源HEAD1838a827（evidence-only），runtime source仍01987a48；fresh fetch成功、origin/main仍db772bb，ahead13／behind0，無remote counterpart。開始實讀配額剩18%，只做已批准的兩張micro取證／checkpoint，沒有重型矩陣。

- 有效新原圖：[島完整日景](supplement/island-complete-day.png)／[夜景](supplement/island-complete-night.png)。
- [實際URL／hash／console／cleanup](supplement/browser.json)、[capture script](supplement/capture.mjs)、[log](supplement/capture.log)、[預先畫框計算](supplement/framing.json)、[補證核對](supplement/checks.json)。
- 重用同一正式16份scratch配置；hour12／22，actor50，Chrome156／1920×1080 DPR1 default，沒有DEV energy selector，source／quality／pan bounds／產品camera均未改。額外完整product matrix／motion／test／build未跑。
- 既有review hook camera(-150,65,-625)，target(-35,0,-355)；距target300.58m、polar1.353rad，全部在原OrbitControls限制內。target不被clamp。拍前以現行island全部mesh的world AABB投影8角，包含完整島與跨水橋，得到x176.97–1176.46、y421.77–840.42，安全地落在1920×1080畫框；非只估島中心。這是保守AABB預算，圖像仍另作人工自審。

**實際構圖自審：兩張均有效。** 完整基座四角／前沿及右側分段邊緣、雙殼頂與腳、服務屋屋頂／深色側面、整條橋和岸端均在畫框，沒有被UI卡遮住。島身實際約x555–1000／y572–825（人工像素估計，非新的量測），不是極端zoom；同張背景可見現行Fuji，尺度／銀白淡殼與深色機械關係可直接比較。較高舊orbit保留的屋頂百葉／端框／橋桁架視角與這組補圖互補；舊orbit下緣裁切不再被用作完整基座證明。

**島craft判斷：建議收尾。** Day殼面縱橫接縫、穹頂環箍／肩環、底座coping／分段caisson側縫及兩服務屋的深淺材料分層都能讀到；不是未完成的光滑膠囊加黑盒。Night殼面暗於Fuji亮室內，但雙殼／基座邊及接橋仍分離可辨，沒有輪廓消失或明顯組裝斷口。這符合locked target「既有輪廓內成熟組裝」的方向；沒有證據支持加微細件、改燈或追生成圖材質平滑度會改善正常訪客視角。保留原功能、封閉殼體、公共／船／air敘事。只作本次視覺判斷，不宣稱工程可行或達到生成target全部細節。

補圖Page exceptions0，只有既有favicon404，無未預期console/network失敗。自己的Vite session17456 exit130、capture25895 exit0；scratch64668／browser由finally關閉、scratch移除。source及原10PNG hash再核對，補圖PNG尺寸／hash、links／whitespace／scope及清理見supplement/checks.json。追加獨立archive／本機commit／hash見backup的checkpoint-supplement.json。Ownership已釋放，等待coordinator；不push／deploy／main整合。
