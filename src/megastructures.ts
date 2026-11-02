import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plantCanopy } from './coastalCanopy.ts';

// P1 (city-taste-v2): the three colossal megastructures of the master target — ring-on-edge building, white arch, stepped terraced hull.
// Ground contacts and sizes are exported for the test and for carving the context massing they replace. Metres.
export const RING = { x: 95, z: -195, centreY: 90, outer: 105, inner: 73, depth: 45, yaw: -2.05 + .8, plinth: [60, 50] as const };
export const ARCH = { a: [-9, -237] as const, b: [58, -5] as const, apex: 135 };
export const HULL = { x: -210, z: 135, yaw: .0416, length: 240, depth: 90, steps: 7, step: 11 };

/** Finishes shared by all three pieces; the seam glows with the night. */
export const megaShell = new T.MeshStandardMaterial({ color: '#eef1f2', roughness: .32, metalness: .45 });
export const megaRib = new T.MeshStandardMaterial({ color: '#c9d0d4', roughness: .4, metalness: .55 });
export const megaSeam = new T.MeshStandardMaterial({ color: '#cfe8ff', emissive: '#cfe8ff', emissiveIntensity: .6, roughness: .5 });
export const megaGlass = new T.MeshStandardMaterial({ color: '#6b7780', roughness: .14, metalness: .4 });
const megaJoint = new T.MeshStandardMaterial({ color: '#4b5258', roughness: .6, metalness: .3 });
export const updateMegastructures = (night: number) => { megaSeam.emissiveIntensity = .6 + night * 1.6; };

type Batch = Map<T.Material, T.BufferGeometry[]>;
/** Queue a geometry (placed by `m`) under a material; everything is normalised so per-material merging always succeeds. */
function put(batch: Batch, material: T.Material, g: T.BufferGeometry, m?: T.Matrix4) {
  const flat = g.index ? g.toNonIndexed() : g.clone();
  flat.deleteAttribute('uv'); if (m) flat.applyMatrix4(m);
  (batch.get(material) ?? batch.set(material, []).get(material)!).push(flat);
}
/** Turn a surface inside out (inner faces of the ring). */
function flip(g: T.BufferGeometry) {
  const f = g.index ? g.toNonIndexed() : g, p = f.attributes.position as T.BufferAttribute, n = f.attributes.normal as T.BufferAttribute;
  for (let i = 0; i < p.count; i += 3) for (const a of [p, n]) { const x = a.getX(i + 1), y = a.getY(i + 1), z = a.getZ(i + 1); a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2)); a.setXYZ(i + 2, x, y, z); }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return f;
}
const mat = (pos: T.Vector3Like, rot?: T.Euler, scale?: T.Vector3) => new T.Matrix4().compose(new T.Vector3(pos.x, pos.y, pos.z), new T.Quaternion().setFromEuler(rot ?? new T.Euler()), scale ?? new T.Vector3(1, 1, 1));
const unitBox = new T.BoxGeometry(1, 1, 1);
/** A thin box between two points (seam lines, rail segments). */
function bar(batch: Batch, material: T.Material, a: T.Vector3, b: T.Vector3, w: number, h: number) {
  const d = b.clone().sub(a), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), d.clone().normalize());
  put(batch, material, unitBox, new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), q, new T.Vector3(w, h, d.length() + .02)));
}

