import * as T from 'three';
import { addCityModel } from './modelAssets';
import { placeOdaibaModel } from './odaibaPlacement';
import layout from './odaiba-layout.json';
import { civicCore } from './civicCore';
import trees from '../asset/models/odaiba-masterplan/tree_instances.json';
import { plantCanopy, plantLandscapeCanopy, plantRoofCanopy } from './coastalCanopy';
import { contextFacades } from './contextFacades';
import { bake } from './cityRig';
import { DISTRICT, inDistrict } from './layout';

// Literal paths bundle the district-cropped environment (scripts/crop-odaiba-district.py) and six retained landmarks; Fuji is now the procedural civic chassis, Telecom Center lies outside the district.
const environmentUrl = new URL('../asset/models/odaiba-masterplan/odaiba_district_v01_environment.glb', import.meta.url).href;
const buildingUrls: Record<string, string> = {
  'aqua-city-odaiba': new URL('../asset/models/aqua-city-odaiba/aqua-city-odaiba.glb', import.meta.url).href,
  'decks-tokyo-beach': new URL('../asset/models/decks-tokyo-beach/decks-tokyo-beach.glb', import.meta.url).href,
  'divercity-tokyo-plaza': new URL('../asset/models/divercity-tokyo-plaza/divercity-tokyo-plaza.glb', import.meta.url).href,
  'divercity-office-tower': new URL('../asset/models/divercity-office-tower/divercity-office-tower.glb', import.meta.url).href,
  'hilton-tokyo-odaiba': new URL('../asset/models/hilton-tokyo-odaiba/hilton-tokyo-odaiba.glb', import.meta.url).href,
  'grand-nikko-tokyo-daiba': new URL('../asset/models/grand-nikko-tokyo-daiba/grand-nikko-tokyo-daiba.glb', import.meta.url).href,
};

// Masterplan blockout materials retuned to the project palette (ART.md): pale stone ground, soft green, context pushed back into the haze.
const environmentFinish: Record<string, [color: string, roughness: number, metalness: number]> = {
  road: ['#7d8a90', .88, 0], sidewalk: ['#dfe2dd', .78, 0], plaza: ['#ebe8e0', .66, 0], service_area: ['#d3d5ce', .8, 0],
  landscape: ['#839768', .9, 0], water: ['#5a93a8', .62, 0], rail_structure: ['#e6ebea', .42, .35], station: ['#a7c3cf', .12, .55],
  context_unknown: ['#d2d9dc', .9, 0], context_office_commercial: ['#c9d3da', .85, 0], context_utility_service: ['#cfd3d0', .9, 0], context_public_cultural: ['#d0d8cf', .9, 0],
};

