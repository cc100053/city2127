import * as T from 'three';
import { arc, bake, paint, pink, shrubs, stone, trim, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import type { SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, type BuiltSite } from './siteRuntime.ts';

const lawn = paint('#9fbf8a', .9);
const water = new T.MeshStandardMaterial({ color: '#7fb4c4', roughness: .05, metalness: .3 });

export function buildEnvironmentPark(scene: T.Scene, _kit: Kit, assets: SiteAssetLoaderCache): BuiltSite {
  const root = createSiteRoot(scene, 'ne');
  const surfaceLayer = createSiteLayer(root, siteLayerDefinition('stationEastPark', 'parkSurface'));
  const treeLayer = createSiteLayer(root, siteLayerDefinition('stationEastPark', 'parkTrees'));
  const park = surfaceLayer.group;
  arc(park, 0, 4.9, .2, [0, .42, 0], stone);
  arc(park, 0, 4.5, .12, [0, .62, 0], lawn);
  arc(park, 2.7, 3.2, .02, [0, .74, 0], stone);
  arc(park, 0, 1.55, .08, [0, .7, 0], water);
  arc(park, 1.55, 1.8, .18, [0, .62, 0], trim);
  arc(park, 4.5, 4.95, .6, [0, .62, 0], trim, .5, 5.2);
  shrubs(park, 4.2, .72, .5, 5.2, 30);
  for (const [start, length] of [[.9, 1.6], [3.4, 1.8]]) arc(park, 2.1, 2.5, .38, [0, .62, 0], pink, start, length);
  park.add(...bake(park));

  treeLayer.setPreparation(async () => {
    const tree = await assets.cloneRoot('future-tree-2127', 'stationEastPark', 'parkTrees');
    const height = new T.Box3().setFromObject(tree).getSize(new T.Vector3()).y || 1;
    const grove = new T.Group();
    for (const [x, z, h] of [[-2.9, -1.9, 7], [2.4, -2.9, 5.5], [-2, 3.1, 5], [3.3, 1.2, 6.5], [.4, 3.6, 4]] as const) {
      const copy = tree.clone();
      copy.scale.setScalar(h / height); copy.position.set(x, .7, z); copy.rotation.y = x * z;
      grove.add(copy);
    }
    treeLayer.group.add(...bake(grove), grove);
  });

  return {
    id: 'stationEastPark', root,
    layers: { parkSurface: surfaceLayer, parkTrees: treeLayer },
    marker: createGuestMarker(root, 'ne'),
  };
}
