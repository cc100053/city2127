# 用語集 — Odaiba 2127

同じものを、文書ごとに日本語・中国語（繁中／広東語）・英語・コード上の名前で呼んでいます。検索するときは、この表の同じ行にある語をまとめて使ってください（例：`rg -n "Meter|物差し|メーター"`）。

- 仕様の正本は [EXHIBITION_SPEC](EXHIBITION_SPEC.md)、コードの対応は [PROJECT](PROJECT.md)、画面の文言は [RESIDENT_COPY](RESIDENT_COPY.md) です。この表は「呼び名の対応」だけを扱い、仕様を決めません。
- 数値は [SPEC](EXHIBITION_SPEC.md)／[PROJECT](PROJECT.md) と同じものを書いています。食い違ったら SPEC／PROJECT を正とし、この表を直してください。

## 画面と装置

| 日本語 | 中文 | English / code | 意味 |
| --- | --- | --- | --- |
| 回答画面、iPad | 問卷、Guest 頁、iPad | Guest, `/guest`, `guestDebugView.ts` | 来場者が4問に答える画面（survey server が配信） |
| 大画面、街の画面 | 大屏幕、城市 | City, root, `?survey` | 3D の街。root `src/` を Vite で表示 |
| 右上のカード、結果カード | 右上卡片、結果卡、日常卡 | resident card, reading card, `surveyAtmosphere.ts` | 大画面右上の 360px の文字カード。普段は背景・施設カード、結果時は10秒の結果表示 |
| モニター | 監視頁 | Monitor, `/monitor` | 開発・運営用の状態表示 |
| 管理画面 | 管理頁 | Admin, `/admin` | リセット、Undo、昼夜設定（loopback のみ） |
| ステーション A／B、2台同時回答 | 雙站、A/B 站 | station A/B, `?station=A` | 2台の iPad が同時に回答するモード |
| 単独モード | 單站 | single station, unlabelled `/guest` | ステーション指定なしの1台モード |

## 回答とデータ

| 日本語 | 中文 | English / code | 意味 |
| --- | --- | --- | --- |
| 回答、提案、暮らしの声 #n | 提案、一票、回答 | proposal, `ordinal` | 1人分の4問の回答。`#n` は提出番号で、住民の人数ではない |
| 票（−1／0／+1） | 票 | vote | 各問の選択が1つの軸に入れる値。0 は「両方」の選択肢 |
| 回 | run | run, `runId` | リセットからリセットまでの1つの街の履歴 |
| 街のリセット／全リセット | 重設 | city reset / full reset | 街を初期化する。全リセットは累計人数も変える |
| 取り消し | 撤回 | Undo | 管理画面から最新の提案1件を取り消す |
| リビジョン | 版本 | revision | 街の状態の版番号。送信時の競合判定に使う |
| 問いのセット 版3 | 題目版本3 | question-set version 3 | 現行の4問の文言の版 |
| スキーマ 7 | schema 7 | SQLite schema 7 | 回答サーバーのデータベースの版 |
| v2／v1 | v2／v1 | CityView v2 / legacy v1 | v2 が現行の4問方式。v1 は旧方式（module-swap 等に残る） |

## 4つの物差し（Meter）

