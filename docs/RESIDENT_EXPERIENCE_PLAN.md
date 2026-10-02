# 居民體驗計劃 — 2127 台場

日期：2026-10-02。Owner：Codex。**P1–P3 已實作；P4 軟件驗證已通過，P5 尚待實機驗收。** P2接入證據見 [階段交接](handoffs/resident-experience-p2.md)；P3排程／carrier證據見 [P3交接](handoffs/resident-experience-p3.md)；本文件保留P4／P5計劃，不代表實際裝置驗收已完成。產品契約以 [SPEC](EXHIBITION_SPEC.md) 為準；文案唯一來源是 [RESIDENT_COPY](RESIDENT_COPY.md)，接手入口是 [handoff](handoffs/resident-experience-plan.md)。

## 目標與已確認方向

觀眾是 2127 年台場的其中一位居民。四題呈現日常生活偏好，居民累積的想法與最近的聲音共同塑造城市；畫面濃縮呈現城市回應生活需求的過程。固定年份，所有 Meter 方向都是成熟未來，沒有正確答案或優劣城市。

採用「四題完成後集中觀看」作互動骨架，配合大屏幕平時的城市解說。觀眾完成後應能理解：自己是居民、自己重視哪種生活，以及共同城市因此改變或維持甚麼。

- 輸入裝置暫定 iPad：題目、必要背景、選項、進度、返回、核對、完成，以及保存／等待／重試提示。
- 大屏幕：完整城市、世界背景、設施用途、變化位置、原因與生活影響；觀看內容集中在這裡。
- 個人答案不等於共同城市本次變化方向。文字必須分開「你的偏好」與「城市實際結果」，保留前人累積。
- 保持既有計分、四題／12 選項 ids 與 effects、一次提交、單站／A/B 獨立草稿、持久化、Undo／reset／reconnect 契約。
- 正式 copy 使用日文；內部 proposal、Meter、revision、socket 識別不必改名。沿用現有 Three.js／DOM／CSS；不引入新依賴、後端服務、模型包或部署。

## 現在已存在甚麼

