import { PerspectiveCamera } from 'three';
// One authored desktop pose: the intersection and its decks stay centred, the cores frame it.
export const HERO_POSITION:[number,number,number]=[34,34,76];
export const HERO_TARGET:[number,number,number]=[-3,17,-1];
export function heroCamera(width: number, height: number) {
  // near=1, not .1: the orbit never comes closer than 45 units, and the 10× depth precision stops the road (1 cm above the ground plate) z-fighting when zoomed out.
  const camera = new PerspectiveCamera(46, width / height, 1, 320);
  camera.position.set(...HERO_POSITION);
  camera.lookAt(...HERO_TARGET);
  return camera;
}
