import assert from 'node:assert/strict';
import * as T from 'three';
import { CHANGE_CATALOG, SITE_IDS, selectExhibitionSiteVariants, siteLayerDefinition, type EnvironmentParkTarget, type SiteLayerDefinition, type SiteLayerId } from '../src/changeCatalog.ts';
import { CityChangeManager, SITE_ASSET_RETRY_SECONDS } from '../src/cityChangeManager.ts';
import type { BuiltSite, BuiltSiteMap } from '../src/siteBuilders/index.ts';
import { MutableSiteLayerRuntime } from '../src/siteBuilders/siteRuntime.ts';
import type { EnvironmentParkDiagnostics, EnvironmentParkRuntime } from '../src/siteBuilders/siteRuntime.ts';
import { parseSurveyEvent, type ExhibitionLayout, type Layout, type SurveyView } from '../src/surveyView.ts';
import type { AutomationHubDiagnostics, AutomationHubTarget } from '../src/siteBuilders/automationHub.ts';
import type { CommonsPlazaDiagnostics, CommonsPlazaTarget } from '../src/siteBuilders/commonsPlaza.ts';
import type { ConcentrationTowerDiagnostics, ConcentrationTowerTarget } from '../src/siteBuilders/concentrationTower.ts';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
const lot = (kind: Layout['nw']['lot'] = 'empty', building: Layout['nw']['building'] = 'none') => ({ lot: kind, building });
const layout = (overrides: Partial<Layout> = {}): Layout => ({ nw: lot(), ne: lot(), sw: lot(), se: lot(), ...overrides });
const view = (value: Layout, revision: number, runId = 'run'): SurveyView => ({
  version: 1, runId, revision, layout: value, history: [],
  scores: { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 },
});
const exhibitionLayout = (overrides: Partial<ExhibitionLayout> = {}): ExhibitionLayout => ({
  version: 2, bands: { nw: 'mixed', ne: 'mixed', sw: 'mixed', se: 'mixed' },
  automatedPorts: 3, sharedSeats: 4, treeCount: 8, plantedFraction: .5, coolingFins: 3, functionModules: 4,
  ...overrides,
});

function createController<Target extends object, Diagnostics>(initial: Target, diagnostics: (target: Target) => Diagnostics) {
  let target = initial, applied = false, transitionStart = -Infinity, transitioning = false, restores = 0, updates = 0;
  const calls: { target: Target; now: number; immediate: boolean; changed: boolean }[] = [];
  return {
    calls,
    get target() { return target; },
    get transitionStart() { return transitionStart; },
    get transitioning() { return transitioning; },
    get restores() { return restores; },
    get updates() { return updates; },
    runtime: {
      setTarget(next: Target, now: number, immediate: boolean) {
        const changed = !applied || JSON.stringify(next) !== JSON.stringify(target);
        target = next;
        applied = true;
        if (changed) transitionStart = now;
        if (immediate) transitioning = false;
        else if (changed) transitioning = true;
        calls.push({ target: next, now, immediate, changed });
        return changed;
      },
      update(now: number) {
        updates++;
        if (now >= transitionStart + 3) transitioning = false;
      },
      restoreLegacy() {
        restores++;
        target = initial;
        applied = false;
        transitioning = false;
      },
      getDiagnostics() { return diagnostics(target); },
    },
  };
}

const hubController = createController<AutomationHubTarget, AutomationHubDiagnostics>(
  { band: 'mixed', automatedPorts: 3 }, target => ({
    band: target.band, targetAutomatedPorts: target.automatedPorts, visibleAutomatedPorts: target.automatedPorts,
    targetHumanCounters: 6 - target.automatedPorts, visibleHumanCounters: 6 - target.automatedPorts,
  }),
);
const commonsController = createController<CommonsPlazaTarget, CommonsPlazaDiagnostics>(
  { band: 'mixed', sharedSeats: 4 }, target => ({
    band: target.band, targetSharedSeats: target.sharedSeats, visibleSharedSeats: target.sharedSeats,
    targetScreenedSeats: 8 - target.sharedSeats, visibleScreenedSeats: 8 - target.sharedSeats,
  }),
);
const towerController = createController<ConcentrationTowerTarget, ConcentrationTowerDiagnostics>(
  { band: 'mixed', functionModules: 4 }, target => ({
    band: target.band, targetFunctionModules: target.functionModules, activeFunctionModules: target.functionModules,
    transitioning: false, representation: target.band === 'low' ? 'pavilion-pair' : target.band === 'mixed' ? 'mid-rise-hall' : 'vertical-tower',
  }),
);

