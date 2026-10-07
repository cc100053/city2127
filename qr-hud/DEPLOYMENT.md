# 第二階段：Supabase 與 Node 伺服器部署

## 架構

手機 `/city/:sessionId` → 同源 `/api/sessions/:id` → Node → Supabase Postgres / 私有 Storage。

終端操作員登入後建立 Session、送出媒體。伺服器先將檔案與工作 manifest 存入持久磁碟，回傳 **202 Accepted** 後，由背景 worker 上傳到 Supabase。手機無需登入；QR 連結視為可分享的成果存取連結。Session 使用 96-bit 隨機值，提案編號由資料庫 identity 產生，互不依賴。

所有 Supabase 設定只由 `server/config.js` 讀取環境變數。前端沒有 Supabase client，也沒有 `VITE_SUPABASE_*`。Storage bucket 為 private，前端只取得短期簽名媒體連結；此連結不是 Supabase API 金鑰。

## 1. 建立 Supabase 資源

1. 建立或選擇 Supabase 專案。
2. 在 SQL Editor 執行 `supabase/migrations/202609290001_sessions.sql`。若已採用 Supabase CLI，可將此 migration 納入既有流程並執行 `supabase db push`。此 migration 只需執行一次。
3. 它會建立 `public.sessions` 的六個欄位：`id`、`status`、`proposal_number`、`media_url`、`created_at`、`updated_at`；建立更新時間 trigger、RLS，以及私有 `session-media` bucket。
4. 保持 `sessions` 沒有 anon/authenticated 的讀寫 policy；不要將 bucket 改成 public。若專案已有跨 bucket 的寬鬆 Storage policies，請將它們排除 `session-media`。
5. 從 Supabase Dashboard 取得 Project URL 和 **secret key**（`sb_secret_...`），填入伺服器環境。舊專案的 `service_role` key 也可放入 `SUPABASE_SECRET_KEY`，或使用相容變數 `SUPABASE_SERVICE_ROLE_KEY`。不要使用 anon/publishable key 作為伺服器的寫入金鑰。

`status` 使用 `queued → uploading → ready`；自動重試期間回到 `queued`，超過次數為 `failed`。`ready` 必須有 `media_url`。資料庫內的 `media_url` 是永久的私有 Storage object URL，**不能直接公開讀取**；API 在回應時替換成預設有效 1 小時的 signed URL，避免把會過期的 token 寫入資料庫。

## 2. 本機設定與啟動

Node.js 22.12+，建議 Node 22 LTS。

```powershell
Copy-Item .env.example .env
npm.cmd ci
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

編輯 `.env`，填入 `SUPABASE_URL`、`SUPABASE_SECRET_KEY`，並將剛產生的隨機字串放入 `TERMINAL_WRITE_TOKEN`。不要把真實金鑰提交到 Git 或貼入前端檔案。`.env`、上傳資料與 Docker build context 均已排除秘密設定。

`APP_PUBLIC_URL` 必須是這個 Node 服務的公開 origin，沒有 `/city` 路徑，例如 `https://2127shibuya.com`。本機電腦使用 `http://localhost:4173`；要用同一 Wi-Fi 手機掃描，改為電腦 LAN IP，例如 `http://192.168.1.20:4173`，並確保防火牆允許該連接埠。手機的 localhost 不是電腦。

```powershell
npm.cmd run build
npm.cmd start
```

開啟 `http://localhost:4173`。右下角 **メディア管理** → 使用 `TERMINAL_WRITE_TOKEN` 登入。成功後自動建立真實 Session 與 QR。展示介面使用日文，維運文件保留中文。

- 掃描 QR：手機先顯示等待頁，每次查詢完成後 2 秒再次查詢。
- 終端選擇 JPEG、PNG、WebP 或 MP4（上限 50 MB）並加入佇列。
- 顯示「受付完了」後，可關閉終端頁面，Node worker 繼續上傳。
- `ready` 後圖片或 MP4 自動出現。影片使用 `muted autoplay playsinline controls`；有聲播放需由使用者操作，影片 codec 必須受裝置支援（建議 H.264/AAC MP4）。
- 「投票完了をテスト」在 Supabase 模式會建立另一個真實 Session，方便端到端測試，不會自動生成媒體。
- 未填入連線設定時，首頁明確維持 Demo；上傳 API 回傳 503，手機頁顯示服務未設定，不會假裝已寫入資料庫。

開發時分兩個終端執行 `npm.cmd run dev:server` 和 `npm.cmd run dev`。Vite 5173 會將 `/api` 轉送到 Node 4173；正式環境由 Node 同時供應 `dist` 與 API，支援 `/city/:sessionId` 直接開啟與重新整理。

## 3. 部署到持久 Node 主機

可使用提供持久磁碟的 Node 主機或 Docker VPS。不要僅部署 `dist` 到靜態網站，也不要將此本機佇列放在短生命週期的 serverless 函式。

