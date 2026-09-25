import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldState } from './presets';
import { mobility, airRoutes } from './mobility';
import { crossings, crossingPoint, roads, landmarks, publicRoutes, upperLinks, DOCK } from './layout';

// Three finishes: matte ceramic composite, refined metal, and reflective glass. Same shader, different response to the one environment map.
export const paint = (color: T.ColorRepresentation, roughness=.52, metalness=0) => new T.MeshStandardMaterial({ color, roughness, metalness });
export const cream = paint('#dce3e3',.58), teal = paint('#839da8',.44,.05), sage = paint('#a9c5c2',.5), pink = paint('#b9b7ac',.56), dark = paint('#27414f',.16,.7), trim = paint('#edf0ed',.48);
export const futureLight=new T.MeshStandardMaterial({color:'#8ce5d8',emissive:'#68d9de',emissiveIntensity:.8,roughness:.65});
export const solar=paint('#486b83',.3,.85);
export const membrane=new T.MeshStandardMaterial({color:'#9abdb9',roughness:.3,metalness:.25,transparent:true,opacity:.72,side:T.DoubleSide});
// Pilot finishes (docs/ART.md): silvered glass that reads the sky, living green, pale stone paving.
export const glass=new T.MeshPhysicalMaterial({color:'#a7c3cf',roughness:.08,metalness:.6,clearcoat:1,clearcoatRoughness:.06});
export const leaf=paint('#7d9f68',.85), stone=paint('#ebe8e0',.66);
const rounded = new Map<string, RoundedBoxGeometry>();
export function box(parent:T.Object3D, size:[number,number,number], position:[number,number,number], material:T.Material, radius=.18) {
  const key = [...size,radius].join(',');
  if (!rounded.has(key)) rounded.set(key,new RoundedBoxGeometry(...size,2,Math.min(radius,.055,...size.map(v=>v/2))));
  const mesh = new T.Mesh(rounded.get(key),material); mesh.position.set(...position); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
/** Flat-topped ring, arc or disc (inner=0) standing on `position`. Angles run from +X towards -Z. */
export function arc(parent:T.Object3D, inner:number, outer:number, height:number, position:[number,number,number], material:T.Material, start=0, length=Math.PI*2) {
  const shape=new T.Shape();
  if(length>=Math.PI*2){shape.absarc(0,0,outer,0,Math.PI*2,false);if(inner>0){const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);}}
  else{shape.absarc(0,0,outer,start,start+length,false);shape.absarc(0,0,inner,start+length,start,true);}
  const geometry=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:Math.max(8,Math.ceil(length*10))});geometry.rotateX(-Math.PI/2);
  const mesh=new T.Mesh(geometry,material);mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
