import assert from 'node:assert/strict';
import * as T from 'three';
import { futureBuildingPool } from '../src/qrFutureBuildings.ts';
import { ConcentrationDistrict } from '../src/districtMeters.ts';
import { deriveExhibitionLayout } from '../survey/src/shared/cityView.ts';

for (const score of [-12, 0, 12]) for (const seed of [0, 2127]) {
  const layout = deriveExhibitionLayout({ automation: score, publicSharing: score, environmentalPriority: score, urbanConcentration: score });
  const district = new ConcentrationDistrict(new T.Group()); district.setTarget(layout, 0, true, seed);
  const pool = futureBuildingPool(layout, { automation: seed, publicSharing: seed, environmentalPriority: seed, urbanConcentration: seed });
  const configuration = district.getConfiguration();
  assert.equal(pool.candidates.length, configuration[0].filter(c => c[0] > .02).length);
  assert.ok(pool.candidates.every(c => c.id.startsWith('future-tower-')));
  if (score === -12) assert.equal(pool.candidates.length, 0, 'a low city must not invent towers or use garden pavilions');
  else assert.ok(pool.candidates.length > 0, 'mixed/high cities retain their actual mid/high-rise towers');
  for (const candidate of district.getPreviewCandidates().filter(c => c.id.startsWith('future-pavilion-'))) {
    assert.throws(() => pool.create(candidate.id), /not present/, 'visible pavilions are excluded from QR selection and extraction');
  }
  for (const candidate of pool.candidates) {
    const preview = pool.create(candidate.id);
    const bounds = new T.Box3().setFromObject(preview), size = bounds.getSize(new T.Vector3());
    assert.ok(size.x > 1 && size.y > 40 && size.z > 1, candidate.id);
    assert.ok(Math.abs(bounds.getCenter(new T.Vector3()).x) < 35, 'one local building, not the whole district');
    preview.traverse(object => { if (object instanceof T.InstancedMesh) assert.equal(object.count, 1); });
    if (candidate.id.startsWith('future-tower')) {
      const index = Number(candidate.id.split('-').at(-1));
      const instance = preview.children[0] as T.InstancedMesh, matrix = new T.Matrix4(); instance.getMatrixAt(0, matrix);
      const scale = new T.Vector3(); matrix.decompose(new T.Vector3(), new T.Quaternion(), scale);
      assert.ok(Math.abs(scale.y - configuration[0][index][0] * district.towers[index].h) < .001, 'exact snapshot tower height');
      assert.ok(preview.children.some(object => object instanceof T.Mesh && !Array.isArray(object.material) && object.material.customProgramCacheKey() === 'concentration-tower-glass'), 'retains the city glass shader');
    }
  }
  assert.throws(() => pool.create('fuji-tv'), /not present/);
  pool.dispose();
}
console.log('PASS: future QR selects actual mid/high-rise towers only, excludes pavilions, and preserves city seeds, heights and transforms.');
