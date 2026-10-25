import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { energyPrototype } from '../../../src/energyPrototype.ts';
const m=energyPrototype(), wing=m.parts.wing;
const origin=new Vector3(125,0,-424);
const original=new Box3(new Vector3(99.69325828552246,-2.3985044956207275,-434),new Vector3(150.30674171447754,34.497554779052734,-393.8591556549072));
for(const [variant,scale] of [['small',.65],['large',1]]){
 m.configure({waterGardens:2,receiver:variant,flywheel:true,island:true});
 const expected=new Box3(original.min.clone().sub(origin).multiplyScalar(scale).add(origin),original.max.clone().sub(origin).multiplyScalar(scale).add(origin));
 const actual=new Box3().setFromObject(wing);
 assert.deepEqual(wing.position.toArray(),origin.toArray());
 assert.deepEqual(wing.scale.toArray(),[scale,scale,scale]);
 assert.ok(expected.clone().expandByScalar(1e-5).containsBox(actual),`${variant} receiver escapes original overall envelope: ${JSON.stringify(actual)}`);
 console.log('PASS receiver original overall AABB',variant,JSON.stringify(actual));
}
