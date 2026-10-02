# Exhibition questionnaire — アンケート状態管理 MVP

## A/B 同時回答（2026-10-02、schema 7）

2台で `/guest?station=A` と `/guest?station=B` を開き、同じ server に接続します。各ステーションの草稿・四問・結果・交代は独立し、提案は受信順に最新の街へ累積します。旧 revision による再確認は不要、未来 revision は拒否します。申込IDの再送は一度だけ加算します。各ステーション同時1体験、既存の単独 `/guest` とは体験中に混在できません。

記録済み提案の展示開始を3秒以上の間隔で保存し、Guest は `displayWaitMs` の待機後に結果10秒／交代5秒を表示します。結果復元は同じ申込IDを再送し、終了済み体験は開始に戻ります。リセットは新規開始を停止し、両体験終了後に実行します。`POST /api/proposal-sessions/:id/end` はそのステーションだけを終了し、未展示の3秒変化は飛ばせません。Admin の `guest-left` は A/B では `guestSessionId` が必須、未完了の指定草稿だけを破棄します。current-run の `stations` は各ステーションの session ID／状態です。

server の1秒周期で通信断も解放します：草稿は開始から5分、提出済み結果は予定展示から15秒（結果復元時に租期更新）。リセット／終了情報は SQLite に保存し、再起動後も有効です。schema 7 は既存データを保持します。LAN 設定は[起動ガイド](../README.md)、コード／検証は[handoff](../docs/handoffs/two-guest-devices.md)を参照。`npm test` にA/B transaction／HTTP／WebSocket／再起動／reset テストを追加しました。

## 管理者専用 Undo（2026-10-02）

Admin の **直前の提案を取り消す** は、次の Guest が開始する前だけ利用できます。元の提案を削除せず取消済みとして残し、街の全状態・配置順・参加人数を変更前に戻します。Guest の結果は開始画面に戻り、再回答は新しい四問の体験です。保留中のリセットは次の開始まで保留されます。既存 DB は起動時に schema 6 に移行します。survey を build／再起動し、City／Guest／Admin を更新してください。

API は既存 `POST /api/admin/lifecycle` に `{ command: "undo-proposal", proposalId, expectedRevision }` を送ります（localhost／同一 origin のみ）。取消済み申込 ID の再送は `proposal_undone`（409）で拒否されます。元の提案と取消記録は追加専用です。検証と制約は [handoff](../docs/handoffs/admin-undo.md) を参照。


## 開発用の自動回答（DEV-ONLY、2026-09-30）

このディレクトリで `npm run dev:auto` を実行し、`http://127.0.0.1:8788/guest?dev-auto` を開きます。ルートの Vite も起動し、街を `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8788/ws` に接続してください。毎回、新しい一時 SQLite を作成し、パスを表示します。既存の展示 DB は使いません。検査のためテスト DB は残ります。ポートが使用中なら `SURVEY_PORT` を変更してください。

「自動回答を開始」で、既存 Guest の radio／次へ／確認／送信フローを繰り返します。全 −1／0／+1、輪替混合、軸ごとの指定、seed ランダムを選べます。既定は10提案、seed 2127、各問0.3秒、結果10秒＋引継ぎ5秒、追加待ち0秒です。選択肢の順番ではなく、server の投票定義を使います。負の回答でも過去の集計を引き継ぐため、すぐ low になるとは限りません。

localhost と `SURVEY_DEV_AUTO=1` の両方が必要です（launcher が設定）。通常の `/guest` は変更されません。次の質問開始時に自動交代し、pending reset／他 guest／通信エラー／競合で停止します。停止後は草稿を手動で続けられます。通信結果が不明な場合は同じ申込IDで確認し、再読み込みしてもバッチは自動再開しません。

