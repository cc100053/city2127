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
// Street network stage 1 (owner 2026-11-04, artifacts/street-kit-closeup-polish/network-stage1.md): one U route, the street kit's carriageway
// centre (section A, src/streetKit.ts), traced every ~10 m from the live scene. It runs the guideway avenue ② from its east end west, 4 m north
// of the surveyed road (the Yurikamome piers stand on its south half; eased to 1 m past the ring's foot), turns north on the link ③ round the
// plaza deck's west end (25 m corners), and runs the seaside avenue ① east (eased 1.5 m south past the arch foot). The street cars drive it.
export const streets: readonly (readonly P3[])[] = [[
  [257.6,0,-259.3],[249.3,0,-253.7],[241,0,-248.1],[232.7,0,-242.6],[224.4,0,-237],[216.1,0,-231.4],[207.8,0,-225.8],[199.5,0,-220.2],[191.2,0,-214.6],
  [182.9,0,-209],[174.6,0,-203.4],[166.3,0,-197.9],[158,0,-192.3],[149.8,0,-186.6],[142.4,0,-179.6],[134.9,0,-173],[126.6,0,-167.4],[117.9,0,-162.3],
  [108.6,0,-158.3],[100,0,-153.2],[91.7,0,-147.6],[83.4,0,-142.1],[75,0,-136.6],[66.7,0,-131],[58.4,0,-125.5],[50,0,-120],[41.7,0,-114.5],
  [33.3,0,-109],[25,0,-103.5],[16.7,0,-98],[8.3,0,-92.5],[0,0,-87],[-8.4,0,-81.5],[-16.8,0,-76],[-25.1,0,-70.5],[-33.5,0,-65],[-41.8,0,-59.5],
  [-50.2,0,-54],[-58.6,0,-48.6],[-66.9,0,-43.1],[-75.3,0,-37.6],[-83.7,0,-32.1],[-92,0,-26.6],[-100.4,0,-21.2],[-108.8,0,-15.7],[-117.1,0,-10.2],
  [-125.5,0,-4.7],[-133.3,0,0.5],[-135.7,0,1.9],[-138.2,0,3],[-140.9,0,3.9],[-143.6,0,4.4],[-146.4,0,4.6],[-149.2,0,4.5],[-152,0,4.1],[-154.7,0,3.4],
  [-157.3,0,2.4],[-159.8,0,1.1],[-162.1,0,-0.4],[-164.2,0,-2.2],[-166.1,0,-4.3],[-167.8,0,-6.5],[-173.7,0,-15.3],[-179.5,0,-24],[-185.4,0,-32.8],
  [-191.2,0,-41.5],[-197,0,-50.3],[-202.9,0,-59.1],[-204.3,0,-61.5],[-205.4,0,-64],[-206.3,0,-66.7],[-206.8,0,-69.5],[-207.1,0,-72.3],[-207,0,-75.1],
  [-206.6,0,-77.9],[-205.9,0,-80.6],[-204.9,0,-83.2],[-203.6,0,-85.7],[-202,0,-88],[-200.2,0,-90.2],[-198.2,0,-92.1],[-195.9,0,-93.8],[-191,0,-97],
  [-182.6,0,-102.6],[-174.3,0,-108.1],[-166,0,-113.6],[-157.6,0,-119.2],[-149.3,0,-124.7],[-141,0,-130.2],[-132.6,0,-135.7],[-124.3,0,-141.3],
  [-116,0,-146.8],[-107.6,0,-152.3],[-99.3,0,-157.9],[-91,0,-163.4],[-82.6,0,-168.9],[-74.3,0,-174.4],[-66,0,-180],[-57.6,0,-185.5],[-49.3,0,-191],
  [-41,0,-196.5],[-32.6,0,-202.1],[-24.3,0,-207.6],[-15.5,0,-212.5],[-6.8,0,-217.4],[1.5,0,-223],[9.8,0,-228.6],[17.6,0,-235],[25.6,0,-240.9],
  [33.9,0,-246.5],[42.2,0,-252.1],[50.5,0,-257.6],[58.8,0,-263.2],[67.1,0,-268.8],[75.4,0,-274.3],[83.7,0,-279.9],[92,0,-285.5],[100.3,0,-291.1],
  [108.6,0,-296.6],[117,0,-302.2],[125.3,0,-307.8],[133.6,0,-313.4],[141.9,0,-318.9],[150.2,0,-324.5],[158.5,0,-330.1],[166.8,0,-335.6],
  [175.1,0,-341.2],[183.4,0,-346.7],[191.8,0,-352.2],[200.1,0,-357.8],[208.4,0,-363.3],[216.8,0,-368.8],[217.5,0,-369.3]
], [
  // ④ boulevard (network stage 2, owner 2026-11-04, artifacts/street-kit-closeup-polish/network-stage2.md): section B's centre, from the backdrop band
  // past the south-west district edge along the old ~90 m band's axis, through the glass sphere's tripod (mast and one foot on the median), south
  // of the Fuji frame, out between Fuji and the DiverCity office tower and back onto the band past the east edge. Street pods drive its two channels.
  [-285,0,322.4],[-229.1,0,283.6],[-179.8,0,249.3],[-130.6,0,215.1],[-80.1,0,180],[-64.9,0,169.4],[-40,0,163],[-10,0,166],[30,0,174.5],[70,0,181.5],
  [96,0,181.5],[122,0,175],[145,0,165],[162,0,146],[175,0,120],[185,0,88],[207,0,52],[230,0,16],[248,0,-8],[265,0,-27],
]];
/** Section B along `streets[1]`, in metres along it: light-bridge crossings, and the planter gaps round the glass sphere's mast and feet
 * (`skyways.ts`, sphere at −80, 180: mast and its south-west foot on the median, the other two feet just outside both terraces). */
