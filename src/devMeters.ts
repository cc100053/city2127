// DEV-only review helper for `?meters=`: reuses the server's authoritative layout mapping so captures match a real run.
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
