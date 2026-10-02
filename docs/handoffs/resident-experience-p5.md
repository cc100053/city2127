# resident-experience-p5 — 展場與實際裝置驗收

- Owner: Codex；展覽決策 owner：cc100053，現場操作人待指定
- Status: IN_PROGRESS — 已準備驗收表；實機／理解程度尚未測試
- Branch: `codex/resident-experience-p5`
- Base commit: `88e2d62e03095edd41172cf1044219b11bc99bae`
- Source commit: `8399a2601de3824b8fa58d50fc2b3e26328e5e79`
- Last verified commit: `8399a2601de3824b8fa58d50fc2b3e26328e5e79`（文件檢查PASS）；另有本交接的publication metadata更新，實機 NOT RUN
- Remote availability: source已推送 `origin/codex/resident-experience-p5` 的上述SHA；本交接closure接續發布於同一分支，最新tip可用 `git rev-parse origin/codex/resident-experience-p5` 取得

## Session Git state

2026-10-02（Asia/Tokyo）：確認 `/Users/fatboy/city2127`；起始為乾淨 `main`／上述HEAD，沒有未提交截圖。Fetch成功；`origin/main`同為base，divergence 0/0，無需整合upstream。P4 source `7b36dd65da03289e224c31bc825b9cbef4fed19b` 和 verified integration `9f7741921805551724d2608c9ac249e0e194dc21` 均在remote main；本次base是P4文件closure。沒有既有P5分支／交接。Codex負責文件，沒有本地重疊修改；未改模組或binary assets。建立分支的sandbox Git lock寫入失敗，已授權escalation後成功。

## Goal and acceptance criteria

