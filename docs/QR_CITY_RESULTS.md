# 問卷 → QR Code → 手機專屬 3D 城市

這個整合版把 main 的四題問卷、共同城市，以及 `qr-hud/` 的賽博 QR 介面接起來。手機載入同一套 Three.js 城市，能用手指旋轉、雙指縮放，也有放大／縮小／回到初始視角按鈕。不是圖片、影片或遠端桌面串流。

## 開展前：安裝與建置

需要 Node.js **24 以上**（Node 22 無法運行問卷 SQLite server）、支援 WebGL 2 的瀏覽器。從這個整合分支的 repository 根目錄操作；不是舊的獨立 `D:\2127-qr-hud` 目錄。

```powershell
npm.cmd ci
npm.cmd --prefix survey ci
npm.cmd --prefix qr-hud ci
node scripts/exhibition.mjs build
```

Mac 同樣使用這些指令，把 `npm.cmd` 改為 `npm`。依賴已安裝且程式沒更新時，不需要每天重新安裝或建置。

## 開展當天：啟動

1. 展示 PC 與手機連同一個可信 Wi-Fi；Wi-Fi 不可啟用裝置隔離。
2. 找出 PC 的 Wi-Fi IPv4（Windows 可用 `ipconfig`）。以下 `192.168.1.20` 只是範例，必須換成你的 IP。
3. PowerShell 從 repo 根目錄執行：

```powershell
$env:SURVEY_PUBLIC_URL='http://192.168.1.20:8787'
node scripts/exhibition.mjs start
```

Mac：`SURVEY_PUBLIC_URL=http://192.168.1.20:8787 node scripts/exhibition.mjs start`。

伺服器預設對 LAN 開放 8787，終端視窗需要保持運行。若有 Windows 防火牆提示，只允許可信私人網路；不要關閉整個防火牆。若 port 已被其他程式使用，不要重複啟動；可自行設定 `SURVEY_PORT`，並同步修改 `SURVEY_PUBLIC_URL` 的 port。

| 用途 | 在展示 PC 開啟 |
| --- | --- |
| 主螢幕城市（保持開啟） | `http://localhost:8787/display/?survey` |
| 問卷／投票後 QR | `http://localhost:8787/guest` |
| 工作人員管理 | `http://localhost:8787/admin` |

未設定 `SURVEY_PUBLIC_URL` 時，QR 會沿用問卷連線所用的伺服器位址。如果問卷用 localhost 開啟，產生的 localhost QR **不能給手機掃**。伺服器會列出候選 LAN 位址供你確認；不會擅自選 VPN 或其他網卡。

## 觀眾實際流程

1. 四題問卷 → 確認並提交。原本共同城市依 server 的四區配置變化。
2. 結果頁顯示約10秒後，自動開啟 QR；也可按「QRで街を持ち帰る」。這是結果閱讀時間，不是主螢幕動畫完成的網路確認訊號。
3. HUD 播放約2秒連結準備動畫。QR 指向 `/city/<本次提案ID>`，不再指向 HAL 網站。
4. 手機掃碼後下載該提案保存的城市狀態與共用3D資產；手機自己渲染，可旋轉、縮放。下位觀眾的提案不會改變這個頁面。
5. 掃碼結束按「読み取りを終えて次へ」。工作人員仍須在 Admin 確認「観客の退出を確認」才開放下一位，原本展覽生命週期沒有取消。

## 保存什麼、沒有保存什麼

- 保存：SQLite `proposal_events` 已提交的 after-state；重建四區建築／設施配置與當次回答。之後投票、city reset、full reset、重啟伺服器都不會把舊提案換成最新城市。
- 重用：與展示 PC 相同的城市與 GLB 資產；不再擷取 JPEG，也不需上傳 MP4。
- 手機顯示固定日間，降低陰影與後製成本，限制繪製更新最多30次／秒；**這不是實測30 FPS保證**。沒有保存當時的日夜時間、攝影機位置或每個行人的動作相位。
- 成果代表「累積城市加入這位觀眾提案後的版本」，不是重新生成一個只包含該觀眾答案的獨立城市。
- 演算法／資產若日後升級，須保留 v2 還原支援，才能持續維持舊結果的視覺相容性。

## 使用限制與保護

- 此版是本機展場整合，**沒有公開部署**。手机需同網路且 PC server 開著；5G、離場後或 PC 關機後不能保證開啟。若要永久帶走，下一階段需要公開 HTTPS 服務與持久資料儲存。
- 不要刪除 `survey/data/survey.sqlite` 或其使用中的 WAL 檔。GitHub 不保存展覽資料，請在停止伺服器後另行備份資料庫。
- 持有成果連結的人可查看該次提案。不要在問卷放敏感個資。Admin 仍只允許展示 PC 的 localhost；LAN guest API 並沒有新增訪客驗證或防濫用機制，勿直接暴露到公共 Internet。
- Android／iPhone 實機效能、多手機同時瀏覽、展場 Wi-Fi 與防火牆仍需現場驗收。若手機不支援 WebGL 2，會顯示載入錯誤，不會用圖片假裝成功。
- 原本 `qr-hud/` 獨立 Supabase 圖片／影片流程仍保留；它的 `.env` 不是此整合版的必要設定，請勿把 Secret Key 加入 Git。

## 自動驗證（開發人員）

Root、survey、qr-hud 分別執行 `npm test`、`npm run build`。`survey` 的 `npm test` 亦執行專屬成果歷史／重啟保留測試。

完整瀏覽器腳本：`qr-hud/scripts/verify-integration.mjs`，需要已安裝 Chrome，以及使用**獨立測試 SQLite**啟動的整合 server。設定 `INTEGRATION_URL` 與 `INTEGRATION_ALLOW_RESET=yes` 後，在 `qr-hud/` 執行 `node scripts/verify-integration.mjs`。腳本會建立提案並重置測試城市，**不可指向真實展覽資料庫**。
