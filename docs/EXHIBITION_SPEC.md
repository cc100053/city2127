# 2127 展覽規格 — Odaiba

- 現行規格，核對日期：2026-10-02；Owner：cc100053，文件整理：Codex。
- 操作入口見 [README](../README.md)，程式責任見 [PROJECT](PROJECT.md)，驗證方法與證據見 [VALIDATION](VALIDATION.md)，用語對照見 [GLOSSARY](GLOSSARY.md)。

## 場地與決策

- 展覽唯一城市是 **2127 年 Odaiba／台場海濱**，根目錄 `src/` 是目標城市。
- **Shibuya 已結束，未來不再做**（使用者確認，2026-10-02）。
  - 不保留場地切換，不將舊 Plan 01／02 的未完成項目列為後續工作。
  - 舊模型、內部識別碼與 Git／文件證據可保留；它們不代表場地或任務仍有效。
- 2127 是固定時代。四個 Meter 的 low、mixed、high 都是成熟未來；低值不能代表舊時代、空城、缺乏技術或未開發。
- Desktop presentation only；不加入 mobile／responsive 驗收。普通 renderer resize 保留。
- 優先：未來身份、可讀的選擇效果及城市延續性。
- 行人、車、drones、空中航線已獲允許。
- 交通分層（2026-10-06 user決定）：
  - 空中分三層：區域 160–170m／城市 80–100m／服務 30–45m；航道有地標及建築泊位。
  - 行人有停留、架空層、海邊轉乘及夜間光環。細節見 [PROJECT](PROJECT.md)。
- 現行視覺方向是 [CITY MASTER TASTE](ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md)；材質及動畫實作規則見 [ART](ART.md)。Shibuya／Pic 2 只作歷史來源。

### Fuji TV（2026-10-07 已合併 main）

- 正式視覺目標：使用者指定嘅 [目標v3](../artifacts/fuji-tv-polish/target-v3.png)（取代 [目標v2](../artifacts/fuji-tv-polish/target-v2.png)，v2 只係生成參考，比例唔係量度樓面數據）。
  - 以 v3 為準：兩側可見工作／製作樓層、中間球體劇場、大空隙及斜向連接。
  - 圖片內嘅生成 UI 文字不取代現有產品文案。
- 用途要求（六項訪談選擇已確認）：
  - 保留媒體製作總部用途，約七成工作／三成公共。
  - 兩側工作翼：實心隔音攝影棚／剪接空間及玻璃辦公協作層；中間保留大空隙；球體係直播／媒體劇場。
  - 公共入口、指定平台及劇場有獨立路線；工作翼另設員工入口及受控製作區。
- 已實作（v3 第一至九組打磨，使用者睇完第九組後要求合併；各組「待視覺review」狀態已由合併取代）：
  - 工作翼、剪接夾層、後方密閉製作空間、玻璃演播室長廊、三層藍色演播室。
  - 球體直播劇場、階梯觀眾席、主播台與攝影機、紫藍舞台光、全幅藍色螢幕。
  - 玻璃公共大堂、職員入口、在座職員／觀眾、平台小組、26 位中層長廊訪客（Y=65）。
  - 開放式銀色扶手電梯。
  - 室內暖光及螢幕冷光跟隨日夜；原有城市與 Meter 行為延續。
  - 現行外觀細節見 [PROJECT](PROJECT.md)「Fuji TV target v3」；各組變更、證據與限制見 [交接](handoffs/archive/fuji-tv-polish.md)。
- 限制：
  - 人物及設備為靜態幾何。
  - 隔音性能、室內通行及出入控制未模擬；外觀圖不驗證呢啲。
  - 同目標圖仍有差距（樓層數、舞台光束、大堂人流），屬日後另一輪工作。

### 街道生活（2026-10-06）

- 行人日常：
  - 長椅／前庭小組有輪流交流、轉頭與小手勢。
  - 少量居民從門口走到前庭探訪、停留後返回同一門口。
  - 沿用既有空間與人員槽位；low／mixed／high、日夜都保留可見探訪。
  - 坐姿及路線空間驗證見 [street-life 交接](handoffs/archive/street-life.md)。
- 建築互動：
  - 兩條預留前庭路線有入口門框／簷篷／燈、門旁等人、朋友出門與結伴離開。
  - AUTO HUB 兩個櫃位有居民使用服務：按實際櫃位配置交流、操作端口或接受人員協助；全自律配置仍有使用者。
  - 人物維持正常大小；設施切換時暫隱，即時復原時配合最新配置。
  - 沒有室內或交易模擬。

