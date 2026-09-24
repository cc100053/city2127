# Module Swap

地面・区画・建物の交換テスト用の自己完結パッケージです。

配置状態は`CityLayoutState`で表し、アンケート側の`CitySurveyState`とは別物です。

## 内容

- `app/`: Vite + Vanilla TypeScript + Three.js 0.180のテストアプリ
- `assets/`: 8アセットそれぞれの最新BlendとGLBの組
- `app/public/assets/models/`: アプリが実行時に読む8個のGLB
- `scripts/sync-models.mjs`: `assets/`から実行時GLBを同期・検証するスクリプト
- `verification/modular-ground-reassembly-test.blend`: 個別GLBの再組立て検証Scene

## GLBの正本

**正本は`assets/<id>/<id>.glb`です。** `.blend`と対で置かれた、人が編集する側のファイルです。`app/public/assets/models/<id>.glb`はViteが配信するための出力で、正本からコピーされたものです。直接編集しないでください。

Blenderから再exportしたあとは、必ず同期してください。

```sh
npm run sync:models    # assets/ → app/public/assets/models/ へコピー
npm run check:models   # 8個が一致しているか検証。ズレていればexit 1
```

`npm test`は`check:models`を先に実行するので、同期を忘れたままテストを通すことはできません。

バックアップBlend、`.blend1`、`node_modules`、`dist`は含めていません。

## 必要環境

- Node.js 24以上
- npm 11系
- Blender 5.2 LTSで最終確認

nvmを使う場合は、作業前に`nvm use 24`でNode 24へ切り替えてください。Node 20以下では`npm test`が`node: bad option: --experimental-strip-types`で失敗します。

## 起動

```sh
nvm use 24
npm run install:app
npm test
npm run dev
```

アプリの実体は`app/`にありますが、上記コマンドはこのパッケージのルートから実行できます。

本番ビルド:

```sh
npm run build
npm run preview
```

## `?survey`モード（因果MVP、2026-09-24）

`survey/`サーバー（既定`127.0.0.1:8787`）を起動してから、ViteのURLに`?survey`（または`?survey=ws://host:port/ws`）を付けて開きます。`ws://`／`wss://`で始まらない値（例：`?survey=1`）は既定URLになります。

- 配置はサーバーの`CityView.layout`だけから決まり、localStorageは読みません。接続・再接続のたびに全体スナップショットで再構築します。
- 新しいrevisionだけを`ModuleManager.transitionTo()`で適用し、変わった区画だけをアニメーションします。
- デバッグパネルは隠れ、CHOICE / POLICY / CITY EFFECTと決定履歴のパネル、各区画の意味ラベルを表示します。カメラは高めの固定位置`(-38,105,88)`です。
- 通常モード（`?survey`なし）の初期配置、保存、自己テストは変わりません。

## 主要な検証済みNode

- `socket_lot_nw`
- `socket_lot_ne`
- `socket_lot_sw`
- `socket_lot_se`
- `connector_road_north`
- `connector_road_east`
- `connector_road_south`
- `connector_road_west`
- `socket_building_center`

建物は`ground-cross`の区画socketへ直接置かず、`lot-empty`内の`socket_building_center`へ接続します。

## 補足

- 外部CDN、外部画像、外部フォントは使用していません。
- Git履歴やGit設定はこのフォルダーには作成していません。
- `npm run build`ではThree.jsを含むJSチャンクについて500KB超過警告が出ますが、ビルドは成功します。