- Build command：`npm ci && npm run build`
- Start command：`npm start`
- 環境：`NODE_ENV=production`、Supabase 變數、`TERMINAL_WRITE_TOKEN`、`APP_PUBLIC_URL=https://你的網域`
- 平台配置的 `PORT` 會自動使用。
- 掛載持久磁碟並設定 `DATA_DIR` 到掛載點，例如 `/var/data/2127`。
- **僅啟動一個 instance / worker**。程序會鎖定 DATA_DIR，避免同一磁碟重複消費。若未來要水平擴充，需改用資料庫工作佇列或專用 broker。
- 反向代理請提供 HTTPS、允許至少 50 MB request body、至少 180 秒 request timeout；只有確定一層受信任代理時才設定 `TRUST_PROXY=1`。
- 健康檢查：`GET /api/health`。`ok` 代表 Node 運作；`configured` 只代表環境設定齊全，不代表雲端 schema 已驗證。
- 正式模式使用 Secure + HttpOnly + SameSite=Strict 操作員 cookie，有效 8 小時；Node 重啟後需重新登入。公開讀取不需登入，寫入與工作清單都需要操作員授權。

Docker（從 repository 根目錄執行；台場 QR 模型資料已包含在 qr-hud/src，Docker 建置尚未在此工作環境驗證）：

```sh
docker build -f qr-hud/Dockerfile -t 2127-terminal .
docker volume create 2127-data
docker run --env-file qr-hud/.env -e NODE_ENV=production -p 4173:4173 -v 2127-data:/app/.data 2127-terminal
```

請先將 `.env` 的 `APP_PUBLIC_URL` 設為 HTTPS 正式網址，由反向代理轉送到容器。若使用 bind mount，掛載目錄需允許容器的 node 使用者寫入。

## 4. 背景產生器介面

未來影片生成程序可以呼叫相同 API；不必持有 Supabase 金鑰，只需應用程式操作員 token。

| API | 授權 | 用途 |
| --- | --- | --- |
| `POST /api/operator/login` | JSON `{ "token": "…" }` | 換取 HttpOnly cookie |
| `POST /api/operator/logout` | cookie | 登出 |
| `POST /api/sessions` | cookie 或 Bearer token | 建立 Session，回傳 `id`、`city_url` |
| `GET /api/sessions/:id` | 公開 | 六個資料欄位，以及 `media_type`、`media_expires_at` |
| `POST /api/sessions/:id/media` | cookie 或 Bearer token | multipart 欄位 `media`，必須帶 UUID v4 `Idempotency-Key` |
| `GET /api/uploads` | cookie 或 Bearer token | 最近 100 個工作與重試狀態 |
| `POST /api/uploads/:jobId/retry` | cookie 或 Bearer token | 重新排入失敗／等待重試的工作 |

提供 CLI：

```sh
node scripts/upload-media.mjs session_你的ID ./result.mp4
# 網路中斷後，使用前一次輸出的 Idempotency-Key 再送一次：
node scripts/upload-media.mjs session_你的ID ./result.mp4 先前的UUID
```

同一個 `Idempotency-Key` 只會對應一份工作。每個 Session 只接受一份成果，不覆寫已 ready 的媒體；有既存失敗工作時請重試該工作。`202` 代表已持久化排程，不代表已完成雲端上傳。關閉網頁之前要等待這個回應；瀏覽器 → Node 這一段若中斷，必須重新傳送檔案。

## 5. 重試與恢復

- 工作 metadata：`DATA_DIR/jobs/*.json`；原始媒體：`DATA_DIR/files/`；接收暫存：`DATA_DIR/incoming/`。
- 預設最多 5 次嘗試，失敗後等待 2、4、8、16 秒，退避上限 60 秒。
- 正在上傳時重啟：工作恢復為 queued。固定 object path + upsert 讓重複上傳不會新增重複物件。
- Storage 成功但 DB 更新失敗：保留本機檔案，重新執行直到 ready 寫入成功。
- DB 已 ready 但程序尚未記錄完成即重啟：直接標記工作完成，不重傳。
- 超過重試次數：保留檔案，面板提供「今すぐ再試行」。若 Supabase 暫時無法寫入 failed 狀態，worker 會持續同步。
- 完成後刪除本機媒體，保留 manifest 供冪等判斷；失敗檔案不自動刪除。預設未完成媒體總量上限 512 MB。應監控磁碟使用量並備份 DATA_DIR；崩潰前尚未接受的 incoming 暫存與長期完成的 manifests 可在維護停機時清理。
- 這是單機持久化佇列。主機必須持續運作；瀏覽器關閉不影響 worker，但關閉主機則暫停到下次啟動。

## 6. 驗證

```sh
npm run build
npm test
# Node 預覽伺服器已在 4173 啟動後：
npm run test:e2e
```

測試涵蓋授權、跨來源拒絕、檔案真實格式／大小、冪等接受、重試退避、重啟恢復、前端不含 SDK／秘密設定、QR 解碼、手機輪詢、圖片／MP4 顯示及錯誤恢復。瀏覽器測試使用本機 Chrome，截圖位於 `test-results/`。

自動測試使用隔離的儲存介面與 API fixtures，不代表已完成真實 Supabase 驗收。填入真實環境與執行 migration 後，請透過終端上傳一張圖片與一段 MP4，確認 Dashboard 的資料列、Storage 物件及手機顯示結果。

## 官方參考

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)：secret/service-role 僅限後端。
- [Storage standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)：上傳格式與 upsert。
- [Signed URLs](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl)：私有媒體的限時讀取連結。
