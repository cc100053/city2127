# mobility-layers — 2127 空中交通分層與行人生活

- Owner: cc100053（實作：Claude）
- Status: DONE
- Branch: feat/mobility-layers（已合併入 main）
- Base commit: cce1e8b614d885d2e1422a3426273de2094b447e
- Last verified commit: 本分支 commit 前嘅 working tree（base + 本任務 diff）；commit SHA 見 `git log --grep mobility-layers`
- Remote availability: origin/feat/mobility-layers、origin/main

## Session Git state

- Session starting branch and HEAD: main @ cce1e8b614d885d2e1422a3426273de2094b447e，working tree 乾淨
- Last fetched origin/main commit: cce1e8b（2026-10-06 fetch 成功，main 同 origin/main 無分歧）
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED（開分支時 main 已係最新）
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

User 2026-10-06 揀咗 brainstorm 方案 A–H 全部做：
- A 空中分三層：區域 160–170 m（district loop、球體 approach）、城市 80–100 m（新 shore lane，兩條 leg 高度同方向都唔同）、服務 30–45 m（現有 quadrotor）。
- B 建築泊位：轉乘站到達塔（38 m）做第二個 berth，重用 `dockMotion`。
- C 航道基礎設施：兩條環線有固定淡導引線；四支 58 m 海上燈柱企喺 shore lane 下面。
- D Meter 機款：低 automation 係載人 winged craft，高 automation 由 autonomous pods 逐架取代；wingmen 令 platoon 喺高 automation 先出現。
- E 行人停留：每三個 walker 有一個喺景觀位停 40 s，轉身面向海灣。
- F 夜間光環：每個人（promenade、deck、轉乘、plaza crowd）都有 collar light，夜晚發光。
- G 立體人流：五個 walker 有一個行 mid-level／garden skyway deck。
- H 轉乘節點：Aqua City 前面海邊 56 m 碼頭、船泊位、候船 canopy、到達塔同玻璃升降機；16 個 transfer 落船／排隊／上船，跟船嘅 40 s 週期。

## In-scope files and dependencies

`src/layout.ts`（新路線及 INTERCHANGE；mid/garden deck 座標由 skyways 搬過嚟共用）、`src/mobility.ts`、`src/odaiba2127.ts`（碼頭、到達塔、燈柱）、`src/waterRooms.ts`（`laneBeaconSites`）、`src/skyways.ts`（改用共用 deck 座標）、`src/cityRig.ts`（傳 night 入 mobility）、`tests/mobility.test.ts`、`tests/districtMeters.test.ts`、docs。冇改 survey／module-swap。

## Completed work

全部 A–H 已實作。另外球體 shuttle 離開時改為 4 s 轉身，唔再即時反轉方向。Meter 計數（walkers 160/100/40、pods、aircraft 2/16/30）同 `getConfiguration` 證據不變。

## Actual validation results

- Verification status: PASSED（自動測試／build）；PARTIAL（瀏覽器目視）
- Date and checked commit/worktree: 2026-10-06，base cce1e8b + 本任務 diff
- Commands/manual checks and results: `npm test` exit 0（23 個 PASS 行，包括新嘅航線間距、泊位轉身連續、deck／停留／transfer 連續、pod 無半透明 settled level）；`npm run build` exit 0；`git diff --check` OK。
- Evidence/environment: Claude 桌面 app 內置瀏覽器，viewport 1600×1000 emulation，Vite dev server。檢查咗 hero 日景（`?hour=12`，nw mixed／high）、夜景（`?hour=22` nw high）、黃昏 standalone（`?hour=18.5`）、轉乘站近景（船泊位＋人流 `reviewTime=18/20`；空中 shuttle 停泊 `reviewTime=2`）、夜間 collar light、deck walker。近景用咗一個臨時 DEV camera param，驗完已 revert，冇 commit。
- Integrated commit and checks: 見 git log；CI 結果記錄喺 push 之後嘅報告
- Changes since verification: 只有本 handoff

## Known issues and blockers

- FPS NOT MEASURED：瀏覽器 pane 喺背景時 rAF 被節流，量到嘅數字無代表性。新增 draw calls 估計約 +10（air-pods 3、collar 2、static baked 幾個）。展覽機要再量。
- F collar light 喺 hero 距離大約 1 px，主要靠 bloom；近景清楚，hero 夜景未算明顯。如要更易讀，可以加大 collar 或者改 sprite。
- B 冇放喺 Telecom Center／tower 天台：天台有 sky garden 同唔清楚嘅 GLB 幾何，所以泊位做成轉乘站專用到達塔。
- 未做人類美術 review。

## Important decisions

- Shore lane 喺海上，等佢清楚喺 hero 前景出現；燈柱 58 m，同 80 m inbound leg 保持 ≥20 m 間距（clearance test）。
- Craft 只喺兩個 settled level 中間轉換，所以靜止城市永遠唔會見到半透明嘅 craft。
- Transfers 獨立於 Meter（同船、ferry 一樣係 base civic）。

## Next expected step

冇。如果要再加強：喺展覽硬件量 FPS；美術 review collar light 喺 hero 距離嘅可讀性。
