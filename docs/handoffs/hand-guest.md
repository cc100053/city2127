# 手部操作接入來賓頁（M2）

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

- rex 決定：只以捏合選擇（指向僅預覽，無停留選擇）；張開手掌或手放低、離開範圍時游標隱藏且無法觸發，只有伸出食指才顯示游標；上方約三成為純文字區；每題出現後鎖定 1.5 秒供閱讀；選擇後顯示「A を選択・やり直す」1.5 秒（捏合可取消）再自動前進；保留確認畫面（4 張答案卡 + 大送出）；送出後以向上箭頭與光束引導觀看上方大螢幕（iPad 位於大螢幕下方 20–30 cm），隨後減光；歡迎畫面改為「住民登録」（張開手掌掃描約 1.5 秒 → 捏合登錄 → 住民番号）；沿用 graphite 配色，全息風格延後；觸控保留為後備；大螢幕「新住民」提示另立任務。
- `/hand-mock`（`survey/handmock.html`、`src/ui/handMock.ts`、`src/ui/handMock.css`）：DEV-ONLY 靜態版面，僅在 `SURVEY_DEV_HAND=1` 時提供；`?s=<畫面>` 切換、`?shot` 隱藏切換列、左右鍵切換。畫面：welcome-idle、welcome-scanning、welcome-pinch、registered、question、question-hover、picked-undo、review、submitted-look-up、dimmed。
- 截圖（1180x746、未提交）：`artifacts/hand-m3-mock/01-…10-*.png` 與 `contact-sheet.png`。
