import * as T from 'three';
import { changeSites } from './layout.ts';

/** Reuse the surveyed planting locations; layered crowns replace the tiny blockout cones. */
export function plantCanopy(scene: T.Object3D, trees: { instances: { position: number[]; scale: number; type: string }[] }) {
  const positions=trees.instances.filter(tree=>!Object.values(changeSites).some(site=>Math.abs(tree.position[0]-site.x)<site.w*site.scale/2+9 && Math.abs(-tree.position[1]-site.z)<site.d*site.scale/2+9));
  const foliage=new T.InstancedMesh(new T.IcosahedronGeometry(1,2),new T.MeshStandardMaterial({color:'#69844a',roughness:.92}),positions.length*4);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.35,.6,1,6),new T.MeshStandardMaterial({color:'#776957',roughness:1}),positions.length);
  const dummy=new T.Object3D(),color=new T.Color();
  positions.forEach((tree,i)=>{
    const [x,y,z]=tree.position,s=tree.scale,h=(tree.type==='columnar'?10:7)*s;
    dummy.position.set(x,z+h*.35,-y);dummy.scale.set(s,h*.7,s);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<4;j++){
      const a=j*2.4+i;
      dummy.position.set(x+Math.cos(a)*1.9*s,z+h+(j%2)*1.2,-y+Math.sin(a)*1.9*s);
      dummy.scale.set(3.4*s,(tree.type==='columnar'?4.4:2.9)*s,3*s);dummy.rotation.set(.1*i,a,.15*j);dummy.updateMatrix();foliage.setMatrixAt(i*4+j,dummy.matrix);
      color.setHSL(.21+(i%5)*.008,.28+(j%3)*.05,.23+(i%7)*.018);foliage.setColorAt(i*4+j,color);
    }
  });
  foliage.name='surveyed-coastal-canopy';trunks.name='surveyed-coastal-trunks';
  foliage.castShadow=trunks.castShadow=true;foliage.receiveShadow=trunks.receiveShadow=true;scene.add(foliage,trunks);
}

/** Plant only on authored flat planted roofs, inset from their edges. */
export function plantRoofCanopy(scene: T.Object3D, model: T.Object3D) {
  const bounds=new T.Box3().setFromObject(model),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
  const instances: {position:number[];scale:number;type:string}[]=[];
  const roofAt=(x:number,z:number)=>{
    ray.set(new T.Vector3(x,bounds.max.y+1,z),down);
    const hit=ray.intersectObject(model,true)[0];
    if(!hit || !(hit.object instanceof T.Mesh))return null;
    const material=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex??0]:hit.object.material;
    return material.name==='Roof and Shadow' && hit.face && hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y>.98 ? hit.point : null;
  };
  for(let x=bounds.min.x+6;x<bounds.max.x-6;x+=11)for(let z=bounds.min.z+6;z<bounds.max.z-6;z+=11){
    const p=roofAt(x,z);
    if(!p || p.y<12 || ![[4,0],[-4,0],[0,4],[0,-4]].every(([dx,dz])=>{const edge=roofAt(x+dx,z+dz);return edge && Math.abs(edge.y-p.y)<.3;}))continue;
    instances.push({position:[x,-z,p.y],scale:.55,type:'broadleaf'});
  }
  plantCanopy(scene,{instances});
}
