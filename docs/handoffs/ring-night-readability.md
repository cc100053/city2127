# 儲能環夜間可讀性 — 一次已批准跟進試驗

> 2026-10-25 最新發布／整合狀態見 [energy polish integration](energy-polish-integration.md)；以下本機-only／NOT PUSHED及review限制是先前批次的歷史狀態，今次使用者另已明確授權發布。

- Owner：batch chat `01a171dc-80a0-7e63-a14d-b7dbca7159b6`，本輪唯一writer；coordinator `01a16c95-84d1-7fe2-a365-42e343514498`。
- Status：WAITING_FOR_REVIEW；只此一次Plus trial，完成後交coordinator驗收，不自開新輪。
- Clone `/Users/fatboy/city2127-energy-polish`；branch `codex/energy-city-polish`；clean starting HEAD `b24cf3d8b569780324e4bf0f491bdf8af3c30169`。
- Runtime baseline `333e984f1a4bb315238aa6d8baeded797c659fc6`、SHA256 `01987a48101b59559709dc2ce5461ec51617f0a73a06803e45c50354612556f3`；trial SHA256 `29168309084f683cf6c57e82ca45ee2c3fa2e3ba22e86cb4fc92c2103b60cf02`。
- Evidence checkpoint：`f25b2a3e136a6346e40f3c51bae10808ea14a9ed`；runtime source仍為原accepted333e984，候選只保存在artifact，沒有candidate runtime commit。文件checkpoint與完整backup最終HEAD由`checkpoints/final.json`標明。
- Remote availability：NOT PUSHED；無upstream／remote counterpart；禁止push／deploy／main整合，沒有main CI宣稱。

## Preflight與scope

2026-10-25先確認原city2127身份，再明確進入指定persistent clone。起點乾淨、HEAD／runtime hash符合派工；owner fresh fetch成功，origin/main `db772bb2248aed345468d6b07fc011d518f7c7b2`，ahead10／behind0，既有task branch不pull／merge／reset。先前已接受水庭／環／島／接收翼維持；不讀舊長對話。無.codegraph、不索引。Worker首個fetch受其sandbox寫入限制，owner成功fetch作本輪權威紀錄；沒有改remote設定。原repo source及其他clone未寫入。

只允許`energyPrototype.ts`在Bay-facing flywheel與Three reclaimed caissons之間的既有環外緣、固定軸承／承托局部non-emissive finish。DEV `main→startEnergyReview→energyPrototype`及正式`createCityChangeManager→EnergyRuntime→同工廠→fade clones`均已追蹤。只把原環段chrome引用一對一改到本地一次clone：`#dce2df`／metalness.18／roughness.46／clearcoat.15／clearcoatRoughness.38／envMapIntensity.15。以現有漫射光減少對夜間鏡面反射的依賴；dark／solar機械核心、trim殼及原單一publicLight標記保持。局部env response固定.15是本候選finish選擇，不再繼承全城chrome日夜反射倍率；shared chrome本身不改。

沒有geometry／位置／animation／silhouette／微部件／新增lights或emission／halo／相機／全城光／receiver／island／water變更。四題、歷史、Fuji劇場／六rooms、hero、公共／船／22m air／泊位／四站視線／完整sweep、60秒及3秒retarget／立即恢復維持。只新增handoff／同步文件與可重跑artifact check；原tests／quality／timeout未改。沒有dependency／infra／asset pack。

## Target與一次worker

[完整證據入口](../../artifacts/energy-city-polish/ring-night-readability-20261025/README.md)。先新拍原source同鏡位day/night hero/detail及完整27圖，然後built-in imagegen對actual hour22 hero生成新target。逐字prompt、原圖、generated原檔及hash同存；workflow `.dream-loop/ring-night-readability/target.png`及持久artifact `target.png`都SHA256 `062aed68c2ad36de52bc2c153a20e540918fe2a45d4e7b67bc559a4d09ecee02`，16:05:29 JST鎖定並記clock。

Target1672×941對actual1920×1080，有重繪UI／背景／文字及平滑漂移；明確拒絕所有非環漂移，只以局部non-emissive銀灰明暗作reference，runtime畫框及幾何不追生成漂移。原已接受環target70c988bb…、receiver02bbde10…未覆寫。

