# energy-city — 能源城市 E1–E4


## E4正式接入／本輪續作（2026-10-24）

- Owner: Codex；產品決策cc100053。
- Status: LOCAL_VERIFIED — 使用者閱讀Q3詳情後回覆「Ok」，確認只替換Q3的方案；正式接入及本機驗證完成，Git整合／main CI待以下最終記錄。E5硬件／性能／訪客驗收不在本次。
- Branch: `codex/energy-city-authority`；獨立checkout `/private/tmp/city2127-energy-plan-20261024`；續作HEAD `a617f55e220060aeb65c5dd4fe4d6e76676bdb24`，origin任務分支0／0，對origin/main b8bccad 2 ahead／0 behind。乾淨後開始，沒有自動pull／merge main。
- Mandatory preflight續作：首先確認原city2127 main29d12db、只有既有未追蹤`.playwright-cli/`；fetch成功，原checkout落後23 commits，保留原狀。獨立checkoutfetch成功，遠端main仍b8bccad，E3及準備commit可取得；無`.codegraph/`，不索引。沿用已讀本任務所有必讀文件並核對上輪交接／actualsource及callers。沒有並行binary／模組編輯；同一Owner。
- 實作：question-set4，只改Q3；三軸原ids／effects／文字維持。`shared/energy.ts`定義四類累計／精確整數門檻／配置驗證；votes.energy與environmentalPriority零佔位明確表示氣候缺席。state.energy持久counts與climateGuestCount；舊氣候EMA／sum／score及刻度不受能源人數稀釋，舊事件無energy仍完全沿用原reducer結果。SQLite8只新增nullable energy_json，舊event／原文不重寫；新before／after JSON及votes記錄可重播／Undo。
- Renderer：CityView2 optional energy及嚴格parser → EnergyRuntime沿用E3固定幾何／60秒節拍 → CityChangeManager實際前後target → residentResult／當前設施卡。能源局部淡入／淡出3秒，保持能源橋與公共路高度，翼尺寸平滑變化；材質副本按獨立組一次建立，跟隨原發光／反射日夜更新，不改共用城市材質。第四票與lantern去沿岸能源接點；舊氣候歷史仍在公園。約2.6秒journey、三秒retarget、10秒閱讀及立即恢復保留。
- Caller同步：Monitor顯示能源配置與實際變更，focal cityChanges保持原契約，能源前後在layout.energy；DEV auto獨立選能源／四類輪替，不把四類當Meter數值。凍結v3 JSON回歸fixture保留原81組；新v4另驗108組。現行README／survey README／PROJECT／SPEC／RESIDENT_COPY／能源計劃同步，歷史段落保留；P2證據改可指定資料夾，P4改驗ambient狀態而不猜載入時輪換到哪張卡。
- PASS（開發工作樹）：focused energy.test驗真實schema7→8、原文／舊ID／舊草稿版本guard、70份新能源與超過64筆完整counts、氣候分數／EMA／刻度、重啟replay、corrupt tally拒絕、Undo與reset。focused energyPipeline驗108組正式答案→HTTP／WebSocket／嚴格parser→實際模型、精確門檻、共存、無可見變化／缺前後證據、延遲／重定向／snapshot／reduced motion，以及局部材質／geometry重用與橋高。
- PASS（開發工作樹）：root完整npm test含舊81組與新108組；survey完整npm test；兩package build（root既有>500kB warning）；git diff --check。最後變更後與整合後仍需依下方最終紀錄重跑；不能以早期工作樹結果宣稱整合通過。
- PASS（正式browser）：Chrome156.0.8078.47／macOS，City1920×1080預設quality／原hero、Guest1280×900，scratch真實SQLite7→8；[正式證據](../../artifacts/energy-city-e4/formal/README.md)／browser.json。驗舊草稿保留Q1／Q2／Q4且Q3重選、pre/post-commit同ID重試、第一能源票無設備差異、第二票實際一庭及結果、Undo消除模型、實際已記錄的16票混合配置、hour12／18.5／22、TCP重連、browser prefers-reduced-motion、1440×900普通resize及reset／舊ID重試。全部page exception為0；預期舊session409、favicon404及兩次刻意abort明列，另核對沒有未預期console／network失敗。11s／16s fixture clock jumps只跳過舊閱讀／seed／Undo等待，不代表訪客時間；actor為實時本機clock，未固定reviewTime。GPU／FPS／實機／OS全域motion偏好未量。
- PASS：既有resident P3在目前v4上回歸，Chrome1280×720／hour16，A/B閱讀間隔**10,002ms**；排隊、lost reply／reload同ID、提前交接與reset drain、照明、reduced motion／snapshot／Undo全通過。新截圖在`artifacts/energy-city-e4/p3/`，未覆寫舊證據。P4／P2亦PASS：1280×720／hour16，P4含桌面鍵盤／模擬觸控、同ID重試、繼承、真實TCP離線重連、B結果到期保留A草稿及A問卷到期／reset；P2含舊A/B草稿重新預約、有效選項／焦點／核對及結果。新證據在相鄰p4／p2資料夾，沒有覆寫原截圖。
- 開發中曾遇sandbox loopback listen EPERM，允許localhost後重跑；browser斷言補正狀態完整文字、預期舊session409及等待resize完成。這些與最終通過結果分開，未將失敗當通過。
- 最終本機檢查PASS：root完整npm test／build／git diff --check、survey完整npm test／build／git diff --check；Node26.0.0，允許loopback。Root仍只有既有>500kB warning。最後新增energyDistrict檢查大小翼、seed0／4242、四軸low／mixed／high共324個情境，164,088次actual mesh intersections，含完整環／渦輪掃掠及兩處水庭；使用真實程序district／fallback focal幾何，沒有另claim所有late roof／GLB、所有uint32 seeds或全城連續碰撞。324最後focused重跑PASS，整合全套亦須包含它。
- 自審：exact diff與所有新source／tests／artifact已讀；source hashes在正式證據內。沒有外部依賴／部署／素材包或歷史Shibuya改動。Markdown local links／anchors／targets在最後文件變更後重驗，數目見下方完成紀錄。
- 清理PASS：本輪唯一Vite session已停止exit130，lsof確認5173無LISTEN；全部Chrome scripts在finally關閉browser／realtime／HTTP／scratch DB。本輪沒有持久survey server或留下測試分頁。原checkout／舊截圖保持。
- 下一步：commit／push任務分支；fresh fetch，no-ff整合main、完整重驗、push並確認main CI。E5硬件／性能／訪客驗收仍獨立未完成。

