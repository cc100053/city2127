import * as T from 'three';
import { bake, paint } from './cityRig.ts';
import { bayShores, DISTRICT, gateBridge, rainbowBridge } from './layout.ts';

const ground = paint('#737f78', 1), bridgeWhite = paint('#cfd3d2', .55, .15), gateSteel = paint('#aab5b9', .45, .35);
const skyline = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .9 });
// Far shores recede harder than the Odaiba backdrop: silhouettes in the bay haze, never competing with the district.
for (const material of [ground, bridgeWhite, gateSteel, skyline]) { recedeBeyondDistrict(material, .82); curveBeyondPlate(material); }
const unitBox = new T.BoxGeometry(1, 1, 1), slabBox = new T.BoxGeometry(1, 1, 1, 24, 1, 24);

/** A box spanning a to b (centre line), `width` across and `depth` tall. */
function beam(parent: T.Object3D, a: T.Vector3, b: T.Vector3, width: number, depth: number, material: T.Material) {
  const mesh = new T.Mesh(unitBox, material);
  mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.lookAt(b); mesh.scale.set(width, depth, a.distanceTo(b));
  parent.add(mesh); return mesh;
}
/** Elevated deck along `points` with a pier to the ground every ~60 m. */
function viaduct(parent: T.Object3D, points: readonly (readonly [number, number, number])[], width: number, material: T.Material) {
  const v = points.map(p => new T.Vector3(...p));
  for (let i = 0; i < v.length - 1; i++) {
    beam(parent, v[i], v[i + 1], width, 3, material);
    const n = Math.ceil(v[i].distanceTo(v[i + 1]) / 60);
    for (let j = 1; j <= n; j++) { const p = v[i].clone().lerp(v[i + 1], j / n); beam(parent, new T.Vector3(p.x, 0, p.z), p, 5, 5, material); }
  }
}

// Beyond the district the surveyed ground, roads, guideway and context massing stay as Odaiba's connected backdrop, but lose
// saturation and contrast into the bay haze over DISTRICT.recede metres so detail and attention stay on the hero district.
export function recedeBeyondDistrict(material: T.Material, strength = .35) {
  const compile = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 districtXz;').replace('#include <project_vertex>', '#include <project_vertex>\ndistrictXz=(modelMatrix*vec4(transformed,1.)).xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 districtXz;').replace('#include <fog_fragment>', `#include <fog_fragment>
      vec2 beyond=max(vec2(${DISTRICT.minX.toFixed(1)},${DISTRICT.minZ.toFixed(1)})-districtXz,districtXz-vec2(${DISTRICT.maxX.toFixed(1)},${DISTRICT.maxZ.toFixed(1)}));
      float recede=smoothstep(0.,${DISTRICT.recede.toFixed(1)},length(max(beyond,0.)));
      vec3 muted=mix(mix(vec3(dot(gl_FragColor.rgb,vec3(.299,.587,.114))),gl_FragColor.rgb,.35),fogColor,.45);
      gl_FragColor.rgb=mix(gl_FragColor.rgb,muted,recede*${strength.toFixed(2)});`);
  };
  material.customProgramCacheKey = () => key() + '|district-recede' + strength;
}

// Beyond the surveyed plate (every vertex lies within 1.55 km of the origin) the bay and its far shores fall away on a small
// planet, so the sea ends at a crisp horizon about 4.7° below level from the hero pose, sky shows above it and far skylines sink behind it.
export const EARTH = { plate: 1600, radius: 30000 } as const;
/** Drop world y by the curvature beyond `EARTH.plate`; wrap after any other vertex edit (recede appends after project_vertex). */
export function curveBeyondPlate(material: T.Material) {
  const compile = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `vec4 mvPosition = vec4(transformed, 1.);
      #ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 curved = modelMatrix * mvPosition;
      float fall = max(length(curved.xz) - ${EARTH.plate.toFixed(1)}, 0.);
      curved.y -= fall * fall / ${(2 * EARTH.radius).toFixed(1)};
      mvPosition = viewMatrix * curved;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  material.customProgramCacheKey = () => key() + '|earth-curve';
}

