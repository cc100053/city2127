# 2127 展覽規格 — Odaiba

現行規格，核對日期：2026-10-02；Owner：cc100053，文件整理：Codex。操作入口見 [README](../README.md)，程式責任見 [PROJECT](PROJECT.md)，驗證方法與證據見 [VALIDATION](VALIDATION.md)。

## 場地與決策

- 展覽唯一城市是 **2127 年 Odaiba／台場海濱**，根目錄 `src/` 是目標城市。
- **Shibuya 已結束，未來不再做**（使用者確認，2026-10-02）。不保留場地切換，不將舊 Plan 01／02 的未完成項目列為後續工作。舊模型、內部識別碼與 Git／文件證據可保留；它們不代表場地或任務仍有效。
- 2127 是固定時代。四個 Meter 的 low、mixed、high 都是成熟未來；低值不能代表舊時代、空城、缺乏技術或未開發。
- Desktop presentation only；不加入 mobile／responsive 驗收。普通 renderer resize 保留。
- 未來身份、可讀的選擇效果及城市延續性優先。行人、車、drones、空中航線已獲允許。
- 現行視覺方向是 [CITY MASTER TASTE](ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md)；材質及動畫實作規則見 [ART](ART.md)。Shibuya／Pic 2 只作歷史來源。

## 提案與共同城市

### 居民敘事與畫面分工（2026-10-02）

觀眾是 **2127 年台場的一位居民**；四題表達生活偏好，城市呈現居民累積想法與近期聲音形成的生活配置。輸入裝置暫定 iPad，負責問題、選擇、核對及操作提示；共享大屏幕負責城市背景、設施與結果解說。年份固定，畫面濃縮呈現城市回應生活需求的過程。

[居民文案 P1](RESIDENT_COPY.md) 已完成，尚未接入 runtime。現有 Guest 結果表與 root 數值 feedback 仍在；P2 才實作畫面分工。建議每位居民 10 秒的大屏幕展示屬 P3 後續方案，未取代現行 A/B ≥3 秒間隔。文案不改四軸算法、ids 或 effects；個人選擇不能被描述成單獨決定城市，結果須對應實際變化。交接見 [resident-copy-p1](handoffs/resident-copy-p1.md)。

每位觀眾回答同一組四題，核對後提交**一份完整提案**。四題沒有逐題改城；下一位繼承累積結果。問題／option ids 與 effects 由 [正式 JSON](../survey/src/survey/questions.exhibition.json) 定義；保留日文產品文案。

| 問題 id | Meter | 主 site（內部 socket） | low → mixed → high |
| --- | --- | --- | --- |
| `service-2127` | automation | デックス西（nw） | 人員主導 → 人機協作 → 自律服務 |
| `commons-2127` | publicSharing | アクアシティ南（sw） | 私密空間 → 混合庭院 → 開放共享 |
| `cooling-2127` | environmentalPriority | お台場海浜公園（ne） | 主動冷卻 → 協同氣候庭院 → 樹冠／植栽 |
| `functions-2127` | urbanConcentration | フジテレビ東（se） | 分散機能艙 → 混合館 → 垂直集中 |

## 累積與權威 layout

每軸每份提案只有一票 `v ∈ {-1,0,+1}`。對第 n 份提案：`Sₙ=Sₙ₋₁+v`、`Rₙ=.75Rₙ₋₁+.25v`、`Mₙ=clamp(6(Sₙ/n+Rₙ),-12,12)`。新 run 的 S／R／M 全部零；中性票亦會更新近期記憶，不能略過。只在 server 計算；replay 與 live 使用同一 reducer：[scoreEngine](../survey/src/survey/scoreEngine.ts)。

`low: M≤−3`，`mixed: −3<M<3`，`high: M≥3`；`t=(M+12)/24`。Server 的 [deriveExhibitionLayout](../survey/src/shared/cityView.ts) 是唯一權威映射：

| 參數 | 公式 | M=0 |
| --- | --- | --- |
| automatedPorts | round(6t) | 3 |
| sharedSeats | round(8t) | 4 |
| treeCount | 3+round(9t) | 8 |
| plantedFraction | .2+.6t | .5 |
| coolingFins | round(6(1−t)) | 3 |
| functionModules | 2+round(4t) | 4 |

全部 round 用 JavaScript `Math.round`。機能單元不是人口或等容量承諾；不能在實作中暗改算法。Root v2 不將 Meter 混入全城天空／氣氛。

## 城市可見變化

四個 site 是視覺焦點，**Meter 已可影響整個 district**（2026-10-01 決策，P0–P12 已整合）；不再受原 MVP「只改四地塊」限制。

