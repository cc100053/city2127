import * as T from 'three';
import { changeSites, DISTRICT, inDistrict, seaward } from './layout.ts';
import { routes } from './mobility.ts';
import { recedeBeyondDistrict } from './bayContext.ts';

/** Street-grid frame of the district (u along the Yurikamome guideway, v across it): landscape beds, tree rows and the climate corridor all follow it. */
export const gridUV=(x:number,z:number)=>[-.832*x+.555*z,.555*x+.832*z] as const;
/** One straight climate corridor (water-retention channel) in the continuous landscape strip seaward of the guideway; odaibaScene.ts paints it. */
export const CORRIDOR={v:-80,half:5} as const;
const inCorridor=(x:number,z:number,margin:number)=>Math.abs(gridUV(x,z)[1]-CORRIDOR.v)<CORRIDOR.half+margin;

/** Reuse the surveyed planting locations; layered crowns replace the tiny blockout cones. */
export function plantCanopy(scene: T.Object3D, trees: { instances: { position: number[]; scale: number; type: string }[] }) {
  const positions=trees.instances.filter(tree=>inDistrict(tree.position[0],-tree.position[1]) && !seaward(tree.position[0],-tree.position[1]) && !(tree.position[2]<3 && inCorridor(tree.position[0],-tree.position[1],2)) && !Object.values(changeSites).some(site=>Math.abs(tree.position[0]-site.x)<site.w*site.scale/2+9 && Math.abs(-tree.position[1]-site.z)<site.d*site.scale/2+9));
  // Instance colours already provide the leaf pigment; a second green tint crushed the lit canopy.
  const foliage=new T.InstancedMesh(new T.IcosahedronGeometry(1,2),new T.MeshStandardMaterial({color:'#ffffff',roughness:.92}),positions.length*3);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.35,.6,1,6),new T.MeshStandardMaterial({color:'#776957',roughness:1}),positions.length);
  const dummy=new T.Object3D(),color=new T.Color();
  positions.forEach((tree,i)=>{
    const [x,y,z]=tree.position,s=tree.scale,h=(tree.type==='columnar'?10:7)*s;
    dummy.position.set(x,z+h*.35,-y);dummy.scale.set(s,h*.7,s);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    // r7 pass 2: one slender stacked column per tree (3 tapering crowns on the trunk axis), not a round 4-blob clump.
    for(let j=0;j<3;j++){
      const r=(2.1-j*.5)*s;
      dummy.position.set(x,z+h+j*1.8*s,-y);dummy.scale.set(r,2.2*s,r);dummy.rotation.set(0,i,0);dummy.updateMatrix();foliage.setMatrixAt(i*3+j,dummy.matrix);
      // About one tree in eleven is a flowering cherry; the rest are sage/silver-green rather than saturated game green (user, r7).
      if(i%11===5)color.setHSL(.95+(j%2)*.01,.32,.72+(j%3)*.03);else color.setHSL(.24+(i%5)*.008,.12+(j%3)*.03,.33+(i%7)*.016);
      foliage.setColorAt(i*3+j,color);
    }
  });
  foliage.name='surveyed-coastal-canopy';trunks.name='surveyed-coastal-trunks';
  foliage.castShadow=trunks.castShadow=true;foliage.receiveShadow=trunks.receiveShadow=true;scene.add(foliage,trunks);
}

