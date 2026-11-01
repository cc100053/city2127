# guest-agency — 每位 Guest 都有近鏡＋明顯變化

- Owner: cc100053（產品方向 G0 決定、最終 review）；實作：G3 relay worker
- Status: G1 and G3 implemented; G2, G4–G7 and final acceptance pending
- Branch: `feat/guest-agency`（由 verified main 開；依賴 `feat/closeup-zoom` 先 merge）
- Base commit: `6e3514f03e67cbe0918d8257f930b89ec0fe4346`（2026-10-30 fetch，main／origin/main 0/0；包含 closeup-zoom）
- Last verified commit: G3 checkpoint (see Git history; checks recorded below)
- Remote availability: NOT PUSHED

## 目標

每一份提案（每位 Guest）結果時段內一定：

1. 有 headline → 一定觸發近鏡（zoom in）。
2. 近鏡入面睇到一個**明顯**、**同佢投票方向一致**嘅變化（先睇到之前，再睇到之後）。
3. 結果卡講得出「你嘅聲音令呢度變咗」，而唔係講一個同佢無關嘅變化。

## 現況（main `2050883` 實測，唔係推測）

近鏡只喺 `pickHeadline` 有結果先播（[cityChangeManager.ts](../../src/cityChangeManager.ts) line 125、[main.ts](../../src/main.ts) line 199）。`pickHeadline` 只睇 before／after layout，**唔睇呢位 Guest 投咗乜**（[cityView.ts](../../survey/src/shared/cityView.ts) line 240）。

當時 agencySim 原型（真 reducer＋當時 `ladderStep`，200 run × 40 位偏向型 Guest，唔係真人數據；現行 gate 見 [agencySim](../../survey/scripts/agencySim.ts)）：

| 每份提案結果 | 現行 |
| --- | --- |
| 有 site 向 Guest 投票方向移一格 | 69.4% |
| 有 site 移，但**同 Guest 投票相反** | 3.7% |
| 只有能源變化 | 2.5% |
| **完全冇變化 → 冇近鏡** | **24.4%** |

即係大約每 4 位就有 1 位冇近鏡，另外約 4% 睇到一個同自己相反嘅變化。

根因有三個，全部喺 `ladderStep`：

- **遲滯**：退返 mixed 要過門檻再多 2，所以中段票好多時「未夠」。
- **每份最多一格**：好處係穩，壞處係有 gap 嘅 site 可能唔係 Guest 投嗰個。
- **揀 site 先睇 gap 大小，後睇 Guest 方向**：Guest 方向只係加 2 分。

能源：每類要 ≥2 票同 ≥20% 先出現（[energy.ts](../../survey/src/shared/energy.ts) line 28），規格寫明「第一票可沒有可見設備差異」。所以能源幫唔到「每票有反應」。

## 方案總覽

| 階段 | 內容 | 改邊度 | 要 owner 決定？ |
| --- | --- | --- | --- |
| G0 | 產品決定（下面 4 條） | 文件 | 已批（2026-10-29） |
| G1 | Guest 主導 ladder 一步 | `survey/src/shared/cityView.ts` | G0-1 |
| G2 | 冇 tier 可移時嘅保底變化 | 能源或 site 微狀態 | G0-2 |
| G3 | Headline 一定揀 Guest 嗰個變化 | `pickHeadline`、`cityChangeManager.ts` | 無 |
| G4 | 近鏡入面變化夠明顯 | 沿用 [closeup-zoom](closeup-zoom.md) T／F／A，加 ±1／±2 檢查 | 無（closeup-zoom 已批） |
| G5 | 結果卡講「你嘅聲音」 | `surveyAtmosphere.ts`、[RESIDENT_COPY](../RESIDENT_COPY.md) | G0-3（日文文案） |
| G6 | 驗證：sim gate、browser、真人 2 秒 | tests、artifacts | G0-4 |
| G7 | 近鏡唔再限四個區域：飛去實際有變化嘅位置 | `headlineCamera.ts`、`districtMeters.ts`、`cityChangeManager.ts` | 已批（owner 2026-10-29） |

## G0 — owner 決定（2026-10-29 批准，全部跟建議）

批准結果：

