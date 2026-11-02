# 遠景軌道升降機 R5 spec（2026-11-02）

目標圖（owner 揀）：`target/target-day.png`（16:00）、`target/target-night.png`（21:00）。底圖 R4：`baseline-r4/`。
鏡頭：settled hero（`?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16|21`，1920×1080）。冇 Meter state；只得日／夜。

Code：`src/spaceElevator.ts`（唯一實作檔），`src/layout.ts` `SPACE_ELEVATOR`（位置同高度唔郁）。
單位：米，root 局部座標（root 喺 `(SPACE_ELEVATOR.x, 0, SPACE_ELEVATOR.z)`，y = 曲率前高度）。`spire 900`、`station 1150`、`tether 6000`。

## 保持不變

- 位置、整體輪廓同大小（尖塔底半徑 2000、頂 240；中轉站最闊半徑 1400）、霧色剪影色調、`shaded()` 嘅 key light 同 haze 淡出、`curveBeyondPlate`、`frustumCulled=false`、無陰影、`elevatorTone`。
- 所有部件經 `bake`，每材質一個 mesh（目標 ≤ 4 batches）。

## 材質

| 名 | 日 | 夜 | 備註 |
|---|---|---|---|
| `body`（現有） | 霧色 ×.86＋key light | 霧色 ×.75 | 結構 |
| `lamp`（現有） | = body | 薄荷 `#8ce5d8` ×.9 | 泊位燈、接駁環燈、艙窗 |
| `pane`（新） | body 色 ×.72（窗帶較暗，唔發光） | 暖 `#ffcf8a` ×.6 | 中轉站窗帶 |
| `beacon`（新） | = body | 紅 `#ff4a3a` ×1.2 | 尖塔航空燈 |

`pane`／`beacon` 同 `lamp` 一樣行 `shaded()`，`lit = 1 - glow`；喺現有 `onBeforeRender` 一齊更新顏色。

## 部件

### 尖塔（0–900）
- 錐體：現有 `CylinderGeometry(240, 2000, 900, 32)`，保留。
- 扶壁肋 ×8：每條係一塊薄板（厚 60），沿錐面由 y 0 到 880，外緣伸出錐面 150；繞 y 軸平均分佈（起角 .2 rad），向上收窄跟錐度（用一個 BoxGeometry 傾斜到錐面斜度即可：底寬 150、頂寬 60 嘅梯形可用 box + 斜放近似）。
- 環帶 ×3：y 250、500、720，`CylinderGeometry(r+40, r+40, 30, 32)`，r = 該高度錐半徑（`2000 - 1760*y/900`）。
- 航空燈：每條環帶上 8 粒 `beacon` box 40×20×40，貼環帶外緣，同肋錯開半格。
- 頂頸圈：y 900–1030，`CylinderGeometry(260, 300, 130, 24)`（目標圖中轉站下面嗰條較幼頸柱）。

### 中轉站（1080–1400）
- 刪除現有倒錐 `CylinderGeometry(700, 400, 160, 32)`。
- 甲板 ×3 由下而上向內收：
  - D1：中心 1150，`CylinderGeometry(1400, 1300, 70, 48)`
  - D2：中心 1235，`CylinderGeometry(1100, 1050, 80, 48)`
  - D3：中心 1320，`CylinderGeometry(760, 720, 80, 48)`
  - 頂蓋：中心 1385，`CylinderGeometry(460, 520, 50, 32)`
- 窗帶：每層一條 `pane` 帶，`CylinderGeometry(R-8, R-8, h*0.45, 48, 1, true)`（R、h 為該層下緣半徑同高；openEnded），中心同層中心，略為凹入。
- 泊位 ×24：D1 外緣，box 140（徑向）×40×90，中心半徑 1430、y 1150；每個泊位外端一粒 `lamp` box 30×12×30，同一架停泊飛行器 `body` box 70×22×36（徑向外伸 60）。
- 現有邊緣光帶 `CylinderGeometry(1405,1405,24,48,1,true)` lamp：保留但移到 y 1185（D1 上緣）。
- 底面輻射骨架：hub `CylinderGeometry(320, 280, 120, 24)` 中心 1080；12 條 spoke box 40×40×(1350−320)，由 hub 外緣到 D1 底緣，y 1105，微向外上斜 4°。

### 纜線（1030–6000）
- 套管：半徑 90/110 → `CylinderGeometry(140, 150, …, 16)`（目標圖更粗），body。
- 接駁環：由 1500 起每 300 m 一個，至 5700：`CylinderGeometry(178, 178, 30, 16)` body；每個環上一條 `lamp` 幼帶 `CylinderGeometry(181,181,8,16,1,true)`。
- 導軌 ×2：box 40×(6000−1030)×40，喺套管左右兩側（朝鏡頭方向嘅垂直方向，即 root 局部 ±x 軸旋轉到同鏡頭視線垂直；簡單做法：放喺 angle = atan2(cam.z−z, cam.x−x) ± π/2，半徑 165），body。刪除現有 4 條 lamp rails。
- 爬升艙 ×4：y 1700、2350、3100、4000；`CapsuleGeometry(230, 280, 4, 12)` body，貼套管朝鏡頭一側（半徑 140+150 偏移）；每架一條 `lamp` 窗帶 `CylinderGeometry(233,233,40,12,1,true)` 喺艙中間。刪除現有 3 粒方塊艙。

