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

## R4 · 樓板折返與大堂層次

- Owner 為 cc100053。工作分支 `codex/hull-facade-r4` 從已 fetch 的 `origin/main`（`43137115d73d9dc8504a4fc6d5cbc08ce981e63e`）開獨立工作樹。本機 `main` 落後 4 個提交，領先 0 個，主工作區未追蹤的 `Dev_QA.md` 保留。
- 參考 R3 主鏡、近鏡及入口照片，以及[業主方向圖](../../artifacts/hull-facade/target.jpg)。R3 的銀框接點在水平樓板邊容易斷讀，夜間入口的暖色背牆和天花容易看成一片。

R4 加闊兩道斜框上緣，讓銀色折面從下層框延至樓板邊，沿外緣翻上並接入上層框腳。三個跨層接點及兩處終端沿用船身自身的曲面和結構合批。廣場入口在玻璃前加厚門框和門楣，兩翼夾層用暗色前緣襯出燈線，前後襯板壓出中間暖天花的深度，夜間背牆亮度低於頂中燈區。構件屬這座船身的曲窗、樓板折角和大堂夾層，沿用現有外殼、銀框、深色、玻璃和燈槽材質。

八級船身、三處公共退台、植栽、廣場步道、原簷篷及兩側列車口沿用 R3。大堂及中層退台跟隨原日夜週期，附近窗洞保有原來錯落的亮窗。

### R4 驗證

- [主鏡日／昏／夜](../../artifacts/hull-facade/r4-hero.jpg)和[近鏡日／昏／夜及折返局部](../../artifacts/hull-facade/r4-close.jpg)以 R3 同鏡位比較。加闊的折面在近鏡可跟到樓板外緣，植栽仍遮住部分平台內側的折返。主鏡保留兩處暖光和周邊不規則的亮暗窗。
- [廣場及簷篷下入口](../../artifacts/hull-facade/r4-entry.jpg)記錄日間與夜間門框，以及暖色天花與暗色夾層前緣的分別。九組對照沿 R3 sidecar 的網址參數，固定場景時間 20 秒、2400×1350／DPR 1，頁面例外為零。原圖和 sidecar 在 `~/city2127-evidence/hull-facade/{r3,r4}/after/`。
- Root `npm test`、`npm run build`、`git diff --check` 通過。完整測試包括本機 survey HTTP／WebSocket 串接。
- [幾何測試](../../tests/megastructures.test.ts)核對三個跨層接點各三個位置、天花前後襯板相對暖天花的高差，以及玻璃前的門楣。三處退台鋪面及植栽、60 m 退台向海淨空和入口九條通行射線均通過。
- 用船身局部座標的掃描盒篩出兩側列車口的三角面包圍盒，再逐面比對材質及頂點。兩側各 608／610 個三角面與 `43137115` 完全相同。巨構模型構件由 11 個相同的材質批次繪製，船身玻璃和燈槽各一批。
- 正式 build 在開發 Mac 的桌面 Chrome 157.0.8103.79（Apple M6／ANGLE Metal），以 1600×900／DPR 1 檢查 12:00、18:00、21:25。三個時段均有畫布診斷，頁面例外、shader 及本機資源錯誤均為零。記錄在 `~/city2127-evidence/hull-facade/r4/preview.json`。

業主視覺驗收及展覽機驗證待完成。

### R4 整合