let parkTarget: EnvironmentParkTarget = { band: 'mixed', treeCount: 5, plantedFraction: .5, coolingFins: 0 };
let parkExhibitionMode = false;
let parkTransitioning = false;
let parkLegacyRestores = 0;
const parkRuntime: EnvironmentParkRuntime = {
  setTarget(target, _now, immediate) {
    const changed = !parkExhibitionMode || target.band !== parkTarget.band || target.treeCount !== parkTarget.treeCount
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
    ...(siteId === 'magnetEast' ? { automationHub: hubController.runtime } : {}),
    ...(siteId === 'dogenzakaSouth' ? { commonsPlaza: commonsController.runtime } : {}),
    ...(siteId === 'centerGaiRear' ? { concentrationTower: towerController.runtime } : {}),
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
const zeroScores = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
const emptyServerView = {
  version: 2, runId: 'bounds', revision: 0, guestCount: 0, algorithmVersion: 2,
  voteSums: zeroScores, recentVotes: zeroScores, scores: zeroScores, layout: neutral, recentProposals: [],
};
for (const layout of [
  { ...neutral, automatedPorts: 0, sharedSeats: 0, treeCount: 3, plantedFraction: .2, coolingFins: 0, functionModules: 2 },
  { ...neutral, automatedPorts: 6, sharedSeats: 8, treeCount: 12, plantedFraction: .8, coolingFins: 6, functionModules: 6 },
]) {
  assert.ok(parseSurveyEvent({ type: 'city-state-snapshot', view: {
    ...emptyServerView, layout,
  } }), 'the server accepts each v2 count at its inclusive lower and upper bounds');
}
for (const layout of [
  { ...neutral, automatedPorts: 7 }, { ...neutral, sharedSeats: 9 }, { ...neutral, treeCount: 2 },
  { ...neutral, plantedFraction: .81 }, { ...neutral, coolingFins: 7 }, { ...neutral, functionModules: 1 },
]) assert.equal(parseSurveyEvent({ type: 'city-state-snapshot', view: { ...emptyServerView, layout } }), null);
const allBands = (band: 'low' | 'mixed' | 'high') => exhibitionLayout({ bands: { nw: band, ne: band, sw: band, se: band } });
assert.deepEqual(selectExhibitionSiteVariants(allBands('low')), {
  magnetEast: 'automation-low', stationEastPark: 'exhibition-neutral', dogenzakaSouth: 'commons-low', centerGaiRear: 'tower-low',
});
assert.deepEqual(selectExhibitionSiteVariants(allBands('mixed')), {
  magnetEast: 'automation-mixed', stationEastPark: 'exhibition-neutral', dogenzakaSouth: 'commons-mixed', centerGaiRear: 'tower-mixed',
});
assert.deepEqual(selectExhibitionSiteVariants(allBands('high')), {
  magnetEast: 'automation-high', stationEastPark: 'exhibition-neutral', dogenzakaSouth: 'commons-high', centerGaiRear: 'tower-high',
});
manager.applyExhibitionLayout(neutral, 'city-state-snapshot', 20);
assert.equal(manager.getVariant('magnetEast'), 'automation-mixed');
assert.equal(manager.getVariant('stationEastPark'), 'exhibition-neutral');
assert.equal(manager.getVariant('dogenzakaSouth'), 'commons-mixed');
assert.equal(manager.getVariant('centerGaiRear'), 'tower-mixed');
assert.equal(groups.get('hubNeutralProps')?.visible, true);
assert.equal(groups.get('plaza')?.visible, true);
assert.equal(groups.get('commonsNeutralProps')?.visible, false);
assert.equal(groups.get('towerNeutralProps')?.visible, true);
assert.equal(groups.get('parkCoolingFins')?.visible, true);
assert.equal(manager.getDiagnostics().stationEastPark.environmentPark?.visibleTreeCount, 8);
assert.equal(parkTarget.coolingFins, 3);
assert.deepEqual(hubController.calls.at(-1), { target: { band: 'mixed', automatedPorts: 3 }, now: 20, immediate: true, changed: true });
assert.deepEqual(commonsController.calls.at(-1), { target: { band: 'mixed', sharedSeats: 4 }, now: 20, immediate: true, changed: true });
assert.deepEqual(towerController.calls.at(-1), { target: { band: 'mixed', functionModules: 4 }, now: 20, immediate: true, changed: true });

// A NW-only high proposal changes only AUTO HUB and animates its manager-owned upper layer.
const nwHigh = exhibitionLayout({ bands: { nw: 'high', ne: 'mixed', sw: 'mixed', se: 'mixed' }, automatedPorts: 6 });
manager.applyExhibitionLayout(nwHigh, 'city-state-updated', 21);
assert.equal(manager.getVariant('magnetEast'), 'automation-high');
assert.equal(manager.getVariant('dogenzakaSouth'), 'commons-mixed');
assert.equal(manager.getVariant('centerGaiRear'), 'tower-mixed');
assert.equal(hubController.calls.at(-1)?.changed, true);
assert.equal(commonsController.calls.at(-1)?.changed, false);
assert.equal(towerController.calls.at(-1)?.changed, false);
manager.update(22.5);
close(groups.get('hubUpper')!.scale.y, .5);
assert.ok(hubMarker.material.emissiveIntensity > .2);
close(sites.dogenzakaSouth.marker.material.emissiveIntensity, .2);
close(sites.centerGaiRear.marker.material.emissiveIntensity, .2);
close(parkMarker.material.emissiveIntensity, .2);

// Repeating a target does not restart its timer; a same-band count change does.
const originalHubStart = hubController.transitionStart;
manager.applyExhibitionLayout(nwHigh, 'city-state-updated', 22.5);
assert.equal(hubController.calls.at(-1)?.changed, false);
assert.equal(hubController.transitionStart, originalHubStart);
const nwHighFivePorts = exhibitionLayout({ bands: nwHigh.bands, automatedPorts: 5 });
manager.applyExhibitionLayout(nwHighFivePorts, 'city-state-updated', 22.6);
assert.equal(manager.getVariant('magnetEast'), 'automation-high');
assert.equal(hubController.calls.at(-1)?.changed, true);
assert.equal(hubController.calls.at(-1)?.immediate, false);
assert.equal(hubController.transitionStart, 22.6);

// A snapshot settles a live transition and clears every site's pulse immediately.
manager.applyExhibitionLayout(nwHighFivePorts, 'city-state-snapshot', 23);
close(groups.get('hubUpper')!.scale.y, 1);
for (const siteId of SITE_IDS) close(sites[siteId].marker.material.emissiveIntensity, .2);
assert.equal(hubController.calls.at(-1)?.immediate, true);

// SW low, SE high and NE low each affect only their authoritative site target.
const swLow = exhibitionLayout({ bands: { nw: 'high', ne: 'mixed', sw: 'low', se: 'mixed' }, automatedPorts: 5, sharedSeats: 0 });
manager.applyExhibitionLayout(swLow, 'city-state-updated', 24);
assert.equal(commonsController.calls.at(-1)?.changed, true);
assert.equal(hubController.calls.at(-1)?.changed, false);
assert.equal(towerController.calls.at(-1)?.changed, false);
assert.equal(parkTarget.treeCount, 8);
manager.update(24.3);
assert.ok(sites.dogenzakaSouth.marker.material.emissiveIntensity > .2);
close(parkMarker.material.emissiveIntensity, .2);

const seHigh = exhibitionLayout({ bands: { nw: 'high', ne: 'mixed', sw: 'low', se: 'high' }, automatedPorts: 5, sharedSeats: 0, functionModules: 6 });
manager.applyExhibitionLayout(seHigh, 'city-state-updated', 25);
assert.equal(towerController.calls.at(-1)?.changed, true);
assert.equal(commonsController.calls.at(-1)?.changed, false);
assert.equal(hubController.calls.at(-1)?.changed, false);
manager.update(26.5);
close(groups.get('towerUpper')!.scale.y, .5);
assert.ok(sites.centerGaiRear.marker.material.emissiveIntensity > .2);

const neLow = exhibitionLayout({ bands: { nw: 'high', ne: 'low', sw: 'low', se: 'high' }, automatedPorts: 5, sharedSeats: 0, treeCount: 3, plantedFraction: .2, coolingFins: 6, functionModules: 6 });
manager.applyExhibitionLayout(neLow, 'city-state-updated', 27);
assert.equal(parkTransitioning, true);
assert.equal(hubController.calls.at(-1)?.changed, false);
assert.equal(commonsController.calls.at(-1)?.changed, false);
assert.equal(towerController.calls.at(-1)?.changed, false);
manager.update(27.3);
assert.ok(parkMarker.material.emissiveIntensity > .2);
assert.ok(sites.dogenzakaSouth.marker.material.emissiveIntensity > .2, 'the prior SW proposal remains fresh through an unrelated NE update');

// A live high-to-low downgrade fades the NW upper floor over the same three-second window.
const nwLow = exhibitionLayout({ bands: { nw: 'low', ne: 'low', sw: 'low', se: 'high' }, automatedPorts: 0, sharedSeats: 0, functionModules: 6 });
manager.applyExhibitionLayout(nwLow, 'city-state-updated', 27.5);
assert.equal(manager.getVariant('magnetEast'), 'automation-low');
assert.equal(hubController.calls.at(-1)?.immediate, false);
manager.update(29);
close(groups.get('hubUpper')!.scale.y, .5);
assert.ok(sites.magnetEast.marker.material.emissiveIntensity > .2);

// Server snapshots and run resets snap all four sites to their full 2127 baseline without pulses.
manager.applyExhibitionLayout(neutral, 'run-reset', 30);
assert.equal(manager.getVariant('magnetEast'), 'automation-mixed');
assert.equal(manager.getVariant('dogenzakaSouth'), 'commons-mixed');
assert.equal(manager.getVariant('centerGaiRear'), 'tower-mixed');
assert.equal(groups.get('hubUpper')?.visible, false);
assert.equal(groups.get('towerUpper')?.visible, false);
assert.equal(hubController.calls.at(-1)?.immediate, true);
assert.equal(commonsController.calls.at(-1)?.immediate, true);
assert.equal(towerController.calls.at(-1)?.immediate, true);
for (const siteId of SITE_IDS) close(sites[siteId].marker.material.emissiveIntensity, .2);

manager.applyExhibitionLayout(exhibitionLayout({ treeCount: 10, plantedFraction: .65, coolingFins: 3 }), 'city-state-updated', 31);
assert.equal(parkTransitioning, true);
manager.update(31.3);
assert.ok(parkMarker.material.emissiveIntensity > .2);
manager.applyExhibitionLayout(exhibitionLayout({ treeCount: 10, plantedFraction: .65, coolingFins: 3 }), 'city-state-snapshot', 31.4);
assert.equal(parkTransitioning, false);
for (const siteId of SITE_IDS) close(sites[siteId].marker.material.emissiveIntensity, .2);
manager.applyExhibitionLayout(neutral, 'run-reset', 32);
assert.equal(parkTarget.treeCount, 8);
assert.equal(manager.getDiagnostics().stationEastPark.environmentPark?.visibleTreeCount, 8);

manager.applyIncrementalUpdate(view(layout({ ne: lot('park') }), 8), 33);
assert.equal(parkLegacyRestores, 1);
assert.equal(hubController.restores, 1);
assert.equal(commonsController.restores, 1);
assert.equal(towerController.restores, 1);
assert.equal(parkExhibitionMode, false);
assert.equal(manager.getVariant('stationEastPark'), 'park');
assert.equal(manager.getDiagnostics().stationEastPark.environmentPark?.visibleTreeCount, 5);
assert.equal(manager.getDiagnostics().magnetEast.automationHub?.targetAutomatedPorts, 3);
assert.equal(manager.getDiagnostics().dogenzakaSouth.commonsPlaza?.targetSharedSeats, 4);
assert.equal(manager.getDiagnostics().centerGaiRear.concentrationTower?.targetFunctionModules, 4);
assert.throws(() => new CityChangeManager({ ...sites, magnetEast: { ...sites.magnetEast, automationHub: undefined } } as BuiltSiteMap)
  .applyExhibitionLayout(neutral, 'city-state-snapshot', 34), /Missing exhibition runtime/);
console.log('PASS: four-site v2 targets, isolated axes, same-band retargets, snapshots/resets, and preserved v1 paths.');
