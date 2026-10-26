# H3 — 住宅收斂與正式接入評估

2026-10-27（Asia/Tokyo）；worker `01a1792a-0965-73b3-bd12-e44fd9bf60ff`，dispatch `housing-h3-r1-rev16`。基線 `b27105a02ebecf66d19b4ea546b2fa8523758499`，分支 `codex/housing-city`。本批完成文件評估，待 coordinator review；正式接入方案尚未由人類選定。

[穩定計劃](../../docs/HOUSING_CITY_PLAN.md)／[當前交接](../../docs/handoffs/housing-city.md)／[本批雜湊核對](evidence-check.json)／[獨立結果](result.json)。共享 handoff 由 coordinator 獨佔，本 worker 不修改或提交它。

評估結論：**保留現有三區、數量、位置及輪廓，沒有必須修改模型才能完成本批的證據。建議方案 A：正式住宅先作固定背景，U 停泊 A；90 秒更新循環留在 DEV。** 這是待討論的推薦，不是正式渲染或資料接線授權。H0／H1 的人類簽收及 H1b／H2 的軟件／coordinator 接受狀態保持；本批沒有代替 H1b／H2 人類視覺或訪客理解驗收。

## 評估來源與適用範圍

直接查看 H1、H1b、H2 各 8 張原 PNG，共 24 張；清單及 SHA256 在 evidence-check.json。另查看 R01 master hero／R06 secondary district，按 [CITY MASTER TASTE](../../docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) 的支承、接點、架空公共層、淡色複材及海灣留白評估。

H1 原圖對應 `c05f4b3`，H1b 對應 `1145ffe`；兩批 browser 記錄的 source hashes 均與各自歷史 commit 相符，全部原圖雜湊相符。它們用於靜態設計沿革比較，不能代表 H2 更新後的 U 機械。H2 的 9 個 source／18 原 PNG hashes 與現檔一致；`src/`、tests、各 package 與 H2 `5ae56e3` 沒有新增差異。M／P 主設計及共享骨架／藻類構造區段與 H1b 逐字一致；U 及目前資源／動態評價以 H2 為準。

比較條件沿用固定四軸 score0／seed0、水庭2＋large receiver＋flywheel＋island、原 hero `(-520,300,-620)` → `(-40,25,-60)`、FOV42、locked controls。H1／H1b 固定 reviewTime20；H2 hero 搬運圖固定24秒，所以交通位姿不同，不能當同幀像素差比較。原圖為 macOS Chrome156 headless／ANGLE Metal Apple M6／WebGL2，1920×1080 DPR1、default quality。近景只解釋局部，不代替 hero。

## 三類單獨評估與數量收斂

| 類別／位置 | 保留數量與形態 | 主鏡頭／近景觀察 | 收斂建議 |
| --- | --- | --- | --- |
| M 新材料，Aqua City 北側 `(-135,-175)` | 兩個上下分置生活艙、分叉支承與公共廊；一組橫向共享骨架含兩個生活室。mixed 才加同棟植物複合層（48 株實例） | hero 下方中間可定位低層淡色架構，但與既有 port 柱、遮棚疊景；近景可分辨新斜撐、庭院留孔、固定出入核、鞋座及共享室。共享室是小尺度橫向補充，沒有形成第二座 Q4 垂直塔 | 維持一組，不擴成住宅群；保留庭院避開原 port 支柱。Q4 `urbanConcentration` 並不代表材料票，不能據此控制 M |
| P 植物膜，Aqua City／DECKS 間 `(45,-215)` | 一棟折面住宅，360 株實例形成厚植被；後側五片藻類面板、集配／回水管及過濾槽；mixed 的 M 外皮是另一處植物形態 | hero 中偏左的斜綠面是三區最容易辨認的輪廓；近景能看到厚度、斜面和集水槽。藻類在 hero 幾乎不能獨立讀懂，近景受反射及左側原樹局部遮擋，須結合說明才知是循環設備 | 保留斜面與五片面板，保持植物靜態／非自發光；不增加面板、不拆原樹。數量不是生態效能或人口指標 |
| U 可移動，Hilton 前側水庭 `(-265,-60)` | 一組固定交換骨架、兩個生活艙（下層一個移動／上層一個固定）、兩個下層接駁位；一座約3.6m完整小屋、兩底座及10.4m更新路徑 | hero 右前方可定位小架構，無法只靠遠景讀懂斷水電或多年更新。H2 A／途中／B 近景能辨認空 socket、前側吊索／叉架承托與小屋沿軌位置變化；兩種移動在同一張近景仍有疊景 | 保留一組、一艙移動及一座小屋；DEV 保留已選90秒循環／靜態閱讀。推薦正式背景先固定 A，避免把壓縮更新當每日通勤或每票觸發 |

