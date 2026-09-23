# survey-state-mvp — アンケート状態管理 MVP 開発ログ

このパッケージ自身の開発ログです。city2127 のタスク handoff ではありません（そちらはリポジトリrootの `docs/handoffs/survey-state-mvp.md`）。構成は `city2127` の handoff テンプレートを流用しています。

- Owner: Claude (Claude Code session, 2026-09-23)。人の担当者はまだ決まっていません
- Status: DONE（実装と検証は完了、未コミット）
- Location: このパッケージのroot（制作フォルダーでは `exhibition-questionnaire`、city2127 では `survey/`）
- Branch / Base commit / Last verified commit: なし。この作業は git リポジトリ外の制作フォルダーで行いました。city2127 へ取り込んだ後のブランチと base commit は、リポジトリrootの `docs/handoffs/survey-state-mvp.md` を参照してください
- Remote availability: NOT PUSHED（remote なし）

## Session Git state

- ユーザーの指示で、`city2127` の branch・HEAD・fetch・divergence は確認していません。remote が最新かどうかは未確認です。
- 実装は最初 `city2127` リポジトリに書きました。その後ユーザーが作業先を `exhibition-questionnaire` と指定し、独立プロジェクトにすることを選びました。ファイルを移したあと、city2127 の自分の変更を元に戻しました。`package.json`、`package-lock.json`、`.gitignore` は `git checkout` で戻しました。戻す前に、差分が今回自分で追加したパッケージと行だけであることを `git diff` で確認しています。自分で追加した未追跡ファイル、`node_modules/`、`dist/` は削除しました。その結果、`git status --short` は空になりました。

## Goal and acceptance criteria

アンケート回答を都市状態に変換して蓄積する構造を検証します。対象は、質問 JSON、ベクトル変換、回答履歴、状態の蓄積、不可逆マイルストーン、複数端末の回答順、リアルタイム通知、Reset、再起動後の復元です。最終 UI と Three.js との接続は範囲外です。

## Completed work

- `src/shared`：`CitySurveyState`、質問、API とイベントの型。`toCityViewInput` は正規化だけを行う入口です
- `src/survey`：質問 JSON の検証（外部ライブラリなし）、clamp 付きのスコア計算、マイルストーン判定
- `src/server`：`node:sqlite`、schema v1 の migration、run とスナップショット、復元時の照合、guest session と予約、回答処理（冪等性と revision チェック）、admin と Reset、`ws` による WebSocket
- `src/ui`：guest、monitor、admin のデバッグ画面。ページは `guest.html`、`monitor.html`、`admin.html`、`index.html`（リンク集）
- 追加した依存：`ws`、`@types/ws`、`@types/node`、`typescript`、`vite`。Express、React、Firebase は使っていません
- 詳細な仕様は [README](../../README.md) にあります

## DB schema（v1、`PRAGMA user_version = 1`）

- `runs(id, status active|ended, started_at, ended_at)`：active な run は 1 つだけです（部分 UNIQUE index）
- `guest_sessions(id, run_id→runs, question_id, status reserved|answered|expired, created_at, expires_at, answered_at)`
- `answer_events(sequence AUTOINCREMENT, id UNIQUE, run_id→runs, guest_session_id UNIQUE→guest_sessions, question_id, option_id, question_version, effects_json, revision_before, revision_after, answered_at)`：UPDATE と DELETE はトリガーで拒否します
- `city_snapshots(run_id PK→runs, revision, answer_count, environment…mobility CHECK -12..12, green_network/civic_commons/autonomous_grid CHECK 0|1, updated_at)`
- `admin_events(id, type, run_id→runs, detail_json, created_at)`

## Actual validation results