const shrubGeometry=new T.IcosahedronGeometry(1,1);
/** Planted edge: seeded shrubs along an arc, so greenery reads as grown rather than a flat green slab. */
export function shrubs(parent:T.Object3D, radius:number, y:number, start:number, length:number, count:number) {
  const jitter=(n:number)=>Math.abs(Math.sin(n*12.9898+radius*78.233)*43758.5453)%1; // own hash: leaves the city's seeded sequence untouched
  for(let i=0;i<count;i++){
    const a=start+(i+.5)/count*length,r=radius+(jitter(i)-.5)*.35,s=.32+jitter(i+.5)*.3;
    const mesh=new T.Mesh(shrubGeometry,leaf);mesh.position.set(Math.cos(a)*r,y+s*.55,-Math.sin(a)*r);mesh.scale.set(s,s*.8,s);mesh.castShadow=true;parent.add(mesh);
  }
}
/** Merge every single-material mesh under `root` into one mesh per material, in root space. Signs keep their own materials. */
export function bake(root:T.Object3D) {
  root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert(),batches=new Map<T.Material,T.BufferGeometry[]>(),meshes:T.Mesh[]=[];
  root.traverse(obj=>{if(obj instanceof T.Mesh && !Array.isArray(obj.material)){const geometries=batches.get(obj.material)??[];geometries.push((obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone()).applyMatrix4(inverse.clone().multiply(obj.matrixWorld)));batches.set(obj.material,geometries);meshes.push(obj);}});
  meshes.forEach(mesh=>mesh.removeFromParent());
  return [...batches].map(([material,geometries])=>{const mesh=new T.Mesh(mergeGeometries(geometries),material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='fixed-kit';geometries.forEach(g=>g.dispose());return mesh;});
}
type WindowSlot = { object:T.Object3D; phase:number; occupancy:number };
export type Kit = { windows:WindowSlot[]; signs:T.MeshStandardMaterial[]; random:()=>number };
/** Calls `face` for each side (0 +Z, 1 +X, 2 -Z, 3 -X) in a group turned so that side is local +Z: `across` is its width, `out` its distance from the centre. */
export function faces(parent:T.Object3D, w:number, d:number, face:(g:T.Group,across:number,out:number,side:number)=>void, sides=[0,1,2,3]) {
  for(const side of sides){const g=new T.Group();g.rotation.y=side*Math.PI/2;parent.add(g);face(g,side%2?d:w,side%2?w/2:d/2,side);}
}
/** Lit window slots with a sun-shade fin per floor on all four faces (or the given sides). */
function windows(group:T.Group, kit:Kit, width:number, height:number, depth:number, sides?:number[]) {
  for (let floor=0;floor<Math.floor((height-3)/2.1);floor++) faces(group,width,depth,(face,across,out)=>{
    const cols=Math.floor(across/1.8),y=3.2+floor*2.1;
    for(let col=0;col<cols;col++){
      const obj=new T.Object3D();obj.position.set((col-(cols-1)/2)*1.8,y,out+.025);obj.scale.set(1.13,1.3,.09);face.add(obj);
      kit.windows.push({object:obj,phase:floor*.75+col*.28,occupancy:kit.random()});
    }
    box(face,[across-.4,.1,.55],[0,y+.85,out+.2],trim,.03);
  },sides);
}
/** Glazed floor bands on all four faces of a W×D block centred at (x,z): slab, glass band, mullions and sun-shade per floor. */
function bands(g:T.Group, w:number, d:number, x:number, z:number, y0:number, y1:number, step=3.5, mullion=1.4) {
  const at=new T.Group();at.position.set(x,0,z);g.add(at);
  for(let y=y0;y<y1;y+=step){
    box(at,[w+.2,.34,d+.2],[0,y,0],trim);
    faces(at,w,d,(f,across,out)=>{
      box(f,[across-.8,1.3,.08],[0,y+1.2,out+.03],glass);
      box(f,[across-.6,.1,.5],[0,y+2,out+.2],trim,.03);
      for(let u=-across/2+1;u<across/2;u+=mullion)box(f,[.06,1.5,.18],[u,y+1.2,out+.1],trim);
    });
  }
}
export function sign(group:T.Group, kit:Kit, text:string, x:number,y:number,z:number,w:number,h:number,bg:string,fg='#eff3d3') {
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
  for(const y of [20,33]){
    box(g,[14.5,.5,12.9],[.5,y,0],trim,.12);
    // Planted collar terraces on the crossing and east faces (ART.md §4).
    box(g,[13.3,.45,.5],[.5,y+.47,6.1],leaf,.2);box(g,[.5,.45,11.7],[7.4,y+.47,0],leaf,.2);
  }
  // Curved glazed corner on the upper shaft (ART.md §2): floor discs ring a glass drum.
  const corner=new T.Mesh(new T.CylinderGeometry(1.1,1.1,23,32),glass);corner.position.set(5.6,45.5,4.6);g.add(corner);
  for(let y=34;y<=57;y+=2.4)arc(g,0,1.3,.14,[5.6,y,4.6],trim);
  box(g,[11.9,.4,10.8],[.5,58.05,0],cream,.12);
  // Thin dark photovoltaic fins contrast with the warm ceramic mass.
  for(let i=0;i<5;i++)box(g,[.12,1.15,7.8],[-3.4+i*1.9,58.75,0],solar,.025);
  // Glazed ribbons and lit slots on all four faces; above the collar the east/west faces are the full-height side frames.
  const ribbons=new T.Group();ribbons.position.x=.5;g.add(ribbons);
  for(const y of [22,26,30,34,38,42,46,50,54]){
    const [w,d]=y<33?[14,12.4]:[11.36,9.4];
    faces(ribbons,w,d,(f,_across,out)=>{
      box(f,[7.7,.65,.1],[0,y,out+.05],glass,.03);
      box(f,[8.1,.1,.5],[0,y+.55,out+.23],trim,.03);
      for(let i=0;i<4;i++){
        const slot=new T.Object3D();slot.position.set(-2.85+i*1.9,y,out+.12);slot.scale.set(1.5,.42,.06);f.add(slot);
        kit.windows.push({object:slot,phase:i*.4,occupancy:kit.random()});
      }
    });
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
/** QFRONT's crossing screen as a curved glass drum (Pic 2): a daylight landscape rather than an advert. */
function mediaDrum(g:T.Group, kit:Kit, face:number) {
  const chord=8,bulge=1.3,radius=(chord*chord/4+bulge*bulge)/(2*bulge),half=Math.asin(chord/2/radius),cz=face+bulge-radius,y0=24,height=11.5;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.round(512*height/(radius*half*2));
  const ctx=canvas.getContext('2d')!,H=canvas.height,sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#5f93bd');sky.addColorStop(.55,'#d7e7ee');sky.addColorStop(1,'#cfe0d6');ctx.fillStyle=sky;ctx.fillRect(0,0,512,H);
  ctx.fillStyle='#b9c9d8';ctx.beginPath();ctx.moveTo(90,H*.58);ctx.lineTo(300,H*.36);ctx.lineTo(330,H*.37);ctx.lineTo(512,H*.56);ctx.lineTo(512,H*.62);ctx.lineTo(90,H*.62);ctx.fill();
  ctx.fillStyle='#f4f7f8';ctx.beginPath();ctx.moveTo(262,H*.4);ctx.lineTo(300,H*.36);ctx.lineTo(330,H*.37);ctx.lineTo(372,H*.41);ctx.lineTo(318,H*.395);ctx.fill();
  for(const [y,color] of [[.6,'#8fb38a'],[.7,'#6e9a6b'],[.82,'#557f58']] as const){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=512;x+=32)ctx.lineTo(x,H*y+Math.sin(x/60+y*9)*H*.03);ctx.lineTo(512,H);ctx.fill();}
  ctx.fillStyle='rgba(255,255,255,.8)';for(const [x,w,h] of [[60,16,.2],[84,10,.14],[420,14,.18],[444,9,.11]])ctx.fillRect(x,H*.6-H*h,w,H*h);
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='500 34px sans-serif';ctx.fillText('渋谷',256,H*.1);
  ctx.font='600 52px sans-serif';ctx.fillText('SHIBUYA',256,H*.18);ctx.font='300 46px sans-serif';ctx.fillText('2 1 2 7',256,H*.26);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const material=new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.3,roughness:.3,metalness:.1});kit.signs.push(material);
  const screen=new T.Mesh(new T.CylinderGeometry(radius,radius,height,48,1,true,-half,half*2),material);screen.position.set(0,y0+height/2,cz);g.add(screen);
  // Silver rims and slender fins frame the drum; the building behind stays readable at its edges.
  for(const y of [y0-.3,y0+height])arc(g,radius-.5,radius+.15,.3,[0,y,cz],trim,-Math.PI/2-half-.03,half*2+.06);
  for(const x of [-1,1])box(g,[.28,height+1.2,.5],[x*(chord/2+.1),y0+height/2,face+.1],trim,.12);
}
export type ShopStyle='slender'|'terrace'|'hall';
/** Street block: shared ground floor and public void, then one of three upper typologies so no two blocks read alike. */
export function shop(kit:Kit,x:number,z:number,w:number,h:number,d:number,color:T.Material,label:string,style:ShopStyle) {
  const g=new T.Group();g.name=`shop-${label}`;g.position.set(x,0,z);
  box(g,[w+.5,.6,d+.5],[0,.6,0],cream,.25);
  box(g,[w,4,d],[0,2.8,0],color);
  // Shopfront bays on every face; the main entrance canopy stays on the crossing side.
  faces(g,w,d,(f,across,out)=>{
    const bays=Math.max(1,Math.round(across/3.4));
    for(let c=0;c<bays;c++){const u=(c-(bays-1)/2)*across/bays;box(f,[across/bays-.5,2,.16],[u,1.9,out+.03],glass,.1);box(f,[.12,2.2,.25],[u+across/bays/2,1.9,out+.12],trim,.04);}
  });
  box(g,[w+.8,.36,2.2],[0,3.1,d/2+.65],cream,.18);
  box(g,[w+.2,.1,.13],[0,3.05,d/2+1.76],futureLight,.045);
  // A full-width public void is held by side cores, with housing above; its edge is planted all round.
  for(const x of [-w/2+.5,w/2-.5])for(const z of [-d/2+.5,d/2-.5])box(g,[1,5.5,1],[x,7.5,z],trim);
  box(g,[w+.7,.3,d+.7],[0,10.5,0],trim);
  faces(g,w,d,(f,across,out)=>box(f,[across-.2,.4,.45],[0,10.85,out+.1],leaf,.18));
  sign(g,kit,label,0,4.1,d/2+.16,w-.8,1.05,'#536f66');
  if(style==='slender'){
    // Center-gai: a slim glass shaft between vertical fins, capped by stacked rings.
    box(g,[w,h-10,d],[0,(h-10)/2+10.8,0],color);
    faces(g,w,d,(f,across,out)=>{
      box(f,[across-.3,h-11,.08],[0,(h+11.6)/2,out+.03],glass);
      for(let u=-across/2+.15;u<=across/2;u+=across/Math.round(across/.9))box(f,[.12,h-11,.4],[u,(h+11.6)/2,out+.2],trim,.04);
    });
    for(let y=14.3;y<h;y+=3.5)box(g,[w+.3,.16,d+.3],[0,y,0],trim,.03);
    box(g,[w+.5,.5,d+.5],[0,h+1,0],cream,.2);
    for(const [r,y] of [[2.6,h+1.3],[2.1,h+1.9],[1.5,h+2.4]])arc(g,r-.35,r,.16,[0,y,0],trim);
    const mast=new T.Mesh(new T.CylinderGeometry(.06,.1,1.4,8),solar);mast.position.y=h+2.9;g.add(mast);
    box(g,[.25,.25,.25],[0,h+3.6,0],futureLight,.05);
    return g;
  }
  if(style==='terrace'){
    // Dogenzaka: the housing steps back on the crossing and east sides; each step is a planted terrace.
    const tiers=[[10.8,20.2,0],[20.2,h+.8,1]] as const;
    for(const [y0,y1,t] of tiers){
      const tw=w-t*2,td=d-t*2.8,cx=-t,cz=-t*1.4;
      box(g,[tw,y1-y0,td],[cx,(y0+y1)/2,cz],color);
      bands(g,tw,td,cx,cz,y0+2.2,y1-1,3.5,1.5);
      if(t){
        box(g,[w,.35,d],[0,y0+.15,0],trim);
        box(g,[w-.3,.45,2.6],[0,y0+.55,d/2-1.4],leaf,.18);box(g,[1.8,.45,d-.3],[w/2-1,y0+.55,0],leaf,.18);
        const edge=new T.Group();edge.position.set(0,0,d/2-.9);g.add(edge);
        for(let i=0;i<9;i++){const s=.35+(i%3)*.08;const m=new T.Mesh(shrubGeometry,leaf);m.position.set(-w/2+.7+i*(w-1.4)/8,y0+.9+s*.4,0);m.scale.set(s,s*.8,s);m.castShadow=true;edge.add(m);}
        for(let u=-w/2+.4;u<w/2;u+=2.2)box(g,[.08,1,.08],[u,y0+.9,d/2-.1],trim,.02);
        box(g,[w,.06,.08],[0,y0+1.4,d/2-.1],trim,.02);
      }
    }
    box(g,[w-1.5,.5,d-2.3],[-1,h+1.05,-1.4],cream,.2);
    box(g,[w-2.7,.4,d-3.5],[-1,h+1.4,-1.4],leaf,.2);
    for(let c=0;c<2;c++){const panel=box(g,[(w-3)/2-.3,.12,2.4],[-1+(c-.5)*(w-3)/2,h+1.95,-d/2+2.4],solar,.04);panel.rotation.x=-.16;}
    return g;
  }
  // Station hall: long glazed floors, a ringed roof garden towards the crossing and a glass barrel vault over the concourse.
  box(g,[w,h-10,d],[0,(h-10)/2+10.8,0],color);
  bands(g,w,d,0,0,13,h,3.5,1.4);
  box(g,[w+.7,.55,d+.7],[0,h+1,0],cream,.25);
  box(g,[w-.7,.55,d-.7],[0,h+1.35,0],sage,.25);
  const r=Math.min(w,d/2)/2-.4;
  arc(g,0,r-.35,.12,[0,h+1.62,d/4],leaf);
  arc(g,r-.35,r,.45,[0,h+1.62,d/4],trim);
  const ring=new T.Group();ring.position.set(0,0,d/4);g.add(ring);
  shrubs(ring,r-.8,h+1.7,0,Math.PI*2,Math.round(r*5));
  // Shallow vault: a half cylinder flattened to 60% height, ribbed every sixth of its length.
  const vaultR=w/2-.9,vaultL=d*.42,vault=new T.Group();vault.position.set(0,h+1.62,-d/4);vault.scale.y=.6;g.add(vault);
  const shell=new T.Mesh(new T.CylinderGeometry(vaultR,vaultR,vaultL,32,1,true,Math.PI/2,Math.PI),glass);shell.rotation.x=Math.PI/2;vault.add(shell);
  for(let i=0;i<=6;i++){const rib=arc(vault,vaultR,vaultR+.14,.14,[0,0,-vaultL/2+i*vaultL/6-.07],trim,0,Math.PI);rib.rotation.x=Math.PI/2;}
  return g;
}
export function kiosk(kit:Kit) {
  const g=new T.Group();g.name='kiosk';g.position.set(13,0,11);
  box(g,[5.8,3.8,4.3],[0,2.1,0],sage,.65);box(g,[6.5,.7,5],[0,4.25,0],cream,.35);
  box(g,[4.8,1.3,.16],[0,2.3,2.17],glass,.14);box(g,[5.2,.25,1],[0,1.55,2.45],trim,.1);
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
/** Seeded tile/asphalt map: a light base the material colour multiplies, so presets still tint it. */
function surface(kind:'tile'|'asphalt', repeat:[number,number]) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;let n=kind==='tile'?7:11;const rand=()=>((n=Math.imul(n,1103515245)+12345>>>0)/4294967296);
  ctx.fillStyle='#f4f4f2';ctx.fillRect(0,0,256,256);
  for(let i=0;i<(kind==='tile'?1800:9000);i++){const v=kind==='tile'?226+rand()*29:200+rand()*55;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(rand()*256,rand()*256,kind==='tile'?2:1.5,kind==='tile'?2:1.5);}
  if(kind==='tile'){
    // Four 2-unit slabs per repeat, with a staggered joint every other row.
    ctx.fillStyle='#d9dcda';for(let r=0;r<4;r++){ctx.fillRect(0,r*64,256,2);for(let c=0;c<4;c++)ctx.fillRect(c*64+(r%2)*32,r*64,2,64);}
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(...repeat);texture.anisotropy=8;
  return texture;
}
export function cityRig(scene:T.Scene) {
  let seed=2127;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const kit:Kit={windows:[],signs:[],random};
  const staticGroup=new T.Group();scene.add(staticGroup);
  const road=paint('#7a8990',.9),ground=paint('#dfe3e0',.78),distant=paint('#c3d1db',.95);
  // Ground reads as laid stone and the carriageway as asphalt instead of flat paint (ART.md §3, hero band).
  ground.map=surface('tile',[149/8,139/8]);road.map=surface('asphalt',[1/6,1/6]);
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
    // Civic light: a mint kerb strip marks each waiting edge, just off the carriageway.
    for(const u of [-.02,1.02]){const p=crossingPoint(path,u);box(staticGroup,[width+.4,.03,.14],[p.x,.46,p.z],futureLight,.02).rotation.y=p.yaw;}
  }
  // Lane dashes are a mipmapped strip texture, not 0.13-wide boxes: when zoomed out the boxes fell below a pixel and crawled as the camera moved.
  const dashes=document.createElement('canvas');dashes.width=64;dashes.height=16;
  const dctx=dashes.getContext('2d')!;dctx.fillStyle='#000000';dctx.fillRect(0,0,64,16);dctx.fillStyle='#ffffff';dctx.fillRect(0,5,29,5); // alpha: 1.8 of every 4 units, .13 of a .4 strip
  const dashMap=new T.CanvasTexture(dashes);dashMap.wrapS=T.RepeatWrapping;dashMap.anisotropy=8;
  const dashMat=new T.MeshStandardMaterial({color:cream.color,alphaMap:dashMap,transparent:true,depthWrite:false,roughness:.58});
  for(const [x0,x1] of [[-73.9,-15],[18.1,75]]){
    const strip=new T.PlaneGeometry(x1-x0,.4).rotateX(-Math.PI/2),uv=strip.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*(x1-x0)/4);
    const mesh=new T.Mesh(strip,dashMat);mesh.position.set((x0+x1)/2,.445,0);mesh.receiveShadow=true;staticGroup.add(mesh);
  }
  const q=landmarks[0],qfront=new T.Group();qfront.position.set(q.x,0,q.z);qfront.name='QFRONT';
  // Twin occupied cores carry a civic hall and an upper residential district.
  for(const x of [-3.7,3.7])box(qfront,[3.6,q.h-.8,q.d],[x,q.h/2+.4,0],teal);
  box(qfront,[q.w,5,q.d],[0,3.3,0],glass);
  for(const y of [11,23,36])box(qfront,[q.w+.4,.6,q.d+.4],[0,y,0],trim);
  // Deck portal: the public route enters the open floor between the cores.
  box(qfront,[4.4,.5,.6],[0,12.2,q.d/2+.1],trim,.08);
  for(const [y,h] of [[17,10],[30,10]]){
    box(qfront,[q.w-.6,h,q.d-.5],[0,y,0],teal);
    if(y>25)continue; // the media drum is this block's crossing face
    for(let x=-4.5;x<=4.5;x+=1.5)box(qfront,[.12,h,.18],[x,y,5.03],trim);
    for(let f=y-h/2+1;f<y+h/2;f+=2){box(qfront,[q.w-1,.6,.12],[0,f,5.05],glass);box(qfront,[q.w-.6,.1,.5],[0,f+.5,5.22],trim,.03);}
  }
  mediaDrum(qfront,kit,q.d/2);
  // Side and back faces: continuous glass ribbons between the trim bands (the crown wing covers them above Y=40).
  faces(qfront,q.w,q.d,(f,across,out)=>{
    for(let y=13;y<40;y+=2.5)if(Math.abs(y-23)>.8 && Math.abs(y-36)>.8){box(f,[across-1.2,.6,.1],[0,y,out+.05],glass,.03);box(f,[across-.8,.1,.4],[0,y+.45,out+.2],trim,.03);}
  },[1,2,3]);
  // Planted terraces on the crossing and east faces: greenery grows on the slabs, it is not stuck on as pots.
  for(const y of [11,23,36]){
    box(qfront,[.55,.5,q.d-.4],[q.w/2-.05,y+.55,0],leaf,.2);
    for(const x of y===11?[-3.9,3.9]:[-4.6,4.6])box(qfront,[y===11?3.1:1.6,.5,.55],[x,y+.55,q.d/2+.05],leaf,.2);
  }
  sign(qfront,kit,'QFRONT',0,44,6.05,8,1.2,'#294652');
  sign(qfront,kit,'TSUTAYA / COMMONS',0,4.1,5.12,9.5,.85,'#294652');
  staticGroup.add(qfront,tower(kit));
  for(const [i,color,style] of [[2,sage,'slender'],[3,pink,'terrace'],[4,cream,'hall']] as const){
    const b=landmarks[i];staticGroup.add(shop(kit,b.x,b.z,b.w,b.h,b.d,color,b.name,style));
  }
  for(const link of upperLinks){
    const g=new T.Group();g.position.set(link.x,link.y,link.z);staticGroup.add(g);
    if(link.kind!=='wing')for(const y of [-link.h/2,link.h/2])box(g,[link.w+.4,.35,link.d+.5],[0,y,0],trim);
    if(link.kind==='floor'){
      // Open public colonnade: slab, roof, slender columns and glass rails; no enclosing wall.
      for(let x=-link.w/2+1.2;x<link.w/2;x+=2.6)for(const z of [-link.d/2+.3,link.d/2-.3])box(g,[.3,link.h,.3],[x,0,z],trim,.05);
      for(const z of [-link.d/2,link.d/2]){box(g,[link.w,1.05,.06],[0,-link.h/2+.7,z],membrane);box(g,[link.w-1,.45,.5],[0,-link.h/2+.4,z*(1-1.6/link.d)],leaf,.18);}
    } else if(link.kind==='link'){
      box(g,[link.w,link.h,link.d],[0,0,0],glass);
      for(let x=-link.w/2+.8;x<link.w/2;x+=1.3)for(const z of [-1,1])box(g,[.1,link.h,.2],[x,0,z*(link.d/2+.08)],trim);
      for(const z of [-link.d/2,link.d/2])box(g,[link.w,1,.08],[0,link.h/2+.6,z],teal);
    } else {
      // Each wing keeps its own ceramic tone so the upper district does not read as one repeated block.
      // Its free end is a curved glass bay ringed by floor discs (ART.md §2), inside the wing's layout volume.
      const end=Math.sign(link.x-landmarks.find(b=>b.name===link.on[0])!.x),bay=2,body=link.w-bay,r=link.d/2-.2;
      const at=new T.Group();at.position.x=-end*bay/2;g.add(at);
      box(at,[body,link.h,link.d],[0,0,0],{'QFRONT CROWN':cream,'QFRONT WEST WING':sage}[link.name as string]??teal);
      const floors=new T.Group();floors.position.y=-link.h/2;at.add(floors);windows(floors,kit,body,link.h,link.d,end>0?[0,2,3]:[0,1,2]);
      const cap=new T.Group();cap.position.x=end*(link.w/2-bay);cap.rotation.y=end>0?0:Math.PI;cap.scale.x=bay/r;g.add(cap);
      cap.add(new T.Mesh(new T.CylinderGeometry(r,r,link.h,32,1,false,0,Math.PI),glass));
      const slabs=[-link.h/2,link.h/2];for(let y=-link.h/2+3.5;y<link.h/2-1;y+=3.5)slabs.push(y);
      for(const y of slabs){
        const edge=Math.abs(y)===link.h/2;
        box(at,[body+(edge?.4:.2),edge?.35:.22,link.d+(edge?.5:.2)],[0,y,0],trim);
        arc(cap,0,r+(edge?.25:.1),edge?.35:.22,[0,y-(edge?.175:.11),0],trim,-Math.PI/2,Math.PI);
      }
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
  arc(hachiko,0,.95,.75,[0,.45,0],stone);
  box(hachiko,[.55,.85,.65],[0,1.5,0],dark,.14);
  box(hachiko,[.55,.5,.65],[0,2.1,.2],dark,.12);
  for(const x of [-.2,.2])box(hachiko,[.13,.28,.18],[x,2.43,.15],dark,.02);
  sign(hachiko,kit,'HACHIKO',0,.9,.85,1.35,.3,'#536f66');
  // Hachiko plaza as a planted round room: open to the crossing (NW) and the station (E), sheltered from the road (W/S).
  const plaza=new T.Group();plaza.position.set(8,0,17);staticGroup.add(plaza);
  arc(plaza,0,5.2,.1,[0,.42,0],stone);
  arc(plaza,3.55,3.68,.02,[0,.52,0],futureLight);
  for(const [start,length] of [[2.75,2.6],[.3,.9]]){
    arc(plaza,4.1,4.9,.55,[0,.52,0],trim,start,length);
    arc(plaza,4.2,4.8,.08,[0,1.07,0],leaf,start,length);
    shrubs(plaza,4.5,1.1,start,length,Math.round(length*7));
  }
  arc(plaza,2.55,2.95,.42,[0,.52,0],pink,3.9,1.6);
  const depot=new T.Group();depot.position.set(DOCK.x,0,DOCK.z);staticGroup.add(depot);
  for(const x of [-.85,.85])box(depot,[.13,13.8,.18],[x,7.5,0],solar,.025);
  for(const x of [-.85,.85])box(depot,[.13,.16,DOCK.z-DOCK.berthZ],[x,DOCK.y-1,(DOCK.berthZ-DOCK.z)/2],solar,.025);
  // Open-topped receiving cabinet: cargo enters without passing through a solid lid.
  for(const x of [-.86,.86])box(depot,[.18,2.3,1.6],[x,1.95,0],cream,.07);
  box(depot,[1.9,2.3,.15],[0,1.95,-.78],cream,.06);
  box(depot,[1.9,1.8,.15],[0,1.7,.78],teal,.06);
  sign(depot,kit,'受取  /  PICKUP',0,1.8,.89,1.6,.4,'#46676e');
  // Civic totems (ART.md §6): the air line, temperature, air quality and next service, as Pic 2's side panels.
  for(const [x,z,wait] of [[-12,12,2],[16,-7,4]]){
    const terminal=new T.Group();terminal.position.set(x,0,z);staticGroup.add(terminal);
    arc(terminal,0,.8,.1,[0,.42,0],stone);
    box(terminal,[.86,3.6,.4],[0,2.3,0],trim,.18);
    box(terminal,[.07,2.9,.07],[.47,2.3,.12],futureLight,.03);
    box(terminal,[.98,.12,.5],[0,4.16,0],futureLight,.04);
    const canvas=document.createElement('canvas');canvas.width=192;canvas.height=640;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#2f4f58';ctx.fillRect(0,0,192,640);ctx.textAlign='center';
    const line=(text:string,y:number,font:string,color='#eef3e6')=>{ctx.fillStyle=color;ctx.font=font;ctx.fillText(text,96,y);};
    line('AIR',70,'600 44px sans-serif','#8ce5d8');line('02',150,'300 84px sans-serif');
    ctx.fillStyle='#8ce5d8';ctx.fillRect(36,190,120,3);
    line('24°',290,'300 72px sans-serif');line('気温 / TEMP',330,'500 22px sans-serif','#b9ccc9');
    line('良好',420,'500 46px sans-serif');line('空気 / AIR',460,'500 22px sans-serif','#b9ccc9');
    line(`${wait} min`,550,'500 46px sans-serif','#8ce5d8');line('次便 / NEXT',590,'500 22px sans-serif','#b9ccc9');
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    const material=new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.3,roughness:.4});kit.signs.push(material);
    const panel=new T.Mesh(new T.PlaneGeometry(.66,2.2),material);panel.position.set(0,2.45,.21);terminal.add(panel);
  }
  // Civic seating stays outside the five crossing mouths.
  for(const [x,z] of [[-18,-25],[16,10]]){
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
  // Every seventh block is a ringed round tower and every seventh from 5 a stepped terrace, so the skyline carries the future silhouette too.
  for(let i=0;i<60;i++){
    const angle=i/60*Math.PI*2+random()*.08,radius=125+random()*40,w=8+random()*10,h=6+random()*(i%5?20:38),d=w*(.6+random()*.8);
    const at=new T.Group();at.position.set(Math.cos(angle)*radius,-.7,Math.sin(angle)*radius);at.rotation.y=-angle;staticGroup.add(at);
    if(i%7===2){
      const r=w*.35,tall=h+14,core=new T.Mesh(new T.CylinderGeometry(r*.85,r,tall,20),distant);core.position.y=tall/2;at.add(core);
      for(let y=tall*.35;y<tall;y+=tall*.2)arc(at,0,r+1.2,.6,[0,y,0],distant);
    } else if(i%7===5){
      box(at,[w,h,d],[0,h/2,0],distant,.1);
      box(at,[w*.72,h*.45,d*.72],[w*.1,h*1.22,0],distant,.1);box(at,[w*.45,h*.3,d*.45],[w*.2,h*1.6,0],distant,.1);
    } else box(at,[w,h,d],[0,h/2,0],distant,.1);
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
  scene.remove(staticGroup);scene.add(...bake(staticGroup));
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
