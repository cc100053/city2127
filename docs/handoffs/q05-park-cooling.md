# q05-park-cooling — Q05 公園降溫三態：目標圖與建築故事

- Owner: repository owner
- Status: IN_PROGRESS。Q05-A R1 已建模、放入 NE PARK 並接入輪換（2026-11-27），等待 owner 評審；B、C 未建模。
- Branch: `feat/q05a-reverse-ac`（worktree `../city2127-q05a`），自 `origin/main` `bbec76c2`；目標圖記錄見舊分支 `docs/q05-targets`（已合併）。
- Base commit: `bbec76c26a833a2a5ba24dfc42f3cee3f9a03c0c`
- Last verified commit: 見下文 R1 一節（R1 提交）。
- Remote availability: `origin/feat/q05a-reverse-ac`（R1 推送後）；未合併入 main，須待 owner 接受。

## Session Git state

- 主工作目錄當時在另一工作的分支 `feat/aoi-cinematic`，有未提交的葵模型改動，未有觸碰；本記錄在獨立 worktree `../city2127-q05-targets` 完成。
- 2026-11-26 fetch 成功，origin/main 為 `714b4ef3`。

## 背景與決定

原 Q05「真夏のお台場を歩くなら、暑さにどう対応したい？」的三個答案都是「怎樣走路」，即行為，不是物件，因此之前的構想不是體積過大，就是要「跟著行人的樹蔭」或「要特意走進去的球」，一眼看不明白。owner 2026-11-26 決定改以**公園降溫**為主題：三個答案是三座同級的地標，各自用一種方法主動改變溫度。純遮陽已被否決，因為今天的靜態簷篷已經做得到，2127 年沒有存在理由。

三者的分工：

| 選項 | 方法 | 一眼看到 |
| --- | --- | --- |
| A | 用機器把熱搬走 | 一座把熱噴上天空的玻璃塔 |
| B | 讓植物把冷送出來 | 一株葉子比屋頂還大、葉邊落霧的植物 |
| C | 由城市直接製造天氣 | 公園上空一朵下雪的雲 |

題目及選項文案的建議（**未改** `survey/src/survey/questions.rotation.v1.json`；改題目時須同步重生變化總覽 `artifacts/change-review`）：

「真夏のお台場の公園、どうやって涼しくしたい？」

- A 熱を空へ捨てる。
- B 植物に涼しさをつくってもらう。
- C 公園の上に冷たい雲をつくる。

## 目標圖

原圖在 `~/city2127-evidence/q05-targets/final/`，發佈版本（JPEG，寬 2000 px）：

| 選項 | 目標圖 |
| --- | --- |
| A 逆向冷氣機 | [q05a-reverse-ac.jpg](../../artifacts/q05-targets/q05a-reverse-ac.jpg) |
| B 呼吸巨葉 | [q05b-breathing-leaf.jpg](../../artifacts/q05-targets/q05b-breathing-leaf.jpg) |
| C 雪雲噴泉 | [q05c-snow-cloud.jpg](../../artifacts/q05-targets/q05c-snow-cloud.jpg) |

被否決的構想及原因（原圖在 `~/city2127-evidence/q05-targets/gen/`）：黎明泡泡（要特意走進球內）、讀風樹（視覺弱）、綠色拱廊、浮動植栽盤（浮空花盆不自然）、光枝大樹（光蔭不一定有人，概念不清）、追日帆花廣場（只是遮陽，靜態簷篷已做到）。

## 建築故事

### A　逆向冷氣機

**一句話：** 把整個公園當作房間的冷氣機。

普通冷氣機只令一個房間變涼，再把熱氣排到街上。逆向冷氣機剛好相反：它把整個公園當作「房間」，再把熱氣排到天上。塔底的進氣口把地面的熱空氣吸進去。熱氣在玻璃塔身裡沿螺旋上升，變成橙色的光，最後從塔頂噴到高空。塔下六十米內，草地清涼，居民可以在正午的陽光下坐著休息。

**代價：** 熱沒有消失，只是被搬到更高的地方。這座塔需要大量電力，城市要先算清楚，這份清涼值不值得。

### B　呼吸巨葉

**一句話：** 一株會吐出涼氣的巨葉植物。

這是一株經過改良的巨型植物，葉子比屋頂還大。城市從東京灣引水，經根部的白色環送進莖裡。水沿著發光的葉脈散開，再從葉邊化成細霧落下。葉下又陰又涼，居民可以伸手接住冷霧。它不需要機器排熱，只靠植物自己的呼吸降溫。

