# 2127 — Frozen Intersection

**語言 / Languages / 言語：** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

## 展覽啟動（Mac / Windows）

需要 Git、Node.js **24 或以上**（連 npm），以及支援 WebGL 2 嘅桌面瀏覽器。喺 repo 根目錄執行；每個 terminal tab 要保持開住。首次安裝或 lockfile 更新先跑 `npm ci`。目前係本機展覽流程，未設公開部署。

### Mac：Terminal 開兩個 tab

**Tab 1 — 問卷 server**（API、WebSocket、guest／monitor／admin 頁面，同 SQLite 資料）：

```sh
cd survey
npm ci
npm run build
npm run server
```

**Tab 2 — 3D 城市**（根目錄 Three.js 場景；另開一個 terminal tab，從 repo 根目錄執行）：

```sh
npm ci
npm run dev -- --port 5173
```

### Windows：PowerShell 開兩個 tab

**Tab 1 — 問卷 server**（由 repo 根目錄開始）：

```powershell
Set-Location survey
npm ci
npm run build
npm run server
```

**Tab 2 — 3D 城市**（另開一個 PowerShell tab，從 repo 根目錄執行）：

```powershell
npm ci
npm run dev -- --port 5173
```

`survey` server 預設喺 `127.0.0.1:8787`，root Vite 預設喺 `127.0.0.1:5173`。如果 Vite 顯示其他 port，城市網址請用 terminal 實際印出嚟嗰個；server port 如有更改，要喺城市網址指定完整 WebSocket URL。

### 瀏覽器要開嘅頁面

| 頁面 / tab | 網址（預設） | 用途 |
| --- | --- | --- |
| Guest | `http://127.0.0.1:8787/guest` | 觀眾完成四題、核對答案並提交一次提案。 |
| City | `http://127.0.0.1:5173/?survey` | 展示共同塑造嘅 2127 台場；經 `ws://127.0.0.1:8787/ws` 即時接收變化。展覽城市要用呢個 `?survey` 網址。 |
| Admin | `http://127.0.0.1:8787/admin` | 工作人員睇狀態、確認觀眾已離開、要求／取消 reset；只可喺運行 server 嗰部電腦以 localhost 開啟。 |
| Monitor（可選） | `http://127.0.0.1:8787/monitor` | 文字方式檢查目前狀態同開頁後收到嘅提案／WebSocket 事件，唔係 3D 畫面。 |

建議將 City 放展示屏、Guest 放輸入屏、Admin 留喺工作人員電腦。提案提交後 server 會等工作人員喺 Admin 按 **観客の退出を確認**，先容許下一位開始；如有待執行 reset，亦會喺確認離場時套用。City 頁面唔需要獨立 host 或 build；Tab 2 嘅 Vite 已供應。Guest／Admin／Monitor 由 Tab 1 嘅 server 同一個 origin 供應，所以 `npm run build` 必須先完成。Admin 嘅 **昼／夜／自動** 可將已連接嘅 City 固定喺 12:00／22:00，或恢復日夜循環；設定會保存，唔影響提案同分數。城市網址若有 `?hour`，該固定時間會優先。更新呢項功能後要重開 survey server（保留原本 SQLite），再刷新 Admin。SQLite 預設寫入 `survey/data/survey.sqlite`；重開 server 會沿用已有城市狀態。

要畀同一個可信 LAN 嘅另一部裝置開 Guest／City：server 用 `SURVEY_HOST=0.0.0.0 npm run server`（PowerShell：`$env:SURVEY_HOST='0.0.0.0'; npm run server`），root 用 `npm run dev -- --host 0.0.0.0 --port 5173`；以 host 電腦嘅 LAN IP 取代網址中嘅 `127.0.0.1`。兩個 port 都要可達；Admin 仍然只限 host 電腦嘅 localhost。預設 loopback 設定只供本機使用，LAN 並無 guest 身分驗證。若 server 改用其他 port，例如 `8790`，City 用 `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8790/ws`。

