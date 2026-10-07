import * as T from 'three';
import { ConcentrationDistrict } from './districtMeters.ts';
import type { ExhibitionLayout, Scores } from './surveyView.ts';

/** Uses the same settled slot transforms and materials as the shared city. */
export function futureBuildingPool(layout: ExhibitionLayout, seeds?: Scores) {
  const source = new ConcentrationDistrict(new T.Group());
  source.setTarget(layout, 0, true, seeds?.urbanConcentration ?? 0);
  // Only the snapshot's visible mid/high-rise slots qualify; small garden pavilions do not.
  const candidates = source.getPreviewCandidates().filter(candidate => candidate.id.startsWith('future-tower-'));
  return {
    candidates,
    create(id: string) {
      if (!candidates.some(candidate => candidate.id === id)) throw new Error('Eligible tower is not present in this city snapshot.');
      return source.createBuildingPreview(id);
    },
    dispose() {
      const geometries = new Set<T.BufferGeometry>();
      source.root.traverse(object => {
        if (object instanceof T.Mesh) geometries.add(object.geometry);
        if (object instanceof T.InstancedMesh) object.dispose();
      });
      geometries.forEach(geometry => geometry.dispose());
    },
  };
}
