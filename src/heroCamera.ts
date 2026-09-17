import { PerspectiveCamera } from 'three';
export function heroCamera(width: number, height: number) {
  const camera = new PerspectiveCamera(48, width / height, .1, 240);
  camera.position.set(39, 42, 92);
  camera.lookAt(-4, 29, 0);
  return camera;
}
