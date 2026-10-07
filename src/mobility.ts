import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldState } from './presets.ts';
import { guideway, guidewayTracks, promenades, waterLoop, ferryLane, airLoop, sphereApproach, SPHERE_DOCK, bayCruisers, sweepway, streets, shoreLane, interchangeApproach, interchangeBoatLane, INTERCHANGE, midDecks, gardenDecks } from './layout.ts';

const ease=(t:number)=>T.MathUtils.smoothstep(t,0,1);
const curve=(points:readonly (readonly [number,number,number])[],closed=false)=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal');
/** Every actor path in the Odaiba scene, in metres. */
export function routes() {
  return {guideway:curve(guideway),tracks:guidewayTracks.map(p=>curve(p)),promenades:promenades.map(p=>curve(p)),water:curve(waterLoop,true),ferry:curve(ferryLane),air:curve(airLoop,true),approach:curve(sphereApproach),sweep:curve(sweepway),
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
/** Guideway train `train` (0..`trains`-1 on its track) at `time`, car `car`: each one-way track (layout `guidewayTracks`) runs its trains
 * at TRAIN_SPEED, evenly spread round a loop of the track plus 300 m out of sight, so trains on a track never close up and the two
 * directions never share a beam. Cars trail the lead car CAR_GAP apart; `visible` fades over the 20 m at each track end, beyond the
 * district. `u` along the track. */
export const TRAIN_SPEED=12;
export function trainPose(time:number,train:number,trains:number,car:number,length:number) {
  const span=length+300,head=((time*TRAIN_SPEED+span*train/trains)%span+span)%span,at=head-car*CAR_GAP;
  return {u:T.MathUtils.clamp(at/length,0,1),visible:T.MathUtils.clamp(at/20,0,1)*T.MathUtils.clamp((length-at)/20,0,1)};
}
/** Boat timing. Periods are commensurate — loop taxis BOAT_GAP s apart, bay cruisers 40 s per 300 m run, the interchange boat's 40 s
 * dock cycle, the ferry's 320 s round trip — so the whole fleet repeats every WATER_PERIOD s, and WATER_PHASES (loop and ferry in s,
 * cruisers in metres along their run, one per `bayCruisers` entry) were searched so that 2.5 m of water stays around every hull
 * (tests/mobility.test.ts checks the whole period). */
export const BOAT_GAP=20, CRUISER_SPEED=7.5, WATER_PERIOD=320;
export const WATER_PHASES={loop:13.5,ferry:0,cruisers:[0,83,188,249,32,115,198,281,64,147,290,25,148,219,262,45,128,211,294,77,160,243,26,109,192]};
/** Hull half-extents (m) in plan before scaling: x across, z from stern (-) to bow (+). */
export const HULL={x:1.95,stern:-6.35,bow:5.65};
/** Every boat at `time`: the loop taxis (BOATS), the ferry, the interchange boat, then the bay cruisers. `scale` is the drawn scale
 * (0 hidden); `dock` is the interchange boat's `dockMotion`. */
export function boatPoses(time:number,path:Pick<ReturnType<typeof routes>,'water'|'ferry'|'ixBoat'>,phases=WATER_PHASES) {
  const p=new T.Vector3(),t=new T.Vector3(),wrap=(v:number)=>(v%1+1)%1;
  const at=(route:T.Curve<T.Vector3>,u:number,reverse=false)=>{route.getPointAt(u,p);route.getTangentAt(u,t);return {x:p.x,y:p.y,z:p.z,yaw:reverse?Math.atan2(-t.x,-t.z):Math.atan2(t.x,t.z)};};
  const loop=Array.from({length:BOATS},(_,i)=>({...at(path.water,wrap((time+phases.loop)/(BOAT_GAP*BOATS)+i/BOATS)),scale:BOAT_SCALE}));
  const f=pingPong(time+phases.ferry,160),dock=dockMotion(time),ix=at(path.ixBoat,dock.u,dock.leaving);
  const cruisers=bayCruisers.map(([x,z,heading],i)=>{
    const d=((time*CRUISER_SPEED+phases.cruisers[i])%300+300)%300;
    return {x:x+Math.sin(heading)*(d-150),y:-.6,z:z+Math.cos(heading)*(d-150),yaw:heading,scale:1.35*ease(d/25)*ease((300-d)/25)};
  });
  return [...loop,{...at(path.ferry,f.u,!f.forward),scale:BOAT_SCALE*(1-ease((f.u-.85)/.15))},{...ix,yaw:ix.yaw+dock.turn,scale:BOAT_SCALE*dock.visible,dock},...cruisers];
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
 * `id` numbers the parties for `walkerRoute`. Formation: a pair walks abreast 0.6 m apart; in a trio the child walks beside the leader
 * and the other adult 0.9 m behind, so every party is at most 0.6 m wide (`ext`: half the spread of member centres). `side` is metres
 * outward from the leader's lane, `along` metres ahead (followers drift a little); `file` is the single-file spacing for narrow decks,
 * `lineup` the order along a rail (kept from the formation, so nobody crosses another while lining up). */
export function walkerParty(index:number) {
  const k=index%6,[slot,size]=k===0?[0,1]:k<3?[k-1,2]:[k-3,3],child=size===3&&slot===2;
  const behind=size===3&&slot===1,side=size===1?0:slot===0?-.3:behind?0:.3,along=!slot?0:behind?-.9+(hash(index,30)-.5)*.3:hash(index,30)*.3;
  return {leader:index-slot,id:Math.floor(index/6)*3+size-1,slot,size,child,side,along,ext:size===1?0:.3,file:-[0,.8,1.6][slot],lineup:size===1?0:behind?-1.2:side*4/3};
}
/** One party (or doorway walker, or robot) on a shared path for `passingLanes`: `d` metres along the path, `dir` ±1 its travel along
 * it, `lane` metres right of the path for its direction, `ext` half its width between member centres, `front`/`back` how far its
 * members reach ahead of / behind `d` in its travel direction, `inner`..`outer` the lanes its members may use; `fixed` ones (stopping, veering to
 * a seat, halted) only push others. */
export type Mover={path:number;dir:number;d:number;lane:number;ext:number;front?:number;back?:number;inner:number;outer:number;fixed?:boolean};
/** Lanes that keep movers on one path from walking through each other: any two whose nearest members come within EASE m along the
 * path are pushed apart sideways until 0.65 m (shoulders clear) lies between those members, the push easing in to full at PASS m, so
 * passing and meeting become a smooth sidestep. Both share the step (a fixed one does not move) and nobody leaves their room, so
 * directions keep their sides. Where a crowd leaves no room to the side they also give way along the path, up to GIVE m either way
 * (`along`), so a jam queues instead. Returns each mover's lane and along offset (metres in its travel direction). */
const PASS=.5,EASE=1.8,GIVE=2.5;
export function passingLanes(movers:readonly Mover[]) {
  const x=Float32Array.from(movers,m=>m.dir*m.lane),o=new Float32Array(movers.length);
  const order=movers.map((_,k)=>k).sort((a,b)=>movers[a].path-movers[b].path||movers[a].d-movers[b].d);
  const clamp=(k:number)=>{const m=movers[k],lo=m.inner+m.ext,hi=Math.max(lo,m.outer-m.ext);x[k]=m.dir>0?T.MathUtils.clamp(x[k],lo,hi):T.MathUtils.clamp(x[k],-hi,-lo);o[k]=T.MathUtils.clamp(o[k],-GIVE,GIVE);};
  const reach=(r:number,g:number)=>r*(1-T.MathUtils.smoothstep(g,PASS,EASE));
  for(let pass=0;pass<8;pass++)for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++){
    const ka=order[i],kb=order[j],a=movers[ka],b=movers[kb];
    if(a.path!==b.path||b.d-a.d>EASE+2*GIVE+2)break;
    if(a.fixed&&b.fixed)continue;
    const r=a.ext+b.ext+.65,pa=a.fixed?0:b.fixed?1:.5,span=(m:Mover,k:number)=>{const lo=m.d+o[k]-(m.dir>0?m.back??0:m.front??0);return [lo,lo+(m.front??0)+(m.back??0)];};
    const [a0,a1]=span(a,ka),[b0,b1]=span(b,kb),ahead=b0+b1>=a0+a1?1:-1;
    let g=Math.max(0,b0-a1,a0-b1)*ahead,gap=x[ka]-x[kb];
    if(Math.abs(g)>=EASE||Math.abs(gap)>=reach(r,Math.abs(g)))continue;
    // Sideways first (equal lanes part toward each mover's own right)…
    let sign=gap?Math.sign(gap):a.dir,push=reach(r,Math.abs(g))-Math.abs(gap);
    // …except that one passing a fixed mover goes round the side with room for it (a walker between a halted robot and its collector
    // was squeezed into the narrow side and then queued into the collector).
    const free=a.fixed?kb:b.fixed?ka:-1;
    if(free>=0){
      const m=movers[free],lo=m.inner+m.ext,hi=Math.max(lo,m.outer-m.ext),[min,max]=m.dir>0?[lo,hi]:[-hi,-lo],way=free===ka?sign:-sign;
      const room=(s:number)=>s>0?max-x[free]:x[free]-min,flip=reach(r,Math.abs(g))+Math.abs(gap);
      if(room(way)<push&&room(-way)>=flip){sign=-sign;push=flip;}
    }
    x[ka]+=sign*push*pa;x[kb]-=sign*push*(1-pa);clamp(ka);clamp(kb);
    gap=x[ka]-x[kb];
    if(Math.abs(gap)>=reach(r,Math.abs(g)))continue;
    // …then along: open the gap until the eased reach no longer overlaps (bisection on the smoothstep).
    let lo=Math.abs(g),hi=EASE;for(let n=0;n<10;n++){const mid=(lo+hi)/2;if(reach(r,mid)>Math.abs(gap))lo=mid;else hi=mid;}
    const open=(hi-Math.abs(g))*ahead;
    o[ka]-=open*pa;o[kb]+=open*(1-pa);clamp(ka);clamp(kb);
  }
  return movers.map((m,k)=>({lane:x[k]*m.dir,along:o[k]*m.dir}));
}
/** Walkers (route: `walkerRoute`, `length` m): one-way trips at each person's own pace, keeping right for their direction, then a rest
 * out of sight; trips begin and end at the route's ends (DECKS, the park, Hilton, deck landings), so people come from and go into
 * buildings. A third of lone walkers jog, in the outer lane so they pass slower parties; two in five others stop once at a viewpoint
 * for `stop.dwell` s (`dwell` eases 0→1→0 so the figure can turn to the sea or sit). `stop`: a fixed spot `at` m along the route (see
 * `promenadeStops`), taken only on trips in its `forward` direction (the sea on the walker's right, so reaching it crosses no oncoming
 * lane; other trips rest that long out of sight instead), false for none, omitted for a random spot .3–.7 of the way. `approach` rises 0→1 over the 6–1 m before the stop
 * (and falls after it), so the walker can veer out of the lane to it. `visible` fades over the first and last 4 m; each trip picks
 * its direction afresh. `lane`: the leader's metres right of the centre line, for its own direction. */
const DWELL=40;
export function walkerPose(time:number,index:number,length=240,stop?:{at:number;dwell:number;forward:boolean}|false) {
  const jog=index%6===0&&hash(index,1)<.33,speed=jog?2.3+.5*hash(index,2):.9+.55*hash(index,2),stops=!jog&&hash(index,3)<.4&&stop!==false;
  const dwellFor=stops?stop?.dwell??DWELL:0,walk=length/speed,cycle=walk+dwellFor+8+40*hash(index,4),clock=time+hash(index,5)*cycle;
  const trip=Math.floor(clock/cycle),s=clock-trip*cycle,forward=hash(index*31+trip,6)<.5,stopping=stops&&(!stop||stop.forward===forward);
  // The stop `at` metres into the trip, reached `start` s in.
  const at=stop?(forward?stop.at:length-stop.at):(.3+.4*hash(index,7))*length,start=stopping?at/speed:Infinity;
  const walked=Math.min(walk,s<start?s:s<start+dwellFor?start:s-dwellFor);
  const dwell=stopping?T.MathUtils.clamp(Math.min(s-start,start+dwellFor-s)/4,0,1):0,d=walked*speed;
  const approach=stopping?T.MathUtils.clamp((6-Math.abs(d-at))/5,0,1):0;
  const visible=s>=walk+(stopping?dwellFor:0)?0:T.MathUtils.clamp(d/4,0,1)*T.MathUtils.clamp((length-d)/4,0,1);
  return {u:forward?d/length:1-d/length,forward,lane:jog?2.05:(index%6?.75:.5)+.1*hash(index,31),
    dwell,approach,leaving:s>=start,visible,speed,jog,stops};
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
 * costs no extra draws. Seated, the thigh folds forward at the hip (.58) and the shin back down at the knee (.26), so the figure sits
 * with its thighs level, the knee .31 m forward (clear of the seat edge) and the shin hanging straight. */
function articulate(mat:T.Material,body:string) {
  mat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 gait;\nattribute vec2 social;\nvec3 swingX(vec3 p,float pivot,float a){p.y-=pivot;return vec3(p.x,p.y*cos(a)-p.z*sin(a),p.y*sin(a)+p.z*cos(a))+vec3(0.,pivot,0.);}')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n'+body);
  };
  mat.customProgramCacheKey=()=>'gait-'+body;
}
const LEGS='float side=sign(position.x);transformed=swingX(transformed,.26,(1.-smoothstep(.23,.29,position.y))*1.5*gait.w);transformed=swingX(transformed,.58,mix(sin(gait.x)*gait.y*side,-1.5,gait.w));';
const ARMS='float side=sign(position.x);transformed=swingX(transformed,1.25,-sin(gait.x)*gait.y*.8*side*(1.-gait.w)-social.y*step(0.,position.x));';
const HEAD='float c=cos(social.x),s=sin(social.x);transformed.xz=vec2(c*position.x+s*position.z,-s*position.x+c*position.z);';
// Backpack behind the torso (z < -.12), bag at the right hip (x > .25): keep only the item this person carries; sitters set it down.
const GEAR='transformed*=gait.w>.5||gait.z<.5?0.:gait.z<1.5?step(position.z,-.12):step(.25,position.x);';
/** Shared capsule figures and palette, used by promenade, doorway, resting and plaza crowds. `gait(i, phase, swing, item, seated)`
 * sets one person's walk; items are fixed per slot at build. */
export function pedestrians(scene:T.Object3D,count:number,name:string) {
  // People (several hundred, so modest segment counts): capsule torso and limbs, round head and hair; clothes, skin and hair vary per person from a muted palette (no saffron).
  const coats=material('#ffffff'),sleeves=material('#ffffff'),skin=material('#ffffff'),hair=material('#ffffff'),trousers=material('#ffffff'),gear=material('#ffffff');
  articulate(trousers,LEGS);articulate(sleeves,ARMS);articulate(gear,GEAR);articulate(skin,HEAD);articulate(hair,HEAD);
  const capsule=(r:number,length:number,at:[number,number,number],mat:T.Material,depth=1):Part=>({geometry:new T.CapsuleGeometry(r,length,3,7).scale(1,1,depth).translate(...at),material:mat});
  const people=fleet(scene,[
    capsule(.22,.36,[0,.96,0],coats,.72),{geometry:new T.SphereGeometry(.15,10,7).translate(0,1.5,0),material:skin},
    {geometry:new T.SphereGeometry(.035,6,4).scale(1,1,1.5).translate(0,1.49,.145),material:skin},
    {geometry:new T.SphereGeometry(.162,10,4,0,Math.PI*2,0,Math.PI*.55).translate(0,1.52,-.012),material:hair},
    capsule(.07,.42,[-.29,.98,0],sleeves),capsule(.07,.42,[.29,.98,0],sleeves),
    {geometry:new T.CapsuleGeometry(.08,.4,3,6).translate(-.13,.33,0),material:trousers},{geometry:new T.CapsuleGeometry(.08,.4,3,6).translate(.13,.33,0),material:trousers},
    {geometry:new T.TorusGeometry(.2,.06,4,12).rotateX(Math.PI/2).translate(0,1.34,0),material:collar},
    part([.3,.38,.15],[0,1.02,-.25],gear,.05),part([.1,.3,.26],[.33,.78,0],gear,.04),
  ],count,name);
  const gait=new T.InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(T.DynamicDrawUsage);
  const social=new T.InstancedBufferAttribute(new Float32Array(count*2),2).setUsage(T.DynamicDrawUsage);
  people.meshes.forEach(m=>{m.geometry.setAttribute('gait',gait);m.geometry.setAttribute('social',social);});
  const clothes=['#4f6f7c','#b5836f','#6d8a5f','#2f3e48','#c9b48a','#8c6f8f','#3f5a52','#e4e1d8'],skins=['#e8cdb0','#c99e7c','#8d6348','#f0d9c2'],hairs=['#2f2a27','#5a4033','#1d2226','#b9a58c','#d8d8d4'],bottoms=['#3d4a52','#2b3036','#6b6258','#c8c0b0','#45524a','#1f2a3a'],packs=['#2f3a40','#8c4a3a','#c9b48a','#4f6f7c','#e4e1d8'];
  for(let i=0;i<count;i++){
    const coat=clothes[(i*5)%clothes.length];people.tint(i,coats,coat);people.tint(i,sleeves,coat);people.tint(i,skin,skins[(i*3)%skins.length]);people.tint(i,hair,hairs[(i*7)%hairs.length]);
    people.tint(i,trousers,bottoms[(i*11)%bottoms.length]);people.tint(i,gear,packs[(i*13)%packs.length]);
    // A quarter carry a backpack, a fifth a shoulder bag.
    const item=hash(i,19);gait.setZ(i,item<.25?1:item<.45?2:0);
  }
  return {...people,
    gait(index:number,phase:number,swing:number,seated=0){gait.setX(index,phase);gait.setY(index,swing);gait.setW(index,seated);},
    social(index:number,look:number,gesture:number){social.setXY(index,look,gesture);},
    flush(){people.flush();gait.needsUpdate=true;social.needsUpdate=true;}};
}

/** Doorway trips in front of the landmarks: [door, forecourt, forecourt, door] at ground level, published once each landmark loads. */
type DoorTrip={curve:T.CatmullRomCurve3;length:number;start:T.Vector3;end:T.Vector3;samples:T.Vector3[];building:string};
const doorTrips:DoorTrip[]=[],doorWalks:DoorTrip[]=[],doorPoints:T.Vector3[]=[];
const doorSpots:{at:T.Vector3;yaw:number;visit?:Pick<DoorTrip,'curve'|'length'>}[]=[];
const entranceTrips:DoorTrip[]=[];
/** Two reserved meeting routes; their four people reuse the last ordinary doorway-walker slots. */
export const entranceJourneys=()=>entranceTrips;
/** Published door-to-group journeys, for route/actor clearance checks. */
export const forecourtVisits=()=>doorSpots.flatMap((spot,group)=>spot.visit?[{...spot.visit,group,at:spot.at,yaw:spot.yaw}]:[]);
const PAVED=new Set(['sidewalk','plaza']);
// Landmark pads overlap the avenues in places (Aqua City's north side), so forecourt walks also keep clear of every carriageway.
let streetSamples:{p:T.Vector3;clear:number}[]|null=null;
const offStreet=(p:T.Vector3)=>(streetSamples??=routes().streets.flatMap((c,r)=>c.getSpacedPoints(400).map(q=>({p:q,clear:r?5:4}))))
  .every(s=>Math.hypot(s.p.x-p.x,s.p.z-p.z)>s.clear);
/** Finds ground-floor facade points by casting inward from all four sides of `model`'s bounds, and joins neighbouring doors on one face
 * with a short walk 4–10 m out across the paved pad (`ground`: the environment). Each walk is raycast clear of the building, and runs
 * from .6 m inside one door to .6 m inside the next, rounded at its corners, so people emerge from the facade rather than grow out of
 * the paving. */
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
      // Every ground-floor door (forecourt walk or not) can take a drop-off passenger, who walks to just inside it.
      const inside=hit.point.clone().addScaledVector(out,-.6).setY(0);if(!doorPoints.some(d=>d.distanceTo(inside)<4))doorPoints.push(inside);
    }
    for(let k=1;k<doors.length;k++){
      const a=doors[k-1],b=doors[k],gap=a.at.distanceTo(b.at),reach=4+6*hash(doorTrips.length,9);
      // One face only (a corner's two normals diverge), and each door on one trip only (the x and z scans of a rotated landmark find the
      // same doors, and people from two trips would meet in one doorway).
      if(gap<8||gap>40||a.out.dot(b.out)<.9||doorTrips.some(trip=>[trip.start,trip.end].some(d=>d.distanceTo(a.at)<4||d.distanceTo(b.at)<4)))continue;
      const fa=a.at.clone().addScaledVector(a.out,reach),fb=b.at.clone().addScaledVector(b.out,reach),lift=new T.Vector3(0,1.2,0);
      if(![fa,fb,fa.clone().lerp(fb,.5)].every(p=>paved(p)&&offStreet(p))||!clear(fa.clone().add(lift),fb.clone().add(lift))||!clear(a.at.clone().add(lift),fa.clone().add(lift))||!clear(b.at.clone().add(lift),fb.clone().add(lift)))continue;
      const curve=new T.CatmullRomCurve3([a.at.clone().addScaledVector(a.out,-1),a.at,fa,fb,b.at,b.at.clone().addScaledVector(b.out,-1)],false,'centripetal');
      // Clear of every other trip by 3 m, so their people never share ground (passingLanes only separates people on one trip).
      const samples=curve.getSpacedPoints(60);
      if(doorTrips.some(trip=>trip.samples.some(p=>samples.some(q=>p.distanceTo(q)<3))))continue;
      const trip={curve,length:curve.getLength(),start:a.at,end:b.at,samples,building:model.name};doorTrips.push(trip);
      // Every other forecourt also holds a standing group 4 m beyond the walk, on paving, in sight of the doors and 2.6 m clear of the
      // rounded walk (group radius, a walker and the widest passing lane).
      const spot=fa.clone().lerp(fb,.5).addScaledVector(a.out.clone().add(b.out).normalize(),4);
      let reserved=false;
      if(doorTrips.length%2&&doorSpots.length<FORECOURT_GROUPS&&paved(spot)&&offStreet(spot)&&clear(spot.clone().add(lift),fa.clone().lerp(fb,.5).add(lift))&&samples.every(p=>p.distanceTo(spot)>2.6)){
        const g=doorSpots.length,group:{at:T.Vector3;yaw:number;visit?:Pick<DoorTrip,'curve'|'length'>}={at:spot,yaw:hash(g,25)*6.28};
        // Reserve a few forecourts for one resident's door → conversation → same door journey. Their ordinary walkers/robot use
        // other trips; future doorway publication also keeps clear of the visitor's entire curve.
        if(g%3===0){
          const toward=fa.clone().sub(spot).normalize(),yaw=Math.atan2(toward.x,toward.z)-4*Math.PI/3,target=spot.clone().addScaledVector(toward,.65);
          const visit=new T.CatmullRomCurve3([curve.points[0],a.at,fa,target],false,'centripetal'),length=visit.getLength(),points=visit.getSpacedPoints(Math.ceil(length/.4));
          const hosts=[0,1].map(j=>spot.clone().add(new T.Vector3(Math.sin(yaw+j*2*Math.PI/3)*.65,0,Math.cos(yaw+j*2*Math.PI/3)*.65)));
          const safe=points.every((p,i)=>{
            if(i*length/(points.length-1)<1.1)return true; // first .6 m is intentionally inside the origin facade
            const t=visit.getTangentAt(i/(points.length-1)),side=new T.Vector3(t.z,0,-t.x).normalize();
            return [-.4,0,.4].every(offset=>{const q=p.clone().addScaledVector(side,offset);return paved(q)&&offStreet(q)&&clear(q.clone().add(lift),q.clone().add(new T.Vector3(0,.3,0)));})
              &&hosts.every(h=>h.distanceTo(p)>.85)&&doorSpots.every(s=>s.at.distanceTo(p)>1.5)
              &&doorTrips.slice(0,-1).every(other=>other.samples.every(q=>q.distanceTo(p)>3));
          })&&points.slice(4).every((p,i)=>clear(points[i+3].clone().add(lift),p.clone().add(lift)));
          if(safe){group.yaw=yaw;group.visit={curve:visit,length};trip.samples.push(...points);reserved=true;}
        }
        doorSpots.push(group);
      }
      if(!reserved)doorWalks.push(trip);
    }
  }
}
/** Select meeting entrances only after all landmarks/landscape are present, so a later facade cannot obstruct a reserved lane. */
export function publishEntrances(scene:T.Object3D,ground:T.Object3D) {
  scene.updateMatrixWorld(true);const solids:{mesh:T.Mesh;bounds:T.Box3}[]=[],ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
  scene.traverse(o=>{if(o instanceof T.Mesh&&!(o instanceof T.InstancedMesh))solids.push({mesh:o,bounds:new T.Box3().setFromObject(o)});});
  for(const trip of [...doorWalks]){
    if(entranceTrips.length===2)break;
    if(entranceTrips.some(t=>t.building===trip.building))continue;
    const points=trip.curve.getSpacedPoints(Math.ceil(trip.length/.25)),safe=points.every((p,i)=>{
      if(Math.min(i,points.length-1-i)*trip.length/(points.length-1)<1.2)return true; // intentionally inside the two facades
      const tangent=trip.curve.getTangentAt(i/(points.length-1)),side=new T.Vector3(tangent.z,0,-tangent.x);
      return [-1.15,-.7,0,.7,1.15].every(offset=>{
        const q=p.clone().addScaledVector(side,offset);if(!offStreet(q))return false;
        ray.set(q.clone().setY(2),down);ray.far=3;const hit=ray.intersectObject(ground,true)[0],mat=hit&&(hit.object as T.Mesh).material;
        if(!hit||hit.point.y>.6||!mat||Array.isArray(mat)||!PAVED.has(mat.name))return false;
        // Cull distant/overhead meshes and the dense curved sea before native triangle tests.
        const near=solids.filter(({bounds:b})=>q.x>=b.min.x&&q.x<=b.max.x&&q.z>=b.min.z&&q.z<=b.max.z&&b.max.y>=.3&&b.min.y<=1.2);
        ray.set(q.clone().setY(1.2),down);ray.far=.9;return ray.intersectObjects(near.map(s=>s.mesh),false).length===0;
      });
    });
    if(safe){entranceTrips.push(trip);doorWalks.splice(doorWalks.indexOf(trip),1);}
  }
}
/** Doorway walker `index` on a trip `length` m long: steps out of one door, crosses the forecourt and goes in at the next, then stays
 * inside 10–50 s. `d` metres along the trip (either way round), `visible` fading over the first and last .5 m, inside the facade. */