export const BOULEVARD = {
  crossings: [124, 311, 474],
  gaps: { median: [[230, 240], [244, 255]], terraces: [[252, 262]] },
} as const;
/** Stage 3 designed water (artifacts/street-kit-closeup-polish/network-stage3.md), replacing the landscape shader's ponds: a court pool under the
 * Fuji frame (stadium, outer size) and a canal on the old band north-west of ④ (④ d `from`–`to`, water `offset` ± `width`/2 m left of it),
 * both edged with a 1 m white coping 0.35 m over the water. ④'s light bridge at d 124 runs on over the canal. */
export const WATER = { pool: { x: 22, z: 118, length: 70, width: 24 }, canal: { from: 4, to: 200, offset: 30, width: 8 }, coping: 1, bridge: BOULEVARD.crossings[0] } as const;
/** The kit along `streets[0]`, in metres along it: carriageway half width, verges [from, to, reach beyond the carriageway edge] on the inside
 * (right of the route, −n: toward the plaza deck) and the outside, planter gaps [from, to] (the Yurikamome piers are found in the environment),
 * light-panel crossings, and where the kit starts (a pier stands on the road at d 2–6). Reaches stop short of DECKS, the ring and arch feet,
 * and the plaza deck; planters need ≥ 6.35 m. */