- Automation：服務亭／自律端口、步道人數、guideway pods、空中 fleet、服務 quadrotors。
- Sharing：六座 water rooms、十個內陸庭院的私密／混合／共享形態，以及符合條件的廣場人群。
- Environment：promenade sails／pergolas、冷卻塔、屋頂 cover、立面氣候層。
- Concentration：低層 pods／中間高度／十座塔、sky lobbies 與連橋。
- Mixed 有自己的 hybrid 組合；跨 Meter 條件產生配對設施；完整 active run 的投票次序推導四軸 `slotSeeds`，相同分數可保留不同槽位分布。最新 64 份顯示 history 不截斷 seed 來源。

Live 使用可重新定向的 **3 秒**過渡；pulse 只標示真的 live 變化。Snapshot、reset、Undo、reconnect、reduced motion 直接恢復權威狀態，清除排隊及 pulse。重複事件不重播。配對、counts、固定 footprint 及限制見 [Meter handoff](handoffs/meter-variety.md)。

## Guest、單站與 A/B

流程：Start → 四題 → review → submit → result 10 秒 → handoff 5 秒 → Start。未知提交結果用同一 submission ID 重試；不新建一票猜測成功。

| 模式 | 開始／交接 | Reset |
| --- | --- | --- |
| 單站 `/guest` | 下一位 Start 自動結束已提交體驗，毋須 Admin 確認離場 | 保留中的 reset 在下一位 Start 套用；Admin 可中止未完成問卷 |
| `/guest?station=A`／`B` | 獨立 session／草稿／結果；同一站一個體驗。不能混用活躍單站與 A/B | 停止新開始，等兩站問卷及結果／交接排出；Admin 中止必須指定一個未完成 session |

A/B 按 server transaction 提交順序累積，容許舊 city revision、拒絕未來 revision；單站仍要求完全一致。City 顯示起點相隔至少 3 秒；Guest 排隊顯示已保存／等待展示，再顯示自己的結果。問卷 5 分鐘期限、已提交 result lease（展示開始後 15 秒）釋放離線站；重連直接恢復最新完整城市，不重播漏掉的過渡。

## Admin、資料與照明

Admin 只限 server 電腦 loopback，POST 另檢查 same-origin。City reset 開新城市、保留總人數；full reset 清零展示計數但保留 append-only 歷史。保留中的 reset 可取消。Undo 只可撤銷最後一份已完成提案、且下一位開始前；新草稿即使稍後取消亦不重開舊 Undo。保存不可變撤銷標記，還原提交前狀態／counts／seeds。

目前 SQLite **schema 7**、algorithm／CityView **v2**；schema 3 轉換曾結束 v1 run 並保留歷史，schema 7 保留現有 v2 城市及歷史。重啟使用原 SQLite，不刪資料。Root／survey 配合更新，尤其 slotSeeds。`module-swap` 只接受 legacy v1，不是展覽城市。

Admin Day／Night／Auto 保存為獨立 display setting：12:00／22:00／180 秒日循環。Reset 不改照明；City `?hour` 優先。多 viewer 的 Auto 時鐘不作跨裝置同步。

## 開發工具與待完成驗收

在 `survey/` 執行 `npm run dev:auto`提供 fresh scratch DB 及 localhost `/guest?dev-auto`；Meter tests 可重用。DEV-ONLY panel／endpoint／launcher 須在展覽前移除或另行安排；普通 Guest 自動交接規則不因移走開發工具而回復舊 staff-exit lock。詳見 [survey guide](../survey/README.md)。

**S5／Odaiba P6 尚待展覽驗收**：完整 Guest → City 流程、實際輸入 hardware、展覽日 reset／recovery 政策與長時間穩定性。既有 stage checks／CI／Mac 測量分別見 [VALIDATION](VALIDATION.md)，不等於 S5 已通過。尚未達成的 Dream Loop target 亦不能因程式已整合而宣稱視覺目標通過。

## 已完成階段與歷史

| 階段 | 結果／證據 |
| --- | --- |
| S1–S4 | [S1](handoffs/exhibition-s1.md)、[S2](handoffs/exhibition-s2.md)、[S3](handoffs/exhibition-s3.md)、[S4](handoffs/exhibition-s4.md)：分開保留當時實作及驗收 |
| Lifecycle、display、Undo、A/B | [lifecycle](handoffs/exhibition-lifecycle.md)、[day/night](handoffs/admin-day-night.md)、[Undo](handoffs/admin-undo.md)、[雙站](handoffs/two-guest-devices.md) |
| Odaiba 換場 | [P0–P5 transition record](ODAIBA_VENUE_TRANSITION.md)，整合 `e6c7966` |
| Odaiba art／district | [art](handoffs/odaiba-art-direction-01.md)、[Dream Loop](handoffs/odaiba-dream-loop.md)、[district](handoffs/odaiba-district.md) |
| Meter variety | [P0–P12](handoffs/meter-variety.md)，整合 `e7afbee`，published main `68b669a` |

原 MVP 規劃存於 [歷史快照](history/EXHIBITION_MVP.md)；其中 Shibuya、single-only、site-only 與待實作文字已被以上決策取代。後續任務只從本規格及現行 handoff 建立。
