# 軌道升降機中距離近景 目標圖 prompt（2026-11-02）

用法：**image edit**（唔係由零生成），每條 prompt 配一張底圖。可以加 `../far-landmark/target/target-day.png` 做第二張參考圖（已接受嘅遠景形態）。候選放 `gen/`（`day-N.png`、`night-N.png`），owner 揀咗先抄去 `target/`（`target-day.png`、`target-night.png`）。

底圖（鏡位 E1，距升降機約 5.5 km，1600×900）：

- 日：`baseline/day.png`（14:00）
- 夜：`baseline/night.png`（21:00）

## 共通部分（每條 prompt 前面都加）

```text
Edit this real-time 3D game engine screenshot. Output must look like the same in-engine screenshot from the same build: same camera, same lens, same lighting, same stylised low-poly WebGL rendering style with clean flat-shaded materials and soft ambient occlusion. Do NOT make it photorealistic, cinematic, painterly or concept-art. Keep the sky and clouds, the sea, the horizon line, the long bridge on the left, the low far-shore skyline, the ferries in the bottom right, the flying craft and their light trails, and the UI text in the corners exactly as they are.

Change only the giant space elevator in the centre: Odaiba, Tokyo, in the year 2127. Keep its exact position, size and silhouette: a column rising from behind the sea horizon (its base stays hidden below the horizon), a huge transfer station of stacked decks about two thirds up the image, and the tether continuing straight up out of the top edge. It is about 5 km away, so it is now a real, solid, lit megastructure, no longer a flat pale cut-out, but still softened by a little atmospheric haze toward the horizon. Build every detail from simple clean low-poly shapes, no surface noise or texture.

Architecture (same family as the city: off-white and pale silver structure, Metabolist megaframe precision, very slender members, monumental civic scale; mint #8CE5D8 as the single accent colour):
- Column: slightly tapered, with three structural joint collars, vertical recessed channels and a thin mint band at each collar.
- Transfer station: three to four stacked deck levels stepping inward toward the top, each with visible floor plates, a continuous recessed window band, terraces with planting at the deck edges, a slim cap with a few small masts. Around the widest deck, evenly spaced docking bays like a harbour, with a few slim passenger craft parked and one craft approaching a bay. Underneath, a radial megaframe of deep spokes connecting the rim to a hub around the column.
- Tether: a segmented sleeve with regular joint rings, two slim guide rails on its sides, and two or three climber cars travelling on it at different heights: each a slender multi-storey capsule with window bands and a clamp ring around the rails, clearly a vehicle carrying people.
The elevator is the subject of the frame, but it must stay calm and architectural: no sci-fi greebles, no rockets, no toy shapes, no cartoon pods.
```

## 日（底圖 baseline/day.png）

```text
Afternoon daylight. Real sun and shade on the structure in the same direction as the bridge and the ferries: a lit side, a shaded side, darker undersides of the decks and spokes, so it reads as a solid volume clearly separate from the sky, still slightly hazed and paler than nearby objects. Window bands are a soft blue-grey, no glow. The lower column fades gently into the horizon haze.
```

## 夜（底圖 baseline/night.png）

```text
Night. The structure is a dark navy volume, barely separated from the night sky by faint moonlight on its lit side. Detail is drawn by light: continuous warm amber (#FFCF8A) window bands round each deck level, mint (#8CE5D8) lights at each docking bay and along the station rim, thin mint rings at the column collars and tether joints, the climber cars' windows softly lit warm with a mint clamp ring, and a few small red aviation beacons on the cap. Bright but calm, a lit harbour in the sky, not a neon sign. A faint reflection of the lights on the sea below.
```

## 揀圖準則

- 鏡頭、天空、海、地平線、橋、船冇變（變咗就唔用）。
- 升降機位置、大小、剪影（柱＋階梯中轉站＋纜線）同 R6 一致；底座仍然喺地平線下面。
- 日間要有真實光影、同天空分得開；夜間燈帶連續、唔零碎。
- 有生命感：泊位有飛行器、纜線有爬升艙。
- 唔似玩具、唔似科幻 greeble。