- 工作分支提交 `d6f42e3a`，整合提交 `9aa343da`。獨立整合工作樹重跑 root `npm test`、`npm run build`、`git diff --check origin/main..HEAD` 及圖檔規格檢查，全部通過。整份整合版 `dist/` 與 Chrome 已驗證的 build 逐檔一致。
- [GitHub main CI](https://github.com/cc100053/city2127/actions/runs/45023045907) 驗證 `d2cf5210`。Root、survey、module-swap 的測試及 build、差異空白和圖檔規格全數通過。[工作分支 CI](https://github.com/cc100053/city2127/actions/runs/45022673969) 驗證 `d6f42e3a`，亦已通過。

## R5 · 船身輪廓與量體

- 業主 cc100053。R4 回饋是「整體嘅外型同 Target 仍然相差遠，R5 再執一執整體嘅外型」。工作分支 `codex/hull-facade-r5` 從已 fetch 的 `origin/main`（`565de9fb099f31f89a8dc9e62dfdb0849f4ffcb3`，見提交記錄）建立。起步時本機 `main` 領先 0、落後 8；保留原工作區的未追蹤 `Dev_QA.md`。基準含 R4 整合 `9aa343da`，[R4 main CI](https://github.com/cc100053/city2127/actions/runs/45023045907) 在 `d2cf5210` 通過。

[Target](../../artifacts/hull-facade/target.jpg) 的頂層向橫伸展，船首外緣沿斜線逐級收細，銀色曲框清楚帶動整座建築走勢。R4 主鏡的窄頂層和等距樓板較似一疊長方盒；R5 在同一場地重排上段量體。最高一級正面由 45 m 加闊至 75 m，中央屋面由 120 m 提至 134 m，兩端落低約 4 m。中上段向船首的橫向退縮交替使用 10 至 28 m，圓弧從 30 m 高處開始。銀框有五處跨層接點，並沿各級船首回捲。跨層接點旁的樹冠疏開，讓折返線在主鏡露出來。

15、60、105 m 的公共平台仍是低層入口平台、有簷中庭和上層觀景台，廣場步道和地面大堂保持原接點。兩側列車口輪廓和基準相同。中層退台簷底、後室與大堂照明繼續使用同一日夜係數和同一燈槽批次。高處量體及銀色船身外殼屬此場地構件，沿用現有船身合批和植栽模型。

### R5 幾何驗證

- 兩個列車口掃描盒與 R4 對位比較，材質及頂點逐面一致（608／610 個三角面）。三處平台鋪面、相鄰植栽、60 m 退台視線、105 m 退台淨高和大堂入口通行射線實測。
- 上段背面向 Grand Nikko 一側退入，與已放置的酒店 GLB 最小表面間距約 1.80 m。以每條路線抽取 2,001 個點量至實際上層三角面，往 Hilton 的高架步道中心線最近 9.52 m，最近的空中主航線為 94.55 m。Hilton 低處交界沿用原有城市佈局，R4 與 R5 的 30–45 m 段仍有模型交疊。R5 的變形集中於列車口上方；Target 裏更大的列車洞口維持為概念圖比例。

### R5 實景

- [城市主鏡](../../artifacts/hull-facade/r5-hero.jpg)和[立面近鏡](../../artifacts/hull-facade/r5-close.jpg)以 R4 同鏡位比較 12:00、18:00、21:25。主鏡可見頂層屋線抬過後方酒店；近鏡可見船首由直角收成弧面、上三層銀框跨兩個退台。夜間保留入口與中層兩處暖色焦點。
- [廣場入口及簷篷下](../../artifacts/hull-facade/r5-entry.jpg)比對玻璃前門框、夾層燈線及暖色天花。九組原檔及 sidecar 在 `~/city2127-evidence/hull-facade/{r4,r5}/after/`。開發 Mac 使用 Chrome 157.0.8103.79，2400×1350／DPR 1，沿用每個 R4 網址的鏡位參數與場景時間 20 秒。各組 sidecar 均無頁面例外。
- 固定城市主鏡仍截去貼近畫面邊的最末段船首。近鏡圖集包含完整船首；原有兩端洞口尺寸未按概念圖放大。

業主視覺驗收及展覽機驗證待完成。

### R5 整合

- 工作分支 `0ff434b0`，整合提交 `e675a8f6`。從最新 `origin/main`（`2df6d8b6`）開獨立整合工作樹。該基準新增 headline／Sky Ring 返回主鏡的修正，固定主鏡與 R5 比較鏡位沿用原位。
- 在整合提交重跑 root `npm test`、`npm run build`、`git diff --check origin/main..HEAD` 和圖檔規格檢查，全部通過。
- 正式 build 在開發 Mac 的桌面 Chrome 157.0.8103.79（Apple M6／ANGLE Metal）以 1600×900、DPR 1 檢查 12:00、18:00、21:25。三個時段皆有畫布診斷，未收到頁面例外、shader 或本機資源載入錯誤。原始記錄在 `~/city2127-evidence/hull-facade/r5/preview.json`。
- [GitHub main CI](https://github.com/cc100053/city2127/actions/runs/45050847919) 驗證 `2480a948`。Root、survey、module-swap 測試和 build、差異空白及圖檔規格全數通過。[工作分支 CI](https://github.com/cc100053/city2127/actions/runs/45050385398) 驗證 `0ff434b0`，亦已通過。

## R6 · 曲框與深灰金屬

- 業主 cc100053 要求銀色曲框有金屬反光和細紋，深色位置留灰調和表面質感。工作分支 `codex/hull-facade-r6` 由已 fetch 的 `origin/main`（`5b5ef75eef3ccacfc62b2a8f9914a4f8bfefc32b`）開獨立工作樹，基準含 R5 整合 `e675a8f6`、[R5 main CI](https://github.com/cc100053/city2127/actions/runs/45050847919) 所驗證的 `2480a948` 及交接提交。起步時本機 `main` 領先 0、落後 4，未追蹤的 `Dev_QA.md` 保留。
- 與[方向圖](../../artifacts/hull-facade/target.jpg)比較，R5 正午的銀框在斜邊有高光，向外的大面接近單一灰度。黃昏與夜間，銀框大面與深色板都少有變化，深板尤其接近藍黑。簷篷下的夜景以玻璃後暖色天花及夾層燈線為焦點。
- [船身金屬](../../src/hullMetals.ts) 把外露曲框和深色板各合成一批。曲框 UV 順着弧線、窗洞邊及跨退台的折面，使用帶方向的細拉絲和較集中的環境反光。深灰板以船身座標連續投影，配較寬的反光和細微的色調及粗糙度變化。每種材質用一張 256² 貼圖儲存粗糙度、色調和凹凸，遠景由 mipmap 收細。玻璃、入口門楣、室內背牆、兩側列車口及暖光沿用 R5 材質和調光。
- 對 `5b5ef75e` 的程序巨構逐三角比較，70,376 個結構三角面頂點和法線完全相同。8,052 個銀色三角面及 5,444 個深色三角面進入新金屬批次，其餘三角面的材質記錄一致。[巨構測試](../../tests/megastructures.test.ts) 核對兩個批次、完整 UV、mipmap、五處跨層折面及深色面板，並重驗公共退台和入口通行。

### R6 實景及驗證

- [城市主鏡](../../artifacts/hull-facade/r6-hero.jpg)和[立面近鏡](../../artifacts/hull-facade/r6-close.jpg)對照 12:00、18:00、21:25。[銀框和深灰板原尺寸局部](../../artifacts/hull-facade/r6-detail.jpg)由三個時段的近鏡各以同一矩形裁出。[入口回歸](../../artifacts/hull-facade/r6-entry.jpg)比對日夜廣場入口及夜間簷篷下的大堂。
- 開發 Mac Chrome 157.0.8103.79 沿 R5 sidecar 的鏡位與固定場景時間 20 秒，解析度 2400×1350／DPR 1。R5／R6 原圖與 sidecar 在 `~/city2127-evidence/hull-facade/{r5,r6}/after/`。R6 在工作分支提交前擷取，sidecar 記錄基準及 dirty 狀態。
- 正式 build 在同一 Chrome 以 1600×900／DPR 1 檢查 12:00、18:00、21:25。三個時段都有畫布輸出，頁面例外、shader 及本機資源錯誤為零。另在 18:00 慢速水平移動主鏡，九張原尺寸取樣未見新規律條紋。記錄在 `~/city2127-evidence/hull-facade/r6/preview.json` 及 `orbit/`。
- Root `npm test`、`npm run build`、`git diff --check` 通過。
- 開發 Mac（Apple M6／ANGLE Metal）在同一 Chrome 實體視窗測 1920×1080／DPR 1 的正式 build。每個版本各時段量四段 120 幀，略去首段。12:00 的 R5 為 46.5–48.0 FPS、R6 為 44.4–49.0 FPS，21:25 的 R5 為 46.1–49.6 FPS、R6 為 45.0–50.4 FPS。原始量測在 `~/city2127-evidence/hull-facade/r6/fps-compare.json`。

業主視覺驗收及展覽機驗證待完成。

### R6 整合

- 工作分支提交 `2caa4e6a` 已推送。由已 fetch 的 `origin/main`（`5b5ef75e`）在獨立工作樹整合為 `014f2008`。
- 整合版 root `npm test`、`npm run build`、差異空白、圖檔規格及 R6 連結檢查全數通過。整份 `dist/` 與 Chrome 實測的 build 逐檔一致。
- [GitHub main CI](https://github.com/cc100053/city2127/actions/runs/45091927011) 驗證 `74b69ede`。Root、survey、module-swap 測試和 build、差異空白及圖檔規格全數通過。[工作分支 CI](https://github.com/cc100053/city2127/actions/runs/45091490804) 驗證 `2caa4e6a`，亦已通過。
