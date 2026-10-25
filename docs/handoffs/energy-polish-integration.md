# Energy polish publication and integration — 2026-10-25

- Owner：Codex（本次整合 chat）。使用者明確要求 push energy-polish、merge main、再安全刪除相關分支；這項新授權取代先前批次的本機-only／禁止push限制。
- Status：FEATURE_VALIDATED_AND_PUSHED；main整合／整合後驗證／main CI／刪分支待完成，完成後在本檔追加實際結果。
- Task clone：`/Users/fatboy/city2127-energy-polish`；branch `codex/energy-city-polish`。
- Starting HEAD／feature browser checked commit：`852561348e2c6a61ba64325067386ff951135da7`；runtime source commit `333e984f1a4bb315238aa6d8baeded797c659fc6`，SHA256 `01987a48101b59559709dc2ce5461ec51617f0a73a06803e45c50354612556f3`。
- Fresh origin/main：`db772bb2248aed345468d6b07fc011d518f7c7b2`；feature ahead14／behind0，最初無remote counterpart，乾淨working tree。提權fetch成功；一次非提權網絡查詢DNS失敗未作為remote freshness證據。feature已成功首次push，遠端同8525613。
- 原checkout `/Users/fatboy/city2127`：main `29d12db`，behind32；13個未追蹤`.playwright-cli/` YAML保留，不stash／discard。整合在乾淨task clone進行；ignored checkpoints、bundles、archives及source evidence不刪除。

## Scope and review

只整合既有14個commit與今次驗證／交接。Runtime diff只有`src/energyPrototype.ts`，測試為`tests/energyPrototype.test.ts`及`tests/energyE4.browser.mjs`，另有模型恢復／視覺證據與同步文件。沒有新runtime修改、dependency、服務、部署、binary model替換或產品方向變更。Task clone沒有`.codegraph/`，未索引。

已核對完整task diff、runtime source與tests，包含共享水面材質／絕對時間UV、既有工廠與固定轉子／承托包絡；formal runner只在reduced context載入前釋放舊renderer並恢復原頁。309個既有改動文件local links通過；receiver199份SHA256全部一致。新歷史833個blob共939,305,298 bytes，無單檔超100MiB；大部分是已保存的原PNG／provenance，不重寫或裁掉歷史。

## Feature verification

Node26.0.0，root `npm test`、`npm run build`、`git diff --check origin/main...HEAD`全部PASS；49 batches、30.50m gap、21,595船體、108權威配置、324情境／170,775 exact checks及E5統計self-check。Build保留既有>500kB warning。Survey只build供scratch fixture；survey/module-swap source未變，未另跑其本機suite，main CI仍需涵蓋三包。

原`tests/energyE4.browser.mjs` PASS：Chrome156.0.8078.47 headless、1920×1080 DPR1／default、Guest1280×900、hour12／18.5／22，真實scratch schema7→8歷史／原文／ID／草稿、Q3/review、pre/post-commit同ID retry、維持／一庭實際結果、Undo、mixed snapshot、TCP重連、native reduced-motion、普通resize1440×900、reset及舊ID恢復。Exceptions0，只有runner允許的favicon404／obsolete409／注入abort。日夜mixed原圖另已目視核對，保留既有夜間環可讀性限制，不作新藝術達標或FPS宣稱。

[Browser metadata](../../artifacts/energy-city-polish/main-integration-20261025/browser.json)、[feature tests](../../artifacts/energy-city-polish/main-integration-20261025/feature-test.log)、[feature build](../../artifacts/energy-city-polish/main-integration-20261025/feature-build.log)、[browser log](../../artifacts/energy-city-polish/main-integration-20261025/feature-browser.log)、[day](../../artifacts/energy-city-polish/main-integration-20261025/mixed-12.png)／[dusk](../../artifacts/energy-city-polish/main-integration-20261025/mixed-18.5.png)／[night](../../artifacts/energy-city-polish/main-integration-20261025/mixed-22.png)。未改原有證據。

## Remaining limits and next step

保留已拒絕的夜間材質trial，runtime維持accepted baseline。水庭／島最新近景review支持收尾；生成target逐pixel、工程可行性、新FPS／長跑、展覽硬件／Safari／iPad／Windows／真人理解不屬本次驗證。

下一步：fresh fetch，乾淨main fast-forward到origin/main，`--no-ff`合併；重跑整合root test/build／formal browser及whitespace，記錄merge commit；確認main祖先與push、main CI通過後，僅刪除已整合`codex/energy-city-polish`本機／遠端ref。保留clone及其ignored備份，更新原checkout main時保留未追蹤檔。自己的Vite5194完成後停止；scratch/browser由runner finally清理。
