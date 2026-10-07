import * as T from 'three';
import { addCityModel } from './modelAssets';
import { placeOdaibaModel } from './odaibaPlacement';
import layout from './odaiba-layout.json';
import { civicCore } from './civicCore';
import { publishOccupants, publishRoofWalks } from './occupants';
import trees from '../asset/models/odaiba-masterplan/tree_instances.json';
import { facadeClimate, publishRoofGardens, towerGlow } from './districtMeters';
import { CORRIDOR_GLSL, plantBackdropGrove, plantCanopy, plantLandscapeCanopy, plantRoofCanopy } from './coastalCanopy';
import { contextFacades } from './contextFacades';
import { bake } from './cityRig';
import { changeSites, DISTRICT, inDistrict, SEAWARD_GLSL } from './layout';
import { bayContext, recedeBeyondDistrict } from './bayContext';
import { publishDoorways, publishEntrances, roadFill } from './mobility';

// Literal paths bundle the district-detailed environment (scripts/crop-odaiba-district.py) and six retained landmarks; Fuji is now the procedural civic chassis, Telecom Center lies outside the district.
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
  road: ['#7d8a90', .88, 0], sidewalk: ['#ddd8cc', .78, 0], plaza: ['#e6dfd1', .66, 0], service_area: ['#d3d5ce', .8, 0],
  landscape: ['#839768', .9, 0], water: ['#5a93a8', .62, 0], rail_structure: ['#e6ebea', .42, .35], station: ['#a7c3cf', .12, .55],
  context_unknown: ['#e3dccf', .9, 0], context_office_commercial: ['#dfd8ca', .85, 0], context_utility_service: ['#d8d4c9', .9, 0], context_public_cultural: ['#e2dbcd', .9, 0],
};

