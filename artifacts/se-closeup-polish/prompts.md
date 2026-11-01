# SE 目標圖 prompt（2026-11-01）

用法：每條 prompt 配一張底圖，用外部圖像模型做 **image edit／image-to-image**（唔係由零生成）。生成結果放返 `artifacts/se-closeup-polish/target/`，檔名 `target-rung-1.png`、`target-rung+1.png`（0 可選）。

底圖（同一鏡頭 `se:d4`，1600×900，12:00）：

- −1：`baseline/se-d4-rung-1.png`
- 0：`baseline/se-d4-rung0.png`
- +1：`baseline/se-d4-rung+1.png`

## 共通部分（每條 prompt 前面都加）

```text
Edit this real-time 3D game engine screenshot. Output must look like the same in-engine screenshot from the same build: same camera, same lens, same midday lighting and shadows, same stylised low-poly WebGL rendering style with clean flat-shaded materials and soft ambient occlusion. Do NOT make it photorealistic, cinematic, painterly or concept-art. Keep every other building, the sky, the sea, the roads, the trees and the UI text in the corners exactly as they are.

Only change the single building site on the light plaza in the middle of the image: the lot between the large grey-and-cream grid-facade block on the left and the blue-and-cream tower with round cream discs in the centre-right. The site stands on a square lot about 27 m wide, with a thin orange outline on the ground.

The site belongs to a futuristic Odaiba waterfront in the year 2127. It must read as a mature, well-designed, inhabited place, not a prototype. Give it its own identity so it does not look like its neighbours: use warm amber (#E8A33D) as the single accent colour (light strips, a ring, small glowing details), with cream, white and pale timber-tone surfaces. No blue-and-cream window pattern like the neighbouring towers.
```

## −1：點在する低い建物（底圖 se-d4-rung-1.png）

```text
Replace the two tiny boxes and the two thin tall poles on the site with a cluster of three or four low waterfront pavilions, each one or two storeys tall (about 5–9 m), spread across the lot with space between them. Each pavilion has a distinctive roof: a gently curved timber-tone roof, a planted green roof, a thin cantilevered canopy. Large glass ground floors show small shops, a café and a service counter, lit with warm amber light. A single covered walkway with a slim white canopy loops between all pavilions like a garden path, with a few small pedestrians walking along it and sitting on benches. Low planting and small trees between pavilions. The overall silhouette must be wide, low and horizontal, clearly much lower than every neighbouring building, so that the sea and sky behind are visible above it. Remove the two tall poles completely.
```

## 0：低い建物と高い建物が混ざる（底圖 se-d4-rung0.png，可選）

```text
Replace the existing pale-blue glass mid-rise box with one mid-rise building of about 15 storeys (around 55 m) with stepped terraces on its upper floors and a planted roof crown with a thin amber ring, plus two low one-storey pavilions with curved timber-tone roofs beside it, connected by a short covered walkway with a few pedestrians. The mix of one medium building and low pavilions must be obvious at a glance.
```

## +1：一つのタワーで上へ（底圖 se-d4-rung+1.png）

```text
Replace the existing stacked glass cylinder tower and its pale-blue base with one slender, elegant vertical tower of about 130 m, standing on a small public podium. On the side facing the camera, a fully glazed elevator shaft runs the full height with one visible glass elevator cabin about two-thirds of the way up. The tower is stacked as a "vertical street": every few floors a different function is visible behind the glass (shops, a clinic, a library, a sports hall, a café terrace), each floor band lit with a slightly different warm tone, separated by thin amber light lines. Two or three sky terraces with greenery break the shaft at intervals. The top is a planted sky garden crown with a glowing amber ring. The tower must be the most recognisable silhouette in the frame: taller and more slender than the neighbouring blue tower, clearly different in form and colour, with the sky visible on both sides of its upper half.
```

## 揀圖準則

- 鏡頭、周邊建築、天同海冇變（有變就唔用，因為之後要逐格對照）。
- 只睇輪廓，兩秒內分得出 −1（闊、低）同 +1（修長、垂直）。
- 唔似鄰居：冇藍／米色窗格。
- 可以做幾次，揀最好嘅一張；局部唔啱（例如行人太大）可以照用，我實作時會按規格修正。
