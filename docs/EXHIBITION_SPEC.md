# 2127 展覽規格 — Odaiba

現行規格，核對日期：2026-10-02；Owner：cc100053，文件整理：Codex。操作入口見 [README](../README.md)，程式責任見 [PROJECT](PROJECT.md)，驗證方法與證據見 [VALIDATION](VALIDATION.md)。

## 場地與決策

- 展覽唯一城市是 **2127 年 Odaiba／台場海濱**，根目錄 `src/` 是目標城市。
- **Shibuya 已結束，未來不再做**（使用者確認，2026-10-02）。不保留場地切換，不將舊 Plan 01／02 的未完成項目列為後續工作。舊模型、內部識別碼與 Git／文件證據可保留；它們不代表場地或任務仍有效。
- 2127 是固定時代。四個 Meter 的 low、mixed、high 都是成熟未來；低值不能代表舊時代、空城、缺乏技術或未開發。
- Desktop presentation only；不加入 mobile／responsive 驗收。普通 renderer resize 保留。
- 未來身份、可讀的選擇效果及城市延續性優先。行人、車、drones、空中航線已獲允許。交通分層（2026-10-06 user決定）：空中分區域160–170m／城市80–100m／服務30–45m三層，航道有地標及建築泊位；行人有停留、架空層、海邊轉乘及夜間光環，細節見 [PROJECT](PROJECT.md)。
- 現行視覺方向是 [CITY MASTER TASTE](ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md)；材質及動畫實作規則見 [ART](ART.md)。Shibuya／Pic 2 只作歷史來源。
- Fuji TV 打磨（2026-10-07，已按使用者要求合併）：程序 civic core 加入通透球室／公共樓層、柱內轉乘細節、植栽斜街、環台及屋頂遮蔭；[三輪交接](handoffs/archive/fuji-tv-polish.md) 分開記錄已整合實作與未達目標圖的細節。
- Fuji TV 新目標（2026-10-07，六項訪談選擇已確認，待實作）：保留媒體製作總部用途，以約七成工作／三成公共作設計比重；兩側工作翼包含實心隔音攝影棚／剪接空間及玻璃辦公協作層，中間保留大空隙，球體改為直播／媒體劇場。公共入口、指定平台及劇場有獨立路線，工作翼另設員工入口及受控製作區。[目標v2](../artifacts/fuji-tv-polish/target-v2.png) 是生成參考，比例並非量度樓面數據，現有程序模型尚未實作此方向。
- Fuji TV 目標選定（2026-10-07）：使用者上傳並指定 [目標v3](../artifacts/fuji-tv-polish/target-v3.png) 為正式視覺目標，取代v2的外觀參考；兩側可見工作／製作樓層、中間球體劇場、大空隙及斜向連接以此圖為準。媒體總部用途及公共／員工路線要求延續；隔音製作空間的內部配置仍需實作，外觀圖不驗證隔音或出入控制。圖片內的生成UI文字不取代現有產品文案。
- Fuji TV v3三輪實作（2026-10-07，feature branch待視覺review）：已加入兩側工作翼／剪接夾層／後方密閉製作空間、球體直播劇場／階梯觀眾席／主播台與攝影機，以及玻璃公共大堂、職員入口、在座職員／觀眾與平台小組。建築室內暖光及螢幕冷光跟隨日夜，原有城市與Meter行為延續。人物及設備為靜態幾何；隔音性能、室內通行及出入控制未模擬。[最終日景](../artifacts/fuji-tv-polish/v3-pass3.jpg)／[交接](handoffs/archive/fuji-tv-polish.md) 記錄已測軟件結果及目標細節仍部分達成，未合併此輪到main。
- Fuji TV v3第六組三輪打磨（2026-10-07，待視覺review，接續上列實作）：加高及分格劇場螢幕、暖色舞台框／佈景、減少球殼肋線、加強演播室藍色佈景，並加入海側平台小組及26位中層長廊訪客。長廊訪客按實際結構梁面修正至Y=65；人物保持靜態，隔音／室內通行／出入控制及展覽機性能仍未驗證。目標細節仍部分達成；[本輪日景](../artifacts/fuji-tv-polish/v3r6-pass3.jpg)／[交接](handoffs/archive/fuji-tv-polish.md) 為最新feature證據。
- Fuji TV v3第七組三輪打磨（2026-10-07，待視覺review，接續上列實作）：斜向扶手電梯改為開放式（深色梯級、玻璃欄河、藍光扶手），球體上半改為通透玻璃，移除側面斜撐及柱上暖光方格；兩翼側面加入玻璃演播室長廊，工作層後牆改為連續暖光牆並掛上藍色螢幕。人物／設備仍為靜態幾何；[交接](handoffs/archive/fuji-tv-polish.md) 記錄驗證與限制。
- Fuji TV v3第八組三輪打磨（2026-10-07，待視覺review，接續上列實作）：玻璃更通透、工作層改為深色後牆加暖光天花，藍色螢幕只集中喺三層演播室；球體內壁改為紫藍舞台光漸變至深藍，斜向扶手電梯加上藍色玻璃欄河及外牆。人物／設備仍為靜態幾何；[交接](handoffs/archive/fuji-tv-polish.md) 記錄驗證與限制。
- Fuji TV v3第九組三輪打磨（2026-10-07，待視覺review，接續上列實作）：扶手電梯改返銀色配深藍飾邊；球體加深藍肋線、深藍穹頂、額外射燈、紫色觀眾席及全幅藍色螢幕；房間燈光降低及減飽和，配深色地板、深藍螢幕及深色窗框。人物／設備仍為靜態幾何；[交接](handoffs/archive/fuji-tv-polish.md) 記錄驗證與限制。
- Fuji TV v3合併（2026-10-07）：使用者睇完第九組後要求合併，上列v3第一至九組打磨已整合至main；上列「待視覺review」狀態由此取代。同目標圖仍有差距（樓層數、舞台光束、大堂人流），屬日後另一輪工作。
- 行人日常（2026-10-06）：長椅／前庭小組有輪流交流、轉頭與小手勢；少量居民從門口走到前庭探訪、停留後返回同一門口。沿用既有空間與人員槽位，low／mixed／high 日夜都保留可見探訪；坐姿及路線空間驗證見 [street-life 交接](handoffs/archive/street-life.md)。
- 建築互動（2026-10-06）：兩條預留前庭路線有入口門框／簷篷／燈、門旁等人、朋友出門與結伴離開。AUTO HUB 兩個櫃位有居民使用服務：按實際櫃位配置交流、操作端口或接受人員協助；全自律配置仍有使用者。人物維持正常大小，設施切換時暫隱、即時復原時配合最新配置；沒有室內或交易模擬。

