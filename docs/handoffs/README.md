# 現行 handoffs

2026-11-05 整理（原 2026-10-03／10-13）。只列仍待接續的任務。產品決策 owner：cc100053；每項保留自己的 owner，修改共用模組或素材前先協調。

| 交接 | 狀態／下一步 | Owner |
| --- | --- | --- |
| [台場素材](odaiba-assets.md) | IN_PROGRESS；素材研究／跨機接續仍開放。Runtime 已使用匯入素材；不要重做舊「未整合」步驟 | cc100053 |
| [台場換場 P6/S5](odaiba-venue.md) | P0–P5已整合；P6/S5展覽驗收未完成，與P5實機表協調 | cc100053 |
| [台場 Dream Loop r2](odaiba-dream-loop-2.md) | 已整合，target未達；視覺polish延後，待owner指定再開新任務分支 | cc100053 |
| [LAN 雙站 iPad](lan-guest-stations.md) | IN_PROGRESS；軟件已整合，單機 station A 經 LAN PASS；雙機／瞓機待第二部裝置 | cc100053 |
| [居民體驗 P5](resident-experience-p5.md) | IN_PROGRESS；文件準備已發布，D0–D10／理解程度／長跑實機NOT RUN。先提供輸出方案及可測硬件 | Codex；展覽決策cc100053，現場操作人待指定 |
| [描畫品質](render-quality.md) | `?quality=low` 已實作；TODO：自動品質調整（按實測 FPS 逐級降低） | cc100053 |
| [回顧章節](day-replay.md) | PLANNED；方向已討論（轉向章節、空檔播、觀眾互動），開工前待owner答6項決定 | cc100053 |
| [變化說明卡](change-explanation.md) | PLANNED（TODO）；右上卡片直接說明「乜嘢變成乜嘢」，未定案前先用參數前後變動 | cc100053 |
| [能源城市](energy-city.md) | E1–E4完成並發布main，CI通過；Q3獨立能源權威配置、舊氣候／歷史與正式browser通過；E5本機Mac mini 30分鐘量測與TCP復原已驗；展覽硬件／訪客待驗 | Codex；產品決策cc100053 |
| [建築・居住](housing-city.md) | SOFTWARE COMPLETE A：owner 2026-10-27選A固定背景，M搬位，已整合main且CI通過；只餘展覽硬件／訪客／工程驗收；[證據](../../artifacts/housing-background/README.md) | Codex；產品決策cc100053 |
| [近鏡打磨](closeup-polish.md) | S0 INTEGRATED，98/98；coordinator接受量度基準，失敗保留；worker 01a17d74；分 S0 基準 → A NE → B SW → C SE → D NW → Z 回歸；驗收同 capture 標準已定，每個 sector 要 owner 睇圖批准先 merge | cc100053 |
| [近鏡推近／先推近後變化](closeup-zoom.md) | INTEGRATED CANDIDATE（2026-10-30 owner 指示 merge）；F／A 視覺硬門檻仍未達 | cc100053；實作Codex |
| [每位Guest近鏡＋明顯變化](guest-agency.md) | G1–G3、G7、G2 候選已 merge main `95c70be`（CI 通過）；G5 文案、G4／G7 視覺與性能 gate、真人兩秒辨認未驗收 | cc100053 |
| [導軌列車](train-closeup-polish.md) | DONE（2026-11-09）；owner 接受 R3 並 merge（目測，未跑 judge；已知差距見 handoff） | cc100053 |
| [街道車輛家族](car-closeup-polish.md) | DONE；owner 接受 R2 並 merge（獨立 judge 8/18，已知差距見 handoff） | cc100053 |
| [空の環 Sky Ring](hero-sky-ring.md) | DONE（2026-11-02）；方案 B 巨構：250 m 桁架環＋六支 V 斜柱＋泊位＋居民聲音燈點；close-up polish owner 接受 R5 | cc100053 |
| [Hero 霧與光層次](hero-atmosphere.md) | IN_PROGRESS（2026-11-02）；R1 高度霧／夜間窗燈層次／夜空地平線，R2 水面燈光倒影，等 owner 目視 | cc100053 |
| [近鏡後續／能源講解](closeup-next.md) | F1/F2、C1 INTEGRATED（C1 owner批准，24組兩秒辨認未做）；N1 能源講解 INTEGRATED（13s／日文），F3等硬件（2026-10-29） | cc100053 |
| [Road audit](road-audit.md) | IN_PROGRESS（2026-11-04）；修路已 merge main，owner 目視驗收同餘下決定未做 | cc100053 |
| [SE +1 Blender 塔](se-high-blender.md) | MERGED R3（2026-11-06，owner 叫停）；9/12 對目標，`fh-frame`／`fh-crown`／`fh-lift` 未到 2，夜間 hero FPS 53–57 待查 | cc100053 |
| [一票旅程落點](journey-landing.md) | DONE（實作）；光點落喺變化格，owner 目視驗收未做 | cc100053 |
| [居民情景：湊](resident-minato.md) | IN_PROGRESS（2026-11-12）；NW focal 三個狀態、四種轉變嘅 DEV 演示已 merge（`?residentDemo`）；演技／口形、FPS、三種中斷同正式接入未做 | cc100053 |
| [素材庫](asset-library.md) | IN_PROGRESS（2026-11-13）；`asset/models/LIBRARY.md` 索引＋`modules.py`＋索引測試已做；SE 模組 draft，等 owner 睇 lineup；SE 分支整合時要改用 modules | cc100053 |
| [CI 時間餘量](ci-headroom.md) | DONE（2026-11-10）；`odaiba.test.ts` 街車淨空檢查改用分格 raycast，245 s → 45 s，檢查內容不變 | cc100053 |

已完成或不再適用的74份交接及Meter截圖見 [歸檔索引](archive/README.md)。歷史下一步不會自動變成backlog；Shibuya不再開發。人類美術review／實機未測等限制保留，不因歸檔而結案。

新交接沿用 [TEMPLATE](TEMPLATE.md)。完成後歸檔並修正連結；任務日期／commit／實際驗證仍留在各自文件。現行入口：[文件索引](../README.md)、[SPEC](../EXHIBITION_SPEC.md)、[PROJECT](../PROJECT.md)、[VALIDATION](../VALIDATION.md)。

- [Sky Ring Blender close-up polish](skyring-closeup-polish.md) — R1 candidate, owner calibration and clearance checks pending.
