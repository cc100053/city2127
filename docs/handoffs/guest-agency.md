# guest-agency — 每位 Guest 都有近鏡＋明顯變化

- Owner: cc100053（產品方向 G0 決定、最終 review）；實作：待定
- Status: PLANNED，G0 已批准（2026-10-29 owner：「跟 suggestion 去做」，並加 G7 變化位置近鏡）；未開工
- Branch: `feat/guest-agency`（由 verified main 開；依賴 `feat/closeup-zoom` 先 merge）
- Base commit: `2050883`（2026-10-29 fetch，main／origin/main 0/0）
- Last verified commit: NONE
- Remote availability: NOT PUSHED

## 目標

每一份提案（每位 Guest）結果時段內一定：

1. 有 headline → 一定觸發近鏡（zoom in）。
2. 近鏡入面睇到一個**明顯**、**同佢投票方向一致**嘅變化（先睇到之前，再睇到之後）。
3. 結果卡講得出「你嘅聲音令呢度變咗」，而唔係講一個同佢無關嘅變化。

## 現況（main `2050883` 實測，唔係推測）

近鏡只喺 `pickHeadline` 有結果先播（[cityChangeManager.ts](../../src/cityChangeManager.ts) line 125、[main.ts](../../src/main.ts) line 199）。`pickHeadline` 只睇 before／after layout，**唔睇呢位 Guest 投咗乜**（[cityView.ts](../../survey/src/shared/cityView.ts) line 240）。

[agencySim](../../artifacts/guest-agency/agencySim.ts)（真 reducer＋`ladderStep`，200 run × 40 位偏向型 Guest，唔係真人數據）：

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
   呢個改動會改「一票之聲，唔係規劃師」嘅平衡：城市會更跟住最近嗰位 Guest 搖擺。限制係 tier 永遠喺累積分數目標 ±1 格之內，所以長遠仍然係累積結果。

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

- 真人辨認 gate 人數／場地未定。
- 依賴 closeup-zoom T／F 先 merge。
- Sim 用嘅 Guest 偏向模型係假設；真實展覽可能有更多中間選項。
- G1 改咗 replay 規則：現有 run 重新 fold 後格數會變，reload 時城市可能同之前唔同。展覽前要開新 run，或者 owner 接受。

## Next expected step

1. closeup-zoom T／F merge main（G7 嘅 district 部分要同佢協調，見 G7 第 5 點）。
2. 由 verified main 開 `feat/guest-agency`，做 G1 → G3 → G2 → G7 → G5，每個一個 checkpoint commit。
3. G4／G6 驗證，交 review 包到 `artifacts/guest-agency/final/`。
4. Owner 定真人辨認 gate 嘅人數同場地。

## 進度

（實作者開工後填）
