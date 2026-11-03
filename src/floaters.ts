import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { megaGlass, megaRib, megaSeam, megaShell } from './megastructures.ts';
import { HULL } from './megaFootprints.ts';

// P2 (city-taste-v2): the floating civic chamber in its crossed field rings, and a self-assembling building in front of the hull. Metres.
export const FLOATER = { x: -175, y: 205, z: 203, r: 31, equator: 53.5, tilted: 48, shell: 59 };
// Free ground in front of the hull (clear of its footprint), turned with the hull.
export const ASSEMBLY = { x: -232, z: 6, yaw: HULL.yaw, base: 28, storeys: 6, storey: 6, modules: 6, cycle: 30 };
export const ASSEMBLY_TOP = ASSEMBLY.storeys * ASSEMBLY.storey;

const flat = (g: T.BufferGeometry, m?: T.Matrix4) => { const f = g.index ? g.toNonIndexed() : g.clone(); f.deleteAttribute('uv'); if (m) f.applyMatrix4(m); return f; };
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1));
const merged = (list: T.BufferGeometry[], material: T.Material, name: string) => { const m = new T.Mesh(mergeGeometries(list), material); m.name = name; list.forEach(g => g.dispose()); return m; };
const glow = (color: string, opacity: number) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
const beamMat = glow('#cfe8ff', .45), emitMat = glow('#a9d6ff', .25);
const windows = new T.MeshStandardMaterial({ color: '#2b3238', roughness: .25, metalness: .5 });
const metal = new T.MeshStandardMaterial({ color: '#d3d8db', metalness: .45, roughness: .32 });
const ringGlow = new T.MeshStandardMaterial({ color: '#dff1ff', emissive: '#dff1ff', emissiveIntensity: 1.4, roughness: .5 });
const moduleGlass = new T.MeshStandardMaterial({ color: '#7fb6e0', emissive: '#1f4a6e', emissiveIntensity: .3, roughness: .1, metalness: .2, transparent: true, opacity: .55, depthWrite: false });
// Fresnel rim of the field-edge shell: invisible face-on, a cool bright edge at the silhouette.
const fieldMat = new T.ShaderMaterial({
  uniforms: { k: { value: .8 } }, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.FrontSide,
  vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix * normal); vec4 p = modelViewMatrix * vec4(position, 1.); v = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
  fragmentShader: 'uniform float k; varying vec3 n; varying vec3 v; void main(){ float f = pow(1. - abs(dot(normalize(n), normalize(v))), 3.); gl_FragColor = vec4(vec3(.62, .82, 1.) * f * k, f * k); }',
});

const live: { floater?: T.Group; ringH?: T.Object3D; ringV?: T.Object3D; modules?: T.InstancedMesh; glass?: T.InstancedMesh; beams?: T.InstancedMesh } = {};
export const socket = (i: number) => { const a = i / ASSEMBLY.modules * Math.PI * 2 + .4; return new T.Vector3(Math.cos(a) * 7, 0, Math.sin(a) * 7); };
const moduleSize = (i: number) => 16 + (i % 3) * 2;

