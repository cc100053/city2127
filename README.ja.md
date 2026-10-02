# 2127 — Frozen Intersection

## 2台で同時に回答 — 2026-10-02

同じ信頼できる LAN の survey server に接続し、1台で `http://<展示PCのLAN IP>:8787/guest?station=A`、もう1台で `http://<展示PCのLAN IP>:8787/guest?station=B` を開きます。各ステーション同時1体験なので、同じステーションのページを複数開かないでください。server は `SURVEY_HOST=0.0.0.0`（PowerShell：`$env:SURVEY_HOST='0.0.0.0'`）で起動します。各ステーションの四問・草稿・結果・交代は独立し、提案は server の受信順に累積、再送は一度だけ加算します。City の変化は3秒以上の間隔で展示し、提案番号と A/B を表示します。再接続は最新 snapshot に復元します。既存 `/guest` の単独モードは維持し、体験中の A/B と混在させないでください。

A/B のリセットは新しい開始を停止し、両方の回答・結果・交代が終わるまで保留します。Admin は指定した未完了ステーションだけを終了できます。通信断の草稿は開始から5分、記録済みの結果は予定展示から15秒で解放されます（結果復元時は表示租期を更新）。survey を build／再起動し Guest／City／Admin を更新してください。schema 7 は既存データを保持します。[handoff](docs/handoffs/two-guest-devices.md)を参照。

**言語：** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

来場者が一緒に未来のお台場をつくる展示です。各来場者は四つの質問に答え、一つの提案を送信します。次の来場者は、それまでの選択が反映された街を引き継ぎます。展示用の街はリポジトリ直下の Three.js シーン（`src/`）です。`survey/` サーバーが質問、状態、SQLite データベース、WebSocket 配信を管理します。`module-swap/` は旧 v1 の因果デモで、現在の v2 CityView には対応していません。

## 展示をローカルで起動する

開発用自動回答（DEV-ONLY）：`cd survey && npm run dev:auto` で新しい独立テスト SQLite を起動し、`http://127.0.0.1:8788/guest?dev-auto` を開きます。街はルート Vite の `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8788/ws` に接続します。localhost 専用の任意起動パネルが既存 Guest フローを繰り返し、次の質問開始時に自動で交代します。展示前に開発パネルを削除、または Admin に移してください。詳細は[アンケートの説明](survey/README.md)を参照。

Git と **Node.js 24 以上**（npm を含む）、WebGL 2 対応のデスクトップブラウザーが必要です。二つのターミナルタブを起動したままにします。特記がなければ、リポジトリのルートから実行してください。公開デプロイの設定はありません。

Admin の **直前の提案を取り消す** は、次の来場者が開始する前に、直前の完了した提案だけを取り消します。変更前の街と参加人数を復元し、元の提案は取消済みとして保存します。再回答は新しい四問の体験として開始します。survey を再ビルド・再起動し、City／Guest／Admin を更新してください。Undo は schema 6 で導入され、現在の SQLite はデータを削除せず schema 7 に移行します。A/B の新しい草稿を開始した後は、その草稿を中止しても古い提案の Undo は再び使えません。

### Mac — ターミナルを二つ開く

**タブ 1：アンケートサーバー** — API、WebSocket、guest／monitor／admin 画面、SQLite の状態を提供します。起動前に画面をビルドします。

```sh
cd survey
npm ci
npm run build
npm run server
```

**タブ 2：3D の街** — リポジトリのルートで新しいタブを開きます。Vite が Three.js シーンを提供します。

```sh
npm ci
npm run dev -- --port 5173
```

### Windows — PowerShell を二つ開く

**タブ 1：アンケートサーバー** — リポジトリのルートから開始します。

```powershell
Set-Location survey
npm ci
npm run build
npm run server
```

**タブ 2：3D の街** — リポジトリのルートで別の PowerShell タブを開きます。

```powershell
npm ci
npm run dev -- --port 5173
```

サーバーの標準アドレスは `127.0.0.1:8787` です。5173 番ポートが使用中の場合、街には Vite が実際に表示した URL を使ってください。サーバーのポートを変更した場合は、街の URL に WebSocket のアドレスを明示します。

### ブラウザーのタブと画面

