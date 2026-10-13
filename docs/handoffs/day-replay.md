# day-replay — 「今日の台場」回顧章節

- Owner: cc100053（規劃討論：Claude Code）
- Status: PLANNED — 方向討論中，未開始實作；開工前要 owner 答覆下面嘅「待決定」
- Branch: 未建立（建議 `feat/day-replay`，由最新 main 開）
- Base commit: 未開始；規劃時 main 係 `2695823`
- Last verified commit: NONE
- Remote availability: NOT PUSHED（只有本文件）
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: `main` @ `2695823`（2026-10-13 文件整理）
- Last fetched origin/main commit: `2695823`（2026-10-13）
- Local changes present at session start: 只有未追蹤嘅 `.playwright-cli/`（與任務無關）
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

問題（2026-10-13 討論）：每位觀眾嘅一票只帶來細微變化，觀眾睇唔到「大家累積」嘅城市。回顧章節喺大屏幕空檔快速重播當前 run 嘅城市變化，等排隊同剛完成嘅觀眾明白：城市由一個個住民聲音堆出嚟、今日已經轉向過幾次、下一個聲音就係自己。

建議驗收條件（未經 owner 確認）：
- 只用權威資料（當前 run 嘅有效提案，即 Undo 之後仲生效嘅）重建每一步；最後一步要等於現時 `CityView`。
- 唔改計分、刻度 A、10 秒閱讀時段、handoff、lease 同 A/B 排程；live 結果永遠優先。
- 被打斷、snapshot、reset、Undo、reconnect 時即刻停止，回到權威狀態，冇殘留字幕或 timer；reduced motion 唔播快轉。
- 主鏡頭唔郁（現行規則：冇自動鏡頭運鏡）。

## 已討論嘅方向（2026-10-13）

**節目（約 20–30 秒，暫擬）**

| 時間 | 大屏幕 | 文案（日文暫擬） |
| --- | --- | --- |
| 0–3 秒 | 城市稍為壓暗，右上卡片轉做回顧模式，底部出現四條 Meter 時間軸 | 今日の台場を振り返る · 暮らしの声 N |
| 3–5 秒 | 跳返 run 開始時嘅城市 | 朝、街はここから始まりました。 |
| 5–25 秒 | 快轉 #1→#N；章節位停大約 1.5 秒，加 site 光柱同一句字幕（最多 3–4 個章節） | 例：#47 · アクアシティ南が、開かれた水辺に。 |
| 25–30 秒 | 回到最新狀態，恢復日常卡片 | そして、今の街へ。次は、あなたの声が重なります。 |

**主軸係「轉向章節」，唔係「朝 → 今」對比**：模擬顯示 Meter 本質上係平均值，會游走而唔會一直推遠，開館同而家可能差唔多；精彩之處喺中途嘅轉向（例如 #47 變開放水岸，#90 又變返私密）。

**章節揀選**：只揀真正嘅形態切換（band flip，按刻度 A 展示分數計）。刻度 A 之後切換多咗（60 位觀眾約 98 次，四條軸合計），所以一定要篩：建議揀維持最耐、或者改變最大嘅 3–4 個；冇切換嘅 run 就揀數量變得最多嗰條軸。

**觸發（建議第一版）**：只喺空檔播（冇排緊隊嘅結果、冇 live 過渡），每 15 位新觀眾或者閒置 3 分鐘播一次，兩次之間最少隔 2 分鐘；當前 run 起碼要 10 份提案；有 live 結果就即刻打斷。Admin 加一個手動「播回顧」按鈕。另一個做法係喺 server 排程預留 30 秒，唔會被打斷，但要同步改 server 排程、Guest 等待同 lease。

**觀眾互動**

| 觀眾喺邊 | 見到／做咩 | 改動位置 |
| --- | --- | --- |
| 排隊中 | 回顧等同開場短片 | 只改 root |
| iPad 開始畫面 | 「これまでに N の声が街を形づくりました。」（要改 P1 文案，待決定） | Guest，`guestCount` 已有 |
| 作答中 | 眼睛喺 iPad；大屏幕照常 | 無 |
| 自己嘅 10 秒結果 | 結果卡加細時間軸，最尾一格「あなた #n」，唔加時間 | root 結果卡 |
| 交接／離開 | 「街の画面で、今日の歩みをご覧ください。」 | Guest 交接文案 |
| 下一次回顧 | 自己嗰格出現喺時間軸，可能成為章節 | 自動 |

唔建議畀觀眾喺 iPad 自己撳重播（會同 A/B 爭大屏幕）。

## 技術方向（未實作）

- **Server**：新增 `GET /api/city-history`，回傳當前 run 每份有效提案嘅 `{ordinal, stationId, afterScores, slotSeeds}`。layout 由 `exhibitionStateLayout(afterScores, ordinal)` 計，跟刻度 A。slot seed 用 `foldSlotSeeds` 逐份推算。現有 `runProposalRecords` 上限係 64 份，要另外寫 query。
- **Root**：新增回顧控制器，逐步呼叫 `CityChangeManager.applyExhibitionLayout`。加速方法係回顧期間畀 change manager 一個大約 5 倍速嘅時鐘，唔改 3 秒常數。
- **重用**：DEV `?scaleLab`（[scaleLab.ts](../../src/scaleLab.ts)）已經做到 seeded replay 同四條 Meter 曲線，時間軸可以參考；章節可以用 [一票旅程](archive/vote-journey.md) 嘅光點：回顧時光點逐位亮起。
- **測試**：keyframe 最後一步等於 `CityView`；打斷後回到權威狀態；章節揀選規則（band flip、上限 4 個）。

## 相關決定（已確定）

- 2026-10-13 owner：**不做自動 reset**（所以一個 run 可能成日都唔 reset；「今日」嘅定義要再確認，見下）。
- 2026-10-13 owner：採用 [刻度 A](archive/meter-scale-a.md)（×0.85→2.4）；[一票旅程](archive/vote-journey.md) 已接入 live。
- 現行規則：主鏡頭唔郁；v2 分數唔影響全城氣氛（回顧壓暗屬演出，要確認唔算違反）。

## 待決定（開工前）

1. 觸發：「空檔播加即時打斷」，定 server 正式預留時段？
2. 長度：20 秒定 30 秒？
3. 「今日」：當前 run（冇自動 reset，要靠 admin 手動 reset），定以日期計？
4. iPad 開始畫面加「N の声」一句：要唔要改 P1 文案？
5. 章節揀選：「維持最耐」定「改變最大」？
6. 天色：保持實際時鐘，定加太陽快轉做「一日」嘅感覺？

## Known issues and blockers

- 未實作；冇任何驗證。
- 依賴 owner 答覆上面 1–6。

## Next expected step

cc100053 答覆「待決定」1–6 之後，由最新 main 開 `feat/day-replay`，先做 server `city-history` endpoint 同 keyframe 測試，再做 root 控制器同章節字幕。
