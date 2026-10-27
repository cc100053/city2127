import assert from 'node:assert/strict';
import { renderQuality } from '../src/renderQuality.ts';

// The default and unknown values keep the full exhibition look; only `quality=low` drops the costly passes.
const full = { pixelRatioCap: 1.5, msaaSamples: 2, ambientOcclusion: true, aoScale: .5, shadows: true, shadowHz: 4 };
assert.deepEqual(renderQuality(''), full);
assert.deepEqual(renderQuality('?survey&hour=15'), full);
assert.deepEqual(renderQuality('?quality=high'), full);
assert.deepEqual(renderQuality('?survey&quality=low'), { pixelRatioCap: 1, msaaSamples: 0, ambientOcclusion: false, aoScale: .5, shadows: false, shadowHz: 4 });
console.log('renderQuality ok');
