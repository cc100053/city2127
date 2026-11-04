// DEV-only review helper for `?meters=`: values are Scale A display scores fed to the server site mapping (deriveExhibitionLayout), so captures match a real run.
import { deriveExhibitionLayout } from '../survey/src/shared/cityView.ts';
import type { ExhibitionLayout } from './surveyView.ts';

const AXIS_BY_SITE = { nw: 'automation', ne: 'environmentalPriority', sw: 'publicSharing', se: 'urbanConcentration' } as const;
const BAND_SCORE: Record<string, number> = { low: -7.5, mixed: 0, high: 7.5 };

/** `nw:high,ne:-4` → layout; bands map to the ±7.5 all-low/all-high composite scores. Unknown entries throw. */
export function devLayout(meters: string): ExhibitionLayout {
  const scores = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
  for (const entry of meters.split(',').filter(Boolean)) {
    const [site, value] = entry.split(':');
    const axis = AXIS_BY_SITE[site as keyof typeof AXIS_BY_SITE];
    const score = Object.hasOwn(BAND_SCORE, value ?? '') ? BAND_SCORE[value] : Number(value ?? NaN);
    if (!axis || !Number.isFinite(score)) throw new Error(`?meters: cannot read "${entry}"`);
    scores[axis] = score;
  }
  return deriveExhibitionLayout(scores);
}

const RUNG_SCORE = [-8, -5, -2, 0, 2, 5, 8];
/** A simulated guest choice: move `site` one rung (clamped to ±3), keep the others, as a `cityMeters` string. */
export function stepMeters(tiers: ExhibitionLayout['tiers'], site: keyof typeof AXIS_BY_SITE, direction: 1 | -1): string {
  const next = { ...tiers, [site]: Math.max(-3, Math.min(3, tiers[site] + direction)) };
  return Object.entries(next).map(([id, tier]) => `${id}:${RUNG_SCORE[tier + 3]}`).join(',');
}
