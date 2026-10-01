// Odaiba scene, metres: +X east, -Z north, Y up; ground pads at 0, sea at -0.8. One source for the actor routes and survey sites.
type P3 = readonly [number, number, number];

// Hero district (720 × 680 m around the landmark cluster): detail, trees and facade panels are built only inside it. Beyond it the
// surveyed ground, roads, guideway and context massing continue as a low-detail backdrop that recedes into haze over `recede`
// metres (scripts/crop-odaiba-district.py mirrors the bounds).
export const DISTRICT = {minX:-460,maxX:260,minZ:-360,maxZ:320,recede:400} as const;
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
// The ferry heads west for the Shinagawa channel, clear of the Rainbow Bridge anchorage and Daiba approach piers.
export const ferryLane: readonly P3[] = [[-230,-.6,-290],[-420,-.6,-470],[-760,-.6,-560],[-1250,-.6,-520]];
// Bay cruisers [x, z, heading]: centres of straight 300 m runs on open water in front of and beyond the district, clear of the shore and piers.
export const bayCruisers: readonly (readonly [number,number,number])[] = [
  [-300,-560,.9],[-120,-620,-2.2],[-560,-430,2.6],[40,-600,-.4],[-640,-300,.3],[-700,250,1.4],[-650,-40,-1.7],[-150,1420,1.2],[250,1480,-1.9],
  // Nearer the hero pose: the foreground bay reads busy with taxis, as in the 2127 target (runs checked clear of the north shore).
  [100,-470,1.93],[-160,-470,.95],[-250,-380,-.9],[-330,-420,-.6],[-40,-560,2.3],[-500,-500,1.2],[260,-620,-1.6],
  // Open water south-west of the island, upper right of the hero frame.
  [133,1442,.4],[-333,908,2.1],[797,1695,-1],[-250,1180,1.1],
];
// Sweep: a lit transit skyway descending from the Grand Nikko ring (92 m) west past Hilton and out of the frame's lower right,
// above the Yurikamome deck and clear of Nikko and Hilton footprints; a short white train shuttles on it (mobility).
export const sweepway: readonly P3[] = [[-290,92,265],[-345,74,250],[-400,56,205],[-440,44,152],[-475,34,92],[-520,28,40],[-580,24,-10]];
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
// North shore: seaward edge of COAST_REVETMENT from the DECKS pier west past Hilton, traced from the district GLB (x, z). The tidal edge steps down into the sea from it.
// Dream Loop r2: east of the DECKS pier the backdrop ground is cut back to `seaward` (open bay), and the tidal edge follows that cut first.
export const northShore: readonly (readonly [number,number])[] = [
  [500,-534],[380,-489],[200,-420],[20,-352],[-3,-336],[-21,-291],[-60,-266],[-128,-220],[-194,-173],[-231,-170],[-266,-173],[-269,-158],[-275,-143],
  [-310,-104],[-339,-77],[-366,-63],[-405,-32],[-423,-27],[-436,-20],[-449,-6],[-465,3],
];

/** North-east backdrop ground past this line (east of the DECKS pier) is open bay: ground finishes discard it and no trees are planted there. */
export const seaward = (x:number,z:number) => x>-40 && z < -352 - Math.max(x-20,0)*.38;
export const SEAWARD_GLSL = 'p.x>-40. && p.y < -352. - max(p.x-20.,0.)*.38';

// Tokyo Bay beyond the plate, metres from the Fuji TV control point (35.6272 N 139.7749 E; 90.48 km per degree east, 110.95 km per degree north).
// Neighbouring shores are low ground slabs with block skylines (h: height range, count: blocks) — silhouettes only, left to the bay haze.
export const bayShores: readonly {name:string;x:readonly [number,number];z:readonly [number,number];h:readonly [number,number];count:number}[] = [
  {name:'Shibaura',x:[-3600,-1500],z:[-3600,-1650],h:[25,170],count:260},
  {name:'Takeshiba–Hamamatsucho',x:[-1500,-300],z:[-3600,-2500],h:[30,190],count:90},
  {name:'Harumi–Toyosu',x:[0,2800],z:[-3600,-2400],h:[30,180],count:130},
  {name:'Toyosu south',x:[900,2800],z:[-2300,-1300],h:[20,120],count:60},
  {name:'Ariake',x:[720,2400],z:[-1150,800],h:[12,70],count:55},
  {name:'Shinagawa–Tennozu',x:[-3600,-1700],z:[-1400,1400],h:[25,160],count:260},
  {name:'Oi',x:[-2800,-1300],z:[1500,3600],h:[8,30],count:50},
  // Only the far rim of the breakwater carries a skyline: from the hero pose it reads as a horizon silhouette, not a grey plain; kept low so it stays below the top-right clock overlay.
  {name:'Central breakwater',x:[-300,2300],z:[2850,3300],h:[12,60],count:150},
  {name:'Wakasu',x:[4400,6200],z:[200,2200],h:[8,25],count:30},
];
// Rainbow Bridge (centre 35.6364 N 139.7636 E; 570 m main span, 798 m suspended, 126 m towers, 52 m deck): Shibaura to Daiba anchorage,
// then the Daiba approach that carries the Yurikamome east along the north shore to the surveyed guideway's plate exit (496, -415).
export const rainbowBridge = {
  shibaura:[-1330,-1300] as const, daiba:[-720,-760] as const, deck:52, tower:126, mainSpan:570,
  approaches:[
    [[-1330,52,-1300],[-1520,34,-1480],[-1680,12,-1640]],
    [[-720,52,-760],[-420,36,-700],[-100,22,-640],[260,15,-560],[496,14.2,-415]],
  ] as readonly (readonly P3[])[],
};
// Tokyo Gate Bridge (Central breakwater ↔ Wakasu, 2.6 km, twin "dinosaur" trusses up to 87 m) on the south-east horizon;
// the Yurikamome guideway continues from its east plate exit onto Ariake.
export const gateBridge = {from:[2400,2950] as const, to:[4550,1600] as const, deck:55, crown:87};
export const ariakeLink: readonly P3[] = [[668,14.2,211],[900,14.2,235],[1150,14.2,260]];
