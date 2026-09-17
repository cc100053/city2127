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
export const roads = [
  [[-31,-4.5],[31,-4.5],[31,4.5],[-31,4.5]],
  [[-5,-5],[-3,-26],[6,-26],[6,-5]],
  [[-10,-3],[-31,-13],[-31,-21],[-8,-8]],
  [[-10,4],[4,4],[-1,26],[-13,26]],
  [[-10,-5],[-4,-7],[6,-7],[8,-4],[8,5],[3,7],[-9,7]],
];
export const landmarks = [
  {name:'QFRONT',x:-10,z:-18.5,w:11,h:17,d:10},
  {name:'MAGNET / AIR COMMONS',x:15,z:-19,w:12.5,h:30,d:15.5},
  {name:'CENTER-GAI',x:-27,z:-8,w:5,h:10,d:3},
  {name:'DOGENZAKA',x:-24,z:13,w:9,h:9,d:11},
  {name:'SHIBUYA STATION',x:24,z:15,w:10,h:6,d:19},
];
export const DOCK={x:landmarks[1].x,y:15,z:landmarks[1].z+6.5,berthZ:landmarks[1].z+3.8};

export function crossingPoint(path:number,u:number,lane=0) {
  const {from,to}=crossings[path],dx=to[0]-from[0],dz=to[1]-from[1],length=Math.hypot(dx,dz);
  return {x:from[0]+dx*u+dz/length*lane,z:from[1]+dz*u-dx/length*lane,yaw:Math.atan2(dx,dz)};
}