**代價：** 它生長得很慢，要好幾年才能長到這麼大，而且每天都需要持續供水。它是活的，城市要像照顧家人一樣照顧它。

### C　雪雲噴泉

**一句話：** 城市為自己造一片下雪的雲。

噴泉底部的發射環從東京灣抽取海水，把它變成一朵懸在公園上空的冷雲。雲裡飄下細雪，落地後融成清水，流進周圍的植物，再回到海裡，形成一個完整的循環。盛夏的正午，居民站在雪下，就像走進了另一個季節。

**代價：** 造雲需要的能量最多，頂上的環和海水管道全天運轉。這是最奢侈的清涼，也最能讓人看見科技的力量。

## 建模要點（給下一輪）

- **A：** 透明玻璃芯（內有向上螺旋的琥珀色熱流）、斜格淡金屬外骨架、底部冰藍色進氣百葉環及地面放射冷卻縫、三道穩定環（其一停泊維修無人機）、頂部琥珀金輻射鰭冠及透明熱浪柱。顏色由下至上冷藍轉暖金；目標圖約 45 m 高，放入城市時按地塊縮放。
- **B：** 數支半透明綠莖（內有上升的藍色水流）、五片心形巨葉（發光葉脈、葉邊霧簾）、白色根環連往海的水管、葉下長椅、步石及小水道。霧只貼著葉邊，不可做成雲，以免與 C 混淆。
- **C：** 海邊抽水泵及管道、環形發射環（一圈發光噴嘴）、懸浮冷雲、落雪粒子、地面融水渠流回海。雲是唯一允許的浮空元素。
- 三者都避開概念地塊全息投影的青藍色 `#5fdcff` 與掃描線。低多邊形，以大形體加細節帶表達（[CITY MASTER TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md)）。

## 未決事項

- 地塊：不一定用 NE PARK `changeSites.ne`；A 的塔高、C 需要臨海抽水，選地時以 SCAN_LOT 探測並由 owner 決定。三者同地輪換或各有地塊亦待定。
- 題目及選項文案是否按上面的建議修改。
- 建模先後次序，以及每個模型的 owner 評審輪次（`place-building` **Rounds**）。

## Actual validation results

- Verification status: PASSED（文件檢查）
- Date and checked commit/worktree: 2026-11-26，`docs/q05-targets` worktree。
- Commands/manual checks and results: Markdown 本地連結檢查、`git diff --check`；未改程式碼，未跑 build／test。
- Evidence/environment: `artifacts/q05-targets/`（三張 JPEG，以 `scripts/publish-evidence.mjs` 發佈）。

## Next step

owner 選定地塊及建模次序後，以 `place-building` 開新一輪會話，從本交接開始建第一個模型。

## R1（2026-11-27，Q05-A 逆向冷氣機）

### 在 owner 授權下作出的決定（owner：「give you the control, no need to ask me for now」；待 owner 確認）

- **地塊：** NE PARK `changeSites.ne` (−210, −135)，40 × 40 m，即 `LOTS['ne-park']`，三個選項共用。`SCAN_LOT=40,40` 只找到 hero 畫面看不到的兩區（x 110–240, z 220–300，hero 0 px）；`SCAN_LOT=40,40,-210,-135` 報 `site:ne`（地塊本身）、`court1`（共享庭園 1，中心 (−220, −140)，舊公園一直與之重疊）及 `CTX_north_utility_service`（地塊東北外的白色箱體，不在草地範圍內），hero 7039 px。
- **與舊物的關係：** A 顯示時，塔連自身半徑 20 m 的冷卻草地淡入，NE 公園 `survey-site-ne`（凍結的 tier 0 Meter 站點）及共享庭園 1 同步淡出（`LotRuntime.setQ05`、`SharingDistrict.setCourtKeep`）；B、C 未有模型，回復公園及庭園。version4 run 不接手。
- **題目及選項文案：** 採用本交接原有建議，已改 `questions.rotation.v1.json`：「真夏のお台場の公園、どうやって涼しくしたい？」A「熱を空へ捨てる。」B「植物に涼しさをつくってもらう。」C「公園の上に冷たい雲をつくる。」。結果卡暫定文案在 `src/rotationLayout.ts` `Q05_RESULTS`／`q05Result`。
- **起始選項：** 維持 A，即輪換 run 開始時城市已有此塔。
- **近鏡：** `q05:tower` 由西南 (−270, 44, −214) 望 (−210, 27, −135)，畫面包括裙座、草地、三道環及金冠。
- **旅程：** Q05 orb 落在 NE PARK 地塊，環境軸顏色（`ROTATION_SHARED_LOTS.Q05`）。