export function doorwayPose(time:number,index:number,length:number) {
  const speed=.9+.5*hash(index,10),walk=length/speed,cycle=walk+10+40*hash(index,11),clock=time+hash(index,12)*cycle;
  const trip=Math.floor(clock/cycle),s=clock-trip*cycle,d=Math.min(s,walk)*speed,reverse=hash(index*17+trip,13)<.5;
  return {d:reverse?length-d:d,reverse,visible:s>walk?0:T.MathUtils.clamp(d/.5,0,1)*T.MathUtils.clamp((length-d)/.5,0,1),speed};
}
/** Delivery robot `index` on a doorway trip `length` m long: rolls out of one door at a steady ROBOT_SPEED, halts with its centre
 * ROBOT_HALT m short of the far end (just outside the next door) for HANDOFF s while someone comes out to collect, then rolls in and
 * stays inside 20–50 s. `d` as `doorwayPose`; `waited`: seconds into the hand-off, or -1. */
export const ROBOT_SPEED=.7, ROBOT_HALT=2.4, HANDOFF=8;
export function robotPose(time:number,index:number,length:number) {
  const halt=length-ROBOT_HALT,at=halt/ROBOT_SPEED,cycle=length/ROBOT_SPEED+HANDOFF+20+30*hash(index,28),clock=time+hash(index,29)*cycle;
  const trip=Math.floor(clock/cycle),s=clock-trip*cycle,reverse=hash(index*17+trip,13)<.5,waited=s>=at&&s<at+HANDOFF?s-at:-1;
  const d=Math.min(length,s<at?s*ROBOT_SPEED:waited>=0?halt:halt+(s-at-HANDOFF)*ROBOT_SPEED);
  return {d:reverse?length-d:d,reverse,waited,visible:d>=length?0:T.MathUtils.clamp(d/.5,0,1)*T.MathUtils.clamp((length-d)/.5,0,1)};
}
/** The collector meeting a robot `waited` s into its hand-off: steps out of the door 1–2.5 s in, stands facing the robot, turns back over
 * 5–5.6 s and walks in by 7 s. `e`: metres out from the trip's inside end; `facing` 1 toward the robot, 0 toward the door. */
