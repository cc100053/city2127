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
