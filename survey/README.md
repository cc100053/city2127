# Exhibition questionnaire — アンケート状態管理 MVP

未来都市展示（`city2127`）向けに、ゲストのアンケート回答を都市状態へ変換・蓄積する仕組みを検証する独立プロジェクトです。最終展示UIではありません。質問と効果値は仮データです。

**現時点では Three.js 都市・GLB 交換機能には接続していません。** `city2127` リポジトリは変更していません。

## 実装済みの範囲

- 質問 JSON の起動時検証（`src/survey/questions.test.json`、`version` 付き）
- 5軸スコア（`environment` `culture` `technology` `community` `mobility`、初期値 0、範囲 -12〜12）
- 不可逆マイルストーン 3種（`greenNetwork` `civicCommons` `autonomousGrid`）
- SQLite（`node:sqlite`）への回答イベント保存・現在状態の保存と再起動時の復元
- guest session と質問予約（2分）
- revision による競合検出と answer ID による冪等性
- WebSocket によるモニター通知
- localhost 限定の管理画面と Reset（削除ではなく新しい run を作る）
- デバッグ用画面：guest / monitor / admin

## 責務とデータの境界

| 場所 | 責務 |
| --- | --- |
| `src/shared/` | フロントエンドとバックエンドで共有する型のみ（`citySurveyState.ts` `question.ts` `protocol.ts`）。Node/DOM API を使わない |
| `src/survey/` | 質問 JSON の検証（`questionLoader.ts`）、スコア計算（`scoreEngine.ts`）、マイルストーン判定（`milestoneEngine.ts`）。スコア・マイルストーンは純粋関数 |
| `src/server/` | HTTP/WebSocket（`server.ts` `realtime.ts`）、DB 接続とトランザクション（`database.ts`）、migration（`migrations.ts`）、run とスナップショット（`runStore.ts`）、guest session（`sessionService.ts`）、回答（`answerService.ts`）、管理・Reset（`adminService.ts`） |
| `src/ui/` | デバッグ画面。サーバー API を呼ぶだけで、スコア計算はしない |

- **JSON の役割**：質問・選択肢・効果ベクトルの定義。`SURVEY_QUESTIONS` で差し替え可能。起動時に検証し、不正なら起動しない。
- **SQLite の役割**：run、guest session、回答イベント（追加専用）、run ごとの現在状態スナップショット、admin event の保存。
- **境界**：クライアントが送れるのは `answerId` `guestSessionId` `questionId` `optionId` `expectedRevision` だけ。効果ベクトルはサーバーが質問 JSON から取り出し、`clamp(現在値 + 効果, -12, 12)` をサーバー側で計算する。guest へ返す質問には効果値を含めない。

## CitySurveyState

アンケート累積状態の型です（`src/shared/citySurveyState.ts`）。3D配置側の `CityLayoutState` とは別物で、将来この2つを統合型 `CityState` にまとめる予定です。

```ts
type CitySurveyState = {
  runId: string;
  revision: number;      // run 内で回答ごとに +1（新しい run は 0）
  answerCount: number;
  scores: { environment; culture; technology; community; mobility }; // 整数 -12..12
  milestones: { greenNetwork; civicCommons; autonomousGrid };      // boolean
  updatedAt: string;     // ISO 8601
};
```

`toCityViewInput(state)`（`src/shared/citySurveyState.ts`）は、将来 Three.js 側が使うための入口です。スコアを -1..1 に正規化し、解除済みマイルストーンを列挙するだけで、建物配置・GLB 交換ルールは実装していません。

## 不可逆マイルストーン

| マイルストーン | 解除条件 |
| --- | --- |
| `greenNetwork` | `environment >= 8` |
| `civicCommons` | `culture >= 7` かつ `community >= 6` |
| `autonomousGrid` | `technology >= 8` かつ `mobility >= 6` |

