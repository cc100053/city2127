import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { buildCommonsPlaza } from '../src/siteBuilders/commonsPlaza.ts';
import { changeSites } from '../src/layout.ts';

const BANDS = ['low', 'mixed', 'high'] as const;

test('commons states follow the band, retarget smoothly, hide before the exhibition target and stay in the SW lot', () => {
  const site = buildCommonsPlaza(new T.Scene());
  const plaza = site.layers.plaza!.group;
  plaza.visible = true;
  plaza.scale.y = 1;
  const state = (band: string) => plaza.getObjectByName(`commons-state-${band}`)!;
  const canopy = (band: string) => plaza.getObjectByName(`commons-canopy-${band}`)!;
  const shown = () => BANDS.filter(band => state(band).visible);
  const runtime = site.commonsPlaza;

  // Legacy / before the exhibition target: the mixed plaza shows, but no seat counts.
  assert.deepEqual(shown(), ['mixed']);
  assert.deepEqual(runtime.getDiagnostics(), { band: 'mixed', targetSharedSeats: 4, visibleSharedSeats: 0, targetScreenedSeats: 4, visibleScreenedSeats: 0 });

  assert.equal(runtime.setTarget({ band: 'low', sharedSeats: 0 }, 0, true), true);
  assert.deepEqual(shown(), ['low']);
  assert.ok(plaza.children.some(child => child.name === 'commons-pods-low' && child.visible), 'pods stand in the low state');
  assert.deepEqual(runtime.getDiagnostics(), { band: 'low', targetSharedSeats: 0, visibleSharedSeats: 0, targetScreenedSeats: 8, visibleScreenedSeats: 8 });
  // Site-local resident figures: seated (bent) and standing instances, shown only in a settled state.
  const figure = (kind: string) => plaza.getObjectByName(`commons-people-${kind}`) as T.InstancedMesh;
  assert.ok(figure('seat').visible && figure('seat').count >= 8 && figure('stand').count >= 2, 'low state shows seated and standing residents');

  runtime.setTarget({ band: 'mixed', sharedSeats: 4 }, 0, true);
  assert.deepEqual(shown(), ['mixed']);
  assert.deepEqual(runtime.getShelfDiagnostics(), { modules: 33, visibleModules: 33, glb: false }, 'the shelf holds 33 of its 60 slots at 4 seats');
  assert.deepEqual(runtime.getDiagnostics(), { band: 'mixed', targetSharedSeats: 4, visibleSharedSeats: 4, targetScreenedSeats: 4, visibleScreenedSeats: 4 });

  // A count change within the same band still animates for three seconds.
  assert.equal(runtime.setTarget({ band: 'mixed', sharedSeats: 2 }, 10, false), true);
  runtime.update(11.5);
  assert.equal(runtime.getDiagnostics().targetSharedSeats, 2);
  runtime.update(13);
  assert.deepEqual(runtime.getDiagnostics(), { band: 'mixed', targetSharedSeats: 2, visibleSharedSeats: 2, targetScreenedSeats: 6, visibleScreenedSeats: 6 });
  assert.equal(runtime.getShelfDiagnostics().modules, 31, 'two fewer seats unload two modules (29 + seats)');
  assert.equal(runtime.getShelfDiagnostics().visibleModules, 31);
  assert.equal(plaza.getObjectByName('event-shelf-gantry')!.children.length > 4, true, 'the roof gantry is built in code');

  // A band change crosses through both states, then settles on the new one only.
  assert.equal(runtime.setTarget({ band: 'high', sharedSeats: 8 }, 20, false), true);
  runtime.update(21.5);
  assert.ok(state('mixed').visible && state('high').visible, 'both states are visible mid-transition');
  runtime.update(23);
  assert.deepEqual(shown(), ['high']);
  assert.equal(canopy('high').visible, true);
  assert.deepEqual(runtime.getDiagnostics(), { band: 'high', targetSharedSeats: 8, visibleSharedSeats: 8, targetScreenedSeats: 0, visibleScreenedSeats: 0 });
  assert.ok(!plaza.children.some(child => child.name === 'commons-pods-low' && child.visible), 'no private pods in the +1 state');

  // Every state (slab, deck, discs) stays inside the SW lot plus the .8 gap to the amber outline's inner edge.
  site.root.updateMatrixWorld(true);
  const inverse = site.root.matrixWorld.clone().invert();
  for (const group of [...BANDS.map(state), plaza.getObjectByName('commons-state-mixed-yard')!, canopy('high')]) {
    const wasVisible = group.visible, scale = group.scale.clone();
    group.visible = true;
    if (group.name.includes('canopy')) group.scale.set(5 / 5.2 * 1.15, 5 / 5.2, 5 / 5.2);
    group.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(group).applyMatrix4(inverse);
    group.visible = wasVisible;
    group.scale.copy(scale);
    assert.ok(box.min.x >= -changeSites.sw.w / 2 - .8 && box.max.x <= changeSites.sw.w / 2 + .8, `${group.name} leaves the lot in x`);
    const trackRun = group.name === 'commons-state-mixed' ? 2.5 : 0; // R3: the shelf's ground tracks run 10 m past the lot toward the road
    assert.ok(box.min.z >= -changeSites.sw.d / 2 - .8 - trackRun && box.max.z <= changeSites.sw.d / 2 + .8, `${group.name} leaves the lot in z`);
  }
  assert.throws(() => runtime.setTarget({ band: 'low', sharedSeats: 9 }, 30, true), RangeError);

  runtime.restoreLegacy();
  assert.equal(runtime.getDiagnostics().visibleSharedSeats, 0);
  assert.deepEqual(shown(), ['mixed']);
});