export function collectorPose(waited:number) {
  const e=waited<1?0:waited<2.5?waited-1:waited<5.5?1.5:Math.max(0,1.5-(waited-5.5));
  return {e,facing:waited<5?1:1-T.MathUtils.clamp((waited-5)/.6,0,1),walking:(waited>1&&waited<2.5)||(waited>5.5&&waited<7)};
}
/** Street cars per lane on each avenue: `cars` spread round the lane's loop (the avenue plus 40 m out of sight) at irregular gaps of
 * 0.45–1.6× the mean, moving at one lane speed (8–11 m/s with a shared ±15 % surge), so they never close up. They fade in and out at the
 * avenue ends. Lane 0 drives with the route, lane 1 against it; Japan keeps left. Returns `d` metres along the route. */
export const STREET_GAP=27;
/** A lane car's free slot: `travelled` metres round its lane's loop (`rate` m/s now), as travel `x` from the lane's start (-20 …
 * length + 20, the ends out of sight) and its lap count. Car k-1 always leads car k. */
function laneTravel(time:number,road:number,lane:number,car:number,cars:number,length:number) {
  const id=road*2+lane,speed=8+3*hash(id,14),span=length+40,weight=(k:number)=>1+2.5*hash(id*97+k,15);
  let before=0,total=0;for(let k=0;k<cars;k++){if(k<car)before+=weight(k);total+=weight(k);}
  const travelled=speed*(time+3*Math.sin(time*.05+id*1.7))-span*before/total;
  return {...laneAt(travelled,span),speed,span,travelled,rate:speed*(1+.15*Math.cos(time*.05+id*1.7))};
}
const laneAt=(travelled:number,span:number)=>{const lap=Math.floor(travelled/span);return {x:travelled-lap*span-20,lap};};
const fadeEnds=(x:number,length:number)=>T.MathUtils.clamp(x/12,0,1)*T.MathUtils.clamp((length-x)/12,0,1);
export function streetCarPose(time:number,road:number,lane:number,car:number,cars:number,length:number) {
  const {x}=laneTravel(time,road,lane,car,cars,length);
  return {d:lane?length-x:x,visible:fadeEnds(x,length)};
}
/** Kerbside drop-off on the paved forecourt south of Aqua City, beside the guideway avenue's westbound lane: two cars, each stopping at
 * its own bay `stops` m along the lane, `bay` m beyond the lane centre. On even laps the car eases over SHIFT m into the bay at speed,
 * brakes over 2·BRAKE m of its slot's travel to rest BRAKE m on, waits a whole lap, and rejoins its own slot as it comes round (in
 * `mobility` it also waits there until the lane beside the pull-out is clear). Cues: `signal` +1 indicates toward the kerb from SIGNAL m before easing in until it stops, -1 toward
 * the road from 3 s before pulling away until back in lane; `brake` lights while braking; `pitch` (rad, + nose down) dips the nose
 * under braking and lifts it pulling away. */
