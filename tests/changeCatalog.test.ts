import assert from 'node:assert/strict';
import { selectSiteVariants, siteLayerDefinition, variantLayers } from '../src/changeCatalog.ts';
import type { Layout } from '../src/surveyView.ts';

const lot = (kind: Layout['nw']['lot'] = 'empty', building: Layout['nw']['building'] = 'none') => ({ lot: kind, building });
const layout = (overrides: Partial<Layout> = {}): Layout => ({
  nw: lot(), ne: lot(), sw: lot(), se: lot(), ...overrides,
});

assert.deepEqual(selectSiteVariants(layout()), {
  magnetEast: 'baseline', stationEastPark: 'baseline', dogenzakaSouth: 'baseline', centerGaiRear: 'baseline',
});
assert.equal(selectSiteVariants(layout({ nw: lot('empty', 'small') })).magnetEast, 'automation-medium');
assert.equal(selectSiteVariants(layout({ nw: lot('empty', 'medium') })).magnetEast, 'automation-medium');
assert.equal(selectSiteVariants(layout({ nw: lot('empty', 'tall') })).magnetEast, 'automation-tall');
assert.equal(selectSiteVariants(layout({ ne: lot('park') })).stationEastPark, 'park');
assert.equal(selectSiteVariants(layout({ ne: lot('plaza') })).stationEastPark, 'baseline');
assert.equal(selectSiteVariants(layout({ sw: lot('plaza') })).dogenzakaSouth, 'plaza');
assert.equal(selectSiteVariants(layout({ sw: lot('park') })).dogenzakaSouth, 'baseline');
assert.equal(selectSiteVariants(layout({ se: lot('empty', 'small') })).centerGaiRear, 'tower-medium');
assert.equal(selectSiteVariants(layout({ se: lot('empty', 'medium') })).centerGaiRear, 'tower-medium');
assert.equal(selectSiteVariants(layout({ se: lot('empty', 'tall') })).centerGaiRear, 'tower-tall');
assert.deepEqual(variantLayers('magnetEast', 'automation-tall'), ['hubBase', 'hubUpper']);
assert.deepEqual(variantLayers('stationEastPark', 'park'), ['parkSurface', 'parkTrees']);
assert.deepEqual(variantLayers('centerGaiRear', 'tower-tall'), ['towerBase', 'towerUpper']);
assert.deepEqual(siteLayerDefinition('stationEastPark', 'parkTrees'), {
  id: 'parkTrees', kind: 'glb', assetId: 'future-tree-2127', enterAnimation: 'rise', exitAnimation: 'sink',
});
assert.deepEqual(siteLayerDefinition('magnetEast', 'hubUpper'), {
  id: 'hubUpper', kind: 'glb', assetId: 'automation-hub-upper', enterAnimation: 'rise', exitAnimation: 'sink',
});
assert.throws(() => variantLayers('stationEastPark', 'plaza'), /Unknown variant/);
assert.throws(() => siteLayerDefinition('magnetEast', 'parkTrees'), /Unknown layer/);

console.log('PASS: layout selects explicit Shibuya site variants and additive layers.');
