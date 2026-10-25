# 富士前置儲能環／固定承托 — 恢復續作

- Owner：本 batch chat `01a1707d-71bd-7b13-b8d7-1cae4bc24037`；總指揮 `01a16c95-84d1-7fe2-a365-42e343514498`。
- Status：IN_PROGRESS，僅儲能環三輪批次；不重開其他設備或 E3／E4 功能。
- Clone：`/Users/fatboy/city2127-energy-polish`；branch `codex/energy-city-polish`；base／session HEAD `db772bb2248aed345468d6b07fc011d518f7c7b2`。
- 2026-10-25 fresh fetch 成功，HEAD 對 origin/main 0／0；沒有 remote counterpart／upstream，沒有 merge。原 source/tests dirty 恢復及 recovery artifacts 原樣保留；沒有 stash/reset/discard。無 `.codegraph/`，不索引。
- 恢復合約：[energy-polish-recovery](energy-polish-recovery.md)。原 commit objects 未找回，不能宣稱還原歷史 commit chain；test provenance 限制沿用。
- 首輪 runtime SHA256 `5255520888c0810717e7aee60917c4703ba255721b67d6a7e9d6960aca4e9627`。第二輪候選 `47cf4d5d4887bf88f3e33cbf0a2e78016a35e86b49c22b95e059d2bc2cda7efe` 目前未套用。
- 範圍：`energyPrototype` 環 block → `devEnergy`／`EnergyRuntime`／`createCityChangeManager`／main；原幾何／108 pipeline／324 district tests；相關文件及新實測 evidence。不改 authority／core／global lighting／hero／依賴／其他 package source。
- 原 target／prompt 沿用，逐 byte copy；新證據根目錄 [storage-ring-recovered-20261025](../../artifacts/energy-city-polish/storage-ring-recovered-20261025/)。新 runner 保存完整 PNG、URL、時間、source hash、GPU 與 console/network；`protect.py` 逐 byte 比較環以外 source。
- Last verified：首輪恢復 dirty tree；本次 root test/build/diff及完整DEV27圖／正式browser重跑PASS，詳pass1/review.md。首次browser失敗保留，沒有放寬測試。
- 原半徑29–33／depth±1.5、位置／60秒／static、劇場／工作翼／斜街、四題歷史／3秒retarget／立即snapshot均需保留；不放寬 tests。
- Remote availability：NOT PUSHED。只本機 Conventional Commits／bundle；禁止 push／main整合／deploy／外部設定。
- Next：首輪新browser／root gate已過且服務清理；封存本機checkpoint及verify bundle後驗第二輪候選，通過完整gate及備份後才按Plus流程開第三輪fresh-context worker。三輪後等待總指揮review。
- 未測：新FPS、展覽硬件／iPad／Safari／Windows／工程可行性；survey／module-swap source未改，不另跑其suite。survey build只作 scratch browser fixture。
