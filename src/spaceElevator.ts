import * as T from 'three';
import { bake } from './cityRig.ts';
import { curveBeyondPlate } from './bayContext.ts';
import { SPACE_ELEVATOR } from './layout.ts';

// 軌道エレベーター: a far backdrop silhouette, ~7.5 km beyond the Civic Core, right of it in the hero frame. Its anchor island sinks
// behind the curved sea, so guests see only a hazed spire, one transfer station and the tether climbing out of frame. No detail, no Meters.
// Unlit and fog-free (exp² fog would erase it at this range): every frame it takes the fog colour, a shade darker, and at night its
// climbers and a faint tether line glow instead.
const body = new T.MeshBasicMaterial({ fog: false }), lamp = new T.MeshBasicMaterial({ fog: false });
for (const material of [body, lamp]) curveBeyondPlate(material);
const LAMP = new T.Color('#8ce5d8').multiplyScalar(3), luminance = (c: T.Color) => .2126 * c.r + .7152 * c.g + .0722 * c.b;

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
  add(new T.CylinderGeometry(24, 200, spire, 10), body, spire / 2);
  // Transfer station: a flat disc with a thinner rim under it, the one shape that says "elevator" rather than "needle".
  add(new T.CylinderGeometry(140, 110, 26, 24), body, station);
  add(new T.CylinderGeometry(70, 40, 60, 16), body, station - 40);
  for (const y of [1700, 2400, 3300]) { add(new T.BoxGeometry(36, 70, 36), body, y); add(new T.BoxGeometry(40, 10, 40), lamp, y); }
  add(new T.CylinderGeometry(9, 11, tether - spire, 6), lamp, (tether + spire) / 2);
  add(new T.CylinderGeometry(150, 150, 4, 24), lamp, station + 15);
  const meshes = bake(parts);
  for (const mesh of meshes) { mesh.castShadow = mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.name = 'space-elevator'; }
  root.add(...meshes); scene.add(root);
  // The lamp parts sit inside or flush with the body, so by day they share its tone and vanish into it.
  meshes[0].onBeforeRender = (_r, s) => {
    if (!(s.fog instanceof T.FogExp2)) return;
    const tone = elevatorTone(s.fog.color);
    body.color.copy(tone.body); lamp.color.copy(tone.body).lerp(LAMP, tone.glow);
  };
  return root;
}
