# build-transition — 共用「起樓／拆樓」轉場（SE 原型）

- Owner: cc100053（唯一視覺驗收人）
- Status: IN_PROGRESS — SE 原型完成，等 owner 睇畫面決定去留／調整，先至推去 NW／SW
- Branch: `claude/build-transition-7716d4`
- Base commit: `4495f05ee344a5694a9bf1e2b15107319627e5ff`
- Last verified commit: 本 handoff 所在 commit（root `npm test`／`npm run build`／`git diff --check` PASS）
- Remote availability: `origin/claude/build-transition-7716d4`

## Session Git state

- Session starting branch and HEAD: `claude/build-transition-7716d4` `4495f05ee344a5694a9bf1e2b15107319627e5ff`（worktree，clean）
- Last fetched origin/main commit: `4495f05ee344a5694a9bf1e2b15107319627e5ff`（2026-11-10；HEAD 同 origin/main 0/0）
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED（未合併 main，等 owner 視覺批准）
- Pending Git conflicts or synchronization blockers: `chore/closeup-frequency-sheet` 同時改緊 `src/headlineCamera.ts`（`SHOTS`／`VIEWPOINT_COVERAGE`）、`tests/headlineCamera.test.ts`、`docs/EXHIBITION_SPEC.md`、`docs/PROJECT.md`、`docs/handoffs/guest-agency.md`；本任務冇掂呢啲檔案，文件同步（PROJECT／VALIDATION）留返嗰個 branch 合併之後先做。

## Goal and acceptance criteria

`docs/handoffs/guest-agency.md` 嘅硬門檻：每位客人喺近鏡入面兩秒內認得出自己帶嚟嘅變化。8000 個模擬提案（唔係真客人）顯示約 64% 近鏡落喺 37 個 district slot 視點，只有約 32% 落喺 5 個 focal 鏡頭，所以 owner 2026-11-10 決定打磨「轉場本身」：寫一次、任何變咗嘅 slot 都播嘅共用「起樓」編排。

本階段（原型）完成條件：SE district（塔＋pod）兩個方向都播；live result（`city-state-updated`）播、即時路徑（snapshot／reset／Undo／reconnect／reduced motion）唔播；有 timing／state 測試；有日夜截圖同 draw call 數字；owner 睇完先決定推唔推去 NW／SW。**視覺接受只係 owner 一個人話事。**

## Trace of the current path（設計前）

- `resultTimeline.ts`：`shotTimeline()` → vote journey ≈2.62 s → fly-in 2 s → settle 0.5 s → `change` = 5.12 s，之後 `SITE_TRANSITION_SECONDS` = 3 s。
- `main.ts`：live result 用 `applyExhibitionLayout(layout, 'city-state-updated', at + shotTimeline().change, seeds, at)`，即係變化「排定」喺未來開始；`sampleAt` 係而家。
- `CityChangeManager.applyExhibitionLayout`：`fresh = kind === 'city-state-updated' && !prefersReducedMotion()`，`immediate = !fresh`；只有 headline 嗰個 site 唔係 `quiet`。每個 district `setTarget(layout, now, immediate, seed, quiet, sampleAt)`，再由 `changedPoints` 砌 `CarrierChange.points` 俾鏡頭揀 slot。
- `SlotLevels`：每個 slot 0..1，`setTargets` 記低 `changed`，`update` 用 smoothstep 喺 3 s 內由 `from` 去 `to`；`immediate` 直接跳。
- `ConcentrationDistrict.write()`：塔＝`scale.y = level × h`（footprint 喺 level > .02 先出現）；pod＝成個 `setScalar(level)`。即係而家只係「縮放彈出」。
- `PulseRings`：每個變咗嘅 slot 兩圈淡光環＋site 一支光柱，additive、unlit，3 s／圈、兩波相隔 1.2 s；`immediate` 時 `clear()`。

## Design — 一個共用編排

`src/buildTransition.ts` 嘅 `BuildChoreography`。輸入只係一張 list：`{ x, y, z, r, from, to }`（slot 中心、半徑、質量頂由幾高去幾高，單位米）。方向由高度決定：`to > from` 起、`to < from` 拆、相等（只係配件變）就只掃一次光。唔使逐個 slot 做 authoring，塔、pod、bay、room、court 都係俾 `r` 同高度就得。

3 s 視窗內嘅時間表（`buildBeat(t)`，純函數）：

