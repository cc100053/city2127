import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldState } from './presets.ts';
import { guideway, promenades, waterLoop, ferryLane, airLoop, sphereApproach, SPHERE_DOCK, bayCruisers, sweepway, streets, shoreLane, interchangeApproach, interchangeBoatLane, INTERCHANGE, midDecks, gardenDecks } from './layout.ts';

const ease=(t:number)=>T.MathUtils.smoothstep(t,0,1);
const curve=(points:readonly (readonly [number,number,number])[],closed=false)=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal');
/** Every actor path in the Odaiba scene, in metres. */
export function routes() {
  return {guideway:curve(guideway),promenades:promenades.map(p=>curve(p)),water:curve(waterLoop,true),ferry:curve(ferryLane),air:curve(airLoop,true),approach:curve(sphereApproach),sweep:curve(sweepway),
    shore:curve(shoreLane,true),ixApproach:curve(interchangeApproach),ixBoat:curve(interchangeBoatLane),decks:[...midDecks,...gardenDecks].map(p=>curve(p)),streets:streets.map(p=>curve(p))};
}
/** 0→1→0 over `period` seconds: out-and-back routes reverse instead of jumping. */
const pingPong=(time:number,period:number,offset=0)=>{const p=((time/period+offset)%2+2)%2;return {u:p<1?p:2-p,forward:p<1};};

export const TRAINS=2, CARS=6, CAR_GAP=10;
/** Water taxis on the beach loop (plus one ferry), drawn at 1.7× so they read from the hero pose. */
export const BOATS=7, BOAT_SCALE=1.7;
/** Guideway pods: two six-car trains shuttle end to end; the lead car always faces the direction of travel. */
export function podPose(time:number,train:number,car:number,length:number) {
  const margin=CARS*CAR_GAP/length,{u,forward}=pingPong(time,70,train);
  const head=margin+u*(1-2*margin);
  return {u:head+(forward?-1:1)*car*CAR_GAP/length,forward};
}
export const WALKERS=120, AIR_SCALE=5;
const MAX_WALKERS=400, DOOR_WALKERS=120, ROBOTS=14, FORECOURT_GROUPS=20, MAX_TRAINS=4, LOOP_AIRCRAFT=30;
/** Aircraft slot: groups 0..9 spread evenly, even groups on the regional district loop, odd on the city shore lane; slots 10+ join a
 * group as wingmen `k` × PLATOON m behind, so platoons form only as automation fills the fleet. */
export const PLATOON=34;
export function aircraftSlot(index:number) {
  const group=index%10;
  return {lane:group%2 as 0|1,phase:Math.floor(group/2)/5+(group%2)*.1,wingman:Math.floor(index/10)};
}
/** Autonomous pods replace human-led winged craft craft by craft as automation rises (0 → all winged, 1 → all pods: 15/50/85 % between).
 * Settled levels are 0, .156, .5, .844 and 1 (ports 0–6), so each craft switches midway between two of them and a settled city never
 * shows a half-faded craft; the berth shuttles switch between mixed and high. */
const POD_SWITCH=[.078,.328,.672,.922];
export const podSwitch=(level:number,at:number)=>T.MathUtils.smoothstep(level,at-.05,at+.05);
export const podShare=(level:number,index:number)=>{const q=(index*.618)%1;return podSwitch(level,POD_SWITCH[q<.15?0:q<.5?1:q<.85?2:3]);};
/** Walkers: four of five stroll the seaside promenades (even east, odd west), every fifth a mid-level skyway deck. */
export const walkerRoute=(index:number)=>index%5<4?index%2:2+Math.floor(index/5)%4;
/** Interchange transfers: even people step off the boat and walk ashore, odd walk out, queue at the head and board while it is docked. */
export const TRANSFERS=16;
/** Resting guide-strip scale on the two loops (a passing craft lights strips to 3–10). */
export const GUIDE_FLOOR=.7;
/** Human-led and autonomous service both retain a complete transit system. Ports 1..5 span the readable alternatives. */
export function automationActivity(share:number) {
  const level=T.MathUtils.smoothstep(share,1/6,5/6);
  // Drop Float32 endpoint noise so integer capacities do not expose a phantom extra actor.
  const count=(n:number)=>Math.round(n*1e6)/1e6;
  return {level,aircraft:count(2+28*level),pods:count(CARS*(2+2*level)),walkers:count(WALKERS+280*(1-level))};
}
/** Stable 0..1 hash per actor `index` and salt `k`. */
export const hash=(index:number,k=0)=>{const v=Math.sin(index*12.9898+k*78.233)*43758.5453;return v-Math.floor(v);};
/** Walkers move in parties: per block of six slots, one alone, a pair and a trio whose third is a child. Members share the leader's pose;
 * `id` numbers the parties for `walkerRoute`. */
export function walkerParty(index:number) {
  const k=index%6,[slot,size]=k===0?[0,1]:k<3?[k-1,2]:[k-3,3];
  return {leader:index-slot,id:Math.floor(index/6)*3+size-1,slot,size,child:size===3&&slot===2};
}
/** Walkers (route: `walkerRoute`, `length` m): one-way trips at each person's own pace, keeping right for their direction, then a rest
 * out of sight; trips begin and end at the route's ends (DECKS, the park, Hilton, deck landings), so people come from and go into
 * buildings. A third of lone walkers jog; two in five others stop once at a viewpoint for DWELL s (`dwell` eases 0→1→0 so the figure
 * can turn to the sea). `visible` fades over the first and last 4 m; each trip picks its direction afresh. */
const DWELL=40;
export function walkerPose(time:number,index:number,length=240) {
  const jog=index%6===0&&hash(index,1)<.33,speed=jog?2.3+.5*hash(index,2):.9+.55*hash(index,2),stops=!jog&&hash(index,3)<.4;
  const walk=length/speed,cycle=walk+(stops?DWELL:0)+8+40*hash(index,4),clock=time+hash(index,5)*cycle;
  const trip=Math.floor(clock/cycle),s=clock-trip*cycle,forward=hash(index*31+trip,6)<.5;
  // One viewpoint per walker (.3–.7 of the way), reached `start` s into the trip.
  const start=stops?(.3+.4*hash(index,7))*walk:Infinity,walked=Math.min(walk,s<start?s:s<start+DWELL?start:s-DWELL);
  const dwell=stops?T.MathUtils.clamp(Math.min(s-start,start+DWELL-s)/4,0,1):0,d=walked*speed;
  const visible=s>=walk+(stops?DWELL:0)?0:T.MathUtils.clamp(d/4,0,1)*T.MathUtils.clamp((length-d)/4,0,1);
  return {u:forward?d/length:1-d/length,forward,lane:(forward?1:-1)*(1+(index%3)*.45),phase:time*speed*5.5+index,stride:Math.sin(time*speed*5.5+index)*(1-dwell),dwell,visible,speed,jog,stops};
}
/** Interchange transfer `index` at `time`: `d` metres out along the pier (head at INTERCHANGE.pier), `side` across it, `visible` 0..1
 * (fading only at the shore end and at the boat), on the boat's 40 s `dockMotion` cycle. */
