# docs-readability — 文件改為逐行事實＋用語集

- Owner: cc100053（實作：Claude Code）
- Status: IN_PROGRESS — 已 commit 及 push feature branch；等其他 AI review，owner 指示先唔好 merge
- Branch: `docs/readability-glossary`
- Base commit: `1bbffea`（main，2026-10-19）
- Last verified commit: 本文件同一 commit
- Remote availability: `origin/docs/readability-glossary`

## Session Git state

- Session starting branch and HEAD: `main` @ `1bbffea`
- Last fetched origin/main commit: `1bbffea`（2026-10-20）
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED（owner：merge 留待 review 之後）
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner（2026-10-19）：文件多數由搜尋或 AI 讀取，所以以 agent 搜尋／閱讀效率為準。要求：(1) 將長段落拆成一行一個事實；(2) 新增用語集。後來加上：README.ja／en 同 README.md 結構一致。

完成條件：內容唔減少；現有 deep link anchor 保留；連結全部有效。

## Completed work

- `docs/PROJECT.md`、`docs/VALIDATION.md`、`docs/EXHIBITION_SPEC.md`、`README.md`：段落改為 bullet，加細標題。VALIDATION 每項證據用 `### 名稱（日期）`，`rg -n "^### " docs/VALIDATION.md` 即係索引。
- `docs/GLOSSARY.md`（新）：日本語／中文／English／code 名對照，唔定規格；`docs/README.md` 索引加一行。
- `README.ja.md`、`README.en.md`：改成同 `README.md` 一樣嘅 17 個標題同內容；ja／en 獨有嘅連結（CONTRIBUTING、CITY MASTER TASTE、ART、S4、v1 demo）亦加入 README.md。
- 唯一內容整理：SPEC 入面九行逐輪 Fuji TV 狀態（v2「待實作」、第3–9組「待視覺review」，已被「合併」一行取代）合成一段現行狀態；逐輪細節仍喺 VALIDATION 同 [Fuji TV 交接](archive/fuji-tv-polish.md)。

## Actual validation results

- Verification status: PASSED（文件檢查）
- 每個改寫檔案用 script 比較改前後嘅數字、code span、連結（code fence 除外）：PROJECT／VALIDATION／README.md 無缺失；SPEC 只少兩條中途截圖連結（仍喺 Fuji TV 交接）；ja／en 缺少嘅只係改寫後同義嘅寫法。
- 最長行：PROJECT 8,080 → 421；VALIDATION 1,463 → 590；SPEC 1,025 → 234；README.md 1,078 → 560（ja 811、en 617，都係「作品について」段落）。
- 相對連結全部存在；被引用嘅 anchor（VALIDATION `#performance-evidence`、README 兩個標題、SPEC `#開發工具與待完成驗收`）保留；`git diff --check` PASS。
- 文件改動，無 runtime 測試。

## Known issues and blockers

- `docs/handoffs/README.md` 同 `docs/README.md` 寫「50份」歸檔交接，實際檔案 53 份（改動前已存在，未處理）。

## Next expected step

其他 AI review `docs/readability-glossary` 對 `main` 嘅 diff；owner 確認後 merge（`--no-ff`）並 push main。
