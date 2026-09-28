# 2127 共同城市：展覽 MVP 設計與 Agent 實作規劃

- 日期：2026-09-28；文件 owner：Codex。
- 核對基準：`535a3c059302ac6c1059d84aef663b06510ac04c`，當時 `main` 與已 fetch 的 `origin/main` 相同。
- 狀態：**規劃已完成；S1 已實作、整合並通過 package checks、feature CI 及 main CI；S2–S5 尚未實作。**
- 使用者最新確認：**起始城市已是 2127 年；低值、零值、高值都必須有未來感。**
- 本文件最初由規劃文件任務建立；2026-09-28 已明確指派 S1 實作。閱讀本文件不等於被指派一次實作全部階段；收到有界任務後，在授權範圍內完成，不另加逐階段批准要求。
- 當前實作架構以 [PROJECT](PROJECT.md) 為準；本文件描述下一版本目標，不另立一份現況 architecture。
- 操作規則：[AGENTS](../AGENTS.md)、[Git workflow](CONTRIBUTING.md)、[驗收](VALIDATION.md)、[美術](ART.md)、[Blender](BLENDER.md)。本次交接：[exhibition-mvp-plan](handoffs/exhibition-mvp-plan.md)。

### 2026-09-28 S1 現況（取代下文的原始「尚未實作」狀態）

S1 已加入四題重用題組、v2 四軸 reducer、proposal sessions／transaction、SQLite schema 3 migration/replay、admin/debug API 支援，以及帶明確版本的 CityView v2。Migration 會結束 active v1 run 並保留歷史，建立全零 v2 run；舊 one-question guest endpoint 在 v2 run 上回 `unsupported_version`，舊資料不會被轉成 v2 分數。四題題組位於 `survey/src/survey/questions.exhibition.json`，主要 API 為 `POST /api/proposal-sessions`、`GET /api/proposal-sessions/:id`、`POST /api/proposals` 與 `GET /api/city-view`。每個 proposal 在單一 transaction 中記錄四題、更新 snapshot 和完成 session；成功的相同 `submissionId` 會重播原結果，不重複累積。

