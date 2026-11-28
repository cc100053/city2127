# Mind craft― 選択の積み重ねでつくる都市 ―

展覽規格，核對日期：2026-11-24；Owner：cc100053，文件整理：Codex。操作入口見 [README](../README.md)，程式責任見 [PROJECT](PROJECT.md)，驗證方法與證據見 [VALIDATION](VALIDATION.md)。

## 正式作品名與介紹（2026-11-23）

- **作品名**　Mind craft
- **副題**　選択の積み重ねでつくる都市
- **日文讀法**　マインドクラフト

> 「マイン」ではなく「マインド」クラフト
>
> この町お台場の未来をあなたの選択で変えていこう！100年後の街は個人が決める！

每位觀眾以 2127 年台場住民嘅身份答九題中嘅四題。畫面聚焦其中一個選擇，最多切換一處設施。四個答案都按題集計，下一位觀眾繼承當刻嘅城市。現行細節見下方[抽題輪換](#抽題輪換唯一現行版本)。

## 場地與決策

- 展覽地點係 **2127 年 Odaiba／台場海濱**，用桌面大屏幕同 iPad。展示城市由根目錄 Three.js 場景提供。
- 每個 A／B／C 選項都代表成熟嘅 2127 年生活。行人、車、水上交通、無人機同分層空中航線屬同一個城市背景。
- [CITY MASTER TASTE](ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) 記錄世界觀同畫面方向，[ART](ART.md) 記錄美術實作。[直立環形巨構](handoffs/ring-glb-pilot.md)、[階梯巨構](handoffs/hull-facade.md) 同 [Fuji TV](handoffs/fuji-civic-facade.md) 嘅設計輪次同驗收以各自交接為準。
- 九題抽題輪換係唯一現行展覽版本。[舊四題／Meter 規格及設計輪次](history/EXHIBITION_SPEC_2026-11-24.md)同 [Shibuya Plan 01](history/SHIBUYA.md)保留作歷史。

## 抽題輪換（唯一現行版本）

2026-11-18 批准，2026-11-20 接入城市，2026-11-21 定為唯一展覽版本。模型進度見 [輪換模型及地塊](QUESTION_ROTATION_PLAN.md)，審查決定見 [SURVEY_V2_REVIEW](planning-team/SURVEY_V2_REVIEW.md#決定記録)。

- **題目：** 以 [SURVEY_V2](planning-team/SURVEY_V2.md) 衍生現行 [九題題組](../survey/src/survey/questions.rotation.v1.json)。九題包括 Q04 全部參與輪換，題組文案仍標示為暫定。
- **抽題：** 每位訪客答 4 題，從九題中選最久未變的 4 題，平手按題目固定次序。抽中的題目於預約時決定並保存。A/B 雙站各自抽題，可以抽中相同問題。
- **變化：** 每份提案最多切換一個模型。在答案與目前選項不同的題目中，選最久未變的一題，直接換成所選選項的模型；優先略過本訪客預約之後已被另一站換過的題。選項不作 −1/0/+1 排序。城市狀態由有效提案依次重算，Undo、snapshot、重新連線同樣重算。
- **群眾比例：** 本 run 每題各自統計同一選項嘅百分比，包含觀眾本人。手勢版 iPad 交接頁有四張聲音卡，游標停留或觸控按住邊張，就揭示邊題嘅比例。大屏幕結果卡已移除比例（owner 2026-11-23）。程式暫定每題至少 10 份回答，低於門檻顯示「まだ集まり始めたところです」。
- **保底：** 冇可見變化時，鏡頭探訪抽中題目中已顯示觀眾所選模型嘅地塊，沿用模型已有嘅動態。冇可探訪地塊時，鏡頭轉到構想地展示「構想中」。未有模型同空置換空置同樣用呢個流程。
- **地塊與道路：** 三個模型地形相近者同地輪換；地形不同者（Q02）各有地塊，未輪到時顯示空置態。道路網固定，每塊地塊有固定支路及入口平台，模型主入口必須落在平台上，前庭細節隨模型更換。Q06 地塊由道路 ③ 接駁，北、東兩側的入口鋪面與支路在 A／C 空置時保留。Q08 地塊由道路 ④ 的過街位接駁，兩條地軌的共用平台及大堂步道在 A／B 空置時保留。
- **資產歸屬：** Q01＝AUTO HUB 三態；Q02＝水の棚田（A，由固定背景改為隨投票）／蓮花受電（B）／受電テラス農園（C）；Q03-A＝車抽屜住宅；Q06-B＝蛋艙塔；Q08-C＝SW 活動模組棚。SE 塔與 pod、SW COMMONS、district 舞台不再隨投票，轉為固定背景。水庭、儲能環、核能島及離岸受電翼亦不再隨投票，逐件保留為背景或刪除**未定**，未得 owner 對該件同意前不刪除。
- **上線配置（owner 2026-11-18）：** 未有模型的選項地塊暫時留空，模型完成後補上。survey 端已可用（`SURVEY_QUESTIONS` 選用，見 [PROJECT](PROJECT.md)），城市端已顯示輪換模型（2026-11-20）。注意：survey server 嘅預設題組檔（`SURVEY_QUESTIONS`）仍然係 version4 嘅 `questions.exhibition.json`，要用 `questions.rotation.v1.json` 開 run；改預設屬另一個 code 任務。

## 大屏幕同展示時序

City 先播約 2.62 秒投票旅程，再推近約 2 秒、停定約 0.5 秒。一般模型過場由 5.12 秒起播 3 秒，活動模組棚沿用 5 秒序列。近鏡喺 13–15 秒返回主鏡。大屏幕解說所選生活偏好同實際變化，iPad 交接頁提供每題比例。

Snapshot、reset、Undo 同重連即時恢復保存狀態。減少動態模式用即時畫面。輪換結果維持全城氣氛及固定嘅 mixed 街區背景，Q01 沿用 NW 三個焦點模型。其他地塊見 [輪換模型及地塊](QUESTION_ROTATION_PLAN.md)。

## Guest、單站與 A/B

兩款 Guest 介面共用流程，由開始、四題、核對到一次提交，然後按順序顯示 13 秒結果，再交接。普通 `/guest` 提供觸控，交接頁嘅地標導覽邀請維持 20 秒。未知提交結果沿用同一 submission ID 重試。大屏幕近鏡標示該筆「暮らしの声」編號；輪換結果於投票光球落地時，結果卡標題改為觀眾所選選項原文（加「」），近鏡浮標亦由鏡頭飛入起顯示「暮らしの声 #N ｜ 選項」，使 iPad 上的選擇與建築變化之因果一目了然（2026-11-28）。

| 模式 | 開始／交接 | Reset |
| --- | --- | --- |
| 單站 `/guest` | 下一位 Start 自動結束已提交體驗，毋須 Admin 確認離場 | 保留中的 reset 在下一位 Start 套用；Admin 可中止未完成問卷 |
| `/guest?station=A`／`B` | 獨立 session／草稿／結果；同一站一個體驗。不能混用活躍單站與 A/B | 停止新開始，等兩站問卷及結果／交接排出；Admin 中止必須指定一個未完成 session |

A/B 按 server transaction 提交順序累積，容許舊 city revision、拒絕未來 revision；單站仍要求完全一致。單站／A-B City 顯示起點相隔至少 13 秒，城市動畫保持3秒；Guest 排隊顯示已保存／等待展示，再顯示自己的結果。提前Guest交接不截斷已排定展示；server 拒絕喺 13 秒閱讀結束前 release／下一單站 Start，reset遵守drain。問卷5分鐘期限、已提交result lease固定於展示開始後 18 秒釋放離線站；同ID retry／reload只接續剩餘時段，不延長lease；重連／斷線／過期late事件／reduced motion直接恢復最新完整城市並清掉舊字幕timer，不重播漏掉的過渡。`displayWaitMs`／`displayAt`只表示排程，不確認viewer在線或播放；不新增viewer-ack服務。

### iPad「住民の窓」

2026-11-23 整合到 main。iPad Safari 由可信 HTTPS 網址開 `/guest?hand`，雙站加 `station=A` 或 `station=B`。張開手掌控制游標，拇指與食指捏合揀選。握拳或放低手會休止。全程可觸控，相機或辨識失敗時會提示切換觸控。啟動步驟見 [survey 指引](../survey/README.md#ipad住民の窓與手勢操作)。

1. **住民登録。** 手掌掃描約 4 秒，等光環釋放後捏合登錄，短暫顯示住民番号。「タッチで始める」可以直接開始。
2. **四題。** 問題卡砌出時留約 1 秒閱讀。解鎖後可即時預覽，捏合選擇後自動前進。
3. **確認。** 揀其中一張答案卡可以改該題，再回到確認。捏住「この声を街へ届ける」0.8 秒送出。
4. **上望。** 如果要排隊，iPad 先顯示等候倒數。到自己嘅 13 秒展示時段，光束引導抬頭，iPad 隨後調暗。
5. **交接。** 四張聲音卡可以逐張揭示比例。捏住 0.8 秒可開始「空の環」或「軌道エレベーター」導覽，亦可返回開始畫面。另一站正在導覽時，地標卡停用。手勢追蹤啟用時預設閒置 8 秒返回，游標移動超過 40 px/s 重新計時。純觸控模式為固定 20 秒。導覽期間暫停交接倒數。

單站 iPad Air 已走完整五頁及約 15 分鐘連續試用。雙站及展覽現場仍待驗收。[驗收紀錄](VALIDATION.md#ipad住民の窓實測與回歸)

## Admin、資料與照明

Admin 只限 server 電腦 loopback，POST 另檢查 same-origin。City reset 開新城市、保留總人數；full reset 清零展示計數但保留 append-only 歷史。保留中的 reset 可取消。Undo 只可撤銷最後一份已完成提案、且下一位開始前；新草稿即使稍後取消亦不重開舊 Undo。保存不可變撤銷標記，還原提交前狀態／counts／seeds。

現行題組為 `kind: rotation`、題組 version 1。SQLite **schema 9**，proposal algorithm／CityView **v2**。沿用原 SQLite 重啟可恢復城市同歷史。切換題組後，用 Admin 嘅 city reset 開新 run。

Admin Day／Night／Auto 保存為獨立 display setting：12:00／22:00／180 秒日循環。Reset 不改照明；City `?hour` 優先。多 viewer 的 Auto 時鐘不作跨裝置同步。

## 展覽待驗收

雙 iPad 同時用手勢、現場閱讀距離、長時間運作同復原流程見 [驗收指引](VALIDATION.md#ipad住民の窓實測與回歸) 同 [P5 實機交接](handoffs/resident-experience-p5.md)。單站 iPad Air 已有試用紀錄。

## 居民情景方向 — 2026-11-12（owner 採納；runtime 仍是 DEV 演示）

每個變化單位先打磨建築同變化，經 owner 驗收後，先做有名居民演出生活影響嘅情景。現行進度同台詞見 [居民情景計劃](RESIDENT_SCENE_PLAN.md)。正式接入人物情景及延長結果時段需要另行批准。
