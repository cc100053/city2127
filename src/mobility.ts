import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldState } from './presets.ts';
import { guideway, promenades, waterLoop, ferryLane, airLoop, sphereApproach, SPHERE_DOCK } from './layout.ts';

const ease=(t:number)=>T.MathUtils.smoothstep(t,0,1);
const curve=(points:readonly (readonly [number,number,number])[],closed=false)=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal');
/** Every actor path in the Odaiba scene, in metres. */
export function routes() {
  return {guideway:curve(guideway),promenades:promenades.map(p=>curve(p)),water:curve(waterLoop,true),ferry:curve(ferryLane),air:curve(airLoop,true),approach:curve(sphereApproach)};
}
/** 0→1→0 over `period` seconds: out-and-back routes reverse instead of jumping. */
const pingPong=(time:number,period:number,offset=0)=>{const p=((time/period+offset)%2+2)%2;return {u:p<1?p:2-p,forward:p<1};};

export const TRAINS=2, CARS=6, CAR_GAP=10;
/** Guideway pods: two six-car trains shuttle end to end; the lead car always faces the direction of travel. */
export function podPose(time:number,train:number,car:number,length:number) {
  const margin=CARS*CAR_GAP/length,{u,forward}=pingPong(time,70,train);
  const head=margin+u*(1-2*margin);
  return {u:head+(forward?-1:1)*car*CAR_GAP/length,forward};
}
export const WALKERS=40, AIR_SCALE=5;
/** Promenade walkers (even: east promenade, odd: west): slow out-and-back strolls, keeping right for their direction. */
export function walkerPose(time:number,index:number) {
  const {u,forward}=pingPong(time,420+(index%7)*23,index/WALKERS*2);
  return {u,forward,lane:(forward?1:-1)*(1.2+(index%3)*.8),stride:Math.sin(time*6+index)};
}
/** Sphere shuttle: a 40 s cycle — approach from the bay, settle onto the berth, lift off and return. */
export function dockMotion(time:number) {
  const t=((time%40)+40)%40;
  const u=t<14?ease(t/14):t<26?1:1-ease((t-26)/14);
  return {u,settle:ease((t-14)/3)*(1-ease((t-23)/3)),visible:ease(t/2)*(1-ease((t-38)/2)),docked:t>=14&&t<26};
}
export function guideStrength(sample:number,head:number,closed:boolean) {
  let d=sample-head;
  if(closed)d=((d+.5)%1+1)%1-.5;
  return Math.max(0,1-Math.abs(d-.022)/.07);
}

function material(color:string,emissive=false) {
  return new T.MeshStandardMaterial({color,roughness:.65,emissive:emissive?color:0,emissiveIntensity:emissive?1.3:0});
}
const shell=material('#dfebd9'),glass=material('#284f65'),mint=material('#74dace',true),coral=material('#e7a097');
type Part={geometry:T.BufferGeometry;material:T.Material};
function part(size:[number,number,number],at:[number,number,number],mat:T.Material,radius=.15):Part {
  return {geometry:new RoundedBoxGeometry(...size,2,Math.min(radius,...size.map(n=>n/2))).translate(...at),material:mat};
}
function wing():Part {
  const shape=new T.Shape();shape.moveTo(-2.2,-.8);shape.lineTo(-.5,.8);shape.lineTo(.5,.8);shape.lineTo(2.2,-.8);shape.lineTo(.55,-.4);shape.lineTo(-.55,-.4);shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false});geometry.rotateX(-Math.PI/2);return {geometry,material:shell};
}
function fleet(scene:T.Scene,parts:Part[],count:number,name:string) {
  const batches=new Map<T.Material,T.BufferGeometry[]>();
  parts.forEach(p=>{const list=batches.get(p.material)??[];list.push(p.geometry.index?p.geometry.toNonIndexed():p.geometry);batches.set(p.material,list);});
  const meshes=[...batches].map(([mat,geometries])=>{
    const mesh=new T.InstancedMesh(mergeGeometries(geometries),mat,count);
    mesh.name=name;mesh.castShadow=true;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);return mesh;
  });
  return {
    set(index:number,pose:T.Object3D){pose.updateMatrix();meshes.forEach(m=>m.setMatrixAt(index,pose.matrix));},
    /** Per-actor colour for the parts drawn with `mat` (a white base the instance colour multiplies); set once at build. */
    tint(index:number,mat:T.Material,color:T.ColorRepresentation){meshes.forEach(m=>{if(m.material===mat)m.setColorAt(index,new T.Color(color));});},
    flush(){meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);},
  };
}

