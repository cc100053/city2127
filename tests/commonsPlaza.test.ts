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
  runtime.update(23.8);
  assert.ok(state('mixed').visible && state('high').visible, 'both states are visible mid-transition');
  runtime.update(24.9);
  assert.ok(state('mixed').visible, 'the shelf frame stays up until its own window ends (5 s)');
  runtime.update(25);
  assert.deepEqual(shown(), ['high']);
  assert.equal(canopy('high').visible, true);
  assert.deepEqual(runtime.getDiagnostics(), { band: 'high', targetSharedSeats: 8, visibleSharedSeats: 8, targetScreenedSeats: 0, visibleScreenedSeats: 0 });
  assert.ok(!plaza.children.some(child => child.name === 'commons-pods-low' && child.visible), 'no private pods in the +1 state');

  // Band change order (the only shelf change the live ladder produces: mixed always means 4 seats). Entering mixed (5 s): frame 0-1.3 s, quiet modules 1.3-2.1 s, headline hoist 1.9-5 s. Leaving: hoist 0-3.1 s, modules out 2.9-3.7 s, frame down 3.7-5 s. Nothing is squashed with the frame.
  const shelfFrame = state('mixed'), seen = () => runtime.getShelfDiagnostics().visibleModules;
  runtime.setTarget({ band: 'mixed', sharedSeats: 4 }, 40, false);
  runtime.update(40.65);
  assert.ok(shelfFrame.visible && shelfFrame.scale.y > 0 && shelfFrame.scale.y < 1 && seen() === 0, 'frame still rising, no module yet');
  runtime.update(41.4);
  assert.ok(shelfFrame.scale.y === 1 && seen() === 32 && seen() <= 33, 'frame is up; quiet modules slide in, the headline module has not started');
  runtime.update(42.2);
  assert.equal(seen(), 33, 'the headline module is hoisting in');
  runtime.update(44);
  assert.equal(seen(), 33);
  runtime.update(45);
  assert.equal(runtime.getShelfDiagnostics().visibleModules, 33, 'settled: every module in place');
  runtime.setTarget({ band: 'low', sharedSeats: 0 }, 50, false);
  runtime.update(51.5);
  assert.ok(shelfFrame.scale.y === 1 && seen() === 33, 'headline module is hoisting out, frame full height');
  runtime.update(53.4);
  assert.ok(shelfFrame.scale.y === 1 && seen() < 33, 'quiet modules slide out after the hoist');
  runtime.update(53.9);
  assert.ok(shelfFrame.scale.y < 1 && seen() === 0, 'frame comes down only after every module has left');
  runtime.update(55);
  assert.deepEqual(shown(), ['low']);

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
