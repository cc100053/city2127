# closeup-next F1/F2 — 2026-10-29

Owner：Codex worker `01a1857c-e75a-7571-b8af-59b218b9b0aa`。Baseline：`e69874dbca243674590ee87d60b03cffcd37379d`，independent clone `fix/energy-e4-headline`。本批只修正式E4 fixture；[handoff](../../../docs/handoffs/closeup-next.md)記錄發布／整合／CI。

`tests/energyE4.browser.mjs` 只搬已接受S0 helper和兩個imports，再改兩處wait。[exact-scope.json](exact-scope.json)證明其餘runner逐byte不變。Fixture SHA256：`77b835afe0f5ad70f7af8f72a4c01c1df4eb65289a4b1b00520f78f881adb78a`。[headline-selfcheck.mjs](headline-selfcheck.mjs)驗Meter偏好／configuration、兩種能源fallback及錯配拒絕；真browser首份Meter、第二份能源。

Local checks：root [test](root-test.log)／[build](root-build.log)、[survey build](survey-build.log)、helper self-check及whitespace全部PASS。首次npmci的sandbox DNS／cache失敗logs保留；root／survey權限重試成功。Build保留既有JSON import attributes／>500kB警告；npm audit既有1 high，無依賴變更。

Formal [browser.json](browser.json)／[browser.log](browser.log)：macOS27.0.1、headless installed Google Chrome156.0.8078.73、City1920×1080／DPR1／default、Guest1280×900、hour12／18.5／22。原scratch schema7→8／Q3／same-ID retry／實際能源／Undo／混合snapshot／TCP重連／reduced motion／resize／reset矩陣全PASS，exceptions0，只有預期favicon404／obsolete409／兩次注入abort。12張原圖，未覆寫舊證據；已目視Q3、兩張結果、mixed22、reduced motion、reset。

| Evidence | Original |
| --- | --- |
| 舊氣候／目前Q3／核對 | [inherited](inherited-climate.png) · [Q3](q3-current.png) · [review](review-current.png) |
| 首份能源0庭／第二份1庭 | [Meter headline](recorded-no-change.png) · [energy result](live-one-garden-result.png) · [settled](one-garden-settled.png) |
| Undo／混合日暮夜 | [Undo](undo-restored.png) · [12](mixed-12.png) · [18.5](mixed-18.5.png) · [22](mixed-22.png) |
| 靜態／reset | [reduced motion](mixed-reduced-motion.png) · [reset](reset-baseline.png) |

[F2 facts](f2-facts.json)：住宅A／production、handoffs index／53 archives、E5 db772bb main／CI40069808324 success、headline-camera artifact source全吻合，四份文件無需修改。

重跑（先root／survey npmci及survey build；root Vite喺空閒5191）：

```sh
node artifacts/closeup-next/F1/headline-selfcheck.mjs
CITY2127_PLAYWRIGHT_PATH=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs CITY2127_CITY_URL=http://127.0.0.1:5191 CITY2127_EVIDENCE_DIR=artifacts/closeup-next/F1-rerun CITY2127_CHECKED_COMMIT="$(git rev-parse HEAD)" node tests/energyE4.browser.mjs
```

Owned Vite5191／scratch57086／Chrome已停止，ports無listener。11s／16s fixture clock jumps只跳過舊閱讀及seed／Undo等待，actor實時；原runner未鎖hero，唔係canonical performance或C1美術證據。未量FPS／展覽硬件／Safari／iPad／Windows／訪客理解，survey／module-swap獨立suite未跑（source無改）；C1／N1 pending，owner art gate保留。