**展示前に削除するか、Admin へ移してください。** Guest の import/adapter、`autoAnswerPanel`／`autoAnswers`、dev config route/types、launcher に `DEV-ONLY` コメントがあります。[設計](../docs/EXHIBITION_MVP.md#development-auto-answer-and-meter-contract-tests--2026-09-30)も参照。

### 再利用できる Meter テスト

`npm run test:meters` は実際の質問 JSON を読み、全81組合せの投票→Meter→SQLite→layout／event を検証します。`npm run test:auto` は自動回答と開発APIの gate を検証します。両方は `npm test` に含まれます。ルート `npm test` は実際の site builders/controllers と HTTP／WebSocket も検証します。

新しい Meter のテストは `tests/meterContract.ts` の定義表（軸、質問／選択肢ID、投票、独立した期待値）とルートモデル adapter を追加します。生成・検証関数は Meter 数を固定しません。製品の四題 v2 契約を増やす schema/UI/model 作業は別途必要です。構造検証だけで通る「選択肢の正負を逆にした定義」も意味検証で検出します。

未来都市展示（`city2127`）向けに、ゲストのアンケート回答を都市の政策状態へ変換・蓄積する仕組みです。最終展示UIではありません。

**2026-09-24（因果 MVP）:** 回答は4つの政策軸に効き、政策状態と回答履歴から4区画の配置（`CityView`）を導出して WebSocket で配信します。3D 表示は `module-swap/` の `?survey` モードです（`docs/PROJECT.md` 参照）。既定の質問は `src/survey/questions.mvp.json`（因果デモ用の5問）。`questions.test.json` は仕組みのテスト用です。

## 実装済みの範囲

- 質問 JSON の起動時検証（既定 `src/survey/questions.mvp.json`、`version` 付き）
- 4つの政策軸（`automation` `publicSharing` `environmentalPriority` `urbanConcentration`、初期値 0、範囲 -12〜12）
- 質問ごとのシナリオ情報（`year` `pressure` `background`）と出題条件 `trigger`
- 政策状態と回答履歴からの配置導出（`deriveCityLayout` / `buildCityView`）
- SQLite（`node:sqlite`）への回答イベント保存・現在状態の保存と再起動時の復元
- guest session と質問予約（2分）
- revision による競合検出と answer ID による冪等性
- WebSocket によるモニター通知
- localhost 限定の管理画面と Reset（削除ではなく新しい run を作る）
- デバッグ用画面：guest / monitor / admin

## 責務とデータの境界

| 場所 | 責務 |
| --- | --- |
| `src/shared/` | フロントエンドとバックエンドで共有する型と純粋関数（`citySurveyState.ts` `question.ts` `protocol.ts` `cityView.ts`）。Node/DOM API を使わない。`cityView.ts` の `deriveCityLayout` が政策 → 配置の唯一の対応表 |
| `src/survey/` | 質問 JSON の検証（`questionLoader.ts`）、スコア計算（`scoreEngine.ts`）、回答履歴から `CityView` を組み立てる `decisionHistory.ts`。すべて純粋関数 |
| `src/server/` | HTTP/WebSocket（`server.ts` `realtime.ts`）、DB 接続とトランザクション（`database.ts`）、migration（`migrations.ts`）、run とスナップショット（`runStore.ts`）、guest session（`sessionService.ts`）、回答（`answerService.ts`）、管理・Reset（`adminService.ts`） |
| `src/ui/` | デバッグ画面。サーバー API を呼ぶだけで、スコア計算はしない |

- **JSON の役割**：質問・選択肢・効果ベクトルの定義。`SURVEY_QUESTIONS` で差し替え可能。起動時に検証し、不正なら起動しない。
- **SQLite の役割**：run、guest session、回答イベント（追加専用）、run ごとの現在状態スナップショット、admin event の保存。
- **境界**：クライアントが送れるのは `answerId` `guestSessionId` `questionId` `optionId` `expectedRevision` だけ。効果ベクトルはサーバーが質問 JSON から取り出し、`clamp(現在値 + 効果, -12, 12)` をサーバー側で計算する。guest へ返す質問には効果値を含めない。

## CitySurveyState

アンケート累積状態の型です（`src/shared/citySurveyState.ts`）。配置は保存せず、毎回ここから導出します。

```ts
type CitySurveyState = {
  runId: string;
  revision: number;      // run 内で回答ごとに +1（新しい run は 0）
  answerCount: number;
  scores: { automation; publicSharing; environmentalPriority; urbanConcentration }; // 整数 -12..12
  updatedAt: string;     // ISO 8601
};
```

以前の5軸と不可逆マイルストーンは仮データだったため schema 2 で置き換えました。schema 1 の DB を開くと、有効な run を Reset と同じ方法で終了（`admin_events` に記録）し、スコア0の新しい run を作ります。旧 run の回答イベントは残り、旧スナップショットは `city_snapshots_v1` に移ります。

## CityView（3D 表示への境界）

`CityView = { runId, revision, scores, layout, history }`（`src/shared/cityView.ts`）。

- `layout`：`deriveCityLayout(scores)` の結果。`module-swap` の `CityLayoutState` と同じ形。NW = automation ≥2 中層 / ≥4 高層、NE = environmentalPriority ≥2 公園、SW = publicSharing ≥2 広場、SE = urbanConcentration ≥1 中層 / ≥2 高層。すべて0なら空き区画4つ。
- `history`：active run の回答イベントを順に再生した決定の列。各要素に質問・選択肢の文言、実際の政策変化（clamp 後）、その回答で変わった区画と意味ラベルが入ります。文言は現在の質問 JSON から取ります。

## 出題条件（trigger）

`"trigger": { "automation": { "gte": 2 } }` のように軸ごとに `gte` / `lte`（どちらも境界を含む）を書きます。書かれた条件すべてを満たすときだけ出題対象になります。`trigger` がない質問は常に対象です。

## 回答イベント

`answer_events` は追加専用です（SQLite トリガーで UPDATE/DELETE を拒否）。`effects` には回答時点の質問 JSON の値をコピーし、`questionVersion` も記録します。後で JSON を変更しても、過去に実際に適用された値を確認できます。

- `sequence`：サーバーが回答を受理した順番（全 run 通しで単調増加、質問番号ではない）
- 同じ `answerId` の再送：内容（session / question / option / expectedRevision）が同じなら既存結果を `replayed: true` で返し、二重加算しない。内容が違えば `answer_conflict`（409）
- 冪等性の確認は revision 競合チェックより先に行う
- `expectedRevision` が現在の revision と違えば適用せず、409 `revision_conflict` と最新状態を返す
- イベント保存、スナップショット更新、session の回答済み化は同一の `BEGIN IMMEDIATE` トランザクション

起動時は、有効な run のスナップショットをその run の回答イベントから再計算した結果と照合します。一致しない、スナップショットがない、有効な run がない（run は存在する）場合は `CorruptStateError` で起動を止め、黙って初期化しません。

## guest session と質問予約

- ゲスト一人は一つの run で一問だけ回答します。
- `POST /api/guest-sessions` で、JSON の順番で「回答済みでも予約中でもなく、`trigger` が現在のスコアを満たす」最初の質問をトランザクション内で予約します。
- 予約時間は 2 分（`RESERVATION_MS`）。期限切れの未回答予約は `expired` になり、その質問は別のゲストへ再割り当てされます。
- 状態：`reserved` → `answered` / `expired`
- 対象になる質問がすべて回答済みまたは予約中なら `no_question_available`（409）を返します。最初の質問へ自動で戻ることはありません。
- 予約は予約時点のスコアで決まります。前のゲストが回答中に別のゲストが来ると、そのゲストには現在のスコアで対象になる質問（多くは条件なしの予備質問）が割り当てられます。

## API

成功は `{ ok: true, data }`、失敗は `{ ok: false, error: { code, message }, state? }`（`src/shared/protocol.ts` の `ApiResponse`）。内部例外や SQL はクライアントへ返しません。POST は `Content-Type: application/json` が必要です。

| メソッドとパス | 内容 |
| --- | --- |
| `POST /api/guest-sessions` | session 作成と質問予約（201）。質問なしは 409 `no_question_available` |
| `GET /api/guest-sessions/:id/question` | 割り当てられた質問と現在状態。期限切れは 410、回答済みは `status: "answered"` |
| `POST /api/answers` | 回答（新規 201、再送 200）。400 不明な question/option・別の質問の option、404 不明な session、409 revision 競合・回答済み・answer ID 競合・未割り当て質問、410 期限切れ |
| `GET /api/city-state` | 現在の `CitySurveyState`（WebSocket 再接続後の復元にも使う） |
| `GET /api/city-view` | 現在の `CityView`（導出配置と決定履歴） |
| `GET /api/health` | run ID、revision、質問 version |
| `WS /ws` | 接続直後に `city-state-snapshot`、その後 `city-state-updated` / `run-reset`。3種とも `state` と `view`（`CityView`）を含む |
| `GET /api/admin/current-run` | run、`lifecycle`（phase、pending reset、総参加人数、revision）、状態、予約中・回答済み session 数（loopback のみ） |
| `GET /api/admin/events?limit=50` | 最近の回答イベントと admin event（`scope: city/full`）（loopback のみ） |
| `POST /api/admin/lifecycle` | `{"command","expectedRevision","confirmation"?}`。command は `reset-city`（`RESET`）、`full-reset`（`FULL RESET`）、`cancel-reset`、`guest-left`。古い revision は 409 `lifecycle_conflict`、状態に合わない操作は 409 `lifecycle_blocked`（loopback のみ） |

WebSocket の `city-state-updated` には、仕様の `answerId` と `state` に加えて、モニター表示用に `answer`（AnswerEvent）、`questionText`、`optionLabel`、`change`（clamp 後の実際の変化）が入ります。回答の再送では通知しません。

## 管理画面と Reset

- `/admin`、`/admin.html`、`/api/admin/*` は接続元が `127.0.0.1`、`::1`、`::ffff:127.0.0.1`（デュアルスタック socket 上の IPv4 loopback）のときだけ使えます。それ以外は 403 です。
- 展示 PC 上で `http://127.0.0.1:8787/admin` を開きます。
- **展示 lifecycle（2026-10-02 更新、schema 4）**：session 開始で `in_experience`、提案 commit で `awaiting_exit`。次の session 開始時に前の体験を自動終了するため、Admin の退出確認は不要です。通常は累積した街を引き継ぎます。**未完了の体験を終了** は `in_experience` の質問を中止する操作です（既存 `guest-left` API を使用）。
- **Reset Current City** は `ready` なら即実行、それ以外は次の session 開始まで保留。**Full Data Reset** も同じで、`full` が `city` より優先し、**Cancel Pending Reset** で取り消せます。未完了の体験を Admin で終了した場合も保留 reset を実行します。Reset と次の予約は同一 transaction で保存し、commit 後に `run-reset` を配信します。`ready` は pending を持てません（DB CHECK）。
- 現在の都市の参加人数 = active run の `guestCount`。総参加人数 = 最後の full reset 以降の `proposal_events` 数（watermark `total_since_sequence`）。City reset は総数を保持し、full reset は watermark を進めて 0 にします。どちらも履歴は削除しません。
- すべての admin command は画面が最後に読んだ lifecycle `revision` を送り、別タブ・別画面からの古い操作を拒否します。Admin 画面は WebSocket event と 2 秒 polling で更新します。
- City reset は `RESET` の入力（画面では確認ダイアログ）が必要です。他サイトからの POST を防ぐため、`Origin` ヘッダーがあるときはサーバー自身の origin と一致する必要があります。
- 実行される reset は 1 つのトランザクションで、現在の run を `ended` にする → 未回答の予約を `expired` にする → admin event（`run-reset`）を記録 → 新しい run とスコア 0 の状態を保存する、の順に行い、コミット後に WebSocket へ `run-reset` を配信します。
- **Reset は何も削除しません。** 過去の run の回答イベントは DB に残ります。全履歴の物理削除機能はありません。
- 管理者アカウント、PIN、セッションはありません。別端末から操作する要件が出たら、`adminService.ts` の `isLoopbackAddress` による判定を PIN と短時間セッションに置き換えることを想定しています。

## 起動方法

Node.js 24 以上（`node:sqlite` を使用、追加の SQLite ライブラリなし）。nvm を使う場合は作業前に `nvm use 24` で切り替えてください。Node 20 以下では `npm test` が `node: bad option: --experimental-strip-types` で失敗します。

```sh
nvm use 24
npm install
npm run build          # tsc --noEmit + デバッグ画面の Vite ビルド（dist/）
npm run server         # http://127.0.0.1:8787
```

- ゲスト：`/guest`（狭い画面でも押せる最低限のレイアウト）
- モニター：`/monitor`
- 管理：`/admin`（展示 PC の localhost のみ）

デバッグ画面は `npm run server` が `dist/` から配信します。API と同じ origin・同じポートなので、Vite の開発プロキシは使いません（プロキシ経由だと接続元がすべて loopback に見え、管理画面の制限が効かなくなるため）。

| 環境変数 | 既定値 | 内容 |
| --- | --- | --- |
| `SURVEY_PORT` | `8787` | ポート |
| `SURVEY_HOST` | `127.0.0.1` | 待ち受けアドレス。LAN のスマホから使うときは `0.0.0.0` |
| `SURVEY_DB_PATH` | `data/survey.sqlite` | DB ファイル（`data/` と `*.sqlite*` は `.gitignore` 済み） |
| `SURVEY_QUESTIONS` | `src/survey/questions.mvp.json` | 質問 JSON |
| `SURVEY_STATIC_DIR` | `dist` | ビルド済みデバッグ画面 |

SQLite は WAL モード、外部キー有効、schema version は `PRAGMA user_version`（現在 2）で管理します。DB のほうが新しい schema version なら `SchemaVersionError` で開くのを拒否します。

## テスト

```sh
nvm use 24
npm test
npm run build
```

テストは既存の `city2127` と同じく、Node の TypeScript 型除去で `node:assert/strict` のスクリプトを順に実行します（テストフレームワークなし）。DB はテストごとに in-memory または一時ディレクトリを使います。

| ファイル | 内容 |
| --- | --- |
| `tests/questionLoader.test.ts` | 正常読み込み、ID 重複、未知の軸、範囲外・非整数、空の選択肢・ID・文字列を拒否 |
| `tests/scoreEngine.test.ts` | 初期値 0、加算、±12 での clamp、偽の effects を無視 |
| `tests/cityView.test.ts` | 中立の配置、軸ごとの閾値、累積、公園・広場に建物なし、決定的な導出、変化ラベル |
| `tests/answerService.test.ts` | 保存、不明・不一致 ID、冪等な再送、answer ID 競合、古い revision、sequence/revision の単調増加、追加専用 |
| `tests/sessionService.test.ts` | 一人一問、重複予約なし、再回答不可、期限切れの再割り当て、全問使い切り |
| `tests/concurrency.test.ts` | 8 本の worker thread（それぞれ別の SQLite 接続）を同時に動かし、異なる質問の割り当てと更新の欠落がないことを確認 |
| `tests/persistence.test.ts` | 再起動相当での復元、イベント再計算との照合、壊れた状態・スナップショット欠落を拒否、schema version 不一致、schema 1 → 2 移行、外部キー |
| `tests/reset.test.ts` | 実 HTTP サーバーで API のステータス、LAN からの管理 API 403、確認文字列、新しい run、履歴保持、reset event |
| `tests/realtime.test.ts` | 接続直後の状態と view、回答後の `city-state-updated`、Reset 後の `run-reset`（基準配置）、再接続 |
| `tests/causalFlow.test.ts` | 3人のゲストによる因果デモ、trigger による出題、最初の選択ごとの分岐と行き止まりなし、再起動で同じ配置、Reset で基準配置 |

非 loopback からのアクセスは、`createSurveyServer` の `remoteAddress` を差し替えて自動テストしています。実際の LAN IP からの確認は `docs/log/survey-state-mvp.md` に記録しています。

## 未実装（今回の範囲外）

本番用の質問一式、完成したスマホ UI、QR コード接続、クラウド DB、認証、リポジトリ直下（`src/`）の渋谷シーンへの接続、デプロイ。

## Admin city lighting — 2026-09-30

`/admin` の **Day / Night / Auto** は、接続中の root `?survey` 都市を12:00 / 22:00 / 既存の日夜サイクルに切り替えます。`POST /api/admin/display-mode` は `{ "mode": "day" | "night" | "auto" }` のみ受け付け、Admin と同じ localhost・同一 origin の制限があります。`GET /api/admin/current-run` は `displayMode` を返します。

Schema 5 の `display_settings` に保存し、再起動・city/full reset 後も保持します。初期値は Auto。WebSocket の既存 `city-state-snapshot` に optional `displayMode` を付けて変更時・再接続時に配信します。CityView、提案、スコア、都市 revision、lifecycle は変更しません。明示的な root `?hour` は優先され、standalone / module-swap はこの制御の対象外です。Auto は各 viewer の動作中の時計を再開します。更新後は既存 SQLite を保ったまま server を再起動し Admin を再読み込みしてください。

2026-10-02: 開発用自動回答も通常の Guest と同じ開始時の自動交代を使用し、Admin の退出確認を送りません。結果10秒・交代5秒の表示と、停止・不明な送信結果の同ID復旧は維持します。