// ---- A. Ring-on-edge building: local frame, ring in XY, axis +Z, centred on the hoop; the group is turned by `yaw` and lifted to centreY.
function ring(batch: Batch, trees: { position: number[]; scale: number; type: string }[]) {
  const { outer, inner, depth, plinth, centreY } = RING, half = depth / 2, L = (r: number, h: number) => new T.CylinderGeometry(r, r, h, 96, 1, true).rotateX(Math.PI / 2);
  const place = (x: number, y: number, z: number) => { const v = new T.Vector3(x, y, z).applyAxisAngle(new T.Vector3(0, 1, 0), RING.yaw); return [RING.x + v.x, centreY + v.y, RING.z + v.z] as const; };
  const world = new T.Matrix4().compose(new T.Vector3(RING.x, centreY, RING.z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), RING.yaw), new T.Vector3(1, 1, 1));
  const add = (material: T.Material, g: T.BufferGeometry, m?: T.Matrix4) => put(batch, material, g, m ? world.clone().multiply(m) : world);
  const Z = new T.Vector3(0, 0, 1);
  // Outer skin, both face annuli, a glazed band on each face and the inner skin as stepped glass storeys between shell slabs every 4.2 m.
  add(megaShell, L(outer, depth));
  for (const s of [1, -1]) {
    const q = new T.Matrix4().makeRotationY(s > 0 ? 0 : Math.PI);
    add(megaShell, new T.RingGeometry(inner, outer, 96), q.clone().setPosition(0, 0, s * half));
    add(megaGlass, new T.RingGeometry(inner + 9, inner + 20, 96), q.clone().setPosition(0, 0, s * (half + 1.3)));
    add(megaSeam, new T.RingGeometry(inner, inner + 1.6, 96), q.clone().setPosition(0, 0, s * (half + .8)));
    add(megaSeam, L(outer + .15, 1.2), new T.Matrix4().makeTranslation(0, 0, s * (half - 1.4))); // two light bands along the outer edges
  }
  // Outer ribs every 6° (1.5 m proud, running across the hoop depth) and radial ribs on both faces every 6°.
  const rib = new T.BoxGeometry(1.5, 1.4, depth), fin = new T.BoxGeometry(outer - inner - 2, 1, .8);
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2, rz = new T.Matrix4().makeRotationZ(a);
    add(megaRib, rib, rz.clone().setPosition(Math.cos(a) * (outer + .6), Math.sin(a) * (outer + .6), 0));
    for (const s of [1, -1]) add(megaRib, fin, rz.clone().setPosition(Math.cos(a) * (inner + outer) / 2, Math.sin(a) * (inner + outer) / 2, s * (half + 1.3)));
  }
  const bands = 10, bh = depth / bands;
  for (let b = 0; b < bands; b++) {
    const z = -half + (b + .5) * bh;
    add(megaGlass, flip(L(inner, bh - 1.1)), new T.Matrix4().makeTranslation(0, 0, z));
    add(megaShell, flip(L(inner - 1.5 - (b % 2) * .8, 1.1)), new T.Matrix4().makeTranslation(0, 0, z + bh / 2));
  }
  // Planted ledges on the lower inner arc (crowns go through the shared canopy instancer) and the service rail with three static pods.
  for (const z of [-half + bh * 2, -half + bh * 5, -half + bh * 8]) {
    const shape = new T.Shape(); shape.absarc(0, 0, inner, -Math.PI * .78, -Math.PI * .22, false); shape.absarc(0, 0, inner - 5.5, -Math.PI * .22, -Math.PI * .78, true);
    add(megaShell, new T.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 24 }), new T.Matrix4().makeTranslation(0, 0, z - .5));
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI * (.26 + .48 * i / 25), r = inner - 2.8 - (i % 2) * 1.3, p = place(Math.cos(a) * r, Math.sin(a) * r + 1, z);
      trees.push({ position: [p[0], -p[2], p[1]], scale: 1.0 + (i % 3) * .2, type: i % 5 === 0 ? 'columnar' : 'broadleaf' });
    }
  }
  const rail = new T.TorusGeometry(inner - 1.2, .45, 6, 64, Math.PI * 1.2);
  add(megaRib, rail, new T.Matrix4().makeRotationZ(-Math.PI * 1.1).setPosition(0, 0, 0));
  for (const a of [-1.2, -.9, -2]) add(megaShell, new T.BoxGeometry(5, 2.2, 3.2), new T.Matrix4().makeRotationZ(a - Math.PI / 2).setPosition(Math.cos(a) * (inner - 2.4), Math.sin(a) * (inner - 2.4), 0));
  // Plinth carrying the hoop base, below ground by 15 m, with a seam frame where it meets the ground.
  const pTop = 6, pBot = -15, py = (pTop + pBot) / 2 - centreY;
  add(megaShell, new T.BoxGeometry(plinth[0], pTop - pBot, plinth[1]), new T.Matrix4().makeTranslation(0, py, 0));
  for (const [sx, sz, w, d] of [[0, 1, plinth[0] + 1, .8], [0, -1, plinth[0] + 1, .8], [1, 0, .8, plinth[1] + 1], [-1, 0, .8, plinth[1] + 1]] as const)
    add(megaSeam, new T.BoxGeometry(w, .5, d), new T.Matrix4().makeTranslation(sx * plinth[0] / 2, .3 - centreY, sz * plinth[1] / 2));
  void Z;
}

