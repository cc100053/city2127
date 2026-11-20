# road-fix — 清除斷頭路、穿樓路與舊地台

- Owner: cc100053
- Status: IN_PROGRESS（實作及本機檢查已完成，待 owner 目視驗收及 PR／CI）
- Branch: `claude/project-thread-rt9ere`
- Base commit: a3b66d1095e0ed67ff7c9661c4504e221278313b（main，PR #5 merge 後）
- Last verified commit: 716edace7102a7134021a7ce1bf0c658dd22cad3（程式碼；其後只有 change-review 圖及本文件）
- Remote availability: NOT PUSHED（推送須 owner 同意）

## Session Git state

- Session starting branch and HEAD: `claude/project-thread-ermwzy`，43265310（其樹與 main a3b66d10 相同）
- Last fetched origin/main commit: a3b66d10（2026-11-20）
- Local changes present at session start: 未追蹤之 `Dev_QA.md`（owner 檔案，未觸碰）
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 以四張紅圈截圖（2026-11-20 12:43，Desktop）指出：斷頭高架、草地上的星形白路、穿過建築的路、無樓的大塊白色地台。要求全場修正，並須保護日後會出現建築的預留地。完成條件：上述各類在 hero 及各斜角不再出現；所有 Meter 變化位、住宅、能源建築及其接駁路不受影響；`npm test`、`npm run build`、`git diff --check` 通過。

## In-scope files and dependencies

- `src/skyways.ts`、`src/layout.ts`、`src/mobility.ts`：刪除 `sweepway`、其穿梭列車及兩條斷頭 link。
- `src/odaibaScene.ts`：草地 shader 不再畫正弦步道。
- `src/roadRepair.ts`：district 外只留 `BACKDROP_STREETS`，④ 兩端改為 `BACKDROP_RUNS`；清除無建築的舊地台類網格及 district 內的舊 7 m 天橋。
- `tests/odaiba.test.ts`、`tests/skyRingClearance.test.ts`：同步斷言。
- `docs/PROJECT.md`：資料流描述同步。

## Completed work

Owner 決定（2026-11-20）：A1 刪除全部 shader 步道；B1-a 清除 district 外舊街，只保留延續新街出口的道路；C1 刪除 sweepway；編號地台清單「建議照做」。

1. C1：`sweepway`（原接已讓位予巨構的 Grand Nikko 環，下端伸出海面）、Nikko 環殘段 link、東北伸出海面的 front-left link 及 sweep 列車刪除。
2. A1：草地 shader 的正弦碎石步道刪除（穿過建築、鞍點擴成星形）。
3. B1-a：district 外舊街只保留 U 的導軌大道（東北）及受電テラス農園旁步道（農園碎石路須與之相接，`energyPipeline` 測試點不變）。舊 ~90 m 主幹道各行車線在不同位置中斷，故 ④ 兩端改為新建 24 m 延續路（18 m 車道＋兩側 3 m 行人路，`BACKDROP_RUNS`）沿舊主幹道軸線伸出，末端為掉頭圈：東段 460 m；西南段 265 m，停在 280 m 外的背景樓宇之前（原長度會越過護岸並穿過樓宇）。另以 40 m 連接路把農園步道北端接上西南延續路。沿兩段每 10 m 取樣：路面高於地形 0.37 m，無水面、樓宇或高架橋墩。
4. 地台清單：舊建築地台、廣場及其飾線、服務區、泊位標線在 district 內只保留於已建 landmark 足印（+2 m）之下；district 外地台保留於背景樓宇之下，廣場及服務區刪除。編號 3（舊 Fuji TV 地台）原建議保留為框架庭院，修剪後只剩框架腳間碎三角，故改為一併清除（Fuji 框架有自身地台）。Grand Nikko 門前 apron 中不接觸建築（足印 +3 m）的碎角刪除（編號 7）。district 內舊 7 m 天橋（B1–B3）刪除。清除之地面記入 `onFormerStreet`，樹叢保持草地，不改變樹叢、court、tower 之排列。