| 時間 | 起（appear） | 拆（remove） |
| --- | --- | --- |
| 0–0.45 s | Meter 色六角棚架由地面升到目標高度；三架裝配無人機由上面落嚟 | 棚架包住現有建築；無人機到位 |
| 0.35–2.45 s | 光亮「建造線」由 `from` 升到 `to`，建築頂跟住條線升；線過咗嘅樓層環變亮 | 建造線由頂落到地，建築跟住沉；線以上嘅樓層環變暗 |
| 2.45–3.0 s（收尾拍） | 棚架閃一下、變幼兼向上升走；頂部一個冠環向外擴；無人機向上飛走 | 棚架閃一下、塌落地面；地面一個環向內收；無人機飛走 |

- 建築本身跟條線：播編排嘅 `SlotLevels`（SE 嘅 tower／midRise／pod）改用 `buildProgress` easing（0.35 s 前唔郁、2.45 s 前完成），其餘 district 仍然係原本 smoothstep。終點同以前一樣，仍然喺 3 s 內完。
- 原有 `PulseRings` 照舊（唔改）。
- 材質：棚架同環用一個 `MeshBasicMaterial`（Meter 色、transparent、`toneMapped: false`）——日間係實色橙（唔係 additive，所以白色城市背景都見到），夜晚自發光；transparent basic 會被 `main.ts` 現有規則排除喺 GTAO normal prepass 之外。無人機重用 `automationKit.quadFleet`（同城市其他無人機同一套幾何同材質）。
- Draw call 成本（設計值）：播緊嘅時候 **+5 個 batch**（棚架柱 1、環 1、無人機 3），全部 instanced，同 slot 數量無關；無人機係 lit mesh，所以 GTAO prepass 再 +3 → 預計 **+8 draw／frame**；唔投影。閒置時 `count = 0` 兼 `visible = false`，**+0**。
- 即時路徑：`setTarget(..., immediate = true)` 同 `hide()` 都 `clear()`；`quiet`（唔係 headline 嘅 site）唔播，同 pulse 一樣。

## In-scope files and dependencies

- `src/buildTransition.ts`（新）：`BuildItem`、`BUILD_RIG`／`BUILD_MASS`／`BUILD_BEAT`、`buildProgress`、`buildBeat`、`BuildChoreography`。
- `src/districtMeters.ts`：`SlotLevels` 加可選 `ease`；`ConcentrationDistrict` 建立、`play`／`clear`／`update` 編排，`getDiagnostics().activeBuilds`。
- `tests/buildTransition.test.ts`（新）＋`package.json` test script。
- 冇掂：`src/headlineCamera.ts`、shot table、NW／SW／NE district、投票規則、`SITE_TRANSITION_SECONDS`、survey／module-swap。冇新 dependency。

## Completed work

- 上面設計已經喺 SE 塔同 pod 實作，兩個方向。
- 測試：時間視窗、建造線兩個方向、排定喺未來嘅開始唔會提早畫、同一 slot 再變會重新開始唔會疊、3 s 後乜都冇、`clear()` 即時；district 層面：snapshot 唔播、quiet 唔播、live 每個變咗嘅 slot 一個 build、`immediate` 取消進行中嘅 build、`hide()` 清走、塔仍然落喺 target。

## Actual validation results

