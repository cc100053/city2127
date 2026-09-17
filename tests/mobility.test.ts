import assert from 'node:assert/strict';
import { airRoutes, streetMotion, deliveryMotion, guideStrength, DOCK, pedestrianPose } from '../src/mobility.ts';
import { landmarks, crossings, roads, publicRoutes, publicPoint, publicJourney, upperLinks } from '../src/layout.ts';

// Pedestrians can enter the carriageway only after every pod has cleared it.
for(let t=0;t<90;t+=.05){
  const pedestrians=Array.from({length:24},(_,i)=>streetMotion(t,i,true));
  const cars=Array.from({length:6},(_,i)=>streetMotion(t,i,false));
  assert.ok(!(pedestrians.some(p=>p.moving) && cars.some(c=>c.moving)));
}
// Walking direction reverses on the next cycle without teleporting across the road.
for(let i=0;i<24;i++)assert.ok(Math.abs(streetMotion(29.999,i,true).position-streetMotion(30,i,true).position)<.001);
// Thin-wing aircraft (4.4m span) clear fixed buildings and sky gardens.
const buildings=landmarks.map((b,i)=>({...b,w:b.w+(i===0?.4:.8),d:b.d+(i===0?.6:3.6),h:b.h+2.3}));
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
  if(d.cargoY<10.6 && d.cargo>0)assert.ok(d.cargoZ-.5>landmarks[1].z+5.25);
  if(t>=10 && t<=12){assert.equal(d.cargoY,DOCK.y-.6);assert.ok(Math.abs(d.cargoZ-d.liftZ)<1e-8);}
}
console.log('PASS: traffic phases, walking continuity, wing clearance, delivery handoff/lift continuity and local guidance.');

// All five painted crossings share their actual path with pedestrians, including the diagonal.
for(let i=0;i<24;i++){
  const a=pedestrianPose(29.999,i),b=pedestrianPose(30,i);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.001);
  const {from,to,width}=crossings[i%crossings.length],dx=to[0]-from[0],dz=to[1]-from[1],length=Math.hypot(dx,dz);
  for(let time=0;time<60;time+=.25){
    const p=pedestrianPose(time,i),u=((p.x-from[0])*dx+(p.z-from[1])*dz)/(length*length);
    assert.ok(u>=-1e-8 && u<=1+1e-8);
    assert.ok(Math.abs((p.x-from[0])*dz-(p.z-from[1])*dx)/length+.35<width/2);
    for(const b of buildings)assert.ok(!(Math.abs(p.x-b.x)<b.w/2+.35 && Math.abs(p.z-b.z)<b.d/2+.35),'Pedestrian intersects a landmark');
  }
}
// The courier corridor clears every other block; tower entry is tested above.
for(let time=0;time<32;time+=.05){
  const d=deliveryMotion(time);
  for(const b of buildings.slice(0,1).concat(buildings.slice(2)))assert.ok(!(Math.abs(DOCK.x-b.x)<b.w/2+2.3 && Math.abs(d.z-b.z)<b.d/2+2.3 && DOCK.y<b.h+1));
}
console.log('PASS: five crossing paths, landmark clearance and relocated courier approach.');

function onRoad(x:number,z:number,polygon:number[][]) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [a,b]=polygon[i],[c,d]=polygon[j];
    if((b>z)!==(d>z) && x<(c-a)*(z-b)/(d-b)+a)inside=!inside;
  }
  return inside;
}
for(let i=0;i<24;i++)for(const time of [0,29]){
  const p=pedestrianPose(time,i);
  assert.ok(!roads.some(r=>onRoad(p.x,p.z,r)),`Waiting pedestrian ${i} stands on the carriageway`);
}
console.log('PASS: waiting pedestrians stand off the carriageway at both ends.');

// Ground-level landmark bodies must not occupy any of the road arms.
for(const b of landmarks)for(const dx of [-.5,0,.5])for(const dz of [-.5,0,.5]){
  const w=b.name.startsWith('MAGNET')?10.5:b.w,d=b.name.startsWith('MAGNET')?10.5:b.d;
  assert.ok(!roads.some(r=>onRoad(b.x+w*dx,b.z+d*dz,r)),`${b.name} occupies a road arm`);
}
console.log('PASS: landmark ground footprints clear the road arms.');

// Continuous ground → lift → deck → lift journeys, including both reversal boundaries.
for(let i=0;i<12;i++){
  for(let t=0;t<96;t+=.1){
    const p=publicJourney(t,i),next=publicJourney(t+.0001,i);
    assert.ok(Number.isFinite(p.x+p.y+p.z));
    assert.ok(p.y>=.46-1e-8 && p.y<=10+1e-8);
    assert.ok(Math.hypot(next.x-p.x,next.y-p.y,next.z-p.z)<.001,'Public journey jumps at a joint');
    if(p.walking)assert.ok(p.y>=6,'Walker below public deck');
    // Public decks must stay well below aircraft and clear the delivery column.
    assert.ok(Math.abs(p.x-DOCK.x)>2.9 || Math.abs(p.z-DOCK.z)>2.9);
  }
}
publicRoutes.forEach((route,i)=>{
  for(const [u,index] of [[0,0],[1,route.points.length-1]]){
    const p=publicPoint(i,u),point=route.points[index];
    assert.ok(Math.hypot(p.x-point[0],p.y-point[1],p.z-point[2])<1e-8);
  }
});
for(const route of airRoutes())for(let i=0;i<=500;i++){
  const p=route.getPointAt(i/500);
  for(const b of upperLinks)assert.ok(!(Math.abs(p.x-b.x)<b.w/2+2.3 && Math.abs(p.z-b.z)<b.d/2+2.3 && Math.abs(p.y-b.y)<b.h/2+1),'Aircraft intersects occupied upper link');
}
console.log('PASS: public lift/deck continuity, architectural endpoints, cargo separation and upper-link air clearance.');