// 2127 retrofit by material: mall roofs become planted, hotel roofs photovoltaic; no extra geometry.
const roofRetrofit: Record<string, [color: string, roughness: number, metalness: number]> = {
  'Roof and Shadow': ['#7d9f68', .85, 0], 'Standing seam roof.001': ['#486b83', .3, .85], 'Gray roof metal': ['#486b83', .3, .85],
};
// Across the apron, ground, roads and guideway dissolve (hashed alpha, still opaque-sorted) into the sea, hiding the cut edge.
function fadeBeyondDistrict(material: T.Material) {
  const compile = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey.bind(material);
  material.alphaHash = true;
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 districtXz;').replace('#include <project_vertex>', '#include <project_vertex>\ndistrictXz=(modelMatrix*vec4(transformed,1.)).xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 districtXz;').replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
      vec2 beyond=max(vec2(${DISTRICT.minX.toFixed(1)},${DISTRICT.minZ.toFixed(1)})-districtXz,districtXz-vec2(${DISTRICT.maxX.toFixed(1)},${DISTRICT.maxZ.toFixed(1)}));
      diffuseColor.a*=1.-smoothstep(0.,${(DISTRICT.apron*.9).toFixed(1)},length(max(beyond,0.)));`);
  };
  material.customProgramCacheKey = () => key() + '|district-fade';
}

const glazing = new Set<T.MeshStandardMaterial>(), warm = new T.Color('#ffd49a');
/** Night: retained landmark glazing glows warm; the civic chassis uses the shared city finishes. */
export function updateOdaiba(night: number) {
  for (const material of glazing) material.emissiveIntensity = night * .55;
}

/** District-cropped Phase 03D environment, six surveyed landmarks and the replacement Fuji civic core, in metres. */
export async function loadOdaiba(scene: T.Scene, water?: T.Material) {
  const grass=new T.TextureLoader().load(new URL('../asset/textures/coastal-grass.png',import.meta.url).href);
  grass.colorSpace=T.SRGBColorSpace;grass.wrapS=grass.wrapT=T.RepeatWrapping;grass.anisotropy=8;
  const environment = await addCityModel(scene, environmentUrl, [0, 0, 0]);
  environment.name = 'odaiba-environment';
  const faded = new Set<T.Material>();
  environment.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const material = object.material as T.MeshStandardMaterial, finish = environmentFinish[material.name];
    if (finish) { material.color.set(finish[0]); material.roughness = finish[1]; material.metalness = finish[2]; }
    if(material.name==='landscape'){
      material.map=grass;material.color.set('#cbd8b5');
      // World metres keep the authored terrain patches at one consistent texture scale.
      material.onBeforeCompile=shader=>{
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 grassUv;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ngrassUv=(modelMatrix*vec4(transformed,1.)).xz/32.;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 grassUv;').replace('#include <map_fragment>','diffuseColor.rgb *= mix(texture2D(map,grassUv).rgb,texture2D(map,grassUv*.19).rgb,.35);');
      };
      material.customProgramCacheKey=()=>'coastal-grass-world';
    }
    // The sea lies under the whole plate; grazing shadows on it only produce acne.
    if (material.name === 'water') { object.castShadow = object.receiveShadow = false; if(water) object.material=water; }
  });
  // After finishes: shared materials are re-tuned once per mesh above, which would drop an earlier fade wrap.
  environment.traverse(object => { if (object instanceof T.Mesh && object.material !== water) faded.add(object.material); });
  faded.forEach(fadeBeyondDistrict);
  scene.add(contextFacades(environment));
  plantCanopy(scene,trees);
  await Promise.all(layout.buildings.filter(placement => inDistrict(placement.positionBlender[0], -placement.positionBlender[1])).map(async placement => {
    if(placement.id==='fuji-tv'){scene.add(civicCore());return;}
    const model = await addCityModel(scene, buildingUrls[placement.id], [0, 0, 0]);
    model.name = placement.id;
    placeOdaibaModel(model, placement);
    if(placement.id==='aqua-city-odaiba' || placement.id==='decks-tokyo-beach')plantRoofCanopy(scene,model);
    model.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      for (const material of [object.material].flat() as T.MeshStandardMaterial[])
        if (/glass|glazing|window/i.test(material.name) && !glazing.has(material)) { material.emissive.copy(warm); material.emissiveIntensity = 0; material.roughness=.22;material.metalness=.38;glazing.add(material); }
        else if (roofRetrofit[material.name]) { const [color, roughness, metalness] = roofRetrofit[material.name]; material.color.set(color); material.roughness = roughness; material.metalness = metalness; }
    });
    // One draw per finish instead of one per surveyed part (30–50 per landmark); materials stay shared, so night glazing still applies.
    const parts: T.BufferGeometry[] = []; model.traverse(object => { if (object instanceof T.Mesh) parts.push(object.geometry); });
    const merged = bake(model); model.clear(); parts.forEach(geometry => geometry.dispose());
    merged.forEach(mesh => { mesh.name = placement.id; model.add(mesh); });
  }));
  plantLandscapeCanopy(scene,environment,scene.children.filter(object=>object.name==='fuji-civic-chassis' || Object.hasOwn(buildingUrls,object.name)));
}
