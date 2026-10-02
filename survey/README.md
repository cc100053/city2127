# Exhibition questionnaire — Odaiba v2

現行 package guide、2026-10-02。展示会は **2127 年のお台場**のみ。渋谷は過去の決定で、今後は開発しません。製品仕様は[EXHIBITION_SPEC](../docs/EXHIBITION_SPEC.md)、展示会の Mac／Windows 起動と LAN 設定は[ルート README](../README.ja.md)、責務は[PROJECT](../docs/PROJECT.md)を参照してください。

## 起動と設定

Node.js 24+。この `survey/` ディレクトリで実行します。

```sh
npm ci
npm run build
npm run server
```

Guest／Monitor／Admin は同じ HTTP server の `dist` から配信します。Vite dev server だけでは API は動きません。既定 SQLite を保持して再起動すると既存の街と履歴を復元します。

| 環境変数 | 既定値 | 内容 |
| --- | --- | --- |
| SURVEY_PORT | 8787 | HTTP／WebSocket port |
| SURVEY_HOST | 127.0.0.1 | LAN Guest を使う場合のみ 0.0.0.0；Admin は loopback 限定 |
| SURVEY_DB_PATH | data/survey.sqlite | cwd 基準の DB。削除せず既存データで再起動 |
| SURVEY_QUESTIONS | src/survey/questions.exhibition.json | 四問の v2 JSON；起動時検証 |
| SURVEY_STATIC_DIR | dist | build 済み Guest／Monitor／Admin |
| SURVEY_DEV_AUTO | 未設定 | `1` の場合だけ localhost DEV-auto endpoint を有効化 |

SQLite は現在 **schema 7**（`PRAGMA user_version`）、proposal algorithm / CityView は **version 2**です。Schema 番号と API version は別です。Schema 3 は旧 v1 run を終了して v2 run を開始し履歴を残しました。Schema 7 は既存 v2 状態／履歴を保ち A/B station を追加します。`migrations.ts` は append-only；適用済み migration を書き換えません。

## 四問、一つの提案

[questions.exhibition.json](src/survey/questions.exhibition.json) に automation / publicSharing / environmentalPriority / urbanConcentration の四問と各 −1／0／+1 option を定義します。Draft と review は街を変えず、全四問を一つの transaction で提出します。Effects は server の JSON から取得し、クライアントからの偽の値は採用しません。

v2 state は `voteSums`、`recentVotes`、`guestCount`、`revision` と四軸 scores を保持します。毎軸 `sum += vote`、`recent=.75*recent+.25*vote`、`score=6*(sum/guestCount+recent)`（±12）。最新票も共同履歴も反映し、中性票は recent を衰減させます。旧 v1 の加算 clamp／条件付き一人一問 trigger は展示会の仕様ではありません。

[cityView.ts](src/shared/cityView.ts) が layout の唯一の authority。v2 view は layout、最新提案／最大64件の履歴、完全な active run 履歴から得た四軸 `slotSeeds` を含みます。Undo の revoked proposal は replay／counts／seeds から除外します。Root v2 は site と district を描画し、module-swap は v2 を拒否します。

## Guest、A/B、Reset、Undo

単独 `/guest` は Start → 四問 → review → submit → result 10 秒／handoff 5 秒。10秒閲覧枠が終わると次のStartが完了済み体験を自動終了し、保留resetを適用します。早い交代操作も表示を中断しません。Admin の離場確認は不要で、未完了問卷の中止は可能です。

`/guest?station=A` と `B` は独立した session／recovery key／draft／result。各 station は一体験、活躍中は単独と A/B を混在できません。A/B は古い city revision でも最新 state に順次累積し、未来 revision は拒否；単独は一致必須。Submission ID と session uniqueness で retry は一回だけ計数します。未知の送信結果には同じ ID で再送します。

City display を commit order で最低10秒間隔（都市転換は3秒）に予約し、Guest は保存済み／表示待ちの後、自分の結果を表示します。A/B reset は新開始を止め、両 station の問卷／result／handoff を排出して実行。指定 session のみ中止可能。問卷期限は5分、result lease は display start +15秒；server の1秒 sweep は離線 station も解放します。

