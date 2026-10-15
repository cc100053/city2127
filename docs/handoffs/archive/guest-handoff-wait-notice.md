# guest-handoff-wait-notice — 交接畫面等待提示

- Owner: cc100053（實作：Claude Code）
- Status: DONE
- Branch: `feat/guest-handoff-wait-notice`
- Base commit: `db561a1bc0083881078289309c27881ac5cd8b9e`
- Last verified commit: 本文件同一 commit（feature branch）；合併後見 `git log`
- Remote availability: 合併後喺 `origin/main`

## Session Git state

- Session starting branch and HEAD: `main` @ `db561a1`（2026-10-15）
- Last fetched origin/main commit: `db561a1`（2026-10-15）
- Local changes present at session start: 未追蹤 `question_candidates.md`（企劃組，保留）
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 報告：答完後去到「次の方へどうぞ。」，撳「はじめる画面へ」一次冇反應。查明係 [SPEC](../../EXHIBITION_SPEC.md#guest單站與-ab) 嘅10秒閱讀保護（提前交接唔截短已排定展示），但畫面冇任何提示。要求：保護期間撳掣時顯示提示文。

## Completed work

- [guestDebugView.ts](../../../survey/src/ui/guestDebugView.ts) `nextGuest`：保護期間撳掣時設定 status notice `control.handoffWait`（文案見 [RESIDENT_COPY](../../RESIDENT_COPY.md)），再顯示交接畫面；保護完結後照舊自動返開始畫面並清除提示。保護時間、lease、server 規則不變。

## Actual validation results

- Verification status: PASSED（桌面 headless Chrome）；iPad 實機 NOT RUN
- `survey/` `npm test`／`npm run build`、`git diff --check` PASS。
- Scratch SQLite + `createSurveyServer` + headless Google Chrome 1280×720：`/guest` 同 `/guest?station=A` 各答4題提交 → 次の方へ → 撳時冇提示 → 撳「はじめる画面へ」後顯示提示、仍喺 handoff → 約9.7秒後自動返 welcome、提示消失；冇 page error。[截圖](../../../artifacts/guest-handoff/handoff-wait-notice.png)。

## Next expected step

無。iPad 實機睇提示可讀性屬 [P5](../resident-experience-p5.md)。
