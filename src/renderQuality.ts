// Render cost presets. `?quality=low` is a manual fallback for weaker GPUs (measured on an M1 at 2131×1334:
// default ~9 FPS, low ~33 FPS); the default keeps the full exhibition look.
export type RenderQuality = { pixelRatioCap: number; msaaSamples: number; ambientOcclusion: boolean; shadows: boolean };

const FULL: RenderQuality = { pixelRatioCap: 1.5, msaaSamples: 4, ambientOcclusion: true, shadows: true };
// GTAO and the shadow map each redraw the whole city; MSAA quadruples the colour samples.
const LOW: RenderQuality = { pixelRatioCap: 1, msaaSamples: 0, ambientOcclusion: false, shadows: false };

export function renderQuality(search: string): RenderQuality {
  return new URLSearchParams(search).get('quality') === 'low' ? LOW : FULL;
}
