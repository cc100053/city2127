# Hero holograms — spec R1（2026-11-02）

Owner 決定：**位置跟 `target/hero-layout-night.png`**（Gemini R2 夜，同 R1 位置一樣）；**design 完全跟 `target/hologram-style.webp`**（owner 參考圖）。Gemini 圖入面嘅 panel 物料（實色 teal／紫底、粗框、柱）**唔好跟**。

## 0. 鏡頭同量度

- 只為 hero 全景而設：`?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16|21`，1600×900（同 `baseline/`）。
- 下面每塊 panel 用 **目標畫面座標** `(u, v)`（0–1，左上為 0,0，量自 1600×900 hero 畫面）同 **畫面闊** `w`（佔畫面闊度比例）定位。
- 落位方法（一次過，寫入常數，唔係 runtime 計）：喺 DEV 用 hero 相機由 `(u, v)` 射 ray，撞到嘅建築距離 `d`；panel 中心放喺 `0.82·d`（喺建築前面浮），世界闊度 = `w × 2·tan(hfov/2)·0.82·d`。Panel 一次性 `lookAt(HERO 相機實際位置)`，之後唔做 billboard。四捨五入到 1 m 寫入 `layout.ts` 嘅 `HOLOGRAMS` 常數。
- 每塊 panel 唔可以遮住四個 site 嘅橙框、Civic Core（中央方框塔）核心、空の環 deck；用 `tests/skyRing.test.ts` 同款 hero 視線測試確認。

## 1. Panel 一覽（位置跟 target，內容全日文）

| # | id | 類型 | (u, v) | w | 比例 | 內容 |
|---|---|---|---|---|---|---|
| 1 | `district` | 資訊・大 | (.25, .35) | .15 | 4:3 | 3D wireframe 地球（自轉）+「台場 2127」+ 細資料行「北緯35.62 東経139.77」 |
| 2 | `transit` | 導向 | (.23, .55) | .10 | 2:1 | 「ゆりかもめ 台場駅 →」／巴士 icon「空港シャトル 3分」 |
| 3 | `smartlife` | 廣告・直幡 | (.38, .44) | .025 | 1:4 | 「スマートライフ」直寫 + 細刻度 |
| 4 | `air` | 資訊 | (.40, .59) | .08 | 2:1 | 葉 icon 線稿 +「空気清浄度」「98.7%」 |
| 5 | `newgen` | 廣告 | (.59, .26) | .075 | 3:2 | 線稿手機 +「新世代 登場」 |
| 6 | `release` | 廣告・細 | (.745, .30) | .03 | 1:1 | 線稿方塊 +「新発売」 |
| 7 | `voices` | **live** | (.565, .55) | .095 | 4:3 | 標題「住民の声」、四條 Meter 柱、「提案 N件」 |
| 8 | `daily` | 廣告・直幡 | (.68, .56) | .025 | 1:5 | 「未来の日常」直寫 |
| 9 | `culture` | 廣告・大 | (.77, .54) | .14 | 4:3 | 線稿表演者 + 聲波 +「フジ 文化放送」 |
| 10 | `tide` | 資訊 | (.48, .82) | .13 | 5:2 | 「水位 安定」+ 波形線圖（慢慢流動） |
| 11–13 | `tag-a/b/c` | 細 HUD tag | (.37, .29) (.48, .28) (.95, .36) | .02 | 3:1 | 細三角／點 icon + 兩行細數字（無字或純數字） |

- 公開用語：用「住民の声」，唔用 Gemini 圖嘅「市民の声」（RESIDENT_COPY 用語規則）。
- 廣告全部係虛構 2127 品牌，冇真實商標。
- 顏色：#1–4、#7、#10–13 青白；#5、#6、#8、#9 用少少柔紫（`#c9a8ff`）做**光**，唔做底色。

## 2. 設計（跟參考圖；每塊 panel 共用）

參考圖 hologram 嘅特徵：近乎透明嘅淡青玻璃、幼而光嘅邊、四角 bracket、內容係發光線稿同細 HUD 刻度、四周柔和 bloom、冇柱。

每塊 panel = 一個 `T.Group`，三層 plane（同一 geometry 共用）：

