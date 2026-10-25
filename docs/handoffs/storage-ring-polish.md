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

- 封存修正：首個本機commit3d21e11含原patch context空白，未過artifact whitespace；下一個修正commit將verbatim patch收入raw-patches.tar.gz（原工作檔保留），再跑完整base diff check。沒有改source／target／test門檻。

## 第一輪本次checkpoint

- 完整gate及新browser PASS，source5255520；checkpoint `093acddfc03a9b5e390a902e55f34bcf96f208f1`（含artifact格式修正）。
- `checkpoints/pass1.bundle` verify PASS，`pass1-evidence.tar.gz`全部首輪checksum／source解讀PASS；完整SHA見`checkpoints/pass1.json`。不是base-only bundle。
- Vite5187已關閉，兩組browser／scratch服務已清理。第二輪現在套用原候選47cf4d5，只改環／原固定承托；未驗前不沿用首輪結論。

## 第二輪候選驗收

- Source47cf4d5原候選已完成新root test/build/diff、DEV27原圖及正式scratch browser PASS；47 batches，108權威及324／170424幾何檢查，環外source逐byte不變。
- 原runner新增reduced頁30秒timeout再次出現。只修正tests/energyE4.browser.mjs renderer生命週期：舊City暫時about:blank、reduced結束恢復原hour22並model(view)。原assertions／品質／timeout全部保留，修改後完整root gate及browser PASS；失敗原版另存。
- 新證據pass2/；native static PNG一致，live22.75→28.61秒；服務／scratch已清理。現在封存本機checkpoint／verify bundle，之後才開第三輪fresh strongest/lowest worker；沒有其他worker。
