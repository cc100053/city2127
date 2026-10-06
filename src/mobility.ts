import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldState } from './presets.ts';
import { guideway, promenades, waterLoop, ferryLane, airLoop, sphereApproach, SPHERE_DOCK, bayCruisers, sweepway, shoreLane, interchangeApproach, interchangeBoatLane, INTERCHANGE, midDecks, gardenDecks } from './layout.ts';

const ease=(t:number)=>T.MathUtils.smoothstep(t,0,1);
const curve=(points:readonly (readonly [number,number,number])[],closed=false)=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal');
/** Every actor path in the Odaiba scene, in metres. */
export function routes() {
  return {guideway:curve(guideway),promenades:promenades.map(p=>curve(p)),water:curve(waterLoop,true),ferry:curve(ferryLane),air:curve(airLoop,true),approach:curve(sphereApproach),sweep:curve(sweepway),
    shore:curve(shoreLane,true),ixApproach:curve(interchangeApproach),ixBoat:curve(interchangeBoatLane),decks:[...midDecks,...gardenDecks].map(p=>curve(p))};
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
export const WALKERS=40, AIR_SCALE=5;
const MAX_WALKERS=160, MAX_TRAINS=4, LOOP_AIRCRAFT=30;
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
  return {level,aircraft:count(2+28*level),pods:count(CARS*(2+2*level)),walkers:count(40+120*(1-level))};
}
/** Walkers (route: `walkerRoute`): slow out-and-back strolls, keeping right for their direction. Every third stops once each way at a
 * viewpoint for DWELL s (`dwell` eases 0→1→0 so the figure can turn to the sea); walking time is shifted, not sped up. */
const DWELL=40;
export function walkerPose(time:number,index:number,count=WALKERS) {
  const period=420+(index%7)*23,lane=(forward:boolean)=>(forward?1:-1)*(1.2+(index%3)*.8);
  if(index%3!==2){const {u,forward}=pingPong(time,period,index/count*2);return {u,forward,lane:lane(forward),stride:Math.sin(time*6+index),dwell:0};}
  const half=period+DWELL,s=((time+index/count*2*period)%(2*half)+2*half)%(2*half),forward=s<half,local=forward?s:s-half;
  // One viewpoint per walker (u = .3–.7), reached `start` s into each pass in either direction.
  const stop=.3+(index%5)*.1,start=(forward?stop:1-stop)*period;
  const walked=local<start?local:local<start+DWELL?start:local-DWELL,dwell=T.MathUtils.clamp(Math.min(local-start,start+DWELL-local)/4,0,1);
  const u=forward?walked/period:1-walked/period;
  return {u,forward,lane:lane(forward),stride:Math.sin(time*6+index)*(1-dwell),dwell};
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
  };
}

/** Shared capsule figures and palette, used by promenade and plaza crowds. */
export function pedestrians(scene:T.Object3D,count:number,name:string) {
  // People: capsule torso and limbs, round head and hair; clothes, skin and hair vary per person from a muted palette (no saffron).
  const coats=material('#ffffff'),skin=material('#ffffff'),hair=material('#ffffff'),trousers=material('#3d4a52');
  const capsule=(r:number,length:number,at:[number,number,number],mat:T.Material,depth=1):Part=>({geometry:new T.CapsuleGeometry(r,length,4,10).scale(1,1,depth).translate(...at),material:mat});
  const people=fleet(scene,[
    capsule(.22,.36,[0,.96,0],coats,.72),{geometry:new T.SphereGeometry(.15,14,10).translate(0,1.5,0),material:skin},
    {geometry:new T.SphereGeometry(.162,14,6,0,Math.PI*2,0,Math.PI*.55).translate(0,1.52,-.012),material:hair},
    capsule(.07,.42,[-.29,.98,0],coats),capsule(.07,.42,[.29,.98,0],coats),
    {geometry:new T.CapsuleGeometry(.08,.4,4,8).translate(-.13,.33,0),material:trousers},{geometry:new T.CapsuleGeometry(.08,.4,4,8).translate(.13,.33,0),material:trousers},
    {geometry:new T.TorusGeometry(.2,.06,6,16).rotateX(Math.PI/2).translate(0,1.34,0),material:collar},
  ],count,name);
  const clothes=['#4f6f7c','#b5836f','#6d8a5f','#2f3e48','#c9b48a','#8c6f8f','#3f5a52','#e4e1d8'],skins=['#e8cdb0','#c99e7c','#8d6348','#f0d9c2'],hairs=['#2f2a27','#5a4033','#1d2226','#b9a58c','#d8d8d4'];
  for(let i=0;i<count;i++){people.tint(i,coats,clothes[(i*5)%clothes.length]);people.tint(i,skin,skins[(i*3)%skins.length]);people.tint(i,hair,hairs[(i*7)%hairs.length]);}
  return people;
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
  const people=pedestrians(scene,MAX_WALKERS+TRANSFERS,'promenade-walkers');
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
  return (state:WorldState,time:number,automationShare?:number,night=0)=>{
    const activity=automationShare===undefined?null:automationActivity(automationShare);
    const amount=(count:number,index:number)=>T.MathUtils.clamp(count-index,0,1);
    mint.emissiveIntensity=.65+state.neon*1.8;
    airShell.emissiveIntensity=activity?activity.level*.85:0;
    collar.emissiveIntensity=night*4;
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
      const w=walkerPose(time,i,i<WALKERS?WALKERS:MAX_WALKERS),weight=activity?amount(activity.walkers,i):i<WALKERS?T.MathUtils.smoothstep(state.crowd*.8+.2-i/WALKERS,-.05,.05):0;
      const route=walkerRoute(i),onDeck=route>1;
      place(onDeck?path.decks[route-2]:path.promenades[route],w.u,!w.forward);side.crossVectors(up,tangent).normalize();
      // Deck walkers keep to the 9 m deck's outer lanes, clear of the planted middle bed.
      pose.position.addScaledVector(side,-(onDeck?(w.forward?1:-1)*(3.2+(i%2)*.6):w.lane));
      // A stopped walker turns to face the bay.
      if(w.dwell>0)pose.rotation.y+=w.dwell*(((seaYaw-pose.rotation.y)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI);
      pose.rotation.z=w.stride*.03;pose.scale.setScalar(weight);people.set(i,pose);
    }
    for(let k=0;k<TRANSFERS;k++){
      const tp=transferPose(time,k);
      pose.position.set(INTERCHANGE.shore[0]+seaX*tp.d+alongX*tp.side,.5,INTERCHANGE.shore[2]+seaZ*tp.d+alongZ*tp.side);
      pose.rotation.set(0,k%2?seaYaw:seaYaw+Math.PI,tp.moving?Math.sin(time*6+k)*.03:0);pose.scale.setScalar(tp.visible);people.set(MAX_WALKERS+k,pose);
    }people.flush();
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
