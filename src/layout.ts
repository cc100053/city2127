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
// The two Yurikamome tracks, traced every 25 m along the environment's two guideway beams from the plate's north-east exit to about
// 160 m past the district's south-west edge. Trains keep left: A (the centreline above, extended both ways) runs south-west, B (the
// beam 4.6 m to its right) north-east.
export const guidewayTracks: readonly (readonly P3[])[] = [
  [[493,14.2,-408],[476,14.2,-390],[456,14.2,-375],[436,14.2,-360],[415,14.2,-347],[394,14.2,-332],[374,14.2,-318],[353,14.2,-305],[332,14.2,-291],[311,14.2,-277],[290,14.2,-263],[269,14.2,-250],[248,14.2,-236],[227,14.2,-222],...guideway,
   [-292,14.2,339],[-278,14.2,360],[-264,14.2,380],[-251,14.2,401],[-236,14.2,422],[-221,14.2,442],[-205,14.2,461],[-188,14.2,479]],
  [[-199,14.2,473],[-216,14.2,454],[-231,14.2,434],[-246,14.2,414],[-259,14.2,393],[-273,14.2,372],[-287,14.2,351],[-301,14.2,330],[-315,14.2,310],[-328,14.2,289],[-342,14.2,268],[-352,14.2,245],[-358,14.2,220],[-357,14.2,195],[-349,14.2,171],[-336,14.2,150],[-318,14.2,133],[-297,14.2,119],[-277,14.2,105],[-256,14.2,91],[-235,14.2,77],[-214,14.2,63],[-194,14.2,49],[-172,14.2,36],[-151,14.2,22],[-130,14.2,8],[-110,14.2,-5],[-89,14.2,-19],[-68,14.2,-33],[-47,14.2,-47],[-26,14.2,-61],[-6,14.2,-75],[15,14.2,-89],[36,14.2,-103],[57,14.2,-117],[78,14.2,-130],[98,14.2,-144],[119,14.2,-158],[140,14.2,-172],[161,14.2,-186],[181,14.2,-200],[202,14.2,-214],[222,14.2,-229],[243,14.2,-243],[264,14.2,-256],[284,14.2,-271],[305,14.2,-285],[326,14.2,-299],[347,14.2,-313],[368,14.2,-326],[388,14.2,-340],[409,14.2,-354],[430,14.2,-368],[451,14.2,-382],[470,14.2,-397],[481,14.2,-408]],
];
// Seaside promenades, traced on open ground 10–40 m inland of the north shore: east from DECKS to the park, west from the park to Hilton.
// The park lot reaches the revetment, so walkers turn back at it instead of crossing.
export const promenades: readonly (readonly P3[])[] = [
  [[1,0,-318],[3,0,-296],[-14,0,-269],[-43,0,-260],[-62,0,-250],[-86,0,-228],[-118,0,-207],[-148,0,-191],[-178,0,-173]],
  [[-259,0,-145],[-273,0,-123],[-288,0,-92],[-310,0,-76],[-347,0,-54],[-375,0,-33],[-411,0,-14],[-427,0,6]],
];
// Street avenues, centrelines snapped to the environment's road surfaces (tests/mobility.test.ts): the 5 m seaside avenue north of Aqua
// City and DECKS, and the 7 m avenue under the Yurikamome guideway. Neither crosses the other, so their street cars need no signals.
export const streets: readonly (readonly P3[])[] = [
  [[-207,0,-86.4],[-108.9,0,-151.5],[-10.8,0,-216.6],[87,0,-282.1],[168.4,0,-336.7],[217.5,0,-369.3]],
  [[259.8,0,-256],[175.9,0,-199.5],[108.9,0,-154.3],[24.6,0,-98.4],[-59.9,0,-42.9],[-127.5,0,1.5],[-160.6,0,24],[-244,0,80.9],[-328.1,0,136.7],[-344.7,0,148.2]],
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
  // Far water beyond the island's south-west shore, top middle of the hero frame (target v2's distant boats).
  [450,1000,2.5],[700,1100,1.2],[1000,1250,-.4],[1200,1000,1.9],[250,1250,-1.3],
];
// Sweep: a lit transit skyway descending from the Grand Nikko ring (92 m) west past Hilton and out of the frame's lower right,
// above the Yurikamome deck and clear of Nikko and Hilton footprints; a short white train shuttles on it (mobility).
export const sweepway: readonly P3[] = [[-290,92,265],[-345,74,250],[-400,56,205],[-440,44,152],[-475,34,92],[-520,28,40],[-580,24,-10]];
// Air-taxi corridors: a district loop above every landmark and tall site, and an approach from the bay that ends above the sphere berth.
export const airLoop: readonly P3[] = Array.from({length:12},(_,i)=>{
  const a=i/12*Math.PI*2;return [-40+Math.cos(a)*330,170+Math.sin(a*2)*6,-40+Math.sin(a)*250] as const;
});
export const sphereApproach: readonly P3[] = [[-620,160,-640],[-380,160,-360],[-160,158,-120],[-60,150,-20],[SPHERE_DOCK[0],SPHERE_DOCK[1]+6,SPHERE_DOCK[2]]];
// Air tiers (2127 mobility layers): regional 160–170 m (district loop, sphere approach), city 80–100 m (shore lane), service 30–45 m
// (district quadrotors). The shore lane is one closed loop off the north shore: its inbound leg runs 45 m out at 80 m westward, its
// outbound leg 120 m out at 100 m eastward, so the two directions read as separate lanes. Offsets of a smoothed shore, ending west of
// the AUTO HUB site.
export const shoreLaneInner: readonly P3[] = [[-65,80,-317],[-152,80,-258],[-220,80,-218],[-294,80,-186],[-367,80,-112],[-464,80,-53]];
export const shoreLane: readonly P3[] = [...shoreLaneInner,
  [-520,90,-80],[-503,100,-117],[-413,100,-171],[-339,100,-247],[-254,100,-285],[-193,100,-321],[-108,100,-379],[-50,90,-350]];
