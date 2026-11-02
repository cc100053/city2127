import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { megaGlass, megaSeam, megaShell } from './megastructures.ts';
import { HULL } from './megaFootprints.ts';

// P2 (city-taste-v2): the floating civic chamber in its crossed field rings, and a self-assembling building in front of the hull. Metres.
export const FLOATER = { x: -180, y: 195, z: 212, r: 27.5, equator: 47.5, tilted: 42.5, shell: 52.5 };
// Free ground in front of the hull (clear of its footprint), turned with the hull.
export const ASSEMBLY = { x: -232, z: 6, yaw: HULL.yaw, base: 28, storeys: 3, storey: 4.2, modules: 5, cycle: 30 };
export const ASSEMBLY_TOP = ASSEMBLY.storeys * ASSEMBLY.storey;

const flat = (g: T.BufferGeometry, m?: T.Matrix4) => { const f = g.index ? g.toNonIndexed() : g.clone(); f.deleteAttribute('uv'); if (m) f.applyMatrix4(m); return f; };
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1));
const merged = (list: T.BufferGeometry[], material: T.Material, name: string) => { const m = new T.Mesh(mergeGeometries(list), material); m.name = name; list.forEach(g => g.dispose()); return m; };
const glow = (color: string, opacity: number) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
const beamMat = glow('#b9e0ff', .5), emitMat = glow('#a9d6ff', .35);
const windows = new T.MeshStandardMaterial({ color: '#4b5258', roughness: .3, metalness: .4 });
// Fresnel rim of the field-edge shell: invisible face-on, a cool bright edge at the silhouette.
const fieldMat = new T.ShaderMaterial({
  uniforms: { k: { value: .5 } }, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.FrontSide,
  vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix * normal); vec4 p = modelViewMatrix * vec4(position, 1.); v = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
  fragmentShader: 'uniform float k; varying vec3 n; varying vec3 v; void main(){ float f = pow(1. - abs(dot(normalize(n), normalize(v))), 3.); gl_FragColor = vec4(vec3(.62, .82, 1.) * f * k, f * k); }',
});

const live: { floater?: T.Group; ringH?: T.Object3D; ringV?: T.Object3D; modules?: T.InstancedMesh; beams?: T.InstancedMesh } = {};
export const socket = (i: number) => { const a = i / ASSEMBLY.modules * Math.PI * 2 + .4; return new T.Vector3(Math.cos(a) * 7, 0, Math.sin(a) * 7); };
const moduleSize = (i: number) => 14 + (i % 3) * 2;

function floater() {
  const g = new T.Group(); g.name = 'floater'; g.position.set(FLOATER.x, FLOATER.y, FLOATER.z);
  const R = FLOATER.r, body: T.BufferGeometry[] = [flat(new T.SphereGeometry(R, 48, 32))], seam: T.BufferGeometry[] = [], strips: T.BufferGeometry[] = [], jets: T.BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) seam.push(flat(new T.TorusGeometry(R + .1, .12, 4, 64), at(0, 0, 0, 0, i * Math.PI / 12, 0)));
  seam.push(flat(new T.TorusGeometry(R + .15, .35, 4, 64), at(0, 0, 0, Math.PI / 2)));
  for (const a of [.5, 2.3, 4.1]) strips.push(flat(new T.TorusGeometry(R * .9, 1.1, 3, 10, .55), at(0, R * .43, 0, Math.PI / 2, 0, a))); // dark window strips on the upper hemisphere
  for (let i = 0; i < 4; i++) { // under-emitter pods: body in the shell batch, lit disc in the seam batch, a cool cone below
    const a = i / 4 * Math.PI * 2 + .4, x = Math.cos(a) * 11, z = Math.sin(a) * 11, y = -Math.sqrt(R * R - 121);
    body.push(flat(new T.CylinderGeometry(2.2, 2.6, 3.4, 12), at(x, y - 1.2, z)));
    seam.push(flat(new T.CylinderGeometry(1.7, 1.7, .5, 12), at(x, y - 3, z)));
    jets.push(flat(new T.CylinderGeometry(.4, 2.6, 18, 10, 1, true), at(x, y - 3.2 - 9, z)));
  }
  g.add(merged(body, megaShell, 'floater-body'), merged(seam, megaSeam, 'floater-seams'), merged(strips, windows, 'floater-windows'), merged(jets, emitMat, 'floater-emit'));
  const ringGeom = (radius: number) => { // a slim glowing tube with six proud dashes, so the turn reads
    const list = [flat(new T.TorusGeometry(radius, 1.2, 6, 96))];
    for (let i = 0; i < 6; i++) list.push(flat(new T.TorusGeometry(radius, 2.1, 6, 8, .3), at(0, 0, 0, 0, 0, i * Math.PI / 3)));
    return list;
  };
  const ringH = merged(ringGeom(FLOATER.equator), megaSeam, 'floater-ring-h'), flatRing = new T.Group(); ringH.rotation.x = Math.PI / 2; flatRing.add(ringH);
  const ringV = merged(ringGeom(FLOATER.tilted), megaSeam, 'floater-ring-v'), tilt = new T.Group(); tilt.rotation.set(0, .6, 70 * Math.PI / 180); tilt.add(ringV);
  const shell = new T.Mesh(new T.SphereGeometry(FLOATER.shell, 40, 24), fieldMat); shell.name = 'floater-field';
  g.add(flatRing, tilt, shell);
  Object.assign(live, { floater: g, ringH, ringV });
  return g;
}