想單獨睇城市原型，開 `http://127.0.0.1:5173/` 即可，無須 Tab 1；呢個模式唔會接收觀眾提案。`module-swap/` 係保留嘅 v1 因果示範，唔係展覽城市，亦唔接受 v2 CityView。

AI agent 接手入口：[AGENTS.md](AGENTS.md) · [規格與程式結構](docs/PROJECT.md) · [驗收與交接流程](docs/VALIDATION.md) · [展覽方向與 Plan 02 紀錄](docs/PLAN02.md)。

**展覽 MVP 狀態（2026-09-30）：** [共同城市 MVP 設計與 Agent 實作規劃](docs/EXHIBITION_MVP.md)的 S1 四題 API、SQLite v2 run／proposal 儲存已實作。S2 Q3→NE Park 切片已整合及通過 feature/main CI。S3 四site映射（`d51167b`、SW／SE 可見度修正 `36b5c18`）的本機 root checks、API matrix、12 張 captures、snapshot/reset 與 standalone smoke 均已通過，已與 lifecycle／S4 合併並整合至 main（`63af1b6`），feature CI 及 main CI 均通過，S3 已 shipped。S4 四題 guest UI 與 root 回饋面板已於 2026-09-30 完成瀏覽器驗收並整合至 main（`5e14078`，main CI 通過；剩餘偏差見 S4 handoff）；整體展覽仍未驗收。城市從開始已是2127年，低／零／高值都必須有未來感。下方一題流程及畫面內容是 v1 歷史實作，不代表新的 guest flow。S1–S4 狀態分別見 [S1 handoff](docs/handoffs/exhibition-s1.md)、[S2 handoff](docs/handoffs/exhibition-s2.md)、[S3 handoff](docs/handoffs/exhibition-s3.md) 和 [S4 handoff](docs/handoffs/exhibition-s4.md)，完整驗證見[驗證紀錄](docs/VALIDATION.md)。

## 協作入門

三位協作者各自使用獨立 local clone；每項任務指定一位 owner，並以 `docs/handoffs/<task-id>.md` 保存可接續的任務狀態。主要負責範圍不限制跨區工作，但同一模組或二進位素材的重疊修改要先協調。

開始前閱讀 [agent 工作規則](AGENTS.md)、[Git 協作流程](docs/CONTRIBUTING.md)、[程式架構](docs/PROJECT.md)及[驗證要求](docs/VALIDATION.md)，再用[交接模板](docs/handoffs/TEMPLATE.md)建立任務文件。程式修改使用短期分支，可自行檢查、合併及推送 main，無須 PR；Blender 素材另有直接提交 main 的流程。如需 Codex 操作 Blender，Mac／Windows 須各自安裝 MCP；素材匯出、驗證及本機設定差異見 [Blender 素材與跨平台交接規範](docs/BLENDER.md)；目前仍未接入外部模型。

[CI workflow](.github/workflows/ci.yml) 於 branch push／可選 PR 時以 Node 24 執行根目錄、`survey/` 同 `module-swap/` 嘅安裝、測試、build，以及 diff whitespace 檢查（兩個子 package 由 2026-09-24 起納入）；沒有部署或 branch protection。詳細狀態見[驗證紀錄](docs/VALIDATION.md)。

## 展覽目標（2026-09-18 定，2026-09-30 更新）

**場地改為台場（2026-09-30 用戶決定）：** 富士電視台／台場海濱取代澀谷，成為唯一展覽城市（不設切換）。四題、四軸、四個改變地點、lifecycle 同日夜循環照舊，只換場地、地標、路線同文案。計劃同各階段結果見 [ODAIBA_PLAN.md](docs/ODAIBA_PLAN.md)，交接見 [odaiba-venue handoff](docs/handoffs/odaiba-venue.md)。以下澀谷描述係歷史紀錄。

**由觀眾共同塑造一個富有未來感的澀谷。** 城市是展覽中的共同創作結果；視覺設計服務於未來感、澀谷辨識度，以及觀眾能否看懂自己的選擇如何改變城市。精緻模型或紀實照片質感不再是首要目標或完成門檻。

