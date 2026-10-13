import assert from 'node:assert/strict';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import { changeSites } from '../src/layout.ts';
import { SITE_TRANSITION_SECONDS } from '../src/siteBuilders/siteRuntime.ts';
import { ARRIVAL_SECONDS, lanternSpot } from '../src/voteJourney.ts';

// The journey plus the city transition finishes inside one 10 s reading slot, leaving the slot's end for reading.
assert.ok(ARRIVAL_SECONDS + SITE_TRANSITION_SECONDS <= DISPLAY_MS / 1000 - 4, `journey ${ARRIVAL_SECONDS}s + transition must leave 4 s of the slot`);

// Lanterns are deterministic and float above their own focal site, clear of trees and podiums.
const sites = { automation: changeSites.nw, publicSharing: changeSites.sw, environmentalPriority: changeSites.ne, urbanConcentration: changeSites.se };
for (const [axis, site] of Object.entries(sites) as [keyof typeof sites, typeof changeSites.nw][]) for (let ordinal = 1; ordinal <= 80; ordinal++) {
  const p = lanternSpot(ordinal, axis);
  assert.deepEqual(p, lanternSpot(ordinal, axis));
  assert.ok(Math.hypot(p.x - site.x, p.z - site.z) <= Math.max(site.w, site.d) * site.scale * 1.1 + 1e-9, `${axis} #${ordinal} stays over its site`);
  assert.ok(p.y >= 42 && p.y <= 64);
}
assert.notDeepEqual(lanternSpot(1, 'automation'), lanternSpot(2, 'automation'));
console.log('voteJourney tests passed');
