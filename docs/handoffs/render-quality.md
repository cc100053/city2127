# render-quality — 描畫品質（手動 low／自動調整 TODO）

- Owner: cc100053（實作：Claude Code）
- Status: IN_PROGRESS — `?quality=low` 已完成；自動品質調整 TODO
- Branch: `feat/render-quality-low`
- Base commit: `29d12db7629b8ffabdb75b53b2cec70d8c15ee9a`
- Last verified commit: 見 git log（本文件同一 commit）
- Remote availability: 合併後喺 `origin/main`
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: `main` @ `29d12db`（2026-10-15）
- Last fetched origin/main commit: `29d12db`（2026-10-15 fetch）
- Local changes present at session start: 未追蹤 `question_candidates.md`（企劃組，保留）；企劃書 `docs/PROPOSAL_JA.md` 改為 `.gitignore`
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

問題：M1 16 GB 接外置 4K（canvas 2131×1334）只有約 9 FPS，示範時卡。目標：唔改預設展覽畫面，提供手動輕量模式。

- `?quality=low`：pixel ratio 上限 1、無 MSAA、關 GTAO、關陰影；其他 URL 值同預設不變。
- production build 都可用（示範可能用 build）。

## In-scope files and dependencies

[renderQuality.ts](../../src/renderQuality.ts)、[main.ts](../../src/main.ts)、[test](../../tests/renderQuality.test.ts)；README／PROJECT／VALIDATION。

## Completed work

- 實測每個 pass 嘅成本（數字見 [VALIDATION](../VALIDATION.md#performance-evidence)）：GTAO（−38 ms）、陰影（−30 ms）、MSAA（−28 ms）係主因；GTAO sample 數、bloom、陰影解像度影響細。三樣全關 33.3 FPS。
- 加 `?quality=low`，採用全關三樣嘅組合。

## Actual validation results

- Verification status: PASSED（手動模式）；展覽機 NOT RUN
- 詳情：[VALIDATION](../VALIDATION.md#performance-evidence)

## Known issues and blockers

- Low 模式冇陰影同接觸陰影，畫面較平；冇 MSAA 邊緣有鋸齒。
- 展覽機性能未知；手機未測（手機睇 3D 城市未係已批准方向）。

## TODO：自動品質調整（未實作）

載入後量幾秒實際 FPS，低過門檻就逐級降：MSAA 4→0（或換便宜 AA）→ 陰影隔幾 frame 先更新 → 關 GTAO；快嘅機保持現狀。要先決定：門檻 FPS、會唔會喺展覽期間升返級、降級時畫面跳動點處理、手機係咪用最低級。陰影間隔更新同 MSAA 2× 未實測。

## Next expected step

Owner 決定上面 TODO 嘅門檻同範圍後，由最新 main 開新分支實作自動調整。
