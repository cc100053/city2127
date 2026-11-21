# entrance-polish — 主樓正門、環形底座、船身前庭

- Owner: cc100053
- Status: DONE（owner 2026-11-21 要求合併入 main）
- Branch: `claude/project-thread-v54ay0`
- Base commit: 04458f1b087d2e08e94d2ead2ceb4f246bdf935b（main，PR #8 merge 後）
- Last verified commit: ae88154e（PR #9，CI 綠）
- Remote availability: `origin/claude/project-thread-v54ay0`

## Session Git state

- Session starting branch and HEAD: `claude/project-thread-v54ay0`，04458f1b（樹同 main）
- Last fetched origin/main commit: 04458f1b（2026-11-20）
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 截圖（2026-11-20 23:17）圈出三處：Fuji 主樓正門及地面、環形巨構、階梯船身前的玻璃盒。Owner 決定（2026-11-20）：環形只做底座；玻璃盒（自組裝大樓）整座移除；同時執靚後面的階梯船身。完成條件：三處的建築與地面、行人天橋及街道有完整銜接，不再浮在草地上或停在半空；PR 6/7 的路網不改。

## Completed work

1. **Fuji 正門**（`civicCore.ts`）：大堂地台改為落地實心圓台並補回前方缺口；前半圈三級台階落前庭；玻璃筒的開口做成正門（內縮玻璃門、燈線門檻、雙柱雨篷）。
2. **前庭**（`streetKit.ts` `landmarkForecourts`／`FORECOURTS`）：Fuji 正面半圓前庭（r 80 m，後方水池不受影響）連 10 m 大道直達 ① 外側行人路；環形底座西側及廣場側鋪地（避開 Meter 服務亭 bay 4 及膜住宅地）；船身前庭由 u 50 至 94，連 ① 行人路，兩個花槽。環形及船身鋪地按草地高度鋪（3 m 網格射線取樣）。
3. **天橋**（`layout.ts` `plazaWalks`）：Fuji 及船身兩條天橋末端落到前庭（0.45 m）；環形天橋改為 17 m 接入環內最低一層花園，入口有燈框門及平台（`megastructures.ts` `ring`）。
4. **環形底座**：兩個環面方向的底座立面加地面玻璃大堂、4 m 豎框、深雨篷及燈邊。
5. **船身**：最底一層改為內縮玻璃商店層、白色楣板及 6 m 柱列；天橋落點（u 53）設主入口雨篷。
6. **玻璃盒移除**（`floaters.ts`）：`ASSEMBLY`、模組動畫及其材質刪除；浮空議事球不變。
7. **環形隧道門**（owner 2026-11-20 追加）：① 大街及 guideway 本來直穿環形東南腳實心環身（PR 6/7 遺留）。`RING_GATE`（`megaFootprints.ts`）定義斜向隧道（環內 x 30.5 至 53.5／65，高 22 m）；`megastructures.ts` 用材質副本 `carve()` 喺 shader 挖空該範圍（只限巨構本身，天橋及 Meter 用原材質不受影響，draw call 不增加，只多一個隧道燈材質），再加淺色內壁、頂板、燈帶及兩面燈框門。`tests/megastructures.test.ts` 檢查大街及路軌喺環身範圍內都留喺隧道內。

## Actual validation results

- Verification status: PASSED（雲端）；owner 已睇圖並要求合併
- Commands/manual checks and results: root `npm test` exit 0（先裝 `survey/` 依賴）；`npm run build` PASS；`git diff --check` PASS。`survey/`、`module-swap/` 未改動。
- Evidence/environment: 雲端容器 headless Chromium（SwiftShader，1280×720，hour=12），`?review=street` + `window.cityPose` 同一 session 拍攝；前後對照 `/mnt/project-files/entrance-roads/`（before.jpg、after.jpg）。FPS 未量（軟件渲染無參考價值），請在開發 Mac 用 `scripts/fps.sh` 量一次 hero。

## Known issues and blockers

- `tests/odaiba.test.ts` 的 landmark 集仍包括 Hilton（runtime 已因船身而不載入）；船身前庭因此由 u 50 起，與 Hilton 東面保持 11 m，以免改變測試中的門口行程。
- 環形底座 +x/+z 角與 Meter 服務亭 bay 4 的地台本身重疊（既有問題，未處理）；環形天橋末端亦在該 bay 範圍上空。
- 未改 Fuji 框架巨柱腳（仍企草地），未改環內綠化層。

## Next expected step

已合併。FPS 仍未量，請喺開發 Mac 用 `scripts/fps.sh` 量 hero；如再修改，由本文件開始。
