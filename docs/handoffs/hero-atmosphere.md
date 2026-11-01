# hero-atmosphere — 霧、光層次、夜空（wow 方案 A）

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — R1 已實作同機械檢查，等 owner 目視
- Branch: `feat/hero-atmosphere`（worktree `.claude/worktrees/feat+hero-atmosphere`）
- Base commit: `5fb2428aa10f9da441239b1304b46a37b4be81e0`
- Last verified commit: R1 commit（root test／build／diff-check PASS）
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

`src/main.ts`（fog chunk、霧密度、夜空地平線）、`src/odaibaScene.ts`（landmark 玻璃夜間房間）、`src/districtMeters.ts`（concentration 塔 `towerNight`）。唔做：巨構（B）、投票轉場（C）、水面反射城市燈（要 planar/SSR，太貴）。

## Completed work（R1）

- 高度霧：全域覆寫 three `fog_*` ShaderChunk，FogExp2 密度喺水面 ×2.4、以 45 m 高度尺度遞減；世界高度由 view-space 位置計，所有有 fog 嘅材質（包括 instanced）唔使新 uniform。
- 霧密度 `.00015+haze*.0001` → `.0004+haze*.0001`：district 仍清楚，遠岸同橋落霧，有縱深。
- 夜間光層次：landmark 玻璃加世界座標 hash（6 m × 4.2 m 格），夜晚約一半格熄、亮嗰啲 `.55` → `.7`；curtain wall 夜間全格底光 `.3` → `.045`、`curtainGlow` 夜間 `+.8` → `+.45`；concentration 塔亮房夜晚由 50% 減到約 25%（`towerNight`）。
- 夜空地平線 `#1c2941` → `#2a3354`（城市光暈）。

## Actual validation results

- Verification status: PARTIAL — 機械檢查 PASS；owner 目視 NOT RUN
- Root `npm test` exit 0、`npm run build` ✓、`git diff --check` clean；survey／module-swap 冇改
- Development Mac headless Chrome（playwright-cli）1920×1080 DPR1，Vite DEV `?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16|21`，載入 25 s 後每 2.5 s 取 canvas `data-fps`：vsync 下 branch 日／夜 60（第二次量度）；baseline 同 branch 都偶爾有一次 45 跌幅（噪音）；draws 970 不變
- Console：只有 favicon 404，冇 shader 錯誤
- 證據：`artifacts/hero-atmosphere/before-after.jpg`、`base-h16|h21.png`、`a3-h16|h21.png`
- NOT RUN：展覽機 FPS、uncapped FPS、headline close-up／street／civic review 鏡頭、dusk 時段、Meter high/low 狀態

## Known issues and blockers

- 效果克制：日景主要係遠景霧，district 本身仍然平均光；夜景改善窗燈但天空同水面仍然平。
- 高度霧影響所有鏡頭（包括 close-up）；close-up 距離短，預計影響細，但未驗證。

## Important decisions

- A 唔改任何 model，只動全域光／霧，方便同 B 分開評估「係咪 model 問題」。

## Next expected step

Owner 目視 before/after。如要再推：日景加強逆光（太陽方位）或 grade 對比、夜景水面燈光倒影（便宜版：水面 emissive 條紋）；之後做 B（一個巨構）。