function floater() {
  const g = new T.Group(); g.name = 'floater'; g.position.set(FLOATER.x, FLOATER.y, FLOATER.z);
  const R = FLOATER.r, body: T.BufferGeometry[] = [flat(new T.SphereGeometry(R, 48, 32))], ribs: T.BufferGeometry[] = [], discs: T.BufferGeometry[] = [], jets: T.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) ribs.push(flat(new T.TorusGeometry(R + .1, .3, 4, 64), at(0, 0, 0, 0, i * Math.PI / 8, 0))); // panel grid: 8 meridians x 4 latitudes
  for (const y of [-.6, -.2, .2, .6]) ribs.push(flat(new T.TorusGeometry(Math.sqrt(1 - y * y) * (R + .1), .3, 4, 64), at(0, y * R, 0, Math.PI / 2)));
  const band = flat(new T.SphereGeometry(R + .25, 64, 1, 0, Math.PI * 2, .8, .2)); // dark window band around the upper third
  for (let i = 0; i < 4; i++) { // under-emitter pods: body in the metal batch, a bright disc on the underside, a cool cone below
    const a = i / 4 * Math.PI * 2 + .4, x = Math.cos(a) * 12, z = Math.sin(a) * 12, y = -Math.sqrt(R * R - 144);
    body.push(flat(new T.CylinderGeometry(2.6, 3, 3.6, 12), at(x, y - 1.2, z)));
    discs.push(flat(new T.CylinderGeometry(2.1, 2.1, .5, 16), at(x, y - 3.2, z)));
    jets.push(flat(new T.CylinderGeometry(.4, 3, 18, 10, 1, true), at(x, y - 3.5 - 9, z)));
  }
  g.add(merged(body, metal, 'floater-body'), merged(ribs, megaRib, 'floater-ribs'), merged([band], windows, 'floater-windows'), merged(discs, ringGlow, 'floater-discs'), merged(jets, emitMat, 'floater-emit'));
  const ringGeom = (radius: number, tube: number) => { // a thick glowing tube with six proud dashes, so the turn reads
    const list = [flat(new T.TorusGeometry(radius, tube, 8, 96))];
    for (let i = 0; i < 6; i++) list.push(flat(new T.TorusGeometry(radius, tube * 1.6, 8, 8, .3), at(0, 0, 0, 0, 0, i * Math.PI / 3)));
    return list;
  };
  const eq = ringGeom(FLOATER.equator, 2.6); eq.push(flat(new T.TorusGeometry(FLOATER.equator + 8, 1, 6, 96))); // the second, thinner band 3 m outside
  const ringH = merged(eq, ringGlow, 'floater-ring-h'), flatRing = new T.Group(); ringH.rotation.x = Math.PI / 2; flatRing.add(ringH);
  const ringV = merged(ringGeom(FLOATER.tilted, 2.6), ringGlow, 'floater-ring-v'), tilt = new T.Group(); tilt.rotation.set(0, .6, 70 * Math.PI / 180); tilt.add(ringV);
  const shell = new T.Mesh(new T.SphereGeometry(FLOATER.shell, 40, 24), fieldMat); shell.name = 'floater-field';
  g.add(flatRing, tilt, shell);
  Object.assign(live, { floater: g, ringH, ringV });
  return g;
}