## 提案與共同城市

### 能源篇研究（2026-10-24，E1–E3 DEV城市組合完成）

使用者提出按「建築・居住／交通・物流／環境・エネルギー／社会・生活」研究更多城市形態，先做能源子題。[能源城市計劃](ENERGY_CITY_PLAN.md) 已完成E1：水庭儲能、富士旋轉環、填海核能島、軌道能源四構想的角色與整合，以及三種城市方向、混合範例與現況對照。E2已加入隔離的DEV `?energy`基準／A／B／C／M1靜態比較、四類量體與桌面幾何／瀏覽器檢查；[截圖](../artifacts/energy-city-e2/README.md)。E3已擴展兩處沿岸水庭／翼形遮棚及環／翼配電門架，加入可重播60秒充能／暫存／釋能流程與完整靜態閱讀；[E3實際比較](../artifacts/energy-city-e3/README.md)。E4已由使用者確認只替換Q3並接入獨立權威能源配置（見下節）；E5已完成目前Mac mini限定30分鐘性能／操作量測，展覽硬件／訪客理解仍待後續。上述E1–E3研究當時未取代四題／Meter；正式Q3取捨由下節E4記錄。富士媒體總部／劇場用途及六座water rooms保持；E2／E3只驗證目前DEV組合、動態及所列桌面畫面，最終美術、工程及硬件效果未驗證。[交接](handoffs/energy-city.md) 記錄本輪實際檢查及下一步。

