import * as T from 'three';
import { arc, bake, box, cream, faces, futureLight, glass, sign, solar, teal, trim, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import { remapCityMaterials, type SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, type BuiltSite } from './siteRuntime.ts';

export function buildAutomationHub(scene: T.Scene, kit: Kit, assets: SiteAssetLoaderCache): BuiltSite {
  const root = createSiteRoot(scene, 'nw');
  const hubBaseLayer = createSiteLayer(root, siteLayerDefinition('magnetEast', 'hubBase'));
  const hubUpperLayer = createSiteLayer(root, siteLayerDefinition('magnetEast', 'hubUpper'), 12);
  const hubBase = hubBaseLayer.group;
  const hubUpper = hubUpperLayer.group;
  box(hubBase, [8.4, .8, 7.4], [0, .8, 0], cream, .25);
  box(hubBase, [7, 10, 6], [0, 6.2, 0], teal, .3);
  for (const y of [4, 7, 10]) faces(hubBase, 7, 6, (face, across, out) => {
    box(face, [across - .2, .9, .1], [0, y, out + .03], glass, .03);
    box(face, [across, .08, .4], [0, y + .55, out + .2], trim, .02);
  });
  box(hubBase, [7.6, .35, 6.6], [0, 11.4, 0], trim, .1);
  arc(hubBase, 0, 3.9, .25, [0, 11.55, 0], trim);
  arc(hubBase, 2.3, 2.45, .03, [0, 11.8, 0], futureLight);
  arc(hubBase, 0, .6, .03, [0, 11.8, 0], futureLight);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + Math.PI / 4;
    box(hubBase, [.12, .7, .12], [Math.cos(angle) * 3.7, 12.15, -Math.sin(angle) * 3.7], solar, .02);
  }
  sign(hubBase, kit, '自動サービス / AUTO HUB', 0, 2.2, 3.2, 6.2, .8, '#46676e');

  const hubUpperFallback = new T.Group();
  hubUpperFallback.name = 'automation-hub-upper-procedural-fallback';
  hubUpper.add(hubUpperFallback);
  const shaft = new T.Mesh(new T.CylinderGeometry(2.3, 2.3, 19, 40), glass);
  shaft.position.y = 9.5;
  hubUpperFallback.add(shaft);
  for (let y = 1.5; y < 19; y += 3) arc(hubUpperFallback, 0, 2.6, .25, [0, y, 0], trim);
  arc(hubUpperFallback, 0, 2.9, .3, [0, 19, 0], trim);
  arc(hubUpperFallback, 1.6, 1.75, .03, [0, 19.3, 0], futureLight);
  for (let i = 0; i < 3; i++) box(hubUpperFallback, [.12, 1, 2.4], [-1 + i, 19.8, 0], solar, .02);

  hubUpperFallback.add(...bake(hubUpperFallback));
  hubUpperLayer.setPreparation(async () => {
    const model = await assets.cloneRoot('automation-hub-upper', 'magnetEast', 'hubUpper');
    remapCityMaterials(model, {
      city_glass: glass,
      city_trim: trim,
      city_future_light: futureLight,
      city_solar: solar,
    });
    const replacement = new T.Group();
    replacement.name = 'automation-hub-upper-glb';
    replacement.add(model);
    replacement.add(...bake(replacement));
    hubUpper.add(replacement);
    hubUpperFallback.traverse(object => {
      if (object instanceof T.Mesh) object.geometry.dispose();
    });
    hubUpperFallback.removeFromParent();
  });

  hubBase.add(...bake(hubBase));
  return { id: 'magnetEast', root, layers: { hubBase: hubBaseLayer, hubUpper: hubUpperLayer }, marker: createGuestMarker(root, 'nw') };
}
