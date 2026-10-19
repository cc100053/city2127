# intro-origin-card — 開場「街は、誰が決めるのか。」卡同 README 作品概念

- Owner: cc100053（實作：Claude Code）
- Status: DONE
- Branch: `feat/intro-origin-card`
- Base commit: `5e2fc3a`（main，2026-10-19）
- Last verified commit: 本文件同一 commit（feature branch）；合併後見 `git log`
- Remote availability: 合併後喺 `origin/main`

## Session Git state

- Session starting branch and HEAD: `main` @ `5e2fc3a`（2026-10-19）
- Last fetched origin/main commit: `5e2fc3a`（2026-10-19）
- Local changes present at session start: NONE（`question_candidates.md` 已 gitignore）
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner（2026-10-19）：喺「100年後の街は誰が決めるのでしょうか」嘅說明加入「過去城市由政府或財團決定，而唔係住喺城市嘅住民；假如100年後由住民決定會點樣？藉此機會嘗試檢討呢個可能性」，令世界觀導入更順。Repo 之前冇作品動機／概念說明，owner 決定放入 README 同 RESIDENT_COPY。

## Completed work

- [RESIDENT_COPY](../../RESIDENT_COPY.md) 新增 `intro.origin`：標題「街は、誰が決めるのか。」，內文兩句（卡片上限）「これまで街のかたちは、行政や大企業が決めてきました。住民の思いで街が決まるとしたら、どうなるでしょう。」
- [surveyAtmosphere.ts](../../../src/surveyAtmosphere.ts)：日常卡輪換由 `intro.origin` 開始，之後 `intro.identity`；`intro.inherited` 照舊只喺當前 run 有回答時出現，排喺 identity 之後。
- [tests/surveyAtmosphere.test.ts](../../../tests/surveyAtmosphere.test.ts)：檢查新 run 同有回答時嘅開場次序。
- README（繁中／English／日本語）標題下新增「作品概念／About the work／作品について」。SPEC、PROJECT 同步。

## Actual validation results

- Verification status: PASSED（桌面 headless Chrome）
- Root `npm test`、`npm run build`、`git diff --check` PASS。
- Scratch SQLite + `createSurveyServer` + Vite + headless Google Chrome 1280×720 `?survey=…&hour=16`：卡片次序 origin → identity → lineage → participation → 四張設施卡 → origin，每張12秒；[截圖](../../../artifacts/intro-origin/intro-origin.png)（第二輪）兩句完整顯示喺卡內。
- 已知（改動前已存在）：場景載入期間 main thread 被佔用，第一張卡喺 DOM 出現（約8秒）但未必畫得出，載入完即轉下一張；所以第一輪 origin 喺 headless 冇被畫出，之前 identity 都係咁。其後每輪正常顯示。

## Next expected step

無。實機大屏幕閱讀性屬 [P5](../resident-experience-p5.md)。
