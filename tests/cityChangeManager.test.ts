import assert from 'node:assert/strict';
import * as T from 'three';
import { CHANGE_CATALOG, SITE_IDS, type SiteId, type SiteLayerId } from '../src/changeCatalog.ts';
import { CityChangeManager } from '../src/cityChangeManager.ts';
import type { BuiltSite, BuiltSiteMap } from '../src/siteBuilders/index.ts';
import type { Layout, SurveyView } from '../src/surveyView.ts';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
const lot = (kind: Layout['nw']['lot'] = 'empty', building: Layout['nw']['building'] = 'none') => ({ lot: kind, building });
const layout = (overrides: Partial<Layout> = {}): Layout => ({ nw: lot(), ne: lot(), sw: lot(), se: lot(), ...overrides });
const view = (value: Layout, revision: number, runId = 'run'): SurveyView => ({
  runId, revision, layout: value, history: [],
  scores: { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 },
});

const groups = new Map<SiteLayerId, T.Group>();
const sites = Object.fromEntries(SITE_IDS.map(siteId => {
  const root = new T.Group();
  const layers: Partial<Record<SiteLayerId, T.Group>> = {};
  const layerIds = new Set(Object.values(CHANGE_CATALOG[siteId].variants).flatMap(definition => definition?.layers ?? []));
  for (const layerId of layerIds) {
    const group = new T.Group(); group.visible = false; group.scale.y = 1e-3; root.add(group); layers[layerId] = group; groups.set(layerId, group);
  }
  const material = new T.MeshStandardMaterial({ emissiveIntensity: .2, transparent: true });
  const marker = new T.Mesh(new T.BufferGeometry(), material); marker.visible = false; root.add(marker);
  return [siteId, { id: siteId, root, layers, marker: { mesh: marker, material } } satisfies BuiltSite];
})) as unknown as BuiltSiteMap;

const manager = new CityChangeManager(sites);
const hubBase = groups.get('hubBase')!, hubUpper = groups.get('hubUpper')!, park = groups.get('park')!;
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

assert.throws(() => new CityChangeManager({ ...sites, magnetEast: undefined } as unknown as BuiltSiteMap), /Missing runtime/);
console.log('PASS: snapshots, incremental updates, changed-only layers, retargeting, markers and reset transitions.');
