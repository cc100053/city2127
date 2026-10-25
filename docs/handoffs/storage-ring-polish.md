# 富士前置儲能環／固定承托 — 三輪恢復續作

> 2026-10-25 最新發布／整合狀態見 [energy polish integration](energy-polish-integration.md)；以下本機-only／NOT PUSHED及review限制是先前批次的歷史狀態，今次使用者另已明確授權發布。

- Owner：batch chat `01a1707d-71bd-7b13-b8d7-1cae4bc24037`；總指揮 `01a16c95-84d1-7fe2-a365-42e343514498`。
- Status：WAITING_FOR_REVIEW；三輪實作與本機驗收完成，不開第4輪／其他設備。
- Clone `/Users/fatboy/city2127-energy-polish`；branch `codex/energy-city-polish`；base `db772bb2248aed345468d6b07fc011d518f7c7b2`。
- Last verified source commit：`cd6c6e65466df8c4cee070b25c475018f92162a8`；之後只有驗收metadata／文件，runtime未改。最終bundle HEAD／hash／verify見本機`artifacts/energy-city-polish/storage-ring-recovered-20261025/checkpoints/pass3.json`。
- Remote availability：NOT PUSHED；禁止push／main整合／deploy／外部設定。沒有main CI可宣稱。

## Preflight與保留範圍

2026-10-25先確認指定clone；起點db772bb，source/tests刻意dirty恢復及recovery資料保留，沒有stash/reset/discard。fresh fetch成功，起點對origin/main0／0，無upstream／remote counterpart。第三輪worker fresh fetch仍main=db772bb、當時ahead3/behind0；不merge。無.codegraph，不索引。原city2127及其他clone未改。

恢復provenance與test限制見 [恢復合約](energy-polish-recovery.md)。原commit objects未找回；新checkpoint不冒充原commit chain。原patch context空白令首個3d21e11的artifact whitespace gate失敗，下一個093acdd將原patch逐byte archive並通過base diff check；原工作檔保留。

## 輪次與證據

| 輪次 | 本機checkpoint | Runtime SHA256 |
| --- | --- | --- |
| 1（恢復） | `093acddfc03a9b5e390a902e55f34bcf96f208f1` | `5255520888c0810717e7aee60917c4703ba255721b67d6a7e9d6960aca4e9627` |
| 2（保存候選驗證） | `af619092d233f5f4db6c0fabb5487110031af270` | `47cf4d5d4887bf88f3e33cbf0a2e78016a35e86b49c22b95e059d2bc2cda7efe` |
| 3（Plus fresh worker） | `cd6c6e65466df8c4cee070b25c475018f92162a8` | `27c1e4f36835267eccc64c9d0c2947203d65dd95b7f37dda90c06dfb6576d9fa` |

[逐輪原圖／review／logs／hash入口](../../artifacts/energy-city-polish/storage-ring-recovered-20261025/README.md)。每輪完整branch bundle及source/target/evidence tar.gz在checkpoints/，逐輪JSON保存實際commit與archive SHA。第一／二輪verify及archive逐檔check PASS；第三輪以pass3.json為最終verify記錄。原target SHA70c988bb…，沒有生成新圖。

## 實際驗收

- 三輪root `npm test`／`npm run build`／完整base diff whitespace PASS，原>500kB chunk warning保留。逐輪48／47／48 batches，最後theatre gap30.50m。全周r29–33／depth±1.5、固定軸承、21595船體／22m航空／泊位／公共／四站視線、108正式權威模型及324 district／170424 exact checks全部通過，沒有放寬tests。
- 三輪Chrome156.0.8078.47 headless／ANGLE Metal Apple M6／WebGL2；City1920×1080 DPR1 default，Guest1280×900。每輪27 DEV新原PNG：hero/detail日12／暮18.5／夜22、B/mixed/baseline、charge/hold/release、live兩點／native static。固定static原PNG每輪均逐byte一致；第三輪live29.15→35.10秒。
- 三輪正式scratch browser PASS：舊歷史／原文／ID、Q3/review、同ID retry、無變化／一庭結果、Undo、混合snapshot、日暮夜、TCP重連、reduced角度固定、普通resize、reset及舊ID恢復；exceptions0，只有預期favicon404／obsolete409／兩次注入abort。
- 原runner在reduced新頁30秒diagnostics載入點可timeout；只讓舊City暫時about:blank釋放renderer，reduced結束恢復hour22並額外model(view)。原assertions／quality／timeout逐byte保留；修改後第二、三輪正式gate PASS。失敗原runner/log/PNG完整保留。
- 第三輪true same-chat fresh empty-context `gpt-6-astra`／low worker，只實作，owner驗收。環外source SHA79777e8d…逐byte不變；水庭／能源島、core/global lighting/hero、權威歷史與3秒retarget／立即snapshot／60秒及static不變。
- 本輪Vite5187已停止且無LISTEN；全部browser／scratch HTTP/WebSocket/SQLite依finally清理，無active實作worker。survey build只作fixture，survey/module-swap source未改、未另跑其suite。

## 未測／下一步

新FPS、連續細節閃爍量化、展覽硬件／Safari／iPad／Windows／真人理解、工程容量／全城連續碰撞／所有late GLB與seed未驗。原target達成仍待總指揮審美review。三輪後停止，唯一writer已交還owner；由總指揮review，未另授權前不開新輪／其他設備／發布。