## 提案與共同城市

### 居民敘事與畫面分工（2026-10-02）

- 觀眾是 **2127 年台場的一位居民**；四題表達生活偏好。
- 城市呈現居民累積想法與近期聲音形成的生活配置。
- 輸入裝置暫定 iPad：問題、選擇、核對及操作提示。
- 共享大屏幕：城市背景、設施與結果解說。
- 年份固定；畫面濃縮呈現城市回應生活需求的過程。

### Guest 文案接入（P2）

- [居民文案 P1](RESIDENT_COPY.md) 已由 [P2](handoffs/archive/resident-experience-p2.md) 接入：
  - question-set version 3、四題／背景、提交前核對。
  - Guest 保存／等待／「街の画面をご覧ください。」和站號／暮らしの声編號。
- 結果頁收起答案、Meter 與設施表格；單站 revision conflict 的復原核對仍保留數值資訊。
- 舊草稿可重新預約並保留有效選項；A/B 先結束自己的舊預約。
- 舊已保存回答原文／version 2 不重寫；未知提交結果維持同 ID 重試。

### 大屏幕右上卡片

- Root 用固定 360px 右上卡片，顯示背景、當前實際 focal 設施及位置；一個標題、最多兩句。
  - 2026-10-04 由左移右，避免遮住 focal site。
- 開場先顯示 `intro.origin`（2026-10-19：過去街由行政／大企業決定，住民決定會點樣），再顯示 identity（取 P1 內文首兩句）。
- 日常卡本機每 12 秒輪換。
- [P3](handoffs/archive/resident-experience-p3.md) 每份 live 結果保留 10 秒：
  - 0–3 秒：身份／位置／原有過渡。
  - 3–10 秒：一項個人偏好＋一項共同城市實際結果。
  - 之後恢復日常卡。
- 結果證據：
  - Root 比較實際 effective carrier targets／可見配對及 slot 分布。
  - 同分不同配置、只有方向改變、完全維持，分開處理。
  - seed 本身或隱藏配對不算可見變化。
  - Focal count 只描述該地點；district-only 用實際區域及配置調整文案。
  - 沒有前後證據只確認保存，不將個人答案當共同城市變化方向。
- Snapshot/reset/Undo 即時替換；reload 不重播舊結果；照明-only snapshot 不打斷有效 queue。

### 居民體驗進度

- 完整 [P1–P5 計劃](RESIDENT_EXPERIENCE_PLAN.md) 保留；P1–P3 已實作。
- P3 軟件排程檢查不代表 10 秒足夠閱讀。
- [P4 全面軟件流程](handoffs/archive/resident-experience-p4.md) 已通過 native／scratch Chrome browser 驗證。
- 待驗收：P5 與 S5、實際 iPad、理解程度、閱讀時間。

### 四題

- 每位觀眾回答同一組四題，核對後提交**一份完整提案**。
- 四題沒有逐題改城；下一位繼承累積結果。
- 問題／option ids 與 effects 由 [正式 JSON](../survey/src/survey/questions.exhibition.json) 定義；保留日文產品文案。

| 問題 id | Meter | 主 site（內部 socket） | low → mixed → high |
| --- | --- | --- | --- |
| `service-2127` | automation | デックス西（nw） | 人員主導 → 人機協作 → 自律服務 |
| `commons-2127` | publicSharing | アクアシティ南（sw） | 私密空間 → 混合庭院 → 開放共享 |
| `cooling-2127` | environmentalPriority | お台場海浜公園（ne） | 主動冷卻 → 協同氣候庭院 → 樹冠／植栽 |
| `functions-2127` | urbanConcentration | フジテレビ東（se） | 分散機能艙 → 混合館 → 垂直集中 |

## 累積與權威 layout

### 計分（reducer）

- 每軸每份提案只有一票 `v ∈ {-1,0,+1}`。
- 對第 n 份提案：`Sₙ=Sₙ₋₁+v`、`Rₙ=.75Rₙ₋₁+.25v`、`Mₙ=clamp(6(Sₙ/n+Rₙ),-12,12)`。
- 新 run 的 S／R／M 全部零。
- 中性票亦會更新近期記憶，不能略過。
- 只在 server 計算；replay 與 live 使用同一 reducer：[scoreEngine](../survey/src/survey/scoreEngine.ts)。

### 刻度 A（2026-10-13 user 決定，取代舊刻度）

