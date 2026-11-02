# 空の環 目標圖 prompt（2026-11-02）

用法：每條 prompt 配一張底圖做 image edit（唔係由零生成）。底圖係 R1 之後嘅 DEV `?review=ring` 截圖（1600×900，鏡頭 URL 見 [handoff](../../../docs/handoffs/hero-sky-ring.md#close-up-polish-r1)）。候選放 `gen/<shot>.png`；owner 揀咗先抄去 `target/`。

| 鏡頭 | 底圖 | 光 |
|---|---|---|
| truss | `baseline/truss.png` | 16:00 |
| pylon | `baseline/pylon.png` | 16:00 |
| berth | `baseline/berth.png` | 16:00 |
| voices-night | `baseline/voices-night.png` | 21:00 |

## 共通部分（每條 prompt 前面都加）

```text
Edit this real-time 3D game engine screenshot. The output must look like the same in-engine screenshot from the same build: same camera, same lens, same lighting and shadows, same stylised low-poly WebGL rendering with clean flat-shaded materials and soft ambient occlusion. Do NOT make it photorealistic, cinematic, painterly or concept art. Keep the sky, sea, city buildings, trees and the UI text in the corners exactly as they are.

Only change the "Sky Ring": the huge white elevated ring structure in the image. It is a 700 m diameter circular truss bridge whose deck sits 250 m above the Odaiba waterfront in the year 2127, carried on six V-shaped diagonal pylons. It is the shared port of the regional air-taxi network: small rounded air pods park at berths cantilevered off its outer edge. Keep its position, height, circular plan, its width (about 14 m wide, 12 m deep) and the V-pylon positions exactly. Its design language: refined white and warm-cream structural steel, diagonal triangulated frames (like the Fuji TV building's frame), a stone-white deck, thin glass parapets, and a single accent colour: soft mint-cyan light (#68D9DE) used only for docking and edge lights. It must read as a mature, elegant, built piece of civic infrastructure, not scaffolding or a prototype. Do not add energy beams, cables, tethers, holograms, signs, text or glowing objects that are not part of docking or lighting.
```

## truss（底圖 truss.png）

```text
Refine the ring's truss and deck where it passes close to the camera. Make the structure read with a clear hierarchy: a deep, smooth outer fascia band along the deck edge (like the side of a sleek bridge girder) with a thin continuous mint light line, slimmer white diagonal web members behind it, and a heavier rounded bottom chord. Taper or round the member ends where they meet, so the joints look like cast nodes instead of crossing boxes. The cantilevered berth near the camera: a clean rounded-edge platform with a parked rounded white air pod (glass canopy, four ducted rotors) and a mint landing ring. A few tiny people stand behind the glass parapet on the deck to show scale.
```

## pylon（底圖 pylon.png）

```text
Refine the V-shaped pylons that carry the ring, especially the near one in the centre. Each pylon: two elegant tapered legs that are thicker at the base and slimmer at the top, rising from one sculpted stone-and-white base on the ground, with a smooth cast node where both legs meet the base. At the top, the legs meet the underside of the ring in a clear saddle bearing that wraps under the truss, so the load path is obvious. One slim horizontal tie between the legs is enough. The ring's underside should show a tidy bottom chord with a row of small hanging lantern fittings. Keep all pylons in exactly the same positions and angles.
```

## berth（底圖 berth.png）

```text
Refine the cantilevered berth in the centre and the ring deck around it, seen from above. The berth: a rounded, slightly tapering platform projecting from the outer edge of the ring, with a thin stone fascia, glass side parapets, a mint landing circle and edge light, and one parked rounded white air pod (glass canopy, four ring-shaped ducted rotors, slim skids). Where the berth meets the deck, a small elegant glass boarding gate with a thin white roof. On the deck, a few tiny pedestrians walk and wait at the gate, and the deck surface shows a subtle paving pattern and a mint guide line along its edge. Keep the berth and the pod the same size and position.
```

## voices-night（底圖 voices-night.png）

```text
Night. Refine the ring's underside seen from below: the bottom chords and diagonal trusses in dark, softly lit white steel, faintly uplit by the city. Hanging under both bottom chords, a regular row of small warm-white lantern nodes on short pendant stems with a small cap, like a string of street lanterns along the ring. About half of the lanterns are lit with a warm glow (these are the residents' voices, one per proposal); the others are unlit pale-grey fittings, clearly visible as empty lanterns waiting to be lit, not black holes. Along the deck edge above, a thin mint docking light line. No other new light sources.
```

## 揀圖準則

- 鏡頭、環嘅位置、斜柱位置、天同城市冇變（有變就唔用）。
- 低多邊形引擎感（唔係相片）；唯一強調色係 mint 泊靠燈同暖白燈點。
- 冇光束、纜、全息、文字。
- 局部唔啱（例如人太大）可以照用，實作時按規格修正。
