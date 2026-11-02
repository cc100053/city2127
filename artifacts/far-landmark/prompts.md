# 遠景軌道升降機 目標圖 prompt（2026-11-02）

用法：每條 prompt 配一張底圖，做 **image edit**（唔係由零生成）。候選放 `gen/`，owner 揀咗先抄去 `target/`（`target-day.png`、`target-night.png`）。

底圖（settled hero 鏡頭，1920×1080，冇升降機）：

- 日：`baseline/hero-h16.png`（16:00）
- 夜：`baseline/hero-h21.png`（21:00）

## 共通部分（每條 prompt 前面都加）

```text
Edit this real-time 3D game engine screenshot. Output must look like the same in-engine screenshot from the same build: same camera, same lens, same lighting, same stylised low-poly WebGL rendering style with clean flat-shaded materials. Do NOT make it photorealistic, cinematic, painterly or concept-art. Keep every building, the large truss ring across the top of the sky, its diagonal legs, the flying craft and light streaks, the clouds, the sea, the trees and the UI text in the corners exactly as they are.

Add only one thing: a space elevator (orbital tether) standing very far away on the horizon, about 7 km behind the city, in the sky gap just to the right of the big square open-frame tower in the centre, left of the round glass dome on the right. It is so far that it reads only as a soft silhouette in the atmospheric haze, with no surface detail, no windows and no texture. Its base is hidden below the sea horizon. From the horizon a slender tapered anchor spire rises, and from its tip a single very thin straight vertical tether continues upward through the sky, passes behind the truss ring and leaves the top edge of the image. On the tether, a little above the spire, sits one flat disc-shaped transfer station, small at this distance. Two or three tiny climber cars sit higher on the tether. The whole structure is behind everything else: the ring, the towers and the flying craft all overlap it. It must stay subtle and secondary to the city: the city and the truss ring remain the main subject.
```

## 日（底圖 baseline/hero-h16.png）

```text
Afternoon daylight. The space elevator is a pale blue-grey silhouette only slightly darker than the hazy sky around it, fading toward the horizon so its lower spire almost dissolves into the haze; the tether is a fine line, one or two pixels wide. No glow, no lights in daylight.
```

## 夜（底圖 baseline/hero-h21.png）

```text
Night. The space elevator's body is a barely visible dark silhouette against the night sky. Its tether is a fine, faint mint-green (#8CE5D8) light line, dimmer than the city's light streaks and the ring's lights, so it does not compete with them. The transfer station shows a thin glowing mint ring, and the two or three climber cars on the tether are tiny mint points of light. Faint haze glow where the spire meets the horizon.
```

## 揀圖準則

- 鏡頭、城市、Sky Ring、雲同海冇變（變咗就唔用，之後要逐格對照）。
- 升降機喺所有嘢後面，只係輪廓，唔搶 Civic Core 同 Sky Ring。
- 位置大約喺 Civic Core 右邊、玻璃球左邊嘅天空；可以接受左右偏少少，實作會照圖校。
- 夜晚纜線要淡過城市光帶。
