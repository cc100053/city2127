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
