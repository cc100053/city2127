# q05-park-cooling — Q05 公園降溫三態：目標圖與建築故事

- Owner: repository owner
- Status: Q05-A DONE（R2 owner 驗收，2026-11-27，已合併入 main）；Q05-B R2 已建，待 owner 評審（分支 `feat/q05b-breathing-leaf`）；C 未建模。
- Branch: `feat/q05a-reverse-ac`（worktree `../city2127-q05a`），自 `origin/main` `bbec76c2`；目標圖記錄見舊分支 `docs/q05-targets`（已合併）。
- Base commit: `bbec76c26a833a2a5ba24dfc42f3cee3f9a03c0c`
- Last verified commit: `00f0cd75`（A R2）；B-R2 見分支 `feat/q05b-breathing-leaf` 最新提交（檢查見 B-R2 一節）。
- Remote availability: 已合併入 `origin/main`（見下文 R2 verdict）；任務分支已刪除。

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

見文末「Next step after R2」（Q05-A 已完成）。

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

## R1 verdict

«啱 修補以上四樣. And 冷卻草地 冷氣再明顯一啲. 塔size ok, the playground expand a little.»

（「以上四樣」即 R1 自評表中四項「未足」：外骨架、熱浪柱、維修無人機、樹林。）

## R2 brief

像素以 3200 × 1800 的 `q05:tower` 近鏡量度；R1 該畫面塔身約 27 px/m（冠頂至裙座約 1,120 px，約 42 m）。

| # | owner 原話 | 量度目標 |
| --- | --- | --- |
| 1 | 外骨架（以上四樣之一） | 28 支菱形網格（14 左旋 + 14 右旋，半徑 0.2 m）改為 **12 支單向螺旋扁桿**，每支寬約 0.9 m、厚約 0.45 m（近鏡約 24 px 寬），由裙座至冠帶轉約 0.6 圈；顏色改為近白（金屬度 0.3 → 0.05，基色 0.96–0.98）。 |
| 2 | 熱浪柱（以上四樣之一） | 由三層淡管（不透明度 0.13、發光 0.55）改為**火焰狀熱流**：中心熱柱加 10 條扭動、向上收窄的火舌帶，冠口寬約 9 m，至約 75 m 收尖；不透明度約 0.3、發光約 1.2，仍以加法混合繪製並慢轉。近鏡中冠頂以上至少 600 px 高可見暖色熱流。 |
| 3 | 維修無人機（以上四樣之一） | 由約 1.4 m 白色機身改為約 3.2 m 寬（連旋翼）深色機身、冰藍旋翼環；一架停在中環面向近鏡（方位 −2.22 rad），一架在上環旁懸停。近鏡中每架至少 80 px 寬。 |
| 4 | 樹林（以上四樣之一） | 22 棵疏樹（樹冠半徑 2.4–3.6 m、每棵 90–150 葉片）改為**約 40 棵濃密圓冠樹**，草地外圈兩行成叢，樹冠半徑 3.2–4.4 m、每棵約 220 葉片，深綠核心加大；四條小徑及長椅位置保持空出。 |
| 5 | 冷卻草地冷氣再明顯一啲 | 冷縫寬 0.22 → 0.5 m（近鏡約 13 px）並伸至新草地邊；新增**冷氣流線** `q05a_flow`：約 40 條由草地邊沿螺旋流向裙座的冰藍淡帶（離地 0.5–1.6 m，加法混合），執行時轉動，令流線看似向塔底流入；草地邊冰藍光環加寬。 |
| 6 | 塔 size ok，playground expand a little | 塔不變（冠頂約 46 m）。草地／台座半徑 20 → **24 m**（面積 +44%），`LOTS['ne-park'].size` 40 → 48 m。`SCAN_LOT=46,46` 及 `50,50` 於 (−210, −135) 只報 `site:ne`（地塊本身）、`court1`（A 顯示時已清除）及 `CTX_north_utility_service`；後者為地塊西北外的 5 m 高白色箱體，最近角 (−235.1, −130.2) 距塔心 25.5 m，24 m 台座留約 1.5 m 空隙。沒有撞到新物件。 |

另一讀法：「playground」也可指草地上的遊樂設施；本輪按「草地／公園範圍」理解並擴大，沒有加遊樂設施。


## R2（2026-11-27，Q05-A 逆向冷氣機）

### Git 狀態