2026-10-26：「建築・居住」[計劃](HOUSING_CITY_PLAN.md)已開始H0位置／基準／預算研究，[具體提案與原圖](../artifacts/housing-city-h0/README.md)已由cc100053確認；H1隔離DEV五配置靜態住宅已實作、軟件驗證並獲人類簽收，見[H1原圖](../artifacts/housing-city-h1/README.md)。H1b已實作橫向共享骨架／藻類循環面板／完整小屋及更新軌的靜態次設計，見[H1b證據](../artifacts/housing-city-h1b/README.md)，已通過軟件及coordinator review（未冒稱人類簽收）；H2已加入90秒DEV多年更新壓縮循環，生活艙／完整小屋實際搬運及接駁，靜態／reduced motion回停泊A；[H2實測與限制](../artifacts/housing-city-h2/README.md)另列，2026-10-27已通過coordinator review。仮説1–3（新材料、植物膜、可移動建築）先做隔離DEV視覺／動態比較，與現有建築共存；仮説4（身體自立）只保留概念。使用者已選定90秒多年更新壓縮循環；H0原圖只有預留線框，未新增正式城市住宅。本輪不改四題、Meter或累積規則；[交接](handoffs/housing-city.md)。

2026-10-27：[H3原圖評估與正式選項](../artifacts/housing-city-h3/README.md)已通過coordinator review（2026-10-27），建議保留現有三區／數量／輪廓。Hero可定位新增體量，系統機理仍需近景／說明，未作訪客理解測試。正式歸屬尚未選定：A固定背景（建議原三區、U停泊A，90秒循環留DEV，不宣稱投票因果）；B保留DEV待獨立居住偏好與輸入來源設計；C另規劃四題替換／權威累積。問題及依賴工作已保存，須由cc100053選定；沉默不視為批准。正式render／資料接線未改，production住宅仍排除。現有固定中值／全能源測試不證明所有正式配置與轉場共存。

### 居民敘事與畫面分工（2026-10-02）

觀眾是 **2127 年台場的一位居民**；四題表達生活偏好，城市呈現居民累積想法與近期聲音形成的生活配置。輸入裝置暫定 iPad，負責問題、選擇、核對及操作提示；共享大屏幕負責城市背景、設施與結果解說。年份固定，畫面濃縮呈現城市回應生活需求的過程。

[居民文案 P1](RESIDENT_COPY.md) 已由 [P2](handoffs/archive/resident-experience-p2.md) 接入：question-set version3、四題／背景、提交前核對，以及 Guest 保存／等待／「街の画面をご覧ください。」和站號／暮らしの声編號。結果頁收起答案、Meter 與設施表格；單站 revision conflict 的復原核對仍保留數值資訊。舊草稿可重新預約並保留有效選項，A/B 先結束自己的舊預約；舊已保存回答原文／version2不重寫，未知提交結果維持同 ID 重試。

Root 用固定360px右上卡片（2026-10-04由左移右，避免遮住focal site）顯示背景、當前實際 focal 設施及位置；一個標題、最多兩句。開場先顯示 `intro.origin`（2026-10-19：過去街由行政／大企業決定，住民決定會點樣），再顯示 identity（取 P1 內文首兩句）。日常卡本機每12秒輪換；[P3](handoffs/archive/resident-experience-p3.md) 的每份live結果保留10秒，0–3秒身份／位置／原有過渡，3–10秒一項個人偏好＋一項共同城市實際結果，再恢復日常卡。Root比較實際effective carrier targets／可見配對及slot分布；同分不同配置、只有方向改變、完全維持分開處理，seed本身或隱藏配對不算可見變化。Focal count只描述該地點，district-only用實際區域及配置調整文案；沒有前後證據只確認保存，不將個人答案當共同城市變化方向。Snapshot/reset/Undo即時替換，reload不重播舊結果；照明-only snapshot不打斷有效queue。

完整 [P1–P5計劃](RESIDENT_EXPERIENCE_PLAN.md) 保留；P1–P3已實作，P3軟件排程檢查不代表10秒足夠閱讀。[P4全面軟件流程](handoffs/archive/resident-experience-p4.md) 已通過 native／scratch Chrome browser 驗證；P5與S5、實際iPad／理解程度／閱讀時間仍待驗收。

