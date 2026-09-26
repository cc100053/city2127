import * as T from 'three';
import { arc, bake, leaf, paint, pink, shrubs, stone, trim, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import type { SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, type BuiltSite } from './siteRuntime.ts';

const lawn = paint('#9fbf8a', .9);
const water = new T.MeshStandardMaterial({ color: '#7fb4c4', roughness: .05, metalness: .3 });
const treeTrunk = paint('#62756b', .88);
const TREE_POSITIONS = [[-2.9, -1.9, 7], [2.4, -2.9, 5.5], [-2, 3.1, 5], [3.3, 1.2, 6.5], [.4, 3.6, 4]] as const;

function disposeGeometries(root: T.Object3D): void {
  root.traverse(object => {
    if (object instanceof T.Mesh) object.geometry.dispose();
  });
}

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

  const treeFallback = new T.Group();
  treeFallback.name = 'park-trees-procedural-fallback';
  const trunkGeometry = new T.CylinderGeometry(.18, .28, 1, 8);
  const crownGeometry = new T.IcosahedronGeometry(1, 1);
  for (const [x, z, height] of TREE_POSITIONS) {
    const trunkHeight = height * .48;
    const trunk = new T.Mesh(trunkGeometry, treeTrunk);
    trunk.scale.y = trunkHeight;
    trunk.position.set(x, .7 + trunkHeight / 2, z);
    treeFallback.add(trunk);
    const crown = new T.Mesh(crownGeometry, leaf);
    crown.scale.set(height * .18, height * .25, height * .18);
    crown.position.set(x, .7 + height * .7, z);
    treeFallback.add(crown);
  }
  treeFallback.add(...bake(treeFallback));
  trunkGeometry.dispose();
  crownGeometry.dispose();
  treeLayer.group.add(treeFallback);

  treeLayer.setPreparation(async () => {
    const tree = await assets.cloneRoot('future-tree-2127', 'stationEastPark', 'parkTrees');
    const height = new T.Box3().setFromObject(tree).getSize(new T.Vector3()).y || 1;
    const grove = new T.Group();
    for (const [x, z, h] of TREE_POSITIONS) {
      const copy = tree.clone();
      copy.scale.setScalar(h / height); copy.position.set(x, .7, z); copy.rotation.y = x * z;
      grove.add(copy);
    }
    grove.name = 'park-trees-glb';
    grove.add(...bake(grove));
    treeLayer.group.add(grove);
    disposeGeometries(treeFallback);
    treeFallback.removeFromParent();
  });

  return {
    id: 'stationEastPark', root,
    layers: { parkSurface: surfaceLayer, parkTrees: treeLayer },
    marker: createGuestMarker(root, 'ne'),
  };
}
