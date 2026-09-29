import assert from 'node:assert/strict';
import * as T from 'three';
import { CHANGE_CATALOG, SITE_IDS, siteLayerDefinition, type EnvironmentParkTarget, type SiteLayerDefinition, type SiteLayerId } from '../src/changeCatalog.ts';
import { CityChangeManager, SITE_ASSET_RETRY_SECONDS } from '../src/cityChangeManager.ts';
import type { BuiltSite, BuiltSiteMap } from '../src/siteBuilders/index.ts';
import { MutableSiteLayerRuntime } from '../src/siteBuilders/siteRuntime.ts';
import type { EnvironmentParkDiagnostics, EnvironmentParkRuntime } from '../src/siteBuilders/siteRuntime.ts';
import type { ExhibitionLayout, Layout, SurveyView } from '../src/surveyView.ts';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
const lot = (kind: Layout['nw']['lot'] = 'empty', building: Layout['nw']['building'] = 'none') => ({ lot: kind, building });
const layout = (overrides: Partial<Layout> = {}): Layout => ({ nw: lot(), ne: lot(), sw: lot(), se: lot(), ...overrides });
const view = (value: Layout, revision: number, runId = 'run'): SurveyView => ({
  version: 1, runId, revision, layout: value, history: [],
  scores: { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 },
});
const exhibitionLayout = (overrides: Partial<ExhibitionLayout> = {}): ExhibitionLayout => ({
  version: 2, bands: { nw: 'mixed', ne: 'mixed', sw: 'mixed', se: 'mixed' },
  automatedPorts: 3, sharedSeats: 4, treeCount: 5, plantedFraction: .5, coolingFins: 0, functionModules: 4,
  ...overrides,
});

let parkTarget: EnvironmentParkTarget = { band: 'mixed', treeCount: 5, plantedFraction: .5, coolingFins: 0 };
let parkExhibitionMode = false;
let parkTransitioning = false;
let parkLegacyRestores = 0;
const parkRuntime: EnvironmentParkRuntime = {
  setTarget(target, _now, immediate) {
    const changed = !parkExhibitionMode || target.treeCount !== parkTarget.treeCount
      || target.plantedFraction !== parkTarget.plantedFraction || target.coolingFins !== parkTarget.coolingFins;
    parkTarget = target;
    parkExhibitionMode = true;
    parkTransitioning = changed && !immediate;
    return changed;
  },
  restoreLegacy() {
    parkLegacyRestores++;
    parkTarget = { band: 'mixed', treeCount: 5, plantedFraction: .5, coolingFins: 0 };
    parkExhibitionMode = false;
    parkTransitioning = false;
  },
  update() {},
  getDiagnostics(): EnvironmentParkDiagnostics {
    return {
      ...parkTarget,
      targetTreeCount: parkTarget.treeCount, visibleTreeCount: parkTarget.treeCount,
      targetPlantedFraction: parkTarget.plantedFraction, plantedFraction: parkTarget.plantedFraction,
      targetCoolingFins: parkTarget.coolingFins, visibleCoolingFins: parkTarget.coolingFins,
      representation: 'fallback',
    };
  },
};

const groups = new Map<SiteLayerId, T.Group>();
let parkTreePreparations = 0;
let hubUpperPreparations = 0;
const sites = Object.fromEntries(SITE_IDS.map(siteId => {
  const root = new T.Group();
  const layers: BuiltSite['layers'] = {};
  const definitions = Object.values(CHANGE_CATALOG[siteId].layers)
    .filter((definition): definition is SiteLayerDefinition => definition !== undefined);
  for (const definition of definitions) {
    const layer = new MutableSiteLayerRuntime(definition, root);
    if (definition.assetId) layer.setPreparation(async () => {
      if (definition.id === 'parkTrees') parkTreePreparations++;
      if (definition.id === 'hubUpper') hubUpperPreparations++;
    });
    layers[definition.id] = layer;
    groups.set(definition.id, layer.group);
  }
  const material = new T.MeshStandardMaterial({ emissiveIntensity: .2, transparent: true });
  const marker = new T.Mesh(new T.BufferGeometry(), material); marker.visible = false; root.add(marker);
  return [siteId, {
    id: siteId, root, layers, marker: { mesh: marker, material },
    ...(siteId === 'stationEastPark' ? { environmentPark: parkRuntime } : {}),
  } satisfies BuiltSite];
})) as unknown as BuiltSiteMap;

