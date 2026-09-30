# 2127 — Frozen Intersection

**言語：** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

来場者が一緒に未来の渋谷をつくる展示です。各来場者は四つの質問に答え、一つの提案を送信します。次の来場者は、それまでの選択が反映された街を引き継ぎます。展示用の街はリポジトリ直下の Three.js シーン（`src/`）です。`survey/` サーバーが質問、状態、SQLite データベース、WebSocket 配信を管理します。`module-swap/` は旧 v1 の因果デモで、現在の v2 CityView には対応していません。

## 展示をローカルで起動する

Git と **Node.js 24 以上**（npm を含む）、WebGL 2 対応のデスクトップブラウザーが必要です。二つのターミナルタブを起動したままにします。特記がなければ、リポジトリのルートから実行してください。公開デプロイの設定はありません。

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
| Guest | `http://127.0.0.1:8787/guest` | 四つの質問への回答、確認、一つの提案の送信。 |
| City | `http://127.0.0.1:5173/?survey` | 展示用の 2127 年の渋谷。`ws://127.0.0.1:8787/ws` から変化を受信します。`?survey` を付けて開きます。 |
| Admin | `http://127.0.0.1:8787/admin` | スタッフが状態を確認し、来場者の退出を確定し、リセットを要求・取消します。サーバー PC の localhost からのみ利用可能です。 |
| Monitor（任意） | `http://127.0.0.1:8787/monitor` | 現在の状態と、画面を開いてから受信した提案・WebSocket イベントを文字で確認する画面。3D の街ではありません。 |

City を展示スクリーン、Guest を入力スクリーンで開き、Admin はスタッフ用 PC に置きます。提案後、次の来場者を開始するにはスタッフが Admin の **観客の退出を確認** を押す必要があります。保留中のリセットも、この退出確認後に実行されます。サーバーはビルド済み画面と API を同じ origin で提供し、Vite は街を別に提供します。標準の DB は `survey/data/survey.sqlite` で、サーバーを再起動しても街の状態は残ります。`npm ci` は初回と lockfile 更新時に実行します。通常の再起動ではタブ 1 の build／server とタブ 2 の dev を実行してください。

**信頼できる同一 LAN** の別端末から Guest／City を開く場合は、両サービスを LAN に公開し、URL の `127.0.0.1` をホスト PC の LAN IP に置き換えます。

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
- [展示 MVP 仕様](docs/EXHIBITION_MVP.md)と[S4 引き継ぎ](docs/handoffs/exhibition-s4.md)に、現在の四問フローと既知の制約を記載しています。
- [繁體中文 README](README.md)には、プロジェクトの詳細な履歴、Plan 02、および初期プロトタイプの参考資料があります。
