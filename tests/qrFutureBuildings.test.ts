import assert from 'node:assert/strict';
import * as T from 'three';
import { futureBuildingPool } from '../src/qrFutureBuildings.ts';
import { ConcentrationDistrict } from '../src/districtMeters.ts';
import { deriveExhibitionLayout } from '../survey/src/shared/cityView.ts';
import { civicCore } from '../src/civicCore.ts';
import { mirrors, trim, stone, leaf, solar, membrane, glass } from '../src/cityRig.ts';

for (const score of [-12, 0, 12]) for (const seed of [0, 2127]) {
  const layout = deriveExhibitionLayout({ automation: score, publicSharing: score, environmentalPriority: score, urbanConcentration: score });
  const district = new ConcentrationDistrict(new T.Group()); district.setTarget(layout, 0, true, seed);
  const pool = futureBuildingPool(layout, { automation: seed, publicSharing: seed, environmentalPriority: seed, urbanConcentration: seed });
  const configuration = district.getConfiguration();
  const towers = configuration[0].filter(c => c[0] > .02).length;
  assert.equal(pool.candidates.length, towers || 1);
  if (score === -12) assert.deepEqual(pool.candidates.map(c => c.id), ['landmark-civic-core'], 'low cities use the original central landmark, never invented towers or small pavilions');
  else assert.ok(pool.candidates.every(c => c.id.startsWith('future-tower-')), 'actual mid/high-rise towers take priority over the fallback landmark');
  for (const candidate of district.getPreviewCandidates().filter(c => c.id.startsWith('future-pavilion-'))) {
    assert.throws(() => pool.create(candidate.id), /not present/, 'visible pavilions are excluded from QR selection and extraction');
  }
  for (const candidate of pool.candidates) {
    const mirrorCount = mirrors.length;
    const preview = pool.create(candidate.id);
    assert.equal(mirrors.length, mirrorCount, 'QR previews do not register materials in the live city');
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
    } else {
      const original = civicCore();
      assert.equal(preview.name, original.name);
      assert.equal(preview.children.length, original.children.length);
      preview.children.forEach((object, index) => {
        const actual = object as T.Mesh, expected = original.children[index] as T.Mesh;
        assert.deepEqual(actual.geometry.attributes.position.array, expected.geometry.attributes.position.array, 'exact original civic landmark geometry');
        assert.notEqual(actual.geometry, expected.geometry);
        assert.notEqual(actual.material, expected.material, 'preview owns its material');
        assert.deepEqual((actual.material as T.MeshStandardMaterial).color, (expected.material as T.MeshStandardMaterial).color);
        expected.geometry.dispose();
      });
      const ownedMirror = mirrors.pop(); assert.equal(mirrors.length, mirrorCount); ownedMirror?.dispose();
      assert.ok(preview.children.every(object => object instanceof T.Mesh && ![trim, stone, leaf, solar, membrane, glass].includes(object.material as T.MeshStandardMaterial)), 'no shared finish is owned by the QR');
    }
    preview.traverse(object => { if (object instanceof T.Mesh) { object.geometry.dispose(); [object.material].flat().forEach(material => material.dispose()); } if (object instanceof T.InstancedMesh) object.dispose(); });
  }
  assert.throws(() => pool.create('fuji-tv'), /not present/);
  pool.dispose();
}
console.log('PASS: future QR prioritizes actual towers, uses the original civic landmark when absent, excludes pavilions, and owns detached resources.');
