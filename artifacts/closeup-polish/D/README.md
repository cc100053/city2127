# Sector D — REVIEW_READY，art未接受

Owner worker `01a18154-a9bd-7ca2-a776-9a2834a519da`，dispatch `closeup-polish-D-1-r18`。實際base `3bb99ce2485aeb4b816e2ef21f8b74fb42328b08`，最終runtime `44521a0d63aae904c306a19c4baac52a44b62a87`。唯一source clone及feature branch保持；沒有merge main或部署，A/B/C pending不變。最終feature SHA／remote狀態見worker result-D-1.json。

[逐狀態S0／final並排報告](REVIEW.md)、[完整數據](report.json)、[檢查](checks.json)、[50張final逐圖理由](visual-review.json)、[275張原圖hash](original-images.json)、[保留核對](original-preservation.json)、[清場](cleanup.json)。所有門檻及full root/carrier/group定義保持。

| Shot | Rounds | Final A4 | Final shot FPS h12 / h22 | Raw calls h12 / h22 |
| --- | --- | --- | --- | --- |
| NW focal | 3 | 2/6 | 79.776 / 85.651 | 959,959 / 959,1335 |
| NW district | 3 | 0/14 | 90.680 / 90.371 | 875,875 / 875,875 |
| Second garden | 2 | 1/6 | 103.248 / 102.531 | 483,483 / 483,483 |
| Receiver wing | 3 | 0/8 | 131.552 / 130.393 | 378,604 / 378,378 |
| Energy island | 2 | 1/6 | 104.985 / 103.747 | 465,465 / 465,465 |

13完整rounds、134狀態、268靜態原圖＋7 live原圖（含首輪失敗2張）。Final50 rows：A1 34PASS／16N/A；A2 24PASS／10FAIL／16N/A；A3 34FAIL／16N/A；A4 4/40；A5 36PASS／10FAIL／4UNVERIFIED；A6 50PASS。Repro21PASS／29FAIL均保留第二take。V1 22FAIL、V3全50FAIL、V5四項FAIL、V6八項FAIL；其餘V6只屬靜態檢視。建議暫不接受D美術，留owner在Z後審查。

Hub保留六槽／controller／GLB cache，加 recessed service faces、窗框及上層稀疏接點；district在原露台／停機盤加支承欄邊及接點，只降低局部陶瓷emission。第二水庭在clone後重用既有西庭支架邊燈，receiver局部啞面與板框操作邊、島甲板貼地操作邊皆用既有batch；能源保持49 batches。第一水庭、C環、distribution、權威counts／slots／footprints、三秒retarget、60秒cycle、hero／FOV42／timeline皆由scope／root tests保護。Wing最後恢復S0 pose，島保留S0相機只將target x−60→−70避卡片；其他D鏡位數值見source。沒有新依賴／GLB／全城改樹或光照。

Focal r3比r2 A3 4/9→3/9、day FPS83.838→79.776退步，不建議接受。Wing r2新pose的98.14/99.70FPS及505calls退步完整保留；最後r3用同builder重測S0 pose，FPS恢復但raw604使日景平均491calls仍超S0 378的110%，A4亦降至0/8；不過濾或做第四輪。Garden2／island停在2≤3是局部燈邊／構圖修正完成；不填中空、不捏造a/mixed或c/mixed不同本體，也不以無實作變更的重跑換走失敗。

原98狀態矩陣不變。NW自身只讀tiers.nw；其高自動化會啟用SE docks，四個額外NW-view配對明確標記。缺同狀態S0 image/draw基準，A5維持UNVERIFIED，不能把partner變化當隔離D局部差異。每shot的final是其最後一輪當時source snapshot；後續細節可改背景，不能當全D當前矩陣，Z另做。Source hashes／scoped block／final pose核對保留。

Root npm test/build/diff、capture/report/round self-check及scope PASS：108權威→wire→models組合、324清場cases／177867 exact checks。[真實current-v4 scratch live](live-retry1/browser.json) complete、23項PASS、errors0：五shot hold、六槽／district中間態、三類energy fade、reload／Undo／reduced motion；精確三秒靠node tests，browser120-frame診斷不作3.000秒精度宣稱。[7張live原圖審閱](live-review.json)。

首個sandbox Chrome launch及root test listen EPERM保存後獲准retry；service-face ray首測命中既有sign邊界的log保留。首輪live在Undo後以未變的targetAutomation等候，讀到舊120-frame counts而失敗；[原log](live-attempt1.log.txt)、[不完整結果](live/browser.json)、[原圖hash](live-failed-originals.json)完整保留。只改fixture wait去等原staff/drone/hybrid/pulse counts，再作完整deep equality，fresh目錄重跑23PASS；runtime無改。

開發Mac Chrome156.0.8078.73（S0 .48），1920×1080/DPR1/default。數字包含累積A/B/C/D，不宣稱隔離D提速。Garden2 r2初段capped capture與root test重疊，獨立uncapped前suite已結束；保留原rows，不作idle-machine宣稱。Raw shadow samples皆保留。Vite5194及五個scratch ports bind確認free，owned Chrome／runner／SQLite關閉；未動其他process。未測展示機、production、Safari/iPad、Windows、真人兩秒或Z。Dream-loop未使用，局部目標來自ART/mastertaste及原圖。
