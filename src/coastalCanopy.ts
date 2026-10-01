import * as T from 'three';
import { changeSites, DISTRICT, inDistrict, seaward } from './layout.ts';
import { routes } from './mobility.ts';
import { recedeBeyondDistrict } from './bayContext.ts';
import { leaf, trim } from './cityRig.ts';

/** Grove field: the landscape shader (odaibaScene.ts) fills swales below -1.24 with ponds; groves keep clear of them. */
const swale=(x:number,z:number)=>Math.sin(x*.023+Math.sin(z*.018)*2)+Math.cos(z*.031);
/** r8: one climate corridor — the swale valley line through the district centre (sine term at its minimum) runs through its ponds,
 * so the shader cuts a channel along it (|corridor| < .1, about 4 m each side) joining them into one water system. Mirrored in odaibaScene. */
export const corridor=(x:number,z:number)=>Math.abs(x*.023+Math.sin(z*.018)*2+Math.PI/2);
export const CORRIDOR_GLSL='abs(w.x*.023+sin(w.y*.018)*2.+1.5708)';

/** Reuse the surveyed planting locations; layered crowns replace the tiny blockout cones. */
export function plantCanopy(scene: T.Object3D, trees: { instances: { position: number[]; scale: number; type: string }[] }) {
  const positions=trees.instances.filter(tree=>inDistrict(tree.position[0],-tree.position[1]) && !seaward(tree.position[0],-tree.position[1]) && !(tree.position[2]<3 && (swale(tree.position[0],-tree.position[1])<-1.1 || corridor(tree.position[0],-tree.position[1])<.2)) && !Object.values(changeSites).some(site=>Math.abs(tree.position[0]-site.x)<site.w*site.scale/2+9 && Math.abs(-tree.position[1]-site.z)<site.d*site.scale/2+9));
  // Instance colours already provide the leaf pigment; a second green tint crushed the lit canopy.
  const foliage=new T.InstancedMesh(new T.IcosahedronGeometry(1,2),new T.MeshStandardMaterial({color:'#ffffff',roughness:.92}),positions.length*4);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.35,.6,1,6),new T.MeshStandardMaterial({color:'#776957',roughness:1}),positions.length);
  const dummy=new T.Object3D(),color=new T.Color();
  positions.forEach((tree,i)=>{
    const [x,y,z]=tree.position,s=tree.scale,h=(tree.type==='columnar'?10:7)*s;
    dummy.position.set(x,z+h*.35,-y);dummy.scale.set(s,h*.7,s);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<4;j++){
      const a=j*2.4+i;
      dummy.position.set(x+Math.cos(a)*1.9*s,z+h+(j%2)*1.2,-y+Math.sin(a)*1.9*s);
      dummy.scale.set(3.4*s,(tree.type==='columnar'?4.4:2.9)*s,3*s);dummy.rotation.set(.1*i,a,.15*j);dummy.updateMatrix();foliage.setMatrixAt(i*4+j,dummy.matrix);
      // About one tree in eleven is a flowering cherry: pale pink crowns scattered through the green (target reference).
      if(i%11===5)color.setHSL(.95+(j%2)*.01,.38,.7+(j%3)*.03);else color.setHSL(.21+(i%5)*.008,.28+(j%3)*.05,.23+(i%7)*.018);
      foliage.setColorAt(i*4+j,color);
    }
  });
  foliage.name='surveyed-coastal-canopy';trunks.name='surveyed-coastal-trunks';
  foliage.castShadow=trunks.castShadow=true;foliage.receiveShadow=trunks.receiveShadow=true;scene.add(foliage,trunks);
}

const drum=new T.CylinderGeometry(1,1,1,40);
/** r8 (user: 2127 form, same green volume): green gathers in dense clusters on engineered two-step terraces — a wide white-rimmed
 * lawn tier with a ring of crowns and a raised inner tier with taller ones — instead of trees spread evenly. [x, z, ground y, radius]. */
