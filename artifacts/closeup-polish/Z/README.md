# Z 全城回歸 — REVIEW_READY

Owner `01a183af-1ca0-7190-a25c-b31a6db4fd98`；dispatch `closeup-polish-Z-1-r21`，同owner恢復 `closeup-polish-Z-recover-r23`。接手 clean feature `4a3ad9f`，runtime `44521a0`；src/tests/package保持byte-identical，沒有改美術、pose、門檻、protocol或時間線。A–D美術仍待owner接受，未merge main。

[98態S0／sector-last／Z三欄原圖及逐項理由](REVIEW.md) · [完整JSON](report.json) · [checks](checks.json) · [環境與限制](environment.json) · [原圖hash](original-images.json) · [cleanup](cleanup.json)

## 完整證據

- 原S0矩陣98態、1920×1080/DPR1/default、hour12/22、reviewTime20；每態兩次fresh navigation，JPEG90，固定採第二take，196 originals全保留。98張final逐張original detail檢視；另檢視20張行為原圖，見[清單](behavior-images-reviewed.json)。Z共222 originals（196靜態、10 live、12 formal、4 smoke），S0/A/B/C/D原957張hash重驗不變。
- [28組雙窗uncapped](current/performance.json)：雙flags、載入至少16s、兩個至少5s rAF窗；全部raw intervals／shadow calls保留。[96組原A4](current/comparison.json)保留6%／12%門檻。
- [202組snapshot比較](snapshot-comparisons.json)：98個S0、96個sector-last shot及8個A–D hero；完整畫面／完整subject投影union的RGB MAD及framing/hit/FPS/calls數值差。跨pose像素差只描述畫面變化，不替代A4或孤立美術效益。
- [URL／pose／原圖及source核對](recovery.json)、report assert和self-check核對當前SHOTS/hero、全部選項與take，錯shot／pose會被拒絕。

## 原門檻結果

| Gate | 結果 |
| --- | --- |
| A1 | 84 PASS／2 FAIL／12 N/A |
| A2 | 68 PASS／18 FAIL／12 N/A |
| A3 | 86 FAIL／12 N/A |
| A4 | 9/96 PASS |
| A5 每態 | 71 PASS／27 FAIL（包括該shot uncapped參考、vsync及同態instant calls） |
| A5 canonical效能組 | 22 PASS／6 FAIL |
| A6 | 98 PASS |
| 重複截圖一致性 | 47 PASS／51 FAIL，固定採第二take，沒有重拍換走失敗 |

V1 42 FAIL、V2 6 FAIL、V3全98 FAIL、V4全98 PASS；V5只計hour22：28 PASS／16 FAIL，日景及缺席共54 N/A；V6 82 STATIC PASS／6 FAIL／10 N/A。V1屬session判斷而非真人兩秒測試；STATIC PASS不證明全時間無閃爍。SW focal前景柱及定位退步、綠化／設施身份／夜間缺口與NW hybrid接合問題均保留。

[A3原因](occlusion-causes.json)有86可投影rows／774點：56中主體，276穿過world-AABB空隙、310未入world-AABB、70前景、62內部其他幾何（有歧義）。不把全部miss稱前景遮擋，不填空隙或縮細主體。

Uncapped mean 89.232–135.208 FPS，capped診斷59.8–60.3。六個canonical FAIL：NW focal日、NE focal夜、SW focal日夜、SE district日夜。NE夜819/1190、SW夜822/1193 raw calls不剔除；確切S0比率／門檻差見report。S0 Chrome156.0.8078.48、Z .73；含累積A/B/C/D與未控制的機器背景／熱狀態，不把升幅稱單一sector優化。

## 行為與程式驗證

[最終root test](final-checks/npm-test.log)／[build](final-checks/npm-build.log)／[diff](final-checks/diff-check.log) PASS，保留JSON import與chunk-size warnings。108權威/wire/model組合、324能源district/history/receiver cases／177867 exact checks通過；capture／report／live／snapshot及known-ray自檢PASS。Survey source未改，只為fixture build其現有dist；survey/module-swap未另跑獨立package suites。

[Current-v4 scratch live retry1](live-retry1/browser.json) complete、16項PASS、errors0：A第一水庭、B共享席、C功能塔、D服務館的真實提案headline／卡地點、過渡中間geometry/fade、正常return、四focal與energy權威counts、reload snapshot、Undo即時hero與完整前態、reduced motion零district pulse。使用`createSurveyServer({devAuto:true})`及fresh SQLite／動態loopback，與dev:auto相同隔離；提案走真實HTTP，未操作auto-answer panel。Current-v4 Q3不改環境Meter，所以A以第一水庭核對，不虛報NE park live。精確3s靠root node suite，120-frame browser診斷只證實中間態。

[首輪live失敗](live/browser.json)及[log](live.log)保留：A四項PASS後，B初始layout沒有能源歷史而省略energy欄位；fixture錯比較undefined與renderer正確空配置。只改fixture沿用shared `emptyEnergyConfiguration()`，新增缺欄及stale-count自檢，保留所有完整counts/deep equality，fresh目錄重跑。未改runtime。

[Headline-aware正式E4](formal/browser.json)14項情境PASS：舊schema／v3草稿升級、native四選項與review、pre/post-commit同ID retry、首次維持／第二次模型、Undo、mixed日黃昏夜、TCP reconnect、reduced motion、桌面resize/reset、舊retry。刻意失敗請求／預期409與favicon404完整保留，page exceptions0；fixture有11s／16s clock jumps，不作訪客時間證據。沿用S0接受的`artifacts/closeup-polish/formal.mjs`，沒有實作獨立F1正式runner修正或N1。

[DEV smoke](dev-smoke/smoke.json)3項／[production smoke](production-smoke/smoke.json)2項PASS，errors0；live headline／reload、DEV量度不改pose或GPU resource counts、production globals undefined與[production bundle排除](production-check.json)均驗。

## 恢復、清場與下一步

初始sandbox DNS／npm test loopback EPERM及成功retry logs保留。實際provider limit之後，同一owned background程序完成28perf／96A4；恢復fetch成功、source/原圖/URL/pose重驗，未重跑完成樣本。完整量測checkpoint `f2572e8`已push／remote0/0；最終evidence SHA／remote可取性／writer release由checkout外`result-Z-1.json`記錄。共享state只由coordinator更新。

[Cleanup](cleanup.json)核對cwd/命令後關閉Vite43568／preview70383；5194/5195及記錄到的7個scratch ports均bind free，owned Chrome／runner／SQLite清場。所有owned temp roots已移除；unchanged smoke runner未記錄其ephemeral port，依exit/finally及temp清場驗證，不虛報該port bind。

只驗開發Mac Chrome、桌面1920×1080/DPR1/default；展示機、Safari/iPad／Windows、實體HDMI、長跑、真人兩秒辨識及完整動態閃爍未驗。下一步由coordinator獨立review本批證據，再交owner決定A/B/C/D接受／部分接受／棄用及A3/A4政策；本批不追加美術輪次、不merge main、不部署。

最終產生報告時的[whitespace失敗](final-checks/generated-markdown-diff-failure.json)亦保留：generator在reference links後加尾空白，且提交shell未在失敗時停止，80f3adc已push；後續fix-forward改成join並加入輸出assert，stage產生檔後重驗working/index及整條feature diff。數值／原圖／runtime不變，沒有重寫共享歷史。
