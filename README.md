# 2127 — Frozen Intersection

AI agent 接手入口：[AGENTS.md](AGENTS.md) · [規格與程式結構](docs/PROJECT.md) · [驗收與交接流程](docs/VALIDATION.md) · [展覽方向與 Plan 02 紀錄](docs/PLAN02.md)。

## 協作入門

三位協作者各自使用獨立 local clone；每項任務指定一位 owner，並以 `docs/handoffs/<task-id>.md` 保存可接續的任務狀態。主要負責範圍不限制跨區工作，但同一模組或二進位素材的重疊修改要先協調。

開始前閱讀 [agent 工作規則](AGENTS.md)、[Git 協作流程](docs/CONTRIBUTING.md)、[程式架構](docs/PROJECT.md)及[驗證要求](docs/VALIDATION.md)，再用[交接模板](docs/handoffs/TEMPLATE.md)建立任務文件。程式修改使用短期分支，可自行檢查、合併及推送 main，無須 PR；Blender 素材另有直接提交 main 的流程。如需 Codex 操作 Blender，Mac／Windows 須各自安裝 MCP；素材匯出、驗證及本機設定差異見 [Blender 素材與跨平台交接規範](docs/BLENDER.md)；目前仍未接入外部模型。

[CI workflow](.github/workflows/ci.yml) 於 branch push／可選 PR 時以 Node 24 執行根目錄、`survey/` 同 `module-swap/` 嘅安裝、測試、build，以及 diff whitespace 檢查（兩個子 package 由 2026-09-24 起納入）；沒有部署或 branch protection。詳細狀態見[驗證紀錄](docs/VALIDATION.md)。

## 展覽目標（2026-09-18 定，2026-09-24 更新）

**由觀眾共同塑造一個富有未來感的澀谷。** 城市是展覽中的共同創作結果；視覺設計服務於未來感、澀谷辨識度，以及觀眾能否看懂自己的選擇如何改變城市。精緻模型或紀實照片質感不再是首要目標或完成門檻。

每位 guest 回答一條題目並選擇 option → 城市承接之前的累積結果作出變化 → 該位 guest 體驗完結時即時看見畫面變化 → 下一位 guest 接續下一條題目。城市跨 guest 累積，不因換人自動回到初始狀態；全部題目完成後及每日展覽的重設規則待定。

建築數量／密度、人流等是可能受選擇影響的參數，並非已定案的規則。下面嘅因果 MVP 已實作一套最小題目流程、跨 guest 累積同由政策推導嘅區畫變化；正式展覽題目、每日重設及輸入裝置仍待定。

**下一步方向（2026-09-24 決定）：** 展覽城市就係根目錄澀谷場景（`src/`）。先建立同擴充呢個場景——更多區域同城市物件、城市可以明顯變化、打磨外觀——同時為因果 MVP 加更多題目。之後先將 survey 接入根目錄場景；`module-swap/` 四區畫只係證明因果鏈，唔係目標城市。

### 因果選擇 MVP（2026-09-24，`survey/` + `module-swap/`）

第一個「選擇 → 政策 → 城市變化」垂直切片已實作，獨立於根目錄原型：`survey/` 伺服器按累積政策分數（自動化、公共共有、環境優先、都市集約）決定下一位 guest 嘅題目，並由答案歷史推導四個區畫嘅配置；`module-swap/` 以 `?survey` 模式即時顯示。示範流程：勞動力不足 → 自動化（NW 建築）→ 街道冷清 → 公共廣場（SW）→ 中心土地不足 → 向上發展（SE 高樓）。

```sh
cd survey && npm ci && npm run build && npm run server        # http://127.0.0.1:8787/guest
cd module-swap && npm run install:app && npm run dev          # 打開 Vite 網址加 ?survey
```

設計同限制見 [PROJECT.md](docs/PROJECT.md#causal-choice--city-mvp--2026-09-24-survey--module-swap)，驗證見 [VALIDATION.md](docs/VALIDATION.md)。

**根目錄場景接 survey（第 1 步，2026-09-24）：** 根目錄 app 加 `?survey`（例如 `http://127.0.0.1:5173/?survey`，需先開 survey server）會由政策分數驅動澀谷場景氣氛（交通、人流、綠化、窗燈等），左下顯示最新選擇同分數；preset 按鈕停用。現時變化仍然細微，下一步係喺澀谷加可見變化點。詳見 [PROJECT.md](docs/PROJECT.md#root-scene-survey-atmosphere--2026-09-24-srcsurvey-step-1-of-connecting-the-survey)。

## 目前可執行原型

固定鏡頭、固定種子 `2127` 的 Three.js 澀谷多層城市原型（Plan 02 首個垂直切片）。以 [Pic 2](asset/pic2.png) 為量體、垂直交通與材質方向參考，保留 Plan 01 的路口及地標關係。建築只建立一次，使用 Vite、TypeScript 與 WebGL 2；城市另載入一棵 Blender 樹木模型。

```sh
npm install
npm run dev
npm run build
npm test
```

按 `0` Daylight、`1` Pulse、`2` Still，亦可使用左下按鈕。三態均以日光呈現；Pulse 活動較多、Still 較安靜。保留 10 秒轉場及 4 秒選擇鎖定，期間交通及窗戶持續運作。回到 Daylight 不顯示判決。這是現有 preset 展示，不是展覽的題目或累積機制；三態、固定建築及現有時間設定不限定未來展覽設計。

`layout.ts` 保存道路、地標、兩條公共步道與上層建築連接；`cityRig.ts` 產生建築、商業／住宅樓層、開放公共層、運輸軌道和環境膜片；`mobility.ts` 處理地面交通、公共升降與步行、薄翼貨機和原有 32 秒物流流程。共享材質、靜態批次、InstancedMesh 和固定鏡頭保留。材料改為淺色建築複合材、金屬與半透明膜片；一次性產生室內環境反射，後製仍只有輕微 bloom。

Blender 模型可用 `npm run dev -- --port 5173` 啟動後，在 Vite 顯示的網址加上 `?asset-preview`，選取本機 `.glb` 作澀谷場景預覽（模型按原尺寸置於原點，重新整理後可換另一件）。正式素材需按 [Blender 規範](docs/BLENDER.md) 保存 `.blend`／`.glb`，再於程式指定位置。首件正式素材係 [2127 未來樹](asset/models/future-tree-2127/future-tree-2127.glb)，放喺八公廣場旁 `(11, 0, 23)`；[Blender 原檔](asset/models/future-tree-2127/future-tree-2127.blend) 一併保存。

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