export function transferPose(time:number,index:number) {
  const k=index>>1,t=((time%40)+40)%40,pier=INTERCHANGE.pier,fade=(x:number)=>T.MathUtils.clamp(x,0,1);
  if(index%2===0){
    // Arrivals step off at 16 s + 1.2 s each and walk 36 s to the shore, overlapping the next docking.
    const s=((t-16-k*1.2)%40+40)%40;
    return s<36?{d:pier+2-(pier+4)*s/36,side:-2.2,visible:fade(s)*fade(36-s),moving:true}:{d:-2,side:-2.2,visible:0,moving:false};
  }
  // Departures walk out (32 s), queue 0.8 m apart behind the head, then step aboard at 1.6 m/s, the last stepping on at 16 s + 1.2 s each.
  const queue=pier-1-k*.8,step=(pier+2-queue)/1.6,s=((t-16-k*1.2+38)%40+40)%40;
  if(s<32)return {d:-2+(queue+2)*s/32,side:2.2,visible:fade(s),moving:true};
  if(s<38-step)return {d:queue,side:2.2,visible:1,moving:false};
  if(s<38){const f=(s-38+step)/step;return {d:queue+(pier+1-queue)*f,side:2.2-.8*f,visible:fade(38-s),moving:true};}
  return {d:-2,side:2.2,visible:0,moving:false};
}
/** Sphere shuttle: a 40 s cycle — approach from the bay, settle onto the berth, lift off and return. */
export function dockMotion(time:number) {
  const t=((time%40)+40)%40;
  const u=t<14?ease(t/14):t<26?1:1-ease((t-26)/14);
  // Leaving, the craft pivots to its outbound heading over 4 s instead of flipping: `turn` is added to the outbound yaw.
  return {u,settle:ease((t-14)/3)*(1-ease((t-23)/3)),visible:ease(t/2)*(1-ease((t-38)/2)),docked:t>=14&&t<26,leaving:t>=26,turn:t>=26?Math.PI*(1-ease((t-26)/4)):0};
}
export function guideStrength(sample:number,head:number,closed:boolean) {
  let d=sample-head;
  if(closed)d=((d+.5)%1+1)%1-.5;
  return Math.max(0,1-Math.abs(d-.022)/.07);
}

function material(color:string,emissive=false) {
  return new T.MeshStandardMaterial({color,roughness:.65,emissive:emissive?color:0,emissiveIntensity:emissive?1.3:0});
}
const shell=material('#f4f3ee'),glass=material('#284f65'),mint=material('#74dace',true),coral=material('#e7a097');
/** Wearable collar light on every person (promenade, deck, interchange and plaza crowds): a dark band by day, lit at night. */
const collar=new T.MeshStandardMaterial({color:'#3a4a52',emissive:'#cdeeff',emissiveIntensity:0,roughness:.4});
type Part={geometry:T.BufferGeometry;material:T.Material};
function part(size:[number,number,number],at:[number,number,number],mat:T.Material,radius=.15):Part {
  return {geometry:new RoundedBoxGeometry(...size,2,Math.min(radius,...size.map(n=>n/2))).translate(...at),material:mat};
}
/** Wake in boat units (bow +Z, stern at -5.5): two diverging arms and a centre wash, alpha fading to the far end. */
function wake() {
  const position:number[]=[],color:number[]=[];
  const strip=(x0:number,x1:number,w0:number,w1:number,a0:number)=>{
    for(let i=0;i<12;i++){
      const u=i/12,v=(i+1)/12,z=(t:number)=>-5.5-t*30,x=(t:number)=>x0+(x1-x0)*t,w=(t:number)=>w0+(w1-w0)*t,a=(t:number)=>a0*(1-t)**1.6;
      const q=[[x(u)-w(u),z(u),a(u)],[x(u)+w(u),z(u),a(u)],[x(v)+w(v),z(v),a(v)],[x(v)-w(v),z(v),a(v)]];
      for(const k of [0,1,2,0,2,3]){position.push(q[k][0],-.05,q[k][1]);color.push(1,1,1,q[k][2]);}
    }
  };
  strip(-1.2,-6,.22,.6,.45);strip(1.2,6,.22,.6,.45);strip(0,0,.9,2.2,.5);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.setAttribute('color',new T.Float32BufferAttribute(color,4));
  return geometry;
}
function wing(mat:T.Material=shell):Part {
  const shape=new T.Shape();shape.moveTo(-2.2,-.8);shape.lineTo(-.5,.8);shape.lineTo(.5,.8);shape.lineTo(2.2,-.8);shape.lineTo(.55,-.4);shape.lineTo(-.55,-.4);shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false});geometry.rotateX(-Math.PI/2);return {geometry,material:mat};
}
function fleet(scene:T.Object3D,parts:Part[],count:number,name:string,shadow=true) {
  const batches=new Map<T.Material,T.BufferGeometry[]>();
  parts.forEach(p=>{const list=batches.get(p.material)??[];list.push(p.geometry.index?p.geometry.toNonIndexed():p.geometry);batches.set(p.material,list);});
  const meshes=[...batches].map(([mat,geometries])=>{
    const mesh=new T.InstancedMesh(mergeGeometries(geometries),mat,count);
    mesh.name=name;mesh.castShadow=shadow;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);return mesh;
  });
  return {
    set(index:number,pose:T.Object3D){pose.updateMatrix();meshes.forEach(m=>m.setMatrixAt(index,pose.matrix));},
    /** Per-actor colour for the parts drawn with `mat` (a white base the instance colour multiplies); set once at build. */
    tint(index:number,mat:T.Material,color:T.ColorRepresentation){meshes.forEach(m=>{if(m.material===mat)m.setColorAt(index,new T.Color(color));});},
    flush(){meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);},
    show(visible:boolean){meshes.forEach(m=>m.visible=visible);},
    meshes,
  };
}

/** Gait per person (`gait` instance attribute, see `pedestrians`): x stride phase (rad), y swing (rad), z carried item (0 none,
 * 1 backpack, 2 shoulder bag), w seated 0..1. Legs swing about the hip and arms about the shoulder in the vertex shader, so a walk
 * costs no extra draws. Seated, the thigh folds forward at the hip (.58) and the shin back down at the knee (.33), so the figure sits
 * with its thighs level and shins hanging. */
function articulate(mat:T.Material,body:string) {
  mat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 gait;\nvec3 swingX(vec3 p,float pivot,float a){p.y-=pivot;return vec3(p.x,p.y*cos(a)-p.z*sin(a),p.y*sin(a)+p.z*cos(a))+vec3(0.,pivot,0.);}')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n'+body);
  };
  mat.customProgramCacheKey=()=>'gait-'+body;
}
const LEGS='float side=sign(position.x);transformed=swingX(transformed,.33,smoothstep(.36,.3,position.y)*1.35*gait.w);transformed=swingX(transformed,.58,mix(sin(gait.x)*gait.y*side,-1.35,gait.w));';
const ARMS='float side=sign(position.x);transformed=swingX(transformed,1.25,-sin(gait.x)*gait.y*.8*side*(1.-gait.w));';
// Backpack behind the torso (z < -.12), bag at the right hip (x > .25): keep only the item this person carries; sitters set it down.
const GEAR='transformed*=gait.w>.5||gait.z<.5?0.:gait.z<1.5?step(position.z,-.12):step(.25,position.x);';
/** Shared capsule figures and palette, used by promenade, doorway, resting and plaza crowds. `gait(i, phase, swing, item, seated)`
 * sets one person's walk; items are fixed per slot at build. */
