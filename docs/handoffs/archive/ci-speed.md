# ci-speed — 縮短 CI 同整合等待時間

- Owner: cc100053（實作：Claude）
- Status: DONE
- Branch: chore/ci-speed（已合併入 main）
- Base commit: 08badce（Merge branch 'fix/ground-zfight'）
- Last verified commit: base + 本任務 diff（commit 見 `git log --grep ci-speed`）
- Remote availability: origin/chore/ci-speed、origin/main

## Session Git state

- Session starting branch and HEAD: main @ 08badce，working tree 乾淨，同 origin/main 一致（2026-10-06 fetch）
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

User 2026-10-06 揀咗三項：(1) 加快測試、(2) 純文件 push 唔跑 CI、(3) 唔使每一步都等 CI。

## Completed work

1. Root CI 大約 6.5 分鐘都係花喺 `npm test`，其中 `tests/odaiba.test.ts` 本機要 158 秒，因為佢對成個城市做幾萬次 brute-force raycast。而家個 test 透過 `three-mesh-bvh@0.9.15`（只係 devDependency，唔入 bundle）做 raycast：每個 geometry 第一次命中時先建立 BVH，用 `indirect` 模式，唔會改到 geometry 本身嘅 index。
2. `.github/workflows/ci.yml`：push／PR 只改 `docs/**`、`**/*.md` 時唔跑 CI；同一 ref 有新 push 時，會取消仲行緊嘅舊 run。
3. 流程（CONTRIBUTING、VALIDATION、AGENTS）：本機檢查過就可以 merge，唔使等 branch CI；push 之後 main CI 一定要過，fail 就即刻修。

## Actual validation results

- Verification status: PASSED（本機）
- Commands/manual checks and results: `odaiba.test.ts` 158 s → 11.8 s，所有輸出（包括 sharing court px 數 2826/2016/966/2545/1938/825/892/1434/709/694）同改之前一樣；root `npm test` 全部 exit 0，總共 25 s（之前大約 3 分鐘）；`npm run build` exit 0；`git diff --check` OK。
- Integrated commit and checks: 見 git log；main CI 時間記錄喺任務報告
- Changes since verification: 只有本 handoff

## Known issues and blockers

- `npm audit` 有 1 個 high（source-map-js，經 Vite 引入），本任務之前已經存在，同 three-mesh-bvh 無關，冇喺呢度處理。
- 如果之後有 test 喺 raycast 之後先改 geometry 嘅 position，BVH 會過時，到時要 `geometry.boundsTree = undefined` 或者重建。

## Next expected step

冇。
