import type * as T from 'three';
import { CHANGE_CATALOG, SITE_IDS, selectSiteVariants, variantLayers, type SiteId, type SiteLayerId, type SiteVariantId } from './changeCatalog.ts';
import type { BuiltSiteMap } from './siteBuilders/index.ts';
import type { SurveyView } from './surveyView.ts';

export const SITE_TRANSITION_SECONDS = 3;
export const FRESH_MARKER_SECONDS = 10;
const HIDDEN_SCALE = 1e-3;

type LayerMotion = {
  readonly group: T.Group;
  from: number;
  to: number;
  start: number;
  fresh: number;
};

const smoothstep = (value: number) => value * value * (3 - 2 * value);

/** Runtime-only renderer state. The survey server's CityView remains the authoritative city state. */
export class CityChangeManager {
  private readonly motions = new Map<SiteId, Map<SiteLayerId, LayerMotion>>();
  private readonly variants = Object.fromEntries(SITE_IDS.map(id => [id, 'baseline'])) as Record<SiteId, SiteVariantId>;
  private readonly sites: BuiltSiteMap;

  constructor(sites: BuiltSiteMap) {
    this.sites = sites;
    for (const siteId of SITE_IDS) {
      const built = sites[siteId];
      if (!built || built.id !== siteId) throw new Error(`Missing runtime for change site ${siteId}.`);
      const layerIds = new Set(Object.values(CHANGE_CATALOG[siteId].variants).flatMap(definition => definition?.layers ?? []));
      const siteMotions = new Map<SiteLayerId, LayerMotion>();
      for (const layerId of layerIds) {
        const group = built.layers[layerId];
        if (!group) throw new Error(`Missing layer ${layerId} for change site ${siteId}.`);
        siteMotions.set(layerId, { group, from: 0, to: 0, start: -Infinity, fresh: -Infinity });
      }
      this.motions.set(siteId, siteMotions);
    }
  }

  /** Full snapshots and resets converge over the normal 3-second motion but never count as a fresh guest change. */
  restoreFromSnapshot(view: SurveyView, now: number): void {
    this.transitionChangedSitesOnly(view, now, false);
  }

  /** A live answer animates only changed layers and pulses sites that gain a visible layer. */
  applyIncrementalUpdate(view: SurveyView, now: number): void {
    this.transitionChangedSitesOnly(view, now, true);
  }

  getVariant(siteId: SiteId): SiteVariantId {
    return this.variants[siteId];
  }

  update(now: number): void {
    for (const siteId of SITE_IDS) {
      const motions = this.motions.get(siteId)!;
      for (const motion of motions.values()) {
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
    const desired = selectSiteVariants(view.layout);
    for (const siteId of SITE_IDS) {
      if (desired[siteId] === this.variants[siteId]) continue;
      const activeLayers = new Set(variantLayers(siteId, desired[siteId]));
      for (const [layerId, motion] of this.motions.get(siteId)!) {
        const to = activeLayers.has(layerId) ? 1 : 0;
        if (motion.to === to) continue;
        motion.from = motion.group.visible ? motion.group.scale.y : 0;
        motion.to = to;
        motion.start = now;
        motion.fresh = fresh && to === 1 ? now : -Infinity;
      }
      this.variants[siteId] = desired[siteId];
    }
  }
}
