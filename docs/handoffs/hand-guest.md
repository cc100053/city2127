# 手部操作接入來賓頁（M2、M3）

- 負責：Claude（rex 指派，2026-11-23）
- 分支：`claude/hand-m2`（基於 `claude/hand-m1` abcd1665），未合併
- 前置：[手部追蹤 spike（M0、M1）](hand-spike.md)

## 範圍

`/guest?hand`（亦可 `/guest?station=A&hand`）由 `guestDebugView.ts` 延遲載入 `survey/src/ui/hand/handGuest.ts`；未加 `hand` 時頁面與既有 bundle 行為不變，觸控流程不變，伺服器業務邏輯未改。

- 追蹤：沿用 `hand/handTracker.ts`（worker-gpu，`numHands: 1`，既有後備路徑）與 `hand/handPointer.ts`。
- 目標：`#app` 內可用的 `button`、`label.guest-choice`、`.guest-review-row`（整列即「変更」）。以 `elementFromPoint` 命中，未命中時磁吸至 56 px 內最近目標。停留 1.0 秒（游標外環顯示進度）或捏合即 `.click()`；選項卡點擊其中的 radio，使既有 change 處理器記錄草稿。
- 啟用規則（`hand/handTargets.ts` 的 `TargetGate`）：觸發後所有目標冷卻 600 ms，觸發的目標須離開後才重新啟用；畫面（`data-screen` + 標題）改變時，游標下第一個目標同樣須先離開，避免新畫面的按鈕自動觸發。
- 自動前進（僅手部模式，`AutoAdvance`）：手選選項後顯示 0.8 秒確認條，再以 `requestSubmit()` 送出問題表單（與「次へ」同一路徑，最後一題進入確認畫面）。「前の質問へ」照常可用。
- 歡迎畫面：未見手時提示「画面に手をかざしてください」，見到手後提示對準「はじめる」並使其發光；手在畫面中每秒呼叫一次 `resetIdleTimer`。
- 確認畫面：答案列成為 2x2 大卡片（卡片本身即「変更」目標），送出按鈕加大。
- 失敗：非安全來源、相機權限、模型或 worker 全部失敗時，維持觸控並顯示一行狀態「手の操作は利用できません。画面をタッチして操作してください。」；`visibilitychange` 時停止／重啟相機。
- 樣式：`hand/handGuest.css`，只作用於 `.guest--hand`／`.hand-layer`；沿用 graphite 主題，僅放大目標、壓縮外框留白（iPad 橫向 1180x746 不需捲動），加上游標、停留環與角落手部骨架指示。
- 開發統計：每 10 秒 POST 至 `/api/dev/hand-spike-log`（`kind: "hand-guest"`、`build: "m2"`、目前 `screen`）；端點回 404（未設 `SURVEY_DEV_HAND=1`）後停止。
- DEV-ONLY：`&dev-hand` 以 `window.__handDev.hold(x, y, pinch)`／`release()` 輸入合成手部，取代相機（只由網址參數啟用，同 `dev-auto` 的作法）。

## 驗證（2026-11-23，Mac）

- `survey/`：`npm test`（含新增 `tests/handTargets.test.ts`）、`npm run build`、`git diff --check` 通過。
- `npm run test:hand-browser`（`tests/handGuest.browser.mjs`，使用既有 Playwright，`CITY2127_PLAYWRIGHT_PATH`）：自行啟動輪換題組（`questions.rotation.v1.json`）與暫存 DB 的伺服器，確認未加 `hand` 時不載入手部層，再以合成手部完成 歡迎 → 四題（兩題停留、兩題捏合）→ 確認 → 送出 → 結果，記錄 1 筆提案，無頁面錯誤。截圖存於 `artifacts/hand-m2/`（未提交）。
- 未驗證：iPad Safari 上的實際相機操作、真實手部的磁吸與捏合手感。

## 下一步

rex 於 iPad 開啟 `https://<Mac LAN IP>:8443/guest?station=A&hand` 完成數輪真實操作；依手感調整停留時間、磁吸半徑與自動前進延遲。全息風格屬 M3。

## M3 版面模擬（分支 `claude/hand-m3`，僅設計審閱）

- rex 決定：只以捏合選擇（指向僅預覽，無停留選擇）；張開手掌或手放低、離開範圍時游標隱藏且無法觸發，只有伸出食指才顯示游標；上方約三成為純文字區；每題出現後鎖定 1.5 秒供閱讀；選擇後短暫顯示「A を選択しました」約 0.6 秒即自動前進（rex 2026-11-23：取消「やり直す」，1.5 秒內來不及操作；要改答案用「前の質問へ」或確認畫面）；保留確認畫面（4 張答案卡 + 大送出）；送出後以向上箭頭與光束引導觀看上方大螢幕（iPad 位於大螢幕下方 20–30 cm），隨後減光；歡迎畫面改為「住民登録」（張開手掌掃描約 1.5 秒 → 捏合登錄 → 住民番号）；沿用 graphite 配色，全息風格延後；觸控保留為後備；大螢幕「新住民」提示另立任務。
- `/hand-mock`（`survey/handmock.html`、`src/ui/handMock.ts`、`src/ui/handMock.css`）：DEV-ONLY 靜態版面，僅在 `SURVEY_DEV_HAND=1` 時提供；`?s=<畫面>` 切換、`?shot` 隱藏切換列、左右鍵切換。畫面：welcome-idle、welcome-scanning、welcome-pinch、registered、question、question-hover、picked、review、submitted-look-up、dimmed。
- 截圖（1180x746、未提交）：`artifacts/hand-m3-mock/01-…10-*.png` 與 `contact-sheet.png`。

