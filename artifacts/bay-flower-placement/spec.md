# Q02-B 蓮花受電選址 — R1 目標清單

目標：已驗收並 merge 的 [bay-flower-receiver GLB](../../asset/models/bay-flower-receiver/bay-flower-receiver.glb)（owner 逐輪驗收，PR #4；不另生成目標圖）。原尺寸放於南部公園西岸外海，花中心 (−712, 300)，`rotation.y = 2.6088`，機房平台接西岸步道 (x ≈ −596, z 300)。owner 2026-11-18 決定。

| # | 目標顯示 | 現有 | 規格 |
| --- | --- | --- | --- |
| 1 | 灣上蓮花：46 片花瓣三圈、銀藍穹頂、浮台 | `Q02B_Receiver` | 保持原樣；浮台 waterline 對城市海面 −0.8，不浮空不沒頂。 |
| 2 | 由軌道射下的光柱 | `Q02B_LightBeam`（至 900 m） | 直上，不穿過空の環（250 m）及空中環線（170 m）；夜景可讀。 |
| 3 | 海底管道接岸邊機房 | `Q02B_SubseaLink` | 管道由花底經海床至平台端，機房拱形正面入管。 |
| 4 | 岸邊機房及短平台 | `Q02B_ShoreStation` | 平台頂與步道頂高差 ≤ 0.1 m；步道保持連續，可走上平台至兩側門。 |
| 5 | 空置態 | 無新模型 | 只留 `Q02B_ShoreStation`；花、管道、光柱收起，海面為原本海面。version4 預設即此態（owner 2026-11-18）；DEV `?bayFlower=1` 顯示花。 |
| 6 | 周邊海面 | `bayCruisers` `[-700,250,1.4]` 穿過地塊 | 移出花範圍 ＋ 30 m，或刪除；遊船相位重搜。 |

## Library

| Element | Route | Entry |
| --- | --- | --- |
| 花、穹頂、浮台、管道、機房、平台、光柱 | Reuse | [bay-flower-receiver](../../asset/models/LIBRARY.md) GLB 及 `build_flower.py`（如改 `QY` 須重新匯出兩個 GLB） |
| 放置方法（`addCityModel`、海面對齊、常駐背景） | Reuse | [hydroTerrace](../../src/hydroTerrace.ts) |
| 城市水面 | Reuse | [bayWater](../../src/bayWater.ts) |

狀態、選址驗證及 R1 驗收見 [handoff](../../docs/handoffs/archive/bay-flower-placement.md)。