數量來自 [housingPrototype.ts](../../src/housingPrototype.ts) 的構造／實例，不是家庭數、居民數、承載量或住宅供應推算。M／P／U 各仍受既有24×18m、最高28m預留約束；本批沒有修改座標或幾何。

對照入口：[H1 baseline](../housing-city-h1/final/baseline-12.png)、[material](../housing-city-h1/final/material-12.png)、[membrane](../housing-city-h1/final/membrane-12.png)、[mobile](../housing-city-h1/final/mobile-12.png)、[mixed](../housing-city-h1/final/mixed-12.png)；次設計 [M 共享室](../housing-city-h1b/final/detail-collective.png)、[P 藻類](../housing-city-h1b/final/detail-algae.png)、[完整小屋](../housing-city-h1b/final/detail-home.png)；目前 U 的 [A](../housing-city-h2/final/mobile-0.png)、[搬運中](../housing-city-h2/final/mobile-24.png)、[B](../housing-city-h2/final/mobile-40.png) 及 [小屋途中](../housing-city-h2/final/home-24.png)。

## 混合輪廓、共存與夜間

[H1b mixed 日景](../housing-city-h1b/final/mixed-12.png) 與目前 H2 hero [日12](../housing-city-h2/final/hero-transport-12.png)／[暮17](../housing-city-h2/final/hero-transport-17.png)／[夜21](../housing-city-h2/final/hero-transport-21.png) 顯示三區是原城前景的低層補充；civic core、原塔樓、skyways 及能源設施仍保留層次，海面／天空與主要結構空隙未被填滿。M 與 U 共用淡色框架語言，P 的斜綠面提供不同截面；mixed 的 M 植物外皮與生活艙證明三類可疊在同一棟，無須把城市切成互斥區域。

這符合 R06「次要建築不必都成地標」的方向，但遠景只能指位置及大形，不能獨立證明共享活動、藻類循環、水電接駁或更新時間尺度。原圖也未證明達到 R01／R06 的生成參考細節或真實材料品質。沒有以增加數量、提高樓層或新增燈光來補足說明的證據。

夜景仍能找出淡色骨架／門口，植物與藻類保留暗面；[藻類夜間近景](../housing-city-h1b/final/detail-algae-21.png) 未出現生物發光。hero 夜景中細管／小屋更難辨識，不能以「夜景可定位」推論設備機理可讀。若日後需要正式講解，先決定是否安排設施特寫／背景文案，再做訪客閱讀測試；本批不新增鏡頭或產品 UI。

H2 在上述固定基準有20條 focal 視線、實城零相交、全構件掃掠與交通包絡證據；不等於所有正式 Meter／seed／能源目標、3秒途中形態都已驗。未作新住宅居民路徑、室內使用、結構／生態／消防／無障礙工程驗證，不能由圖中的樓梯或升降核推論工程合規。

## 預算與現有驗證

沿用 [H2 原始結果](../housing-city-h2/result.json)，本批沒有重新量測：low fresh baseline 30.0013秒 **60.0307 FPS**，mixed 動態91.0013秒 **60.0101 FPS**，覆蓋11狀態。8個時刻同幀配對住宅增量 **30 geometries／0 textures／51 calls／128652 rendered triangles**，符合 H0 上限36／0／80／150000及最低50 FPS。H1b「geometry額度已滿」只屬當時紀錄，H2 優化後餘量為6；不是擴建需求。

H2 root test／build／production 排除／browser／恢復及資源 identity 檢查通過；只有既有 chunk warning。680個分段線性掃掠盒與移動件相對時間不等式涵蓋全構件；交通包絡之外另做日夜90秒每0.5秒的5,204,836個實際 actor boxes 補驗，後者仍是離散採樣，不是所有 actor 任意時間的連續證明。完整方法見 [H2 報告](../housing-city-h2/README.md)。default sustained FPS、展覽實機、Safari／iPad／Windows及訪客理解尚未測試。

## 正式接入選項（尚未選定）

