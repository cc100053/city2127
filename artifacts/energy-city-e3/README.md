# E3 能源城市組合與動態

2026-10-24；Owner: Codex。[能源計劃](../../docs/ENERGY_CITY_PLAN.md)／[交接](../../docs/handoffs/energy-city.md)。全部圖片為本輪實際瀏覽器畫面。

環境：macOS本機Codex in-app Chromium／WebGL2，1920×1080，預設quality。原hero位置`(-520,300,-620)`、target`(-40,25,-60)`、FOV42。沒有量FPS、GPU型號或展覽硬件性能；不以較早的硬件結果代替本輪測量。

DEV開`?energy=mixed&hour=12&reviewTime=50`（用Vite實際port）。五日景均hour12／time50，選單即時切換並保存配置URL，等待GPU更新後截圖。正式survey／meters／scaleLab模式優先，production移除工具。沒有提交任何提案。

| 配置 | 可見空間差異 | 實際圖 |
| --- | --- | --- |
| 基準 | 現行城市 | [baseline](baseline-day.jpg) |
| A | 兩處分散水庭／翼形檢修遮棚、小接收翼、兩處環／翼配電門架 | [A](a-day.jpg) |
| B | 集中接收翼／富士前置環、兩處低矮配電門架 | [B](b-day.jpg) |
| C | 分段能源島／長橋、兩處配電門架；沒有水庭／環 | [C](c-day.jpg) |
| M1 | 上述系統共存，保留六座water rooms與海面空隙 | [M1](mixed-day.jpg) |

[M1黃昏18.5](mixed-dusk.jpg)／[夜22](mixed-night.jpg)使用同hero／time50；夜光只補充原本存在的機械與服務接點，不代表產能。

近景固定`review=street&cam=-365,38,-205&at=-307,12,-151`：

- [充能10秒](garden-charge.jpg)：上水庭充水、回管上行標記，外部供電充能。
- [暫存30秒](garden-hold.jpg)：上庭水位較高、標記停用，渦輪停定。
- [釋能50秒](garden-release.jpg)：落水標記、轉子與岸邊服務軌同步示意分配。
- [靜態閱讀](garden-static.jpg)：永久箭頭、上下水層與配電接點完整保留；核取框啟用與系統reduced-motion相同的固定更新分支。沒有改OS全域偏好；不是Safari或實機輔助使用者驗收。

[實時動態](live-motion.jpg)／[實時靜態閱讀](mixed-live-static.jpg)及[瀏覽器紀錄](browser.json)保存補充檢查；這不是性能基準。

A／B階段文案只描述可見設備，已在瀏覽器斷言A不提環、B不提水庭／渦輪；[B靜態閱讀](b-static.jpg)亦只指接收翼、環與配電門架。

系統動態每60秒重複：充能20／暫存20／釋能20。環角速度0.02–0.08 rad/s，水面位移0.8 m；渦輪只在釋能階段平滑轉一周。C的配電標記持續運作。流向標記不是可見微波／真實電流；水循環與環是有外部供電的儲能，不是淨能源來源。完整電網、流體、水量守恆／損耗、容量／可靠度與海岸工程未模擬。

Hero清楚分辨兩處水層、集中環／翼及外擴岸界；管內流向、水位與小配電細節仍需近景。前置環仍離開球殼，島及橋仍為概念形體；沒有重新定義富士媒體／劇場或六座water rooms用途。幾何、動態、root test／build與整合／CI實際結果見交接；E4問卷／權威配置與E5硬件驗收留待後續。
