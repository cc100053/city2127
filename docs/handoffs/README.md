# 現行 handoffs

2026-10-13 整理（原 2026-10-03，Codex）。只列仍待接續的任務。產品決策 owner：cc100053；每項保留自己的 owner，修改共用模組或素材前先協調。

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
| [建築・居住](housing-city.md) | H0提案／基準與候選原圖已簽收；H1隔離靜態比較已簽收；H1b靜態次設計、H2動態及H3評估已通過coordinator review；DEV-only已整合main且CI通過，正式歸屬待人類決定；[證據](../../artifacts/housing-city-h0/README.md) | Codex；產品決策cc100053 |
| [Headline 近鏡](headline-camera.md) | DONE；owner已批准並merge/push main；整合root／production smoke及實際main CI通過；feature分支保留 | cc100053；Codex worker |
| [近鏡打磨](closeup-polish.md) | S0 INTEGRATED，98/98；A REVIEW_READY（worker 01a17e2a），三輪各24狀態，A3/A4及V失敗見報告，root/live PASS；失敗保留；分 S0 基準 → A NE → B SW → C SE → D NW → Z 回歸；驗收同 capture 標準已定，每個 sector 要 owner 睇圖批准先 merge | cc100053 |
| [分級階梯＋headline](meter-ladder.md) | DONE；±3格、每份提案最多一格、headline已merge入main `0b84a29`，main CI通過；headline camera另開任務 | cc100053；實作Claude |
| [儲能環 polish](storage-ring-polish.md) | 已整合main，實際main CI通過，本機／遠端task分支已安全刪除；[整合交接](energy-polish-integration.md)，原審美／硬件限制保留 | Codex batch owner |

已完成或不再適用的50份交接及Meter截圖見 [歸檔索引](archive/README.md)。歷史下一步不會自動變成backlog；Shibuya不再開發。人類美術review／實機未測等限制保留，不因歸檔而結案。

新交接沿用 [TEMPLATE](TEMPLATE.md)。完成後歸檔並修正連結；任務日期／commit／實際驗證仍留在各自文件。現行入口：[文件索引](../README.md)、[SPEC](../EXHIBITION_SPEC.md)、[PROJECT](../PROJECT.md)、[VALIDATION](../VALIDATION.md)。