// 2127 retrofit by material: mall roofs become planted, hotel roofs pale ceramic terraces (r5 pass 2: target v2 has no blue metal roofs), stark white cladding warm ceramic; no extra geometry.
const roofRetrofit: Record<string, [color: string, roughness: number, metalness: number]> = {
  'Roof and Shadow': ['#7f9b6d', .85, 0], 'Standing seam roof.001': ['#e6ddcc', .55, .05], 'Gray roof metal': ['#e6ddcc', .55, .05],
  'PCa_Panel_OffWhite': ['#e4d9c5', .62, 0],
  // r6 pass 2: DECKS' coral and ochre fins read as red stripes; target v2's mid-rises are ivory only.
  'Muted Coral Vertical Structure': ['#ebe2d2', .58, 0], 'Ochre Accent Structure': ['#ebe2d2', .58, 0], 'Facade_White': ['#e2d8c6', .6, 0],
  'Warm Ivory Structure': ['#e8dcc8', .6, 0], 'Pale balcony slab and crown': ['#e9dfcd', .6, 0], 'Light vertical piers.001': ['#ebe0cd', .6, 0],
};
// Aqua City and DECKS flat facade panels become storey-banded curtain walls: warm spandrels, dark panes with lit interiors per bay.
const curtainWalls: Record<string, string> = {
  // r4 pass 4: warm ivory spandrels (target v2's cream mid-rises), no brown or ochre bands; r9: paler ivory so frames read white, not sandstone.
  'Muted Pink Panels': '#e8e2d5',
  // r6 pass 2: the hotel walls and the Grand Nikko tower become the same banded curtain wall (target v2's glass hotels).
  'Warm ivory facade': '#ede8dd', 'Warm off white facade.001': '#ede8dd', 'Pale Mint Panels': '#ebe6db', 'Ochre Commercial Panels': '#e5dfd1', 'Blue Gray Cladding': '#e9e4d9', 'Dark Blue Gray Glazing': '#e2ddd1',
};
const curtainGlow = { value: .45 }, curtainNight = { value: 0 };
function curtainWall(material: T.MeshStandardMaterial, spandrel: string) {
  material.color.set(spandrel); material.roughness = .45; material.metalness = .1;
  material.onBeforeCompile = shader => {
    shader.uniforms.curtainGlow = curtainGlow; shader.uniforms.curtainNight = curtainNight;
    shader.uniforms.facadeGreen = facadeClimate.green; shader.uniforms.facadeLouvre = facadeClimate.louvre;
    // Along-facade coordinate from the world normal, so bays run on every face orientation; roofs (normal up) stay plain.
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 curtainP;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      { vec3 n = normalize(mat3(modelMatrix) * objectNormal); vec4 w = modelMatrix * vec4(transformed, 1.); curtainP = vec3(abs(n.x) > abs(n.z) ? w.z : w.x, w.y, abs(n.y)); }`);
    // r6 pass 2 (target v2): full-height glass storeys between thin pale slab bands. Only whole floor runs of occupied bays glow warm;
    // the rest is clear blue-grey glass, so facades read as glazing with lit rooms instead of a beige wash with dark dots.
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float curtainGlow, curtainNight, facadeGreen, facadeLouvre;\nvarying vec3 curtainP;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      float storey = fract(curtainP.y / 4.2), mullion = fract(curtainP.x / 1.8);
      float pane = step(.2, storey) * step(storey, .96) * step(mullion, .93) * (1. - step(.5, curtainP.z)) * step(1.2, curtainP.y);
      // r6 pass 3: soft occupancy (no on/off blocks) and warm champagne glass, matching contextFacades' panels, so towers read as one
      // even, golden glass grid (target v2) instead of a patchwork of dark blue and beige where the two facade systems meet.
      float occupied = .35 + .65 * fract(sin(dot(floor(vec2(curtainP.x / 5.4, curtainP.y / 4.2)), vec2(12.9898, 78.233))) * 43758.5453);
      // r9: cool blue-grey glass with whole lit floor runs on about one bay in three (matches contextFacades), not a warm champagne wash.
      occupied = .08 + .92 * step(.78, occupied);
      // r9 pass 3: lighter sky-grey glass so mid-rises read ivory and glazed (target v2), not dark-striped.
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.42, .45, .48), pane);
      // Environment Meter (districtMeters.ts): a share of bays becomes planted balconies (canopy cooling) or white solar louvres
      // (active cooling); one hash splits the two sets, so they never overlap and bays switch one by one as the share eases.
      vec2 bay = floor(vec2(curtainP.x / 5.4, curtainP.y / 4.2));
      float h = fract(sin(dot(bay, vec2(39.3468, 11.135))) * 24634.6345), wall = (1. - step(.5, curtainP.z)) * step(4.5, curtainP.y);
      float foliage = wall * step(h, facadeGreen) * step(storey, .64 + .12 * sin(curtainP.x * 2.3 + bay.y * 1.7));
      float louvre = wall * step(1. - facadeLouvre, h) * step(.45, fract(curtainP.x / .9)) * step(.08, storey);
      float leafNoise = fract(sin(dot(floor(curtainP.xy * 1.6), vec2(12.99, 78.23))) * 43758.5);
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(.05, .12, .03), vec3(.13, .24, .07), leafNoise), foliage);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .85, .8), louvre);
      pane *= (1. - foliage) * (1. - louvre);`)
      // Panes are glass: glossy and partly metallic so they pick up the sky instead of reading as flat dark dots.
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .14, pane);\nmetalnessFactor = mix(metalnessFactor, .4, pane);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1., .78, .5) * pane * (curtainGlow * occupied + curtainNight * .3);');
  };
  material.customProgramCacheKey = () => 'curtain-wall';
}
const glazing = new Set<T.MeshStandardMaterial>(), warm = new T.Color('#ffd49a'), dayGlow = .42; // r5 pass 2: warmer lit bands by day (target v2's golden hotel glazing)
/** Retained landmark glazing glows warm, strongest at night; the civic chassis uses the shared city finishes. */
export function updateOdaiba(night: number) {
  // A faint daytime glow keeps the dark glazing reading as occupied, warm interiors (CITY_MASTER_TASTE) instead of voids.
  for (const material of glazing) material.emissiveIntensity = dayGlow + night * (.55 - dayGlow);
  curtainGlow.value = .45 + night * .8; curtainNight.value = night; towerGlow.value = .3 + night * .9;
}