一度 `true` になるとその run 中は後でスコアが下がっても `false` に戻りません。排他的ではなく、3つとも解除できます。新しい run ではすべて未解除から始まります。

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
- `POST /api/guest-sessions` で、JSON の順番で「回答済みでも予約中でもない」最初の質問をトランザクション内で予約します。
- 予約時間は 2 分（`RESERVATION_MS`）。期限切れの未回答予約は `expired` になり、その質問は別のゲストへ再割り当てされます。
- 状態：`reserved` → `answered` / `expired`
- すべての質問が回答済みまたは予約中なら `no_question_available`（409）を返します。最初の質問へ自動で戻ることはありません。

## API

成功は `{ ok: true, data }`、失敗は `{ ok: false, error: { code, message }, state? }`（`src/shared/protocol.ts` の `ApiResponse`）。内部例外や SQL はクライアントへ返しません。POST は `Content-Type: application/json` が必要です。

| メソッドとパス | 内容 |
| --- | --- |
| `POST /api/guest-sessions` | session 作成と質問予約（201）。質問なしは 409 `no_question_available` |
| `GET /api/guest-sessions/:id/question` | 割り当てられた質問と現在状態。期限切れは 410、回答済みは `status: "answered"` |
| `POST /api/answers` | 回答（新規 201、再送 200）。400 不明な question/option・別の質問の option、404 不明な session、409 revision 競合・回答済み・answer ID 競合・未割り当て質問、410 期限切れ |
| `GET /api/city-state` | 現在の `CitySurveyState`（WebSocket 再接続後の復元にも使う） |
| `GET /api/health` | run ID、revision、質問 version |
| `WS /ws` | 接続直後に `city-state-snapshot`、その後 `city-state-updated` / `run-reset` |
| `GET /api/admin/current-run` | run、状態、予約中・回答済み session 数（loopback のみ） |
| `GET /api/admin/events?limit=50` | 最近の回答イベントと admin event（loopback のみ） |
| `POST /api/admin/reset` | `{"confirmation":"RESET"}` で Reset（loopback のみ） |

WebSocket の `city-state-updated` には、仕様の `answerId` と `state` に加えて、モニター表示用に `answer`（AnswerEvent）、`questionText`、`optionLabel`、`change`（clamp 後の実際の変化と新たに解除されたマイルストーン）が入ります。回答の再送では通知しません。

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
| `SURVEY_QUESTIONS` | `src/survey/questions.test.json` | 質問 JSON |
| `SURVEY_STATIC_DIR` | `dist` | ビルド済みデバッグ画面 |

SQLite は WAL モード、外部キー有効、schema version は `PRAGMA user_version`（現在 1）で管理します。DB のほうが新しい schema version なら `SchemaVersionError` で開くのを拒否します。

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
| `tests/scoreEngine.test.ts` | 初期値 0、加算、±12 での clamp、偽の effects を無視、表示用の入口 |
| `tests/milestoneEngine.test.ts` | 閾値、解除後の維持、新しい run での未解除 |
| `tests/answerService.test.ts` | 保存、不明・不一致 ID、冪等な再送、answer ID 競合、古い revision、sequence/revision の単調増加、追加専用 |
| `tests/sessionService.test.ts` | 一人一問、重複予約なし、再回答不可、期限切れの再割り当て、全問使い切り |
| `tests/concurrency.test.ts` | 8 本の worker thread（それぞれ別の SQLite 接続）を同時に動かし、異なる質問の割り当てと更新の欠落がないことを確認 |
| `tests/persistence.test.ts` | 再起動相当での復元、イベント再計算との照合、壊れた状態・スナップショット欠落を拒否、schema version 不一致、外部キー |
| `tests/reset.test.ts` | 実 HTTP サーバーで API のステータス、LAN からの管理 API 403、確認文字列、新しい run、履歴保持、reset event |
| `tests/realtime.test.ts` | 接続直後の状態、回答後の `city-state-updated`、Reset 後の `run-reset`、再接続 |

非 loopback からのアクセスは、`createSurveyServer` の `remoteAddress` を差し替えて自動テストしています。実際の LAN IP からの確認は `docs/log/survey-state-mvp.md` に記録しています。

## 未実装（今回の範囲外）

本番用の質問文、完成したスマホ UI、QR コード接続、クラウド DB、認証、Three.js 都市表現、`CityVisualState` へのマッピング、GLB 交換ルール、デプロイ。