City reset は新しい街にして総人数を保持、full reset は表示計数をゼロにして immutable history を保持。Undo は最後の完了提案だけ、次の開始前に使用；新しい draft が後で中止されても旧 Undo は復活しません。独立 display setting は Day 12:00／Night 22:00／Auto、reset 後も保持します。

## API

v1 endpoint は互換コードで、既定の v2 run を v1 に変換しません。HTTP wrapper／status の正本は [server.ts](src/server/server.ts) と [protocol.ts](src/shared/protocol.ts)。
| メソッドとパス | 内容 |
| --- | --- |
| `POST /api/proposal-sessions` | v2：単独は `{}`、2台は `{ "stationId": "A" }` または `B`。四問を予約（201）、同じステーションの体験中・mode混在・reset保留中のA/B開始は409 |
| `GET /api/proposal-sessions/:id` | v2：割当四問、session、現在状態。草稿復元／期限確認 |
| `POST /api/proposals` | v2：`submissionId`、`guestSessionId`、`expectedRevision`、四組のanswers。新規201、同一IDの成功再送200。A/Bは旧revision可、未来revision不可；単独は完全一致 |
| `POST /api/proposal-sessions/:id/end` | A/Bのみ：指定sessionを終了。提出済み提案は保持し、予定展示の10秒閲覧枠が終わる前は409 |
| `POST /api/guest-sessions` | legacy v1：session 作成と質問予約（201）。質問なしは 409 `no_question_available` |
| `GET /api/guest-sessions/:id/question` | legacy v1：割り当てられた質問と現在状態。期限切れは 410、回答済みは `status: "answered"` |
| `POST /api/answers` | legacy v1：回答（新規 201、再送 200）。400 不明な question/option・別の質問の option、404 不明な session、409 revision 競合・回答済み・answer ID 競合・未割り当て質問、410 期限切れ |
| `GET /api/city-state` | 現在の v1/v2 state（WebSocket 再接続後の復元にも使う） |
| `GET /api/city-view` | 現在の v1/v2 CityView（導出配置と決定履歴） |
| `GET /api/health` | run ID、revision、質問 version |
| `WS /ws` | 接続直後に `city-state-snapshot`、その後 `city-state-updated` / `run-reset`。3種とも `state` と `view`（`CityView`）を含む |
| `GET /api/admin/current-run` | run、`lifecycle`（phase、pending reset、総参加人数、revision）、状態、予約中・回答済み session 数、`stations`、`undoProposal`、`displayMode`（loopback のみ） |
| `GET /api/admin/events?limit=50` | 最近の回答・提案（A/B情報と取消記録）および admin event（reset／proposal-undone）（loopback のみ） |
| `POST /api/admin/lifecycle` | `{command, expectedRevision, confirmation?, proposalId?, guestSessionId?}`。command は `reset-city`（`RESET`）、`full-reset`（`FULL RESET`）、`cancel-reset`、`guest-left`、`undo-proposal`。A/B の `guest-left` は未完了の `guestSessionId` 必須、Undo は `proposalId` 必須。古い revision は 409 `lifecycle_conflict`、状態に合わない操作は 409 `lifecycle_blocked`（loopback のみ） |
| `POST /api/admin/display-mode` | `{mode: "auto" / "day" / "night"}`。独立した保存設定（loopback / same-origin） |

v2 の `city-state-updated` は `submissionId`、`proposal`、`state`、`view` を含み、単独／A-Bとも `displayWaitMs`／`displayRemainingMs` とproposal内の `displayAt` を追加します（旧記録では省略可能）；`stationId`はA/Bのみ。サーバー通知はcommit後に即配信され、rootが表示を10秒以上離します。時刻は予定でありviewerの再生確認ではありません。retryは元の閲覧枠の残り時間だけを返し、leaseを延長しません。再送では再通知しません。Monitor は最新記録を表示し、root の表示待ち列とは別です。

v1 WebSocket の `city-state-updated` には、仕様の `answerId` と `state` に加えて、モニター表示用に `answer`（AnswerEvent）、`questionText`、`optionLabel`、`change`（clamp 後の実際の変化）が入ります。回答の再送では通知しません。