export function pedestrians(scene:T.Object3D,count:number,name:string) {
  // People (several hundred, so modest segment counts): capsule torso and limbs, round head and hair; clothes, skin and hair vary per person from a muted palette (no saffron).
  const coats=material('#ffffff'),sleeves=material('#ffffff'),skin=material('#ffffff'),hair=material('#ffffff'),trousers=material('#ffffff'),gear=material('#ffffff');
  articulate(trousers,LEGS);articulate(sleeves,ARMS);articulate(gear,GEAR);
  const capsule=(r:number,length:number,at:[number,number,number],mat:T.Material,depth=1):Part=>({geometry:new T.CapsuleGeometry(r,length,3,7).scale(1,1,depth).translate(...at),material:mat});
  const people=fleet(scene,[
    capsule(.22,.36,[0,.96,0],coats,.72),{geometry:new T.SphereGeometry(.15,10,7).translate(0,1.5,0),material:skin},
    {geometry:new T.SphereGeometry(.162,10,4,0,Math.PI*2,0,Math.PI*.55).translate(0,1.52,-.012),material:hair},
    capsule(.07,.42,[-.29,.98,0],sleeves),capsule(.07,.42,[.29,.98,0],sleeves),
    {geometry:new T.CapsuleGeometry(.08,.4,3,6).translate(-.13,.33,0),material:trousers},{geometry:new T.CapsuleGeometry(.08,.4,3,6).translate(.13,.33,0),material:trousers},
    {geometry:new T.TorusGeometry(.2,.06,4,12).rotateX(Math.PI/2).translate(0,1.34,0),material:collar},
    part([.3,.38,.15],[0,1.02,-.25],gear,.05),part([.1,.3,.26],[.33,.78,0],gear,.04),
  ],count,name);
  const gait=new T.InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(T.DynamicDrawUsage);
  people.meshes.forEach(m=>m.geometry.setAttribute('gait',gait));
  const clothes=['#4f6f7c','#b5836f','#6d8a5f','#2f3e48','#c9b48a','#8c6f8f','#3f5a52','#e4e1d8'],skins=['#e8cdb0','#c99e7c','#8d6348','#f0d9c2'],hairs=['#2f2a27','#5a4033','#1d2226','#b9a58c','#d8d8d4'],bottoms=['#3d4a52','#2b3036','#6b6258','#c8c0b0','#45524a','#1f2a3a'],packs=['#2f3a40','#8c4a3a','#c9b48a','#4f6f7c','#e4e1d8'];
  for(let i=0;i<count;i++){
    const coat=clothes[(i*5)%clothes.length];people.tint(i,coats,coat);people.tint(i,sleeves,coat);people.tint(i,skin,skins[(i*3)%skins.length]);people.tint(i,hair,hairs[(i*7)%hairs.length]);
    people.tint(i,trousers,bottoms[(i*11)%bottoms.length]);people.tint(i,gear,packs[(i*13)%packs.length]);
    // A quarter carry a backpack, a fifth a shoulder bag.
    const item=hash(i,19);gait.setZ(i,item<.25?1:item<.45?2:0);
  }
  return {...people,
    gait(index:number,phase:number,swing:number,seated=0){gait.setX(index,phase);gait.setY(index,swing);gait.setW(index,seated);},
    flush(){people.flush();gait.needsUpdate=true;}};
}

/** Doorway trips in front of the landmarks: [door, forecourt, forecourt, door] at ground level, published once each landmark loads. */
const doorTrips:T.Vector3[][]=[],doorSpots:T.Vector3[]=[],doorPoints:T.Vector3[]=[];
const PAVED=new Set(['sidewalk','plaza']);
// Landmark pads overlap the avenues in places (Aqua City's north side), so forecourt walks also keep clear of every carriageway.
let streetSamples:{p:T.Vector3;clear:number}[]|null=null;
const offStreet=(p:T.Vector3)=>(streetSamples??=routes().streets.flatMap((c,r)=>c.getSpacedPoints(400).map(q=>({p:q,clear:r?5:4}))))
  .every(s=>Math.hypot(s.p.x-p.x,s.p.z-p.z)>s.clear);
/** Finds ground-floor facade points by casting inward from all four sides of `model`'s bounds, and joins neighbouring doors on one face
 * with a short walk 4–10 m out across the paved pad (`ground`: the environment). Each walk is raycast clear of the building. */
export function publishDoorways(model:T.Object3D,ground:T.Object3D) {
  model.updateMatrixWorld(true);ground.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(model),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),dir=new T.Vector3();
  const paved=(p:T.Vector3)=>{
    ray.set(new T.Vector3(p.x,30,p.z),down);ray.far=40;const hit=ray.intersectObject(ground,true)[0];
    const mat=hit&&(hit.object as T.Mesh).material;return !!hit&&hit.point.y<.6&&!Array.isArray(mat)&&PAVED.has((mat as T.Material).name);
  };
  const clear=(a:T.Vector3,b:T.Vector3)=>{dir.subVectors(b,a);const far=dir.length();ray.set(a,dir.normalize());ray.far=far;return ray.intersectObject(model,true).length===0;};
  const size=box.getSize(new T.Vector3());
  for(const [axis,sign] of [['x',1],['x',-1],['z',1],['z',-1]] as const){
    const across=axis==='x'?'z':'x',doors:{at:T.Vector3;out:T.Vector3}[]=[];
    for(let t=box.min[across]+4;t<box.max[across]-4;t+=9){
      const origin=new T.Vector3();origin[axis]=sign>0?box.max[axis]+3:box.min[axis]-3;origin[across]=t;origin.y=1.2;
      ray.set(origin,new T.Vector3().setComponent(axis==='x'?0:2,-sign));ray.far=size[axis]+6;
      const hit=ray.intersectObject(model,true)[0];if(!hit?.face)continue;
      const out=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).setY(0);
      if(out.lengthSq()<.25||out.normalize()[axis]*sign<.4)continue;
      doors.push({at:hit.point.clone().addScaledVector(out,.4).setY(0),out});
      // Every ground-floor door (forecourt walk or not) can take a drop-off passenger.
      if(!doorPoints.some(d=>d.distanceTo(doors[doors.length-1].at)<4))doorPoints.push(doors[doors.length-1].at);
    }
    for(let k=1;k<doors.length;k++){
      const a=doors[k-1],b=doors[k],gap=a.at.distanceTo(b.at),reach=4+6*hash(doorTrips.length,9);
      // One face only (a corner's two normals diverge), and once: the x and z scans of a rotated landmark find the same doors.
      if(gap<8||gap>40||a.out.dot(b.out)<.9||doorTrips.some(trip=>trip[0].distanceTo(a.at)<4))continue;
      const fa=a.at.clone().addScaledVector(a.out,reach),fb=b.at.clone().addScaledVector(b.out,reach),lift=new T.Vector3(0,1.2,0);
      if(![fa,fb,fa.clone().lerp(fb,.5)].every(p=>paved(p)&&offStreet(p))||!clear(fa.clone().add(lift),fb.clone().add(lift))||!clear(a.at.clone().add(lift),fa.clone().add(lift))||!clear(b.at.clone().add(lift),fb.clone().add(lift)))continue;
      doorTrips.push([a.at,fa,fb,b.at]);
      // Every other forecourt also holds a standing group 3.5 m beyond the walk, on paving and in sight of the doors.
      const spot=fa.clone().lerp(fb,.5).addScaledVector(a.out.clone().add(b.out).normalize(),3.5);
      if(doorTrips.length%2&&paved(spot)&&offStreet(spot)&&clear(spot.clone().add(lift),fa.clone().lerp(fb,.5).add(lift)))doorSpots.push(spot);
    }
  }
}
/** Doorway walker `index` on a trip `length` m long: steps out of one door, crosses the forecourt and goes in at the next, then stays
 * inside 10–50 s. `d` metres along the trip (either way round), `visible` fading over the first and last 1.5 m. */
