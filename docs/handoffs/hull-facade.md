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

## R7 · 船首列車口

- 業主 cc100053。工作分支 `codex/hull-facade-r7` 由已 fetch 的 `origin/main`（`d8c1fe5794fdee63488f36179b750b7297d6ee3f`）建立，含 R6 整合 `014f2008` 及 [R6 main CI](https://github.com/cc100053/city2127/actions/runs/45091927011) 所驗證的 `74b69ede`。本機 `main` 在 `2df6d8b6`，領先 0、落後 8。兩個獨立工作樹分別用於實作及整合，保留原工作區未追蹤的 `Dev_QA.md`。
- [方向圖](../../artifacts/hull-facade/target.jpg) 的銀色曲框沿船側接入有深度的列車口。R6 兩端的矩形光帶在深色封板前。比較兩端的實際列車和斜前鏡位後，選靠廣場一端（船身局部 `+u`）。此角度可把相鄰曲框、入洞列車及兩條軌道放在同一畫面。
- 以 R6 的 18 × 14 m 口徑切開局部端牆及相交板件。原口面後留 9.1 m 襯板，由拉絲銀向深灰金屬轉入，末段在船身內遮蔽。凹入的冷白導光跟隨原日夜係數，合成一批；銀框及襯板分別併入現有兩個金屬批次。門套和切口按這端船身剖面與軌道定形，屬該地標構件。移一株碰到凹口的低層邊緣灌木到靠海一排，並縮細其樹冠。三處公共退台、大堂、遠端外觀及兩條路徑沿用 R6。
- 本輪實體淨空查核由原洞口至門套終端，車輛隨原路線在船身內遮蔽。船身內部的完整鐵路廊道未建模。

### R7 驗證

- [巨構測試](../../tests/megastructures.test.ts) 驗證原口面位置與尺寸、門套後緣、四邊導光、入口矩形淨空及日夜燈值。以 0.02 秒間隔沿兩條原軌道套用實際列車姿態及頭／中／尾車 GLB，門套範圍內抽樣到的最小淨距分別為 1.84／3.75 m。
- 另一端局部掃描盒 `u=−94.2…−91, y=7…25, d=36…62.5` 中的 594 個三角面，頂點、法線及材質與 R6 基準逐面一致。
- 開發 Mac 的 Chrome 157.0.8103.79（Apple M6／ANGLE Metal），1600×900／DPR 1 的正式 build 在 12:00、18:00、21:25 都有持續畫布輸出。另以相同環境的 DEV 斜前方鏡位，在 21:25 記錄實時車頭由門外穿過口面至遮蔽面之後的 169 幀。頁面例外、shader 錯誤及本機資源錯誤均為零。記錄見 `~/city2127-evidence/hull-facade/r7/browser.json`。
- [黃昏及夜間列車入洞](../../artifacts/hull-facade/r7-bow.jpg) 採用 `review=street&cam=-126.6,29,-30.1&at=-175,18,40`，場景時間 65.7、66.2、67.06 秒。三格分別見車頭接近、進入口面、前車深入門套。
- [城市主鏡](../../artifacts/hull-facade/r7-hero.jpg)、[立面近鏡](../../artifacts/hull-facade/r7-close.jpg) 和[廣場及大堂入口](../../artifacts/hull-facade/r7-entry.jpg) 沿用 R6 的鏡位、時間和 2400×1350／DPR 1。原圖和 sidecar 在 `~/city2127-evidence/hull-facade/{r6,r7}/after/`。
- Root `npm test`、`npm run build`、`git diff --check` 通過。

受測程式提交為 `4dd323bd`，擷取批次在提交前開始，sidecar 記錄起始基準和 dirty 狀態。

業主目視驗收及展覽機驗證待完成。

### R7 整合

- 工作分支 `2eb07029` 已推送。整合工作樹快轉至最新的 `origin/main`（`ea3e72ac`，含展覽名稱文件更新），合併為 `1edcc3e5`。
- 在整合提交重跑 root `npm test`、`npm run build`、差異空白及圖檔規格檢查，全部通過。整份 `dist/` 與 Chrome 已驗證的版本逐檔一致。
- [GitHub main CI](https://github.com/cc100053/city2127/actions/runs/45096108330) 驗證 `20df13be`。Root、survey、module-swap 測試和 build、差異空白及圖檔規格全數通過。[工作分支 CI](https://github.com/cc100053/city2127/actions/runs/45095704364) 驗證 `2eb07029`，亦已通過。

## R8 · 船首門套向主鏡折返

- 業主 cc100053。工作分支 `codex/hull-facade-r8` 從 2026-11-23 已 fetch 的 `origin/main`（`c685f8238fed22d81f9f463ce604207d8f7161d0`）開獨立工作樹。基準含 R7 整合 `1edcc3e5` 及 [R7 main CI](https://github.com/cc100053/city2127/actions/runs/45096108330) 所驗證的 `20df13be`。原工作區在本機 `main` 的 `2df6d8b6`，領先 0、落後 16，未追蹤的 `Dev_QA.md` 和 `Presentation.md` 保留。
- R7 門套與 Hero 在平面上相差約 88°。R8 把靠廣場一端的靠海銀框折面向 Hero 轉 35°，外側接回船身曲框，冷白燈槽跟着折面收進洞口。靠海段加闊燈槽的可見表面，沿用原有燈值、拉絲銀和深灰金屬批次。新幾何留在原 18 × 14 m 通車包絡之外，洞深仍為 9.1 m。兩條列車路線、另一端、船身主體、大堂、公共退台及固定 Hero 鏡位沿用 R7。
- [固定 Hero 黃昏 A/B](../../artifacts/hull-facade/r8-hero-ab.jpg) 採用 18:00、場景時間 20 秒、2400×1350／DPR 1。25° 已可見冷白邊，35° 的冷白邊在軌道上下較容易連起來看，和旁邊銀面分隔也較清楚。斜前方仍可看見列車進入口面和深灰內襯，採用 35°。

### R8 驗證

- [巨構測試](../../tests/megastructures.test.ts) 以射線核對銀面折角、Hero 對靠海導光的通視、四邊導光、原口徑和深處遮蔽面。從凹口末段至 R7 口面外 5 m 查核三角面，通車包絡內部無結構面。沿兩條原軌道每 0.02 秒套用頭／中／尾車 GLB；R7 量測段距名義口徑四邊的最小淨距仍為 1.84／3.75 m，抽樣段延至新門套前方則為 1.84／3.12 m。另一端與 R7 局部掃描盒比對，594 個三角面的頂點、法線及材質逐面一致。
- [黃昏及夜間入洞圖集](../../artifacts/hull-facade/r8-bow.jpg) 沿用 R7 斜前方鏡位和 65.70、66.20、67.06 秒。三格依次為車頭接近、越過口面及前車進入凹口。[廣場及大堂入口](../../artifacts/hull-facade/r8-entry.jpg) 保留 R7 的廣場日夜及夜間簷下三個鏡位。原圖及 sidecar 在 `~/city2127-evidence/hull-facade/r8/`。
- 開發 Mac Chrome 157.0.8103.79（Apple M6／ANGLE Metal），正式 build 1600×900／DPR 1 在 12:00、18:00、21:25 均有持續畫布輸出。同一瀏覽器用 DEV 斜前方鏡位實時追蹤頭車，18:00／21:25 分別記錄 169／144 幀跨越口面、深入遮蔽面後方。頁面例外、shader 和本機資源錯誤為零。紀錄在 `~/city2127-evidence/hull-facade/r8/browser.json`。
- Root `npm test`、`npm run build`、`git diff --check` 通過。

受測程式提交為 `37d487b7c66d160101e4b518fd2955e1bb435504`。A/B 與選定版本的擷取批次均在程式提交前開始。Sidecar 記錄基準 `c685f823` 及 dirty 狀態。

業主目視驗收及展覽機驗證待完成。

### R8 整合

- 工作分支 `06feed99` 已推送。從最新 `origin/main`（`c685f823`）在獨立工作樹整合為 `105abb0952204b4ea7a43b75bb010f43d788d9a0`。
- 整合版 root `npm test`、`npm run build`、差異空白、圖檔規格及新文件連結全數通過。整份 `dist/` 與 Chrome 驗證的 build 逐檔一致。
- [GitHub main CI](https://github.com/cc100053/city2127/actions/runs/45112366858) 驗證 `abbe1c87dcae4d1fccc035800f6220ed56d1abf8`。Root、survey、module-swap 的測試與 build、差異空白及圖檔規格全數通過。

## R9 · 削開船首近側牆

- 業主 cc100053 確認依橙色虛線示意削去遮住洞口的近側牆。工作分支 `codex/hull-facade-r9` 由已 fetch 的 `origin/main`（`a142d27fc811f19a7e922c7b453ac1e1f27ae256`）建立。原工作區的本機 `main` 領先 0、落後 21，未追蹤的 `Dev_QA.md` 和 `Presentation.md` 保留。[R8 main CI](https://github.com/cc100053/city2127/actions/runs/45112366858) 已驗證 `abbe1c87`。
- 船首靠海側的最低兩級裙樓削成向外張開的凹口。切口沿原船身的高差轉接，以深灰金屬襯板封合，薄拉絲銀邊和原冷白日夜導光延至切口。少量角落灌木移回有樓板承托的範圍。構件是船身本體的場地專用幾何，沿用現有材質批次。固定 Hero、兩條軌道、18 × 14 m 通車包絡、既有口面至遮蔽面 9.1 m 深度及大堂與公共退台沿用 R8。

### R9 驗證

- [巨構測試](../../tests/megastructures.test.ts) 從固定 Hero 驗證靠海導光，以及穿過削口看見深灰內壁和深處的遮蔽。從正面驗證原口深及靠內陸側的導光。兩條實際軌道以每 0.02 秒取樣頭／中／尾車 GLB，延伸段的淨空為 1.84／3.12 m，原口面段為 1.84／3.75 m。另一端的 594 個三角面與 R8 的頂點、法線和材質逐面一致。
- [R8／R9 固定 Hero 黃昏對照](../../artifacts/hull-facade/r9-hero.jpg) 以 18:00、固定場景時間 20 秒、2400 × 1350／DPR 1 擷取全幅及放大局部。兩條亮軌伸入同一個深灰洞腔。前景廣場步道仍從洞口下緣前方掠過。
- Root `npm test`、`npm run build`、`git diff --check` 通過。程式提交為 `b0804cae09e8edcab98e2bc62dc653e752300341`。最終 Hero sidecar 記錄此提交及擷取時的文件改動。
- 開發 Mac 的 Chrome 157.0.8103.79（Apple M6／ANGLE Metal）以 1600 × 900／DPR 1 驗證最終正式 bundle，12:00、18:00、21:25 三個時段持續更新畫布。斜前方 DEV 鏡位在 18:00／21:25 分別記錄 124／168 個實時幀，頭車由口面外進入，並深入至遮蔽面後方。頁面例外、shader 及本機資源錯誤為零。原始記錄為 `~/city2127-evidence/hull-facade/r9/{production-final,browser}.json`。
- [黃昏及夜間入洞](../../artifacts/hull-facade/r9-bow.jpg) 沿用 R8 斜前方鏡位，在場景時間 66.20 秒核對頭車越過口面。[廣場及簷下入口](../../artifacts/hull-facade/r9-entry.jpg) 比對 R8 和 R9 在廣場日夜及夜間簷下的三個鏡位，入口門框、簷篷及暖光大堂皆通過回歸。最終八張 2400 × 1350／DPR 1 原圖及 sidecar 在 `~/city2127-evidence/hull-facade/r9/final/`，頁面例外為零。

業主目視驗收及展覽機驗證待完成。

### R9 整合

- 工作分支 `b237ca14` 已推送。從最新 `origin/main`（`a142d27f`）在獨立工作樹整合為 `4ef277d40eae420bec04f5852ed867db5a084808`。
- 整合版 root `npm test`、`npm run build`、差異空白、圖檔規格及九個新文件連結全部通過。整份 `dist/` 與 Chrome 驗證過的正式 build 逐檔一致。
- [GitHub main CI](https://github.com/cc100053/city2127/actions/runs/45116374931) 驗證 `c4213944a5d7e3349f92c5a634801d5abf8ab692`。Root、survey、module-swap 的測試與 build、差異空白及圖檔規格全數通過。

## R10 · 船首洞口雙層銀框

- 業主 cc100053 指示按 Target 右下角列車口打磨靠廣場一端的外框。工作分支 `codex/hull-facade-r10` 從 2026-11-23 已 fetch 的 `origin/main`（`3f1c0a57f41e39d3511064b0a3bc094aeab3c70f`）開獨立工作樹，包含 R9 幾何 `b0804cae` 及已通過主線 CI 的 `c4213944`。本機主工作區的 `main` 在 `2df6d8b6`，領先 0、落後 26，兩份未追蹤的 `Dev_QA.md` 和 `Presentation.md` 保留。[業主 Target](../../artifacts/hull-facade/target.jpg) · [R9 main CI](https://github.com/cc100053/city2127/actions/runs/45116374931)
- Target 以闊銀外緣、較窄的內緣和中間暗縫交代厚度。R10 以同一組連續剖面包住洞口，上框沿靠海削口轉入端牆，下框從角肋外側返回低層船身，外緣逐步收薄並疊接相鄰銀色曲帶。試拍曾見原角肋遮住下框一段，最終把下框的折返移到角肋外側。
- 外框依 R9 削口和兩級船身定形，是場地專用的程序幾何。各段共用現有拉絲銀、深色材質及冷白導光批次。原口面、18 × 14 m 通車包絡、9.1 m 洞深、兩條軌道及固定 Hero 沿用 R9。Target 的鏡位較正，概念圖的上下框露得較完整。遊客主鏡的前景步道和退台植栽仍會掠過局部銀框。[外框程式](../../src/hullPortal.ts)

### R10 驗證

- 受測程式提交 `88486657a1539f7b454c5be0dac6fd17c8db00a4`。巨構測試從固定 Hero 逐一命中兩道銀緣和中間較深的暗槽，核對內壁與遮蔽面的通視；由端牆前檢查上框轉角及下框跨過角肋。兩路原軌道每 0.02 秒套用實際頭／中／尾車 GLB，查核洞口結構和矩形包絡。原口面段最小淨距 1.84／3.75 m，延伸量測段 1.84／3.12 m。[巨構測試](../../tests/megastructures.test.ts)
- 另一端與本輪基準的 594 個三角面逐面核對，頂點、法線、材質完全一致。現有測試繼續檢查廣場大堂、15／60／105 m 公共退台和望海通視。
- 正式 build 在開發 Mac 的 Chrome 157.0.8103.79（Apple M6／ANGLE Metal）以 1600 × 900／DPR 1 檢查 12:00、18:00、21:25，畫布持續更新。斜前方 DEV 鏡位於 18:00 及 21:25 各記錄 168 個實時幀，頭車由口面外進入並深入遮蔽面後方。頁面例外、shader 及本機資源錯誤皆為零。記錄存於 `~/city2127-evidence/hull-facade/r10/browser.json`。
- 巨構合批仍為 14 組。非 instanced 結構總數由 70,831 增至 72,177 個三角面。
- 固定 Hero 沿用 18:00、場景時間 20 秒。全幅和同一裁切位置可比較 R9 與 R10，方向圖與斜前方另放在同一對照板。斜前方的 65.70、66.20、67.06 秒依序顯示接近、跨口面、深入洞腔。廣場日夜與夜間簷下的三組對照覆核外門框、簷篷及室內暖光。[固定 Hero 與 Target](../../artifacts/hull-facade/r10-hero.jpg) · [列車入洞](../../artifacts/hull-facade/r10-bow.jpg) · [入口回歸](../../artifacts/hull-facade/r10-entry.jpg)
- 最終八張 Chrome 原圖及 sidecar 為 2400 × 1350／DPR 1，來自乾淨的 `88486657`，頁面例外皆為零。原檔存於 `~/city2127-evidence/hull-facade/r10/review/`，新拍的 R9 基準存於 `r10/baseline/`。Root `npm test`、`npm run build`、`git diff --check` 通過。
- 業主目視驗收及展覽機驗證待完成。

### R10 整合

- 工作分支 `683f15c8` 已推送。從最新 `origin/main`（`3f1c0a57`）在獨立工作樹整合為 `50663a18663f26178a191d779c9ea202bc40bab1`。
- 整合版 root `npm test`、`npm run build`、差異空白、圖檔規格及 12 個本機文件連結全部通過。整份 `dist/` 與 Chrome 驗證的正式 build 逐檔一致。
- 開發 Mac 的實體 Chrome 視窗用 1920 × 1080／DPR 1 量固定 Hero。每個時段量四段 120 幀並略去首段，12:00 為 53.3–57.6 FPS，21:25 為 55.7–59.9 FPS。實測記錄在 `~/city2127-evidence/hull-facade/r10/fps.json`。
- 主線 CI 驗證 `278815813ac3be7e82bdd3e308c01773152c567e`，工作分支 CI 驗證 `683f15c88dce67289eef43dda1b2ae2072530d97`。兩次 root、survey、module-swap 的測試與 build、差異空白及圖檔規格全部通過。[主線 CI](https://github.com/cc100053/city2127/actions/runs/45120282706) · [工作分支 CI](https://github.com/cc100053/city2127/actions/runs/45119781863)

## R11 · 連續橢圓弧與船身曲帶

- 業主 cc100053 指示打磨靠廣場的列車口，由 [Target](../../artifacts/hull-facade/target.jpg) 的完整橢圓感、上下展闊的銀帶及雙緣着手。以 2026-11-23 已 fetch 並核對遠端的 `origin/main`（`e92eb4cfbba56a3df8627249c2f805c36b79766c`）開獨立工作樹 `codex/hull-facade-r11`。基準含 R10 程式 `88486657`；主工作區 `main` 在 `2df6d8b6`，領先 0、落後 31，保留未追蹤的 `Dev_QA.md` 和 `Presentation.md`。
- 用 R10 固定 Hero 和斜前方鏡位驗證。保護 R9 靠海側視線、R10 越過角肋的下框、原口面至遮蔽面的 9.1 m、18 × 14 m 包絡及兩條軌道。保留另一端、大堂及公共退台。屬船身獨有的程序曲面，沿用現有銀框、深灰襯板及導光批次。
