# Q03-A — 車が引き出しになる住宅

- Owner：cc100053。
- 狀態：A 位固定實裝，待看實景。業主決定日後回應投票，Meter／各態／觸發留待後續設計。
- Base：`1fcc1dc409a187f880c97a14847492363261f6a6`，與 `origin/codex/nw-focal-connections` 一致，領先 `origin/main` 一個待驗收 NW 接駁提交。保留既有 `Dev_QA.md`。
- [R2 Blender](../../asset/models/drawer-housing-2127/drawer-housing-2127.blend) · [GLB](../../asset/models/drawer-housing-2127/drawer-housing-2127.glb) · [實景](../../artifacts/change-review/index.html#drawer-housing) · [佐伯澪故事](../BUILDING_STORIES.md#drawer-housing)

A 位在フジテレビ西南側與アクアシティ內陸草地之間。GLB 原點 `(-115.375, 0, 99.680)`，yaw π，正面朝 −Z。R2 1:1 包絡 X −140…−90.75、Z 86…111.465、頂高 30.073 m。定案前，含前場 6 m 的 `SCAN_LOT=49.25,31.465,-115.375,95.7325` 回報 CLEAR。在建築基座下補 36 cm 薄地台，銜接取樣為 −0.35…−0.079 m 的地表。6 m 前場保留作後續車道及人行接駁。

正式城市與一般 DEV Meter 預覽均載入同一座住宅。不透明網格合批，透明玻璃仍獨立排序。住宅目前沒有投票 carrier、升降動畫或居民情景。Q03-A 是作品編號，問卷 Q3 仍為能源題。

## 驗證

- 2026-11-17，本機 Chrome 1600 × 900、DPR 1。從現行城市載入 A 位，擷取日間主視角及固定同鏡頭 12:00／22:00 近鏡，逐張目視檢查。全部零 page error。拍攝原圖及 URL、commit、dirty flag 側錄保存在 `~/city2127-evidence/q03-a/placement/`。
- 同一 Chrome 場景由 mixed 切至 NW／SW／SE high，再切 low，確認始終是同一個可見模型與相同位置及朝向。住宅渲染物件為 27 個不透明網格（含基座）和 102 個透明網格。
- 根目錄 `npm test`、`npm run build`、`git diff --check` 通過。change-review 的 Q03-A 連結與三張相片已核對。
- 下一步先審閱 A 位，再定投票軸、具體觸發與改變內容。車路接駁、載車艙動態和展覽機效能未驗證。