### 模型

`asset/models/q05a-reverse-ac-2127/`：`build_reverse_ac.py`（Blender 5.2 headless）、`.blend`、`.glb`（約 56k tris，1.9 MB）、`review_reverse_ac.py`。玻璃芯內有琥珀熱柱及雙螺旋（`q05a_spiral`，執行時轉動）；28 支淡銀螺旋外骨架，沙漏輪廓（半徑 5.0 → 3.75 → 5.25 m）；冰藍進氣裙座（48 片百葉，半徑 8.8 m）；三道穩定環，各有冰藍光帶，其一停泊維修無人機；30 支向外翻的金色輻射棒冠頂，約 46 m；半透明熱浪柱至約 78 m（`q05a_plume`，以加法混合繪製）；半徑 20 m 冷卻草地，帶 16 道冰藍放射冷縫、22 棵樹、8 張長椅及居民。執行時邏輯在 `src/reverseAc.ts`。

### 對照目標的自評（`~/city2127-evidence/q05a/r1/target-vs-r1.jpg`）

| 項目 | 結果 |
| --- | --- |
| 玻璃芯、琥珀熱流、底部冰藍 | 達到 |
| 三道環連光帶 | 達到 |
| 金色冠頂，向外翻的棒 | 達到，形狀接近；目標的棒較粗、較密 |
| 冰藍百葉裙座、放射冷縫草地 | 達到 |
| 外骨架 | 未足：目標為較少而粗的單向螺旋桿，現為較密的菱形網格，顏色偏灰 |
| 熱浪柱 | 未足：目標是明顯的火焰狀熱流，現時很淡 |
| 維修無人機 | 未足：近鏡下幾乎看不到 |
| 樹林 | 未足：目標是濃密樹叢，現為較疏的小樹 |

### 檢查

- 根目錄 `npm test` 通過（2026-11-27，EXIT 0）；`survey` `npm test`、`npm run build`、根目錄 `npm run build`、`git diff --check` 通過。
- 修改的測試：`tests/lotRuntime.test.ts`（Q05 一節：`q05Tower`、共用地塊、淡入淡出、庭園清除、`q05Swap`／`q05Shot`／文案、近鏡及 orb 落點）、`tests/districtMeters.test.ts`（`setCourtKeep`）、`tests/headlineCamera.test.ts`（近鏡數 31）、`tests/voteJourney.test.ts` 及 `survey/tests/rotation.test.ts`（原先以 Q05 作「無模型／無地塊」題的例子，改用 Q07 或令 Q05 停在 B）。
- 瀏覽器（Vite 5185，`?rotation`）：A→B 塔淡出、公園及紅傘庭園回復，結果卡「…公園に戻りました」；B→A 塔回來，卡「…塔が立ち…」；console error 0。
- 截圖（3200 × 1800）：`focal-day`、`focal-night`、`overview`（hero）、`ne-focal-after`；對照 `target-vs-r1.jpg`、`r0-vs-r1.jpg`、`day-night.jpg`；Blender 預覽 `blender/`。
- FPS：未量度。`fps.sh` 只跑 `?meters`（塔不會出現），瀏覽器面板又在背景。headless 截圖的 data-fps 為 32–60，只作參考。
- 另修：`asset/models/LIBRARY.md` 補回 `q04b-sky-village` 一行。該資料夾在 `origin/main` 沒有索引行，`assetLibrary.test.ts` 因此失敗。
- 變化總覽已重生（`artifacts/change-review/index.html`），Q05 未有實時結果畫格。

### 待 owner 決定

- 地塊、取代 NE 公園及庭園 1 的做法、題目文案及近鏡角度。
- 下一輪方向：外骨架改為較少而粗的單向螺旋、熱浪柱加強、樹林加密、無人機加大，或其他。
- 之後建 B（呼吸巨葉）還是 C（雪雲噴泉）。

## R1 brief（下一輪會話）

place-building round for `q05a-reverse-ac`: worktree `/Users/fatboy/city2127-q05a`, read `docs/handoffs/q05-park-cooling.md`. Owner verdict on R1: «…»