export const STREET_KIT = {
  from: 8, half: 3.5,
  inside: [[8, 190, 1.5], [190, 612, 9], [612, 830, 5.5], [830, 1000, 7], [1000, 1020, 4.5], [1020, 1109, 7]],
  outside: [[8, 125, 9], [125, 190, 6], [190, 1109, 9]],
  // Both sides: the Meter pieces' open ground (an automation bay at d 188–221 inside, two sharing courts at d 972–1011 and 1044–1083). Inside:
  // ③'s two corners (straight beds would cut into the bend), the deck's west stair, the AUTO HUB lot's margin (① crosses its north corner;
  // the drop-off bays stand on ①'s plaza frontage, which has no planters). Outside: the ring foot, the deck's south member, the PARK lot's
  // margin, the arch foot, the AUTO HUB lot's margin, the backdrop grove plinth. (Stage 2 removed the side streets whose mouths had gaps.)
  gaps: { inside: [[186, 222], [466, 514], [520, 540], [568, 616], [890, 942], [972, 1011], [1044, 1083]],
    outside: [[195, 216], [350, 362], [618, 636], [832, 862], [890, 942], [972, 1011], [1044, 1083], [1095, 1109]] },
  crossings: [398, 545],
} as const;
// polish2 (2026-11-03): the Fuji frame tower is the hero centrepiece. civicCore builds in its original metres and the whole chassis is scaled
// `k` about its west-front foot (-75, 0, -12), which lands at (x, 0, z): set back off the arch foot, east of COMMONS PLAZA and the guideway.
export const CIVIC = {k:1.35,x:-63,z:22} as const;
/** World point of a civicCore-local point. */
export const civicAt = ([x,y,z]:readonly number[]):P3 => [CIVIC.x+(x+75)*CIVIC.k,y*CIVIC.k,CIVIC.z+(z+12)*CIVIC.k];
// Top of the Fuji TV chrome sphere (local centre -18, 100, 23; radius 28): the air-taxi berth.
export const SPHERE_DOCK: P3 = civicAt([-18,131,23]);
// Water taxis: a shuttle loop along the beach and a ferry lane out to the bay (the open sea continues past the plate).
// The loop's return leg runs about 28 m seaward of the outbound leg, so taxis passing the other way never touch.
export const waterLoop: readonly P3[] = [
  [-90,-.6,-385],[-200,-.6,-300],[-330,-.6,-215],[-430,-.6,-120],[-405,-.6,-181],[-295,-.6,-271],[-170,-.6,-361],[-70,-.6,-420],
];
// The ferry heads west for the Shinagawa channel, clear of the Rainbow Bridge anchorage and Daiba approach piers.
export const ferryLane: readonly P3[] = [[-230,-.6,-290],[-420,-.6,-470],[-760,-.6,-560],[-1250,-.6,-520]];
// Bay cruisers [x, z, heading]: centres of straight 300 m runs on open water in front of and beyond the district, clear of the shore and piers.
export const bayCruisers: readonly (readonly [number,number,number])[] = [
  [-300,-560,.9],[-120,-620,-2.2],[-560,-430,2.6],[40,-600,-.4],[-640,-300,.3],[-700,250,1.4],[-650,-40,-1.7],[-150,1420,1.2],[250,1480,-1.9],
  // Nearer the hero pose: the foreground bay reads busy with taxis, as in the 2127 target (runs checked clear of the north shore).
  [100,-470,1.93],[-160,-470,.95],[-250,-380,-.9],[-330,-420,-.6],[-40,-560,2.3],[-478,-556,1.2],[260,-620,-1.6],
  // Open water south-west of the island, upper right of the hero frame.
  [133,1442,.4],[-333,908,2.1],[797,1695,-1],[-250,1180,1.1],
  // Far water beyond the island's south-west shore, top middle of the hero frame (target v2's distant boats).
  [450,1000,2.5],[700,1100,1.2],[1000,1250,-.4],[1200,1000,1.9],[250,1250,-1.3],
];
// Ambient bay ferry lanes (independent of the Meters) on the sea the hero frame really shows (src/heroCamera.ts heroSettledCamera): the strip
// left of the Civic Core (about x 525–775 px, y 424–435 at 1920×1080: the east bay) and the one right of it (x 1210–1480 px, y 412–422: the south bay).
// Control points sit on the curved sea (y falls with the earth curve beyond the plate, bayContext EARTH); tests/odaiba.test.ts proves
// each lane is visible from the hero position.
export const bayChannels: readonly (readonly P3[])[] = [
  [[1530,-1,860],[1370,-.6,880],[1200,-.6,910],[1060,-.6,940]],
  [[860,-3.5,1820],[700,-3.2,1860],[520,-2.4,1860],[380,-1.8,1830]],
];
// Sweep: a lit transit skyway descending from the Grand Nikko ring (92 m) west past Hilton and out of the frame's lower right,
// above the Yurikamome deck and clear of Nikko and Hilton footprints; a short white train shuttles on it (mobility).
export const sweepway: readonly P3[] = [[-290,92,265],[-345,74,250],[-400,56,205],[-440,44,152],[-475,34,92],[-520,28,40],[-580,24,-10]];
// Sky Ring (空の環, src/skyRing.ts): a 700 m truss ring whose deck top sits at `deck` m, a shared port above the regional air tier; the district
// loop follows its plan below. Above the hero eye (~148 m) so it arcs across the sky; at the tier's own 160–170 m it read as a flat bar at eye level.
export const SKY_RING = {x:-40,z:-40,rx:350,rz:350,deck:250} as const;
// P4 plaza deck (plazaDeck.ts) on the former Aqua City lot; local +z runs out to sea. `plazaAt` maps plaza-local metres to world x, z.
// polish2: the deck runs `east` m out on its -x side (to under the arch), so the plaza reads as the large central deck of the target.
export const PLAZA = { x: -92.3, z: -103.3, yaw: -2.55, hu: 80, hv: 40, h: 5, east: 125 } as const;
export const plazaAt = (lx: number, lz: number): [number, number] => [PLAZA.x + lx * Math.cos(PLAZA.yaw) + lz * Math.sin(PLAZA.yaw), PLAZA.z - lx * Math.sin(PLAZA.yaw) + lz * Math.cos(PLAZA.yaw)];
const HERO_EYE: P3 = [-358,148,-437];
export const VOICES_AT = plazaAt(0,-37.5), AIR_AT = plazaAt(66,30);
/** Face point 30 m from a panel toward the hero eye, 8.5 m lower (the panel tilts down about 15 degrees). */
const aimAt = ([x,z]:readonly [number,number], y:number): P3 => { const d = Math.hypot(HERO_EYE[0]-x, HERO_EYE[2]-z); return [x+(HERO_EYE[0]-x)/d*30, y-8.5, z+(HERO_EYE[2]-z)/d*30]; };
// Hero holograms (src/heroHolograms.ts, artifacts/hero-holograms/spec.md): 8 holographic panels at resident scale. Each hangs at a real anchor found by raycast against the
// loaded city (2026-11-02) and faces the pedestrian eye it is meant for, not the hero camera. at = panel centre, w x h = size, face = the world point it turns towards
// (the walkers' eye, lowered so a high panel tilts down by about 10-15 degrees instead of craning), view = the main viewing distance in metres (main word >= view / 40).
// `eye` is only the settled hero camera, kept for the hero visibility and sightline tests.
const EAST = civicAt([75,0,29]); // centre of the Fuji frame's east face, 2 m outside its piers
export const HOLOGRAMS = {
  eye: HERO_EYE,
  panels: [
    // Civic Core (Fuji TV frame) upper media bay; polish2 moved it off the hero-facing north face to the east face, facing the TOWER side.
    {id:'district',at:[EAST[0],88,EAST[2]] as P3,w:48,h:34,face:[EAST[0]+90,62,EAST[2]] as P3,view:120},
    // Daiba station front: Fuji podium north-east face (curved, top 24 m) above the Yurikamome deck, facing the plaza and station forecourt
    {id:'transit',at:civicAt([17.7,20.5,-38]),w:10,h:5,face:civicAt([33.8,16,-59.4]),view:28},
    // Mast on the plaza deck's west perimeter (P4 r2: Aqua City is gone), data panel facing the hero
    {id:'air',at:[AIR_AT[0],29.5,AIR_AT[1]] as P3,w:10,h:5,face:aimAt(AIR_AT,29.5),view:35},
    // Mast at the plaza deck's land-side edge, residents' voice board 11.5 m above the deck facing the hero (P4 r2)
    {id:'voices',at:[VOICES_AT[0],17.5,VOICES_AT[1]] as P3,w:16,h:12,face:aimAt(VOICES_AT,17.5),view:45},
    // Fuji TV media screen below it on the same east face (polish2).
    {id:'culture',at:[EAST[0],48,EAST[2]] as P3,w:44,h:31,face:[EAST[0]+66,26,EAST[2]] as P3,view:85},
  ],
} as const;
// Far backdrop space elevator (2026-11-02): ~7.5 km from the settled hero camera at screen x≈1220/1920, open sea; its anchor sinks ~480 m behind the curved horizon. Heights in metres before curvature.
export const SPACE_ELEVATOR = {x:3130,z:6200,spire:900,station:1150,tether:6000} as const;
// Air-taxi corridors: a district loop above every landmark and tall site, and an approach from the bay that ends above the sphere berth.
export const airLoop: readonly P3[] = Array.from({length:12},(_,i)=>{
  const a=i/12*Math.PI*2;return [SKY_RING.x+Math.cos(a)*SKY_RING.rx,170+Math.sin(a*2)*6,SKY_RING.z+Math.sin(a)*SKY_RING.rz] as const;
});
// polish2: the approach comes in over the enlarged frame's top beams (≈ 182 m) and drops through the open roof to the berth.
export const sphereApproach: readonly P3[] = [[-620,190,-640],[-380,195,-360],[-160,200,-120],[-40,205,15],[0,200,50],[SPHERE_DOCK[0],SPHERE_DOCK[1]+6,SPHERE_DOCK[2]]];
// Air tiers (2127 mobility layers): regional 160–205 m (district loop, sphere approach), city 80–100 m (shore lane), service 30–45 m
// (district quadrotors). The shore lane is one closed loop off the north shore: its inbound leg runs 45 m out at 80 m westward, its
// outbound leg 120 m out at 100 m eastward, so the two directions read as separate lanes. Offsets of a smoothed shore, ending west of
// the AUTO HUB site.
export const shoreLaneInner: readonly P3[] = [[-65,80,-317],[-152,80,-258],[-220,80,-218],[-294,80,-186],[-367,80,-112],[-464,80,-53]];
export const shoreLane: readonly P3[] = [...shoreLaneInner,
  [-520,90,-80],[-503,100,-117],[-413,100,-171],[-339,100,-247],[-254,100,-285],[-193,100,-321],[-108,100,-379],[-50,90,-350]];
