# closeup-next — 近鏡後續、能源講解同待修項目

下一個 agent 嘅入口文件（2026-10-29 寫）。冇 chat 歷史都可以由呢度開始。佢唔取代 [closeup-polish](closeup-polish.md)：A–D／Z 嘅標準同進度仍然以嗰份為準（最新版喺 `origin/feat/closeup-polish`，唔係 main）。

- Owner: cc100053（產品／審美決定）；實作：下一個 agent，開工時喺「進度」記低 session。
- Status: PLANNED
- Branch: 每個工作包一條，見下面；C1 用現有 `feat/closeup-polish`。
- Base commit: `3d0f40ebd5d7350ecdcc05ab3420cacf926dfd9a`（origin/main，2026-10-29 fetch）
- Last verified commit: NONE（本文件只做文件／連結核對）
- Remote availability: 本文件連同 F2 文件修正同 energy-demo 歸檔經 `docs/closeup-next` merge 入 main。

## Session Git state（寫呢份文件嗰個 session）

- 開始時：主 checkout `/Users/fatboy/city2127` 喺 `feat/energy-demo-camera` @ `016f6d1`，對 upstream 0/0，對 origin/main 2 ahead／25 behind。
- Fetch：2026-10-29 成功，origin/main `3d0f40e`。
- 未追蹤 `.playwright-cli/`、`.task-relay/` 保留冇改。`.task-relay/closeup-polish/` 係近鏡 relay 嘅狀態（`state.json` revision 20，batch D，`REVIEW_READY`），連埋獨立 clone `.task-relay/closeup-polish/checkout`（`feat/closeup-polish` @ `4a3ad9f`，clean，0/0）。
- 本 session 由 origin/main 開 `docs/closeup-next`，冇郁 `feat/closeup-polish`。

## 2026-10-29 owner 決定

1. 近鏡打磨「開工」。實際狀態：A–D 已經各自做完有限輪數（A／B 三輪；C 嘅 focal／district 三輪、ring 兩輪；D 嘅 NW／wing 三輪、garden2／island 兩輪），全部係 `REVIEW_READY`，**所有 sector 嘅美術 gate 都仲係 FAIL，worker 同 coordinator 都建議唔接受**。所以「開工」即係繼續 relay 嘅下一步（C1），唔係由 A 重新做。
2. energy-demo 原型「講解儲能週期」嘅做法帶入近鏡嘅能源部件階段（N1）。`feat/energy-demo-camera` 刪除：source、test、完整 diff 同截圖已經存喺 [artifacts/energy-demo-camera](../../artifacts/energy-demo-camera/reference/devEnergyDemo.ts)，handoff 歸檔去 [archive/energy-demo-camera](archive/energy-demo-camera.md)。

## 工作包（按次序）

### F1 — 修 E4 正式 browser runner（細，可以即刻做）

- 問題：[tests/energyE4.browser.mjs:91](../../tests/energyE4.browser.mjs) 等 `街のエネルギー設備は今の配置`，[:100](../../tests/energyE4.browser.mjs) 等 `蓄電庭園は1か所`。meter-ladder（`0b84a29`）之後，結果卡會先講 headline 嘅 Meter 偏好，所以兩句都可能唔出，runner 會 timeout（[失敗 log](../../artifacts/closeup-polish/S0/formal.log)）。呢個 runner 唔喺 `npm test`，CI 捉唔到。
- 修法：搬 S0 副本 [artifacts/closeup-polish/formal.mjs](../../artifacts/closeup-polish/formal.mjs) 嘅 `headlineResult(view)`（line 66–76，用 `pickHeadline` + `residentResult` 揀預期文字），連埋佢需要嘅 import，替換上面兩個 wait。其他斷言、quality 同 timeout 一律唔改；S0 嘅 coordinator review 已經接受咗呢個改法。
- Branch：`fix/energy-e4-headline`，由 main 開。
- 驗證：`npm ci --prefix survey`，然後 `npm run build --prefix survey`（runner 用嚟做 scratch fixture），再跑 `node tests/energyE4.browser.mjs`，要 PASS，page exception 0，只容許預期嘅 favicon 404／obsolete 409／注入嘅 abort。另外跑 root `npm test && npm run build && git diff --check`。
- [tests/energyE5.browser.mjs](../../tests/energyE5.browser.mjs) 只等 `サーバー: 接続済み`，唔受影響，唔使改。
- 同 `feat/closeup-polish` 冇重疊檔案；照 [CONTRIBUTING](../CONTRIBUTING.md) merge 入 main，然後確認 main CI。