1. **Pane（玻璃）**：`MeshBasicMaterial`，`transparent`、`depthWrite:false`、`toneMapped:false`、NormalBlending；color `#0d3c4a`，opacity 日 `.22`／夜 `.12`；邊緣 alpha 由 canvas 漸變做（中間 1、邊緣 .6），令佢似玻璃唔似板。
2. **Content（發光內容）**：canvas texture（長邊 1024 px，`'Hiragino Sans','Noto Sans JP',sans-serif`），`MeshBasicMaterial({ map, transparent, depthWrite:false, blending:AdditiveBlending, toneMapped:false })`，color 乘數日 `2.2`／夜 `1.6`（要過 bloom threshold 1，先會有光暈）。Canvas 內容：
   - 外框：2 px `#bff6ff` 線，四角 6 px 粗 bracket（長度 = 短邊 10%）。
   - 內部 HUD：一條頂部細分隔線、右上三粒細點、底部一行細刻度（每 8 px 一條，2 px 高）、一兩行 9 px 細數字（例如「04.12 ▸ 0.98」）。
   - 文字：`#e9fdff`，`ctx.shadowColor` 青、`shadowBlur 14`（canvas 內嘅 glow）；標題粗 600，副行 400。
   - Icon／插圖：一律 stroke 線稿 2–3 px，冇 fill（葉、巴士、手機、方塊、表演者、波形）。
   - 底部 12% 高嘅 scanline：每 3 px 一條 alpha .05 橫線，鋪滿整塊。
3. **Halo**：大 1.18× 嘅 plane，用 `voteJourney.ts` 嘅 `glowTexture()` 同款放射漸變（抽出共用，唔好抄），AdditiveBlending，青 `#5fd8ff` opacity 日 `.10`／夜 `.28`。

特別部件：
- `district` 嘅地球係真 3D：`LineSegments`（經緯線 12×8 + 一條傾斜 20° 嘅軌道環），半徑 = panel 高 0.32，放喺 panel 左半前面 0.5 m，`rotation.y += 0.15 rad/s`；材質同 content 一樣 additive、toneMapped false。
- `tide` 波形：canvas 只畫一次；用 texture `offset.x` 慢慢捲（0.03/s），或者 content 分一塊細 plane 只捲波形部分。
- 生命感（全部 shader／uniform 層面，唔重畫 canvas）：上下浮動 ±0.4 m（週期 6–9 s，每塊 phase 唔同）；content opacity 輕微閃 ±4%（低頻，唔好似壞燈）。
- 直幡（#3、#8）可以貼近建築立面，但一樣冇柱、冇實色底。

日夜（`update(now, dark)`，同 `ring.update(dark)` 一樣喺 main loop 叫）：數值喺日／夜兩組之間按 `dark` 線性插值。

夜間地面反光（optional，FPS 有餘先做）：每塊資訊 panel 正下方屋頂／地面放一塊水平 additive 圓形 glow（同一 glowTexture），夜 opacity `.18`，日 0。

## 3. Live 數據（只限 `voices`）

- `setVoices(count)`：「提案 N件」，N 用 `toLocaleString('ja-JP')`；同 `ring.setVoices` 同一處餵（survey `view.guestCount`；standalone 用 `STANDALONE_VOICES`）。
- `setTiers(tiers: Record<LotSocketId, number>)`：四條橫柱，每條長度 = `(tier + 3) / 6`（tier −3..3 clamp），顏色用 `METER_COLORS` 對應軸（Meter 色仍然係唯一飽和色）；標籤用四題公開短詞（人／自律、私／共有、設備／植栽、分散／集中嘅日文版，跟 RESIDENT_COPY 現有字眼，冇就問 Opus）。
- 只喺數值改變時重畫該 canvas（`texture.needsUpdate = true`），唔好每幀畫。
- 柱嘅變化唔做動畫（result timeline 由 headline camera 主導；hero 只顯示累積狀態）。

## 4. 程式位置

