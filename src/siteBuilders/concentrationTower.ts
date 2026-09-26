import * as T from 'three';
import { arc, bake, box, cream, faces, glass, leaf, sage, shrubs, sign, solar, trim, type Kit } from '../cityRig.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, type BuiltSite } from './siteRuntime.ts';

export function buildConcentrationTower(scene: T.Scene, kit: Kit): BuiltSite {
  const root = createSiteRoot(scene, 'se');
  const towerBase = createSiteLayer(root);
  const towerUpper = createSiteLayer(root, 18);
  box(towerBase, [9, 1, 9], [0, .9, 0], cream, .25);
  box(towerBase, [8, 16.6, 8], [0, 9.6, 0], sage, .35);
  for (let y = 4; y < 17; y += 3) {
    box(towerBase, [8.2, .3, 8.2], [0, y, 0], trim, .05);
    faces(towerBase, 8, 8, (face, across, out) => box(face, [across - 1, 1.3, .08], [0, y + 1.4, out + .03], glass, .03));
    if (y % 6 === 4) {
      box(towerBase, [7.6, .35, .4], [0, y + .32, 4.25], leaf, .15);
      box(towerBase, [.4, .35, 7.6], [4.25, y + .32, 0], leaf, .15);
    }
  }
  sign(towerBase, kit, '都市集約 / 2127', 0, 2.4, 4.2, 5.5, .8, '#527789');

  const core = new T.Mesh(new T.CylinderGeometry(3, 3, 26, 40), glass);
  core.position.y = 13;
  towerUpper.add(core);
  for (let y = 0, floor = 0; y < 25; y += 2.6, floor++) {
    arc(towerUpper, 0, 3.2, 1, [0, y, 0], cream);
    arc(towerUpper, 0, 3.45, .14, [0, y + 1, 0], trim);
    if (floor % 3 === 1) {
      arc(towerUpper, 3.05, 3.45, .3, [0, y + 1.14, 0], leaf);
      shrubs(towerUpper, 3.25, y + 1.2, 0, Math.PI * 2, 16);
    }
  }
  arc(towerUpper, 0, 3.7, .5, [0, 25.9, 0], trim);
  arc(towerUpper, 0, 3.1, .12, [0, 26.4, 0], leaf);
  arc(towerUpper, 3.1, 3.7, .45, [0, 26.4, 0], trim);
  shrubs(towerUpper, 2.8, 26.5, 0, Math.PI * 2, 18);
  for (let i = 0; i < 4; i++) box(towerUpper, [.12, 1.1, 3], [-1.2 + i * .8, 27.1, 0], solar, .02);

  for (const layer of [towerBase, towerUpper]) layer.add(...bake(layer));
  return { id: 'centerGaiRear', root, layers: { towerBase, towerUpper }, marker: createGuestMarker(root, 'se') };
}