## M3 實作（分支 `claude/hand-m3`）

M2 的停留選擇、磁吸半徑 56 px 與 0.8 秒自動前進已由下列行為取代；`/guest` 未加 `hand` 時不變，伺服器業務邏輯未改。

- 只以捏合選擇：`TargetGate` 以無限停留時間使用，指向只會預覽（卡片浮起、「つまんで選ぶ」），捏合才 `.click()`；冷卻 600 ms，磁吸 48 px。
- 休止狀態（`hand/handPose.ts`）：初版以伸食指為控制，已由 M3b 改為張開手掌（見下）；`PoseFilter` 150 ms 遲滯。
- 版面（`hand/handGuest.css`）：全螢幕；上方文字區（進度點、題目、背景）無任何目標；下方 3 張大選項卡（A/B/C 圓標）；「前の質問へ」為左緣窄條；「次へ」隱藏。每題出現後 `ReadLock` 鎖定 1.5 秒並顯示「読み終わると選べます」。
- 選擇：捏合後卡片金色閃爍 0.5 秒，再以表單 `requestSubmit()` 前進（最後一題進入確認）；不設取消窗口，修改用「前の質問へ」或確認卡。
- 確認：2x2 答案卡（捏合 = 該題「変更」）與大「この声を街へ届ける・つまんで送信」。
- 歡迎「住民登録」（`Registration`）：手掌輪廓與掃描環；張開手掌約 1.5 秒填滿（短暫中斷 250 ms 內保留，否則回退）→「つまんで登録」捏合 →「住民登録完了」與住民番号（頁面 `cityGuestCount` + 1，僅顯示）1.5 秒 → 點擊既有「はじめる」。手離開 4 秒則重來。「手の形は保存しません」；右下「タッチで始める」。
- 送出後：頁面進入 `result`（即既有 `displayWaitMs` 排程的大螢幕播放開始）時顯示上望畫面（頂緣光、光束、上行箭頭、「上の画面をご覧ください」「あなたの声が街へ」），4 秒後減光直到既有 handoff；handoff 的「空の環を見る」等按鈕為大卡。計時與租約邏輯未改。
- 開發統計：`build: "m3"`，含 `screen`、`pose`、`registered`。DEV 掛鉤：`__handDev.hold(x, y, { pose: 'point' | 'palm' | 'rest', pinch })`。

### M3 驗證（2026-11-23，Mac）

- `survey/`：`npm test`（含新增 `tests/handPose.test.ts`：姿勢分類、遲滯、只捏合啟用、閱讀鎖、住民登録狀態機）、`npm run build`、`git diff --check` 通過。
- `npm run test:hand-browser`：手掌掃描 → 捏合登錄 → 四題捏合（每題先驗證閱讀鎖內捏合無效；第一題驗證張開手掌無游標、指向 2.5 秒只預覽不選）→ 確認 → 送出 → 上望 → 減光 → handoff，記錄 1 筆提案，無頁面錯誤；連續通過。
- 截圖：`artifacts/hand-m3/01-…11-*.png` 與 `contact-sheet.png`（未提交）。
- 未驗證：iPad Safari 上真實手部的姿勢判定（不同手型、手背／側面角度）、手掌掃描與捏合的手感。

### M3b：手掌控制（rex 2026-11-23）

- 理由：登錄用手掌，之後改為伸食指再捏不連貫；改為「張開手掌 = 控制，拇指與食指捏合 = 選擇」。版面細修延後，由 rex 之後處理。
- `classifyPose`：中指、無名指、尾指至少兩指伸直為 `palm`（控制，不要求食指，因捏合時食指會彎曲）；握拳、手掌中心低於攝影機 y 0.85、或無手為 `rest`。
- 游標錨點改為手掌中心（食指與中指 MCP 的中點，`HandPointer({ anchor: 'palm' })`），捏合時不跳動；仍取 100 ms 前位置凍結。
- 狀態提示「手のひらで操作中」／「休止中 — 手のひらを向けると操作」；第一題標題下加「手を下ろすと休止」。只捏合選擇、閱讀鎖與住民登録流程不變（登錄時同一手掌直接捏合）。
- 驗證：`npm test`（`handPose` 測試改為手掌／握拳／放低／捏合中彎曲食指）、`npm run build`、`git diff --check` 通過；`npm run test:hand-browser` 連續兩次通過（握拳與捏合不登錄、握拳與放低無游標、手掌 2.5 秒只預覽）。

