import * as T from 'three';
import { arc, bake, box, chrome, glass, mirrors, leaf, leafyCrown, membrane, publicLight as cityLight, solar, stone, trim } from './cityRig.ts';

/** Occupied media headquarters within Fuji's civic chassis, retaining the sphere berth and site alignment. Metres. */
export function civicCore() {
  const root=new T.Group();root.name='fuji-civic-chassis';
  // Warm occupied rooms follow the existing city clock, using one shared finish for this building.
  const publicLight=cityLight.clone();publicLight.color.set('#f2dcbc');publicLight.emissive.set('#ffc783');publicLight.emissiveIntensity=1;
  publicLight.onBeforeCompile=shader=>{
    shader.uniforms.roomLight={get value(){return .8+cityLight.emissiveIntensity*.5;}};
    // Each ~5×6 m room cell gets its own light level, and upward-facing floors glow less than ceilings and screens,
    // so stacked workrooms read as separate occupied rooms with depth instead of one flat lit slab.
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRoomPos;\nvarying float vRoomUp;')
      .replace('#include <project_vertex>','#include <project_vertex>\nvRoomPos=(modelMatrix*vec4(transformed,1.)).xyz;\nvRoomUp=normalize(mat3(modelMatrix)*objectNormal).y;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float roomLight;\nvarying vec3 vRoomPos;\nvarying float vRoomUp;')
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        float roomCell=fract(sin(dot(floor(vRoomPos.xz/vec2(5.,6.))+floor(vRoomPos.y/9.)*vec2(7.,3.),vec2(12.9898,78.233)))*43758.5453);
        totalEmissiveRadiance *= roomLight*(.65+.7*roomCell)*mix(1.,.42,smoothstep(.5,.9,vRoomUp));`);
  };
  publicLight.customProgramCacheKey=()=>'fuji-room-light';
  // Broadcast light stays inside production rooms; public circulation retains its warm finish.
  const broadcastLight=publicLight.clone();broadcastLight.color.set('#4a6fb8');broadcastLight.emissive.set('#3f7cff');
  broadcastLight.onBeforeCompile=publicLight.onBeforeCompile;broadcastLight.customProgramCacheKey=publicLight.customProgramCacheKey;
  const head=new T.SphereGeometry(.22,8,6);
  const member=(a:number[],b:number[],width:number,depth=width,material:T.Material=trim)=>{
    const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from);
    const mesh=box(root,[width,delta.length(),depth],from.clone().add(to).multiplyScalar(.5).toArray(),material,.05);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return mesh;
  };
  const standing=(x:number,y:number,z:number)=>{
    for(const side of [-1,1])box(root,[.17,.8,.2],[x+side*.13,y+.4,z],solar);
    box(root,[.52,.75,.32],[x,y+1.17,z],solar);
    const person=new T.Mesh(head,trim);person.position.set(x,y+1.78,z);root.add(person);
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
  // Four bifurcating foundations carry the occupied wings and the two deep transfer frames.
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
  const silverGlass=chrome.clone();silverGlass.color.set('#d2dfe3');silverGlass.transparent=true;silverGlass.opacity=.12;silverGlass.metalness=.15;silverGlass.depthWrite=false;mirrors.push(silverGlass);
  // Two production wings sit behind the independent public diagonal, leaving the sphere and central void open.
  // Sealed studio boxes occupy the rear; glazed workrooms and collaboration galleries face the bay.
  for(const [x,width] of [[-56,22],[40,38]]) {
    for(const y of [3,24,43,64,83,102,121]) {
      box(root,[width,1.7,65],[x,y,30],stone);
      box(root,[width,.35,65],[x,y+1.05,30],y===121 ? trim : publicLight);
      if(y===121) {
        box(root,[width-3,1,5],[x,y+1.7,56],leaf);
        for(let dx=-width/2+5;dx<width/2-2;dx+=8)grove(x+dx,y+2.2,56,dx);
        continue;
      }
      const h=y===43 ? 19.3 : 17.3;
      box(root,[width-2,h,23],[x,y+1.2+h/2,46],stone);
      // Deep ceramic reveals articulate the sealed acoustic rooms without glazing their sound enclosure.
      for(const side of [-1,1]) {
        box(root,[.22,.65,20],[x+side*(width/2-.85),y+9.2,46],solar);
        for(const z of [38,44,50,56])box(root,[.32,h-1,.3],[x+side*(width/2-.8),y+1.2+h/2,z],trim);
      }
      // Acoustic walls have recessed vertical service seams; the public edge remains transparent.
      for(let dx=-width/2+3;dx<width/2;dx+=4)
        box(root,[.16,h-1,.25],[x+dx,y+1.2+h/2,34.35],solar);
      box(root,[width-1,h,.18],[x,y+1.2+h/2,-2.6],silverGlass);
      // Ceramic floor edges break up the tall glass bays; shallow terraces remain inside the wing footprint.
      box(root,[width,1.05,3.2],[x,y+9.2,-1.2],trim);
      box(root,[width-1,.25,.25],[x,y+8.55,-2.9],publicLight);
      box(root,[width-2,1.3,.16],[x,y+10.1,-2.7],silverGlass);
      for(const side of [-1,1]) {
        box(root,[.18,h,36],[x+side*(width/2-.5),y+1.2+h/2,15],silverGlass);
        for(let z=0;z<33;z+=10)box(root,[.22,h,.3],[x+side*(width/2-.4),y+1.2+h/2,z],trim);
      }
      for(let dx=-width/2+1;dx<width/2;dx+=4) {
        if((dx+width/2-1)%8===0)box(root,[.22,h,.3],[x+dx,y+1.2+h/2,-2.8],trim);
        // Warm ceiling panels and inset workstation screens make the occupied depth legible.
        box(root,[2.8,.12,8],[x+dx+1.4,y+h+.85,8],publicLight);
      }
      // Each double-height production level has an editing mezzanine behind the glazing.
      box(root,[width-2,.6,17],[x,y+9.2,9],stone);
      box(root,[width-3,.12,15],[x,y+8.84,9],publicLight);
      box(root,[width-3,.08,16],[x,y+9.54,9],publicLight);
      box(root,[width-3,1.2,.18],[x,y+10.1,.6],silverGlass);
      // Lit acoustic baffles sit behind the desks, so furnishings silhouette against occupied depth.
      for(const floor of [y+1.2,y+9.5])for(let dx=-width/2+3,bay=0;dx<width/2-2;dx+=5,bay++) {
        const video=(bay+y)%3===0;
        box(root,[3.7,6,.16],[x+dx,floor+3.4,17.05],solar);
        box(root,video ? [3.3,2.2,.18] : [3.4,4.2,.18],[x+dx,floor+(video ? 3.6 : 3.2),16.9],video ? broadcastLight : publicLight);
        box(root,[.18,6.5,.45],[x+dx+2.1,floor+3.5,16.65],trim);
      }
      // Standing staff gather at the glazed edge of each work and editing floor, clear of the desk rows.
      for(const [floor,z] of [[y+1.225,.6],[y+9.5,2.1]])for(let dx=-width/2+4.8,i=0;dx<width/2-5;dx+=3.1,i++)
        if((i+y)%3!==1)standing(x+dx+(i%2)*.6,floor,z+(i%3)*.5);
      for(const floor of [y+1.2,y+9.5])for(let dx=-width/2+3;dx<width/2-2;dx+=5) {
        for(const z of (floor===y+9.5 ? [4,12] : [4,12,23])) {
          box(root,[3.6,.22,1.6],[x+dx,floor+1.05,z],trim);
          box(root,[.22,1,1.2],[x+dx,floor+.5,z],solar);
          box(root,[1.2,.8,.12],[x+dx,floor+1.55,z+.25],broadcastLight);
          box(root,[.85,.1,.7],[x+dx,floor+.65,z-1.25],solar);
          box(root,[.85,.85,.14],[x+dx,floor+1.1,z-1.55],solar);
          // Seated editing staff are architectural occupancy, outside the district's moving actor routes.
          if(z===4 || (dx+y)%3===0) {
            box(root,[.5,.64,.3],[x+dx,floor+1.02,z-1.2],solar);
            const person=new T.Mesh(head,trim);person.position.set(x+dx,floor+1.57,z-1.2);root.add(person);
            for(const side of [-1,1]) {
              box(root,[.14,.52,.16],[x+dx+side*.16,floor+.28,z-.88],solar);
              member([x+dx+side*.3,floor+1.25,z-1.18],[x+dx+side*.3,floor+1.08,z-.55],.12,.12,trim);
            }
          }
        }
      }
      // The planted outer corners shade the workrooms without covering the front glazing.
      for(const side of [-1,1]) {
        const px=x+side*(width/2-2.4);
        box(root,[3.6,.8,3.8],[px,y+1.65,-.4],leaf);
        grove(px,y+2.05,-.4,y+side);
      }
      // Above the forum, each work floor cantilevers a shallow planted ledge with a lit soffit: continuous green floor edges.
      if(y>24) {
        box(root,[width-1,.8,2.6],[x,y+.9,-3.8],stone);
        box(root,[width-1,.95,.22],[x,y+1.75,-5],trim);
        box(root,[width-2,.08,2.1],[x,y+.47,-3.8],publicLight);
        box(root,[width-2,.6,1.5],[x,y+1.6,-3.9],leaf);
        for(let dx=-width/2+2;dx<width/2-1;dx+=2.6) {
          const shrub=new T.Mesh(crown,leaf),s=.55+Math.abs(Math.sin(dx*3.1+y))*.35;
          shrub.position.set(x+dx,y+2+s*.4,-3.9);shrub.scale.set(s*1.2,s,s*.9);root.add(shrub);
        }
      }
      if(y===43 || y===83) {
        // Broadcast set at the glazed front of the acoustically enclosed production floor.
        box(root,[width-5,8,.6],[x,y+5.5,29],solar);
        box(root,[width-8,5.5,.2],[x,y+5.8,28.6],broadcastLight);
        box(root,[width-10,.3,.2],[x,y+8.6,28.4],publicLight);
        box(root,[width-7,.65,7],[x,y+1.6,25],trim);
        for(let dx=-width/2+4;dx<width/2-2;dx+=4) {
          box(root,[1,.7,1.4],[x+dx,y+15.8,22],solar);
          box(root,[.7,.15,.9],[x+dx,y+15.35,22],broadcastLight);
        }
      }
    }
    // Dedicated staff entrance and internal lift/stair core, separate from the forum's public approach.
    box(root,[7,118,8],[x,62,57],trim);
    box(root,[4,5,.25],[x,5.6,62],glass);
    box(root,[8,.7,4],[x,8.4,63],stone);
    for(const dx of [-2,2])box(root,[.35,3,.7],[x+dx,4.5,60],solar);
  }
  // The suspended sphere is a broadcast theatre: a clear upper auditorium over a solid acoustic bowl.
  const chamber=new T.Group();chamber.position.set(-18,100,23);root.add(chamber);
  const skin=new T.Mesh(new T.SphereGeometry(24,48,24,0,Math.PI*2,0,Math.PI*.7),silverGlass);chamber.add(skin);
  const bowl=new T.Mesh(new T.SphereGeometry(24,48,12,0,Math.PI*2,Math.PI*.7,Math.PI*.3),trim);chamber.add(bowl);
  arc(chamber,0,20.6,1.6,[0,-12,0],stone);
  arc(chamber,19.8,21.2,.7,[0,-10.4,0],trim);
  arc(chamber,20.7,21.1,.18,[0,-9.7,0],publicLight);
  box(chamber,[22,1,9],[0,-9,7],solar);
  box(chamber,[22,12,.7],[0,-2.5,12],solar);
  box(chamber,[20,10,.18],[0,-2.5,11.55],broadcastLight);
  for(const x of [-8,-4,0,4,8]) {
    box(chamber,[.15,10,.25],[x,-2.5,11.3],solar);
    box(chamber,[1,.7,1.3],[x,9,5],solar);
    box(chamber,[.75,.15,1],[x,8.55,5],broadcastLight);
  }
  // Stage light towers, a lit stage lip and warm truss fixtures give the theatre its broadcast glow.
  box(chamber,[22,.2,.3],[0,-8.45,2.6],broadcastLight);
  for(const x of [-12,12]) {
    box(chamber,[1.2,15,1.2],[x,-1.5,10],solar);
    box(chamber,[.5,13,.2],[x,-1.5,9.35],broadcastLight);
  }
  for(const z of [-4,10])for(let x=-12;x<=12;x+=3) {
    box(chamber,[.8,.9,.8],[x,9.3,z],solar);
    box(chamber,[.6,.12,.6],[x,8.8,z],z<0 ? publicLight : broadcastLight);
  }
  // An inner glazed balcony and lit equator outline the full theatre volume behind the skin.
  for(const start of [-.6,Math.PI-.6]) {
    arc(chamber,21.2,23.2,.5,[0,-4,0],stone,start,1.2);
    arc(chamber,21.2,21.5,1.1,[0,-3.5,0],silverGlass,start,1.2);
  }
  arc(chamber,22.9,23.3,.25,[0,1.5,0],publicLight);
  // A presenter desk and camera pedestals distinguish the live studio from a vacant glazed chamber.
  box(chamber,[8,1.1,2],[0,-7.95,6],trim);
  box(chamber,[7,.5,.15],[0,-7.9,4.9],broadcastLight);
  for(const x of [-5,5]) {
    box(chamber,[.55,1.3,.4],[x,-7.85,7],solar);
    const presenter=new T.Mesh(head,trim);presenter.position.set(x,-6.95,7);chamber.add(presenter);
  }
  for(const x of [-10,10]) {
    box(chamber,[.3,1.4,.3],[x,-7.7,4],solar);
    box(chamber,[.8,.55,1.1],[x,-6.85,4],solar);
    box(chamber,[1.2,.18,1.2],[x,-8.4,4],solar);
  }
  // Tiered seating faces the rear stage; side aisles connect to the public entrance at Y=100.
  arc(chamber,21.4,21.8,14,[0,-8,0],publicLight,Math.PI+.45,Math.PI-.9);
  for(let a=Math.PI+.5;a<Math.PI*2-.5;a+=.22)box(chamber,[.3,14,.5],[Math.cos(a)*21.3,-1,-Math.sin(a)*21.3],trim);
  for(let row=0;row<9;row++) {
    const z=1-row*2.2,y=-10.3+row*1.15,w=28-row*.6;
    box(chamber,[w,.7+row*1.15,2.1],[0,y-row*.575,z],solar);
    box(chamber,[w-.4,.12,.12],[0,y+.2,z+1.08],publicLight);
    for(let seat=0;seat<15;seat++) {
      if(seat===7)continue;
      const x=(seat-7)*1.55;
      box(chamber,[1.05,.25,1.1],[x,y+.8,z],solar);
      box(chamber,[1.05,1.1,.2],[x,y+1.25,z-.5],solar);
      if((seat+row)%4!==0) {
        box(chamber,[.52,.65,.32],[x,y+1.24,z],trim);
        const person=new T.Mesh(head,trim);person.position.set(x,y+1.8,z);chamber.add(person);
      }
    }
  }
  for(const x of [-15,15]) {
    box(chamber,[2,1,18],[x,-6.5,-1],stone);
    box(chamber,[.2,1.4,17],[x,-5.3,-1],silverGlass);
  }
  // Overhead technical grid and a narrow planted crown replace the former three garden floors.
  for(const z of [-4,5,10])box(chamber,[29,.45,.45],[0,10,z],solar);
  arc(chamber,10,15,.8,[0,16,0],stone);
  arc(chamber,11,14,.5,[0,16.8,0],leaf);
  for(let i=0;i<12;i++) {
    const rib=new T.Mesh(new T.TorusGeometry(24,.18,5,64),trim);
    rib.rotation.y=i*Math.PI/12;chamber.add(rib);
  }
  for(const y of [-8,8,16]) {
    const rib=new T.Mesh(new T.TorusGeometry(Math.sqrt(576-y*y),.16,5,64),trim);
    rib.position.y=y;rib.rotation.x=Math.PI/2;chamber.add(rib);
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
  // Elevated public continuity through the chassis: one bay-facing ring floor and a rear transfer deck.
  arc(root,25,34,2,[-18,61,23],stone,Math.PI*.05,Math.PI*1.8);
  box(root,[132,2.5,12],[-2,61,64],stone);
  // The forum becomes a linked civic landscape, with a public loop around an open light court.
  // Leave the Aqua City approach open across its full 8 m bridge envelope.
  for(const [inner,outer,height,y,material] of [
    [19,45,2,22,stone],[44.6,45,1.5,24,membrane],
    [44.5,45,.18,25.5,trim],[44.4,44.7,.18,23.9,publicLight],
  ] as const)arc(root,inner,outer,height,[-8,y,-2],material,2.2,Math.PI*2-.5);
  // Public foyer below the forum has its own curved glazing and entry, distinct from rear staff doors.
  arc(root,19,44,1,[-8,2,-2],stone,2.2,Math.PI*2-.5);
  arc(root,42.8,43,18,[-8,3,-2],silverGlass,2.2,Math.PI*2-.5);
  for(let a=2.25;a<7.95;a+=.16) {
    const x=-8+Math.cos(a)*43,z=-2-Math.sin(a)*43;
    member([x,3,z],[x,21,z],.35,.35,solar);
    const light=box(root,[3,.15,1.4],[-8+Math.cos(a)*39,20.8,-2-Math.sin(a)*39],publicLight);
    light.rotation.y=a+Math.PI/2;
  }
  for(let a=2.3,i=0;a<7.9;a+=.19,i++) {
    const x=-8+Math.cos(a)*37,z=-2-Math.sin(a)*37,outer=-8+Math.cos(a)*41;
    if(z>-3 && (outer>20 || outer<-44))continue; // Wing ground floors keep their own production rooms.
    box(root,[6,11,.3],[x,9.2,z],i%4===2 ? broadcastLight : publicLight).rotation.y=a+Math.PI/2;
    box(root,[.6,15,.8],[-8+Math.cos(a+.095)*37,10.5,-2-Math.sin(a+.095)*37],stone).rotation.y=a+Math.PI/2;
    if(i%2===0)standing(-8+Math.cos(a)*40.5,3,-2-Math.sin(a)*40.5);
  }
  for(const a of [.15,2.25,3.15,4.7]) {
    arc(root,35,41,1.2,[-8,24,-2],leaf,a,.7);
    for(let i=0;i<4;i++) {
      const angle=a+.1+i*.16;
      grove(-8+Math.cos(angle)*38,25.2,-2-Math.sin(angle)*38,i);
    }
    const x=-8+Math.cos(a+.35)*39,z=-2-Math.sin(a+.35)*39;
    member([x,3,z],[x,22,z],2,3);
  }
  // Small public groups occupy the supported forum ring, clear of the Aqua bridge arrival sector.
  for(const a of [.6,.85,1.1,1.35,2.4,2.65,2.9]) {
    const x=-8+Math.cos(a)*30,z=-2-Math.sin(a)*30;
    const bench=box(root,[3.4,.55,1.2],[x,24.3,z],trim);bench.rotation.y=a+Math.PI/2;
    for(const dx of [-1.5,1.5]) {
      box(root,[.5,.75,.32],[x+dx,25.05,z+2],solar);
      for(const side of [-1,1])box(root,[.16,.65,.2],[x+dx+side*.15,24.35,z+2],solar);
      const visitor=new T.Mesh(head,trim);visitor.position.set(x+dx,25.65,z+2);root.add(visitor);
      member([x+dx-.32,25.3,z+2],[x+dx-.34,24.85,z+2.15],.13,.13,trim);
      member([x+dx+.32,25.3,z+2],[x+dx+.36,25.05,z+1.8],.13,.13,trim);
    }
  }
  // Standing crowds gather on the public forum and the elevated ring, away from benches, planting and the Aqua arrival.
  for(let a=2.3,i=0;a<6.2;a+=.085,i++) {
    const r=21.5+(i*7%5)*1.1;
    standing(-8+Math.cos(a)*r,24,-2-Math.sin(a)*r);
  }
  for(let a=.45,i=0;a<2.7;a+=.11,i++) {
    const r=26.2+(i*3%4)*.5;
    standing(-18+Math.cos(a)*r,63,23-Math.sin(a)*r);
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
