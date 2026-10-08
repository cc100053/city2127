import assert from 'node:assert/strict';
import * as T from 'three';
import { personalCityQuality, personalCityPixelRatio, personalCityFrameGate } from '../src/personalCityQuality.ts';
import { cityRig } from '../src/cityRig.ts';
import { bayWater } from '../src/bayWater.ts';

assert.equal(personalCityQuality(true,null,'iPhone',5,true),'lite');
assert.equal(personalCityQuality(true,null,'Android',5,true),'lite');
assert.equal(personalCityQuality(true,null,'Macintosh',5,true),'lite','iPadOS desktop user agent');
assert.equal(personalCityQuality(true,null,'Windows',0,false),'full');
assert.equal(personalCityQuality(true,'full','iPhone',5,true),'full');
assert.equal(personalCityQuality(true,'lite','Windows',0,false),'lite');
assert.equal(personalCityQuality(true,'invalid','iPhone',5,true),'lite');
assert.equal(personalCityQuality(false,'lite','iPhone',5,true),'full','never lower the shared display');
for (const [width,height] of [[390,844],[844,390],[1024,1366],[3840,2160]]) {
  const ratio=personalCityPixelRatio(true,true,width,height,3);
  assert.ok(ratio<=.7 && width*ratio<=720 && height*ratio<=720);
  assert.ok(width*height*ratio*ratio<=360001,'bounded drawing buffer, not CSS size');
}
assert.equal(personalCityPixelRatio(false,true,390,844,3),1);
assert.equal(personalCityPixelRatio(false,false,1920,1080,3),1.5);
const gate=personalCityFrameGate(true);
assert.equal(gate(0,true,false),true);
assert.equal(gate(16,true,false),false);
assert.equal(gate(34,true,false),true);
assert.equal(gate(500,false,false),false);
assert.equal(gate(1034,false,false),true);
assert.equal(gate(2000,true,true),false);
assert.equal(gate(2010,true,false),true,'returning to visible work resumes');
assert.equal(personalCityFrameGate(false)(0,false,true),true,'desktop loop behavior unchanged');
const scene=new T.Scene(),rig=cityRig(scene,{ambientMobility:false});
assert.equal(scene.children.length,4,'only civic infrastructure, no ambient fleet allocations');
rig.update({neon:.3,greenery:.5} as Parameters<typeof rig.update>[0],0,0);
const water=bayWater(true);
assert.equal(water.normalMap,null,'no large normal image decoded in lite');
assert.equal(water.type,'MeshStandardMaterial');
assert.notEqual(water.customProgramCacheKey(),new T.MeshStandardMaterial().customProgramCacheKey(),'curvature retained');
water.dispose();
console.log('PASS: archive-only mobile quality, bounded resolution, frame/visibility gate, omitted fleets and simple water');
