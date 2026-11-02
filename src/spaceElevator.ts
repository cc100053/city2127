import * as T from 'three';
import { bake } from './cityRig.ts';
import { curveBeyondPlate } from './bayContext.ts';
import { SPACE_ELEVATOR } from './layout.ts';

// 軌道エレベーター: a far backdrop silhouette, ~7.5 km beyond the Civic Core, right of it in the hero frame. Its anchor island sinks
// behind the curved sea, so guests see only a hazed spire, one transfer station and the tether climbing out of frame. No detail, no Meters.
// Unlit and fog-free (exp² fog would erase it at this range): every frame it takes the fog colour, a shade darker, and at night its
// climbers, tether rails and station rim glow faintly instead.
const body = new T.MeshBasicMaterial({ fog: false }), lamp = new T.MeshBasicMaterial({ fog: false });
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
const bodyLit = { value: 1 }, lampLit = { value: 1 };
shaded(body, bodyLit); shaded(lamp, lampLit);
const LAMP = new T.Color('#8ce5d8').multiplyScalar(.9), luminance = (c: T.Color) => .2126 * c.r + .7152 * c.g + .0722 * c.b;

/** Shade darker than the haze (day) and glow strength (night) for a given fog colour. */
export function elevatorTone(fog: T.Color) {
  const night = 1 - T.MathUtils.smoothstep(luminance(fog), .08, .35);
  return { body: fog.clone().multiplyScalar(T.MathUtils.lerp(.86, .75, night)), glow: night };
}

export function spaceElevator(scene: T.Scene) {
  const root = new T.Group(); root.name = 'space-elevator'; root.position.set(SPACE_ELEVATOR.x, 0, SPACE_ELEVATOR.z);
  const parts = new T.Group();
  const add = (geometry: T.BufferGeometry, material: T.Material, y: number) => { const m = new T.Mesh(geometry, material); m.position.y = y; parts.add(m); };
  const { spire, tether, station } = SPACE_ELEVATOR;
  // Owner 2026-11-02: ten times the girth of R2 at the same heights, so it reads as a colossal mass behind the city, not a needle.
  add(new T.CylinderGeometry(240, 2000, spire, 32), body, spire / 2);
  // Transfer station: a flat disc with a thinner rim under it, the one shape that says "elevator" rather than "needle".
  add(new T.CylinderGeometry(1400, 1100, 90, 48), body, station);
  add(new T.CylinderGeometry(700, 400, 160, 32), body, station - 120);
  for (const y of [1800, 2500, 3400]) { add(new T.BoxGeometry(360, 200, 360), body, y); add(new T.BoxGeometry(400, 30, 400), lamp, y); }
  add(new T.CylinderGeometry(90, 110, tether - spire, 16), body, (tether + spire) / 2);
  // Night lights stay thin: four climber rails on the tether and a rim band on the station, never a lit disc.
  for (let k = 0; k < 4; k++) { const rail = new T.Mesh(new T.BoxGeometry(24, tether - spire, 24), lamp); rail.position.set(Math.cos(k * Math.PI / 2 + .4) * 104, (tether + spire) / 2, Math.sin(k * Math.PI / 2 + .4) * 104); parts.add(rail); }
  add(new T.CylinderGeometry(1405, 1405, 24, 48, 1, true), lamp, station + 20);
  const meshes = bake(parts);
  for (const mesh of meshes) { mesh.castShadow = mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.name = 'space-elevator'; }
  root.add(...meshes); scene.add(root);
  // The lamp parts sit inside or flush with the body, so by day they share its tone and vanish into it.
  meshes[0].onBeforeRender = (_r, s) => {
    if (!(s.fog instanceof T.FogExp2)) return;
    const tone = elevatorTone(s.fog.color);
    body.color.copy(tone.body); lamp.color.copy(tone.body).lerp(LAMP, tone.glow);
    haze.value.copy(s.fog.color); lampLit.value = 1 - tone.glow;
  };
  return root;
}