export function doorwayPose(time:number,index:number,length:number) {
  const speed=.9+.5*hash(index,10),walk=length/speed,cycle=walk+10+40*hash(index,11),clock=time+hash(index,12)*cycle;
  const trip=Math.floor(clock/cycle),s=clock-trip*cycle,d=Math.min(s,walk)*speed,reverse=hash(index*17+trip,13)<.5;
  return {d:reverse?length-d:d,reverse,visible:s>walk?0:T.MathUtils.clamp(d/1.5,0,1)*T.MathUtils.clamp((length-d)/1.5,0,1),phase:time*speed*5.5+index};
}
/** Street cars per lane on each avenue: `cars` spread round the lane's loop (the avenue plus 40 m out of sight) at irregular gaps of
 * 0.45–1.6× the mean, moving at one lane speed (8–11 m/s with a shared ±15 % surge), so they never close up. They fade in and out at the
 * avenue ends. Lane 0 drives with the route, lane 1 against it; Japan keeps left. Returns `d` metres along the route. */
export const STREET_GAP=27;
/** A lane car's travel `x` from its lane's start (-20 … length + 20, the ends out of sight) and its lap count. */
function laneTravel(time:number,road:number,lane:number,car:number,cars:number,length:number) {
  const id=road*2+lane,speed=8+3*hash(id,14),span=length+40,weight=(k:number)=>1+2.5*hash(id*97+k,15);
  let before=0,total=0;for(let k=0;k<cars;k++){if(k<car)before+=weight(k);total+=weight(k);}
  const travelled=speed*(time+3*Math.sin(time*.05+id*1.7))-span*before/total,lap=Math.floor(travelled/span);
  return {x:travelled-lap*span-20,lap,speed,span};
}
const fadeEnds=(x:number,length:number)=>T.MathUtils.clamp(x/12,0,1)*T.MathUtils.clamp((length-x)/12,0,1);
export function streetCarPose(time:number,road:number,lane:number,car:number,cars:number,length:number) {
  const {x}=laneTravel(time,road,lane,car,cars,length);
  return {d:lane?length-x:x,visible:fadeEnds(x,length)};
}
/** Kerbside drop-off on the paved forecourt south of Aqua City, beside the guideway avenue's westbound lane: two cars, each stopping at
 * its own bay `stops` m along the lane, `bay` m beyond the lane centre. On even laps the car eases over SHIFT m into the bay at speed,
 * brakes over 2·BRAKE m of its slot's travel to rest BRAKE m on, waits a whole lap, and rejoins exactly its own slot as it comes round,
 * so it never meets another car. */
export const DROP_OFF={road:1,lane:1,cars:[0,14],stops:[330,380],bay:3.5} as const;
const BRAKE=12,SHIFT=35;
export function dropOffPose(time:number,car:number,cars:number,length:number,stop:number) {
  const {x,lap,speed,span}=laneTravel(time,DROP_OFF.road,DROP_OFF.lane,car,cars,length),even=lap%2===0,rest=stop+BRAKE;
  // `steer`: heading offset (rad, toward the kerb) while easing in or out, so the car turns rather than slides.
  let p=x,bay=0,parked=-1,leaving=-1,steer=0;
  const slope=(u:number)=>6*u*(1-u)*DROP_OFF.bay/SHIFT;
  if(even&&x>=stop-SHIFT&&x<stop){const u=(x-stop+SHIFT)/SHIFT;bay=ease(u);steer=Math.atan(slope(u));}
  else if(even&&x>=stop){const u=Math.min((x-stop)/(2*BRAKE),1);p=stop+BRAKE*(1-(1-u)**2);bay=1;if(u===1)parked=(x-stop-2*BRAKE)/speed;}
  else if(!even&&x<stop){p=rest;bay=1;parked=(x+span-stop-2*BRAKE)/speed;}
  else if(!even&&x<stop+2*BRAKE){const u=(x-stop)/(2*BRAKE);p=rest+BRAKE*u*u;bay=1;}
  else if(!even&&x<stop+2*BRAKE+SHIFT){const u=(x-stop-2*BRAKE)/SHIFT;bay=1-ease(u);steer=-Math.atan(slope(u));}
  // While parked: seconds since stopping and until it pulls away (passengers time their walks to these).
  if(parked>=0)leaving=(((stop-x)%span+span)%span)/speed;
  return {d:DROP_OFF.lane?length-p:p,bay,steer,visible:fadeEnds(p,length),parked,leaving};
}
/** City day rhythm, 0..1 per group at `hour` (undefined: everything at full, as the standalone and Meter tests expect). Most people out
 * in the evening, joggers at dawn and dusk, strollers toward sunset, children by day, sitters from late morning, delivery robots
 * busiest at night, cars at the two commutes. */
const RHYTHM={
  people:[[0,.15],[5,.12],[7,.6],[9,.8],[12,.85],[15,.8],[18,1],[20,.9],[22,.45],[24,.15]],
  joggers:[[0,.05],[5,.3],[6.5,1],[9,.6],[12,.2],[17,.5],[19,.8],[21,.3],[24,.05]],
  strollers:[[0,.1],[7,.3],[12,.6],[16,.9],[18,1],[20,.7],[23,.2],[24,.1]],
  children:[[0,0],[7,0],[9,.8],[17,1],[20,.4],[21,0],[24,0]],
  sitters:[[0,.1],[7,.3],[11,.8],[13,1],[18,1],[21,.6],[23,.2],[24,.1]],
  robots:[[0,1],[6,.8],[9,.5],[12,.7],[18,.6],[21,.9],[24,1]],
  cars:[[0,.25],[5,.2],[7,.9],[9,1],[12,.75],[17,.95],[19,1],[22,.5],[24,.25]],
} as const satisfies Record<string,readonly (readonly [number,number])[]>;
export function streetRhythm(hour?:number) {
  const at=(keys:readonly (readonly [number,number])[])=>{
    if(hour===undefined)return 1;
    const h=((hour%24)+24)%24;let k=1;while(k<keys.length-1&&h>keys[k][0])k++;
    const [h0,v0]=keys[k-1],[h1,v1]=keys[k];return v0+(v1-v0)*T.MathUtils.clamp((h-h0)/(h1-h0),0,1);
  };
  return Object.fromEntries(Object.entries(RHYTHM).map(([k,keys])=>[k,at(keys)])) as Record<keyof typeof RHYTHM,number>;
}
/** Promenade benches every 24 m on the seaward edge (3.1 m out, clear of walker lanes ≤ 2.6 m), two seats each; between each pair of
 * benches a couple stands at the rail. `u` along the promenade route. */
