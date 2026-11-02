import * as T from 'three';
import { bake } from './cityRig.ts';
import { curveBeyondPlate } from './bayContext.ts';
import { SPACE_ELEVATOR } from './layout.ts';
import { HERO_POSITION } from './heroCamera.ts';

// 軌道エレベーター: a far backdrop silhouette, ~7.5 km beyond the Civic Core, right of it in the hero frame. Its anchor island sinks
// behind the curved sea, so guests see only a hazed column, one transfer station and the tether climbing out of frame. No Meters.
// Unlit and fog-free (exp² fog would erase it at this range): every frame it takes the fog colour, a shade darker, and at night its
// station windows, docking bays, tether joints, climber pods and cap beacons glow faintly instead.
const mat = () => new T.MeshBasicMaterial({ fog: false }), body = mat(), lamp = mat(), pane = mat(), beacon = mat();
// Volume (owner R3): a soft fixed key light from the left-front rounds the column and tether and darkens disc undersides; the lower
// parts fade into the haze colour so the mass sits behind the horizon instead of reading as a flat cutout. `lit` 0 = no shading (lamps at night).
const haze = { value: new T.Color() };
function shaded(material: T.MeshBasicMaterial, lit: { value: number }) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { haze, lit });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHeight;varying vec3 vNormalW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeight=position.y;vNormalW=normal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 haze;uniform float lit;varying float vHeight;varying vec3 vNormalW;')
      .replace('#include <opaque_fragment>', `float key=.8+.34*max(dot(normalize(vNormalW),normalize(vec3(-.75,.35,-.55))),0.)-.12*max(-vNormalW.y,0.);
      outgoingLight=mix(outgoingLight,mix(outgoingLight*key,haze,.55*(1.-smoothstep(300.,1500.,vHeight))),lit);
      #include <opaque_fragment>`);
  };
  curveBeyondPlate(material);
}
const bodyLit = { value: 1 }, glowLit = { value: 1 };
shaded(body, bodyLit); for (const m of [lamp, pane, beacon]) shaded(m, glowLit);
const LAMP = new T.Color('#8ce5d8').multiplyScalar(.9), PANE = new T.Color('#ffcf8a').multiplyScalar(.6), BEACON = new T.Color('#ff4a3a').multiplyScalar(.6), luminance = (c: T.Color) => .2126 * c.r + .7152 * c.g + .0722 * c.b;

/** Shade darker than the haze (day) and glow strength (night) for a given fog colour. */
export function elevatorTone(fog: T.Color) {
  const night = 1 - T.MathUtils.smoothstep(luminance(fog), .08, .35);
  return { body: fog.clone().multiplyScalar(T.MathUtils.lerp(.86, .75, night)), glow: night };
}