| 日本語 | 中文 | English / code | 意味 |
| --- | --- | --- | --- |
| 物差し、メーター、軸 | Meter、軸 | Meter, axis, `AXES` | 回答を積み重ねる4本の値。どの値も成熟した2127年の姿 |
| サービスの担い手 | 自動化、服務 | `automation`, `service-2127`, socket `nw` | 人の窓口 ↔ 自律サービス。場所：デックス西。色 `#3fa9ff` |
| 空間の使い方 | 共享、公共空間 | `publicSharing`, `commons-2127`, socket `sw` | 囲われた静かな席 ↔ 開かれた共有席。場所：アクアシティ南。色 `#ff6f91` |
| 暑さへの備え | 環境、氣候 | `environmentalPriority`, `cooling-2127`, socket `ne` | 屋根・冷却設備 ↔ 木陰・植栽。場所：お台場海浜公園。色 `#5fe08a` |
| 機能の配置 | 集中、機能 | `urbanConcentration`, `functions-2127`, socket `se` | 分散した低い建物 ↔ タワーに集中。場所：フジテレビ東。色 `#ffb347` |
| 形態、帯（低／中間／高） | 形態、band | band `low` / `mixed` / `high` | 物差しの値から決まる見た目の段階 |
| スコア M | 分數 | score `M`, `scores` | 累積の値（±12）。式は SPEC |
| 表示スコア D、刻度A | 刻度A、展示分數 | Scale A, display score `D`, `exhibitionStateLayout` | 街の見た目に使う値。1人目 ×0.85 から12人目以降 ×2.4（2026-10-13〜） |
| 中心地点、4つの場所 | focal site、四個 site | focal site, socket `nw/ne/sw/se`, `changeSites` | 物差しごとに変化を見せる4か所 |
| 地区全体の変化 | district、全區 | district layer, `districtMeters.ts` | 4か所以外に広がる変化 |
| 施設の担い手 | carrier | carrier | 変化を目に見せる具体物（端口、席、樹冠など） |
| 配置の枠 | slot、槽位 | slot, `slotSeeds` | 地区の施設を置く場所の枠。履歴から並びが決まる |
| 組み合わせの施設 | 配對設施 | pairing (P10) | 2つの物差しがそろったときだけ出る追加施設 |
| 配置 | layout | layout, `ExhibitionLayout` | サーバーが決める正式な街の配置 |

## 時間と演出

| 日本語 | 中文 | English / code | 意味 |
| --- | --- | --- | --- |
| 一票の旅、光 | 一票旅程、光點 | vote journey, orbs, lanterns, `voteJourney.ts` | 送信後、4色の光が4か所へ飛ぶ演出（約2.6秒）。直近64人分の光が上空に残る |
| 変化（3秒） | 過渡 | transition (3 s) | 街が新しい配置に変わる時間 |
| 光の輪、光の柱 | pulse、光柱、掃描環 | pulse, scan ring, `meter-pulse` | 変化した場所を示す効果 |
| 結果の表示時間（10秒） | 閱讀時段 | reading slot (10 s) | 1人分の結果を大画面に出す保護時間 |
| 交代（5秒） | 交接 | handoff (5 s) | iPad の「次の方へどうぞ」画面。**作業記録の handoff とは別物** |
| 結果のリース（15秒） | lease | result lease (15 s) | 表示開始から15秒でステーションを解放 |
| 1日（180秒） | 日夜循環 | day cycle, `dayCycle.ts` | 街の1日。管理画面で昼／夜／自動を選べる |

## 開発用の URL パラメータ

| パラメータ | 意味 |
| --- | --- |
| `?survey` | 回答サーバーにつなぐ（`?survey=ws://…/ws` で接続先を指定） |
| `?quality=low` | 低画質モード（影・陰影・アンチエイリアスなし） |
| `?hour=0..23.999` | 時刻を固定する |
| `?scaleLab` | DEV のみ。刻度と一票の旅の確認ツール |
| `/guest?dev-auto` | DEV のみ。自動回答パネル（`npm run dev:auto`、ポート 8788） |
| `?review=street` | DEV のみ。歩道とベンチの確認用カメラ |
| `?meters` | DEV のみ。物差しの値を直接動かす |

## 作業と文書

| 日本語 | 中文 | English | 意味 |
| --- | --- | --- | --- |
| 作業記録 | 交接 | handoff (`docs/handoffs/`) | 作業ごとの記録。**iPad の交代画面とは別物** |
| 住民体験 P1〜P5 | 居民 P1–P5 | resident P1–P5 | 文言（P1）〜実機検証（P5）の段階 |
| 今日の台場、振り返り | 回顧章節 | day replay | 計画中。その日の変化の早送り |
| 変化説明カード | 變化說明卡 | change explanation | TODO。「何が何に変わったか」を右上カードで説明 |
| フジテレビ（の建物） | 富士電視台 | Fuji TV, `civicCore` | 実行時はプログラムで作った建物に置き換え |
| 渋谷（終了） | 澀谷 | Shibuya | 終了した旧会場。現行ではない |
| module-swap | module-swap | module-swap | 旧 v1 のデモ。展示の街ではない |