const manager = new CityChangeManager(sites);
const hubBase = groups.get('hubBase')!, hubUpper = groups.get('hubUpper')!, park = groups.get('parkSurface')!;
const hubMarker = sites.magnetEast.marker, parkMarker = sites.stationEastPark.marker;

manager.restoreFromSnapshot(view(layout({ nw: lot('empty', 'medium') }), 1), 0);
assert.equal(manager.getVariant('magnetEast'), 'automation-medium');
manager.update(1.5);
close(hubBase.scale.y, .5);
assert.equal(hubBase.visible, true);
close(hubMarker.material.emissiveIntensity, .2);
manager.update(3);
close(hubBase.scale.y, 1);

manager.applyIncrementalUpdate(view(layout({ nw: lot('empty', 'tall') }), 2), 3);
assert.equal(manager.getVariant('magnetEast'), 'automation-tall');
close(hubBase.scale.y, 1);
manager.update(3.3125);
assert.ok(hubUpper.scale.y > 1e-3);
assert.ok(hubMarker.material.emissiveIntensity > .2);
manager.update(4.5);
close(hubUpper.scale.y, .5);
assert.equal(hubUpperPreparations, 1);

// Reapplying an unchanged visual variant must not restart its transition.
manager.applyIncrementalUpdate(view(layout({ nw: lot('empty', 'tall') }), 3), 4.5);
manager.update(6);
close(hubUpper.scale.y, 1);

// A newer target during a sink starts from the exact current scale.
manager.applyIncrementalUpdate(view(layout(), 4), 6);
manager.update(7.5);
close(hubBase.scale.y, .5);
manager.applyIncrementalUpdate(view(layout({ nw: lot('empty', 'medium') }), 5), 7.5);
manager.update(9);
close(hubBase.scale.y, .75);

// A reconnect snapshot can add missed geometry but never marks it as a fresh guest change.
manager.restoreFromSnapshot(view(layout({ ne: lot('park') }), 6), 9);
assert.equal(parkTreePreparations, 1);
manager.update(10.5);
close(park.scale.y, .5);
close(parkMarker.material.emissiveIntensity, .2);

// A reset is routed through snapshot restore: sink smoothly, no pulse, then hide exactly.
manager.restoreFromSnapshot(view(layout(), 0, 'reset-run'), 12);
manager.update(13.5);
close(park.scale.y, .5);
close(parkMarker.material.emissiveIntensity, .2);
manager.update(15);
assert.equal(park.visible, false);
close(park.scale.y, 1e-3);
assert.equal(manager.getDiagnostics().stationEastPark.layers.parkTrees?.kind, 'glb');
assert.equal(manager.getDiagnostics().stationEastPark.layers.parkTrees?.assetId, 'future-tree-2127');
assert.equal(manager.getDiagnostics().magnetEast.layers.hubUpper?.assetId, 'automation-hub-upper');

assert.throws(() => new CityChangeManager({ ...sites, magnetEast: undefined } as unknown as BuiltSiteMap), /Missing runtime/);
const mismatched = new MutableSiteLayerRuntime(siteLayerDefinition('stationEastPark', 'parkTrees'), new T.Group());
assert.throws(() => new CityChangeManager({
  ...sites,
  magnetEast: { ...sites.magnetEast, layers: { ...sites.magnetEast.layers, hubBase: mismatched } },
} as BuiltSiteMap), /does not match/);