- 開始時 `feat/q05a-reverse-ac` 與 `origin/feat/q05a-reverse-ac` 同步於 `1ebdb9e6`，工作樹乾淨；`git fetch --prune origin` 成功，`origin/main` 為 `905215ce`，本分支比它落後 2、超前 2 個提交（未合併 main，按規定不自動合併）。
- 主工作目錄 `/Users/fatboy/city2127` 屬另一會話的 `feat/aoi-cinematic`，未有觸碰。

### 改動

- **模型**（`build_reverse_ac.py`，約 89k tris，3.5 MB）：外骨架改為 12 支近白單向螺旋扁桿（寬 0.9 m、厚 0.45 m，轉 0.6 圈，金屬度 0.05）；冠頂新增 `q05a_flame`（10 條扭動火舌及收尖熱芯，飽和橙色，一般透明混合）；`q05a_plume` 熱浪向上收窄、不透明度 0.13 → 0.22、發光 0.55 → 0.9；兩架 3.5 m 深色維修無人機（冰藍旋翼環），一架停在中環面向近鏡，一架在上環旁懸停；樹林改為兩行共 34 棵圓冠樹（樹冠半徑 3.1–4.4 m、每棵 420 葉片，冠內加實心深綠體，`lush_tree`）；冷縫 0.22 → 0.5 m 並伸至草地邊，新增 `seam` 物料（發光 3.4）、鋪地邊冷光線及較闊的草地邊光環；新增 `q05a_flow`：40 條由草地邊螺旋流入裙座的冰藍冷氣流線及 16 條較高較闊的冷霧帶（加法混合）；草地／台座半徑 20 → 24 m，塔身尺寸不變。
- **執行時**（`src/reverseAc.ts`）：四個活動件（螺旋熱流、火舌、熱浪、冷氣流線）分件不合批；火舌一般透明、熱浪及流線加法混合，皆不寫深度；流線以正 `rotation.y` 轉動，令螺旋看似向塔底流入。
- **地塊**：`LOTS['ne-park'].size` 40 → 48 m（仍以 NE PARK 站點為中心；`changeSites.ne` 不變）。`SCAN_LOT=46,46` 及 `50,50` 只報 `site:ne`、`court1`（A 顯示時已清除）及西北外的 `CTX_north_utility_service`（最近角 (−235.1, −130.2)，距塔心 25.5 m，台座留約 1.5 m）；沒有撞到新物件。地塊變大亦令 `odaibaScene` 的 noStreet 範圍及 `urbanFill` 的避讓範圍隨之擴大。
- **測試**（`tests/lotRuntime.test.ts`）：地塊以 NE PARK 為中心並覆蓋之；載入 GLB，台座半徑等於地塊一半、樹冠越出地塊少於 2.5 m、四個活動件齊全且不合批、混合方式正確、流線向內轉。
- **文件**：`PROJECT.md`、`QUESTION_ROTATION_PLAN.md`、`asset/models/LIBRARY.md` 改為 24 m／48 m 及 R2 內容。

### 自評（`~/city2127-evidence/q05a/r2/`，3200 × 1800）

| # | 項目 | 結果 |
| --- | --- | --- |
| 1 | 外骨架 | 達到：12 支闊身單向螺旋，近白，近鏡每支約 25–30 px 寬（`row1-exo.jpg`），與目標相近。 |
| 2 | 熱浪柱 | 大致達到：冠頂以上至畫面頂（逾 900 px）可見明顯橙色熱柱，hero 圖亦清楚。未足之處：火舌形狀不夠分明，整體較似一條收窄的光柱，未有目標上部的白色煙霧漸變。 |
| 3 | 維修無人機 | 達到：兩架各約 110 px 寬，深色機身及冰藍旋翼環在白環上清楚（`row3-drones.jpg`）。 |
| 4 | 樹林 | 達到：兩行濃密圓冠樹圍繞草地，四條小徑留空（`row4-grove.jpg`）。樹數 34，少於簡報約 40，但樹冠較大，覆蓋已足；樹幹仍較目標高瘦。 |
| 5 | 冷氣明顯 | 達到：闊冷縫、草地邊光環及螺旋冷氣流線清楚，流線會轉動流向塔底（`row5-cold-air.jpg`、`keyframes.jpg`）；較高的冷霧帶在日間較淡。 |
| 6 | 草地擴大 | 達到：台座半徑 24 m，塔不變；設施箱未被撞到。 |

### 檢查

