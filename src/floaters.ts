import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { megaRib } from './megastructures.ts';

// P2 (city-taste-v2): the floating civic chamber in its crossed field rings. Metres. The self-assembling building that stood in front of the hull
// was removed (owner 2026-11-20: its floating modules overlapped each other and the hull's terraces); the hull's forecourt takes its ground.
export const FLOATER = { x: -175, y: 205, z: 203, r: 31, equator: 53.5, tilted: 48, shell: 59 };

const flat = (g: T.BufferGeometry, m?: T.Matrix4) => { const f = g.index ? g.toNonIndexed() : g.clone(); f.deleteAttribute('uv'); if (m) f.applyMatrix4(m); return f; };
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1));
const merged = (list: T.BufferGeometry[], material: T.Material, name: string) => { const m = new T.Mesh(mergeGeometries(list), material); m.name = name; list.forEach(g => g.dispose()); return m; };
const glow = (color: string, opacity: number) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
const emitMat = glow('#a9d6ff', .25);
const windows = new T.MeshStandardMaterial({ color: '#2b3238', roughness: .25, metalness: .5 });
const metal = new T.MeshStandardMaterial({ color: '#d3d8db', metalness: .45, roughness: .32 });
const ringGlow = new T.MeshStandardMaterial({ color: '#dff1ff', emissive: '#dff1ff', emissiveIntensity: 1.4, roughness: .5 });
// Fresnel rim of the field-edge shell: invisible face-on, a cool bright edge at the silhouette.
const fieldMat = new T.ShaderMaterial({
  uniforms: { k: { value: .8 } }, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.FrontSide,
  vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix * normal); vec4 p = modelViewMatrix * vec4(position, 1.); v = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
  fragmentShader: 'uniform float k; varying vec3 n; varying vec3 v; void main(){ float f = pow(1. - abs(dot(normalize(n), normalize(v))), 3.); gl_FragColor = vec4(vec3(.62, .82, 1.) * f * k, f * k); }',
});

const live: { floater?: T.Group; ringH?: T.Object3D; ringV?: T.Object3D } = {};

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

/** Floating chamber (10 draw calls). */
export function floaters() { const root = new T.Group(); root.name = 'floaters'; root.add(floater()); return root; }

/** `now` is the city clock in seconds; `night` 0..1 strengthens every glow. */
export function updateFloaters(now: number, night: number) {
  const { floater: f, ringH, ringV } = live; if (!f) return;
  f.position.y = FLOATER.y + Math.sin(now * Math.PI * 2 / 9) * 1.5;
  ringH!.rotation.z = now * Math.PI * 2 / 40; ringV!.rotation.z = -now * Math.PI * 2 / 40;
  fieldMat.uniforms.k.value = .8 + night * .6; ringGlow.emissiveIntensity = 1.4 + night * 1.6; emitMat.opacity = .25 + night * .25;
}
