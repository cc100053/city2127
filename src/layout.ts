// ponytail: compressed hand-placed footprints; use survey coordinates for exact reconstruction.
// Shibuya spatial study: +X east, +Z south. Compressed art units, not survey data.
// One source for the painted crossings, walking paths and prototype footprints.
export const crossings = [
  {from:[-5.7,-9.6],to:[6,9.5],width:3.2}, // QFRONT ↔ Hachiko plaza
  {from:[-5.5,-7.6],to:[7.5,-7.6],width:2.8}, // north / Jingu-dori
  {from:[9,-6.5],to:[10,7],width:2.8}, // east / station
  {from:[5,9.5],to:[-11.5,9.5],width:3}, // south / station approach
  {from:[-16,6],to:[-17,-5.4],width:2.8}, // west / Dogenzaka
];
// Arms run past the frame so the street reads as a piece of a city, not a plate.
export const roads = [
  [[-75,-4.5],[75,-4.5],[75,4.5],[-75,4.5]],
  [[-5,-5],[-1,-70],[8,-70],[6,-5]],
  [[-10,-3],[-75,-34],[-75,-42],[-8,-8]],
  [[-10,4],[4,4],[-9,70],[-21,70]],
  [[-10,-5],[-4,-7],[6,-7],[8,-4],[8,5],[3,7],[-9,7]],
];
export const landmarks = [
  {name:'QFRONT',x:-10,z:-18.5,w:11,h:48,d:10},
  {name:'MAGNET / AIR COMMONS',x:15,z:-19,w:12.5,h:58,d:15.5},
  {name:'CENTER-GAI',x:-27,z:-8,w:5,h:32,d:3},
  {name:'DOGENZAKA',x:-24,z:13,w:9,h:24,d:11},
  {name:'SHIBUYA STATION',x:24,z:15,w:10,h:18,d:19},
];
export const DOCK={x:landmarks[1].x,y:15,z:landmarks[1].z+6.5,berthZ:landmarks[1].z+3.8};

export function crossingPoint(path:number,u:number,lane=0) {
  const {from,to}=crossings[path],dx=to[0]-from[0],dz=to[1]-from[1],length=Math.hypot(dx,dz);
  return {x:from[0]+dx*u+dz/length*lane,z:from[1]+dz*u-dx/length*lane,yaw:Math.atan2(dx,dz)};
}

// Public decks connect the existing landmark mouths; terminal lifts serve ground and deck.
export const publicRoutes = [
  {name:'QFRONT / STATION',points:[[-10,8,-13.2],[-6,8,-9.6],[6,10,9.5],[19,10,12]],width:2.4},
  {name:'DOGENZAKA / CENTER-GAI',points:[[-19.3,6,13],[-16,6,6],[-17,9,-5.4],[-24,9,-8]],width:2.2},
];
// Unit lane offset at every vertex, mitred at corners, so a side lane is itself a continuous path.
const publicNormals=publicRoutes.map(({points})=>{
  const n=points.slice(1).map((p,i)=>{const dx=p[0]-points[i][0],dz=p[2]-points[i][2],l=Math.hypot(dx,dz);return [dz/l,-dx/l];});
  return points.map((_,i)=>{const a=n[Math.max(0,i-1)],b=n[Math.min(n.length-1,i)],sx=a[0]+b[0],sz=a[1]+b[1],q=sx*sx+sz*sz;return [sx*2/q,sz*2/q];});
});
export function publicPoint(route:number,u:number,lane=0) {
  const pts=publicRoutes[route].points.map((p,i)=>[p[0]+publicNormals[route][i][0]*lane,p[1],p[2]+publicNormals[route][i][1]*lane]);
  const distances=pts.slice(1).map((p,i)=>Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1],p[2]-pts[i][2]));
  let distance=Math.max(0,Math.min(1,u))*distances.reduce((a,b)=>a+b,0),i=0;
  while(i<distances.length-1 && distance>distances[i])distance-=distances[i++];
  const a=pts[i],b=pts[i+1],t=distance/distances[i];
  return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,z:a[2]+(b[2]-a[2])*t,yaw:Math.atan2(b[0]-a[0],b[2]-a[2])};
}
// A lift ride, a walk, then the destination lift. Reverse the same journey next cycle.
// Same-route walkers start 16 s apart, so no two ever share a lift. Each direction keeps its own side of the
// deck; the rider drifts back to the shaft centreline during the lift ride so the reversal stays continuous.
export function publicJourney(time:number,index:number) {
  const phase=(time+index*8)/48,forward=Math.floor(phase)%2===0;
  const u=forward?phase%1:1-phase%1,route=index%publicRoutes.length,w=Math.max(0,Math.min(1,(u-.15)/.7));
  const lane=(forward?.5:-.5)*Math.min(1,u/.15,(1-u)/.15);
  const p=publicPoint(route,w,lane),shaft=publicPoint(route,w,0);
  if(u<.15)p.y=.46+(p.y-.46)*u/.15;
  if(u>.85)p.y=.46+(p.y-.46)*(1-u)/.15;
  return {...p,yaw:p.yaw+(forward?0:Math.PI),walking:u>.15&&u<.85,liftX:shaft.x,liftZ:shaft.z};
}

// Occupied upper volumes bear on the named landmark cores; every entry is checked for air, courier and walker clearance.
// kind: 'link' solid occupied bar, 'floor' open public colonnade, 'wing' housing/commons block with windows.
export const upperLinks = [
  {name:'SKY LINK',kind:'link',x:2.5,z:-19,w:25,h:4,d:7,y:39,on:['QFRONT','MAGNET / AIR COMMONS'],columns:[]},
  {name:'COMMONS FLOOR',kind:'floor',x:2.5,z:-19,w:25,h:3.5,d:9,y:24,on:['QFRONT','MAGNET / AIR COMMONS'],columns:[]},
  {name:'QFRONT CROWN',kind:'wing',x:-12.75,z:-18.5,w:17,h:8,d:11.5,y:44,on:['QFRONT'],columns:[]},
  {name:'QFRONT WEST WING',kind:'wing',x:-18.5,z:-18.5,w:9,h:14,d:9.5,y:33,on:['QFRONT'],columns:[]},
  {name:'MAGNET EAST WING',kind:'wing',x:24.25,z:-19,w:9.5,h:13,d:12,y:27.5,on:['MAGNET / AIR COMMONS'],columns:[[27.2,-23.2],[27.2,-14.8]]},
] as const;

// Survey change sites: one per CityView lot socket, on open ground the hero pose can see. h = tallest variant; place = where viewers look.
// nw automation hub (east of MAGNET), ne park (east of the station), sw commons plaza (south of Dogenzaka), se tower (behind Center-gai, west).
export const changeSites = {
  nw:{name:'AUTO HUB',place:'MAGNET東',x:35,z:-11,w:8,d:7,h:32},
  ne:{name:'PARK',place:'駅東',x:37,z:11,w:10,d:10,h:8},
  sw:{name:'COMMONS PLAZA',place:'道玄坂南',x:-24,z:32,w:12,d:10,h:5},
  se:{name:'TOWER',place:'センター街奥',x:-40,z:-10,w:9,d:9,h:46},
} as const;