export function mobility(scene:T.Scene) {
  const path=routes(),guideLength=path.guideway.getLength();
  // Guideway pods (ART.md §7): rounded white cars with a glass band and a mint service line, 9 m long.
  const body=material('#ffffff');
  const pods=fleet(scene,[part([2.7,2.6,9],[0,1.5,0],body,.6),part([2.76,.9,7.6],[0,2,0],glass,.3),part([2.8,.14,8],[0,.9,0],mint,.05),part([2.2,.12,.12],[0,1.3,4.5],coral,.05)],TRAINS*CARS,'guideway-pods');
  // Deep teal against the pale guideway so the trains read from the hero pose.
  for(let i=0;i<TRAINS*CARS;i++)pods.tint(i,body,i<CARS?'#3f7f86':'#5a8f7a');
  // People: capsule torso and limbs, round head and hair; clothes, skin and hair vary per person from a muted palette (no saffron).
  const coats=material('#ffffff'),skin=material('#ffffff'),hair=material('#ffffff'),trousers=material('#3d4a52');
  const capsule=(r:number,length:number,at:[number,number,number],mat:T.Material,depth=1):Part=>({geometry:new T.CapsuleGeometry(r,length,4,10).scale(1,1,depth).translate(...at),material:mat});
  const people=fleet(scene,[
    capsule(.22,.36,[0,.96,0],coats,.72),{geometry:new T.SphereGeometry(.15,14,10).translate(0,1.5,0),material:skin},
    {geometry:new T.SphereGeometry(.162,14,6,0,Math.PI*2,0,Math.PI*.55).translate(0,1.52,-.012),material:hair},
    capsule(.07,.42,[-.29,.98,0],coats),capsule(.07,.42,[.29,.98,0],coats),
    {geometry:new T.CapsuleGeometry(.08,.4,4,8).translate(-.13,.33,0),material:trousers},{geometry:new T.CapsuleGeometry(.08,.4,4,8).translate(.13,.33,0),material:trousers},
  ],WALKERS,'promenade-walkers');
  const clothes=['#4f6f7c','#b5836f','#6d8a5f','#2f3e48','#c9b48a','#8c6f8f','#3f5a52','#e4e1d8'],skins=['#e8cdb0','#c99e7c','#8d6348','#f0d9c2'],hairs=['#2f2a27','#5a4033','#1d2226','#b9a58c','#d8d8d4'];
  for(let i=0;i<WALKERS;i++){people.tint(i,coats,clothes[(i*5)%clothes.length]);people.tint(i,skin,skins[(i*3)%skins.length]);people.tint(i,hair,hairs[(i*7)%hairs.length]);}
  // Water taxis: a low hull with a glass cabin and a mint waterline, 11 m long.
  const boats=fleet(scene,[part([3.6,1.2,11],[0,.4,0],shell,.5),part([2.8,1.3,5],[0,1.5,-.6],glass,.4),part([3.7,.12,11.1],[0,.25,0],mint,.05),part([2.4,.12,.12],[0,1,5.5],coral,.05)],5,'water-taxis');
  // Air taxis: the thin-wing carrier at 5× (22 m span), readable at district distance.
  const drones=fleet(scene,[wing(),part([.8,.35,2.5],[0,.1,0],shell,.15),part([.55,.2,1],[0,.34,.45],glass,.08),
    part([.6,.1,.16],[0,.11,-1.27],mint,.025),part([.09,.4,.65],[0,.32,-.8],glass,.02)],7,'air-taxis');
  const berthLight=new T.PointLight('#b9e2cf',0,60,2);berthLight.position.set(SPHERE_DOCK[0],SPHERE_DOCK[1]+4,SPHERE_DOCK[2]);scene.add(berthLight);
  const guideMaterial=new T.MeshBasicMaterial({color:new T.Color('#88d6d3').multiplyScalar(1.6)});
  const guides=fleet(scene,[part([.36,.1,2.1],[0,0,0],guideMaterial,.03)],192,'air-corridor-guides');
  const airCurves=[path.air,path.approach],samples=airCurves.map(route=>Array.from({length:96},(_,i)=>({p:route.getPointAt(i/96),t:route.getTangentAt(i/96)})));
  const heads=new Float32Array(7),weights=new Float32Array(7);
  const pose=new T.Object3D(),p=new T.Vector3(),tangent=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3(0,1,0);
  const place=(route:T.Curve<T.Vector3>,u:number,reverse=false)=>{route.getPointAt(T.MathUtils.clamp(u,0,1),p);route.getTangentAt(T.MathUtils.clamp(u,0,1),tangent);if(reverse)tangent.negate();pose.position.copy(p);pose.rotation.set(0,Math.atan2(tangent.x,tangent.z),0);};
  return (state:WorldState,time:number)=>{
    mint.emissiveIntensity=.65+state.neon*1.8;
    for(let train=0;train<TRAINS;train++)for(let car=0;car<CARS;car++){
      const {u,forward}=podPose(time,train,car,guideLength);
      place(path.guideway,u,!forward);pose.scale.setScalar(T.MathUtils.smoothstep(state.traffic*.5+.5-train*.3,0,.1));pods.set(train*CARS+car,pose);
    }pods.flush();
    for(let i=0;i<WALKERS;i++){
      const w=walkerPose(time,i),amount=T.MathUtils.smoothstep(state.crowd*.8+.2-i/WALKERS,-.05,.05);
      place(path.promenades[i%2],w.u,!w.forward);side.crossVectors(up,tangent).normalize();pose.position.addScaledVector(side,-w.lane);
      pose.rotation.z=w.stride*.03;pose.scale.setScalar(amount);people.set(i,pose);
    }people.flush();
    for(let i=0;i<4;i++){
      const u=(time*.009+i/4)%1;place(path.water,u);pose.position.y+=Math.sin(time*1.3+i)*.08;pose.rotation.z=Math.sin(time*.9+i)*.02;
      pose.scale.setScalar(T.MathUtils.smoothstep(state.traffic*.6+.4-i/5,-.05,.05));boats.set(i,pose);
    }
    const ferry=pingPong(time,150);place(path.ferry,ferry.u,!ferry.forward);pose.scale.setScalar(1-ease((ferry.u-.85)/.15));boats.set(4,pose);boats.flush();
    for(let i=0;i<6;i++){
      const t=(time*(.004+i%3*.0015)+i/6)%1,density=T.MathUtils.smoothstep(.2+state.traffic*.35-i/9,-.07,.07);
      place(path.air,t);pose.rotation.z=Math.sin(time+i)*.035;pose.scale.setScalar(AIR_SCALE*density);drones.set(i,pose);heads[i]=t;weights[i]=density;
    }
    const dock=dockMotion(time);
    place(path.approach,dock.u,dock.u>0&&!dock.docked&&((time%40)+40)%40>=26);pose.position.y-=dock.settle*6;pose.scale.setScalar(AIR_SCALE*dock.visible);drones.set(6,pose);drones.flush();
    heads[6]=dock.u;weights[6]=dock.visible*(dock.docked?0:1);
    berthLight.intensity=4000*dock.settle*(.4+state.neon*.6);
    for(let r=0;r<2;r++)for(let j=0;j<96;j++){
      let strength=0;
      if(r===0)for(let i=0;i<6;i++)strength=Math.max(strength,guideStrength(j/96,heads[i],true)*weights[i]);
      else strength=guideStrength(j/96,heads[6],false)*weights[6];
      const sample=samples[r][j];pose.position.copy(sample.p).y-=2;pose.rotation.set(0,Math.atan2(sample.t.x,sample.t.z),0);pose.scale.setScalar(strength*3);guides.set(r*96+j,pose);
    }guides.flush();
  };
}