- 原因：實際 run 嘅 M 多數只喺 ±5 之內。
- Layout 讀「展示分數」`D=clamp(M×g(n),-12,12)`，n 係目前累積觀眾數。
- `g(n)=0.85+1.55×min(1,(n−1)/11)`：
  - 第一位觀眾 ×0.85：溫和開場，第一票 ±1 只到 D=±6.375，唔會即刻去到極端，但仍然觸發 P10 配對設施。
  - 之後逐位加強，第 12 位起固定 ×2.4（形態門檻相當於 M≈±1.25）。
- 計分 reducer 不變。
- 提案紀錄嘅 before/after layout 讀取時由分數同觀眾數重新計算，所以舊歷史一齊轉用新刻度，冇資料遷移。
- 新舊比較見 DEV `?scaleLab` 及 [handoff](handoffs/archive/meter-scale-a.md)。

### 形態與參數

- `low: D≤−3`，`mixed: −3<D<3`，`high: D≥3`；`t=(D+12)/24`。
- Server 的 [exhibitionStateLayout](../survey/src/shared/cityView.ts)（D 經 `deriveExhibitionLayout`）是唯一權威映射：

| 參數 | 公式 | D=0 |
| --- | --- | --- |
| automatedPorts | round(6t) | 3 |
| sharedSeats | round(8t) | 4 |
| treeCount | 3+round(9t) | 8 |
| plantedFraction | .2+.6t | .5 |
| coolingFins | round(6(1−t)) | 3 |
| functionModules | 2+round(4t) | 4 |

- 全部 round 用 JavaScript `Math.round`。
- 機能單元不是人口或等容量承諾；不能在實作中暗改算法。
- Root v2 不將 Meter 混入全城天空／氣氛。

## 城市可見變化

- 四個 site 是視覺焦點；**Meter 已可影響整個 district**（2026-10-01 決策，P0–P12 已整合）；不再受原 MVP「只改四地塊」限制。
- Automation：服務亭／自律端口、步道人數、guideway pods、空中 fleet、服務 quadrotors。
- Sharing：六座 water rooms、十個內陸庭院的私密／混合／共享形態，以及符合條件的廣場人群。
- Environment：promenade sails／pergolas、冷卻塔、屋頂 cover、立面氣候層。
- Concentration：低層 pods／中間高度／十座塔、sky lobbies 與連橋。
- Mixed 有自己的 hybrid 組合；跨 Meter 條件產生配對設施。
- 完整 active run 的投票次序推導四軸 `slotSeeds`，相同分數可保留不同槽位分布。最新 64 份顯示 history 不截斷 seed 來源。

### 一票旅程（2026-10-13 user 要求）

- Live 結果先播約 2.6 秒旅程：觀眾四票化成 Meter 色光點（中性票暖白），由畫面右下（站台方向）飛去四個 focal site。
- 著陸時掃描環升起。
- 每票留低一粒浮喺 site 上空嘅光點（日間淡、夜間亮），保留最近 64 位觀眾；snapshot／reload 由 `recentProposals` 重建。
- 著陸後先開始 3 秒過渡及 pulse，總共大約 5.6 秒，喺 10 秒閱讀時段之內。
- 結果卡證據喺收到事件時已經計好；理由句照舊喺第 3 秒出現。
- Snapshot、reset、Undo、reconnect、reduced motion 唔播旅程，即時恢復。

### 過渡與 pulse

- Live 使用可重新定向的 **3 秒**過渡。
- Pulse 只標示真的 live 變化。
- 每個改變嘅 Meter 只喺其 site 出光柱；district slots 只有淡色光圈（2026-10-04）。
- Snapshot、reset、Undo、reconnect、reduced motion 直接恢復權威狀態，清除排隊及 pulse。
- 重複事件不重播。
- 配對、counts、固定 footprint 及限制見 [Meter handoff](handoffs/archive/meter-variety.md)。

## Guest、單站與 A/B

- 流程：Start → 四題 → review → submit → result 10 秒 → handoff 5 秒 → Start。
- 未知提交結果用同一 submission ID 重試；不新建一票猜測成功。

| 模式 | 開始／交接 | Reset |
| --- | --- | --- |
| 單站 `/guest` | 下一位 Start 自動結束已提交體驗，毋須 Admin 確認離場 | 保留中的 reset 在下一位 Start 套用；Admin 可中止未完成問卷 |
| `/guest?station=A`／`B` | 獨立 session／草稿／結果；同一站一個體驗。不能混用活躍單站與 A/B | 停止新開始，等兩站問卷及結果／交接排出；Admin 中止必須指定一個未完成 session |

