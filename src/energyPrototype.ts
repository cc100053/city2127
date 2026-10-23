import * as T from 'three';
import { arc, bake, box, chrome, dark, glass, solar, stone, teal, trim } from './cityRig.ts';

export const ENERGY_OPTIONS = {
  baseline: '基準 · 現行城市',
  a: 'A · 海と暮らす',
  b: 'B · 空とつながる',
  c: 'C · 陸地を増やす',
  mixed: 'M1 · 混合配置',
} as const;
export type EnergyOption = keyof typeof ENERGY_OPTIONS;

/** E2 static spatial study only. No Meter interpretation, simulation, or engineering capacity claim. */
export function energyPrototype() {
  const root = new T.Group(); root.name = 'energy-prototype';
  const wing = new T.Group(), garden = new T.Group(), ring = new T.Group(), island = new T.Group();
  const parts = { wing, garden, ring, island };
  for (const [name, group] of Object.entries(parts)) { group.name = `energy-${name}`; root.add(group); }
  const member = (parent: T.Group, a: number[], b: number[], width: number, material: T.Material = trim) => {
    const from = new T.Vector3(...a), to = new T.Vector3(...b), delta = to.clone().sub(from);
    const mesh = box(parent, [width, delta.length(), width], from.add(to).multiplyScalar(.5).toArray(), material);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  };

  // Offshore receiver: a bifurcating mast carries two folded collection surfaces, leaving open sea beneath.
  wing.position.set(125, 0, -424);
  arc(wing, 0, 5, 2, [0, -2, 0], stone);
  member(wing, [0, 0, 0], [0, 25, 0], 2.4);
  for (const side of [-1, 1]) {
    member(wing, [0, 16, 0], [side * 20, 34, 0], 1.4);
    const leaf = new T.Group(); leaf.position.set(side * 13, 31, 0); leaf.rotation.z = side * .22; wing.add(leaf);
    box(leaf, [25, 1.1, 20], [0, 0, 0], trim);
    for (let x = -10; x <= 10; x += 5) box(leaf, [4.4, .22, 18], [x, .7, 0], solar);
    member(leaf, [-12, -.8, -8], [12, -.8, 8], .6, dark);
  }
  // Submerged service trunk, rather than a visible fictional energy beam.
  member(wing, [0, -1.8, 0], [8, -1.8, 30], 1, dark);

  // One upper/lower reservoir pair, with separate gravity/turbine and pumped-return pipes.
  garden.position.set(-310, 0, -151);
  arc(garden, 0, 14, 1.5, [0, -1.5, 0], stone);
  arc(garden, 12.5, 14, 1, [0, 0, 0], trim);
  arc(garden, 0, 12.4, .2, [0, .1, 0], teal);
  arc(garden, 11, 12, .3, [8, 23, 0], trim);
  arc(garden, 0, 11, 1.2, [8, 21.8, 0], stone);
  arc(garden, 0, 10.7, .2, [8, 23, 0], teal);
  for (const z of [-8, 8]) {
    member(garden, [-8, 0, z], [1, 21.8, z], 1.1);
    member(garden, [11, 0, z], [16, 21.8, z], 1.1);
  }
  box(garden, [9, 5, 6], [-5, 3, -7], glass).name = 'energy-turbine-room';
  const turbine = new T.Mesh(new T.TorusGeometry(1.8, .4, 6, 20), chrome);
  turbine.position.set(-5, 3, -10.2); garden.add(turbine);
  for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) {
    const blade = box(garden, [.4, 3.6, .3], [-5, 3, -10.2], dark); blade.rotation.z = angle;
  }
  member(garden, [2, 23, -7], [-5, 5.5, -7], 1.6, solar);
  member(garden, [-5, .5, -7], [-5, 2, -7], 1.6, solar);
  // Return line closes the loop visibly; it is storage charged by an external supply.
  member(garden, [5, .5, 8], [15, 23, 8], .9, dark);
  member(garden, [15, 23, 8], [12, 23, 0], .9, dark);
  // Independent public spur meets the existing shore, outside the reservoir and its plant.
  const spur = new T.Group(); spur.position.set(0, 0, 33); spur.rotation.x = Math.atan2(.6, 38); garden.add(spur);
  box(spur, [4, .6, 38], [0, 0, 0], stone);
  for (const x of [-2, 2]) box(spur, [.15, 1.1, 38], [x, .85, 0], trim);
  box(garden, [7, .6, 7], [0, .3, 14], stone);

  // Bay-facing flywheel stands ahead of the occupied wings; fixed bearings hang from the transfer frame.
  ring.position.set(-18, 100, -24);
  const rotor = new T.Group(); rotor.name = 'energy-rotor'; ring.add(rotor);
  const wheel = new T.Mesh(new T.TorusGeometry(31, 1.2, 8, 96), dark); rotor.add(wheel);
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    const block = box(rotor, [2.2, 1.5, 1.4], [31 * Math.cos(angle), 31 * Math.sin(angle), 0], chrome);
    block.rotation.z = angle;
  }
  for (const x of [-22, 22]) {
    member(ring, [x, 30, 12], [x, 22, 0], 1.1);
    box(ring, [3.6, 2, 3], [x, 22, 0], trim);
  }

  // Three reclaimed caissons read as new coastline. A clear-span service bridge preserves the existing shipping routes below.
  island.position.set(-60, 0, -470);
  for (const z of [-16, 0, 16]) {
    box(island, [40, 4, 15.5], [0, -.4, z], stone);
    box(island, [40.4, .8, 1], [0, 1.9, z - 7.8], trim);
  }
  for (const x of [-9, 9]) {
    arc(island, 0, 7, 12, [x, 1.6, -3], trim);
    const cap = new T.Mesh(new T.SphereGeometry(7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), trim);
    cap.position.set(x, 13.6, -3); island.add(cap);
    box(island, [12, 5, 10], [x, 4.1, 15], dark);
  }
  box(island, [32, 1, 8], [0, 2.1, -19], teal);
  const start = new T.Vector3(0, 18, 16), end = new T.Vector3(80, 18, 118), length = start.distanceTo(end);
  const bridge = new T.Group(); bridge.position.copy(start).add(end).multiplyScalar(.5); bridge.lookAt(end); island.add(bridge);
  box(bridge, [5, .8, length], [0, 0, 0], stone);
  for (const x of [-2.6, 2.6]) {
    box(bridge, [.5, .5, length], [x, 3.5, 0], trim);
    for (let z = -length / 2; z < length / 2; z += 12) member(bridge, [x, .4, z], [x, 3.5, Math.min(z + 12, length / 2)], .4);
  }
  for (const [x, z, base] of [[0, 16, 1.6], [80, 118, 0]]) {
    box(island, [3, 18 - base, 3], [x, (18 + base) / 2, z], glass);
    for (const dx of [-1.8, 1.8]) member(island, [x + dx, base, z], [x + dx, 18, z], .5);
  }

  // Separate rotor batches preserve a future animation seam; all E2 geometry stays static.
  rotor.removeFromParent();
  for (const group of [...Object.values(parts), rotor]) {
    const batches = bake(group); group.add(...batches);
  }
  ring.add(rotor);
  let option: EnergyOption = 'baseline';
  function select(next: EnergyOption) {
    option = next;
    wing.visible = next === 'a' || next === 'b' || next === 'mixed';
    wing.scale.setScalar(next === 'a' ? .65 : 1);
    garden.visible = next === 'a' || next === 'mixed';
    ring.visible = next === 'b' || next === 'mixed';
    island.visible = next === 'c' || next === 'mixed';
  }
  select(option);
  return { root, parts, select, get option() { return option; } };
}