唯一true same-chat fresh empty-context worker `/root/ring_finish_trial`，`gpt-6-astra`／low，只實作一次，未test／validate／commit／再開agent。Owner自驗及審閱。原source、trial source/diff及worker metadata保存；沒有第四輪或其他設備批次。

## 驗證與review

Root `npm test`／`npm run build`／`git diff --check` PASS；49 batches、theatre gap30.50m、21595船體、108權威組合、324 district情境／170775 exact geometry checks，沒有放寬原assertions。原>500kB chunk warning保留。Survey build僅供scratch fixture，survey／module-swap source未改、未另跑其suite。

Artifact protected-check PASS：環外source逐byte、全部energy part未四捨五入的world-space triangle集合、環外及shared finish值一致；新finish只在ring內、non-emissive。初版checker因JSON省略undefined欄位失敗，原log／checker／baseline保留；修正JSON normalization並從原baseline source副本重建更精確geometry基準，沒有為過gate改runtime或tests。

Before／trial各27張新原PNG、21組固定URL／hour／actor time配對及全部54個hash核實。Chrome156.0.8078.47 headless／ANGLE Metal Apple M6／WebGL2，City1920×1080 DPR1 default；day12／dusk18.5／night22，原hero與ring detail、mixed／B／baseline、三phase、native static及live→static。固定reviewTime static兩圖每輪均逐byte一致；live before21.33→27.37秒、trial21.88→27.93秒。DEV無未預期console/network／page exception；只有favicon404。

原`tests/energyE4.browser.mjs`候選正式scratch gate PASS：schema7→8舊歷史／原文／ID／草稿、Q3／review、pre/post-commit同ID retry、無變化／一庭結果、Undo、mixed snapshot、日暮夜、TCP重連、browser reduced-motion、普通resize、reset／舊ID恢復。Guest1280×900，City1920×1080 default；exceptions0，預期favicon404／obsolete409／兩次注入abort保留。原assertions／quality／timeouts逐byte未改；scratch DB／server／browser由原finally清理。實際運行記錄以working-tree source hash29168309標明，不冒充不存在的trial source commit。

**Owner及coordinator review：候選不採用。** 16:20 JST總指揮親自比較before／trial原尺寸hero-night-mixed與新target，同意收益不足、保留accepted baseline；只續作驗證／checkpoint／清理，不作新視覺修改。 原尺寸night hero外緣變化太細，完整環周／兩組固定承托仍被Fuji亮室內／扶手梯壓過；近景只有邊際明暗變化，而day銀邊高光減弱。未達派工要求，不為交差強留修改。所有trial source／patch／PNG／target／gates完整保存；已從原source副本逐byte還原baseline01987a48，與starting HEAD及verified runtime333e984一致，protected code diff為空。沒有候選runtime commit；後續只有evidence與文件checkpoint，與原source commit分開。還原後root test／build／diff／exact protected check已再次PASS，同為49 batches、108／324／170775；還原DEV27原PNG亦PASS（同平台／原畫框／日暮夜／全部配置／phase／live/static），fixed static逐byte一致；live22.13→28.10秒。三套共81張DEV原圖hash與42組固定鏡位／URL／actor time配對核實。還原後沒有重跑第二次formal browser，原trial formal與最終baseline root/native pipeline及完整DEV結果分開保存。

## 未驗／下一步

沒有新FPS、連續細部閃爍量化、展覽硬件／Safari／iPad／Windows／真人理解、工程容量、全城連續碰撞或所有late GLB／seed驗收。生成target精準達成及最終審美接受由coordinator review，不能由本機gate推定。

截止2026-10-26 00:00 JST、25日23:45不開新pass；本輪自行停止，不排程、不用quota reset／banked credit。最終source commit、文件checkpoint、完整branch bundle及evidence/target archive的hash／逐檔verify／清理結果由artifact checkpoints/final.json記錄；完成後只交coordinator review。


## 清理與交回

16:24:37 JST確認本輪Vite session52348／PID35752已停止（exit130），5187及formal scratch ports無LISTEN；所有browser harness正常exit／finally清理，exact-name ps檢查無殘留本輪runner。唯一fresh worker已completed，無active實作worker；owner source ownership已釋放，checkpoint收尾後停止本chat工作。下一步只由coordinator驗收已保存證據／本機checkpoint，夜間缺口另候指示；不再嘗試視覺修改或開輪。Quota在16:24:37讀數為5h63% used／weekly10% used、兩個banked resets仍available，沒有使用reset／credit。
