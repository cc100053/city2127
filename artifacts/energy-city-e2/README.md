# E2 能源城市靜態比較

2026-10-24；Owner: Codex。完整範圍／限制見[能源計劃](../../docs/ENERGY_CITY_PLAN.md)與[交接](../../docs/handoffs/energy-city.md)。這些是實際瀏覽器截圖，並非生成目標圖。

Root Vite DEV：`http://127.0.0.1:5173/?energy=baseline&hour=12&reviewTime=20`（使用Vite實際port）。右上原生選單切換，無須重載；沒有survey server、沒有提交／保存提案。勿與`survey`、`meters`、`scaleLab`混用；那些模式優先，能源工具不啟動。Production不包含此工具。

五張日景固定1920×1080、預設quality、原hero `(-520,300,-620)` → `(-40,25,-60)`、FOV42°、hour12、actor time20。macOS本機Codex in-app Chromium／WebGL 2；未量GPU型號、FPS或實際展覽機性能。

| 配置 | 實際差異 | 截圖 |
| --- | --- | --- |
| 基準 | 現行城市 | [baseline-day.jpg](baseline-day.jpg) |
| A 海と暮らす | 一組上下水庭＋0.65倍接收翼 | [a-day.jpg](a-day.jpg) |
| B 空とつながる | 一組完整接收翼＋富士前置儲能環 | [b-day.jpg](b-day.jpg) |
| C 陸地を増やす | 三段能源島＋跨水檢修橋／升降井 | [c-day.jpg](c-day.jpg) |
| M1 混合 | 四組量體共存 | [mixed-day.jpg](mixed-day.jpg) |

補充：[水庭近景](water-garden-detail.jpg)，用既有`review=street&cam=-365,38,-205&at=-307,12,-151`；[混合黃昏18.5](mixed-dusk.jpg)／[混合夜22](mixed-night.jpg)仍為原hero。這些補充圖不取代五張日景比較；夜間沒有新增特效，最終照明細節留待E3。

水庭可讀上下落差、落水管／渦輪室、獨立回水管、支承與下庭公共入口；hero只能讀到量體，管線需近景。富士環向海側前移以清開真實斜向公共路線，並非貼球殼機械或劇場轉動。能源島為核能路線候選量體，並非工程設計；無事故／輻射動畫。水循環與旋轉都是外部供電充能的儲能，不聲稱淨產能、容量或可靠度。

幾何檢查與root tests/build通過情況見交接。船體以320秒週期每0.5秒取樣；測試不是連續碰撞或結構／電力／海岸工程驗證。E3動態／全城擴展、E4問卷／演算法與實際硬件驗收未做。