1. Guest 主導 ladder，`LEAD=1`。
2. 保底用 (a) 能源「建設中」微狀態。
3. 結果卡可以將 headline 變化歸因於本人；日文文案由實作者擬，owner 喺最終 review 確認字眼。
4. 真人 2 秒辨認做 hard gate；人數同場地仍待 owner 定，未定之前只記錄實作者自評，唔當 PASS。

以下係當時嘅選項同理由，保留做記錄。

1. **Ladder 規則改做「Guest 主導」？**（建議：是，`LEAD=1`）
   呢個改動會改「一票之聲，唔係規劃師」嘅平衡：城市會更跟住最近嗰位 Guest 搖擺。候選移動後須喺累積目標 ±1 格內；這不是所有 tier 時刻保持 ±1 的保證（目標可移動，fallback 亦不受此條件限制）。

   | 指標（sim） | 現行 | Guest 主導 LEAD=1 | LEAD=2 |
   | --- | --- | --- | --- |
   | 向 Guest 方向變 | 69.4% | **95.6%** | 97.2% |
   | 同 Guest 相反 | 3.7% | 2.2% | 0.6% |
   | 冇變化 | 24.4% | **2.1%** | 2.1% |
   | 反向移動（搖擺） | 39% | 54% | 51% |
   | tier 同累積目標平均差 | 0.50 格 | 0.81 格 | 0.62 格 |
   | tier ±3 比例 | 52% | 39% | 41% |

   LEAD=2 數字好啲，但 tier 可以離累積結果 2 格，即係一個 Guest 可以令城市明顯「唔代表大家」。建議先用 LEAD=1。
2. **保底變化（剩低約 2%）用乜？** 剩低嘅情況主要係：全部揀中間選項，而 site 已經喺 0；或者投 +1 嘅 site 已經 +3。三個選擇：
   - (a) 能源「建設中」微狀態：未過門檻嘅能源類別，每一票令佢嘅地基／框架加一段（例如 1–4 段）。要放寬規格「第一票可冇差異」。**建議**，因為每位 Guest 都一定答能源題。
   - (b) 中間選項當作「平衡」：已經喺 0 嘅 site 唔郁，改為近鏡去佢投票嗰個 site，顯示 lantern 落地＋marker 加強。冇城市變化，只係「被聽到」。
   - (c) 接受約 2% 冇近鏡。
3. **結果卡可唔可以將變化歸因於本人？** 現行 RESIDENT_COPY 規則係「唔由本人選項推論共同結果」。Guest 主導之後，headline 變化確實係由佢嗰票揀出嚟，所以可以寫例如「あなたの声も加わり、デックス西の案内が自動へ一歩進みました。」。文案要 owner 定（全部日文）。
4. **驗收 gate**：「每位 Guest 2 秒內講得出邊度變咗、變咗乜」要唔要做 hard gate、要幾多個真人？

## G1 — Guest 主導 ladder 一步

`ladderStep` 改為（所有 replay、live、Undo 都用同一個函數，所以唔使資料遷移；舊歷史會用新規則重新 fold，格數可能同以前唔同，要 owner 知）：

1. 對每個 site 計 `target = ladderGap(0, D)`（冇遲滯嘅累積目標格）。
2. Guest 對該軸投 ±1 → 想移嘅方向 = 投票方向；投 0 → 想向 0 移（如果唔喺 0）。
3. 移一格之後要符合 `|new| ≤ 3` 同 `|new − target| ≤ LEAD`，先算合格。
4. 合格 site 入面揀：離 target 最遠優先，打和揀 Guest 有投 ±1 嘅，再打和按觀眾數輪替（沿用現有輪替）。
5. 冇合格 site → 用返現行 `ladderStep`（保留遲滯行為）。
6. `slotSeeds` 第一次到 ±2 固定嘅規則不變。

- `LEAD` 喺 `cityView.ts` 定義一次。
- 測試：`survey/tests/exhibitionRules.test.ts` 加 case（向 Guest 方向、LEAD 上限、中間選項向 0、fallback）；`agencySim.ts` 搬去 `survey/scripts/` 做 gate：向 Guest 方向 ≥ 95%，同 Guest 相反 ≤ 3%。
- 影響：`survey/src/server/runStore.ts`（fold）、`src/scaleLab.ts`、`tests/scaleLab.test.ts`、`survey/scripts/ladderSim.ts`。**Survey 同 root 要一齊部署**（共用 `cityView.ts`）。

## G2 — 保底變化（照 G0-2 揀嘅做）

