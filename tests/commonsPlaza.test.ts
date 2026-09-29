import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { buildCommonsPlaza } from '../src/siteBuilders/commonsPlaza.ts';
import { changeSites } from '../src/layout.ts';
import { dark, type Kit } from '../src/cityRig.ts';

function buildSite() {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const context = { fillStyle: '', font: '', textAlign: '', textBaseline: '', fillRect() {}, fillText() {} };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({ width: 0, height: 0, getContext: () => context }) },
  });
  try {
    const kit: Kit = { windows: [], signs: [], random: () => .5 };
    return buildCommonsPlaza(new T.Scene(), kit);
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
}

test('commons seats are preallocated, retarget smoothly, fold screens and stay in the SW lot', () => {
  const site = buildSite();
  const plaza = site.layers.plaza!.group;
  const instances = plaza.children.filter((child): child is T.InstancedMesh =>
    child instanceof T.InstancedMesh && child.name.startsWith('commons-'));
  assert.equal(instances.length, 4);
  assert.ok(instances.every(mesh => mesh.count === 8 && !mesh.visible));

  const runtime = site.commonsPlaza;
  assert.equal(runtime.setTarget({ band: 'low', sharedSeats: 0 }, 0, true), true);
  assert.deepEqual(runtime.getDiagnostics(), {
    band: 'low', targetSharedSeats: 0, visibleSharedSeats: 0, targetScreenedSeats: 8, visibleScreenedSeats: 8,
  });

  const screens = instances.find(mesh => mesh.name === 'commons-curved-screens')!;
  assert.equal(screens.material, dark, 'private screens should read as opaque electrochromic pods');
  screens.geometry.computeBoundingBox();
  assert.ok(screens.geometry.boundingBox!.max.y > 2 && screens.geometry.boundingBox!.max.y < 6,
    'private screens should read above the seats and remain below public-route height');
  const matrix = new T.Matrix4();
  screens.getMatrixAt(0, matrix);
  assert.ok(Math.abs(new T.Vector3().setFromMatrixColumn(matrix, 1).y - 1) < .001);

  runtime.setTarget({ band: 'mixed', sharedSeats: 4 }, 0, true);
  assert.deepEqual(runtime.getDiagnostics(), {
    band: 'mixed', targetSharedSeats: 4, visibleSharedSeats: 4, targetScreenedSeats: 4, visibleScreenedSeats: 4,
  });

  // A count change within the same band still animates for three seconds.
  assert.equal(runtime.setTarget({ band: 'mixed', sharedSeats: 2 }, 10, false), true);
  runtime.update(11.5);
  assert.equal(runtime.getDiagnostics().targetSharedSeats, 2);
  const seats = instances.find(mesh => mesh.name === 'commons-shared-seats')!;
  seats.getMatrixAt(2, matrix);
  assert.ok(Math.abs(new T.Vector3().setFromMatrixColumn(matrix, 1).length() - .5) < .01);
  runtime.update(13);
  assert.deepEqual(runtime.getDiagnostics(), {
    band: 'mixed', targetSharedSeats: 2, visibleSharedSeats: 2, targetScreenedSeats: 6, visibleScreenedSeats: 6,
  });

  runtime.setTarget({ band: 'high', sharedSeats: 8 }, 13, true);
  assert.deepEqual(runtime.getDiagnostics(), {
    band: 'high', targetSharedSeats: 8, visibleSharedSeats: 8, targetScreenedSeats: 0, visibleScreenedSeats: 0,
  });
  screens.getMatrixAt(0, matrix);
  assert.ok(Math.abs(new T.Vector3().setFromMatrixColumn(matrix, 1).y) < .001);
  assert.ok(plaza.children.some(child => child.name === 'fixed-kit' && child.visible));

  for (const mesh of instances) {
    mesh.computeBoundingBox();
    assert.ok(mesh.boundingBox);
    assert.ok(mesh.boundingBox!.min.x >= -changeSites.sw.w / 2 && mesh.boundingBox!.max.x <= changeSites.sw.w / 2);
    assert.ok(mesh.boundingBox!.min.z >= -changeSites.sw.d / 2 && mesh.boundingBox!.max.z <= changeSites.sw.d / 2);
  }

  runtime.restoreLegacy();
  assert.ok(instances.every(mesh => !mesh.visible));
});
