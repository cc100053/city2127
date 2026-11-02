import * as T from 'three';
import { bake } from './cityRig.ts';
import { curveBeyondPlate } from './bayContext.ts';
import { SPACE_ELEVATOR } from './layout.ts';
import { HERO_POSITION } from './heroCamera.ts';

// 軌道エレベーター: a far backdrop silhouette, ~7.5 km beyond the Civic Core, right of it in the hero frame. Its anchor island sinks
// behind the curved sea, so guests see only a hazed spire, one transfer station and the tether climbing out of frame. No Meters.
// Unlit and fog-free (exp² fog would erase it at this range): every frame it takes the fog colour, a shade darker, and at night its
// station windows, docking bays, tether joints, climber pods and spire beacons glow faintly instead.
const mat = () => new T.MeshBasicMaterial({ fog: false }), body = mat(), lamp = mat(), pane = mat(), beacon = mat();
// Volume (owner R3): a soft fixed key light from the left-front rounds the spire and tether and darkens disc undersides; the lower
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
const LAMP = new T.Color('#8ce5d8').multiplyScalar(.9), PANE = new T.Color('#ffcf8a').multiplyScalar(.8), BEACON = new T.Color('#ff4a3a').multiplyScalar(.75), luminance = (c: T.Color) => .2126 * c.r + .7152 * c.g + .0722 * c.b;

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
  const { spire, tether, station } = SPACE_ELEVATOR, cyl = (rt: number, rb: number, h: number, n: number, open = false) => new T.CylinderGeometry(rt, rb, h, n, 1, open);
  const toCam = Math.atan2(HERO_POSITION[2] - SPACE_ELEVATOR.z, HERO_POSITION[0] - SPACE_ELEVATOR.x), coneR = (y: number) => 2000 - 1760 * y / spire;
  // R5 (owner 2026-11-02): detail that still reads at 7 km, all from a few primitives. Heights are root-local metres.
  // Spire: the R4 cone, eight buttress fins on its flanks, three ring bands carrying red aviation beacons, and a collar under the station.
  add(cyl(240, 2000, spire, 32), body, spire / 2);
  const run = 880, dr = coneR(0) - coneR(run), len = Math.hypot(dr, run), tilt = Math.atan2(dr, run);
  for (let k = 0; k < 8; k++) {
    const fin = polar(new T.BoxGeometry(150, len, 60), body, .2 + k * Math.PI / 4, (coneR(0) + coneR(run)) / 2 + 75 * Math.cos(tilt), run / 2 + 75 * Math.sin(tilt)); fin.rotation.z = tilt;
  }
  for (const y of [250, 500, 720]) {
    add(cyl(coneR(y) + 40, coneR(y) + 40, 30, 32), body, y);
    for (let k = 0; k < 8; k++) polar(new T.BoxGeometry(40, 20, 40), beacon, .2 + (k + .5) * Math.PI / 4, coneR(y) + 50, y);
  }
  add(cyl(260, 300, 130, 24), body, spire + 65);
  // Transfer station: three decks stepping inward under a cap, a window band round each, 24 docking bays with a parked craft, a hub with twelve spokes under D1.
  for (const [y, rt, rb, h] of [[1150, 1400, 1300, 70], [1235, 1100, 1050, 80], [1320, 760, 720, 80], [1385, 460, 520, 50]]) {
    add(cyl(rt, rb, h, 48), body, y);
    if (h > 50) add(cyl((rt + rb) / 2 + 6, (rt + rb) / 2 + 6, h * .45, 48, true), pane, y);
  }
  add(cyl(1405, 1405, 24, 48, true), lamp, station + 35);
  for (let k = 0; k < 24; k++) {
    const a = k * Math.PI / 12;
    polar(new T.BoxGeometry(140, 40, 90), body, a, 1430, station); polar(new T.BoxGeometry(30, 12, 30), lamp, a, 1478, station + 26); polar(new T.BoxGeometry(70, 22, 36), body, a, 1520, station + 31);
  }
  add(cyl(320, 280, 120, 24), body, station - 70);
  for (let k = 0; k < 12; k++) polar(new T.BoxGeometry(1030, 40, 40), body, k * Math.PI / 6 + .1, 835, station - 45).rotation.z = 4 * Math.PI / 180;
  // Tether: a thick sleeve with a joint ring (and a thin lamp band) every 300 m, two guide tracks either side of the camera-facing line, four climber pods on the camera side.
  const base = spire + 130, tall = tether - base, mid = (tether + base) / 2;
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
    pane.color.copy(tone.body).multiplyScalar(.72).lerp(PANE, tone.glow); beacon.color.copy(tone.body).lerp(BEACON, tone.glow);
    haze.value.copy(s.fog.color); glowLit.value = 1 - tone.glow;
  };
  return root;
}