新版每位 guest 回答四條題目並一次提交 → server 將四軸投票累積至共同城市狀態 → 下一位 guest 繼續使用累積結果。S1 已完成 server-side transaction、replay、migration 和 view API；root 四site映射已實作（S3，已整合至 main 並通過 CI）。S4 guest UI 與 root 回饋面板已整合並完成瀏覽器驗收；每日展覽重設規則仍待定。狀態分別見 [S2 handoff](docs/handoffs/exhibition-s2.md)、[S3 handoff](docs/handoffs/exhibition-s3.md) 和 [S4 handoff](docs/handoffs/exhibition-s4.md)。

原有 v1 因果 MVP 每人一題、由答案推導區畫變化；展覽 v2 S1 已改為可重用的四題題組及四軸累積。root 保留 v1／standalone；S4 guest UI 和回饋面板已整合並完成驗收；每日重設及輸入裝置仍待定。

**下一步方向（2026-09-24 決定）：** 展覽城市就係根目錄澀谷場景（`src/`）。先建立同擴充呢個場景——更多區域同城市物件、城市可以明顯變化、打磨外觀——同時為因果 MVP 加更多題目。v1 survey 已接入 root；S3 後續 SW／SE 修正及 browser 驗證已通過，S3 已整合至 main 並通過 main CI。`module-swap/` 四區畫只係證明因果鏈，唔係目標城市。詳見 [S3 handoff](docs/handoffs/exhibition-s3.md)。

### 因果選擇 MVP（2026-09-24，`survey/` + `module-swap/`）

第一個「選擇 → 政策 → 城市變化」垂直切片已實作，獨立於根目錄原型：`survey/` 伺服器按累積政策分數（自動化、公共共有、環境優先、都市集約）決定下一位 guest 嘅題目，並由答案歷史推導四個區畫嘅配置；`module-swap/` 以 `?survey` 模式即時顯示。示範流程：勞動力不足 → 自動化（NW 建築）→ 街道冷清 → 公共廣場（SW）→ 中心土地不足 → 向上發展（SE 高樓）。

```sh
cd survey && npm ci && npm run build && npm run server        # v2 API at http://127.0.0.1:8787
cd module-swap && npm run install:app && npm run dev          # ?survey continues to reject v2; root supports the S2 Q3 slice
```

The `/guest` page has the S4 four-question v2 UI, integrated on main and browser-accepted on 2026-09-30. Root `?survey` accepts validated v2 CityViews and renders all four server-authoritative site mappings (S3, integrated in `63af1b6`). The root panel shows S4's latest-proposal feedback and recent-proposal band. Module-swap still rejects v2. Standalone/demo and legacy v1 code paths remain supported; root v1 was not browser-tested in the S3 final pass. See the [S1 handoff](docs/handoffs/exhibition-s1.md), [S2 handoff](docs/handoffs/exhibition-s2.md), [S3 handoff](docs/handoffs/exhibition-s3.md) and [S4 handoff](docs/handoffs/exhibition-s4.md) for separate verification records.

