import type { Layout, LotSocketId } from './surveyView.ts';

export const SITE_IDS = ['magnetEast', 'stationEastPark', 'dogenzakaSouth', 'centerGaiRear'] as const;
export type SiteId = typeof SITE_IDS[number];

export const SITE_LAYER_IDS = ['hubBase', 'hubUpper', 'park', 'plaza', 'towerBase', 'towerUpper'] as const;
export type SiteLayerId = typeof SITE_LAYER_IDS[number];

export type SiteVariantId =
  | 'baseline'
  | 'automation-medium'
  | 'automation-tall'
  | 'park'
  | 'plaza'
  | 'tower-medium'
  | 'tower-tall';

export interface SiteVariantDefinition {
  readonly id: SiteVariantId;
  readonly layers: readonly SiteLayerId[];
}

export interface SiteDefinition {
  readonly id: SiteId;
  readonly socketId: LotSocketId;
  readonly variants: Readonly<Partial<Record<SiteVariantId, SiteVariantDefinition>>>;
  readonly selectVariant: (layout: Layout) => SiteVariantId;
}

const variant = (id: SiteVariantId, ...layers: SiteLayerId[]): SiteVariantDefinition => ({ id, layers });
const buildingVariant = (building: Layout['nw']['building'], medium: SiteVariantId, tall: SiteVariantId) =>
  building === 'tall' ? tall : building === 'none' ? 'baseline' : medium;

export const CHANGE_CATALOG: Readonly<Record<SiteId, SiteDefinition>> = {
  magnetEast: {
    id: 'magnetEast', socketId: 'nw',
    variants: {
      baseline: variant('baseline'),
      'automation-medium': variant('automation-medium', 'hubBase'),
      'automation-tall': variant('automation-tall', 'hubBase', 'hubUpper'),
    },
    selectVariant: layout => buildingVariant(layout.nw.building, 'automation-medium', 'automation-tall'),
  },
  stationEastPark: {
    id: 'stationEastPark', socketId: 'ne',
    variants: { baseline: variant('baseline'), park: variant('park', 'park') },
    selectVariant: layout => layout.ne.lot === 'park' ? 'park' : 'baseline',
  },
  dogenzakaSouth: {
    id: 'dogenzakaSouth', socketId: 'sw',
    variants: { baseline: variant('baseline'), plaza: variant('plaza', 'plaza') },
    selectVariant: layout => layout.sw.lot === 'plaza' ? 'plaza' : 'baseline',
  },
  centerGaiRear: {
    id: 'centerGaiRear', socketId: 'se',
    variants: {
      baseline: variant('baseline'),
      'tower-medium': variant('tower-medium', 'towerBase'),
      'tower-tall': variant('tower-tall', 'towerBase', 'towerUpper'),
    },
    selectVariant: layout => buildingVariant(layout.se.building, 'tower-medium', 'tower-tall'),
  },
};

export function selectSiteVariants(layout: Layout): Record<SiteId, SiteVariantId> {
  return Object.fromEntries(SITE_IDS.map(id => [id, CHANGE_CATALOG[id].selectVariant(layout)])) as Record<SiteId, SiteVariantId>;
}

export function variantLayers(siteId: SiteId, variantId: SiteVariantId): readonly SiteLayerId[] {
  const selected = CHANGE_CATALOG[siteId].variants[variantId];
  if (!selected) throw new Error(`Unknown variant ${variantId} for site ${siteId}.`);
  return selected.layers;
}