- Verification status: PASSED（下の NOT RUN の項目を除く）
- Date: 2026-09-23。対象はこのリポジトリの作業ツリー
- 環境：macOS (Darwin 24.6.0)、Apple Silicon、Node v24.21.0、npm 11.19.0、SQLite 3.53.4（`node:sqlite`）
- `npm test`：9 ファイルすべて PASS、exit 0。同時実行テストでは実際に revision 競合が 7〜8 件起きて再試行され、更新の欠落はありませんでした
- `npm run build`：PASS（`tsc --noEmit` と Vite ビルド）
- `git diff --check`：git リポジトリではないため、各ファイルに `git diff --no-index --check /dev/null <file>` を実行し、空白の問題なし
- ブラウザでの手動確認：playwright-core と headless Google Chrome を使いました。サーバーは `SURVEY_HOST=0.0.0.0`、DB は `data/survey.sqlite` です
  1–3. guest タブ 2 つ（390×844）に、`energy-01` と `mobility-01` の異なる質問が割り当てられました
  4–6. monitor の WebSocket が connected になり、1 つ目の回答で revision 1、変化 `environment +3, technology +1` がすぐ表示されました
  7–8. 2 つ目のタブは revision 0 のまま送信して、revision 競合の表示が出ました。「最新 revision 1 で送り直す」で受理され、revision 2、answers 2 になりました
  9. 同じ answer ID の再送は「既存の結果を返しました。加算なし」となり、状態は revision 2 のままでした
  10–11. サーバーを SIGINT で停止して再起動し、`/api/city-state` の出力が再起動前と完全に一致しました
  12. `urban-forest` で environment 8 に達し、`greenNetwork` が解除されました。monitor に「解除: greenNetwork」と表示されました
  13. `central-ai`、`replace-all`、`import-logistics` の後、environment 7 でも `greenNetwork` は true のままでした
  14–16. `127.0.0.1` で `/admin` を開き、run、revision 6、回答数 6、予約 0、スコア、マイルストーンを確認しました。`reset` ではボタンが無効で、API は `reset_confirmation_invalid` を返しました。`RESET` で新しい run（revision 0、スコア 0、マイルストーンなし）になり、monitor が `run-reset` を受信しました
  17. DB を読み取り専用で確認：旧 run は `ended` で回答イベント 6 件（sequence 1–6）が残り、`admin_events` に `run-reset` が 1 件ありました
  18. LAN IP `192.168.40.190:8787` からは `/api/admin/current-run`、`/api/admin/events`、`/admin`、`/admin.html`、`POST /api/admin/reset` がすべて 403 で、run は変わりませんでした。同じ IP から `/api/city-state` と `/guest` は 200、`127.0.0.1` からの admin は 200 でした
- ブラウザのコンソール：想定どおりの 409（競合の確認）と `favicon.ico` の 404 だけでした。page error はありません
- 最初の確認でスコアバーが狭すぎたため CSS を直し、再ビルドしてから手順 12 以降を行いました
- 確認後、サーバーは停止しています。`data/survey.sqlite` は確認用の記録として残しています（gitignore 済み）

## NOT RUN / 制限

- 実機スマホ・実際の別端末からの操作：NOT RUN（LAN IP からの curl で代用）
- `::1` からの管理アクセス：実機では NOT RUN。サーバーが IPv4 の `0.0.0.0` で待ち受けていたため接続できませんでした。判定関数は自動テストで確認しています
- 別プロセス（別サーバー）が同じ DB に書き込む場合：worker thread で別接続を使うテストで代用しました。複数サーバープロセスの運用は想定していません
- 予約期限切れの画面表示：時計を差し替えた自動テストだけで、ブラウザでは 2 分待っての確認をしていません
- CI、Windows、Node 26：NOT RUN

## Known issues

- 質問 JSON の `version` を run の途中で変えても起動は止まりません。イベントに version を記録するだけです。予約中の質問が JSON から消えると、その session は `unknown_question` になります。
- 質問は JSON の順番で割り当てます。ランダム化や重み付けはありません。
- `favicon.ico` はありません（404）。

## Important decisions

- SQLite は `node:sqlite`（Node 24 で使えることを確認、追加依存なし）を使いました。
- WebSocket は `ws` を使いました。手書きのフレーム処理より保守しやすく、依存がない小さなライブラリです。
- デバッグ画面は API と同じサーバーから配信します。Vite プロキシを使うと接続元が loopback に見えて管理制限が効かなくなるため、使いません。
- 起動時にスナップショットとイベントの再計算を照合し、一致しなければ起動を止めます。

## Next expected step

`CitySurveyState` を city2127 の GLB 区画・建物交換機能へ変換する `CityVisualState` のマッピングを設計します（推測で実装はしない）。設計が決まるまでは `toCityViewInput` を入口として使います。このプロジェクトを git で管理するか、city2127 に統合するかはユーザーが決めてください。
