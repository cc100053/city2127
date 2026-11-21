import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from './coastalCanopy.ts';

type Form = 'fern' | 'spear' | 'rosette' | 'vine';
export type SlopePlant = { form: Form; base: T.Vector3; width: number; height: number; yaw: number; tint: number };

const leaf = new T.MeshStandardMaterial({ vertexColors: true, roughness: .76, side: T.DoubleSide });
const guide = new T.MeshStandardMaterial({
  color: '#a2d4ba', emissive: '#87dbc9', emissiveIntensity: .22, roughness: .45,
});
export function lightSlopePlants(night: number) {
  guide.emissiveIntensity = .22 + .56 * night;
}

const up = new T.Vector3(0, 1, 0);
const direction = (angle: number) => new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
const stalk = new T.CylinderGeometry(.68, 1, 1, 5).toNonIndexed();
function segment(a: T.Vector3, b: T.Vector3, radius: number) {
  const d = b.clone().sub(a);
  return stalk.clone().scale(radius, d.length(), radius)
    .applyQuaternion(new T.Quaternion().setFromUnitVectors(up, d.normalize()))
    .translate(...a.clone().lerp(b, .5).toArray());
}

// Folded blade with a curved midrib and a light-facing edge.
function blade(a: T.Vector3, b: T.Vector3, across: T.Vector3, width: number, rise: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const [t, span] of [[0, .06], [.34, 1], [.73, .69], [1, .02]]) {
    const p = a.clone().lerp(b, t).addScaledVector(up, rise * Math.sin(t * Math.PI));
    positions.push(...p.clone().addScaledVector(across, -width * span).toArray(),
      ...p.clone().addScaledVector(up, width * span * .3).toArray(),
      ...p.clone().addScaledVector(across, width * span).toArray());
  }
  for (let i = 0; i < 9; i += 3) indices.push(i, i + 3, i + 1, i + 1, i + 3, i + 4, i + 1, i + 4, i + 2, i + 2, i + 4, i + 5);
  const g = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(positions, 3)).setIndex(indices);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

function plantForm(form: Form) {
  const foliage: T.BufferGeometry[] = [], guides: T.BufferGeometry[] = [];
  const color = new T.Color();
  const add = (g: T.BufferGeometry, pigment: string) => {
    color.set(pigment);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
    g.deleteAttribute('uv');
    g.setAttribute('color', new T.BufferAttribute(colors, 3));
    foliage.push(g);
  };
  const base = new T.Vector3();
  const greens = ['#307053', '#63aa68', '#8bc178', '#428f66'];
  if (form === 'fern' || form === 'vine') {
    const fern = form === 'fern';
    const count = 7;
    const fork = new T.Vector3(0, fern ? .39 : .025, 0);
    add(segment(base.clone().setY(-.09), fork, .046), '#557753');
    for (let i = 0; i < count; i++) {
      const angle = fern ? -1.8 + i * .65 : -.96 + i * .32;
      const along = direction(angle), across = direction(angle + Math.PI / 2);
      const length = (fern ? .63 : .36) + hash(i + 19) * .31;
      const height = fern ? .15 + hash(i + 4) * .51 : -.57 - hash(i + 4) * .43;
      const point = (t: number) => fork.clone().addScaledVector(along, t * length)
        .addScaledVector(up, height * t + (fern ? .28 : .21) * Math.sin(Math.PI * t));
      if (fern) add(blade(point(.25), point(1), across, .105, .12), greens[(i + 1) % greens.length]);
      for (let j = 0; j < 4; j++) add(segment(point(j / 4), point((j + 1) / 4), .017 - j * .0025), '#83bc8a');
      for (let j = 0; j < 6; j++) {
        const t = .21 + j * .133;
        const spread = (fern ? .39 : .20) * Math.sin(Math.PI * (t * .94 + .05));
        const start = point(t);
        for (const side of fern ? [-1, 1] : [j % 2 ? -1 : 1]) {
          const tip = start.clone().addScaledVector(across, side * spread)
            .addScaledVector(along, .06 + spread * .36).addScaledVector(up, fern ? .13 : -.10);
          add(blade(start, tip, along, spread * (fern ? .37 : .65), .036), greens[(i + j) % greens.length]);
        }
      }
      if (fern && i % 2 === 0) for (const t of [.32, .5, .68, .84]) {
        guides.push(segment(point(t), point(t + .034).addScaledVector(up, .008), .018));
      }
    }
  } else {
    const reed = form === 'spear';
    add(segment(base.clone().setY(-.1), base.clone().setY(.15), .065), '#597f5a');
    for (let i = 0; i < (reed ? 7 : 11); i++) {
      const angle = i * 2.39996;
      const along = direction(angle), across = direction(angle + Math.PI / 2);
      const tip = along.multiplyScalar(reed ? .16 + hash(i + 2) * .56 : .48 + hash(i + 2) * .48);
      tip.y = reed ? .6 + hash(i + 7) * .54 : .04 + hash(i + 7) * .67;
      const width = reed ? .092 : .17 + hash(i + 5) * .09;
      const rise = reed ? -.11 : .24;
      add(blade(base, tip, across, width, rise), greens[i % greens.length]);
      if (reed) {
        for (let j = 1; j <= 7; j++) {
          const midrib = (t: number) => tip.clone().multiplyScalar(t)
            .addScaledVector(up, rise * Math.sin(Math.PI * t) + .028);
          guides.push(segment(midrib(j / 9), midrib(j / 9 + .048), .029));
        }
      } else if (i % 3 === 0) {
        add(segment(base, tip.clone().multiplyScalar(.36).addScaledVector(up, .23), .023), '#9ec18b');
      }
    }
  }
  const foliageGeometry = mergeGeometries(foliage);
  const guideGeometry = guides.length ? mergeGeometries(guides) : undefined;
  for (const g of [...foliage, ...guides]) g.dispose();
  return { foliageGeometry, guideGeometry };
}

/** Root at soil height. Width is the radial reach and height is the rise, or hanging drop for a vine. */
export function slopePlants(plants: readonly SlopePlant[]) {
  const group = new T.Group();
  group.name = 'slope-plants';
  const pose = new T.Object3D(), tint = new T.Color();
  const lights: T.BufferGeometry[] = [];
  for (const form of ['fern', 'spear', 'rosette', 'vine'] as const) {
    const set = plants.filter(p => p.form === form);
    if (!set.length) continue;
    const { foliageGeometry, guideGeometry } = plantForm(form);
    const mesh = new T.InstancedMesh(foliageGeometry, leaf, set.length);
    mesh.name = form;
    mesh.castShadow = mesh.receiveShadow = true;
    set.forEach(({ base, width, height, yaw, tint: color }, i) => {
      pose.position.copy(base);
      pose.rotation.y = yaw;
      pose.scale.set(width, height, width);
      pose.updateMatrix();
      mesh.setMatrixAt(i, pose.matrix);
      mesh.setColorAt(i, tint.setHex(color));
      if (guideGeometry) lights.push(guideGeometry.clone().applyMatrix4(pose.matrix));
    });
    guideGeometry?.dispose();
    group.add(mesh);
  }
  if (lights.length) {
    const mesh = new T.Mesh(mergeGeometries(lights), guide);
    mesh.name = 'stem-guide-lights';
    group.add(mesh);
    lights.forEach(g => g.dispose());
  }
  return group;
}
