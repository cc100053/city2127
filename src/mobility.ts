import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldState } from './presets.ts';

import { crossings, crossingPoint, publicJourney, DOCK } from './layout.ts';
export { DOCK } from './layout.ts';
const ease=(t:number)=>T.MathUtils.smoothstep(t,0,1);
// One scripted delivery cycle, shared by the aircraft, parcel, lift and receiver doors.
export function deliveryMotion(time:number) {
  const t=((time%32)+32)%32;
  const travel=t<9?1-ease(t/9):ease((t-20)/9);
  const z=DOCK.berthZ+(24-DOCK.berthZ)*travel;
  const cargoY=DOCK.y-.6+(2.15-(DOCK.y-.6))*ease((t-12)/6);
  const transferZ=DOCK.berthZ+(DOCK.z-DOCK.berthZ)*ease((t-10)/2);
  return {z,yaw:Math.PI*(1-ease((t-18)/2)),
    aircraft:ease(t/1.5)*(1-ease((t-29)/2)),
    cargoY,cargoZ:t<9?z:transferZ,
    cargo:1-ease((t-20)/1),
    liftY:t<22?cargoY-.4:1.75+(DOCK.y-1-1.75)*ease((t-22)/6),
    liftZ:t<28?transferZ:DOCK.z+(DOCK.berthZ-DOCK.z)*ease((t-28)/2),
    hatch:ease((t-10)/2)*(1-ease((t-18)/2))};
}

export function guideStrength(sample:number,head:number,closed:boolean) {
  let d=sample-head;
  if(closed)d=((d+.5)%1+1)%1-.5;
  return Math.max(0,1-Math.abs(d-.022)/.07);
}

// ponytail: a 30s authored traffic cycle; use a traffic simulation only for interactive routing.
export function streetMotion(time:number, index:number, walking:boolean) {
  const cycle=((time%30)+30)%30;
  const start=walking ? 18+Math.floor(index/4)*.25 : Math.floor(index/2)*3;
  const duration=walking ? 9 : 10;
  const progress=T.MathUtils.clamp((cycle-start)/duration,0,1);
  const direction=(index%2 ? 1 : -1)*(walking && Math.floor(time/30)%2 ? -1 : 1);
  return {progress,position:(progress*2-1)*(walking ? 8.3 : 24)*direction,direction,moving:cycle>start && cycle<start+duration};
}

export function pedestrianPose(time:number,index:number) {
  const motion=streetMotion(time,index,true);
  const p=crossingPoint(index%crossings.length,(motion.position/8.3+1)/2,(Math.floor(index/crossings.length)-2)*.42);
  return {...p,yaw:p.yaw+(motion.direction<0?Math.PI:0)};
}

export function airRoutes() {
  const loop=new T.CatmullRomCurve3(Array.from({length:12},(_,i)=>{
    const angle=i/12*Math.PI*2;
    return new T.Vector3(Math.cos(angle)*27,32+Math.sin(angle)*.6,12+Math.sin(angle)*7);
  }),true);
  const express=new T.CatmullRomCurve3([
    new T.Vector3(-29,66,-12),new T.Vector3(-17,67,-22),new T.Vector3(-3,66,-20),
    new T.Vector3(15,66,-19),new T.Vector3(26,66,-7),new T.Vector3(30,66,18),
  ]);
  return [loop,express];
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
    flush(){meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);},
  };
}