- 新檔 `src/heroHolograms.ts`：`heroHolograms(scene)` 回傳 `{ setVoices, setTiers, update(now, dark) }`，結構同 `skyRing.ts` 一樣（module 常數 + factory）。
- `src/layout.ts`：`HOLOGRAMS` 位置／尺寸常數（第 0 節量出嚟嘅值）。
- `src/main.ts`：喺 `skyRing` 旁邊建立，survey view 同 dev meters 兩條路都餵 tiers 同 count；loop 入面叫 `update`。
- GTAO：plane 冇 normal，要加入 AO prepass 跳過嘅 overlay（`main.ts` 現有嘅 `hideFlat` 名單，同 light trails 一樣），否則 AO 會喺 panel 上面畫黑條。
- `docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md`：喺 §15 同 hero amendment 加「Owner amendment (2026-11-02)：hero 全景可以有 hologram 資訊同虛構廣告，物料跟 `artifacts/hero-holograms/target/hologram-style.webp`；close-up 同街道層照舊」。

## 5. 測試

- 新 `tests/heroHolograms.test.ts`：
  - panel 數 = 13；每塊全部可見文字唔含拉丁字母（`/[A-Za-z]/`）。
  - hero 視線：四個 site（地面／¼ 高／頂）同 Civic Core 中心冇被任何 panel 擋（同 `skyRing.test.ts` 嘅方法）。
  - `setTiers` clamp：tier 9 → 柱長 1，−9 → 0；`setVoices(1284)` → 「提案 1,284件」。
- 其他 test 照過：`npm test && npm run build && git diff --check`。

## 6. 截圖（存 `r1/`）

- `hero-h16.png`、`hero-h21.png`（同 baseline URL）
- `vs-target.jpg`：每行 baseline｜target（layout）｜R1，日夜各一行；再加一張 `style-crop.jpg`：R1 `district` 同 `air` 兩塊 panel 放大，旁邊放參考圖左邊「2127」同「CLEAN AIR」嘅裁圖。
- FPS：hero 1920×1080 vsync，`hour=16` 同 `21`，load 25 s 後每 2.5 s 讀 canvas `data-fps` 4 次（丟第一次）；同時記 draws／triangles 對比 baseline（R4 sky ring：draws 1009）。低過 60 FPS 唔收。

---

# R2（2026-11-02）— 內容打磨

Owner：唔要表演者，換做其他嘢；打磨 panel 顯示嘅內容。位置、數量、三層物料同 live 接口唔變。R1 審核問題：字太矇、文字同圖形重疊、日間玻璃偏灰白、panel 比 target 細、pod 遮住 `air`。

## A. 字要清（所有 panel）

- **兩次畫**：每段文字同線稿先畫一次 glow（`shadowBlur 6·k`、alpha .55），再喺上面畫一次**冇 shadow** 嘅實色（`INK`）。唔好再用 22·k 嘅大 blur 做唯一一層。
- **最細字**：喺 1600×900 hero 截圖入面，每個字最少 **12 px 高**（標題 ≥ 18 px）。用 panel 嘅畫面闊度換算 canvas 字號；放唔落就刪字，唔好縮細。
- 數字用 tabular（`font-variant-numeric` 唔得就用等寬數字字體 fallback `'SF Mono',monospace`），粗 600。
- Texture：`anisotropy = renderer.capabilities.getMaxAnisotropy()`，mipmap 開；大 panel（`district`、`culture`、`voices`、`tide`）canvas 長邊 2048，其餘 1024。

## B. 版面：分區、唔重疊

每塊 panel 用固定分區（比例係 canvas 闊／高）：留 6% 內邊距；文字區同圖形區唔可以重疊；HUD 刻度行只佔底部 10%，唔好壓住內容。

| id | 版面 |
|---|---|
| `district` | 左 48%：3D 地球（半徑改為 panel 高 .28，中心對準左區中心，唔好伸入右區）。右 52%：「台場」（大）、下面「2127」（更大數字）、細分隔線、一行細字「北緯35.62 東経139.77」。 |
| `transit` | 兩行表格，中間一條分隔線。每行：左 icon（列車／巴士線稿）、中站名、右邊大數字或箭咀：「ゆりかもめ 台場駅 →」；「空港シャトル 3分」。 |
| `air` | 左 30%：葉 icon。右 70%：上細字「空気清浄度」、中大數字「98.7%」、底一條細 sparkline。 |
| `voices` | 頂行：左「住民の声」、右「提案 N件」。四行：左 38% 標籤、右 62% 柱（細外框 track + Meter 色實柱，柱尾一粒亮點）。行距平均，唔好貼邊。 |
| `tide` | 左 35%：「水位」「安定」上下兩行大字。右 65%：波形圖，加淡格線同一個細標「潮位 +12」（唔用 m／cm，因為拉丁字母唔准）。 |
| `newgen` | 左 35% 手機線稿；右 65%「新世代」「登場」兩行。 |
| `release` | 上 65% 方塊線稿；下 35%「新発売」。 |
| `smartlife`、`daily` | 直寫字放大到欄闊 70%，置中；頂同底各一組細刻度。 |
| `culture` | 見 C。 |

