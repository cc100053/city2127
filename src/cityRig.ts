import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldState } from './presets';
import { changeSites } from './layout.ts';
import { mobility } from './mobility.ts';

// Three finishes: matte ceramic composite, refined metal, and reflective glass. Same shader, different response to the one environment map.
export const paint = (color: T.ColorRepresentation, roughness=.52, metalness=0) => new T.MeshStandardMaterial({ color, roughness, metalness });
export const cream = paint('#e2ddd2',.58), teal = paint('#839da8',.44,.05), sage = paint('#a9c5c2',.5), pink = paint('#b9b7ac',.56), dark = paint('#27414f',.16,.7), trim = paint('#eee9df',.48);
export const futureLight=new T.MeshStandardMaterial({color:'#8ce5d8',emissive:'#68d9de',emissiveIntensity:.8,roughness:.65});
export const publicLight=new T.MeshStandardMaterial({color:'#ecf4ed',emissive:'#dcebe6',emissiveIntensity:.15,roughness:.6});
// Blue light trails: saturated and above the bloom threshold in daylight, so the 2127 network reads as lit blue lines (not white trim) from the hero pose.
export const trail = new T.MeshBasicMaterial({ color: new T.Color('#4da3ff').multiplyScalar(3) });
export const solar=paint('#486b83',.3,.85);
export const membrane=new T.MeshStandardMaterial({color:'#9abdb9',roughness:.3,metalness:.25,transparent:true,opacity:.72,side:T.DoubleSide});
// Pilot finishes (docs/ART.md): silvered glass that reads the sky, living green, pale stone paving.
export const glass=new T.MeshPhysicalMaterial({color:'#a7c3cf',roughness:.08,metalness:.6,clearcoat:1,clearcoatRoughness:.06});
export const leaf=paint('#7d9f68',.85), stone=paint('#ebe8e0',.66);
// Silvered glass for the 2127 spheres: warm and only partly metallic, so they read as polished silver mirrors of the golden sky, not blue domes.
// r4 pass 4: near-full mirror with a boosted env response, so each sphere reads as one bright silver ball (target v2), not a dome over a dark band.
// r5 pass 3: the mirrors see their own warm golden-hour panorama (pale gold sky, bright cream horizon, sun glow to the south-west,
// warm city below) instead of the saturated blue sky capture, so each sphere reads as bright silver (target v2), not a dark blue dome.
// A float DataTexture (no DOM), so Node tests can import this module; three converts it to PMREM on first use.
const mirrorSky=(()=>{
  const W=128,H=64,data=new Float32Array(W*H*4),c=new T.Color(),sun=new T.Vector3(-.66,.22,.72).normalize(),dir=new T.Vector3();
  // r6: cooled to silver (target v2's spheres read silver-glass, not gold): bay blue below, white horizon band, pale blue-grey sky, a small warm sun spot.
  const below=new T.Color('#6f8fa2'),low=new T.Color('#b9c6cc'),horizon=new T.Color('#ffffff'),sky=new T.Color('#e4e9ec'),zenith=new T.Color('#b7cad8'),glow=new T.Color('#fff0d8');
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){
    const lat=((j+.5)/H-.5)*Math.PI,lon=((i+.5)/W-.5)*Math.PI*2,e=lat*180/Math.PI; // three's equirect: u=atan(z,x)/2π+.5, v=asin(y)/π+.5
    dir.set(Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon));
    if(e<-4)c.copy(low).lerp(below,T.MathUtils.smoothstep(-e,4,40));
    else if(e<8)c.copy(low).lerp(horizon,T.MathUtils.smoothstep(e,-4,2)).multiplyScalar(1+.35*T.MathUtils.smoothstep(e,-2,3)*(1-T.MathUtils.smoothstep(e,3,8)));
    else c.copy(horizon).lerp(sky,T.MathUtils.smoothstep(e,8,20)).lerp(zenith,T.MathUtils.smoothstep(e,20,75));
    c.add(glow.clone().multiplyScalar(2.2*Math.pow(Math.max(dir.dot(sun),0),10)));
    data.set([c.r,c.g,c.b,1],(j*W+i)*4);
  }
  const texture=new T.DataTexture(data,W,H,T.RGBAFormat,T.FloatType);texture.mapping=T.EquirectangularReflectionMapping;texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;
  return texture;
})();
export const chrome=new T.MeshPhysicalMaterial({color:'#f1f4f6',metalness:.92,roughness:.05,clearcoat:1,clearcoatRoughness:.02,envMap:mirrorSky,envMapIntensity:1});
/** Materials that use `mirrorSky` (its own envMap skips scene.environmentIntensity), dimmed with the night in `cityRig().update`. */
export const mirrors:T.MeshStandardMaterial[]=[chrome];
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
  return [...batches].map(([material,geometries])=>{
    // Merge only attributes every piece has (e.g. surveyed GLB parts without UVs under an untextured material).
    const shared=Object.keys(geometries[0].attributes).filter(name=>geometries.every(g=>g.hasAttribute(name)));
    geometries.forEach(g=>Object.keys(g.attributes).filter(name=>!shared.includes(name)).forEach(name=>g.deleteAttribute(name)));
    const mesh=new T.Mesh(mergeGeometries(geometries),material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='fixed-kit';geometries.forEach(g=>g.dispose());return mesh;});
}
type WindowSlot = { object:T.Object3D; phase:number; occupancy:number };
export type Kit = { windows:WindowSlot[]; signs:T.MeshStandardMaterial[]; random:()=>number };
/** Calls `face` for each side (0 +Z, 1 +X, 2 -Z, 3 -X) in a group turned so that side is local +Z: `across` is its width, `out` its distance from the centre. */
export function faces(parent:T.Object3D, w:number, d:number, face:(g:T.Group,across:number,out:number,side:number)=>void, sides=[0,1,2,3]) {
  for(const side of sides){const g=new T.Group();g.rotation.y=side*Math.PI/2;parent.add(g);face(g,side%2?d:w,side%2?w/2:d/2,side);}
}
export function sign(group:T.Group, kit:Kit, text:string, x:number,y:number,z:number,w:number,h:number,bg:string,fg='#eff3d3') {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=fg;ctx.font='500 56px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.3,roughness:.9});kit.signs.push(material);
  box(group,[w+.2,h+.2,.25],[x,y,z-.05],trim,.1);
  const panel=new T.Mesh(new T.PlaneGeometry(w,h),material);panel.position.set(x,y,z+.09);group.add(panel);
}
/** Shared finishes, the civic lights at the survey sites and the ambient actors; the Odaiba ground and landmarks load in `odaibaScene`. */
export function cityRig(scene:T.Scene) {
  const civicLights:T.PointLight[]=[];
  // ponytail: four shadowless site lights; use a baked lightmap if wall leakage becomes visible.
  for(const site of Object.values(changeSites)){
    // Built in site units and scaled with the site, so the mast reads at the same size beside it.
    const s=site.scale,mast=new T.Group();mast.position.set(site.x+(site.w/2+1)*s,0,site.z+site.d/2*s);mast.scale.setScalar(s);scene.add(mast);
    // A slim split mast with a luminous underside, shared across site entrances.
    box(mast,[.22,6,.28],[0,3.45,0],trim,.06);
    box(mast,[.07,4.8,.07],[0,3.3,.18],futureLight,.02);
    box(mast,[2.6,.18,.8],[-.95,6.5,0],trim,.08);
    box(mast,[2.25,.06,.65],[-.95,6.38,0],publicLight,.02);
    // Range and peak grow with the site so the lit area keeps its proportion (inverse-square decay).
    const light=new T.PointLight('#e0eee5',0,19*s,2);light.position.set(-.95,6.15,0);light.userData.peak=95*s*s;
    light.name='civic-night-light';mast.add(light);civicLights.push(light);
  }
  const updateMobility=mobility(scene);
  return {
    update(state:WorldState,time:number,night:number) {
      publicLight.emissiveIntensity=.15+night*1.3;
      for(const m of mirrors)m.envMapIntensity=1-night*.85;
      civicLights.forEach(light=>light.intensity=night*light.userData.peak);
      futureLight.emissiveIntensity=.25+state.neon*.5+night*.45;
      membrane.opacity=.6+state.greenery*.18;
      updateMobility(state,time);
    },
  };
}
