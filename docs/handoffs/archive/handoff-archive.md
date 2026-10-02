# handoff-archive — 整理現行交接與歸檔

- Owner: Codex（文件整理；產品決策owner cc100053）
- Status: IN_PROGRESS — 文件整理及本地檢查完成；Git整合／發布待執行
- Branch: `codex/handoff-archive`
- Base commit: `92a97c117b06cd76adb1e293374a39c1ef3f45a5`
- Last verified commit: 上述base＋本次文件／路徑搬移delta；2026-10-03本地檢查PASS
- Remote availability: 本次任務尚未推送；既有任務的完成實作均保留在origin/main，素材研究分支另行保留

## Session Git state

2026-10-03（Asia/Tokyo）：先確認workspace為city2127；起始乾淨main／上述HEAD，無未提交文件或截圖。`git fetch --prune origin`成功，main與origin/main為0/0；從此base建立任務分支。沒有upstream整合需要或衝突。Codex為唯一文件整理owner，不改共用模組／模型內容，Meter截圖只搬位置。

## Goal and completed work

依使用者要求整理handoffs，歸檔已完成或不再適用的任務；保留仍需跟進者及原驗證限制。

- 39份既有交接與124張Meter截圖移到archive；原文／headings及圖片blob保留，修正搬移後連結與可執行例子的路徑。
- [現行索引](../README.md)只列台場素材、換場P6/S5、延後Dream Loop r2 polish及居民P5實機驗收；[歸檔索引](README.md)保留舊任務導航。
- 四份現行交接加上dated接續狀態；P5準備source及closure已在main、原分支退休，實機仍NOT RUN。
- 文件／三語README／AGENTS／survey guide／歷史snapshot只同步受影響的路徑及交接導航；本交接亦隨完成記錄存於archive，與39份舊交接分開計數。

## Actual validation results

- PASS：78份Markdown、1,183個本地file／anchor targets，無missing或ignored/untracked target；staged完整稿重查。
- PASS：39份交接原文與headings比對（只排除連結target及更名path）；124張截圖Git blob完全相同。
- PASS：保留任務的`e6c7966`、`53790a2`、`8399a26`及`92a97c1`均為最新origin/main祖先；素材研究remote tip核對為`40d696e09f5d119a3ba6aff72c19d935c8838333`。
- PASS：已搬移舊路徑全文搜尋、完整diff／新文件自審、`git diff --check`；stage／committed檢查按[Git workflow](../../CONTRIBUTING.md)執行。
- 本機npm tests/build/browser：NOT RUN，只有文件及既有證據搬移，無runtime／model內容改動；push CI仍須通過。
- 起始main [CI37016236163](https://github.com/cc100053/city2127/actions/runs/37016236163) PASS；不作本次改動或P5實機證據。
- Integrated commit/checks: NOT INTEGRATED；feature/main CI尚未執行，不預稱PASS。

## Known limits and next expected step

P6/S5、P5實機／理解程度／長跑／復原政策、台場素材研究及延後視覺目標均仍未完成。Shibuya已結束，歸檔不建立新backlog。PROJECT／SPEC／ART等僅需路徑修正，source map／產品契約／視覺規則沒有改變。

下一步Codex發布feature、確認該commit CI，按workflow整合main、重查文件／圖片保存及committed whitespace，記錄整合結果並發布main；最後核對remote main與實際main CI。
