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
| [建築・居住](housing-city.md) | SOFTWARE COMPLETE A：owner 2026-10-27選A固定背景，M搬位，已整合main且CI通過；只餘展覽硬件／訪客／工程驗收；[證據](../../artifacts/housing-background/README.md) | Codex；產品決策cc100053 |
| [Headline 近鏡](headline-camera.md) | DONE；owner已批准並merge/push main；整合root／production smoke及實際main CI通過；feature分支保留 | cc100053；Codex worker |
| [近鏡打磨](closeup-polish.md) | S0 INTEGRATED，98/98；coordinator接受量度基準，失敗保留；worker 01a17d74；分 S0 基準 → A NE → B SW → C SE → D NW → Z 回歸；驗收同 capture 標準已定，每個 sector 要 owner 睇圖批准先 merge | cc100053 |
| [分級階梯＋headline](meter-ladder.md) | DONE；±3格、每份提案最多一格、headline已merge入main `0b84a29`，main CI通過；headline camera另開任務 | cc100053；實作Claude |
| [儲能環 polish](storage-ring-polish.md) | 已整合main，實際main CI通過，本機／遠端task分支已安全刪除；[整合交接](energy-polish-integration.md)，原審美／硬件限制保留 | Codex batch owner |
| [近鏡推近／先推近後變化](closeup-zoom.md) | INTEGRATED CANDIDATE（2026-10-30 owner 指示 merge）；F／A 視覺硬門檻仍未達 | cc100053；實作Codex |
| [每位Guest近鏡＋明顯變化](guest-agency.md) | G1–G3、G7、G2 候選已 merge main `95c70be`（CI 通過）；G5 文案、G4／G7 視覺與性能 gate、真人兩秒辨認未驗收 | cc100053 |
| [SE 集約近鏡樣板](se-closeup-polish.md) | DONE（2026-11-01）；owner 接受 R4，暫不套用 SW／NW | cc100053 |
| [Hero 未來感](hero-futurism.md) | DONE（2026-11-01）；c2 低 hero、天空反射物料、航道光痕，owner 接受 R1＋R2 | cc100053 |
| [Hero 塔樓＋交通](hero-towers-traffic.md) | DONE（2026-11-02）；前景 4 座開放巨框塔、天空光帶走廊、渡輪，owner 接受 R2 | cc100053 |
| [空の環 Sky Ring](hero-sky-ring.md) | DONE（2026-11-02）；方案 B 巨構：250 m 桁架環＋六支 V 斜柱＋泊位＋居民聲音燈點；close-up polish owner 接受 R5 | cc100053 |
| [Hero holograms](hero-holograms.md) | DONE（2026-11-02）；8 塊居民尺度 hologram（Fuji TV 地標屏、站前、空氣、live 住民の声、天橋 tag），owner 接受 R5 | cc100053 |
| [Guest explore 空の環を見る](guest-explore.md) | DONE（2026-11-02）；iPad 揀 Sky Ring → 大畫面泊位近景＋全環聲音；side 鏡頭、20 s 撳掣，owner 接受；升降機 LOD 後續 | cc100053 |
| [Elevator close-up LOD](elevator-closeup-lod.md) | IN_PROGRESS（2026-11-02）；升降機中距離近景＋iPad 第二粒掣；鏡位 E1 已揀，下一步 Gemini 目標圖 | cc100053 |
| [遠景軌道升降機](far-landmark.md) | DONE（2026-11-02）；約 7.5 km 外霧中剪影：幼主柱＋三層中轉站＋分節纜線，Gemini 目標圖 closeup-polish，owner 接受 R6 | cc100053 |
| [Hero 霧與光層次](hero-atmosphere.md) | IN_PROGRESS（2026-11-02）；R1 高度霧／夜間窗燈層次／夜空地平線，R2 水面燈光倒影，等 owner 目視 | cc100053 |
| [近鏡後續／能源講解](closeup-next.md) | F1/F2、C1 INTEGRATED（C1 owner批准，24組兩秒辨認未做）；N1 能源講解 INTEGRATED（13s／日文），F3等硬件（2026-10-29） | cc100053 |

已完成或不再適用的53份交接及Meter截圖見 [歸檔索引](archive/README.md)。歷史下一步不會自動變成backlog；Shibuya不再開發。人類美術review／實機未測等限制保留，不因歸檔而結案。

新交接沿用 [TEMPLATE](TEMPLATE.md)。完成後歸檔並修正連結；任務日期／commit／實際驗證仍留在各自文件。現行入口：[文件索引](../README.md)、[SPEC](../EXHIBITION_SPEC.md)、[PROJECT](../PROJECT.md)、[VALIDATION](../VALIDATION.md)。

- [Guest agency](guest-agency.md)：G1–G3、G7 與 G2 候選已 merge（2026-11-01）；G5 文案、視覺／性能 gate 與 owner 一人在家的兩秒辨認待續，不視為驗收。
