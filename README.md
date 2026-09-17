# 2127 — Frozen Intersection

AI agent 接手入口：[AGENTS.md](AGENTS.md) · [規格與程式結構](docs/PROJECT.md) · [驗收與交接流程](docs/VALIDATION.md) · [Plan 02 進度與待辦](docs/PLAN02.md)。

固定鏡頭、固定種子 `2127` 的 Three.js 澀谷多層城市原型（Plan 02 首個垂直切片）。以 [Pic 2](asset/pic2.png) 為量體、垂直交通與材質方向參考，保留 Plan 01 的路口及地標關係。建築只建立一次，使用 Vite、TypeScript 與 WebGL 2，沒有外部模型。

```sh
npm install
npm run dev
npm run build
npm test
```

按 `0` Daylight、`1` Pulse、`2` Still，亦可使用底部按鈕。三態均以日光呈現；Pulse 活動較多、Still 較安靜。保留 10 秒轉場及 4 秒選擇鎖定，期間交通及窗戶持續運作。回到 Daylight 不顯示判決。

`layout.ts` 保存道路、地標、兩條公共步道與上層建築連接；`cityRig.ts` 產生建築、商業／住宅樓層、開放公共層、運輸軌道和環境膜片；`mobility.ts` 處理地面交通、公共升降與步行、薄翼貨機和原有 32 秒物流流程。共享材質、靜態批次、InstancedMesh 和固定鏡頭保留。材料改為淺色建築複合材、金屬與半透明膜片；一次性產生室內環境反射，後製仍只有輕微 bloom。

新圖為 `artifacts/plan02-*.jpg`；原有截圖保留。此版本驗證多層空間與交通方向，仍是程序幾何原型，**未達紀實照片質感**。完整驗證與限制見 [驗收流程](docs/VALIDATION.md)。

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
