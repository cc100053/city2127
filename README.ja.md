# Mind craft― 選択の積み重ねでつくる都市 ―

**言語：** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

2127年のお台場を舞台にした展示作品です。来場者は iPad で9問のうち4問に答え、大画面の街が変わり、次の来場者は積み重なった街を引き継ぎます。このファイルは展示の起動ガイドです。作品内容と仕様は[ドキュメント索引](docs/README.md)を参照してください。

## 事前準備

- 展示用PC（Mac または Windows）：Git、**Node.js 24 以上**、WebGL 2 対応のデスクトップブラウザ。
- iPad：展示用PCと同じ信頼できる LAN に接続し、HTTPS 証明書をインストール・信頼済みにします（mkcert の `rootCA.pem`。iPadOS の「証明書信頼設定」で完全な信頼を有効化）。
- 初回セットアップ時と lockfile 更新後は、リポジトリ直下で `npm ci`、`survey/` で `npm ci` と `npm run fetch:hand-model` を実行します。証明書と秘密鍵は `survey/data/tls/` に置きます。詳しくは [survey ガイド](survey/README.md#ipad住民の窓與手勢操作)を参照してください。

## 1. 二つのサーバーを起動

展示中は二つのターミナルを開いたままにします。

**Windows ワンクリック起動：** リポジトリ直下の `start-windows.cmd` をダブルクリックします。Node 24 を使い（PATH 上に古い Node があれば nvm の版に切り替え）、依存関係が無いか古ければ `npm ci` を実行し、下記の二つのサーバーを別々のウィンドウで起動したうえで、専用 Chrome プロファイルに `--force_high_performance_gpu` を付けて大画面を開きます。Intel + NVIDIA のノート PC でも外部 GPU を使います。`survey/data/tls/` に証明書があれば LAN／HTTPS モードで起動して iPad 用 URL を表示し、無ければローカルのみで起動します。オプション：`-Low`（`&quality=low`）、`-Kiosk`（全画面）、`-NoBrowser`、`-Local`（証明書があってもローカルのみ）。例：`.\start-windows.cmd -Kiosk -Low`。Windows での iPad 準備：`winget install FiloSottile.mkcert`、`mkcert -install` の後、`survey/` で `mkcert -cert-file data/tls/ipad.pem -key-file data/tls/ipad-key.pem <LAN IP> localhost 127.0.0.1`（LAN IP が変わったら再発行）。`%LOCALAPPDATA%\mkcert\rootCA.pem`（`rootCA-key.pem` は渡さない）を各 iPad に入れて信頼し、Windows ファイアウォールで TCP 8443・8787 の受信を許可します（管理者で `New-NetFirewallRule -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8443,8787 -RemoteAddress LocalSubnet`）。スクリプトは九問の抽題輪換を使うため、現在の run が旧四問の DB では、Admin で都市をリセットするまでゲストは開始できません。

**ターミナル 1 — アンケートサーバー**（API、WebSocket、Guest／Admin ページ、SQLite データ）

Mac：

```sh
cd survey
npm run build
SURVEY_HOST=0.0.0.0 \
  SURVEY_QUESTIONS=src/survey/questions.rotation.v1.json \
  SURVEY_TLS_CERT=data/tls/ipad.pem \
  SURVEY_TLS_KEY=data/tls/ipad-key.pem \
  npm run server
```

Windows PowerShell：

```powershell
Set-Location survey
npm run build
$env:SURVEY_HOST='0.0.0.0'
$env:SURVEY_QUESTIONS='src/survey/questions.rotation.v1.json'
$env:SURVEY_TLS_CERT='data/tls/ipad.pem'
$env:SURVEY_TLS_KEY='data/tls/ipad-key.pem'
npm run server
```

サーバーの既定値はまだ退役した旧質問セットのため、`SURVEY_QUESTIONS` で9問の抽題輪換セットを必ず指定します。起動するとターミナルに iPad 用の `LAN Guest:` URL が表示されます。

**ターミナル 2 — 3D の街**（リポジトリ直下で実行）

```sh
npm run dev -- --port 5173
```

## 2. 各デバイスで開く URL

| デバイス | URL | 用途 |
| --- | --- | --- |
| 大画面（展示用PC） | `http://127.0.0.1:5173/?survey` | 街の表示。GPU が弱い場合は `&quality=low` を追加 |
| iPad A | `https://<展示用PCの LAN IP>:8443/guest?station=A&hand` | 来場者の回答（ハンドジェスチャーとタッチ） |
| iPad B | `https://<展示用PCの LAN IP>:8443/guest?station=B&hand` | 二台目の回答ステーション |
| スタッフ（展示用PC） | `http://127.0.0.1:8787/admin` | 状態、リセット、取り消し、昼夜設定。localhost のみ |
| モニター（任意） | `http://127.0.0.1:8787/monitor` | 状態とイベントをテキストで確認 |

iPad が一台の場合は `https://<展示用PCの LAN IP>:8443/guest?hand` を開きます。未完了の体験がある間は単独ステーションと A／B を混在させず、同じステーションで複数のページを開かないでください。URL から `hand` を外すとタッチ専用画面になります。

## 3. 展示中の操作

- **引き継ぎ：** 送信後、iPad に結果と引き継ぎ画面が表示されます。次の来場者が「はじめる」を押すと、スタッフの確認なしで引き継がれます。
- **Admin：** 「未完了の体験を終了」は未完了のアンケートを終了します。「直前の提案を取り消す」は次の来場者が始める前に限り、最後の提案を取り消します。「昼／夜／自動」は大画面の時刻を固定するか、昼夜サイクルに戻します。City reset は総人数を保持し、full reset は人数をゼロにしますが履歴は残します。
- **データ：** SQLite は `survey/data/survey.sqlite` に保存され、再起動しても積み重なった街を引き継ぎます。旧質問セットから抽題輪換セットに切り替えるときは、先に Admin で街をリセットします。
- **コード更新後：** ターミナル 1 の build と起動コマンドを再実行し、大画面、iPad、Admin を再読み込みします。
- **サーバーのポートを変える場合（例：8790）：** 大画面で `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8790/ws` を開きます。

## ローカルでの試用（iPad なし）

ターミナル 1 で `survey/` に移動して `npm run build` を実行し、続けて `SURVEY_QUESTIONS=src/survey/questions.rotation.v1.json npm run server` を実行します。ターミナル 2 は上記と同じです。同じPCで `http://127.0.0.1:8787/guest` を開いて回答し、`http://127.0.0.1:5173/?survey` で街を確認します。`http://127.0.0.1:5173/` だけを開くと、提案を受け取らない街のプロトタイプになります。

## 関連ドキュメント

- [展示仕様](docs/EXHIBITION_SPEC.md) · [検証ガイド](docs/VALIDATION.md)（展示用PC、iPad 二台、長時間運用）· [LAN 二台設定](docs/handoffs/lan-guest-stations.md)
- 開発者・AI agent 向け：[AGENTS.md](AGENTS.md) · [構成](docs/PROJECT.md) · [ドキュメント索引](docs/README.md) · DEV 自動回答は [survey ガイド](survey/README.md)
- `module-swap/` は保存されている v1 デモで、展示用の街ではありません。
