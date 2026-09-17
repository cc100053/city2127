import { PerspectiveCamera } from 'three';
export function heroCamera(width: number, height: number) {
  const camera = new PerspectiveCamera(38, width / height, .1, 240);
  camera.position.set(34, 52, 88);
  camera.lookAt(-6, 7, 0);
  return camera;
}
