# hero-atmosphere — 霧、光層次、夜空（wow 方案 A）

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — owner 話 R1「有好啲但未 wow」（2026-11-02）；R2 水面燈光倒影已實作，等 owner 目視
- Branch: `feat/hero-atmosphere`（worktree `.claude/worktrees/feat+hero-atmosphere`）
- Base commit: `5fb2428aa10f9da441239b1304b46a37b4be81e0`
- Last verified commit: R2 commit（root test／build／diff-check PASS）
- Remote availability: NOT PUSHED

## Session Git state

- Session starting branch and HEAD: `main` `5fb2428`
- Last fetched origin/main commit: `5fb2428`（2026-11-01，同 local main 一致）
- Local changes present at session start: 主 checkout 有 `.agents/skills/closeup-polish/SKILL.md` 修改同未追蹤 artifacts（保留，冇郁）
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 2026-11-01：未來感改咗幾輪都唔夠 wow。診斷：冇主角輪廓、光冇層次、冇空氣感、太滿。方案次序 A 光／霧／調色 → B 巨構 → C 投票變化嗰刻 → D 減法 → E 只磨近鏡 model。今個 task 只做 **A**，唔改 model。驗收：owner 目視 hero 日／夜。

## In-scope files and dependencies

`src/main.ts`（fog chunk、霧密度、夜空地平線）、`src/odaibaScene.ts`（landmark 玻璃夜間房間）、`src/districtMeters.ts`（concentration 塔 `towerNight`）。R2 加 `src/bayWater.ts`（`waterLights`）。唔做：巨構（B）、投票轉場（C）、真 planar reflection（要多 render 一次 16M 三角形，太貴）。

## Completed work（R1）

- 高度霧：全域覆寫 three `fog_*` ShaderChunk，FogExp2 密度喺水面 ×2.4、以 45 m 高度尺度遞減；世界高度由 view-space 位置計，所有有 fog 嘅材質（包括 instanced）唔使新 uniform。
- 霧密度 `.00015+haze*.0001` → `.0004+haze*.0001`：district 仍清楚，遠岸同橋落霧，有縱深。
- 夜間光層次：landmark 玻璃加世界座標 hash（6 m × 4.2 m 格），夜晚約一半格熄、亮嗰啲 `.55` → `.7`；curtain wall 夜間全格底光 `.3` → `.045`、`curtainGlow` 夜間 `+.8` → `+.45`；concentration 塔亮房夜晚由 50% 減到約 25%（`towerNight`）。
- 夜空地平線 `#1c2941` → `#2a3354`（城市光暈）。

## R2（2026-11-02）：水面城市燈光倒影

- Owner 對 R1：有好啲，要埋燈光倒影，但整體仍未 wow。
- 做法（唔再 render 城市）：RenderPass 之後一個 pass 將已渲染畫面以 1/4 解像度 copy 去 `lightCopy`；水面 shader 夜晚喺螢幕上向上取 24 個樣本（0.2 畫面高），超過亮度門檻嘅光按距離遞減加入 emissive，橫向用 ripple 擺動 → 一條條晃動嘅光柱。水面寫 alpha 0 作 mask，copy 時排除水面，避免倒影疊倒影；同一個 pass 立即將 scene buffer alpha 還原為 1（試過唔還原：後面 pass 會令遠海變灰白）。日間 `waterLights.night`=0，唔做 copy、唔取樣。
- 證據：`artifacts/hero-atmosphere/r1-h21.png`、`r1-h16.png`（日景同 a3 一樣）。
- 限制：hero 鏡頭見到嘅水面少，所以 hero 觀感只係加少少；倒影係 screen-space，水面上方出咗畫面嘅光唔會反射。

## Actual validation results

- Verification status: PARTIAL — 機械檢查 PASS；owner 目視 NOT RUN
- R1 同 R2 各自：root `npm test` exit 0、`npm run build` ✓、`git diff --check` clean；survey／module-swap 冇改
- R2 vsync FPS：日 59.9–60.0、夜 59.9–60.0（5 個樣本，載入 25 s 後）；draws 970 → 972（copy／alpha 還原 quad）
- Development Mac headless Chrome（playwright-cli）1920×1080 DPR1，Vite DEV `?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16|21`，載入 25 s 後每 2.5 s 取 canvas `data-fps`：vsync 下 branch 日／夜 60（第二次量度）；baseline 同 branch 都偶爾有一次 45 跌幅（噪音）；draws 970 不變
- Console：只有 favicon 404，冇 shader 錯誤
- 證據：`artifacts/hero-atmosphere/before-after.jpg`、`base-h16|h21.png`、`a3-h16|h21.png`
- NOT RUN：展覽機 FPS、uncapped FPS、headline close-up／street／civic review 鏡頭、dusk 時段、Meter high/low 狀態

## Known issues and blockers

- 效果克制：日景主要係遠景霧，district 本身仍然平均光；夜景改善咗窗燈同近岸水面，但天空仍然平。
- 高度霧影響所有鏡頭（包括 close-up）；close-up 距離短，預計影響細，但未驗證。

## Important decisions

- A 唔改任何 model，只動全域光／霧，方便同 B 分開評估「係咪 model 問題」。

## Next expected step

Owner 目視 R2。A 嘅回報開始遞減；owner 話仲未 wow，下一步建議做 B（一個天馬行空嘅巨構做城市簽名），或者先試日景逆光同 grade 對比。