Admin は loopback、POST は同一 origin も検査します。各 command は lifecycle revision に束縛され、古い revision は拒否。WebSocket snapshot／reset／Undo／reconnect は最新状態を復元し、live update だけが3秒転換を起こします。

## Source responsibilities

| Directory / file | Responsibility |
| --- | --- |
| src/shared | state/view/question/protocol と純粋 layout mapping；Node/DOM 依存なし |
| src/survey | JSON validation、reducer、replay/history |
| src/server/proposalService.ts | session、canonical proposal、atomic accumulation／idempotency、station lease |
| src/server/adminService.ts | lifecycle/reset/Undo/display setting |
| src/server/runStore.ts / migrations.ts | schema 7、restoration、active history／slotSeeds |
| src/server/server.ts / realtime.ts | API／static／loopback guard／WS |
| src/ui | Guest flow/recovery、Admin、Monitor；独立スコア計算なし |

## Tests and DEV-only automation

```sh
npm test
npm run build
npm run test:meters
npm run test:auto
```

`npm test` は旧 v1 regression に加え v2 rules/persistence/flow/lifecycle/Undo/A-B、Meter contract、DEV-auto tests を実行します。Root の `tests/surveyMeterPipeline.test.ts` は本物の HTTP／WebSocket で81組の Meter と district mapping を検査します。Root tests は別コマンドです。実行結果の記録は[VALIDATION](../docs/VALIDATION.md)。

```sh
npm run dev:auto
```

Fresh scratch SQLite、localhost port 8788、`/guest?dev-auto`。Root City は `?survey=ws://127.0.0.1:8788/ws` に接続。既定 DB を変更しません。Panel はサーバーの vote map から option を選び、普通の draft/review/submit/retry を使います。停止は送信済み request を撤回せず、reset や他 Guest と衝突したら停止します。次の提案は普通の自動 Start handoff、Admin exit command は送りません。

**DEV-ONLY：展示会前に panel／endpoint／launcher を除去、または別途 Admin への移動を決定してください。旧 staff-exit lock は復活させません。** 再利用可能な tests は残します。実装履歴：[auto-tests](../docs/handoffs/archive/survey-auto-tests.md)。

## Legacy and historical records

v1 の質問予約／trigger／加算 clamp／一人一問コードと tests は互換性のため保持します。`questions.mvp.json` を既定設定にするだけでは current v2 run は v1 に戻りません。現在の Guest は四問 UI、root との接続は実装済みです。

原 schema-1 [制作 log](docs/log/survey-state-mvp.md)、[repo import](../docs/handoffs/archive/survey-state-mvp.md)、[causal MVP](../docs/handoffs/archive/causal-city-mvp.md) は過去の基準。現行 limits は[展示会仕様](../docs/EXHIBITION_SPEC.md)、A/B evidence は[handoff](../docs/handoffs/archive/two-guest-devices.md)を参照。S5、入力機器と展示当日の recovery policy は未検証です。

2026-10-02 P2：正式question-setはversion3です（algorithm／CityView v2、schema7とは別）。住民の問い／背景、送信前確認、保存／待機／街を見る案内をGuestに接続し、結果の回答／Meter／施設表はCity側の短い解説に置き換えました。旧草稿は新しい予約へ有効な選択を引き継ぎ、A/Bは自分の旧予約を既存end endpointで終了します。保存済みversion2提案は原文のまま同IDで回復でき、SQLiteを削除しません。時刻／lease／resetは変更していません。[P2 handoff](../docs/handoffs/archive/resident-experience-p2.md)。

2026-10-02 P3は上記P2の時刻条件を更新します：server/root/Guestは共通10秒閲覧枠を予約し、3秒の都市転換を保持。早い交代はreleaseを枠の終わりまで待ち、resetは両stationをdrainします。retry/reloadは残り時間のみ、result leaseは開始+15秒で固定。rootはeffective carrier配置／可視pairing／seed後の実分布を比較し、個人の声と共同結果を区別。切断／再接続／Undo／reduced motion／期限切れイベントは即復元、照明のみのsnapshotは有効queueを保持。[P3 handoff](../docs/handoffs/archive/resident-experience-p3.md)。