export function spaceElevator(scene: T.Scene) {
  const root = new T.Group(); root.name = 'space-elevator'; root.position.set(SPACE_ELEVATOR.x, 0, SPACE_ELEVATOR.z);
  const parts = new T.Group();
  const add = (geometry: T.BufferGeometry, material: T.Material, y: number, x = 0, z = 0) => { const m = new T.Mesh(geometry, material); m.position.set(x, y, z); parts.add(m); return m; };
  // A part at polar (angle, radius) about the tether, its local +x pointing outward.
  const polar = (geometry: T.BufferGeometry, material: T.Material, angle: number, r: number, y: number) => { const m = add(geometry, material, y, Math.cos(angle) * r, Math.sin(angle) * r); m.rotation.order = 'YZX'; m.rotation.y = -angle; return m; };
  const { tether } = SPACE_ELEVATOR, cyl = (rt: number, rb: number, h: number, n: number, open = false) => new T.CylinderGeometry(rt, rb, h, n, 1, open);
  const toCam = Math.atan2(HERO_POSITION[2] - SPACE_ELEVATOR.z, HERO_POSITION[0] - SPACE_ELEVATOR.x), col = 1080;
  // R6 (owner 2026-11-02): no wide cone. A slim column carries the station, which is thick enough to show side faces to the low hero camera.
  // Column (sinks into the horizon haze) with three joint collars, each with a thin lamp band like the tether rings.
  add(cyl(300, 360, col, 24), body, col / 2);
  for (const y of [400, 700, 950]) { add(cyl(380, 380, 40, 24), body, y); add(cyl(383, 383, 10, 24, true), lamp, y); }
  // Transfer station: three decks stepping inward under a cap, a continuous window band round each, 16 docking bays with a parked craft, a hub with eight spokes under D1.
  for (const [y, rt, rb, h] of [[1150, 1400, 1320, 180], [1320, 1080, 1040, 160], [1470, 740, 700, 140], [1575, 440, 500, 70]]) {
    add(cyl(rt, rb, h, 48), body, y);
    if (h > 70) add(cyl((rt + rb) / 2 + 6, (rt + rb) / 2 + 6, h * .4, 48, true), pane, y);
  }
  add(cyl(1405, 1405, 24, 48, true), lamp, 1150 + 90 - 12);
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8;
    polar(new T.BoxGeometry(100, 40, 70), body, a, 1420, 1150); polar(new T.BoxGeometry(30, 12, 30), lamp, a, 1455, 1176); polar(new T.BoxGeometry(60, 20, 32), body, a, 1495, 1180);
  }
  for (let k = 0; k < 4; k++) polar(new T.BoxGeometry(40, 20, 40), beacon, k * Math.PI / 2 + Math.PI / 4, 420, 1620);
  add(cyl(380, 340, 100, 24), body, 1010);
  for (let k = 0; k < 8; k++) polar(new T.BoxGeometry(1320 - 380, 30, 30), body, k * Math.PI / 4 + .1, (1320 + 380) / 2, 1150 - 90 - 18);
  // Tether: a thick sleeve with a joint ring (and a thin lamp band) every 300 m, two guide tracks either side of the camera-facing line, four climber pods on the camera side.
  const tall = tether - col, mid = (tether + col) / 2;
  add(cyl(140, 150, tall, 16), body, mid);
  for (let y = 1500; y <= 5700; y += 300) { add(cyl(178, 178, 30, 16), body, y); add(cyl(181, 181, 8, 16, true), lamp, y); }
  for (const side of [-1, 1]) add(new T.BoxGeometry(40, tall, 40), body, mid, Math.cos(toCam + side * Math.PI / 2) * 165, Math.sin(toCam + side * Math.PI / 2) * 165);
  for (const y of [1700, 2350, 3100, 4000]) {
    const x = Math.cos(toCam) * 230, z = Math.sin(toCam) * 230;
    add(new T.CapsuleGeometry(170, 200, 4, 12), body, y, x, z); add(cyl(173, 173, 26, 12, true), lamp, y, x, z);
  }
  const meshes = bake(parts);
  for (const mesh of meshes) { mesh.castShadow = mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.name = 'space-elevator'; }
  root.add(...meshes); scene.add(root);
  // Windows, lamps and beacons share the body's tone by day (so they vanish into it) and light up at night.
  meshes[0].onBeforeRender = (_r, s) => {
    if (!(s.fog instanceof T.FogExp2)) return;
    const tone = elevatorTone(s.fog.color);
    body.color.copy(tone.body); lamp.color.copy(tone.body).lerp(LAMP, tone.glow);
    pane.color.copy(tone.body).multiplyScalar(.45).lerp(PANE, tone.glow); beacon.color.copy(tone.body).lerp(BEACON, tone.glow);
    haze.value.copy(s.fog.color); glowLit.value = 1 - tone.glow;
  };
  return root;
}

// R1 mid-distance close-up LOD (artifacts/elevator-closeup-lod/spec.md): a lit, detailed station for poses ~5 km out. Built lazily on the first
// setActive(true); while active it hides the far R6 root. Lit by the scene sun/ambient, but fog-free with its own height haze toward the fog colour.
const nearHaze = { value: new T.Color() }, nearDown = { value: .42 }, nearHazeAmount = { value: 1 }; // underside darkening and haze strength, both eased with the night
function hazed<M extends T.Material>(material: M) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { nearHaze, nearDown, nearHazeAmount });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHeight,vDown;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeight=(modelMatrix*vec4(transformed,1.)).y;vDown=max(-(modelMatrix*vec4(normal,0.)).y,0.);'); // world y before curvature: climbers move
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 nearHaze;uniform float nearDown,nearHazeAmount;varying float vHeight,vDown;')
      .replace('#include <opaque_fragment>', '\n#ifdef STANDARD\noutgoingLight=mix(outgoingLight,vec3(dot(outgoingLight,vec3(.333))),.35*vDown);outgoingLight*=1.-nearDown*vDown;\n#endif\noutgoingLight=mix(outgoingLight,nearHaze,nearHazeAmount*(.05+.8*(1.-smoothstep(150.,1000.,vHeight))));\n#include <opaque_fragment>');
  };
  curveBeyondPlate(material); return material;
}
const nearBody = hazed(new T.MeshStandardMaterial({ color: '#dedad2', roughness: .7, metalness: .1, fog: false })),
  nearDark = hazed(new T.MeshStandardMaterial({ color: '#6f7882', roughness: .7, metalness: .1, fog: false })),
  nearGlass = hazed(new T.MeshStandardMaterial({ color: '#8fa3b4', roughness: .3, emissive: '#ffcf8a', emissiveIntensity: 0, fog: false })),
  nearGreen = hazed(new T.MeshStandardMaterial({ color: '#6f8a5a', roughness: .9, fog: false })),
  nearMint = hazed(new T.MeshBasicMaterial({ color: '#8ce5d8', fog: false })), nearBeacon = hazed(new T.MeshBasicMaterial({ color: '#ff4a3a', fog: false }));