- 單元：`tests/lotRuntime.test.ts` 通過。
- 根目錄 `npm test` 通過（2026-11-27，EXIT 0，記錄 `~/city2127-evidence/q05a/r2/npm-test.log`）。瀏覽器（Vite 5185，`?rotation&shot=q05:tower`）console error 0。`npm run build` 通過；`survey` `npm test` EXIT 0；`git diff --check` 通過。
- FPS：未量度（`fps.sh` 只跑 `?meters`，塔不會出現）。headless 截圖的 data-fps 為 28–35，只作參考，與 R1 的 32–60 不可直接比較。
- 變化總覽：本輪未改題目、文案或結果，未重生。

### 待 owner 決定

- 熱浪柱是否要更似火焰（分明的火舌、上部轉白煙），還是現在的光柱已足夠。
- 冷霧帶是否要再濃。
- 之後建 B（呼吸巨葉）還是 C（雪雲噴泉）。

## R2 verdict

«accept. push main and clean.»（2026-11-27）

- 以 `--no-ff` 合併入 main（基於 `origin/main` `da835136`）；衝突兩處：`asset/models/LIBRARY.md` 的 `q04b-sky-village` 行取 main 版本，變化總覽 `artifacts/change-review/index.html` 取 main 版本後以 `scripts/changeSheet.ts` 重生（0 frames refreshed：Q05 未有近鏡畫格）。
- 合併結果的檢查及 main CI 見提交記錄；worktree `../city2127-q05a` 及分支 `feat/q05a-reverse-ac`（本地及遠端）已清除。

## Next step after R2

Q05-A 完成。下一步由 owner 決定先建 B（呼吸巨葉）還是 C（雪雲噴泉），以 `place-building` 開新會話；熱浪柱更似火焰、冷霧更濃兩點可留待日後打磨。

## B-R1 brief（2026-11-27，Q05-B 呼吸巨葉）

owner 指示：「do b modeling」。地塊、近鏡方位及台座沿用 A 的決定（NE PARK 48 × 48 m，台座半徑 24 m，近鏡由西南望）；尺寸按目標圖中 1.8 m 居民量度。

| # | 目標圖 | 量度目標 |
| --- | --- | --- |
| 1 | 五片心形巨葉，比屋頂大 | 葉長 15–17.5 m、闊約葉長 1.0 倍（半闊 0.5）、兩片基部葉耳；葉頂約 22 m；四周最遠不出台座 2.5 m |
| 2 | 發光葉脈 | 中脈連每邊七條彎側脈及葉耳脈，凸出葉面，萊姆綠發光（夜間清楚） |
| 3 | 半透明綠莖，內有上升藍色水流 | 五支莖由根環升起、向外斜至葉柄；每支莖外側一條水色光線及三相水滴（執行時輪流亮起） |
| 4 | 葉邊霧簾 | 只由葉的外緣垂下（不成雲），每 0.6 m 一條、闊 0.9–1.5 m，垂下約至地面以上 3 m 與葉緣之間的三至六成 |
| 5 | 白色根環、水管 | 根環外半徑 6.8 m、高 1.9 m，水色光帶；三條白色水管伸至台座邊維修口 |
| 6 | 葉下長椅、步石、小水道、樹林 | 半徑 13.6 m 彎曲長椅牆、長椅及居民、九塊步石、岩邊小溪及水池、外圈濃密樹林 |
| 7 | 顏色 | 葉深綠；光線用水色 (0.40, 0.95, 0.88)，避開概念地塊 `#5fdcff` |

## B-R1（2026-11-27，Q05-B 呼吸巨葉）

### Git 狀態

- 開始時 `main` 與 `origin/main` 同步於 `85507f20`，工作樹乾淨；`git fetch --prune origin` 成功。於主工作目錄開 `feat/q05b-breathing-leaf`（主工作目錄當時沒有其他會話的改動）。

### 改動