執行 [居民計劃 P5](../RESIDENT_EXPERIENCE_PLAN.md#p5--展場與實際裝置驗收in_progress)：在指定展覽裝置／實際連線／觀看位置完成操作、閱讀、理解與復原驗收。結果須附實際commit、裝置、日期及證據；未執行項目不可標PASS。P5完成不自動代表 [S5](../EXHIBITION_SPEC.md#開發工具與待完成驗收) 全部完成。

## In-scope files and dependencies

本交接兼作驗收表，沿用 [P4](resident-experience-p4.md)、[VALIDATION](../VALIDATION.md) 及 [README啟動流程](../../README.md#展覽啟動mac--windows)。只同步本交接、計劃、驗證入口與索引。實測問題出現後才trace callers並修正；不新增泛用手機responsive／adaptive camera、依賴或服務，不改展覽DB。

## 裝置與場地記錄

下列「預計」值來自使用者2026-10-02提供的配置，並非已確認安裝或實測證據。

| 欄位 | 計劃值／仍需記錄 |
| --- | --- |
| 主屏幕／輸出 | 預計65吋、主機HDMI輸出；型號、解析度、refresh rate、CSS viewport／pixel ratio、City browser待提供 |
| 觀看距離 | 預計約4米；實際站位、輸入裝置高度／角度、燈光／反光待測 |
| 輸入裝置／模式 | 預計兩部iPad接收主機畫面、A/B；型號、尺寸、iPadOS、主機Guest browser版本、各站橫向CSS viewport／縮放待提供 |
| 運行電腦 | 使用者提供「Mac mini M6」作預計主機；實際型號／OS／CPU／GPU／Node版本尚未核驗 |
| 裝置連接／LAN | 使用者已確認主機直接輸出畫面到兩部iPad；採用哪種軟件／接線、雙路獨立畫面及觸控回傳待核驗。現行LAN Guest模式不是使用者選定方案 |
| 現場操作人／日期／場所 | 待指定 |
| 被測完整commit／工作樹差異 | 待提供；文件base不等於實機已驗commit |
| 測試資料／URL | 獨立scratch SQLite路徑／runId、Guest A/B、City WebSocket、Admin loopback URL待記錄 |
| 長時間門檻 | 展覽owner確認時長、提交頻率、參與數及可接受停頓，尚未決定 |

## 實機操作與驗收表

1. 先完成D0，記錄實際輸出方案、軟件版本及接線。不自行將iPad改為LAN browser，也不新增顯示驅動／第三方服務。依README build／啟動並記錄實際ports；若Guest browser都運行於主機，server／Vite可維持loopback，兩個獨立Guest視窗分別開 `/guest?station=A` 和 `/guest?station=B`，City視窗放HDMI主屏。測試server用 `SURVEY_DB_PATH` 指定獨立scratch SQLite；Admin始終使用host localhost。不使用展覽DB做reset／Undo演練，也不依賴DEV-ONLY自動答題。
2. 在指定橫向iPad、65吋HDMI主屏與約4米站位逐項執行。睡眠、斷網、租期及長跑使用真實時間，不以P4 clock jumps或Chromium觸控模擬當實機證據。
3. 訪談先記錄原話，再解釋設計。實測需要縮短文案時同步 [P1 copy](../RESIDENT_COPY.md) 與正式callers；先縮句。如仍需改10秒時段，同步server排程、Guest、lease／guard／drain並重新驗證。
4. 由展覽owner確認復原政策，現場操作人演練並留下結果；完成相關修正／checks／新證據後才關閉P5。

| ID／檢查 | 通過條件 | 結果／證據 |
| --- | --- | --- |
| D0 雙iPad直接輸出／觸控回傳 | HDMI City及兩個不同Guest A/B畫面同時維持；兩位同時觸控只操作自己的視窗／站號，不搶另一站或Admin焦點；重連後站號／視窗配置仍正確 | NOT RUN；輸出方案未選定，後續實機流程的前提 |
| D1 iPad觸控／焦點／核對修改 | 選項、返回、下一題、修改、提交可用；選取／焦點清楚；題目與操作可達 | NOT RUN |
| D2 約4米可讀性／抬頭／反光 | 正常站位可讀Guest及City；找到自己的站號／編號及變化位置，城市仍可觀看 | NOT RUN |
| D3 單站／下一位 | 四題只累積一次；Guest／City識別一致；下一Start自動交接並繼承城市 | NOT RUN |
| D4 A/B同時提交 | 草稿／保存獨立；依實際提交順序呈現；10秒slot不重疊，不混淆身份 | NOT RUN |
| D5 閱讀／城市結果 | 0–3秒找到位置，3–10秒讀懂偏好及共同結果；變化／維持與實際城市一致 | NOT RUN |
| D6 Guest睡眠／reload／實際連線中斷 | 按輸出方案實測USB斷接或Wi-Fi中斷；草稿及未知保存結果可復原／同ID重試，無重複票；已到期依期限交接 | NOT RUN |
| D7 City睡眠／斷網／重連 | 立即恢復最新權威狀態，無舊字幕／動畫重播；記錄漏看展示情況 | NOT RUN |
| D8 reset／取消／Undo／離線站 | Scratch DB：reset遵守drain、中止只影響指定未完成站、Undo符合條件；問卷5分鐘及展示起點後15秒租期實際釋放 | NOT RUN |
| D9 重啟／照明／reduced motion | 正常關閉後重啟同一scratch DB，城市／歷史／照明保留；照明不吞queue，reduced motion立即恢復 | NOT RUN |
| D10 長跑／GPU | 按owner確認時長及負載運行，記錄停頓、記憶體、FPS採樣、draw calls／triangles、console／network及復原 | NOT RUN；時長／門檻待定 |

每筆填：ID、日期／時間、被測commit、裝置、站號／submission識別、操作步驟、預期／實際、PASS／FAIL／NOT RUN／有理由的N/A、證據路徑。不同run保留不同證據，不覆寫P2–P4截圖。性能按 [VALIDATION](../VALIDATION.md#performance-evidence) 記錄；現有City canvas `data-fps` 每120 frames更新平均，`data-draw-calls`可輔助採樣，不能當frame-time分布或長跑證據。

輸出方案核對（2026-10-02）：[Apple現行Sidecar說明](https://support.apple.com/en-ie/102597) 支援延伸／鏡像及USB連接，並記錄macOS／iPadOS27起擴充觸控；[Apple 2019技術說明](https://www.apple.com/macos/big-sur/docs/Sidecar_Tech_Brief_Oct_2019.pdf) 曾明列一次一部iPad。這份舊限制不能當新OS實測；現行說明沒有證明本案雙iPad獨立觸控配置可行，故不把Sidecar當已選定方案。實際版本與D0結果必須留證，不能只證明畫面能亮。

## 理解程度訪談

以試用者代號記錄，先不提示答案：

- 「この体験の中で、あなたはどんな立場でしたか？」
- 「どんな毎日を大切にして選びましたか？」
- 「回答したあと、街はどうなりましたか？ なぜそうなったと思いますか？」

| 試用者／裝置／submission | 原話：身份、偏好、城市結果 | 卡住／誤解位置、讀完時間、修正與複測 |
| --- | --- | --- |
| 待現場試用 | NOT RUN | 待記錄 |

判讀：能描述台場2127居民、自己的生活偏好，以及累積城市實際改變或維持；沒有將自己的一票當全部變化、將累積參與數當人口或將low當舊時代。保留原話及位置；試用人數與可接受誤解門檻由展覽owner確認。

## 展覽日復原政策（待確認，不是已批准SOP）

| 情境 | 現行能力／限制 | Owner決策／演練 |
| --- | --- | --- |
| 下一位／reset | 單站Start自動交接；A/B reset停止admission並drain；city reset保留總人數，full reset清展示計數但保留歷史 | 何時reset、由誰操作：待確認 |
| 放棄問卷／離線站 | Admin指定未完成session中止；問卷5分鐘／result展示起點後15秒租期釋放 | 等候／中止與觀眾提示：待確認 |
| 保存結果未知 | 原submission ID重試，不建新票猜成功 | 工作人員協助方式：待演練 |
| City漏看／主屏斷線 | 重連恢復最新snapshot；排程不確認viewer已播放，沒有viewer-ack或漏看動畫重播 | 暫停／恢復接待與重新說明方式：待確認 |
| 主機／server重啟 | 沿用原SQLite，不刪DB；重開Guest／City／Admin核對 | 正常關閉、資料保存及值班人：待確認／演練 |
| DEV-ONLY工具 | 展覽前移除或另行安排仍未決；普通Guest不依賴它 | Owner確認安排後再執行，不在準備階段自行移除 |

## Completed work

核對P4遠端可用、現行啟動／環境變數／計時契約；記錄使用者預計配置及雙iPad直接接收主機畫面的要求，準備D0–D10、訪談及決策欄位並同步入口。未改runtime、geometry／camera、計分、schema、依賴或部署。PROJECT／SPEC／README／AGENTS無需修改：source map、產品契約、啟動流程及工作規則未變；P5仍未驗收。

## Actual validation results

- Verification status: PARTIAL — 文件準備已驗證，實機NOT RUN。
- Date and checked tree: 2026-10-02，上述source及本交接publication metadata差異，沒有runtime差異。
- 文件170個本地Markdown target／anchor及tracked-target檢查PASS；完整diff／新檔自審、`git diff --check` PASS。新增P5路徑已核對，沒有更名或刪除舊路徑。
- Source fact checks: server環境變數、各站URL、3秒動畫／10秒slot／15秒lease與現行source／PROJECT／P4一致；City性能dataset已核對。外部Sidecar事實以Apple來源核對，舊文件不當現行雙裝置驗證。
- 起始main [CI37013068059](https://github.com/cc100053/city2127/actions/runs/37013068059) 在上述base上PASS；不代表P5實機通過。
- Hardware/browser/visitor/long-run/FPS: NOT RUN；P4軟件證據不轉為P5結果。
- Tests/builds: NOT RUN（documentation only，repository規則不要求重跑）。
- Integrated commit/checks: NOT INTEGRATED；P5待實機，任務分支供接續。
- Publication: source已commit／push；staged／committed `git diff --check origin/main...HEAD` PASS，發布前fetch與main divergence仍0/0。分支CI在最後push後核對，實際結果於本次最終回覆提供，不預先宣稱PASS。

## Known issues, important decisions and next expected step

主屏65吋／HDMI、觀看約4米、兩部iPad及Mac mini M6是使用者預計配置；兩部iPad直接接收主機畫面已確認，型號未定。輸出軟件／接線及雙路觸控、主屏解析度、實際主機／GPU、現場試用者、長跑門檻與復原政策待確認。下一步cc100053提供輸出方案及可測硬件，現場操作人先驗D0，再按D1–D10記錄；Codex依實測完成必要修正與驗證。P5及S5維持未完成。
