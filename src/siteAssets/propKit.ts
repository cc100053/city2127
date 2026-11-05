import * as T from 'three';
import type { SiteAssetLoaderCache } from './assetLoader.ts';

/** One instance of a kit prop: `position` is its base (ground contact) in the consumer's local units. */
export interface PropPlacement {
  readonly name: string;
  readonly position: readonly [number, number, number];
  readonly yaw?: number;
  readonly scale?: number;
}

export const CITY_KIT_ID = 'city-kit-2127';

/** Loads (once, shared with every other consumer) the reusable prop kit and returns its root. */
export async function loadPropKit(assets: SiteAssetLoaderCache): Promise<T.Object3D> {
  return (await assets.load(CITY_KIT_ID)).root;
}

/**
 * Instances kit props as one InstancedMesh per (prop, material), named `kit-<prop>`.
 * Kit props are modelled in metres for a 1.8 m person; `unitsPerMetre` converts to the site's local units
 * (SE: its standing figure is .74 units, so .74 / 1.8). Each placement's `scale` multiplies that.
 */
export function instanceProps(kit: T.Object3D, placements: readonly PropPlacement[], unitsPerMetre: number): T.Group {
  kit.updateMatrixWorld(true);
  const byName = new Map<string, PropPlacement[]>();
  for (const placement of placements) {
    if (!kit.getObjectByName(`kit_${placement.name}`)) throw new Error(`Unknown kit prop ${placement.name}.`);
    byName.set(placement.name, [...byName.get(placement.name) ?? [], placement]);
  }
  const group = new T.Group();
  group.name = 'kit-props';
  const matrix = new T.Matrix4(), turn = new T.Quaternion(), up = new T.Vector3(0, 1, 0), unit = new T.Vector3();
  for (const [name, list] of byName) {
    const prop = kit.getObjectByName(`kit_${name}`)!;
    const toProp = prop.matrixWorld.clone().invert();
    prop.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      const geometry = object.geometry.clone().applyMatrix4(toProp.clone().multiply(object.matrixWorld));
      const mesh = new T.InstancedMesh(geometry, object.material, list.length);
      mesh.name = `kit-${name}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // instances sit outside the one-prop bounding sphere
      list.forEach((placement, i) => {
        unit.setScalar(unitsPerMetre * (placement.scale ?? 1));
        mesh.setMatrixAt(i, matrix.compose(new T.Vector3(...placement.position), turn.setFromAxisAngle(up, placement.yaw ?? 0), unit));
      });
      group.add(mesh);
    });
  }
  return group;
}
