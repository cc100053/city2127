# Energy polish publication and integration — 2026-10-25

- Owner：Codex（本次整合 chat）。使用者明確要求 push energy-polish、merge main、再安全刪除相關分支；這項新授權取代先前批次的本機-only／禁止push限制。
- Status：COMPLETE；main已發布、整合後驗證及main CI全部PASS，相關本機／遠端分支已安全刪除。
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

原定整合步驟（已按下節完成）：fresh fetch，乾淨main fast-forward到origin/main，`--no-ff`合併；重跑整合root test/build／formal browser及whitespace，記錄merge commit；確認main祖先與push、main CI通過後，僅刪除已整合`codex/energy-city-polish`本機／遠端ref。保留clone及其ignored備份，更新原checkout main時保留未追蹤檔。自己的Vite5194完成後停止；scratch/browser由runner finally清理。

## Integrated result

Merge commit `8ad644d63444558a4abfdc4f0d102343d842b3cd`，parents為fresh main `db772bb`及已push feature `44585bd0b5c9e7f5ce142b5aeb2771dd38d0554f`；no conflicts，merge tree與feature完全相同。乾淨working tree才切main、fast-forward及`--no-ff`合併。整合後root `npm test`／`npm run build`／完整committed whitespace再跑PASS（49／108／324／170775；既有chunk warning保留），正式E4 browser在該merge commit再跑全部PASS，平台／尺寸／配置與前次相同，exceptions0。Runtime／tests／config與feature逐byte一致。

[Integrated test log](../../artifacts/energy-city-polish/main-integration-20261025/integrated-test.log)、[build log](../../artifacts/energy-city-polish/main-integration-20261025/integrated-build.log)、[formal browser log](../../artifacts/energy-city-polish/main-integration-20261025/integrated-browser.log)及[exact-commit browser metadata](../../artifacts/energy-city-polish/main-integration-20261025/integrated-browser.json)。兩次完整formal原圖及hash另保存在本chat持久visualizations目錄的`energy-polish-integration/`；沒有覆寫舊證據。第二次browser的scratch DB／HTTP／WebSocket／Chrome由原finally全部關閉，沒有使用展覽DB。

這次新增的整合證據／文件不改runtime。Main publication／CI及branch deletion實際結果見下節；之前各批次的審美、工程及硬件限制保留。

## Publication, CI and safe cleanup — complete

- 已push main `9a1009e908c3c93c92517da38d7f85aef9b98ae3`；fresh fetch確認remote包含merge `8ad644d`。
- [Main CI 40200646383](https://github.com/cc100053/city2127/actions/runs/40200646383)在9a1009e完成SUCCESS；root install/test/build、survey install/test/build、module-swap install/test/build及committed whitespace全部通過。這是本次實際run，沒有沿用舊CI。
- 刪除前再次fresh fetch，確認remote feature仍為`44585bd0b5c9e7f5ce142b5aeb2771dd38d0554f`，本機及遠端feature均為origin/main祖先。Remote delete附exact expected-SHA lease，防止檢查後有新提交被刪；本機使用`git branch -d`，沒有force-delete／重寫main。刪後fresh fetch／branch listing確認兩個ref均不存在。只清理`codex/energy-city-polish`；其他分支未動。
- 原checkout main已fast-forward到9a1009e；13個未追蹤Playwright YAML逐byte SHA256核對一致，tracked diff為空。收尾文件push後再作最後fast-forward；保留同一checksum核對。
- Task clone保持main、乾淨；整個clone及ignored source／checkpoints／bundles／tar archives保留，沒有刪重要共享資產或備份。本次Vite5194／PID53881已SIGTERM、session exit143，lsof無LISTEN；兩次formal runner均exit0並按finally關閉browser／scratch server／SQLite。
- CI原始JSON／watch log、兩組完整13檔formal evidence及其SHA256、原checkout前後checksum manifest保存在本chat持久visualizations目錄`energy-polish-integration/`。Git內feature與integrated logs／metadata保留上方連結。

最後此交接／索引收尾只改Markdown，依現行CI paths-ignore不觸發新run；runtime/tests/config與已PASS的9a1009e完全相同。下一步：無待辦Git整合；既有夜間環可讀性／target／展覽硬件等限制保留，沒有部署或新視覺實作。
