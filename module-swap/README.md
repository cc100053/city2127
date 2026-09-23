# Module Swap Latest

別ブランチへ移すために整理した、地面・区画・建物交換テストの自己完結パッケージです。

配置状態は`CityLayoutState`で表し、アンケート側の`CitySurveyState`とは別物です。

## 内容

- `app/`: Vite + Vanilla TypeScript + Three.js 0.180のテストアプリ
- `app/public/assets/models/`: アプリが実行時に読む8個のGLB
- `assets/`: 8アセットそれぞれの最新BlendとGLBの組
- `verification/modular-ground-reassembly-test.blend`: 個別GLBの再組立て検証Scene

`app/public/assets/models/`のGLBと`assets/`の同名GLBは同一内容です。前者はWeb実行用、後者はBlender制作データとの対応確認用です。

バックアップBlend、`.blend1`、`node_modules`、`dist`は含めていません。

## 必要環境

- Node.js 24以上
- npm 11系
- Blender 5.2 LTSで最終確認

nvmを使う場合は、作業前に`nvm use 24`でNode 24へ切り替えてください。Node 20以下では`npm test`が`node: bad option: --experimental-strip-types`で失敗します。

## 起動

```sh
nvm use 24
cd app
npm install
npm test
npm run dev
```

本番ビルド:

```sh
npm run build
npm run preview
```

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