**交由 cc100053 的精確問題：是否採 A，把現有 M／P／U（含複合外皮、共享室、藻類設備及完整小屋）以原位置／原數量作正式城市固定背景、U 固定停泊 A，90秒更新循環保留 DEV，並明確不把住宅形態或搬運說成任何一票造成；還是選 B 保留 DEV 待獨立居住偏好設計，或選 C 另開四題替換／權威累積方案？**

| 選項 | 正式顯示／因果 | 優點與代價 | 決定後才開始的工作 |
| --- | --- | --- | --- |
| **A 固定背景（建議）** | 原三區全保留，mixed 複合層固定可見；U A停泊。問卷／Meter／累積狀態不影響住宅；背景文案只描述城市設施，不列為提案變化 | 保留三類多樣性，沒有虛構投票因果；訪客不能投票選住宅。正式城市仍需新組合驗證，不能直接移除 DEV guard 就稱完成 | 分離既有固定構造與 DEV 比較控制，接入正式場景載入／資源生命週期；保留 DEV90秒與reduced motion。針對正式 low／mixed／high、hybrid／seed／能源組合及轉場建立空間／視線／資源檢查；驗正式production、原hero日暮夜、live不誤標住宅、Undo／reset／reconnect後背景穩定、實機性能。再決定設施說明是否需近景 |
| B 保留 DEV，先設計獨立居住偏好 | 本次不顯示正式住宅；以三類可共存為起點設計居民生活取捨，尚無新增題目或狀態授權 | 保留日後可選性；正式城暫無這批多樣性。獨立狀態本身不能解決輸入來源，仍須保持四題契約並另決定取得偏好的方法 | 完成生活問題／選項、累積與共存規則、歷史語義及舊資料處理的提案；由人類選定輸入來源後才寫權威資料與渲染鏈 |
| C 另開四題替換／權威擴展計劃 | 先明確替換哪一題、放棄哪項現有取捨，或另行批准契約變更；不能默認加第五題 | 才能建立可追溯住宅投票，但改變產品方向／相容性範圍最大 | 先規劃問題→權威狀態／歷史→CityView／parser→模型配置→前後證據→結果卡，含question-set／schema／舊回答及草稿、冪等、A/B、Undo／reset／reconnect；取得明確批准後才實作 |

不建議把 M 掛 Q4、植物膜掛 Q3，或交換艙直接掛 Q1：現有問題沒有詢問材料、植物住宅或建築更新；Q3 已是能源取捨。把共享室接 Q2 也不能代表已同意整棟居住方式，須先另設生活取捨及實際變化語義。正式背景 A 的推薦正是避免借用不相等的答案。

待決定項只阻擋正式 render／資料接線與其新驗證；獨立 DEV-only 文件收尾、review及後續經協調者指派的 Git 整合仍可繼續。沉默不視為 A 已批准。未選定前 production 住宅仍排除；本 worker 不合併 main、不建立新批次。

## 本批核對與交付

Repo／branch／HEAD已核對；fetch成功（第一次因 `.git/FETCH_HEAD` 權限失敗，取得所需權限後重試成功），feature與remote0／0、對 `origin/main` ahead14／behind0。保留 coordinator 的 dirty handoff 及既有 `.playwright-cli/`。人類執行請求 `01a17822-ead1-7172-b6da-d82035164927` 及 standing contract `01a1781f-336b-7f22-9eef-dfbb1ee35a04` 已各讀取核實，callback只限本 relay 的現任 coordinator。

本批只改此報告、證據核對／結果紀錄及 HOUSING_CITY_PLAN／PROJECT／EXHIBITION_SPEC／VALIDATION 的現況與評估入口；本地 Markdown targets／anchors／tracked targets、來源事實與完整 diff／whitespace 檢查結果由 result.json 記錄。未改 source／package／asset，未重跑有效 H2 tests／build／browser，未重拍或覆寫原圖，沒有啟動服務。所有本 worker 寫入者／服務在交付時釋放，等待 coordinator review；共享 current state 由 coordinator 更新。

2026-10-27 接受狀態更新：coordinator已在 `78d2720` 接受本評估（原report `8f9f8f9`、metadata `773a8fd`）。上文「待review」保留為worker交付當時的歷史；正式A／B／C仍未選定。獨立DEV-only整合紀錄見[整合報告](../housing-city-integration/README.md)。
