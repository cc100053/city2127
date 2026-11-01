import { PerspectiveCamera } from 'three';
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
