// Render cost presets. `?quality=low` is a manual fallback for weaker GPUs (measured on an M1 at 2131×1334:
// default ~9 FPS, low ~33 FPS); the default keeps the full exhibition look.
// aoScale: GTAO buffer size relative to the canvas; shadowHz: shadow map redraws per second (the sun moves ~2°/s, actors cast none).
export type RenderQuality = { pixelRatioCap: number; msaaSamples: number; ambientOcclusion: boolean; aoScale: number; shadows: boolean; shadowHz: number };

// 2026-10-27: half-size GTAO, 2× MSAA and 4 Hz shadows trade little visible detail for most of the per-frame GPU cost.
const FULL: RenderQuality = { pixelRatioCap: 1.5, msaaSamples: 2, ambientOcclusion: true, aoScale: .5, shadows: true, shadowHz: 4 };
// GTAO and the shadow map each redraw the whole city; MSAA multiplies the colour samples.
const LOW: RenderQuality = { pixelRatioCap: 1, msaaSamples: 0, ambientOcclusion: false, aoScale: .5, shadows: false, shadowHz: 4 };

export function renderQuality(search: string): RenderQuality {
  return new URLSearchParams(search).get('quality') === 'low' ? LOW : FULL;
}
