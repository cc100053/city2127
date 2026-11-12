import type { SiteAssetId, SiteId, SiteLayerId } from '../changeCatalog.ts';

export type SiteAssetCategory = 'site-layer' | 'prop' | 'kit';
export type SiteAssetMaterialPolicy = 'preserve' | 'city-roles';
export type CityMaterialRole = 'city_glass' | 'city_trim' | 'city_future_light' | 'city_solar'
  | 'se_white' | 'se_amber' | 'se_room' | 'se_lamp' | 'se_light' | 'se_pane'
  | 'se_cream' | 'se_ceiling' | 'se_paving' | 'se_glass' | 'se_lift_glass';

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
  /** A site-bound asset names its site and layer; a `kit` (shared props, see propKit.ts) belongs to none. */
  readonly compatibleSite?: SiteId;
  readonly compatibleLayer?: SiteLayerId;
  readonly footprint: readonly [number, number];
  readonly maxHeight: number;
  readonly materialPolicy: SiteAssetMaterialPolicy;
  readonly materialRoles?: readonly CityMaterialRole[];
  readonly metadata?: SiteAssetMetadataContract;
}

export const SITE_ASSET_CATALOG: Readonly<Record<SiteAssetId, SiteAssetDefinition>> = {
  'se-district-2127': {
    id: 'se-district-2127',
    url: new URL('../../asset/models/se-district-2127/se-district-2127.glb', import.meta.url).href,
    rootName: 'ROOT_SE_DISTRICT_2127', category: 'kit', footprint: [40, 40], maxHeight: 112, materialPolicy: 'preserve',
  },
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
  'concentration-tower-high': {
    id: 'concentration-tower-high',
    url: new URL('../../asset/models/concentration-tower-high/concentration-tower-high.glb', import.meta.url).href,
    rootName: 'ROOT_CONCENTRATION_TOWER_HIGH',
    category: 'site-layer',
    compatibleSite: 'centerGaiRear',
    compatibleLayer: 'towerUpper',
    footprint: [10.4, 8.2],
    maxHeight: 38.2,
    materialPolicy: 'city-roles',
    materialRoles: ['se_white', 'se_amber', 'se_room', 'se_cream', 'se_ceiling', 'se_light', 'se_glass', 'se_lift_glass', 'se_paving'],
  },
  'city-kit-2127': {
    id: 'city-kit-2127',
    url: new URL('../../asset/models/city-kit-2127/city-kit-2127.glb', import.meta.url).href,
    rootName: 'ROOT_CITY_KIT_2127',
    category: 'kit',
    footprint: [33, 22], // the review grid of props; the runtime reads each prop relative to its own empty
    maxHeight: 4.3,
    materialPolicy: 'preserve',
  },
  'car-family-2127': {
    id: 'car-family-2127',
    url: new URL('../../asset/models/car-family-2127/car-family-2127.glb', import.meta.url).href,
    rootName: 'ROOT_CAR_FAMILY_2127',
    category: 'kit',
    footprint: [5.7, 5.7], // both variants side by side; mobility reads each relative to its own empty
    maxHeight: 2,
    materialPolicy: 'preserve',
  },
  'train-2127': {
    id: 'train-2127',
    url: new URL('../../asset/models/train-2127/train-2127.glb', import.meta.url).href,
    rootName: 'ROOT_TRAIN_2127',
    category: 'kit',
    footprint: [12, 15], // lead, mid and tail cars side by side, the lead's blade ahead; mobility reads each relative to its own empty
    maxHeight: 4.5,
    materialPolicy: 'preserve',
  },
};