每位觀眾回答同一組四題，核對後提交**一份完整提案**。四題沒有逐題改城；下一位繼承累積結果。問題／option ids 與 effects 由 [正式 JSON](../survey/src/survey/questions.exhibition.json) 定義；保留日文產品文案。

| 問題 id | Meter | 主 site（內部 socket） | low → mixed → high |
| --- | --- | --- | --- |
| `service-2127` | automation | デックス西（nw） | 人員主導 → 人機協作 → 自律服務 |
| `commons-2127` | publicSharing | アクアシティ南（sw） | 私密空間 → 混合庭院 → 開放共享 |
| `energy-2127` | 獨立能源累計（不作Meter） | 沿岸能源接點；設備分佈於水庭／富士／外海 | 水庭儲能／儲能環／軌道接收翼／核能島可共存 |
| `functions-2127` | urbanConcentration | フジテレビ東（se） | 分散機能艙 → 混合館 → 垂直集中 |

### E4 Q3能源生活取捨（2026-10-24使用者確認）

Q3採[能源計劃正式四選項](ENERGY_CITY_PLAN.md#e4正式接入2026-10-24)，另外三題原文／effects不變。每位居民仍一份四題提案；能源不按low/mixed/high排列。四類票獨立累計；每類至少2票且`票數×5≥能源回答總數+4`才出現；水庭／翼在`票數×5≥2×(能源回答總數+4)`時兩庭／大翼，否則一庭／小翼。環／島各最多一組；設備可共存，翼尺寸及同一庭有無互斥。這是展示門檻，並非容量或供電佔比；前四個基準席位不代表未記錄居民。第一票可沒有可見設備差異。

舊cooling問題、原文及效應保留原意；新能源答案對氣候是缺席，氣候EMA／分數／刻度以有效舊氣候回答人數維持，不按能源回答數稀釋。新run維持D=0成熟混合氣候；其餘三軸如常變化與配對。外部電網為設定前提，水庭／環只儲能，軌道／核能為供電路線推演；沒有容量／可靠度／工程認證，不設災難獎勵特效。

Server產出`layout.energy`，root套用模型並比較實際前後target。新第四票的旅程及lantern在沿岸能源接點，舊氣候票仍在公園；既有時間及立即恢復契約延續。結果卡只描述真實設備變化，不由本人選項推論共同結果；沒有可見差異就說能源配置延續。SQLite8新增nullable能源snapshot欄，保留schema7全部原始歷史；新舊server／City須一起更新，舊草稿重新預約、Q3重選，已保存舊ID仍可回原紀錄。

## 累積與權威 layout

E4後automation／publicSharing／urbanConcentration每軸每份提案只有一票 `v ∈ {-1,0,+1}`。對第 n 份提案：`Sₙ=Sₙ₋₁+v`、`Rₙ=.75Rₙ₋₁+.25v`、`Mₙ=clamp(6(Sₙ/n+Rₙ),-12,12)`。新 run 的 S／R／M 全部零；中性票亦會更新近期記憶，不能略過。只在 server 計算；replay 與 live 使用同一 reducer：[scoreEngine](../survey/src/survey/scoreEngine.ts)。

**刻度 A（2026-10-13 user決定，取代舊刻度）**：實際 run 嘅 M 多數只喺 ±5 之內，所以 layout 讀「展示分數」`D=clamp(M×g(n),-12,12)`，n 係目前累積觀眾數。`g(n)=0.85+1.55×min(1,(n−1)/11)`：第一位觀眾 ×0.85（溫和開場，第一票 ±1 只到 D=±6.375；2026-10-27 起再受每份一格限制，第一位只令一個 focal site 轉），之後逐位加強，第 12 位起固定 ×2.4（第一格門檻 |D|≥1.5 相當於 M≈±0.63）。計分 reducer 不變；提案紀錄嘅 before/after layout 讀取時由分數同觀眾數重新計算，所以舊歷史一齊轉用新刻度，冇資料遷移。新舊比較見 DEV `?scaleLab` 及 [handoff](handoffs/archive/meter-scale-a.md)。

**分級階梯＋headline（2026-10-27 user決定，取代 `D≤−3／D≥3` 一次翻轉整個 band）**：每個 site 有 −3…+3 格（`layout.tiers`）。目標格由 D 決定：`|D|≥1.5／4／7` 分別到 ±1／±2／±3；退返 mixed 要 D 再過門檻 2（遲滯，例如由 +1 退到 0 要 `D≤−0.5`）。**每份提案最多令一個 site 移一格**：先揀差距最大嘅 site，打和揀今位訪客投向嗰個方向嘅 site，再打和按觀眾數輪替（[ladderStep](../survey/src/shared/cityView.ts)）。所以格係歷史 fold 出嚟（同 slotSeeds 一樣 O(guests)，由 active proposals 重算；Undo、舊歷史、snapshot 無資料遷移），唔係單一分數嘅純函數。

| 格 | 自動化 nw | 共有 sw | 集約 se |
| --- | --- | --- | --- |
| 0 | 全部 mixed（60% hybrid） | 同左 | 同左 |
| ±1 | 只換 focal：デックス西轉 high／low（端口 6／0） | 只換 focal：アクアシティ南（座位 8／0） | 只換 focal：フジテレビ東（模組 6／2） |
| ±2 | 11 個服務灣按 rank 次序轉一半（mixed 同完整之間），hybrid 30% | 6 water rooms＋10 庭院轉一半，hybrid 30% | 10 塔／26 pods 轉一半，mid-rise 30% |
| ±3 | 其餘服務灣＋fleets／飛行器／街道 pods（即舊完整 low／high） | 完整形態 | 完整形態 |

P10 配對要兩個 site 同一邊都到 ±3。環境軸 E4 後凍結喺 mixed，所以 sails／冷卻塔／屋頂／外牆唔做格（舊氣候 run 照用同一 ladder）。每個 district 第一次到 ±2 時固定該軸 `slotSeeds`（之前為 0），之後各格 slot 互相包含，唔會每票重排。

Live headline（[pickHeadline](../survey/src/shared/cityView.ts)）：新到達最高格嘅 site，否則載體變化最多嘅 site，否則能源；只有 headline site 有亮 pulse／marker 同結果卡，其他變化（例如同時嘅能源門檻）靜靜過渡。

`ladderLayout(tiers, energy)` 是唯一權威映射；focal 數值由 tier 符號決定（`t`= 1／.5／0 對應 >0／0／<0）：

| 參數 | 公式 | tier 0 |
| --- | --- | --- |
| automatedPorts | round(6t) | 3 |
| sharedSeats | round(8t) | 4 |
| treeCount | 3+round(9t) | 8 |
| plantedFraction | .2+.6t | .5 |
| coolingFins | round(6(1−t)) | 3 |
| functionModules | 2+round(4t) | 4 |

District 直接讀 tier；DEV `?meters`／carrier 測試用 `deriveExhibitionLayout(D)`（同一門檻、唔限速）。全部 round 用 JavaScript `Math.round`。機能單元不是人口或等容量承諾；不能在實作中暗改算法。Root v2 不將 Meter 混入全城天空／氣氛。

## 城市可見變化

四個 site 是視覺焦點，**三個現行Meter與繼承氣候配置可影響整個 district**（2026-10-01 決策，P0–P12 已整合）；不再受原 MVP「只改四地塊」限制。

- Automation：服務亭／自律端口、步道人數、guideway pods、空中 fleet、服務 quadrotors。
- Sharing：六座 water rooms、十個內陸庭院的私密／混合／共享形態，以及符合條件的廣場人群。
- Environment：promenade sails／pergolas、冷卻塔、屋頂 cover、立面氣候層。
- Concentration：低層 pods／中間高度／十座塔、sky lobbies 與連橋。
- Mixed 有自己的 hybrid 組合；跨 Meter 條件（兩 site 同邊 ±3）產生配對設施；完整 active run 的投票次序推導四軸 `slotSeeds`，各 district 第一次到 ±2 時固定（2026-10-27），相同分數可保留不同槽位分布。最新 64 份顯示 history 不截斷 seed 來源。

**一票旅程（2026-10-13 user要求）**：live 結果先播約 2.6 秒旅程——觀眾四票化成 Meter 色光點（中性票暖白），由畫面右下（站台方向）飛去四個 focal site（E4後新Q3改到沿岸能源接點，舊氣候票仍到公園），著陸時掃描環升起；每票留低一粒浮喺 site 上空嘅光點（日間淡、夜間亮），保留最近 64 位觀眾，snapshot／reload 由 `recentProposals` 重建。著陸後先開始 3 秒過渡及 pulse，總共大約 5.6 秒，喺 10 秒閱讀時段之內；結果卡證據喺收到事件時已經計好，理由句照舊喺第 3 秒出現。Snapshot、reset、Undo、reconnect、reduced motion 唔播旅程，即時恢復。

Live 使用可重新定向的 **3 秒**過渡；pulse 只標示真的 live 變化；每個改變嘅 Meter 只喺其 site 出光柱，district slots 只有淡色光圈（2026-10-04）。Snapshot、reset、Undo、reconnect、reduced motion 直接恢復權威狀態，清除排隊及 pulse。重複事件不重播。配對、counts、固定 footprint 及限制見 [Meter handoff](handoffs/archive/meter-variety.md)。

## Guest、單站與 A/B

流程：Start → 四題 → review → submit → result 10 秒 → handoff 5 秒 → Start。未知提交結果用同一 submission ID 重試；不新建一票猜測成功。

| 模式 | 開始／交接 | Reset |
| --- | --- | --- |
| 單站 `/guest` | 下一位 Start 自動結束已提交體驗，毋須 Admin 確認離場 | 保留中的 reset 在下一位 Start 套用；Admin 可中止未完成問卷 |
| `/guest?station=A`／`B` | 獨立 session／草稿／結果；同一站一個體驗。不能混用活躍單站與 A/B | 停止新開始，等兩站問卷及結果／交接排出；Admin 中止必須指定一個未完成 session |

A/B 按 server transaction 提交順序累積，容許舊 city revision、拒絕未來 revision；單站仍要求完全一致。單站／A-B City 顯示起點相隔至少 10 秒，城市動畫保持3秒；Guest 排隊顯示已保存／等待展示，再顯示自己的結果。提前Guest交接不截斷已排定展示；server拒絕在10秒閱讀結束前release／下一單站Start，reset遵守drain。問卷5分鐘期限、已提交result lease固定於展示開始後15秒釋放離線站；同ID retry／reload只接續剩餘時段，不延長lease；重連／斷線／過期late事件／reduced motion直接恢復最新完整城市並清掉舊字幕timer，不重播漏掉的過渡。`displayWaitMs`／`displayAt`只表示排程，不確認viewer在線或播放；不新增viewer-ack服務。

## Admin、資料與照明

Admin 只限 server 電腦 loopback，POST 另檢查 same-origin。City reset 開新城市、保留總人數；full reset 清零展示計數但保留 append-only 歷史。保留中的 reset 可取消。Undo 只可撤銷最後一份已完成提案、且下一位開始前；新草稿即使稍後取消亦不重開舊 Undo。保存不可變撤銷標記，還原提交前狀態／counts／seeds。

目前 question-set **version4**、SQLite **schema 8**、algorithm／CityView **v2**；schema 3 轉換曾結束 v1 run 並保留歷史，schema 7 保留現有 v2 城市及歷史。重啟使用原 SQLite，不刪資料。Root／survey 配合更新，尤其 slotSeeds。`module-swap` 只接受 legacy v1，不是展覽城市。

Admin Day／Night／Auto 保存為獨立 display setting：12:00／22:00／180 秒日循環。Reset 不改照明；City `?hour` 優先。多 viewer 的 Auto 時鐘不作跨裝置同步。

## 開發工具與待完成驗收

在 `survey/` 執行 `npm run dev:auto`提供 fresh scratch DB 及 localhost `/guest?dev-auto`；Meter tests 可重用。DEV-ONLY panel／endpoint／launcher 須在展覽前移除或另行安排；普通 Guest 自動交接規則不因移走開發工具而回復舊 staff-exit lock。詳見 [survey guide](../survey/README.md)。

**S5／Odaiba P6 尚待展覽驗收**：完整 Guest → City 流程、實際輸入 hardware、展覽日 reset／recovery 政策與長時間穩定性。既有 stage checks／CI／Mac 測量分別見 [VALIDATION](VALIDATION.md)，不等於 S5 已通過。尚未達成的 Dream Loop target 亦不能因程式已整合而宣稱視覺目標通過。

## 已完成階段與歷史

| 階段 | 結果／證據 |
| --- | --- |
| S1–S4 | [S1](handoffs/archive/exhibition-s1.md)、[S2](handoffs/archive/exhibition-s2.md)、[S3](handoffs/archive/exhibition-s3.md)、[S4](handoffs/archive/exhibition-s4.md)：分開保留當時實作及驗收 |
| Lifecycle、display、Undo、A/B | [lifecycle](handoffs/archive/exhibition-lifecycle.md)、[day/night](handoffs/archive/admin-day-night.md)、[Undo](handoffs/archive/admin-undo.md)、[雙站](handoffs/archive/two-guest-devices.md) |
| Odaiba 換場 | [P0–P5 transition record](ODAIBA_VENUE_TRANSITION.md)，整合 `e6c7966` |
| Odaiba art／district | [art](handoffs/archive/odaiba-art-direction-01.md)、[Dream Loop](handoffs/archive/odaiba-dream-loop.md)、[district](handoffs/archive/odaiba-district.md) |
| Meter variety | [P0–P12](handoffs/archive/meter-variety.md)，整合 `e7afbee`，published main `68b669a` |

原 MVP 規劃存於 [歷史快照](history/EXHIBITION_MVP.md)；其中 Shibuya、single-only、site-only 與待實作文字已被以上決策取代。後續任務只從本規格及現行 handoff 建立。

### 能源模型 polish 恢復（2026-10-25）

獨立本機 clone 已恢復水庭／能源島與富士前置儲能環首輪 source，沿用原生成 target；僅續作儲能環／原固定承托三輪批次，三輪本機實作gate已完成，等待總指揮視覺review。保留劇場、工作翼、斜街與原權威配置／歷史。恢復 provenance、逐輪驗收及總指揮視覺review狀態見 [儲能環交接](handoffs/storage-ring-polish.md)；沒有發布／整合，不能據此宣稱 target、工程或展覽驗收完成。


### 接收翼局部打磨 — 2026-10-25（本機續作）

沿用能源Q3及既有接收翼，僅細化雙葉表面、承托接點／服務頸，保留原位置／包絡／大小配置語義與已接受水庭／環／島；沒有新用途、容量或工程宣稱。三輪Plus實作及owner實際驗收分開記在[接收翼交接](handoffs/receiver-wing-polish.md)，沒有push或main整合。生成target只作工藝reference，不依賴強光或背景／UI漂移證明軌道身份。


### 儲能環夜間可讀性一次跟進 — 2026-10-25（候選不採用）

已批准的一次局部材質試驗未達原hour22 hero「完整環周與兩組固定承托連續可讀」要求；owner保留原已接受baseline及完整trial證據，夜間可讀性缺口仍在。沒有新產品方向、source變更、工程／target達成或發布宣稱；只交coordinator review，[實測與checkpoint](handoffs/ring-night-readability.md)。


2026-10-25 發布更新：使用者已明確要求推送能源polish及整合main，先前本機-only狀態由[本次整合交接](handoffs/energy-polish-integration.md)取代。既有runtime未再修改；root test/build／正式scratch browser已重跑PASS，整合後驗證、main CI與安全刪分支的實際結果統一記在該交接，原target／夜間可讀性／硬件限制保留。


### 住宅方案A — 2026-10-27 決定

人類已採固定背景A：M輕材架空／共享住宅、P植物膜／藻類設備、U交換骨架／完整小屋及複合外皮共同存在於正式城市，U固定停泊A。90秒多年更新壓縮循環只留DEV。住宅不是任何回答或Meter造成的變化，不加入提案結果，四題與權威資料契約保持。依後續人類決定保留既有服務館，將M原構造由`(-135,-175)`平移到`(-165,-165)`，其餘住宅位置、數量與輪廓保持。驗證／搬位原圖見[本批報告](../artifacts/housing-background/README.md)；H3中的「待選A/B/C」已由本決定取代。實機／訪客及工程驗收仍另列。