function plantClusters(scene:T.Object3D,clusters:[number,number,number,number][],scale=1){
  const trees:{position:number[];scale:number;type:string}[]=[],dummy=new T.Object3D(),n=clusters.length*2;
  const rims=new T.InstancedMesh(drum,trim,n),beds=new T.InstancedMesh(drum,leaf,n);
  clusters.forEach(([x,z,y,R],i)=>{
    // Oval, turned per cluster, so the terraces read as shaped landform rather than a polka-dot grid.
    const yaw=Math.sin(x*.37+z*.11)*3,stretch=1.15+(i%3)*.12;
    const at=(f:number,a:number)=>{const lx=Math.cos(a)*f*R*stretch,lz=Math.sin(a)*f*R/stretch;return [x+lx*Math.cos(yaw)+lz*Math.sin(yaw),z-lx*Math.sin(yaw)+lz*Math.cos(yaw)];};
    ([[1,.7],[.55,1.9]] as const).forEach(([f,top],k)=>{
      dummy.rotation.set(0,yaw,0);
      dummy.position.set(x,y+top/2,z);dummy.scale.set(R*f*stretch,top,R*f/stretch);dummy.updateMatrix();rims.setMatrixAt(i*2+k,dummy.matrix);
      dummy.position.set(x,y+top+.02,z);dummy.scale.set(R*f*stretch-.5,.06,R*f/stretch-.5);dummy.updateMatrix();beds.setMatrixAt(i*2+k,dummy.matrix);
    });
    const ring=Math.max(3,Math.round(R*.6));
    for(let j=0;j<ring;j++){const [tx,tz]=at(.74,j/ring*Math.PI*2+i);trees.push({position:[tx,-tz,y+.7],scale:scale*(.85+((i+j)%4)*.1),type:(i+j)%5===0?'columnar':'broadleaf'});}
    for(let j=0;j<3;j++){const [tx,tz]=at(j?.28:0,j*Math.PI+i);trees.push({position:[tx,-tz,y+1.9],scale:scale*1.15,type:'broadleaf'});}
  });
  plantCanopy(scene,{instances:trees});
  rims.name=beds.name='grove-terraces';rims.castShadow=beds.castShadow=true;rims.receiveShadow=beds.receiveShadow=true;scene.add(rims,beds);
}

/** Clusters on authored flat planted roofs (white-rimmed podium terraces); `tower` instead crowns any flat roof above 30 m (2127 sky gardens). */
export function plantRoofCanopy(scene: T.Object3D, model: T.Object3D, tower=false) {
  const bounds=new T.Box3().setFromObject(model),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
  bounds.min.x=Math.max(bounds.min.x,DISTRICT.minX);bounds.max.x=Math.min(bounds.max.x,DISTRICT.maxX);bounds.min.z=Math.max(bounds.min.z,DISTRICT.minZ);bounds.max.z=Math.min(bounds.max.z,DISTRICT.maxZ);
  const clusters:[number,number,number,number][]=[];
  const roofAt=(x:number,z:number)=>{
    ray.set(new T.Vector3(x,bounds.max.y+1,z),down);
    const hit=ray.intersectObject(model,true)[0];
    if(!hit || !(hit.object instanceof T.Mesh))return null;
    const material=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex??0]:hit.object.material;
    return (tower ? hit.point.y>30 : material.name==='Roof and Shadow') && hit.face && hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y>.98 ? hit.point : null;
  };
  const flat=(x:number,z:number,y:number,r:number)=>[[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,-r*.7],[r*.7,-r*.7],[-r*.7,r*.7]].every(([dx,dz])=>{const edge=roofAt(x+dx,z+dz);return edge && Math.abs(edge.y-y)<.3;});
  const R=tower?6:8,step=tower?15:19;
  for(let x=bounds.min.x+4;x<bounds.max.x-4;x+=step)for(let z=bounds.min.z+4;z<bounds.max.z-4;z+=step){
    const p=roofAt(x,z);
    if(!p || p.y<12)continue;
    // Narrow roof strips still take a smaller terrace, so roof green does not thin out.
    const r=flat(x,z,p.y,R*1.3+1)?R:flat(x,z,p.y,R*.7+1)?R*.55:0;
    if(r)clusters.push([x,z,p.y,r]);
  }
  plantClusters(scene,clusters,tower?.9:.6);
}

