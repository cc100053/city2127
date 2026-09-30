import * as T from 'three';
import { addCityModel } from './modelAssets';
import { placeOdaibaModel } from './odaibaPlacement';
import layout from './odaiba-layout.json';

// Literal paths so Vite bundles exactly the environment and the eight named buildings.
const environmentUrl = new URL('../asset/models/odaiba-masterplan/odaiba_masterplan_v01_phase03d_environment.glb', import.meta.url).href;
const buildingUrls: Record<string, string> = {
  'aqua-city-odaiba': new URL('../asset/models/aqua-city-odaiba/aqua-city-odaiba.glb', import.meta.url).href,
  'decks-tokyo-beach': new URL('../asset/models/decks-tokyo-beach/decks-tokyo-beach.glb', import.meta.url).href,
  'divercity-tokyo-plaza': new URL('../asset/models/divercity-tokyo-plaza/divercity-tokyo-plaza.glb', import.meta.url).href,
  'divercity-office-tower': new URL('../asset/models/divercity-office-tower/divercity-office-tower.glb', import.meta.url).href,
  'fuji-tv': new URL('../asset/models/fuji-tv/fuji-tv.glb', import.meta.url).href,
  'hilton-tokyo-odaiba': new URL('../asset/models/hilton-tokyo-odaiba/hilton-tokyo-odaiba.glb', import.meta.url).href,
  'grand-nikko-tokyo-daiba': new URL('../asset/models/grand-nikko-tokyo-daiba/grand-nikko-tokyo-daiba.glb', import.meta.url).href,
  'telecom-center': new URL('../asset/models/telecom-center/telecom-center.glb', import.meta.url).href,
};

// Masterplan blockout materials retuned to the project palette (ART.md): pale stone ground, soft green, context pushed back into the haze.
const environmentFinish: Record<string, [color: string, roughness: number, metalness: number]> = {
  road: ['#7d8a90', .88, 0], sidewalk: ['#dfe2dd', .78, 0], plaza: ['#ebe8e0', .66, 0], service_area: ['#d3d5ce', .8, 0],
  landscape: ['#9fb98f', .9, 0], water: ['#5a93a8', .62, 0], rail_structure: ['#e6ebea', .42, .35], station: ['#a7c3cf', .12, .55],
  context_unknown: ['#d2d9dc', .9, 0], context_office_commercial: ['#c9d3da', .85, 0], context_utility_service: ['#cfd3d0', .9, 0], context_public_cultural: ['#d0d8cf', .9, 0],
};

const glazing = new Set<T.MeshStandardMaterial>(), warm = new T.Color('#ffd49a');
/** Night: every building's glazing glows warm, so the landmarks keep their silhouettes after dark. */
export function updateOdaiba(night: number) {
  for (const material of glazing) material.emissiveIntensity = night * .55;
}

/** Phase 03D environment plus the eight landmark buildings at their surveyed placements, in metres. */
export async function loadOdaiba(scene: T.Scene) {
  const environment = await addCityModel(scene, environmentUrl, [0, 0, 0]);
  environment.name = 'odaiba-environment';
  environment.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const material = object.material as T.MeshStandardMaterial, finish = environmentFinish[material.name];
    if (finish) { material.color.set(finish[0]); material.roughness = finish[1]; material.metalness = finish[2]; }
    // The sea lies under the whole plate; grazing shadows on it only produce acne.
    if (material.name === 'water') object.castShadow = object.receiveShadow = false;
  });
  await Promise.all(layout.buildings.map(async placement => {
    const model = await addCityModel(scene, buildingUrls[placement.id], [0, 0, 0]);
    model.name = placement.id;
    placeOdaibaModel(model, placement);
    model.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      for (const material of [object.material].flat() as T.MeshStandardMaterial[])
        if (/glass|glazing|window/i.test(material.name) && !glazing.has(material)) { material.emissive.copy(warm); material.emissiveIntensity = 0; glazing.add(material); }
    });
  }));
}
