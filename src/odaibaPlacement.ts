import { Object3D } from 'three';

export interface OdaibaPlacement {
  positionBlender: number[];
  rotationZ: number;
  scale: number[];
  adapterRotationX: number;
}

/** C * placement * adapter * C^-1: glTF already contains C (Blender Z-up to Y-up). */
export function placeOdaibaModel(model: Object3D, placement: OdaibaPlacement) {
  const [x, y, z] = placement.positionBlender;
  model.position.set(x, z, -y);
  model.rotation.set(0, placement.rotationZ, 0);
  model.scale.set(placement.scale[0], placement.scale[2], placement.scale[1]);
  // Only Nikko has the source masterplan's legacy adapter; never rotate other GLBs again.
  model.rotateX(placement.adapterRotationX);
  model.updateMatrixWorld(true);
}