export const BENCH_STEP=24, BENCH_OUT=3.1;
export function promenadeBenches(lengths:readonly number[]) {
  return lengths.flatMap((length,route)=>Array.from({length:Math.floor((length-16)/BENCH_STEP)},(_,k)=>({route,u:(12+k*BENCH_STEP)/length,rail:(24+k*BENCH_STEP)/length})));
}

/** Small service quadrotors match the parked district drones; four rotors share the trim batch. */
export function serviceDrones(scene:T.Object3D,count:number) {
  return fleet(scene,[{geometry:new T.SphereGeometry(1.4,12,8).scale(1.4,.6,1),material:glass},
    ...[[-1.8,-1.8],[1.8,-1.8],[-1.8,1.8],[1.8,1.8]].map(([x,z])=>({geometry:new T.CylinderGeometry(1,1,.12,12).translate(x,.3,z),material:shell}))],count,'service-drones');
}

/** Bounded, separated gathering lanes inside either open court design. */
export function plazaPose(time:number,index:number) {
  return {x:(index%6-2.5)*2+.4*Math.sin(time*.35+index),z:index<6?-11:11,yaw:Math.cos(time*.35+index)*.3};
}
/** One column per bay: 12 s descent, 12 s docked, 12 s ascent, 12 s hover; no wrap teleport. */
export function pavilionFlight(time:number,index:number) {
  const t=((time+index*7)%48+48)%48;
  return t<12?1-ease(t/12):t<24?0:t<36?ease((t-24)/12):1;
}


