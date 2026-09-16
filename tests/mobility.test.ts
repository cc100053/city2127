import assert from 'node:assert/strict';
import { airRoutes, streetMotion, deliveryMotion, guideStrength, DOCK } from '../src/mobility.ts';

// Pedestrians can enter the carriageway only after every pod has cleared it.
for(let t=0;t<90;t+=.05){
  const pedestrians=Array.from({length:24},(_,i)=>streetMotion(t,i,true));
  const cars=Array.from({length:6},(_,i)=>streetMotion(t,i,false));
  assert.ok(!(pedestrians.some(p=>p.moving) && cars.some(c=>c.moving)));
}
// Walking direction reverses on the next cycle without teleporting across the road.
for(let i=0;i<24;i++)assert.ok(Math.abs(streetMotion(29.999,i,true).position-streetMotion(30,i,true).position)<.001);
// Thin-wing aircraft (4.4m span) clear fixed buildings and sky gardens.
const buildings=[
  {x:9,z:-10,w:12.5,d:13.5,h:30}, {x:-12,z:-12,w:8,d:8,h:14},
  {x:-20,z:-6,w:5.5,d:7,h:10}, {x:-15,z:11,w:9,d:7,h:8.5},
  {x:19,z:-13,w:5.5,d:7,h:12}, {x:13,z:11,w:6.5,d:5,h:5.5},
];
for(const route of airRoutes())for(let i=0;i<=500;i++){
  const p=route.getPointAt(i/500);
  assert.ok(Number.isFinite(p.x+p.y+p.z));
  for(const b of buildings)assert.ok(!(Math.abs(p.x-b.x)<b.w/2+2.3 && Math.abs(p.z-b.z)<b.d/2+2.3 && p.y<b.h+1),'Air corridor intersects a building');
}
// The courier remains stationary for handoff; the parcel fits between the receiver doors.
for(let t=12;t<=18;t+=.1){
  const d=deliveryMotion(t);assert.equal(d.z,DOCK.berthZ);assert.equal(d.cargoZ,DOCK.z);
  assert.ok(d.hatch>.99 || d.cargoY<3);
  assert.ok(Math.abs(d.cargoY-d.liftY-.4)<1e-8);
}
assert.equal(deliveryMotion(12).cargoY,DOCK.y-.6);
assert.ok(Math.abs(deliveryMotion(18).cargoY-2.15)<1e-8);
assert.equal(deliveryMotion(21).cargo,0);
assert.equal(deliveryMotion(28).liftY,DOCK.y-1);
for(const boundary of [9,10,12,18,20,22,28,30,32]){
  const a=deliveryMotion(boundary-.00001),b=deliveryMotion(boundary+.00001);
  assert.ok(Math.abs(a.z-b.z)<.001);
  assert.ok(Math.abs(a.liftY-b.liftY)<.001);
  assert.ok(Math.abs(a.liftZ-b.liftZ)<.001);
}
assert.ok(guideStrength(.01,.99,true)>.9);
assert.equal(guideStrength(.01,.99,false),0);
assert.equal(guideStrength(.5,0,true),0);
// The courier enters the open floor; its parcel clears the facade before descending.
for(let t=0;t<32;t+=.05){
  const d=deliveryMotion(t);assert.ok(d.z>=DOCK.berthZ);
  if(d.cargoY<10.6 && d.cargo>0)assert.ok(d.cargoZ-.5>-4.75);
  if(t>=10 && t<=12){assert.equal(d.cargoY,DOCK.y-.6);assert.ok(Math.abs(d.cargoZ-d.liftZ)<1e-8);}
}
console.log('PASS: traffic phases, walking continuity, wing clearance, delivery handoff/lift continuity and local guidance.');