let retryAttempts = 0;
const retrySites = Object.fromEntries(SITE_IDS.map(siteId => {
  const root = new T.Group();
  const layers: BuiltSite['layers'] = {};
  const definitions = Object.values(CHANGE_CATALOG[siteId].layers)
    .filter((definition): definition is SiteLayerDefinition => definition !== undefined);
  for (const definition of definitions) {
    const layer = new MutableSiteLayerRuntime(definition, root);
    if (definition.assetId) layer.setPreparation(async () => {
      if (definition.id === 'hubUpper' && ++retryAttempts === 1) throw new Error('temporary network failure');
    });
    layers[definition.id] = layer;
  }
  const material = new T.MeshStandardMaterial({ emissiveIntensity: .2, transparent: true });
  const marker = new T.Mesh(new T.BufferGeometry(), material); root.add(marker);
  return [siteId, { id: siteId, root, layers, marker: { mesh: marker, material } } satisfies BuiltSite];
})) as unknown as BuiltSiteMap;
const retryManager = new CityChangeManager(retrySites);
const originalError = console.error; console.error = () => {};
try {
  retryManager.applyIncrementalUpdate(view(layout({ nw: lot('empty', 'tall') }), 1), 0);
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  assert.equal(retrySites.magnetEast.layers.hubUpper?.assetStatus, 'fallback');
  retryManager.update(SITE_ASSET_RETRY_SECONDS - .01);
  assert.equal(retryAttempts, 1);
  retryManager.update(SITE_ASSET_RETRY_SECONDS);
  await new Promise<void>(resolve => setTimeout(resolve, 0));
} finally {
  console.error = originalError;
}
assert.equal(retryAttempts, 2);
assert.equal(retrySites.magnetEast.layers.hubUpper?.assetStatus, 'ready');

const neutral = exhibitionLayout();
manager.applyExhibitionLayout(neutral, 'city-state-snapshot', 20);
assert.equal(manager.getVariant('magnetEast'), 'exhibition-neutral');
assert.equal(manager.getVariant('stationEastPark'), 'exhibition-neutral');
assert.equal(manager.getVariant('dogenzakaSouth'), 'exhibition-neutral');
assert.equal(manager.getVariant('centerGaiRear'), 'exhibition-neutral');
assert.equal(groups.get('hubNeutralProps')?.visible, true);
assert.equal(groups.get('commonsNeutralProps')?.visible, true);
assert.equal(groups.get('towerNeutralProps')?.visible, true);
assert.equal(groups.get('parkCoolingFins')?.visible, true);
assert.equal(manager.getDiagnostics().stationEastPark.environmentPark?.visibleTreeCount, 5);

manager.applyExhibitionLayout(exhibitionLayout({ treeCount: 10, plantedFraction: .65, coolingFins: 3 }), 'city-state-updated', 22);
assert.equal(parkTransitioning, true);
manager.update(22.3);
assert.ok(parkMarker.material.emissiveIntensity > .2);
manager.applyExhibitionLayout(exhibitionLayout({ treeCount: 10, plantedFraction: .65, coolingFins: 3 }), 'city-state-snapshot', 22.4);
assert.equal(parkTransitioning, false);
manager.update(22.5);
close(parkMarker.material.emissiveIntensity, .2);

manager.applyExhibitionLayout(exhibitionLayout({ treeCount: 8, coolingFins: 2 }), 'run-reset', 23);
assert.equal(parkTarget.treeCount, 8);
assert.equal(manager.getDiagnostics().stationEastPark.environmentPark?.visibleTreeCount, 8);
manager.update(23.1);
close(parkMarker.material.emissiveIntensity, .2);

manager.applyIncrementalUpdate(view(layout({ ne: lot('park') }), 8), 24);
assert.equal(parkLegacyRestores, 1);
assert.equal(parkExhibitionMode, false);
assert.equal(manager.getVariant('stationEastPark'), 'park');
assert.equal(manager.getDiagnostics().stationEastPark.environmentPark?.visibleTreeCount, 5);
console.log('PASS: snapshots, incremental updates, changed-only layers, retargeting, markers and reset transitions.');
