# Shibuya 変化位管理器 実装ログ

更新日: 2026-09-27  
作業ディレクトリ: `city2127-change-manager`  
現在のブランチ: `codex/automation-hub-upper-glb`

## 元プロンプトが実現したかったこと

従来の `module-swap` の「socketへ部品を取り付ける」考え方を、root Shibuya sceneの「siteごとにvariant/stateを選び、必要な部分だけアニメーション付きで追加・交換する」仕組みへ発展させる。

目標となる責務分離は次のとおり。

```text
Survey server
  question → choice → scores → CityView
                         ↓
changeCatalog
  siteとvariant/layerの宣言
                         ↓
CityChangeManager
  snapshot復元、差分更新、変更siteのみtransition
                         ↓
siteBuilders / siteAssets
  procedural、GLB、props、effectsの構築・読み込み
                         ↓
Three.js scene
```

重要な方針:

- Survey serverを唯一のデータソースとして維持する。
- アンケート処理からThree.js Sceneを直接変更しない。
- `CityView.layout`から各Shibuya siteのvariantを決定する。
- 変更されていないsite/layerは再構築・再アニメーションしない。
- snapshot復元、incremental update、resetを明確に分ける。
- procedural cityを一度にGLBへ置き換えず、変化する部分だけを段階的にGLB化する。
- GLBが失敗しても展示を止めず、procedural fallbackを残す。
- asset、footprint、互換site/layer、向き、material、reload整合性を検証する。

## 実装した内容

### Stage 1 — Shibuya change manager

ブランチ: `codex/shibuya-change-manager`  
先端コミット: `2781dc9`

- 旧 `surveySites.ts` の責務を分割した。
- `changeCatalog.ts`へ4つのShibuya siteとvariant/layerをdata-drivenに定義した。
  - `magnetEast`: baseline / automation-medium / automation-tall
  - `stationEastPark`: baseline / park
  - `dogenzakaSouth`: baseline / plaza
  - `centerGaiRear`: baseline / tower-medium / tower-tall
- `CityChangeManager`を追加し、以下を実装した。
  - `restoreFromSnapshot()`
  - `applyIncrementalUpdate()`
  - 変更layerだけのtransition
  - 進行中transitionの現在値からのretarget
  - reset時のsink/hide
- snapshot/reload/resetではguest markerを点滅させず、live updateだけ10秒間点滅させるよう整理した。
- 既存の3秒rise/sink、形状、共有material、survey表示を維持した。
- Survey server、質問、score、`CityView` schemaは変更していない。

主なファイル:

- `src/surveyView.ts`
- `src/changeCatalog.ts`
- `src/cityChangeManager.ts`
- `src/createCityChangeManager.ts`
- `src/siteBuilders/`

### Stage 2 — Hybrid site asset layer

ブランチ: `codex/shibuya-site-assets`  
先端コミット: `66d93de`

- catalogのlayerに次の情報を追加した。
  - `kind`: procedural / glb / prop / effect
  - `assetId`
  - enter/exit animation
- PARKを`parkSurface`と`parkTrees`へ分割した。
- `src/siteAssets/`を追加した。
  - asset catalog
  - GLTFLoader cache
  - root/identity/static content/bounds/compatibility検証
  - clone境界
- 既存の`future-tree-2127.glb`を、PARK初回表示時だけ読み込むlazy assetへ移行した。
- runtime asset statusを追加した。
  - idle
  - loading
  - ready
  - fallback
- `CityChangeManager.getDiagnostics()`とcanvas debug datasetから状態を確認できるようにした。
- optional assetの失敗がsite transitionを止めない構造にした。

### Stage 3 — AUTO HUB upper GLB

ブランチ: `codex/automation-hub-upper-glb`  
実装コミット: `7ba868f`  
handoffコミット: `eec9ff3`

- AUTO HUBのtall時に追加される上層を専用GLBへ移行した。
- Blender 5.2.2で次のsource/exportを作成した。
  - `asset/models/automation-hub-upper/automation-hub-upper.blend`
  - `asset/models/automation-hub-upper/automation-hub-upper.glb`
- asset contract:
  - root: `ROOT_AUTOMATION_HUB_UPPER`
  - front marker: `front_marker`
  - compatible site/layer: `magnetEast` / `hubUpper`
  - Blender bounds: `(-2.9, -2.9, 0)`〜`(2.9, 2.9, 20.3)`
  - 12 meshes / 4 materials / 1,796 triangles
  - GLB: 75,428 bytes
- root metadata、footprint、高さ、front marker、animation/camera/light不在を検証するようにした。
- GLB内material名をroleとして検証し、root sceneの共有materialへ置き換えるようにした。
  - `city_glass`
  - `city_trim`
  - `city_future_light`
  - `city_solar`
