import * as T from 'three';
import { arc, bake, box, leaf, membrane, solar, stone, trim } from './cityRig.ts';
import { floatingDecks } from './layout.ts';

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
