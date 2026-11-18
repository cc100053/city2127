import * as T from 'three';
import { addCityModel } from './modelAssets.ts';
import { BAY_FLOWER } from './layout.ts';

const GLB_URL = new URL('../asset/models/bay-flower-receiver/bay-flower-receiver.glb', import.meta.url).href;
/** The GLB's design waterline (local y 0) on the bay surface. */
export const BAY_FLOWER_Y = -.8;
/** Shore-station centre in GLB local metres (build_flower.py SHORE); the platform runs f −7.5…12 seaward and s −10…14 along the shore
 *  from it (PLAT_F with its 1.5 m apron, PLAT_S). */
const SHORE = [-95, 56] as const, PLAT_F = [-7.5, 12] as const, PLAT_S = [-10, 14] as const;
/** GLB nodes that the vacant state puts away; the shore station stays. */
export const BAY_FLOWER_SHOWN = ['Q02B_Receiver', 'Q02B_SubseaLink', 'Q02B_LightBeam'] as const;

/** GLB local (x, z) to world (x, z) under the placement (three.js rotation.y). */
export function bayFlowerWorld(x: number, z: number): [number, number] {
  const c = Math.cos(BAY_FLOWER.yaw), s = Math.sin(BAY_FLOWER.yaw);
  return [BAY_FLOWER.x + x * c + z * s, BAY_FLOWER.z - x * s + z * c];
}
/** World plan rectangle of the shore platform (the yaw turns its f axis to −x and s to −z). */
export function bayFlowerPlatform() {
  const corners = [PLAT_F[0], PLAT_F[1]].flatMap(f => [PLAT_S[0], PLAT_S[1]].map(s => {
    const n = Math.hypot(...SHORE), fx = -SHORE[0] / n, fz = -SHORE[1] / n; // f: from the shore station toward the flower
    return bayFlowerWorld(SHORE[0] + fx * f - fz * s, SHORE[1] + fz * f + fx * s);
  }));
  const xs = corners.map(c => c[0]), zs = corners.map(c => c[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

/** The park's sea-wall coping (COAST_REVETMENT, y 0.12) would stand 0.3 m proud of the platform paving: drop its fragments inside the
 *  platform's plan, 0.1 m in from its edges, where the platform body hides the opening. The material is shared (service areas,
 *  planters), so the cut also tests height. */
export function cutUnderPlatform(material: T.Material) {
  const p = bayFlowerPlatform(), compile = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey.bind(material);
  const v = (n: number) => n.toFixed(2);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 flowerCut;').replace('#include <project_vertex>', '#include <project_vertex>\nflowerCut=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 flowerCut;').replace('#include <clipping_planes_fragment>',
      `if(flowerCut.y<.5&&flowerCut.x>${v(p.minX + .1)}&&flowerCut.x<${v(p.maxX - .1)}&&flowerCut.z>${v(p.minZ + .1)}&&flowerCut.z<${v(p.maxZ - .1)})discard;\n#include <clipping_planes_fragment>`);
  };
  material.customProgramCacheKey = () => key() + '|bay-flower-cut';
}

/** Owner 2026-11-18 (R1 verdict): the version4 run shows only the vacant state; the flower appears only under DEV `?bayFlower=1`
 *  until the rotation branch's lot runtime shows it in rotation runs. */
export function bayFlowerShown(search: string, dev: boolean) {
  return dev && new URLSearchParams(search).get('bayFlower') === '1';
}

/** Q02-B bay flower off the south park's west shore: the shore station on the promenade in every run; the flower, duct and beam only
 *  when `bayFlowerShown`. ponytail: the whole GLB (94k tris) still loads just to show the station, so the rotation runtime can show
 *  the flower without a second load. */
export function bayFlower() {
  const root = new T.Group(); root.name = 'q02b-bay-flower';
  root.position.set(BAY_FLOWER.x, BAY_FLOWER_Y, BAY_FLOWER.z); root.rotation.y = BAY_FLOWER.yaw;
  if (typeof window === 'undefined') return root;
  const vacant = !bayFlowerShown(location.search, import.meta.env.DEV);
  addCityModel(root, GLB_URL, [0, 0, 0]).then(model => {
    model.name = 'q02b-bay-flower-glb';
    const beam = model.getObjectByName('Q02B_LightBeam');
    beam?.traverse(object => { object.castShadow = object.receiveShadow = false; }); // a 900 m beam would draw a shadow line across the park
    if (vacant) for (const name of BAY_FLOWER_SHOWN) { const node = model.getObjectByName(name); if (node) node.visible = false; }
  }).catch(error => console.error('Could not load the Q02-B bay flower', error));
  return root;
}