如果揀 (a)：

- `EnergyConfiguration` 加每類 `progress`（0–N 段，未過門檻時用）。改 `energyConfiguration`、`sameEnergyConfiguration`、`pickHeadline` 嘅能源分支、root 能源模型。
- 視覺：地基／框架逐段出現。重用現有能源部件材質，唔加素材包；draw calls 增幅 ≤ 10%。
- 近鏡沿用五個能源 shot。
- 改 `EXHIBITION_SPEC` 能源段同 [ENERGY_CITY_PLAN](../ENERGY_CITY_PLAN.md)。

## G3 — Headline 一定係 Guest 嗰個變化

- `pickHeadline(before, after, votes?)`：有 votes 時，先揀向 Guest 方向移嘅 site；其次能源（如果該 Guest 能源類別有變）；之後先用現有規則。
- Root 已經收到 `latestProposal.votes`（[main.ts](../../src/main.ts) line 197），`cityChangeManager` 要將 votes 傳入。Survey 端用 `pickHeadline` 嘅地方（`artifacts/closeup-polish/formal.mjs`、tests）都要跟。
- 測試：一個 Guest 同時令 site 變同能源變 → headline 係 site；site 向反方向變 → 唔揀佢做 headline（如果有其他選擇）。

## G4 — 近鏡入面要明顯

前提係 [closeup-zoom](closeup-zoom.md) T（先推近、後變化；`feat/closeup-zoom` 已有 `967f5e5`）同 F（推近構圖）。G1 之後 ±1 同 ±2 嘅比例會變多，所以要額外檢查：

- 每個 site 嘅 0↔±1、±1↔±2、±2↔±3，**兩個方向**（包括退後，例如 +2→+1）都要喺同一個近鏡構圖內睇得出。
- 退後（反向移動 54%）都要有 pulse／marker，唔可以變成「靜靜消失」。
- 檢查 `?shot=` + `metersTo`，每對相鄰狀態並排截圖，日（12:00）夜（22:00）。
- A/B 排隊：第二份結果要攞到完整 13 s 近鏡，唔可以因為 `displayMs < DISPLAY_MS−100` 跌入 catch-up 即時 hero（[surveyView.ts](../../src/surveyView.ts) line 285–328）。未確認係咪問題，G4 要用 3 s 內兩份提案實測。

## G5 — 結果卡

- 照 G0-3 批准嘅日文文案改 `surveyAtmosphere.ts` 結果卡。只有 headline 變化真係向 Guest 方向先用「你嘅聲音」句；保底 (b) 用「聲が届きました」類文案。
- 更新 RESIDENT_COPY。

## G7 — 變化位置近鏡（owner 2026-10-29 加）

### 現況

近鏡而家只有 13 個固定 shot（[headlineCamera.ts](../../src/headlineCamera.ts) line 11）：

- 4 個 site × `focal`／`district`：`district` shot 係一個好闊嘅鏡頭，對住成個 district，唔係對住實際變咗嘅位置。
- 5 個能源 shot。

但係 ±2／±3 嘅變化其實散落喺 district 好多個 slot：

| Site | 會變嘅 slot（[PROJECT](../PROJECT.md) district layer） | 而家近鏡 |
| --- | --- | --- |
| nw 自動化 | 11 個服務灣；±3 仲有全城街道 pods、飛行器、行人數 | 只有 `nw:district` 闊鏡 |
| sw 共有 | 6 個 water rooms＋10 個庭院；同 nw／ne 配對時有 kiosk／果園 | 只有 `sw:district` |
| se 集約 | 10 座塔＋26 個低層 pods | 只有 `se:district` |
| ne 環境 | 17 個氣候灣；E4 之後凍結喺 mixed，唔會因答案變 | 唔需要 |
| 住宅 | 固定背景，唔受投票影響 | 唔加入 |

District 本身已經知道邊啲 slot 變咗，因為佢要喺嗰啲位置放 pulse 光圈（例如 [districtMeters.ts](../../src/districtMeters.ts) line 353–358 嘅 `roomSlots`／`courtSlots`）。所以「變咗喺邊」嘅資料已經有，只係冇交俾鏡頭用。

### 做法