- `automation-medium`ではGLBを要求せず、`automation-tall`初回表示時だけlazy loadする。
- 検証・material remap・batchingが完了したGLBを追加してからprocedural upperを外すatomic replacementにした。
- fetchまたはasset contract検証が失敗した場合、procedural upperを残して`fallback`を報告する。
- snapshot復元時に一時表示されたfallback geometryを差し替え後にdisposeし、GPU geometry数が増えたままにならないようにした。
- 不要なBlender backup `.blend1`は成果物から除外した。

詳細: `docs/handoffs/automation-hub-upper-glb.md`

## ブランチ構成

3ブランチは直列に積まれている。以下は各Stageのhandoff時点を示す主要コミットであり、`log.md`の追加コミットはStage 3ブランチのその後ろに置く。

```text
main: aea125e
└─ codex/shibuya-change-manager: 2781dc9
   └─ codex/shibuya-site-assets: 66d93de
      └─ codex/automation-hub-upper-glb: eec9ff3
```

したがって、次のどちらでも統合できる。

1. Stage 1 → Stage 2 → Stage 3の順にmergeする。
2. Stage 1+2+3を一度に入れる場合は最後のブランチだけをmergeする。

順番にfast-forwardできる状態の例:

```sh
git switch main
git merge --ff-only codex/shibuya-change-manager
git merge --ff-only codex/shibuya-site-assets
git merge --ff-only codex/automation-hub-upper-glb
```

remoteへのpushとmainへのmergeはまだ行っていない。

## 実施した検証

### TypeScript / build

- Node `24.21.0`
- `npm test`: 12 PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- production buildに両GLBが出力されることを確認した。
- 既存の500 kB超chunk warningは残っている。build failureではない。

### Blender / GLB

- `.blend` sourceを保存できることを確認した。
- GLBをBlenderへ再インポートした。
- root identity、bounds、front marker、metadata、material名を確認した。
- 12 meshes、4 materials、1,796 trianglesを確認した。
- Camera、Light、Animation、外部textureがないことを確認した。
- Three.jsの実consumerでも読み込みを確認した。

### Browser smoke

条件: headless Google Chrome、1280×720、DPR 1、12:00固定、scratch survey DB。

- baseline: 356 draw calls / 90 geometries、hub assetはidle、request 0。
- automation-medium: 386 / 98、hub assetはidle、request 0。
- all-sites + automation-tall: 521 / 133、hub assetはready、request 1。
- reload復元: 521 / 133、tall/readyを復元。
- reset: 356 / 133、全variantがbaseline。
- GLB通信を意図的に失敗させた場合: 521 / 133、hub assetはfallback、procedural tall upperを維持。
- console exception: なし。
- faviconを除くHTTP error: なし。
- all-sites frameを目視し、配置、scale、materialの破綻がないことを確認した。

## 現在の既知事項

- resetはlayerを非表示にするが、正常に読み込んだGLB cacheはページ内に保持する。再利用を意図した動作である。
- AUTO HUB upperは垂直軸まわりにほぼ対称なので、`front_marker`はcontractとして有効だが、現在のsilhouetteから方向差は分かりにくい。
- 既存のbase cityにあるHachiko treeとPARK tree layerは同じtree GLBを別consumerとして使っている。
- generic socket placement、占有管理、道路connectorへの自動接続は今回のsite managerにはまだ含めていない。
- siteごとのGLBはAUTO HUB upperだけで、PARK surface、COMMONS PLAZA、TOWERはまだ主にproceduralである。
- 実GPU FPS、展示PC、1920×1080でのperformanceは未測定。
- remote branch、Pull Request、CI実行は未作成。

## TODO

優先順:

1. 3本のbranchをremoteへpushし、Stage 1、Stage 2-only delta、Stage 3-only deltaを個別レビューする。
2. 展示予定PCで1280×720と1920×1080の実GPU FPS、draw calls、geometry数、pixel ratioを測定する。
3. `automation-hub-upper`の最終アートレビューを行い、必要なら非対称なfront-facing detailを追加する。
4. PARK props、COMMONS canopy、TOWER topなど、次にGLB化する変化layerを一つ選ぶ。
5. GLB追加時に同じmetadata/material/footprint/fallback contractを再利用する。
6. 必要性が確定した段階で、site footprint、道路侵入、occupied socket、配置transformを扱うplacement validationを拡張する。
7. reload/reset/asset failureを含むbrowser smokeを、可能ならCIまたは再利用可能なrepository scriptへ移す。
8. 展示運用として、ネットワーク切断時、survey server再起動時、全質問終了時の扱いを確定する。

## 変更していないもの

- Survey serverのquestion allocation、score計算、SQLite schema。
- `CityView` wire contractと4つのpolicy axis。
- 固定道路、交差点、歩道、既存Shibuya massing。
- 既存のday/night、traffic、pedestrian、delivery、camera pipeline。
- Three.js、TypeScript、Vite、Nodeの技術スタックと依存関係。