// ---- B. Giant white arch: parabola swept with a tapering rounded section.
function arch(batch: Batch, tops: [number, number][]) {
  const f1 = new T.Vector3(ARCH.a[0], 0, ARCH.a[1]), f2 = new T.Vector3(ARCH.b[0], 0, ARCH.b[1]), span = f2.clone().sub(f1), N = 32;
  const point = (t: number) => f1.clone().addScaledVector(span, t).setY(ARCH.apex * 4 * t * (1 - t) - 2);
  const tangent = (t: number) => point(t + 1e-3).sub(point(t - 1e-3)).normalize();
  let S = span.clone().setY(0).normalize().cross(new T.Vector3(0, 1, 0)).normalize();
  if (new T.Vector3().crossVectors(tangent(.5), S).y < 0) S = S.negate();
  type Sec = { hw: number; hh: number; os?: number; ou?: number; k?: number };
  /** Sweep a superellipse section between t0..t1 (right-handed S, U, T; outward normals). */
  const sweep = (t0: number, t1: number, steps: number, sec: (t: number) => Sec) => {
    const M = 12, pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = t0 + (t1 - t0) * i / steps, T3 = tangent(t), U = new T.Vector3().crossVectors(T3, S).normalize(), c = point(t), { hw, hh, os = 0, ou = 0, k = 3 } = sec(t);
      for (let j = 0; j < M; j++) {
        const a = j / M * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), x = Math.sign(ca) * Math.abs(ca) ** (2 / k) * hw + os, y = Math.sign(sa) * Math.abs(sa) ** (2 / k) * hh + ou;
        pos.push(c.x + S.x * x + U.x * y, c.y + S.y * x + U.y * y, c.z + S.z * x + U.z * y);
      }
    }
    for (let i = 0; i < steps; i++) for (let j = 0; j < M; j++) { const A = i * M + j, B = i * M + (j + 1) % M, C = A + M, D = B + M; idx.push(A, B, C, B, D, C); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const width = (t: number) => 1.45 * (9 + 5 * Math.abs(2 * t - 1) ** 1.6);
  put(batch, megaShell, sweep(0, 1, N, t => ({ hw: width(t) / 2, hh: width(t) * .36 })));
  // Seam along each edge of the inner (underside) face; joints every ~20 m (≈ 330 m of arc).
  for (const side of [1, -1]) put(batch, megaSeam, sweep(.01, .99, N, t => ({ hw: .4, hh: .35, os: side * width(t) * .36, ou: -width(t) * .36 - .1, k: 2 })));
  for (let j = 1; j < 16; j++) { const t = j / 16; put(batch, megaJoint, sweep(t - .0013, t + .0013, 1, () => ({ hw: width(t) / 2 + .15, hh: width(t) * .36 + .15 }))); }
  // Foot collars with an emitter seam.
  for (const f of [f1, f2]) {
    put(batch, megaShell, new T.CylinderGeometry(11.5, 12.5, 4, 32), mat({ x: f.x, y: 2, z: f.z }));
    put(batch, megaSeam, new T.CylinderGeometry(11.7, 11.7, .7, 32), mat({ x: f.x, y: 4.2, z: f.z }));
  }
  tops.push([point(.5).x, point(.5).z]);
}

// ---- C. Stepped terraced mega-hull; local depth 0 is the camera-facing front, +depth the back.
function hull(batch: Batch, trees: { position: number[]; scale: number; type: string }[]) {
  const { length, depth, steps, step } = HULL, root = new T.Matrix4().compose(new T.Vector3(HULL.x, 0, HULL.z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), HULL.yaw), new T.Vector3(1, 1, 1));
  const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), HULL.yaw);
  const world = (u: number, d: number, y: number) => new T.Vector3(u, y, d).applyQuaternion(q).add(new T.Vector3(HULL.x, 0, HULL.z));
  /** Plan outline of terrace k: bowed front (toward the camera), straight back; `grow` pushes it outward by the lip. */
  const front = (k: number, grow: number, n = 24) => {
    const L2 = length / 2 - k * 5 + grow;
    return Array.from({ length: n + 1 }, (_, i) => { const u = -L2 + 2 * L2 * i / n; return [u, k * 12.4 - grow - 11 * (1 - (u / (length / 2)) ** 2)] as [number, number]; });
  };
  const slab = (k: number, y: number, h: number, grow: number, material: T.Material) => {
    const f = front(k, grow), shape = new T.Shape(); shape.moveTo(f[0][0], -f[0][1]); f.forEach(([u, d]) => shape.lineTo(u, -d));
    const L2 = f[f.length - 1][0]; shape.lineTo(L2, -depth); shape.lineTo(-L2, -depth);
    put(batch, material, new T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2), root.clone().multiply(new T.Matrix4().makeTranslation(0, y, 0)));
  };
  for (let k = 0; k < steps; k++) {
    const y0 = k * step, f = front(k, 0);
    slab(k, y0, step - 2.4, 0, megaGlass);
    slab(k, y0 + step - 2.4, 2.4, 1.2, megaShell);
    slab(k, y0 + 5, .9, .5, megaShell); // thin mid-storey slab: two storeys per terrace
    const fl = front(k, 1.2);
    for (let i = 0; i < fl.length - 1; i++) { // seam line at the terrace lip
      const a = world(fl[i][0], fl[i][1] - .1, y0 + step - 1), b = world(fl[i + 1][0], fl[i + 1][1] - .1, y0 + step - 1); bar(batch, megaSeam, a, b, .55, .5);
    }
    // vertical rib fins about every 12 m on the glass front
    const fin = new T.BoxGeometry(.9, step - 2.4, 1.1);
    for (let u = -length / 2 + k * 5 + 6; u < length / 2 - k * 5 - 2; u += 12) {
      const dd = k * 12.4 - 11 * (1 - (u / (length / 2)) ** 2), p = world(u, dd - .3, y0 + (step - 2.4) / 2);
      put(batch, megaRib, fin, new T.Matrix4().compose(p, q, new T.Vector3(1, 1, 1)));
    }
    // dense planted lip: a crown about every 4 m, set back from the edge
    for (let i = 0; i < f.length - 1; i += 1) for (const e of [0, .5]) {
      const u = f[i][0] + (f[i + 1][0] - f[i][0]) * e, d = f[i][1] + (f[i + 1][1] - f[i][1]) * e + 2.5 + (i % 3) * 1.8, p = world(u, d, y0 + step);
      trees.push({ position: [p.x, -p.z, p.y], scale: .7 + (i % 3) * .12, type: (i + k) % 6 === 0 ? 'columnar' : 'broadleaf' });
    }
  }
}

