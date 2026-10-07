# 2127 Civic Archive Terminal

建築 QR（2026-10-07）：整合問卷時從該份提案保存的台場 2127 城市中，穩定隨機抽取一棟實際可見的扭轉塔、退台塔或雙塔，排除小型花園館。沒有符合條件的樓塔時，用原本中央白色巨構／懸吊球體地標（台場 Civic Core），不會補出不存在的高樓。造型來源共用城市的 `ConcentrationDistrict`／`civicCore`，不是舊富士電視台或現代地標 GLB。經使用者同意，QR 展示改為由原幾何取樣的方塊雕塑，保留主要輪廓、綠化、配對設施及材質色調，但不保證細小構件或原表面無損重現；城市原模型不變。方塊只放在 QR 深色欄位上；側面看建築，俯視同一批方塊與底板就是可掃描 QR。兩個視角的雕塑高度與可見狀態維持不變，不再壓扁／隱藏或切換另一張 QR。展示 8 秒後鏡頭用 1.4 秒轉至俯視，可按「建築のかたち」／「真上からスキャン」轉換。QR 開啟提案保存的可操作 3D 城市。參考 [QR-Bloom](https://github.com/rocknroll17/QR-Bloom) 的投影概念，沒有使用其 AI 權重或非商用樹生成器。獨立 HUD 使用高密度示範建築。舊 `prepare-odaiba-qr.mjs` 與 JSON 保留作歷史，不是目前建置來源。

接 main 問卷、掃碼查看可操作 3D 城市時，請使用根目錄 [README 的整合版啟動方式](../README.md)。以下 `npm start` 是原本獨立 HUD／Supabase 圖片影片模式，不會自動接問卷。整合版重用 HUD，不需要 Supabase 金鑰。

Vite、原生 JavaScript、Three.js、qr-code-styling，加上 Node API、Supabase Postgres 與私有 Storage。

展示介面使用日文（`lang="ja"`），面向日本展覽觀眾；包含終端、手機成果頁、操作員面板與 API 錯誤訊息。維運文件保留中文。

## 啟動

```sh
npm ci
npm run build
npm start
```

開啟 http://localhost:4173 。Windows PowerShell 可使用 `npm.cmd`。`npm run preview` 現在也啟動同一個 Node 服務，包含手機路由與 API。

尚未設定 `.env` 時保留第一階段的 HUD 展示模式。要啟用真實 Session 與上傳，複製 `.env.example` 為 `.env`、填入伺服器設定，再執行 Supabase migration。完整步驟見 [DEPLOYMENT.md](DEPLOYMENT.md)。

開發時分別執行：

```sh
npm run dev:server
npm run dev
```

## 操作

- 「メディア管理」：操作員登入、選擇圖片或 MP4、查看失敗重試佇列。
- 真實模式建立隨機 Session，QR 指向 `APP_PUBLIC_URL/city/:sessionId`。提案編號由資料庫產生。
- 目前展示模式的 QR 預設指向 `https://www.hal.ac.jp/tokyo`；修改 Session 或模擬投票後仍使用此網址。可在「開発設定」另行修改目標網址。
- 手機成果頁每 2 秒確認狀態，`ready` 後自動顯示圖片或播放靜音 MP4。
- 「投票完了をテスト」在真實模式建立新 Session，在展示模式重新播放原本的 2 秒流程。
- 「開発設定」可修改 QR 的 Session / 網址與重播，不會在資料庫建立指定 ID。
- 回傳「已加入佇列」的工作由 Node 背景上傳，關閉網頁不會中止；磁碟佇列支援重啟恢復。
- Supabase 金鑰只存在於伺服器環境變數。Storage 為 private，手機只取得短期 signed URL。

## 掃描與版面

- 建築 QR 使用 H 級錯誤修正、淺底深色方格及五個 module 的安靜區。俯視時同一批方塊的顏色漸變為深色，直接渲染而不使用後處理；白色底板不接收陰影，避免污染白格。側面使用天空反射、陰影與接觸陰影；材質保留原色／金屬度，方塊粗糙度至少 .35，避免玻璃白色反光蓋過輪廓。
- 標準備援 QR 保留圓點、青色至紫紅漸層、深底與小面積徽章；QR 本身沒有掃描線或半透明遮罩。
- 桌面針對 16:9 全螢幕設計，小螢幕會重排，避免 QR 被擠壓。
- 支援 reduced motion；WebGL 不可用時 QR 與互動仍可運作。
- 深底亮碼的辨識能力依手機掃描器而異，正式展示前應以現場手機、亮度與距離驗收。

## 主要檔案

- `index.html`：HUD 結構及開發控制面板。
- `src/main.js`：Session、QR 產生、狀態與互動流程。
- `src/buildingQr.js`：單棟未來建築、完整取景、光影、鏡頭轉換與資源釋放。
- `src/qrSculpture.js`：城市原幾何取樣、QR 約束方塊、原材質色調及同一物件的俯視掃描。
- `src/landmarkSelection.js`：提案 ID 從保存城市的可見候選池選棟。
- `../src/qrFutureBuildings.ts`：重用城市建築工廠及保存 layout／slotSeeds。
- `src/style.css`：全螢幕 HUD、響應式版面與傳輸動畫。
- `public/badge.svg`：中央 2127 徽章。
- `src/city.js` / `src/city.css`：手機成果頁與輪詢。
- `src/operator.js`：登入、媒體上傳與重試面板。
- `server/app.js`：API、授權、檔案驗證與前端路由。
- `server/repository.js`：Supabase Postgres / Storage 存取。
- `server/queue.js`：持久化佇列與失敗重試。
- `supabase/migrations/202609290001_sessions.sql`：sessions、trigger、RLS、bucket。
- `.env.example` / `DEPLOYMENT.md` / `Dockerfile`：環境設定與部署。
- `scripts/upload-media.mjs`：外部媒體生成程序的上傳介面。

## 驗證

`npm run build` 後執行 `npm test` 驗證 API 與佇列。4173 預覽伺服器啟動後執行 `npm run test:e2e`，使用本機 Chrome 驗證 QR、操作流程、手機輪詢及媒體顯示。截圖輸出至 `test-results/`。測試使用隔離介面，尚需實際 Supabase 專案與實體手機驗收。

建築展示另用 `node scripts/verify-building-qr.mjs`，預設測試 QR Vite 的 5198 port（可設 `QR_TEST_URL`）。涵蓋三種高塔、排除花園館、完整取景、無高樓時的中央地標、重新整理、同一立體物件兩個視角都維持可見／相同高度與身份、reduced motion，以及實際 canvas 解碼。`tests/qrSculpture.test.js` 檢查原幾何變換、QR 白欄完全無建築方塊、懸空結構下的空洞及不壓扁／換幾何。整合問卷的隔離 SQLite 測試及現場驗收見根目錄 [VALIDATION](../docs/VALIDATION.md)。