function assembly() {
  const g = new T.Group(); g.name = 'assembly'; g.position.set(ASSEMBLY.x, 0, ASSEMBLY.z); g.rotation.y = ASSEMBLY.yaw;
  const { base, storeys, storey } = ASSEMBLY, shell: T.BufferGeometry[] = [], glass: T.BufferGeometry[] = [];
  for (let s = 0; s < storeys; s++) { // finished storeys of the partial core: white slab and glazed floor; the last one is an open frame
    shell.push(flat(new T.BoxGeometry(base, .8, base), at(0, s * storey + .4, 0)));
    if (s < storeys - 1) glass.push(flat(new T.BoxGeometry(base - 1, storey - .8, base - 1), at(0, s * storey + .8 + (storey - .8) / 2, 0)));
    else for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) shell.push(flat(new T.BoxGeometry(.8, storey - .8, .8), at(x * (base / 2 - .6), s * storey + storey / 2 + .4, z * (base / 2 - .6))));
  }
  const top = ASSEMBLY_TOP, c = base / 2 - 2; // slim gantry arm: mast, joint and boom reaching over the sockets
  shell.push(flat(new T.BoxGeometry(1.6, 12, 1.6), at(c, top + 6, c)), flat(new T.BoxGeometry(2.4, 2.4, 2.4), at(c, top + 12, c)), flat(new T.BoxGeometry(1, 1, 22), at(c, top + 12, c - 11)));
  g.add(merged(shell, megaShell, 'assembly-core'), merged(glass, megaGlass, 'assembly-glass'));
  // Module: a pale glass cube with a white frame (12 edges) and three floor bands, coloured per vertex so one draw call carries both finishes.
  const paint = (g: T.BufferGeometry, hex: string) => { const f = flat(g), c = new T.Color(hex), n = f.attributes.position.count; f.setAttribute('color', new T.Float32BufferAttribute(Array.from({ length: n }, () => [c.r, c.g, c.b]).flat(), 3)); return f; };
  const parts = [paint(new T.BoxGeometry(.94, .94, .94), '#8fa8b6')], e = .5, t = .07;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(paint(new T.BoxGeometry(t, 1, t), '#ffffff').applyMatrix4(at(x * e, 0, z * e)));
  for (const [y, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(paint(new T.BoxGeometry(1, t, t), '#ffffff').applyMatrix4(at(0, y * e, z * e)), paint(new T.BoxGeometry(t, t, 1), '#ffffff').applyMatrix4(at(z * e, y * e, 0)));
  for (const y of [-.17, .17]) parts.push(paint(new T.BoxGeometry(1.01, .05, 1.01), '#ffffff').applyMatrix4(at(0, y, 0)));
  const modules = new T.InstancedMesh(mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .35, metalness: .15 }), ASSEMBLY.modules); modules.name = 'assembly-modules'; modules.frustumCulled = false;
  const beams = new T.InstancedMesh(new T.CylinderGeometry(.15, 1.6, 1, 8, 1, true).translate(0, .5, 0), beamMat, ASSEMBLY.modules); beams.name = 'assembly-beams'; beams.frustumCulled = false;
  for (let i = 0; i < ASSEMBLY.modules; i++) modules.setColorAt(i, new T.Color(i % 2 ? '#dfe8ee' : '#ffffff'));
  g.add(modules, beams); Object.assign(live, { modules, beams });
  return g;
}

/** Floating chamber and self-assembling building (10 draw calls). */
export function floaters() { const root = new T.Group(); root.name = 'floaters'; root.add(floater(), assembly()); return root; }

const ease = (t: number) => t * t * (3 - 2 * t);
const m4 = new T.Matrix4(), unit = new T.Quaternion();
/** `now` is the city clock in seconds; `night` 0..1 strengthens every glow. */
export function updateFloaters(now: number, night: number) {
  const { floater: f, ringH, ringV, modules, beams } = live; if (!f || !modules || !beams) return;
  f.position.y = FLOATER.y + Math.sin(now * Math.PI * 2 / 9) * 1.5;
  ringH!.rotation.z = now * Math.PI * 2 / 40; ringV!.rotation.z = -now * Math.PI * 2 / 40;
  fieldMat.uniforms.k.value = .5 + night * .6; beamMat.opacity = .45 + night * .4; emitMat.opacity = .2 + night * .3;
  for (let i = 0; i < ASSEMBLY.modules; i++) {
    const p = (now / ASSEMBLY.cycle + i / ASSEMBLY.modules) % 1, fade = ease(Math.max(0, Math.min(1, p / .06, (1 - p) / .06))), size = moduleSize(i) * fade;
    const s = socket(i), lift = (16 + i * 11) * (1 - .8 * ease(p)); // drifts toward its socket, then resets
    const sy = ASSEMBLY_TOP + size / 2 + lift;
    m4.compose(new T.Vector3(s.x, sy, s.z), unit, new T.Vector3(size, size, size)); modules.setMatrixAt(i, m4);
    m4.compose(new T.Vector3(s.x, ASSEMBLY_TOP, s.z), unit, new T.Vector3(fade, Math.max(.01, sy - size / 2 - ASSEMBLY_TOP), fade)); beams.setMatrixAt(i, m4);
  }
  modules.instanceMatrix.needsUpdate = beams.instanceMatrix.needsUpdate = true;
}
