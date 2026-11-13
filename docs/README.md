# 文件索引 — Odaiba 2127

2026-10-02 整理。**現行場地只有台場；Shibuya 已結束，未來不再開發。** 歷史中的未完成項目不再當 backlog。Owner：cc100053；索引維護：任務文件 owner。

## 現行入口

| 文件 | 唯一主要責任 |
| --- | --- |
| [README 繁中](../README.md)／[English](../README.en.md)／[日本語](../README.ja.md) | 本機／LAN 啟動及展覽操作 |
| [EXHIBITION_SPEC](EXHIBITION_SPEC.md) | 場地、產品契約、累積／變化、當前決策及尚待驗收事項 |
| [PROJECT](PROJECT.md) | 現行模組、source/data/render flow、資源 lifecycle |
| [RESIDENT_COPY](RESIDENT_COPY.md) | P1 日文居民文案與接入條件；P2文案／P3結果接入；設施增加仍須符合實際證據 |
| [RESIDENT_EXPERIENCE_PLAN](RESIDENT_EXPERIENCE_PLAN.md) | 居民雙屏體驗 P1–P5 計劃、交付及驗收；P1–P3已實作，P4軟件驗證通過，P5驗收表已準備、實機未測 |
| [RESIDENT_SCENE_PLAN](RESIDENT_SCENE_PLAN.md) | 方向 A（owner 2026-11-12 採納）：每個變化單位先打磨建築／變化，再做人物情景；單位總表、四位居民、台詞同 owner 決定。Runtime 只有 DEV 演示 |
| [變化總覽](../artifacts/change-review/index.html) | Owner 審閱用：每個變化單位嘅選擇、變化說明、建築用途、前後對照同居民。由 `scripts/changeSheet.ts` 生成，唔好手改 |
| [ENERGY_CITY_PLAN](ENERGY_CITY_PLAN.md) | 能源篇E1–E5計劃；E1–E4完成並發布main，CI通過；Q3能源獨立累積及權威模型接入，保留舊氣候／歷史；E5目前Mac mini 30分鐘性能／操作量測已完成，實機／訪客另待驗 |
| [HOUSING_CITY_PLAN](HOUSING_CITY_PLAN.md) | 建築・居住篇H0–H3；H0具體提案／本機證據已簽收，H1隔離靜態比較已簽收；H1b靜態次設計已通過coordinator review；H2的90秒DEV搬運循環及H3評估已通過coordinator review；正式歸屬待人類決定；仮説4只保留概念，本輪不改問卷 |
| [ART](ART.md)／[CITY MASTER TASTE](ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) | 實作美術規則／視覺與世界觀 authority |
| [VALIDATION](VALIDATION.md) | 今日可執行 checks、dated evidence 入口；不複製全部 handoff |
| [BLENDER](BLENDER.md) | 素材 source/export/placement 及每台工作站的 MCP 設定契約 |
| [AGENTS](../AGENTS.md)／[CONTRIBUTING](CONTRIBUTING.md) | Agent 工作規則／Git 與整合流程 |
| [survey guide](../survey/README.md) | v2 server/API/schema7/DEV工具及 legacy 邊界 |
| [module-swap guide](../module-swap/README.md) | standalone／legacy v1 viewer；不是展覽城市 |

新產品決策寫入 SPEC，模組事實寫入 PROJECT，驗證方法寫入 VALIDATION；各任務的日期／commit／證據留在自己的 handoff。不要向歷史計劃追加新方向。

## 企劃組提案（參考，非 authority）

| 文件 | 狀態 |
| --- | --- |
| [PROPOSAL_JA](PROPOSAL_JA.md)／[PDF](PROPOSAL_JA.pdf) | 舊企劃書：現行 4 問／4 Meter 展覽嘅日文說明 |
| [QUESTION_CANDIDATES_JA](QUESTION_CANDIDATES_JA.md) | 舊提案（4 參數版）嘅 9 個追加質問候補（2026-10-09）；1／4／5 對應 `publicSharing`／`automation`／`environmentalPriority`，其餘係新參數 |
| [planning-team](planning-team/README.md) | 2026-11-06 新提案：アンケート Ver.2（9 題）、交通・社會仮説、27 案圖像 prompt；可能同舊提案矛盾，並列作對比 |

