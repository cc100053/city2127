# 階梯巨構立面

- Owner: cc100053
- Status: 新立面已實作，展覽機及實景目視驗收待完成
- Branch: `codex/hull-facade`
- Base commit: `a0df060333ecded0f368f62af5e2bb2e360f77db`
- 2026-11-22 跟進開始時，`main` 與已 fetch 的 `origin/main` 差距 0／0。本輪在獨立工作樹進行，主工作區的 `Dev_QA.md` 保留。

## R2 方向與落地

業主選定 [Gemini 構思圖](../../artifacts/hull-facade/target.jpg)。原圖以 R1 日間近鏡和夜間主鏡生成，取其相接的銀色曲框、大小錯落的深窗洞、玻璃內暖光和菱格遮光板。

[現有船身](../../src/megastructures.ts) 沿用八級退台、三處公共平台、植栽、廣場步道和列車位置。窗面離立面外緣約 2.6 m，內側做實際窗洞斜邊、窗框、背牆和局部夾層樓板。淺藍透明玻璃沿用城市環境反射，暖光由現有日夜週期控制。樓板沿用原來的分級高度，曲框在各層沿窗洞合流，順原有層緣收口。廣場簷篷後方有底層門洞，列車口追加圓角金屬外框，原矩形洞口位置與尺寸照舊。

[立面生成器](../../src/hullFacade.ts) 的開口位置和曲線按船身的階梯尺寸逐層設計，屬地標構件。透明玻璃和暖光背牆各一批，共用銀色、深色和樓板材質照舊。

## 實景與驗證

- [近鏡日夜前後對照](../../artifacts/hull-facade/compare-close.jpg) · [城市主鏡日夜前後對照](../../artifacts/hull-facade/compare-hero.jpg)
- Root `npm test`、`npm run build`、`git diff --check` 通過。正式 build 用桌面 Chrome 1600×900／DPR 1 測 12:00 及 21:25，兩個時段有畫布更新，未收到頁面例外、shader 錯誤或資源載入失敗。
- Chrome 2400×1350／DPR 1 以 12:00、21:25 和固定場景時間 20 秒拍攝。近鏡 pos (−350, 100, −110) 看向 (−244, 64, 75)，主鏡沿用全城預設。夜間主鏡基準由 main 的 Vite 供應，其 sidecar 的分支欄來自啟動擷取的候選工作樹。原檔及 sidecar 在 `~/city2127-evidence/hull-facade/{before,final}/`。
- [幾何測試](../../tests/megastructures.test.ts) 覆蓋八級凹入玻璃和背牆、廣場入口下方通視、公共退台鋪面及植栽。原共用合批上限獨立檢查，另確認船身玻璃和暖光背牆各一批。
- 方向圖把船身拉高、放大列車口，並加入可見的多層室內空間。本輪使用場內既有比例。窗後為可見的淺室內景，完整室內動線、樓梯與人流未實作。

## 整合

- 工作分支 `9cde348c`，整合提交 `2826b2cd`。整合版本重跑 root `npm test`、`npm run build` 和 `git diff --check origin/main..HEAD`，均通過。正式 bundle 與已在 Chrome 測試的版本一致。
- [GitHub main CI](https://github.com/cc100053/city2127/actions/runs/44995673556) 驗證 `e4bc592b`，root、survey、module-swap、差異空白及圖檔規格檢查全部通過。

## R3 · 中段退台與廣場大堂

- Owner: cc100053
- 工作分支 `codex/hull-facade-r3`，基準 `5759a37c35d0d213df2be7c44cc65b814f81e720`。2026-11-22 開始時，已 fetch 的 `origin/main` 和本機 `main` 差距 0／0。R2 立面整合 `2826b2cd` 已包含在基準內。本輪使用獨立工作樹，保留主工作區未追蹤的 `Dev_QA.md`。

兩道銀框分別跨兩級及三級，高端沿樓板外緣折回接上層。60 m 公共退台兩側收口；銀框、走道、欄杆和簷篷沿用結構批次。深玻璃大堂沿既有廣場簷篷開門，後方有兩翼局部夾層、柱、暖色天花及低強度地面反光。退台的三塊遮蔭板簷底及後方窗面沿同一日夜係數調光，玻璃及燈槽仍各一批。

### R3 驗證

- Root `npm test`、`npm run build`、`git diff --check` 全部通過。完整測試使用可綁定 loopback 的本機權限，以包含 survey HTTP／WebSocket 串接檢查。
- [幾何測試](../../tests/megastructures.test.ts) 通過。廣場門洞從立面前 4 m 至立面後 8 m 的九條射線暢通；窗與背牆實測相距超過 13.6 m。另核對兩翼夾層、柱、暖色天花和三塊遮蔭板。中層退台向海的 129 條射線暢通，三處公共退台原有鋪面及兩側植栽測試通過。
- 兩側列車洞口外緣在船身局部座標的掃描盒 `u=91…94.2, y=7…25, d=1.5…24` 和 `u=−94.2…−91, y=7…25, d=36…62.5` 各有 606／594 個批次三角面，與 R2 基準逐面相同。
- 開發 Mac、Chrome 157.0.8103.79／ANGLE Metal（Apple M6）。正式 build 以 1600×900／DPR 1 檢查 12:00、18:00、21:25，有畫布診斷更新，三個時段的頁面例外、shader 和本機資源錯誤均為零。正式 build 記錄在 `~/city2127-evidence/hull-facade/r3/preview.json`。

- [城市主鏡日／昏／夜對照](../../artifacts/hull-facade/r3-hero.jpg) · [立面近鏡日／昏／夜對照](../../artifacts/hull-facade/r3-close.jpg) · [廣場入口及簷篷下對照](../../artifacts/hull-facade/r3-entry.jpg)。2400×1350／DPR 1，場景時間固定 20 秒，九組前後對照的 sidecar 均無頁面例外。
- 主鏡沿用 R2 預設，立面近鏡沿用 `review=street&cam=-350,100,-110&at=-244,64,75`。廣場對照用 `review=street&cam=-222,8,18&at=-211,6,44`；簷篷下用 `review=ring&cam=-221,2.8,20&at=-211,6,44`。日夜主鏡及立面近鏡沿用 R2 的原檔（sidecar 記錄 R2 候選工作樹），新拍黃昏及廣場基準來自 `5759a37c`。新原檔與 sidecar 在 `~/city2127-evidence/hull-facade/r3/{before,after}/`。
- 日間保留框架兩側的深窗陰影，兩道斜框在主鏡可見。18:00 和 21:25 的大堂及中層後窗是兩處連續暖光，附近窗面仍有亮暗間隔；簷篷下可見柱、夾層邊緣及天花。展覽機與業主視覺驗收待完成。

### R3 整合

- 工作分支提交 `d6bafbc5`，整合提交 `d4e43a28`。在獨立整合工作樹重跑 root `npm test`、`npm run build`、`git diff --check origin/main..HEAD` 及圖檔規格檢查，全部通過。整合後的整份 `dist/` 與 Chrome 已驗證的 build 逐檔一致。
- [GitHub main CI](https://github.com/cc100053/city2127/actions/runs/44999367968) 已驗證 `5087b7d8`。Root、survey、module-swap 測試及 build、差異空白與圖檔規格全數通過。工作分支的 [CI](https://github.com/cc100053/city2127/actions/runs/44999035557) 亦已通過。
