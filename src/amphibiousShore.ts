import * as T from 'three';
import { arc, bake, box, leaf, membrane, publicLight, solar, stone, trim } from './cityRig.ts';
import { floatingDecks, northShore } from './layout.ts';

/** Tidal public rooms: open-water basins, descending terraces and landward habitat beds. */
export function amphibiousShore() {
  const root=new T.Group();root.name='amphibious-shore';
  const sourceGeometry=new Set<T.BufferGeometry>();
  for(const [x,z,yaw] of floatingDecks) {
    const node=new T.Group();node.position.set(x,0,z);node.rotation.y=yaw;root.add(node);
    // Keep the seaward side open for water exchange; the deep crescent carries a public walk and soil.
    const basin=new T.Group();basin.scale.set(.8,1,1.12);node.add(basin);
    for(let tier=0;tier<3;tier++) {
      const inner=9+tier*3.5,outer=inner+3.5;
      const terrace=arc(basin,inner,outer,.65,[0,-.55+tier*.65,0],stone,-Math.PI*.64,Math.PI*1.28);
      sourceGeometry.add(terrace.geometry);
    }
    for(const [inner,outer,y,height,material] of [
      [19.5,21,1.4,.7,trim],[15.5,19.5,1.4,.55,leaf],
      [20.7,21,2.1,1.1,membrane],[9,9.5,-.7,.2,solar],
    ] as const)for(const start of [-1.65,.24])sourceGeometry.add(arc(basin,inner,outer,height,[0,y,0],material,start,1.41).geometry);
    // Short grounded approach, with a shallow slope into the existing shore level.
    const approach=box(node,[3,.65,6],[16.5,.55,0],stone);
    approach.rotation.z=-.045;
    for(const side of [-3,3])box(node,[3,.8,.18],[16.5,1.2,side],membrane);
    // Sediment shelves sit below the public rim; vegetation is a continuous filtration edge.
    for(let i=0;i<11;i++) {
      const angle=-1.5+i*.3,r=17.5;
      const bed=arc(basin,0,1.5+(i%3)*.35,1.3+(i%2)*.7,[Math.cos(angle)*r,1.95,-Math.sin(angle)*r],leaf);
      sourceGeometry.add(bed.geometry);
      // Mineral feet express the load path beneath the over-water terraces.
      if(i%2===0)box(basin,[1.4,2.8,1.4],[Math.cos(angle)*19,-.3,-Math.sin(angle)*19],solar);
    }
  }
  const merged=bake(root);sourceGeometry.forEach(geometry=>geometry.dispose());
  root.clear();
  for(const mesh of merged)mesh.name='tidal-terrace';
  root.add(...merged);return root;
}

// Warm-lit waterfront rooms: occupied glass that reads at 16:00 as well as at night.
const lantern=new T.MeshStandardMaterial({color:'#e8d2ac',emissive:'#ffc684',emissiveIntensity:.45,roughness:.2,metalness:.1});
/** Continuous stepped edge seaward of the north revetment: descending terraces into a tidal marsh, a lit rim, pavilions and planted islets. */
export function tidalEdge() {
  const root=new T.Group();root.name='tidal-edge';
  const sourceGeometry=new Set<T.BufferGeometry>();
  const clear=(x:number,z:number,r:number)=>floatingDecks.every(([dx,dz])=>Math.hypot(x-dx,z-dz)>r);
  let chunk=0;
  for(let i=0;i<northShore.length-1;i++){
    const [ax,az]=northShore[i],[bx,bz]=northShore[i+1],length=Math.hypot(bx-ax,bz-az),n=Math.ceil(length/12),step=length/n;
    for(let k=0;k<n;k++,chunk++){
      const t=(k+.5)/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      // The tidal crescents already meet the shore at the floating decks.
      if(!clear(x,z,28))continue;
      // Local +Z runs along the shore, local -X faces the sea.
      const g=new T.Group();g.position.set(x,0,z);g.rotation.y=Math.atan2(bx-ax,bz-az);root.add(g);
      box(g,[.5,.5,step+.6],[-.25,.2,0],trim,.1);
      box(g,[4.5,1.1,step+.6],[-2.75,-.6,0],stone,.1);
      box(g,[4,1,step+.6],[-7,-.95,0],stone,.1);
      box(g,[.14,.14,step+.6],[-5.05,-.12,0],publicLight,.05);
      box(g,[3.2,.6,step+.6],[-10.6,-1.05,0],leaf,.1);
      if(chunk%4===1){
        // Pavilion straddling both terraces: warm room, planted roof slab.
        box(g,[6,3.2,8.4],[-5,1.3,0],lantern,.1);
        box(g,[7.6,.35,10.4],[-5,3.08,0],trim,.1);
        box(g,[6.4,.3,9.2],[-5,3.4,0],leaf,.1);
      }
      if(chunk%7===3 && clear(x,z,48)){
        // Planted islet riding off the marsh edge.
        box(g,[9,1.2,16],[-24,-.6,0],stone,.2);
        box(g,[7.6,.5,14.6],[-24,.2,0],leaf,.2);
        for(let j=0;j<4;j++)sourceGeometry.add(arc(g,0,1.4+(j%2)*.5,2+(j%3)*.9,[-24+(j%2?1.6:-1.6),.45,-5+j*3.3],leaf).geometry);
      }
    }
  }
  const merged=bake(root);sourceGeometry.forEach(geometry=>geometry.dispose());root.clear();
  for(const mesh of merged)mesh.name='tidal-edge';
  root.add(...merged);return root;
}