function assembly() {
  const g = new T.Group(); g.name = 'assembly'; g.position.set(ASSEMBLY.x, 0, ASSEMBLY.z); g.rotation.y = ASSEMBLY.yaw;
  const { base, storeys, storey } = ASSEMBLY, shell: T.BufferGeometry[] = [], glass: T.BufferGeometry[] = [], seams: T.BufferGeometry[] = [];
  for (let s = 0; s < storeys; s++) { // finished storeys of the partial core: white slab and glazed floor; the last one is an open frame
    shell.push(flat(new T.BoxGeometry(base, .8, base), at(0, s * storey + .4, 0)));
    if (s < storeys - 1) glass.push(flat(new T.BoxGeometry(base - 1, storey - .8, base - 1), at(0, s * storey + .8 + (storey - .8) / 2, 0)));
    else for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) shell.push(flat(new T.BoxGeometry(.8, storey - .8, .8), at(x * (base / 2 - .6), s * storey + storey / 2 + .4, z * (base / 2 - .6))));
  }
  const top = ASSEMBLY_TOP, c = base / 2 - 2, mast = 58; // gantry: a tall mast, a joint ring and a boom reaching over the sockets
  shell.push(flat(new T.BoxGeometry(1.8, mast, 1.8), at(c, top + mast / 2, c)), flat(new T.BoxGeometry(1.2, 1.2, 26), at(c, top + mast - 2, c - 13)));
  seams.push(flat(new T.TorusGeometry(2.2, .5, 6, 24), at(c, top + mast - 2, c, Math.PI / 2)));
  for (let i = 0; i < ASSEMBLY.modules; i++) { const p = socket(i); seams.push(flat(new T.TorusGeometry(2.2, .35, 6, 24), at(p.x, top + .3, p.z, Math.PI / 2))); } // bright socket rings
  g.add(merged(shell, megaShell, 'assembly-core'), merged(glass, megaGlass, 'assembly-glass'), merged(seams, megaSeam, 'assembly-sockets'));
  // Module: a white frame (12 edges + 2 floor bands) in one instanced mesh and clear blue glass faces in another.
  const e = .5, t = .07, frame: T.BufferGeometry[] = [];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) frame.push(flat(new T.BoxGeometry(t, 1, t), at(x * e, 0, z * e)));
  for (const [y, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) frame.push(flat(new T.BoxGeometry(1, t, t), at(0, y * e, z * e)), flat(new T.BoxGeometry(t, t, 1), at(z * e, y * e, 0)));
  for (const y of [-.17, .17]) frame.push(flat(new T.BoxGeometry(1.01, .05, 1.01), at(0, y, 0)));
  const n = ASSEMBLY.modules, modules = new T.InstancedMesh(mergeGeometries(frame), megaShell, n), glassCubes = new T.InstancedMesh(new T.BoxGeometry(.96, .96, .96), moduleGlass, n);
  const beams = new T.InstancedMesh(new T.CylinderGeometry(1.25, .5, 1, 8, 1, true).translate(0, .5, 0), beamMat, n);
  for (const [m, name] of [[modules, 'assembly-modules'], [glassCubes, 'assembly-module-glass'], [beams, 'assembly-beams']] as const) { m.name = name; m.frustumCulled = false; g.add(m); }
  Object.assign(live, { modules, glass: glassCubes, beams });
  return g;
}

/** Floating chamber and self-assembling building (16 draw calls). */
export function floaters() { const root = new T.Group(); root.name = 'floaters'; root.add(floater(), assembly()); return root; }

const ease = (t: number) => t * t * (3 - 2 * t);
const m4 = new T.Matrix4(), unit = new T.Quaternion();
/** `now` is the city clock in seconds; `night` 0..1 strengthens every glow. */
export function updateFloaters(now: number, night: number) {
  const { floater: f, ringH, ringV, modules, glass, beams } = live; if (!f || !modules || !glass || !beams) return;
  f.position.y = FLOATER.y + Math.sin(now * Math.PI * 2 / 9) * 1.5;
  ringH!.rotation.z = now * Math.PI * 2 / 40; ringV!.rotation.z = -now * Math.PI * 2 / 40;
  fieldMat.uniforms.k.value = .8 + night * .6; ringGlow.emissiveIntensity = 1.4 + night * 1.6; moduleGlass.emissiveIntensity = .3 + night * .6;
  beamMat.opacity = .45 + night * .35; emitMat.opacity = .25 + night * .25;
  for (let i = 0; i < ASSEMBLY.modules; i++) {
    const p = (now / ASSEMBLY.cycle + i / ASSEMBLY.modules) % 1, fade = ease(Math.max(0, Math.min(1, p / .06, (1 - p) / .06))), size = moduleSize(i) * fade;
    const s = socket(i), lift = (20 + i * 10) * (1 - .7 * ease(p)); // drifts toward its socket, then resets
    const sy = ASSEMBLY_TOP + size / 2 + lift;
    m4.compose(new T.Vector3(s.x, sy, s.z), unit, new T.Vector3(size, size, size)); modules.setMatrixAt(i, m4); glass.setMatrixAt(i, m4);
    m4.compose(new T.Vector3(s.x, ASSEMBLY_TOP, s.z), unit, new T.Vector3(fade, Math.max(.01, sy - size / 2 - ASSEMBLY_TOP), fade)); beams.setMatrixAt(i, m4);
  }
  modules.instanceMatrix.needsUpdate = glass.instanceMatrix.needsUpdate = beams.instanceMatrix.needsUpdate = true;
}