export function mobility(scene:T.Scene) {
  const path=routes(),guideLength=path.guideway.getLength();
  // Guideway pods (ART.md §7): rounded white cars with a glass band and a mint service line, 9 m long.
  const body=material('#ffffff');
  const podParts=()=>[part([2.7,2.6,9],[0,1.5,0],body,.6),part([2.76,.9,7.6],[0,2,0],glass,.3),part([2.8,.14,8],[0,.9,0],mint,.05),part([2.2,.12,.12],[0,1.3,4.5],coral,.05)];
  const pods=fleet(scene,podParts(),MAX_TRAINS*CARS,'guideway-pods');
  // 2127 white trains with a dark glass band (target v2), lightly warm/cool per train.
  for(let i=0;i<MAX_TRAINS*CARS;i++)pods.tint(i,body,i<CARS?'#f4f3ee':'#e9eef0');
  // Sweep train: four cars shuttling on the descending skyway, pitched with the deck.
  const SWEEP_CARS=4,SWEEP_SCALE=1.7,sweepLength=path.sweep.getLength(),sweepPods=fleet(scene,podParts(),SWEEP_CARS,'sweep-pods');
  for(let i=0;i<SWEEP_CARS;i++)sweepPods.tint(i,body,'#f6f5f1');
  // Walkers (promenades and mid-level decks) plus the interchange transfers after them.
  const people=pedestrians(scene,MAX_WALKERS+TRANSFERS,'promenade-walkers'),walks=[...path.promenades,...path.decks],walkLength=walks.map(c=>c.getLength());
  // Water taxis: 11 m white yachts with a glass cabin and a mint waterline.
  // White yacht hull with a pointed bow (plan in x/-z), a raised aft deck, a dark glass cabin band under a white roof.
  const plan=new T.Shape([[-1.8,5.5],[1.8,5.5],[1.8,-2],[0,-6.2],[-1.8,-2]].map(([x,y])=>new T.Vector2(x,y)));
  const hull=new T.ExtrudeGeometry(plan,{depth:1.3,bevelEnabled:true,bevelThickness:.15,bevelSize:.15,bevelSegments:2}).rotateX(-Math.PI/2).translate(0,-.2,0);
  // Slots: loop taxis, the ferry (BOATS), the interchange boat (BOATS+1), then the bay cruisers.
  const BOAT_SLOTS=BOATS+2+bayCruisers.length;
  const boats=fleet(scene,[{geometry:hull,material:shell},part([2.9,1.1,5.4],[0,1.55,-1],glass,.4),part([3,.3,5.8],[0,2.2,-1.1],shell,.15),part([3.7,.12,11.1],[0,.25,-.2],mint,.05),part([2.4,.12,.12],[0,1,5.5],coral,.05)],BOAT_SLOTS,'water-taxis');
  // Wakes: a fading V and prop wash trailing each taxi on the water (no shadow).
  const wakes=fleet(scene,[{geometry:wake(),material:new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false})}],BOAT_SLOTS,'water-taxi-wakes',false);
  // Human-led air taxis: 22 m winged craft. Slots: loop craft, then the sphere and interchange berth shuttles.
  const airShell=shell.clone(); airShell.emissive.set('#c1e9e4');
  const drones=fleet(scene,[wing(airShell),part([.8,.35,2.5],[0,.1,0],airShell,.15),part([.55,.2,1],[0,.34,.45],glass,.08),
    part([.6,.1,.16],[0,.11,-1.27],mint,.025),part([.09,.4,.65],[0,.32,-.8],glass,.02)],LOOP_AIRCRAFT+2,'air-taxis');
  // Autonomous pods: a rounded cabin on four ducted rotors, 17 m across; they take a winged craft's slot as automation rises (podShare).
  const airPods=fleet(scene,[part([1.5,.8,2.4],[0,.1,0],airShell,.35),part([1.56,.3,1.5],[0,.32,.25],glass,.12),part([1.2,.08,2],[0,-.3,0],mint,.03),
    ...[[-1.15,-.95],[1.15,-.95],[-1.15,.95],[1.15,.95]].map(([x,z])=>({geometry:new T.TorusGeometry(.55,.08,6,20).rotateX(Math.PI/2).translate(x,.15,z),material:airShell}))],LOOP_AIRCRAFT+2,'air-pods');
  // Doorway walkers step in and out of the landmarks (publishDoorways); street cars: 4.6 m autonomous cabs, every seventh a 7 m van.
  const doorPeople=pedestrians(scene,DOOR_WALKERS+2*DROP_OFF.cars.length,'doorway-walkers');
  // Delivery robots: 0.8 m rovers with a lit lid, on the doorway forecourts.
  const robots=fleet(scene,[part([.62,.5,.8],[0,.42,0],shell,.12),part([.5,.05,.5],[0,.68,0],mint,.02),part([.66,.16,.7],[0,.12,0],glass,.05)],ROBOTS,'delivery-robots');
  const carBody=material('#ffffff'),headlight=new T.MeshStandardMaterial({color:'#f4f6f2',emissive:'#fff6e0',emissiveIntensity:0,roughness:.3}),taillight=new T.MeshStandardMaterial({color:'#b85a50',emissive:'#ff4a3a',emissiveIntensity:0,roughness:.3});
  const streetLength=path.streets.map(c=>c.getLength()),streetCars=streetLength.map(length=>Math.round((length+40)/STREET_GAP)),carSlots=streetCars.reduce((n,c)=>n+2*c,0);
  const cars=fleet(scene,[part([1.85,1.1,4.6],[0,.75,0],carBody,.45),part([1.7,.6,2.6],[0,1.45,-.2],glass,.25),part([1.9,.1,4.3],[0,.45,0],mint,.04),
    part([1.5,.14,.08],[0,.95,2.3],headlight,.03),part([1.5,.14,.08],[0,.95,-2.3],taillight,.03)],carSlots,'street-cars');
  const carColors=['#f4f3ee','#e9eef0','#dfe4e2','#c9d3d0','#e8e0d0','#8fa8ad','#5f6f78','#2f3a40'];
  for(let i=0;i<carSlots;i++)cars.tint(i,carBody,carColors[Math.floor(hash(i,16)*carColors.length)]);
  const berthLight=new T.PointLight('#b9e2cf',0,60,2);berthLight.position.set(SPHERE_DOCK[0],SPHERE_DOCK[1]+4,SPHERE_DOCK[2]);scene.add(berthLight);
  const ixLight=new T.PointLight('#b9e2cf',0,45,2);ixLight.position.set(INTERCHANGE.mast[0],INTERCHANGE.deck+4,INTERCHANGE.mast[2]);scene.add(ixLight);
  const guideMaterial=new T.MeshBasicMaterial({color:new T.Color('#88d6d3').multiplyScalar(1.6)});
  // Guide strips on every corridor: district loop, sphere approach, shore lane, interchange approach (96 each).
  const airCurves=[path.air,path.approach,path.shore,path.ixApproach],closed=[true,false,true,false];
  const guides=fleet(scene,[part([.36,.1,2.1],[0,0,0],guideMaterial,.03)],airCurves.length*96,'air-corridor-guides');
  const samples=airCurves.map(route=>Array.from({length:96},(_,i)=>({p:route.getPointAt(i/96),t:route.getTangentAt(i/96)})));
  // Both loops fly at the district loop's original 0.004 laps/s ground speed.
  const lanes=[path.air,path.shore],laneLength=lanes.map(l=>l.getLength()),speed=.004*laneLength[0];
  const SLOTS=LOOP_AIRCRAFT+2,heads=new Float32Array(SLOTS),weights=new Float32Array(SLOTS),corridor=new Uint8Array(SLOTS);
  const pose=new T.Object3D();pose.rotation.order='YXZ';const p=new T.Vector3(),tangent=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3(0,1,0);
  const place=(route:T.Curve<T.Vector3>,u:number,reverse=false)=>{route.getPointAt(T.MathUtils.clamp(u,0,1),p);route.getTangentAt(T.MathUtils.clamp(u,0,1),tangent);if(reverse)tangent.negate();pose.position.copy(p);pose.rotation.set(0,Math.atan2(tangent.x,tangent.z),0);};
  const [seaX,seaZ]=[INTERCHANGE.shore[0]-INTERCHANGE.head[0],INTERCHANGE.shore[2]-INTERCHANGE.head[2]].map(v=>-v/INTERCHANGE.pier),seaYaw=Math.atan2(seaX,seaZ);
  const alongX=seaZ,alongZ=-seaX; // Westward along the shore, as in layout.ts.
  // Promenade benches face the sea with their backs landward; per bench four resting slots: two seats, then a couple at the rail beyond.
  const benches=promenadeBenches(walkLength.slice(0,2)),benchFleet=fleet(scene,[part([1.8,.08,.46],[0,.36,0],shell,.03),part([1.8,.4,.06],[0,.62,-.24],shell,.03),
    part([.08,.32,.42],[-.8,.16,0],glass,.02),part([.08,.32,.42],[.8,.16,0],glass,.02)],benches.length,'promenade-benches');
  const spots:{at:T.Vector3;yaw:number;seated:number}[]=[];
  benches.forEach((b,k)=>{
    for(const [u,out,rail] of [[b.u,BENCH_OUT,0],[b.rail,2.95,1]] as const){
      place(walks[b.route],u);side.crossVectors(up,tangent).normalize();
      const sea=Math.sign(side.x*seaX+side.z*seaZ)||1,yaw=Math.atan2(side.x*sea,side.z*sea),at=pose.position.clone().addScaledVector(side,sea*out);
      if(!rail){pose.position.copy(at);pose.rotation.set(0,yaw,0);benchFleet.set(k,pose);}
      // Sitters drop .10 m so the folded thighs (.08 m radius under the .58 m hip) rest on the .40 m seat top; the rail couple stand half
      // a metre apart, turned a little toward each other.
      for(const j of [-1,1])spots.push({at:at.clone().addScaledVector(tangent,j*(rail?.28:.45)).setY(rail?0:-.1),yaw:yaw-(rail?j*.35:0),seated:rail?0:1});
    }
  });benchFleet.flush();
  const resting=pedestrians(scene,spots.length+FORECOURT_GROUPS*3,'resting-people');
  /** Drop-off passengers: one steps out 2 s after the car parks and walks to the nearest landmark door; another walks out to arrive
   * 2 s before it leaves. Hidden when no door lies within 35 m. */
  const nearDoor=(at:T.Vector3)=>{let best:T.Vector3|null=null;for(const door of doorPoints)if(door.distanceTo(at)<35&&(!best||door.distanceTo(at)<best.distanceTo(at)))best=door;return best;};
  const passengers=(drop:number,car:ReturnType<typeof dropOffPose>,kerb:T.Vector3)=>{
    const door=car.parked>=0?nearDoor(kerb):null,walk=door?door.distanceTo(kerb)/1.2:0;
    for(const [j,t] of [[0,car.parked-2],[1,walk-(car.leaving-2)]] as const){
      const slot=DOOR_WALKERS+drop*2+j,f=T.MathUtils.clamp(t/walk,0,1),from=j?door:kerb,to=j?kerb:door;
      if(!door||!from||!to||t<0||t>walk){pose.scale.setScalar(0);doorPeople.set(slot,pose);continue;}
      pose.position.lerpVectors(from,to,f);pose.rotation.set(0,Math.atan2(to.x-from.x,to.z-from.z),0);
      pose.scale.setScalar(Math.min(1,f*walk*1.2,(1-f)*walk*1.2));doorPeople.set(slot,pose);doorPeople.gait(slot,t*6.6+slot,.45);
    }
  };
  /** Day-rhythm and crowd presence per actor: each is wholly on or off (a stable hash against the group's share, so the same people
   * come and go) and eases between the two, so nobody stays drawn shrunk when the hour or crowd is held. */
  let lastTime=NaN,fade=1;
  const gate=(count:number)=>{
    const level=new Float32Array(count).fill(-1);
    return (i:number,on:boolean)=>{const target=on?1:0;level[i]=level[i]<0?target:level[i]+T.MathUtils.clamp(target-level[i],-fade,fade);return ease(level[i]);};
  };
  const walkerGate=gate(MAX_WALKERS),doorGate=gate(DOOR_WALKERS),robotGate=gate(ROBOTS),restGate=gate(spots.length+FORECOURT_GROUPS*3),carGate=gate(carSlots);
  return (state:WorldState,time:number,automationShare?:number,night=0,hour?:number)=>{
    const activity=automationShare===undefined?null:automationActivity(automationShare),rhythm=streetRhythm(hour);
    // Presence eases over 1.5 s of animation time; a reset, snapshot or jump settles at once.
    fade=Number.isFinite(lastTime)&&time>lastTime?(time-lastTime)/1.5:1;lastTime=time;
    const amount=(count:number,index:number)=>T.MathUtils.clamp(count-index,0,1);
    mint.emissiveIntensity=.65+state.neon*1.8;
    airShell.emissiveIntensity=activity?activity.level*.85:0;
    collar.emissiveIntensity=night*4;
    headlight.emissiveIntensity=.2+night*4;taillight.emissiveIntensity=.15+night*3;
    for(let train=0;train<MAX_TRAINS;train++)for(let car=0;car<CARS;car++){
      const {u,forward}=podPose(time,train<2?train:train-1.5,car,guideLength);
      place(path.guideway,u,!forward);pose.scale.setScalar(activity?amount(activity.pods,train*CARS+car):train<TRAINS?T.MathUtils.smoothstep(state.traffic*.5+.5-train*.3,0,.1):0);pods.set(train*CARS+car,pose);
    }pods.flush();
    for(let car=0;car<SWEEP_CARS;car++){
      // Drawn at SWEEP_SCALE so the train reads at hero distance; the shortened length spaces the cars by the same factor.
      const {u,forward}=podPose(time+20,0,car,sweepLength/SWEEP_SCALE);
      place(path.sweep,u,!forward);pose.rotation.x=-Math.asin(T.MathUtils.clamp(tangent.y,-1,1));pose.scale.setScalar(SWEEP_SCALE*T.MathUtils.smoothstep(state.traffic*.5+.5,0,.1));sweepPods.set(car,pose);
    }sweepPods.flush();
    for(let i=0;i<MAX_WALKERS;i++){
      const party=walkerParty(i),route=walkerRoute(party.id),onDeck=route>1,w=walkerPose(time,party.leader,walkLength[route]);
      const share=party.size===3?rhythm.children:w.jog?rhythm.joggers:w.stops?rhythm.strollers:rhythm.people;
      const weight=walkerGate(i,(activity?true:i<WALKERS&&state.crowd*.8+.2>i/WALKERS)&&share>hash(party.leader,20))*(activity?amount(activity.walkers,i):1);
      place(walks[route],w.u,!w.forward);side.crossVectors(up,tangent).normalize();
      // Parties walk abreast; deck walkers keep to the 9 m deck's outer lanes, clear of the planted middle bed.
      const abreast=(party.slot-(party.size-1)/2)*.65,lane=onDeck?(w.forward?1:-1)*(3.5+(party.size===1?(i%2-.5)*.6:abreast)):w.lane+(w.forward?abreast:-abreast);
      pose.position.addScaledVector(side,-lane);pose.position.y+=Math.abs(w.stride)*.025*w.speed;
      // A stopped walker turns to face the bay.
      if(w.dwell>0)pose.rotation.y+=w.dwell*(((seaYaw-pose.rotation.y)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI);
      pose.rotation.z=w.stride*.03;pose.scale.setScalar(weight*w.visible*(party.child?.62:.93+.12*hash(i,8)));people.set(i,pose);
      people.gait(i,w.phase+party.slot*2.1,(w.jog?.8:.45)*(1-w.dwell));
    }
    for(let k=0;k<TRANSFERS;k++){
      const tp=transferPose(time,k);
      pose.position.set(INTERCHANGE.shore[0]+seaX*tp.d+alongX*tp.side,.5,INTERCHANGE.shore[2]+seaZ*tp.d+alongZ*tp.side);
      pose.rotation.set(0,k%2?seaYaw:seaYaw+Math.PI,tp.moving?Math.sin(time*6+k)*.03:0);pose.scale.setScalar(tp.visible);people.set(MAX_WALKERS+k,pose);
      people.gait(MAX_WALKERS+k,time*6+k,tp.moving?.45:0);
    }people.flush();
    const doorShare=activity?activity.walkers/MAX_WALKERS:T.MathUtils.clamp(state.crowd*.8+.2,0,1);
    for(let k=0;k<DOOR_WALKERS;k++){
      const trip=doorTrips[k%Math.max(doorTrips.length,1)];
      if(!trip){pose.scale.setScalar(0);doorPeople.set(k,pose);continue;}
      const legs=[trip[0].distanceTo(trip[1]),trip[1].distanceTo(trip[2]),trip[2].distanceTo(trip[3])],w=doorwayPose(time,k,legs[0]+legs[1]+legs[2]);
      let d=w.d,leg=0;while(leg<2&&d>legs[leg]){d-=legs[leg];leg++;}
      const a=trip[leg],b=trip[leg+1];pose.position.lerpVectors(a,b,Math.min(d/legs[leg],1));
      pose.rotation.set(0,Math.atan2(b.x-a.x,b.z-a.z)+(w.reverse?Math.PI:0),Math.sin(w.phase)*.03);
      pose.scale.setScalar(amount(doorShare*DOOR_WALKERS,k)*w.visible*doorGate(k,rhythm.people>hash(k,20))*(.93+.12*hash(k,8)));doorPeople.set(k,pose);doorPeople.gait(k,w.phase,.45);
    }
    for(let k=0;k<ROBOTS;k++){
      const trip=doorTrips[(k*5+3)%Math.max(doorTrips.length,1)];
      if(!trip){pose.scale.setScalar(0);robots.set(k,pose);continue;}
      const legs=[trip[0].distanceTo(trip[1]),trip[1].distanceTo(trip[2]),trip[2].distanceTo(trip[3])],w=doorwayPose(time,500+k,legs[0]+legs[1]+legs[2]);
      let d=w.d,leg=0;while(leg<2&&d>legs[leg]){d-=legs[leg];leg++;}
      const a=trip[leg],b=trip[leg+1];pose.position.lerpVectors(a,b,Math.min(d/legs[leg],1));
      pose.rotation.set(0,Math.atan2(b.x-a.x,b.z-a.z)+(w.reverse?Math.PI:0),0);pose.scale.setScalar(w.visible*robotGate(k,rhythm.robots>hash(k,24)));robots.set(k,pose);
    }robots.flush();
    // Resting people: bench sitters, rail couples, then forecourt groups of two or three facing each other; a slow sway of the head-turn.
    // The crowd level decides how many spots are taken, never how big the people are.
    const occupied=(k:number,share:number,key:number)=>restGate(k,Math.min(1,doorShare*1.4)*share>key);
    spots.forEach((spot,k)=>{
      pose.position.copy(spot.at);pose.rotation.set(0,spot.yaw+Math.sin(time*.3+k*1.7)*.12,0);
      pose.scale.setScalar(occupied(k,spot.seated?rhythm.sitters:rhythm.strollers,hash(k,21))*(.93+.12*hash(k,8)));resting.set(k,pose);resting.gait(k,0,0,spot.seated);
    });
    for(let g=0;g<FORECOURT_GROUPS;g++)for(let j=0;j<3;j++){
      const k=spots.length+g*3+j,spot=doorSpots[g],a=j*Math.PI*2/3+hash(g,25)*6.28;
      if(!spot||(j===2&&hash(g,26)<.4)){pose.scale.setScalar(0);resting.set(k,pose);continue;}
      pose.position.set(spot.x+Math.sin(a)*.65,0,spot.z+Math.cos(a)*.65);pose.rotation.set(0,a+Math.PI+Math.sin(time*.4+k)*.15,0);
      pose.scale.setScalar(occupied(k,rhythm.people,hash(g,27))*(.93+.12*hash(k,8)));resting.set(k,pose);resting.gait(k,0,0);
    }resting.flush();
    for(let r=0,slot=0;r<path.streets.length;r++)for(let lane=0;lane<2;lane++)for(let c=0;c<streetCars[r];c++,slot++){
      const drop=r===DROP_OFF.road&&lane===DROP_OFF.lane?(DROP_OFF.cars as readonly number[]).indexOf(c):-1;
      const car=drop<0?{...streetCarPose(time,r,lane,c,streetCars[r],streetLength[r]),bay:0,steer:0}:dropOffPose(time,c,streetCars[r],streetLength[r],DROP_OFF.stops[drop]);
      place(path.streets[r],car.d/streetLength[r],lane===1);side.crossVectors(up,tangent).normalize();
      pose.position.addScaledVector(side,(r?1.75:1.25)+car.bay*DROP_OFF.bay).y+=.1;pose.rotation.y+=car.steer;
      // Every seventh car is a 7 m van; traffic density and the commute rhythm thin the fleet (drop-off cars always run).
      const van=drop<0&&hash(slot,17)<.14,density=drop<0?carGate(slot,state.traffic*.6+.5>hash(slot,18)&&rhythm.cars>hash(slot,22)):1;
      pose.scale.set(1,van?1.3:1,van?1.55:1).multiplyScalar(car.visible*density);cars.set(slot,pose);
      if(drop>=0)passengers(drop,car as ReturnType<typeof dropOffPose>,pose.position.clone().addScaledVector(side,1.4).setY(0));
    }cars.flush();doorPeople.flush();
    for(let i=0;i<BOATS;i++){
      const u=(time*.009+i/BOATS)%1;place(path.water,u);pose.position.y+=Math.sin(time*1.3+i)*.08;pose.rotation.z=Math.sin(time*.9+i)*.02;
      pose.scale.setScalar(BOAT_SCALE*T.MathUtils.smoothstep(state.traffic*.6+.4-i/(BOATS+1),-.05,.05));boats.set(i,pose);pose.rotation.z=0;wakes.set(i,pose);
    }
    const ferry=pingPong(time,150);place(path.ferry,ferry.u,!ferry.forward);pose.scale.setScalar(BOAT_SCALE*(1-ease((ferry.u-.85)/.15)));boats.set(BOATS,pose);wakes.set(BOATS,pose);
    // Interchange boat: in from the bay on the boat's 40 s dock cycle, pivoting at the pier head before it leaves; no wake while berthed.
    const ixBoat=dockMotion(time);place(path.ixBoat,ixBoat.u,ixBoat.leaving);pose.rotation.y+=ixBoat.turn;pose.position.y+=Math.sin(time*1.3)*.05;
    pose.scale.setScalar(BOAT_SCALE*ixBoat.visible);boats.set(BOATS+1,pose);pose.scale.multiplyScalar(Math.max(1-ixBoat.settle,1e-4));wakes.set(BOATS+1,pose);
    // Bay cruisers: straight 300 m runs across the open bay, fading in and out at each end of the run.
    bayCruisers.forEach(([x,z,heading],i)=>{
      const d=((time*6+i*83)%300+300)%300,fade=ease(d/25)*ease((300-d)/25);
      pose.position.set(x+Math.sin(heading)*(d-150),-.6+Math.sin(time*1.1+i)*.08,z+Math.cos(heading)*(d-150));pose.rotation.set(0,heading,0);
      pose.scale.setScalar(1.35*fade);boats.set(BOATS+2+i,pose);wakes.set(BOATS+2+i,pose);
    });
    boats.flush();wakes.flush();
    for(let i=0;i<LOOP_AIRCRAFT;i++){
      const slot=aircraftSlot(i),length=laneLength[slot.lane];
      const t=activity?((time*speed-slot.wingman*PLATOON)/length+slot.phase+1e3)%1:(time*speed/length*(1+i%3*.375)+i/6)%1;
      const density=activity?amount(activity.aircraft,i):i<6?T.MathUtils.smoothstep(.2+state.traffic*.35-i/9,-.07,.07):0,pod=activity?podShare(activity.level,i):0;
      place(lanes[slot.lane],t);pose.rotation.z=Math.sin(time+i)*.035;
      pose.scale.setScalar(AIR_SCALE*density*(1-pod));drones.set(i,pose);pose.scale.setScalar(AIR_SCALE*density*pod);airPods.set(i,pose);
      heads[i]=t;weights[i]=density;corridor[i]=slot.lane?2:0;
    }
    // Berth shuttles: the sphere (40 s cycle) and the interchange mast (offset 20 s), pods once automation passes mixed.
    const berthPod=activity?podSwitch(activity.level,POD_SWITCH[2]):0;
    const berth=(index:number,route:T.Curve<T.Vector3>,dock:ReturnType<typeof dockMotion>,r:number)=>{
      place(route,dock.u,dock.leaving);pose.rotation.y+=dock.turn;pose.position.y-=dock.settle*6;
      pose.scale.setScalar(AIR_SCALE*dock.visible*(1-berthPod));drones.set(index,pose);pose.scale.setScalar(AIR_SCALE*dock.visible*berthPod);airPods.set(index,pose);
      heads[index]=dock.u;weights[index]=dock.visible*(dock.docked?0:1);corridor[index]=r;
    };
    const sphereDock=dockMotion(time),ixDock=dockMotion(time+20);
    berth(LOOP_AIRCRAFT,path.approach,sphereDock,1);berth(LOOP_AIRCRAFT+1,path.ixApproach,ixDock,3);drones.flush();airPods.flush();
    berthLight.intensity=4000*sphereDock.settle*(.4+state.neon*.6);ixLight.intensity=2000*ixDock.settle*(.4+state.neon*.6);
    for(let r=0;r<airCurves.length;r++)for(let j=0;j<96;j++){
      let strength=0;
      for(let i=0;i<SLOTS;i++)if(corridor[i]===r)strength=Math.max(strength,guideStrength(j/96,heads[i],closed[r])*weights[i]);
      // Loops keep a faint fixed-size dotted line between craft so the corridor reads as infrastructure, not empty sky.
      const sample=samples[r][j];pose.position.copy(sample.p).y-=2;pose.rotation.set(0,Math.atan2(sample.t.x,sample.t.z),0);
      pose.scale.setScalar(Math.max(strength*(closed[r]&&activity?3+activity.level*7:3),closed[r]?GUIDE_FLOOR:0));guides.set(r*96+j,pose);
    }guides.flush();
  };
}
