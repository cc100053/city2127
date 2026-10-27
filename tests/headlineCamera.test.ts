import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { DISPLAY_MS, RESULT_LEASE_MS } from '../survey/src/shared/displayTiming.ts';
import { emptyEnergyConfiguration, type EnergyConfiguration } from '../survey/src/shared/energy.ts';
import { deriveExhibitionLayout } from '../survey/src/shared/cityView.ts';
import { HeadlineCamera, SHOTS, headlineShot, shotStage, shotTimeline, type ShotId } from '../src/headlineCamera.ts';
import { HERO_POSITION, HERO_TARGET } from '../src/heroCamera.ts';
import { ARRIVAL_SECONDS } from '../src/voteJourney.ts';
import { SITE_TRANSITION_SECONDS } from '../src/siteBuilders/siteRuntime.ts';
import { energyChangedPart, residentResult } from '../src/surveyAtmosphere.ts';
import type { ExhibitionProposal } from '../src/surveyView.ts';
const zero = { automation: 0, environmentalPriority: 0, publicSharing: 0, urbanConcentration: 0 };
const layout = deriveExhibitionLayout(zero);
const proposal: ExhibitionProposal = { id:'p',runId:'r',guestSessionId:'g',ordinal:1,questionSetVersion:4,algorithmVersion:2,
  answers:[],votes:zero,revisionBefore:0,revisionAfter:1,submittedAt:'2026-10-27T00:00:00Z',beforeScores:zero,afterScores:zero,beforeLayout:layout,afterLayout:layout,cityChanges:[] };
assert.equal(headlineShot(undefined), null);
for (const socketId of ['nw', 'ne', 'sw', 'se'] as const) {
  assert.equal(headlineShot({ socketId, focal:true,district:false }), `${socketId}:focal`);
  for (const focal of [false,true]) assert.equal(headlineShot({ socketId,focal,district:true }), `${socketId}:district`);
  assert.equal(residentResult(proposal,[{socketId,focal:true,district:true}]).place,residentResult(proposal,[{socketId,focal:false,district:true}]).place);
}
const cases: [EnergyConfiguration, EnergyConfiguration, ShotId, string, string][] = [];
for (const [part,value,shot,place] of [
  ['waterGardens',1,'energy:garden','海辺の蓄電庭園'], ['receiver','large','energy:wing','沖の受電翼'],
  ['flywheel',true,'energy:ring','フジテレビ前・蓄電環'], ['island',true,'energy:island','沖のエネルギー島'],
] as const) {
  const before=emptyEnergyConfiguration(),after={...before,[part]:value};
  cases.push([before,after,shot,place,part],[after,before,shot,place,part]);
}
cases.push([{...emptyEnergyConfiguration(),waterGardens:1},{...emptyEnergyConfiguration(),waterGardens:2},'energy:garden2','海辺の蓄電庭園','waterGardens']);
// Simultaneous differences preserve the card's priority, including removal.
cases.push([{waterGardens:1,receiver:'large',flywheel:true,island:true},emptyEnergyConfiguration(),'energy:garden','海辺の蓄電庭園','waterGardens']);
cases.push([{...emptyEnergyConfiguration(),receiver:'small',flywheel:true,island:true},emptyEnergyConfiguration(),'energy:wing','沖の受電翼','receiver']);
cases.push([{...emptyEnergyConfiguration(),flywheel:true,island:true},emptyEnergyConfiguration(),'energy:ring','フジテレビ前・蓄電環','flywheel']);
for (const [before,after,shot,place,part] of cases) {
  const change={socketId:'ne' as const,focal:false,district:true,energy:{before,after}};
  assert.equal(headlineShot(change),shot);assert.equal(energyChangedPart(before,after),part);
  assert.equal(residentResult(proposal,[change]).place,place);
}
assert.equal(energyChangedPart(emptyEnergyConfiguration(),emptyEnergyConfiguration()),null);
const t=shotTimeline();
assert.equal(t.flyIn,ARRIVAL_SECONDS);assert.equal(t.flyOut,DISPLAY_MS/1000);assert.ok(t.done<RESULT_LEASE_MS/1000);
assert.ok(t.hold<ARRIVAL_SECONDS+SITE_TRANSITION_SECONDS && t.flyOut>ARRIVAL_SECONDS+SITE_TRANSITION_SECONDS);
assert.equal(shotStage(3),'fly-in','reason appears during the authored 1.5s flight; hold starts at 4.12s');
assert.deepEqual([0,t.flyIn,t.hold,t.flyOut,t.done].map(elapsed=>shotStage(elapsed)),['journey','fly-in','hold','fly-out','done']);
assert.equal(Object.keys(SHOTS).length,13);
for (const pose of Object.values(SHOTS)) {
  const p=new Vector3(...pose.position),target=new Vector3(...pose.target);
  assert.ok(p.y>target.y);assert.ok(p.distanceTo(target)>=40&&p.distanceTo(target)<=450);
  assert.ok(p.x<target.x||p.z<target.z);
}
const camera=new PerspectiveCamera(42),controls={target:new Vector3(...HERO_TARGET),enabled:true,update(){}};
camera.position.set(...HERO_POSITION);
const controller=new HeadlineCamera(camera,controls),first={socketId:'ne' as const,focal:true,district:false};
controller.play([first],10);assert.equal(controller.active,true);assert.equal(controls.enabled,false);
controller.update(10);assert.deepEqual(camera.position.toArray(),HERO_POSITION);
controller.update(10+t.hold);assert.deepEqual(camera.position.toArray(),SHOTS['ne:focal'].position);
const interrupted=camera.position.clone(),aim=controls.target.clone();
controller.play([{socketId:'sw',focal:false,district:true}],20);controller.update(20);
assert.ok(camera.position.equals(interrupted));assert.ok(controls.target.equals(aim));
controller.update(20+2);assert.deepEqual(camera.position.toArray(),HERO_POSITION);
controller.update(20+t.hold);assert.deepEqual(camera.position.toArray(),SHOTS['sw:district'].position);
controller.cancel();assert.deepEqual(camera.position.toArray(),HERO_POSITION);assert.deepEqual(controls.target.toArray(),HERO_TARGET);assert.equal(controls.enabled,true);
for (const changes of [[],[first]]) {
  controller.play(changes,30,DISPLAY_MS-101);assert.equal(controller.active,false);
}
assert.equal(shotTimeline(9950).flyOut,9.95);
controller.play([first],35,9950);controller.update(35+9.96);assert.notDeepEqual(camera.position.toArray(),SHOTS['ne:focal'].position,'fly-out follows the actual remaining card slot');
controller.play([first],40);controller.update(40+t.done);assert.equal(controller.active,false);assert.deepEqual(camera.position.toArray(),HERO_POSITION);
console.log('PASS: 13 headline shots, card location priority, timing, interruption, catch-up and immediate cancel.');
