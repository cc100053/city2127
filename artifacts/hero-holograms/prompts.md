# Hero hologram 目標圖 prompt（2026-11-02）

用法：每條 prompt 配一張底圖做 image edit（唔係由零生成）。底圖係 hero DEV 截圖（1600×900，`?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16|21`，base c166ae5）。風格參考：`reference.webp`（owner 提供；只參考 hologram 嘅數量、位置同觀感，唔抄佢嘅建築）。候選放 `gen/<state>.png`；owner 揀咗先抄去 `target/`。

| 狀態 | 底圖 | 光 |
|---|---|---|
| hero-day | `baseline/hero-h16.png` | 16:00 |
| hero-night | `baseline/hero-h21.png` | 21:00 |

## 共通部分（每條 prompt 前面都加）

```text
Edit this real-time 3D game engine screenshot. The output must look like the same in-engine screenshot from the same build: same camera, same lens, same lighting and shadows, same stylised low-poly WebGL rendering with clean flat-shaded materials. Do NOT make it photorealistic, cinematic, painterly or concept art. Keep every building, the huge white elevated ring and its pylons, the sky, sea, trees, glowing mobility lines, the orange outlines on the ground and the UI text in the four corners exactly as they are. Do not move or redesign anything.

Only ADD holographic media to the city: this is the Odaiba waterfront in Tokyo in the year 2127. Add about 8 to 12 translucent floating holographic panels and screens integrated into the cityscape, in the style of a bright, optimistic sci-fi city: thin glowing cyan and soft violet frames, semi-transparent glassy fill with a faint scanline shimmer, a soft glow halo, crisp bright content. All text on the holograms is in JAPANESE (kanji, kana and numbers only, no English). Mix two kinds:

1. Civic information panels (larger, mostly cyan): a large panel on the left with a globe/district map graphic and "台場 2127"; an environment panel reading "空気清浄度 98.7%" with a leaf icon; a panel reading "水位 安定" with a wave graph; a live city meter panel titled "市民の声" with four small coloured bar gauges and a count "提案 1,284"; transit wayfinding near the elevated tracks reading "ゆりかもめ 台場駅" and "空港シャトル 3分".
2. Fictional 2127 brand and culture adverts (smaller, violet/magenta/cyan): a vertical banner on a tower side, a floating rectangular ad with a product silhouette and a short Japanese slogan, a culture broadcast screen showing a stylised performer and "フジ 文化放送".

Placement: panels float in mid-air in front of or beside towers, hang on tower facades, or stand on thin light stalks above plazas, at varied distances so near ones are larger and far ones small. Keep them clear of the four orange ground outlines and do not cover the central framed tower's core or the ring. They must look like part of the same 3D render (correct perspective, receding with depth, slight transparency showing buildings behind), not a 2D overlay pasted on top. No new buildings, vehicles or people.
```

## hero-day（底圖 hero-h16.png）

```text
Late afternoon daylight, 16:00. The holograms are bright but translucent in daylight: cyan-white frames, readable content, a gentle glow that does not wash out the sunny city.
```

## hero-night（底圖 hero-h21.png）

```text
Night, 21:00. The holograms are the brightest things in the scene: vivid cyan and violet glow, soft bloom, and a faint coloured light spill on the building facades and plazas directly beneath each panel. Everything else stays as dark as it is now.
```

## R2 重做風格（owner 2026-11-02：位置 OK，但 hologram「好膠」，跟參考圖重做設計）

做法：一次上傳兩張圖。圖 1 = R1 候選（`gen/hero-day.png`／`gen/hero-night.png`，保留位置），圖 2 = `reference.webp`（只參考 hologram 物料）。候選存 `gen/r2-hero-day.png`、`gen/r2-hero-night.png`。

R1 點解「膠」：panel 底色實淨飽和（teal／紫色塑膠板）、粗框、企喺柱上似路牌、大塊平面插畫（人像、產品剪影）。

```text
You are given two images. Image 1 is a real-time 3D engine screenshot of a city with floating holographic panels. Image 2 is a style reference only.

Edit Image 1. Keep the camera, every building, the white ring, the sky, the sea, the orange ground outlines, the corner UI text, and the POSITION, SIZE and TEXT of every holographic panel exactly as they are. Do not add or remove panels. Keep the stylised low-poly game-engine look of the city.

Only REDESIGN the material and graphic style of every holographic panel so it matches the holograms in Image 2 (for example the "2127" globe panel on its left, "CLEAN AIR 98.7%" and "WATER LEVEL STABLE"):
- Made of light, not plastic: a very transparent pale cyan glass pane (mostly see-through, the buildings behind clearly visible), no opaque or saturated colour fill.
- Edges are thin, bright, glowing cyan-white light lines with small corner brackets, not thick coloured frames.
- Content is emitted light: crisp white-cyan glowing text and fine wireframe line-art (a wireframe globe with orbit rings, thin line charts, small outline icons, tiny data rows, thin divider lines and HUD ticks), not flat printed illustrations. Replace the performer and product pictures with glowing wireframe line-art of the same subject.
- Soft bloom glow around text and edges, a faint scanline shimmer, and a soft cyan light spill on surfaces just below each panel.
- Colour: mostly cyan and white light; a little soft violet only on two or three of the advert panels, as glowing light, never as a solid fill.
- Panels float freely in the air: remove the dark poles and stalks under them (wall-mounted ones stay on their facade).
Japanese text stays Japanese and stays the same words.
```

hero-day 加：`Daylight: the panels are fainter and more transparent than at night but their edges and text still glow clearly.`
hero-night 加：`Night: the panels glow strongly with bloom and light the facades beneath them; the rest of the city stays as dark as it is.`

## 揀圖準則

- 鏡頭、建築、環、天同四個 site 橙框冇變（有變就唔用）。
- 低多邊形引擎感（唔係相片）；hologram 有透視、有深度，唔係貼平嘅 2D 圖。
- 日文字 Gemini 多數會寫錯：只睇 panel 數量、位置、大細、色同觀感，文字實作時跟 spec。
- Panel 唔遮 site 橙框、中央塔核心同空の環。
