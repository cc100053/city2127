# SW focal — お台場南岸接駁

- Owner: cc100053
- 狀態：2026-11-19 按 owner 指示合入 main（`10f6644a`）。
- 分支：`codex/sw-focal-connections`
- Base：`52aa690fcd162d0a27b5bfa45f92325f989d5ca7`。2026-11-17 fetch 後本地 main 與 origin/main 同步。保留原有未追蹤 `Dev_QA.md`。
- 前序：[活動モジュール棚](sw-event-shelf.md) 已由 `45756308` 整合。

## 目標與實作

[Gemini 對話](https://gemini.google.com/u/3/app/02bfef4106281742) 的底圖是改動前 change review 的 `sw-focal__0__h12.jpg`。圖片提示保留棚、鏡頭及兩個庭園，讓主路延伸到棚前，再接鄰近庭園。[Gemini 候選圖](../../artifacts/sw-focal-connections/target.jpg)

沿現有 ④ 主路的 d 220 開口接 3.8 m 陶瓷支路，配兩條藍白導線。支路順地形抬升，再接棚前地台；兩條窄石板步道接北、西共享庭園。北庭園由 (−110,250) 移到 (−100,245) 清出棚前運送空間。兩庭園轉向步道。沿用 Street Kit 鋪面與夜光材質；原有樹叢的佔位按原順序分配，再隱藏會侵入支路的樹叢。

## 驗證與交接

- 根目錄 `npm test`、`npm run build`、`git diff --check` 通過。以本分支接駁改動驗證，未整合 main。
- 場景測試對照實際地形，檢查新支路兩側和中心、主路接縫、棚前交會、庭園步道到入口。日夜三態六張圖已更新到 [change review](../../artifacts/change-review/index.html#SW%20focal)。
- 2026-11-17 Mac headless Chrome、1600 × 900、固定時間，近鏡和俯視擷取無 page error。完整支路主要喺[俯視](../../artifacts/sw-focal-connections/plan.jpg)可見。原近鏡因視角只見前景一段。東側路軌的部分枕木在新地台內，仍可見雙軌的走向。
- 新支路屬固定場景幾何，未新增車流或行人路線。展覽機性能及 live 問卷畫面未測。
- 如需再評估畫面，可比對 Gemini 目標、俯視圖和 change review 三態。

## 2026-11-19 整合

- `10f6644a` 保留 NW AUTO HUB 與車抽屜住宅的既有接駁，同時加上 SW 支路。瀏覽器核對版本為包含兩條分支的 `6f8afee8`。
- 合併版本根目錄 `npm test`、`npm run build`、`git diff --check` 通過。場景測試覆蓋 ④ 主路接縫、支路與兩庭園入口。
- Mac headless Chrome 1600 × 900／DPR 1，以 `sw:focal` 核對 −1／0／+1 的 12:00、22:00 近鏡，共六張，無 page error。證據存於 `~/city2127-evidence/sw-focal-connections/main-integration/`。展覽機及 live 問卷畫面未測。