### F2 — 文件狀態過時（本 session 已改，下一個 agent 只需核對）

- [EXHIBITION_SPEC](../EXHIBITION_SPEC.md)：住宅「正式歸屬尚未選定」改成 owner 2026-10-27 選咗 A，production 已有固定住宅。
- [handoffs README](README.md)：住宅行改成 SOFTWARE COMPLETE A，加本文件一行，歸檔數目更新。
- [energy-city](energy-city.md)：E5「main 發布／CI 待核對」改成已核實（`db772bb`，[CI 40069808324](https://github.com/cc100053/city2127/actions/runs/40069808324) success）。
- [headline-camera](headline-camera.md)：參考 source 由已刪分支改指 artifact 副本。
- 衝突提示：`feat/closeup-polish` 都改咗 SPEC（line 82 之後）同 handoffs README 嘅近鏡行。F2 改嘅係其他行，預計 merge 唔會撞；如果撞到，兩邊都保留。

### C1 — 近鏡 relay：D review → Z → owner review

- 狀態來源：`.task-relay/closeup-polish/state.json`、`result-{A,B,C,D}-1.json`、`coordinator-review.md`（A／B／C 已 review，**D 未 review**），同 branch 版 [closeup-polish](closeup-polish.md)（`git show origin/feat/closeup-polish:docs/handoffs/closeup-polish.md`）。
- 協調：relay coordinator thread `01a17f7b-9fb1-7242-82ee-e9446e399397`（Codex）。開工前先確認佢係咪仲 active；如果係，C1 歸佢，你唔好同時寫 `feat/closeup-polish`。如果唔係，就喺 `state.json` 同本文件記低接手。
- 步驟：
  1. Review D：result `closeup-polish-D-1-ddeb642a…`，checkpoint `4a3ad9f`，runtime `44521a0`。對住 `3bb99ce..4a3ad9f` 嘅 source diff 同原圖做，做法同 coordinator-review.md 裏面 A–C 嗰幾段一樣。
  2. Z：照 closeup-polish 第 5 步做。全部 13 個 shot 加 hero，用目前累積 source 喺 S0 條件下重截，同 S0 比較。用 survey `dev:auto` 每個 sector 播一次 live。Chrome 版本由 S0 嘅 `.48` 變咗 `.73`，要記低，唔可以當成同版本比較。
  3. 將 A–D 嘅 `REVIEW.md`（`artifacts/closeup-polish/<A–D>/REVIEW.md`，喺 feature branch 上）交畀 owner。冇 owner 批准，任何 sector 嘅美術都唔准 merge 入 main。
- 要 owner 決定（C1 完成之後問，唔好自己決定）：
  - A／B／C／D 每一區：接受、部分接受（例如只要 pose，唔要 builder），定棄用。B 嘅 r3 focal 比 r2 差，前景支柱擋住廣場。
  - A3／A4 門檻：A3 喺所有 sector 差唔多全部 FAIL，A4 只有大約 1–10% 過關。S0 coordinator 已經指出 A3 嘅 world-AABB 取樣空隙唔可以靠加實心美術修好。要 owner 揀：維持門檻、修改量度定義，定接受現狀。**唔准靜靜放寬。**
  - 要唔要第四輪：需要 owner 另外授權。

### N1 — 能源部件講解階段（Z 同 owner 決定 C／D 能源 shot 之後先開）

目標：live 結果嘅 headline 係能源部件（`energy:garden`、`garden2`、`ring`、`wing`、`island`）嗰陣，近鏡停留期間播一次壓縮咗嘅儲能週期（充能 → 暫存 → 釋能），配一行講解，等觀眾睇得明個設施點運作。

- 已經喺 main 嘅部分（唔好重做）：揀邊個部件同 pose 已經由 [headlineCamera.ts](../../src/headlineCamera.ts) 嘅 `headlineShot` → `energyChangedPart` 同 `SHOTS` 做咗；時間線係 `shotTimeline`（journey 0–2.62 s → fly-in 1.5 s → hold 到 `DISPLAY_MS`＝10 s → fly-out 2 s）。
- 由原型帶過嚟（[reference](../../artifacts/energy-demo-camera/reference/)）：
  - `ENERGY_PHASES`：將 [devEnergy.ts](../../src/devEnergy.ts) 入面 `phases` 嘅文字 export 出嚟共用（見 `prototype.diff`）；wing／island 用原型 `COPY` 嗰三步。
  - 能源鐘：講解要由「充能」開始，將 60 s 週期壓入可用嘅時間。原型個 `shortcut:` 會令其他能源部件跳相，正式做要逐個部件計 phase offset，或者只覆蓋被講解嗰個部件。
  - 字幕面板：原型用 `.causal-panel.energy-demo`，放喺左下。
- 要解決嘅原型問題：
  - 時間太短：部件 fade-in 喺 2.62–5.62 s，所以真正有得講解嘅時間大約係 5.62–10 s，即係 4.4 s，每個 phase 大約 1.5 s。原型每步 3 s 嘅可讀性都未驗證過。**要 owner 決定**：維持 10 s slot（一個 phase 一句短文，或者只講兩步），定延長 slot。延長會改 `DISPLAY_MS`／survey 時序，屬產品改動，唔喺近鏡範圍。建議先喺 10 s 內做，量咗可讀性先再問。
  - 近距離睇，水庭三個 phase 幾乎一樣，要加強水位、水流同渦輪嘅可見動作（[energyPrototype.ts](../../src/energyPrototype.ts)），唔可以淨係靠字幕。
  - 結果卡（右上）同字幕講嘢要一致，唔可以一個講 Meter 偏好、一個講能源；要定好由邊個講乜。
  - reduced motion：沿用 devEnergy 嘅靜態閱讀文字，唔播週期。
  - Snapshot、Undo、reset、reconnect 同連續兩個 live 結果，都要即刻取消講解，並將能源鐘還原。
- Branch：喺 C／D 嘅能源美術有決定，並且 merge（或者棄用）之後，由 main 開 `feat/energy-narration`。`headlineCamera.ts`、`energyPrototype.ts`、`main.ts` 喺 `feat/closeup-polish` 都有改，提早開工會撞 conflict。
- 驗收：
  - Unit test：phase 文字對應、壓縮時間線放得入 hold、取消會還原鐘。
  - 每個部件喺 browser 用 scratch `dev:auto` 跑一次真 live，截圖充能同釋能。
  - 對每個能源 shot 跑 closeup-polish A5 效能，同埋 A6。
  - 跑 root `npm test`／`npm run build`／`git diff --check`。
  - 要 owner 睇圖批准先 merge。

### F3 — 性能證據缺口（BLOCKED：等 owner 安排硬件）

- E5 嘅 30 分鐘長跑冇鎖 OrbitControls，鏡頭會飄，所以唔係固定 hero 嘅 benchmark，亦計唔到能源額外食幾多 GPU。
- 住宅 default quality 只短測咗 30 s（35.73 FPS）；E5 同一部 Mac 上，default 係 31–36 FPS，low 係 59.9 FPS。
- 下次要喺展覽硬件上鎖住 hero（`controls.enabled=false`，加記錄軌跡）重跑，default 同 low 各一次。喺開發 Mac 跑出嚟嘅數字唔可以當展覽結果。

## 其他仍待 owner 決定（呢份文件唔處理，記低免得漏）

- 儲能環同接收翼嘅美術：兩者已整合 main，但係 handoff 仲寫「原 target 達成仍待總指揮審美 review」；接收翼喺 hero 好細（[receiver-wing-polish](receiver-wing-polish.md)、[storage-ring-polish](storage-ring-polish.md)）。
- 展覽預設畫質（default 定 low）、展覽硬件，同實機／訪客測試幾時做（[render-quality](render-quality.md)、[resident-experience-p5](resident-experience-p5.md)）。

## In-scope files and dependencies

- F1：`tests/energyE4.browser.mjs`，連埋佢嘅 handoff／VALIDATION 紀錄。
- C1：closeup-polish 列明嘅範圍。
- N1：`src/headlineCamera.ts`（只加講解 hook，唔改時間線）、`src/devEnergy.ts`、`src/energyPrototype.ts`、`src/main.ts`、`src/style.css`、新 test。
- 唔包括：survey server／協議、DB、四題、Meter／ladder、`DISPLAY_MS`（除非 owner 批准）、module-swap、新 GLB、部署。

## Actual validation results

- Verification status: PARTIAL（只做文件）
- 2026-10-29 `docs/closeup-next`：只檢查咗 Markdown 連結同引用嘅事實（SHA、CI run、行號）。冇跑 runtime test，因為冇改過 code。
- F1 失敗係根據 S0 log，今次冇重跑。

## Next expected step

下一個 agent 先做 F1，再核對 F2，然後按「協調」嗰點確認 C1 由邊個負責之後開始 C1。N1 要等 C1 有 owner 決定先開。
