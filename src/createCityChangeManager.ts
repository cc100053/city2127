import type * as T from 'three';
import { EnergyRuntime } from './energyRuntime.ts';
import { CityChangeManager } from './cityChangeManager.ts';
import { buildSurveySites } from './siteBuilders/index.ts';

export function createCityChangeManager(scene: T.Scene): CityChangeManager {
  return new CityChangeManager(buildSurveySites(scene), new EnergyRuntime(scene));
}