- **模型** `asset/models/q05b-breathing-leaf-2127/`：`build_breathing_leaf.py`（Blender 5.2 headless）、`.blend`、`.glb`（約 69k tris，2.6 MB）、`review_breathing_leaf.py`。內容見上表；葉片為 0.28 m 厚的實心葉（上面深綠、下面及邊較淺），葉脈 `q05b_vein`，水滴 `q05b_pulse_a/b/c`，霧簾 `q05b_mist_a/b`（256 條）。樹 25 棵，沿用 A 的 `leafy_tree` 加實心樹冠做法；蕨類用 `leaf_clump`。
- **執行時** `src/breathingLeaf.ts`：只改發光強度（不轉不動）：水滴三相輪流亮（1.2 秒一輪，水沿莖上升），葉脈及兩組霧簾 5 秒一次呼吸，霧簾兩組反相；霧簾透明、不寫深度。不透明度留給地塊淡入淡出（`fadeFinishes`）。
- **輪換**：`q05Model`（`rotationLayout.ts`，`lotRuntime.ts` 轉出）取代 `q05Tower`；`setQ05` B 時巨葉淡入，公園及共享庭園 1 淡出；A↔B 交叉淡變。`q05Swap` 改為 `changes`（B↔C 現在亦有可見變化）；`q05Shot` 飛向新出現的模型，否則飛向離開的模型；新近鏡 `q05:leaf` (−246, 27, −182) 望 (−210, 12, −135)；`ROTATION_VISITS.Q05.B`；結果卡暫定文案（B 地點「お台場海浜公園の呼吸する巨葉」，出現「…屋根より大きな葉をひろげる植物が育ち、葉のふちから落ちる霧で木陰が涼しくなりました。」，離開「…巨葉の植物が外れ、新しい涼しさを待つ公園に戻りました。」）。`questions.rotation.v1.json` Q05-B `modelId`；DEV 面板名「呼吸する巨葉」。
- **DEV**：`?rotation&jump=Q05:B`（可逗號分隔多題）於載入時即時設定選項，供截圖。
- **測試**：`tests/lotRuntime.test.ts`（`q05Model`、B 的 GLB：台座、範圍、高度、發光件不合批、霧簾透明、呼吸不動不透明度、水滴上升次序、霧簾反相；A→B→C 淡變；`q05Shot`／`q05Result`）、`tests/headlineCamera.test.ts`（近鏡數 32）、`survey/tests/rotation.test.ts`（「無模型」例子由 Q05-B 改用 Q05-C）。
- **文件**：`PROJECT.md`、`QUESTION_ROTATION_PLAN.md`、`asset/models/LIBRARY.md`；變化總覽已重生（Q05 未有近鏡畫格）。

### 自評（`~/city2127-evidence/q05b/r1/`，3200 × 1800，`q05:leaf`）

| # | 項目 | 結果 |
| --- | --- | --- |
| 1 | 心形巨葉 | 達到：五片大葉，前右及左兩片清楚見到心形葉耳，葉覆蓋大半個草地。後面三片較高，近鏡下似平頂傘，心形不及目標明顯。 |
| 2 | 發光葉脈 | 達到：日間淺綠脈清楚，夜間萊姆綠發光明顯（`focal-night`）。 |
| 3 | 莖及水流 | 大致達到：水色光線及水滴清楚；莖比目標粗而集中，未有目標的半透明感（莖為不透明淺綠）。 |
| 4 | 葉邊霧簾 | 達到：霧簾只在葉外緣垂下，日間呈白色條狀簾，夜間更明顯；未成雲。 |
| 5 | 根環、水管 | 達到：白色根環連水色光帶、三條白色水管伸向近鏡。 |
| 6 | 長椅、步石、小溪、樹林 | 大致達到：長椅牆、居民、步石及樹林清楚；小溪在近鏡左方被樹及霧遮去大半。 |
| 7 | 顏色 | 未足：日間葉色仍偏淺綠（城市天光令葉面反光），目標為深綠；夜間接近目標。 |

### 檢查

- 單元：`tests/lotRuntime.test.ts`、`tests/headlineCamera.test.ts`、`tests/assetLibrary.test.ts` 通過；`survey` `npm test` EXIT 0。
- `npm run build`（根目錄）通過；`survey` `npm run build` 先因本機缺 `@mediapipe/tasks-vision` 失敗，`npm ci` 補裝後通過（lockfile 早已列出，非本輪改動）。`git diff --check` 通過。
- 根目錄 `npm test` 通過（2026-11-27，EXIT 0，記錄 `~/city2127-evidence/q05b/r1/npm-test.log`）。
- 瀏覽器（Vite 5186，`?rotation&jump=Q05:B&shot=q05:leaf`）：page error 0；`lots` 診斷 `breathingLeaf: 1`、`reverseAc: 0`。
- FPS：未量度（`fps.sh` 只跑 `?meters`，巨葉不會出現）。headless 截圖的 data-fps 為 20–33，只作參考。

### 待 owner 決定

- 日間葉色是否要更深（可加高葉面粗糙度減少天光反光，或再壓暗基色）。
- 後排三片葉是否降低或加大傾角，令心形更明顯；莖是否改為半透明、較幼。
- 結果卡文案及 `q05:leaf` 近鏡角度（皆為暫定）。
- 之後建 C（雪雲噴泉）。


