# E5 — Mac mini 本機驗收

2026-10-24（Asia/Tokyo）。Owner：Codex。使用者本輪指定「test this mac mini only」。本輪範圍是目前主機的性能與本機操作，不將結果代替65吋HDMI、iPad Safari、專用LAN或真人訪談。

## 可重跑方法

先按[啟動流程](../../README.md#展覽啟動mac--windows) build survey，再開root loopback Vite；不用展覽SQLite。沿用已安裝Chrome與Playwright，不新增dependency：

```sh
node tests/energyE5.browser.mjs --self-test
CITY2127_PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.mjs \
CITY2127_CHECKED_COMMIT=$(git rev-parse HEAD) \
CITY2127_EVIDENCE_DIR=artifacts/energy-city-e5/new-run \
node tests/energyE5.browser.mjs
```

預設City `http://127.0.0.1:5173`；可用`CITY2127_CITY_URL`改成實際Vite URL。預設比較每種60秒、長跑30分鐘；可用`CITY2127_COMPARE_SECONDS`（≥5）及`CITY2127_SOAK_MINUTES`（≥1）改時長，報告記實際值。證據必須用新目錄，不覆寫本輪。script自建scratch SQLite／loopback server及headed Chrome，finally關閉並清理scratch；外部Vite由啟動人停止。

量測順序：空白權威城市default／low，各排除15秒warm-up；以真實HTTP提交16份四類各4能源提案，各保留真實10秒閱讀；混合權威城市default／low（三個現行Meter均選中間答案）；low畫質自動日夜長跑，兩個桌面Guest A/B每40秒各完成一份原生四題／核對／提交；最後City實際browser offline三秒、重連及reload。沒有clock jump、DEV energy預設或展覽DB。

每5秒保存rAF interval統計、既有120-frame FPS、draw calls、triangles、geometry／texture counts、canvas CSS／buffer、actor time、時刻、能源target、JS heap、DOM nodes及測試server RSS。rAF interval是browser cadence，並非GPU timer／scanout；draw／triangle包含composer各passes，並非唯一mesh面數。JS heap不是整個Chrome／GPU記憶體；RSS屬同程序survey server及測試runner。未強制GC，不能單憑heap波動判定洩漏。沒有涵蓋所有Meter／能源極值、4K或整個展日；`pmset -g therm`首次sandbox查詢失敗；允許host讀取後回報沒有已記錄的thermal／performance warning或CPU power status（[原文](mac-mini/thermal.txt)），仍沒有溫度／頻率追蹤或未降頻證據。截圖在每phase量測後才拍；保存每5秒統計與整段彙總，沒有保存逐幀interval清單。

## 本輪實測

環境：Mac mini `Mac18,5`、Apple M6（12 CPU／12 GPU cores）、24 GB、macOS27.0.1（26A434）、Node26.0.0、已安裝Google Chrome156.0.8078.47 **headed**、WebGL2／ANGLE Metal Apple M6。City CSS及drawing buffer均1920×1080、DPR1；Guest A/B各1280×900。Vite DEV、同機三個browser windows、loopback及scratch SQLite，沒有專用GPU隔離／頻率控制。

主要run：2026-10-24 **14:18:08–14:58:19 JST**，其中長跑1801.94秒（30分1.94秒）。基準是`66c6adf`加main兩個diagnostic欄位；[browser.json](mac-mini/browser.json)保存完整source hashes、GPU、環境與結果，[samples.ndjson](mac-mini/samples.ndjson)保存逐5秒樣本；[當時runner原文](mac-mini/runner-at-run.mjs.txt)的SHA-256與報告一致。main／energyRuntime／energyPrototype hash另與實際source核對。

| 場景／quality | 量測秒數 | 全段FPS | p95／p99間隔 ms | 最長間隔 ms | 量測後截圖 |
| --- | ---: | ---: | --- | ---: | --- |
| 空白權威城市／default | 60.13 | 31.10 | 34.1／34.4 | 50.1 | [圖](mac-mini/baseline-default.png) |
| 空白權威城市／low | 60.09 | 59.94 | 17.6／17.7 | 17.8 | [圖](mac-mini/baseline-low.png) |
| 四類共存／default | 60.13 | 32.36 | 34.5／35.3 | 50.7 | [圖](mac-mini/mixed-default.png) |
| 四類共存／low | 60.08 | 59.94 | 17.6／17.7 | 17.8 | [圖](mac-mini/mixed-low.png) |
| low、自動日夜＋A/B UI長跑 | 1801.94 | 59.94 | 17.9／18.6 | 66.7 | [圖](mac-mini/soak-low-auto.png) |

**鏡頭限制：**每次load由程式hero起始，但本輪OrbitControls未鎖定／未記錄camera軌跡；實際截圖顯示部分phase已改變視角／距離，輸入來源未確定。因此這是所測視角與互動負載下的性能，不是完全固定鏡頭的A/B benchmark，不能據此計算能源模型的額外GPU成本；default31–32 FPS亦不保證所有視角相同。未固定actor clock；自動日夜樣本hour涵蓋0.01–23.88，約10個180秒週期。

長跑共108,008 frames、每5秒讀取的120幀renderer FPS範圍59.8–60.1，首／末12個renderer FPS樣本均值59.908／59.933 FPS；沒有>100ms間隔。16份HTTP種子提案後，A/B每40秒各走完四題／核對／提交，90份UI提案＋16種子＝106份，server最終guestCount106，每對server displayAt相隔10,000ms。正式能源配置保持獨立累積；主Meter採中間答案，未覆蓋全部極值。

Renderer geometry／texture counts全段425／24；draw calls345–471、triangles7,729,862–8,079,009（composer全passes）。City JS heap19.2–51.8 MiB，首41.3／末35.5 MiB；DOM nodes110–550，末150；server＋runner RSS65.4–110.9 MiB，末103.4 MiB。這些是量測值，不證明全Chrome／VRAM沒有洩漏。

主要run `PASS_LOCAL_CHECKS`：page crash／exception／context loss均0；捕獲的3個console訊息均favicon404，沒有其他captured warnings、badResponses或failedRequests。主要run的browser offline／reload只核對恢復後count；**不單憑它宣稱TCP曾斷開**。另輪真實TCP及能源target復原檢查記錄於下方，未覆寫原始run。30分鐘是本輪Mac穩定性基線，沒有設定或批准整日展覽FPS門檻。

### TCP復原與runner驗證

[獨立補驗report](recovery-check/browser.json)／[逐筆資料](recovery-check/samples.ndjson)／[當時runner](recovery-check/runner-at-run.mjs.txt)：16 seed＋4 UI＝20份；切斷真正City socket並offline3秒，server觀察到City connection由5增至6，count20及能源target（水庭1／small翼／環／島）恢復，reload亦恢復。page exception／context loss0；捕獲2個favicon404及2個刻意offline期間的ERR_INTERNET_DISCONNECTED，沒有其他captured failures。這輪比較僅5秒／soak約1分鐘，用作runner與TCP驗證，不代替主長跑數據。

最終runner保護既有證據目錄，seed紀錄使用API的`proposal.id`，並在測試City canvas停用pointer events，避免外部指標輸入改鏡頭；只限測試頁面，正式城市仍可orbit。使用最終runner原文中的init做真實Chrome測試，確認pointer-events:none且drag／wheel後render clock繼續、無page exception（[機器紀錄](pointer-check.json)／[截圖](pointer-locked.png)）；未再重跑第三輪30分鐘。舊兩輪raw row.fps是每120幀renderer FPS（每5秒讀取），phase.fps及p95／p99則用全部rAF；最終runner將row.rendererFps與row.fps分開命名，沒有改寫原始採樣紀錄或城市runtime。主要run未輸出seed IDs（舊runner誤讀`submissionId`）；實際HTTP request依原文為`e5-seed-0`至`e5-seed-15`，count／能源counts及時間仍可核對。

## 之後的實際展覽驗收

本輪沒有要求新增硬件；[P5 D0–D10與訪談表](../../docs/handoffs/resident-experience-p5.md)及[LAN接線步驟](../../docs/handoffs/lan-guest-stations.md)保留。待owner另行指定實機／人員，沿用正式Q3測試：

1. 記錄完整commit、主機／GPU／OS／browser、屏幕解析度／refresh rate、viewport／DPR／quality、iPad／Safari／router及實際觀看距離；用新scratch DB彩排。
2. 先D0接駁，再D1–D9：四題／修改／提交、單站與A/B排程、睡眠／斷網／未知保存同ID重試、reset drain／取消／Undo、同DB重啟；每項附日期、操作人、submission及證據。保留各自閱讀10秒。
3. 約4米站位，記錄能否找到站號／編號／實際設施，在真正10秒內讀完結果；對「改變」及「配置維持」各留案例。
4. 訪談先記原話：「あなたはどんな立場でしたか？」「どんな毎日を大切にして選びましたか？」「街はどうなりましたか？なぜ？」再追問Q3選擇如何影響生活。觀察有否將一票當全城決定、儲能當憑空發電、累積人數當人口或low當落後；沒有答訪談就不判通過。
5. Owner先確認實際開場連續時長、負載及可接受FPS／停頓／理解門檻，再按同一方法做整段展日長跑及復原演練。30分鐘本機基線不能代替整日穩定性。

E5整體完成須真正補齊相關硬件、全日運行與訪客驗收；本輪Mac限定工作完成不自動關閉E5／P5／S5。
