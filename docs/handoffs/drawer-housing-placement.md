# Q03-A — 車が引き出しになる住宅

- Owner：cc100053。
- 狀態：A 位街道材質候選待業主審閱；下方保留原置入與移位兩輪記錄。業主決定日後回應投票，Meter／各態／觸發留待後續設計。
- Base：`1fcc1dc409a187f880c97a14847492363261f6a6`，與 `origin/codex/nw-focal-connections` 一致，領先 `origin/main` 一個待驗收 NW 接駁提交。保留既有 `Dev_QA.md`。
- [R2 Blender](../../asset/models/drawer-housing-2127/drawer-housing-2127.blend) · [GLB](../../asset/models/drawer-housing-2127/drawer-housing-2127.glb) · [實景](../../artifacts/change-review/index.html#drawer-housing) · [佐伯澪故事](../BUILDING_STORIES.md#drawer-housing)

A 位在フジテレビ西南側與アクアシティ內陸草地之間。GLB 原點 `(-115.375, 0, 99.680)`，yaw π，正面朝 −Z。R2 1:1 包絡 X −140…−90.75、Z 86…111.465、頂高 30.073 m。定案前，含前場 6 m 的 `SCAN_LOT=49.25,31.465,-115.375,95.7325` 回報 CLEAR。在建築基座下補 36 cm 薄地台，銜接取樣為 −0.35…−0.079 m 的地表。6 m 前場保留作後續車道及人行接駁。

正式城市與一般 DEV Meter 預覽均載入同一座住宅。不透明網格合批，透明玻璃仍獨立排序。住宅目前沒有投票 carrier、升降動畫或居民情景。Q03-A 是作品編號，問卷 Q3 仍為能源題。

## 驗證

- 2026-11-17，本機 Chrome 1600 × 900、DPR 1。從現行城市載入 A 位，擷取日間主視角及固定同鏡頭 12:00／22:00 近鏡，逐張目視檢查。全部零 page error。拍攝原圖及 URL、commit、dirty flag 側錄保存在 `~/city2127-evidence/q03-a/placement/`。
- 同一 Chrome 場景由 mixed 切至 NW／SW／SE high，再切 low，確認始終是同一個可見模型與相同位置及朝向。住宅渲染物件為 27 個不透明網格（含基座）和 102 個透明網格。
- 根目錄 `npm test`、`npm run build`、`git diff --check` 通過。change-review 的 Q03-A 連結與三張相片已核對。
- 下一步先審閱 A 位，再定投票軸、具體觸發與改變內容。車路接駁、載車艙動態和展覽機效能未驗證。

## A 位街道候選（2026-11-17）

- 基準 `fd03bcfd`。fetch 後本機與 `origin/codex/nw-focal-connections` 起點無分歧，領先 `origin/main` 兩筆。保留待驗收 NW 接駁及未追蹤的 `Dev_QA.md`。
- 以舊日景鏡頭對右側白牆打射線，命中 `megastructures` 的西側梯田巨構（HULL），不是飯店。實際三角網格最近點以 BVH 核對，原位最窄 **0 m**，兩網格在約 `(-139.87, 0.75, 109.36)` 相交。新位原點 `(-104, 0, 81)`，yaw 仍為 π；平移 21.9 m，仍在 A 位。新位對梯田巨構淨距 **15.93 m**；對 Fuji 框架低層的取樣最近距離 **31.96 m**。未動任何鄰樓。
- 保留 R2 GLB 及兩個載車艙。新包絡 X −128.625…−79.375、Z 67.32…92.785；艙體下緣分別為 4.09、13.74 m。候車線中心 X −113.03、−89.95，與兩艙軸線一致。兩條 5.6 m 候車線接至 12 m 深迴車前場，經 6.2 m 雙向短道接到導軌大道 ② 的外側（沿線第 463 m）。支路繞過既有分散配置艙體，未挪動其位置。3.1 m 步道延續原大道行人道，經標線橫過一條候車線後抵前立面中央。前場沿用街道套件的陶板、淡色鋪面、冷色導光和低植栽。
- [候選圖集](../../artifacts/change-review/index.html#drawer-housing)：3200 × 1800 / DPR 1 Chrome，原鏡頭固定比較、同角度 12:00／22:00、接駁俯視及主視角。原圖與側錄在 `~/city2127-evidence/q03-a/street/` 和 `street-final/`。
- Chrome 分散配置 `?meters=se:low`：沿支路與步道中心、近邊及兩條候車線，以約 1 m 間隔驗證 467 個路面樣點，無斷面或障礙；候車線最低上方淨高 4.07 m。測試以固定包絡及路面淨空為準。
- 根目錄 `npm test` 全套測試通過（從需開 loopback 的 survey 整合測試起，以允許本機埠的環境接續跑）；`npm run build`、`git diff --check` 和圖集連結核對通過。六張截圖及路線抽查零 page error。
- 候選只供業主審閱。投票觸發、艙體及車輛動畫、實機效能尚未驗證。

## Gemini 材質候選（2026-11-17）

- 基準 `31372962`，接續 `codex/nw-focal-connections`。業主提供 [Gemini 目標圖](../../artifacts/change-review/drawer-housing/gemini-target.jpg)，以其中暖米色陶板、細金屬收邊、淡青導光和淺灰步道作為材質方向。
- 導軌大道 ②、住宅支路和候車前場使用同一個陶板材質、貼圖及陰影接收設定。前場沿用街道套件的板縫和照明，導光由支路中心分往兩個候車位。車道、橫道與步道沿用已驗證的接駁，目標圖中的繞樓線屬概念。
- 鋪面回歸測試核對大道與支路的材質、受光設定及接縫。另以垂直射線核對 448 個導光、光暈與收邊網格的三角形中心，全數落在鋪面。
- 日夜近鏡使用相同鏡頭，連同接駁俯視及城市主視角更新至 [候選圖集](../../artifacts/change-review/index.html#drawer-housing)。原圖及側錄在 `~/city2127-evidence/q03-a/material-final/`，五張截圖均無 page error。根目錄 `npm test`、`npm run build`、`git diff --check` 及圖集連結核對通過。展覽機效能留待現場驗證。
