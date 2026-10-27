// Explain A3 misses without changing the measured first-hit gate or the subject definition.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,PerspectiveCamera,Ray,Raycaster,Vector2,Vector3} from 'three';
const folder=process.env.CITY2127_EVIDENCE_DIR??'artifacts/closeup-polish/S0/baseline';
function cause(ray,bounds,distance) {
  const entry=ray.intersectBox(bounds,new Vector3());
  if(!entry)return 'projected-box gap (ray misses world AABB)';
  const far=new Ray(ray.at(1e6,new Vector3()),ray.direction.clone().negate()).intersectBox(bounds,new Vector3());
  assert.ok(far,'subject is inside the one-million-metre analysis range');
  const a=entry.distanceTo(ray.origin),b=far.distanceTo(ray.origin);
  if(distance===null||distance>Math.max(a,b)+.01)return 'gap through entire world AABB';
  if(distance<Math.min(a,b)-.01)return 'foreground before world AABB';
  return 'other geometry inside world AABB (ambiguous)';
}
const cube=new Box3(new Vector3(-1,-1,-1),new Vector3(1,1,1)),test=new Ray(new Vector3(0,0,5),new Vector3(0,0,-1));
assert.equal(cause(test,cube,1),'foreground before world AABB');
assert.equal(cause(test,cube,10),'gap through entire world AABB');
assert.equal(cause(test,cube,null),'gap through entire world AABB');
assert.equal(cause(test,cube,5),'other geometry inside world AABB (ambiguous)');
assert.equal(cause(new Ray(new Vector3(4,0,5),new Vector3(0,0,-1)),cube,null),'projected-box gap (ray misses world AABB)');
const capture=JSON.parse(readFileSync(`${folder}/capture.json`,'utf8')),rows=[];
for(const row of capture.rows) {
  const frame=row.frame;if(!frame?.box||!frame.worldBounds)continue;
  const camera=new PerspectiveCamera(42,1920/1080,.1,10000);camera.position.fromArray(row.pose.position);camera.lookAt(new Vector3(...row.pose.target));camera.updateMatrixWorld();
  const bounds=new Box3(new Vector3(...frame.worldBounds.min),new Vector3(...frame.worldBounds.max)),ray=new Raycaster();
  const samples=frame.samples.map(sample=>{ray.setFromCamera(new Vector2(sample.x*2-1,1-sample.y*2),camera);return {...sample,cause:sample.hit?'subject':cause(ray.ray,bounds,sample.distance)};});
  assert.equal(samples.filter(s=>s.cause==='subject').length,frame.hits);
  rows.push({id:row.id,state:row.state,hour:row.hour,samples});
}
writeFileSync(`${folder}/../occlusion-causes.json`,JSON.stringify({complete:capture.rows.length===98,measuredStates:capture.rows.length,method:'Reconstruct the authored42deg/16:9 camera rays. Compare saved first-hit distance with world-AABB entry/exit; 1cm margin. Interior non-subject geometry remains ambiguous. This does not change A3 and does not model shaders/alpha.',rows},null,2)+'\n');
console.log('PASS: known-ray self-checks; explained',rows.length,'projectable states without changing A3.');