## 完成記錄與歷史

| 文件 | 狀態 |
| --- | --- |
| [ODAIBA_VENUE_TRANSITION](history/ODAIBA_VENUE_TRANSITION.md) | 換場 P0–P5 已整合；P6/S5 仍待展覽驗收；原估計不是現行 runtime |
| [Shibuya Plan 01](SHIBUYA.md)／[Plan 02](history/SHIBUYA_PLAN02.md)／[Art](history/SHIBUYA_ART.md) | 已結束歷史；未完成項目不再推進 |
| [Original MVP](history/EXHIBITION_MVP.md) | 原始規劃及 dated updates；由現行 SPEC 取代 |
| [Implementation snapshot](history/PROJECT_2026-10-02.md)／[Validation snapshot](history/VALIDATION_2026-10-02.md) | 保留舊 deep links／證據，不作現行規則 |
| [City master taste 2026-11-02 前版](history/CITY_MASTER_TASTE_2026-11-02.md) | 「克制、合理」版 taste 及 hologram／hero amendments；由現行 taste 取代 |
| [Survey original log](../survey/docs/log/survey-state-mvp.md) | schema1 原製作記錄；repo import 狀態見相關 handoff |

## 任務 handoffs

2026-10-13：交接目錄分開 [現行任務](handoffs/README.md) 與 [已完成／已取代的歸檔](handoffs/archive/README.md)。現行保留台場素材、P6/S5、延後視覺polish、LAN 雙站、居民P5實機驗收及 [回顧章節](handoffs/day-replay.md)；其餘50份交接保留原日期／commit／證據，舊下一步不重新建立任務。2026-11-05：再歸檔21份已完成交接（歸檔共74份），換場計劃移入 `history/`。新任務用 [TEMPLATE](handoffs/TEMPLATE.md)。

## Repository skill

[Dream Loop 介紹](../.agents/skills/dream-loop/README.md)及[skill 入口](../.agents/skills/dream-loop/SKILL.md)是獨立工具指引，不是產品規格。[近鏡打磨 skill](../.agents/skills/closeup-polish/SKILL.md)（2026-11-01，由 SE 樣板整理）記錄 Opus 規格／Sonnet 實作／owner 驗收嘅流程同教訓；[長時間打磨 skill](../.agents/skills/long-polish-loop/SKILL.md)（2026-11-03，由 city-taste-v2 通宵流程嘅教訓整理）規定逐部份 rubric、owner 校準、盲審 judge、用盡時間預算同每輪近鏡回歸檢查。[新建築放置 skill](../.agents/skills/place-building/SKILL.md)（2026-11-13，由 SW 活動モジュール棚整理）規定由 owner 圖片到 Meter 角色、`SCAN_LOT` 選址、補齊狀態目標圖，再由 owner 逐輪驗收、每輪開新 session；各 skill 的分工見 [AGENTS.md](../AGENTS.md) 的 Visual skills 一行。8 個 `blender-*` skill（2026-11-05，由 EL4CTEO/blender-skills 揀選，見 [BLENDER](BLENDER.md#agent-skills-2026-11-05)）負責建模／UV／烘焙／GLB 匯出／QA。Claude 經 `.claude/skills/<名>` 本機 symlink 讀取（`.claude/` 唔入 Git）。本次文件整理沒有執行其生成／實作流程。

2026-11-12：[polish-ladder](../.agents/skills/polish-ladder/SKILL.md) 揀下一個變化單位並按兩級（建築／變化 → 人物情景）推進；[resident-scene](../.agents/skills/resident-scene/SKILL.md) 係第二級嘅流程同湊樣板嘅教訓。