root 與 module-swap 的現有 viewer 現在會在改動 scene 前顯示 `Unsupported exhibition view version` 並拒絕 v2。這是 S1 的相容性閘，不是 v2 city rendering。root mapping（S2/S3）和四題 guest UI（S4）仍未完成，故舊 `/guest` 頁不能提交到 active v2 run。本機三個 package 的 tests/build、獨立 reducer／mapping、migration、request parser、proposal transaction/concurrency probes 及 browser checks 已通過；feature CI 和 main CI 亦通過。展覽硬體／效能驗收仍待完成。詳見 [S1 handoff](handoffs/exhibition-s1.md) 及 [驗證紀錄](VALIDATION.md#exhibition-s1-2026-09-28)。

## 0. Agent 先讀：任務邊界與完成判定

1. 先完成 repo preflight，重新核對當前程式與本文件基準；不要假設聊天、另一台電腦或未推送分支存在。
2. 確認當次任務 owner、階段與受影響 package；追蹤所有 caller、snapshot replay、wire parser 及測試後才改碼。
3. 重用根目錄澀谷、四個 site、`CityChangeManager`、site builders、GLB cache/fallback、SQLite、WebSocket。不要重建城市或另寫一套 renderer／backend。
4. 不自動增加 agent、不擴城市範圍、不做手機適配、不部署、不引入資產包或新依賴。
5. 每階段交付：最小完整變更、可執行檢查、適用 browser evidence、文件同步及 task handoff。遵守既有分支／CI／整合流程。
6. `PLANNED` 不得改成 `DONE`，除非功能及該階段驗收均有證據；「已寫測試」與「測試已通過」分開記錄。
7. 未量測 FPS、未測展覽 PC、未測 Windows 必須明寫；舊截圖不算新功能證據。

### 0.1 決策優先序

| 層級 | 內容 | Agent 行為 |
| --- | --- | --- |
| 使用者硬性原則 | 全程 2127、包括低值；單一澀谷；桌面；跨觀眾累積；可見個人影響 | 不可用 scope cut 刪掉 |
| 本版規劃基準 | 每人4題、四軸、混合累積算法、四site三形態 | 被指派本版實作時依此執行；本文件本身不改 runtime |
| 工程建議值 | 人時、triangle／draw-call budget、驗收時間目標 | 實測後可在任務內調整並記錄原因；不可偽稱已達成 |
| 保留待決 | 實際展覽電腦、每日延續或新run、最終輸入硬體 | 不妨礙先做本機桌面MVP；不要自創部署或硬體整合 |

## 1. Concept 與關鍵選擇

**觀眾用四個生活選擇，接手其他人留下的 2127 年澀谷，改變它如何提供服務、共享空間、應對炎熱及配置機能。**

- 展示名稱：`2127 渋谷・未来の選択`。這是共同城市提案，不是人格／醫療診斷。
- 4題×3選項，每題只負責一軸；不輸出16型人格、不算單一城市編號。
- 60–90秒體驗；四題完成一次提交，草稿不改共同城市。
- 四軸保留現有key；Meter初始0、範圍−12…+12。
- 同一Base City＋四site局部配置；不製作多座完整城市GLB。
- 低值表示另一種成熟未來生活方式，不表示落後、貧窮、缺科技或空地。
- 計分：歷來平均50%＋近期動向50%；保留完整提案歷史。
- 3秒幾何過渡；10秒地點提示；結果只報真實前後差異。
- 同向票可能支持維持現況；每次有提案紀錄，不保證每次都能合理新增建築。
- 優先利用既有GLB；MVP新增大型GLB為0件。

## 2. 已有實作與必要改變

以下是基準commit的事實，日後接手須重查。

| 已有 | 程式入口 | 本版缺口 |
| --- | --- | --- |
| root澀谷、日夜、行人／車／貨機、固定初始鏡位 | `src/main.ts`, `cityRig.ts`, `mobility.ts`, `dayCycle.ts` | 保留；不重建 |
| 四政策軸及clamp加分 | `survey/src/shared/citySurveyState.ts`, `survey/src/survey/scoreEngine.ts` | 改為每份完整提案更新四軸一次 |
| 五題、每人一題、run內題目只用一次 | `survey/src/survey/questions.mvp.json`, `survey/src/server/sessionService.ts` | 四題可跨人重用，不能第六人無題可答 |
| server推導四lot | `survey/src/shared/cityView.ts` | 全零目前四空地；新零值必須四site已建成 |
| SQLite事件、snapshot、replay、reset | `survey/src/server/`, `survey/src/survey/decisionHistory.ts` | 提案分組、算法版本、浮點狀態、新契約 |
| root已接survey | `src/surveyView.ts`, `src/surveyAtmosphere.ts` | 不是待接線；更新新契約及差異UI |
| site catalogue／manager／builders | `src/changeCatalog.ts`, `cityChangeManager.ts`, `siteBuilders/` | 負向形態、同形態數量更新、降低及維持提示 |
| future-tree與hubUpper、lazy cache、fallback／retry | `src/siteAssets/` | 保留；樹木動態數量需同步fallback |
| module-swap因果驗證viewer | `module-swap/` | 不是最終城市；契約變更不得靜默誤讀 |

現有氛圍映射在分數4已達滿效果；舊建築門檻為1／2／4。不能只改分數算法而沿用這些門檻，否則新Meter範圍與畫面不匹配。現有schema 2的`answer_events.guest_session_id`有UNIQUE，不能直接在同一session塞四列答案；見第8節。

## 3. 2127是固定時代，不是可加減的Meter

### 3.1 全狀態共用的未來基底

- 初始／reset／全低值／全中間／全高值，均保留澀谷地標、多層建築、既有上層步道、空中運輸系統及成熟基礎設施。
- 材質承接[ART](ART.md)：淺色複合陶瓷、精緻金屬、克制玻璃、工程化膜片與自然。不要負值變成木箱街市、普通2026街景或荒廢城市。
- 低值資產亦需有可辨認的未來輪廓：懸挑薄殼、可變屏風、整合式能源／服務接口、工程化樹冠等。發光或霓虹不能是唯一未來感來源。
- 先在固定日光、關閉結果標籤的圖中驗證形態；夜景與文字只補充，不挽救不成立的輪廓。
- 科技始終存在。`automation=-12`只代表服務主導權偏向人，不會移除全城自動基建或貨機。
- 全程年份為2127；提案編號／參與人數增加不等於年份推進。新版題目不用舊2072→2082→2092敘事；舊demo與歷史事件文字保留原樣。
- 零分表示尚未有觀眾意見，或意見平衡；不表示城市尚未建造。

### 3.2 各軸低值也必須具體成立

| 軸 | 低值2127形態 | 中間2127形態 | 高值2127形態 | 禁止誤讀 |
| --- | --- | --- | --- | --- |
| 服務方式 | **人員主導協作站**：曲面薄殼頂、整合式服務台、輔助機具；不新增角色rig | 人機混合服務站 | 自律服務／物流塔，沿用hubUpper | 低值不是沒有科技的舊店舖 |
| 空間共享 | **可變私密休息艙群**：同一座位單元加弧形屏風與共享薄膜頂 | 開放及分隔座位共存 | 開放式空中感薄膜commons | 低值不是貧民區或封城 |
| 降溫方式 | **主動氣候廊**：薄膜遮蔭頂、整合式冷卻鰭片，仍有工程化樹木 | 設備／樹冠協同庭院 | 工程化樹冠公園及種植面 | 低值不是污染；高值不是退回原始森林 |
| 機能配置 | **分散低層機能艙**：兩個薄殼服務館、整合接口；只在現有site內示意 | 中層混合機能館 | 垂直複合塔 | 低樓不等於古老；不模擬全城郊區化 |

這些是靜態形態與簡單轉場的視覺隱喻，不承諾真的模擬冷卻、AI機器人、聲學或變形材料。

## 4. Meter與正式題組

| key | 觀眾名稱 | −12 | 0 | +12 | 專屬site／wire socket |
| --- | --- | --- | --- | --- | --- |
| `automation` | サービスの担い手 | 人員主導 | 人機協作 | 自律服務主導 | `magnetEast` / `nw` |
| `publicSharing` | 空間の使い方 | 分隔／預約使用 | 混合 | 開放共享 | `dogenzakaSouth` / `sw` |
| `environmentalPriority` | 暑さへの備え | 主動設備優先 | 混合 | 樹冠種植優先 | `stationEastPark` / `ne` |
| `urbanConcentration` | 機能の配置 | 分散低層 | 混合中層 | 垂直集約 | `centerGaiRear` / `se` |

沿用environmentalPriority內部key以減少變更；本版展示意思收窄為該site的降溫投資。不可把分數叫碳排、氣溫、幸福或科學環保指標。所有軸兩端都合理，沒有好壞／進化高低排序。

### 4.1 問題及答案（規劃文案，日文產品文字）

投票值只可−1／0／+1。0是主動支持混合，不是跳題。選項ID與顯示次序分開；若輪換顯示順序，答案對應保持穩定。

| Question ID／Question | Option ID／Answer | 軸／vote | 因果 |
| --- | --- | --- | --- |
| `service-2127`：2127年の渋谷。サービスを支える人が限られる中、毎日の買い物や相談をどう支えてほしい？ | `human-led`：待ち時間があっても、人が主役。技術は接客を支える | automation −1 | 人員主導，先進技術仍輔助服務 |
| 同上 | `human-machine`：普段は自動、困ったときは人に相談 | automation 0 | 人機協作 |
| 同上 | `autonomous`：相談の機会より、いつでも使える自動サービス | automation +1 | 優先自律服務 |
| `commons-2127`：渋谷で1時間の空き時間。限られた広場を、どんな場所にしたい？ | `private-pods`：一人や小グループで予約できる、静かな空間 | publicSharing −1 | 可變休息艙／屏風 |
| 同上 | `mixed-seating`：静かな席と、自由に集まれる場所を半分ずつ | publicSharing 0 | 混合使用 |
| 同上 | `open-commons`：予約なしで、誰でも一緒に使える場所 | publicSharing +1 | 開放共享座位 |
| `cooling-2127`：2127年の厳しい夏。同じ予算を、駅前のどんな暑さ対策に使いますか？ | `active-cooling`：木陰より、日差しを調整する屋根と冷却設備 | environmentalPriority −1 | 主動氣候廊 |
| 同上 | `hybrid-cooling`：冷却設備と、木陰・植栽を半分ずつ | environmentalPriority 0 | 協同降溫庭院 |
| 同上 | `canopy-cooling`：設備より、木陰と植栽のある地面 | environmentalPriority +1 | 工程化樹冠公園 |
| `functions-2127`：新しい店や生活サービスを増やすなら、どんな渋谷で暮らしたい？ | `distributed-pavilions`：少し歩いても、低層の機能ポッドに分かれた街 | urbanConcentration −1 | 分散低層機能艙 |
| 同上 | `mixed-functions`：低い建物と高い建物が混ざった街 | urbanConcentration 0 | 混合中層 |
| 同上 | `vertical-functions`：上へ移動すれば、一つの建物で用事が済む街 | urbanConcentration +1 | 垂直集約 |

Q1／Q3是未來情境，Q2／Q4是生活偏好。直接選擇城市取捨，不由旅行習慣推論政治立場或人格。每題只更新一軸，避免隱藏交叉加分。新版題組重複供每位觀眾作答；舊五題作為legacy demo保留，不在新版混用trigger分配。

## 5. 體驗、UI及展覽運作

| 階段 | 時間目標 | 系統行為 |
| --- | --- | --- |
| Idle | 持續 | 目前共同城市＋總參與人數＋最近提案；不reset |
| Start | 5秒 | 「この街は、これまでの参加者がつくりました。」；零人時用「ここは2127年の渋谷。次の暮らし方を選んでください。」 |
| Q1–Q4 | 每題10–15秒 | 顯示進度、三大選項、上一題；只保存草稿 |
| Submit | server回應目標≤1秒 | 驗證、原子保存、成功後開始結果；失敗不可假裝完成 |
| City transition | 3秒 | 四site同步過渡，從當前顯示狀態retarget |
| Result | 約10秒 | 最大兩項實際差異依次提示，其餘短行；四Meter前後值 |
| Handoff | 約5秒 | 提案編號、下一位；保留城市 |

- 先做一個本機桌面展示站，重用guest頁與root城市頁；不把手機／跨網路配對列為前置。
- Start建立一份四題session，建議有效期5分鐘；UI在60秒無操作時提示，再15秒放棄草稿。UI閒置與server session expiry是不同計時。
- 草稿可改，提交後不能偷偷修改歷史；server成功但回應遺失時以同一submissionId重試，不能重加分。
- 等待server時按鈕防重按；重新連線收到snapshot只恢復，不重新播放「你剛剛改變」動畫。
- 建議每日延續同一run；如工作人員要新run，使用admin操作並保留舊紀錄。每日政策仍待展覽負責人定案，不能於午夜自動清空。
- 第N位以已完成提案數計，不以answer row數計；四題不是四位。
- 建議驗收／展覽比較使用現有`?hour=12`；日夜仍是獨立系統，不由答案推進年份或時間。
- 保留鍵盤操作、清晰focus、足夠對比、文字／符號、不只用色；reduced motion使用淡入／直接切換與前後數字。

### 5.1 Feedback契約

1. 地點旁：實際數量前後，例如「駅東：樹冠ユニット 8 → 5」。
2. 結果卡：選擇原因，例如「設備による暑さ対策を優先しました」。
3. 輔助：設備3→5、該site種植面積50%→31%；不得寫「全澀谷綠地−19%」或虛構降溫幾度。
4. Meter顯示1位小數；比較使用未四捨五入的權威值。差異小至顯示0.0時不要聲稱數值大幅上升。
5. 形態不變但參數變化，仍列實際參數差異。數量也不變時，寫「構成を維持する提案を記録しました」，不要為動畫而篡改城市。
6. 64格近期提案帶，每格四個投票色塊／符號；第65位移走最舊可見格，只裁切UI，不刪DB。標明「最近64人」，總人數另列。
7. 維持現況也是共同創作；新提案印記屬紀錄回饋，不冒充新建築。
8. live新增／減少／同形態參數改變可標記10秒；snapshot／reset無個人貢獻pulse。無幾何變化只強調提案印記。

## 6. 累積算法與可重現數值

### 6.1 比較與選擇

| 算法 | 優點 | 主要缺口 | 決定 |
| --- | --- | --- | --- |
| 每次±2再clamp | 簡單，現有可用 | 6次同向便到邊界 | 只留legacy |
| 全歷史平均×12 | 每人等權，歷史保留 | 新觀眾影響隨人數下降 | 作一半權重 |
| 最近10人平均 | 後來票有效 | 第11人令第1人突然退出 | 不採用 |
| EMA，alpha=.25 | 新票持續有效 | 舊票逐步淡出 | 作另一半權重 |
| **歷史平均＋EMA各50%** | 長期共同方向＋近期改變力 | 非等權最終影響；需簡單解釋 | **本版採用** |

觀眾說明：「街の方向は、これまでのみんなの選択と、最近の選択を半分ずつ反映します。」不宣稱所有年代的票最終權重完全相等。

### 6.2 定義

每份完整提案有四軸vote，值為−1／0／+1；n是完成提案數。對每軸：

```text
S_n = S_(n-1) + vote_n
H_n = S_n / n
R_n = 0.75 * R_(n-1) + 0.25 * vote_n
M_n = 6 * (H_n + R_n)
```

初始S=R=M=0，n=0單獨回傳零，不能除零。H及R都在[−1,1]，因此M在[−12,12]。只為浮點誤差作最終clamp；不能用clamp掩蓋NaN或錯誤投票。內部保留完整精度；浮點比較測試使用小容差。

```ts
type Vote = -1 | 0 | 1;
type AxisMemory = { sum: number; recent: number };

// Server已驗證vote與狀態；n是提交成功後的guestCount，必須為正整數。
function updateAxis(before: AxisMemory, vote: Vote, n: number) {
  const sum = before.sum + vote;
  const recent = before.recent * 0.75 + vote * 0.25;
  return { sum, recent, meter: Math.max(-12, Math.min(12, 6 * (sum / n + recent))) };
}
```

每份提案對每軸只呼叫一次。不得因四答案逐列replay導致同軸被衰減四次；0票會把近期方向拉向混合，不能略過。

### 6.3 Fixtures

所有人對某軸一直投+1：

| n | H×12 | R×12 | M |
| --- | --- | --- | --- |
| 1 | 12 | 3 | 7.5 |
| 5 | 12 | 9.15234375 | 10.576171875 |
| 20 | 12 | 11.9619454567 | 11.9809727284 |
| 50 | 12 | 11.9999932041 | 11.9999966021 |

其後一位投−1：

| 之前同向人數 | 新Meter | 與之前差值 |
| --- | --- | --- |
| 20 | 8.4143009748 | −3.5666717535 |
| 30 | 8.6120996064 | −3.3868289011 |
| 50 | 8.7647033339 | −3.2352932682 |

50人由+1開始交替±1，M≈−0.8571423717。全零投票始終M=0。接近0是合理分歧，不偷偷推向極端。

限制：一致意見會接近±12；有限場景不能無限增長。算法保證有逆轉能力，不保證每票都有新物件。中間形態／真實差異／提案印記一起承擔回饋。

## 7. 視覺映射：四site三形態＋連續參數

### 7.1 權威推導與門檻

- 只有server的純mapping決定形態及數量，root只根據收到的權威配置選catalog層與渲染。
- low：M≤−3；mixed：−3<M<3；high：M≥3。0必須mixed；±3邊界有測試。
- `t=(M+12)/24`。±8不再增加一套asset；強烈程度由參數延續表達。
- 只對已提交的target判斷band；不要每一動畫frame拿插值分數重選形態。MVP不加hysteresis／多層規則引擎。
- 四site共12個配置描述，不是12座完整城市；不枚舉3^4組合檔案。
- 所有placement固定種子／預設槽位，符合`layout.changeSites`足跡；換形態不得重roll整城。

### 7.2 Mapping matrix

| 軸／site | low／mixed／high形態 | 連續或離散參數 | Asset／Material | Light／Animation |
| --- | --- | --- | --- | --- |
| automation／magnetEast | 人員協作站／混合服務站／自律物流塔 | 6個服務位置，`automatedPorts=round(6t)`，`humanCounters=6-automatedPorts` | 現有hubBase/upper＋整合端口及服務台；共享ceramic/metal/glass | 本地狀態燈，3秒層過渡；不改全城車速 |
| publicSharing／dogenzakaSouth | 私密休息艙／混合庭院／open commons | 8座位單元，`sharedSeats=round(8t)`，`screenedSeats=8-sharedSeats` | 現有bench/canopy＋弧形屏風；共享膜材/stone | 屏風收合、共同頂保持；不靠刪光所有設施表達低值 |
| environmentalPriority／stationEastPark | 主動氣候廊／協同庭院／樹冠公園 | `treeCount=3+round(9t)`；`plantedFraction=.2+.6t`；`coolingFins=round(6*(1-t))` | future-tree、現有綠化面＋薄膜頂/鰭片；leaf/metal/stone | 樹/鰭片升降、3秒參數過渡；不改天空/全城污染 |
| urbanConcentration／centerGaiRear | 兩個低層機能艙／中層館／垂直塔 | `functionModules=2+round(4t)`，低值分放兩艙，中間集中於base，高值沿tower布置 | 現有towerBase/upper＋1款低層館；共享立面材質 | 既有上層rise/sink；不以Y scale拉長窗戶；不更改空中路線 |

函數模組是展示用機能單元數，不是居民數／實際容積率；本版不宣稱不同配置同容量。若要固定容量公平比較，另開規則變更，不能在實作中暗改此公式。

### 7.3 零值baseline（新run與reset共用）

| site | M=0，t=.5 | 畫面要求 |
| --- | --- | --- |
| MAGNET東 | 自動端口3、人工主導台3 | 已建成人機協作站，未來薄殼頂與共用基建 |
| 道玄坂南 | 共享座位4、屏風座位4 | 完整庭院及薄膜頂 |
| 車站東 | 樹8、鰭片3、種植面50% | 已有工程化自然與氣候設備 |
| センター街後 | 機能模組4、中層形態 | 已建成機能館，非建築工地 |

全部 round 採JavaScript `Math.round`；例如`3+round(9*.5)=8`。中性城市幾何與舊demo的四空地刻意不同；只在新契約/run啟用。

### 7.4 邊界、轉場與物件生命週期

- 分數及UI數值由server決定，畫面在3秒內追到target；不把動畫中的數值當新權威狀態。
- 同形態變更數量必須更新；不要只比較variant ID。
- 同一site換層重用已配置物件；共享資源不可被個別instance dispose。
- 移除使用sink或屏風折收，結束後隱藏；低值永遠保留自己的基底／功能。
- 開始與reset不用「從古代升級」動畫。snapshot直接恢復完整2127城市，不發guest pulse。
- 繼續沿用GLB lazy cache與5秒active retry；樹木fallback與GLB都必須尊重最新treeCount，晚到的load不得復活已移除物件。
- 回到既有target或重複revision不重建、不重播；中途新revision從當前轉場狀態retarget。
- 地點標記位於地面，不遮住主要輪廓；camera／landmark／路線碰撞範圍依現有測試規範。

## 8. Server資料、版本與傳輸契約

以下是規格目標形狀；S1 已按此方向加入並整合 v2 server API 與儲存，package checks 及 main CI 通過。欄位及 HTTP wrapper 以 `survey/src/shared/`、`survey/src/server/server.ts` 的實作為準；驗證範圍見 [S1 handoff](handoffs/exhibition-s1.md)。盡量擴充既有module；只有在舊schema的真實約束下才新增儲存結構。

```ts
type Axis = 'automation' | 'publicSharing' | 'environmentalPriority' | 'urbanConcentration';
type Values = Record<Axis, number>;
type Votes = Record<Axis, -1 | 0 | 1>;
type Band = 'low' | 'mixed' | 'high';
type Socket = 'nw' | 'ne' | 'sw' | 'se';

type ExhibitionState = {
  runId: string;
  revision: number;
  guestCount: number;
  algorithmVersion: 2;
  voteSums: Values;
  recentVotes: Values;
  scores: Values;
};

type ProposalRequest = {
  submissionId: string;
  guestSessionId: string;
  expectedRevision: number;
  answers: { questionId: string; optionId: string }[];
};

type ExhibitionLayout = {
  version: 2;
  bands: Record<Socket, Band>;
  automatedPorts: number;
  sharedSeats: number;
  treeCount: number;
  plantedFraction: number;
  coolingFins: number;
  functionModules: number;
};

type ProposalRecord = {
  id: string;
  ordinal: number;
  questionSetVersion: number;
  algorithmVersion: 2;
  answers: { questionId: string; optionId: string; questionText: string; optionLabel: string }[];
  votes: Votes;
  revisionBefore: number;
  revisionAfter: number;
  submittedAt: string;
};
```

### 8.1 一次提交的transaction

1. 邊界驗證ID長度、expectedRevision非負整數；四題恰好各一次且屬於session題組，不接受跳題、重複題、foreign option或客戶端score。
2. 以submissionId查已成功提案；相同request回傳已存結果不重加分，不同request同ID回conflict。檢查順序要令成功後expiry／reset仍可識別合法重試；回應標明原run與結果，不能更新當前run。
3. 驗證active run、session有效未提交、目前revision；revision衝突保留草稿並要求刷新後重新確認提交，不無限自動改expectedRevision重送。
4. Server從固定版本題組查四vote；建立完整提案，n+1、revision+1，四軸各更新一次。
5. 同一transaction保存提案、snapshot及session完成狀態；任何失敗全部rollback。
6. commit後才發WebSocket更新；不在transaction成功前先改畫面或播放結果。

### 8.2 Migration與replay

- 追加migration，不改已套用migration；舊answer_events的append-only trigger與歷史資料保留。
- 推薦新增append-only `proposal_events`（一個session一列，四答案JSON）及新版snapshot；不為突破舊UNIQUE而刪舊constraint或改歷史rows。不要同時建立第二套服務／事件bus。
- 新snapshot使用能保存浮點的欄位，保存sums/recent/guestCount與algorithmVersion；遷移後驗證round-trip精度。型別`number`本身不能保證DB欄位正確。
- 遷移結束legacy active run並保留紀錄，建立algorithmVersion=2的run；不得重新解讀舊+2為新vote，legacy replay保留原語義。
- replay按已提交proposal次序，每份更新一次；snapshot只是可校驗快照。live、replay、decision差異都呼叫同一pure reducer及mapping。
- 提案保存當時題目／選項文字與版本，避免改JSON後歷史說法變掉；votes以server寫入版本為準。
- migration、reset均不可刪掉舊run或觀眾事件；備份與migration測試使用scratch DB，勿拿展示資料試錯。

### 8.3 CityView v2

- 保留既有snapshot／updated／run-reset事件類型；新view有顯式`version:2`，含runId、revision、scores、guestCount、layout及bounded近期提案。
- server生成上一個與下一個layout的差異；結果UI只使用這些真實數值，不在DOM自己重算政策。
- snapshot送目前完整狀態＋最多64份近期提案；完整歷史留SQLite，避免每次把全日所有事件broadcast。當前latest結果可附該提案的before/after scores及layout。
- S1 的舊 root／module-swap parser 先拒絕明確 v2，避免把新資料當成 v1 套用；S2/S3 接入 v2 時才應驗證 `Number.isFinite`、Meter範圍、band枚舉及各count／fraction界限，不默認未知variant為空地。
- 保留舊revision忽略、重連及新run替換語義；先驗證支援版本再改場景。
- module-swap暫不做新版渲染：目前已加入「Unsupported exhibition view version」提示並停止套用v2；原v1 standalone／demo保留。未來需要才加adapter，不能讓v2冒充v1。
- 不改現有非survey日夜模式；新展覽基線與規則只屬於v2展示路徑。

## 9. Asset、生產規模與效能

| 分類 | 款式／實例上限 | 方法 | 新增工作 |
| --- | --- | --- | --- |
| Base City | 既有澀谷1座 | THREE.JS PROCEDURAL | 0座 |
| Modular building | hubBase／upper、towerBase／upper共4層 | 既有程序＋BLENDER SELF-MADE upper | 重用，勿重做 |
| 低層機能館 | 1款／2實例 | THREE.JS PROCEDURAL | 薄殼頂、整合接口、共用立面 |
| Nature | 未來樹1款／site最多12＋八公旁1 | BLENDER SELF-MADE（既有） | 動態數量與固定位置 |
| Nature surface | 1套種植面／花槽 | THREE.JS PROCEDURAL | 分區伸縮，不侵入路面 |
| Transport | 既有車、貨機、cargo pod各1款 | THREE.JS PROCEDURAL | 0新款，沿用pool／routes |
| Seats | 1款／8 | THREE.JS PROCEDURAL | 重用bench |
| Service props | 人工主導台1款、自動端口1款／各最多6，合共6 | THREE.JS PROCEDURAL | 抽出既有細節或簡單新增 |
| Privacy props | 弧形屏風1款／最多8 | THREE.JS PROCEDURAL | 共享薄膜頂形成艙，不建複雜室內 |
| Climate props | 冷卻鰭片1款／最多6＋薄膜頂1套 | THREE.JS PROCEDURAL | 頂重用canopy語言，整合設備 |
| Hero | AUTO HUB upper 1款（既有） | BLENDER SELF-MADE | 0新大型GLB |
| FX/UI | 地點框4、結果標籤4、近期提案64格 | THREE.JS PROCEDURAL＋DOM/CSS | 重用marker，擴UI |
| 概念參考 | 最多2張，有需要才做 | AI ASSISTED | 非必要，不生成即時模型 |
| 外部資產 | 0 | BUY / DOWNLOAD不採用於MVP | 現有素材已足夠 |

生產順序：程序輪廓→固定鏡位驗證低／中／高→答案效果可讀→必要時精修。AI協助草圖或Blender腳本，不能取代匯出、尺度、法線／材質及實際Three.js檢查。未指派asset工作不改binary。

### 9.1 建議預算（尚未量測）

- 新增大型GLB 0、外部貼圖0；若後續必要貼圖單張先≤1024²。
- 新增可見幾何總量先≤20,000 triangles；不是整城總triangles。
- 相同renderer／viewport／post鏈的新增draw calls先≤40；既有Stage3記錄521 calls／133 geometries是headless證據，不是當前實測FPS。
- 1080p展覽PC目標60FPS，最低穩定30FPS；必須真GPU、all-sites worst-case、夜景／轉場均測。
- 本機資源首次可互動目標≤5秒，提交回應目標≤1秒；均需實測。
- 同款prop用InstancedMesh或既有batch；更新矩陣／count，無每frame geometry/material allocation。clone不等於自動instancing。
- 同形態幾何不重建；動畫層獨立batch。先不加LOD、新decoder、新陰影光源或post pass。
- 若FPS不足先量測GTAO／pixel ratio／新增calls；記錄調整，不用盲目降模型品質代替診斷。

## 10. 完整例子

### 10.1 首位觀眾

選Q1 `human-machine`、Q2 `open-commons`、Q3 `active-cooling`、Q4 `vertical-functions`。

| 軸 | vote | Meter前→後 | band與實際結果 |
| --- | --- | --- | --- |
| automation | 0 | 0→0 | mixed維持，人機協作站仍有完整未來基建 |
| publicSharing | +1 | 0→7.5 | mixed→high；共享座位4→7 |
| environmentalPriority | −1 | 0→−7.5 | mixed→low；樹8→5、鰭片3→5、種植50%→31.25%；主動氣候廊 |
| urbanConcentration | +1 | 0→7.5 | mixed→high；機能4→5、垂直塔層啟用 |

四Meter改變不代表由2026走向2127；前後都是2127。結果突出兩項最大可見差異，第三項短行列出，自動化寫維持。不顯示沒有發生的降溫數字。記錄第1份提案，下一位從此狀態繼續。

### 10.2 多人（獨立run，軸順序A/P/E/C）

- 第1–10人vote `[+1,-1,+1,-1]`。
- 第11–30人vote `[0,+1,-1,+1]`。
- 第31–50人vote `[+1,0,+1,+1]`。

| n | A | P | E | C | 城市讀法 |
| --- | --- | --- | --- | --- | --- |
| 10 | 11.6621 | −11.6621 | 11.6621 | −11.6621 | 自律塔／私密休息艙／工程化樹冠／低層機能艙 |
| 30 | 2.0180 | 7.9630 | −7.9630 | 7.9630 | 人機協作／open commons／主動氣候廊／垂直塔 |
| 50 | 9.5810 | 1.2189 | 7.1621 | 9.5999 | 自律塔／混合庭院／樹冠公園／垂直塔 |

第11人令E從11.6621變7.6557，樹12→10，雖然仍high亦有可見改變。歷來平均保留早期意見，近期方向容許改寫用途；不保證第一位留下的每件建築永久不可移除。

## 11. 可獨立交付的實作階段

S1 實作及整合已完成，package checks 與 main CI 通過；S2–S5 仍待處理。Owner由實際接任者在各task handoff填一名；不得假設文件owner自動獲派所有實作。階段依賴按順序，無需多agent。

| 階段 | 狀態／依賴 | 主要入口 | 交付與exit gate |
| --- | --- | --- | --- |
| S1 規則與儲存 | IMPLEMENTED and integrated; package checks and feature/main CI pass | survey shared／scoreEngine／migrations／runStore／sessionService／answerService／proposalService／decisionHistory；root/module-swap v2 rejection | 四題transaction、replay、version、重用題組及 viewer rejection 完成；驗證紀錄見 [S1 handoff](handoffs/exhibition-s1.md) |
| S2 第一條可見鏈 | PLANNED，依S1 | root surveyView／changeCatalog／manager／environmentPark；survey v2 mapping | 維持四題完整提交契約，先將Q3視覺打通；其他三site維持建成mixed基底並清楚標示未完成映射；負向氣候廊／正向樹冠、真實差異、reload/fallback通過，不宣稱四軸MVP完成 |
| S3 其餘三site | PLANNED，依S2 | automationHub／commonsPlaza／concentrationTower＋catalog/mapping | 完成12配置、同band counts、低值未來感、路線clearance；四軸端到端通過 |
| S4 正式觀眾體驗 | PLANNED，依S3 | survey guest UI、root causal panel、style | 四題back/edit/submit、idle/result/next、紀錄、錯誤恢復、accessibility；無人格誤導 |
| S5 展覽驗收 | PLANNED，依S4 | tests／browser evidence／docs | 100份提案、60分鐘、實機效能、5人理解測試、每日操作交接 |

S2不是建立另一套一題API或另一個score schema；使用S1四題session，以fixture／最小操作介面完成垂直切片，正式UI在S4精修。若整次任務已明確指派全部階段，順序完成即可，別每階段重問批准。

### 11.1 必须跟隨的變更路徑

`Question set → Session → Submit transaction → Reducer → Persist/replay → derive layout/parameters → CityView parser → Catalogue → Manager → Site builder → Feedback`

更改reducer必查live與replay；更改wire必查root及module-swap；更改樹數必查procedural fallback及GLB晚到；更改bounds必查layout與mobility tests；更改UI先確認不遮住道玄坂南site。

## 12. 驗收矩陣（尚未完整執行）

S1 有獨立 probe/browser 證據及整合後本機三個 package、feature CI 和 main CI 的通過結果，但本表是整體 exhibition acceptance；S2–S5 尚未完成，不可標成通過。逐項證據與限制見 [S1 驗證紀錄](VALIDATION.md#exhibition-s1-2026-09-28)。

| ID | 檢查 | 通過條件／證據 |
| --- | --- | --- |
| R01 | 新run／reset／reload | 四Meter0、四site完整mixed，全部已是2127；無guest pulse |
| R02 | 各軸邊界與混合 | −12、−3、0、+3、+12正確；其他軸不被意外修改 |
| R03 | 50人同向後反向 | 第51人M≈8.7647033339；無永久卡死 |
| R04 | 1000份合法votes | 所有score有限且範圍正確，零票／交替票正確 |
| R05 | 提案完整性 | 缺題／重題／foreign option／過期／錯revision拒絕；DB及city不半更新 |
| R06 | 冪等與競態 | 成功重試只計一次；同revision併發最多一份成功；重連不重播 |
| R07 | migration／replay | 舊run可讀、事件未改、v2完整重播與snapshot一致；文字版本固定 |
| R08 | question reuse | 100位都可答同題組，不因已答題而耗盡 |
| V01 | 未來感 | 初始／四軸各low/mixed/high固定鏡位日光截圖，無標籤仍見成熟未來設施 |
| V02 | 低值不落後 | 第3節每個low輪廓可辨；不靠全黑/移光/空地表達 |
| V03 | 同band／降低 | 數量更新、負向轉場、真實before/after均正確 |
| V04 | GLB failure／late load | 永遠有fallback；最新count／band生效；inactive retry停止 |
| V05 | 空間 | 地標與既有route保留、最大樹群及最高形態不穿路／機流；檢查12配置及all-low/all-high/mixed組合 |
| V06 | 無變化票 | 構成維持文案＋提案印記；不偽造幾何差異 |
| V07 | UI | 1280×720及1920×1080可讀，不遮site，鍵盤／focus／reduced motion可用 |
| P01 | 展覽機 | 1080p真GPU、day/night、最壞形態／轉場測量；記錄device/browser/DPR/calls/frame time |
| P02 | 耐久 | 100次提交＋60分鐘，無無限geometry/cache增長、無重複初始化listener、reconnect正常 |
| U01 | 5位非組員 | 至少4人5秒內指出變化位置、說出答案原因、理解跨人累積；中位完成≤90秒 |

測試遵循[VALIDATION](VALIDATION.md)：修改到的root／survey／module-swap各跑`npm test`、`npm run build`，以及工作樹和committed diff whitespace檢查。資料邏輯用現有Node assert模式，不加測試框架。browser截圖只證明外觀，不等於FPS／理解測試。

## 13. 風險與scope cut

| 風險 | 對策 |
| --- | --- |
| 四Meter難理解 | 每題只講一軸，結果才列四軸 |
| 題少／偽人格 | 稱城市選擇，不推論人格／醫療 |
| 排隊 | 固定四題及短文；先60–90秒；不加分支問卷 |
| 平均接近0 | 混合配置有完整內容，分歧可見，唔強迫極端 |
| 很快端點 | 保持可逆算法；誠實接受一致票接近端點 |
| 後來沒影響 | EMA維持近期作用；微小／維持如實顯示提案 |
| 組合爆炸 | 四site獨立，12局部配置，共用模組 |
| 變化太細 | 數量／輪廓＋地點標記＋真實前後值 |
| 效能不足 | batch/instance、預算、實機量測，不盲加post |
| 3D失控 | 1新低層館、4款新／重用props、0大型GLB |
| AI拓撲不穩 | 先程序版本，GLB逐件驗證，保留fallback |
| 缺心理學根據 | 不叫心理測驗，生活選擇本身就是輸出 |
| 答案缺敘事 | 一軸專屬site、兩端均合理且未來 |
| 多軸衝突 | 不共同控制天空／全城車速／全城色調 |

### 13.1 製作可行性

以現有repo為起點，估計96–160人時：內容/UI 16–24、規則/保存24–40、site/feedback24–40、排版/accessibility8–16、整合/驗收24–40。三位每週各12小時約3–5週工作量，另留展前緩衝。不是從零估算，不包含新硬體／LAN／大型資產；未量測的估時不是交期保證。

| 優先級 | 範圍 |
| --- | --- |
| MUST HAVE | 2127全狀態基底、四題跨人重用、四軸累積、持久化／冪等／恢復、四site正負可辨、真實差異／維持文案、實機驗收 |
| SHOULD HAVE | 完整三形態美術打磨、64格提案帶、選項順序輪換、完整現場操作說明；理解測試應盡早安排 |
| CUT FIRST | 新GLB、額外城市區域、更多題庫、手機輸入、歷史時間軸播放、雙scene前後對照、個人分享卡、額外車款 |
| 不建議 | 16城市GLB、人格分型、真交通／氣候simulation、自由放模型、即時AI建城、新renderer／框架 |

Scope cut可簡化三形態的幾何差異，但不得刪掉低值未來身份、零值完整城市、負向實際效果、資料可靠性及誠實feedback。最先完成Q3垂直切片，再擴三軸；不以堆模型替代可理解的因果鏈。

## 14. 實作Agent交付清單

- [ ] 更新task handoff的owner、base、remote、範圍、目前階段。
- [ ] 說明哪些本文件要求已實作、哪些仍PLANNED；只更新有證據的狀態。
- [ ] 列出實際修改入口與caller、schema/protocol版本變更及遷移結果。
- [ ] 附數值fixture、replay／idempotency、適用browser／fallback／performance結果。
- [ ] 新截圖標日期、commit、run、scores、hour、viewport；舊圖保留。
- [ ] 同步PROJECT（當前架構）、PLAN02（方向／差距）、VALIDATION（實際證據）、必要README／AGENTS；不要把提案寫成已完成。
- [ ] exact diff自檢、適用package checks、CI與integrated結果完成後再標DONE。
- [ ] 清楚記錄剩餘限制與下一步；不必為每個常規階段另請批准。
