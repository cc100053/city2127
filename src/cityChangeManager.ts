import type * as T from 'three';
import { CHANGE_CATALOG, SITE_IDS, environmentParkTarget, selectExhibitionSiteVariants, selectSiteVariants, variantLayers, type SiteId, type SiteLayerDefinition, type SiteLayerId, type SiteVariantId } from './changeCatalog.ts';
import type { BuiltSite, BuiltSiteMap, SiteLayerRuntime } from './siteBuilders/index.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';
import type { EnvironmentParkDiagnostics } from './siteBuilders/siteRuntime.ts';
import type { SurveyView } from './surveyView.ts';
import type { ExhibitionLayout, SurveyEventKind } from './surveyView.ts';

export { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';
export const FRESH_MARKER_SECONDS = 10;
export const SITE_ASSET_RETRY_SECONDS = 5;
const HIDDEN_SCALE = 1e-3;

type LayerMotion = {
  readonly layer: SiteLayerRuntime;
  readonly group: T.Group;
  from: number;
  to: number;
  start: number;
  fresh: number;
  retryAt: number;
};

export interface SiteLayerDiagnostic {
  readonly kind: SiteLayerDefinition['kind'];
  readonly assetId?: SiteLayerDefinition['assetId'];
  readonly assetStatus: SiteLayerRuntime['assetStatus'];
  readonly assetError?: string;
}

export interface SiteDiagnostic {
  readonly variant: SiteVariantId;
  readonly layers: Readonly<Partial<Record<SiteLayerId, SiteLayerDiagnostic>>>;
  readonly environmentPark?: EnvironmentParkDiagnostics;
  readonly automationHub?: ReturnType<NonNullable<BuiltSite['automationHub']>['getDiagnostics']>;
  readonly commonsPlaza?: ReturnType<NonNullable<BuiltSite['commonsPlaza']>['getDiagnostics']>;
  readonly concentrationTower?: ReturnType<NonNullable<BuiltSite['concentrationTower']>['getDiagnostics']>;
}

export type CityChangeDiagnostics = Readonly<Record<SiteId, SiteDiagnostic>>;

const EXHIBITION_BASE_VARIANTS: Record<SiteId, SiteVariantId> = {
  magnetEast: 'automation-mixed', stationEastPark: 'exhibition-neutral',
  dogenzakaSouth: 'commons-mixed', centerGaiRear: 'tower-mixed',
};

const prefersReducedMotion = () => typeof globalThis.matchMedia === 'function'
  && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

const smoothstep = (value: number) => value * value * (3 - 2 * value);

/** Runtime-only renderer state. The survey server's CityView remains the authoritative city state. */
export class CityChangeManager {
  private readonly motions = new Map<SiteId, Map<SiteLayerId, LayerMotion>>();
  private readonly variants = Object.fromEntries(SITE_IDS.map(id => [id, 'baseline'])) as Record<SiteId, SiteVariantId>;
  private readonly sites: BuiltSiteMap;
  private lastUpdateNow = 0;
  private exhibitionInitialized = false;

  constructor(sites: BuiltSiteMap) {
    this.sites = sites;
    for (const siteId of SITE_IDS) {
      const built = sites[siteId];
      if (!built || built.id !== siteId) throw new Error(`Missing runtime for change site ${siteId}.`);
      const siteMotions = new Map<SiteLayerId, LayerMotion>();
      const definitions = Object.values(CHANGE_CATALOG[siteId].layers)
        .filter((definition): definition is SiteLayerDefinition => definition !== undefined);
      for (const definition of definitions) {
        const layer = built.layers[definition.id];
        if (!layer) throw new Error(`Missing layer ${definition.id} for change site ${siteId}.`);
        if (layer.definition.kind !== definition.kind || layer.definition.assetId !== definition.assetId) {
          throw new Error(`Runtime layer ${siteId}/${definition.id} does not match the change catalog.`);
        }
        siteMotions.set(definition.id, {
          layer, group: layer.group, from: 0, to: 0, start: -Infinity, fresh: -Infinity, retryAt: Infinity,
        });
      }
      this.motions.set(siteId, siteMotions);
    }
  }

  /** Full snapshots and resets converge over the normal 3-second motion but never count as a fresh guest change. */
  restoreFromSnapshot(view: SurveyView, now: number): void {
    this.restoreLegacyMode(now);
    this.transitionChangedSitesOnly(view, now, false);
  }

  /** A live answer animates only changed layers and pulses sites that gain a visible layer. */
  applyIncrementalUpdate(view: SurveyView, now: number): void {
    this.restoreLegacyMode(now);
    this.transitionChangedSitesOnly(view, now, true);
  }

  /** V2 bands and parameters are authoritative for all four sites. */
  applyExhibitionLayout(layout: ExhibitionLayout, kind: SurveyEventKind, now: number): void {
    const automationHub = this.sites.magnetEast.automationHub;
    const commonsPlaza = this.sites.dogenzakaSouth.commonsPlaza;
    const concentrationTower = this.sites.centerGaiRear.concentrationTower;
    const park = this.sites.stationEastPark.environmentPark;
    if (!automationHub || !commonsPlaza || !concentrationTower || !park) {
      throw new Error('Missing exhibition runtime for one or more change sites.');
    }
    this.update(now);
    if (!this.exhibitionInitialized) this.restoreExhibitionBaseline(now);
    const fresh = kind === 'city-state-updated' && !prefersReducedMotion();
    const immediate = !fresh;
    this.transitionToVariants(selectExhibitionSiteVariants(layout), now, fresh, immediate);
    const changed = [
      ['magnetEast', automationHub.setTarget({ band: layout.bands.nw, automatedPorts: layout.automatedPorts }, now, immediate)],
      ['dogenzakaSouth', commonsPlaza.setTarget({ band: layout.bands.sw, sharedSeats: layout.sharedSeats }, now, immediate)],
      ['centerGaiRear', concentrationTower.setTarget({ band: layout.bands.se, functionModules: layout.functionModules }, now, immediate)],
      ['stationEastPark', park.setTarget(environmentParkTarget(layout), now, immediate)],
    ] as const;
    for (const [siteId, siteChanged] of changed) if (siteChanged && fresh) this.markFresh(siteId, now);
  }

  getVariant(siteId: SiteId): SiteVariantId {
    return this.variants[siteId];
  }

  getDiagnostics(): CityChangeDiagnostics {
    return Object.fromEntries(SITE_IDS.map(siteId => [siteId, {
      variant: this.variants[siteId],
      layers: Object.fromEntries([...this.motions.get(siteId)!].map(([layerId, motion]) => [layerId, {
        kind: motion.layer.definition.kind,
        assetId: motion.layer.definition.assetId,
        assetStatus: motion.layer.assetStatus,
        assetError: motion.layer.assetError,
      }])),
      ...(this.sites[siteId].environmentPark ? { environmentPark: this.sites[siteId].environmentPark.getDiagnostics() } : {}),
      ...(this.sites[siteId].automationHub ? { automationHub: this.sites[siteId].automationHub.getDiagnostics() } : {}),
      ...(this.sites[siteId].commonsPlaza ? { commonsPlaza: this.sites[siteId].commonsPlaza.getDiagnostics() } : {}),
      ...(this.sites[siteId].concentrationTower ? { concentrationTower: this.sites[siteId].concentrationTower.getDiagnostics() } : {}),
    }])) as CityChangeDiagnostics;
  }

  update(now: number): void {
    this.lastUpdateNow = now;
    this.sites.stationEastPark.environmentPark?.update(now);
    this.sites.magnetEast.automationHub?.update(now);
    this.sites.dogenzakaSouth.commonsPlaza?.update(now);
    this.sites.centerGaiRear.concentrationTower?.update(now);
    for (const siteId of SITE_IDS) {
      const motions = this.motions.get(siteId)!;
      for (const motion of motions.values()) {
        if (motion.to === 1 && motion.layer.assetStatus === 'fallback' && now >= motion.retryAt) {
          this.prepareAsset(motion, now);
        }
        const raw = Math.min(1, Math.max(0, (now - motion.start) / SITE_TRANSITION_SECONDS));
        const value = motion.from + (motion.to - motion.from) * smoothstep(raw);
        motion.group.scale.y = Math.max(HIDDEN_SCALE, value);
        motion.group.visible = value > HIDDEN_SCALE;
      }
      const shown = Math.max(0, ...[...motions.values()].map(motion => motion.group.visible ? motion.group.scale.y : 0));
      const rose = Math.max(-Infinity, ...[...motions.values()].map(motion => motion.to ? motion.fresh : -Infinity));
      const { mesh, material } = this.sites[siteId].marker;
      mesh.visible = shown > HIDDEN_SCALE;
      material.opacity = Math.min(1, shown * 3);
      const age = now - rose;
      material.emissiveIntensity = .2 + (age < FRESH_MARKER_SECONDS
        ? (1 - age / FRESH_MARKER_SECONDS) * (1 - Math.cos(age * Math.PI * 2 / 1.25)) * .9
        : 0);
    }
  }

  private transitionChangedSitesOnly(view: SurveyView, now: number, fresh: boolean): void {
    this.update(now);
    this.transitionToVariants(selectSiteVariants(view.layout), now, fresh, false);
  }

  private transitionToVariants(desired: Record<SiteId, SiteVariantId>, now: number, fresh: boolean, immediate: boolean): void {
    for (const siteId of SITE_IDS) {
      const activeLayers = new Set(variantLayers(siteId, desired[siteId]));
      for (const [layerId, motion] of this.motions.get(siteId)!) {
        const to = activeLayers.has(layerId) ? 1 : 0;
        if (immediate) {
          if (to === 1 && motion.to !== 1) this.prepareAsset(motion, now);
          motion.from = motion.to = to;
          motion.start = now;
          motion.fresh = -Infinity;
          motion.retryAt = to ? motion.retryAt : Infinity;
          motion.group.scale.y = to ? 1 : HIDDEN_SCALE;
          motion.group.visible = to === 1;
          this.sites[siteId].marker.material.emissiveIntensity = .2;
          continue;
        }
        if (motion.to === to) continue;
        if (to === 1) this.prepareAsset(motion, now);
        motion.from = motion.group.visible ? motion.group.scale.y : 0;
        motion.to = to;
        motion.start = now;
        motion.fresh = fresh && to === 1 ? now : -Infinity;
      }
      this.variants[siteId] = desired[siteId];
    }
  }

  private markFresh(siteId: SiteId, now: number): void {
    for (const motion of this.motions.get(siteId)!.values()) if (motion.to === 1) motion.fresh = now;
  }

  private restoreExhibitionBaseline(now: number): void {
    for (const siteId of SITE_IDS) {
      const activeLayers = new Set(variantLayers(siteId, EXHIBITION_BASE_VARIANTS[siteId]));
      for (const [layerId, motion] of this.motions.get(siteId)!) {
        const active = activeLayers.has(layerId);
        motion.from = motion.to = active ? 1 : 0;
        motion.start = now;
        motion.fresh = -Infinity;
        motion.retryAt = Infinity;
        motion.group.scale.y = active ? 1 : HIDDEN_SCALE;
        motion.group.visible = active;
        if (active) this.prepareAsset(motion, now);
      }
      this.variants[siteId] = EXHIBITION_BASE_VARIANTS[siteId];
    }
    this.exhibitionInitialized = true;
  }

  private restoreLegacyMode(now: number): void {
    if (!this.exhibitionInitialized) return;
    this.sites.stationEastPark.environmentPark?.restoreLegacy();
    this.sites.magnetEast.automationHub?.restoreLegacy();
    this.sites.dogenzakaSouth.commonsPlaza?.restoreLegacy();
    this.sites.centerGaiRear.concentrationTower?.restoreLegacy();
    for (const siteId of SITE_IDS) for (const motion of this.motions.get(siteId)!.values()) motion.fresh = -Infinity;
    this.exhibitionInitialized = false;
  }

  private prepareAsset(motion: LayerMotion, now: number): void {
    if (!motion.layer.definition.assetId || motion.layer.assetStatus === 'ready' || motion.layer.assetStatus === 'loading') return;
    motion.retryAt = Infinity;
    void motion.layer.prepare().then(() => {
      if (motion.layer.assetStatus === 'fallback') {
        motion.retryAt = Math.max(now, this.lastUpdateNow) + SITE_ASSET_RETRY_SECONDS;
      }
    });
  }
}
