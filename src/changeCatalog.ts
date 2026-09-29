import type { ExhibitionLayout, Layout, LotSocketId } from './surveyView.ts';

export const SITE_IDS = ['magnetEast', 'stationEastPark', 'dogenzakaSouth', 'centerGaiRear'] as const;
export type SiteId = typeof SITE_IDS[number];

export const SITE_LAYER_IDS = ['hubBase', 'hubUpper', 'hubNeutralProps', 'parkSurface', 'parkTrees', 'parkCoolingFins', 'plaza', 'commonsNeutralProps', 'towerBase', 'towerUpper', 'towerNeutralProps'] as const;
export type SiteLayerId = typeof SITE_LAYER_IDS[number];
export type SiteLayerKind = 'procedural' | 'glb' | 'prop' | 'effect';
export type SiteAssetId = 'future-tree-2127' | 'automation-hub-upper';
export type EnvironmentParkTarget = Pick<ExhibitionLayout, 'treeCount' | 'plantedFraction' | 'coolingFins'> & {
  readonly band: ExhibitionLayout['bands']['ne'];
};
export type SiteEnterAnimation = 'rise';
export type SiteExitAnimation = 'sink';

export type SiteVariantId =
  | 'baseline'
  | 'exhibition-neutral'
  | 'automation-medium'
  | 'automation-tall'
  | 'automation-low'
  | 'automation-mixed'
  | 'automation-high'
  | 'park'
  | 'plaza'
  | 'commons-low'
  | 'commons-mixed'
  | 'commons-high'
  | 'tower-medium'
  | 'tower-tall'
  | 'tower-low'
  | 'tower-mixed'
  | 'tower-high';

export interface SiteVariantDefinition {
  readonly id: SiteVariantId;
  readonly layers: readonly SiteLayerId[];
}

export interface SiteLayerDefinition {
  readonly id: SiteLayerId;
  readonly kind: SiteLayerKind;
  readonly assetId?: SiteAssetId;
  readonly enterAnimation: SiteEnterAnimation;
  readonly exitAnimation: SiteExitAnimation;
}

export interface SiteDefinition {
  readonly id: SiteId;
  readonly socketId: LotSocketId;
  readonly layers: Readonly<Partial<Record<SiteLayerId, SiteLayerDefinition>>>;
  readonly variants: Readonly<Partial<Record<SiteVariantId, SiteVariantDefinition>>>;
  readonly selectVariant: (layout: Layout) => SiteVariantId;
}

const variant = (id: SiteVariantId, ...layers: SiteLayerId[]): SiteVariantDefinition => ({ id, layers });
const layer = (id: SiteLayerId, kind: SiteLayerKind, assetId?: SiteAssetId): SiteLayerDefinition => ({
  id, kind, assetId, enterAnimation: 'rise', exitAnimation: 'sink',
});
const buildingVariant = (building: Layout['nw']['building'], medium: SiteVariantId, tall: SiteVariantId) =>
  building === 'tall' ? tall : building === 'none' ? 'baseline' : medium;

