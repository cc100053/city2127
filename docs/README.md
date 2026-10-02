# 文件索引 — Odaiba 2127

2026-10-02 整理。**現行場地只有台場；Shibuya 已結束，未來不再開發。** 歷史中的未完成項目不再當 backlog。Owner：cc100053；索引維護：任務文件 owner。

## 現行入口

| 文件 | 唯一主要責任 |
| --- | --- |
| [README 繁中](../README.md)／[English](../README.en.md)／[日本語](../README.ja.md) | 本機／LAN 啟動及展覽操作 |
| [EXHIBITION_SPEC](EXHIBITION_SPEC.md) | 場地、產品契約、累積／變化、當前決策及尚待驗收事項 |
| [PROJECT](PROJECT.md) | 現行模組、source/data/render flow、資源 lifecycle |
| [RESIDENT_COPY](RESIDENT_COPY.md) | P1 日文居民文案與接入條件；文案完成，runtime 尚未接入 |
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

標題／metadata 記錄各階段責任，不能單憑舊「下一步」重開任務。Shibuya 名稱只表示歷史來源；現行開發以 SPEC 為準。每 task 保留一份，不合成巨大交接。

| Task | 題目 |
| --- | --- |
| [TEMPLATE](handoffs/TEMPLATE.md) | <Task ID> — <Title> |
| [admin-day-night](handoffs/admin-day-night.md) | admin-day-night — Admin city lighting control |
| [admin-japanese](handoffs/admin-japanese.md) | admin-japanese — Japanese admin UI |
| [admin-undo](handoffs/admin-undo.md) | admin-undo — Staff-only latest-proposal Undo |
| [art-direction](handoffs/art-direction.md) | art-direction — Art rules and a polished pilot area for the root Shibuya scene |
| [automation-hub-upper-glb](handoffs/automation-hub-upper-glb.md) | automation-hub-upper — Stage 3 GLB site layer |
| [blender-shibuya-pipeline](handoffs/blender-shibuya-pipeline.md) | Blender to Shibuya import channel |
| [causal-city-mvp](handoffs/causal-city-mvp.md) | causal-city-mvp — Causal choice → policy → city change MVP |
| [city-module-swap](handoffs/city-module-swap.md) | city-module-swap — Modular ground, lot and building swap package |
| [docs-sync-post-mvp](handoffs/docs-sync-post-mvp.md) | docs-sync-post-mvp — Post-MVP documentation sync and package CI |
| [exhibition-lifecycle](handoffs/exhibition-lifecycle.md) | exhibition-lifecycle — City lifecycle and admin reset workflow |
| [exhibition-mvp-plan](handoffs/exhibition-mvp-plan.md) | exhibition-mvp-plan — 2127 baseline and agent implementation specification |
| [exhibition-s1](handoffs/exhibition-s1.md) | exhibition-s1 — four-question server and compatibility gate |
| [exhibition-s2](handoffs/exhibition-s2.md) | exhibition-s2 — Q3 climate vertical slice |
| [exhibition-s3](handoffs/exhibition-s3.md) | exhibition-s3 — remaining root site mappings |
| [exhibition-s4](handoffs/exhibition-s4.md) | Exhibition S4 — guest UI and root feedback |
| [future-tree-2127](handoffs/future-tree-2127.md) | Future tree 2127 |
| [meter-variety](handoffs/meter-variety.md) | meter-variety — Readable, district-wide Meter changes |
| [night-lighting](handoffs/night-lighting.md) | night-lighting — Readable futuristic night city |
| [odaiba-art-direction-01](handoffs/odaiba-art-direction-01.md) | Odaiba art direction 01 — Fuji civic chassis |
| [odaiba-assets](handoffs/odaiba-assets.md) | odaiba-assets - Odaiba Plan building asset stage |
| [odaiba-district](handoffs/odaiba-district.md) | Odaiba hero district — 2026-09-30 |
| [odaiba-docs-consolidation](handoffs/odaiba-docs-consolidation.md) | odaiba-docs-consolidation — current Odaiba documents and closed Shibuya history |
| [odaiba-dream-loop-2](handoffs/odaiba-dream-loop-2.md) | Odaiba Dream Loop r2 — 2026-10-01 |
| [odaiba-dream-loop](handoffs/odaiba-dream-loop.md) | Odaiba Dream Loop — 2026-09-30 |
| [odaiba-venue](handoffs/odaiba-venue.md) | odaiba-venue — Odaiba replaces Shibuya as the exhibition city |
| [readme-localization](handoffs/readme-localization.md) | readme-localization — Three-language exhibition startup guide |
| [resident-copy-p1](handoffs/resident-copy-p1.md) | resident-copy-p1 — Resident narrative and Japanese exhibition copy |
| [remove-guest-exit-lock](handoffs/remove-guest-exit-lock.md) | remove-guest-exit-lock — Automatic next-guest handoff |
| [root-causal-panel](handoffs/root-causal-panel.md) | root-causal-panel — Causal panel in the root Shibuya survey mode (step 3) |
| [root-survey-atmosphere](handoffs/root-survey-atmosphere.md) | root-survey-atmosphere — Survey drives the root Shibuya scene (steps 1–2) |
| [shibuya-change-manager](handoffs/shibuya-change-manager.md) | shibuya-change-manager — Data-driven root-scene change sites, Stage 1 |
| [shibuya-site-assets](handoffs/shibuya-site-assets.md) | shibuya-site-assets — Hybrid site asset boundary, Stage 2 |
| [stage2-ci](handoffs/stage2-ci.md) | Stage 2 — Minimal CI |
| [stage3-blender-standards](handoffs/stage3-blender-standards.md) | Stage 3 — Blender export and optimization standards |
| [survey-auto-tests](handoffs/survey-auto-tests.md) | Survey tests and development auto-answer |
| [survey-state-mvp](handoffs/survey-state-mvp.md) | survey-state-mvp — Questionnaire state accumulation MVP |
| [two-guest-devices-docs](handoffs/two-guest-devices-docs.md) | two-guest-devices-docs — Complete A/B documentation sync |
| [two-guest-devices](handoffs/two-guest-devices.md) | two-guest-devices — Concurrent A/B Guest stations |

## Repository skill

[Dream Loop 介紹](../.agents/skills/dream-loop/README.md)及[skill 入口](../.agents/skills/dream-loop/SKILL.md)是獨立工具指引，不是產品規格。本次文件整理沒有執行其生成／實作流程。
