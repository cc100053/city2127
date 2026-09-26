import * as T from 'three';
import { arc, bake, box, futureLight, leaf, membrane, pink, shrubs, sign, stone, trim, type Kit } from '../cityRig.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, type BuiltSite } from './siteRuntime.ts';

export function buildCommonsPlaza(scene: T.Scene, kit: Kit): BuiltSite {
  const root = createSiteRoot(scene, 'sw');
  const plaza = createSiteLayer(root);
  arc(plaza, 0, 5, .2, [0, .42, 0], stone);
  arc(plaza, 2.05, 2.15, .02, [0, .62, 0], futureLight);
  arc(plaza, 4.3, 5, .5, [0, .62, 0], trim, 1.2, 3.6);
  arc(plaza, 4.4, 4.9, .08, [0, 1.12, 0], leaf, 1.2, 3.6);
  shrubs(plaza, 4.65, 1.15, 1.2, 3.6, 23);
  for (const [start, length] of [[.35, 1.2], [2.45, 1.2], [4.55, 1.2]]) arc(plaza, 2.6, 3, .42, [0, .62, 0], pink, start, length);
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2 + .26;
    box(plaza, [.2, 4.3, .2], [Math.cos(angle) * 3.8, 2.8, -Math.sin(angle) * 3.8], trim, .05);
  }
  arc(plaza, 3.1, 4.5, .22, [0, 4.95, 0], trim);
  arc(plaza, 0, 3.1, .06, [0, 5.03, 0], membrane);
  sign(plaza, kit, '公共広場 / COMMONS', 2.2, 2.1, 4, 4, .55, '#536f66');
  plaza.add(...bake(plaza));
  return { id: 'dogenzakaSouth', root, layers: { plaza }, marker: createGuestMarker(root, 'sw') };
}