## C. `culture` 換內容：表演者 → 球體展望室（Fuji TV 球）

- 刪 `performer` 函數同所有表演者線稿。
- 新圖（左 50%）：Fuji TV 球體展望室線稿 — 一個圓（經緯線 4×3），下面一段方格框架（2 層、3 格），球兩邊各三條同心廣播弧（左右對稱，越外越淡）。
- 右 50%：「フジ」大字、「文化放送」、細字「今夜 20:00 湾岸フェス」。
- 紫色光（`VIOLET`）只用喺呢塊同其他廣告；Meter 色唔用。

## D. 日間玻璃同大小

- 日間 pane：`#0a5468`，opacity `.45`（R1 `.62` 偏灰白）；content 日間乘數 `2.6`，令青白字喺深 teal 玻璃上跳出嚟。夜間不變。
- 跟 target 放大：`district` w .14、`voices` .11、`air` .095、`transit` .11、`tide` .14、`culture` .15；放大之後 sightline test 一定要過，唔過就逐塊縮返到過為止，報告最後數值。
- `air`：放喺 `0.7·d`（比其他近啲），或者向上移到 pod 航道上面，總之 hero 截圖入面唔可以被 pod 遮住。

## E. 測試同截圖

- `tests/heroHolograms.test.ts`：加「冇 `performer`」唔使；加 `culture` 文字有「フジ」「文化放送」；所有字仍然冇拉丁字母。
- 截圖存 `r2/`：`hero-h16.png`、`hero-h21.png`、`vs-target.jpg`（每行 R1｜target｜R2，日夜各一行）、`panels-crop.jpg`（R2 日間每塊 panel 原尺寸裁圖排成一張，方便睇字清唔清）。
- FPS 同 R1 一樣量（1920×1080，hour 16／21）。

---

# R3（2026-11-02）— 一個大字 + 科幻細節線條

Owner：質感問題係內容。參考圖每塊 panel 係**一個大字**（例如「2127」、「98.7%」），再加一啲**科幻細節線條**，咁先有質感；唔係好多行細字。位置、大細、物料三層、live 接口唔變。

## A. 內容規則（所有 panel）

- 每塊最多 **兩段字**：一個主字（大），最多一個副字。主字喺 1600×900 hero 截圖 ≥ **30 px** 高，副字 ≥ **20 px**。R2 所有 < 20 px 嘅字全部刪除（座標、站名細行、標籤、「今夜 20:00」、「湾岸フェス」、「潮位 +12」、tag 數字）。
- 刪咗嘅字由**細節線條**補位，唔好留空。
- 層次（alpha）：主字 1.0 → 主線稿（icon、地球、波形、柱）.9 → 細節線條 .35–.55 → 背景格／點陣 .15–.25。細節線條喺畫面上大約 1 px 闊（`d.sc` 換算），唔好粗。

## B. 細節線條 kit（共用函數，喺 `heroHolograms.ts` 寫一次，各 panel 揀用）

1. `circuit`：直角走線，轉角 45° 斜切，末端細圓點（2–4 條一組，由 panel 邊伸入，避開主字）。
2. `arcGauge`：同心半圓／四分一圓弧，外圈有刻度（每 6°），一段較亮代表數值。
3. `ticks`：邊緣刻度尺（長短交替），配一兩個細三角箭咀。
4. `dotGrid`：細點陣小方塊（6×4 點）。
5. `dataBlocks`：一排細長方塊（長短唔同，好似 level meter），冇字。
6. `crosshair`：十字準星 + 細圓，放喺圖形旁邊。
7. `bracketLines`：主字左／右側嘅細括號線，同一條長分隔線，線尾一粒點。

每塊 panel 用 3–5 種，密度跟參考圖左邊「2127」嗰塊（細線多但唔搶主字）。

## C. 每塊 panel