| タブ | 標準 URL | 役割 |
| --- | --- | --- |
| Guest（単独） | `http://127.0.0.1:8787/guest` | 四つの質問への回答、確認、一つの提案の送信。 |
| Guest A/B（2台） | `http://<展示PCのLAN IP>:8787/guest?station=A` ／ `?station=B` | 独立した四問の体験で同じ街に提案します。 |
| City | `http://127.0.0.1:5173/?survey` | 展示用の 2127 年のお台場。`ws://127.0.0.1:8787/ws` から変化を受信します。`?survey` を付けて開きます。 |
| Admin | `http://127.0.0.1:8787/admin` | スタッフが状態を確認し、未完了の体験を終了し、リセットを要求・取消します。サーバー PC の localhost からのみ利用可能です。 |
| Monitor（任意） | `http://127.0.0.1:8787/monitor` | 現在の状態と、画面を開いてから受信した提案・WebSocket イベントを文字で確認する画面。3D の街ではありません。 |

City を展示スクリーン、Guest を入力スクリーンで開き、Admin はスタッフ用 PC に置きます。以下の次の開始時にリセットする規則は単独 `/guest` 用です。A/B は上記の通り新規開始を停止し、両体験の終了を待ちます。提案後、次の来場者は **はじめる** で開始できます。Admin の退出確認は不要です。保留中のリセットは次の開始時に実行されます。Admin の **未完了の体験を終了** は未完了の質問を中止するための操作です。サーバーはビルド済み画面と API を同じ origin で提供し、Vite は街を別に提供します。標準の DB は `survey/data/survey.sqlite` で、サーバーを再起動しても街の状態は残ります。`npm ci` は初回と lockfile 更新時に実行します。通常の再起動ではタブ 1 の build／server とタブ 2 の dev を実行してください。

**信頼できる同一 LAN** の別端末から Guest／City を開く場合は、survey を LAN に公開し（City も別端末で開く場合だけ Vite も公開）、URL の `127.0.0.1` をホスト PC の LAN IP に置き換えます。

```sh
# Mac: survey/ で実行（タブ 1）
SURVEY_HOST=0.0.0.0 npm run server
# リポジトリのルートで実行（タブ 2）
npm run dev -- --host 0.0.0.0 --port 5173
```

```powershell
# Windows PowerShell: survey/ で実行（タブ 1）
$env:SURVEY_HOST='0.0.0.0'; npm run server
# リポジトリのルートで実行（タブ 2）
npm run dev -- --host 0.0.0.0 --port 5173
```

両ポートに接続できる必要があります。Admin は引き続きサーバー PC の localhost 専用です。Guest には認証がないため、信頼できる展示 LAN で利用してください。例えばサーバーを 8790 番で動かす場合、街の URL は `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8790/ws` です（LAN ではホスト名も置き換えます）。

アンケートに接続しない街の単独表示は `http://127.0.0.1:5173/` で開けます。この場合、タブ 1 は不要です。旧 v1 の module-swap デモは[引き継ぎ文書](docs/handoffs/causal-city-mvp.md)を参照してください。展示用の街ではありません。

## 関連文書

- [Agent の作業手順](AGENTS.md)、[Git の運用](docs/CONTRIBUTING.md)、[構成](docs/PROJECT.md)、[検証](docs/VALIDATION.md)。
- [現行展示仕様](docs/EXHIBITION_SPEC.md)と[S4 引き継ぎ](docs/handoffs/exhibition-s4.md)は、現行契約と当時の S4 検証記録をそれぞれ記載しています。
- [繁體中文 README](README.md)には DEV-only review tools の説明があります。過去の Plan 02 と証拠は文書索引の「歴史」を参照してください。

## 現在の方針

展示会はお台場のみ。渋谷は終了した過去の決定で、今後は開発しません（2026-10-02）。旧計画の未完了項目は今後のタスクではありません。S5、入力機器、展示当日の reset／recovery 方針は未検証です。

資料の役割と過去の記録は[文書索引](docs/README.md)、視覚方針は[CITY MASTER TASTE](docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md)、実装規則は[ART](docs/ART.md)を参照してください。`module-swap` は現行 v2 CityView を受け付けません。

住民P2（2026-10-02）：surveyを再build／再起動し、Guest／Cityを更新してください。四つの問いを日常の希望に改め、確認は送信前に残しています。結果は保存／待機、ステーション／暮らしの声番号、街を見る案内のみ；Cityは背景／現在の施設と記録確認を表示します。Question-set version3でもSQLiteと保存済み回答の原文は保持します。旧草稿は「新しい予約で草稿を続ける」で有効な選択を引き継ぎます；A/Bは自分の旧予約を終了してから再予約します。3秒の変化／表示間隔、result10秒／handoff5秒は維持；閲覧枠と変化の理由はP3です。[P2引き継ぎ](docs/handoffs/resident-experience-p2.md)。
