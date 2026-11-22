# 手部追蹤 spike（M0、M1）

- 負責：Claude（rex 指派，2026-11-22）
- 分支：`claude/hand-spike`（基於 `origin/main` a0df0603），未合併
- 範圍：`survey/` 內隔離的驗證頁 `/hand-spike`，非產品；說明見 [survey/README](../../survey/README.md#m0-手部追蹤驗證頁spike非產品)

## 已完成

- `@mediapipe/tasks-vision` 1.2.3（精確鎖定），wasm 與 `hand_landmarker.task`（float16）自行託管於 `survey/public/hand/`（git 忽略，`npm run fetch:hand-model`）。
- 頁面：前鏡頭 640x480、不顯示影像、角落骨架；GPU delegate 失敗時自動改用 CPU；最大手且具黏性（他手大 30% 才奪取）；食指尖 + 中央 60% 區域 + One-Euro；停留 1 秒或捏合（遲滯、取 100 ms 前位置）選擇，600 ms 冷卻且需離開卡片才重新啟用；觸控亦可選擇；HUD；每 10 秒回報至 `POST /api/dev/hand-spike-log`（`SURVEY_DEV_HAND=1`）；visibilitychange 停止/重啟相機；錯誤訊息與再試行按鈕；螢幕喚醒鎖。
- 推論由 `requestVideoFrameCallback` 驅動；2 秒內無回呼即自動改用 rAF 路徑（`?vfc=0` 可強制）。rAF 路徑在相機幀率低於描畫幀率時會重複推論同一幀，其推論 fps 與 vfc 路徑不可直接比較。
- 伺服器：選用 HTTPS 監聽（`SURVEY_TLS_CERT`/`SURVEY_TLS_KEY`/`SURVEY_TLS_PORT`），同一處理器與 WebSocket upgrade。

## 驗證（2026-11-22，Mac）

- `survey/`：`npm test`、`npm run build` 通過；`git diff --check` 通過。
- Mac 上 headless Chromium（假相機、無手）：GPU 路徑 vfc 推論約 20 fps（相機 20 fps）、p50 約 12 ms；CPU + rAF 路徑 p50 約 14 ms；觸控選擇計數正確；統計行寫入 `data/hand-spike.jsonl`。
- 未驗證：真實手部的游標/停留/捏合流程，以及 iPad Air 上的任何數據。

## M1：推論移入 Worker（分支 `claude/hand-m1`，基於 `claude/hand-spike`）

- 目的：M0 30 分鐘測試中，有手時主執行緒同步推論（約 28 ms）使描畫降至 30–45 fps；M1 將推論移出主執行緒。
- 可重用模組 `survey/src/ui/hand/`：
  - `handPointer.ts`：DOM-free 指標邏輯（黏性選手、鏡像有效區域、One-Euro、捏合遲滯與凍結、停留、冷卻與離開後重新啟用），新增 `Predictor`（以速度外推最多 40 ms，使游標以顯示幀率移動）與 `HandPointer`；測試 `tests/handPointer.test.ts`。
  - `handWorker.ts`：module worker，HandLandmarker VIDEO 模式、兩手，先 GPU（OffscreenCanvas）後 CPU，執行期 GPU 失敗時改以 CPU 重建。
  - `handTracker.ts`：主執行緒端，`requestVideoFrameCallback` 取幀，`createImageBitmap` 後轉移至 worker，同時最多一幀在途（忙碌時丟棄）。worker 啟動失敗、送出首幀後 3 秒無結果、在途超過 2 秒或崩潰時，改用主執行緒推論；有手時每次推論後至少空出 3 個描畫幀（`?maingap=`）。模式：`worker-gpu`/`worker-cpu`/`main-gpu`/`main-cpu`，並記錄切換理由。
  - `landmarker.ts`：兩條路徑共用的 HandLandmarker 建立（worker 使用 ES module 版 wasm loader）。
- 頁面參數新增 `?mode=worker|main`、`?predict=<ms>`、`?maingap=<幀>`；HUD 與 jsonl 新增 `mode`、`fallbackReason`、`framesSent`、`framesDropped`、`rttP50/rttP95`（往返 ms）、`build: "m1"`。

### M1 驗證（2026-11-22，Mac headless Chromium，假相機、無手）

| 參數 | 模式 | 推論 fps | 描畫 fps | 推論 ms p50/p95 | 往返 ms p50 |
|---|---|---|---|---|---|
| （預設 auto） | worker-gpu | 20 | 60 | 11.2 / 28.0 | 11.7 |
| `?mode=worker` | worker-gpu | 19.7 | 60 | 9.2 / 11.5 | 9.7 |
| `?mode=main` | main-gpu | 20 | 60 | 10.6 / 14.9 | 10.6 |
| `?mode=worker&delegate=cpu` | worker-cpu | 19.7 | 60 | 25.0 / 29.2 | 25.3 |
| auto，攔截 worker 腳本 | main-gpu（切換理由 `worker start`） | 20 | 60 | 11.5 / 27.6 | 11.5 |

- `npm test`、`npm run build`、`git diff --check` 通過；各模式的 10 秒統計行皆寫入 jsonl。
- 未驗證：真實手部（游標外推、捏合、主執行緒節流在有手時的效果）與 iPad Safari 上的 worker GPU。

## 下一步

M1：rex 在 iPad Air 插電、持續操作 15 分鐘，比較 `?mode=worker` 與 `?mode=main` 的描畫 fps。M0 原步驟：在 iPad Air 上安裝 mkcert `rootCA.pem` 描述檔並啟用完全信任，開啟 `https://<Mac LAN IP>:8443/hand-spike`，記錄 GPU/CPU 數據與長時間穩定性。憑證綁定建立時的 LAN IP（192.168.0.215），IP 變更需重新產生。