export function mobility(scene:T.Scene) {
  const cars=fleet(scene,[
    part([1.65,.65,3],[0,.62,0],shell,.32),part([1.35,.7,1.85],[0,1.15,-.2],glass,.3),
    part([1.5,.12,.15],[0,.8,1.48],mint,.05),part([1.5,.12,.15],[0,.8,-1.48],coral,.05),
    ...[-.72,.72].flatMap(x=>[-.9,.9].map(z=>part([.25,.38,.55],[x,.3,z],glass,.12))),
  ],6,'autonomous-pods');
  const coats=material('#bc8a76'),skin=material('#e3c8a6');
  const people=fleet(scene,[
    part([.48,.65,.36],[0,.91,0],coats,.17),part([.35,.37,.34],[0,1.43,0],skin,.16),
    part([.36,.15,.36],[0,1.59,-.01],glass,.07),
    part([.16,.55,.17],[-.32,.85,0],coats,.07),part([.16,.55,.17],[.32,.85,0],coats,.07),
  ],24,'pedestrians');
  const publicLifts=fleet(scene,[part([1.35,.12,1.35],[0,-.08,0],shell,.02)],12,'public-transfer-platforms');
  const legs=fleet(scene,[part([.17,.55,.19],[0,-.23,0],glass,.06)],48,'walking-legs');
  const drones=fleet(scene,[wing(),part([.8,.35,2.5],[0,.1,0],shell,.15),part([.55,.2,1],[0,.34,.45],glass,.08),
    part([.6,.1,.16],[0,.11,-1.27],mint,.025),part([.09,.4,.65],[0,.32,-.8],glass,.02)],7,'thin-wing-carriers');
  const cargo=fleet(scene,[part([1.05,.65,.95],[0,0,0],coral,.08),part([.13,.67,.97],[0,0,0],shell,.02)],7,'detachable-cargo');
  const lift=fleet(scene,[part([1.42,.14,1.3],[0,0,0],glass,.03)],1,'cargo-lift');
  const doors=fleet(scene,[part([.85,.12,1.65],[0,0,0],shell,.025)],2,'receiver-doors');
  const berthLight=new T.PointLight('#b9e2cf',0,12,2);berthLight.position.set(DOCK.x,DOCK.y+2,DOCK.berthZ+1);scene.add(berthLight);
  const routes=airRoutes();
  const guideMaterial=new T.MeshBasicMaterial({color:new T.Color('#88d6d3').multiplyScalar(1.6)});
  const guides=fleet(scene,[part([.12,.035,.7],[0,0,0],guideMaterial,.01)],224,'on-demand-air-guides');
  const streetGuides=fleet(scene,[part([.15,.015,.58],[0,0,0],guideMaterial,.005)],96+crossings.length*24,'adaptive-street-guides');
  const samples=routes.map(route=>Array.from({length:96},(_,i)=>({p:route.getPointAt(i/96),t:route.getTangentAt(i/96)})));
  const heads=new Float32Array(6),weights=new Float32Array(6),carPositions=new Float32Array(6),carWeights=new Float32Array(6);
  const pose=new T.Object3D(),limb=new T.Object3D(),p=new T.Vector3(),tangent=new T.Vector3();
  return (state:WorldState,time:number)=>{
    mint.emissiveIntensity=.65+state.neon*1.8;
    for(let i=0;i<6;i++){
      const motion=streetMotion(time,i,false),amount=T.MathUtils.smoothstep(state.traffic*.25+.1-i/8,-.08,.08);
      const fade=T.MathUtils.smoothstep(motion.progress,0,.07)*(1-T.MathUtils.smoothstep(motion.progress,.93,1));
      pose.position.set(motion.position,.45,i%2?1.9:-1.9);pose.rotation.set(0,motion.direction*Math.PI/2,0);pose.scale.setScalar(amount*fade);cars.set(i,pose);
      carPositions[i]=motion.position;carWeights[i]=amount*fade;
    }cars.flush();
    for(let i=0;i<24;i++){
      const motion=streetMotion(time,i,true),amount=T.MathUtils.smoothstep(state.crowd*.3+.1-(i<12?i:i-12)/15,-.06,.06);
      const p=i<12?{...pedestrianPose(time,i),y:.46,walking:motion.moving}:publicJourney(time,i-12);
      pose.position.set(p.x,p.y,p.z);
      pose.rotation.set(0,p.yaw,0);pose.scale.setScalar(amount);people.set(i,pose);
      if(i>=12){
        limb.position.copy(pose.position);limb.rotation.set(0,0,0);limb.scale.setScalar(p.walking?0:amount);publicLifts.set(i-12,limb);
      }
      for(let side=0;side<2;side++){
        limb.position.set((side?1:-1)*.13,.59,0);limb.position.multiplyScalar(amount).applyQuaternion(pose.quaternion).add(pose.position);
        limb.rotation.set(p.walking?Math.sin(time*9+i+side*Math.PI)*.5:0,pose.rotation.y,0);limb.scale.setScalar(amount);legs.set(i*2+side,limb);
      }
    }people.flush();legs.flush();publicLifts.flush();
    for(let i=0;i<6;i++){
      const route=routes[i%2],t=(time*(i%2?.014:.023)+i/7)%1;
      route.getPointAt(t,p);route.getTangentAt(t,tangent);
      const density=T.MathUtils.smoothstep(.13+state.traffic*.2-i/9,-.07,.07);
      const edge=i%2?T.MathUtils.smoothstep(t,0,.04)*(1-T.MathUtils.smoothstep(t,.96,1)):1;
      pose.position.copy(p);pose.rotation.set(0,Math.atan2(tangent.x,tangent.z),Math.sin(time+i)*.035);pose.scale.setScalar(density*edge);drones.set(i,pose);
      pose.position.y-=.6;cargo.set(i,pose);heads[i]=t;weights[i]=density*edge;
    }
    const delivery=deliveryMotion(time);
    berthLight.intensity=35*(1-ease(Math.abs(delivery.z-DOCK.berthZ)/6))*delivery.aircraft*(.4+state.neon*.6);
    pose.position.set(DOCK.x,DOCK.y,delivery.z);pose.rotation.set(0,delivery.yaw,0);pose.scale.setScalar(delivery.aircraft);drones.set(6,pose);
    pose.position.set(DOCK.x,delivery.cargoY,delivery.cargoZ);pose.rotation.set(0,0,0);pose.scale.setScalar(delivery.cargo*(time%32<9?delivery.aircraft:1));cargo.set(6,pose);
    pose.position.set(DOCK.x,delivery.liftY,delivery.liftZ);pose.scale.setScalar(1);lift.set(0,pose);
    for(let i=0;i<2;i++){pose.position.set(DOCK.x+(i?1:-1)*(.43+delivery.hatch*.9),3.17,DOCK.z);doors.set(i,pose);}
    drones.flush();cargo.flush();lift.flush();doors.flush();
    for(let r=0;r<2;r++)for(let j=0;j<96;j++){
      let strength=0;for(let i=r;i<6;i+=2)strength=Math.max(strength,guideStrength(j/96,heads[i],r===0)*weights[i]);
      const sample=samples[r][j];pose.position.copy(sample.p);pose.rotation.set(0,Math.atan2(sample.t.x,sample.t.z),0);pose.scale.setScalar(strength);guides.set(r*96+j,pose);
    }
    for(let j=0;j<32;j++){
      const z=DOCK.berthZ+j/31*(24-DOCK.berthZ),strength=Math.max(0,1-Math.abs(z-delivery.z)/4)*delivery.aircraft;
      pose.position.set(DOCK.x,DOCK.y-.5,z);pose.rotation.set(0,0,0);pose.scale.setScalar(strength);guides.set(192+j,pose);
    }guides.flush();
    for(let lane=0;lane<2;lane++)for(let j=0;j<48;j++){
      const x=-23+j*46/47;let strength=0;
      for(let i=lane;i<6;i+=2)strength=Math.max(strength,Math.max(0,1-Math.abs(x-carPositions[i]-(i%2?2:-2))/4)*carWeights[i]);
      pose.position.set(x,.465,lane?1.9:-1.9);pose.rotation.set(0,Math.PI/2,0);pose.scale.setScalar(strength);streetGuides.set(lane*48+j,pose);
    }
    for(let path=0;path<crossings.length;path++)for(let j=0;j<24;j++){
      const m=streetMotion(time,path,true),u=j/23,p=crossingPoint(path,u);
      const strength=(m.moving?1:0)*Math.max(0,1-Math.abs(u-(m.position/8.3+1)/2)/.25)*(.2+state.crowd*.8);
      pose.position.set(p.x,.467,p.z);pose.rotation.set(0,p.yaw,0);pose.scale.setScalar(strength);streetGuides.set(96+path*24+j,pose);
    }streetGuides.flush();
  };
}