| id | 主字 | 副字 | 圖形 + 細節 |
|---|---|---|---|
| `district` | 「2127」 | 「台場」 | 3D 地球照留；地球外加 `arcGauge` 同 `crosshair`；右下 `circuit` + `dotGrid` |
| `transit` | 「台場駅」 | 「3分」 | 列車線稿 icon；一條路線圖（橫線 + 5 粒站點，台場站最亮 + 箭咀）；`ticks` |
| `air` | 「98.7%」 | 「空気」 | 葉 icon 外圍一個 `arcGauge`（98.7% 亮）；底 sparkline；`dataBlocks` |
| `voices` | 「住民の声」 | 「N件」（live，`toLocaleString('ja-JP')`） | 四條 Meter 色柱（冇標籤），柱旁 `ticks` 刻度；`bracketLines`；`dotGrid` |
| `tide` | 「水位 安定」 | — | 波形 + 淡格線；`ticks` 喺左右兩邊；`circuit` 一組 |
| `newgen` | 「新世代」 | — | 手機線稿；`crosshair`；`dataBlocks` |
| `release` | 「新発売」 | — | 方塊線稿；`ticks` |
| `smartlife`、`daily` | 直寫（不變） | — | 上下加 `ticks`；兩側細 `circuit` 線 |
| `culture` | 「フジ」 | 「文化放送」 | 球體 + 廣播弧照留；`arcGauge`；`circuit` |
| `tag-a/b/c` | — | — | 冇字：細三角 icon + `dataBlocks` + 一條 `circuit` |

## D. 日間玻璃

- 字少咗、大咗，字底深色片可以減：under-text alpha 只喺主字同副字範圍；日間 pane opacity 由 .95 試降（目標 .7–.8），以主字仍然清楚為準，報告最後數值。

## E. 測試同截圖

- `tests/heroHolograms.test.ts`：每塊 ≤ 2 段字；主字 ≥ 30 px、副字 ≥ 20 px（`glyphs()`）；`voices` 副字 = 「1,284件」（`setVoices(1284)`）；`culture` 有「フジ」「文化放送」；仍然冇拉丁字母；視線測試照舊。
- 截圖存 `r3/`：`hero-h16.png`、`hero-h21.png`、`vs-target.jpg`（每行 R2｜參考圖裁片｜R3，日夜各一行）、`panels-crop.jpg`（日間每塊原尺寸）。
- FPS 同前（1920×1080，hour 16／21）。

---

# R4（2026-11-02）— 減三塊、玻璃發光、加密細節

Owner：拿走三塊冇咁重要嘅 panel（而家太多），其餘繼續打磨質感。

## A. 刪走（Opus 揀，最次要、最搶畫面）

- `newgen`「新世代」、`release`「新発売」：兩塊細廣告，冇資訊，擠喺天際線。
- `smartlife`「スマートライフ」：直幡擋住 Civic Core 左邊，同 `daily` 重複。
- 由 `HOLOGRAMS`、`heroHolograms.ts`、測試全部刪除（包括只俾佢哋用嘅 icon 函數）。剩 10 塊：`district`、`transit`、`air`、`voices`、`tide`、`daily`、`culture`、3 個 tag。

## B. 玻璃要有內發光（參考圖最大分別）

- Pane 改為**飽和藍青玻璃**：canvas 漸變 fill，邊緣較亮（`#2fb8e0`，alpha .55）→ 中間較深（`#0a4a66`，alpha .35），即係邊緣內發光；夜間同一組顏色，整體 opacity 低一級。
- 內框：外框入面 4% 再加一條淡青細線（alpha .3），玻璃厚度感。
- 頂部一條斜向淡白反光帶（alpha .08，佔高度 15%），似玻璃反光。
- 主字底嘅深色片取消：主字靠玻璃深色中心 + 實色字自己讀得清；如果日間讀唔清，只加柔邊（羽化 ≥ 主字高 40%）嘅暗暈，唔好有硬邊方塊。
- `culture`、`daily` 用同一套，只係將青換做柔紫（`#a98cf0`／`#3a2a66`）。

## C. 細節密度（目標：參考圖左邊「2127」）

- `district`：加淡日本地形輪廓（東京灣海岸線，簡化 polyline，alpha .3）喺地球後面；地球外兩層 `arcGauge`（唔同半徑，反向缺口）；四角 `crosshair` 或細 L；右邊主字下加 `dataBlocks`。
- 每塊資訊 panel 細節件數由 3–5 加到 5–7，但唔可以壓住主字（主字周圍留主字高 30% 嘅淨空）。
- 背景加一層淡 hex 網或點陣（alpha .12），鋪滿玻璃。