### 排程與保護

- A/B 按 server transaction 提交順序累積，容許舊 city revision、拒絕未來 revision；單站仍要求完全一致。
- 單站／A-B City 顯示起點相隔至少 10 秒；城市動畫保持 3 秒。
- Guest 排隊顯示已保存／等待展示，再顯示自己的結果。
- 提前 Guest 交接不截斷已排定展示；server 拒絕在 10 秒閱讀結束前 release／下一單站 Start；reset 遵守 drain。
- 問卷 5 分鐘期限。
- 已提交 result lease 固定於展示開始後 15 秒，釋放離線站。
- 同 ID retry／reload 只接續剩餘時段，不延長 lease。
- 重連／斷線／過期 late 事件／reduced motion 直接恢復最新完整城市，並清掉舊字幕 timer，不重播漏掉的過渡。
- `displayWaitMs`／`displayAt` 只表示排程，不確認 viewer 在線或播放；不新增 viewer-ack 服務。

## Admin、資料與照明

### Admin

- Admin 只限 server 電腦 loopback；POST 另檢查 same-origin。
- City reset 開新城市、保留總人數；full reset 清零展示計數但保留 append-only 歷史。
- 保留中的 reset 可取消。
- Undo 只可撤銷最後一份已完成提案，且要喺下一位開始前；新草稿即使稍後取消，亦不重開舊 Undo。
- 保存不可變撤銷標記，還原提交前狀態／counts／seeds。

### 資料版本

- 目前 question-set **version 3**、SQLite **schema 7**、algorithm／CityView **v2**。
- schema 3 轉換曾結束 v1 run 並保留歷史；schema 7 保留現有 v2 城市及歷史。
- 重啟使用原 SQLite，不刪資料。
- Root／survey 配合更新，尤其 slotSeeds。
- `module-swap` 只接受 legacy v1，不是展覽城市。

### 照明

- Admin Day／Night／Auto 保存為獨立 display setting：12:00／22:00／180 秒日循環。
- Reset 不改照明；City `?hour` 優先。
- 多 viewer 的 Auto 時鐘不作跨裝置同步。

## 開發工具與待完成驗收

- 在 `survey/` 執行 `npm run dev:auto`：fresh scratch DB 及 localhost `/guest?dev-auto`；Meter tests 可重用。
- DEV-ONLY panel／endpoint／launcher 須在展覽前移除或另行安排；普通 Guest 自動交接規則不因移走開發工具而回復舊 staff-exit lock。詳見 [survey guide](../survey/README.md)。
- **S5／Odaiba P6 尚待展覽驗收**：完整 Guest → City 流程、實際輸入 hardware、展覽日 reset／recovery 政策與長時間穩定性。
- 既有 stage checks／CI／Mac 測量分別見 [VALIDATION](VALIDATION.md)，不等於 S5 已通過。
- 尚未達成的 Dream Loop target 不能因程式已整合而宣稱視覺目標通過。

## 已完成階段與歷史

| 階段 | 結果／證據 |
| --- | --- |
| S1–S4 | [S1](handoffs/archive/exhibition-s1.md)、[S2](handoffs/archive/exhibition-s2.md)、[S3](handoffs/archive/exhibition-s3.md)、[S4](handoffs/archive/exhibition-s4.md)：分開保留當時實作及驗收 |
| Lifecycle、display、Undo、A/B | [lifecycle](handoffs/archive/exhibition-lifecycle.md)、[day/night](handoffs/archive/admin-day-night.md)、[Undo](handoffs/archive/admin-undo.md)、[雙站](handoffs/archive/two-guest-devices.md) |
| Odaiba 換場 | [P0–P5 transition record](ODAIBA_VENUE_TRANSITION.md)，整合 `e6c7966` |
| Odaiba art／district | [art](handoffs/archive/odaiba-art-direction-01.md)、[Dream Loop](handoffs/archive/odaiba-dream-loop.md)、[district](handoffs/archive/odaiba-district.md) |
| Meter variety | [P0–P12](handoffs/archive/meter-variety.md)，整合 `e7afbee`，published main `68b669a` |

- 原 MVP 規劃存於 [歷史快照](history/EXHIBITION_MVP.md)；其中 Shibuya、single-only、site-only 與待實作文字已被以上決策取代。
- 後續任務只從本規格及現行 handoff 建立。
