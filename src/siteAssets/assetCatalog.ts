import type { SiteAssetId, SiteId, SiteLayerId } from '../changeCatalog.ts';

export type SiteAssetCategory = 'site-layer' | 'prop';
export type SiteAssetMaterialPolicy = 'preserve' | 'city-roles';

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
};