const NEAR_BODY = new T.Color('#dedad2'), NEAR_DARK = new T.Color('#6f7882'), NEAR_MINT = new T.Color('#8ce5d8'), NEAR_RED = new T.Color('#ff4a3a').multiplyScalar(1.6), tmp = new T.Color();
/** Climber loop: each climbs from inside the station to above the frame in 40 s. */
export const NEAR_CLIMB = [1650, 3400] as const;

export function spaceElevatorNear(scene: T.Scene, far: T.Object3D) {
  const root = new T.Group(); root.name = 'space-elevator-near'; root.position.set(SPACE_ELEVATOR.x, 0, SPACE_ELEVATOR.z); root.visible = false; scene.add(root);
  const climbers = new T.Group(); climbers.name = 'near-climbers';
  let built = false, active = false;
  const build = () => {
    const parts = new T.Group(), { tether } = SPACE_ELEVATOR, col = 1080, tall = tether - col, mid = (tether + col) / 2, toCam = Math.atan2(HERO_POSITION[2] - SPACE_ELEVATOR.z, HERO_POSITION[0] - SPACE_ELEVATOR.x);
    const cyl = (rt: number, rb: number, h: number, n = 48, open = false) => new T.CylinderGeometry(rt, rb, h, n, 1, open), box = (x: number, y: number, z: number) => new T.BoxGeometry(x, y, z);
    const add = (geometry: T.BufferGeometry, material: T.Material, y: number, x = 0, z = 0) => { const m = new T.Mesh(geometry, material); m.position.set(x, y, z); parts.add(m); return m; };
    const polar = (geometry: T.BufferGeometry, material: T.Material, angle: number, r: number, y: number) => { const m = add(geometry, material, y, Math.cos(angle) * r, Math.sin(angle) * r); m.rotation.order = 'YZX'; m.rotation.y = -angle; return m; };
    const rand = (k: number) => { const v = Math.sin(k * 12.9898) * 43758.5453; return v - Math.floor(v); };
    // Column with 12 recessed channels (tilted to follow the taper) and three collars with a mint band.
    add(cyl(300, 360, col, 32), nearBody, col / 2);
    // Slots sit centred on the tapered surface (r = 360 - 60 y / 1080); pilasters stand 6 m proud of it between them.
    for (let k = 0; k < 12; k++) {
      const tilt = Math.atan(60 / col), rs = 360 - 60 * 470 / col;
      polar(box(24, 820, 36), nearDark, k * Math.PI / 6, rs, 470).rotation.z = tilt; polar(box(14, 820, 14), nearBody, (k + .5) * Math.PI / 6, rs + 6, 470).rotation.z = tilt;
    }
    for (const y of [400, 700, 950]) { add(cyl(385, 385, 50), nearBody, y); add(cyl(388, 388, 12, 48, true), nearMint, y); }
    add(cyl(560, 380, 160), nearBody, 990); add(cyl(440, 440, 10, 48, true), nearMint, 960);
    // 20 beams from the hub to D1's rim, sloping 6 degrees down toward the hub.
    for (let k = 0; k < 20; k++) polar(box(940, 60, 40), nearBody, k * Math.PI / 10 + .05, 850, 1020).rotation.z = Math.PI / 30;
    // Decks, each with a recessed window band between two thin lips; planting ring on D1 and D2.
    for (const [y, rt, rb, h] of [[1150, 1400, 1320, 180], [1320, 1080, 1040, 160], [1470, 740, 700, 140], [1575, 440, 500, 70]]) {
      add(cyl(rt, rb, h), nearBody, y);
      if (h <= 70) continue;
      const rAt = (yy: number) => rb + (rt - rb) * (yy - (y - h / 2)) / h, bh = h * .28;
      add(cyl(rAt(y + bh / 2) + 3, rAt(y - bh / 2) + 3, bh), nearGlass, y); // 3 m proud of the deck, 3 m behind the lips: reads recessed
      for (const s of [1, -1]) { const yl = y + s * (bh / 2 + 5), r = rAt(yl) + 6; add(cyl(r, r, 10), nearBody, yl); }
      // Mullions across the band, tilted with the deck's taper, so it reads as separate windows.
      const n = { 1150: 36, 1320: 28, 1470: 20 }[y]!;
      for (let k = 0; k < n; k++) polar(box(8, bh + 4, 26), nearBody, (k + .5) * Math.PI * 2 / n, rAt(y) + 3, y).rotation.z = Math.atan((rb - rt) / h);
    }
    const clump = new T.IcosahedronGeometry(30, 0);
    // Planting stands on the deck edges, where the low camera sees it in silhouette.
    for (const [y, edge, n] of [[1248, 1370, 64], [1408, 1050, 64], [1540, 730, 32]]) for (let k = 0; k < n; k++) {
      if (rand(k * 5 + y + 1) > .55) continue; // irregular groups with gaps
      const a = (k + rand(k + y)) / n * Math.PI * 2, r = edge + (rand(k * 3 + y) - .5) * 40, s = .6 + rand(k + 7) * .6, m = add(clump, nearGreen, y, Math.cos(a) * r, Math.sin(a) * r);
      m.scale.set(s, .7 * s, s);
    }
    // 16 docking bays with a parked craft, and 48 mint dashes under D1's rim.
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8;
      polar(box(100, 40, 70), nearDark, a, 1375, 1060); polar(box(90, 18, 34), nearBody, a, 1450, 1060); polar(box(40, 10, 24), nearGlass, a, 1450, 1074);
    }
    for (let k = 0; k < 48; k++) polar(box(10, 10, 70), nearMint, (k + .5) * Math.PI / 24, 1340, 1060); // offset half a step: clear of the bays
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; polar(cyl(4, 4, 90, 6), nearBody, a, 300, 1655); polar(box(12, 12, 12), nearBeacon, a, 300, 1706); }
    // Tether: sleeve, joint rings with a mint band, two guide rails either side of the camera line.
    add(cyl(140, 150, tall, 24), nearBody, mid);
    for (let y = 1500; y <= 5700; y += 300) { add(cyl(178, 178, 30, 24), nearBody, y); add(cyl(181, 181, 8, 24, true), nearMint, y); }
    for (const side of [-1, 1]) add(box(40, tall, 40), nearDark, mid, Math.cos(toCam + side * Math.PI / 2) * 165, Math.sin(toCam + side * Math.PI / 2) * 165);
    const meshes = bake(parts);
    for (const mesh of meshes) { mesh.castShadow = mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.name = 'space-elevator-near'; }
    root.add(...meshes, climbers);
    // Climbers share the rail line on the camera side; update() slides them.
    const pod = new T.Group(), part = (g: T.BufferGeometry, m: T.Material, y = 0) => { const o = new T.Mesh(g, m); o.position.y = y; o.frustumCulled = false; pod.add(o); };
    part(new T.CapsuleGeometry(46, 420, 4, 12), nearBody); for (const y of [-150, -90, -30, 30, 90, 150]) part(cyl(48, 48, 18, 12, true), nearGlass, y); for (const y of [-230, 230]) part(cyl(54, 54, 10, 12, true), nearMint, y);
    for (let k = 0; k < 3; k++) { const c = pod.clone(), a = toCam + (k % 2 ? -1 : 1) * Math.PI / 2; c.position.set(Math.cos(a) * 215, 1650, Math.sin(a) * 215); climbers.add(c); } // on the rails, just outside them
    built = true;
  };
  return {
    root,
    setActive(on: boolean) { if (on && !built) build(); active = on; root.visible = on; far.visible = !on; },
    /** `dark` 0 = day … 1 = night, as main.ts's frame loop computes it. */
    update(now: number, dark: number) {
      if (!active) return;
      if (scene.fog) nearHaze.value.copy(scene.fog.color);
      nearGlass.emissiveIntensity = .75 * dark; nearDown.value = .42 + .23 * dark; nearHazeAmount.value = 1 - .5 * dark; nearMint.color.copy(NEAR_BODY).lerp(NEAR_MINT, .4).lerp(tmp.copy(NEAR_MINT).multiplyScalar(2.5), dark); nearBeacon.color.copy(NEAR_BODY).lerp(NEAR_RED, dark);
      nearBody.color.copy(NEAR_BODY).multiplyScalar(1 - .6 * dark); nearDark.color.copy(NEAR_DARK).multiplyScalar(1 - .6 * dark); // night: the shell falls to dark navy under the scene's night light
      climbers.children.forEach((c, k) => { c.position.y = NEAR_CLIMB[0] + (NEAR_CLIMB[1] - NEAR_CLIMB[0]) * ((now / 40 + k / 3) % 1); });
    },
  };
}