// Multimodal interchange on the shore in front of Aqua City: a pier `PIER` m out to sea, a boat berth at its head and an arrival mast
// beside it whose berth deck takes shore-lane air taxis (INTERCHANGE.deck: parked craft height, deck top 1.2 m lower). sea = unit vector out to sea, along = westward.
const IX={x:-94,z:-243,sea:[-.56,-.828],along:[-.828,.56]} as const, at=(out:number,side=0,y=0):P3=>[IX.x+IX.sea[0]*out+IX.along[0]*side,y,IX.z+IX.sea[1]*out+IX.along[1]*side];
export const INTERCHANGE = {shore:at(0),head:at(56),boat:at(68,0,-.6),mast:at(40,16),deck:38,pier:56,yaw:Math.atan2(IX.sea[0],IX.sea[1])} as const;
export const interchangeApproach: readonly P3[] = [[-260,100,-420],[-190,84,-345],[-150,60,-295],[INTERCHANGE.mast[0],INTERCHANGE.deck+6,INTERCHANGE.mast[2]]];
// The interchange boat runs in from the bay on the pier's axis, bow to the shore.
export const interchangeBoatLane: readonly P3[] = [[-380,-.6,-560],[-260,-.6,-440],at(120,0,-.6),INTERCHANGE.boat];
// Walkable mid-level skyways (deck top at the points, 9 m wide). Mid: Aqua City's east end to Hilton at 30 m, behind the PARK site from
// the hero pose (r5 pass 3); Fuji chassis west face to Hilton at 40 m, south of the COMMONS PLAZA lot, so the gap reads layered (r6).
export const midDecks: readonly (readonly P3[])[] = [
  [[-183,30,-50],[-205,30.5,-30],[-228,30.5,-8],[-248,30,8]],
  [[-86,40,18],[-130,40.5,26],[-180,41,34],[-220,40.5,40],[-250,40,44]],
];
// Planted mid-level decks (r6 pass 3, target v2's tree-lined middle layer; 5.2 m lawn bed down the middle). Raycast-checked against the
// environment, landmarks and Fuji chassis: clear between their docked ends, and off every survey site's line of sight from the hero pose.
export const gardenDecks: readonly (readonly P3[])[] = [
  // DECKS south face over the open ground to a landing on Aqua City's planted roof (30 m).
  [[150,40,-222],[150,39,-195],[125,37,-168],[85,35.5,-150],[40,34.5,-145],[20,34.5,-142]],
  // The 151 m tower down to DECKS' east face at 42 m.
  [[252,42,-346],[250,42,-315],[232,42,-290],[195,42,-281],[168,42,-280]],
];

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