設計同限制見 [PROJECT.md](docs/PROJECT.md#causal-choice--city-mvp--2026-09-24-survey--module-swap)，驗證見 [VALIDATION.md](docs/VALIDATION.md)。

**根目錄 survey 接線（2026-09-24，v1 legacy；2026-09-30 更新 v2）：** 根目錄 app 加 `?survey` 仍支援 v1 survey 驅動澀谷場景。root v2 直接套用四site server layout，不將四軸 Meter 轉成全城氣氛變化。S3 core 的 tests/build/diff check 和 feature CI 通過；後續 SW／SE 可見度修改的本機 checks、snapshot/reset 和 standalone smoke 亦通過，S3 已整合至 main 並通過 main CI。最終 browser pass 無 root v1 驗收；只記錄現有 root unit test 覆蓋。詳見 [PROJECT.md](docs/PROJECT.md#root-scene-survey-mode--2026-09-24-srcsurvey)、[S1 handoff](docs/handoffs/exhibition-s1.md)、[S2 handoff](docs/handoffs/exhibition-s2.md) 及 [S3 handoff](docs/handoffs/exhibition-s3.md)。

## 目前可執行原型

2127 年台場海濱（Vite、TypeScript、WebGL 2，米制）：`src/odaibaScene.ts` 載入 Phase 03D 地形、海同八棟地標 GLB（富士電視台、Aqua City、DECKS、DiverCity × 2、Hilton、日航、Telecom Center），`src/odaiba2127.ts` 加上 2127 改造層（空中天橋、球頂泊位、單軌燈線、海濱浮台，屋頂綠化／太陽能）。鏡頭由海面望向富士電視台同 Aqua City。

```sh
npm install
npm run dev
npm run build
npm test
```

城市會自動行日夜循環（2026-09-25 起取代原本嘅三個掣同 `0/1/2` 鍵）：一日 3 分鐘，由中午開始。太陽由東行到西，日落後轉做藍色月光；天空經過黃昏、夜晚、清晨。清晨係 Still（安靜），日間係 Daylight，夜晚係 Pulse（窗戶、街燈、招牌亮起，人車較多）。`?hour=22` 可以固定喺某個鐘數，方便截圖。呢個係原型展示，唔係展覽題目或累積機制。

`layout.ts` 保存台場路線（單軌中線、海濱步道、水路、空中航道、球頂泊位）、2127 改造位置同四個改變地點；`cityRig.ts` 提供共用材質同 site 燈柱；`mobility.ts` 處理單軌列車、步道行人、水上的士／渡輪同空中的士。共享材質、靜態批次、InstancedMesh 保留；後製仍只有輕微 bloom。

Blender 模型可用 `npm run dev -- --port 5173` 啟動後，在 Vite 顯示的網址加上 `?asset-preview`，選取本機 `.glb` 作城市場景預覽（模型按原尺寸置於原點，重新整理後可換另一件）。正式素材需按 [Blender 規範](docs/BLENDER.md) 保存 `.blend`／`.glb`，再於程式指定位置。[2127 未來樹](asset/models/future-tree-2127/future-tree-2127.glb) 由 Park site 使用。

Plan 02 截圖使用 `artifacts/plan02-*`；原有截圖保留，只證明當時的空間與交通原型，不代表展覽互動已完成。完整驗證與限制見 [驗收流程](docs/VALIDATION.md)。

歷史版本參考來源（Plan 02 已取代玩具／溫暖彩漆方向）：

- [玩具風格與柔和材質](https://gaga.hexly.ai/)
- [Three.js CityGenerator：固定配置與街道對齊](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/generators/CityGenerator.js)
- [Three.js SkyscraperGenerator：樓層與立面分格](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/generators/city/SkyscraperGenerator.js)
- [alton47 Three.js 技能](https://github.com/alton47/threejs-skills)：core、materials、lighting、postprocessing、performance。
- [Linegel 技能](https://github.com/linegel/threejs-complete-set-of-skill)：僅參考指定的 buildings-and-cities、procedural-materials、particles-trails-and-effects；採用固定配置、共享材質與預配置粒子的原則，沒有引入其大型 WebGPU 計算架構。

Google Fonts 無法連線時，介面會使用系統字體。其他資源皆由本機供應。

## 歷史空間骨架 · Plan 01

以 QFRONT 大屏幕量體、站前八公廣場、Center-gai／道玄坂街口及五條斑馬線建立空間辨識；其中一條斜向連接 QFRONT 與廣場。`src/layout.ts` 統一道路多邊形、地標占地、斑馬線及物流站位置。保留 24 名行人、6 輛車和三種狀態；行人沿五條共用路徑交叉步行，車輛暫只行駛東西向主路，其他支路沒有車流。空中站移至北東側的 MAGNET 未來量體，物流與航線已同步改位。

這是壓縮比例的程序幾何原型，並非現況測繪、精細立面或完整 2127 年美術定稿。參考及取捨見 [澀谷空間研究](docs/SHIBUYA.md)；相同 1280×720 鏡位的三態驗收圖為 `artifacts/shibuya-*.png`。