export const CHANGE_CATALOG: Readonly<Record<SiteId, SiteDefinition>> = {
  magnetEast: {
    id: 'magnetEast', socketId: 'nw',
    layers: {
      hubBase: layer('hubBase', 'procedural'),
      hubUpper: layer('hubUpper', 'glb', 'automation-hub-upper'),
      hubNeutralProps: layer('hubNeutralProps', 'procedural'),
    },
    variants: {
      baseline: variant('baseline'),
      'exhibition-neutral': variant('exhibition-neutral', 'hubBase', 'hubNeutralProps'),
      'automation-medium': variant('automation-medium', 'hubBase'),
      'automation-tall': variant('automation-tall', 'hubBase', 'hubUpper'),
      'automation-low': variant('automation-low', 'hubBase', 'hubNeutralProps'),
      'automation-mixed': variant('automation-mixed', 'hubBase', 'hubNeutralProps'),
      'automation-high': variant('automation-high', 'hubBase', 'hubUpper', 'hubNeutralProps'),
    },
    selectVariant: layout => buildingVariant(layout.nw.building, 'automation-medium', 'automation-tall'),
  },
  stationEastPark: {
    id: 'stationEastPark', socketId: 'ne',
    layers: {
      parkSurface: layer('parkSurface', 'procedural'),
      parkTrees: layer('parkTrees', 'glb', 'future-tree-2127'),
      parkCoolingFins: layer('parkCoolingFins', 'procedural'),
    },
    variants: {
      baseline: variant('baseline'),
      park: variant('park', 'parkSurface', 'parkTrees'),
      'exhibition-neutral': variant('exhibition-neutral', 'parkSurface', 'parkTrees', 'parkCoolingFins'),
    },
    selectVariant: layout => layout.ne.lot === 'park' ? 'park' : 'baseline',
  },
  dogenzakaSouth: {
    id: 'dogenzakaSouth', socketId: 'sw',
    layers: {
      plaza: layer('plaza', 'procedural'),
      commonsNeutralProps: layer('commonsNeutralProps', 'procedural'),
    },
    variants: {
      baseline: variant('baseline'),
      plaza: variant('plaza', 'plaza'),
      'exhibition-neutral': variant('exhibition-neutral', 'plaza', 'commonsNeutralProps'),
      'commons-low': variant('commons-low', 'plaza'),
      'commons-mixed': variant('commons-mixed', 'plaza'),
      'commons-high': variant('commons-high', 'plaza'),
    },
    selectVariant: layout => layout.sw.lot === 'plaza' ? 'plaza' : 'baseline',
  },
  centerGaiRear: {
    id: 'centerGaiRear', socketId: 'se',
    layers: {
      towerBase: layer('towerBase', 'procedural'),
      towerUpper: layer('towerUpper', 'procedural'),
      towerNeutralProps: layer('towerNeutralProps', 'procedural'),
    },
    variants: {
      baseline: variant('baseline'),
      'exhibition-neutral': variant('exhibition-neutral', 'towerBase', 'towerNeutralProps'),
      'tower-medium': variant('tower-medium', 'towerBase'),
      'tower-tall': variant('tower-tall', 'towerBase', 'towerUpper'),
      'tower-low': variant('tower-low', 'towerBase'),
      'tower-mixed': variant('tower-mixed', 'towerBase', 'towerNeutralProps'),
      'tower-high': variant('tower-high', 'towerBase', 'towerUpper'),
    },
    selectVariant: layout => buildingVariant(layout.se.building, 'tower-medium', 'tower-tall'),
  },
};

export function selectSiteVariants(layout: Layout): Record<SiteId, SiteVariantId> {
  return Object.fromEntries(SITE_IDS.map(id => [id, CHANGE_CATALOG[id].selectVariant(layout)])) as Record<SiteId, SiteVariantId>;
}

const AUTOMATION_VARIANTS: Record<ExhibitionLayout['bands']['nw'], SiteVariantId> = {
  low: 'automation-low', mixed: 'automation-mixed', high: 'automation-high',
};
const COMMONS_VARIANTS: Record<ExhibitionLayout['bands']['sw'], SiteVariantId> = {
  low: 'commons-low', mixed: 'commons-mixed', high: 'commons-high',
};
const TOWER_VARIANTS: Record<ExhibitionLayout['bands']['se'], SiteVariantId> = {
  low: 'tower-low', mixed: 'tower-mixed', high: 'tower-high',
};

export function selectExhibitionSiteVariants(layout: ExhibitionLayout): Record<SiteId, SiteVariantId> {
  return {
    magnetEast: AUTOMATION_VARIANTS[layout.bands.nw],
    stationEastPark: 'exhibition-neutral',
    dogenzakaSouth: COMMONS_VARIANTS[layout.bands.sw],
    centerGaiRear: TOWER_VARIANTS[layout.bands.se],
  };
}

export function variantLayers(siteId: SiteId, variantId: SiteVariantId): readonly SiteLayerId[] {
  const selected = CHANGE_CATALOG[siteId].variants[variantId];
  if (!selected) throw new Error(`Unknown variant ${variantId} for site ${siteId}.`);
  return selected.layers;
}

export function siteLayerDefinition(siteId: SiteId, layerId: SiteLayerId): SiteLayerDefinition {
  const definition = CHANGE_CATALOG[siteId].layers[layerId];
  if (!definition) throw new Error(`Unknown layer ${layerId} for site ${siteId}.`);
  return definition;
}

export function environmentParkTarget(layout: ExhibitionLayout): EnvironmentParkTarget {
  return {
    band: layout.bands.ne,
    treeCount: layout.treeCount,
    plantedFraction: layout.plantedFraction,
    coolingFins: layout.coolingFins,
  };
}