## D. `voices` 間距

- 「住民の声」主字同「N件」分開兩行或左右分開，中間淨空 ≥ 副字高；用 `setVoices(99999)` 試最長數字都唔可以撞（加測試）。

## E. 測試同截圖

- 測試：panel 數 = 10；`newgen`／`release`／`smartlife` 唔存在；`voices` 99,999件 唔撞主字（用 `glyphs()` bbox）；其他照舊。
- 截圖 `r4/`：`hero-h16.png`、`hero-h21.png`、`vs-target.jpg`（每行 R3｜參考圖 panel 裁片｜R4）、`panels-crop.jpg`。
- FPS 同前。

## R4 追加（2026-11-02，owner）— 再刪兩塊、改為居民尺度

Owner：再刪兩塊；hologram 係俾城入面嘅居民睇，所以距離同大細要改。以下取代 R1–R4 嘅「由 hero 相機射 ray 落位、面向 hero」做法。

### F. 再刪

- `daily`「未来の日常」（同 `culture` 重複廣告角色）、`tide`「水位 安定」（同 `air` 重複環境數據，又坐喺前景中央）。刪除方式同 A。
- 剩：`district`、`transit`、`air`、`voices`、`culture`、3 個 tag。

### G. 居民尺度落位（貼建築／廣場，面向街道）

每塊錨定喺一個真實嘅居民場景，朝向嗰度嘅行人視點（眼高 1.6 m），唔再面向 hero：

| id | 錨點（喺 code／layout 搵實際位置，用 raycast 確認貼得到） | 闊 | 底邊高度 | 朝向 |
|---|---|---|---|---|
| `transit` | ゆりかもめ台場駅（或最近嘅 Yurikamome 站／行人 deck）入口上方 | 10–14 m | deck 上 6–10 m | 面向站前行人 deck，向下傾 10° |
| `voices` | 居民聚集嘅公共廣場（揀 hero 睇得到、唔係四個 site 橙框入面嘅廣場或 deck） | 12–16 m | 地面上 8–12 m | 面向廣場中心 |
| `air` | 住宅塔立面中段，貼牆（離牆 1–2 m 浮） | 8–12 m | 25–40 m | 面向下面條街，向下傾 15° |
| `district` | 城市級地標屏：Civic Core 或旁邊大樓面向主廣場／主行人軸嘅立面 | 24–32 m | 40–70 m | 面向主廣場 |
| `culture` | Fuji TV 媒體立面（球體附近），面向廣場 | 18–24 m | 30–55 m | 面向廣場 |
| `tag-a/b/c` | 行人天橋／路口嘅細導向標 | 3–5 m | 地面或 deck 上 5–8 m | 面向行人流向 |

- 主字高度 ≥ 該 panel 主要觀看距離 / 40（例如 60 m 外睇 → 主字 ≥ 1.5 m）；寫入測試（以世界米計）。
- Hero 鏡頭唔再要求主字 ≥ 30 px；改為：每塊喺 hero 截圖入面最少部分可見（唔被完全遮住），而且仍然唔遮四個 site 橙框、Civic Core 核心（視線測試照舊）。
- 浮動幅度縮細到 ±0.15 m（貼牆嘅零浮動），因為貼近建築。
- `HOLOGRAMS` 每項加錨點名（comment 一行）同 `face`（面向嘅世界點），取代 hero 眼位。

### H. 日間玻璃

- R4 日間截圖玻璃太實太奶白，似磨砂板：日間 pane 整體 opacity 再降（目標邊緣發光保留、中心可以睇穿後面建築），報告最後數值。

### I. 截圖（`r4/`，取代之前未完成嘅一套）

- `hero-h16.png`、`hero-h21.png`、`vs-target.jpg`（R3｜參考圖裁片｜R4）。
- **居民視角**：每塊一張 `street-<id>-h16.png`（`?review=street&cam=x,y,z&at=x,y,z&reviewTime=40&hour=16`，相機喺行人眼高 1.6–3 m、距離 panel 30–80 m），另加 `street-voices-h21.png`。
- FPS 同前。
