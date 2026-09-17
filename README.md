# 2127 — Frozen Intersection

AI agent 接手入口：[AGENTS.md](AGENTS.md) · [規格與程式結構](docs/PROJECT.md) · [驗收與交接流程](docs/VALIDATION.md)。

固定鏡頭、固定種子 `2127` 的 Three.js 澀谷路口空間原型（Plan 01）。建築只建立一次；使用 Vite、TypeScript 與 WebGL 2，所有建築、行人、車輛和 drone 都由程序幾何建立，無外部模型。

```sh
npm install
npm run dev
npm run build
npm test
```

按 `0` 黃昏、`1` Pulse、`2` Still，也可使用底部按鈕。轉場 10 秒，完成即顯示判決並鎖定選擇 4 秒；窗燈、行人、車輛和 drone 繼續運作。之後可重新選擇。回到黃昏不顯示判決。

`src/presets.ts` 保存規格的十個參數；`worldState.ts` 處理轉場和鎖定；`cityRig.ts` 包含獨立 tower/shop/kiosk/glyphs 工廠；`heroCamera.ts` 固定鏡位；`overlay.ts` 負責操作與判決。靜態街區按材質合併，窗戶、行人、膠囊車及 drone 使用 InstancedMesh。主塔分成上下量體，中間留出空中站；保留空中花園與太陽能頂棚，以薄片結構對比溫暖彩漆。`mobility.ts` 負責 30 秒分時交通、行人步行、薄翼貨機、兩條空中航線及 32 秒物流交收：進站、貨艙橫移、下降接收、離站及空載升降台回位。局部航線及街面導引按交通位置亮起；採樣測試檢查翼展淨空、交收連續性與導引跨圈行為。Pulse 活動較多，Still 保留少量生活與空中交通。植栽、導航、符號和所有交通物件均預先配置。材質維持霧面彩漆，僅使用單一陰影光源與輕微 bloom，沒有 SSAO 或 SSR。

`artifacts/` 保存初版驗收圖，以及 `future-*.png` 第二版相同鏡位的驗收圖（1280×720）；第三版使用 `air-commons-*.png`。開發時可從 canvas 的 `data-fps`、`data-draw-calls`、`data-geometries` 讀取最近 120 幀平均 FPS、整個後製流程的 draw calls 及 GPU 幾何數。FPS 是本機瀏覽器觀測，並非所有筆電的保證；各版本的驗證範圍見[驗收流程](docs/VALIDATION.md)。

參考來源：

- [玩具風格與柔和材質](https://gaga.hexly.ai/)
- [Three.js CityGenerator：固定配置與街道對齊](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/generators/CityGenerator.js)
- [Three.js SkyscraperGenerator：樓層與立面分格](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/generators/city/SkyscraperGenerator.js)
- [alton47 Three.js 技能](https://github.com/alton47/threejs-skills)：core、materials、lighting、postprocessing、performance。
- [Linegel 技能](https://github.com/linegel/threejs-complete-set-of-skill)：僅參考指定的 buildings-and-cities、procedural-materials、particles-trails-and-effects；採用固定配置、共享材質與預配置粒子的原則，沒有引入其大型 WebGPU 計算架構。

Google Fonts 無法連線時，介面會使用系統字體。其他資源皆由本機供應。

## 澀谷空間原型 · Plan 01

以 QFRONT 大屏幕量體、站前八公廣場、Center-gai／道玄坂街口及五條斑馬線建立空間辨識；其中一條斜向連接 QFRONT 與廣場。`src/layout.ts` 統一道路多邊形、地標占地、斑馬線及物流站位置。保留 24 名行人、6 輛車和三種狀態；行人沿五條共用路徑交叉步行，車輛暫只行駛東西向主路，其他支路沒有車流。空中站移至北東側的 MAGNET 未來量體，物流與航線已同步改位。

這是壓縮比例的程序幾何原型，並非現況測繪、精細立面或完整 2127 年美術定稿。參考及取捨見 [澀谷空間研究](docs/SHIBUYA.md)；相同 1280×720 鏡位的三態驗收圖為 `artifacts/shibuya-*.png`。
