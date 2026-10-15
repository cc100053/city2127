import assert from 'node:assert/strict';
import { renderQuality } from '../src/renderQuality.ts';

// The default and unknown values keep the full exhibition look; only `quality=low` drops the costly passes.
const full = { pixelRatioCap: 1.5, msaaSamples: 4, ambientOcclusion: true, shadows: true };
assert.deepEqual(renderQuality(''), full);
assert.deepEqual(renderQuality('?survey&hour=15'), full);
assert.deepEqual(renderQuality('?quality=high'), full);
assert.deepEqual(renderQuality('?survey&quality=low'), { pixelRatioCap: 1, msaaSamples: 0, ambientOcclusion: false, shadows: false });
console.log('renderQuality ok');