5. Owner 複查（2026-11-20）兩處：Yurikamome 車站一條 8 m 高平面行人通道在巨構船身起好後兩端伸出船身外，已刪除（`roadRepair` `stationWalk`：巨構 30 m 範圍內、3–12 m 高的平面 refinement 三角形）；兩條路軌在船身兩端牆身直接穿入，owner 選 A，在兩端 bulkhead 各加一個有燈框的深色隧道口（`megastructures.ts` `megaPortal`，東 d 3.75–21.75、西 d 38.25–60.25，高 9–23 m；口內的 bulkhead 肋條及縫線略去）。

## Round 2 (owner 2026-11-20)

Owner 截圖圈出三條斷開彎曲的白色高架步道：plaza deck 的 `plazaWalks`（layout.ts）把 `plazaAt` 展開在高度之前，點成了 [x, z, y]，步道潛至 −176 m 再升上來。新增 `deckAt` 修正次序；Fuji 登陸台步道改在 Yurikamome 橋面（14.2 m）之下以 8–8.5 m 穿過並去掉折返；兩條步道的首點移離 deck 花槽，ring 步道尾點移離 deck 花槽，船身步道尾段移離組裝塔。瀏覽器檢查：沿三條步道每 1/300 長度向下（3 m）無障礙；水平 ±3 m 只餘船身步道尾段一棵樹的樹冠擦邊。`tests/megastructures.test.ts` 新斷言：點高 3–17 m，近導軌處低於 10 m（舊座標會失敗）。證據 `~/city2127-evidence/road-fix2/`。

## Actual validation results

- Verification status: PASSED（本機）；owner 目視驗收 PENDING
- Date and checked commit/worktree: 2026-11-20，本分支工作樹
- Commands/manual checks and results: 在 716edace 之樹上 root `npm test` exit 0（含新增地台與延續路斷言；forecourt visits 2、doorway meetings 2，與修改前相同）；`npm run build` PASS（既有 >500 kB 警告）；`git diff --check` PASS。`survey/`、`module-swap/` 未改動，未重跑。
- Evidence/environment: 開發 Mac，headless Chrome，Vite DEV。修改前 `~/city2127-evidence/road-fix/r0/`（43265310，樹同 main），修改後 `r1/`，對照 `~/city2127-evidence/road-fix/before-after.jpg`；三個 Meter 狀態之地面切面圖 `r0/ground-low.png`、`ground-high.png`、`ground-after.png`；B1-a 街口 `mockb/sheet-b1a.jpg`；Fuji 庭院比較 `r1/fuji-court.jpg`。FPS 僅見 capture sidecar（vsync 60），未作正式量度。
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: `artifacts/change-review/`（以 `scripts/closeupSheet.mjs` 重拍全部 56 張近鏡，再跑 `scripts/changeSheet.ts`；舊圖移至 `~/city2127-evidence/stage-closeups/sheet-pre-roadfix/`）及本文件。舊圖拍攝於較早的 main，部分差異（例如 SW courts 的 Meter 件）並非本任務造成。

## Known issues and blockers

- Owner 圖 3 右邊細圈：最可能即上述路軌穿船身一處（第 5 項）；隧道口只是牆面外加的深色面板及燈框，船身本體未開洞（車廂在牆內被遮住，從外看不到）。已檢查仍存在的高架：`gardenDecks[0]` 兩端分別接 151 m 塔及 DECKS；`plazaWalks[0]` 接環形巨構底座。
- 曾承諾的 2.5 m 格網自動 audit 未建成；以地面切面圖（三個 Meter 狀態）、延續路取樣及 `odaiba.test.ts` 新斷言代替。
- 清除後的 district 地面記入 `onFormerStreet`，保持草地，不會長出新樹叢。
- U 北端（217.5, −369.3）原本已止於 district 邊界外，本任務未改。
- 南岸 EVENT SHELF 專用支路及行人路在空置態時刻意無建築相接，按 owner 指示保留。

## Important decisions

見 Completed work 之 owner 決定；預留地（所有 Meter 位、住宅 M/P/U、車抽屜住宅、能源三座及其接駁路）不清除。

## Next expected step

Owner 目視驗收；同意後推送分支、開 PR、CI 通過後 merge。
