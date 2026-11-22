# M0 手部追蹤 spike

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

## 下一步

在 iPad Air 上安裝 mkcert `rootCA.pem` 描述檔並啟用完全信任，開啟 `https://<Mac LAN IP>:8443/hand-spike`，記錄 GPU/CPU 數據與長時間穩定性。憑證綁定建立時的 LAN IP（192.168.0.215），IP 變更需重新產生。
