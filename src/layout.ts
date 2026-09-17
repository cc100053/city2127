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
const publicDistances=publicRoutes.map(({points})=>points.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-points[i][j]))));
export function publicPoint(route:number,u:number,lane=0) {
  const {points}=publicRoutes[route];
  const distances=publicDistances[route];
  let distance=Math.max(0,Math.min(1,u))*distances.reduce((a,b)=>a+b,0),i=0;
  while(i<distances.length-1 && distance>distances[i])distance-=distances[i++];
  const a=points[i],b=points[i+1],t=distance/distances[i],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);
  return {x:a[0]+dx*t+dz/length*lane,y:a[1]+(b[1]-a[1])*t,z:a[2]+dz*t-dx/length*lane,yaw:Math.atan2(dx,dz)};
}
// A lift ride, a walk, then the destination lift. Reverse the same journey next cycle.
export function publicJourney(time:number,index:number) {
  const phase=(time+index*6.7)/48,forward=Math.floor(phase)%2===0;
  const u=forward?phase%1:1-phase%1,route=index%publicRoutes.length;
  const p=publicPoint(route,Math.max(0,Math.min(1,(u-.15)/.7)),0);
  if(u<.15)p.y=.46+(p.y-.46)*u/.15;
  if(u>.85)p.y=.46+(p.y-.46)*(1-u)/.15;
  return {...p,yaw:p.yaw+(forward?0:Math.PI),walking:u>.15&&u<.85};
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