## B-R1 verdict

«* 日間葉色仍然偏淺綠，應該係天光喺葉面反光；目標係深綠，夜間就接近。
* 後面三片葉喺近鏡下似平頂傘，睇唔太出心形。
* 莖係不透明，又比目標粗、集中；目標係半透明。
* 小溪喺近鏡左邊，大半俾樹同霧遮住。
* 周遭嗰啲樹應該係上一次做嘅 assets 嚟嘅，但係嗰啲樹唔靚，要重新整過。你根據佢嘅目標重新整過呢個樹嘅模型»（2026-11-27）

## B-R2 brief

像素以 3200 × 1800 的 `q05:leaf` 近鏡量度。

| # | owner 原話 | 量度目標 |
| --- | --- | --- |
| 1 | 日間葉色偏淺綠，係天光反光；目標深綠 | 葉面粗糙度 0.45 → 0.85，執行時葉面 `envMapIntensity` 降至 0.3（天光反射約減七成）；基色維持深綠。日間近鏡葉面（避開葉脈）平均 RGB 的綠值 ≤ 110、紅值 ≤ 60。 |
| 2 | 後面三片葉似平頂傘，睇唔出心形 | 葉形基部葉耳加深：葉耳伸至葉長 −0.37、闊 0.33（R1 為 −0.31、0.29），凹口更深；每片葉向近鏡傾 25–35°（近鏡一側較低），令葉面朝向鏡頭；後排兩片轉向左右兩側（方位 ±1.75 rad），最高葉頂由 22 m 降至約 19 m；近鏡改高 (−252, 40, −192) 望 (−210, 9, −135)，俯角約 25°，與目標圖的高斜角相近。近鏡下五片葉均見到兩個葉耳及凹口。 |
| 3 | 莖不透明、粗、集中；目標半透明 | 莖半徑 0.78 → 0.50 m（基部）、0.42 → 0.28 m（頂）；改為半透明玻璃綠（不透明度約 0.45，透見內部）；水色光線及水滴移入莖中心；莖基由距中心 1.7 m 分散至 2.4–3.0 m，五支莖在根環內清楚分開。 |
| 4 | 小溪喺近鏡左邊，大半俾樹同霧遮住 | 小溪移到近鏡前方偏左（方位 CAM+0.15 至 CAM+1.15，即 bench wall 與台座邊之間），闊 1.2–1.8 m，末端水池；該弧段外圈及內圈樹清空，只留低矮蕨類及石；步石改由草地通往小溪；路及水管移到前方偏右。近鏡中小溪可見長度 ≥ 600 px。 |
| 5 | 周遭樹唔靚，根據目標重新整過樹嘅模型 | 新庫存模組 `facet_tree`（`modules.py`）：目標圖的低多邊形樹，深色樹幹，樹冠由 7–11 個扭曲多面體團塊組成（平面著色、每團約 60–80 tris），深綠及中綠兩色；取代 `lush_tree`（`leafy_tree` 葉片卡加實心體）。每棵約 1–1.5k tris（R1 每棵約 1.6k）。只用於 B；A 已驗收，暫不改，待 owner 決定是否換上。 |

## B-R2（2026-11-27，Q05-B 呼吸巨葉）

### Git 狀態

- 開始時 `feat/q05b-breathing-leaf` 與遠端同步於 `5eed6090`，工作樹乾淨；`git fetch --prune origin` 成功，`origin/main` 為 `28e7727e`（Q10-A 資產提交，本分支未合併，按規定不自動合併）。沒有上一輪的伺服器仍在運行。

### 改動

