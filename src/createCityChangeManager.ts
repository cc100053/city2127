import type * as T from 'three';
import { CityChangeManager } from './cityChangeManager.ts';
import { buildSurveySites } from './siteBuilders/index.ts';

export function createCityChangeManager(scene: T.Scene): CityChangeManager {
  return new CityChangeManager(buildSurveySites(scene));
}