1. **交出變化位置**：每個 district 嘅 `setTarget` 將今次變咗嘅 slot 世界座標記錄落嚟（同 pulse 用同一組），`CityChangeManager` 放入 `CarrierChange.points`。只喺 root 入面，唔改 survey 協議。
2. **預先寫好嘅 viewpoint 表，唔用即場計鏡頭**：以前自動／即場鏡頭試過出現遮擋同跨 near plane（[closeup-next](closeup-next.md) A1／A2）。所以每個 district 預先寫 3–4 個 viewpoint，每個負責附近一組 slot，總共大約 10–12 個新 shot。另外為 nw ±3 加 1–2 個街道／空中航線 viewpoint。每個 viewpoint 記住佢覆蓋嘅 slot index。
3. **即場揀 viewpoint**：headline 係 district 變化（±2／±3）時，揀覆蓋最多今次變咗 slot 嘅 viewpoint；打和就揀最近最少用嘅，令每位 Guest 睇到唔同地方。±1 照用 focal shot。能源照用能源 shot（G2 嘅建設中狀態都用佢哋）。
4. **時間線同 closeup-zoom 一致**：先推近、settle、後變化。Hold 期間嘅慢推照 closeup-zoom F。
5. **同 closeup-zoom 協調**：closeup-zoom F 將 `district` shot 重新定義為「拉闊嘅 focal」。G7 開工時，district 變化改用新 viewpoint 表，`*:district` 只做冇 slot 資料時嘅 fallback。要喺 closeup-zoom handoff 記低，避免兩邊重複調 district pose。

### 驗收

- 每個新 viewpoint：今次變咗嘅 slot 喺畫面中間三分之二、冇遮擋、冇跨 near plane。由 hero 那側望，最少見到一個地標或海做定位（沿用 closeup-zoom F 規則）。
- `tests/headlineCamera.test.ts`：每個 slot 最少有一個 viewpoint 覆蓋；揀選規則（覆蓋最多、打和揀最少用）；冇 points 時 fallback 去 `*:district`。
- Browser：nw／sw／se 各自 ±2→±3、±3→±2、0→±2（有 seed）嘅 live 截圖，每份 4.9／6.6／9.5 s 三張；40 份提案入面統計用咗幾多個唔同 viewpoint。
- 性能：新 shot 嘅 draw calls 同 FPS 實測，同現有 district shot 比較。

## G6 — 驗證

- 每個 checkpoint：root 同 survey 都要 `npm test && npm run build && git diff --check`。
- Sim gate：向 Guest 方向 ≥ 95%；連保底計，冇近鏡 = 0%（揀 (a)）或 ≤ 2.5%（揀 (c)）。
- Browser（scratch port，唔好郁 5173／8788）：40 份 `dev:auto` 提案，每份都要截 4.9／6.6／9.5 s 三張；全部都要有近鏡，headline site 要同 Guest 投票一致。中斷（reload、Undo、A/B 3 s 內兩份、reduced motion）照 closeup-zoom 要求。
- 真人：照 G0-4。結果分開記錄，唔當 sim 數字係真人結果。
- 只寫實測 FPS 同機器。

## 文件同步

AGENTS.md（每票影響力描述）、EXHIBITION_SPEC（分級階梯段、能源段、結果卡）、PROJECT、RESIDENT_COPY、VALIDATION、`docs/handoffs/README.md`。

## Known issues and blockers

- 真人辨認 gate 已定 owner 一人、在家；仍待最終執行。
- closeup-zoom 已 merge；整合候選的視覺 gates 仍待驗證。
- Sim 用嘅 Guest 偏向模型係假設；真實展覽可能有更多中間選項。
- G1 改咗 replay 規則：現有 run 重新 fold 後格數會變，reload 時城市可能同之前唔同。展覽前要開新 run，或者 owner 接受。

## Next expected step

1. Coordinator review G2 candidate and its original evidence; G1 tier–target and G2 owner decisions are recorded below.
2. Continue independent G7／G5 work as appropriate, then G2 after the decision; complete G4／G6 and review package.
3. Final human recognition gate: owner alone, at home (2026-10-30 decision).

## 進度