// Ground finishes lie within centimetres of each other (building pads over the lawn terrain, plazas and service yards beside them), finer
// than the depth precision at hero range, so they z-fight. A depth offset per finish fixes the stacking order at any distance; up close the
// real geometry still decides. Same-finish pairs (pads/footpaths, planters/terrain) share a colour, so they need no order.
const groundLayer: Record<string, number> = { road: 1, service_area: 1, plaza: 2, sidewalk: 3, road_marking: 4 };
// Ground finishes that stop at the seaward cut; massing, guideway and revetment keep their geometry.
const cutGround = new Set(['landscape', 'road', 'sidewalk', 'road_marking']);
function openBay(material: T.Material) {
  const compile = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 bayCut;').replace('#include <project_vertex>', '#include <project_vertex>\nbayCut=(modelMatrix*vec4(transformed,1.)).xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 bayCut;').replace('#include <clipping_planes_fragment>', `{ vec2 p=bayCut; if(${SEAWARD_GLSL}) discard; }\n#include <clipping_planes_fragment>`);
  };
  material.customProgramCacheKey = () => key() + '|open-bay';
}

/** Phase 03D environment (detail inside the district only), the bay context, six surveyed landmarks and the Fuji civic core, in metres. */
export async function loadOdaiba(scene: T.Scene, water?: T.Material) {
  const grass=new T.TextureLoader().load(new URL('../asset/textures/coastal-grass.png',import.meta.url).href);
  grass.colorSpace=T.SRGBColorSpace;grass.wrapS=grass.wrapT=T.RepeatWrapping;grass.anisotropy=8;
  const environment = await addCityModel(scene, environmentUrl, [0, 0, 0]);
  environment.name = 'odaiba-environment';
  const receded = new Set<T.Material>();
  environment.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const material = object.material as T.MeshStandardMaterial, finish = environmentFinish[material.name];
    if (finish) { material.color.set(finish[0]); material.roughness = finish[1]; material.metalness = finish[2]; }
    const layer = groundLayer[material.name];
    if (layer) { material.polygonOffset = true; material.polygonOffsetFactor = -layer; material.polygonOffsetUnits = -4 * layer; }
    // Context massing (district and backdrop) carries the same storey-banded curtain wall and lit bays as Aqua City and DECKS.
    if (finish && material.name.startsWith('context_') && material.customProgramCacheKey() !== 'curtain-wall') curtainWall(material, finish[0]);
    if(material.name==='landscape'){
      material.map=grass;material.color.set('#c6d0ae'); // r8: as lush, a touch less saturated and lighter than game green (user)
      // World metres keep the authored terrain patches at one consistent texture scale.
      material.onBeforeCompile=shader=>{
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 grassUv;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ngrassUv=(modelMatrix*vec4(transformed,1.)).xz/32.;');
        // Inside the district the lawns become a park landscape: reflecting ponds in the grove swales (the same field plantLandscapeCanopy
        // leaves clear, so no crowns stand in water; survey sites stay dry) with pale stone rims, and meandering gravel walks along another field's contours.
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 grassUv;').replace('#include <map_fragment>',`diffuseColor.rgb *= mix(texture2D(map,grassUv).rgb,texture2D(map,grassUv*.19).rgb,.35);
          vec2 w=grassUv*32.;
          float inside=step(${DISTRICT.minX.toFixed(1)},w.x)*step(w.x,${DISTRICT.maxX.toFixed(1)})*step(${DISTRICT.minZ.toFixed(1)},w.y)*step(w.y,${DISTRICT.maxZ.toFixed(1)});
          float swale=sin(w.x*.023+sin(w.y*.018)*2.)+cos(w.y*.031);
          float site=${Object.values(changeSites).map(c=>`step(abs(w.x-(${c.x.toFixed(1)})),${(c.w*c.scale/2+14).toFixed(1)})*step(abs(w.y-(${c.z.toFixed(1)})),${(c.d*c.scale/2+14).toFixed(1)})`).join('+')};
          // r8: the corridor channel (coastalCanopy.corridor) joins the ponds into one water/climate corridor, all edged in crisp white.
          float lawnOpen=inside*(1.-min(site,1.)),corridor=${CORRIDOR_GLSL};
          float pond=lawnOpen*max(1.-smoothstep(-1.28,-1.24,swale),1.-smoothstep(.09,.1,corridor));
          float rim=max(lawnOpen*max(1.-smoothstep(-1.17,-1.13,swale),1.-smoothstep(.13,.14,corridor))-pond,0.);
          float walk=inside*(1.-smoothstep(.06,.1,abs(sin(w.x*.037+cos(w.y*.029)*1.6)+sin(w.y*.033+w.x*.011))));
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.84,.81,.74),walk*(1.-pond)); // r8 pass 3: pale ivory walks, crisper engineered edge than tan gravel
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.89,.85),rim);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.36,.46),pond);`).replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.06,pond);metalnessFactor=mix(metalnessFactor,.35,pond);');
      };
      material.customProgramCacheKey=()=>'coastal-grass-ponds';
    }
    // The sea lies under the whole plate; grazing shadows on it only produce acne.
    if (material.name === 'water') { object.castShadow = object.receiveShadow = false; if(water) object.material=water; }
  });
  // The guideway avenue's junction mouth has neither road nor the paving slab laid over the avenues (terrain shows): fill it with the
  // slab's finish, as part of the environment so doorway and paving checks see it.
  let paving: T.Material | undefined;
  environment.traverse(object => { if (!paving && object instanceof T.Mesh && (object.material as T.Material).name === 'sidewalk') paving = object.material; });
  if (paving) {
    const edges = roadFill(), fill = new T.BufferGeometry();
    fill.setAttribute('position', new T.Float32BufferAttribute(edges.flatMap(pair => pair.flatMap(([x, z]) => [x, .15, z])), 3));
    fill.setIndex(edges.slice(1).flatMap((_, i) => [2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3]));
    fill.computeVertexNormals();
    const strip = new T.Mesh(fill, paving); strip.name = 'ROAD_JUNCTION_FILL'; strip.receiveShadow = true; environment.add(strip);
  }
  // After finishes: shared materials are re-tuned once per mesh above, which would drop an earlier wrap.
  environment.traverse(object => { if (object instanceof T.Mesh && object.material !== water) receded.add(object.material); });
  receded.forEach(material => { if (cutGround.has(material.name)) openBay(material); recedeBeyondDistrict(material); });
  scene.add(contextFacades(environment), bayContext());
  plantCanopy(scene,trees,true);
  plantBackdropGrove(scene,environment);
  // Sky gardens crown the tall context towers (the only CTX mesh above 30 m inside the district).
  // Each roof garden's terraces go to the district Meters (sails/forest) and take a few residents (stroll line, standing group).
  const roofGarden=(model:T.Object3D,tower?:boolean)=>{const terraces=plantRoofCanopy(scene,model,tower);publishRoofGardens(terraces);publishRoofWalks(model,terraces);};
  environment.traverse(object=>{if(object instanceof T.Mesh && object.name.startsWith('CTX_') && new T.Box3().setFromObject(object).max.y>30)roofGarden(object,true);});
  await Promise.all(layout.buildings.filter(placement => inDistrict(placement.positionBlender[0], -placement.positionBlender[1])).map(async placement => {
    if(placement.id==='fuji-tv'){const core=civicCore();scene.add(core);publishOccupants(core.occupants);return;}
    const model = await addCityModel(scene, buildingUrls[placement.id], [0, 0, 0]);
    model.name = placement.id;
    placeOdaibaModel(model, placement);
    publishDoorways(model, environment);
    if(placement.id==='aqua-city-odaiba' || placement.id==='decks-tokyo-beach')roofGarden(model);
    else if(placement.id==='grand-nikko-tokyo-daiba' || placement.id==='divercity-office-tower')roofGarden(model,true);
    model.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      for (const material of [object.material].flat() as T.MeshStandardMaterial[])
        if (curtainWalls[material.name]) { if (!material.customProgramCacheKey().startsWith('curtain')) curtainWall(material, curtainWalls[material.name]); }
        else if (/glass|glazing|window reflection/i.test(material.name) && !glazing.has(material)) { material.emissive.copy(warm); material.emissiveIntensity = dayGlow; material.roughness=.22;material.metalness=.38;glazing.add(material); }
        else if (roofRetrofit[material.name]) { const [color, roughness, metalness] = roofRetrofit[material.name]; material.color.set(color); material.roughness = roughness; material.metalness = metalness; }
    });
    // One draw per finish instead of one per surveyed part (30–50 per landmark); materials stay shared, so night glazing still applies.
    const parts: T.BufferGeometry[] = []; model.traverse(object => { if (object instanceof T.Mesh) parts.push(object.geometry); });
    const merged = bake(model); model.clear(); parts.forEach(geometry => geometry.dispose());
    merged.forEach(mesh => { mesh.name = placement.id; model.add(mesh); });
  }));
  plantLandscapeCanopy(scene,environment,scene.children.filter(object=>object.name==='fuji-civic-chassis' || Object.hasOwn(buildingUrls,object.name)));
  publishEntrances(scene,environment);
}
