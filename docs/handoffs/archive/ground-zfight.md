# ground-zfight — 建築地底灰色同草地閃爍

- Owner: cc100053（實作：Claude）
- Status: DONE
- Branch: fix/ground-zfight（已合併入 main）
- Base commit: f87af53（Merge branch 'feat/mobility-layers'）
- Last verified commit: base + 本任務 diff（commit 見 `git log --grep ground`）
- Remote availability: origin/fix/ground-zfight、origin/main

## Session Git state

- Session starting branch and HEAD: main @ f87af53，working tree 乾淨，同 origin/main 一致（2026-10-06 fetch）
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

User 報告：幾座建築地底嘅灰色同綠化草地喺地面閃爍，hero 建築（Fuji TV）最明顯。目標係 hero 距離唔再有灰／綠 z-fighting。

## Completed work

離線分析 `odaiba_district_v01_environment.glb` 所有向上嘅三角形，2 m 一格取樣：`BUILDING_PADS`（sidewalk）同 `TERRAIN_LOW_DENSITY`（landscape）喺大約 9 萬 m² 範圍內只差 0–3 cm，而且互相交錯；另外 Nikko／Hilton 嘅 plaza 同 sidewalk、DiverCity 嘅 service area 同草地都有同樣情況。Near 2／far 9000 喺 600 m 嘅 depth 精度大約 1 cm，所以會 z-fight。地形本身有起伏，單靠移高度要 >10 cm 先穩陣，所以改用 `src/odaibaScene.ts` 嘅 per-finish polygon offset：landscape 0 < road／service_area 1 < plaza 2 < sidewalk 3 < road_marking 4。同一 finish 嘅配對顏色一樣，所以唔使排次序。

## Actual validation results

- Verification status: PASSED（自動測試）；PARTIAL（目視）
- Commands/manual checks and results: `npm test` exit 0；`npm run build` exit 0；`git diff --check` OK。
- Evidence/environment: 內置瀏覽器 pane（窄長 viewport），`?hour=12&meters=nw:mixed&reviewTime=5` hero pose 改之前／之後：Fuji TV 底部灰綠條紋消失，變成均勻淺色鋪地。另外檢查咗 Aqua City 牆腳近景（冇俾地面遮住）同 Hilton／Nikko 一帶。近景用嘅臨時 DEV camera param 已 revert。
- Changes since verification: 只有本 handoff

## Known issues and blockers

- 未喺展覽硬件或者 1920 寬 desktop viewport 做連續鏡頭郁動嘅目視測試；GTAO normal/depth prepass 用 override material，冇 offset，coplanar 位置理論上可能仍然有輕微 AO 雜訊（未觀察到）。
- Pad 範圍而家穩定顯示做淺色鋪地；如果想嗰啲位置見到草，就要改 GLB 嘅 pad 輪廓。

## Next expected step

冇；如果展覽機仍然見到閃爍，記低位置再處理。
