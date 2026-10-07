import * as T from 'three';
import { arc, bake, box, chrome, glass, mirrors, leaf, leafyCrown, membrane, publicLight, solar, stone, trim } from './cityRig.ts';

/** Fuji's office blocks become a load-bearing civic chassis, keeping the sphere berth and site alignment. Metres. */
export function civicCore() {
  const root=new T.Group();root.name='fuji-civic-chassis';
  const member=(a:number[],b:number[],width:number,depth=width,material:T.Material=trim)=>{
    const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from);
    const mesh=box(root,[width,delta.length(),depth],from.clone().add(to).multiplyScalar(.5).toArray(),material,.05);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return mesh;
  };
  const crown=leafyCrown();
  const grove=(x:number,y:number,z:number,i:number)=>{
    box(root,[.55,3,.55],[x,y+1.5,z],solar);
    for(let j=0;j<5;j++){
      const tree=new T.Mesh(crown,leaf),a=j*2.4+i;
      tree.position.set(x+Math.cos(a)*1.4,y+3.8+(j%3)*.65,z+Math.sin(a)*1.4);
      tree.scale.set(1.7,1.5+(Math.abs(i+j)%3)*.2,1.65);root.add(tree);
      if(j<3)member([x,y+2,z],[tree.position.x,y+4,tree.position.z],.2,.2,solar);
    }
  };
  // Four bifurcating foundations carry two deep transfer frames, rather than occupied office towers.
  for(const z of [-12,70]) {
    for(const x of [-68,64]) {
      box(root,[18,3,18],[x,1.5,z],stone);
      member([x,3,z],[x,30,z],9,12);
      for(const dx of [-7,7])member([x,25,z],[x+dx,134,z],5,8);
      member([x-7,134,z],[x+7,134,z],6,9);
      // The split pier carries visible vertical transfer infrastructure and ceramic joints.
      for(const dx of [-2,2])member([x+dx,5,z-5],[x+dx,130,z-5],.5,.7,solar);
      box(root,[3.2,122,.35],[x,68,z-5.2],membrane);
      for(let y=12;y<126;y+=12) {
        box(root,[3.6,.35,1],[x,y,z-5.4],trim);
        box(root,[.22,7,.35],[x-1.35,y+4,z-5.5],publicLight);
      }
      for(const y of [16,49,87,116]) {
        box(root,[3.8,5.6,2.8],[x,y,z-5.6],glass);
        for(const dy of [-2.9,2.9])box(root,[4.1,.45,3],[x,y+dy,z-5.6],trim);
        box(root,[2.6,2,.15],[x,y-.7,z-7.08],publicLight);
      }
      for(const y of [24,62,100,130]) {
        box(root,[17,5,13],[x,y,z],trim);
        box(root,[2.6,3.4,.5],[x,y+5,z-5.5],publicLight);
      }
    }
    for(const y of [62,130]) {
      member([-75,y,z],[71,y,z],6,8);
      member([-75,y+9,z],[71,y+9,z],3,5);
      for(let x=-75;x<71;x+=24)member([x,y,z],[Math.min(x+24,71),y+9,z],1.3,2,solar);
    }
  }
  for(const x of [-68,64]) {
    member([x,130,-12],[x,130,70],7,7);
    member([x,62,-12],[x,130,70],3,4);
  }
  // The former podium is an open forum; the existing Aqua link lands here at Y=24.
  box(root,[100,3,36],[-8,22.5,-14],stone);
  for(const x of [-50,34])for(const z of [-27,0])member([x,2,z],[x,21,z],3,4);
  // Inhabited diagonals are wide public terrain, with a deep triangulated underside, not escalator banks.
  const spine=[[52,3,-12],[-54,62,-12],[52,121,-12]];
  for(let i=1;i<spine.length;i++) {
    const a=new T.Vector3(...spine[i-1]),b=new T.Vector3(...spine[i]),length=a.distanceTo(b);
    const street=new T.Group();street.position.copy(a).add(b).multiplyScalar(.5);street.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),b.clone().sub(a).normalize());root.add(street);
    box(street,[10,2.8,length],[0,0,0],stone);
    // A glazed mobility channel shares the inclined terrain with the planted pedestrian edge.
    box(street,[2.8,.16,length-4],[-1,1.5,0],glass);
    for(let z=-length/2+6;z<length/2-4;z+=8)box(street,[3,.12,.18],[-1,1.62,z],trim);
    for(const x of [-5,5]) {
      box(street,[.25,1.5,length],[x,2,0],membrane);
      box(street,[.22,.2,length],[x,2.85,0],trim);
      box(street,[.18,.18,length],[x,.9,0],publicLight);
    }
    // Continuous soil edge turns the structural incline into a climate street.
    for(let u=.12;u<.95;u+=.16) {
      const p=a.clone().lerp(b,u);
      box(root,[5,1.2,2.1],[p.x,p.y+1.5,p.z+3.7],leaf);
      grove(p.x,p.y+2.1,p.z+3.7,Math.round(u*20));
      member([p.x,p.y+1,p.z-5],[p.x,p.y+3,p.z-5],.18,.18,trim);
    }
    member([a.x,a.y-7,a.z],[b.x,b.y-7,b.z],1.5,2,solar);
    for(let u=0;u<1;u+=.2) {
      const p=a.clone().lerp(b,u),q=a.clone().lerp(b,Math.min(1,u+.2));
      member([p.x,p.y-7,p.z],[q.x,q.y-1,q.z],1.2,1.5,solar);
    }
  }
  const transferA=new T.Vector3(14,100,-12),transferB=new T.Vector3(-18,100,-1);
  const transfer=box(root,[7,2.5,transferA.distanceTo(transferB)],transferA.clone().add(transferB).multiplyScalar(.5).toArray(),stone);
  transfer.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),transferB.sub(transferA).normalize());
  // A clear environmental envelope exposes the chamber floors while retaining a silver sky reflection.
  const silverGlass=chrome.clone();silverGlass.color.set('#bfd6e2');silverGlass.transparent=true;silverGlass.opacity=.32;silverGlass.metalness=.55;silverGlass.depthWrite=false;mirrors.push(silverGlass);
  // The titanium observation object becomes a suspended, inhabitable environmental chamber.
  const chamber=new T.Group();chamber.position.set(-18,100,23);root.add(chamber);
  const skin=new T.Mesh(new T.SphereGeometry(24,48,24,0,Math.PI*2,0,Math.PI*.7),silverGlass);chamber.add(skin);
  const bowl=new T.Mesh(new T.SphereGeometry(24,48,12,0,Math.PI*2,Math.PI*.7,Math.PI*.3),trim);chamber.add(bowl);
  for(const y of [-12,0,12]) {
    const r=Math.sqrt(24*24-y*y);
    arc(chamber,7,r,1.6,[0,y,0],stone);
    arc(chamber,r-.6,r+.5,.7,[0,y+1.6,0],trim);
    arc(chamber,r-.35,r+.15,.16,[0,y+2.15,0],publicLight);
    for(let i=0;i<9;i++) {
      const a=i*Math.PI*2/9;
      grove(-18+Math.cos(a)*(r-5.5),100+y+1.6,23-Math.sin(a)*(r-5.5),i);
      member([-18+Math.cos(a)*(r-1),102+y,23-Math.sin(a)*(r-1)],[-18+Math.cos(a)*(r-1),105+y,23-Math.sin(a)*(r-1)],.18,.18,trim);
    }
    // Continuous deep soil / water-retention beds, supported by the chamber floors.
    arc(chamber,r-4,r-1.3,1.1,[0,y+1.6,0],leaf,.3,Math.PI*1.2);
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6,x=Math.cos(a)*(r-5),z=-Math.sin(a)*(r-5);
      const seat=box(chamber,[3,.65,1],[x,y+2.2,z],trim);seat.rotation.y=a+Math.PI/2;
    }
    // Smaller civic rooms sit inside the public garden ring, leaving the outer promenade continuous.
    for(const x of [-9,9]) {
      box(chamber,[5,4.5,6],[x,y+3.85,0],glass);
      box(chamber,[5.5,.4,6.5],[x,y+6.3,0],trim);
      box(chamber,[4,.8,.16],[x,y+4,-3.1],publicLight);
      for(const z of [-3,3])box(chamber,[5,.22,.25],[x,y+1.8,z],publicLight);
    }
  }
  for(let i=0;i<12;i++) {
    const rib=new T.Mesh(new T.TorusGeometry(24,.18,5,64),trim);
    rib.rotation.y=i*Math.PI/12;chamber.add(rib);
  }
  const ring=new T.Mesh(new T.TorusGeometry(29,2.4,8,80),trim);
  ring.position.set(-18,94,23);ring.rotation.y=.58;root.add(ring);
  const ringInset=new T.Mesh(new T.TorusGeometry(29,.45,5,80),solar);
  ringInset.position.copy(ring.position);ringInset.position.z-=2.2;ringInset.rotation.copy(ring.rotation);root.add(ringInset);
  // Suspension follows a visible load path from the top transfer beam to the chamber's lower cradle.
  for(const x of [-40,4]) {
    member([x,130,-12],[x,130,70],3,4);
    for(const z of [6,40])member([x,130,z],[x,85,z],.65,.65,solar);
  }
  for(const z of [6,40])member([-40,85,z],[4,85,z],2,3,solar);
  member([-42.26,94,38.89],[-40,85,40],1.5,2,solar);
  member([6.26,94,7.11],[4,85,6],1.5,2,solar);
  member([-68,62,70],[-34,82,23],3,4);member([64,62,70],[-2,82,23],3,4);
  // A hung lateral civic volume shares the frame but keeps a different, open crescent silhouette.
  const west=new T.Group();west.position.set(-49,88,52);root.add(west);
  arc(west,7,18,3,[0,0,0],stone,0,Math.PI*1.5);
  arc(west,16.5,18,8,[0,3,0],glass,0,Math.PI*1.5);
  arc(west,7,18,2,[0,11,0],trim,0,Math.PI*1.5);
  member([-68,130,52],[-38,130,52],3,4);
  for(const x of [-61,-38])member([x,130,52],[x,101,52],.8,.8,solar);
  // Elevated public continuity through the chassis: one bay-facing ring floor and a rear transfer deck.
  arc(root,25,34,2,[-18,61,23],stone,Math.PI*.05,Math.PI*1.8);
  box(root,[132,2.5,12],[-2,61,64],stone);
  // The forum becomes a linked civic landscape, with a public loop around an open light court.
  // Leave the Aqua City approach open across its full 8 m bridge envelope.
  for(const [inner,outer,height,y,material] of [
    [19,45,2,22,stone],[44.6,45,1.5,24,membrane],
    [44.5,45,.18,25.5,trim],[44.4,44.7,.18,23.9,publicLight],
  ] as const)arc(root,inner,outer,height,[-8,y,-2],material,2.2,Math.PI*2-.5);
  for(const a of [.15,2.25,3.15,4.7]) {
    arc(root,35,41,1.2,[-8,24,-2],leaf,a,.7);
    for(let i=0;i<4;i++) {
      const angle=a+.1+i*.16;
      grove(-8+Math.cos(angle)*38,25.2,-2-Math.sin(angle)*38,i);
    }
    const x=-8+Math.cos(a+.35)*39,z=-2-Math.sin(a+.35)*39;
    member([x,3,z],[x,22,z],2,3);
  }
  for(const y of [63,134]) {
    box(root,[132,1.4,10],[-2,y,-12],stone);
    for(const z of [-16.8,-7.2]) {
      box(root,[132,1.5,.22],[-2,y+1.5,z],membrane);
      box(root,[132,.18,.22],[-2,y+2.3,z],trim);
      box(root,[128,.15,.15],[-2,y+.85,z],publicLight);
    }
    box(root,[120,.9,2.4],[-2,y+1.1,-8.7],leaf);
    for(let x=-54;x<55;x+=12)grove(x,y+1.6,-8.7,x);
    for(let x=-60;x<=60;x+=6) {
      member([x,y+.7,-16.8],[x,y+2.3,-16.8],.16,.18,solar);
      if(x%12===0)box(root,[4,.7,1.1],[x,y+1.15,-11],trim);
    }
  }
  // Roof fins span between the two transfer members: shade and energy collection over the climate walk.
  for(let x=-54;x<=54;x+=18) {
    member([x,136,-16],[x,140,-7],.3,.4,trim);
    const fin=box(root,[10,.25,7],[x,139,-11.5],glass);
    fin.rotation.x=.25;
  }
  arc(root,33.6,34,1.5,[-18,63,23],membrane,Math.PI*.05,Math.PI*1.8);
  arc(root,33.6,34,.18,[-18,64.5,23],trim,Math.PI*.05,Math.PI*1.8);
  arc(root,33.4,33.8,.2,[-18,63.1,23],publicLight,Math.PI*.05,Math.PI*1.8);
  // Transfer beams carry inhabited ecological terraces; the centre stays open around the chamber.
  for(const y of [62.5,133]){
    box(root,[132,2,19],[-2,y,64],stone);
    for(const z of [56,72]){
      box(root,[116,1.1,3],[-2,y+1.5,z],leaf);
      box(root,[128,1.3,.25],[-2,y+1.7,z+(z===56?-1.7:1.7)],membrane);
      for(let x=-54;x<55;x+=12)grove(x,y+2.1,z,x);
    }
  }
  // A climate gallery hangs from the roof transfer, its lower deck returning to the rear cores.
  box(root,[88,2,16],[-2,112,64],stone);
  box(root,[86,10,13],[-2,118,64],glass);
  box(root,[90,1.2,18],[-2,124,64],trim);
  for(let x=-44;x<=40;x+=12){
    member([x,112,56],[x,132,56],.55,.65,solar);
    member([x,112,72],[x,132,72],.55,.65,solar);
  }
  for(const x of [-68,64])member([x,62,64],[x<0?-44:40,112,64],2.5,3);
  // Soil ribbons follow the occupied ring without closing its bay-facing public edge.
  for(const a of [.35,1.7,3.1,4.5]){
    arc(root,30,33,1.1,[-18,63,23],leaf,a,.65);
    for(let i=0;i<3;i++){
      const angle=a+.12+i*.2;
      grove(-18+Math.cos(angle)*31.5,64.1,23-Math.sin(angle)*31.5,i);
    }
  }
  const generated=new Set<T.BufferGeometry>();
  root.traverse(object=>{if(object instanceof T.Mesh && object.geometry.type!=='RoundedBoxGeometry')generated.add(object.geometry);});
  const batches=bake(root);root.clear();batches.forEach(mesh=>{mesh.name='fuji-civic-chassis';root.add(mesh);});
  generated.forEach(geometry=>geometry.dispose()); // Cached box geometry remains shared with the rest of the city.
  return root;
}
