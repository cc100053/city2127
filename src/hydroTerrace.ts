import * as T from 'three';
import { addCityModel } from './modelAssets.ts';
import { bake, box, chrome, publicLight, stone, trim } from './cityRig.ts';
import { HYDRO_TERRACE } from './layout.ts';

const GLB_URL = new URL('../asset/models/q02a-hydro-terrace/q02a-hydro-terrace.glb', import.meta.url).href;
/** The GLB's ground plane (its plaza top, local y 0) stands 2 m above the bay surface (−0.8 m). */
export const HYDRO_DECK = 1.2;
/** Plaza footprint in GLB local metres (x toward the sea side, z toward the front); its own sea strip beyond x 20 is dropped. */
export const HYDRO_PLAZA = { minX: -32, maxX: 20, minZ: -32, maxZ: 32 } as const;
/** Public walk from the island's north edge to the north revetment (world x, y, z), through the gap between the tidal edge's islet and
 *  pavilion off (−330, −118) / (−331, −91) and the lane beacon at (−383, −96): about 10 m clear of each, and of water court 1 and its spur. */
export const HYDRO_WALK = { from: [-380, HYDRO_DECK, -139], to: [-344.4, .45, -74.2], width: 4 } as const;

/** Q02-A hydro terrace as fixed background: the supplied GLB on a stone island in the west-shore bay, joined to the shore by a railed walk. */
export function hydroTerrace() {
  const root = new T.Group(); root.name = 'q02a-hydro-terrace';
  const site = new T.Group(); site.name = 'q02a-site';
  site.position.set(HYDRO_TERRACE.x, HYDRO_DECK, HYDRO_TERRACE.z); site.rotation.y = HYDRO_TERRACE.yaw; root.add(site);
  // Revetment under the GLB's 1 m plaza slab: stone to below the waterline, a pale coping where it meets the slab.
  const w = HYDRO_PLAZA.maxX - HYDRO_PLAZA.minX, d = HYDRO_PLAZA.maxZ - HYDRO_PLAZA.minZ, cx = (HYDRO_PLAZA.maxX + HYDRO_PLAZA.minX) / 2;
  const skirt = new T.Group(); site.add(skirt);
  box(skirt, [w + .6, 1.7, d + .6], [cx, -1.85, 0], stone, .3);
  box(skirt, [w + 1, .22, d + 1], [cx, -1.06, 0], trim);

  const [ax, ay, az] = HYDRO_WALK.from, [bx, by, bz] = HYDRO_WALK.to;
  const start = new T.Vector3(ax, ay, az), end = new T.Vector3(bx, by, bz), length = start.distanceTo(end), half = HYDRO_WALK.width / 2;
  const walk = new T.Group(); walk.name = 'q02a-walk'; walk.position.copy(start).add(end).multiplyScalar(.5); walk.lookAt(end); walk.updateMatrix(); root.add(walk);
  box(walk, [HYDRO_WALK.width, .5, length], [0, -.25, 0], stone);
  for (const x of [-half, half]) {
    box(walk, [.16, .08, length], [x, .02, 0], trim);
    for (const y of [.45, .85, 1.1]) box(walk, [.07, .07, length], [x, y, 0], chrome);
    for (let z = -length / 2 + 1.4; z < length / 2; z += 2.8) box(walk, [.08, 1.1, .08], [x, .55, z], chrome);
    for (let z = -length / 2 + 6; z < length / 2 - 2; z += 9) box(walk, [.12, .1, 1.1], [x * .96, 1.16, z], publicLight);
  }
  // Paired piers carry the walk over the bay; each foot stands in the water below the deck.
  for (let z = -length / 2 + 10; z < length / 2 - 6; z += 12) for (const x of [-half + .4, half - .4]) {
    const top = new T.Vector3(x, -.5, z).applyMatrix4(walk.matrix);
    box(walk, [.5, top.y + 2.5, .5], [x, -.5 - (top.y + 2.5) / 2, z], trim);
  }
  root.updateMatrixWorld(true);
  const fixed = bake(root); root.add(...fixed);

  if (typeof window !== 'undefined') addCityModel(site, GLB_URL, [0, 0, 0]).then(model => {
    model.name = 'q02a-hydro-terrace-glb';
    model.getObjectByName('q02a_sea')?.removeFromParent();
  }).catch(error => console.error('Could not load the Q02-A hydro terrace', error));
  return root;
}
