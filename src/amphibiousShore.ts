import * as T from 'three';
import { arc, bake, box, leaf, stone, trail, trim } from './cityRig.ts';
import { northShore } from './layout.ts';

// Warm-lit waterfront rooms: occupied glass that reads at 16:00 as well as at night.
const lantern=new T.MeshStandardMaterial({color:'#e8d2ac',emissive:'#ffc684',emissiveIntensity:.45,roughness:.2,metalness:.1});
/** Continuous stepped edge seaward of the north revetment: descending terraces into a tidal marsh, a lit rim, pavilions and planted islets. */
export function tidalEdge() {
  const root=new T.Group();root.name='tidal-edge';
  const sourceGeometry=new Set<T.BufferGeometry>();
  let chunk=0;
  for(let i=0;i<northShore.length-1;i++){
    const [ax,az]=northShore[i],[bx,bz]=northShore[i+1],length=Math.hypot(bx-ax,bz-az),n=Math.ceil(length/12),step=length/n;
    for(let k=0;k<n;k++,chunk++){
      const t=(k+.5)/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      // Local +Z runs along the shore, local -X faces the sea.
      const g=new T.Group();g.position.set(x,0,z);g.rotation.y=Math.atan2(bx-ax,bz-az);root.add(g);
      box(g,[.5,.5,step+.6],[-.25,.2,0],trim,.1);
      box(g,[4.5,1.1,step+.6],[-2.75,-.6,0],stone,.1);
      box(g,[4,1,step+.6],[-7,-.95,0],stone,.1);
      // Lit blue rim: the waterfront edge joins the 2127 light-trail network.
      box(g,[.4,.3,step+.6],[-5.05,-.04,0],trail,.05);
      // r8: stepped tidal wetland — the marsh shelf, a white weir, then a lower reed shelf just above the tide, framed by a second weir.
      box(g,[3.2,.6,step+.6],[-10.6,-.9,0],leaf,.1);
      box(g,[.35,.45,step+.6],[-12.35,-.725,0],trim,.05);
      box(g,[3.6,.5,step+.6],[-14.35,-.99,0],leaf,.1);
      box(g,[.3,.35,step+.6],[-16.3,-.825,0],trim,.05);
      if(chunk%4===1){
        // Pavilion straddling both terraces: warm room, planted roof slab.
        box(g,[6,3.2,8.4],[-5,1.3,0],lantern,.1);
        box(g,[7.6,.35,10.4],[-5,3.08,0],trim,.1);
        box(g,[6.4,.3,9.2],[-5,3.4,0],leaf,.1);
      }
      if(chunk%7===3){
        // Planted islet riding off the marsh edge.
        box(g,[9,1.2,16],[-24,-.6,0],stone,.2);
        box(g,[7.6,.5,14.6],[-24,.2,0],leaf,.2);
        for(let j=0;j<4;j++)sourceGeometry.add(arc(g,0,1.4+(j%2)*.5,2+(j%3)*.9,[-24+(j%2?1.6:-1.6),.45,-5+j*3.3],leaf).geometry);
      }
    }
  }
  const merged=bake(root);sourceGeometry.forEach(geometry=>geometry.dispose());root.clear();
  for(const mesh of merged){mesh.name='tidal-edge';if(mesh.material===trail)mesh.castShadow=false;}
  root.add(...merged);return root;
}
