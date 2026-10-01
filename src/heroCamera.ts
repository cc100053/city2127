import { PerspectiveCamera } from 'three';
// One authored desktop pose over the bay: the waterfront in front, the Fuji TV sphere and Aqua City framing the centre. Metres.
export const HERO_POSITION:[number,number,number]=[-520,300,-620];
export const HERO_TARGET:[number,number,number]=[-40,25,-60];
export function heroCamera(width: number, height: number) {
  // far=9000 reaches past the curved sea's horizon (~5 km) to the skylines sinking behind it; near=2 keeps depth precision for road markings a few centimetres above the ground at kilometre range.
  const camera = new PerspectiveCamera(42, width / height, 2, 9000);
  camera.position.set(...HERO_POSITION);
  camera.lookAt(...HERO_TARGET);
  return camera;
}
