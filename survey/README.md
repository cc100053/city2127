# Exhibition questionnaire — アンケート状態管理 MVP

未来都市展示（`city2127`）向けに、ゲストのアンケート回答を都市の政策状態へ変換・蓄積する仕組みです。最終展示UIではありません。

**2026-09-24（因果 MVP）:** 回答は4つの政策軸に効き、政策状態と回答履歴から4区画の配置（`CityView`）を導出して WebSocket で配信します。3D 表示は `module-swap/` の `?survey` モードです（`docs/PROJECT.md` 参照）。既定の質問は `src/survey/questions.mvp.json`（因果デモ用の5問）。`questions.test.json` は仕組みのテスト用です。

## 実装済みの範囲

- 質問 JSON の起動時検証（`src/survey/questions.test.json`、`version` 付き）
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
| `GET /api/admin/current-run` | run、状態、予約中・回答済み session 数（loopback のみ） |
| `GET /api/admin/events?limit=50` | 最近の回答イベントと admin event（loopback のみ） |
| `POST /api/admin/reset` | `{"confirmation":"RESET"}` で Reset（loopback のみ） |

WebSocket の `city-state-updated` には、仕様の `answerId` と `state` に加えて、モニター表示用に `answer`（AnswerEvent）、`questionText`、`optionLabel`、`change`（clamp 後の実際の変化）が入ります。回答の再送では通知しません。

## 管理画面と Reset

- `/admin`、`/admin.html`、`/api/admin/*` は接続元が `127.0.0.1`、`::1`、`::ffff:127.0.0.1`（デュアルスタック socket 上の IPv4 loopback）のときだけ使えます。それ以外は 403 です。
- 展示 PC 上で `http://127.0.0.1:8787/admin` を開きます。
- Reset は `RESET` の入力が必要です。他サイトからの POST を防ぐため、`Origin` ヘッダーがあるときはサーバー自身の origin と一致する必要があります。
- Reset は 1 つのトランザクションで、現在の run を `ended` にする → 未回答の予約を `expired` にする → admin event（`run-reset`）を記録 → 新しい run とスコア 0 の状態を保存する、の順に行い、コミット後に WebSocket へ `run-reset` を配信します。
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
