import { PerspectiveCamera, Spherical, Vector3 } from 'three';
// One authored desktop pose (owner 2026-11-01, c2): low and close so the Civic Core megastructure dominates against the sky; the four sites stay in frame, not every energy part. Metres.
export const HERO_POSITION:[number,number,number]=[-360,120,-440];
export const HERO_TARGET:[number,number,number]=[-20,65,-10];
export function heroCamera(width: number, height: number) {
  // far=9000 reaches past the curved sea's horizon (~5 km) to the skylines sinking behind it; near=2 keeps depth precision for road markings a few centimetres above the ground at kilometre range.
  const camera = new PerspectiveCamera(42, width / height, 2, 9000);
  camera.position.set(...HERO_POSITION);
  camera.lookAt(...HERO_TARGET);
  return camera;
}
/** Screen areas (px, 1920×1080 hero frame) that light streaks and ambient corridors keep clear: the title block and the top-right clock/HUD. */
export const heroTextZone=(x:number,y:number)=>(x<600&&y<440)||(x>1500&&y<160);
/** The hero pose as the page actually shows it: OrbitControls (main.ts, maxPolarAngle 1.42) lifts the authored camera to its polar limit on the first update, about 28 m higher. Ambient layers are tuned to this one. */
export function heroSettledCamera(width: number, height: number) {
  const camera = heroCamera(width, height), target = new Vector3(...HERO_TARGET), s = new Spherical().setFromVector3(camera.position.clone().sub(target));
  s.phi = Math.min(s.phi, 1.42);
  camera.position.copy(target).add(new Vector3().setFromSpherical(s)); camera.lookAt(target); camera.updateMatrixWorld(true);
  return camera;
}
