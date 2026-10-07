import * as T from 'three';
import { arc, bake, box, chrome, glass, mirrors, leaf, leafyCrown, membrane, publicLight as cityLight, solar as citySolar, stone as cityStone, trim as cityTrim } from './cityRig.ts';
import type { Ride, Spot, Walk } from './occupants.ts';

/** Occupied media headquarters within Fuji's civic chassis, retaining the sphere berth and site alignment. Metres. Its people are not
 * baked: `occupants` lists them (staff, audience, forum crowds, strollers and escalator riders) for `publishOccupants` to animate. */
export function civicCore() {
  const root=new T.Group();root.name='fuji-civic-chassis';
  const spots:Spot[]=[],walks:Walk[]=[],rides:Ride[]=[];
  // Building-local finishes (still one batch each): warm cream frame and slabs, and dark charcoal furniture, people and hangers,
  // so occupied rooms read as silhouettes against warm light instead of blue-grey rows.
  const trim=cityTrim.clone();trim.color.set('#f6eee0');
  const stone=cityStone.clone();stone.color.set('#f2e9d8');
  const solar=citySolar.clone();solar.color.set('#3b3430'); // warm umber: unlit room depth reads brown-dark under the amber light
  // Warm occupied rooms follow the existing city clock, using one shared finish for this building.
  const publicLight=cityLight.clone();publicLight.color.set('#f2dcb4');publicLight.emissive.set('#ffd29c');publicLight.emissiveIntensity=1;
  publicLight.onBeforeCompile=shader=>{
    shader.uniforms.roomLight={get value(){return 1.15+cityLight.emissiveIntensity*.55;}};
    // Each ~5×6 m room cell gets its own light level, and upward-facing floors glow less than ceilings and screens,
    // so stacked workrooms read as separate occupied rooms with depth instead of one flat lit slab.
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRoomPos;\nvarying float vRoomUp;')
      .replace('#include <project_vertex>','#include <project_vertex>\nvRoomPos=(modelMatrix*vec4(transformed,1.)).xyz;\nvRoomUp=normalize(mat3(modelMatrix)*objectNormal).y;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float roomLight;\nvarying vec3 vRoomPos;\nvarying float vRoomUp;')
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        float roomCell=fract(sin(dot(floor(vRoomPos.xz/vec2(5.,6.))+floor(vRoomPos.y/9.)*vec2(7.,3.),vec2(12.9898,78.233)))*43758.5453);
        float roomFloor=smoothstep(.5,.9,vRoomUp);
        // Floors read as dark oak under lit ceilings: rooms gain depth instead of a pale yellow slab seen from above.
        diffuseColor.rgb*=mix(vec3(1.),vec3(.46,.38,.3),roomFloor);
        // The theatre's inner shell (r≈23.2 about the chamber centre) is a dim stage-wash wall, so rig, stage and audience glow against it.
        float theatreR=length(vRoomPos-vec3(-18.,100.,23.));
        float theatreWall=smoothstep(23.,23.12,theatreR)*(1.-smoothstep(23.28,23.4,theatreR));
        // Wider per-room contrast and dim, desaturated floors: stacked rooms stop reading as clipped amber shelves.
        totalEmissiveRadiance *= roomLight*(.4+1.1*roomCell)*mix(vec3(1.),vec3(.2,.21,.24),roomFloor)*mix(1.,.45,theatreWall);
        // The inner theatre shell has a dark painted finish: daylight through the glass no longer turns the dome pale lilac.
        diffuseColor.rgb*=mix(1.,.18,theatreWall);
        // The theatre wall carries a violet stage wash, so the whole auditorium glows blue-violet around the warm rig.
        totalEmissiveRadiance=mix(totalEmissiveRadiance,vec3(.34,.3,.95)*dot(totalEmissiveRadiance,vec3(.4)),theatreWall);
        // The dome above the rig fades to a deep navy (not black), so the sphere reads as a lit glass theatre with its house lights.
        totalEmissiveRadiance*=mix(1.,.2,smoothstep(104.,117.,vRoomPos.y)*theatreWall);
        // Blue-lit seat backs and step lights in the audience rake (below the chamber centre, ahead of the stage) read as violet house seating.
        float theatreSeat=(1.-smoothstep(22.,22.6,theatreR))*step(vRoomPos.y,101.)*step(vRoomPos.z,25.5)*step(totalEmissiveRadiance.r,totalEmissiveRadiance.b);
        totalEmissiveRadiance=mix(totalEmissiveRadiance,vec3(.52,.36,1.)*totalEmissiveRadiance.b,theatreSeat);`);
  };
  publicLight.customProgramCacheKey=()=>'fuji-room-light';
  // Broadcast light stays inside production rooms; public circulation retains its warm finish.
  const broadcastLight=publicLight.clone();broadcastLight.color.set('#2c4a96');broadcastLight.emissive.set('#3f7cff');
  broadcastLight.onBeforeCompile=publicLight.onBeforeCompile;broadcastLight.customProgramCacheKey=publicLight.customProgramCacheKey;
  // A clear environmental envelope exposes the chamber floors while retaining a silver sky reflection.
  const silverGlass=chrome.clone();silverGlass.color.set('#d2dfe3');silverGlass.transparent=true;silverGlass.opacity=.2;silverGlass.metalness=.15;silverGlass.depthWrite=false;mirrors.push(silverGlass);
  // Fresnel opacity: glass seen face-on is nearly clear (lit rooms and the theatre show through); grazing panes stay silvered.
  silverGlass.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      diffuseColor.a*=mix(1.2,.12,abs(dot(normal,normalize(vViewPosition))));`);
  };
  silverGlass.customProgramCacheKey=()=>'fuji-silver-glass';
  const member=(a:number[],b:number[],width:number,depth=width,material:T.Material=trim)=>{
    const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from);
    const mesh=box(root,[width,delta.length(),depth],from.clone().add(to).multiplyScalar(.5).toArray(),material,.05);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return mesh;
  };
  // A standing person on the floor at `y`, facing `yaw` (default -Z, the bay) unless they join a conversation.
  const standing=(x:number,y:number,z:number,yaw=Math.PI,crowd:Spot['crowd']='staff')=>{spots.push({at:new T.Vector3(x,y,z),yaw,mode:'talk',crowd});};
  // Strollers pace a public lane end to end; one person per lane, so lanes 1.2 m apart never meet.
  const stroll=(points:T.Vector3[],crowd:Spot['crowd'])=>walks.push({curve:new T.CatmullRomCurve3(points,false,'centripetal'),crowd});
  const lane=(cx:number,cz:number,r:number,from:number,to:number,y:number)=>stroll(Array.from({length:Math.ceil((to-from)/.15)+1},(_,i)=>{
    const a=from+(to-from)*i/Math.ceil((to-from)/.15);return new T.Vector3(cx+Math.cos(a)*r,y,cz-Math.sin(a)*r);}),'public');
  const outward=(a:number)=>Math.atan2(Math.cos(a),-Math.sin(a)),inward=(a:number)=>Math.atan2(-Math.cos(a),Math.sin(a));
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
      for(const dx of [-2,2])member([x+dx,5,z-5],[x+dx,130,z-5],.5,.7,glass);
      box(root,[3.2,122,.35],[x,68,z-5.2],membrane);
      for(let y=12;y<126;y+=12) {
        box(root,[3.6,.35,1],[x,y,z-5.4],trim);
        box(root,[.22,7,.35],[x-1.35,y+4,z-5.5],broadcastLight);
      }
      for(const y of [16,49,87,116]) {
        box(root,[3.8,5.6,2.8],[x,y,z-5.6],glass);
        for(const dy of [-2.9,2.9])box(root,[4.1,.45,3],[x,y+dy,z-5.6],trim);
      }
      for(const y of [24,62,100,130]) {
        box(root,[17,5,13],[x,y,z],trim);
        box(root,[2.6,3.4,.5],[x,y+5,z-5.5],silverGlass);
      }
    }
    for(const y of [62,130]) {
      member([-75,y,z],[71,y,z],6,8);
      if(y===62 && z===-12)continue; // The bay face keeps one clean mid-height band; the rear frame stays trussed.
      member([-75,y+9,z],[71,y+9,z],3,5);
      for(let x=-75;x<71;x+=24)member([x,y,z],[Math.min(x+24,71),y+9,z],1.3,2,solar);
    }
  }
  for(const x of [-68,64]) {
    member([x,130,-12],[x,130,70],7,7);
  }
  // The former podium is an open forum; the existing Aqua link lands here at Y=24.
  box(root,[100,3,36],[-8,22.5,-14],stone);
  for(const x of [-50,34])for(const z of [-27,0])member([x,2,z],[x,21,z],3,4);
  // Inhabited diagonals are wide public terrain, with a deep triangulated underside, not escalator banks.
  const spine=[[52,3,-12],[-54,62,-12],[52,121,-12]];
  for(let i=1;i<spine.length;i++) {
    const a=new T.Vector3(...spine[i-1]),b=new T.Vector3(...spine[i]),length=a.distanceTo(b);
    const street=new T.Group();street.position.copy(a).add(b).multiplyScalar(.5);root.add(street);
    // Level across its width (no roll): local X runs along world Z, so the deck meets its planted edge flush.
    const dir=b.clone().sub(a).normalize();if(dir.x>0)dir.negate();
    const across=new T.Vector3(0,0,1);
    street.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(across,dir.clone().cross(across),dir));street.updateMatrix();
    box(street,[10,2.8,length],[0,0,0],stone);
    // A glazed mobility channel shares the inclined terrain with the planted pedestrian edge.
    box(street,[2.8,.16,length-4],[-1,1.5,0],trim); // pale steps with dark tread lines read as a silver escalator, not a slate band
    for(let z=-length/2+3;z<length/2-3;z+=1.6)box(street,[2.6,.1,.12],[-1,1.6,z],solar);
    // An open escalator with glass balustrades and blue-lit handrails: riders stay visible against the void.
    for(const x of [-2.6,.6]) {
      box(street,[.1,1.7,length-4],[x,2.45,0],silverGlass); // clear panes keep the riders and pale treads visible from the bay
      box(street,[.16,.16,length-4],[x,1.65,0],broadcastLight);
      box(street,[.2,.14,length-4],[x,3.35,0],broadcastLight);
    }
    for(let z=-length/2+3;z<length/2-2;z+=4)for(const x of [-2.6,.6])box(street,[.12,1.75,.12],[x,2.45,z],trim);
    // Riders stand on the treads and climb at .5 m/s (both diagonals run upward), out of sight where the incline passes through the
    // forum podium (slab 21–24 m), under the upper incline's truss at the turn (from 59 m) and through the sphere's transfer beam
    // (98.75–101.25 m), with standing headroom below each.
    const ends=[-1,1].map(e=>new T.Vector3(-1,1.6,e*(length/2-3)).applyMatrix4(street.matrix)).sort((p,q)=>p.y-q.y);
    rides.push({from:ends[0],to:ends[1],gap:4.5,speed:.5,through:i===1 ? [[19.1,24.1],[57.1,70]] : [[96.85,101.3]]});
    for(const x of [-5,5]) {
      // The bay-facing edge is a clear balustrade with a blue lit rail: the diagonal reads as a bright glazed escalator bank.
      const bay=x<0;
      box(street,[.25,1.5,length],[x,2,0],bay ? silverGlass : membrane);
      box(street,[.22,.2,length],[x,2.85,0],bay ? broadcastLight : trim);
      box(street,[.18,.18,length],[x,.9,0],publicLight);
    }
    // A slim navy-glass fascia with a lit lower edge outlines the incline, as in the target's dark escalator trim.
    box(street,[.12,1.2,length-1],[-5.1,-.7,0],glass);
    box(street,[.14,.16,length-1],[-5.12,-1.3,0],broadcastLight);
    // Continuous soil edge turns the structural incline into a climate street.
    for(let u=.12;u<.95;u+=.16) {
      const p=a.clone().lerp(b,u);
      box(root,[5,1.2,2.1],[p.x,p.y+1.5,p.z+3.7],leaf);
      grove(p.x,p.y+2.1,p.z+3.7,Math.round(u*20));
      member([p.x,p.y+1,p.z-5],[p.x,p.y+3,p.z-5],.18,.18,trim);
    }
    // Ivory underside truss: the load path stays legible without drawing dark lines across the glazed wings.
    member([a.x,a.y-7,a.z],[b.x,b.y-7,b.z],1.5,2);
    for(let u=0;u<1;u+=.2) {
      const p=a.clone().lerp(b,u),q=a.clone().lerp(b,Math.min(1,u+.2));
      member([p.x,p.y-7,p.z],[q.x,q.y-1,q.z],1,1.2);
    }
  }
  const transferA=new T.Vector3(14,100,-12),transferB=new T.Vector3(-18,100,-1);
  const transfer=box(root,[7,2.5,transferA.distanceTo(transferB)],transferA.clone().add(transferB).multiplyScalar(.5).toArray(),stone);
  transfer.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),transferB.sub(transferA).normalize());
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
      const h=y===43 ? 19.3 : 17.3,studio=y===43 || y===83 || y===102;
      // The acoustic block is set back 5 m from each flank, leaving a glazed studio gallery where live production shows from outside.
      box(root,[width-10,h,23],[x,y+1.2+h/2,46],stone);
      // Deep ceramic reveals articulate the sealed acoustic rooms without glazing their sound enclosure.
      for(const side of [-1,1]) {
        box(root,[.22,.65,20],[x+side*(width/2-.85),y+9.2,46],solar);
        for(const z of [38,44,50,56])box(root,[.32,h-1,.3],[x+side*(width/2-.8),y+1.2+h/2,z],trim);
      }
      // Acoustic walls have recessed vertical service seams; the public edge remains transparent.
      for(let dx=-width/2+7;dx<width/2-5;dx+=4)
        box(root,[.16,h-1,.25],[x+dx,y+1.2+h/2,34.35],solar);
      box(root,[width-1,h,.18],[x,y+1.2+h/2,-2.6],silverGlass);
      // Ceramic floor edges break up the tall glass bays; shallow terraces remain inside the wing footprint.
      box(root,[width,1.05,3.2],[x,y+9.2,-1.2],trim);
      box(root,[width-1,.25,.25],[x,y+8.55,-2.9],publicLight);
      box(root,[width-2,1.3,.16],[x,y+10.1,-2.7],silverGlass);
      for(const side of [-1,1]) {
        box(root,[.18,h,36],[x+side*(width/2-.5),y+1.2+h/2,15],silverGlass);
        for(let z=0;z<33;z+=10)box(root,[.22,h,.3],[x+side*(width/2-.4),y+1.2+h/2,z],trim);
        if(y===3)continue; // the ground floor flanks meet the public foyer
        // Proud ceramic band with a lit soffit and planter at the mezzanine line, so the flanks stack as terraced floors.
        box(root,[1.5,1.05,36],[x+side*(width/2+.25),y+9.2,15],trim);
        box(root,[.25,.2,35],[x+side*(width/2+.8),y+8.6,15],publicLight);
        box(root,[1,.5,34],[x+side*(width/2+.35),y+9.95,15],leaf);
        for(let z=-1;z<32;z+=2.8) {
          const shrub=new T.Mesh(crown,leaf),s=.5+Math.abs(Math.sin(z*2.3+y+side))*.35;
          shrub.position.set(x+side*(width/2+.35),y+10.3+s*.4,z);shrub.scale.set(s*.8,s,s*1.1);root.add(shrub);
        }
      }
      for(let dx=-width/2+1;dx<width/2;dx+=4) {
        // Cream mullions every 8 m, slim ones between: a finer glazed rhythm over the lit rooms.
        if((dx+width/2-1)%8===0)box(root,[.22,h,.3],[x+dx,y+1.2+h/2,-2.8],trim);
        else box(root,[.1,h,.16],[x+dx,y+1.2+h/2,-2.75],solar); // dark curtain-wall frames between the cream piers
        // Warm ceiling panels and inset workstation screens make the occupied depth legible.
        box(root,[2.8,.12,8],[x+dx+1.4,y+h+.85,8],publicLight);
      }
      // Each double-height production level has an editing mezzanine behind the glazing.
      box(root,[width-2,.6,17],[x,y+9.2,9],stone);
      // Dark studio ceilings with lit strips and a spot rig behind the glazing: rooms read as deep lit interiors, not open terraces.
      box(root,[width-3,.12,15],[x,y+8.84,9],solar);
      for(const z of [5,10,15])box(root,[width-4,.08,.5],[x,y+8.76,z],publicLight);
      // Upper rooms get a dark soffit above their hanging light panels.
      box(root,[width-1,.1,35],[x,y+h+1.2,15],solar);
      for(const [cy,cz] of [[y+8.5,1.6],[y+h+.6,1.6]]) {
        box(root,[width-3,.18,.18],[x,cy,cz],solar);
        for(let dx=-width/2+2;dx<width/2-1.5;dx+=1.8) {
          box(root,[.4,.45,.4],[x+dx,cy-.3,cz],solar);
          box(root,[.32,.14,.32],[x+dx,cy-.55,cz],publicLight);
        }
      }
      box(root,[width-3,.08,16],[x,y+9.54,9],publicLight);
      box(root,[width-3,1.2,.18],[x,y+10.1,.6],silverGlass);
      // A dark umber rear wall washed by a warm ceiling cove: rooms keep deep shadow between their lights, so desks,
      // staff and the hung screens read against it instead of a flat amber wall.
      for(const floor of [y+1.2,y+9.5]) {
        box(root,[width-3,6,.16],[x,floor+3.4,17.05],solar);
        box(root,[width-4,1,.18],[x,floor+4.9,16.9],publicLight);
        box(root,[width-4,.5,.2],[x,floor+5.65,16.85],solar);
        for(let dx=-width/2+3,bay=0;dx<width/2-2;dx+=5,bay++) {
          if((bay+y)%(studio ? 2 : 5)===0 && !(studio && floor===y+1.2)) {
            box(root,[3,1.9,.12],[x+dx,floor+3.5,16.72],solar);
            box(root,[2.7,1.6,.12],[x+dx,floor+3.5,16.64],broadcastLight);
          }
          box(root,[.18,6.5,.45],[x+dx+2.1,floor+3.5,16.65],trim);
        }
      }
      // Lit far-side partitions on the -X walls: the review view enters through the +X glazing and crosses the occupied room
      // (desks, staff, ceiling light) to warm, partly video-lit walls, rather than meeting lit panels right behind the glass.
      for(const [floor,zs] of [[y+1.2,[3.5,8.5,13.5,18.5,23.5,28.5]],[y+9.5,[3.5,8.5,13.5]]] as const)zs.forEach((z,i)=>{
        const liveSet=studio && floor===y+1.2,video=liveSet || (i+y)%5===0;
        box(root,[.16,liveSet ? 4.8 : video ? 2.4 : 4.6,3.6],[x-width/2+1.1,floor+(video ? 3.6 : 3.2),z],video ? broadcastLight : publicLight);
        if(liveSet)box(root,[.2,.3,3.6],[x-width/2+1.25,floor+6.2,z],publicLight);
      });
      // Rear-zone ceiling light and flank-facing staff fill the deep half of each room seen through the side glazing.
      for(let dx=-width/2+3;dx<width/2-2;dx+=5)box(root,[2.6,.12,12],[x+dx,y+h+.85,25],publicLight);
      for(let z=3,i=0;z<31;z+=3.4,i++)if(z<15.5 || z>18.5)standing(x+width/2-1.9-(i%2)*.4,y+1.225,z,Math.PI/2);
      // Flank studio galleries: a dark set wall with a large blue LED backdrop, warm control-room windows above,
      // a spot rig, cameras and crew on the floor, all behind clear glazing between the ceramic fins.
      for(const side of [-1,1]) {
        const wx=x+side*(width/2-4.95),edge=x+side*(width/2-.5);
        box(root,[.2,h-.4,22.6],[wx,y+1.2+h/2,46],solar);
        box(root,[.26,studio ? 6.4 : 3.2,16],[wx,studio ? y+6 : y+5.4,46],studio ? broadcastLight : publicLight); // blue LED sets on studio levels; a warm band elsewhere, not a flat amber wall
        for(const z of [40,46,52])box(root,[.3,6.4,.18],[wx,y+6,z],solar);
        box(root,[.28,.35,17],[wx,y+9.5,46],publicLight);
        box(root,[.26,2.6,17],[wx,y+12.6,46],publicLight);
        for(let z=38.5;z<54;z+=2.5)box(root,[.32,2.6,.2],[wx,y+12.6,z],solar);
        box(root,[.18,h,23],[edge,y+1.2+h/2,46],silverGlass);
        box(root,[3.2,.3,21],[x+side*(width/2-3.2),y+1.25+h-.6,46],solar);
        for(let z=36.5;z<56;z+=1.6)box(root,[.34,.16,.34],[x+side*(width/2-3.2),y+1.25+h-.85,z],publicLight);
        for(let z=37,i=0;z<56;z+=2.1,i++) {
          if(i%3!==1)standing(x+side*(width/2-3.4+(i%2)*.7),y+1.225,z,-side*Math.PI/2); // crew face the set
          if(i%4===2) {
            box(root,[.25,1.3,.25],[x+side*(width/2-1.6),y+1.875,z],solar);
            box(root,[.9,.5,.6],[x+side*(width/2-1.8),y+2.7,z],solar);
          }
        }
      }
      // Standing staff gather at the glazed edge of each work and editing floor, clear of the desk rows.
      for(const [floor,z] of [[y+1.225,.6],[y+9.5,2.1]])for(let dx=-width/2+4.8,i=0;dx<width/2-5;dx+=3.1,i++)
        if((i+y)%3!==1)standing(x+dx+(i%2)*.6,floor,z+(i%3)*.5);
      for(const floor of [y+1.2,y+9.5])for(let dx=-width/2+3;dx<width/2-2;dx+=5) {
        for(const z of (floor===y+9.5 ? [4,12] : studio ? [4,23] : [4,12,23])) {
          box(root,[3.6,.22,1.6],[x+dx,floor+1.05,z],solar);
          box(root,[.22,1,1.2],[x+dx,floor+.5,z],solar);
          box(root,[.95,.6,.12],[x+dx,floor+1.48,z+.25],(dx+z)&1 ? publicLight : broadcastLight); // mixed warm/blue monitors, not a blue speckle
          box(root,[.85,.1,.7],[x+dx,floor+.65,z-1.25],solar);
          box(root,[.85,.85,.14],[x+dx,floor+1.1,z-1.55],solar);
          // Seated editing staff face their screens; thighs (.48 m under the hip) rest on the .70 m chair seat.
          if(z===4 || (dx+y)%3===0)spots.push({at:new T.Vector3(x+dx,floor+.22,z-1.2),yaw:0,mode:'desk',crowd:'staff',seated:true});
        }
      }
      // Staff cross each floor along the aisle between the desk rows (studio floors: in front of the cameras), short of the flank staff.
      // Level 24's main floor meets the forum's outer rail (r 45 about -8,-2), so its aisles stop 1 m short of it.
      for(const [floor,zs] of [[y+1.225,studio ? [6] : [7.1,8.1]],[y+9.5,[7.1,8.1]]] as const)for(const z of zs) {
        const cut=y===24 && floor===y+1.225,rail=-8+Math.sign(x+8)*Math.sqrt(46**2-(z+2)**2);
        stroll([new T.Vector3(Math.max(x-width/2+2.6,cut && x>-8 ? rail : -Infinity),floor,z),new T.Vector3(Math.min(x+width/2-3.2,cut && x<-8 ? rail : Infinity),floor,z)],'staff');
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
      if(studio) {
        // A live studio set sits directly behind the glazing: blue video wall, lit stage, presenters, cameras and a spot rig
        // under the editing mezzanine, so the production floor reads as broadcast space from the bay.
        box(root,[width-5,7,.6],[x,y+5.05,16.4],solar);
        box(root,[width-8,5,.2],[x,y+5.2,16],broadcastLight);
        box(root,[width-10,.3,.2],[x,y+8.1,15.9],publicLight);
        box(root,[width-7,.65,5],[x,y+1.6,13],trim);
        box(root,[width-7.5,.12,.15],[x,y+1.75,10.45],broadcastLight);
        for(let dx=-width/2+5,i=0;dx<width/2-4;dx+=3.4,i++) {
          if(i%2===0)standing(x+dx,y+1.925,13.2);
          // Pedestal cameras face the set from the studio floor.
          box(root,[.25,1.3,.25],[x+dx+1.2,y+1.85,7.5],solar);
          box(root,[.6,.5,.9],[x+dx+1.2,y+2.7,7.5],solar);
        }
        for(const z of [8.5,12.5]) {
          box(root,[width-4,.22,.22],[x,y+8.3,z],solar);
          for(let dx=-width/2+3;dx<width/2-2;dx+=2.4) {
            box(root,[.45,.5,.45],[x+dx,y+7.95,z],solar);
            box(root,[.34,.08,.34],[x+dx,y+7.67,z],publicLight);
          }
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
  // An inner stage-wash shell closes the auditorium behind its glazing, so stage and rig light read against it, not the rear wing;
  // the room-light shader fades it from violet at the rig to navy in the dome.
  const shell=new T.SphereGeometry(23.2,40,12,0,Math.PI*2,Math.PI*.24,Math.PI*.46),shellIndex=shell.index!;
  for(let i=0;i<shellIndex.count;i+=3){const t=shellIndex.getX(i+1);shellIndex.setX(i+1,shellIndex.getX(i+2));shellIndex.setX(i+2,t);}
  (shell.attributes.normal.array as Float32Array).forEach((v,i,normals)=>normals[i]=-v); // inward-facing: only the far interior wall renders
  chamber.add(new T.Mesh(shell,publicLight));
  // Warm rig ring and spot fixtures under the dome give the theatre its lit crown.
  arc(chamber,16.2,18.2,.3,[0,13.2,0],publicLight);
  arc(chamber,16,18.4,.5,[0,13.5,0],solar);
  // An inner crown of can lights fills the dome with fixtures, as in a broadcast auditorium.
  for(const [radius,height,count] of [[17,14.8,28],[8,19.5,16],[4,21.5,8]] as const)for(let i=0;i<count;i++) {
    const a=i*Math.PI*2/count,x=Math.cos(a)*radius,z=-Math.sin(a)*radius;
    box(chamber,[.7,.9,.7],[x,height,z],solar);
    box(chamber,[.45,.35,.45],[x,height-.55,z],publicLight);
  }
  // Rows of house lights dot the far side of the dark dome.
  for(const y of [5,10,15])for(let a=Math.PI+.2;a<Math.PI*2-.15;a+=.17) {
    const r=Math.sqrt(23*23-y*y)-.3;
    box(chamber,[.3,.3,.3],[Math.cos(a)*r,y,-Math.sin(a)*r],publicLight);
  }
  for(let i=0;i<24;i++) {
    const x=Math.cos(i*Math.PI/12)*17.2,z=-Math.sin(i*Math.PI/12)*17.2;
    box(chamber,[.8,.8,.8],[x,12.5,z],solar);
    box(chamber,[.55,.35,.55],[x,12,z],i%2 ? broadcastLight : publicLight);
  }
  const bowl=new T.Mesh(new T.SphereGeometry(24,48,12,0,Math.PI*2,Math.PI*.7,Math.PI*.3),trim);chamber.add(bowl);
  arc(chamber,0,20.6,1.6,[0,-12,0],stone);
  arc(chamber,19.8,21.2,.7,[0,-10.4,0],trim);
  arc(chamber,20.7,21.1,.18,[0,-9.7,0],publicLight);
  box(chamber,[22,1,9],[0,-9,7],publicLight); // lit stage deck
  box(chamber,[25,17,.7],[0,0,12],solar);
  box(chamber,[20,14,.18],[0,-.5,11.55],broadcastLight);
  // Framed screen bays and a warm centre frame give the broadcast wall depth; the whole wall stays lit blue behind the stage.
  for(const x of [-3.3,3.3])box(chamber,[.35,12,.3],[x,-.5,11.1],publicLight);
  box(chamber,[6.8,.35,.3],[0,5.5,11.1],publicLight);
  for(const x of [-7,7]) {
    for(const y of [-3.8,.2,4.2])box(chamber,[5.7,.16,.3],[x,y,11.3],solar);
    box(chamber,[.28,9,.3],[x,-.5,11.1],publicLight);
  }
  // Warm lower scenery separates the presenters' stage from the blue broadcast wall above it.
  box(chamber,[19.5,2.4,.2],[0,-6.1,11.3],publicLight);
  for(const x of [-7,-3.5,0,3.5,7])box(chamber,[.18,2.4,.25],[x,-6.1,11.15],solar);
  // Warm proscenium frames the live screen above the audience, distinct from the dark technical dome.
  for(const x of [-11.5,11.5])box(chamber,[1.1,15,.35],[x,-.5,11.4],publicLight);
  box(chamber,[24,1,.4],[0,7.5,11.35],publicLight);
  for(const x of [-8,-4,0,4,8]) {
    box(chamber,[.12,14,.25],[x,-.5,11.3],solar);
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
    box(chamber,[.75,.3,.75],[x,8.75,z],z<0 ? publicLight : broadcastLight);
  }
  // An inner glazed balcony and lit equator outline the full theatre volume behind the skin.
  for(const start of [-.6,Math.PI-.6]) {
    arc(chamber,21.2,23.2,.5,[0,-4,0],stone,start,1.2);
    arc(chamber,21.2,21.5,1.1,[0,-3.5,0],silverGlass,start,1.2);
  }
  arc(chamber,22.4,22.85,.25,[0,1.5,0],publicLight);
  // A presenter desk and camera pedestals distinguish the live studio from a vacant glazed chamber.
  box(chamber,[8,1.1,2],[0,-7.95,6],trim);
  box(chamber,[7,.5,.15],[0,-7.9,4.9],broadcastLight);
  for(const x of [-5,5])standing(chamber.position.x+x,chamber.position.y-8.5,chamber.position.z+7);
  for(const x of [-10,10]) {
    box(chamber,[.3,1.4,.3],[x,-7.7,4],solar);
    box(chamber,[.8,.55,1.1],[x,-6.85,4],solar);
    box(chamber,[1.2,.18,1.2],[x,-8.4,4],solar);
  }
  // Tiered seating faces the rear stage; side aisles connect to the public entrance at Y=100.
  arc(chamber,21.4,21.8,14,[0,-8,0],solar,Math.PI+.45,Math.PI-.9); // dark stage surround: the blue screen and rig read against it
  for(let a=Math.PI+.5;a<Math.PI*2-.5;a+=.22)box(chamber,[.3,14,.5],[Math.cos(a)*21.3,-1,-Math.sin(a)*21.3],trim);
  for(let row=0;row<9;row++) {
    const z=1-row*2.2,y=-10.3+row*1.15,w=28-row*.6;
    box(chamber,[w,.3,2.1],[0,y+.2,z],solar); // dark acoustic treads keep the lit seats and audience distinct
    box(chamber,[w-.4,.12,.12],[0,y+.2,z+1.08],broadcastLight); // stage-wash step lights tint the audience blue
    for(let seat=0;seat<15;seat++) {
      if(seat===7)continue;
      const x=(seat-7)*1.55;
      box(chamber,[1.05,.25,1.1],[x,y+.8,z],solar);
      box(chamber,[1.05,1.1,.2],[x,y+1.25,z-.5],broadcastLight); // violet seat backs (theatre tint in the room-light shader)
      if((seat*3+row)%7!==0)spots.push({at:chamber.position.clone().add(new T.Vector3(x,y+.445,z)),yaw:0,mode:'audience',crowd:'public',seated:true});
    }
  }
  // Raked stringers and rear legs carry the open treads down to the acoustic bowl.
  for(const x of [-11,-4,4,11]) {
    member([x-18,89.5,24],[x-18,98.6,6.4],.5,.6,solar);
    member([x-18,88.8,6.4],[x-18,98.6,6.4],.45,.45,solar);
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
    const rib=new T.Mesh(new T.TorusGeometry(24,.16,5,64),glass); // navy glazing bars outline the clear sphere
    rib.rotation.y=i*Math.PI/12;chamber.add(rib);
  }
  for(const y of [-8,4,16,20]) {
    const rib=new T.Mesh(new T.TorusGeometry(Math.sqrt(576-y*y),.16,5,64),glass);
    rib.position.y=y;rib.rotation.x=Math.PI/2;chamber.add(rib);
  }
  const ring=new T.Mesh(new T.TorusGeometry(29,2.4,8,80),trim);
  ring.position.set(-18,94,23);ring.rotation.y=.58;root.add(ring);
  const ringInset=new T.Mesh(new T.TorusGeometry(29,.45,5,80),broadcastLight); // blue edge light under the ring
  ringInset.position.copy(ring.position);ringInset.position.z-=2.2;ringInset.rotation.copy(ring.rotation);root.add(ringInset);
  // Suspension follows a visible load path from the top transfer beam to the chamber's lower cradle.
  for(const x of [-40,4]) {
    member([x,130,-12],[x,130,70],3,4);
    for(const z of [6,40])member([x,130,z],[x,85,z],.65,.65);
  }
  for(const z of [6,40])member([-40,85,z],[4,85,z],2,3);
  member([-42.26,94,38.89],[-40,85,40],1.5,2);
  member([6.26,94,7.11],[4,85,6],1.5,2);
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
    standing(-8+Math.cos(a)*(40.5-(i%2)*1.6),3,-2-Math.sin(a)*(40.5-(i%2)*1.6),outward(a),'public');
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
    // Two visitors sit facing outward, hips .18 m behind the seat's front edge (24.575 m), and talk.
    for(const t of [-.75,.75])spots.push({at:new T.Vector3(x-Math.sin(a)*t+Math.cos(a)*.42,24.095,z-Math.cos(a)*t-Math.sin(a)*.42),yaw:outward(a),mode:'talk',crowd:'public',seated:true});
  }
  // Standing crowds gather on the public forum and the elevated ring, away from benches, planting, the Aqua arrival and the incline
  // rising through the forum (x 9–20, z < -6).
  const forum=(a:number,r:number,yaw:number)=>{const x=-8+Math.cos(a)*r,z=-2-Math.sin(a)*r;if(z>-6 || x<9 || x>20)standing(x,24,z,yaw,'public');};
  for(let a=2.3,i=0;a<6.2;a+=.085,i++)forum(a,21.5+(i*7%5)*1.1,inward(a));
  // A second, looser outer band thickens the forum into a gathering crowd, still inside the planted ring.
  for(let a=2.36,i=0;a<6.15;a+=.115,i++)forum(a,25+(i*5%3)*.9,inward(a));
  // Bay-facing forum groups occupy the supported inner walk, leaving the outer benches and arrival gap clear.
  for(let a=.4,i=0;a<1.6;a+=.085,i++) {
    const r=24+(i%3)*1.2;
    forum(a,r,outward(a));
    if(i%3===0)forum(a+.035,r+.8,outward(a));
  }
  // Forum strollers pace five lanes between the crowd and the planting, clear of the wings and the bench sector.
  for(const r of [28.2,29.4,30.6,31.8,33])lane(-8,-2,r,3.05,5.55,24);
  for(let a=.45,i=0;a<2.7;a+=.11,i++) {
    const r=26.2+(i*3%4)*.5;
    standing(-18+Math.cos(a)*r,63,23-Math.sin(a)*r,outward(a),'public');
  }
  for(const y of [63,134]) {
    box(root,[132,1.4,10],[-2,y,-12],stone);
    for(const z of [-16.8,-7.2]) {
      box(root,[132,1.5,.22],[-2,y+1.5,z],membrane);
      box(root,[132,.18,.22],[-2,y+2.3,z],trim);
      box(root,[128,.15,.15],[-2,y+.85,z],publicLight);
    }
    box(root,[120,.9,2.4],[-2,y+1.1,-8.7],leaf);
    for(let x=-56;x<57;x+=8)grove(x,y+1.6,-8.7,x);
    for(let x=-60;x<=60;x+=6) {
      member([x,y+.7,-16.8],[x,y+2.3,-16.8],.16,.18,solar);
      if(x%12===0)box(root,[4,.7,1.1],[x,y+1.15,-11],trim);
    }
    // Pairs stand on the transfer beam's top at Y=65, above the thinner promenade slab.
    if(y===63)for(let x=-42,i=0;x<=42;x+=7,i++) {
      standing(x,65,-14.6,Math.PI,'public');
      standing(x+.85,65,-14.1+(i%2)*.4,Math.PI,'public');
    }
    // Strollers on the beam top, between the pairs and the planter, from the spine landing to the east pier.
    if(y===63)for(const z of [-11.4,-10.2])stroll([new T.Vector3(-30,65,z),new T.Vector3(56,65,z)],'public');
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
  // Ring strollers keep to the rear half, inside the soil ribbons and between the wings.
  for(const r of [26.5,28.8])lane(-18,23,r,3.7,5.6,63);
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
  return Object.assign(root,{occupants:{spots,walks,rides}});
}