/** Coastal groves gather along structure — building edges, guideway, promenades and the water corridor — on authored landscape only, leaving open lawns between; circulation and landmark pads remain open. */
export function plantLandscapeCanopy(scene:T.Object3D,environment:T.Object3D,buildings:T.Object3D[]) {
  environment.updateMatrixWorld(true);
  const pads=buildings.map(building=>new T.Box3().setFromObject(building));
  const paths=routes(),clearPaths=[paths.guideway,...paths.promenades].flatMap(path=>path.getSpacedPoints(400));
  const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),clusters:[number,number,number,number][]=[];
  const landscapeAt=(x:number,z:number)=>{
    ray.set(new T.Vector3(x,300,z),down);
    const hit=ray.intersectObject(environment,true)[0];
    return hit && hit.object instanceof T.Mesh && !Array.isArray(hit.object.material) && hit.object.material.name==='landscape' && hit.point.y<3 ? hit.point.y : null;
  };
  const padGap=(x:number,z:number)=>Math.min(Infinity,...pads.map(p=>Math.hypot(Math.max(p.min.x-x,0,x-p.max.x),Math.max(p.min.z-z,0,z-p.max.z))));
  const pathGap=(x:number,z:number)=>Math.min(...clearPaths.map(p=>Math.hypot(p.x-x,p.z-z)));
  for(let x=DISTRICT.minX+26;x<DISTRICT.maxX-26;x+=26)for(let z=DISTRICT.minZ+26;z<DISTRICT.maxZ-26;z+=26){
    const px=x+Math.sin(z*1.7+x)*8,pz=z+Math.cos(x*1.3-z)*8,R=8+(Math.sin(x*.7+z)+1)*2.5,reach=R*1.4;
    if(seaward(px,pz) || Object.values(changeSites).some(site=>Math.abs(px-site.x)<site.w*site.scale/2+16+reach && Math.abs(pz-site.z)<site.d*site.scale/2+16+reach))continue;
    const pad=padGap(px,pz),path=pathGap(px,pz),sw=swale(px,pz),cor=corridor(px,pz);
    // Keep the terrace off pads, paths, ponds (swale changes up to ~.05 per metre) and the corridor channel.
    if(pad<reach+6 || path<reach+10 || sw<-1.15+reach*.05 || cor<.14+reach*.045)continue;
    if(!(pad<reach+36 || path<reach+28 || cor<.14+reach*.045+.8 || sw<-.4))continue;
    const y=landscapeAt(px,pz);
    if(y===null || ![[reach,0],[-reach,0],[0,reach],[0,-reach]].every(([dx,dz])=>landscapeAt(px+dx,pz+dz)!==null))continue;
    clusters.push([px,pz,y,R]);
  }
  plantClusters(scene,clusters);
}

/** The Odaiba backdrop beyond the district keeps its parks as one unshadowed batch of low crowns, receding with the ground it stands on. */
export function plantBackdropGrove(scene:T.Object3D,environment:T.Object3D) {
  environment.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(environment),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),matrices:T.Matrix4[]=[],dummy=new T.Object3D();
  // ponytail: one unaccelerated ray per 26 m cell (~3k rays at load); add a BVH if the plate grows.
  for(let x=bounds.min.x;x<bounds.max.x;x+=26)for(let z=bounds.min.z;z<bounds.max.z;z+=26){
    if(inDistrict(x,z) || Math.sin(x*.019+Math.sin(z*.021)*2)+Math.cos(z*.027)<-.35)continue;
    const px=x+Math.sin(z*1.7+x)*8,pz=z+Math.cos(x*1.3-z)*8;
    if(seaward(px,pz))continue;
    ray.set(new T.Vector3(px,300,pz),down);
    const hit=ray.intersectObject(environment,true)[0];
    if(!hit || !(hit.object instanceof T.Mesh) || Array.isArray(hit.object.material) || hit.object.material.name!=='landscape' || hit.point.y>=9)continue;
    for(let j=0;j<2;j++){
      const a=j*3.1+x*.1,s=4.2+(Math.sin(x*3.1+z+j)+1)*1.3;
      dummy.position.set(px+Math.cos(a)*5,hit.point.y+s*.9,pz+Math.sin(a)*5);dummy.scale.set(s,s*.85,s);dummy.rotation.set(0,a,0);dummy.updateMatrix();matrices.push(dummy.matrix.clone());
    }
  }
  const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:.95});recedeBeyondDistrict(material);
  const grove=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),material,matrices.length),color=new T.Color();
  matrices.forEach((matrix,i)=>{grove.setMatrixAt(i,matrix);grove.setColorAt(i,color.setHSL(.22+(i%5)*.01,.3+(i%3)*.04,.22+(i%7)*.02));});
  grove.name='backdrop-grove';grove.receiveShadow=true;scene.add(grove);
}
