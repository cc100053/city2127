import assert from './assert.ts';
import { BAY_FLOWER, DISTRICT, HYDRO_TERRACE } from '../src/layout.ts';
import { SHOWCASE, showcaseKeys } from '../src/devShowcase.ts';
import { PerspectiveCamera, Vector3 } from 'three';
import { boatPoses, HULL, routes, WATER_PERIOD } from '../src/mobility.ts';

// DEV ?showcase (src/devShowcase.ts): the Q10-A and Q11-C drafts stand on open bay water, clear of the hero district, the Q02 sea lots,
// each other and every boat. Plan radii from the GLB checks (asset/models/*/check*.json): both round islands, Q10-A r 76 m, Q11-C r 131 m.
const RADIUS = { q10a: 76, q11c: 131 } as const;
const sites = Object.entries(SHOWCASE).map(([id, s]) => ({ id, x: s.x, z: s.z, r: RADIUS[id as keyof typeof RADIUS] }));
for (const s of sites) {
  assert.ok(s.x + s.r < DISTRICT.minX, `${s.id} stays west of the hero district`);
  assert.ok(Math.hypot(s.x - HYDRO_TERRACE.x, s.z - HYDRO_TERRACE.z) > s.r + HYDRO_TERRACE.lot * Math.SQRT1_2 + 20, `${s.id} clear of the hydro terrace`);
  assert.ok(Math.hypot(s.x - BAY_FLOWER.x, s.z - BAY_FLOWER.z) > s.r + BAY_FLOWER.r + 20, `${s.id} clear of the bay flower`);
}
assert.ok(Math.hypot(sites[0].x - sites[1].x, sites[0].z - sites[1].z) > sites[0].r + sites[1].r + 20, 'the two drafts stand apart');

// Boats: every hull, every quarter second of the water period, keeps 15 m of water from each draft's plan circle.
const path = routes(), hull = Math.hypot(HULL.x, HULL.stern);
for (let t = 0; t < WATER_PERIOD; t += .25) for (const boat of boatPoses(t, path)) {
  if (boat.scale < .05) continue;
  for (const s of sites) {
    const d = Math.hypot(boat.x - s.x, boat.z - s.z) - s.r - hull * boat.scale;
    assert.ok(d > 15, `boat at ${t}s comes within ${d.toFixed(0)} m of ${s.id}`);
  }
}
// Fly keys (also the ?rotation モデルシーン · DEV camera): W moves camera and orbit target together along the level view and reports
// the step; Cmd+W (close tab) and a released key leave the camera alone, so the rotation panel keeps its pinned close-up.
{
  const events = new EventTarget(), g = globalThis as unknown as Record<string, unknown>;
  g.addEventListener = events.addEventListener.bind(events); g.HTMLInputElement = class {}; g.HTMLTextAreaElement = class {};
  const key = (type: string, code: string, extra: Record<string, boolean> = {}) => {
    const e = Object.assign(new Event(type, { cancelable: true }), { code, metaKey: false, ctrlKey: false, altKey: false, ...extra });
    events.dispatchEvent(e); return e;
  };
  const camera = new PerspectiveCamera(), target = new Vector3(0, 0, -100);
  camera.position.set(0, 50, 0); camera.lookAt(target); camera.updateMatrixWorld();
  const fly = showcaseKeys(camera, target);
  assert.equal(fly(), false, 'no key, no step');
  key('keydown', 'KeyW', { metaKey: true }); assert.equal(fly(), false, 'Cmd+W passes through');
  const down = key('keydown', 'KeyW'); const z0 = camera.position.z;
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(fly() && camera.position.z < z0 && camera.position.y === 50 && Math.abs(target.z - camera.position.z + 100) < 1e-9, 'W flies level, target alongside');
  assert.ok(down.defaultPrevented, 'a fly key never reaches a focused panel button');
  key('keyup', 'KeyW'); assert.equal(fly(), false, 'released, the camera stays');
  delete g.addEventListener; delete g.HTMLInputElement; delete g.HTMLTextAreaElement;
}
console.log('devShowcase: drafts on open water, clear of lots and boats; fly keys step level and pass shortcuts through');