P1 source `9273f88decbfa4ec8844585d439b8271179421ea` 已由 `2669de628907ef25d13b198c5a387c864b28548c` 整合，發布 main `6ed44dfcd6e9fdf08943bcc5e509bd46e9fda83a`。[main CI 36995697291](https://github.com/cc100053/city2127/actions/runs/36995697291) PASS；這證明原有 package checks 通過，不是新畫面／iPad 驗收。

P2 runtime 使用居民 [question JSON](../survey/src/survey/questions.exhibition.json) version3（ids/effects不變）。Guest 結果只保留保存／等待／站號／編號／抬頭／交接；root 顯示背景／當前focal設施與保守結果卡。P3城市live過渡仍3秒，單站／A-B展示起點最少相隔10秒；Guest按排定時段等待，result接續剩餘10秒slot／handoff5秒。SQLite schema7／CityView與algorithm v2 保持。

## 畫面分工與完整流程

| 階段 | 輸入裝置 | 大屏幕 |
| --- | --- | --- |
| 待機／開始 | 開始按鈕、簡短操作提示 | 城市全景、居民身份與台場背景 |
| 四題 | 每次一題、必要背景、三個選項、進度、返回／下一題 | 城市持續運作，少量當前設施解說；不追隨某一站的逐題進度 |
| 核對 | 四個答案、修改、完成 | 共同城市保持；部分作答不改城 |
| 保存中 | 明確保存狀態，避免重複提交 | 保持目前展示 |
| 排隊 | 已記錄、等待；一致的站號／提交編號 | 按順序展示其他居民的結果 |
| 自己的展示 | 收起答案／數值，只顯示「街の画面をご覧ください。」及識別 | 同一識別、真實變化位置／動畫、最多兩項短解說 |
| 交接 | 下一位所需操作 | 延續累積城市，再回日常解說 |

使用「暮らしの声 #{ordinal}」作公開識別，A/B 加站號；不是永久居民身分。累積參與數不是模擬人口。新 run 是否已有回答須按當前 run 資料判斷，不能單靠 reset 後仍保留的總人數。

大屏幕使用固定、可讀的解說區：一個標題＋最多兩句，連同一個實際位置提示。保留全城與固定 hero camera，不加自動推近或鏡頭巡遊。輸入裝置放在面向主屏幕的同一方向；實際高度、距離與字體由 P5 現場測試決定。

## 分階段交付

### P1 — 居民文案：DONE（documentation only）

交付為 [RESIDENT_COPY](RESIDENT_COPY.md)：居民開場、四題／12 選項、設施卡、結果句型、核對／等待／重試用語。原有 ids／effects／次序已比對，文件與現行設施關係已核對；[P1 handoff](handoffs/resident-copy-p1.md) 保留證據。P1交付時尚未接入；P2現已接入JSON／UI。日文是作者自審，沒有外部語言審核或實測閱讀時間。

### P2 — 文案接入與畫面分工：DONE

1. 將 P1 問題與必要背景接入正式 question set，保留原 effects／ids。依現有 loader/session/history 流程處理 question-set version；它與 CityView／algorithm v2 不同。核對更新前草稿的恢復行為，既有回答歷史不被重寫，不以刪 SQLite 解決。
2. 精簡 Guest 結果：保存／等待／站號／編號／抬頭提示及交接；核對答案仍在提交前。通訊錯誤、未知提交結果的同 ID 重試、鍵盤焦點與可見選取狀態保留。
3. 將觀看內容留在 root：背景／設施卡與結果呈現模式。依當前實際形態選設施卡；先沿用可確認的 feedback 或 P1 保守結果句型。
4. 重用原有 panel、樣式與事件流；P2 不改計分、3秒過渡、A/B 排程或租期。它是畫面接入階段，尚未具備 P3 的完整閱讀時段與 district 結果判斷。

完成門檻：四題居民文案可作答；partial answers 不改城；iPad 結果沒有觀看用表格；大屏幕可讀、城市不被大面積遮擋；單站與 A/B 各自的保存／重試／交接仍工作。提供新畫面證據，不沿用 P1 CI 當 UI 驗收。

2026-10-02實作：question-set version3，原SQLite／version2歷史保留，單站／A-B新預約接續舊草稿；Guest結果精簡，root重用固定卡片。日常卡每12秒、live fallback本機最多10秒；A/B≥3秒仍可覆蓋，並非P3保留閱讀時段。卡片按focal實際數量／塔形態選擇；配對／district因果判斷未接入。新截圖、root/survey checks與三項scratch-DB browser回歸見 [P2 handoff](handoffs/resident-experience-p2.md)。這些checks不等於P4全部案例／P5實機驗收。

### P3 — 真實原因與展示節奏：DONE

每份回答預留 **10秒觀看時段**：0–3秒識別＋位置提示＋現有城市過渡；3–10秒保留一項偏好與真實配置影響。2026-10-02已接入排程／root／Guest／lease／guard／drain，軟件計時證據見 [P3交接](handoffs/resident-experience-p3.md)。這不是已驗證的實際閱讀時間或理解程度。以下保留P3的驗收契約。

- A/B 按 server 提交順序呈現；一份結果的閱讀時段未完，不被下一份覆蓋。兩站仍能獨立作答；等待頁清楚顯示回答已保存。
- 一起調整 server 的 display scheduling、root queue、Guest 等待、result lease、提前交接 guard 與 reset drain。分開管理「3秒過渡」與「10秒觀看」，不能把所有3秒常數盲目改為10秒。
- 日常解說遇到 live 結果暫停，結果結束再恢復；提前離開輸入裝置不截斷已排定的城市展示。
- reset／Undo／snapshot／reconnect／reduced motion 立即恢復權威狀態，清除適用的 queue／字幕 timer；不為完成故事而延遲復原或重播漏掉的變化。照明 snapshot 保持原有不跳過有效 queue 的行為。
- 現有 `displayWaitMs`／`displayAt` 表示排定展示，不是大屏幕在線或已播放的確認。一般文案用「請看城市」；實際斷線／晚到展示處理依 P4 驗證，展覽 recovery 政策仍待 P5，不先新增 viewer-ack 服務。

結果由個人 option 與**實際前後配置**兩部分組成。`proposal.cityChanges` 只列 focal layout，不能完整判斷 district／配對／seed；ProposalRecord 沒有前後 seed。先追 root carrier targets／實際分布，重用現有資料及 lifecycle；無足夠證據時用保存確認句型，不宣稱增加設施。seed 改變本身不等於可見變化。

必須涵蓋：設施改變、只有累積方向改變、分數相同但配置改變、完全維持；低／混合／高、混合選項卻未到 mixed、個人方向與累積結果不同。某個 site count 增加，不推論全區同軸 carrier、行人或人口都增加。

完成門檻：原因與畫面一致；A/B 各自看得完結果；Guest 抬頭提示對應排定時段；恢復／取消沒有殘留字幕或舊動畫。若10秒不夠，先縮短文案；需要變更總時段時同步修改排程與租期並記錄新實測。

2026-10-02交付：共用reading10秒／handoff5秒／lease15秒常數，server為單站及A/B排程，root保留順序及有效期限。重試只回原slot剩餘時間；提前交接保留recovery並延後release。`CityChangeManager`比較四區的effective targets，包含hybrid／可見配對乘積／屋頂／facade／fleet counts及seed後分布；不改geometry。結果以一項個人偏好＋一項實際結果保持兩句，focal限定地點、district-only用配置調整；無前後baseline則保存fallback。日常卡暫停；照明不打斷，斷線／重連／Undo／reset／reduced motion／過期late事件立即settle並清timer。新native／scratch Chrome計時及screenshots在P3交接；P4完整案例、P5實機／閱讀理解保持未驗。

### P4 — 軟件與雙屏流程驗證：DONE

2026-10-02 已以 scratch SQLite／Chrome 154.0.8037.93／1280×720／deviceScaleFactor1 完成下列軟件案例；[P4交接](handoffs/resident-experience-p4.md) 逐列列出 native／browser 證據、source/integration commit、展示計時、console/network 記錄及限制。City 固定 hero／`?hour=16`；觸控為桌面 Chromium 模擬，離線租期採明列的 server clock jumps，不作實際閱讀或裝置證據。以下保留驗收契約。

| 驗收案例 | 預期 |
| --- | --- |
| 單站完整四題、核對修改、提交 | 一次累積；主屏結果與 Guest 識別一致；下一位繼承城市 |
| A/B 幾乎同時提交 | 獨立保存、順序呈現、閱讀時段不重疊、不混淆站號 |
| 提交回覆遺失、同 ID 重試／reload | 不重複加票；恢復自己的保存結果／等待狀態 |
| 新 run／無改變／僅方向改變 | 不虛構前人記錄或設施變化 |
| 同分不同分布、配對／mixed、相反個人偏好 | 原因對應實際 carrier，保持成熟未來 |
| 等待／播放中 reset、Undo、reload／reconnect | 遵守原有 admission／drain／Undo條件；立即恢復並取消過期內容 |
| Admin 照明、reduced motion | 照明不吞有效 queue；reduced motion 無必須觀看動畫的阻礙 |
| 提前交接、離線站到期、Admin 指定中止 | 不影響另一站或已保存展示；無卡住 admission／租期 |
| 鍵盤／觸控、保存失敗提示 | 能選擇、返回、核對、重試；焦點與文字提示清楚 |

修改 root／survey 時，各跑 `npm test`、`npm run build` 與 `git diff --check`；為新增非平凡分支留最小可執行檢查，優先擴充現有測試。沿用 [twoStations.browser.mjs](../tests/twoStations.browser.mjs)、[adminUndo.browser.mjs](../tests/adminUndo.browser.mjs) 及相關檢查，按新行為更新必要 assertions；不把 headless pass 當實際 iPad 驗證。

完成門檻：自動／browser checks 通過；記錄時間與新截圖；產品文件與 handoff 同步。剩餘硬件、理解程度、長時間穩定性明列未驗，不宣稱 S5 展覽驗收完成。

### P5 — 展場與實際裝置驗收：PLANNED

確認輸入裝置型號／橫向尺寸、Safari／其他 browser、LAN、主屏幕尺寸、觀看距離與實際電腦。使用該固定裝置檢查觸控、焦點、字體、抬頭視線、反光、睡眠／重連與完整單站／A/B 流程；這是指定展覽裝置測試，不增加泛用手機 responsive 或 adaptive camera。

讓現場試用者完成體驗後描述居民身份、生活偏好與城市結果；記錄誤解位置再改短句／提示。最後與展覽 owner 確定 reset／中止／離線復原操作及長時間運行程序；依 [VALIDATION](VALIDATION.md) 留實際 GPU／device 證據，未測 FPS、Windows 或其他平台不作承諾。

硬件選擇、輸入方式與 exhibition-day recovery policy 仍未定；不妨礙先做 P2，但限制 P5 與 S5 的完成。

## 預計修改位置（實作前重新 trace）

| 階段／位置 | 工作 |
| --- | --- |
| P2 [questions.exhibition.json](../survey/src/survey/questions.exhibition.json)、[questionLoader](../survey/src/survey/questionLoader.ts) 與其 session/history callers | 居民問題、背景、version／歷史兼容核對 |
| P2 [guestDebugView](../survey/src/ui/guestDebugView.ts)、[guestFlow](../survey/src/ui/guestFlow.ts)、[debug.css](../survey/src/ui/debug.css) | 輸入、核對、保存／等待／抬頭／交接 |
| P2/P3 [surveyAtmosphere](../src/surveyAtmosphere.ts)、[style.css](../src/style.css) | 大屏幕背景／設施／結果呈現 |
| P3 [proposalService](../survey/src/server/proposalService.ts)、[runStore](../survey/src/server/runStore.ts)、[surveyView](../src/surveyView.ts) | 展示排程、等待、lease／guard／recovery callers |
| P3 [cityChangeManager](../src/cityChangeManager.ts)、[districtMeters](../src/districtMeters.ts)、[siteRuntime](../src/siteBuilders/siteRuntime.ts) | 核實實際 carrier 變化；只改必要資料接線，保留 geometry／共享資源 |
| P4 現有 root／survey tests 與 browser checks | 最小新增邏輯檢查、雙站及恢復回歸 |

這是定位清單，不是必須修改每一檔案；先讀當前 callers，採最小完整差異。`module-swap` 保持 legacy v1 範圍，無需 incidental 改動。

## 接手順序

先讀 [P2 handoff](handoffs/resident-experience-p2.md) → [P1文案](RESIDENT_COPY.md) → [PROJECT](PROJECT.md) 與當前source。按mandatory preflight核對remote／owner／dirty files／available commits。P4已交付，接手先讀 [P4 handoff](handoffs/resident-experience-p4.md)；下一個可分派階段是 **P5** 指定實際裝置／展場與理解程度驗收。P4軟件驗證不自動啟動P5，亦不代表S5完成。