2026-10-30 G1：正式 shared ladder 使用 guest-led LEAD=1、原遲滯 fallback、固定 seed；server fold、Scale Lab 和 ladderSim 沿用同一函數。Simulation gate 使用正式程式，200×40 偏向模型得同向 95.5%、反向 2.4%、無變化 1.9%；neutral 向 0 算同向，並非每位真人的保證。原型只輪替三個 site，正式實作保留四個（含 legacy 氣候軸），因此結果略有不同。模擬中 tier 與累積目標距離平均 0.80、最大 6 格；每次只移一格而目標可大幅變動，LEAD 並不約束未選 site 或 fallback，需 owner 知悉。現有 run replay 可能改變城市；展前開新 run 或由 owner 接受。驗證：root 和 survey 各自 `npm test`／`npm run build` PASS；`git diff --check` 和變更文件本地連結 PASS。初次沙箱限制 loopback，允許後重跑通過；root 既有 replay fixture 已按新 ladder 更新並保留四區與配對覆蓋。Human gate 已定 owner 一人、在家，留待最終 review。G2/G3 未完成：仍可能沒有近鏡或出現反向 headline。

2026-10-30 G3：live headline 優先 guest 同向 tier（中間票向 0），其次該 guest 選擇而有變的能源部件，其餘保留舊次序；能源同時多部件改變時，鏡頭、結果卡及講解跟選中部件。Root live 傳入 votes，無 votes 的 DEV／舊 callers 保留舊規則。G1 的 ±1 全域決定未改；G2 保底和 G5 歸因文案仍待實作，fallback 仍可能與 guest 投票方向相反或沒有 headline。Root 與 survey 各 `npm test`／`npm run build`、`git diff --check` 與修改文件本地連結檢查 PASS；初次沙箱測試因 loopback EPERM 失敗，以允許 loopback 重跑通過。Scratch E4 browser 回歸重試 PASS（Chrome 156.0.8078.74、1920×1080 DPR1，page exception 0）；首次結果卡等待逾時，原因未證實，兩輪原圖及完整限制見 relay G3 result。G4／G6 視覺及真人 gates 未完成。

2026-10-30 G2 feasibility checkpoint：原 G1／G3 fold 的可執行反例（checkpoint 79059c6）原載 `survey/scripts/g2Counterexample.ts`：40 位依次三軸選中間、能源選蓄電環；第 2 票起環已啟用，第 3–40 票 tier、能源配置均不變，headline 為空；G2 候選後腳本已改為驗證這些票有保底 headline。只在未過門檻時累加 0–N 建設段，對第 3 票起完全無效；即使放寬至已啟用設備，單調有限進度終會滿額，同樣不能保證任意長連續投票。這是確定性反例，不依賴 sim 的觀眾分佈。G2 的「建設中有限進度」與每票保底同時成立需要額外產品決定，未宣稱已完成。

當時供 owner 決定的最小方向（後由下方決定修正成有條件輪替）：保留原能源規模及佔比規則，讓每類能源根據該類累計票數的奇偶切換兩個可辨認的維護／構件配置（而非假稱持續建設）；每次選中該能源都切換，即使已滿額亦適用。選中的配置必須存於 server-authoritative layout、由相同 counts 重建，並貫通 headline、camera、card、動畫和 immediate snapshot／Undo／replay；能源互相稀釋引起的真實退回仍照實描述。這會使已成熟設施交替變化，屬批准的「未過門檻逐段建設」以外的產品語義，不能自行拍板。另一選項是保留有限建設段並明確放棄每票保證。兩者均需之後實作並完成視覺、draw calls 及 G6 gates；真人 gate 由 owner 一人在家完成。G1 owner 已定每提案最多一 site 一格，±1 只限制候選，並非全局限制。

2026-10-30 owner G2 decision：加入成熟能源設施兩種可辨認配置；沒有其他與訪客相關變化時輪替，令每票有近鏡與變化。保留累積城市及 replay／Undo 一致性，驗證全部能源、滿額和重複投票；畫面及文案必須實際可辨認且準確。條件輪替不能單靠每類全部票數奇偶計算，必須按有效提案次序 fold 並重建，亦須涵蓋所選能源尚未啟用時的可見狀態。

2026-10-30 G2 候選：shared ladder fold 按先前配置、該票與 site 變化切換所選能源 activity；四類各 40 次中間票及 200×40 偏向 sim 的每票 guest headline 通過。資料重播可重建 activity、Undo 恢復完整 view；本輪已拍四種首次／成熟重複票 live 原圖，E4 browser 回歸通過；三次採樣的非陰影最低 draw calls 各增加 6（約 0.7–1.0%），未配對的陰影重繪最壞值仍待驗證。詳見 VALIDATION 及 relay result。候選仍待畫面與真人 gate，不可標記 G2 驗收或合併。Owner 定每份最多一 site 一格、±1 為候選條件；真人 gate 一人、在家。