/** Ordered tree rows on authored landscape only, centred in every third grid bed strip (odaibaScene.ts); circulation, landmark pads and the corridor stay open. */
export function plantLandscapeCanopy(scene:T.Object3D,environment:T.Object3D,buildings:T.Object3D[]) {
  environment.updateMatrixWorld(true);
  const pads=buildings.map(building=>new T.Box3().setFromObject(building).expandByScalar(8));
  const paths=routes(),clearPaths=[paths.guideway,...paths.promenades].flatMap(path=>path.getSpacedPoints(400));
  const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),instances:{position:number[];scale:number;type:string}[]=[];
  const landscapeAt=(x:number,z:number)=>{
    ray.set(new T.Vector3(x,300,z),down);
    const hit=ray.intersectObject(environment,true)[0];
    return hit && hit.object instanceof T.Mesh && !Array.isArray(hit.object.material) && hit.object.material.name==='landscape' && hit.point.y<3 ? hit.point.y : null;
  };
  // Bed strips centre at u = 40n+20, v = 20n+10 (see the landscape shader); every third strip carries a row, two trees per strip.
  for(let v=-330;v<320;v+=60)for(let u=-490;u<500;u+=20){
    const px=-.832*u+.555*v,pz=.555*u+.832*v;
    if(!inDistrict(px,pz) || inCorridor(px,pz,8) || seaward(px,pz) || pads.some(pad=>px>pad.min.x && px<pad.max.x && pz>pad.min.z && pz<pad.max.z)
      || Object.values(changeSites).some(site=>Math.abs(px-site.x)<site.w*site.scale/2+22 && Math.abs(pz-site.z)<site.d*site.scale/2+22)
      || clearPaths.some(p=>Math.hypot(p.x-px,p.z-pz)<17))continue;
    const y=landscapeAt(px,pz);
    if(y===null || ![[7,0],[-7,0],[0,7],[0,-7]].every(([dx,dz])=>landscapeAt(px+dx,pz+dz)!==null))continue;
    instances.push({position:[px,-pz,y],scale:.9,type:'columnar'});
  }
  plantCanopy(scene,{instances});
}

/** The Odaiba backdrop beyond the district keeps its parks as ordered sage bed blocks in white curbs on the street grid (r7 pass 2: no round crown clumps),
 *  one unshadowed instanced batch receding with the ground it stands on. */
export function plantBackdropGrove(scene:T.Object3D,environment:T.Object3D) {
  environment.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(environment),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),matrices:T.Matrix4[]=[],colors:T.Color[]=[],dummy=new T.Object3D();
  const reach=Math.max(...[bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z].map(Math.abs))*1.42,yaw=Math.atan2(-.555,-.832);
  // ponytail: one unaccelerated ray per 30×24 m grid cell over the rotated plate (~4k rays at load); add a BVH if the plate grows.
  for(let u=-reach;u<reach;u+=30)for(let v=-reach;v<reach;v+=24){
    // Every third row stays open as a paved lane.
    if(Math.round(v/24)%3===0)continue;
    const px=-.832*u+.555*v,pz=.555*u+.832*v;
    if(px<bounds.min.x || px>bounds.max.x || pz<bounds.min.z || pz>bounds.max.z || inDistrict(px,pz) || seaward(px,pz))continue;
    ray.set(new T.Vector3(px,300,pz),down);
    const hit=ray.intersectObject(environment,true)[0];
    if(!hit || !(hit.object instanceof T.Mesh) || Array.isArray(hit.object.material) || hit.object.material.name!=='landscape' || hit.point.y>=9)continue;
    const i=matrices.length,y=hit.point.y;
    for(const [l,hgt,w,base,color] of [[25,.9,10,0,new T.Color('#e9e5da')],[22,3.6+(i%3)*.8,7,.9,new T.Color().setHSL(.23+(i%5)*.01,.12+(i%3)*.03,.3+(i%7)*.02)]] as const){
      dummy.position.set(px,y+base+hgt/2,pz);dummy.scale.set(l,hgt,w);dummy.rotation.set(0,yaw,0);dummy.updateMatrix();matrices.push(dummy.matrix.clone());colors.push(color);
    }
  }
  const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:.95});recedeBeyondDistrict(material);
  const grove=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,matrices.length);
  matrices.forEach((matrix,i)=>{grove.setMatrixAt(i,matrix);grove.setColorAt(i,colors[i]);});
  grove.name='backdrop-grove';grove.receiveShadow=true;scene.add(grove);
}
