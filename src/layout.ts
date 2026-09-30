// Odaiba scene, metres: +X east, -Z north, Y up; ground pads at 0, sea at -0.8. One source for the actor routes and survey sites.
type P3 = readonly [number, number, number];

// Hero district (720 × 680 m around the landmark cluster): detail outside it is not built; ground, roads and guideway continue
// for `apron` metres with round corners and fade into haze (scripts/crop-odaiba-district.py mirrors these numbers).
export const DISTRICT = {minX:-460,maxX:260,minZ:-360,maxZ:320,apron:150} as const;
export const inDistrict = (x:number,z:number) => x>=DISTRICT.minX && x<=DISTRICT.maxX && z>=DISTRICT.minZ && z<=DISTRICT.maxZ;

// Yurikamome guideway centreline, traced every 25 m across the Phase 03D guideway deck (top at 14.2 m), north-east to south-west.
export const guideway: readonly P3[] = [
  [206,14.2,-209],[185,14.2,-195],[164,14.2,-181],[143,14.2,-167],[122,14.2,-154],[101,14.2,-140],[80,14.2,-126],[59,14.2,-112],
  [39,14.2,-98],[18,14.2,-84],[-3,14.2,-71],[-24,14.2,-57],[-44,14.2,-42],[-65,14.2,-29],[-86,14.2,-15],[-107,14.2,-1],
  [-127,14.2,13],[-148,14.2,27],[-169,14.2,41],[-189,14.2,56],[-209,14.2,70],[-230,14.2,84],[-251,14.2,98],[-271,14.2,112],
  [-292,14.2,127],[-312,14.2,141],[-330,14.2,159],[-343,14.2,180],[-350,14.2,204],[-350,14.2,229],[-344,14.2,254],[-333,14.2,276],
  [-319,14.2,297],[-306,14.2,318],
];
// Seaside promenades, traced on open ground 10–40 m inland of the north shore: east from DECKS to the park, west from the park to Hilton.
// The park lot reaches the revetment, so walkers turn back at it instead of crossing.
export const promenades: readonly (readonly P3[])[] = [
  [[1,0,-318],[3,0,-296],[-14,0,-269],[-43,0,-260],[-62,0,-250],[-86,0,-228],[-118,0,-207],[-148,0,-191],[-178,0,-173]],
  [[-259,0,-145],[-273,0,-123],[-288,0,-92],[-310,0,-76],[-347,0,-54],[-375,0,-33],[-411,0,-14],[-427,0,6]],
];
// Top of the Fuji TV sphere (centre about -18, 107, 23; radius 22): the air-taxi berth.
export const SPHERE_DOCK: P3 = [-18,131,23];
// Water taxis: a shuttle loop along the beach and a ferry lane out to the bay (the open sea continues past the plate).
export const waterLoop: readonly P3[] = [
  [-90,-.6,-385],[-200,-.6,-300],[-330,-.6,-215],[-430,-.6,-120],[-395,-.6,-165],[-285,-.6,-255],[-160,-.6,-345],[-70,-.6,-420],
];
export const ferryLane: readonly P3[] = [[-230,-.6,-290],[-420,-.6,-470],[-700,-.6,-720],[-1100,-.6,-1000]];
// Air-taxi corridors: a district loop above every landmark and tall site, and an approach from the bay that ends above the sphere berth.
export const airLoop: readonly P3[] = Array.from({length:12},(_,i)=>{
  const a=i/12*Math.PI*2;return [-40+Math.cos(a)*330,170+Math.sin(a*2)*6,-40+Math.sin(a)*250] as const;
});
export const sphereApproach: readonly P3[] = [[-620,160,-640],[-380,160,-360],[-160,158,-120],[-60,150,-20],[SPHERE_DOCK[0],SPHERE_DOCK[1]+6,SPHERE_DOCK[2]]];

// Survey change sites on Odaiba open ground the hero pose can see, clear of roads, landmarks and the guideway (tests/odaiba.test.ts).
// x/z: metres in the Odaiba scene. w/d/h: the builders' own units (h = tallest variant); scale: metres per unit at the site root. place = the name guests read.
// nw automation hub on the waterfront west of DECKS, ne park on the seaside lawn, sw commons between Aqua City and Hilton, se tower east of Fuji TV.
// Hub and tower sit on different hero bearings (30° / 40°) so they never stack into one silhouette.
export const changeSites = {
  nw:{name:'AUTO HUB',place:'デックス西',x:40,z:-300,w:8,d:7,h:32,scale:3},
  ne:{name:'PARK',place:'お台場海浜公園',x:-210,z:-135,w:10,d:10,h:8,scale:4},
  sw:{name:'COMMONS PLAZA',place:'アクアシティ南',x:-105,z:60,w:12,d:10,h:5,scale:4},
  se:{name:'TOWER',place:'フジテレビ東',x:175,z:-45,w:9,d:9,h:46,scale:3},
} as const;

// 2127 retrofit (src/odaiba2127.ts). Sky bridges at 24 m between facade points found by raycast; each clear of all other geometry.
export const skyBridges: readonly {name:string;from:P3;to:P3}[] = [
  {name:'AQUA ↔ FUJI TV',from:[-49,24,-90],to:[-15,24,-32]}, // crosses 10 m above the guideway trains
  {name:'AQUA ↔ DECKS',from:[31,24,-177],to:[90,24,-216]},
];
// Floating decks off the east promenade: [x, z, yaw], 10 × 36 m, long axis along the shore; on water and 30 m from boat routes.
export const floatingDecks: readonly (readonly [number,number,number])[] = [[-62,-281,-1.12],[-131,-238,-1.03],[-180,-199,-1.02]];