2026-10-31 G7 partial checkpoint：NW／SW／SE district 將本次 pulse 同一組實際變動位置交予 `CarrierChange.points`，包括 quiet／即時更新；同一目標清空舊位置，正反方向的 slot 位置有測試。其後候選加入固定 viewpoints、覆蓋數及最久未用平手輪替、無 points fallback；真實提案與合成 seed 測試有原圖，完整視覺／near-plane、性能和 owner 真人 gate 仍待驗收。原有 `*:district` 鏡頭保留為 fallback，先推近後變化時間線未改；G2 視覺、陰影最壞 draw calls、G4／G6 和 owner 真人 gate 仍未驗收。

2026-10-31 G7 候選：NW／SW／SE 將 pulse 對應 slot 座標及 ID 傳給鏡頭，64 個手寫固定視角按已聲明覆蓋數選最多、平手選最久未用，±1 保持 focal，無 points 用既有 district；NW 全城交通變化亦標記街道。40 真實 scratch 提案記錄 22 種 shot，page exception 0、方向／pose 類別及時點檢查無失敗；最後一次只調整未被該 40 次選中的街道 pose，另以真實 8 票序列觸發街道並保存三時點／結果卡。固定 seed 的 ±2↔±3 及合成 0→±2 已拍，0→±2 非真實單份提案（owner 每份一格）。原圖及時間在 relay G7 result；更多數字、方法及限制見 VALIDATION。

G7 未達完整視覺驗收：64 個保守目標包圍盒只排除自身跨 near plane，未證明其他建築／飛行器全程不遮擋；部分 SE 畫面仍難辨、SW court3 與 focal 重疊需 review；街道卡片遮住部分海且左側有近景柱。SE 單次 FPS／calls 最高 1191 對原 district 中位數 718，陰影重繪未配對，性能 gate 不能宣稱通過。G2 水庭視覺與陰影最壞值、G4／G6、展覽硬件和 owner 一人在家的兩秒辨認仍待驗證。不要 merge 或將候選標記接受。

最終檢查（2026-10-31）：root／survey 各 `npm test`、`npm run build` 通過；root build 有既有 JSON import attributes／chunk-size 提示。曾試兩條街道多段、不同高度與方位，最終用實際街道 `.8` 路段；真實 8 票第 8 票選中街道，車流和卡片上方海面可見，左側近景柱與其他場景的全程遮擋仍待 review。40 票使用的其他 pose 在最後一次僅街道 pose 改動時未變；街道本身已單獨以真實序列重測。原始數據與定位限制見 VALIDATION 和 relay G7 result。實作候選供 coordinator review，G7／G4／G6 及 owner 兩秒真人 gate 不標記通過。

2026-11-01 recovery：機器重啟令 `/private/tmp` checkout 消失，Codex 於持久 checkout（基於 `6e3514f`，branch `codex/guest-agency-recovery`）重組 G1–G3、G7 與 G2 候選；部分檔案只由紀錄還原，未能逐位元證實與原 commit 相同。接手後 root `npm test`（修正 `energyPrototype` 靜態 batch 上限：加入 8 個 activity frame，由 `< 50` 改為 `< 50 + 3 * 8`）、root／survey `npm run build`、survey `npm test`、`git diff --check` 均通過。G5 文案（owner 暫緩）、G4 視覺（SW court3 與 focal 重疊、SE 難辨、街道前景柱、水庭構圖）、陰影配對性能、owner 一人在家兩秒辨認仍未完成；不 merge、不 push。

2026-11-01 court3／street 鏡頭：`sw:court3` 改為 [-122,60,360]→[-110,3,230]（原 [-145,113,330]，太貼近俯視、前景柱）；`nw:street` 改為 [213,75,-345]→[113,4,-333]（原 [203,65,-423]，前景大樓佔左邊，海面少）。各試 8 個 130／100 m 方位候選，靜態 high 狀態日（12:00）與夜（22:00）檢視；court3 日間地面仍偏白、僅靠紅傘分辨，街道左側仍有屋頂佔約 1/4。未測 live 過場、遮擋／near plane 全程。root `npm test`、`npm run build` 通過。
