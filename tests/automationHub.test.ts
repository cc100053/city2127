import assert from 'node:assert/strict';
import * as T from 'three';
import { buildAutomationHub } from '../src/siteBuilders/automationHub.ts';

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ fillRect() {}, fillText() {} }),
    }),
  },
});

const assets = { async cloneRoot() { return new T.Group(); } };
const scene = new T.Scene();
const site = buildAutomationHub(scene, { windows: [], signs: [], random: () => .5 }, assets as never);
if (descriptor) Object.defineProperty(globalThis, 'document', descriptor);
else delete (globalThis as { document?: Document }).document;

const runtime = site.automationHub;
site.layers.hubBase!.group.visible=true;site.layers.hubBase!.group.scale.y=1;
const props = site.layers.hubNeutralProps!.group;
props.visible = true;
props.scale.set(1, 1, 1);
const slots = props.children.filter(child => child.name.startsWith('hub-service-slot-'));
assert.equal(slots.length, 6, 'the v2 baseline has exactly six mutable service slots');

scene.updateMatrixWorld(true);
// Lot limits are in site units; the root carries the Odaiba position and scale.
const bounds = new T.Box3().setFromObject(props).applyMatrix4(site.root.matrixWorld.clone().invert());
assert.ok(bounds.min.x >= -4.001);
assert.ok(bounds.max.x <= 4.001);
assert.ok(bounds.min.z >= -3.501);
assert.ok(bounds.max.z <= 3.501);

assert.deepEqual(runtime.getDiagnostics(), {
  band: 'mixed', targetAutomatedPorts: 3, visibleAutomatedPorts: 3,
  targetHumanCounters: 3, visibleHumanCounters: 3,
});
assert.equal(runtime.setTarget({ band: 'low', automatedPorts: 0 }, 0, true), true);
assert.equal(runtime.getDiagnostics().visibleAutomatedPorts, 0);
assert.equal(runtime.getDiagnostics().visibleHumanCounters, 6);

assert.equal(runtime.setTarget({ band: 'low', automatedPorts: 1 }, 1, false), true);
runtime.update(2.5);
const firstAuto = slots[0].getObjectByName('hub-automated-port-0')!;
assert.ok(Math.abs(firstAuto.scale.y - .5) < 1e-9, 'same-band count changes use the 3-second smoothstep');
assert.equal(runtime.setTarget({ band: 'low', automatedPorts: 1 }, 2.5, false), false, 'same target does not restart');
runtime.update(4);
assert.equal(runtime.getDiagnostics().visibleAutomatedPorts, 1);
assert.equal(runtime.getDiagnostics().visibleHumanCounters, 5);

assert.equal(runtime.setTarget({ band: 'high', automatedPorts: 6 }, 4, false), true);
runtime.update(5.5);
const secondAuto = slots[1].getObjectByName('hub-automated-port-1')!;
assert.ok(Math.abs(secondAuto.scale.y - .5) < 1e-9, 'retargeting starts from the current slot state');
runtime.setTarget({ band: 'mixed', automatedPorts: 3 }, 5.5, true);
assert.equal(runtime.getDiagnostics().visibleAutomatedPorts, 3, 'snapshot/reset applies immediately');
assert.equal(runtime.getDiagnostics().visibleHumanCounters, 3);
runtime.setTarget({ band: 'high', automatedPorts: 6 }, 6, true);
runtime.restoreLegacy();
assert.equal(runtime.getDiagnostics().targetAutomatedPorts, 3);
assert.equal(runtime.getDiagnostics().visibleHumanCounters, 3, 'legacy restore returns to the existing 3/3 neutral');

// Actual service customers/staff use full-size instances on the podium; mode changes release them without squashing their bodies.
const people=site.root.children.find(o=>o.name==='hub-service-people') as T.InstancedMesh,m=new T.Matrix4(),at=new T.Vector3(),size=new T.Vector3();
const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),body=new T.Vector3(),world=new T.Vector3();
for(const [band,ports,staff] of [['low',0,2],['mixed',3,2],['high',6,0]] as const){
  runtime.setTarget({band,automatedPorts:ports},0,true);let uses=0,walks=0;
  for(let t=0;t<50;t+=.25){runtime.update(t);site.root.updateMatrixWorld(true);let employees=0;
    for(let k=0;k<4;k++){
      people.getMatrixAt(k,m);size.setFromMatrixScale(m).multiply(site.root.scale);
      if(size.x<.5)continue;assert.ok(Math.abs(size.x-1)<1e-6&&Math.abs(size.y-1)<1e-6,'service person is shrunk');
      at.setFromMatrixPosition(m);assert.ok(Math.abs(at.y-1.2)<1e-6);
      assert.ok(Math.abs(at.x)<=3.81&&Math.abs(Math.abs(at.z)-3.6)<1e-6,'service body leaves podium');
      world.copy(at).applyMatrix4(site.root.matrixWorld);
      ray.set(world.clone().add(new T.Vector3(0,.1,0)),down);ray.far=.2;
      assert.ok(ray.intersectObject(site.layers.hubBase!.group,true).some(h=>Math.abs(h.point.y-world.y)<1e-5),'service feet have no platform support');
      for(const height of [.4,1.2,1.6])for(let k=0;k<8;k++){
        ray.set(body.copy(world).add(new T.Vector3(0,height,0)),new T.Vector3(Math.cos(k*Math.PI/4),0,Math.sin(k*Math.PI/4)));ray.far=.25;
        assert.equal(ray.intersectObjects([props,site.layers.hubBase!.group],true).length,0,'service body clips facade/counter');
      }
      if(k%2)employees++;else if(people.geometry.getAttribute('gait').getY(k)>0)walks++;else if(people.geometry.getAttribute('social').getY(k)>.1)uses++;
    }assert.equal(employees,staff);
  }assert.ok(uses&&walks,'service mode has no visible approach/use cycle');
}
runtime.setTarget({band:'low',automatedPorts:0},60,false);runtime.update(61.5);
people.getMatrixAt(0,m);assert.ok(size.setFromMatrixScale(m).x<.001&&m.determinant()>0,'changing port retains a visible customer or singular hidden matrix');
runtime.setTarget({band:'mixed',automatedPorts:3},61.5,true);people.getMatrixAt(0,m);
assert.ok(Math.abs(size.setFromMatrixScale(m).x-1/3)<1e-6,'immediate recovery leaves a stale hidden customer');
props.visible=false;runtime.update(62);assert.equal(people.visible,false,'actors outlive a hidden frontage');

console.log('PASS: six bounded MAGNET service slots retarget smoothly and restore to the mixed 3/3 baseline.');