const rect = (cx: number, cz: number, ux: number, uz: number, hu: number, hv: number) => ({ cx, cz, ux, uz, hu, hv });
/** Ground footprints (centre, unit axis, half extents along axis and across it) of what each piece stands on; the test and the carve use them. */
export const groundContacts = () => ({
  ring: rect(RING.x, RING.z, Math.cos(RING.yaw), -Math.sin(RING.yaw), RING.plinth[0] / 2, RING.plinth[1] / 2),
  archFeet: [ARCH.a, ARCH.b].map(f => rect(f[0], f[1], 1, 0, 12.5, 12.5)),
  hull: rect(HULL.x, HULL.z + HULL.depth / 2 - 8, Math.cos(HULL.yaw), -Math.sin(HULL.yaw), HULL.length / 2, HULL.depth / 2 + 8),
});
/** Context massing under or inside a megastructure's body: the whole hoop's shadow, the arch's span and the hull's footprint. */
export function bodyFootprints() {
  const d = new T.Vector2(ARCH.b[0] - ARCH.a[0], ARCH.b[1] - ARCH.a[1]);
  return [
    rect(RING.x, RING.z, Math.cos(RING.yaw), -Math.sin(RING.yaw), RING.outer + 4, RING.depth / 2 + 6),
    rect((ARCH.a[0] + ARCH.b[0]) / 2, (ARCH.a[1] + ARCH.b[1]) / 2, d.x / d.length(), d.y / d.length(), d.length() / 2 + 6, 14),
    rect(HULL.x, HULL.z + HULL.depth / 2 - 20, Math.cos(HULL.yaw), -Math.sin(HULL.yaw), HULL.length / 2 + 10, HULL.depth / 2 + 20),
  ];
}
export const inRect = (r: ReturnType<typeof rect>, x: number, z: number) => { const dx = x - r.cx, dz = z - r.cz; return Math.abs(dx * r.ux + dz * r.uz) <= r.hu && Math.abs(-dx * r.uz + dz * r.ux) <= r.hv; };

/** Remove context-massing triangles whose centre lies in a megastructure footprint (they are replaced, not overlapped). */
export function carveContext(environment: T.Object3D) {
  const zones = bodyFootprints(), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  environment.updateMatrixWorld(true);
  environment.traverse(object => {
    if (!(object instanceof T.Mesh) || !object.name.startsWith('CTX_')) return;
    const g = object.geometry as T.BufferGeometry, p = g.attributes.position, src = g.index, n = src?.count ?? p.count, keep: number[] = [];
    const at = (i: number) => src ? src.getX(i) : i;
    for (let i = 0; i < n; i += 3) {
      a.fromBufferAttribute(p, at(i)); b.fromBufferAttribute(p, at(i + 1)); c.fromBufferAttribute(p, at(i + 2));
      [a, b, c].forEach(v => v.applyMatrix4(object.matrixWorld));
      const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3;
      if (!zones.some(z => inRect(z, cx, cz))) keep.push(at(i), at(i + 1), at(i + 2));
    }
    if (keep.length !== n) g.setIndex(keep);
  });
}

/** The three megastructures, one merged mesh per finish plus the planted crowns. */
export function megastructures(): T.Group {
  const root = new T.Group(); root.name = 'megastructures';
  const batch: Batch = new Map(), trees: { position: number[]; scale: number; type: string }[] = [], tops: [number, number][] = [];
  ring(batch, trees); arch(batch, tops); hull(batch, trees);
  for (const [material, list] of batch) {
    const mesh = new T.Mesh(mergeGeometries(list), material); mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'megastructure'; root.add(mesh); list.forEach(g => g.dispose());
  }
  plantCanopy(root, { instances: trees });
  return root;
}
