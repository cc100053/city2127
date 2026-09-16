import { PerspectiveCamera } from 'three';
export function heroCamera(width: number, height: number) {
  const camera = new PerspectiveCamera(38, width / height, .1, 240);
  camera.position.set(47, 39, 64);
  camera.lookAt(0, 9, 0);
  return camera;
}
