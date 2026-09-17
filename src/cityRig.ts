import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldState } from './presets';
import { mobility, airRoutes } from './mobility';
import { crossings, crossingPoint, roads, landmarks, publicRoutes, upperLinks, DOCK } from './layout';

// Three finishes: matte ceramic composite, refined metal, and reflective glass. Same shader, different response to the one environment map.
const paint = (color: T.ColorRepresentation, roughness=.52, metalness=0) => new T.MeshStandardMaterial({ color, roughness, metalness });
const cream = paint('#dce3e3',.58), teal = paint('#839da8',.44,.05), sage = paint('#a9c5c2',.5), pink = paint('#b9b7ac',.56), dark = paint('#27414f',.16,.7), trim = paint('#edf0ed',.48);
const futureLight=new T.MeshStandardMaterial({color:'#8ce5d8',emissive:'#68d9de',emissiveIntensity:.8,roughness:.65});
const solar=paint('#486b83',.3,.85);
const membrane=new T.MeshStandardMaterial({color:'#9abdb9',roughness:.3,metalness:.25,transparent:true,opacity:.72,side:T.DoubleSide});
const rounded = new Map<string, RoundedBoxGeometry>();
function box(parent:T.Object3D, size:[number,number,number], position:[number,number,number], material:T.Material, radius=.18) {
  const key = [...size,radius].join(',');
  if (!rounded.has(key)) rounded.set(key,new RoundedBoxGeometry(...size,2,Math.min(radius,.055,...size.map(v=>v/2))));
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
    if(col===0)box(group,side===0?[width-.4,.1,.55]:[.55,.1,depth-.4],side===0?[0,3.2+floor*2.1+.85,depth/2+.2]:[width/2+.2,3.2+floor*2.1+.85,0],trim,.03);
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
  box(g,[10.6,38.2,9.4],[.5,38.8,0],teal,.45);
  // Wider commons collar breaks the straight shaft; the east wing continues it across the plaza.
  box(g,[14,13,12.4],[.5,26.5,0],teal,.45);
  for(const y of [20,33])box(g,[14.5,.5,12.9],[.5,y,0],trim,.12);
  box(g,[11.9,.4,10.8],[.5,58.05,0],cream,.12);
  // Thin dark photovoltaic fins contrast with the warm ceramic mass.
  for(let i=0;i<5;i++)box(g,[.12,1.15,7.8],[-3.4+i*1.9,58.75,0],solar,.025);
  for(const y of [22,26,30,34,38,42,46,50,54]){
    const [fz,fx]=y<33?[6.25,7.55]:[4.75,5.85];
    box(g,[7.7,.65,.1],[.5,y,fz],dark,.03);
    box(g,[.1,.65,7.7],[fx,y,0],dark,.03);
    box(g,[8.1,.1,.5],[.5,y+.55,fz+.18],trim,.03);
    box(g,[.5,.1,8.1],[fx+.18,y+.55,0],trim,.03);
    for(let i=0;i<4;i++)for(let side=0;side<2;side++){
      const slot=new T.Object3D();slot.position.set(side?fx+.07:-2.3+i*1.9,y,side?-2.9+i*1.9:fz+.07);
      slot.rotation.y=side?Math.PI/2:0;slot.scale.set(1.5,.42,.06);g.add(slot);
      kit.windows.push({object:slot,phase:i*.4,occupancy:kit.random()});
    }
  }
  for(let y=34.2;y<57;y+=2.4){
    box(g,[.09,1.35,8],[5.84,y,0],dark);
    for(let z=-3.5;z<=3.5;z+=1.4)box(g,[.18,1.5,.1],[5.93,y,z],trim);
  }
  // Split apron leaves a real cargo-elevator opening between its two halves.
  for(const x of [-2.25,2.25]){
    box(g,[2.9,.42,3.3],[x,10.4,6.05],trim,.1);
    box(g,[.08,.06,2.8],[x*.5,10.65,6.05],futureLight,.02);
  }
  // Service membranes filter air at the open transfer floor.
  for(let i=0;i<5;i++)box(g,[.12,5.4,5],[-3.8+i*.45,14.3,-.6],solar,.02);
  for(const x of [-5,6])box(g,[.36,38.2,9.8],[x,38.8,0],trim);
  sign(g,kit,'MAGNET  /  2127',0,2.1,5.31,7.5,.8,'#425f63');
  sign(g,kit,'空中駅  /  AIR COMMONS',.5,21.4,6.46,8,.65,'#46676e');
  sign(g,kit,'01  /  CARGO',-2.2,11.25,7.72,2.7,.45,'#46676e');
  windows(g,kit,9.4,8,9.4);return g;
}
export function shop(kit:Kit,x:number,z:number,w:number,h:number,d:number,color:T.Material,label:string) {
  const g=new T.Group();g.name=`shop-${label}`;g.position.set(x,0,z);
  box(g,[w+.5,.6,d+.5],[0,.6,0],cream,.25);
  box(g,[w,4,d],[0,2.8,0],color);
  // A full-width public void is held by side cores, with housing above.
  for(const x of [-w/2+.5,w/2-.5])for(const z of [-d/2+.5,d/2-.5])box(g,[1,5.5,1],[x,7.5,z],trim);
  if(h>12)box(g,[w,h-10,d],[0,(h-10)/2+10.8,0],color);
  box(g,[w+.7,.3,d+.7],[0,10.5,0],trim);
  for(let y=13;y<h;y+=3.5){
    box(g,[w+.2,.34,d+.2],[0,y,0],trim);
    box(g,[w-.6,.1,.5],[0,y+2,d/2+.2],trim,.03);
    box(g,[w-.8,1.3,.08],[0,y+1.2,d/2+.03],dark);
    for(let x=-w/2+1;x<w/2;x+=1.4)box(g,[.06,1.5,.18],[x,y+1.2,d/2+.1],trim);
  }
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
  windows(g,kit,w,5,d);
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
  const road=paint('#71818a',.9),ground=paint('#d6dbd8',.78),distant=paint('#c3d1db',.95);
  // Ground continues past the hero frame; fog closes it instead of a plate edge.
  box(staticGroup,[150,1,140],[0,-.2,0],cream,.9);
  box(staticGroup,[149,.12,139],[0,.36,0],ground,.5);
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
  for(let x=-73;x<75;x+=4)if(Math.abs(x)>15)box(staticGroup,[1.8,.02,.13],[x,.445,0],cream,.01);
  const q=landmarks[0],qfront=new T.Group();qfront.position.set(q.x,0,q.z);qfront.name='QFRONT';
  // Twin occupied cores carry a civic hall and an upper residential district.
  for(const x of [-3.7,3.7])box(qfront,[3.6,q.h-.8,q.d],[x,q.h/2+.4,0],teal);
  box(qfront,[q.w,5,q.d],[0,3.3,0],dark);
  for(const y of [11,23,36])box(qfront,[q.w+.4,.6,q.d+.4],[0,y,0],trim);
  // Deck portal: the public route enters the open floor between the cores.
  box(qfront,[4.4,.5,.6],[0,12.2,q.d/2+.1],trim,.08);
  for(const [y,h] of [[17,10],[30,10]]){
    box(qfront,[q.w-.6,h,q.d-.5],[0,y,0],teal);
    for(let x=-4.5;x<=4.5;x+=1.5)box(qfront,[.12,h,.18],[x,y,5.03],trim);
    for(let f=y-h/2+1;f<y+h/2;f+=2){box(qfront,[q.w-1,.6,.12],[0,f,5.05],dark);box(qfront,[q.w-.6,.1,.5],[0,f+.5,5.22],trim,.03);}
  }
  box(qfront,[7,11,.25],[0,30,5.18],dark);
  sign(qfront,kit,'QFRONT',0,44,6.05,8,1.2,'#294652');
  sign(qfront,kit,'渋谷  /  SHIBUYA',0,32.4,5.4,6.4,1.7,'#527789');
  sign(qfront,kit,'2 1 2 7',0,28,5.4,6.4,2.2,'#527789');
  sign(qfront,kit,'TSUTAYA / COMMONS',0,4.1,5.12,9.5,.85,'#294652');
  staticGroup.add(qfront,tower(kit));
  for(const [i,color] of [[2,sage],[3,pink],[4,cream]] as const){
    const b=landmarks[i];staticGroup.add(shop(kit,b.x,b.z,b.w,b.h,b.d,color,b.name));
  }
  for(const link of upperLinks){
    const g=new T.Group();g.position.set(link.x,link.y,link.z);staticGroup.add(g);
    for(const y of [-link.h/2,link.h/2])box(g,[link.w+.4,.35,link.d+.5],[0,y,0],trim);
    if(link.kind==='floor'){
      // Open public colonnade: slab, roof, slender columns and glass rails; no enclosing wall.
      for(let x=-link.w/2+1.2;x<link.w/2;x+=2.6)for(const z of [-link.d/2+.3,link.d/2-.3])box(g,[.3,link.h,.3],[x,0,z],trim,.05);
      for(const z of [-link.d/2,link.d/2])box(g,[link.w,1.05,.06],[0,-link.h/2+.7,z],membrane);
    } else if(link.kind==='link'){
      box(g,[link.w,link.h,link.d],[0,0,0],dark);
      for(let x=-link.w/2+.8;x<link.w/2;x+=1.3)box(g,[.1,link.h,.2],[x,0,link.d/2+.08],trim);
      for(const z of [-link.d/2,link.d/2])box(g,[link.w,1,.08],[0,link.h/2+.6,z],teal);
    } else {
      box(g,[link.w,link.h,link.d],[0,0,0],teal);
      const floors=new T.Group();floors.position.y=-link.h/2;g.add(floors);windows(floors,kit,link.w,link.h,link.d);
      for(let y=-link.h/2+3.5;y<link.h/2-1;y+=3.5)box(g,[link.w+.2,.22,link.d+.2],[0,y,0],trim);
    }
    for(const [x,z] of link.columns)box(staticGroup,[1.2,link.y-link.h/2,1.2],[x,(link.y-link.h/2)/2,z],trim,.1);
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
  for(const [x,z] of [[-19,-21],[-29,24],[-16,22],[6,23],[28,-8],[23,-22]]){
    box(staticGroup,[2.2,.35,2.2],[x,.8,z],trim);
    for(let i=0;i<5;i++){
      const fin=box(staticGroup,[.07,4.6,1.7],[x+(i-2)*.38,3.1,z],membrane);
      fin.rotation.y=.25;
    }
    box(staticGroup,[2.2,.2,2.2],[x,5.45,z],trim);
  }
  // The decks use the same authored centerlines as the walkers.
  // Landing plates close the small angle gaps between straight segments.
  for(const route of publicRoutes){
    const pts=route.points.map(p=>new T.Vector3(...p)),last=pts.length-1,dirs=pts.slice(1).map((p,i)=>p.clone().sub(pts[i]).normalize());
    // Signed mitre length at each interior corner: the outer rail extends by it, the inner rail shortens, so corners close without crossing rails.
    const mitre=pts.map((_,j)=>{if(!j||j===last)return 0;const p=dirs[j-1],d=dirs[j],c=p.x*d.z-p.z*d.x;return Math.sign(c)*route.width/2*Math.tan(Math.atan2(Math.abs(c),p.x*d.x+p.z*d.z)/2);});
    for(const [x,y,z] of route.points.slice(1,-1))box(staticGroup,[route.width+.2,.32,route.width+.2],[x,y-.16,z],trim);
    for(let i=1;i<=last;i++){
      // Decks stop 1.5 short of each terminal so the platform rises through the landing frame, not a slab.
      const dir=dirs[i-1];
      const a=i===1?pts[0].clone().addScaledVector(dir,1.5):pts[i-1],b=i===last?pts[last].clone().addScaledVector(dir,-1.5):pts[i];
      const deck=new T.Group();deck.position.copy(a).add(b).multiplyScalar(.5);deck.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir);
      staticGroup.add(deck);
      box(deck,[route.width,.3,a.distanceTo(b)],[0,-.15,0],trim);
      for(const x of [-route.width/2,route.width/2]){
        const e0=i>1?Math.sign(x)*mitre[i-1]:0,e1=i<last?Math.sign(x)*mitre[i]:0,length=a.distanceTo(b)+e0+e1,shift=(e1-e0)/2;
        box(deck,[.08,1.05,length],[x,.53,shift],membrane);
        box(deck,[.1,.08,length],[x,1.08,shift],solar);
      }
    }
    for(const end of [0,last]){
      // Terminal aligned with its deck: a landing frame with a 1.6-unit opening for the platform, rails, back membrane, roof.
      const {x,y,z}=pts[end],into=pts[end?last-1:1].clone().sub(pts[end]).setY(0).normalize();
      const terminal=new T.Group();terminal.position.set(x,0,z);terminal.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),into);staticGroup.add(terminal);
      for(const s of [-1,1]){box(terminal,[3,.3,.7],[0,y-.15,s*1.15],trim);box(terminal,[.7,.3,1.6],[s*1.15,y-.15,0],trim);}
      for(const dx of [-1.35,1.35])box(terminal,[.18,y+2,.18],[dx,(y+2)/2,0],solar);
      box(terminal,[2.8,y+1,.07],[0,(y+1)/2,-1.3],membrane);
      box(terminal,[3,.2,3],[0,y+2,0],trim);
    }
  }
  // Paired corridor rails tie aircraft routes into a supported city-scale network.
  for(const route of airRoutes()){
    const points=route.getSpacedPoints(96);
    for(const offset of [-2.8,2.8]){
      const railPoints=points.map((p,i)=>{
        const tangent=route.getTangentAt(i/96),normal=new T.Vector3(tangent.z,0,-tangent.x).normalize();
        return p.clone().addScaledVector(normal,offset).add(new T.Vector3(0,-1.3,0));
      });
      const rail=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(railPoints),192,.11,4,false),solar);rail.castShadow=true;staticGroup.add(rail);
    }
  }
  // Perimeter pylons hold upper transport rails, outside the delivery approach.
  for(const [x,z,y] of [[-27,12,32],[27,12,32]]){
    for(const dx of [-3.2,3.2])box(staticGroup,[.4,y,.5],[x+dx,y/2,z],trim);
    box(staticGroup,[7,.4,1],[x,y-1.3,z],solar);
  }
  // Roof-supported express portals frame a clear, intentionally sparse sky corridor.
  for(const [x,z,base] of [[-10,-21.5,48],[15,-19,58]]){
    for(const dx of [-2.7,2.7])box(staticGroup,[.28,67-base,.45],[x+dx,(67+base)/2,z],trim);
    box(staticGroup,[6,.3,3],[x,64.4,z],solar);
  }
  // Distant city: a seeded ring of hazed blocks outside the plate, so the intersection sits in a city rather than on a stand.
  for(let i=0;i<60;i++){
    const angle=i/60*Math.PI*2+random()*.08,radius=125+random()*40,w=8+random()*10,h=6+random()*(i%5?20:38);
    box(staticGroup,[w,h,w*(.6+random()*.8)],[Math.cos(angle)*radius,h/2-.7,Math.sin(angle)*radius],distant,.1).rotation.y=-angle;
  }
  const lampMat=new T.MeshStandardMaterial({color:'#ffe1a3',emissive:'#ffe1a3',emissiveIntensity:1,roughness:.6});
  for(const [x,z] of [[-7,-10],[9,-8],[-13,8],[11,10]]){
    box(staticGroup,[.18,4.5,.18],[x,2.9,z],dark,.06);box(staticGroup,[1.5,.17,.17],[x+.65,5.1,z],dark,.05);box(staticGroup,[.85,.12,.55],[x+1.1,5,z],lampMat,.06);
  }
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
  const hazeNeutral=new T.Color('#c3d1db'),hazePulse=new T.Color('#b0c4d4'),hazeStill=new T.Color('#d0d6d0');
  return {
    update(state:WorldState,time:number) {
      const pulse=T.MathUtils.clamp((state.neon-.25)/.7,0,1),still=T.MathUtils.clamp((state.warmth-.55)/.3,0,1);
      road.roughness=.92-pulse*.42;
      lampMat.emissiveIntensity=.15+state.neon*2;
      kit.signs.forEach(mat=>mat.emissiveIntensity=state.signage*.45);
      futureLight.emissiveIntensity=.25+state.neon*.5;
      glyph.pulse.opacity=state.glyph*pulse;glyph.still.opacity=state.glyph*still;
      membrane.opacity=.6+state.greenery*.18;
      distant.color.copy(hazeNeutral).lerp(hazePulse,pulse).lerp(hazeStill,still);
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