// Regional light corridors (ambient: independent of the Meters): three open centre lines at 200–320 m, tuned against the c2 hero pose
// (src/heroCamera.ts; tests/mobility.test.ts) so that every sample in front of the camera projects in the upper sky band and clear of the
// title block and the top-right HUD (`heroTextZone`). A behind the Civic Core, B diagonal from the upper right toward the centre, C low along the bay horizon. Each corridor is
// a bundle of two lanes SKY_LANE_GAP m apart, flown in opposite directions (lane 2k forward, 2k+1 reversed).
export const SKY_LANE_GAP = 24;
const skyCentres: readonly (readonly P3[])[] = [
  // P6: only the low bay-horizon corridor C stays (below the Sky Ring deck, behind the skyline); A and B streaked across the hero's upper sky.
  [[2180,200,2960],[1450,205,3470],[740,210,3980],[50,215,4480],[-520,218,5100]],
];
export const skyCorridors: readonly (readonly P3[])[] = skyCentres.flatMap(c => [1,-1].map(side => c.map((p,i) => {
  const a=c[Math.max(i-1,0)],b=c[Math.min(i+1,c.length-1)],l=Math.hypot(b[0]-a[0],b[2]-a[2]);
  return [p[0]-side*SKY_LANE_GAP/2*(b[2]-a[2])/l,p[1],p[2]+side*SKY_LANE_GAP/2*(b[0]-a[0])/l] as const;
})));
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
  [[-86,40,18],[-130,40.5,26],[-180,41,34],[-220,40.5,40],[-250,40,44]],
];
const deckTop = PLAZA.h + .6;
/** Elevated white walkways (deck top y at the points): ring plinth to the plaza, plaza to the civic core's landing, plaza to the hull apron. Walkers use them. */
export const plazaWalks: readonly (readonly P3[])[] = [
  [[72,16,-183],[45,13,-178],[...plazaAt(-140,-6),9],[...plazaAt(-128,-5),deckTop],[...plazaAt(-100,2),deckTop],[...plazaAt(-80,8),deckTop],[...plazaAt(-56,8),deckTop]],
  [[...plazaAt(-26,-34),deckTop],[...plazaAt(-16,-48),deckTop],[...plazaAt(-14,-60),11],[-34,15,-66],[-50,15.5,-48],[-46,12,-28],[-40,7.5,-14],[-36,3,-2]],
  [[...plazaAt(56,-8),deckTop],[...plazaAt(68,-10),deckTop],[...plazaAt(92,-10),12],[-176,16,-42],[-200,16,-22],[-210,11,0],[-214,6,14],[-214,3,26]],
];
// Planted mid-level decks (r6 pass 3, target v2's tree-lined middle layer; 5.2 m lawn bed down the middle). Raycast-checked against the
// environment, landmarks and Fuji chassis: clear between their docked ends, and off every survey site's line of sight from the hero pose.
export const gardenDecks: readonly (readonly P3[])[] = [
  // DECKS south face over the open ground to a landing on Aqua City's planted roof (30 m).
  // The 151 m tower down to DECKS' east face at 42 m.
  [[252,42,-346],[250,42,-315],[232,42,-290],[195,42,-281],[168,42,-280]],
];

