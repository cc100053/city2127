# Q02-A 水の棚田選址 — R1 目標清單

目標：現有 [q02a-hydro-terrace GLB](../../asset/models/q02a-hydro-terrace/q02a-hydro-terrace.glb)（owner 2026-11-17：以 GLB 本身為目標）。以原尺寸放置於西岸海面 (−375, 0, −170) m，`rotation.y = π/2`，正面朝東（市區），瀑布朝南面海；與水庭一號並存。角色待定，本輪作常駐背景。

| # | 目標顯示 | 現有 | 規格 |
| --- | --- | --- | --- |
| 1 | 舊變電所：四面古典立面、中央高廳、入口雨篷 | GLB 變電所 | 保持原樣。正門朝東，入口雨篷須在 access 圖中可辨。 |
| 2 | 四層錯開圓形水池、瀑布、四架 7.6 m 水車 | GLB 水池、Fall／Foam 材質、`q02a_wheel0`–`3` | 靜態保留；水流與轉動留待 [q02a-water-threejs](../../docs/handoffs/q02a-water-threejs.md)。 |
| 3 | 六支 Y 形腳柱跨越變電所 | GLB 腳柱及光帶 | 腳柱落於城市水面或基座，不得浮空。 |
| 4 | 下沉蓄水池、堰、出海瀑布 | GLB 蓄水池及 Ocean 海面 | 刪除 GLB 自帶海面，以城市 bay 水面為準；出海瀑布落至城市水面並朝南。 |
| 5 | 與岸邊連接 | 無 | 新增步橋或堤道，由北面岸線通往正門，沿用水庭 spur 做法（4 m 寬、欄杆、燈）。 |
| 6 | 與水庭一號並列 | 水庭一號 (−310, −151) | 水面間距不少於 15 m，兩者互不穿插；並列圖一張。 |

## Library

| Element | Route | Entry |
| --- | --- | --- |
| 變電所、水池、瀑布、水車、腳柱、蓄水池 | Reuse | [q02a-hydro-terrace](../../asset/models/LIBRARY.md) GLB 及 `build_hydro_terrace.py` |
| 岸邊步橋／堤道 | Reuse | [energyPrototype](../../src/energyPrototype.ts) 水庭 spur（步道板、欄杆、柱燈） |
| 城市水面 | Reuse | [bayWater](../../src/bayWater.ts) |

狀態表、選址驗證及 R1 驗收見 [handoff](../../docs/handoffs/q02a-hydro-placement.md)。