---

## E4前輪準備checkpoint（歷史；以下待決狀態已由上方使用者確認取代）（2026-10-24）

- Owner: Codex；產品決策cc100053
- Status: **WAITING_FOR_PRODUCT_DECISION** — 已準備配置接口及具體Q3／累積／歷史方案；E4正式接入未完成，E5不在本輪。
- Branch: `codex/energy-city-authority`；checkout `/private/tmp/city2127-energy-plan-20261024`。
- Base: `b8bccad9275283fd5aa3a19a1c0d37602345cc95`；E3內容8d6cb93／223cc09與整合3333e4c均可從remote取得，交接與實際code一致。
- Last verified commit: `4658c9243222e84f67d917580d596bed8005e45c`（上述root test／build與browser對應同一source tree）；已推送`origin/codex/energy-city-authority`，0／0、working tree乾淨。`origin/main`仍為b8bccad，E4未整合，沒有新的main CI結果可宣稱。後續僅補本Markdown驗證指標。
- Preflight：先確認原`/Users/fatboy/city2127`為main29d12db，只保留既有未追蹤`.playwright-cli/`；fetch成功後0 ahead／23 behind。獨立checkout開工乾淨main b8bccad，初次fetch sandbox DNS失敗，允許網絡重跑成功，0／0。未stash／reset／改原checkout。獨立checkout沒有.codegraph，不自行索引；不拿舊checkout的index當新source。
- 已讀使用者指定README、PROJECT、CONTRIBUTING、VALIDATION、SPEC、RESIDENT_COPY、ART、CITY MASTER TASTE、ENERGY_CITY_PLAN及本交接。追蹤questionLoader→proposalService→scoreEngine→SQLite snapshot／replay／toProposalRecord→CityView／viewOf→root parser／main→cityChangeManager→residentResult；現行question-set3／CityView2／SQLite7。唯一Owner，無並行binary／module編輯。
- 完成：energyPrototype增加configure／getConfiguration接口，水庭0／1／2、接收翼無／小／大、環與島獨立共存；原select預設保留，沒有新geometry／materials。配電由實際儲能有無決定節拍。36組模型測試；[評審方案](../ENERGY_CITY_PLAN.md#e4評審草案四題與能源權威配置2026-10-24待產品決定)含四題協調、完整日文選項、累積門檻例、共存／互斥、氣候缺席與歷史保存、實際證據及無改變文案。
- PASS：root完整npm test（含真實loopback HTTP／WebSocket／81組原題），npm run build（既有>500kB warning），git diff --check。Focused能源幾何／動態test亦PASS。Survey／module-swap source未改，沒有另跑本機suite；不把原四題pipeline當新能源pipeline。
- PASS：[準備階段browser證據](../../artifacts/energy-city-e4/README.md)：macOS in-app Chromium／WebGL2、1280×720、原hero、hour12／reviewTime50，五DEV配置及靜態閱讀；console warn／error空。未做新正式flow、migration、硬件／FPS驗收。
- 文件核對：262個本機Markdown links／anchors／targets PASS；新增source hashes與實際code一致；完整diff／new files自審，沒有改README／SPEC／RESIDENT_COPY，因正式產品行為與文案仍維持version3，候選明確只寫ENERGY_CITY_PLAN。
- 清理：本輪Vite session正常停止exit130，5173無LISTEN；本輪in-app測試分頁已關閉，沒有新持久survey服務；原checkout與既有截圖保留。
- 待決：使用者本次明確要求「會改變產品方向的關鍵決定先準備可review方案再問」。**是否接受只將Q3由夏日涼感改成能源四類生活取捨，另外三題不變、舊氣候保持原義且不收新票、能源獨立累積？** 已透過本chat選項詢問；沒有答案前，不自行改正式題、軸、資料／migration或合併未完成E4至main。
- 下一步：收到產品決定後，依確認方案完成server累積／缺席與schema migration、嚴格wire驗證、正式能源runtime及3秒retarget、前後實際證據／結果卡，再做新舊scratch歷史、retry／reconnect／Undo／reset、single／A-B與reduced-motion正式桌面證據，跑root／survey適用test/build，按Git流程整合及確認main CI。下方E3原交接作歷史保留。

---

## E3發布紀錄

- Owner: Codex；產品決策cc100053
- Status: IN_PROGRESS — E1–E3完成並發布main，最終main CI PASS；E4／E5未開始
- Branch: `codex/energy-city-motion`
- Base commit: `cf5ea94ac3cd3e8c9415cbe3dda9d55f5654b8c9`
- Last verified commit: E3內容`8d6cb93299410fee462bb7ceffd65ceda1376511`＋文案修正`223cc09f5c80e686c52cfc01a757dba3ebc21fd2`；最終整合`3333e4c612277a2f88531a8d1f582e3e4bf54341`完整root test／build重驗PASS
- Remote availability: `origin/codex/energy-city-motion` @ `223cc09`；`origin/main`已含最終整合`3333e4c`，本次僅補CI交接。
- Scope: 只完成E3城市組合與動態；不接E4正式問卷、權威配置或後端／部署

## E3 preflight and scope

- 2026-10-24先確認原`/Users/fatboy/city2127`。main @ `29d12db`，未追蹤`.playwright-cli/`及既有截圖保留；沒有stash／reset／discard／提交無關工作。
- 首次原checkout fetch因`.git/FETCH_HEAD`寫入權限、獨立checkout因sandbox DNS失敗；允許網絡的fetch重跑均成功，沒有自動merge原checkout。最新origin/main為`cf5ea94`；原checkout 0 ahead／17 behind。
- 重用`/private/tmp/city2127-energy-plan-20261024`，開工main乾淨，fetch後與origin/main 0／0；從該main開`codex/energy-city-motion`。無`.codegraph/`，不自行索引；直接追蹤energyPrototype → devEnergy → main的DEV import／devFrame，及bake／arc／mobility／tidalEdge／幾何tests。E2內容`afd4c0a`、整合`7fa5c9f`、交接`cf5ea94`均可在遠端取得。
- 已讀README、PROJECT、CONTRIBUTING、VALIDATION、ART、CITY MASTER TASTE、能源計劃及本交接。唯一Owner為本任務Codex，沒有並行binary／模組編輯。只改root程式／測試、相關文件及新截圖；不改survey／module-swap／外部素材。

## E3 implementation

- `energyPrototype.ts`延伸既有工廠：原水庭＋DECKS外側`(30,0,-395)`比例0.72第二庭，共享geometry／materials；兩庭翼形檢修遮棚、可見框管／箭頭、獨立抽水回管及連岸路。兩處環／翼配電門架以服務軌接向岸邊，所有非基準方向可讀。
- M1完整共存；A分散水層、B集中接收翼／前置環、C外擴岸界／橋與低矮配電接點。沒有把A/B/C變成環境Meter bands。
- 60秒充能20／暫存20／釋能20；絕對時間計算水位、流向、環加／減速、渦輪與向岸分配。C配電不依賴不存在的儲能。36個合併／水面mesh、4個flow InstancedMesh，一次建立；沒有逐幀geometry／material分配。
- `devEnergy`回傳現有`devFrame` callback；`reviewTime=10|30|50`可重播。系統reduced-motion或原生「靜態閱讀」固定全部新增能源動態，保留箭頭／設備／流程文字。Production guard移除工具；survey／Meter／scaleLab隔離仍保留。
- 自審／幾何修正：第二庭最初碰轉乘泊位，移到現址；固定軸承退至旋轉平面後方；外露渦輪提高0.5 m以清下庭邊緣；新看台／步道起點移出槽緣，維持連岸端點及平順坡度。
- 計劃／PROJECT／SPEC／VALIDATION、README及文件索引同步；[E3實際比較圖](../../artifacts/energy-city-e3/README.md)。E2歷史實測保留於下方。

## E3 validation

- PASS — root `npm test`（Node26.0.0，真實loopback survey HTTP／WebSocket、81組答案與既有城市／路徑檢查）；最終任務內容完整重跑通過；整合後結果於下方補記。未改兩個子package，未另跑其本機suite。
- PASS — root `npm run build`；沿用既有>500kB chunk warning；產物無energy-prototype／E3工具。`git diff --check`通過；380個本機Markdown links／anchors／targets檢查PASS。
- PASS — 五配置／geometry重用；環角度、水位跨phase連續；水位方向／界限、配電流向、C獨立配電、全部能源world transforms及instance矩陣的reduced-motion時間不變性。
- PASS — 富士環保守全周annulus（內29／外33 m，厚3 m），對真實civicCore及固定支承；兩渦輪圓盤（r2.3／厚0.9 m）對固定室／支承，並檢查真正轉子都包含在掃掠內。沿用21,595個完整320秒／0.5秒船體樣本、公共／deck／22m航空走廊、泊位、六rooms／連岸路、beacons、四站hero視線；所有mesh頂點在原hero畫框。兩庭公共步道對tidalEdge及能源機械／門架的headroom檢查通過。
- Desktop browser evidence: macOS本機Codex in-app Chromium／WebGL2，1920×1080，預設quality，hero／近景與hour／reviewTime列在artifact README。五日景、混合暮／夜、近景三階段／靜態閱讀已檢查；實時畫面從暫存推進至下一輪充能，1440×900 canvas CSS尺寸跟隨resize後回1920×1080；standalone／Meter優先隔離控制數量0，console error／warn為空。瀏覽器啟動時兩次locator遇到載入期間CDP timeout，待頁面完成後恢復；不是程式console例外。
- OS全域reduced-motion偏好未改；瀏覽器用原生核取框測相同靜態分支，Node檢查所有新增動態固定。完整HTTP network trace、實際GPU／FPS、Safari／iPad、Windows／展覽硬件、訪客理解未測。
- PASS — 內容`8d6cb93`推送`origin/codex/energy-city-motion`；fresh fetch確認origin/main仍為`cf5ea94`。`d2fb447`以no-ff整合，tree與任務分支完全一致；整合root `npm test`／`npm run build`、379 links／anchors／targets、committed whitespace及browser source hashes重驗PASS。主分支發布／CI結果於後續紀錄。
- 清理PASS — Vite已透過原session停止（exit130），`lsof`確認5173沒有LISTEN；本輪in-app分頁已關閉、viewport override已reset。沒有啟動持久survey／headless服務；測試自建的loopback server隨suite正常結束。原checkout與舊截圖保留原狀。

- 最後文案自審修正：A／B階段分別只描述水庭／旋轉環，避免沿用M1而提到隱藏設備；B靜態閱讀亦不提水管。瀏覽器原生選單＋checkbox斷言通過，更新A／B日景及B靜態圖，console error／warn仍為空；混合／C、幾何與時序沒有更改。文案修正`223cc09`推送任務分支，最終`3333e4c` no-ff整合；root test（含實際HTTP／WebSocket）／build、380 links／anchors／targets、committed whitespace及browser hashes在整合後重跑PASS。`origin/main`已發布`3333e4c`，fetch確認0／0；[最終main CI](https://github.com/cc100053/city2127/actions/runs/40045993266)已完成success：Node24／Ubuntu的root test／build、survey test／build、module-swap test／build及committed whitespace全部PASS（job 120727731401）。本次後續僅更新Markdown交接，依paths-ignore不另觸發CI；runtime／素材與已通過的`3333e4c`一致。
- 第二輪短暫Vite亦已停止（exit130）、新測試分頁關閉／viewport reset；5173無LISTEN，沒有本輪服務留在背景。

## E3 limits and next step

E3是DEV視覺與因果節拍，不是電力／流體／容量／可靠度模擬。沒有完整地下電網或水量守恆／損耗計算，流向標記僅示意。Hero可讀組合；小機械／水位需近景。前置環非貼殼同心機械，島／橋仍為候選量體。全周轉子包絡＋離散船體／路徑檢查不等於全城連續碰撞或工程認證。

下一步為E4正式問題／權威配置／歷史相容性及實際變化證據，另開明確任務；E5做硬件／性能／訪客理解。不要以E3完成推論這些已通過。

---

## E1／E2歷史交接（本段為E3前紀錄）

- Owner: Codex；產品決策cc100053
- Status: IN_PROGRESS — E1、E2完成並發布main，main CI PASS；E3–E5未開始
- Branch: `codex/energy-space-prototype`
- Base commit: `1966ebe4b57567b838ce2613a1a3182d4a5d9daf`
- Last verified commit: 內容commit `afd4c0a1b4416c2c430a9ad2d86fa9e05cf6e7e6`；整合commit `7fa5c9f6d8cd207acf9a7c89e0cbb25b88040e69`重驗PASS
- Remote availability: `origin/codex/energy-space-prototype` @ `afd4c0a`；`origin/main`包含`7fa5c9f`（推送後fetch確認0／0），本次僅補驗證交接
- GitHub Issue (optional): NONE

## Session Git state

- 原checkout `/Users/fatboy/city2127`為`main` @ `29d12db7629b8ffabdb75b53b2cec70d8c15ee9a`，保留未追蹤`.playwright-cli/`與所有截圖，沒有stash／reset／同步原checkout。
- 2026-10-24 fetch成功，origin/main為`1966ebe`；原checkout 0 ahead／14 behind。
- 重用獨立checkout `/private/tmp/city2127-energy-plan-20261024`：main乾淨，fetch後與origin/main 0／0；先核對E1文件／source，再開E2分支。此checkout沒有`.codegraph/`，依AGENTS直接讀source／callers；原checkout index沒有用來假定新checkout內容。
- 無並行模組／binary改動；Owner為本任務Codex；沒有改共享二進位資產。

## Goal and scope

本輪使用者要求直接完成E2靜態空間比較及驗證。原hero能比較基準、A「海と暮らす」、B「空とつながる」、C「陸地を増やす」及M1混合；各一組海上接收翼、上下水庭／渦輪回路、球體外置儲能環、填海能源島。保留富士媒體／劇場、六座water rooms、公共／海空通道、四站視線；不改四題／Meter／歷史資料，不部署。

## Completed work

- [energyPrototype.ts](../../src/energyPrototype.ts)：四組靜態幾何，一次建立，共19個共享材質batch；配置只切visibility／翼scale，rotor獨立於固定支承。無新dependency，沒有逐幀工作。
- [devEnergy.ts](../../src/devEnergy.ts)及main的DEV dynamic import：`?energy=baseline|a|b|c|mixed`原生選單，URL保存；survey／meters／scaleLab優先，production移除整個工具。
- 上下水庭含落水管、渦輪室／轉子、獨立抽水回管、下庭公共看台／4 m緩坡；能源島有分段岸界、檢修橋及兩端升降井。都是量體示意，未模擬服務或工程。
- 水平環在hero太弱、貼近立環碰到斜街；最後採海側前置環，中心`(-18,100,-24)`，半徑31 m，固定支承接既有transfer frame。實際rotor與劇場／工作翼／斜街不相交；沒有轉動劇場本體。
- [幾何測試](../../tests/energyPrototype.test.ts)接root npm test；[計劃](../ENERGY_CITY_PLAN.md)、PROJECT／SPEC／VALIDATION、README與文件索引同步。
- [實際截圖](../../artifacts/energy-city-e2/README.md)：五張同hero日景、M1黃昏／夜景及水庭近景。

## Actual validation results

- Date/environment: 2026-10-24；Node26.0.0；macOS本機Codex in-app Chromium／WebGL2，1920×1080，預設quality；未量GPU型號與展覽硬件FPS。
- PASS — root `npm test`（真實survey HTTP／WebSocket pipeline，81組答案與既有城市／路徑檢查）。首次sandbox跑到pipeline時因listen EPERM中止；允許localhost重跑後整套通過。沒有改survey程式。
- PASS — root `npm run build`；既有>500 kB chunk warning保留；產物搜尋無`energy-prototype`／`海と暮らす`／Energy工具，DEV import已剔除。
- PASS — focused E2 test（補真實tidal-edge新步道檢查後再跑）：五配置／mesh UUID重用、19 batches、rotor vs實際core網格、21,595個可見船體保守包圍盒（完整320秒週期、0.5秒步距）、公共／deck／rooms連岸路、beacons、航空走廊／泊位、四站視線及原hero畫框。
- PASS — 五種day（hour12／reviewTime20）選單切換、URL、五張1920×1080截圖；M1 hour18.5／22及水庭近景；各頁console error／warn為空。資產與城市可見載入，沒有資產失敗console訊息；沒有另錄完整HTTP network trace。
- PASS — standalone與`?meters=nw:high,ne:low&energy=mixed`：城市／既有Meter層正常，能源控制數量0，console error／warn為空；因此不能將能源配置疊到Meter當正式答案。
- PASS — 工作樹whitespace與完整diff／new files自審；9份Markdown的366個本機links／anchors／tracked或本輪新targets通過。Staged／committed `git diff --check`通過。
- PASS — `7fa5c9f`整合tree與`afd4c0a`完全一致；整合後root npm test（含最後E2／tidal-edge檢查）及build、366個links／targets與`git diff --check origin/main..HEAD`重跑通過。原瀏覽器證據對應同一程式／素材tree。
- Main CI：[run 39990353370](https://github.com/cc100053/city2127/actions/runs/39990353370)，2026-10-24完成success：root npm test／build、survey test／build、module-swap test／build、committed whitespace全部PASS（Node24／Ubuntu）。本次後續只補Markdown驗證紀錄，runtime／截圖tree不變。
- 本機survey／module-swap package tests未另跑：兩個package沒有改動；root真實pipeline已跑，main CI三個package的test／build已全部通過。
- 清理：本輪Vite已停止（localhost:5173 curl回應000／connection refused）、測試分頁已關閉、viewport override已reset；未啟動持久survey server。原checkout及既有`.playwright-cli/`保持原狀。

## Known limits and next expected step

E2是可隔離的靜態量體比較，並非最終美術／工程驗收。Hero有四類輪廓，但水管與渦輪需近景；前置環離開球殼，並非同心貼殼機械；核能設施／長橋仍是概念形體。夜間可辨輪廓，細節照明未設計。

離散幾何樣本不等於連續碰撞、完整旋轉掃掠／實際飛行、結構／水質／噪音／電力或海岸工程驗證。沒有測容量、可靠度、GPU性能、Safari、iPad或展覽硬件。E3才設計全城少量擴展與緩慢動態；E4才協調正式四題／權威配置及歷史相容性；不可將A/B/C直接當環境Meter bands。

## Preserved E1 record

E1規劃及四構想系統定義於`0dd1675`，整合`754a05c`，最後交接`1966ebe`。當時為純文件，120個本機links／targets及whitespace通過；沒有runtime測試／截圖，docs-only CI跳過。JAXA正文讀取逾時、僅核對搜尋摘要的限制保留在能源計劃，不用E2幾何推論工程效能。
