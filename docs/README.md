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
| [ART](ART.md)／[CITY MASTER TASTE](ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) | 實作美術規則／視覺與世界觀 authority |
| [VALIDATION](VALIDATION.md) | 今日可執行 checks、dated evidence 入口；不複製全部 handoff |
| [BLENDER](BLENDER.md) | 素材 source/export/placement 及每台工作站的 MCP 設定契約 |
| [AGENTS](../AGENTS.md)／[CONTRIBUTING](CONTRIBUTING.md) | Agent 工作規則／Git 與整合流程 |
| [survey guide](../survey/README.md) | v2 server/API/schema7/DEV工具及 legacy 邊界 |
| [module-swap guide](../module-swap/README.md) | standalone／legacy v1 viewer；不是展覽城市 |

新產品決策寫入 SPEC，模組事實寫入 PROJECT，驗證方法寫入 VALIDATION；各任務的日期／commit／證據留在自己的 handoff。不要向歷史計劃追加新方向。

## 完成記錄與歷史

| 文件 | 狀態 |
| --- | --- |
| [ODAIBA_VENUE_TRANSITION](ODAIBA_VENUE_TRANSITION.md) | 換場 P0–P5 已整合；P6/S5 仍待展覽驗收；原估計不是現行 runtime |
| [Shibuya Plan 01](SHIBUYA.md)／[Plan 02](history/SHIBUYA_PLAN02.md)／[Art](history/SHIBUYA_ART.md) | 已結束歷史；未完成項目不再推進 |
| [Original MVP](history/EXHIBITION_MVP.md) | 原始規劃及 dated updates；由現行 SPEC 取代 |
| [Implementation snapshot](history/PROJECT_2026-10-02.md)／[Validation snapshot](history/VALIDATION_2026-10-02.md) | 保留舊 deep links／證據，不作現行規則 |
| [Survey original log](../survey/docs/log/survey-state-mvp.md) | schema1 原製作記錄；repo import 狀態見相關 handoff |

## 任務 handoffs

2026-10-03：交接目錄已分開 [現行任務](handoffs/README.md) 與 [已完成／已取代的歸檔](handoffs/archive/README.md)。現行保留台場素材、P6/S5、延後視覺polish及居民P5實機驗收；其餘39份交接保留原日期／commit／證據，舊下一步不重新建立任務。新任務用 [TEMPLATE](handoffs/TEMPLATE.md)。

## Repository skill

[Dream Loop 介紹](../.agents/skills/dream-loop/README.md)及[skill 入口](../.agents/skills/dream-loop/SKILL.md)是獨立工具指引，不是產品規格。本次文件整理沒有執行其生成／實作流程。