/** Tokyo Bay beyond the plate: neighbouring shores with block skylines and the bridges that tie Odaiba to them. Silhouettes, no shadows. */
export function bayContext() {
  const root = new T.Group(); root.name = 'bay-context';
  const parts = new T.Group();
  let seed = 2127;
  const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  // Shore slabs plus one instanced batch of blocks on the bay's shared street grid; mostly mid-rise with few towers.
  const blocks = new T.InstancedMesh(unitBox, skyline, bayShores.reduce((n, s) => n + s.count, 0));
  const dummy = new T.Object3D(), color = new T.Color();
  let i = 0;
  for (const shore of bayShores) {
    const [x0, x1] = shore.x, [z0, z1] = shore.z;
    const slab = new T.Mesh(slabBox, ground); slab.position.set((x0 + x1) / 2, -.7, (z0 + z1) / 2); slab.scale.set(x1 - x0, 3, z1 - z0); parts.add(slab);
    for (let k = 0; k < shore.count; k++, i++) {
      const w = 25 + random() * 55, d = 25 + random() * 55, h = shore.h[0] + (shore.h[1] - shore.h[0]) * random() ** 2.4;
      dummy.position.set(x0 + w + random() * (x1 - x0 - 2 * w), h / 2 + .8, z0 + d + random() * (z1 - z0 - 2 * d));
      dummy.rotation.set(0, .58, 0); dummy.scale.set(w, h, d); dummy.updateMatrix(); blocks.setMatrixAt(i, dummy.matrix);
      blocks.setColorAt(i, color.setHSL(.58, .1, .46 + random() * .12));
    }
  }
  blocks.name = 'bay-skyline';
  // Rainbow Bridge: portal towers, two main cables, deck and the approach viaducts.
  const s = new T.Vector3(rainbowBridge.shibaura[0], rainbowBridge.deck, rainbowBridge.shibaura[1]);
  const d = new T.Vector3(rainbowBridge.daiba[0], rainbowBridge.deck, rainbowBridge.daiba[1]);
  const along = d.clone().sub(s).normalize(), across = new T.Vector3(-along.z, 0, along.x), side = (s.distanceTo(d) - rainbowBridge.mainSpan) / 2;
  const towers = [s.clone().addScaledVector(along, side), d.clone().addScaledVector(along, -side)];
  beam(parts, s, d, 30, 8, bridgeWhite);
  for (const tower of towers) {
    for (const k of [-17, 17]) { const foot = tower.clone().addScaledVector(across, k).setY(0); beam(parts, foot, foot.clone().setY(rainbowBridge.tower), 7, 7, bridgeWhite); }
    for (const y of [rainbowBridge.deck - 6, 95, rainbowBridge.tower - 4]) beam(parts, tower.clone().addScaledVector(across, -17).setY(y), tower.clone().addScaledVector(across, 17).setY(y), 5, 5, bridgeWhite);
  }
  for (const k of [-15, 15]) {
    const [t0, t1] = towers.map(t => t.clone().addScaledVector(across, k).setY(rainbowBridge.tower - 2));
    const mid = t0.clone().lerp(t1, .5).setY(rainbowBridge.deck + 8);
    const cable = new T.CatmullRomCurve3([s.clone().addScaledVector(across, k).setY(rainbowBridge.deck + 4), t0, t0.clone().lerp(mid, .5).setY(rainbowBridge.deck + 30), mid, t1.clone().lerp(mid, .5).setY(rainbowBridge.deck + 30), t1, d.clone().addScaledVector(across, k).setY(rainbowBridge.deck + 4)]);
    parts.add(new T.Mesh(new T.TubeGeometry(cable, 80, 1.3, 5), bridgeWhite));
  }
  for (const anchorage of [s, d]) { const a = new T.Mesh(unitBox, bridgeWhite); a.position.set(anchorage.x, rainbowBridge.deck / 2, anchorage.z); a.scale.set(45, rainbowBridge.deck + 6, 45); a.lookAt(anchorage.clone().add(along).setY(rainbowBridge.deck / 2)); parts.add(a); }
  for (const approach of rainbowBridge.approaches) viaduct(parts, approach, 20, bridgeWhite);
  // Tokyo Gate Bridge: ramps to a 55 m deck, two facing truss humps crowning over their piers.
  const a = new T.Vector3(gateBridge.from[0], 0, gateBridge.from[1]), b = new T.Vector3(gateBridge.to[0], 0, gateBridge.to[1]);
  const gAlong = b.clone().sub(a).normalize(), gAcross = new T.Vector3(-gAlong.z, 0, gAlong.x), mid = a.clone().lerp(b, .5), half = a.distanceTo(b) / 2;
  const at = (u: number, y: number, k = 0) => mid.clone().addScaledVector(gAlong, u).addScaledVector(gAcross, k).setY(y);
  const deckY = (u: number) => 10 + (gateBridge.deck - 10) * T.MathUtils.smoothstep(half - Math.abs(u), 0, half * .45);
  viaduct(parts, Array.from({ length: 13 }, (_, j) => { const u = -half + j * half / 6; return at(u, deckY(u)).toArray() as [number, number, number]; }), 24, gateSteel);
  const crown = (u: number) => gateBridge.deck + 4 + (gateBridge.crown - gateBridge.deck - 4) * Math.max(0, 1 - Math.abs(Math.abs(u) - 220) / 200) - (Math.abs(u) < 220 ? 12 * (1 - Math.abs(u) / 220) : 0);
  for (const k of [-11, 11]) {
    const chord = new T.CatmullRomCurve3(Array.from({ length: 21 }, (_, j) => at(-400 + j * 40, crown(-400 + j * 40), k)));
    parts.add(new T.Mesh(new T.TubeGeometry(chord, 60, 1.6, 4), gateSteel));
    for (let u = -380; u <= 380; u += 40) beam(parts, at(u, gateBridge.deck, k), at(u, crown(u), k), 1.6, 1.6, gateSteel);
  }
  const merged = bake(parts);
  merged.forEach(mesh => { mesh.name = 'bay-context-static'; mesh.castShadow = false; });
  root.add(...merged, blocks);
  return root;
}
