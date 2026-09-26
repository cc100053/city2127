import * as T from 'three';
import type { Kit } from '../cityRig.ts';
import { SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import { buildAutomationHub } from './automationHub.ts';
import { buildCommonsPlaza } from './commonsPlaza.ts';
import { buildConcentrationTower } from './concentrationTower.ts';
import { buildEnvironmentPark } from './environmentPark.ts';
import type { BuiltSiteMap } from './siteRuntime.ts';

export type { BuiltSite, BuiltSiteMap, SiteLayerRuntime, SiteMarkerRuntime } from './siteRuntime.ts';

export function buildSurveySites(scene: T.Scene, assets = new SiteAssetLoaderCache()): BuiltSiteMap {
  const kit: Kit = { windows: [], signs: [], random: Math.random };
  const sites = [
    buildAutomationHub(scene, kit, assets),
    buildEnvironmentPark(scene, kit, assets),
    buildCommonsPlaza(scene, kit),
    buildConcentrationTower(scene, kit),
  ];
  return Object.fromEntries(sites.map(site => [site.id, site])) as unknown as BuiltSiteMap;
}