## 住民の窓 production（Phase 1：第 1、2 頁，分支 `claude/hand-ui`）

基於 `claude/hand-m3` 並合併 `origin/main`。`/guest` 未加 `hand` 時行為不變（瀏覽器測試確認不載入手部層、舞台與卡片圖片）。

- 架構：`guestDebugView.ts` 仍擁有流程、伺服器呼叫與計時；新增 `?hand` 專用的檢視掛鉤（`page()`、選項 change、人數事件後通知），型別見 `hand/ui/types.ts`。全息介面一律經頁面既有控制項操作（點擊 `はじめる`、隱藏 radio、`form.requestSubmit()`、`前の質問へ`、`続ける`）。
- 舞台 `hand/ui/stage.ts`：1180x820 設計畫布等比縮放置中（1180x746 時左右留黑邊）；背景、資料欄、HUD、游標、場膜與全頁唯一 rAF（文件隱藏時暫停）。每幀只寫 transform／opacity；版面座標於換畫面時以 offset 取得並快取。歡迎與問題畫面由舞台繪製，`#app` 隱藏；確認、上望、handoff 仍為 M3。發生需「新しい予約で草稿を続ける」的錯誤時改回頁面 DOM。
- 第 1 頁 `page1Register.ts`、`scan.ts`：張開手掌任意位置集氣 4 秒（24 格機械收緊、全畫面向光環收縮、城市數據吸入最多 44 粒、生體讀數），鎖定 150 ms 琥珀色，三層場膜釋放 700 ms 後才接受捏合 → 住民番号（`cityGuestCount + 1`，僅顯示）→ 1.5 秒後點擊 `はじめる`。光環內骨架為鏡像的 MediaPipe 21 點（未見手時不顯示）。準備捏合時手離開 4 秒重來；「タッチで始める」保留。
- 第 2 頁 `page2Question.ts`：卡片砌出（夾爪 → 連線 → 逐層列印＋文字解碼 → 字母）兼作 1 秒閱讀鎖；鎖後即可預覽（rex 2026-11-23 取消「須先移離卡片一次」）；停留時掃描線由線框揭示圖片；捏合 → 鎖定 → 場膜 → 晶片飛入 HUD 進度格 → 表單前進。揭示用兩層相反 translate，不用 clip-path；不使用動畫 filter。
- 卡片圖：`scripts/buildHandCards.mjs`（macOS `sips` + Homebrew `cwebp`）由參考圖產生 `hand/assets/<題>-<選項>.webp`（已烘焙灰階、對比與青色漸層）與 `-wire.webp`（Sobel 線框），輸出已提交。目前僅 Q02、Q03、Q06 有圖，其餘選項使用藍圖線稿。伺服器加入 `.webp` MIME。
- 調整：`&tune` 顯示面板，值存於 localStorage `handUiTune`；第 1 頁鍵名加 `reg` 前綴；第 3–5 頁鍵已列入預設表但尚未使用。`&fps` 顯示描畫 fps、p95 幀時間與推論頻率。
- 字型：專案未自帶字型，使用系統後備（Hiragino、Menlo），不依賴網路。

### Phase 1 驗證（2026-11-23，Mac）

- `survey/`：`npm test`（新增 `tests/handScan.test.ts`）、`npm run build`、`git diff --check` 通過。
- `npm run test:hand-browser` 連續兩次通過：握拳與掃描中捏合不登錄 → 4 秒掃描、鎖定、釋放 → 捏合登錄 → 四題（每題閱讀鎖內捏合無效；第一題驗證移離規則、握拳無游標、停留只預覽）→ M3 確認 → 送出 → 上望 → 減光 → handoff，記錄 1 筆提案，無頁面錯誤。
- headless Chromium（Mac，1180x820，DPR 2）rAF 幀時間 p95：第 1 頁掃描 16.7 ms、第 2 頁砌出 16.7 ms、選擇與晶片飛行 16.8 ms（最大 33.4 ms）。此數據不代表 iPad。
- 截圖：`survey/artifacts/hand-ui/p1-*.png`、`p2-*.png` 與 `contact-sheet.png`（未提交；截圖時延長鎖定與晶片時間）。
- 未驗證：iPad Safari 上的真實手部、效能與觸控。

### 下一步

rex 於 iPad 測試第 1、2 頁；之後 Phase 2 實作第 3–5 頁（確認、上望、handoff）。
- 手部模式下，復原的草稿若伺服器回 `session_not_found`（重設或新的展示 run）且無待確認送出，即清除草稿回到住民登録；原因是手在畫面中會持續重設閒置計時，舊草稿無法自行結束（rex iPad 測試時因此進不到住民登録）。未加 `hand` 時行為不變。瀏覽器測試以舊草稿開頁驗證。
