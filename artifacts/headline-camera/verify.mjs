import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SHOTS} from '../../src/headlineCamera.ts';
import {HERO_POSITION,HERO_TARGET} from '../../src/heroCamera.ts';
const out='artifacts/headline-camera/final';
const read=name=>JSON.parse(readFileSync(`${out}/${name}.json`,'utf8'));
const shots=read('shots'),live=read('live'),recovery=read('recovery');
assert.equal(shots.shots.length,14);assert.equal(new Set(shots.shots.map(s=>s.id)).size,14);
for(const shot of shots.shots){
 const expected=shot.id==='hero'?{position:HERO_POSITION,target:HERO_TARGET}:SHOTS[shot.id];
 for(const key of ['position','target'])assert.ok(shot.pose[key].every((v,i)=>Math.abs(v-expected[key][i])<1e-8));assert.ok(Number(shot.diagnostics.fps)>0);assert.ok(Number(shot.diagnostics.drawCalls)>0);
}
assert.deepEqual(shots.errors,[]);assert.deepEqual(live.errors,[]);assert.deepEqual(recovery.errors,[]);
assert.deepEqual([...new Set(live.observations.filter(o=>o.id).map(o=>o.id))].sort(),Object.keys(SHOTS).sort());
assert.ok(live.observations.filter(o=>o.pass).length>=6);assert.ok(recovery.checks.length>=7);assert.ok(recovery.checks.every(c=>c.pass));
const boundary=live.observations.find(o=>o.check==='A/B queue and second headline');
assert.ok(boundary.commitGapMs<3000);
const distance=Math.hypot(...boundary.boundaryPose.position.map((v,i)=>v-SHOTS['nw:focal'].position[i]));
assert.ok(distance<100,`A/B at the return start still lies near A, not a cut: ${distance}m`);
const files=['src/headlineCamera.ts','src/main.ts','src/surveyAtmosphere.ts','tests/headlineCamera.test.ts','tests/surveyAtmosphere.test.ts','package.json',...readdirSync(out).filter(f=>f.endsWith('.jpg')).map(f=>`${out}/${f}`)];
const hashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
writeFileSync(`${out}/manifest.json`,JSON.stringify({check:'PASS',staticShots:14,liveShots:13,recoveryChecks:recovery.checks.length,abBoundaryDistanceFromA:distance,hashes},null,2));
console.log('PASS: all 13 static/live shots, hero, recovery, camera-table agreement and original image/source hashes.');
