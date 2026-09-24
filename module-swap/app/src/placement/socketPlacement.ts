import { Group, Matrix4, Object3D, Quaternion, Vector3 } from "three";

export const LOT_SOCKET_NODE_NAMES = {
  nw: "socket_lot_nw",
  ne: "socket_lot_ne",
  sw: "socket_lot_sw",
  se: "socket_lot_se",
} as const;

export const ROAD_CONNECTOR_NAMES = [
  "connector_road_north",
  "connector_road_east",
  "connector_road_south",
  "connector_road_west",
] as const;

export interface SocketAttachment {
  readonly anchor: Group;
  readonly animationWrapper: Group;
  readonly module: Object3D;
}

export function requireNamedNode(root: Object3D, name: string): Object3D {
  root.updateWorldMatrix(true, true);
  const node = root.getObjectByName(name);
  if (!node) throw new Error(`Required GLB node is missing: ${name}`);
  node.updateWorldMatrix(true, false);
  return node;
}

export function readWorldTransform(node: Object3D): {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
  matrix: Matrix4;
} {
  node.updateWorldMatrix(true, false);
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const matrix = node.matrixWorld.clone();
  matrix.decompose(position, quaternion, scale);
  return { position, quaternion, scale, matrix };
}

export function attachModuleToSocket(
  socket: Object3D,
  module: Object3D,
  label: string,
): SocketAttachment {
  socket.updateWorldMatrix(true, false);
  const anchor = new Group();
  anchor.name = `${label}__socketAnchor`;
  anchor.position.set(0, 0, 0);
  anchor.quaternion.identity();
  anchor.scale.set(1, 1, 1);

  const animationWrapper = new Group();
  animationWrapper.name = `${label}__animationWrapper`;
  anchor.add(animationWrapper);
  animationWrapper.add(module);
  socket.add(anchor);

  module.position.set(0, 0, 0);
  module.quaternion.identity();
  module.scale.set(1, 1, 1);
  anchor.updateMatrixWorld(true);
  return { anchor, animationWrapper, module };
}
