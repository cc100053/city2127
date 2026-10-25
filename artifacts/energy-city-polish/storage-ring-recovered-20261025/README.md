# Storage ring recovered batch — 2026-10-25

三輪本機實作／驗收完成，等待總指揮視覺review。原 [target](target.png)／[prompt](target-prompt.txt) 保留，沒有生成新目標。只續作富士環／原固定承托；環外source逐byte保留。

| 輪次 | 本機checkpoint | 新證據 |
| --- | --- | --- |
| 1（恢復） | `093acddfc03a9b5e390a902e55f34bcf96f208f1` | [review](pass1/review.md)、[DEV JSON](pass1/dev/browser.json)、[formal JSON](pass1/formal/browser.json) |
| 2（原候選） | `af619092d233f5f4db6c0fabb5487110031af270` | [review](pass2/review.md)、[DEV JSON](pass2/dev/browser.json)、[formal JSON](pass2/formal/browser.json) |
| 3（fresh worker） | `cd6c6e65466df8c4cee070b25c475018f92162a8` | [review](pass3/review.md)、[DEV JSON](pass3/dev/browser.json)、[formal JSON](pass3/formal/browser.json) |

每輪27張1920×1080 DEV原PNG及12張正式原PNG、source／當時runner／raw test-build logs／SHA256SUMS均保留；Guest圖為1280×900。所有失敗attempt另存，不算PASS。第三輪使用真正same-chat fresh-context gpt-6-astra/low worker，owner驗收；不開第4輪。

DEV重跑：`node artifacts/energy-city-polish/storage-ring-recovered-20261025/review.browser.mjs <新目錄>`；正式runner沿用tests/energyE4.browser.mjs與VALIDATION的scratch設定。原assertions／quality／30與45秒門檻不變，只避開兩個City renderer重疊；詳細失敗與修正見pass2/harness-scheduling.md。

本機持久 `checkpoints/`（Git忽略，避免bundle自我遞迴）含逐輪完整branch bundle、evidence tar.gz、verify文字及JSON的commit／SHA；不是舊base-only bundle。`pass3.json`記最終HEAD與verify結果。原恢復patch逐byte archive見energy-polish-recovery-20261025/PATCH_ARCHIVE.md。

全部服務已清理。只有本機commits，沒有push／部署／main整合。未測新FPS／其他平台／展覽硬件／工程／連續閃爍；target達成待總指揮審美review。
