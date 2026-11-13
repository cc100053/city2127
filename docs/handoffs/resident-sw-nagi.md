# resident-sw-nagi — 凪的人物情景（SW focal，草案 v4）

[居民情景計劃](../RESIDENT_SCENE_PLAN.md)階段 2 的第三個單位（SW focal，mixed 狀態進出）。目前只完成 [resident-scene](../../.agents/skills/resident-scene/SKILL.md) 步驟 1–2 的草案，尚無任何模型、鏡頭或程式。

- Owner: cc100053
- Status: PLANNED（Bible 草案待 owner 批准）
- Branch: `feat/resident-nagi-draft`
- Base commit: `4575630` 的完整 SHA 見 `git log`（起點為 main `45756308c895ca9b424a1c7e0cccb7bc217171aa`）
- Last verified commit: NONE（只改文件與 change sheet 資料來源，未跑 `npm test`）
- Remote availability: 見 Next expected step

## Session Git state

- Session starting branch and HEAD: main `45756308c895ca9b424a1c7e0cccb7bc217171aa`
- Last fetched origin/main commit: 同上，2026-11-14 fetch 成功，本地 main 與 origin/main 無分歧
- Local changes present at session start: 未追蹤的 `Dev_QA.md`（保留，不屬本任務）
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

為 SW focal（お台場南岸，活動モジュール棚）設計一位有名居民，在進入 mixed 的兩種轉變（−1 → 0、+1 → 0）中，與移動模組直接互動，，以地面層的行動演出變化。本輪完成準則：計劃文件內有居民表草案，owner 審閱後批准或修改。其後步驟見 skill。

## In-scope files and dependencies

- `docs/RESIDENT_SCENE_PLAN.md`：新增居民 5（凪）與 SW focal 列的階段 2 欄。
- `scripts/changeSheet.ts`：SW focal 單位加上 `resident: 'お台場南岸'`；`artifacts/change-review/index.html` 已重生成（0 frames refreshed，只更新文字）。
- 前提：[sw-event-shelf](sw-event-shelf.md)（棚的動畫已獲 owner 驗收；計劃表上階段 1 仍標「未打磨」，建模外觀未獲最終驗收）。
- 排除：模型、Gemini 目標圖、舞台勘察、DEV 演示接入、RESIDENT_COPY 台詞（批准後才搬入）。

## Completed work

- 居民草案：凪、34 歲、配送航路編集者（杜撰職業）（模組使用者）；兩種轉變（−1→0、+1→0；離開 mixed 不設居民，owner 2026-11-14）的台詞（v4：她是棚的使用者，用手機呼叫模組、鎖燈後走進去）（≤ 34 字）、行動、得失。
- 時序核對：SW 過場 5 s、headline 吊運約 7.0–10.1 s；居民一拍由約 10.1 s 起，hero 約 20–22 s。

## Actual validation results

- Verification status: NOT RUN
- Commands/manual checks and results: 只執行 `node --experimental-strip-types scripts/changeSheet.ts`（成功，8 units、14 change rows）。`npm test`、`npm run build` 未跑；日文未經母語者校對。
- Integrated commit and checks: NOT INTEGRATED

## Known issues and blockers

- 階段 1 尚未由 owner 最終驗收；按 skill，居民的 rung 1 須先驗收才進入步驟 3 以後。
- 地面入場模組在 `sw:focal` 被前景 court 6 傘形頂遮住（見 sw-event-shelf R3c）；舞台勘察須三態同時找鏡位。
- live 下 mixed 座位恆 4，故居民只接 band 切換，不接 mixed 內增減。
- 現有模組 GLB 只有靜態門與雨篷，可動門與雨篷節點須在 Set 步驟另建。
- 名字、年齡、職業為提議，未檢查與現有設定有否衝突。

## Important decisions

- 2026-11-14 owner：職業須是杜撰的 2127 職業（編為配送航路編集者）；場景要暗示「明日は別の部屋」（門側面板預約顯示）。

- 角色選「按日需要換場所的使用者」（owner 2026-11-14 指示：非店主），因為 mixed 的敘事是「場所可以按需要換」；與湊（52 歲、男）、時子（81 歲、女）在年齡與職業上拉開。
- 只做結果為 0 的兩種轉變；互動為手機呼叫、模組停靠鎖定、走進使用。
- 行動限於地面層，不要求人物鏡頭拍十層高處吊運。

## Next expected step

Owner 審閱計劃文件的居民 5：批准、修改或換角色。批准後等階段 1 驗收，再做舞台勘察（skill 步驟 3）。
