# attract-loop — 大屏幕閒置吸引循環

- Owner: cc100053（實作：Claude Code）
- Status: IN_PROGRESS — Step A（idle 控制器、鏡頭漂移、呼籲字）同 Step B（声の灯）已實作，待 owner 視覺驗收
- Branch: `claude/project-thread-ermwzy`
- Base commit: `96ab51a`
- Last verified commit: 見下面 validation
- Remote availability: `origin/claude/project-thread-ermwzy`（owner 2026-11-20 批 push；PR 前問 owner）
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: `claude/project-thread-ermwzy` @ `96ab51a`（同 origin/main）
- Last fetched origin/main commit: `96ab51a`（2026-11-20）
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

冇觀眾投票嘅空檔，大屏幕唔好死寂：慢慢漂嘅鏡頭、「今日大家嘅聲音」、同埋邀請下一位觀眾嘅「次は、あなたの声。」。

- 只喺展覽畫面（`?survey`）播；standalone 唔播；`?attract=0` 關閉。
- 連續 `IDLE_SECONDS`（10 s，owner 2026-11-20 由 90 s 改）冇 survey 事件（結果、snapshot、reset、Undo、reconnect、explore）、冇 headline／explore 鏡頭、冇 pointerdown／wheel／keydown 先開始。
- 任何上述事件即刻停止：鏡頭留喺當刻位置，交返俾負責嗰個事件嘅鏡頭代碼（live 結果由 `HeadlineCamera` 喺 journey 期間由當前位置順返 hero；snapshot 等即時 hero；staff 輸入就由 OrbitControls 由當前位置接手）。
- Reduced motion：鏡頭唔郁，只顯示呼籲字。
- 一個循環 60 s：drift 0–25 s → 声の灯 25–50 s（少於 3 位觀眾就跳過）→ 呼籲 50–60 s（0.8 s 淡入淡出）；鏡頭全程漂。

## In-scope files and dependencies

- `src/attractLoop.ts`（新）：純函數 `driftPosition`／`attractSegment`／`ctaOpacity`、`AttractLoop` class、`attractCta()` DOM。
- `src/main.ts`：建立、`wake`（survey 事件同輸入）、每幀 `update`（喺 headline／explore update 之後）。
- `src/style.css`：`.attract-cta`。
- `tests/attractLoop.test.ts`（已加入 `npm test`）。
- `src/voicesReplay.ts`（新）：声の灯 卡、時間、曲線、最強傾向、DEV `demoVoices`；`src/voteJourney.ts` 加 `replayLanterns`／`endReplay`；`tests/voicesReplay.test.ts`。
- 冇改 `survey/` server：用 city view 已有嘅 `recentProposals`（最近 64 位，同投票燈同一窗口）。

## Completed work

Step A：鏡頭以 settled hero（polar 1.42）為中心，yaw ±12°（週期 150 s，峰值約 0.5°/s），polar 只向上呼吸 0.06 rad（週期 47 s），距離不變；開始時用 4 s 由當刻姿勢 blend 入 drift 路徑，target 同時回 hero target。呼籲卡底部中間：「次は、あなたの声。」、「これまでに N の声が、この街を形づくりました。」（N=guestCount，0 時隱藏）、「iPad で、2127年の台場の暮らしを選んでください。」。

Step B 声の灯（25 s）：0–0.8 s 卡淡入，1.5 s 前所有投票燈熄；1.5–19 s 逐位觀眾嘅四粒燈由投票地點升到原本嘅燈位（放大 3.2×、日間都用夜間亮度，等 hero 睇得到），卡顯示「暮らしの声 #n」同 Meter 曲線（只畫有人投過嘅軸，Q3 能源令 environmentalPriority 冇票）；19 s 後顯示「いちばん多かった声：「X」寄り N%」（軸名「AとB」嘅 −1＝A、+1＝B）。run 超過 64 位時標題寫「最近の 64 件」。Reduced motion：唔快轉，直接顯示完成嘅卡。任何事件 → `endReplay` 原樣還原燈。

DEV 預覽：`/?meters=&attract&attractVoices=40`（冇 server；seeded 40 位；`&attractIdle=5` 可縮短等待）。

## Actual validation results

- Verification status: PARTIAL
- 2026-11-20：`npm test`、`npm run build`、`git diff --check` PASS（見 commit）；browser 視覺檢查 NOT RUN（cloud headless 軟件渲染太慢，7 分鐘未出第一個 120 幀診斷）。

## Known issues and blockers

- 冇 headline 嘅 live 結果喺 drift 期間到達時，`HeadlineCamera.play` 會即時 cancel 回 hero（跳一下），同現行 snapshot 即時規則一致；如 owner 想順滑，要另外加返回段。
- 大屏幕唔知道 iPad 作答中，所以作答期間都可能播（觀眾望住 iPad，判斷可接受）。

## Important decisions

- 2026-11-20 owner：主鏡頭可以自己郁，但只限 idle 時喺 hero 附近慢慢漂，唔做 site tour（取代「主鏡頭唔郁」規則，只限 idle）。
- 2026-11-20 owner：中段唔重播建築（27 個模型翻來覆去會重複），改做「声の灯」：今日每份提案化成一粒光喺投票站升起並累積，加今日四條 Meter 曲線同一句總結。取代 [day-replay](archive/day-replay.md) 嘅建築快轉方向。
- 居民場景（凪／湊／葵）做空檔小片段：延後，要 owner 批正式接入。

## Next expected step

Owner 喺 Mac 實機睇 Step A＋B（cloud 冇 GPU 錄唔到）。可能嘅調整：燈放大倍數／亮度、卡位置、播放速度；要成日（>64 位）完整重播就要加 server endpoint。