export const DROP_OFF={road:1,lane:1,cars:[0,14],stops:[330,380],bay:3.5} as const;
const BRAKE=12,SHIFT=35,SIGNAL=30;
export function dropOffPose(time:number,car:number,cars:number,length:number,stop:number) {
  return dropOffAt(laneTravel(time,DROP_OFF.road,DROP_OFF.lane,car,cars,length),length,stop);
}
/** The drop-off manoeuvre for a slot at lane travel `x`, lap `lap` (`dropOffPose`, or the simulated slot in `mobility`). */
function dropOffAt({x,lap,speed,span}:{x:number;lap:number;speed:number;span:number},length:number,stop:number) {
  const even=lap%2===0,rest=stop+BRAKE;
  // `steer`: heading offset (rad, toward the kerb) while easing in or out, so the car turns rather than slides.
  let p=x,bay=0,parked=-1,leaving=-1,steer=0,brake=0,pitch=0;
  const slope=(u:number)=>6*u*(1-u)*DROP_OFF.bay/SHIFT;
  if(even&&x>=stop-SHIFT&&x<stop){const u=(x-stop+SHIFT)/SHIFT;bay=ease(u);steer=Math.atan(slope(u));}
  else if(even&&x>=stop){const u=Math.min((x-stop)/(2*BRAKE),1);p=stop+BRAKE*(1-(1-u)**2);bay=1;if(u===1)parked=(x-stop-2*BRAKE)/speed;else{brake=1;pitch=.012*Math.sin(Math.PI*u);}}
  else if(!even&&x<stop){p=rest;bay=1;parked=(x+span-stop-2*BRAKE)/speed;}
  else if(!even&&x<stop+2*BRAKE){const u=(x-stop)/(2*BRAKE);p=rest+BRAKE*u*u;bay=1;pitch=-.008*Math.sin(Math.PI*u);}
  else if(!even&&x<stop+2*BRAKE+SHIFT){const u=(x-stop-2*BRAKE)/SHIFT;bay=1-ease(u);steer=-Math.atan(slope(u));}
  // While parked: seconds since stopping and until it pulls away (passengers time their walks to these).
  if(parked>=0)leaving=(((stop-x)%span+span)%span)/speed;
  const signal=even&&x>=stop-SHIFT-SIGNAL&&parked<0&&(x<stop||brake>0)?1:(parked>=0&&leaving<3)||(!even&&x>=stop&&x<stop+2*BRAKE+SHIFT)?-1:0;
  return {d:DROP_OFF.lane?length-p:p,bay,steer,visible:fadeEnds(p,length),parked,leaving,signal,brake,pitch};
}
/** Shared-space crossings (no signals): `d` metres along `streets[road]`. Residents walk to the kerb, wait until every approaching car
 * has stopped short of the stop line or passed, cross, and walk on; cars brake for a requested crossing when they still can and queue
 * behind each other (`mobility`). Both on the guideway avenue, where paving on each side is open 12 m out at body height (under the
 * guideway): south of Aqua City past the drop-off bays, and just before the junction mouth. The seaside avenue has no north footway (Aqua
 * City's wall stands 2.3 m from its centre line). */
export const CROSSINGS=[{road:1,d:282,period:70},{road:1,d:480,period:83}] as const;
/** Carriageway half-width per avenue (5 m and 7 m). */
export const ROAD_HALF=[2.5,3.5] as const;
/** The guideway avenue's junction mouth has no road surface in the environment (terrain shows between d 492 and 501): a strip of
 * the paving finish that covers the other avenues fills it (`loadOdaiba`). Left/right edge points (x, z) every metre, for the scene mesh and the road test. */