- **葉色**（brief 1）：葉面粗糙度 0.45 → 0.85、基色略壓暗；`src/breathingLeaf.ts` 新增 `BREATHING_LEAF_MATTE`，載入時把葉面、葉背及樹冠的 `envMapIntensity` 調至 0.3–0.45（地塊淡變沿用來源值）。
- **葉形**（brief 2）：基部葉耳加深（伸至 −0.37、闊 0.37，葉耳脈加長）；五片葉改為兩層，向近鏡左右伸出（下層約 12 m、上層約 22 m、後方一片 17 m），葉長 13–15 m（R1 為 15–17.5 m，為令葉與葉分開），葉基外移至距中心 6.4–8.6 m，令葉耳不再在中心互相重疊；整片葉向近鏡傾約 29°（`TILT`）。
- **近鏡** `q05:leaf` 改為 (−252, 40, −192) 望 (−210, 9, −135)，俯角約 25°，與目標圖的高斜角相近。
- **莖**（brief 3）：半徑 0.78/0.42 → 0.50/0.28 m，半透明玻璃綠（不透明度 0.5，雙面），水色光線及水滴移入莖中心；莖基分散至距中心 2.7 m；根改用不透明 `root` 物料。執行時莖 `renderOrder` 1（霧簾 2）。
- **小溪**（brief 4）：移到近鏡前方偏左（CAM+0.12 至 +1.12，半徑 17 m），闊約 1.4–1.8 m，末端水池，水色較亮；該弧段樹木清空，外岸只放低矮蕨類；步石改由草地穿過小溪；路及水管移到前方偏右。
- **樹**（brief 5）：新庫存模組 `facet_blob`、`facet_tree`（`modules.py`，新物料角色 `crown`、`crown_l`、`bark`，`LIBRARY.md` 已加行，lineup `review_modules.py` 加樣本）；樹冠由 8–11 個扭曲多面體團塊組成，平面著色。巨葉樹林改用 `facet_tree`，兩行共 31 棵（R1 25 棵），高 5.2–9 m。A 的樹林未改。
- 模型約 55k tris（R1 約 69k），GLB 2.3 MB。
- **測試**：`tests/lotRuntime.test.ts` 加葉面／樹冠天光反射調低，及莖為半透明、不合批、先於霧簾繪製。

### 自評（`~/city2127-evidence/q05b/r2/`，3200 × 1800，`q05:leaf`）

| # | 項目 | 結果 |
| --- | --- | --- |
| 1 | 日間葉色深綠 | 達到：葉面取樣 RGB 約 (25, 106, 58)，R1 為 (150, 200, 115)；一處受光位置綠值 122，略高於 110 的目標（`r1-vs-r2.jpg`）。 |
| 2 | 五片葉見心形 | 大致達到：下層兩片及後方一片清楚見到葉耳及凹口（`row2-hearts.jpg`）；上層兩片的葉耳仍被後方葉部分遮去。整體呈左右對稱的「四葉」排列，比目標規整。 |
| 3 | 莖半透明、較幼、分散 | 達到：五支莖分開，透見內部水色光線（`row3-stems.jpg`）；日間水色光線仍頗搶眼，莖本身的綠色較淡。 |
| 4 | 小溪清楚 | 大致達到：小溪連水池在近鏡左前方完全露出，沒有樹或霧遮擋（`row4-stream.jpg`）；可見長度約 550 px，略短於 600 px 目標。 |
| 5 | 樹按目標重做 | 達到：低多邊形多面體樹冠，風格接近目標（`trees-compare.jpg`）；團塊較目標大，近鏡右前的一叢樹幹被樹冠遮住。左方樹林大多被左下葉遮住。 |

另：葉傾向鏡頭後，霧簾在近鏡中比 R1 少見（主要見於葉的近緣及後方）。

### 檢查

- 單元：`tests/lotRuntime.test.ts`、`tests/headlineCamera.test.ts`、`tests/assetLibrary.test.ts` 通過。
- 根目錄 `npm test` 通過（2026-11-27，EXIT 0，記錄 `~/city2127-evidence/q05b/r2/npm-test.log`）；`npm run build`、`git diff --check` 通過。`survey` 未改動，未重跑。
- 瀏覽器（Vite 5186，`?rotation&jump=Q05:B&shot=q05:leaf`）：截圖 page error 0。
- FPS：未量度（`fps.sh` 只跑 `?meters`）。headless 截圖 data-fps 約 40（近鏡）、31（overview），只作參考；R1 為 20–33。
- 變化總覽：近鏡座標改了，但 Q05 未有近鏡畫格，未重生。

### 待 owner 決定

- 葉的排列是否要打破左右對稱（例如一邊再低、一片轉向近鏡）。
- 霧簾在新角度下較少見，是否要加長近緣的霧簾。
- `facet_tree` 是否亦換到 Q05-A 的樹林（A 已驗收，本輪未改）。
- 近鏡新角度（較高較近）是否接受。

## B-R3 round prompt（下一輪會話）

place-building round for `q05b-breathing-leaf`: main checkout branch `feat/q05b-breathing-leaf`, read `docs/handoffs/q05-park-cooling.md`. Owner verdict on B-R2: «…»
