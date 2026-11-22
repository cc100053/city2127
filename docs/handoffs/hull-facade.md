# 階梯巨構立面 R2

- Owner: cc100053
- Status: 新立面已實作，展覽機及實景目視驗收待完成
- Branch: `codex/hull-facade`
- Base commit: `a0df060333ecded0f368f62af5e2bb2e360f77db`
- 2026-11-22 跟進開始時，`main` 與已 fetch 的 `origin/main` 差距 0／0。本輪在獨立工作樹進行，主工作區的 `Dev_QA.md` 保留。

## 方向與落地

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