export const ROAD_FILL={road:1,from:486,to:507,half:3.7} as const;
export function roadFill() {
  const street=routes().streets[ROAD_FILL.road],length=street.getLength(),edges:[number,number][][]=[];
  for(let d=ROAD_FILL.from;d<=ROAD_FILL.to;d++){
    const p=street.getPointAt(d/length),t=street.getTangentAt(d/length);
    edges.push([-1,1].map(s=>[p.x+t.z*s*ROAD_FILL.half,p.z-t.x*s*ROAD_FILL.half] as [number,number]));
  }
  return edges;
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
/** One speaker at a time, listeners turn toward them, then a shared quiet interval; group clocks are staggered. */
export function conversationPose(time:number,group:number,member:number,members=2) {
  const period=members*4+8+4*hash(group,32),clock=((time+hash(group,33)*period)%period+period)%period,speaker=Math.floor(clock/4);
  const pulse=speaker<members?ease((clock%4)/.8)*(1-ease((clock%4-2.8)/1.2)):0;
  return {speaker,toward:speaker===member?(member+1)%members:speaker,attention:pulse,gesture:speaker===member?pulse*(.35+.06*Math.sin(clock*4)):0};
}
/** A resident walks out, joins a forecourt group for 30–50 s, turns and returns to the same door, then stays indoors. */
export function visitPose(time:number,group:number,length:number) {
  const speed=1+.2*hash(group,34),walk=length/speed,stay=30+20*hash(group,35),cycle=2*walk+stay+15+30*hash(group,36);
  const clock=((time+hash(group,37)*cycle)%cycle+cycle)%cycle,back=Math.max(0,clock-walk-stay),d=Math.max(0,Math.min(length,clock*speed)-back*speed);
  return {u:d/length,visible:T.MathUtils.clamp(d/.5,0,1),dwell:ease((clock-walk)/2)*(1-ease((clock-walk-stay+2)/2)),
    returning:clock>=walk+stay-2,walking:clock<walk||clock>=walk+stay&&clock<2*walk+stay,phase:d*5.5+group};
}
/** Arrive and wait beside the entry; let a companion emerge, greet, then leave together through the far entry. */
export function entrancePose(time:number,index:number,length:number,member:number) {
  const wait=3.5,approach=(length-wait)/.6,exit=wait/.6,leave=(length-wait)/.6,cycle=approach+6+exit+4+leave+18;
  const clock=((time+index*17)%cycle+cycle)%cycle,meet=approach+6,go=meet+exit+4;
  let d=member?0:length,walking=false,reverse=false;
  if(!member&&clock<approach){d=length-(length-wait)*ease(clock/approach);walking=true;reverse=true;}
  else if(clock<go){d=member?wait*ease((clock-meet)/exit):wait;walking=!!member&&clock>meet&&clock<meet+exit;}
  else {d=wait+(length-wait)*ease((clock-go)/leave);walking=clock<go+leave;}
  const greeting=ease((clock-meet-exit)/.7)*(1-ease((clock-go+.7)/.7));
  const yaw=member?-Math.PI/2*greeting:clock<go?Math.PI*(1-.5*ease((clock-meet-exit)/.7)-.5*ease((clock-go+.7)/.7)):0;
  return {d,walking,reverse,yaw,lane:member?-.7:.7,greeting,phase:d*5.5+member,
    visible:ease(d/.6)*ease((length-d)/.6),stage:clock<approach?'arrive':clock<meet?'wait':clock<meet+exit?'exit':clock<go?'greet':clock<go+leave?'leave':'inside'};
}
/** A service customer walks from a waiting place, uses the counter, returns and waits; distance drives stopped-foot gait. */
export function servicePose(time:number,index:number,length:number) {
  const walk=length/.8,cycle=2*walk+26,clock=((time+index*19)%cycle+cycle)%cycle;
  const u=clock<walk?ease(clock/walk):clock<walk+12?1:1-ease((clock-walk-12)/walk);
  const dwell=ease((clock-walk)/.6)*(1-ease((clock-walk-12+.6)/.6));
  return {u,dwell,help:ease((clock-walk-5)/1)*dwell,turn:ease((clock-walk-11.4)/.6)*(1-ease((clock-cycle+2)/2)),
    walking:clock<walk||clock>walk+12&&clock<2*walk+12,phase:u*length*5.5};
}
const yawTo=(from:number,to:number)=>((to-from)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI;
/** Promenade benches every 24 m facing the sea, 2.75 m out: the backrest (2.48 m) clears walker lanes (≤ 2.35 m) and sitters' feet
 * (3.15 m) stop short of the lit edge (3.3 m). Two seats each; between each pair of
 * benches a couple stands at the rail. Between them, 6 m from each, a one-seat stool and a free rail spot for passing walkers
 * (`promenadeStops`). `u` along the promenade route. */
export const BENCH_STEP=24, BENCH_OUT=2.75, RAIL_OUT=2.95, STOOL_FRONT=3;
export function promenadeBenches(lengths:readonly number[]) {
  return lengths.flatMap((length,route)=>Array.from({length:Math.floor((length-16)/BENCH_STEP)},(_,k)=>({route,u:(12+k*BENCH_STEP)/length,
    stool:(18+k*BENCH_STEP)/length,rail:(24+k*BENCH_STEP)/length,view:(30+k*BENCH_STEP)/length})));
}
/** Promenade viewpoints by walker leader slot: each promenade party that stops gets its own spot, first come by slot (so the
 * always-present low slots get them) — a stool for lone walkers, who sit 70 s, a rail spot for parties, who stand 40 s. Stoppers left
 * over walk on (`false`), as do deck walkers (a group standing in a deck lane would block it). `out`: standing offset from the centre line
 * (the stool's front, or the rail); `seat`: the stool's centre, where a sitter settles. */
export function promenadeStops(lengths:readonly number[]) {
  // `forward`: the route direction with the sea on the walker's right.
  const walks=routes().promenades,sea=[INTERCHANGE.head[0]-INTERCHANGE.shore[0],INTERCHANGE.head[2]-INTERCHANGE.shore[2]];
  const seaRight=(route:number,u:number)=>{const t=walks[route].getTangentAt(u);return t.x*sea[1]-t.z*sea[0]>0;};
  const free=promenadeBenches(lengths).flatMap(b=>[{route:b.route,at:b.stool*lengths[b.route],out:STOOL_FRONT,seat:BENCH_OUT,dwell:70,forward:seaRight(b.route,b.stool)},
    {route:b.route,at:b.view*lengths[b.route],out:RAIL_OUT,seat:0,dwell:DWELL,forward:seaRight(b.route,b.view)}]);
  const stops=new Map<number,typeof free[number]|false>();
  for(let i=0;i<MAX_WALKERS;i++){
    const party=walkerParty(i),route=walkerRoute(party.id);
    if(party.slot||!walkerPose(0,i).stops)continue;
    if(route>1){stops.set(i,false);continue;}
    const k=free.findIndex(s=>s.route===route&&(s.seat>0)===(party.size===1));
    stops.set(i,k<0?false:free.splice(k,1)[0]);
  }
  return stops;
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
  const path=routes(),trackLength=path.tracks.map(c=>c.getLength());
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
  // Facade overlays mark the inferred entries; the wall is not cut and there is no simulated interior.
  const entries=fleet(scene,[part([.16,2.8,.2],[-1.9,1.4,0],shell,.03),part([.16,2.8,.2],[1.9,1.4,0],shell,.03),
    part([4.2,.18,1.6],[0,2.9,.55],shell,.04),part([3.4,2.55,.06],[0,1.28,-.35],glass,.01),
    part([3.6,.07,.12],[0,2.78,.08],mint,.02)],4,'building-entrances');
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
  // Doorway walkers step in and out of the landmarks (publishDoorways); street cars: 4.6 m human-driven cars, every seventh a 7 m van.
  // Slots: forecourt walkers, drop-off passengers, one collector per delivery robot, then two per crossing.
  const COLLECTORS=DOOR_WALKERS+2*DROP_OFF.cars.length,CROSSERS=COLLECTORS+ROBOTS,doorPeople=pedestrians(scene,CROSSERS+2*CROSSINGS.length,'doorway-walkers');
  // Delivery robots: 0.8 m rovers with a lit lid, on the doorway forecourts.
  const robots=fleet(scene,[part([.62,.5,.8],[0,.42,0],shell,.12),part([.5,.05,.5],[0,.68,0],mint,.02),part([.66,.16,.7],[0,.12,0],glass,.05)],ROBOTS,'delivery-robots');
  const carBody=material('#ffffff'),headlight=new T.MeshStandardMaterial({color:'#f4f6f2',emissive:'#fff6e0',emissiveIntensity:0,roughness:.3}),taillight=new T.MeshStandardMaterial({color:'#b85a50',emissive:'#ff4a3a',emissiveIntensity:0,roughness:.3});
  const streetLength=path.streets.map(c=>c.getLength()),streetCars=streetLength.map(length=>Math.round((length+40)/STREET_GAP)),carSlots=streetCars.reduce((n,c)=>n+2*c,0);
  const cars=fleet(scene,[part([1.85,1.1,4.6],[0,.75,0],carBody,.45),part([1.7,.6,2.6],[0,1.45,-.2],glass,.25),part([1.9,.1,4.3],[0,.45,0],mint,.04),
    part([1.5,.14,.08],[0,.95,2.3],headlight,.03),part([1.5,.14,.08],[0,.95,-2.3],taillight,.03)],carSlots,'street-cars');
  const carColors=['#f4f3ee','#e9eef0','#dfe4e2','#c9d3d0','#e8e0d0','#8fa8ad','#5f6f78','#2f3a40'];
  for(let i=0;i<carSlots;i++)cars.tint(i,carBody,carColors[Math.floor(hash(i,16)*carColors.length)]);
  // Autonomous street pods take a car's slot as automation rises (podShare, as the aircraft): a rounded pale cabin under a wraparound
  // glass canopy and a thin mint roof line, the cars' 4.6 m length so the drop-off lamps still fit; a van slot becomes a cargo pod.
  const podBody=material('#ffffff'),streetPods=fleet(scene,[part([1.8,1.3,4.6],[0,.8,0],podBody,.6),part([1.84,.62,3.5],[0,1.28,-.1],glass,.3),
    part([.24,.04,2.8],[0,1.6,-.1],mint,.02),part([1.3,.1,.08],[0,.82,2.29],headlight,.03),part([1.3,.1,.08],[0,.82,-2.29],taillight,.03)],carSlots,'street-pods');
  for(let i=0;i<carSlots;i++)streetPods.tint(i,podBody,carColors[Math.floor(hash(i,16)*4)]);
  // Drop-off cues per bay car: an amber indicator pair (front and rear corner, set on the signalled side) and a bright brake lamp over
  // the tail light; hidden when off.
  const amber=new T.MeshBasicMaterial({color:'#ffae2e'}),brakeRed=new T.MeshBasicMaterial({color:'#ff3326'});
  const indicators=fleet(scene,[part([.06,.14,.3],[0,.95,2.05],amber,.02),part([.06,.14,.3],[0,.95,-2.05],amber,.02)],DROP_OFF.cars.length,'drop-off-indicators',false);
  // Every street vehicle's brake lamp (slot as `cars`): lit while slowing, queued or stopped at a crossing, and for the drop-off stop.
  const brakeLamps=fleet(scene,[part([1.54,.16,.06],[0,.95,-2.33],brakeRed,.03)],carSlots,'brake-lamps',false);
  // Crossings: a pale band just above the paving slab that covers the avenues (x scaled to the carriageway width; car bodies clear
  // it), with mint edge lines lit while a crossing is requested.
  const crossBands=fleet(scene,[part([1,.02,3.6],[0,.23,0],shell,.01)],CROSSINGS.length,'crossing-bands',false),crossLights=fleet(scene,
    [part([1,.02,.1],[0,.245,1.85],mint,.01),part([1,.02,.1],[0,.245,-1.85],mint,.01)],CROSSINGS.length,'crossing-lights',false);
  crossBands.meshes.forEach(m=>m.receiveShadow=true);
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
  const benches=promenadeBenches(walkLength.slice(0,2)),benchFleet=fleet(scene,[part([1.8,.08,.4],[0,.36,-.02],shell,.03),part([1.8,.4,.06],[0,.62,-.24],shell,.03),
    part([.08,.32,.42],[-.8,.16,0],glass,.02),part([.08,.32,.42],[.8,.16,0],glass,.02)],benches.length,'promenade-benches');
  // Backless one-seat stools between benches, for walkers who stop to sit (promenadeStops).
  const stools=fleet(scene,[part([.9,.08,.4],[0,.36,0],shell,.03),part([.08,.32,.38],[-.38,.16,0],glass,.02),part([.08,.32,.38],[.38,.16,0],glass,.02)],benches.length,'promenade-stools');
  // Sea side of the walk at the last `place`: +1/-1 along `side`, and the yaw that faces the sea.
  const seaward=()=>{side.crossVectors(up,tangent).normalize();const sea=Math.sign(side.x*seaX+side.z*seaZ)||1;return {sea,yaw:Math.atan2(side.x*sea,side.z*sea)};};
  const spots:{at:T.Vector3;yaw:number;seated:number}[]=[];
  benches.forEach((b,k)=>{
    place(walks[b.route],b.stool);const s=seaward();pose.position.addScaledVector(side,s.sea*BENCH_OUT);pose.rotation.set(0,s.yaw,0);stools.set(k,pose);
    for(const [u,out,rail] of [[b.u,BENCH_OUT,0],[b.rail,RAIL_OUT,1]] as const){
      place(walks[b.route],u);const {sea,yaw}=seaward(),at=pose.position.clone().addScaledVector(side,sea*out);
      if(!rail){pose.position.copy(at);pose.rotation.set(0,yaw,0);benchFleet.set(k,pose);}
      // Sitters drop .08 m so the folded thighs (.08 m radius under the .58 m hip) rest on the .40 m seat top; the rail couple stand half
      // a metre apart, turned a little toward each other.
      for(const j of [-1,1])spots.push({at:at.clone().addScaledVector(tangent,j*(rail?.28:.45)).setY(rail?0:-.08),yaw:yaw-(rail?j*.35:0),seated:rail?0:1});
    }
  });benchFleet.flush();stools.flush();
  const crossAt=CROSSINGS.map(({road,d},k)=>{
    place(path.streets[road],d/streetLength[road]);const half=ROAD_HALF[road];
    pose.scale.set(2*half+.6,1,1);crossBands.set(k,pose);pose.scale.set(1,1,1);
    return {p:pose.position.clone(),t:tangent.clone(),half,kerb:half+.7,yaw:pose.rotation.y};
  });crossBands.flush();
  const stops=promenadeStops(walkLength.slice(0,2));
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
      // Faded over the metre beside the car and the half-metre inside the door.
      const toKerb=(j?1-f:f)*walk*1.2,toDoor=(j?f:1-f)*walk*1.2;pose.scale.setScalar(Math.min(1,toKerb,toDoor/.5));doorPeople.set(slot,pose);doorPeople.gait(slot,t*6.6+slot,.45);
    }
  };
  /** Day-rhythm and crowd presence per actor: each is wholly on or off (a stable hash against the group's share, so the same people
   * come and go) and eases between the two, so nobody stays drawn shrunk when the hour or crowd is held. */
  let lastTime=NaN,fade=1,dt=0;
  /** Actual travel of a mover between frames from its solved lane and along offset (`passingLanes`), smoothed over ~.3 s: `pace` is
   * the share of its own `speed` it really covers (a queued walker stops stepping) and `turn` the heading offset (rad) of a sidestep,
   * so it turns rather than slides. A first frame, jump or snapshot starts still. */
  const travel=(count:number)=>{
    const lane=new Float32Array(count).fill(NaN),along=new Float32Array(count),aside=new Float32Array(count),ahead=new Float32Array(count);
    return {
      at(i:number,nowLane:number,nowAlong:number,speed:number){
        if(dt>0&&Number.isFinite(lane[i])){const k=1-Math.exp(-dt/.3);aside[i]+=((nowLane-lane[i])/dt-aside[i])*k;ahead[i]+=((nowAlong-along[i])/dt-ahead[i])*k;}
        else aside[i]=ahead[i]=0;
        lane[i]=nowLane;along[i]=nowAlong;const forward=speed+ahead[i];
        return {pace:T.MathUtils.clamp(forward/speed,0,1),turn:T.MathUtils.clamp(Math.atan2(-aside[i],Math.max(forward,.3)),-.6,.6)};
      },
      still(i:number){lane[i]=NaN;return {pace:1,turn:0};},
    };
  };
  const walkerTravel=travel(MAX_WALKERS),doorTravel=travel(DOOR_WALKERS),robotTravel=travel(ROBOTS),partyTravel:{pace:number;turn:number}[]=[];
  const gate=(count:number)=>{
    const level=new Float32Array(count).fill(-1);
    return (i:number,on:boolean)=>{const target=on?1:0;level[i]=level[i]<0?target:level[i]+T.MathUtils.clamp(target-level[i],-fade,fade);return ease(level[i]);};
  };
  const walkerGate=gate(MAX_WALKERS),doorGate=gate(DOOR_WALKERS),robotGate=gate(ROBOTS),restGate=gate(spots.length+FORECOURT_GROUPS*3),carGate=gate(carSlots);
  // Street traffic: each lane slot drives its own `carT` metres round its lane loop, never ahead of its free slot (`laneTravel`). It
  // eases toward the free pace (up to 30 % faster, ≤ 14 m/s, to catch up), keeps 2 m + 0.5 s behind the car ahead, and brakes on a ≤ 3 m/s²
  // profile for a requested crossing it can still stop for (else it is committed and passes). A drop-off car wholly in its bay is no
  // obstacle and its slot keeps the free pace (passengers time their walks to it), so leaders come from the actual order round the
  // loop each frame; before pulling out it waits, indicating, until the lane behind and beside the bay is clear. A first frame, jump
  // or snapshot puts every car on its slot.
  const carLanes=path.streets.flatMap((_,road)=>[0,1].map(lane=>({road,lane,n:streetCars[road],length:streetLength[road],span:streetLength[road]+40}))),laneBase:number[]=[];
  carLanes.reduce((b,l)=>{laneBase.push(b);return b+l.n;},0);
  const dropOf=Int8Array.from({length:carSlots},(_,s)=>{const l=carLanes.findIndex((_,i)=>s>=laneBase[i]&&s<laneBase[i]+carLanes[i].n);
    return carLanes[l].road===DROP_OFF.road&&carLanes[l].lane===DROP_OFF.lane?(DROP_OFF.cars as readonly number[]).indexOf(s-laneBase[l]):-1;});
  const vanOf=Uint8Array.from({length:carSlots},(_,s)=>dropOf[s]<0&&hash(s,17)<.14?1:0),carLen=Float32Array.from(vanOf,v=>v?4.6*1.55:4.6);
  const carT=new Float64Array(carSlots),carV=new Float32Array(carSlots),carBrake=new Uint8Array(carSlots),inBay=new Uint8Array(carSlots);
  let simTime=NaN;
  /** Crossing state: residents `arrive` along the footway (6 s, 8 m) to the kerb, `wait` until clear, `cross`, then `leave` along
   * the far footway (6 s), each way up or down the avenue by `from`/`to`. */
  type Phase='idle'|'arrive'|'wait'|'cross'|'leave';
  const crossing=CROSSINGS.map(()=>({phase:'idle' as Phase,at:0,event:0,side:1,size:1,from:1,to:1}));
  const requested=(k:number,time:number)=>{const c=crossing[k];return c.phase==='wait'||c.phase==='cross'||c.phase==='arrive'&&time-c.at>4.5;};
  const laneX=(l:number,d:number)=>carLanes[l].lane?carLanes[l].length-d:d;
  // Clear: no car between the stop line (4 m before the crossing centre) and 2.5 m past it, and every car still approaching can
  // stop at ≤ 4 m/s².
  const clearFor=(k:number)=>carLanes.every((l,i)=>{
    if(l.road!==CROSSINGS[k].road)return true;
    const xc=laneX(i,CROSSINGS[k].d),stop=xc-4;
    for(let s=laneBase[i];s<laneBase[i]+l.n;s++){
      if(inBay[s])continue;
      const x=laneAt(carT[s],l.span).x,front=x+carLen[s]/2,rear=x-carLen[s]/2;
      if(front>stop+.05&&rear<xc+2.5)return false;
      if(front<=stop+.05&&carV[s]>.5&&stop-front<carV[s]**2/8)return false;
    }
    return true;
  });
  const stepTraffic=(time:number,people:number)=>{
    const dt=time-simTime,reset=!(dt>0&&dt<.5);if(dt===0)return;simTime=time;
    CROSSINGS.forEach((C,k)=>{
      const c=crossing[k],event=Math.floor(time/C.period+hash(k,40));
      if(reset){c.phase='idle';c.event=event;return;}
      if(c.phase==='idle'&&event>c.event){c.event=event;if(people>hash(event*7+k,41))Object.assign(c,{phase:'arrive',at:time,side:hash(event,42)<.5?1:-1,size:hash(event,43)<.6?1:2,from:hash(event,44)<.5?1:-1,to:hash(event,45)<.5?1:-1});}
      else if(c.phase==='arrive'&&time-c.at>=6)Object.assign(c,{phase:'wait',at:time});
      else if(c.phase==='wait'&&clearFor(k))Object.assign(c,{phase:'cross',at:time});
      else if(c.phase==='cross'&&time-c.at>=2*crossAt[k].kerb/1.4)Object.assign(c,{phase:'leave',at:time});
      else if(c.phase==='leave'&&time-c.at>=6)c.phase='idle';
    });
    carLanes.forEach((l,i)=>{
      const base=laneBase[i],slots=Array.from({length:l.n},(_,k)=>base+k);
      for(const s of slots)inBay[s]=dropOf[s]>=0&&dropOffAt({...laneAt(carT[s],l.span),speed:0,span:l.span},l.length,DROP_OFF.stops[dropOf[s]]).bay===1?1:0;
      // In-lane cars by position round the loop (lags differ, so travelled distance can be a lap apart); each follows the next one on.
      const xOf=(s:number)=>laneAt(carT[s],l.span).x,order=slots.filter(s=>!inBay[s]).sort((a,b)=>xOf(a)-xOf(b));
      for(const s of slots){
        const k=s-base,free=laneTravel(time,l.road,l.lane,k,l.n,l.length);
        if(reset){carT[s]=free.travelled;carV[s]=free.rate;carBrake[s]=0;continue;}
        let v=Math.min(14,free.rate+T.MathUtils.clamp((free.travelled-carT[s])*.3,0,.3*free.rate));
        if(inBay[s]){
          // Due to pull out, the slot keeps traffic's free pace (no catch-up), so a car now 12 m behind to 20 m ahead of it would be
          // beside or just ahead of it as it reaches the lane, and a slow or queued car in the pull-out stretch would be in its way;
          // hold (indicating) until neither is there.
          const stop=DROP_OFF.stops[dropOf[s]],x=laneAt(carT[s],l.span).x;
          if(x>=stop-12&&x<stop+2*BRAKE)v=Math.min(v,free.rate);
          if(x>=stop-1.5&&x<stop&&order.some(o=>{const ox=xOf(o);return ox>stop-12&&ox<stop+20||carV[o]<6&&ox>stop+2*BRAKE-8&&ox<stop+2*BRAKE+SHIFT+8;}))v=0;
        }else{
          v=Math.min(v,carV[s]+2.5*dt);
          // The car ahead round the loop (the frontmost follows the rearmost, a lap on); measured round the loop, as it may already
          // have wrapped this frame.
          const at=order.indexOf(s),ls=order[(at+1)%order.length];
          if(ls!==s){const gap=((xOf(ls)-xOf(s))%l.span+l.span)%l.span-carLen[ls]/2-carLen[s]/2;v=Math.min(v,Math.max(0,(gap-2)/.5));}
          const front=laneAt(carT[s],l.span).x+carLen[s]/2;
          CROSSINGS.forEach((C,c)=>{
            if(C.road!==l.road||!requested(c,time))return;
            const dist=laneX(i,C.d)-4-front;
            if(dist>=-.05&&(dist>=carV[s]**2/12||carV[s]<.5))v=Math.min(v,Math.sqrt(6*Math.max(0,dist-.2)));
          });
        }
        v=Math.max(0,v);carBrake[s]=!inBay[s]&&(v<.5||(carV[s]-v)/dt>1)?1:0;
        carT[s]=Math.min(carT[s]+v*dt,free.travelled);carV[s]=v;
      }
    });
  };
  const update=(state:WorldState,time:number,automationShare?:number,night=0,hour?:number)=>{
    const activity=automationShare===undefined?null:automationActivity(automationShare),rhythm=streetRhythm(hour);
    // Presence eases over 1.5 s of animation time; a reset, snapshot or jump settles at once.
    fade=Number.isFinite(lastTime)&&time>lastTime?(time-lastTime)/1.5:1;dt=time>lastTime&&time-lastTime<.5?time-lastTime:0;lastTime=time;
    const amount=(count:number,index:number)=>T.MathUtils.clamp(count-index,0,1);
    stepTraffic(time,rhythm.people);
    mint.emissiveIntensity=.65+state.neon*1.8;
    airShell.emissiveIntensity=activity?activity.level*.85:0;
    collar.emissiveIntensity=night*4;
    headlight.emissiveIntensity=.2+night*4;taillight.emissiveIntensity=.15+night*3;
    // Trains alternate between the south-west (even) and north-east (odd) tracks, two places per track whether or not both run.
    for(let train=0;train<MAX_TRAINS;train++)for(let car=0;car<CARS;car++){
      const track=train%2,{u,visible}=trainPose(time,train>>1,MAX_TRAINS/2,car,trackLength[track]);
      place(path.tracks[track],u);pose.scale.setScalar(visible*(activity?amount(activity.pods,train*CARS+car):train<TRAINS?T.MathUtils.smoothstep(state.traffic*.5+.5-train*.3,0,.1):0));pods.set(train*CARS+car,pose);
    }pods.flush();
    for(let car=0;car<SWEEP_CARS;car++){
      // Drawn at SWEEP_SCALE so the train reads at hero distance; the shortened length spaces the cars by the same factor.
      const {u,forward}=podPose(time+20,0,car,sweepLength/SWEEP_SCALE);
      place(path.sweep,u,!forward);pose.rotation.x=-Math.asin(T.MathUtils.clamp(tangent.y,-1,1));pose.scale.setScalar(SWEEP_SCALE*T.MathUtils.smoothstep(state.traffic*.5+.5,0,.1));sweepPods.set(car,pose);
    }sweepPods.flush();
    // Leaders first: each party's pose, then the sidesteps that let faster parties pass slower ones (stoppers veer on their own).
    const leads:{w:ReturnType<typeof walkerPose>;stop:ReturnType<typeof stops.get>;lane:number}[]=[],movers:Mover[]=[],moverOf:number[]=[];
    for(let i=0;i<MAX_WALKERS;i+=walkerParty(i).size){
      const party=walkerParty(i),route=walkerRoute(party.id),onDeck=route>1,stop=stops.get(i),w=walkerPose(time,i,walkLength[route],stop);
      // Deck walkers keep to the 9 m deck's outer lanes, clear of the 5.2 m planted middle bed, in single file and without stopping (too
      // narrow to pass a party abreast or a group standing in the lane).
      const lane=onDeck?3.5+(party.size===1?(i%2-.5)*.6:0):w.lane,share=party.size===3?rhythm.children:w.jog?rhythm.joggers:w.stops?rhythm.strollers:rhythm.people;
      leads[i]={w,stop,lane};
      if(w.visible>0&&(activity?amount(activity.walkers,i)>0:i<WALKERS&&state.crowd*.8+.2>i/WALKERS)&&share>hash(i,20)){
        // A stopper veering to its spot (or there) holds its own line, given by the approach below; others make room around it.
        let held=lane;
        if(stop&&w.approach){place(walks[route],w.u,!w.forward);held=T.MathUtils.lerp(lane,-seaward().sea*(stop.seat?T.MathUtils.lerp(stop.out,stop.seat,w.dwell):stop.out),ease(w.approach));}
        // Lane centres stay 0.25 m off the centre line and, on the promenade, 2.1 m out (a shoulder clears the bench backrest at 2.48 m).
        moverOf[i]=movers.length;movers.push({path:route,dir:w.forward?1:-1,d:w.u*walkLength[route],lane:held,ext:onDeck?0:party.ext,front:onDeck||party.size===1?0:.3,
          back:onDeck?(party.size-1)*.8:party.size===3?1.05:0,inner:onDeck?2.85:.25,outer:onDeck?4.2:2.1,fixed:held!==lane||w.dwell>0});
      }
    }
    const passing=passingLanes(movers);
    for(let i=0;i<MAX_WALKERS;i++){
      const party=walkerParty(i),route=walkerRoute(party.id),{w,stop,lane:base}=leads[party.leader];
      const share=party.size===3?rhythm.children:w.jog?rhythm.joggers:w.stops?rhythm.strollers:rhythm.people;
      const weight=walkerGate(i,(activity?true:i<WALKERS&&state.crowd*.8+.2>i/WALKERS)&&share>hash(party.leader,20))*(activity?amount(activity.walkers,i):1);
      place(walks[route],w.u,!w.forward);const {sea,yaw:facing}=seaward();
      // In formation (see walkerParty), drifting a little; `lane` is metres right of the centre line for this direction.
      const moved=moverOf[party.leader]===undefined||stop&&w.approach?null:passing[moverOf[party.leader]],lead=moved?moved.lane:base;
      const onDeck=route>1;
      // Feet follow ground actually covered (trip distance plus the solver's along offset), so a queued party stops stepping; a stopper's
      // legs settle within the first second of its stop (its trip distance freezes at once).
      if(!party.slot)partyTravel[i]=moved?walkerTravel.at(i,lead,moved.along,w.speed):walkerTravel.still(i);
      const {pace,turn}=partyTravel[party.leader],phase=((w.forward?w.u:1-w.u)*walkLength[route]+(moved?moved.along:0))*5.5+party.leader,feet=(1-Math.min(1,w.dwell*4))*pace,stride=Math.sin(phase)*feet;
      let lane=lead+(onDeck?0:party.side)+.04*Math.sin(time*.5+i*2.3)*(1-w.dwell),along=(onDeck?party.file:party.along)+(moved?moved.along:0),slope=0;
      // Promenade stoppers veer out of the lane to their stool's front or rail spot (a party lines up along the rail), a sitter settles
      // back onto the seat, and all veer back in after; `slope` turns the body along the diagonal.
      if(stop){
        const a=ease(w.approach),target=-sea*(stop.seat?T.MathUtils.lerp(stop.out,stop.seat,w.dwell):stop.out),lineup=party.lineup;
        lane=T.MathUtils.lerp(lane,target,a);along=T.MathUtils.lerp(along,lineup,a);slope=(target-lead)*6*w.approach*(1-w.approach)/5*(w.leaving?-1:1);
      }
      pose.position.addScaledVector(side,-lane).addScaledVector(tangent,along);pose.position.y+=Math.abs(stride)*.025*w.speed-(stop&&stop.seat?.08*w.dwell:0);
      if(slope)pose.rotation.y=Math.atan2(tangent.x-side.x*slope,tangent.z-side.z*slope);else pose.rotation.y+=turn*(1-w.dwell);
      // A stopped walker turns to face the bay (and sits, at a stool).
      if(w.dwell>0)pose.rotation.y+=w.dwell*((((stop?facing:seaYaw)-pose.rotation.y)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI);
      pose.rotation.z=stride*.03;pose.scale.setScalar(weight*w.visible*(party.child?.62:.93+.12*hash(i,8)));people.set(i,pose);
      people.gait(i,phase+party.slot*2.1,(w.jog?.8:.45)*feet,stop&&stop.seat?w.dwell:0);
    }
    for(let k=0;k<TRANSFERS;k++){
      const tp=transferPose(time,k);
      pose.position.set(INTERCHANGE.shore[0]+seaX*tp.d+alongX*tp.side,.5,INTERCHANGE.shore[2]+seaZ*tp.d+alongZ*tp.side);
      pose.rotation.set(0,k%2?seaYaw:seaYaw+Math.PI,tp.moving?Math.sin(time*6+k)*.03:0);pose.scale.setScalar(tp.visible);people.set(MAX_WALKERS+k,pose);
      people.gait(MAX_WALKERS+k,time*6+k,tp.moving?.45:0);
    }people.flush();
    const doorShare=activity?activity.walkers/MAX_WALKERS:T.MathUtils.clamp(state.crowd*.8+.2,0,1);
    // Doorway trips follow their rounded curve; a reverse trip faces back along it. `lane` metres right of travel, `along` ahead.
    const onTrip=(trip:typeof doorTrips[number],d:number,reverse:boolean,lane=0,along=0)=>{
      const dir=reverse?-1:1,u=T.MathUtils.clamp((d+along*dir)/trip.length,0,1);trip.curve.getPointAt(u,pose.position);trip.curve.getTangentAt(u,tangent);
      pose.position.x-=dir*tangent.z*lane;pose.position.z+=dir*tangent.x*lane;pose.position.y=0;pose.rotation.set(0,Math.atan2(tangent.x,tangent.z)+(reverse?Math.PI:0),0);
    };
    // Forecourt walkers and robots keep right on their trip and make way for each other (passingLanes); a halted robot and its
    // collector hold still. Movers' `path` is the trip.
    const tripOf=(k:number)=>k%Math.max(doorWalks.length,1),robotTrip=(k:number)=>(k+3)%Math.max(doorWalks.length,1); // one robot per trip while trips ≥ ROBOTS
    const doorMovers:Mover[]=[],doorMover:number[]=[],robotMover:number[]=[],doorPoses=[] as ReturnType<typeof doorwayPose>[],robotPoses=[] as ReturnType<typeof robotPose>[];
    const lane={inner:.15,outer:1.3};
    for(let k=0;k<DOOR_WALKERS-4;k++){
      const trip=doorWalks[tripOf(k)];if(!trip)break;
      const w=doorPoses[k]=doorwayPose(time,k,trip.length);
      if(w.visible>0&&amount(doorShare*DOOR_WALKERS,k)>0&&rhythm.people>hash(k,20)){doorMover[k]=doorMovers.length;doorMovers.push({path:tripOf(k),dir:w.reverse?-1:1,d:w.d,lane:.45,ext:0,...lane});}
    }
    for(let k=0;k<ROBOTS;k++){
      const trip=doorWalks[robotTrip(k)];if(!trip)break;
      const w=robotPoses[k]=robotPose(time,500+k,trip.length),dir=w.reverse?-1:1;
      if(w.visible>0&&rhythm.robots>hash(k,24)){
        robotMover[k]=doorMovers.length;doorMovers.push({path:robotTrip(k),dir,d:w.d,lane:.45,ext:.3,front:.45,back:.45,...lane,fixed:w.waited>=0});
        // The collector stands on the robot's line, between it and the door.
        if(w.waited>=0)doorMovers.push({path:robotTrip(k),dir,d:w.reverse?collectorPose(w.waited).e:trip.length-collectorPose(w.waited).e,lane:.45,ext:0,...lane,fixed:true});
      }
    }
    const doorPassing=passingLanes(doorMovers);
    for(let k=0;k<DOOR_WALKERS-4;k++){
      const trip=doorWalks[tripOf(k)];
      if(!trip){pose.scale.setScalar(0);doorPeople.set(k,pose);continue;}
      const w=doorPoses[k],m=doorMover[k]===undefined?null:doorPassing[doorMover[k]];
      const {pace,turn}=m?doorTravel.at(k,m.lane,m.along,w.speed):doorTravel.still(k),phase=T.MathUtils.clamp((w.reverse?trip.length-w.d:w.d)+(m?m.along:0),0,trip.length)*5.5+k;
      onTrip(trip,w.d,w.reverse,m?m.lane:.45,m?m.along:0);pose.rotation.y+=turn;pose.rotation.z=Math.sin(phase)*.03*pace;
      pose.scale.setScalar(amount(doorShare*DOOR_WALKERS,k)*w.visible*doorGate(k,rhythm.people>hash(k,20))*(.93+.12*hash(k,8)));doorPeople.set(k,pose);doorPeople.gait(k,phase,.45*pace);doorPeople.social(k,0,0);
    }
    for(let g=0;g<2;g++){
      const trip=entranceTrips[g];
      for(let j=0;j<2;j++){
        const slot=DOOR_WALKERS-4+g*2+j;
        if(!trip){pose.scale.setScalar(0);doorPeople.set(slot,pose);entries.set(g*2+j,pose);continue;}
        const w=entrancePose(time,g,trip.length,j);
        onTrip(trip,w.d,false,w.lane);pose.rotation.y+=w.yaw;
        pose.scale.setScalar(w.visible);doorPeople.set(slot,pose);doorPeople.gait(slot,w.phase,w.walking?.4:0);doorPeople.social(slot,0,w.greeting*(j?.32:.18));
        const at=j?trip.end:trip.start,out=(j?trip.curve.points.at(-3)!:trip.curve.points[2]).clone().sub(at).normalize();
        pose.position.copy(at);pose.rotation.set(0,Math.atan2(out.x,out.z),0);pose.scale.setScalar(1);entries.set(g*2+j,pose);
      }
    }entries.flush();
    // Delivery robots roll to the next door and wait while a collector steps out to meet them, then both go in.
    for(let k=0;k<ROBOTS;k++){
      const trip=doorWalks[robotTrip(k)],slot=COLLECTORS+k;
      if(!trip){pose.scale.setScalar(0);robots.set(k,pose);doorPeople.set(slot,pose);continue;}
      const w=robotPoses[k],present=robotGate(k,rhythm.robots>hash(k,24)),m=robotMover[k]===undefined?null:doorPassing[robotMover[k]];
      onTrip(trip,w.d,w.reverse,m?m.lane:.45,m?m.along:0);pose.rotation.y+=(m&&w.waited<0?robotTravel.at(k,m.lane,m.along,ROBOT_SPEED):robotTravel.still(k)).turn;pose.scale.setScalar(w.visible*present);robots.set(k,pose);
      const c=collectorPose(w.waited);
      onTrip(trip,w.reverse?c.e:trip.length-c.e,!w.reverse,-.45);pose.rotation.y+=Math.PI*(1-c.facing);
      pose.scale.setScalar(w.waited<0?0:present*T.MathUtils.clamp(c.e/.5,0,1)*(.93+.12*hash(slot,8)));doorPeople.set(slot,pose);
      doorPeople.gait(slot,time*6+slot,c.walking?.45:0);
    }robots.flush();
    // Resting groups share conversational turns; seated hips/legs stay on their authored seat while heads and a hand respond.
    // The crowd level decides how many spots are taken, never how big the people are.
    const occupied=(k:number,share:number,key:number)=>restGate(k,Math.min(1,doorShare*1.4)*share>key);
    spots.forEach((spot,k)=>{
      const share=spot.seated?rhythm.sitters:rhythm.strollers,c=conversationPose(time,Math.floor(k/2),k%2),partner=spots[k^1];
      const together=Math.min(1,doorShare*1.4)*share>hash(k^1,21),look=yawTo(spot.yaw,Math.atan2(partner.at.x-spot.at.x,partner.at.z-spot.at.z));
      pose.position.copy(spot.at);pose.rotation.set(0,spot.yaw,0);
      pose.scale.setScalar(occupied(k,spot.seated?rhythm.sitters:rhythm.strollers,hash(k,21))*(.93+.12*hash(k,8)));resting.set(k,pose);resting.gait(k,0,0,spot.seated);
      resting.social(k,together?T.MathUtils.clamp(look,-.65,.65)*c.attention:0,together?c.gesture:0);
    });
    for(let g=0;g<FORECOURT_GROUPS;g++){
      const spot=doorSpots[g],v=spot?.visit?visitPose(time,g,spot.visit.length):null,members=v?3:hash(g,26)<.4?2:3;
      for(let j=0;j<3;j++){
        const k=spots.length+g*3+j;
        if(!spot||(j===2&&!v&&members===2)){pose.scale.setScalar(0);resting.set(k,pose);resting.social(k,0,0);continue;}
        const a=j*Math.PI*2/3+spot.yaw,c=conversationPose(time,1000+g,j,members);
        pose.position.set(spot.at.x+Math.sin(a)*.65,0,spot.at.z+Math.cos(a)*.65);pose.rotation.set(0,a+Math.PI,0);
        if(j===2&&v&&spot.visit){
          place(spot.visit.curve,v.u,v.returning);pose.rotation.y+=yawTo(pose.rotation.y,a+Math.PI)*v.dwell;
        }
        const toward=spot.yaw+c.toward*2*Math.PI/3,look=yawTo(pose.rotation.y,Math.atan2(spot.at.x+Math.sin(toward)*.65-pose.position.x,spot.at.z+Math.cos(toward)*.65-pose.position.z));
        const talking=v&&(j===2||c.toward===2||c.speaker===2)?v.dwell:1;
        // Visiting groups keep a lower presence threshold so their journeys also exist in the mature high-automation city.
        pose.scale.setScalar(occupied(k,rhythm.people,hash(g,27)*(v?.25:1))*(.93+.12*hash(k,8))*(j===2&&v?v.visible:1));resting.set(k,pose);
        resting.gait(k,j===2&&v?v.phase:0,j===2&&v&&v.walking?.45:0);
        resting.social(k,T.MathUtils.clamp(look,-.65,.65)*c.attention*talking,c.gesture*talking);
      }
    }resting.flush();
    for(let r=0,slot=0;r<path.streets.length;r++)for(let lane=0;lane<2;lane++)for(let c=0;c<streetCars[r];c++,slot++){
      const drop=r===DROP_OFF.road&&lane===DROP_OFF.lane?(DROP_OFF.cars as readonly number[]).indexOf(c):-1;
      const span=streetLength[r]+40,at={...laneAt(carT[slot],span),speed:8+3*hash(r*2+lane,14),span};
      const car=drop<0?{d:lane?streetLength[r]-at.x:at.x,visible:fadeEnds(at.x,streetLength[r]),bay:0,steer:0}:dropOffAt(at,streetLength[r],DROP_OFF.stops[drop]);
      place(path.streets[r],car.d/streetLength[r],lane===1);side.crossVectors(up,tangent).normalize();
      pose.position.addScaledVector(side,(r?1.75:1.25)+car.bay*DROP_OFF.bay).y+=.1;pose.rotation.y+=car.steer;if(drop>=0)pose.rotation.x=(car as ReturnType<typeof dropOffPose>).pitch;
      // Every seventh car is a 7 m van; traffic density and the commute rhythm thin the fleet (drop-off cars always run).
      // Human-driven cars give way to autonomous pods slot by slot as automation rises; standalone keeps the cars.
      const van=vanOf[slot]===1,density=drop<0?carGate(slot,state.traffic*.6+.5>hash(slot,18)&&rhythm.cars>hash(slot,22)):1;
      const shown=car.visible*density,pod=activity?podShare(activity.level,slot):0;
      pose.scale.set(1,van?1.3:1,van?1.55:1).multiplyScalar(shown*(1-pod));cars.set(slot,pose);
      pose.scale.set(1,van?1.3:1,van?1.55:1).multiplyScalar(shown*pod);streetPods.set(slot,pose);
      // Brake lamp over the tail light (a pod's sits .13 m lower).
      const lit=Math.max(carBrake[slot],drop>=0?(car as ReturnType<typeof dropOffPose>).brake:0);
      pose.position.y-=pod>.5?.13*(van?1.3:1):0;pose.scale.set(1,van?1.3:1,van?1.55:1).multiplyScalar(shown*lit);brakeLamps.set(slot,pose);pose.position.y+=pod>.5?.13*(van?1.3:1):0;
      if(drop>=0){
        const cue=car as ReturnType<typeof dropOffPose>;passengers(drop,cue,pose.position.clone().addScaledVector(side,1.4).setY(0));
        // Indicators blink at 1.5 Hz on the kerb (+x, Japan keeps left) or road side, just proud of the body.
        const kerbX=new T.Vector3(1,0,0).applyEuler(pose.rotation),on=cue.signal&&(time*1.5)%1<.5?1:0;
        pose.position.addScaledVector(kerbX,cue.signal*.95);pose.scale.setScalar(shown*on);indicators.set(drop,pose);
      }
    }
    // Crossing residents walk along the footway to the kerb, wait facing the road, cross once it is clear and walk on along the far
    // footway; mint edge lines while requested.
    crossing.forEach((c,k)=>{
      const at=crossAt[k],{kerb}=at,u=(span:number)=>T.MathUtils.clamp((time-c.at)/span,0,1);
      // `a`: metres across from the centre line toward the starting side; `along` metres along the avenue; `walked` metres since
      // appearing (stride phase); `turn` 0 facing along the footway, 1 facing across.
      let a=kerb,along=0,walked=8,turn=1;
      if(c.phase==='arrive'){along=c.from*8*(1-u(6));walked=8*u(6);turn=T.MathUtils.clamp(1-Math.abs(along),0,1);}
      else if(c.phase==='cross'){const f=u(2*kerb/1.4);a=kerb-2*kerb*f;walked=8+2*kerb*f;}
      else if(c.phase==='leave'){a=-kerb;along=c.to*8*u(6);walked=8+2*kerb+8*u(6);turn=T.MathUtils.clamp(1-Math.abs(along),0,1);}
      const shown=c.phase==='idle'?0:T.MathUtils.clamp((8-Math.abs(along))/1.5,0,1);
      const across=Math.atan2(-at.t.z*c.side,at.t.x*c.side),alongYaw=Math.atan2(at.t.x,at.t.z)+((c.phase==='leave'?c.to:-c.from)>0?0:Math.PI);
      for(let j=0;j<2;j++){
        // A pair stays 0.7 m apart along the avenue: abreast crossing it, one behind the other on the footway.
        const slot=CROSSERS+k*2+j,offset=c.size===2?(j?.35:-.35):0;
        pose.position.set(at.p.x+at.t.z*c.side*a+at.t.x*(along+offset),0,at.p.z-at.t.x*c.side*a+at.t.z*(along+offset));
        pose.rotation.set(0,alongYaw+yawTo(alongYaw,across)*turn,0);
        pose.scale.setScalar(j<c.size?shown*(.93+.12*hash(slot,8)):0);doorPeople.set(slot,pose);
        doorPeople.gait(slot,walked*5.5+slot,c.phase==='wait'?0:.45);doorPeople.social(slot,0,0);
      }
      pose.position.copy(at.p);pose.rotation.set(0,at.yaw,0);pose.scale.set(2*at.half+.6,1,1).multiplyScalar(requested(k,time)?1:0);crossLights.set(k,pose);
    });
    cars.flush();streetPods.flush();doorPeople.flush();indicators.flush();brakeLamps.flush();crossLights.flush();
    // Boats (boatPoses) bob and roll a little; loop taxis thin with traffic and the berthed interchange boat leaves no wake.
    boatPoses(time,path).forEach((b,i)=>{
      pose.position.set(b.x,b.y+Math.sin(time*(i<BOATS?1.3:1.1)+i)*.08,b.z);pose.rotation.set(0,b.yaw,i<BOATS?Math.sin(time*.9+i)*.02:0);
      pose.scale.setScalar(b.scale*(i<BOATS?T.MathUtils.smoothstep(state.traffic*.6+.4-i/(BOATS+1),-.05,.05):1));boats.set(i,pose);
      pose.rotation.z=0;if('dock' in b)pose.scale.multiplyScalar(Math.max(1-b.dock.settle,1e-4));wakes.set(i,pose);
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
  /** Street traffic as simulated, for checks: every lane slot (lane travel `x`, metres behind its free slot, length, speed, in its bay)
   * and every crossing. */
  return Object.assign(update,{traffic:()=>({
    cars:carLanes.flatMap((l,i)=>Array.from({length:l.n},(_,k)=>{const s=laneBase[i]+k;return {lag:laneTravel(simTime,l.road,l.lane,k,l.n,l.length).travelled-carT[s],road:l.road,lane:l.lane,x:laneAt(carT[s],l.span).x,length:carLen[s],v:carV[s],bay:inBay[s]===1,brake:carBrake[s]===1};})),
    crossings:crossing.map((c,k)=>({...CROSSINGS[k],phase:c.phase,size:c.size,lanes:carLanes.flatMap((l,i)=>l.road===CROSSINGS[k].road?[{lane:l.lane,x:laneX(i,CROSSINGS[k].d)}]:[])})),
  })});
}
