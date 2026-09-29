# 2127 Civic Archive Terminal

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

- QR 使用 H 級錯誤修正、圓點、明亮青色至紫紅漸層與深色背景，保留超過四個 module 的安靜區。
- 徽章限制在中央小面積；所有 Three.js 效果位於 QR 角落外圍，QR 本身沒有掃描線或半透明遮罩。
- 桌面針對 16:9 全螢幕設計，小螢幕會重排，避免 QR 被擠壓。
- 支援 reduced motion；WebGL 不可用時 QR 與互動仍可運作。
- 深底亮碼的辨識能力依手機掃描器而異，正式展示前應以現場手機、亮度與距離驗收。

## 主要檔案

- `index.html`：HUD 結構及開發控制面板。
- `src/main.js`：Session、QR 產生、狀態與互動流程。
- `src/hologram.js`：Three.js 三層反向旋轉光環、刻度、粒子與能量脈衝。
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