## 夜晚讀法（對 target-night）
- 成座 body 幾乎隱入夜空；細節只靠：三層暖窗帶（暗）、24 粒泊位薄荷點、接駁環薄荷幼帶、4 個艙窗帶、尖塔紅燈。
- 全部要暗過城市光帶同 Sky Ring 燈；`lamp` 唔准超過現 R4 亮度（×.9）。如 bloom 令窗帶糊成一片，降 `pane` 至 ×.45。

## 測試（新增 `tests/spaceElevator.test.ts`，加入 root `npm test` 喺 skyRing 之後）
1. `elevatorTone`：日霧色（`#c9d6dd`）glow < .05、body 暗過霧；夜霧色（`#141b2e`）glow > .95。
2. `spaceElevator(scene)` 之後 mesh 數 ≤ 4，且全部 `castShadow === false`。
3. settled hero 鏡頭（`heroSettledCamera(1920,1080)`）投影 `(x, 1150 − 曲率沉降, z)`：螢幕 x 喺 1100–1400 之間（防止有人改位置）。沉降 = `(hypot(x,z) − EARTH.plate)² / (2·EARTH.radius)`。
4. 四個 `changeSites` 嘅 hero 視線（同 skyRing.test 一樣嘅 12 條）唔撞升降機 mesh。

## 截圖（放 `r5/`）
- `hero-h16.png`、`hero-h21.png`（1920×1080，playwright-cli `-s=far`，dev server 已開喺 http://localhost:5181）
- `vs-target.jpg`：2×2 拼圖：左 R5、右 target（target 先縮到 1920×1080），上日下夜。
- `zoom-day.png`、`zoom-night.png`：由 hero 截圖裁 x 900–1700、y 0–450 放大 ×2。

## 驗收檢查（Opus 審）
- 兩秒內讀到：分節尖塔、階梯中轉站、分節纜線同爬升艙。
- 輪廓同 R4 一樣大、一樣位；仍然係霧中遠景，冇搶 Civic Core。
- `npm test && npm run build && git diff --check` 全過；console 0 error。

---

# R6 spec（2026-11-02，owner：「remove the big triangle bottom, polish the other」）

目標圖不變（`target/`）。對照 R5 截圖 `r5/`。

## 刪除
- 闊尖塔錐 `cyl(240, 2000, spire, 32)`、8 條肋、3 道環帶、環帶上 24 粒紅燈、頂頸圈 `cyl(260,300,130)`。`coneR`、`run`/`tilt` 等只服務尖塔嘅變數一齊刪。

## 新：下段主柱（取代尖塔，目標圖「幼柱托住圓盤」）
- 主柱 `cyl(300, 360, 1080, 24)` body，中心 y 540（由 0 到 1080；底部沉喺地平線下，`shaded()` haze 會令下段淡入霧）。
- 主柱接駁領 ×3：y 400、700、950，`cyl(380, 380, 40, 24)` body ＋ `cyl(383,383,10,24,true)` lamp（夜晚薄荷幼帶，同纜線接駁環一致）。
- 纜線套管、接駁環、導軌、爬升艙全部保留；導軌改為由 y 0 開始（貫通主柱外側，半徑 165 → 主柱段要 ≥ 380，所以導軌只喺 1080 以上，下段唔要導軌）。

## 中轉站：做出側面（R5 只見底面）
鏡頭比中轉站低約 500 m，所以甲板要夠厚，側面先會正面向鏡頭。
- D1：中心 1150，`cyl(1400, 1320, 180, 48)`
- D2：中心 1320，`cyl(1080, 1040, 160, 48)`
- D3：中心 1470，`cyl(740, 700, 140, 48)`
- 頂蓋：中心 1575，`cyl(440, 500, 70, 32)`
- 窗帶：每層一條連續 `pane` 帶，高 = 層高 ×.4，半徑 = 該帶高度位置嘅層半徑 +6，openEnded；位置喺層中線。日間要見到係「一圈較暗嘅窗帶」。
- 邊緣光帶：`cyl(1405,1405,24,48,true)` lamp 移去 D1 頂緣（y 1150+90−12）。
- 泊位：24 → 16 個，box 100×40×70，半徑 1420，y = D1 中線；每個泊位外端 lamp 30×12×30＋停泊飛行器 body 60×20×32。
- 底面：hub `cyl(380, 340, 100, 24)` 中心 1010（接住主柱頂）；spokes 12 → 8 條，box 長度 (1320−380)、截面 30×30，貼 D1 底面（y = 1150−90−18），唔再傾斜。
- 紅色航空燈：只留 4 粒 `beacon` box 40×20×40 喺頂蓋頂面外緣（半徑 420，y 1575+45），夜晚 ×.6（`BEACON` 改 .6）。

## 夜晚
- 窗帶連續（唔應該斷）：`pane` 夜晚保持 ×.8；如 bloom 令佢糊，降到 ×.6。
- 主柱、套管 body 隱入夜空；細節只靠：三層暖窗帶、D1 頂緣薄荷帶、16 粒泊位點、接駁環／領幼帶、爬升艙帶、4 粒頂部紅燈。

## 測試
- `tests/spaceElevator.test.ts` 保持全過（batch ≤ 4；station x 仍喺 1100–1400）。如果有 test 依賴尖塔，改為主柱。

## 截圖（放 `r6/`）
同 R5：`hero-h16.png`、`hero-h21.png`、`vs-target.jpg`（左 R6 右 target，上日下夜）、`zoom-day.png`、`zoom-night.png`（x 900–1700，y 0–450，×2）。讀 console 確認 0 error。