// Survey change sites on Odaiba open ground the hero pose can see, clear of roads, landmarks and the guideway (tests/odaiba.test.ts).
// x/z: metres in the Odaiba scene. w/d/h: the builders' own units (h = tallest variant); scale: metres per unit at the site root. place = the name guests read.
// nw automation hub on the waterfront west of DECKS, ne park on the seaside lawn, sw commons between Aqua City and Hilton, se tower east of Fuji TV.
// Hub and tower sit on different hero bearings (30° / 40°) so they never stack into one silhouette.
export const changeSites = {
  nw:{name:'AUTO HUB',place:'デックス西',x:43,z:-300,w:16,d:24,h:32,scale:3},
  ne:{name:'PARK',place:'お台場海浜公園',x:-210,z:-135,w:10,d:10,h:8,scale:4},
  sw:{name:'COMMONS PLAZA',place:'アクアシティ南',x:-105,z:60,w:12,d:10,h:5,scale:4},
  se:{name:'TOWER',place:'フジテレビ東',x:182,z:-38,w:14,d:14,h:46,scale:3},
} as const;

/** The NW lot before the grown AUTO HUB plinth (R4): `coastalCanopy` still claims its greedy cluster lattice against it, so the lot growth leaves every other cluster, court and tower where it was. */
export const HUB_LEGACY_LOT = {x:40,z:-300,w:8,d:7,scale:3} as const;

// 2127 retrofit (src/odaiba2127.ts). Sky bridges at 24 m between facade points found by raycast; each clear of all other geometry.
export const skyBridges: readonly {name:string;from:P3;to:P3}[] = [
  // P4 r1: Aqua City became the plaza deck (plazaDeck.ts); both bridges began at its facades, so they are gone (the plaza walkways replace them).
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
