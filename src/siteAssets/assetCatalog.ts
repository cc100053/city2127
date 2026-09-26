import type { SiteAssetId, SiteId, SiteLayerId } from '../changeCatalog.ts';

export type SiteAssetCategory = 'site-layer' | 'prop';
export type SiteAssetMaterialPolicy = 'preserve' | 'city-roles';
export type CityMaterialRole = 'city_glass' | 'city_trim' | 'city_future_light' | 'city_solar';

export interface SiteAssetMetadataContract {
  readonly category: SiteAssetCategory;
  readonly forwardAxis: '-Y';
  readonly frontMarkerName: string;
}

export interface SiteAssetDefinition {
  readonly id: SiteAssetId;
  readonly url: string;
  readonly rootName: string;
  readonly category: SiteAssetCategory;
  readonly compatibleSite: SiteId;
  readonly compatibleLayer: SiteLayerId;
  readonly footprint: readonly [number, number];
  readonly maxHeight: number;
  readonly materialPolicy: SiteAssetMaterialPolicy;
  readonly materialRoles?: readonly CityMaterialRole[];
  readonly metadata?: SiteAssetMetadataContract;
}

export const SITE_ASSET_CATALOG: Readonly<Record<SiteAssetId, SiteAssetDefinition>> = {
  'future-tree-2127': {
    id: 'future-tree-2127',
    url: new URL('../../asset/models/future-tree-2127/future-tree-2127.glb', import.meta.url).href,
    rootName: 'FutureTree2127',
    category: 'prop',
    compatibleSite: 'stationEastPark',
    compatibleLayer: 'parkTrees',
    footprint: [5.51, 5.26],
    maxHeight: 6.33,
    materialPolicy: 'preserve',
  },
  'automation-hub-upper': {
    id: 'automation-hub-upper',
    url: new URL('../../asset/models/automation-hub-upper/automation-hub-upper.glb', import.meta.url).href,
    rootName: 'ROOT_AUTOMATION_HUB_UPPER',
    category: 'site-layer',
    compatibleSite: 'magnetEast',
    compatibleLayer: 'hubUpper',
    footprint: [5.8, 5.8],
    maxHeight: 20.3,
    materialPolicy: 'city-roles',
    materialRoles: ['city_glass', 'city_trim', 'city_future_light', 'city_solar'],
    metadata: { category: 'site-layer', forwardAxis: '-Y', frontMarkerName: 'front_marker' },
  },
};
