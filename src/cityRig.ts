import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldState } from './presets';
import { mobility } from './mobility';
import { crossings, crossingPoint, roads, landmarks, DOCK } from './layout';

const paint = (color: T.ColorRepresentation) => new T.MeshStandardMaterial({ color, roughness:.83, metalness:0 });
const cream = paint('#e6debf'), teal = paint('#719993'), sage = paint('#a9b392'), pink = paint('#ca9c8e'), dark = paint('#3f5e61'), trim = paint('#ece6d3'), soil = paint('#53584a');
const futureLight=new T.MeshStandardMaterial({color:'#8ce5d8',emissive:'#68d9de',emissiveIntensity:.8,roughness:.65});
const solar=paint('#486b83');
const rounded = new Map<string, RoundedBoxGeometry>();
function box(parent:T.Object3D, size:[number,number,number], position:[number,number,number], material:T.Material, radius=.18) {
  const key = [...size,radius].join(',');
  if (!rounded.has(key)) rounded.set(key,new RoundedBoxGeometry(...size,2,Math.min(radius,...size.map(v=>v/2))));
  const mesh = new T.Mesh(rounded.get(key),material); mesh.position.set(...position); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
type WindowSlot = { object:T.Object3D; phase:number; occupancy:number };
type Kit = { windows:WindowSlot[]; signs:T.MeshStandardMaterial[]; random:()=>number };
function windows(group:T.Group, kit:Kit, width:number, height:number, depth:number) {
  for (let floor=0;floor<Math.floor((height-3)/2.1);floor++) for (let side=0;side<2;side++) for(let col=0;col<Math.floor(width/1.8);col++) {
    const obj = new T.Object3D();
    const u = (col-(Math.floor(width/1.8)-1)/2)*1.8;
    obj.position.set(side === 0 ? u : width/2+.025, 3.2+floor*2.1, side === 0 ? depth/2+.025 : u);
    obj.rotation.y = side===0 ? 0 : Math.PI/2;
    obj.scale.set(1.13,1.3,.09); group.add(obj);
    kit.windows.push({object:obj,phase:floor*.75+col*.28,occupancy:kit.random()});
  }
}
function sign(group:T.Group, kit:Kit, text:string, x:number,y:number,z:number,w:number,h:number,bg:string,fg='#eff3d3') {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=fg;ctx.font='500 56px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.3,roughness:.9});kit.signs.push(material);
  box(group,[w+.2,h+.2,.25],[x,y,z-.05],trim,.1);
  const panel=new T.Mesh(new T.PlaneGeometry(w,h),material);panel.position.set(x,y,z+.09);group.add(panel);
}
export function tower(kit:Kit) {
  const g=new T.Group();g.name='tower';g.position.set(landmarks[1].x,0,landmarks[1].z);
  box(g,[10.5,2.2,10.5],[0,1.6,0],cream,.5);
  box(g,[9.4,7.4,9.4],[0,6,0],teal,.65);
  // Open from Y=10.6 to 19: no hidden solid tower or window layer in the station void.
  for(const x of [-4.25,4.25])box(g,[.85,9.2,8.6],[x,14.8,-.3],trim,.12);
  box(g,[10.8,.65,10.5],[0,10.25,0],cream,.16);
  box(g,[11.8,.7,11.2],[.5,19.35,0],trim,.12);
  box(g,[10.6,8.2,9.4],[.5,23.8,0],teal,.45);
  box(g,[11.9,.4,10.8],[.5,28.05,0],cream,.12);
  // Thin dark photovoltaic fins contrast with the warm ceramic mass.
  for(let i=0;i<5;i++)box(g,[.12,1.15,7.8],[-3.4+i*1.9,28.75,0],solar,.025);
  for(const y of [21.2,24.9]){
    box(g,[7.7,.65,.1],[.5,y,4.75],dark,.03);
    box(g,[.1,.65,7.7],[5.85,y,0],dark,.03);
    for(let i=0;i<4;i++)for(let side=0;side<2;side++){
      const slot=new T.Object3D();slot.position.set(side?5.92:-2.3+i*1.9,y,side?-2.9+i*1.9:4.82);
      slot.rotation.y=side?Math.PI/2:0;slot.scale.set(1.5,.42,.06);g.add(slot);
      kit.windows.push({object:slot,phase:i*.4,occupancy:kit.random()});
    }
  }
  // Split apron leaves a real cargo-elevator opening between its two halves.
  for(const x of [-2.25,2.25]){
    box(g,[2.9,.42,3.3],[x,10.4,6.05],trim,.1);
    box(g,[.08,.06,2.8],[x*.5,10.65,6.05],futureLight,.02);
  }
  box(g,[1.5,.5,7.6],[-2.8,10.85,0],sage,.2);
  box(g,[.22,5.7,.22],[-2.8,13.8,-1],pink,.08);
  for(const [x,y,z] of [[-2.8,16.6,-1],[-2.2,16,-1.5],[-3.3,15.8,-.5]]){
    const leaf=new T.Mesh(new T.IcosahedronGeometry(1.2,1),sage);leaf.position.set(x,y,z);g.add(leaf);
  }
  sign(g,kit,'MAGNET  /  2127',0,2.1,5.31,7.5,.8,'#425f63');
  sign(g,kit,'空中駅  /  AIR COMMONS',.5,20.1,5.66,8,.65,'#46676e');
  sign(g,kit,'01  /  CARGO',-2.2,11.25,7.72,2.7,.45,'#46676e');
  windows(g,kit,9.4,8,9.4);return g;
}
export function shop(kit:Kit,x:number,z:number,w:number,h:number,d:number,color:T.Material,label:string) {
  const g=new T.Group();g.name=`shop-${label}`;g.position.set(x,0,z);
  box(g,[w+.5,.6,d+.5],[0,.6,0],cream,.25);
  box(g,[w,h,d],[0,h/2+.8,0],color,.95);
  box(g,[w+.7,.55,d+.7],[0,h+1,0],cream,.25);
  box(g,[w-.7,.55,d-.7],[0,h+1.35,0],sage,.25);
  for(let c=0;c<3;c++) { box(g,[w/3-.5,2,.16],[(c-1)*w/3,1.9,d/2+.03],dark,.1);box(g,[.12,2.2,.25],[(c-1)*w/3,1.9,d/2+.12],trim,.04); }
  box(g,[w+.8,.36,2.2],[0,3.1,d/2+.65],cream,.18);
  box(g,[w+.2,.1,.13],[0,3.05,d/2+1.76],futureLight,.045);
  for(let c=0;c<3;c++){
    const panel=box(g,[w/3-.45,.12,d*.6],[(c-1)*w/3,h+1.85,0],solar,.04);panel.rotation.x=-.16;
    box(g,[.07,.1,d*.55],[(c-1)*w/3,h+2,0],futureLight,.03);
  }
  sign(g,kit,label,0,4.1,d/2+.16,w-.8,1.05,'#536f66');
  if(h>6) windows(g,kit,w,h,d);
  return g;
}
export function kiosk(kit:Kit) {
  const g=new T.Group();g.name='kiosk';g.position.set(13,0,11);
  box(g,[5.8,3.8,4.3],[0,2.1,0],sage,.65);box(g,[6.5,.7,5],[0,4.25,0],cream,.35);
  box(g,[4.8,1.3,.16],[0,2.3,2.17],dark,.14);box(g,[5.2,.25,1],[0,1.55,2.45],trim,.1);
  sign(g,kit,'交番  /  KOBAN',0,3.65,2.2,4.7,.55,'#718572');
  box(g,[.15,2,.2],[0,2.2,2.3],trim,.04);return g;
}
export function glyphs() {
  const g=new T.Group();g.name='ground-glyphs';
  const pulse=new T.MeshBasicMaterial({color:'#88f4ed',transparent:true,opacity:0,depthWrite:false});
  const still=new T.MeshBasicMaterial({color:'#f1d897',transparent:true,opacity:0,depthWrite:false});
  for(let i=0;i<4;i++){
    const line=new T.Mesh(new T.PlaneGeometry(2.8,.13),pulse);line.rotation.x=-Math.PI/2;line.rotation.z=Math.PI/4+i*Math.PI/2;line.position.set(Math.sin(i*Math.PI/2)*2,.535,Math.cos(i*Math.PI/2)*2);g.add(line);
  }
  const ring=new T.Mesh(new T.RingGeometry(1.45,1.52,64),still);ring.rotation.x=-Math.PI/2;ring.position.y=.536;g.add(ring);
  for(const x of [-.55,0,.55]){const dot=new T.Mesh(new T.CircleGeometry(.08,12),still);dot.rotation.x=-Math.PI/2;dot.position.set(x,.539,0);g.add(dot);}
  return {group:g,pulse,still};
}
export function cityRig(scene:T.Scene) {
  let seed=2127;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const kit:Kit={windows:[],signs:[],random};
  const staticGroup=new T.Group();scene.add(staticGroup);
  const road=paint('#b1b6ad');
  box(staticGroup,[64,1,54],[0,-.2,0],cream,.9);
  box(staticGroup,[63,.12,53],[0,.36,0],trim,.5);
  for(const points of roads){
    const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const pavement=new T.Mesh(new T.ShapeGeometry(shape),road);pavement.rotation.x=-Math.PI/2;pavement.position.y=.43;pavement.receiveShadow=true;staticGroup.add(pavement);
  }
  for(let path=0;path<crossings.length;path++){
    const {from,to,width}=crossings[path],length=Math.hypot(to[0]-from[0],to[1]-from[1]);
    const count=Math.floor(length/1.1);
    for(let i=0;i<count;i++){
      const p=crossingPoint(path,(i+.5)/count);
      box(staticGroup,[width,.025,.52],[p.x,.45,p.z],cream,.01).rotation.y=p.yaw;
    }
  }
  for(let x=-29;x<31;x+=4)if(Math.abs(x)>15)box(staticGroup,[1.8,.02,.13],[x,.445,0],cream,.01);
  const q=landmarks[0],qfront=new T.Group();qfront.position.set(q.x,0,q.z);qfront.name='QFRONT';
  box(qfront,[q.w,q.h,q.d],[0,q.h/2+.8,0],teal,.25);
  box(qfront,[q.w+.4,.4,q.d+.4],[0,q.h+1,0],trim,.1);
  // A broad, simple screen and tall mullions establish the landmark before fine facade work.
  box(qfront,[10,8,.24],[0,11.6,5.1],dark,.08);
  sign(qfront,kit,'QFRONT',0,15.7,5.27,9,1.25,'#395a61');
  sign(qfront,kit,'SHIBUYA  /  2127',0,10.6,5.27,9,3.8,'#ba9181');
  sign(qfront,kit,'TSUTAYA',0,4.1,5.12,9.5,.85,'#395a61');
  for(let i=0;i<7;i++)box(qfront,[.09,3,.15],[-4.5+i*1.5,2.2,5.13],trim,.02);
  staticGroup.add(qfront,tower(kit));
  for(const [i,color] of [[2,sage],[3,pink],[4,cream]] as const){
    const b=landmarks[i];staticGroup.add(shop(kit,b.x,b.z,b.w,b.h,b.d,color,b.name));
  }
  // Station-facing entrance; keep Hachiko plaza low and open in the foreground.
  const entry=new T.Group();entry.position.set(18.8,0,12);entry.rotation.y=-Math.PI/2;staticGroup.add(entry);
  sign(entry,kit,'渋谷駅  /  HACHIKO',0,3,0,10,1,'#536f66');
  box(staticGroup,[6,.22,2.2],[14,3.8,19],teal,.12);
  for(const x of [11.5,16.5])box(staticGroup,[.18,3.4,.18],[x,2,19],dark,.03);
  const police=kiosk(kit);police.position.set(15,0,23);staticGroup.add(police);
  // Small memory marker; intentionally a blockout, not a detailed sculpture.
  const hachiko=new T.Group();hachiko.position.set(7,0,16);staticGroup.add(hachiko);
  box(hachiko,[1.6,.7,1.6],[0,.8,0],cream,.12);
  box(hachiko,[.55,.85,.65],[0,1.5,0],dark,.14);
  box(hachiko,[.55,.5,.65],[0,2.1,.2],dark,.12);
  for(const x of [-.2,.2])box(hachiko,[.13,.28,.18],[x,2.43,.15],dark,.02);
  sign(hachiko,kit,'HACHIKO',0,.9,.85,1.35,.3,'#536f66');
  const depot=new T.Group();depot.position.set(DOCK.x,0,DOCK.z);staticGroup.add(depot);
  for(const x of [-.85,.85])box(depot,[.13,13.8,.18],[x,7.5,0],solar,.025);
  for(const x of [-.85,.85])box(depot,[.13,.16,DOCK.z-DOCK.berthZ],[x,DOCK.y-1,(DOCK.berthZ-DOCK.z)/2],solar,.025);
  // Open-topped receiving cabinet: cargo enters without passing through a solid lid.
  for(const x of [-.86,.86])box(depot,[.18,2.3,1.6],[x,1.95,0],cream,.07);
  box(depot,[1.9,2.3,.15],[0,1.95,-.78],cream,.06);
  box(depot,[1.9,1.8,.15],[0,1.7,.78],teal,.06);
  sign(depot,kit,'受取  /  PICKUP',0,1.8,.89,1.6,.4,'#46676e');
  for(const [x,z] of [[-12,12],[16,-7]]){
    const terminal=new T.Group();terminal.position.set(x,0,z);staticGroup.add(terminal);
    box(terminal,[.7,2.3,.5],[0,1.7,0],cream,.24);box(terminal,[.48,1.4,.08],[0,2,.28],futureLight,.035);
    sign(terminal,kit,'AIR / 02',0,3.1,.32,1.7,.48,'#467b86');
  }
  // Civic seating stays outside the five crossing mouths.
  for(const [x,z] of [[-18,-25],[8,20],[16,10]]){
    box(staticGroup,[3.1,.24,.9],[x,1.2,z],pink,.1);
    for(const dx of [-1,1])box(staticGroup,[.25,.7,.65],[x+dx,.8,z],dark,.06);
  }
  const foliage:T.Group[]=[];
  const leafMats=[paint('#859f70'),paint('#aec08b'),paint('#6f9479')];
  for(const [x,z] of [[-19,-21],[-29,24],[-16,22],[6,23],[15,7],[28,-8],[23,-22]]){
    const bowl=new T.Mesh(new T.CylinderGeometry(1.5,1.05,.95,24),cream);bowl.position.set(x,1.05,z);bowl.castShadow=true;bowl.receiveShadow=true;staticGroup.add(bowl);
    const earth=new T.Mesh(new T.CylinderGeometry(1.32,1.32,.1,24),soil);earth.position.set(x,1.56,z);staticGroup.add(earth);
    box(staticGroup,[.34,2.2,.34],[x,2.55,z],pink,.12);
    const crown=new T.Group();crown.position.set(x,3.6,z);scene.add(crown);foliage.push(crown);
    for(let j=0;j<5;j++){const leaf=new T.Mesh(new T.IcosahedronGeometry(1.35,2),leafMats[j%3]);leaf.position.set((random()-.5)*1.8,random()*1.7,(random()-.5)*1.8);leaf.scale.set(.8,1.15,.8);leaf.castShadow=true;crown.add(leaf);}
  }
  const lampMat=new T.MeshStandardMaterial({color:'#ffe1a3',emissive:'#ffe1a3',emissiveIntensity:1,roughness:.6});
  for(const [x,z] of [[-7,-10],[9,-8],[-13,8],[11,10]]){
    box(staticGroup,[.18,4.5,.18],[x,2.9,z],dark,.06);box(staticGroup,[1.5,.17,.17],[x+.65,5.1,z],dark,.05);box(staticGroup,[.85,.12,.55],[x+1.1,5,z],lampMat,.06);
  }
  // The two 2026 leftovers retain their imperfect silhouettes in the frozen kit.
  const signal=new T.Group();signal.position.set(-14,.45,5);signal.rotation.z=.06;staticGroup.add(signal);
  box(signal,[.14,3.7,.14],[0,1.8,0],dark,.04);box(signal,[1.25,.46,.45],[.4,3.6,0],dark,.14);
  for(let i=0;i<3;i++){const light=new T.Mesh(new T.SphereGeometry(.12,10,8),paint(['#b16e5c','#d0b474','#8fab83'][i]));light.position.set(i*.35+.05,3.6,.22);signal.add(light);}
  const oldBox=new T.Group();oldBox.position.set(9,.45,18);oldBox.rotation.z=-.065;oldBox.rotation.y=.16;staticGroup.add(oldBox);
  box(oldBox,[1.05,1.7,.48],[0,.9,0],cream,.1);sign(oldBox,kit,'2026',0,1,.3,.85,.55,'#a78a68');
  // Batch static architecture by material; no geometry is created during transitions.
  staticGroup.updateMatrixWorld(true);
  const winGeo=new RoundedBoxGeometry(1,1,1,1,.08);
  const winMat=new T.MeshBasicMaterial({color:0xffffff});
  const windowMesh=new T.InstancedMesh(winGeo,winMat,kit.windows.length);
  kit.windows.forEach((slot,i)=>{windowMesh.setMatrixAt(i,slot.object.matrixWorld);windowMesh.setColorAt(i,new T.Color('#274747'));});
  scene.add(windowMesh);
  const batches=new Map<T.Material,T.BufferGeometry[]>();
  staticGroup.traverse(obj=>{if(obj instanceof T.Mesh && !Array.isArray(obj.material)){const geometries=batches.get(obj.material)??[];geometries.push((obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone()).applyMatrix4(obj.matrixWorld));batches.set(obj.material,geometries);}});
  scene.remove(staticGroup);
  for(const [material,geometries] of batches){const merged=mergeGeometries(geometries);const mesh=new T.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='fixed-kit';scene.add(mesh);geometries.forEach(g=>g.dispose());}
  const glyph=glyphs();scene.add(glyph.group);
  const updateMobility=mobility(scene);
  const color=new T.Color(),cool=new T.Color('#80dfef'),warm=new T.Color('#ffcd83'),off=new T.Color('#254447'),windowColor=new T.Color();
  return {
    update(state:WorldState,time:number) {
      const pulse=T.MathUtils.clamp((state.neon-.25)/.7,0,1),still=T.MathUtils.clamp((state.warmth-.55)/.3,0,1);
      road.roughness=.92-pulse*.42;
      lampMat.emissiveIntensity=.15+state.neon*2;
      kit.signs.forEach(mat=>mat.emissiveIntensity=state.signage*2);
      futureLight.emissiveIntensity=.45+state.neon*1.6;
      glyph.pulse.opacity=state.glyph*pulse;glyph.still.opacity=state.glyph*still;
      foliage.forEach(g=>g.scale.setScalar(.3+state.greenery*.95));
      color.copy(cool).lerp(warm,state.warmth);
      kit.windows.forEach((slot,i)=>{
        const occupied=T.MathUtils.smoothstep(state.windowLife-slot.occupancy,-.08,.08);
        const beat=1+pulse*(.35+.35*Math.sin(time*1.6-slot.phase));
        windowMesh.setColorAt(i,windowColor.copy(off).lerp(color,occupied).multiplyScalar(.35+occupied*beat*(.6+state.neon*1.7)));
      });
      windowMesh.instanceColor!.needsUpdate=true;
      updateMobility(state,time);
    },
  };
}