- Verification status: PARTIAL（自動檢查 PASS；視覺未經 owner；真機未量）
- Date and checked commit/worktree: 2026-11-10，本 commit 嘅工作樹
- Commands: `npm ci --prefix survey`；`npm test` exit 0（包括新 `tests/buildTransition.test.ts`）；`npm run build` ✓；`git diff --check` clean。survey／module-swap 冇改，冇跑佢哋嘅 test。
- 截圖：Vite DEV `127.0.0.1:5174`，headless Chrome（Playwright，1600×900，DPR 1，software GL），`?reviewTime=20&hour=12|22&meters=se:A&metersTo=se:B&metersAge=5.12+t`，t = 0.5／1.5／2.5／3.2 s。`se:-5`（tier −2）↔ `se:-2`（tier −1）：tower1 0↔1、pod2 1↔0。DEV 面板用 CSS 收埋。
- 見下面 [Measured](#measured)。

## Measured

- 證據（Git 以外）：`~/city2127-evidence/build-transition/`——40 張 PNG（`<slot>-<appear|remove>-h<12|22>-t<0.5|1.5|2.5|2.75|3.2>.png`）、16 張 settled 對照、`sheet-h12.jpg`／`sheet-h22.jpg`（4 行 × 5 個時間）、`draw-calls.log`、`capture.mjs`。Page error：0。
- Draw call（`renderer.info.render.calls`，每 frame 所有 pass 合計；每個 URL 連續取 4 個樣本，下面係穩定值，冇計偶發嘅 shadow 重畫 frame ≈ +390）：

| 鏡頭 | settled（變化前＝後） | 轉場中 t = 1.5 s | 差 |
| --- | --- | --- | --- |
| tower1，12:00 | 994 | 1006 | +12 |
| tower1，22:00 | 995 | 1007 | +12 |
| pod2，12:00 | 942 | 954 | +12 |
| pod2，22:00 | 943 | 955 | +12 |

  +12 入面 **+8 係本編排**（同設計值一樣：main pass 5＋GTAO prepass 3），其餘 +4 係原有 `PulseRings`。分法嚟自同一載入條件嘅首個樣本：t = 1.5 s 係 1023、t = 3.2 s（編排完咗、pulse 仲喺度）係 1015、settled 係 1011。起同拆數字一樣；`activeBuilds` 轉場中 4（1 塔＋3 pod）、t = 3.2 s 係 0。
- 我自己睇 sheet 嘅觀察（唔係驗收）：日夜兩邊橙色棚架喺 0.5 s 已經企好、位置一眼認到；塔喺棚架入面升／沉睇得出；2.75 s 起＝棚架升走＋冠環，拆＝棚架塌落地＋地面環收，兩個方向分得開。Pod 鏡頭前景被 skyway 遮住一部分。
- FPS：headless software GL 約 4 fps，**唔可以當效能數字**，真 GPU 未量。

## Known issues / not measured

- **`se:pod2` 鏡頭**：本 branch 嘅 `SHOTS['se:pod2']` 仲係舊表（瞄住而家叫 pod1 嘅位）；`chore/closeup-frequency-sheet` 已經改緊。Pod 截圖用嗰個 branch 未 commit 嘅新 pose `cityPose([-173,38,7],[-103,3,17])`。新 pose 前景有藍色 skyway 橫過，遮住部分 pod——屬於 shot table，唔係本任務。
- 收尾拍（2.45–3.0 s）喺指定嘅四個取樣時間之間，所以另外補影咗 t = 2.75 s。
- Pod 棚架（r 15 m）近鏡睇偏粗；塔嘅比例較啱。粗幼而家跟 `r`，未做按鏡頭距離調整。
- 建築本身仍然係 `scale.y` 伸縮（冇用 `feat/se-build-transition` 嘅 `BuildCut` 逐像素 cut，因為 instanced 共用材質要逐 instance cut attribute＋clone 材質）。
- 一個 result 會同時變幾個 slot（例如 1 塔＋3 pod），全部一齊播；鏡頭只睇其中一個。
- 未量：真實 GPU 嘅 FPS（headless software GL 只有約 4 fps，唔代表展覽機）、展覽機、真 survey server 嘅 live 路徑（只經 DEV `metersTo` 同 Node 測試）、reduced-motion 實機（邏輯上同 snapshot 同一條 `immediate` 路徑，測試有蓋）。

## Proposal（未實作，等 owner 決定）

1. **投票規則**：SE 嘅 rung −1↔0↔+1 完全唔變 district slot（只變 focal），rung ±1↔±2、±2↔±3 每步變 1 塔＋2–3 pod。如果想更多客人見到「起樓」，可以考慮 rung 0↔±1 都郁一個 slot（例如一個 pod ↔ mid-rise）。要改 `ladderShare`／`rungStep`，會影響 `guest-agency` 嘅頻率表，所以只係提議。
2. **鏡頭揀 slot**：同一步有塔同 pod 一齊變時優先揀塔（起樓最易讀）。屬於 `headlineCamera`（另一個 session 範圍），只係提議。

## Next expected step

Owner 睇 `~/city2127-evidence/build-transition/` 嘅 sheet → 決定：接受／調（棚架粗幼、顏色、無人機、收尾拍）／唔要。接受之後先至：(a) 推去 NW bay、SW room／court（每個 district 加一段砌 `BuildItem` 嘅 code）；(b) 喺真 GPU 量 FPS；(c) `chore/closeup-frequency-sheet` 合併後同步 PROJECT／VALIDATION／EXHIBITION_SPEC；(d) 按 CONTRIBUTING 合併。**未得 owner 視覺批准唔好 merge main。**
